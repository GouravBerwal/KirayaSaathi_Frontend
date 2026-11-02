import React, { useMemo, useState } from 'react';
import {
  Download,
  UserPlus,
  Users,
  ShieldCheck,
  Clock,
  Search,
  ChevronDown,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';

import { PageType, Room, Tenant } from '../types';

interface TenantsPageProps {
  tenants: Tenant[];
  rooms?: Room[];
  onNavigate: (page: PageType) => void;
  onSelectTenant: (tenant: Tenant) => void;
  onOpenAddTenant?: () => void;
  onRefreshData?: () => Promise<void> | void;
}

type TenantTab = 'Active' | 'Past';

const formatCurrency = (amount: number): string =>
  `₹${Math.round(amount || 0).toLocaleString('en-IN')}`;

const formatDate = (value: string): string => {
  if (!value) return '—';

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const escapeCsv = (value: unknown): string => {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
};

const downloadTenantCsv = (tenants: Tenant[]) => {
  const headers = [
    'Tenant ID',
    'Name',
    'Email',
    'Phone',
    'Alternate Phone',
    'Property',
    'Room',
    'Monthly Rent',
    'Security Deposit',
    'Move-in Date',
    'Agreement End Date',
    'Status',
    'Rent Balance',
    'Electricity Pending',
    'Permanent Address',
    'Emergency Contact Name',
    'Emergency Contact Phone',
  ];

  const rows = tenants.map((tenant) => [
    tenant.id,
    tenant.name,
    tenant.email,
    tenant.phone,
    tenant.alternatePhone ?? '',
    tenant.propertyName,
    tenant.roomNumber,
    tenant.monthlyRent,
    tenant.securityDeposit,
    tenant.moveInDate,
    tenant.agreementEndDate,
    tenant.status,
    tenant.balance,
    tenant.electricityPending,
    tenant.permanentAddress,
    tenant.emergencyContact?.name ?? '',
    tenant.emergencyContact?.phone ?? '',
  ]);

  const csv = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ].join('\r\n');

  const blob = new Blob(['\uFEFF', csv], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `KirayaSaathi-tenants-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const TenantsPage: React.FC<TenantsPageProps> = ({
  tenants,
  rooms = [],
  onNavigate,
  onSelectTenant,
  onOpenAddTenant,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<TenantTab>('Active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperty, setSelectedProperty] = useState('All Properties');
  const [showPropertyFilter, setShowPropertyFilter] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeTenants = useMemo(
    () => tenants.filter((tenant) => tenant.status === 'Active'),
    [tenants],
  );

  const pastTenants = useMemo(
    () => tenants.filter((tenant) => tenant.status === 'Past'),
    [tenants],
  );

  const newThisMonth = useMemo(() => {
    const now = new Date();

    return tenants.filter((tenant) => {
      if (!tenant.moveInDate) return false;

      const moveIn = new Date(`${tenant.moveInDate.slice(0, 10)}T00:00:00`);

      return (
        !Number.isNaN(moveIn.getTime()) &&
        moveIn.getMonth() === now.getMonth() &&
        moveIn.getFullYear() === now.getFullYear()
      );
    }).length;
  }, [tenants]);

  const totalActiveDeposits = useMemo(
    () =>
      activeTenants.reduce(
        (total, tenant) => total + (Number(tenant.securityDeposit) || 0),
        0,
      ),
    [activeTenants],
  );

  const tenantsWithOutstandingBalance = useMemo(
    () =>
      activeTenants.filter(
        (tenant) => (tenant.balance || 0) + (tenant.electricityPending || 0) > 0,
      ),
    [activeTenants],
  );

  const totalOutstandingBalance = useMemo(
    () =>
      tenantsWithOutstandingBalance.reduce(
        (total, tenant) =>
          total + (Number(tenant.balance) || 0) + (Number(tenant.electricityPending) || 0),
        0,
      ),
    [tenantsWithOutstandingBalance],
  );

  const propertyOptions = useMemo(
    () =>
      Array.from(
        new Set(
          tenants
            .map((tenant) => tenant.propertyName?.trim())
            .filter((name): name is string => Boolean(name)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [tenants],
  );

  const currentTabTenants = activeTab === 'Active' ? activeTenants : pastTenants;

  const filteredTenants = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return currentTabTenants.filter((tenant) => {
      const matchesSearch =
        !query ||
        tenant.name.toLowerCase().includes(query) ||
        tenant.phone.toLowerCase().includes(query) ||
        tenant.email.toLowerCase().includes(query) ||
        tenant.roomNumber.toLowerCase().includes(query) ||
        tenant.propertyName.toLowerCase().includes(query);

      const matchesProperty =
        selectedProperty === 'All Properties' ||
        tenant.propertyName === selectedProperty;

      return matchesSearch && matchesProperty;
    });
  }, [currentTabTenants, searchQuery, selectedProperty]);

  const handleAddTenant = () => {
    if (onOpenAddTenant) {
      onOpenAddTenant();
      return;
    }
    onNavigate('add_tenant');
  };

  const handleRefresh = async () => {
    if (!onRefreshData) return;
    setIsRefreshing(true);
    try {
      await onRefreshData();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-7 pb-10">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-[#6A7F89]">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="transition hover:text-[#035E7B]"
            >
              Dashboard
            </button>
            <span>/</span>
            <span className="font-medium text-[#035E7B]">Tenants</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#142D3B] sm:text-3xl">
            Tenant Directory
          </h1>

          <p className="mt-2 text-sm text-[#6A7F89]">
            Manage tenants, review room occupancy, and track outstanding rent &amp; electricity dues.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onRefreshData && (
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#C9DDE4] bg-white px-4 py-3 text-sm font-semibold text-[#254653] transition hover:border-[#035E7B] hover:text-[#035E7B]"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Syncing...' : 'Refresh'}
            </button>
          )}

          <button
            type="button"
            onClick={() => downloadTenantCsv(filteredTenants)}
            disabled={filteredTenants.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#C9DDE4] bg-white px-4 py-3 text-sm font-semibold text-[#254653] transition hover:border-[#035E7B] hover:text-[#035E7B] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={17} />
            Export CSV
          </button>

          <button
            type="button"
            onClick={handleAddTenant}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#035E7B] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#024A62]"
          >
            <UserPlus size={17} />
            Add Tenant
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Active Tenants"
          value={activeTenants.length.toLocaleString('en-IN')}
          subtitle="Currently active agreements"
          icon={<Users size={20} />}
          iconClass="bg-[#E5F3F8] text-[#035E7B]"
        />

        <SummaryCard
          title="New This Month"
          value={newThisMonth.toLocaleString('en-IN')}
          subtitle="Based on agreement start date"
          icon={<UserPlus size={20} />}
          iconClass="bg-[#E4F6EE] text-[#16805D]"
        />

        <div
          onClick={() => onNavigate('security_deposits')}
          className="cursor-pointer transition hover:scale-[1.01]"
          title="Click to manage one-time security deposits & room inventory"
        >
          <SummaryCard
            title="Security Deposits"
            value={formatCurrency(totalActiveDeposits)}
            subtitle="Manage one-time escrow & room assets →"
            icon={<ShieldCheck size={20} />}
            iconClass="bg-[#F0EAFE] text-[#7652C7]"
          />
        </div>

        <SummaryCard
          title="Total Outstanding"
          value={formatCurrency(totalOutstandingBalance)}
          subtitle={`${tenantsWithOutstandingBalance.length} active tenant${
            tenantsWithOutstandingBalance.length === 1 ? '' : 's'
          } with pending dues`}
          icon={<Clock size={20} />}
          iconClass="bg-[#FFF0E5] text-[#C46A26]"
        />
      </div>

      {/* Tenant directory */}
      <section className="overflow-hidden rounded-2xl border border-[#DCE9ED] bg-white shadow-sm">
        <div className="border-b border-[#E6EEF1] px-4 pt-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => setActiveTab('Active')}
                className={`relative pb-4 text-sm font-semibold transition ${
                  activeTab === 'Active'
                    ? 'text-[#035E7B]'
                    : 'text-[#82939B] hover:text-[#254653]'
                }`}
              >
                Active Tenants
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                    activeTab === 'Active'
                      ? 'bg-[#E5F3F8] text-[#035E7B]'
                      : 'bg-[#F0F4F5] text-[#6A7F89]'
                  }`}
                >
                  {activeTenants.length}
                </span>

                {activeTab === 'Active' && (
                  <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-t-full bg-[#035E7B]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('Past')}
                className={`relative pb-4 text-sm font-semibold transition ${
                  activeTab === 'Past'
                    ? 'text-[#035E7B]'
                    : 'text-[#82939B] hover:text-[#254653]'
                }`}
              >
                Past / Unassigned Tenants
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                    activeTab === 'Past'
                      ? 'bg-[#E5F3F8] text-[#035E7B]'
                      : 'bg-[#F0F4F5] text-[#6A7F89]'
                  }`}
                >
                  {pastTenants.length}
                </span>

                {activeTab === 'Past' && (
                  <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-t-full bg-[#035E7B]" />
                )}
              </button>
            </div>

            <p className="pb-4 text-xs text-[#82939B]">
              {filteredTenants.length} of {currentTabTenants.length} tenants
            </p>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex flex-col gap-3 border-b border-[#E6EEF1] p-4 sm:flex-row sm:items-center sm:px-6">
          <div className="relative min-w-0 flex-1">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A9CA4]"
            />

            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name, phone, room or property..."
              aria-label="Search tenants"
              className="w-full rounded-xl border border-[#DCE9ED] bg-[#FAFCFD] py-3 pl-10 pr-4 text-sm text-[#142D3B] outline-none transition placeholder:text-[#9AABB2] focus:border-[#035E7B] focus:ring-2 focus:ring-[#035E7B]/10"
            />
          </div>

          <div className="relative sm:w-64">
            <button
              type="button"
              onClick={() => setShowPropertyFilter((previous) => !previous)}
              aria-expanded={showPropertyFilter}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#DCE9ED] bg-white px-4 py-3 text-sm text-[#254653] transition hover:border-[#035E7B]"
            >
              <span className="truncate">{selectedProperty}</span>
              <ChevronDown size={16} className="shrink-0 text-[#82939B]" />
            </button>

            {showPropertyFilter && (
              <div className="absolute right-0 top-full z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-[#DCE9ED] bg-white p-1.5 shadow-xl">
                {['All Properties', ...propertyOptions].map((property) => (
                  <button
                    type="button"
                    key={property}
                    onClick={() => {
                      setSelectedProperty(property);
                      setShowPropertyFilter(false);
                    }}
                    className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                      selectedProperty === property
                        ? 'bg-[#E5F3F8] font-semibold text-[#035E7B]'
                        : 'text-[#254653] hover:bg-[#F5F9FA]'
                    }`}
                  >
                    {property}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[950px] border-collapse text-left">
            <thead>
              <tr className="bg-[#F7FAFB]">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#82939B]">
                  Tenant
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-[#82939B]">
                  Contact
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-[#82939B]">
                  Property / Room
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-[#82939B]">
                  Monthly Rent
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-[#82939B]">
                  Outstanding Dues
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-[#82939B]">
                  Move-in Date
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-[#82939B]">
                  Status
                </th>
                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-[#82939B]">
                  Details
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#EDF2F4]">
              {filteredTenants.map((tenant) => {
                const totalDue =
                  (Number(tenant.balance) || 0) +
                  (Number(tenant.electricityPending) || 0);
                return (
                  <tr
                    key={tenant.id}
                    onClick={() => {
                      onSelectTenant(tenant);
                      onNavigate('tenant_profile');
                    }}
                    className="cursor-pointer transition hover:bg-[#F7FBFC]"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E5F3F8] text-sm font-bold text-[#035E7B]">
                          {tenant.name
                            .trim()
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((part) => part[0]?.toUpperCase())
                            .join('')}
                        </div>

                        <div className="min-w-0">
                          <p className="max-w-[190px] truncate text-sm font-semibold text-[#142D3B]">
                            {tenant.name}
                          </p>
                          <p className="mt-1 max-w-[190px] truncate text-xs text-[#82939B]">
                            ID: #{tenant.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-[#254653]">
                        {tenant.phone || '—'}
                      </p>
                      <p className="mt-1 max-w-[190px] truncate text-xs text-[#82939B]">
                        {tenant.email || 'No email'}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-[#254653]">
                        {tenant.propertyName || 'Not assigned'}
                      </p>
                      <p className="mt-1 text-xs text-[#82939B]">
                        {tenant.roomNumber ? (
                          <span>
                            Room {tenant.roomNumber}
                            {(() => {
                              const match = rooms.find(
                                (r) =>
                                  r.id === tenant.roomId ||
                                  (r.number === tenant.roomNumber &&
                                    (r.propertyId === tenant.propertyId ||
                                      r.propertyName === tenant.propertyName))
                              );
                              return match?.type ? ` · ${match.type}` : '';
                            })()}
                          </span>
                        ) : (
                          'No room assigned'
                        )}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-[#142D3B]">
                        {formatCurrency(tenant.monthlyRent)}
                      </p>
                      <p className="mt-1 text-xs text-[#82939B]">per month</p>
                    </td>

                    <td className="px-5 py-4">
                      <p
                        className={`text-sm font-semibold ${
                          totalDue > 0 ? 'text-[#C46A26]' : 'text-[#16805D]'
                        }`}
                      >
                        {totalDue > 0 ? formatCurrency(totalDue) : 'Cleared'}
                      </p>
                      {totalDue > 0 && (
                        <p className="mt-0.5 text-[11px] text-[#82939B]">
                          Rent: {formatCurrency(tenant.balance)} · Elec:{' '}
                          {formatCurrency(tenant.electricityPending)}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-4 text-sm text-[#526B76]">
                      {formatDate(tenant.moveInDate)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          tenant.status === 'Active'
                            ? 'bg-[#E5F6EE] text-[#16805D]'
                            : 'bg-[#F0F3F4] text-[#6A7F89]'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            tenant.status === 'Active'
                              ? 'bg-[#16805D]'
                              : 'bg-[#82939B]'
                          }`}
                        />
                        {tenant.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        aria-label={`View ${tenant.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelectTenant(tenant);
                          onNavigate('tenant_profile');
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#82939B] transition hover:bg-[#E5F3F8] hover:text-[#035E7B]"
                      >
                        <ArrowUpRight size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredTenants.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF4F7] text-[#035E7B]">
                      <Users size={22} />
                    </div>

                    <h3 className="mt-4 text-sm font-semibold text-[#142D3B]">
                      No tenants found
                    </h3>

                    <p className="mx-auto mt-1 max-w-sm text-sm text-[#82939B]">
                      {tenants.length === 0
                        ? 'Abhi koi tenant record nahi hai. "Add Tenant" button par click karke pehla tenant create karein.'
                        : 'Search ya property filter change karke dobara try karein.'}
                    </p>

                    {(searchQuery || selectedProperty !== 'All Properties') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedProperty('All Properties');
                        }}
                        className="mt-4 text-sm font-semibold text-[#035E7B] hover:underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-[#E6EEF1] bg-[#FCFDFE] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs text-[#82939B]">
            Showing {filteredTenants.length} of {currentTabTenants.length}{' '}
            {activeTab.toLowerCase()} tenants
          </p>

          <button
            type="button"
            onClick={() => downloadTenantCsv(filteredTenants)}
            disabled={filteredTenants.length === 0}
            className="text-left text-xs font-semibold text-[#035E7B] transition hover:underline disabled:cursor-not-allowed disabled:opacity-50 sm:text-right"
          >
            Export current results
          </button>
        </div>
      </section>
    </div>
  );
};

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  iconClass: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconClass,
}) => (
  <div className="rounded-2xl border border-[#DCE9ED] bg-white p-5 shadow-sm transition hover:shadow-md">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#6A7F89]">{title}</p>
        <p className="mt-3 break-words text-2xl font-bold tracking-tight text-[#142D3B]">
          {value}
        </p>
      </div>

      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
      >
        {icon}
      </div>
    </div>

    <p className="mt-3 text-xs text-[#82939B]">{subtitle}</p>
  </div>
);

export default TenantsPage;