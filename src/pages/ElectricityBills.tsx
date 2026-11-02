import React, { useState, useEffect, useMemo } from 'react';
import { PageType, ElectricityBill, Property, Room, Tenant, PaymentRecord, RentRecord } from '../types';
import {
  Calendar,
  Plus,
  Zap,
  CheckCircle2,
  Clock,
  Download,
  Search,
  ChevronDown,
  SlidersHorizontal,
  Info,
  ArrowLeft,
  Check,
  AlertCircle,
  RefreshCw,
  MessageCircle,
} from 'lucide-react';
import { calculateElectricityBill } from '../utils/billing';
import { apiRequest } from '../utils/api';

interface ElectricityBillsProps {
  bills: ElectricityBill[];
  properties?: Property[];
  rooms?: Room[];
  tenants?: Tenant[];
  payments?: PaymentRecord[];
  rentRecords?: RentRecord[];
  onNavigate: (page: PageType) => void;
  onRefreshData?: () => Promise<void> | void;
  onOpenRecordPayment?: (
    tenantId?: string,
    paymentType?: 'rent' | 'electricity',
    billId?: string,
  ) => void;
  initialMode?: 'list' | 'form';
}

interface ApiMeter {
  id: number;
  room: number;
  meter_number: string;
  installation_date: string;
  is_active: boolean;
  notes: string;
}

interface ApiReading {
  id: number;
  meter: number;
  reading_date: string;
  previous_reading: string | number;
  current_reading: string | number;
  notes: string;
}

interface ApiBill {
  id: number;
  meter: number;
  reading: number;
  billing_month: string;
  units_consumed: string | number;
  rate_per_unit: string | number;
  total_amount: string | number;
  due_date: string;
  amount_paid: string | number;
  status: string;
}

function asArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (
    data &&
    typeof data === 'object' &&
    'results' in data &&
    Array.isArray((data as { results: unknown }).results)
  ) {
    return (data as { results: T[] }).results;
  }
  return [];
}

// Automatically resolve the correct electricity API prefix from backend urls.py
async function requestElectricityEndpoint<T>(
  subPath: string,
  options?: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown }
): Promise<T> {
  const prefixes = ['/api/electricity', '/api/billing', '/api'];
  let lastError: unknown = null;

  for (const prefix of prefixes) {
    try {
      return await apiRequest<T>(`${prefix}${subPath}`, options);
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : '';
      // If it's a 400/403/500 validation or server error from the matched view, throw immediately
      if (msg.includes('400') || msg.includes('403') || msg.includes('500')) {
        throw err;
      }
    }
  }
  throw lastError || new Error(`Endpoint ${subPath} not reachable.`);
}

