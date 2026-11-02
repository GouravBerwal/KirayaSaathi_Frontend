
import React, { useEffect, useMemo, useState } from 'react';
import {
  PageType,
  RentRecord,
  PaymentRecord,
  Property,
  Tenant,
  ElectricityBill,
} from '../types';
import {
  Calendar,
  Download,
  TrendingUp,
  Building,
  CheckCircle2,
  Clock,
  Info,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { apiRequest } from '../utils/api';

interface ReportsPageProps {
  onNavigate: (page: PageType) => void;
  rentRecords?: RentRecord[];
  payments?: PaymentRecord[];
  properties?: Property[];
  tenants?: Tenant[];
  electricityBills?: ElectricityBill[];
  onRefreshData?: () => Promise<void> | void;
}

interface ReportsData {
  period: {
    start_date: string;
    end_date: string;
  };
  summary: {
    rent_collected: string;
    electricity_collected: string;
    total_collected: string;
    outstanding_rent: string;
    outstanding_electricity: string;
    total_outstanding: string;
    total_rooms: number;
    occupied_rooms: number;
    vacant_rooms: number;
    maintenance_rooms: number;
    occupancy_rate: number;
  };
  monthly_income: {
    month: string;
    year: number;
    expected: string;
    collected: string;
  }[];
  property_performance: {
    property_id: number;
    property_name: string;
    total_rooms: number;
    occupied_rooms: number;
    expected_rent: string;
    collected_rent: string;
    pending_rent: string;
    collection_rate: number;
  }[];
}

type SelectedMonthlyBar = {
  key: string;
  type: 'expected' | 'collected';
} | null;

const today = new Date();

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getInitialStartDate(): string {
  const date = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  return formatDate(date);
}

function formatMoney(value: string | number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatPeriod(start: string, end: string): string {
  if (!start || !end) return 'Select period';

  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);

  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    year: 'numeric',
  };

  const first = startDate.toLocaleDateString('en-IN', options);
  const last = endDate.toLocaleDateString('en-IN', options);

  return first === last ? first : `${first} – ${last}`;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  onNavigate: _onNavigate,
  rentRecords = [],
  payments = [],
  properties: propList = [],
  tenants: _tenants = [],
  electricityBills = [],
  onRefreshData,
}) => {
  const [startDate, setStartDate] = useState(getInitialStartDate);
  const [endDate, setEndDate] = useState(formatDate(today));
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState('All');
  const [showDateFilters, setShowDateFilters] = useState(false);

  const [report, setReport] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedMonthlyBar, setSelectedMonthlyBar] =
    useState<SelectedMonthlyBar>(null);

  const [selectedOccupancyProperty, setSelectedOccupancyProperty] =
    useState<number | null>(null);

  // Auto-sync on mount and on live payments / records change
  useEffect(() => {
    if (onRefreshData) {
      void onRefreshData();
    }
  }, []);

  useEffect(() => {
    setRefreshKey((k) => k + 1);
  }, [payments.length, rentRecords.length]);

  useEffect(() => {
    let cancelled = false;

    async function loadReports() {
      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams({
          start_date: startDate,
          end_date: endDate,
        });

        if (selectedPropertyFilter !== 'All') {
          params.set('property_id', selectedPropertyFilter);
        }

        const data = await apiRequest<ReportsData>(
          `/api/reports/?${params.toString()}`,
        );

        if (!cancelled) {
          setReport(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Reports load nahi ho paaye.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (startDate && endDate && startDate <= endDate) {
      void loadReports();
    } else {
      setLoading(false);
      setError('Start date, end date se pehle honi chahiye.');
    }

    return () => {
      cancelled = true;
    };
  }, [startDate, endDate, selectedPropertyFilter, refreshKey]);

  const handleManualRefresh = async () => {
    setIsSyncing(true);
    setError('');
    try {
      if (onRefreshData) await onRefreshData();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh nahi ho saka.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Date ya property filter badalne par purani selection clear hogi.
  useEffect(() => {
    setSelectedMonthlyBar(null);
    setSelectedOccupancyProperty(null);
  }, [startDate, endDate, selectedPropertyFilter]);

  const summary = report?.summary;
  const rawMonthlyIncome = report?.monthly_income ?? [];
  const rawProperties = report?.property_performance ?? [];

  // Live fallback and real-time merging:
  const liveScopedPayments = useMemo(() => {
    return payments.filter((p) => {
      const pDate = (p.paymentDate || '').slice(0, 10);
      if (pDate && (pDate < startDate || pDate > endDate)) return false;
      if (selectedPropertyFilter !== 'All') {
        const prop = propList.find((pr) => String(pr.id) === selectedPropertyFilter);
        if (prop && p.propertyName !== prop.name) return false;
      }
      return true;
    });
  }, [payments, startDate, endDate, selectedPropertyFilter, propList]);

  const liveRentCollected = useMemo(() => {
    return liveScopedPayments
      .filter((p) => p.paymentType === 'rent')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [liveScopedPayments]);

  const liveElecCollected = useMemo(() => {
    return liveScopedPayments
      .filter((p) => p.paymentType === 'electricity')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [liveScopedPayments]);

  const liveTotalCollected = liveRentCollected + liveElecCollected;

  const effectiveRentCollected = Math.max(
    Number(summary?.rent_collected ?? 0),
    liveRentCollected
  );

  const effectiveTotalCollected = Math.max(
    Number(summary?.total_collected ?? 0),
    liveTotalCollected
  );

  const effectiveOutstandingRent = useMemo(() => {
    if (rentRecords && rentRecords.length > 0) {
      return rentRecords
        .filter((r) => !r.isArchived)
        .reduce(
          (sum, r) => sum + Math.max(0, Number(r.balance ?? (r.rentDue - (r.received || 0)))),
          0
        );
    }
    return Number(summary?.outstanding_rent ?? 0);
  }, [rentRecords, summary?.outstanding_rent]);

  const effectiveOutstandingElec = useMemo(() => {
    if (electricityBills && electricityBills.length > 0) {
      return electricityBills.reduce((sum, b) => {
        const paid = Number(b.amountPaid || (b.status === 'Paid' ? b.amount : 0));
        return sum + Math.max(0, Number(b.amount - paid));
      }, 0);
    }
    return Number(summary?.outstanding_electricity ?? 0);
  }, [electricityBills, summary?.outstanding_electricity]);

  const effectiveTotalOutstanding = effectiveOutstandingRent + effectiveOutstandingElec;

  const totalPortfolioRooms = useMemo(() => {
    if (propList.length > 0) {
      return propList.reduce((sum, p) => sum + (p.totalRooms || 0), 0);
    }
    return Number(summary?.total_rooms ?? 0);
  }, [propList, summary?.total_rooms]);

  const occupiedPortfolioRooms = useMemo(() => {
    if (propList.length > 0) {
      return propList.reduce((sum, p) => sum + (p.occupiedRooms || 0), 0);
    }
    return Number(summary?.occupied_rooms ?? 0);
  }, [propList, summary?.occupied_rooms]);

  const effectiveOccupancyRate = totalPortfolioRooms > 0
    ? Math.round((occupiedPortfolioRooms / totalPortfolioRooms) * 1000) / 10
    : Number(summary?.occupancy_rate ?? 0);

  // Merge live payments into monthly_income
  const monthlyIncome = useMemo(() => {
    if (rawMonthlyIncome.length === 0) return [];
    return rawMonthlyIncome.map((item) => {
      const monthIndex = new Date(Date.parse(`${item.month} 1, ${item.year}`)).getMonth() + 1;
      const monthPrefix = `${item.year}-${String(monthIndex).padStart(2, '0')}`;
      const monthPayments = payments.filter(
        (p) => (p.paymentDate || '').slice(0, 7) === monthPrefix && p.paymentType === 'rent'
      );
      const livePmtTotal = monthPayments.reduce((s, p) => s + p.amount, 0);
      const collected = Math.max(Number(item.collected || 0), livePmtTotal);
      return {
        ...item,
        collected: String(collected),
      };
    });
  }, [rawMonthlyIncome, payments]);

  // Merge live performance into properties
  const properties = useMemo(() => {
    if (rawProperties.length === 0) return [];
    return rawProperties.map((prop) => {
      const livePropPayments = liveScopedPayments.filter(
        (p) => p.propertyName === prop.property_name && p.paymentType === 'rent'
      );
      const liveCollected = livePropPayments.reduce((s, p) => s + p.amount, 0);
      const finalCollected = Math.max(Number(prop.collected_rent || 0), liveCollected);
      const expected = Number(prop.expected_rent || 0);
      const pending = Math.max(0, expected - finalCollected);
      const rate = expected > 0 ? (finalCollected / expected) * 100 : 0;
      return {
        ...prop,
        collected_rent: String(finalCollected),
        pending_rent: String(pending),
        collection_rate: rate,
      };
    });
  }, [rawProperties, liveScopedPayments]);

  const expectedTotal = useMemo(
    () =>
      properties.reduce(
        (total, property) => total + Number(property.expected_rent || 0),
        0,
      ),
    [properties],
  );

  const collectionRate = expectedTotal
    ? (effectiveRentCollected / expectedTotal) * 100
    : 0;

  const maxChartValue = Math.max(
    1,
    ...monthlyIncome.flatMap((item) => [
      Number(item.expected),
      Number(item.collected),
    ]),
  );

  const chartCeiling = useMemo(() => {
    if (maxChartValue <= 10) return 100;
    if (maxChartValue <= 1000) return 2000;
    if (maxChartValue <= 10000) return Math.ceil(maxChartValue / 2000) * 2000 || 2000;
    return Math.ceil(maxChartValue / 10000) * 10000 || 10000;
  }, [maxChartValue]);

  function downloadReport() {
    if (!report) return;

    const rows = [
      [
        'Property',
        'Total Rooms',
        'Occupied Rooms',
        'Expected Rent',
        'Collected Rent',
        'Pending Rent',
        'Collection Rate (%)',
      ],
      ...properties.map((property) => [
        property.property_name,
        property.total_rooms,
        property.occupied_rooms,
        property.expected_rent,
        property.collected_rent,
        property.pending_rent,
        property.collection_rate,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(','),
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'KirayaSaathi-reports.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function selectMonthlyBar(
    key: string,
    type: 'expected' | 'collected',
  ) {
    setSelectedMonthlyBar((current) =>
      current?.key === key && current.type === type
        ? null
        : { key, type },
    );
  }

  function selectOccupancyProperty(propertyId: number) {
    setSelectedOccupancyProperty((current) =>
      current === propertyId ? null : propertyId,
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight">
            Clarity for your next decision
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Understand your income, occupancy and collection health across the portfolio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-[#E8F8F4] text-[#0C8067] border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0C8067] animate-pulse" />
            Live Sync
          </span>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isSyncing || loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-[#035E7B] rounded-xl text-xs font-semibold transition shadow-2xs"
            title="Sync latest records &amp; payments from backend"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isSyncing || loading ? 'animate-spin' : ''}`}
            />
            <span>{isSyncing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDateFilters((current) => !current)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-[#035E7B] rounded-xl text-xs font-semibold transition shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatPeriod(startDate, endDate)}</span>
          </button>

          <button
            type="button"
            onClick={downloadReport}
            disabled={!report || loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#035E7B] hover:bg-[#024B63] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Download report</span>
          </button>
        </div>
      </section>

      {showDateFilters && (
        <section className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="space-y-1">
            <label
              htmlFor="reports-start-date"
              className="block text-xs font-semibold text-slate-600"
            >
              Start date
            </label>
            <input
              id="reports-start-date"
              type="date"
              value={startDate}
              max={endDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="reports-end-date"
              className="block text-xs font-semibold text-slate-600"
            >
              End date
            </label>
            <input
              id="reports-end-date"
              type="date"
              value={endDate}
              min={startDate}
              max={formatDate(today)}
              onChange={(event) => setEndDate(event.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowDateFilters(false)}
            className="px-4 py-2 bg-[#035E7B] text-white rounded-lg text-xs font-semibold"
          >
            Done
          </button>
        </section>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          <p className="font-semibold">Reports load nahi ho paaye.</p>
          <p className="mt-1 break-words">{error}</p>
          <button
            type="button"
            onClick={() => {
              setError('');
              setRefreshKey((current) => current + 1);
            }}
            className="mt-2 underline font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-500">
          Reports database se load ho rahe hain...
        </div>
      )}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Rent collected</span>
            <TrendingUp className="w-4 h-4 text-[#0C8067]" />
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mt-3">
            {formatMoney(effectiveRentCollected)}
          </div>
          <span className="text-[11px] text-[#0C8067] font-semibold mt-2 block">
            {effectiveTotalCollected > effectiveRentCollected
              ? `${formatMoney(effectiveTotalCollected)} total incl. electricity`
              : 'Selected period'}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Portfolio occupancy</span>
            <Building className="w-4 h-4 text-[#0D8AB0]" />
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mt-3">
            {effectiveOccupancyRate}%
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            {occupiedPortfolioRooms} occupied · {Math.max(0, totalPortfolioRooms - occupiedPortfolioRooms)} vacant
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Rent collection rate</span>
            <CheckCircle2 className="w-4 h-4 text-[#0C8067]" />
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mt-3">
            {collectionRate.toFixed(1)}%
          </div>
          <span className="text-[11px] text-slate-500 mt-2 block">
            {formatMoney(effectiveRentCollected)} of {formatMoney(expectedTotal)} expected
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total outstanding</span>
            <Clock className="w-4 h-4 text-[#A8680C]" />
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mt-3">
            {formatMoney(effectiveTotalOutstanding)}
          </div>
          <span className="text-[11px] text-[#A8680C] font-semibold mt-2 block">
            Rent {formatMoney(effectiveOutstandingRent)} + electricity{' '}
            {formatMoney(effectiveOutstandingElec)}
          </span>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <article className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Monthly rental income
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Expected rent compared with completed rent payments.
              </p>
            </div>
            <span className="text-xs font-semibold text-[#035E7B]">
              {monthlyIncome.length} months
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 pt-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#035E7B]" />
              Rent collected
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E8F8F4] border border-[#14B8A6]" />
              Expected rent
            </span>
            <small className="text-[10px] text-slate-400 ml-auto">
              INR · Click a bar for amount
            </small>
          </div>

          <div className="h-56 grid grid-cols-[50px_1fr] gap-2 pt-2 relative">
            <div className="flex flex-col justify-between text-[10px] text-slate-400 pb-7 text-right pr-2">
              <span>{formatMoney(chartCeiling)}</span>
              <span>{formatMoney(chartCeiling * 0.66)}</span>
              <span>{formatMoney(chartCeiling * 0.33)}</span>
              <span>₹0</span>
            </div>

            <div className="relative border-b border-slate-200 pb-2 min-w-0">
              <div className="absolute inset-x-0 top-2 border-b border-dashed border-slate-200 pointer-events-none" />
              <div className="absolute inset-x-0 top-1/3 border-b border-dashed border-slate-200 pointer-events-none" />
              <div className="absolute inset-x-0 top-2/3 border-b border-dashed border-slate-200 pointer-events-none" />

              <div
                className="h-full grid gap-2 sm:gap-4 items-end"
                style={{
                  gridTemplateColumns: `repeat(${Math.max(monthlyIncome.length, 1)}, minmax(0, 1fr))`,
                }}
              >
                {monthlyIncome.map((item, index) => {
                  const expectedHeight =
                    (Number(item.expected) / chartCeiling) * 145;
                  const collectedHeight =
                    (Number(item.collected) / chartCeiling) * 145;
                  const isLatest = index === monthlyIncome.length - 1;
                  const monthKey = `${item.year}-${item.month}`;

                  const expectedSelected =
                    selectedMonthlyBar?.key === monthKey &&
                    selectedMonthlyBar.type === 'expected';

                  const collectedSelected =
                    selectedMonthlyBar?.key === monthKey &&
                    selectedMonthlyBar.type === 'collected';

                  return (
                    <div
                      key={monthKey}
                      className="flex flex-col items-center justify-end h-full min-w-0"
                    >
                      <div className="w-full flex items-end justify-center gap-1">
                        <button
                          type="button"
                          aria-label={`Expected rent for ${item.month} ${item.year}: ${formatMoney(item.expected)}`}
                          aria-pressed={expectedSelected}
                          onClick={() =>
                            selectMonthlyBar(monthKey, 'expected')
                          }
                          style={{
                            height: `${Math.max(expectedHeight, Number(item.expected) > 0 ? 6 : 2)}px`,
                          }}
                          className={`appearance-none p-0 w-2.5 sm:w-4 shrink-0 rounded-t-sm border transition-all focus:outline-none focus:ring-2 focus:ring-[#14B8A6] ${
                            expectedSelected
                              ? 'bg-[#14B8A6] border-[#035E7B] ring-2 ring-[#14B8A6]/30'
                              : 'bg-[#E8F8F4] border-[#D0EEE7] hover:bg-[#C8EEE5]'
                          }`}
                          title={`Expected: ${formatMoney(item.expected)}`}
                        />

                        <button
                          type="button"
                          aria-label={`Collected rent for ${item.month} ${item.year}: ${formatMoney(item.collected)}`}
                          aria-pressed={collectedSelected}
                          onClick={() =>
                            selectMonthlyBar(monthKey, 'collected')
                          }
                          style={{
                            height: `${Math.max(collectedHeight, Number(item.collected) > 0 ? 6 : 2)}px`,
                          }}
                          className={`appearance-none p-0 w-2.5 sm:w-4 shrink-0 rounded-t-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#14B8A6] ${
                            collectedSelected
                              ? 'bg-[#14B8A6] ring-2 ring-[#035E7B]/40'
                              : isLatest
                                ? 'bg-[#035E7B] hover:brightness-90'
                                : 'bg-[#0D8AB0] hover:brightness-90'
                          }`}
                          title={`Collected: ${formatMoney(item.collected)}`}
                        />
                      </div>

                      <span
                        className={`text-[10px] mt-2 ${
                          isLatest
                            ? 'font-bold text-[#035E7B]'
                            : 'text-slate-400'
                        }`}
                      >
                        {item.month}
                      </span>
                    </div>
                  );
                })}

                {monthlyIncome.length === 0 && (
                  <div className="col-span-full flex items-center justify-center text-xs text-slate-400">
                    Is period ke liye monthly data nahi hai.
                  </div>
                )}
              </div>
            </div>
          </div>

          {selectedMonthlyBar && (() => {
            const selectedMonth = monthlyIncome.find(
              (item) =>
                `${item.year}-${item.month}` === selectedMonthlyBar.key,
            );

            if (!selectedMonth) return null;

            const isExpected = selectedMonthlyBar.type === 'expected';

            return (
              <div
                aria-live="polite"
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">
                      {selectedMonth.month} {selectedMonth.year}
                    </p>
                    <p className="text-sm font-semibold text-slate-800 mt-1">
                      {isExpected ? 'Expected rent' : 'Collected rent'}
                    </p>
                    <p className="text-xl font-bold text-[#035E7B] mt-1">
                      {formatMoney(
                        isExpected
                          ? selectedMonth.expected
                          : selectedMonth.collected,
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedMonthlyBar(null)}
                    className="text-xs text-slate-500 hover:text-slate-800 underline"
                  >
                    Deselect
                  </button>
                </div>
              </div>
            );
          })()}

          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold pt-1">
            <TrendingUp className="w-4 h-4" />
            <span>
              Total rent collected: {formatMoney(effectiveRentCollected)}
            </span>
          </div>
        </article>

        <article className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Occupancy by property
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              See where your next opportunity is.
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Click a bar to view room details.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {properties.map((property) => {
              const percentage = property.total_rooms
                ? (property.occupied_rooms / property.total_rooms) * 100
                : 0;

              const isSelected =
                selectedOccupancyProperty === property.property_id;

              return (
                <div key={property.property_id} className="space-y-1.5">
                  <div className="flex justify-between text-xs gap-2">
                    <span className="font-semibold text-slate-800">
                      {property.property_name}
                    </span>
                    <span className="text-slate-400 whitespace-nowrap">
                      {property.occupied_rooms} / {property.total_rooms} ·{' '}
                      {percentage.toFixed(1)}%
                    </span>
                  </div>

                  <button
                    type="button"
                    aria-label={`${property.property_name}: ${property.occupied_rooms} occupied out of ${property.total_rooms} rooms, ${percentage.toFixed(1)} percent`}
                    aria-pressed={isSelected}
                    onClick={() =>
                      selectOccupancyProperty(property.property_id)
                    }
                    className="block w-full appearance-none p-0 text-left bg-[#EAF4F7] h-3 rounded-full overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#035E7B]/30"
                    title={`${property.occupied_rooms} occupied / ${property.total_rooms} rooms`}
                  >
                    <span
                      className={`block h-full rounded-full transition-all ${
                        isSelected ? 'bg-[#035E7B]' : 'bg-[#14B8A6]'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </button>

                  {isSelected && (
                    <div
                      aria-live="polite"
                      className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs mt-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-slate-800">
                          {property.property_name}
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelectedOccupancyProperty(null)}
                          className="text-slate-500 hover:text-slate-800 underline"
                        >
                          Deselect
                        </button>
                      </div>

                      <p className="text-slate-600 mt-2">
                        Occupied rooms: {property.occupied_rooms}
                      </p>
                      <p className="text-slate-600">
                        Total rooms: {property.total_rooms}
                      </p>
                      <p className="text-slate-600">
                        Remaining rooms: {Math.max(
                          0,
                          property.total_rooms - property.occupied_rooms,
                        )}
                      </p>
                      <p className="font-semibold text-[#035E7B] mt-1">
                        Occupancy: {percentage.toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            {properties.length === 0 && (
              <p className="text-xs text-slate-400">
                Abhi koi property available nahi hai.
              </p>
            )}
          </div>

          <p className="text-[11px] text-slate-400 pt-3 border-t border-slate-100">
            {summary?.vacant_rooms ?? 0} vacant rooms ·{' '}
            {summary?.maintenance_rooms ?? 0} rooms under maintenance
          </p>
        </article>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Property performance
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {formatPeriod(startDate, endDate)} · Rent only, excluding deposits and electricity.
            </p>
          </div>

          <div className="relative self-start sm:self-auto">
            <select
              value={selectedPropertyFilter}
              onChange={(event) =>
                setSelectedPropertyFilter(event.target.value)
              }
              className="h-9 pl-3 pr-8 bg-white border border-slate-200 text-[#035E7B] font-semibold rounded-xl text-xs appearance-none focus:outline-none focus:border-[#035E7B]"
            >
              <option value="All">All properties</option>
              {properties.map((property) => (
                <option
                  key={property.property_id}
                  value={String(property.property_id)}
                >
                  {property.property_name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3 rounded-l-lg">PROPERTY</th>
                <th className="py-2.5 px-3">OCCUPANCY</th>
                <th className="py-2.5 px-3">EXPECTED RENT</th>
                <th className="py-2.5 px-3">COLLECTED</th>
                <th className="py-2.5 px-3">PENDING</th>
                <th className="py-2.5 px-3 rounded-r-lg">COLLECTION RATE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {properties.map((property) => {
                const occupancy = property.total_rooms
                  ? (property.occupied_rooms / property.total_rooms) * 100
                  : 0;

                return (
                  <tr
                    key={property.property_id}
                    className="hover:bg-slate-50/70 transition"
                  >
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {property.property_name}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {property.occupied_rooms} / {property.total_rooms} ·{' '}
                      {occupancy.toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {formatMoney(property.expected_rent)}
                    </td>
                    <td className="py-3 px-3 text-[#0C8067] font-semibold">
                      {formatMoney(property.collected_rent)}
                    </td>
                    <td className="py-3 px-3 text-[#A8680C] font-semibold">
                      {formatMoney(property.pending_rent)}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800">
                      {property.collection_rate.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}

              {properties.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-slate-400"
                  >
                    Is filter aur period ke liye data nahi mila.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100 gap-2">
          <span>
            Portfolio total · {formatMoney(expectedTotal)} expected ·{' '}
            {formatMoney(effectiveRentCollected)} collected ·{' '}
            {formatMoney(
              properties.reduce(
                (total, property) =>
                  total + Number(property.pending_rent || 0),
                0,
              ),
            )}{' '}
            pending
          </span>
          <span>{properties.length} properties</span>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#EAF4F7] rounded-xl p-4 flex items-start gap-3 text-xs">
          <Info className="w-4 h-4 text-[#035E7B] shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold text-slate-800 block">
              Your collection opportunity
            </strong>
            <p className="text-slate-500 mt-0.5 text-[11px] leading-relaxed">
              {formatMoney(effectiveOutstandingRent)} in rent remains
              outstanding in the selected report data. Review pending rent
              records to identify follow-up opportunities.
            </p>
          </div>
        </div>

        <div className="bg-[#EAF4F7] rounded-xl p-4 flex items-start gap-3 text-xs">
          <Info className="w-4 h-4 text-[#035E7B] shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold text-slate-800 block">
              What&apos;s included
            </strong>
            <p className="text-slate-500 mt-0.5 text-[11px] leading-relaxed">
              Collected income is based on completed payments. Security
              deposits are not included as rental income.
            </p>
          </div>
        </div>
      </section>

      <footer className="pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
        <span>
          KirayaSaathi · Smart rental management for every property owner
        </span>
        <span>All amounts in INR · IST</span>
      </footer>
    </div>
  );
};
