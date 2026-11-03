
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { PageType, Property, Room, Tenant, RentRecord, ElectricityBill } from '../types';
import {
  Calendar,
  Plus,
  Building,
  DoorOpen,
  IndianRupee,
  Clock,
  ArrowUpRight,
  Zap,
  ArrowRight,
  CheckCircle,
  FileText,
  Users,
  RefreshCw,
  MessageCircle,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { apiRequest } from '../utils/api';

interface DashboardPageProps {
  onNavigate: (page: PageType) => void;
  onOpenRecordPayment: (
    tenantId?: string,
    paymentType?: 'rent' | 'electricity',
    billId?: string,
  ) => void;
  properties: Property[];
  rooms: Room[];
  tenants?: Tenant[];
  rentRecords?: RentRecord[];
  electricityBills?: ElectricityBill[];
  onRefreshData?: () => Promise<void>;
  refreshTrigger?: number;
}

interface CurrentUserResponse {
  authenticated?: boolean;
  user?: {
    id?: number;
    username?: string;
    email?: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    name?: string;
  };
  id?: number;
  username?: string;
  email?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
}

interface RecentPayment {
  id: number;
  tenant: string;
  amount: string | number;
  payment_date: string;
  payment_method: string;
  status: string;
  bill_type: 'RENT' | 'ELECTRICITY' | null;
  bill_id: number | null;
  transaction_reference: string | null;
}

interface DashboardSummary {
  rooms: {
    total: number;
    occupied: number;
    vacant: number;
    maintenance: number;
  };
  rent: {
    current_month_collected: string;
    current_month_pending: string;
    current_month_billed: string;
    overdue_amount: string;
  };
  electricity: {
    current_month_collected: string;
    current_month_pending: string;
    current_month_billed: string;
    overdue_amount: string;
  };
  income_chart: {
    months: {
      month: string;
      year: number;
      expected: string;
      collected: string;
    }[];
  };
  payments: {
    completed_payment_count: number;
    total_collected: string;
    recent: RecentPayment[];
  };
}

export interface AttentionPaymentItem {
  id: string;
  cleanId: string;
  type: 'rent' | 'electricity';
  agreementId?: number;
  tenantId?: string;
  tenantName: string;
  tenantPhone?: string;
  propertyName: string;
  propertyId?: string;
  roomNumber: string;
  roomId?: string;
  amount: number;
  totalAmount: number;
  amountPaid: number;
  dueDate: string;
  billingMonth?: string;
  status: 'PENDING' | 'PARTIAL' | 'OVERDUE' | 'PAID';
  isPastDue: boolean;
}

const getOwnerDisplayName = (
  data: CurrentUserResponse,
): string => {
  const user = data.user ?? data;

  const fullName = [
    user.first_name?.trim(),
    user.last_name?.trim(),
  ]
    .filter(Boolean)
    .join(' ');

  return (
    user.full_name?.trim() ||
    user.name?.trim() ||
    fullName ||
    user.username?.trim() ||
    user.email?.split('@')[0]?.trim() ||
    ''
  );
};

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenRecordPayment,
  properties,
  rooms: _rooms,
  tenants = [],
  rentRecords = [],
  electricityBills = [],
  onRefreshData,
  refreshTrigger,
}) => {
  const totalProperties = properties.length;

  const [ownerName, setOwnerName] = useState('');
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(false);

  const [attentionPayments, setAttentionPayments] = useState<AttentionPaymentItem[]>([]);
  const [attentionLoading, setAttentionLoading] = useState(true);
  const [attentionError, setAttentionError] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'overdue' | 'rent' | 'electricity'>('all');
  const [showAllDues, setShowAllDues] = useState(false);
  const [updatingRecordId, setUpdatingRecordId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [isRefreshingLive, setIsRefreshingLive] = useState(false);

  const [selectedIncome, setSelectedIncome] = useState<{
    month: string;
    year: number;
    type: 'expected' | 'collected';
    amount: number;
  } | null>(null);

  // Current greeting based on local time.
  const currentHour = new Date().getHours();

  const greeting =
    currentHour < 12
      ? 'Good morning'
      : currentHour < 17
        ? 'Good afternoon'
        : 'Good evening';

  // Dynamic date and month.
  const today = new Date();

  const formattedToday = today.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedMonth = today.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const propertyLocations = [
    ...new Set(
      properties
        .map((property) => property.city?.trim())
        .filter((city): city is string => Boolean(city)),
    ),
  ];

  const propertyLocationText =
    propertyLocations.length > 0
      ? `Across ${propertyLocations.join(', ')}`
      : 'No locations available';

  // Fetch the currently authenticated owner from Django.
  useEffect(() => {
    let cancelled = false;

    apiRequest<CurrentUserResponse>('/api/auth/me/')
      .then((data) => {
        if (cancelled) return;
        const name = getOwnerDisplayName(data);
        setOwnerName(name);
      })
      .catch((error) => {
        console.error('Current owner API error:', error);
        if (!cancelled) {
          setOwnerName('');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch dashboard summary and recent payments
  const fetchDashboardData = useCallback(async () => {
    try {
      setDashboardLoading(true);
      setDashboardError(false);
      const data = await apiRequest<DashboardSummary>('/api/dashboard/');
      setDashboard(data);
    } catch (error) {
      console.error('Dashboard API error:', error);
      setDashboardError(true);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  // Fetch outstanding rent and electricity records
  const fetchOutstandingPayments = useCallback(async () => {
    try {
      setAttentionLoading(true);
      setAttentionError(false);

      const [rentRes, elecRes] = await Promise.allSettled([
        apiRequest<any[]>('/api/billing/'),
        apiRequest<any[]>('/api/electricity/bills/'),
      ]);

      const rawRents: any[] =
        rentRes.status === 'fulfilled' && Array.isArray(rentRes.value)
          ? rentRes.value
          : [];

      const rawElecs: any[] =
        elecRes.status === 'fulfilled' && Array.isArray(elecRes.value)
          ? elecRes.value
          : [];

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const items: AttentionPaymentItem[] = [];

      // 1. Process Rent Records from backend
      for (const r of rawRents) {
        const totalAmt = Number(r.rent_amount || 0);
        const paidAmt = Number(r.amount_paid || 0);
        const outstanding = Number(
          r.outstanding_amount !== undefined
            ? r.outstanding_amount
            : Math.max(0, totalAmt - paidAmt),
        );
        const isPaid = r.status === 'PAID' || outstanding <= 0;

        if (isPaid) continue;

        let isPastDue = false;
        if (r.due_date) {
          const [y, m, d] = String(r.due_date).split('-').map(Number);
          if (y && m && d) {
            const dueObj = new Date(y, m - 1, d);
            isPastDue = dueObj < todayStart;
          }
        }

        const effectiveStatus: 'PENDING' | 'PARTIAL' | 'OVERDUE' =
          r.status === 'OVERDUE' || isPastDue
            ? 'OVERDUE'
            : paidAmt > 0 || r.status === 'PARTIAL'
              ? 'PARTIAL'
              : 'PENDING';

        items.push({
          id: `rent-${r.id}`,
          cleanId: String(r.id),
          type: 'rent',
          agreementId: r.agreement,
          tenantId: r.tenant_id ? String(r.tenant_id) : undefined,
          tenantName: r.tenant_name || 'Unknown tenant',
          tenantPhone: r.tenant_phone || '',
          propertyName: r.property_name || 'Property',
          propertyId: r.property_id ? String(r.property_id) : undefined,
          roomNumber: r.room_number ? String(r.room_number) : '—',
          amount: Math.max(0, outstanding),
          totalAmount: totalAmt,
          amountPaid: paidAmt,
          dueDate: r.due_date || '',
          billingMonth: r.billing_month || '',
          status: effectiveStatus,
          isPastDue,
        });
      }

      // 2. Process Electricity Bills from backend
      for (const b of rawElecs) {
        const totalAmt = Number(b.total_amount || 0);
        const paidAmt = Number(b.amount_paid || 0);
        const outstanding = Math.max(0, totalAmt - paidAmt);
        const isPaid = b.status === 'PAID' || outstanding <= 0;

        if (isPaid) continue;

        let isPastDue = false;
        if (b.due_date) {
          const [y, m, d] = String(b.due_date).split('-').map(Number);
          if (y && m && d) {
            const dueObj = new Date(y, m - 1, d);
            isPastDue = dueObj < todayStart;
          }
        }

        const effectiveStatus: 'PENDING' | 'PARTIAL' | 'OVERDUE' =
          b.status === 'OVERDUE' || isPastDue
            ? 'OVERDUE'
            : paidAmt > 0 || b.status === 'PARTIAL'
              ? 'PARTIAL'
              : 'PENDING';

        const occupant =
          Array.isArray(b.occupants) && b.occupants.length > 0
            ? b.occupants[0]
            : null;

        items.push({
          id: `elec-${b.id}`,
          cleanId: String(b.id),
          type: 'electricity',
          agreementId: occupant?.agreement_id,
          tenantId: occupant?.id ? String(occupant.id) : undefined,
          tenantName: occupant?.name || 'Occupant',
          tenantPhone: occupant?.phone || '',
          propertyName: b.property_name || 'Property',
          propertyId: b.property_id ? String(b.property_id) : undefined,
          roomNumber: b.room_number ? String(b.room_number) : '—',
          amount: outstanding,
          totalAmount: totalAmt,
          amountPaid: paidAmt,
          dueDate: b.due_date || '',
          billingMonth: b.billing_month || '',
          status: effectiveStatus,
          isPastDue,
        });
      }

      // Sort: Overdue first, then by earliest due date
      items.sort((a, b) => {
        const aOverdue = a.status === 'OVERDUE' ? 0 : 1;
        const bOverdue = b.status === 'OVERDUE' ? 0 : 1;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
        return (a.dueDate || '').localeCompare(b.dueDate || '');
      });

      setAttentionPayments(items);
    } catch (error) {
      console.error('Outstanding payments API error:', error);
      setAttentionError(true);
    } finally {
      setAttentionLoading(false);
    }
  }, []);

  // Trigger loads on mount & whenever refreshTrigger or data version increments
  useEffect(() => {
    void fetchDashboardData();
    void fetchOutstandingPayments();
  }, [fetchDashboardData, fetchOutstandingPayments, refreshTrigger, rentRecords.length, electricityBills.length]);

  // Live Sync handler for owner
  const handleManualLiveSync = async () => {
    setIsRefreshingLive(true);
    try {
      await Promise.all([
        fetchDashboardData(),
        fetchOutstandingPayments(),
        onRefreshData ? onRefreshData() : Promise.resolve(),
      ]);
    } finally {
      setIsRefreshingLive(false);
    }
  };

  // Quick 1-click Mark as Paid handler for Rent and Electricity
  const handleMarkPaid = async (item: AttentionPaymentItem) => {
    setUpdatingRecordId(item.id);
    try {
      const cleanId = item.cleanId;

      if (item.type === 'rent') {
        await apiRequest(`/api/billing/${cleanId}/`, {
          method: 'PATCH',
          body: {
            status: 'PAID',
            amount_paid: item.totalAmount.toFixed(2),
          },
        });
      } else {
        await apiRequest(`/api/electricity/bills/${cleanId}/`, {
          method: 'PATCH',
          body: {
            status: 'PAID',
            amount_paid: item.totalAmount.toFixed(2),
          },
        });
      }

      // Optimistically update attention list immediately
      setAttentionPayments((prev) => prev.filter((p) => p.id !== item.id));

      setToastMessage({
        text: `₹${item.amount.toLocaleString('en-IN')} ${item.type === 'electricity' ? 'electricity' : 'rent'} marked as PAID for ${item.tenantName}!`,
        type: 'success',
      });
      setTimeout(() => setToastMessage(null), 4000);

      // Trigger dashboard summary refresh and global app refresh
      await Promise.allSettled([
        fetchDashboardData(),
        fetchOutstandingPayments(),
        onRefreshData ? onRefreshData() : Promise.resolve(),
      ]);
    } catch (err) {
      console.error('Error marking payment as paid:', err);
      setToastMessage({
        text: err instanceof Error ? err.message : 'Payment update karne mein error aaya.',
        type: 'error',
      });
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setUpdatingRecordId(null);
    }
  };

  // WhatsApp reminder deep link handler
  const handleSendReminder = (item: AttentionPaymentItem) => {
    let phone = item.tenantPhone;
    if (!phone && tenants) {
      const found = tenants.find(
        (t) =>
          (item.tenantId && String(t.id) === String(item.tenantId)) ||
          t.name.trim().toLowerCase() === item.tenantName.trim().toLowerCase(),
      );
      if (found?.phone) phone = found.phone;
    }

    if (!phone || !phone.trim()) {
      setToastMessage({
        text: `Phone number not found for ${item.tenantName}. You can add it in Tenant Profile.`,
        type: 'info',
      });
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '').replace(/^91/, '');
    const targetPhone = `91${cleanPhone}`;
    const billType = item.type === 'electricity' ? 'Electricity bill' : 'Monthly rent';
    const dueText = item.dueDate ? ` (Due: ${item.dueDate})` : '';
    const message =
      `Namaste ${item.tenantName}! 🙏\n\n` +
      `This is a gentle reminder from ${item.propertyName} regarding your pending ${billType} of *₹${item.amount.toLocaleString('en-IN')}* for Room ${item.roomNumber}${dueText}.\n\n` +
      `Kindly clear the payment via UPI or cash at your earliest convenience.\n\n` +
      `Thank you!\n${ownerName ? `- ${ownerName}` : 'Property Management'}`;

    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');

    setToastMessage({
      text: `Opening WhatsApp reminder for ${item.tenantName}...`,
      type: 'info',
    });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const totalRooms = dashboard?.rooms?.total ?? 0;
  const occupiedRooms = dashboard?.rooms?.occupied ?? 0;
  const vacantRooms = dashboard?.rooms?.vacant ?? 0;
  const maintenanceRooms = dashboard?.rooms?.maintenance ?? 0;

  const electricityBilled = Number(
    dashboard?.electricity?.current_month_billed ?? 0,
  );

  const electricityPending = Number(
    dashboard?.electricity?.current_month_pending ?? 0,
  );

  const electricityCollected = Number(
    dashboard?.electricity?.current_month_collected ?? 0,
  );

  const electricityCollectionRate =
    electricityBilled > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (electricityCollected / electricityBilled) * 100,
          ),
        )
      : 0;

  const formatINR = (amount?: string | number | null) => {
    if (
      amount === undefined ||
      amount === null ||
      amount === '' ||
      !Number.isFinite(Number(amount))
    ) {
      return '—';
    }

    return `₹${Number(amount).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    })}`;
  };

  const rentCollected = dashboard
    ? formatINR(dashboard.rent.current_month_collected)
    : dashboardError
      ? 'Unavailable'
      : 'Loading...';

  const pendingRent = dashboard
    ? formatINR(dashboard.rent.current_month_pending)
    : dashboardError
      ? 'Unavailable'
      : 'Loading...';

  const occupancy = dashboard?.rooms;

  const occupancyPercentage =
    occupancy && occupancy.total > 0
      ? (occupancy.occupied / occupancy.total) * 100
      : 0;

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number.isFinite(amount) ? amount : 0);

  const formatDueDate = (dateString?: string | null) => {
    if (!dateString) return 'Due date not set';
    const [year, month, day] = dateString.split('-').map(Number);

    if (!year || !month || !day) {
      return `Due ${dateString}`;
    }

    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) {
      return `Due ${dateString}`;
    }

    return `Due ${date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    })}`;
  };

  const formatActivityDate = (value?: string | null) => {
    if (!value) return 'Date unavailable';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const dateOptions: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    };

    if (value.includes('T')) {
      return date.toLocaleString('en-IN', {
        ...dateOptions,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }

    return date.toLocaleDateString('en-IN', dateOptions);
  };

  const getInitials = (name?: string) => {
    if (!name || !name.trim()) return 'T';
    const parts = name.trim().split(/\s+/).slice(0, 2);
    const inits = parts.map((part) => part.charAt(0)).join('').toUpperCase();
    return inits || 'T';
  };

  // Enrich items with tenant details if missing
  const enrichedAttentionPayments = useMemo(() => {
    return attentionPayments.map((item) => {
      let phone = item.tenantPhone;
      let tenantId = item.tenantId;
      let agreementId = item.agreementId;

      if ((!phone || !tenantId || !agreementId) && tenants && tenants.length > 0) {
        const matchedTenant = tenants.find(
          (t) =>
            (tenantId && String(t.id) === String(tenantId)) ||
            (item.roomNumber && String(t.roomNumber) === String(item.roomNumber) && (!item.propertyName || t.propertyName === item.propertyName)) ||
            t.name.trim().toLowerCase() === item.tenantName.trim().toLowerCase(),
        );
        if (matchedTenant) {
          phone = phone || matchedTenant.phone;
          tenantId = tenantId || matchedTenant.id;
          agreementId = agreementId || matchedTenant.agreementId;
        }
      }

      return {
        ...item,
        tenantPhone: phone,
        tenantId,
        agreementId,
      };
    });
  }, [attentionPayments, tenants]);

  const overdueCount = enrichedAttentionPayments.filter((p) => p.status === 'OVERDUE').length;
  const rentCount = enrichedAttentionPayments.filter((p) => p.type === 'rent').length;
  const electricityCount = enrichedAttentionPayments.filter((p) => p.type === 'electricity').length;

  const filteredAttentionPayments = enrichedAttentionPayments.filter((item) => {
    if (filterTab === 'overdue') return item.status === 'OVERDUE';
    if (filterTab === 'rent') return item.type === 'rent';
    if (filterTab === 'electricity') return item.type === 'electricity';
    return true;
  });

  const visibleAttentionPayments = showAllDues
    ? filteredAttentionPayments
    : filteredAttentionPayments.slice(0, 5);

  const recentPayments = dashboard?.payments?.recent ?? [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Row */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight">
            {greeting}
            {ownerName ? `, ${ownerName}` : ''}
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Here&apos;s how your rental portfolio is doing today,{' '}
            {formattedToday}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-[#035E7B] transition shadow-2xs"
            title="View financial reports"
          >
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{formattedMonth}</span>
          </button>

          <button
            type="button"
            onClick={() => void handleManualLiveSync()}
            disabled={isRefreshingLive}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition shadow-2xs active:scale-95 disabled:opacity-60 cursor-pointer"
            title="Sync metrics live from MySQL database"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#035E7B] ${
                isRefreshingLive ? 'animate-spin' : ''
              }`}
            />
            <span className="hidden sm:inline">
              {isRefreshingLive ? 'Syncing...' : 'Live Sync'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenRecordPayment()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#035E7B] hover:bg-[#024B63] text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record payment</span>
          </button>
        </div>
      </section>

      {/* Brand New Owner Welcome Hero Banner when 0 properties exist */}
      {totalProperties === 0 && (
        <section className="bg-gradient-to-r from-teal-50 via-sky-50 to-indigo-50 border border-teal-200/80 rounded-2xl p-6 sm:p-8 text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xs">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100/90 text-teal-800 text-xs font-bold border border-teal-200">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Workspace Verified & Active</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
              Welcome to KirayaSaathi, {ownerName || 'Property Owner'}!
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Your account has been approved. Your workspace currently has 0 properties. Start by adding your first building, apartment, or PG to allocate rooms and collect rent.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('add_property')}
            className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#035E7B] hover:bg-[#024B63] text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Your First Property</span>
          </button>
        </section>
      )}

      {/* Summary Stat Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Properties */}
        <button
          type="button"
          onClick={() => onNavigate('property_list')}
          className="text-left bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs hover:border-[#035E7B]/40 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total properties</span>
            <Building className="w-4 h-4 text-[#0D8AB0] group-hover:scale-110 transition" />
          </div>

          <div className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mt-3">
            {totalProperties}
          </div>

          <div className="text-[11px] text-slate-400 mt-2">
            {propertyLocationText}
          </div>
        </button>

        {/* Total Rooms */}
        <button
          type="button"
          onClick={() => onNavigate('rooms')}
          className="text-left bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs hover:border-[#035E7B]/40 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total rooms</span>
            <DoorOpen className="w-4 h-4 text-[#0D8AB0] group-hover:scale-110 transition" />
          </div>

          <div className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mt-3">
            {!dashboard && !dashboardError
              ? '...'
              : dashboardError
                ? '—'
                : totalRooms}
          </div>

          {dashboardError ? (
            <div className="text-[11px] text-rose-500 mt-2">
              Could not load room data
            </div>
          ) : (
            <div className="space-y-2 mt-3">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Occupied
                </span>
                <span className="font-semibold text-slate-800">
                  {dashboard ? occupiedRooms : '—'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  Vacant
                </span>
                <span className="font-semibold text-slate-800">
                  {dashboard ? vacantRooms : '—'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Maintenance
                </span>
                <span className="font-semibold text-slate-800">
                  {dashboard ? maintenanceRooms : '—'}
                </span>
              </div>
            </div>
          )}
        </button>

        {/* Rent Collected */}
        <button
          type="button"
          onClick={() => onNavigate('rent_management')}
          className="text-left bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs hover:border-[#035E7B]/40 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Rent collected</span>
            <IndianRupee className="w-4 h-4 text-[#0C8067] group-hover:scale-110 transition" />
          </div>

          <div className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mt-3">
            {rentCollected}
          </div>

          <div className="text-[11px] text-[#0C8067] font-semibold mt-2">
            Current month
          </div>
        </button>

        {/* Pending Rent */}
        <button
          type="button"
          onClick={() => onNavigate('rent_management')}
          className="text-left bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs hover:border-[#035E7B]/40 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Pending rent</span>
            <Clock className="w-4 h-4 text-[#A8680C] group-hover:scale-110 transition" />
          </div>

          <div className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mt-3">
            {pendingRent}
          </div>

          <div className="text-[11px] text-[#A8680C] font-semibold mt-2">
            {dashboard
              ? `${formatINR(dashboard.rent.overdue_amount)} overdue`
              : dashboardError
                ? 'Could not load rent data'
                : 'Loading rent details...'}
          </div>
        </button>
      </section>

      {/* Main Content Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Rental Income Chart */}
        <article className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>Rental income</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                  Live Cycle Sync
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Actual rent billed and collected over the last 6 months (auto-updates on archive).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('rent_management')}
                className="text-xs font-semibold text-[#035E7B] bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 transition flex items-center gap-1"
                title="Open Rent Management"
              >
                <span>Rent Details</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {(() => {
            const months = dashboard?.income_chart?.months ?? [];

            const totalExpected = months.reduce(
              (sum, item) => sum + Number(item.expected || 0),
              0,
            );

            const totalCollected = months.reduce(
              (sum, item) => sum + Number(item.collected || 0),
              0,
            );

            const rawMaxAmount = Math.max(
              ...months.map((item) =>
                Math.max(
                  Number(item.expected || 0),
                  Number(item.collected || 0),
                ),
              ),
              0,
            );

            // Clean fallback scale for zero-income portfolio
            const maxAmount = rawMaxAmount > 0 ? rawMaxAmount : 10000;

            const collectionPercentage =
              totalExpected > 0
                ? (totalCollected / totalExpected) * 100
                : 0;

            return (
              <>
                <div className="flex flex-wrap items-baseline gap-3 my-4">
                  <span className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
                    {formatMoney(totalCollected)}
                  </span>
                  <span className="text-xs text-[#0C8067] font-medium">
                    {collectionPercentage.toFixed(1)}% of{' '}
                    {formatMoney(totalExpected)} expected
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-5 text-xs text-slate-500 mb-6">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#035E7B]" />
                    Rent collected
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E8F8F4] border border-[#14B8A6]" />
                    Expected rent
                  </span>
                  <span className="text-[10px] text-slate-400 ml-auto">
                    INR · Click any bar
                  </span>
                </div>

                {months.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-sm text-slate-400">
                    {dashboardError
                      ? 'Could not load income data.'
                      : 'Loading income data...'}
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto min-w-0">
                      <div className="h-48 grid grid-cols-[60px_1fr] gap-2 pt-2 min-w-[320px]">
                        <div className="flex flex-col justify-between text-[10px] text-slate-400 pb-6 text-right pr-2">
                          <span>{formatMoney(maxAmount)}</span>
                          <span>{formatMoney(maxAmount * 0.75)}</span>
                          <span>{formatMoney(maxAmount * 0.5)}</span>
                          <span>{formatMoney(0)}</span>
                        </div>

                        <div
                          className="grid gap-2 sm:gap-4 border-b border-slate-200 pb-2"
                          style={{
                            gridTemplateColumns: `repeat(${Math.max(months.length, 1)}, minmax(0, 1fr))`,
                          }}
                        >
                          {months.map((item, index) => {
                            const expected = Number(item.expected || 0);
                            const collected = Number(item.collected || 0);

                            const expectedHeight = Math.max(
                              (expected / maxAmount) * 100,
                              3,
                            );

                            const collectedHeight = Math.max(
                              (collected / maxAmount) * 100,
                              3,
                            );

                            const isCurrentCalendarMonth =
                              item.month ===
                                new Date().toLocaleString('en-US', {
                                  month: 'short',
                                }) &&
                              item.year === new Date().getFullYear();

                            const isLatestMonth = index === months.length - 1;
                            const isHighlighted = isLatestMonth || isCurrentCalendarMonth;

                            const expectedSelected =
                              selectedIncome?.month === item.month &&
                              selectedIncome?.year === item.year &&
                              selectedIncome?.type === 'expected';

                            const collectedSelected =
                              selectedIncome?.month === item.month &&
                              selectedIncome?.year === item.year &&
                              selectedIncome?.type === 'collected';

                            return (
                              <div
                                key={`${item.year}-${item.month}`}
                                className="flex flex-col justify-end items-center gap-2 group"
                              >
                                <div className="w-full flex items-end justify-center gap-1 h-36">
                                  <button
                                    type="button"
                                    aria-label={`${item.month} ${item.year}, expected rent ${formatMoney(expected)}`}
                                    aria-pressed={expectedSelected}
                                    onClick={() =>
                                      setSelectedIncome({
                                        month: item.month,
                                        year: item.year,
                                        type: 'expected',
                                        amount: expected,
                                      })
                                    }
                                    style={{ height: `${expectedHeight}%` }}
                                    title={`${item.month} ${item.year} · Expected rent: ${formatMoney(expected)}`}
                                    className={`w-2.5 sm:w-3.5 shrink-0 bg-[#E8F8F4] border border-[#14B8A6] border-b-0 rounded-t-sm cursor-pointer hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#14B8A6] ${
                                      expectedSelected
                                        ? 'ring-2 ring-[#14B8A6] brightness-95'
                                        : ''
                                    }`}
                                  />

                                  <button
                                    type="button"
                                    aria-label={`${item.month} ${item.year}, rent collected ${formatMoney(collected)}`}
                                    aria-pressed={collectedSelected}
                                    onClick={() =>
                                      setSelectedIncome({
                                        month: item.month,
                                        year: item.year,
                                        type: 'collected',
                                        amount: collected,
                                      })
                                    }
                                    style={{ height: `${collectedHeight}%` }}
                                    title={`${item.month} ${item.year} · Rent collected: ${formatMoney(collected)}`}
                                    className={`w-2.5 sm:w-3.5 shrink-0 rounded-t-sm cursor-pointer transition-all hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-[#035E7B] ${
                                      isHighlighted
                                        ? 'bg-[#035E7B]'
                                        : 'bg-[#0D8AB0]'
                                    } ${
                                      collectedSelected
                                        ? 'ring-2 ring-[#035E7B] brightness-90'
                                        : ''
                                    }`}
                                  />
                                </div>

                                <span
                                  className={`text-[10px] text-center ${
                                    isHighlighted
                                      ? 'font-bold text-[#035E7B]'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {item.month}
                                  {isLatestMonth && (
                                    <span className="block text-[8px] font-semibold text-teal-600 leading-tight">
                                      Active
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div
                      aria-live="polite"
                      className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      {selectedIncome ? (
                        <>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-xs text-slate-500">
                                {selectedIncome.month} {selectedIncome.year}
                              </p>
                              <p className="text-sm font-semibold text-slate-800 mt-1">
                                {selectedIncome.type === 'expected'
                                  ? 'Expected rent'
                                  : 'Rent collected'}
                              </p>
                            </div>
                            <p className="text-xl font-bold text-[#035E7B]">
                              {formatMoney(selectedIncome.amount)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedIncome(null)}
                            className="text-xs text-slate-500 hover:text-slate-800 underline mt-3"
                          >
                            Clear selection
                          </button>
                        </>
                      ) : (
                        <p className="text-xs text-slate-500">
                          Click on the blue or green bar of any month. The exact amount will be shown here.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </>
            );
          })()}
        </article>

        {/* Occupancy and Electricity */}
        <div className="space-y-4">
          <article className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-800">Occupancy</h2>
              <button
                type="button"
                onClick={() => onNavigate('rooms')}
                className="text-xs font-semibold text-[#035E7B] hover:underline flex items-center gap-1"
              >
                <span>View rooms</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {!dashboard && !dashboardError ? (
              <div className="h-24 flex items-center justify-center text-sm text-slate-400">
                Loading occupancy...
              </div>
            ) : dashboardError || !occupancy ? (
              <div className="h-24 flex items-center justify-center text-sm text-slate-400">
                Could not load occupancy data.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-5 mt-2">
                  <div
                    className="relative w-20 h-20 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: `conic-gradient(#14B8A6 0% ${occupancyPercentage}%, #EAF4F7 ${occupancyPercentage}% 100%)`,
                    }}
                  >
                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-inner">
                      <span className="text-[11px] font-bold text-[#035E7B]">
                        {occupancyPercentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="text-2xl font-bold text-slate-800 tracking-tight">
                      {occupancyPercentage.toFixed(1)}%
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {occupancy.occupied} of {occupancy.total} rooms occupied
                    </p>
                    <button
                      type="button"
                      onClick={() => onNavigate('rooms')}
                      className="text-xs text-[#035E7B] font-semibold mt-1 hover:underline"
                    >
                      {occupancy.vacant} vacant rooms
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-500">
                  <span>
                    <span className="inline-block w-2 h-2 rounded-full bg-[#14B8A6] mr-1.5" />
                    Occupied: {occupancy.occupied}
                  </span>
                  <span>
                    <span className="inline-block w-2 h-2 rounded-full bg-[#EAF4F7] border border-slate-300 mr-1.5" />
                    Vacant: {occupancy.vacant}
                  </span>
                  <span>
                    <span className="inline-block w-2 h-2 rounded-full bg-[#A8680C] mr-1.5" />
                    Maintenance: {occupancy.maintenance}
                  </span>
                </div>
              </>
            )}
          </article>

          <article className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-800">
                Electricity this month
              </h2>
              <Zap className="w-4 h-4 text-[#0D8AB0]" />
            </div>

            {dashboardError ? (
              <div className="py-5 text-center">
                <p className="text-xs text-rose-500">
                  Could not load electricity data.
                </p>
                <button
                  type="button"
                  onClick={() => void fetchDashboardData()}
                  className="text-xs text-[#035E7B] font-semibold hover:underline mt-2 cursor-pointer"
                >
                  Try again
                </button>
              </div>
            ) : !dashboard || dashboardLoading ? (
              <div className="py-5 text-center text-xs text-slate-400">
                Loading electricity data...
              </div>
            ) : (
              <>
                <div className="flex justify-between items-baseline my-3">
                  <div>
                    <div className="text-[10px] text-slate-400">Total billed</div>
                    <div className="text-lg font-bold text-slate-800">
                      {formatINR(electricityBilled)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400">Pending</div>
                    <div className="text-lg font-bold text-[#A8680C]">
                      {formatINR(electricityPending)}
                    </div>
                  </div>
                </div>

                <div className="w-full bg-[#EAF4F7] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#14B8A6] h-full rounded-full transition-all duration-300"
                    style={{ width: `${electricityCollectionRate}%` }}
                  />
                </div>

                <div className="flex items-center justify-between gap-2 mt-2.5">
                  <p className="text-[10px] text-slate-400">
                    {formatINR(electricityCollected)} collected
                  </p>
                  <p className="text-[10px] font-semibold text-[#0C8067]">
                    {electricityCollectionRate.toFixed(1)}%
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] text-slate-400">Overdue electricity</p>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">
                      {formatINR(dashboard.electricity.overdue_amount)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('electricity_bills')}
                    className="text-[11px] font-semibold text-[#035E7B] hover:underline"
                  >
                    View bills →
                  </button>
                </div>
              </>
            )}
          </article>
        </div>
      </section>

      {/* Outstanding Payments and Recent Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <article className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800">
                  Payments that need attention
                </h2>
                {enrichedAttentionPayments.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    {enrichedAttentionPayments.length} pending
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                One-click mark paid, record payment, or send WhatsApp reminders.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate(filterTab === 'electricity' ? 'electricity_bills' : 'rent_management')}
              className="text-xs font-semibold text-[#035E7B] hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>View all in {filterTab === 'electricity' ? 'Electricity Bills' : 'Rent Management'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Toast Notification Banner */}
          {toastMessage && (
            <div
              className={`mb-4 px-4 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between gap-2 transition shadow-2xs ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : toastMessage.type === 'error'
                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                    : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {toastMessage.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : toastMessage.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <MessageCircle className="w-4 h-4 text-blue-600 shrink-0" />
                )}
                <span>{toastMessage.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="text-slate-400 hover:text-slate-600 font-bold ml-2 text-sm leading-none cursor-pointer"
              >
                ×
              </button>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 mb-4 pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-[#035E7B] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              All dues <span className="ml-1 opacity-80">({enrichedAttentionPayments.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('overdue')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                filterTab === 'overdue'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Overdue <span className="ml-1 opacity-80">({overdueCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('rent')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                filterTab === 'rent'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
              }`}
            >
              Rent <span className="ml-1 opacity-80">({rentCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('electricity')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                filterTab === 'electricity'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Electricity <span className="ml-1 opacity-80">({electricityCount})</span>
            </button>
          </div>

          <div className="overflow-x-auto -mx-5 sm:mx-0 px-5 sm:px-0">
            <table className="w-full text-left text-xs min-w-[560px]">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3 rounded-l-lg">Tenant</th>
                  <th className="py-2.5 px-3">Property / Room</th>
                  <th className="py-2.5 px-3">Due / Billed</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attentionLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 px-3 text-center text-slate-400">
                      <div className="inline-flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-[#035E7B]" />
                        <span>Loading outstanding payments...</span>
                      </div>
                    </td>
                  </tr>
                ) : attentionError ? (
                  <tr>
                    <td colSpan={5} className="py-8 px-3 text-center text-rose-500">
                      Could not load outstanding payments.{' '}
                      <button
                        type="button"
                        onClick={() => void fetchOutstandingPayments()}
                        className="font-semibold underline cursor-pointer hover:text-rose-700 ml-1"
                      >
                        Try again
                      </button>
                    </td>
                  </tr>
                ) : filteredAttentionPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 px-3 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center py-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                          <CheckCircle className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-semibold text-slate-800">
                          {filterTab === 'all'
                            ? 'All dues are cleared! You are all caught up.'
                            : `No ${filterTab} payments needing attention.`}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Cash flow is moving smoothly with no overdue or pending balances in this view.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  visibleAttentionPayments.map((item) => {
                    const isOverdue = item.status === 'OVERDUE';
                    const isPartial = item.status === 'PARTIAL';
                    const statusLabel = isOverdue
                      ? 'Overdue'
                      : isPartial
                        ? 'Partial'
                        : 'Pending';
                    const statusClasses = isOverdue
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : isPartial
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-sky-50 text-sky-700 border border-sky-200';
                    const dotClasses = isOverdue
                      ? 'bg-rose-500'
                      : isPartial
                        ? 'bg-amber-500'
                        : 'bg-sky-500';

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 transition cursor-pointer group"
                        onClick={() => onNavigate(item.type === 'electricity' ? 'electricity_bills' : 'rent_management')}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0 ${
                                isOverdue
                                  ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-200/50'
                                  : 'bg-sky-100 text-sky-700'
                              }`}
                            >
                              {getInitials(item.tenantName)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-800 truncate">
                                {item.tenantName}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {item.isPastDue ? (
                                  <span className="text-rose-600 font-medium inline-flex items-center gap-0.5">
                                    <Clock className="w-2.5 h-2.5" />
                                    {formatDueDate(item.dueDate)}
                                  </span>
                                ) : (
                                  formatDueDate(item.dueDate)
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          <div className="font-medium text-slate-800 truncate">
                            {item.propertyName}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-500">
                              Room {item.roomNumber}
                            </span>
                            <span
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                                item.type === 'electricity'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {item.type === 'electricity' && <Zap className="w-2.5 h-2.5" />}
                              {item.type === 'electricity' ? 'Power' : 'Rent'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900 text-xs">
                            {formatINR(item.amount)}
                          </div>
                          {isPartial && (
                            <div className="text-[10px] text-slate-400">
                              Paid {formatINR(item.amountPaid)} / {formatINR(item.totalAmount)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusClasses}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${dotClasses}`} />
                            {statusLabel}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center justify-end gap-2">
                            {/* Mark Paid Button -> marks payment received from tenant */}
                            <button
                              type="button"
                              disabled={updatingRecordId === item.id}
                              onClick={() => void handleMarkPaid(item)}
                              title={`Tenant ${item.tenantName} se payment receive hone par Mark Paid karein`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#0C8067] border border-emerald-300 rounded-lg text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                              {updatingRecordId === item.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              )}
                              <span>
                                {updatingRecordId === item.id ? 'Saving...' : 'Mark Paid'}
                              </span>
                            </button>

                            {/* WhatsApp Reminder Button */}
                            <button
                              type="button"
                              onClick={() => handleSendReminder(item)}
                              title={`Tenant ${item.tenantName} ko WhatsApp reminder bhejein`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5 fill-white text-emerald-600" />
                              <span>Remind</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 mt-4 pt-3 border-t border-slate-100 gap-2">
            <span>
              {attentionLoading
                ? 'Loading dues count...'
                : attentionError
                  ? 'Dues count unavailable'
                  : `${visibleAttentionPayments.length} of ${filteredAttentionPayments.length} dues shown ${
                      filterTab !== 'all' ? `(filter: ${filterTab})` : ''
                    }`}
            </span>

            <div className="flex items-center gap-3">
              {filteredAttentionPayments.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllDues(!showAllDues)}
                  className="inline-flex items-center gap-1 text-[#035E7B] font-semibold hover:underline cursor-pointer"
                >
                  <span>{showAllDues ? 'Show less' : `Show all (${filteredAttentionPayments.length})`}</span>
                  {showAllDues ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => onNavigate(filterTab === 'electricity' ? 'electricity_bills' : 'rent_management')}
                className="text-[#035E7B] font-semibold hover:underline cursor-pointer"
              >
                Manage reminders →
              </button>
            </div>
          </div>
        </article>

        {/* Recent Activity */}
        <article className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-bold text-slate-800">Recent activity</h2>
            <span className="text-[10px] text-slate-400">Latest payments</span>
          </div>

          <div className="space-y-4">
            {!dashboard && !dashboardError && (
              <p className="text-xs text-slate-500 py-3">
                Loading recent activity...
              </p>
            )}

            {dashboardError && (
              <div className="py-3">
                <p className="text-xs text-rose-500">
                  Could not load recent activity.
                </p>
                <button
                  type="button"
                  onClick={() => void fetchDashboardData()}
                  className="text-xs text-[#035E7B] font-semibold hover:underline mt-2 cursor-pointer"
                >
                  Try again
                </button>
              </div>
            )}

            {dashboard && recentPayments.length === 0 && (
              <p className="text-xs text-slate-500 py-3">
                No payment activity available yet.
              </p>
            )}

            {recentPayments.slice(0, 5).map((payment) => {
              const isCompleted = payment.status === 'COMPLETED';
              const isPending = payment.status === 'PENDING';
              const isFailed = payment.status === 'FAILED';
              const isRefunded = payment.status === 'REFUNDED';

              const activityTitle = isCompleted
                ? 'Payment received'
                : isPending
                  ? 'Payment pending'
                  : isFailed
                    ? 'Payment failed'
                    : isRefunded
                      ? 'Payment refunded'
                      : 'Payment activity';

              const iconClasses = isCompleted
                ? 'bg-emerald-50 text-[#0C8067]'
                : isPending
                  ? 'bg-amber-50 text-amber-700'
                  : isFailed || isRefunded
                    ? 'bg-rose-50 text-rose-600'
                    : 'bg-blue-50 text-[#035E7B]';

              const billLabel =
                payment.bill_type === 'RENT'
                  ? 'Rent'
                  : payment.bill_type === 'ELECTRICITY'
                    ? 'Electricity'
                    : 'Payment';

              const activityPage: PageType =
                payment.bill_type === 'ELECTRICITY'
                  ? 'electricity_bills'
                  : 'rent_management';

              return (
                <button
                  key={payment.id}
                  type="button"
                  onClick={() => onNavigate(activityPage)}
                  className="w-full flex items-start gap-3 text-left cursor-pointer hover:bg-slate-50 p-2 rounded-xl transition -mx-2"
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconClasses}`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-800">
                      {activityTitle}
                    </div>
                    <div className="text-[11px] text-slate-500 break-words">
                      {payment.tenant || 'Unknown tenant'} · {formatINR(payment.amount)}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {billLabel}
                      {payment.payment_method
                        ? ` · ${payment.payment_method.replace('_', ' ')}`
                        : ''}
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      {formatActivityDate(payment.payment_date)} · {payment.status}
                    </div>
                    {payment.transaction_reference && (
                      <div className="text-[9px] text-slate-400 mt-0.5 break-all">
                        Ref: {payment.transaction_reference}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {dashboard && recentPayments.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('rent_management')}
              className="w-full text-left text-xs font-semibold text-[#035E7B] hover:underline mt-4 pt-3 border-t border-slate-100"
            >
              View payment records →
            </button>
          )}
        </article>
      </section>

      {/* Quick Actions */}
      <section className="bg-[#E8F4F7] border border-[#A8CBD6]/50 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <strong className="text-sm font-bold text-[#035E7B]">
            Less admin. More peace of mind.
          </strong>
          <p className="text-xs text-slate-500 mt-0.5">
            Your everyday rental tasks, one step away.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('add_property')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-[#035E7B] rounded-xl text-xs font-semibold transition shadow-2xs cursor-pointer"
          >
            <Building className="w-3.5 h-3.5" />
            <span>Add property</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('add_tenant')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-[#035E7B] rounded-xl text-xs font-semibold transition shadow-2xs cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Add tenant</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('electricity_bill_form')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-[#035E7B] rounded-xl text-xs font-semibold transition shadow-2xs cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Add reading</span>
          </button>
        </div>
      </section>

      {/* Page Footer */}
      <footer className="pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
        <span>
          KirayaSaathi · Smart rental management for every property owner
        </span>
        <span>All amounts in INR · IST</span>
      </footer>
    </div>
  );
};