export const ElectricityBills: React.FC<ElectricityBillsProps> = ({
  bills: propBills = [],
  properties = [],
  rooms = [],
  tenants = [],
  payments = [],
  rentRecords = [],
  onNavigate,
  onRefreshData,
  onOpenRecordPayment,
  initialMode = 'list',
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'form'>(initialMode);
  const [activeTab, setActiveTab] = useState<'all' | 'paid' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState('ALL');

  // Backend raw states
  const [meters, setMeters] = useState<ApiMeter[]>([]);
  const [readings, setReadings] = useState<ApiReading[]>([]);
  const [localBills, setLocalBills] = useState<ElectricityBill[]>(propBills);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Form states
  const todayIso = new Date().toISOString().split('T')[0];
  const currentMonthIso = `${todayIso.slice(0, 7)}-01`;

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [meterNumberInput, setMeterNumberInput] = useState<string>('');
  const [prevReading, setPrevReading] = useState<number>(0);
  const [currReading, setCurrReading] = useState<number>(0);
  const [rate, setRate] = useState<number>(8.0);
  const [readingDate, setReadingDate] = useState<string>(todayIso);
  const [billingMonth, setBillingMonth] = useState<string>(currentMonthIso);
  const [notes, setNotes] = useState<string>('');

  // Map payments made specifically for electricity bills
  const paidByElecBillId = useMemo(() => {
    const map = new Map<string, number>();
    (payments || []).forEach((p) => {
      if (p.paymentType === 'electricity' && p.electricityBillId) {
        const k = String(p.electricityBillId);
        map.set(k, (map.get(k) || 0) + p.amount);
      }
    });
    return map;
  }, [payments]);

  // Sync prop bills when updated from parent
  useEffect(() => {
    setLocalBills(propBills);
  }, [propBills]);

  // Fetch meters, readings, and bills directly from backend
  const fetchElectricityBackendData = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [metersRes, readingsRes, billsRes] = await Promise.all([
        requestElectricityEndpoint<unknown>('/meters/'),
        requestElectricityEndpoint<unknown>('/readings/'),
        requestElectricityEndpoint<unknown>('/bills/'),
      ]);

      const apiMeters = asArray<ApiMeter>(metersRes);
      const apiReadings = asArray<ApiReading>(readingsRes);
      const apiBills = asArray<ApiBill>(billsRes);

      setMeters(apiMeters);
      setReadings(apiReadings);

      const meterMap = new Map<number, ApiMeter>(apiMeters.map((m) => [m.id, m]));
      const readingMap = new Map<number, ApiReading>(apiReadings.map((r) => [r.id, r]));
      const roomMap = new Map<string, Room>(rooms.map((r) => [String(r.id), r]));
      const propertyMap = new Map<string, Property>(properties.map((p) => [String(p.id), p]));
      const tenantByRoomMap = new Map<string, Tenant>();

      tenants.forEach((t) => {
        if (t.roomId && t.status === 'Active') {
          tenantByRoomMap.set(String(t.roomId), t);
        }
      });

      const mappedBills: ElectricityBill[] = apiBills.map((b) => {
        const meter = meterMap.get(b.meter);
        const reading = readingMap.get(b.reading);
        const room = meter ? roomMap.get(String(meter.room)) : undefined;
        const prop = room ? propertyMap.get(String(room.propertyId)) : undefined;
        const tenant = room ? tenantByRoomMap.get(String(room.id)) : undefined;

        const livePaid = paidByElecBillId.get(String(b.id)) || 0;
        const effectivePaid = Math.max(Number(b.amount_paid ?? 0), livePaid);
        const isPaid =
          effectivePaid >= Number(b.total_amount ?? 0) &&
          Number(b.total_amount ?? 0) > 0;

        const rawStatus = (b.status || 'PENDING').toUpperCase();
        const normStatus: ElectricityBill['status'] = isPaid
          ? 'Paid'
          : rawStatus === 'PAID'
          ? 'Paid'
          : rawStatus === 'PARTIAL'
          ? 'Partial'
          : rawStatus === 'OVERDUE'
          ? 'Overdue'
          : 'Pending';

        return {
          id: String(b.id),
          meterDbId: b.meter,
          readingDbId: b.reading,
          roomId: room?.id ?? (meter ? String(meter.room) : ''),
          propertyId: prop?.id ?? room?.propertyId ?? '',
          meterId: meter?.meter_number ?? `MTR-${b.meter}`,
          tenantName: tenant?.name ?? room?.tenantName ?? 'Unassigned / Vacant',
          propertyName: prop?.name ?? room?.propertyName ?? 'Property',
          roomNumber: room?.number ?? (meter ? `Room #${meter.room}` : 'N/A'),
          previousReading: Number(reading?.previous_reading ?? 0),
          currentReading: Number(reading?.current_reading ?? 0),
          units: Number(b.units_consumed ?? 0),
          rate: Number(b.rate_per_unit ?? prop?.electricityRate ?? 8),
          amount: Number(b.total_amount ?? 0),
          amountPaid: effectivePaid,
          status: normStatus,
          readingDate: reading?.reading_date ?? b.billing_month,
          billingMonth: b.billing_month,
          dueDate: b.due_date,
        };
      });

      setLocalBills(mappedBills);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Electricity data load karne mein problem aayi.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-sync data on mount and live updates
  useEffect(() => {
    if (onRefreshData) {
      void onRefreshData();
    }
  }, []);

  useEffect(() => {
    void fetchElectricityBackendData();
  }, [rooms.length, properties.length, tenants.length, payments.length, rentRecords.length, propBills.length]);

  // Combined live bills: always reflects payments & backend data instantly
  const effectiveBills = useMemo(() => {
    const baseBills = localBills.length > 0 ? localBills : propBills;
    return baseBills.map((b) => {
      const livePaid = paidByElecBillId.get(String(b.id)) || 0;
      const effectivePaid = Math.max(Number(b.amountPaid || 0), livePaid);
      const isPaid = effectivePaid >= b.amount && b.amount > 0;
      return {
        ...b,
        amountPaid: effectivePaid,
        status: isPaid ? ('Paid' as const) : b.status,
      };
    });
  }, [localBills, propBills, paidByElecBillId]);

  // Set default selected property and room for the form
  useEffect(() => {
    if (!selectedPropertyId && properties.length > 0) {
      setSelectedPropertyId(String(properties[0].id));
    }
  }, [properties, selectedPropertyId]);

  const availableRoomsForProperty = useMemo(() => {
    if (!selectedPropertyId) return rooms;
    return rooms.filter((r) => String(r.propertyId) === String(selectedPropertyId));
  }, [rooms, selectedPropertyId]);

  useEffect(() => {
    if (availableRoomsForProperty.length > 0) {
      const exists = availableRoomsForProperty.some((r) => String(r.id) === String(selectedRoomId));
      if (!exists) {
        setSelectedRoomId(String(availableRoomsForProperty[0].id));
      }
    } else {
      setSelectedRoomId('');
    }
  }, [availableRoomsForProperty, selectedRoomId]);

  // Whenever room or property changes, auto-populate Meter ID, Rate, and Previous Reading from backend data
  useEffect(() => {
    if (!selectedRoomId) return;

    const currentRoom = rooms.find((r) => String(r.id) === String(selectedRoomId));
    const currentProp = properties.find(
      (p) => String(p.id) === String(currentRoom?.propertyId ?? selectedPropertyId)
    );

    if (currentProp && currentProp.electricityRate > 0) {
      setRate(Number(currentProp.electricityRate));
    }

    const existingMeter = meters.find((m) => String(m.room) === String(selectedRoomId));
    if (existingMeter) {
      setMeterNumberInput(existingMeter.meter_number);

      // Find latest reading for this meter to lock previous_reading
      const meterReadings = readings
        .filter((r) => r.meter === existingMeter.id)
        .sort((a, b) => new Date(b.reading_date).getTime() - new Date(a.reading_date).getTime());

      if (meterReadings.length > 0) {
        const lastCurr = Number(meterReadings[0].current_reading);
        setPrevReading(lastCurr);
        setCurrReading((prev) => (prev < lastCurr ? lastCurr : prev));
      } else {
        setPrevReading(0);
        setCurrReading(0);
      }
    } else {
      const defaultMeterNo = `MTR-${currentRoom?.number?.replace(/[^a-zA-Z0-9]/g, '') || selectedRoomId}`;
      setMeterNumberInput(defaultMeterNo);
      setPrevReading(0);
      setCurrReading(0);
    }
  }, [selectedRoomId, selectedPropertyId, meters, readings, rooms, properties]);

  const calc = calculateElectricityBill(Number(currReading), Number(prevReading), rate);

  // Filter bills dynamically
  const filteredBills = useMemo(() => {
    return effectiveBills.filter((b) => {
      if (activeTab === 'paid' && b.status !== 'Paid') return false;
      if (activeTab === 'pending' && b.status === 'Paid') return false;
      if (selectedPropertyFilter !== 'ALL' && b.propertyName !== selectedPropertyFilter) {
        return false;
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          b.tenantName.toLowerCase().includes(q) ||
          b.roomNumber.toLowerCase().includes(q) ||
          b.meterId.toLowerCase().includes(q) ||
          b.propertyName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [effectiveBills, activeTab, selectedPropertyFilter, searchTerm]);

  // Dynamic Summary Statistics
  const summaryStats = useMemo(() => {
    const totalUnits = effectiveBills.reduce((acc, b) => acc + (Number(b.units) || 0), 0);
    const totalBilled = effectiveBills.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
    const paidBills = effectiveBills.filter((b) => b.status === 'Paid');
    const pendingBills = effectiveBills.filter((b) => b.status !== 'Paid');

    const billsCollected = effectiveBills.reduce((acc, b) => {
      if (b.status === 'Paid') return acc + b.amount;
      return acc + (Number(b.amountPaid) || 0);
    }, 0);

    const liveTotalElecPayments = (payments || [])
      .filter((p) => p.paymentType === 'electricity')
      .reduce((acc, p) => acc + p.amount, 0);

    const totalCollected = Math.max(billsCollected, liveTotalElecPayments);
    const totalPending = Math.max(0, totalBilled - totalCollected);
    const collectionPercent =
      totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

    return {
      totalUnits,
      totalBilled,
      totalCollected,
      totalPending,
      paidCount: paidBills.length,
      pendingCount: pendingBills.length,
      totalCount: effectiveBills.length,
      collectionPercent,
    };
  }, [effectiveBills, payments]);

  const selectedRoomObj = rooms.find((r) => String(r.id) === String(selectedRoomId));
  const selectedPropertyObj = properties.find(
    (p) => String(p.id) === String(selectedRoomObj?.propertyId ?? selectedPropertyId)
  );
  const selectedTenantObj = tenants.find(
    (t) => String(t.roomId) === String(selectedRoomId) && t.status === 'Active'
  );

  // Compute expected due date based on property's rentDueDay
  const calculatedDueDate = useMemo(() => {
    const dueDay = selectedPropertyObj?.rentDueDay || 5;
    const [yearStr, monthStr] = billingMonth.split('-');
    const year = Number(yearStr) || new Date().getFullYear();
    const month = Number(monthStr) || new Date().getMonth() + 1;
    const maxDays = new Date(year, month, 0).getDate();
    const validDay = Math.min(Math.max(1, dueDay), maxDays);
    return `${String(year)}-${String(month).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`;
  }, [billingMonth, selectedPropertyObj]);

  // Save Meter Reading & Generate Bill in Backend
  const handleSaveReading = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedRoomId) {
      setErrorMessage('Kripya ek valid room select karein.');
      return;
    }

    if (!calc.isValid) {
      setErrorMessage('Current reading previous reading se kam nahi ho sakti.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Ensure an active ElectricityMeter exists for this room
      let meter = meters.find((m) => String(m.room) === String(selectedRoomId));

      if (!meter) {
        const cleanMeterNumber =
          meterNumberInput.trim() || `MTR-${selectedRoomId}-${Date.now().toString().slice(-4)}`;
        meter = await requestElectricityEndpoint<ApiMeter>('/meters/', {
          method: 'POST',
          body: {
            room: Number(selectedRoomId),
            meter_number: cleanMeterNumber,
            installation_date: readingDate || todayIso,
            is_active: true,
            notes: 'Auto-created during reading entry',
          },
        });
      }

      // Step 2: Check if a reading already exists for this meter and reading_date
      let reading = readings.find(
        (r) => r.meter === meter!.id && r.reading_date === readingDate
      );

      if (!reading) {
        reading = await requestElectricityEndpoint<ApiReading>('/readings/', {
          method: 'POST',
          body: {
            meter: meter.id,
            reading_date: readingDate,
            previous_reading: Number(prevReading).toFixed(2),
            current_reading: Number(currReading).toFixed(2),
            notes: notes.trim(),
          },
        });
      }

      // Step 3: Call GenerateElectricityBillAPIView (/bills/generate/)
      try {
        await requestElectricityEndpoint('/bills/generate/', {
          method: 'POST',
          body: {
            reading_id: reading.id,
          },
        });
      } catch {
        // Fallback: Direct POST to /bills/ if generate endpoint requires manual fields
        const normalizedBillingMonth = `${billingMonth.slice(0, 7)}-01`;
        await requestElectricityEndpoint('/bills/', {
          method: 'POST',
          body: {
            meter: meter.id,
            reading: reading.id,
            billing_month: normalizedBillingMonth,
            units_consumed: calc.units.toFixed(2),
            rate_per_unit: rate.toFixed(2),
            total_amount: (calc.units * rate).toFixed(2),
            due_date: calculatedDueDate,
          },
        });
      }

      await fetchElectricityBackendData();
      if (onRefreshData) {
        await onRefreshData();
      }

      setToastMessage(
        `Reading saved for Room ${selectedRoomObj?.number || selectedRoomId}! Bill generated: ₹${calc.amount.toLocaleString('en-IN')}`
      );
      setTimeout(() => {
        setToastMessage('');
        setViewMode('list');
      }, 1500);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Reading save aur bill generate karne mein error aaya.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export CSV dynamically from real data
  const handleExportCsv = () => {
    if (filteredBills.length === 0) {
      setToastMessage('Export karne ke liye koi bill nahi hai.');
      setTimeout(() => setToastMessage(''), 2000);
      return;
    }

    const headers = [
      'Bill ID',
      'Tenant Name',
      'Property',
      'Room',
      'Meter ID',
      'Previous Reading',
      'Current Reading',
      'Units (kWh)',
      'Rate (INR)',
      'Total Amount (INR)',
      'Status',
      'Reading Date',
      'Due Date',
    ];

    const rows = filteredBills.map((b) => [
      b.id,
      `"${b.tenantName.replace(/"/g, '""')}"`,
      `"${b.propertyName.replace(/"/g, '""')}"`,
      b.roomNumber,
      b.meterId,
      b.previousReading,
      b.currentReading,
      b.units,
      b.rate,
      b.amount,
      b.status,
      b.readingDate,
      b.dueDate,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `electricity_bills_${todayIso}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-red-700">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage('')}
            className="font-bold underline hover:text-red-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {viewMode === 'form' ? (
        /* ================= METER READING FORM VIEW ================= */
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <button
              onClick={() => setViewMode('list')}
              className="hover:text-[#035E7B] flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-4 h-4 text-[#035E7B]" />
              <span>
                Electricity Bills / {billingMonth.slice(0, 7)} / {meterNumberInput || 'New Meter'}
              </span>
            </button>
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight">
              Record an accurate meter reading
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Connected directly to backend · Creates meter reading &amp; generates bill automatically.
            </p>
          </div>

          {/* 2-Column Form Layout */}
          <form
            onSubmit={handleSaveReading}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"
          >
            {/* Left Column (2 spans) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Property & Period */}
              <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
                <h2 className="text-sm sm:text-base font-bold text-slate-800">
                  Property, room &amp; billing period
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Property *
                    </label>
                    <select
                      value={selectedPropertyId}
                      onChange={(e) => setSelectedPropertyId(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:border-[#035E7B]"
                      required
                    >
                      {properties.length === 0 ? (
                        <option value="">No properties available</option>
                      ) : (
                        properties.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Room *
                    </label>
                    <select
                      value={selectedRoomId}
                      onChange={(e) => setSelectedRoomId(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:border-[#035E7B]"
                      required
                    >
                      {availableRoomsForProperty.length === 0 ? (
                        <option value="">No rooms in this property</option>
                      ) : (
                        availableRoomsForProperty.map((r) => {
                          const roomTenant = tenants.find(
                            (t) => String(t.roomId) === String(r.id) && t.status === 'Active'
                          );
                          return (
                            <option key={r.id} value={r.id}>
                              Room {r.number} · {roomTenant ? roomTenant.name : r.status}
                            </option>
                          );
                        })
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Meter ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={meterNumberInput}
                      onChange={(e) => setMeterNumberInput(e.target.value)}
                      placeholder="e.g. MTR-101"
                      className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:border-[#035E7B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Billing month (YYYY-MM-01) *
                    </label>
                    <input
                      type="date"
                      required
                      value={billingMonth}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          setBillingMonth(`${val.slice(0, 7)}-01`);
                        }
                      }}
                      className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:border-[#035E7B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tenant assigned</span>
                    <strong className="text-slate-800 block mt-0.5">
                      {selectedTenantObj?.name || selectedRoomObj?.tenantName || 'Vacant / No Active Tenant'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Configured bill due date</span>
                    <strong className="text-slate-800 block mt-0.5">{calculatedDueDate}</strong>
                  </div>
                </div>
              </section>

              {/* Meter Readings */}
              <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-800">Meter readings</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Enter the cumulative reading displayed on the room&apos;s electricity meter.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Previous reading (kWh) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={prevReading}
                      onChange={(e) => setPrevReading(Number(e.target.value))}
                      className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-700 font-semibold focus:outline-none focus:border-[#035E7B]"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Auto-fetched from last recorded cycle (editable if initial setup)
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Current reading (kWh) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min={prevReading}
                        required
                        value={currReading}
                        onChange={(e) => setCurrReading(Number(e.target.value))}
                        className="w-full h-10 pl-3 pr-12 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:outline-none focus:border-[#035E7B]"
                      />
                      <span className="absolute right-3 inset-y-0 flex items-center text-slate-400 text-xs">
                        kWh
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Must be greater than or equal to {prevReading}.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Reading date *
                    </label>
                    <input
                      type="date"
                      required
                      value={readingDate}
                      onChange={(e) => setReadingDate(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Per-unit rate (₹ / kWh) *
                    </label>
                    <div className="flex items-center justify-between h-10 px-3 border border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-800 font-semibold">
                      <span>₹ {rate.toFixed(2)}</span>
                      <small className="text-slate-400">/ kWh</small>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Synced from {selectedPropertyObj?.name || 'property'}&apos;s billing preferences.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any observation about meter condition..."
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
                  />
                </div>

                {/* Real-time Calculation Badge */}
                <div className="p-4 bg-[#E7F4F8] rounded-xl flex items-center gap-3.5 mt-2">
                  <div className="w-9 h-9 rounded-lg bg-[#035E7B] text-white flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <strong className="text-xs font-bold text-slate-800 block">
                      {calc.units} kWh consumed
                    </strong>
                    <span className="text-[11px] text-slate-500">
                      {currReading} current − {prevReading} previous = {calc.units} kWh
                    </span>
                  </div>
                  <span
                    className={`ml-auto text-xs font-bold flex items-center gap-1 ${
                      calc.isValid ? 'text-[#0C8067]' : 'text-red-600'
                    }`}
                  >
                    {calc.isValid ? '✓ Valid reading' : '✗ Invalid'}
                  </span>
                </div>
              </section>

              {/* Info Wide */}
              <div className="p-4 bg-[#EAF4F7] rounded-xl flex items-start gap-3 text-xs">
                <Info className="w-4 h-4 text-[#0D8AB0] shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-slate-800 block">
                    Only electricity is included
                  </strong>
                  <p className="text-slate-500 mt-0.5 text-[11px] leading-relaxed">
                    This bill does not include monthly rent. Saving creates the reading in PostgreSQL/SQLite and generates the electricity bill for this room.
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400">* Required fields</span>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className="px-5 h-10 border border-slate-200 rounded-xl text-xs font-semibold text-[#035E7B] bg-white hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !calc.isValid || !selectedRoomId}
                    className="px-6 h-10 bg-[#035E7B] hover:bg-[#024B63] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    {isSubmitting ? 'Saving to backend...' : 'Save reading & generate bill'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column (1 span): Calculation Preview */}
            <aside className="space-y-5">
              <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Bill calculation</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Live Preview · {billingMonth.slice(0, 7)}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <strong className="text-sm font-bold text-slate-800">
                    {selectedTenantObj?.name || selectedRoomObj?.tenantName || 'Room Occupant'}
                  </strong>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFF0DF] text-[#A8680C]">
                    Pending
                  </span>
                </div>

                <div className="text-xs text-slate-500">
                  <div>
                    {selectedPropertyObj?.name || 'Property'} · Room{' '}
                    {selectedRoomObj?.number || 'N/A'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Meter {meterNumberInput || 'Auto'}
                  </div>
                </div>

                <div className="h-px bg-slate-100" />

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Current reading</span>
                    <strong className="text-slate-800">{currReading} kWh</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Previous reading</span>
                    <strong className="text-slate-800">− {prevReading} kWh</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Units consumed</span>
                    <strong className="text-slate-800">{calc.units} kWh</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Rate per unit</span>
                    <strong className="text-slate-800">× ₹{rate.toFixed(2)}</strong>
                  </div>
                </div>

                {/* Total box */}
                <div className="p-4 bg-[#EAF4F7] rounded-xl flex flex-col justify-between">
                  <span className="text-[10px] font-bold uppercase text-[#035E7B]">
                    TOTAL ELECTRICITY BILL
                  </span>
                  <div className="text-3xl font-bold text-[#035E7B] my-1">
                    ₹{calc.amount.toLocaleString('en-IN')}
                  </div>
                  <small className="text-[10px] text-slate-500">
                    {calc.units} kWh × ₹{rate.toFixed(2)} = ₹{calc.amount.toLocaleString('en-IN')}
                  </small>
                </div>

                <p className="text-[10px] text-slate-400 text-center">
                  Due on {calculatedDueDate} · No additional charges
                </p>
              </section>

              {/* Before you save card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-2">
                <h3 className="text-xs font-bold text-slate-800">Before you save</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Check the room&apos;s meter ID and reading date. Once a bill is generated for a reading, its meter, date, and values are protected by backend validation.
                </p>
              </div>
            </aside>
          </form>
        </div>
      ) : (
        /* ================= ELECTRICITY BILLS LIST VIEW ================= */
        <div className="space-y-6">
          {/* Page Heading & Actions */}
          <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight">
                Clear readings. Accurate bills.
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Live electricity billing · {meters.length} active meters across {properties.length}{' '}
                properties.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-[#E8F8F4] text-[#0C8067] border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0C8067] animate-pulse" />
                Live Sync
              </span>

              <button
                type="button"
                onClick={async () => {
                  if (onRefreshData) await onRefreshData();
                  await fetchElectricityBackendData();
                }}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-[#035E7B] rounded-xl text-xs font-semibold transition shadow-2xs"
                title="Sync electricity meters, readings & bills from backend"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Syncing...' : 'Refresh'}</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('form')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#035E7B] hover:bg-[#024B63] text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add reading</span>
              </button>
            </div>
          </section>

          {/* 4 Summary Stat Cards (100% Dynamic) */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Total consumption</span>
                <Zap className="w-4 h-4 text-[#0D8AB0]" />
              </div>
              <div className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mt-3">
                {summaryStats.totalUnits.toLocaleString('en-IN')} kWh
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                {meters.length} registered room meters
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Total billed</span>
                <Zap className="w-4 h-4 text-[#0D8AB0]" />
              </div>
              <div className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mt-3">
                ₹{summaryStats.totalBilled.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Across {summaryStats.totalCount} generated bills
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Collected</span>
                <CheckCircle2 className="w-4 h-4 text-[#0C8067]" />
              </div>
              <div className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mt-3">
                ₹{summaryStats.totalCollected.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-[#0C8067] font-semibold mt-2">
                {summaryStats.paidCount} bills paid · {summaryStats.collectionPercent}% collected
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Pending</span>
                <Clock className="w-4 h-4 text-[#A8680C]" />
              </div>
              <div className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mt-3">
                ₹{summaryStats.totalPending.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-[#A8680C] font-semibold mt-2">
                {summaryStats.pendingCount} bills awaiting payment
              </p>
            </div>
          </section>

          {/* Bills Panel */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">Meter readings &amp; bills</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Units consumed = current reading − previous reading.
                </p>
              </div>
              <button
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-[#035E7B] hover:bg-slate-50 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export bills</span>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-6 border-b border-slate-200 pb-2 text-xs">
              <button
                onClick={() => setActiveTab('all')}
                className={`pb-2 -mb-2.5 font-semibold transition border-b-2 ${
                  activeTab === 'all'
                    ? 'border-[#035E7B] text-[#035E7B] font-bold'
                    : 'border-transparent text-slate-500'
                }`}
              >
                All bills · {summaryStats.totalCount}
              </button>
              <button
                onClick={() => setActiveTab('paid')}
                className={`pb-2 -mb-2.5 font-semibold transition border-b-2 ${
                  activeTab === 'paid'
                    ? 'border-[#035E7B] text-[#035E7B] font-bold'
                    : 'border-transparent text-slate-500'
                }`}
              >
                Paid · {summaryStats.paidCount}
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`pb-2 -mb-2.5 font-semibold transition border-b-2 ${
                  activeTab === 'pending'
                    ? 'border-[#035E7B] text-[#035E7B] font-bold'
                    : 'border-transparent text-slate-500'
                }`}
              >
                Pending · {summaryStats.pendingCount}
              </button>
            </div>

            {/* Search Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search tenant, room or meter..."
                  className="w-full h-10 pl-10 pr-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={selectedPropertyFilter}
                    onChange={(e) => setSelectedPropertyFilter(e.target.value)}
                    className="h-10 pl-3 pr-8 bg-white border border-slate-200 text-[#035E7B] font-semibold rounded-xl text-xs appearance-none focus:outline-none focus:border-[#035E7B]"
                  >
                    <option value="ALL">All properties</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <button
                  onClick={() => onNavigate('property_filter')}
                  className="h-10 px-3.5 border border-slate-200 rounded-xl text-xs font-semibold text-[#035E7B] hover:bg-slate-50 transition inline-flex items-center gap-1.5"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filters</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3 rounded-l-lg">TENANT / ROOM</th>
                    <th className="py-2.5 px-3">PREVIOUS</th>
                    <th className="py-2.5 px-3">CURRENT</th>
                    <th className="py-2.5 px-3">UNITS</th>
                    <th className="py-2.5 px-3">RATE</th>
                    <th className="py-2.5 px-3">AMOUNT</th>
                    <th className="py-2.5 px-3">DUE DATE</th>
                    <th className="py-2.5 px-3">STATUS</th>
                    <th className="py-2.5 px-3 rounded-r-lg text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                        {isLoading
                          ? 'Loading electricity bills from backend...'
                          : 'No electricity bills found. Click "Add reading" to generate your first bill.'}
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((b) => {
                      const roomObj = rooms?.find(
                        (r) => r.id === b.roomId || r.number === b.roomNumber
                      );
                      const roomTenants =
                        tenants?.filter(
                          (t) =>
                            t.status === 'Active' &&
                            ((t.roomId && b.roomId && t.roomId === b.roomId) ||
                              t.roomNumber === b.roomNumber)
                        ) || [];
                      const occupants =
                        roomTenants.length > 0
                          ? roomTenants.map((t) => ({ id: t.id, name: t.name, phone: t.phone }))
                          : roomObj?.occupants && roomObj.occupants.length > 0
                          ? roomObj.occupants.map((o) => ({ id: o.id, name: o.name, phone: o.phone || '' }))
                          : [
                              {
                                id: '',
                                name: b.tenantName,
                                phone: tenants?.find((t) => t.name === b.tenantName)?.phone || '',
                              },
                            ];

                      const sharingCount = Math.max(1, occupants.length);
                      const splitAmount = Math.round((b.amount / sharingCount) * 100) / 100;
                      const splitUnits = Math.round((b.units / sharingCount) * 10) / 10;
                      const unpaidAmt = Math.max(0, b.amount - (b.amountPaid || 0));

                      const sendTenantWhatsApp = (occName: string, occPhone: string) => {
                        let cleanDigits = (occPhone || '').replace(/\D/g, '');
                        if (cleanDigits.startsWith('0')) {
                          cleanDigits = cleanDigits.replace(/^0+/, '');
                        }
                        const phoneFormatted = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;

                        const shareMsg =
                          sharingCount > 1
                            ? `Namaste ${occName} ji! Aapke Room ${b.roomNumber} (${b.propertyName}) ka electricity bill split share (1/${sharingCount}): Aapka hissa: Rs. ${splitAmount.toLocaleString('en-IN')} (${splitUnits} kWh), Total Room Bill: Rs. ${b.amount.toLocaleString('en-IN')} (${b.units} kWh), Due Date: ${b.dueDate}. Kripya samay par bhugtan karein. Dhanyawaad!`
                            : `Namaste ${occName} ji! Aapke Room ${b.roomNumber} (${b.propertyName}) ka electricity bill: Units: ${b.units} kWh, Rate: Rs. ${b.rate}/unit, Total: Rs. ${b.amount.toLocaleString('en-IN')}, Unpaid: Rs. ${unpaidAmt.toLocaleString('en-IN')}, Due Date: ${b.dueDate}. Kripya samay par bhugtan karein. Dhanyawaad!`;

                        if (!phoneFormatted) {
                          alert(`Tenant ${occName} ka mobile number nahi mila.`);
                          return;
                        }

                        window.open(
                          `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(shareMsg)}`,
                          '_blank',
                          'noopener,noreferrer'
                        );
                      };

                      return (
                        <tr key={b.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-3">
                            {sharingCount > 1 ? (
                              <div>
                                <strong className="block font-semibold text-slate-800">
                                  {occupants.map((o) => o.name).join(' & ')}
                                </strong>
                                <span className="inline-flex items-center gap-1 text-[10px] text-[#035E7B] font-medium">
                                  Room {b.roomNumber} ({roomObj?.type || `${sharingCount} Sharing`}) · {sharingCount} Tenants
                                </span>
                              </div>
                            ) : (
                              <div>
                                <strong className="block font-semibold text-slate-800">
                                  {occupants[0]?.name || b.tenantName}
                                </strong>
                                <span className="text-[10px] text-slate-400">
                                  {b.propertyName} · Room {b.roomNumber} · {b.meterId}
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-3 text-slate-600 font-mono">
                            {b.previousReading.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3 text-slate-600 font-mono">
                            {b.currentReading.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800">{b.units} kWh</td>
                          <td className="py-3 px-3 text-slate-600">₹{b.rate.toFixed(2)}</td>
                          <td className="py-3 px-3">
                            <span className="block font-bold text-slate-800">
                              ₹{b.amount.toLocaleString('en-IN')}
                            </span>
                            {sharingCount > 1 && (
                              <span className="block text-[10px] text-[#035E7B] font-semibold">
                                Split: ₹{splitAmount.toLocaleString('en-IN')}/tenant ({splitUnits} kWh)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-500">{b.dueDate}</td>

                          <td className="py-3 px-3">
                            {b.status === 'Paid' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-[#E8F8F4] text-[#0C8067]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0C8067]" /> Paid
                              </span>
                            ) : b.status === 'Overdue' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-red-50 text-red-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600" /> Overdue
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-[#FFF0DF] text-[#A8680C]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#A8680C]" /> {b.status}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {b.status !== 'Paid' && (
                                <>
                                  {onOpenRecordPayment && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onOpenRecordPayment(occupants[0]?.id || undefined, 'electricity', b.id);
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#035E7B] hover:bg-[#024B63] text-white rounded-lg text-xs font-bold transition active:scale-95 shadow-2xs"
                                      title={`Record payment for Room ${b.roomNumber}`}
                                    >
                                      <span>Pay ₹{unpaidAmt.toLocaleString('en-IN')}</span>
                                    </button>
                                  )}

                                  {occupants.map((occ, idx) => (
                                    <button
                                      key={occ.id || idx}
                                      type="button"
                                      onClick={() => sendTenantWhatsApp(occ.name, occ.phone || '')}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-[#E8F8F4] hover:bg-[#D4F2EB] text-[#0C8067] rounded-lg text-xs font-bold transition active:scale-95 shadow-2xs"
                                      title={`Send split bill to ${occ.name}`}
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                      <span>{sharingCount > 1 ? occ.name.split(' ')[0] : 'WhatsApp'}</span>
                                    </button>
                                  ))}
                                </>
                              )}
                              {b.status === 'Paid' ? (
                                <button
                                  onClick={() => onNavigate('invoice_list')}
                                  className="text-[#035E7B] font-bold hover:underline px-2 py-1 text-xs"
                                  title="View receipt"
                                >
                                  View Bill ↗
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    if (b.propertyId) setSelectedPropertyId(String(b.propertyId));
                                    if (b.roomId) setSelectedRoomId(String(b.roomId));
                                    setMeterNumberInput(b.meterId);
                                    setPrevReading(b.currentReading);
                                    setCurrReading(b.currentReading);
                                    setRate(b.rate);
                                    setViewMode('form');
                                  }}
                                  className="text-[#035E7B] font-semibold hover:underline text-xs px-2 py-1"
                                >
                                  New Reading
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination / Count */}
            <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100 gap-2">
              <span>
                Showing {filteredBills.length} of {summaryStats.totalCount} electricity bills
              </span>
            </div>
          </section>

          {/* Info Banner */}
          <section className="bg-[#EAF4F7] rounded-xl p-4 flex items-start gap-3 text-xs">
            <Info className="w-4 h-4 text-[#0D8AB0] shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-slate-800 block">
                Dynamic Property Electricity Rates
              </strong>
              <p className="text-slate-500 mt-0.5 text-[11px] leading-relaxed">
                Each bill automatically uses its property&apos;s configured per-unit electricity rate and rent due day from the backend.
              </p>
            </div>
          </section>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-emerald-300 rounded-2xl p-4 shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-xs font-bold text-slate-800">{toastMessage}</div>
        </div>
      )}

      {/* Footer */}
      <footer className="pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
        <span>KirayaSaathi · Smart rental management for every property owner</span>
        <span>All amounts in INR · IST</span>
      </footer>
    </div>
  );
};