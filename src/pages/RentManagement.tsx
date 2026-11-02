import React, { useState, useEffect, useMemo } from 'react';
import {
  PageType,
  RentRecord,
  Property,
  Tenant,
  PaymentRecord,
  ElectricityBill,
  OwnerQrConfig,
  BillingArchive,
  BillingArchiveItem,
} from '../types';
import {
  Calendar,
  Plus,
  IndianRupee,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageCircle,
  Send,
  Download,
  Search,
  ChevronDown,
  SlidersHorizontal,
  ArrowUpRight,
  RefreshCw,
  FilePlus2,
  X,
  ShieldCheck,
  Smartphone,
  FileText,
  Zap,
  QrCode,
  Sparkles,
  FolderArchive,
  FileSpreadsheet,
  Eye,
  BarChart3,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { apiRequest } from '../utils/api';

interface RentManagementProps {
  rentRecords: RentRecord[];
  electricityBills?: ElectricityBill[];
  properties?: Property[];
  tenants?: Tenant[];
  payments?: PaymentRecord[];
  onNavigate: (page: PageType) => void;
  onOpenRecordPayment: (defaultTenantId?: string) => void;
  onSelectInvoice?: (tenantName: string) => void;
  onSelectTenant?: (tenant: Tenant) => void;
  onRefreshData?: () => Promise<void> | void;
}

const QR_LIST_STORAGE_KEY = 'KirayaSaathi_owner_qr_configs_v1';
const TENANT_QR_MAP_STORAGE_KEY = 'KirayaSaathi_tenant_qr_map_v1';
const MISC_BILL_STORAGE_KEY = 'KirayaSaathi_misc_charges_v1';

export interface MiscChargeEntry {
  miscAmount: number;
  miscDescription: string;
}

export const RentManagement: React.FC<RentManagementProps> = ({
  rentRecords,
  electricityBills = [],
  properties = [],
  tenants = [],
  payments = [],
  onNavigate,
  onOpenRecordPayment,
  onSelectInvoice,
  onSelectTenant,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<
    'all' | 'paid' | 'pending' | 'partial' | 'overdue' | 'history' | 'archived'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('ALL');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState('ALL');
  const [toastMessage, setToastMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Archive States
  const [archives, setArchives] = useState<BillingArchive[]>([]);
  const [isLoadingArchives, setIsLoadingArchives] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveMonthInput, setArchiveMonthInput] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [archiveNotesInput, setArchiveNotesInput] = useState('');
  const [selectedArchiveDetail, setSelectedArchiveDetail] =
    useState<BillingArchive | null>(null);

  const fetchArchives = async () => {
    setIsLoadingArchives(true);
    try {
      const res = await apiRequest<BillingArchive[]>('/api/billing/archive/');
      setArchives(Array.isArray(res) ? res : []);
    } catch {
      // fallback
    } finally {
      setIsLoadingArchives(false);
    }
  };

  useEffect(() => {
    void fetchArchives();
    if (onRefreshData) {
      void onRefreshData();
    }
  }, []);

  const handleArchiveMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archiveMonthInput) return;
    setIsArchiving(true);
    setErrorMessage('');
    try {
      const res = await apiRequest<{
        message: string;
        archive: BillingArchive;
        records_archived: number;
        meters_rolled_over: number;
        next_month: string;
      }>('/api/billing/archive/', {
        method: 'POST',
        body: {
          billing_month: `${archiveMonthInput}-01`,
          notes: archiveNotesInput,
        },
      });

      setToastMessage(
        res.message ||
          `Month ${archiveMonthInput} archived! ${res.meters_rolled_over} meters rolled over to ${res.next_month}.`
      );
      setTimeout(() => setToastMessage(''), 4500);
      setIsArchiveModalOpen(false);
      setArchiveNotesInput('');
      await fetchArchives();
      if (onRefreshData) await onRefreshData();

      // Automatically rollover view to the new active billing month
      if (res.next_month) {
        const nextMonthPrefix = res.next_month.slice(0, 7);
        setSelectedMonthFilter(nextMonthPrefix);
        setSelectedTrendMonthKey(nextMonthPrefix);
        setArchiveMonthInput(nextMonthPrefix);
      }
      setActiveTab('all');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Archive karne mein error aaya.'
      );
    } finally {
      setIsArchiving(false);
    }
  };

  const [updatingRecordId, setUpdatingRecordId] = useState<string | number | null>(null);
  const [selectedArchivedCycle, setSelectedArchivedCycle] = useState<string>('ALL');

  const handleToggleRecordStatus = async (
    recordId: string | number,
    targetStatus: 'PAID' | 'PENDING',
    currentTotalBilled?: number,
    archiveContext?: { archiveId: number }
  ) => {
    setUpdatingRecordId(recordId);
    setErrorMessage('');
    try {
      const cleanId = String(recordId).replace(/^rent-/, '').replace(/^rec-/, '');
      const isPaidTarget = targetStatus === 'PAID';
      const rentAmt = Number(currentTotalBilled ?? 0);

      // 1. If valid numeric ID, call DRF PATCH
      if (/^\d+$/.test(cleanId)) {
        await apiRequest(`/api/billing/${cleanId}/`, {
          method: 'PATCH',
          body: {
            status: targetStatus,
            amount_paid: isPaidTarget ? rentAmt.toFixed(2) : '0.00',
          },
        });
      } else {
        // Fallback: search in rentRecords by recordId or tenantName
        const matchingRec = rentRecords.find(
          (r) =>
            r.id === String(recordId) ||
            r.tenantName.trim().toLowerCase() === String(recordId).trim().toLowerCase()
        );
        if (matchingRec) {
          const recNum = matchingRec.id.replace(/^rent-/, '').replace(/^rec-/, '');
          if (/^\d+$/.test(recNum)) {
            await apiRequest(`/api/billing/${recNum}/`, {
              method: 'PATCH',
              body: {
                status: targetStatus,
                amount_paid: isPaidTarget ? (currentTotalBilled || matchingRec.rentDue).toFixed(2) : '0.00',
              },
            });
          }
        }
      }

      // 2. Also sync electricity bill for that room/month if found
      const matchingElec = electricityBills.find(
        (b) =>
          b.roomId === cleanId ||
          b.roomNumber === cleanId ||
          b.tenantName === String(recordId)
      );
      if (matchingElec) {
        const elecId = matchingElec.id.replace(/^elec-/, '').replace(/^bill-/, '');
        if (/^\d+$/.test(elecId)) {
          try {
            await apiRequest(`/api/electricity/bills/${elecId}/`, {
              method: 'PATCH',
              body: {
                status: targetStatus,
                amount_paid: isPaidTarget ? Number(matchingElec.amount).toFixed(2) : '0.00',
              },
            });
          } catch {
            // non-fatal
          }
        }
      }

      // 3. If tied to an archive snapshot, update the archive in backend
      if (archiveContext?.archiveId) {
        const targetArchive = archives.find((a) => a.id === archiveContext.archiveId);
        if (targetArchive && Array.isArray(targetArchive.snapshot_data)) {
          const updatedSnapshots = targetArchive.snapshot_data.map((item) => {
            if (
              String(item.record_id) === String(cleanId) ||
              item.tenant_name.trim().toLowerCase() === String(recordId).trim().toLowerCase()
            ) {
              const itemBilled = Number(item.total_billed || item.rent_amount || 0);
              return {
                ...item,
                rent_status: targetStatus,
                rent_paid: isPaidTarget ? String(item.rent_amount) : '0.00',
                rent_balance: isPaidTarget ? '0.00' : String(item.rent_amount),
                total_paid: isPaidTarget ? String(itemBilled) : '0.00',
                balance: isPaidTarget ? '0.00' : String(itemBilled),
              };
            }
            return item;
          });

          const newTotalPaid = updatedSnapshots.reduce(
            (sum, item) => sum + Number(item.total_paid || 0),
            0
          );
          const newTotalBalance = updatedSnapshots.reduce(
            (sum, item) => sum + Number(item.balance || 0),
            0
          );

          try {
            await apiRequest(`/api/billing/archive/${archiveContext.archiveId}/`, {
              method: 'PATCH',
              body: {
                snapshot_data: updatedSnapshots,
                total_paid: newTotalPaid.toFixed(2),
                total_balance: newTotalBalance.toFixed(2),
              },
            });
          } catch {
            // non-fatal
          }
        }
      }

      // 4. Trigger global refresh across app
      if (onRefreshData) {
        await onRefreshData();
      }
      await fetchArchives();

      setToastMessage(
        isPaidTarget
          ? `Status marked as PAID — ₹${rentAmt.toLocaleString('en-IN')} payment recorded & synced across Dashboard, Reports & Invoices!`
          : `Status set to PENDING — payment cleared.`
      );
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Status update karne mein error aaya.'
      );
    } finally {
      setUpdatingRecordId(null);
    }
  };

  const handleDownloadArchiveCsv = (archive: BillingArchive) => {
    const items = archive.snapshot_data || [];
    if (items.length === 0) {
      setToastMessage('Download karne ke liye snapshot data nahi mila.');
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    const headers = [
      'Tenant Name',
      'Phone',
      'Property',
      'Room',
      'Billing Month',
      'Due Date',
      'Room Rent (INR)',
      'Rent Paid (INR)',
      'Rent Balance (INR)',
      'Rent Status',
      'Meter No.',
      'Previous Reading',
      'Current Reading',
      'Units Consumed',
      'Rate / Unit',
      'Electricity Amt (INR)',
      'Electricity Paid (INR)',
      'Electricity Status',
      'Total Billed (INR)',
      'Total Paid (INR)',
      'Balance (INR)',
    ];

    const rows = items.map((i) => [
      `"${(i.tenant_name || '').replace(/"/g, '""')}"`,
      `"${i.tenant_phone || ''}"`,
      `"${(i.property_name || '').replace(/"/g, '""')}"`,
      `"${i.room_number || ''}"`,
      `"${i.billing_month || ''}"`,
      `"${i.due_date || ''}"`,
      i.rent_amount || '0',
      i.rent_paid || '0',
      i.rent_balance || '0',
      `"${i.rent_status || ''}"`,
      `"${i.meter_number || ''}"`,
      i.previous_reading || '0',
      i.current_reading || '0',
      i.units_consumed || '0',
      i.rate_per_unit || '0',
      i.electricity_amount || '0',
      i.electricity_paid || '0',
      `"${i.electricity_status || ''}"`,
      i.total_billed || '0',
      i.total_paid || '0',
      i.balance || '0',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Billing_Archive_${archive.billing_month.slice(0, 7)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToastMessage(
      `Archive statement for ${archive.billing_month.slice(0, 7)} downloaded!`
    );
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Full Combined Bill Modal State (Room Rent + Electricity + Misc)
  const [isCreateBillOpen, setIsCreateBillOpen] = useState(false);
  const [isCreatingBill, setIsCreatingBill] = useState(false);
  const [modalError, setModalError] = useState<string>('');

  // Multi-Select for Rent Records & Bulk Dispatch
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());
  const [isBulkSendingRent, setIsBulkSendingRent] = useState(false);

  const todayIso = new Date().toISOString().split('T')[0];
  const currentMonthFirstDay = `${todayIso.slice(0, 7)}-01`;

  const activeTenants = useMemo(
    () => tenants.filter((t) => t.status === 'Active' || !t.status),
    [tenants]
  );

  // Saved Owner QRs for dropdown selection during bill creation
  const qrConfigs = useMemo<OwnerQrConfig[]>(() => {
    try {
      const saved = localStorage.getItem(QR_LIST_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [
      {
        id: 'qr-default-1',
        label: 'Primary Rent & Bill QR (Main Account)',
        payeeName: 'KirayaSaathi Property Owner',
        upiId: 'KirayaSaathi@ybl',
        qrImageDataUrl: null,
        isDefault: true,
      },
    ];
  }, [isCreateBillOpen]);

  const [selectedTenantForBill, setSelectedTenantForBill] = useState<string>('');
  const selectedTenantObj = useMemo(
    () => activeTenants.find((t) => t.id === selectedTenantForBill),
    [activeTenants, selectedTenantForBill]
  );
  const [billingMonthInput, setBillingMonthInput] = useState<string>(currentMonthFirstDay);
  const [dueDateInput, setDueDateInput] = useState<string>(todayIso);

  // 1. Room Rent
  const [rentAmountInput, setRentAmountInput] = useState<string>('');

  // 2. Electricity
  const [includeElectricity, setIncludeElectricity] = useState<boolean>(true);
  const [meterNumberInput, setMeterNumberInput] = useState<string>('');
  const [prevReadingInput, setPrevReadingInput] = useState<string>('0');
  const [currReadingInput, setCurrReadingInput] = useState<string>('0');
  const [elecRateInput, setElecRateInput] = useState<string>('8');

  // 3. Misc / Additional Charges
  const [miscAmountInput, setMiscAmountInput] = useState<string>('0');
  const [miscDescInput, setMiscDescInput] = useState<string>('');

  // 4. Assigned QR for this tenant's bill
  const [selectedQrId, setSelectedQrId] = useState<string>(qrConfigs[0]?.id || 'qr-default-1');

  useEffect(() => {
    if (activeTenants.length > 0 && !selectedTenantForBill) {
      setSelectedTenantForBill(activeTenants[0].id);
    }
  }, [activeTenants, selectedTenantForBill]);

  // Auto-populate Rent, Property Due Date, Previous Meter Reading, Rate, and QR when tenant changes
  useEffect(() => {
    const t = activeTenants.find((x) => x.id === selectedTenantForBill);
    if (!t) return;

    setRentAmountInput(String(t.monthlyRent || 0));

    const prop = properties.find((p) => String(p.id) === String(t.propertyId));
    if (prop?.electricityRate && prop.electricityRate > 0) {
      setElecRateInput(String(prop.electricityRate));
    }

    const dueDay = prop?.rentDueDay || 5;
    const [yearStr, monthStr] = billingMonthInput.split('-');
    const year = Number(yearStr) || new Date().getFullYear();
    const month = Number(monthStr) || new Date().getMonth() + 1;
    const maxDays = new Date(year, month, 0).getDate();
    const validDay = Math.min(Math.max(1, dueDay), maxDays);
    setDueDateInput(
      `${String(year)}-${String(month).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`
    );

    // Find latest electricity reading for this room
    const roomBills = electricityBills.filter(
      (b) => b.roomId === t.roomId || b.roomNumber === t.roomNumber
    );
    if (roomBills.length > 0) {
      const latest = roomBills[0];
      setMeterNumberInput(latest.meterId || `MTR-${t.roomNumber}`);
      setPrevReadingInput(String(latest.currentReading || 0));
      setCurrReadingInput(String(latest.currentReading || 0));
    } else {
      setMeterNumberInput(`MTR-${t.roomNumber || t.roomId || '101'}`);
      setPrevReadingInput('0');
      setCurrReadingInput('0');
    }

    // Load saved QR assignment for this tenant if any
    try {
      const mapRaw = localStorage.getItem(TENANT_QR_MAP_STORAGE_KEY);
      if (mapRaw) {
        const map = JSON.parse(mapRaw) as Record<string, string>;
        const savedQr = map[t.id] || map[t.name];
        if (savedQr) setSelectedQrId(savedQr);
      }
    } catch {
      // ignore
    }
  }, [selectedTenantForBill, billingMonthInput, activeTenants, properties, electricityBills]);

  // Live Combined Calculation inside Modal
  const liveModalCalc = useMemo(() => {
    const baseRent = Math.max(0, Number(rentAmountInput) || 0);
    const prev = Math.max(0, Number(prevReadingInput) || 0);
    const curr = Math.max(prev, Number(currReadingInput) || 0);
    const rate = Math.max(0, Number(elecRateInput) || 0);
    const units = includeElectricity ? Math.max(0, curr - prev) : 0;
    const elecTotal = includeElectricity ? Math.round(units * rate) : 0;
    const misc = Math.max(0, Number(miscAmountInput) || 0);
    const grandTotal = baseRent + elecTotal + misc;

    return {
      baseRent,
      units,
      rate,
      elecTotal,
      misc,
      grandTotal,
    };
  }, [
    rentAmountInput,
    prevReadingInput,
    currReadingInput,
    elecRateInput,
    includeElectricity,
    miscAmountInput,
  ]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    rentRecords.forEach((r) => {
      if (r.billingMonth) {
        set.add(r.billingMonth.slice(0, 7));
      } else if (r.dueDate) {
        set.add(r.dueDate.slice(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [rentRecords]);

  const scopedRecords = useMemo(() => {
    return rentRecords.filter((r) => {
      if (propertyFilter !== 'ALL' && r.propertyName !== propertyFilter) {
        return false;
      }
      if (selectedMonthFilter !== 'ALL') {
        const recordMonth = (r.billingMonth || r.dueDate || '').slice(0, 7);
        if (recordMonth !== selectedMonthFilter) return false;
      }
      return true;
    });
  }, [rentRecords, propertyFilter, selectedMonthFilter]);

  const getRecordElectricitySplit = (
    r: RentRecord,
    matchingElec?: ElectricityBill
  ) => {
    const roomActiveTenants = tenants.filter(
      (t) =>
        t.status === 'Active' &&
        t.roomNumber === r.roomNumber &&
        (t.propertyId === r.propertyId || t.propertyName === r.propertyName)
    );
    const count = Math.max(1, roomActiveTenants.length);

    if (r.electricityAmount !== undefined && r.electricityAmount > 0) {
      const elecAmt = Number(r.electricityAmount);
      const rawPaid =
        matchingElec?.amountPaid ??
        (matchingElec?.status === 'Paid' ? Number(matchingElec.amount) : 0);
      const elecPaid = Math.round((rawPaid / count) * 100) / 100;
      return { elecAmt, elecPaid };
    }
    if (!matchingElec) return { elecAmt: 0, elecPaid: 0 };
    const elecAmt = Math.round((Number(matchingElec.amount) / count) * 100) / 100;
    const rawPaid =
      matchingElec.amountPaid ??
      (matchingElec.status === 'Paid' ? Number(matchingElec.amount) : 0);
    const elecPaid = Math.round((rawPaid / count) * 100) / 100;
    return { elecAmt, elecPaid };
  };

  const filteredRecords = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return scopedRecords.filter((r) => {
      const monthPrefix = (r.billingMonth || r.dueDate || '').slice(0, 7);
      const matchingElec = electricityBills.find(
        (b) =>
          (b.roomNumber === r.roomNumber || b.roomId === r.propertyId) &&
          (b.billingMonth || b.readingDate || '').slice(0, 7) === monthPrefix
      );
      const { elecAmt, elecPaid } = getRecordElectricitySplit(r, matchingElec);
      const totalCombined = (Number(r.rentDue) || 0) + elecAmt;
      const totalReceived = (Number(r.received) || 0) + elecPaid;
      const totalBalance = Math.max(0, totalCombined - totalReceived);
      const isPastDue = r.dueDate && r.dueDate < today;
      const effectiveStatus: RentRecord['status'] =
        totalBalance <= 0 && totalCombined > 0
          ? 'Paid'
          : (r.status === 'Overdue' || isPastDue) && totalBalance > 0
          ? 'Overdue'
          : totalReceived > 0 && totalBalance > 0
          ? 'Partial'
          : 'Pending';

      if (activeTab === 'paid' && effectiveStatus !== 'Paid') return false;
      if (activeTab === 'pending' && effectiveStatus !== 'Pending') return false;
      if (activeTab === 'partial' && effectiveStatus !== 'Partial') return false;
      if (activeTab === 'overdue' && effectiveStatus !== 'Overdue') return false;

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          r.tenantName.toLowerCase().includes(q) ||
          r.propertyName.toLowerCase().includes(q) ||
          r.roomNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [scopedRecords, activeTab, searchTerm, electricityBills]);

  const toggleRecordSelection = (recordId: string) => {
    setSelectedRecordIds((prev) => {
      const next = new Set(prev);
      if (next.has(recordId)) {
        next.delete(recordId);
      } else {
        next.add(recordId);
      }
      return next;
    });
  };

  const toggleSelectAllRecords = () => {
    if (selectedRecordIds.size === filteredRecords.length && filteredRecords.length > 0) {
      setSelectedRecordIds(new Set());
    } else {
      setSelectedRecordIds(new Set(filteredRecords.map((r) => r.id)));
    }
  };

  const selectedRecordsList = useMemo(() => {
    return rentRecords.filter((r) => selectedRecordIds.has(r.id));
  }, [rentRecords, selectedRecordIds]);

  const totalSelectedRentDue = useMemo(() => {
    return selectedRecordsList.reduce((sum, r) => {
      const rentAmt = Number(r.rentDue) || 0;
      const elecAmt = Number(r.electricityAmount) || 0;
      return sum + rentAmt + elecAmt;
    }, 0);
  }, [selectedRecordsList]);

  const handleBulkSendRent = async (channel: 'BOTH' | 'WHATSAPP' | 'EMAIL') => {
    if (selectedRecordsList.length === 0) return;

    setIsBulkSendingRent(true);
    try {
      const tenantIds = Array.from(
        new Set(
          selectedRecordsList
            .map((r) => Number(r.tenantId))
            .filter((id) => Number.isInteger(id) && id > 0)
        )
      );

      const rentRecordIds = selectedRecordsList
        .map((r) => {
          const num = Number(r.id.replace('rent-', '').replace('rec-', ''));
          return Number.isInteger(num) && num > 0 ? num : null;
        })
        .filter((id): id is number => typeof id === 'number' && id > 0);

      const response = await apiRequest<{
        message: string;
        total_processed: number;
        dispatched: Array<{
          tenant_name: string;
          tenant_phone: string;
          tenant_email: string;
          whatsapp_url: string;
          message: string;
        }>;
      }>('/api/notifications/send-bulk/', {
        method: 'POST',
        body: {
          channel,
          tenant_ids: tenantIds,
          rent_record_ids: rentRecordIds,
        },
      });

      setToastMessage(response.message || `Bills sent to ${response.total_processed} tenants via ${channel === 'BOTH' ? 'WhatsApp & Email' : channel}!`);
      setSelectedRecordIds(new Set());
      setTimeout(() => setToastMessage(''), 3500);
    } catch (err) {
      setToastMessage(
        err instanceof Error ? err.message : 'Bulk dispatch failed. Please try again.'
      );
      setTimeout(() => setToastMessage(''), 3500);
    } finally {
      setIsBulkSendingRent(false);
    }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (propertyFilter !== 'ALL' && p.propertyName !== propertyFilter) {
        return false;
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          p.tenantName.toLowerCase().includes(q) ||
          p.propertyName.toLowerCase().includes(q) ||
          p.roomNumber.toLowerCase().includes(q) ||
          p.transactionReference.toLowerCase().includes(q) ||
          p.notes.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [payments, propertyFilter, searchTerm]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    let totalBilledSum = 0;
    let totalReceivedSum = 0;
    let totalPendingSum = 0;
    let totalOverdueSum = 0;
    let paidCount = 0;
    let pendingOnlyCount = 0;
    let partialCount = 0;
    let overdueCount = 0;

    scopedRecords.forEach((r) => {
      const monthPrefix = (r.billingMonth || r.dueDate || '').slice(0, 7);
      const matchingElec = electricityBills.find(
        (b) =>
          (b.roomNumber === r.roomNumber || b.roomId === r.propertyId) &&
          (b.billingMonth || b.readingDate || '').slice(0, 7) === monthPrefix
      );
      const { elecAmt, elecPaid } = getRecordElectricitySplit(r, matchingElec);

      const billed = (Number(r.rentDue) || 0) + elecAmt;
      const received = (Number(r.received) || 0) + elecPaid;
      const balance = Math.max(0, billed - received);

      const isPastDue = r.dueDate && r.dueDate < today;
      const isPaid = balance <= 0 && billed > 0;
      const isOverdue = !isPaid && (r.status === 'Overdue' || isPastDue);
      const isPartial = !isPaid && !isOverdue && received > 0 && balance > 0;

      totalBilledSum += billed;
      totalReceivedSum += received;

      if (isPaid) {
        paidCount += 1;
      } else if (isOverdue) {
        overdueCount += 1;
        totalOverdueSum += balance;
      } else if (isPartial) {
        partialCount += 1;
        totalPendingSum += balance;
      } else {
        pendingOnlyCount += 1;
        totalPendingSum += balance;
      }
    });

    const collectionRate =
      totalBilledSum > 0
        ? Number(((totalReceivedSum / totalBilledSum) * 100).toFixed(1))
        : totalReceivedSum > 0
        ? 100
        : 0;

    return {
      expectedRent: totalBilledSum,
      collectedRent: totalReceivedSum,
      pendingAmount: totalPendingSum,
      overdueAmount: totalOverdueSum,
      totalCount: scopedRecords.length,
      paidCount,
      pendingOnlyCount,
      partialCount,
      overdueCount,
      collectionRate,
    };
  }, [scopedRecords, electricityBills]);

  const [selectedTrendMonthKey, setSelectedTrendMonthKey] = useState<string | null>(null);

  const monthlyTrends = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const monthMap = new Map<
      string,
      {
        monthKey: string;
        monthLabel: string;
        shortMonth: string;
        year: string;
        expectedRent: number;
        expectedElec: number;
        expectedTotal: number;
        collected: number;
        pending: number;
        overdue: number;
        paidBillsCount: number;
        totalBillsCount: number;
        collectionRate: number;
      }
    >();

    const propFilteredRecords = rentRecords.filter((r) => {
      if (propertyFilter !== 'ALL' && r.propertyName !== propertyFilter) return false;
      return true;
    });

    propFilteredRecords.forEach((r) => {
      const monthKey = (r.billingMonth || r.dueDate || '').slice(0, 7);
      if (!monthKey || monthKey.length < 7) return;

      const [y, m] = monthKey.split('-');
      const dateObj = new Date(Number(y), Number(m) - 1, 1);
      const shortMonth = dateObj.toLocaleString('en-US', { month: 'short' });
      const monthLabel = `${shortMonth} ${y}`;

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          monthKey,
          monthLabel,
          shortMonth,
          year: y,
          expectedRent: 0,
          expectedElec: 0,
          expectedTotal: 0,
          collected: 0,
          pending: 0,
          overdue: 0,
          paidBillsCount: 0,
          totalBillsCount: 0,
          collectionRate: 0,
        });
      }

      const item = monthMap.get(monthKey)!;

      const matchingElec = electricityBills.find(
        (b) =>
          (b.roomNumber === r.roomNumber || b.roomId === r.propertyId) &&
          (b.billingMonth || b.readingDate || '').slice(0, 7) === monthKey
      );
      const { elecAmt, elecPaid } = getRecordElectricitySplit(r, matchingElec);

      const rentAmt = Number(r.rentDue) || 0;
      const totalBilled = rentAmt + elecAmt;
      const totalReceived = (Number(r.received) || 0) + elecPaid;
      const balance = Math.max(0, totalBilled - totalReceived);

      item.expectedRent += rentAmt;
      item.expectedElec += elecAmt;
      item.expectedTotal += totalBilled;
      item.collected += totalReceived;
      item.totalBillsCount += 1;

      const isPastDue = r.dueDate && r.dueDate < today;
      if (balance <= 0 && totalBilled > 0) {
        item.paidBillsCount += 1;
      } else if (r.status === 'Overdue' || isPastDue) {
        item.overdue += balance;
        item.pending += balance;
      } else {
        item.pending += balance;
      }
    });

    // Ensure timeline spans from past months through upcoming/next billing cycle
    const now = new Date();
    for (let i = 5; i >= -1; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap.has(key)) {
        const shortMonth = d.toLocaleString('en-US', { month: 'short' });
        monthMap.set(key, {
          monthKey: key,
          monthLabel: `${shortMonth} ${d.getFullYear()}`,
          shortMonth,
          year: String(d.getFullYear()),
          expectedRent: 0,
          expectedElec: 0,
          expectedTotal: 0,
          collected: 0,
          pending: 0,
          overdue: 0,
          paidBillsCount: 0,
          totalBillsCount: 0,
          collectionRate: 0,
        });
      }
    }

    const result = Array.from(monthMap.values())
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .slice(-6);

    result.forEach((item) => {
      item.collectionRate =
        item.expectedTotal > 0
          ? Number(((item.collected / item.expectedTotal) * 100).toFixed(1))
          : item.collected > 0
          ? 100
          : 0;
    });

    return result;
  }, [rentRecords, electricityBills, propertyFilter]);

  const archivedTenantRows = useMemo(() => {
    const rows: Array<{
      archiveId: number;
      archiveMonth: string;
      recordId?: number;
      tenantName: string;
      tenantPhone?: string;
      roomNumber: string;
      propertyName: string;
      billingMonth: string;
      rentAmount: number;
      elecAmount: number;
      totalBilled: number;
      totalPaid: number;
      balance: number;
      status: 'PAID' | 'PENDING' | 'PARTIAL' | 'OVERDUE';
    }> = [];

    archives.forEach((arc) => {
      const monthPrefix = arc.billing_month.slice(0, 7);
      if (
        selectedArchivedCycle !== 'ALL' &&
        arc.billing_month !== selectedArchivedCycle &&
        monthPrefix !== selectedArchivedCycle
      ) {
        return;
      }
      const snapshot = Array.isArray(arc.snapshot_data) ? arc.snapshot_data : [];
      snapshot.forEach((item) => {
        if (propertyFilter !== 'ALL' && item.property_name !== propertyFilter) {
          return;
        }

        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          const match =
            (item.tenant_name || '').toLowerCase().includes(q) ||
            (item.property_name || '').toLowerCase().includes(q) ||
            (item.room_number || '').toLowerCase().includes(q);
          if (!match) return;
        }

        // Live check against rentRecords if updated
        const matchedRentRec = rentRecords.find(
          (r) =>
            (item.record_id &&
              (r.id === String(item.record_id) || r.id === `rent-${item.record_id}`)) ||
            (r.tenantName.trim().toLowerCase() === (item.tenant_name || '').trim().toLowerCase() &&
              (r.billingMonth || '').slice(0, 7) === monthPrefix)
        );

        const rentAmt = Number(item.rent_amount || 0);
        const elecAmt = Number(item.electricity_amount || 0);
        const billed = Number(item.total_billed || rentAmt + elecAmt);
        const livePaid = matchedRentRec
          ? Number(matchedRentRec.received || 0)
          : Number(item.total_paid || item.rent_paid || 0);
        const bal = Math.max(0, billed - livePaid);

        const liveStatus = (
          matchedRentRec?.status?.toUpperCase() ||
          item.rent_status ||
          'PENDING'
        ).toUpperCase();

        const effectiveStatus: 'PAID' | 'PENDING' | 'PARTIAL' | 'OVERDUE' =
          liveStatus === 'PAID' || (bal <= 0 && billed > 0)
            ? 'PAID'
            : liveStatus === 'OVERDUE'
            ? 'OVERDUE'
            : liveStatus === 'PARTIAL' || (livePaid > 0 && bal > 0)
            ? 'PARTIAL'
            : 'PENDING';

        rows.push({
          archiveId: Number(arc.id),
          archiveMonth: arc.billing_month_formatted || monthPrefix,
          recordId:
            item.record_id ||
            (matchedRentRec ? Number(matchedRentRec.id.replace(/\D/g, '')) : undefined),
          tenantName: item.tenant_name,
          tenantPhone: item.tenant_phone,
          roomNumber: item.room_number,
          propertyName: item.property_name,
          billingMonth: item.billing_month || arc.billing_month,
          rentAmount: rentAmt,
          elecAmount: elecAmt,
          totalBilled: billed,
          totalPaid: livePaid,
          balance: bal,
          status: effectiveStatus,
        });
      });
    });

    return rows;
  }, [archives, selectedArchivedCycle, rentRecords, propertyFilter, searchTerm]);

  const maxTrendAmount = useMemo(() => {
    return Math.max(
      1,
      ...monthlyTrends.flatMap((item) => [item.expectedTotal, item.collected])
    );
  }, [monthlyTrends]);

  const trendChartCeiling = useMemo(() => {
    if (maxTrendAmount <= 10) return 100;
    if (maxTrendAmount <= 500) return 1000;
    return Math.ceil(maxTrendAmount / 5000) * 5000 || 5000;
  }, [maxTrendAmount]);

  const activeTrendMonth = useMemo(() => {
    if (selectedTrendMonthKey) {
      return (
        monthlyTrends.find((m) => m.monthKey === selectedTrendMonthKey) ||
        monthlyTrends[monthlyTrends.length - 1]
      );
    }
    return monthlyTrends[monthlyTrends.length - 1];
  }, [monthlyTrends, selectedTrendMonthKey]);

  const handleSelectTrendMonth = (monthKey: string) => {
    if (selectedTrendMonthKey === monthKey && selectedMonthFilter === monthKey) {
      setSelectedTrendMonthKey(null);
      setSelectedMonthFilter('ALL');
    } else {
      setSelectedTrendMonthKey(monthKey);
      setSelectedMonthFilter(monthKey);
    }
  };

  const handleRefresh = async () => {
    if (!onRefreshData) return;
    setIsRefreshing(true);
    setErrorMessage('');
    try {
      await onRefreshData();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Data refresh nahi ho saka.'
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  // Create Full Combined Bill (Room Rent + Electricity + Misc + QR Selection) in Backend
  const handleCreateCombinedBill = async (
    e: React.FormEvent,
    openInvoiceAfterSave = false
  ) => {
    e.preventDefault();
    setErrorMessage('');
    setModalError('');

    const tenant = activeTenants.find((t) => t.id === selectedTenantForBill);
    if (!tenant) {
      setModalError('Kripya ek valid active tenant select karein.');
      return;
    }

    let agreementId = tenant.agreementId;
    if (!agreementId) {
      // Dynamic fallback: look up active agreement for this tenant
      try {
        const agsRes = await apiRequest<Array<{ id: number; tenant: number; status: string }>>(
          '/api/tenants/rental-agreements/'
        );
        const agList = Array.isArray(agsRes) ? agsRes : (agsRes as { results?: unknown[] })?.results || [];
        const matchedAg = (agList as Array<{ id: number; tenant: number; status: string }>).find(
          (a) => String(a.tenant) === String(tenant.id) && String(a.status).toUpperCase() === 'ACTIVE'
        );
        if (matchedAg?.id) {
          agreementId = matchedAg.id;
        }
      } catch {
        // ignore
      }
    }

    if (!agreementId) {
      setModalError(`Tenant "${tenant.name}" ke paas koi active rental agreement nahi mila. Pehle unhe room allocate karein.`);
      return;
    }

    const rentAmtNum = Number(rentAmountInput);
    if (isNaN(rentAmtNum) || rentAmtNum < 0) {
      setModalError('Kripya ek valid room rent amount enter karein.');
      return;
    }

    if (includeElectricity) {
      const prevVal = Number(prevReadingInput);
      const currVal = Number(currReadingInput);
      if (isNaN(currVal) || isNaN(prevVal)) {
        setModalError('Kripya valid electricity meter readings enter karein.');
        return;
      }
      if (currVal < prevVal) {
        setModalError(`Current meter reading (${currVal}) previous reading (${prevVal}) se kam nahi ho sakti.`);
        return;
      }
    }

    setIsCreatingBill(true);
    try {
      const normalizedMonth = `${billingMonthInput.slice(0, 7)}-01`;
      const monthKey = `${tenant.id}-${normalizedMonth.slice(0, 7)}`;

      // Save selected QR for this tenant in localStorage
      if (selectedQrId) {
        try {
          const existingMapRaw = localStorage.getItem(TENANT_QR_MAP_STORAGE_KEY);
          const existingMap = existingMapRaw ? JSON.parse(existingMapRaw) : {};
          existingMap[tenant.id] = selectedQrId;
          existingMap[tenant.name] = selectedQrId;
          localStorage.setItem(
            TENANT_QR_MAP_STORAGE_KEY,
            JSON.stringify(existingMap)
          );
        } catch {
          // ignore
        }
      }

      // Save Misc charges metadata so Invoice & RentManagement display exact breakdown
      const miscVal = Math.max(0, Number(miscAmountInput) || 0);
      const miscLabel =
        miscDescInput.trim() || (miscVal > 0 ? 'Maintenance / Other Charges' : '');

      try {
        const miscRaw = localStorage.getItem(MISC_BILL_STORAGE_KEY);
        const miscMap: Record<string, MiscChargeEntry> = miscRaw
          ? JSON.parse(miscRaw)
          : {};
        miscMap[monthKey] = {
          miscAmount: miscVal,
          miscDescription: miscLabel,
        };
        miscMap[`${tenant.name}-${normalizedMonth.slice(0, 7)}`] = {
          miscAmount: miscVal,
          miscDescription: miscLabel,
        };
        localStorage.setItem(MISC_BILL_STORAGE_KEY, JSON.stringify(miscMap));
      } catch {
        // ignore
      }

      // 1. Save or Update RentRecord in Django Backend (includes Room Rent + Misc so total is tracked in DB)
      const combinedRentAndMisc = liveModalCalc.baseRent + miscVal;
      const structuredNotes =
        miscVal > 0
          ? `Base Rent: ₹${liveModalCalc.baseRent} | Misc (${miscLabel}): ₹${miscVal}`
          : `Monthly Room Rent (${normalizedMonth.slice(0, 7)})`;

      try {
        await apiRequest('/api/billing/', {
          method: 'POST',
          body: {
            agreement: agreementId,
            billing_month: normalizedMonth,
            rent_amount: combinedRentAndMisc.toFixed(2),
            due_date: dueDateInput,
            notes: structuredNotes,
          },
        });
      } catch {
        // If a RentRecord already exists for this agreement & month, find and PATCH it
        const cleanRec = rentRecords.find(
          (r) =>
            (String(r.agreementId) === String(agreementId) || String(r.tenantId) === String(tenant.id)) &&
            (r.billingMonth || '').slice(0, 7) === normalizedMonth.slice(0, 7)
        );
        const cleanId = cleanRec ? String(cleanRec.id).replace(/^rent-/, '').replace(/^rec-/, '') : null;
        if (cleanId && /^\d+$/.test(cleanId)) {
          await apiRequest(`/api/billing/${cleanId}/`, {
            method: 'PATCH',
            body: {
              rent_amount: combinedRentAndMisc.toFixed(2),
              due_date: dueDateInput,
              notes: structuredNotes,
            },
          });
        } else {
          try {
            const listRes = await apiRequest<unknown>('/api/billing/');
            const list = Array.isArray(listRes) ? listRes : (listRes as { results?: unknown[] })?.results || [];
            const matched = (list as Array<{ id: number; agreement: number; billing_month: string }>).find(
              (item) =>
                Number(item.agreement) === Number(agreementId) &&
                String(item.billing_month || '').slice(0, 7) === normalizedMonth.slice(0, 7)
            );
            if (matched?.id) {
              await apiRequest(`/api/billing/${matched.id}/`, {
                method: 'PATCH',
                body: {
                  rent_amount: combinedRentAndMisc.toFixed(2),
                  due_date: dueDateInput,
                  notes: structuredNotes,
                },
              });
            }
          } catch {
            // non-fatal
          }
        }
      }

      // 2. Save Electricity Meter, Reading & Bill in Django Backend if enabled
      if (includeElectricity && tenant.roomId) {
        const prevVal = Number(prevReadingInput) || 0;
        const currVal = Number(currReadingInput) || 0;

        if (currVal >= prevVal && currVal >= 0) {
          const prefixes = ['/api/electricity', '/api/billing', '/api'];
          for (const prefix of prefixes) {
            try {
              const metersRes = await apiRequest<unknown>(`${prefix}/meters/`);
              const metersList = Array.isArray(metersRes)
                ? metersRes
                : (metersRes as { results?: unknown[] })?.results || [];

              let meter = (
                metersList as { id: number; room: number; meter_number: string }[]
              ).find((m) => String(m.room) === String(tenant.roomId));

              if (!meter) {
                meter = await apiRequest<{
                  id: number;
                  room: number;
                  meter_number: string;
                }>(`${prefix}/meters/`, {
                  method: 'POST',
                  body: {
                    room: Number(tenant.roomId),
                    meter_number:
                      meterNumberInput.trim() ||
                      `MTR-${tenant.roomNumber || tenant.roomId}`,
                    installation_date: dueDateInput || todayIso,
                    is_active: true,
                    notes: 'Auto-created from Combined Bill Generator',
                  },
                });
              }

              const reading = await apiRequest<{ id: number }>(
                `${prefix}/readings/`,
                {
                  method: 'POST',
                  body: {
                    meter: meter.id,
                    reading_date: dueDateInput || todayIso,
                    previous_reading: prevVal.toFixed(2),
                    current_reading: currVal.toFixed(2),
                    notes: `Combined bill reading (${normalizedMonth.slice(0, 7)})`,
                  },
                }
              );

              try {
                await apiRequest(`${prefix}/bills/generate/`, {
                  method: 'POST',
                  body: {
                    reading_id: reading.id,
                    billing_month: normalizedMonth,
                  },
                });
              } catch {
                await apiRequest(`${prefix}/bills/`, {
                  method: 'POST',
                  body: {
                    meter: meter.id,
                    reading: reading.id,
                    billing_month: normalizedMonth,
                    units_consumed: liveModalCalc.units.toFixed(2),
                    rate_per_unit: liveModalCalc.rate.toFixed(2),
                    total_amount: liveModalCalc.elecTotal.toFixed(2),
                    due_date: dueDateInput,
                  },
                });
              }
              break;
            } catch {
              // try next prefix
            }
          }
        }
      }

      if (onRefreshData) {
        await onRefreshData();
      }
      await fetchArchives();

      setIsCreateBillOpen(false);
      setMiscAmountInput('0');
      setMiscDescInput('');

      if (openInvoiceAfterSave) {
        if (onSelectInvoice) onSelectInvoice(tenant.name);
        onNavigate('invoice_list');
      } else {
        setToastMessage(
          `Full Bill (₹${liveModalCalc.grandTotal.toLocaleString('en-IN')}) successfully generated for ${tenant.name}!`
        );
        setTimeout(() => setToastMessage(''), 3500);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Combined bill generate karne mein error aaya.';
      setModalError(msg);
      setErrorMessage(msg);
    } finally {
      setIsCreatingBill(false);
    }
  };

  const sendWhatsAppReminder = (record: RentRecord) => {
    const matchingTenant =
      (record.tenantId ? tenants.find((t) => String(t.id) === String(record.tenantId)) : undefined) ||
      (record.agreementId ? tenants.find((t) => t.agreementId === record.agreementId) : undefined) ||
      (record.roomNumber ? tenants.find((t) => t.roomNumber === record.roomNumber && t.status === 'Active') : undefined) ||
      tenants.find((t) => t.name.trim().toLowerCase() === record.tenantName.trim().toLowerCase() && t.status === 'Active') ||
      tenants.find((t) => t.name.trim().toLowerCase() === record.tenantName.trim().toLowerCase());
    const tenantName = matchingTenant?.name || record.tenantName;
    const roomNumber = matchingTenant?.roomNumber || record.roomNumber;
    const propertyName = matchingTenant?.propertyName || record.propertyName;
    const totalDue =
      (Number(record.balance) || 0) + (Number(record.electricityAmount) || 0);
    const message = `Hello ${tenantName}, your monthly bill for Room ${roomNumber} (${propertyName}) is ready. Total Payable (Rent + Electricity + Misc): ₹${totalDue.toLocaleString('en-IN')}, due on ${record.dueDate}. Please scan the QR on your invoice or tap Pay Now to pay via UPI. Thank you!`;

    const rawPhone = matchingTenant?.phone || record.tenantPhone || '';
    let cleanDigits = rawPhone.replace(/\D/g, '');
    if (cleanDigits.startsWith('0')) {
      cleanDigits = cleanDigits.replace(/^0+/, '');
    }
    const phoneWithCountry =
      cleanDigits.length === 10
        ? `91${cleanDigits}`
        : cleanDigits.length === 12 && cleanDigits.startsWith('91')
        ? cleanDigits
        : cleanDigits;

    if (!phoneWithCountry) {
      setToastMessage(`Tenant ${tenantName} ka valid mobile number nahi mila.`);
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    window.open(
      `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer'
    );

    setToastMessage(`WhatsApp reminder prepared for ${tenantName}!`);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleExportCsv = () => {
    if (filteredRecords.length === 0) {
      setToastMessage('Export karne ke liye koi record nahi hai.');
      setTimeout(() => setToastMessage(''), 2500);
      return;
    }

    const headers = [
      'Record ID',
      'Tenant Name',
      'Property',
      'Room',
      'Billing Month',
      'Room Rent (INR)',
      'Electricity (INR)',
      'Misc Charges (INR)',
      'Total Billed (INR)',
      'Received (INR)',
      'Balance (INR)',
      'Due Date',
      'Status',
    ];

    const rows = filteredRecords.map((r) => {
      const elec = Number(r.electricityAmount) || 0;
      const misc = Number(r.miscAmount) || 0;
      const base = r.baseRentAmount ?? Math.max(0, r.rentDue - misc);
      const total = r.rentDue + elec;
      return [
        r.id,
        `"${r.tenantName.replace(/"/g, '""')}"`,
        `"${r.propertyName.replace(/"/g, '""')}"`,
        r.roomNumber,
        r.billingMonth || r.dueDate.slice(0, 7),
        base,
        elec,
        misc,
        total,
        r.received,
        r.balance + elec,
        r.dueDate,
        r.status,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `combined_rent_records_${todayIso}.csv`);
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

      {/* Page Heading & Actions */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight">
            Every payment, accounted for
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Generate full monthly bills (Rent + Electricity + Misc) &amp; track UPI payments automatically.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-[#035E7B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedMonthFilter}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedMonthFilter(val);
                setSelectedTrendMonthKey(val === 'ALL' ? null : val);
              }}
              className="h-9 pl-8 pr-7 bg-white hover:bg-slate-50 border border-slate-200 text-[#035E7B] rounded-xl text-xs font-semibold transition shadow-2xs appearance-none focus:outline-none focus:border-[#035E7B]"
            >
              <option value="ALL">All billing months</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={() => void handleRefresh()}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-[#035E7B] rounded-xl text-xs font-semibold transition shadow-2xs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          <button
            onClick={() => setIsCreateBillOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#035E7B] hover:bg-[#024B63] text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>Generate Full Bill (Rent + Elec + Misc)</span>
          </button>

          <button
            onClick={() => setIsArchiveModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-[#035E7B] text-[#035E7B] rounded-xl text-xs font-bold transition shadow-2xs active:scale-95"
            title="Archive completed month & rollover electricity readings"
          >
            <FolderArchive className="w-4 h-4 text-[#035E7B]" />
            <span>Archive Month</span>
          </button>

          <button
            onClick={() => onNavigate('security_deposits')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#E8F8F4] hover:bg-[#D3F3EB] border border-[#0C8067] text-[#0C8067] rounded-xl text-xs font-bold transition shadow-2xs"
            title="Manage one-time move-in security deposits & room inventory"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#0C8067]" />
            <span>Security Deposits</span>
          </button>

          <button
            onClick={() => onNavigate('invoice_list')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-[#035E7B] text-[#035E7B] rounded-xl text-xs font-bold transition shadow-2xs"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Invoices &amp; QR</span>
          </button>
        </div>
      </section>

      {/* 4 Dynamic Stat Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Billed (Rent + Elec + Misc)</span>
            <IndianRupee className="w-4 h-4 text-[#0D8AB0]" />
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mt-3">
            ₹{stats.expectedRent.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 truncate">
            {stats.totalCount} active bills · Recurring monthly cycle
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Collected (Live)</span>
            <CheckCircle2 className="w-4 h-4 text-[#0C8067]" />
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mt-3">
            ₹{stats.collectedRent.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-[#0C8067] font-semibold mt-2">
            {stats.collectionRate}% collected ({stats.paidCount} bills paid)
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Pending &amp; Partial</span>
            <Clock className="w-4 h-4 text-[#A8680C]" />
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mt-3">
            ₹{stats.pendingAmount.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-[#A8680C] font-semibold mt-2">
            {stats.pendingOnlyCount + stats.partialCount} bills awaiting payment
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Overdue</span>
            <AlertCircle className="w-4 h-4 text-[#CA4A4A]" />
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mt-3">
            ₹{stats.overdueAmount.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-[#CA4A4A] font-semibold mt-2">
            {stats.overdueCount} overdue past due date
          </p>
        </div>
      </section>

      {/* Dynamic Rent Collection & Monthly Income Trend Graph */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EAF4F7] text-[#035E7B] flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  Rent Collection &amp; Revenue Trends
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F8F4] text-[#0C8067]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0C8067] animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Month-by-month actual rent billed vs collected. Click any bar to inspect details and filter table records.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#035E7B]" />
                <span className="text-[11px] font-medium text-slate-700">Collected Rent</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#E8F8F4] border border-[#14B8A6]" />
                <span className="text-[11px] font-medium text-slate-700">Expected / Billed</span>
              </span>
            </div>

            {selectedMonthFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => {
                  setSelectedMonthFilter('ALL');
                  setSelectedTrendMonthKey(null);
                }}
                className="text-[11px] font-bold text-[#035E7B] bg-[#EAF4F7] hover:bg-[#D8ECF2] px-2.5 py-1 rounded-lg transition"
              >
                Clear Month Filter ({selectedMonthFilter}) ✕
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 items-center">
          {/* Main Chart Graphic */}
          <div className="lg:col-span-8">
            <div className="h-56 grid grid-cols-[55px_1fr] gap-2 pt-2 relative">
              {/* Y Axis Labels */}
              <div className="flex flex-col justify-between text-[10px] text-slate-400 pb-7 text-right pr-2 select-none">
                <span>₹{trendChartCeiling.toLocaleString('en-IN')}</span>
                <span>₹{Math.round(trendChartCeiling * 0.66).toLocaleString('en-IN')}</span>
                <span>₹{Math.round(trendChartCeiling * 0.33).toLocaleString('en-IN')}</span>
                <span>₹0</span>
              </div>

              {/* Chart Grid Lines and Bars */}
              <div className="relative border-b border-slate-200 pb-2 min-w-0">
                {/* Dashed Horizontal Grid Lines */}
                <div className="absolute inset-x-0 top-2 border-b border-dashed border-slate-200 pointer-events-none" />
                <div className="absolute inset-x-0 top-1/3 border-b border-dashed border-slate-200 pointer-events-none" />
                <div className="absolute inset-x-0 top-2/3 border-b border-dashed border-slate-200 pointer-events-none" />

                <div
                  className="h-full grid gap-2 sm:gap-4 items-end"
                  style={{
                    gridTemplateColumns: `repeat(${Math.max(monthlyTrends.length, 1)}, minmax(0, 1fr))`,
                  }}
                >
                  {monthlyTrends.map((item, index) => {
                    const expectedHeight = (item.expectedTotal / trendChartCeiling) * 140;
                    const collectedHeight = (item.collected / trendChartCeiling) * 140;
                    const isLatest = index === monthlyTrends.length - 1;
                    const isSelected = selectedTrendMonthKey === item.monthKey || selectedMonthFilter === item.monthKey;

                    return (
                      <div
                        key={item.monthKey}
                        onClick={() => handleSelectTrendMonth(item.monthKey)}
                        className={`group flex flex-col items-center justify-end h-full min-w-0 p-1 rounded-xl cursor-pointer transition ${
                          isSelected
                            ? 'bg-[#EAF4F7]/80 ring-2 ring-[#035E7B]'
                            : 'hover:bg-slate-50'
                        }`}
                        title={`${item.monthLabel}: Billed ₹${item.expectedTotal.toLocaleString('en-IN')}, Collected ₹${item.collected.toLocaleString('en-IN')} (${item.collectionRate}%)`}
                      >
                        <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-[145px]">
                          {/* Expected Bar */}
                          <div
                            style={{ height: `${Math.max(expectedHeight, 4)}px` }}
                            className={`w-2.5 sm:w-4 shrink-0 rounded-t-sm border transition-all ${
                              isSelected
                                ? 'bg-[#14B8A6] border-[#035E7B]'
                                : 'bg-[#E8F8F4] border-[#14B8A6]/60 group-hover:bg-[#D5F3EB]'
                            }`}
                          />
                          {/* Collected Bar */}
                          <div
                            style={{ height: `${Math.max(collectedHeight, 4)}px` }}
                            className={`w-2.5 sm:w-4 shrink-0 rounded-t-sm transition-all ${
                              isSelected
                                ? 'bg-[#035E7B] ring-2 ring-[#035E7B]/40'
                                : isLatest
                                ? 'bg-[#035E7B] group-hover:brightness-90'
                                : 'bg-[#0D8AB0] group-hover:brightness-90'
                            }`}
                          />
                        </div>

                        {/* Month Label */}
                        <span
                          className={`text-[10px] mt-2 block truncate transition ${
                            isSelected
                              ? 'font-bold text-[#035E7B]'
                              : isLatest
                              ? 'font-bold text-slate-800'
                              : 'text-slate-400 group-hover:text-slate-600'
                          }`}
                        >
                          {item.shortMonth}
                        </span>

                        {/* Efficiency Pill */}
                        <span
                          className={`text-[9px] px-1 rounded font-bold mt-0.5 ${
                            item.collectionRate >= 100
                              ? 'text-[#0C8067] bg-[#E8F8F4]'
                              : item.collectionRate > 0
                              ? 'text-[#035E7B] bg-[#EAF4F7]'
                              : 'text-slate-400'
                          }`}
                        >
                          {item.expectedTotal > 0 ? `${Math.round(item.collectionRate)}%` : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Active Selected Month Details Card */}
          <div className="lg:col-span-4 bg-slate-50 border border-slate-200/90 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  {selectedTrendMonthKey ? 'Selected Month' : 'Latest Cycle'}
                </span>
                <strong className="text-sm font-bold text-slate-800">
                  {activeTrendMonth?.monthLabel || 'Current Month'}
                </strong>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  (activeTrendMonth?.collectionRate ?? 0) >= 100
                    ? 'bg-[#E8F8F4] text-[#0C8067]'
                    : (activeTrendMonth?.collectionRate ?? 0) > 0
                    ? 'bg-[#EAF4F7] text-[#035E7B]'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {activeTrendMonth?.collectionRate ?? 0}% Collected
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#035E7B] h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, activeTrendMonth?.collectionRate ?? 0)}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                <span className="text-[10px] text-slate-400 block">Total Billed</span>
                <strong className="text-slate-800 font-bold block mt-0.5">
                  ₹{(activeTrendMonth?.expectedTotal ?? 0).toLocaleString('en-IN')}
                </strong>
                <span className="text-[9px] text-slate-400">
                  {activeTrendMonth?.totalBillsCount ?? 0} bills
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                <span className="text-[10px] text-[#0C8067] font-semibold block">Collected</span>
                <strong className="text-[#0C8067] font-bold block mt-0.5">
                  ₹{(activeTrendMonth?.collected ?? 0).toLocaleString('en-IN')}
                </strong>
                <span className="text-[9px] text-slate-400">
                  {activeTrendMonth?.paidBillsCount ?? 0} paid
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 col-span-2 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#CA4A4A] font-semibold block">Outstanding Balance</span>
                  <strong className="text-slate-800 font-bold block mt-0.5">
                    ₹{(activeTrendMonth?.pending ?? 0).toLocaleString('en-IN')}
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenRecordPayment()}
                  className="px-2.5 py-1.5 bg-[#035E7B] text-white hover:bg-[#024B63] rounded-lg text-xs font-bold transition shadow-2xs"
                >
                  + Record
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Auto-Tracked UPI Payment Feed Banner */}
      {payments.length > 0 && (
        <section className="bg-white border border-emerald-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#E8F8F4] text-[#0C8067] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                  Live Automatic Payment Tracking
                </h3>
                <p className="text-[11px] text-slate-400">
                  As soon as a tenant pays via the Invoice &quot;Pay Now&quot; button, their UTR, Date, Time &amp; Amount appear here automatically.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className="text-xs font-bold text-[#035E7B] hover:underline self-start sm:self-center"
            >
              View full tracking log ({payments.length}) →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {payments.slice(0, 3).map((p) => {
              const dt = new Date(p.paymentDate);
              const dateStr = dt.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });
              const timeStr = dt.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <strong className="font-bold text-slate-800 truncate">
                        {p.tenantName}
                      </strong>
                      <span className="px-1.5 py-0.5 rounded bg-[#E8F8F4] text-[#0C8067] text-[9px] font-bold">
                        Auto-Tracked
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-[#035E7B] mt-0.5">
                      UTR: {p.transactionReference || `TXN-${p.id}`}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {dateStr} at {timeStr} · Room {p.roomNumber}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <strong className="text-sm font-bold text-[#0C8067] block">
                      +₹{p.amount.toLocaleString('en-IN')}
                    </strong>
                    <span className="text-[10px] text-slate-400 uppercase">
                      {p.paymentMethod}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Monthly Rent Records & Auto Payment Tracking Card */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {activeTab === 'history'
                ? 'Automatic Payment Tracking Log (UTR, Date, Time & Amount)'
                : activeTab === 'archived'
                ? 'Archived Billing Cycles & Historical Data'
                : 'Monthly Combined Bills (Room Rent + Electricity + Misc)'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeTab === 'history'
                ? 'Every UPI & QR payment is automatically logged with transaction reference and timestamp.'
                : activeTab === 'archived'
                ? 'Permanent billing snapshots of completed months. Download statements anytime.'
                : 'Click "Send Bill / QR" on any row to preview the full invoice with QR and Pay Now button.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenRecordPayment()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Manual entry</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-[#035E7B] hover:bg-slate-50 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Categories Tabs */}
        <div className="flex items-center gap-5 border-b border-slate-200 pb-2 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-2 -mb-2.5 font-semibold whitespace-nowrap transition border-b-2 ${
              activeTab === 'all'
                ? 'border-[#035E7B] text-[#035E7B] font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            All records · {stats.totalCount}
          </button>
          <button
            onClick={() => setActiveTab('paid')}
            className={`pb-2 -mb-2.5 font-semibold whitespace-nowrap transition border-b-2 ${
              activeTab === 'paid'
                ? 'border-[#035E7B] text-[#035E7B] font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Paid · {stats.paidCount}
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-2 -mb-2.5 font-semibold whitespace-nowrap transition border-b-2 ${
              activeTab === 'pending'
                ? 'border-[#035E7B] text-[#035E7B] font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Pending · {stats.pendingOnlyCount}
          </button>
          <button
            onClick={() => setActiveTab('partial')}
            className={`pb-2 -mb-2.5 font-semibold whitespace-nowrap transition border-b-2 ${
              activeTab === 'partial'
                ? 'border-[#035E7B] text-[#035E7B] font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Partial · {stats.partialCount}
          </button>
          <button
            onClick={() => setActiveTab('overdue')}
            className={`pb-2 -mb-2.5 font-semibold whitespace-nowrap transition border-b-2 ${
              activeTab === 'overdue'
                ? 'border-[#035E7B] text-[#035E7B] font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Overdue · {stats.overdueCount}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2 -mb-2.5 font-semibold whitespace-nowrap transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-[#0C8067] text-[#0C8067] font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Auto Payment Tracking · {payments.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`pb-2 -mb-2.5 font-semibold whitespace-nowrap transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'archived'
                ? 'border-[#035E7B] text-[#035E7B] font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>Archived Cycles ({archives.length})</span>
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tenant, UTR number, property or room..."
              className="w-full h-10 pl-10 pr-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
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

        {/* Table View */}
        {activeTab === 'history' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3 rounded-l-lg">Tenant / Room</th>
                  <th className="py-2.5 px-3">Transaction / UTR No.</th>
                  <th className="py-2.5 px-3">Bill Type</th>
                  <th className="py-2.5 px-3">Amount Paid</th>
                  <th className="py-2.5 px-3">Payment Mode</th>
                  <th className="py-2.5 px-3">Date &amp; Time</th>
                  <th className="py-2.5 px-3 rounded-r-lg text-right">Tracking Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No payments tracked yet. When a tenant clicks &quot;Pay Now&quot; on their Invoice, their transaction details appear here automatically.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => {
                    const dt = new Date(p.paymentDate);
                    const formattedDate = dt.toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    });
                    const formattedTime = dt.toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-3">
                          <strong className="block font-semibold text-slate-800">
                            {p.tenantName}
                          </strong>
                          <span className="text-[10px] text-slate-400">
                            {p.propertyName} · Room {p.roomNumber}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-[#035E7B] block">
                            {p.transactionReference || `UTR-${p.id}`}
                          </span>
                          {p.notes && (
                            <span className="text-[10px] text-slate-400 block truncate max-w-[200px]">
                              {p.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 capitalize font-medium text-slate-700">
                          {p.paymentType === 'electricity'
                            ? 'Electricity Bill'
                            : 'Rent & Bill'}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800">
                          ₹{p.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-semibold">
                          {p.paymentMethod.replace('_', ' ')}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          <span className="font-medium text-slate-800 block">
                            {formattedDate}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formattedTime}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-[#E8F8F4] text-[#0C8067]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#0C8067]" />{' '}
                            Auto-Verified
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'archived' ? (
          <div className="space-y-4">
            <div className="p-4 bg-[#F0F8FA] border border-[#CBD8E0] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <FolderArchive className="w-5 h-5 text-[#035E7B] shrink-0" />
                <div>
                  <strong className="text-slate-800 font-bold block">
                    Archived Billing Cycles &amp; Historical Data
                  </strong>
                  <span className="text-slate-500">
                    Showing finalized monthly tenant statements. Toggle status between Pending and Paid to update all dashboards and payment logs.
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <div className="relative">
                  <select
                    value={selectedArchivedCycle}
                    onChange={(e) => setSelectedArchivedCycle(e.target.value)}
                    className="h-8 pl-2.5 pr-7 bg-white border border-slate-200 text-[#035E7B] font-bold rounded-lg text-xs appearance-none focus:outline-none focus:border-[#035E7B]"
                  >
                    <option value="ALL">All Archived Cycles ({archives.length})</option>
                    {archives.map((a) => (
                      <option key={a.id} value={a.billing_month}>
                        {a.billing_month_formatted || a.billing_month.slice(0, 7)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {archives.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const target =
                        archives.find((a) => a.billing_month === selectedArchivedCycle) ||
                        archives[0];
                      if (target) handleDownloadArchiveCsv(target);
                    }}
                    className="px-3 py-1.5 bg-[#E8F8F4] text-[#0C8067] hover:bg-[#D3F3EB] rounded-lg font-bold text-xs inline-flex items-center gap-1 transition shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsArchiveModalOpen(true)}
                  className="px-3.5 py-1.5 bg-[#035E7B] text-white rounded-lg font-bold hover:bg-[#024B63] transition shadow-2xs active:scale-95"
                >
                  + Archive Another Month
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 rounded-l-xl">Tenant / Room</th>
                    <th className="py-3 px-4">Total Billed</th>
                    <th className="py-3 px-4 rounded-r-xl text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {archivedTenantRows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-slate-400 text-xs">
                        <FolderArchive className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-600">No archived records found.</p>
                        <p className="mt-1 max-w-md mx-auto text-slate-400">
                          When a billing month finishes (e.g. October), click &quot;Archive Month&quot; to permanently store it with 1-click Pending/Paid tracking.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsArchiveModalOpen(true)}
                          className="mt-3 px-4 py-2 bg-[#035E7B] text-white rounded-xl font-bold text-xs hover:bg-[#024B63] transition shadow-2xs"
                        >
                          Archive a Month Now
                        </button>
                      </td>
                    </tr>
                  ) : (
                    archivedTenantRows.map((row, idx) => {
                      const isPending = row.status !== 'PAID';
                      const isPaid = row.status === 'PAID';
                      const isUpdating = updatingRecordId === row.recordId;

                      return (
                        <tr key={`${row.archiveId}-${row.tenantName}-${idx}`} className="hover:bg-slate-50/60 transition">
                          {/* 1. Tenant / Room */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div>
                                <strong className="block font-semibold text-slate-800 text-xs">
                                  {row.tenantName}
                                </strong>
                                <span className="text-[10px] text-slate-400">
                                  {row.propertyName} · Room {row.roomNumber}
                                </span>
                              </div>
                              <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF4F7] text-[#035E7B]">
                                {row.archiveMonth}
                              </span>
                            </div>
                          </td>

                          {/* 2. Total Billed */}
                          <td className="py-3.5 px-4 text-slate-700">
                            <span className="font-bold text-slate-800 text-sm block">
                              ₹{row.totalBilled.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              Rent: ₹{row.rentAmount.toLocaleString('en-IN')} + Elec: ₹{row.elecAmount.toLocaleString('en-IN')}
                            </span>
                            {isPaid ? (
                              <span className="text-[10px] font-bold text-[#0C8067]">
                                Fully Paid (₹{row.totalPaid.toLocaleString('en-IN')})
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-[#A8680C]">
                                Due Balance: ₹{row.balance.toLocaleString('en-IN')}
                              </span>
                            )}
                          </td>

                          {/* 3. Status (2 Interactive Circle Buttons: Pending and Paid) */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center justify-center gap-2 p-1 bg-slate-50 rounded-full border border-slate-200">
                              {/* Pending Circle Button */}
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() =>
                                  handleToggleRecordStatus(
                                    row.recordId || row.tenantName,
                                    'PENDING',
                                    row.totalBilled,
                                    { archiveId: row.archiveId }
                                  )
                                }
                                title="Mark as Pending"
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-2xs ${
                                  isPending
                                    ? 'bg-amber-100 text-amber-900 border border-amber-400 ring-2 ring-amber-300/40'
                                    : 'bg-white text-slate-400 border border-slate-200 hover:border-amber-300 hover:text-amber-700 hover:bg-amber-50/50'
                                }`}
                              >
                                {isUpdating && isPending ? (
                                  <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-600" />
                                ) : (
                                  <span
                                    className={`w-2.5 h-2.5 rounded-full transition-transform ${
                                      isPending
                                        ? 'bg-amber-500 ring-2 ring-amber-300 scale-110'
                                        : 'bg-slate-300'
                                    }`}
                                  />
                                )}
                                <span>Pending</span>
                              </button>

                              {/* Paid Circle Button */}
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() =>
                                  handleToggleRecordStatus(
                                    row.recordId || row.tenantName,
                                    'PAID',
                                    row.totalBilled,
                                    { archiveId: row.archiveId }
                                  )
                                }
                                title="Mark as Paid"
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-2xs ${
                                  isPaid
                                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-500 ring-2 ring-emerald-300/40'
                                    : 'bg-white text-slate-400 border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50/50'
                                }`}
                              >
                                {isUpdating && isPaid ? (
                                  <RefreshCw className="w-2.5 h-2.5 animate-spin text-emerald-600" />
                                ) : (
                                  <span
                                    className={`w-2.5 h-2.5 rounded-full transition-transform ${
                                      isPaid
                                        ? 'bg-emerald-600 ring-2 ring-emerald-300 scale-110'
                                        : 'bg-slate-300'
                                    }`}
                                  />
                                )}
                                <span>Paid</span>
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
          </div>
        ) : (
          <div>
            {/* Sticky Bulk Action Banner for Rent Records */}
            {selectedRecordIds.size > 0 && (
              <div className="mb-3 p-3 bg-gradient-to-r from-[#EAF4F7] to-[#E0EFF3] border border-[#035E7B]/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs animate-in fade-in">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[#035E7B] text-xs">
                    {selectedRecordIds.size} tenant bills selected
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Total: <strong className="text-slate-800">₹{totalSelectedRentDue.toLocaleString('en-IN')}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isBulkSendingRent}
                    onClick={() => handleBulkSendRent('BOTH')}
                    className="px-3.5 py-1.5 bg-[#035E7B] hover:bg-[#024B63] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition disabled:opacity-60"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isBulkSendingRent ? 'Sending...' : 'Send WhatsApp & Email'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isBulkSendingRent}
                    onClick={() => handleBulkSendRent('WHATSAPP')}
                    className="px-2.5 py-1.5 bg-[#0C8067] hover:bg-[#096652] text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition disabled:opacity-60"
                    title="Send via WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRecordIds(new Set())}
                    className="text-xs text-[#CA4A4A] hover:underline font-semibold px-2"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3 rounded-l-lg w-9">
                      <input
                        type="checkbox"
                        checked={filteredRecords.length > 0 && selectedRecordIds.size === filteredRecords.length}
                        onChange={toggleSelectAllRecords}
                        className="w-3.5 h-3.5 rounded text-[#035E7B] accent-[#035E7B] cursor-pointer"
                        title="Select all bills"
                      />
                    </th>
                    <th className="py-2.5 px-3">Tenant / Room</th>
                    <th className="py-2.5 px-3">Month</th>
                    <th className="py-2.5 px-3">Rent + Misc</th>
                    <th className="py-2.5 px-3">Electricity</th>
                    <th className="py-2.5 px-3">Total Billed</th>
                    <th className="py-2.5 px-3">Received</th>
                    <th className="py-2.5 px-3">Balance</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 rounded-r-lg text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-slate-500 text-xs">
                        <div className="flex flex-col items-center justify-center gap-2.5">
                          <p className="text-slate-500">No monthly bills found for this filter.</p>
                          <button
                            type="button"
                            onClick={() => setIsCreateBillOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#035E7B] hover:bg-[#024B63] text-white rounded-xl text-xs font-bold transition shadow-2xs active:scale-95"
                          >
                            <FilePlus2 className="w-3.5 h-3.5" />
                            <span>Generate Full Bill (Rent + Elec + Misc)</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r) => {
                      const monthPrefix = (r.billingMonth || r.dueDate || '').slice(0, 7);
                      const matchingElec = electricityBills.find(
                        (b) =>
                          (b.roomNumber === r.roomNumber || b.roomId === r.propertyId) &&
                          (b.billingMonth || b.readingDate || '').slice(0, 7) === monthPrefix
                      );
                      const { elecAmt, elecPaid } = getRecordElectricitySplit(r, matchingElec);
                      const miscAmt = Number(r.miscAmount) || 0;
                      const totalCombined = (Number(r.rentDue) || 0) + elecAmt;
                      const totalReceived = (Number(r.received) || 0) + elecPaid;
                      const totalBalance = Math.max(0, totalCombined - totalReceived);
                      const isChecked = selectedRecordIds.has(r.id);

                      const today = new Date().toISOString().split('T')[0];
                      const isPastDue = r.dueDate && r.dueDate < today;
                      const effectiveStatus: RentRecord['status'] =
                        totalBalance <= 0 && totalCombined > 0
                          ? 'Paid'
                          : (r.status === 'Overdue' || isPastDue) && totalBalance > 0
                          ? 'Overdue'
                          : totalReceived > 0 && totalBalance > 0
                          ? 'Partial'
                          : 'Pending';

                      return (
                        <tr key={r.id} className={`hover:bg-slate-50/60 transition ${isChecked ? 'bg-[#F4F9FA]' : ''}`}>
                          <td className="py-3 px-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleRecordSelection(r.id)}
                              className="w-3.5 h-3.5 rounded text-[#035E7B] accent-[#035E7B] cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-3">
                            {(() => {
                              const liveTenant =
                                (r.tenantId ? tenants.find((t) => String(t.id) === String(r.tenantId)) : undefined) ||
                                (r.agreementId ? tenants.find((t) => t.agreementId === r.agreementId) : undefined) ||
                                (r.roomNumber ? tenants.find((t) => t.roomNumber === r.roomNumber && t.status === 'Active') : undefined) ||
                                tenants.find((t) => t.name.trim().toLowerCase() === r.tenantName.trim().toLowerCase() && t.status === 'Active') ||
                                tenants.find((t) => t.name.trim().toLowerCase() === r.tenantName.trim().toLowerCase());
                              const displayTenantName = liveTenant?.name || r.tenantName;
                              const displayRoom = liveTenant?.roomNumber || r.roomNumber;
                              const displayProp = liveTenant?.propertyName || r.propertyName;

                              return (
                                <>
                                  <strong
                                    onClick={() => {
                                      if (liveTenant && onSelectTenant) {
                                        onSelectTenant(liveTenant);
                                      }
                                      onNavigate('tenant_profile');
                                    }}
                                    className="block font-semibold text-slate-800 hover:text-[#035E7B] cursor-pointer"
                                  >
                                    {displayTenantName}
                                  </strong>
                                  <span className="text-[10px] text-slate-400">
                                    {displayProp} · Room {displayRoom}
                                  </span>
                                </>
                              );
                            })()}
                          </td>

                        <td className="py-3 px-3 text-slate-600 font-medium">
                          {(r.billingMonth || r.dueDate || '').slice(0, 7)}
                        </td>

                        <td className="py-3 px-3 text-slate-700">
                          <span className="font-semibold text-slate-800 block">
                            ₹{r.rentDue.toLocaleString('en-IN')}
                          </span>
                          {miscAmt > 0 && (
                            <span className="text-[10px] text-[#035E7B] block">
                              Incl. ₹{miscAmt} ({r.miscDescription || 'Misc'})
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-slate-700">
                          {elecAmt > 0 ? (
                            <span className="font-semibold text-slate-800">
                              ₹{elecAmt.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="text-slate-400">₹0</span>
                          )}
                        </td>

                        <td className="py-3 px-3 font-bold text-[#035E7B]">
                          ₹{totalCombined.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-3 text-[#0C8067] font-semibold">
                          ₹{totalReceived.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-3 font-bold text-slate-800">
                          ₹{totalBalance.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-3">
                          <div className="inline-flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-200 rounded-full">
                            {/* Pending Circle Button */}
                            <button
                              type="button"
                              disabled={updatingRecordId === r.id}
                              onClick={() => handleToggleRecordStatus(r.id, 'PENDING', totalCombined)}
                              title="Mark as Pending"
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition shadow-2xs ${
                                effectiveStatus !== 'Paid'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-400 ring-1 ring-amber-300/40'
                                  : 'bg-white text-slate-400 border border-slate-200 hover:border-amber-300 hover:text-amber-700'
                              }`}
                            >
                              {updatingRecordId === r.id && effectiveStatus !== 'Paid' ? (
                                <RefreshCw className="w-2 h-2 animate-spin text-amber-600" />
                              ) : (
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    effectiveStatus !== 'Paid' ? 'bg-amber-500 ring-1 ring-amber-300' : 'bg-slate-300'
                                  }`}
                                />
                              )}
                              <span>Pending</span>
                            </button>

                            {/* Paid Circle Button */}
                            <button
                              type="button"
                              disabled={updatingRecordId === r.id}
                              onClick={() => handleToggleRecordStatus(r.id, 'PAID', totalCombined)}
                              title="Mark as Paid"
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition shadow-2xs ${
                                effectiveStatus === 'Paid'
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-500 ring-1 ring-emerald-300/40'
                                  : 'bg-white text-slate-400 border border-slate-200 hover:border-emerald-300 hover:text-emerald-700'
                              }`}
                            >
                              {updatingRecordId === r.id && effectiveStatus === 'Paid' ? (
                                <RefreshCw className="w-2 h-2 animate-spin text-emerald-600" />
                              ) : (
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    effectiveStatus === 'Paid' ? 'bg-emerald-600 ring-1 ring-emerald-300' : 'bg-slate-300'
                                  }`}
                                />
                              )}
                              <span>Paid</span>
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center justify-end gap-2.5">
                            {effectiveStatus !== 'Paid' && (
                              <button
                                type="button"
                                onClick={() => onOpenRecordPayment(r.tenantId)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#E8F8F4] text-[#0C8067] hover:bg-[#D3F3EB] rounded-lg text-xs font-bold transition shadow-2xs"
                                title="Confirm / Record Payment"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Record Payment</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (onSelectInvoice) onSelectInvoice(r.tenantName);
                                onNavigate('invoice_list');
                              }}
                              className="inline-flex items-center gap-1 text-[#035E7B] font-bold hover:underline"
                            >
                              <span>Send Bill / QR</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
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
        </div>
      )}

        {/* Table Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100 gap-2">
          <span>
            {activeTab === 'history'
              ? `Showing ${filteredPayments.length} of ${payments.length} auto-tracked payment transactions`
              : activeTab === 'archived'
              ? `Showing ${archives.length} archived monthly billing cycles`
              : `Showing ${filteredRecords.length} of ${stats.totalCount} monthly records`}
          </span>
        </div>
      </section>

      {/* ================= FULL COMBINED BILL GENERATOR MODAL (RENT + ELECTRICITY + MISC + QR) ================= */}
      {isCreateBillOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => !isCreatingBill && setIsCreateBillOpen(false)}
          />
          <div className="relative w-full max-w-full sm:max-w-2xl lg:max-w-3xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden my-auto flex flex-col max-h-[92vh] sm:max-h-[88vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 bg-[#F8FBFD] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#035E7B]/10 text-[#035E7B] flex items-center justify-center shrink-0">
                  <FilePlus2 className="w-5 h-5 text-[#035E7B]" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-800 leading-tight">
                    Generate Complete Monthly Bill
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                    Room Rent + Electricity + Extra Charges &amp; UPI QR Invoice
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isCreatingBill && setIsCreateBillOpen(false)}
                className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition active:scale-95 shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => void handleCreateCombinedBill(e, false)}
              className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 text-xs overscroll-contain"
            >
              {/* Inline Modal Error Banner */}
              {modalError && (
                <div className="p-3 sm:p-3.5 bg-rose-50 border border-rose-200 rounded-xl sm:rounded-2xl flex items-start justify-between gap-2.5 text-xs text-rose-700 font-medium">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{modalError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalError('')}
                    className="text-rose-500 hover:text-rose-700 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* 1. Tenant & Billing Cycle Card */}
              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/90 bg-slate-50/70 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#035E7B] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> BILLING PERIOD &amp; TENANT SELECTION
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Select Active Tenant *
                    </label>
                    <select
                      value={selectedTenantForBill}
                      onChange={(e) => setSelectedTenantForBill(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#035E7B] shadow-2xs"
                      required
                    >
                      {activeTenants.length === 0 ? (
                        <option value="">No active tenants available</option>
                      ) : (
                        activeTenants.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} (Room {t.roomNumber})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Billing Month *
                    </label>
                    <input
                      type="month"
                      required
                      value={billingMonthInput.slice(0, 7)}
                      onChange={(e) => {
                        if (e.target.value) {
                          setBillingMonthInput(`${e.target.value}-01`);
                        }
                      }}
                      className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#035E7B] shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Bill Due Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={dueDateInput}
                      onChange={(e) => setDueDateInput(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#035E7B] shadow-2xs"
                    />
                  </div>
                </div>

                {/* Selected Tenant Quick Info */}
                {selectedTenantObj && (
                  <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-600 font-medium border-t border-slate-200/60 mt-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold shadow-2xs">
                      🏠 Room {selectedTenantObj.roomNumber || '—'}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold shadow-2xs">
                      🏢 {selectedTenantObj.propertyName || 'Property'}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold shadow-2xs">
                      📞 {selectedTenantObj.phone || 'No phone'}
                    </span>
                    <span className="text-[11px] text-slate-500 ml-auto">
                      Base Rent: <strong className="text-slate-800">₹{(selectedTenantObj.monthlyRent || 0).toLocaleString('en-IN')}</strong>/mo
                    </span>
                  </div>
                )}
              </div>

              {/* 2. Room Rent & Misc Charges Card */}
              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#035E7B] flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5" /> 1. ROOM RENT &amp; MISC / EXTRA CHARGES
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Monthly Room Rent (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm pointer-events-none">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={rentAmountInput}
                        onChange={(e) => setRentAmountInput(e.target.value)}
                        placeholder="0"
                        className="w-full h-10 pl-7 pr-3 border border-slate-200 rounded-xl bg-white font-bold text-slate-800 text-sm focus:outline-none focus:border-[#035E7B]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Misc / Extra Charges (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm pointer-events-none">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={miscAmountInput}
                        onChange={(e) => setMiscAmountInput(e.target.value)}
                        placeholder="0"
                        className="w-full h-10 pl-7 pr-3 border border-slate-200 rounded-xl bg-white font-semibold text-slate-800 text-sm focus:outline-none focus:border-[#035E7B]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Misc Reason
                    </label>
                    <input
                      type="text"
                      value={miscDescInput}
                      onChange={(e) => setMiscDescInput(e.target.value)}
                      placeholder="e.g. Water & Cleaning, Late Fee"
                      className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
                    />
                  </div>
                </div>

                {/* Quick Preset Buttons for Misc Charges */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                    Quick Add:
                  </span>
                  {[
                    { label: '+₹200 Water', amount: 200, desc: 'Water Charges' },
                    { label: '+₹300 Cleaning', amount: 300, desc: 'Cleaning Charges' },
                    { label: '+₹500 Maint', amount: 500, desc: 'Maintenance Charges' },
                    { label: '+₹250 Late Fee', amount: 250, desc: 'Late Payment Fine' },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => {
                        setMiscAmountInput(String(chip.amount));
                        setMiscDescInput(chip.desc);
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition active:scale-95"
                    >
                      {chip.label}
                    </button>
                  ))}
                  {Number(miscAmountInput) > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setMiscAmountInput('0');
                        setMiscDescInput('');
                      }}
                      className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-[11px] font-semibold transition"
                    >
                      Clear (₹0)
                    </button>
                  )}
                </div>
              </div>

              {/* 3. Electricity Charges (Sub-Meter) Card */}
              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#035E7B] flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" /> 2. ELECTRICITY METER READING &amp; BILL
                  </span>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                    <input
                      type="checkbox"
                      checked={includeElectricity}
                      onChange={(e) => setIncludeElectricity(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#035E7B] focus:ring-[#035E7B]"
                    />
                    <span>Include Electricity Bill</span>
                  </label>
                </div>

                {includeElectricity && (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Meter ID / Sub-Meter
                        </label>
                        <input
                          type="text"
                          value={meterNumberInput}
                          onChange={(e) => setMeterNumberInput(e.target.value)}
                          placeholder="e.g. MTR-101"
                          className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white font-mono text-xs focus:outline-none focus:border-[#035E7B]"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Previous Reading (kWh)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={prevReadingInput}
                          onChange={(e) => setPrevReadingInput(e.target.value)}
                          className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#035E7B]"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Current Reading (kWh) *
                        </label>
                        <input
                          type="number"
                          min={prevReadingInput}
                          step="0.01"
                          value={currReadingInput}
                          onChange={(e) => setCurrReadingInput(e.target.value)}
                          className={`w-full h-10 px-3 border rounded-xl bg-white text-xs font-bold text-slate-900 focus:outline-none ${
                            Number(currReadingInput) < Number(prevReadingInput)
                              ? 'border-rose-400 bg-rose-50/40 text-rose-700 focus:border-rose-500'
                              : 'border-slate-200 focus:border-[#035E7B]'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Rate (₹ / Unit)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={elecRateInput}
                          onChange={(e) => setElecRateInput(e.target.value)}
                          className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#035E7B]"
                        />
                      </div>
                    </div>

                    {/* Live Electricity Calculation Feedback Bar */}
                    {Number(currReadingInput) < Number(prevReadingInput) ? (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold rounded-xl flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>
                          Current reading ({currReadingInput || 0}) previous reading ({prevReadingInput || 0}) se kam nahi ho sakti.
                        </span>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 text-amber-900 text-[11px] font-medium rounded-xl flex flex-wrap items-center justify-between gap-2">
                        <span>
                          Units Consumed: <strong>{liveModalCalc.units.toFixed(2)} kWh</strong>
                        </span>
                        <span>
                          Rate: <strong>₹{liveModalCalc.rate}/kWh</strong>
                        </span>
                        <span className="text-slate-900">
                          Electricity Total: <strong>₹{liveModalCalc.elecTotal.toLocaleString('en-IN')}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 4. Owner Payment QR Attachment Card */}
              <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-[#035E7B]/20 bg-[#EAF4F7]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#035E7B]/10 text-[#035E7B] flex items-center justify-center shrink-0">
                    <QrCode className="w-4 h-4 text-[#035E7B]" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">
                      Attach Owner Payment QR Code:
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Will be printed on the tenant invoice with direct UPI scan
                    </span>
                  </div>
                </div>
                <select
                  value={selectedQrId}
                  onChange={(e) => setSelectedQrId(e.target.value)}
                  className="w-full sm:w-auto max-w-full h-10 px-3 rounded-xl border border-slate-200 bg-white font-semibold text-[#035E7B] text-xs focus:outline-none focus:border-[#035E7B] shadow-2xs"
                >
                  {qrConfigs.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.label} — {q.payeeName} ({q.upiId})
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Live Bill Preview & Grand Total Card */}
              <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#035E7B] to-[#024B63] text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-200 block">
                    COMPLETE MONTHLY BILL SUMMARY
                  </span>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/90">
                    <span className="px-2 py-0.5 rounded-md bg-white/10 font-medium">
                      Rent: ₹{liveModalCalc.baseRent.toLocaleString('en-IN')}
                    </span>
                    {includeElectricity && (
                      <span className="px-2 py-0.5 rounded-md bg-white/10 font-medium">
                        Elec ({liveModalCalc.units} kWh): ₹{liveModalCalc.elecTotal.toLocaleString('en-IN')}
                      </span>
                    )}
                    {liveModalCalc.misc > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-white/10 font-medium">
                        Misc: ₹{liveModalCalc.misc.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-left sm:text-right border-t sm:border-t-0 border-white/20 pt-2 sm:pt-0">
                  <div className="text-xs text-teal-200 font-semibold uppercase">Total Amount</div>
                  <div className="text-2xl sm:text-3xl font-black tracking-tight">
                    ₹{liveModalCalc.grandTotal.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* 6. Footer Action Buttons */}
              <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isCreatingBill}
                  onClick={() => setIsCreateBillOpen(false)}
                  className="w-full sm:w-auto px-4 h-11 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-95 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingBill || activeTenants.length === 0}
                  className="w-full sm:w-auto px-5 h-11 border border-[#035E7B] text-[#035E7B] bg-white hover:bg-slate-50 disabled:opacity-50 rounded-xl font-bold transition active:scale-95 inline-flex items-center justify-center gap-2 shadow-2xs"
                >
                  {isCreatingBill ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#035E7B]" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#035E7B]" />
                      <span>Save Bill</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isCreatingBill || activeTenants.length === 0}
                  onClick={(e) =>
                    void handleCreateCombinedBill(
                      e as unknown as React.FormEvent,
                      true
                    )
                  }
                  className="w-full sm:w-auto px-5 h-11 bg-[#035E7B] hover:bg-[#024B63] disabled:opacity-50 text-white rounded-xl font-bold transition shadow-sm active:scale-95 inline-flex items-center justify-center gap-2"
                >
                  {isCreatingBill ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Save &amp; Open QR Invoice</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= ARCHIVE MONTH MODAL ================= */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => !isArchiving && setIsArchiveModalOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#F8FBFD]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EAF4F7] text-[#035E7B] flex items-center justify-center">
                  <FolderArchive className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Archive Billing Month (रेंट आर्काइव)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Save month snapshot &amp; auto-rollover electricity readings
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleArchiveMonth} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Month to Archive *
                </label>
                <input
                  type="month"
                  required
                  value={archiveMonthInput}
                  onChange={(e) => setArchiveMonthInput(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white font-bold text-slate-800 focus:outline-none focus:border-[#035E7B]"
                />
              </div>

              {/* Explanatory callouts */}
              <div className="p-3.5 rounded-xl bg-[#E8F8F4] border border-[#A2D9CE] text-[#0C8067] space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <Zap className="w-4 h-4 text-[#0C8067]" />
                  <span>Automatic Electricity Meter Reading Rollover</span>
                </div>
                <p className="text-[11px] leading-relaxed text-[#096652]">
                  This month&apos;s current meter reading will automatically become the
                  next month&apos;s previous reading. When next month starts, consumption
                  and bill calculations automatically proceed from this reading.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <ShieldCheck className="w-4 h-4 text-[#035E7B]" />
                  <span>Permanent Historical Snapshot</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  All active bills, tenant records, payments, and balances for this month
                  are safely frozen into an archive that you can view and download as a CSV
                  at any time.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Archive Notes / Description (Optional)
                </label>
                <input
                  type="text"
                  value={archiveNotesInput}
                  onChange={(e) => setArchiveNotesInput(e.target.value)}
                  placeholder="e.g. October 2026 cycle completed and reconciled"
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#035E7B]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsArchiveModalOpen(false)}
                  className="px-4 h-10 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isArchiving || !archiveMonthInput}
                  className="px-5 h-10 bg-[#035E7B] hover:bg-[#024B63] disabled:opacity-50 text-white rounded-xl font-bold transition shadow-sm inline-flex items-center gap-1.5"
                >
                  {isArchiving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Archiving &amp; Rolling Over...</span>
                    </>
                  ) : (
                    <>
                      <FolderArchive className="w-3.5 h-3.5" />
                      <span>Confirm Archive &amp; Rollover</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= ARCHIVE SNAPSHOT DETAILS MODAL ================= */}
      {selectedArchiveDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedArchiveDetail(null)}
          />
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#F8FBFD]">
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Archived Statement —{' '}
                  {selectedArchiveDetail.billing_month_formatted ||
                    selectedArchiveDetail.billing_month.slice(0, 7)}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Archived on{' '}
                  {new Date(selectedArchiveDetail.archived_at).toLocaleString('en-IN')}{' '}
                  · {selectedArchiveDetail.property_name || 'All Properties'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadArchiveCsv(selectedArchiveDetail)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#E8F8F4] hover:bg-[#D4F2EB] text-[#0C8067] rounded-xl text-xs font-bold transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedArchiveDetail(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Top Stat Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 border-b border-slate-100 bg-slate-50/50 text-xs">
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">
                  Active Tenants
                </span>
                <strong className="text-base font-bold text-slate-800">
                  {selectedArchiveDetail.total_tenants}
                </strong>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">
                  Total Billed
                </span>
                <strong className="text-base font-bold text-slate-800">
                  ₹{Number(selectedArchiveDetail.total_billed).toLocaleString('en-IN')}
                </strong>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">
                  Collected
                </span>
                <strong className="text-base font-bold text-[#0C8067]">
                  ₹{Number(selectedArchiveDetail.total_paid).toLocaleString('en-IN')}
                </strong>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">
                  Outstanding
                </span>
                <strong className="text-base font-bold text-[#D94848]">
                  ₹{Number(selectedArchiveDetail.total_balance).toLocaleString('en-IN')}
                </strong>
              </div>
            </div>

            {/* Snapshot Tenant Table */}
            <div className="p-6 overflow-y-auto">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3 rounded-l-lg">Tenant / Room</th>
                      <th className="py-2.5 px-3">Room Rent</th>
                      <th className="py-2.5 px-3">Meter &amp; Readings</th>
                      <th className="py-2.5 px-3">Units &amp; Elec Amt</th>
                      <th className="py-2.5 px-3">Total Billed</th>
                      <th className="py-2.5 px-3">Paid</th>
                      <th className="py-2.5 px-3 rounded-r-lg">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedArchiveDetail.snapshot_data || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-3">
                          <strong className="font-semibold text-slate-800 block">
                            {item.tenant_name}
                          </strong>
                          <span className="text-[10px] text-slate-400">
                            {item.property_name} · Room {item.room_number}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-800 block">
                            ₹{Number(item.rent_amount || 0).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Status: {item.rent_status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-[11px] text-[#035E7B] block">
                            {item.meter_number || 'MTR'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Prev: {item.previous_reading} → Curr: {item.current_reading}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-800 block">
                            ₹{Number(item.electricity_amount || 0).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {item.units_consumed || 0} kWh @ ₹{item.rate_per_unit || 8}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-[#035E7B]">
                          ₹{Number(item.total_billed || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#0C8067]">
                          ₹{Number(item.total_paid || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800">
                          ₹{Number(item.balance || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-100 bg-[#F8FBFD] flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">
                Showing {selectedArchiveDetail.snapshot_data?.length || 0} archived tenant records
              </span>
              <button
                type="button"
                onClick={() => setSelectedArchiveDetail(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-emerald-300 rounded-2xl p-4 shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
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