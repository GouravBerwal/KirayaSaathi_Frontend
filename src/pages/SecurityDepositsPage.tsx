import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  PageType,
  Property,
  Tenant,
  HandoverItem,
} from '../types';
import {
  ShieldCheck,
  Search,
  ChevronDown,
  RefreshCw,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Phone,
  MessageCircle,
  ArrowRight,
  Download,
  IndianRupee,
  Key,
  Package,
  X,
  Sparkles,
  Undo2,
  Trash2,
  Building2,
  ArrowUpRight,
} from 'lucide-react';
import { apiRequest } from '../utils/api';

export interface SecurityDepositItem {
  id: string | number;
  agreementId: number;
  tenantId: string | number;
  name: string;
  tenantName: string;
  phone: string;
  propertyName: string;
  propertyId: string | number;
  roomNumber: string;
  roomId: string | number;
  roomType?: string;
  moveInDate: string;
  agreementEndDate?: string | null;
  securityDeposit: number;
  securityDepositStatus: 'PENDING' | 'PAID' | 'REFUNDED' | 'SETTLED';
  depositPaidDate: string | null;
  depositRefundDate: string | null;
  depositPaymentMethod: string;
  depositTransactionRef: string;
  refundAmount: number;
  deductionAmount: number;
  deductionReason: string;
  handoverItems: HandoverItem[];
  handoverNotes: string;
  status: string;
}

interface SecurityDepositsPageProps {
  tenants: Tenant[];
  properties: Property[];
  onNavigate: (page: PageType) => void;
  onSelectTenant?: (tenant: Tenant) => void;
  onRefreshData?: () => Promise<void> | void;
}

const DEFAULT_INVENTORY_PRESETS: string[] = [
  'Room Door Key (x2)',
  'Almirah / Wardrobe Key (x1)',
  'Plastic Bucket & Mug',
  'Ceiling Fan & Regulator',
  'Study Table & Chair',
  'AC / Geyser Remote',
  'Mattress & Bed Frame',
  'Room LED Bulbs & Fixtures',
];

const formatINR = (val: number | string | undefined | null): string => {
  const num = Number(val) || 0;
  return `₹${num.toLocaleString('en-IN')}`;
};

export const SecurityDepositsPage: React.FC<SecurityDepositsPageProps> = ({
  tenants,
  properties,
  onNavigate,
  onSelectTenant,
  onRefreshData,
}) => {
  const [propertyFilter, setPropertyFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'PENDING' | 'PAID' | 'REFUNDED' | 'SETTLED'
  >('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingApi, setIsLoadingApi] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [updatingAgreementId, setUpdatingAgreementId] = useState<number | null>(null);

  // Live Backend Security Deposits State
  const [backendDeposits, setBackendDeposits] = useState<SecurityDepositItem[]>([]);

  // Modals state
  const [inventoryModalItem, setInventoryModalItem] = useState<SecurityDepositItem | null>(null);
  const [handoverItemsDraft, setHandoverItemsDraft] = useState<HandoverItem[]>([]);
  const [handoverNotesDraft, setHandoverNotesDraft] = useState('');
  const [customItemInput, setCustomItemInput] = useState('');
  const [isSavingInventory, setIsSavingInventory] = useState(false);

  // Exit Refund Modal state
  const [refundModalItem, setRefundModalItem] = useState<SecurityDepositItem | null>(null);
  const [refundDeductionInput, setRefundDeductionInput] = useState('0');
  const [refundReasonInput, setRefundReasonInput] = useState('');
  const [refundMethodInput, setRefundMethodInput] = useState('UPI');
  const [refundDateInput, setRefundDateInput] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  // Receive Deposit Modal state
  const [receiveModalItem, setReceiveModalItem] = useState<SecurityDepositItem | null>(null);
  const [depositAmountInput, setDepositAmountInput] = useState('0');
  const [depositDateInput, setDepositDateInput] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [depositMethodInput, setDepositMethodInput] = useState('UPI');
  const [depositRefInput, setDepositRefInput] = useState('');
  const [isReceivingDeposit, setIsReceivingDeposit] = useState(false);

  // Direct backend API fetch from /api/tenants/security-deposits/
  const fetchLiveDeposits = useCallback(async () => {
    try {
      setIsLoadingApi(true);
      const res = await apiRequest<any[]>('/api/tenants/security-deposits/');
      if (Array.isArray(res)) {
        const mapped: SecurityDepositItem[] = res.map((r) => {
          const rawStatus = (r.security_deposit_status || 'PENDING').toUpperCase();
          const validStatus = (
            rawStatus === 'PAID' || rawStatus === 'REFUNDED' || rawStatus === 'SETTLED'
              ? rawStatus
              : 'PENDING'
          ) as 'PENDING' | 'PAID' | 'REFUNDED' | 'SETTLED';

          return {
            id: r.id,
            agreementId: Number(r.id),
            tenantId: r.tenant,
            name: r.tenant_name || 'Tenant',
            tenantName: r.tenant_name || 'Tenant',
            phone: r.tenant_phone || '',
            propertyId: r.property_id || '',
            propertyName: r.property_name || 'Property',
            roomId: r.room || '',
            roomNumber: r.room_number || '',
            roomType: r.room_type || '',
            moveInDate: r.start_date || '',
            agreementEndDate: r.end_date || null,
            securityDeposit: Number(r.security_deposit) || 0,
            securityDepositStatus: validStatus,
            depositPaidDate: r.deposit_paid_date || null,
            depositRefundDate: r.deposit_refund_date || null,
            depositPaymentMethod: r.deposit_payment_method || 'UPI',
            depositTransactionRef: r.deposit_transaction_ref || '',
            refundAmount: Number(r.refund_amount) || 0,
            deductionAmount: Number(r.deduction_amount) || 0,
            deductionReason: r.deduction_reason || '',
            handoverItems: Array.isArray(r.handover_items) ? r.handover_items : [],
            handoverNotes: r.handover_notes || '',
            status: r.status === 'ACTIVE' ? 'Active' : 'Past',
          };
        });
        setBackendDeposits(mapped);
      }
    } catch (err) {
      console.warn('Direct security deposits API fetch warning:', err);
    } finally {
      setIsLoadingApi(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveDeposits();
  }, [fetchLiveDeposits]);

  // Merge live backend data with fallback from tenants prop so no record is ever omitted
  const depositTenants = useMemo<SecurityDepositItem[]>(() => {
    if (backendDeposits.length > 0) {
      return backendDeposits;
    }

    return (tenants || [])
      .filter((t) => t.agreementId || Number(t.securityDeposit) > 0)
      .map((t) => {
        const rawStatus = (t.securityDepositStatus || 'PENDING').toUpperCase();
        const validStatus = (
          rawStatus === 'PAID' || rawStatus === 'REFUNDED' || rawStatus === 'SETTLED'
            ? rawStatus
            : 'PENDING'
        ) as 'PENDING' | 'PAID' | 'REFUNDED' | 'SETTLED';

        return {
          id: t.agreementId || t.id,
          agreementId: Number(t.agreementId) || Number(t.id),
          tenantId: t.id,
          name: t.name || 'Tenant',
          tenantName: t.name || 'Tenant',
          phone: t.phone || '',
          propertyId: t.propertyId || '',
          propertyName: t.propertyName || 'Property',
          roomId: t.roomId || '',
          roomNumber: t.roomNumber || '',
          roomType: '',
          moveInDate: t.moveInDate || '',
          agreementEndDate: t.agreementEndDate || null,
          securityDeposit: Number(t.securityDeposit) || 0,
          securityDepositStatus: validStatus,
          depositPaidDate: t.depositPaidDate || null,
          depositRefundDate: t.depositRefundDate || null,
          depositPaymentMethod: t.depositPaymentMethod || 'UPI',
          depositTransactionRef: t.depositTransactionRef || '',
          refundAmount: Number(t.refundAmount) || 0,
          deductionAmount: Number(t.deductionAmount) || 0,
          deductionReason: t.deductionReason || '',
          handoverItems: Array.isArray(t.handoverItems) ? t.handoverItems : [],
          handoverNotes: t.handoverNotes || '',
          status: t.status || 'Active',
        };
      });
  }, [backendDeposits, tenants]);

  // Filtered Roster
  const filteredTenants = useMemo(() => {
    return depositTenants.filter((t) => {
      if (propertyFilter !== 'ALL' && t.propertyName !== propertyFilter) {
        return false;
      }

      const st = (t.securityDepositStatus || 'PENDING').toUpperCase();
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'REFUNDED' || statusFilter === 'SETTLED') {
          if (st !== 'REFUNDED' && st !== 'SETTLED') return false;
        } else if (st !== statusFilter) {
          return false;
        }
      }

      if (searchTerm) {
        const q = searchTerm.toLowerCase().trim();
        const nameMatch = (t.name || '').toLowerCase().includes(q);
        const roomMatch = (t.roomNumber || '').toLowerCase().includes(q);
        const propMatch = (t.propertyName || '').toLowerCase().includes(q);
        const phoneMatch = (t.phone || '').toLowerCase().includes(q);
        return nameMatch || roomMatch || propMatch || phoneMatch;
      }
      return true;
    });
  }, [depositTenants, propertyFilter, statusFilter, searchTerm]);

  // Overall Statistics for 4 KPI Cards
  const stats = useMemo(() => {
    let totalCommitted = 0;
    let totalHeld = 0;
    let totalPending = 0;
    let totalRefunded = 0;
    let totalDeducted = 0;

    let heldCount = 0;
    let pendingCount = 0;
    let refundedCount = 0;

    depositTenants.forEach((t) => {
      if (propertyFilter !== 'ALL' && t.propertyName !== propertyFilter) {
        return;
      }

      const amt = Number(t.securityDeposit) || 0;
      const st = (t.securityDepositStatus || 'PENDING').toUpperCase();

      totalCommitted += amt;

      if (st === 'PAID') {
        totalHeld += amt;
        heldCount += 1;
      } else if (st === 'REFUNDED' || st === 'SETTLED') {
        const refAmt = Number(t.refundAmount) || 0;
        const dedAmt = Number(t.deductionAmount) || 0;
        totalRefunded += refAmt;
        totalDeducted += dedAmt;
        refundedCount += 1;
      } else {
        totalPending += amt;
        pendingCount += 1;
      }
    });

    const collectionRate =
      totalCommitted > 0
        ? Number(((totalHeld / totalCommitted) * 100).toFixed(1))
        : 0;

    return {
      totalCommitted,
      totalHeld,
      totalPending,
      totalRefunded,
      totalDeducted,
      heldCount,
      pendingCount,
      refundedCount,
      collectionRate,
      totalCount: depositTenants.length,
    };
  }, [depositTenants, propertyFilter]);

  // Unified Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setErrorMessage('');
    try {
      await fetchLiveDeposits();
      if (onRefreshData) {
        await onRefreshData();
      }
      setToastMessage('Security deposits synced with backend successfully!');
      setTimeout(() => setToastMessage(''), 2500);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Data refresh karne mein error aaya.'
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  // 1-Click Quick Toggle between Pending and Paid
  const handleQuickToggleStatus = async (
    item: SecurityDepositItem,
    targetStatus: 'PENDING' | 'PAID'
  ) => {
    if (!item.agreementId) return;
    setUpdatingAgreementId(item.agreementId);
    setErrorMessage('');
    const isPaid = targetStatus === 'PAID';

    // Optimistic UI update
    setBackendDeposits((prev) =>
      prev.map((r) =>
        r.agreementId === item.agreementId
          ? {
              ...r,
              securityDepositStatus: targetStatus,
              depositPaidDate: isPaid ? new Date().toISOString().split('T')[0] : null,
              depositPaymentMethod: isPaid ? 'UPI' : '',
              depositTransactionRef: isPaid
                ? `DEP-${item.tenantId}-${Date.now().toString().slice(-6)}`
                : '',
            }
          : r
      )
    );

    try {
      await apiRequest(`/api/tenants/security-deposits/${item.agreementId}/`, {
        method: 'PATCH',
        body: {
          security_deposit_status: targetStatus,
          deposit_paid_date: isPaid ? new Date().toISOString().split('T')[0] : null,
          deposit_payment_method: isPaid ? 'UPI' : '',
          deposit_transaction_ref: isPaid
            ? `DEP-${item.tenantId}-${Date.now().toString().slice(-6)}`
            : '',
        },
      });

      if (onRefreshData) {
        try {
          await onRefreshData();
        } catch {
          // non-critical
        }
      }

      setToastMessage(
        isPaid
          ? `Security deposit of ${formatINR(item.securityDeposit)} marked as RECEIVED for ${item.name}!`
          : `Security deposit status set to PENDING for ${item.name}.`
      );
      setTimeout(() => setToastMessage(''), 3500);
    } catch (err) {
      // Revert on error
      await fetchLiveDeposits();
      setErrorMessage(
        err instanceof Error ? err.message : 'Deposit status update karne mein error aaya.'
      );
    } finally {
      setUpdatingAgreementId(null);
    }
  };

  // Open Handover Inventory Modal
  const openInventoryModal = (item: SecurityDepositItem) => {
    setInventoryModalItem(item);
    setHandoverNotesDraft(item.handoverNotes || '');

    const existing = item.handoverItems || [];
    if (existing.length > 0) {
      setHandoverItemsDraft(existing);
    } else {
      const initial: HandoverItem[] = DEFAULT_INVENTORY_PRESETS.map((name) => ({
        item: name,
        quantity: 1,
        status: 'Handed Over',
        conditionNotes: 'Good condition at move-in',
      }));
      setHandoverItemsDraft(initial);
    }
  };

  // Save Handover Inventory
  const handleSaveInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inventoryModalItem || !inventoryModalItem.agreementId) return;

    setIsSavingInventory(true);
    setErrorMessage('');
    try {
      await apiRequest(
        `/api/tenants/security-deposits/${inventoryModalItem.agreementId}/`,
        {
          method: 'PATCH',
          body: {
            handover_items: handoverItemsDraft,
            handover_notes: handoverNotesDraft,
          },
        }
      );

      // Local update
      setBackendDeposits((prev) =>
        prev.map((r) =>
          r.agreementId === inventoryModalItem.agreementId
            ? {
                ...r,
                handoverItems: handoverItemsDraft,
                handoverNotes: handoverNotesDraft,
              }
            : r
        )
      );

      if (onRefreshData) {
        try {
          await onRefreshData();
        } catch {
          // ignore
        }
      }

      setToastMessage(
        `Move-in handover items updated for ${inventoryModalItem.name}!`
      );
      setTimeout(() => setToastMessage(''), 3500);
      setInventoryModalItem(null);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Handover inventory save karne mein error aaya.'
      );
    } finally {
      setIsSavingInventory(false);
    }
  };

  const handleAddCustomInventoryItem = () => {
    if (!customItemInput.trim()) return;
    setHandoverItemsDraft((prev) => [
      ...prev,
      {
        item: customItemInput.trim(),
        quantity: 1,
        status: 'Handed Over',
        conditionNotes: 'Added by owner',
      },
    ]);
    setCustomItemInput('');
  };

  const handleRemoveInventoryItem = (index: number) => {
    setHandoverItemsDraft((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleItemStatus = (index: number) => {
    setHandoverItemsDraft((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const nextStatus =
          item.status === 'Handed Over'
            ? 'Returned'
            : item.status === 'Returned'
            ? 'Missing'
            : item.status === 'Missing'
            ? 'Damaged'
            : 'Handed Over';
        return { ...item, status: nextStatus };
      })
    );
  };

  // Open Receive Deposit Modal
  const openReceiveModal = (item: SecurityDepositItem) => {
    setReceiveModalItem(item);
    setDepositAmountInput(String(item.securityDeposit || 0));
    setDepositDateInput(new Date().toISOString().split('T')[0]);
    setDepositMethodInput('UPI');
    setDepositRefInput(`UPI-DEP-${Date.now().toString().slice(-6)}`);
  };

  const handleSaveReceiveDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveModalItem || !receiveModalItem.agreementId) return;

    setIsReceivingDeposit(true);
    setErrorMessage('');
    const amt = Number(depositAmountInput) || receiveModalItem.securityDeposit;

    try {
      await apiRequest(
        `/api/tenants/security-deposits/${receiveModalItem.agreementId}/`,
        {
          method: 'PATCH',
          body: {
            security_deposit_status: 'PAID',
            deposit_paid_date: depositDateInput,
            deposit_payment_method: depositMethodInput,
            deposit_transaction_ref: depositRefInput,
          },
        }
      );

      // Local update
      setBackendDeposits((prev) =>
        prev.map((r) =>
          r.agreementId === receiveModalItem.agreementId
            ? {
                ...r,
                securityDepositStatus: 'PAID',
                depositPaidDate: depositDateInput,
                depositPaymentMethod: depositMethodInput,
                depositTransactionRef: depositRefInput,
              }
            : r
        )
      );

      if (onRefreshData) {
        try {
          await onRefreshData();
        } catch {
          // ignore
        }
      }

      setToastMessage(
        `Security deposit of ${formatINR(amt)} received & recorded for ${receiveModalItem.name}!`
      );
      setTimeout(() => setToastMessage(''), 3500);
      setReceiveModalItem(null);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Deposit record karne mein error aaya.'
      );
    } finally {
      setIsReceivingDeposit(false);
    }
  };

  // Open Exit Refund Modal
  const openRefundModal = (item: SecurityDepositItem) => {
    setRefundModalItem(item);
    setRefundDeductionInput('0');
    setRefundReasonInput('');
    setRefundMethodInput('UPI');
    setRefundDateInput(new Date().toISOString().split('T')[0]);
  };

  const netRefundCalc = useMemo(() => {
    if (!refundModalItem) return { total: 0, deduction: 0, netRefund: 0 };
    const total = Number(refundModalItem.securityDeposit) || 0;
    const deduction = Math.max(0, Number(refundDeductionInput) || 0);
    const netRefund = Math.max(0, total - deduction);
    return { total, deduction, netRefund };
  }, [refundModalItem, refundDeductionInput]);

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModalItem || !refundModalItem.agreementId) return;

    setIsProcessingRefund(true);
    setErrorMessage('');
    try {
      const deduction = Number(refundDeductionInput) || 0;
      const targetStatus = deduction > 0 ? 'SETTLED' : 'REFUNDED';

      await apiRequest(
        `/api/tenants/security-deposits/${refundModalItem.agreementId}/`,
        {
          method: 'PATCH',
          body: {
            security_deposit_status: targetStatus,
            deposit_refund_date: refundDateInput,
            refund_amount: netRefundCalc.netRefund.toFixed(2),
            deduction_amount: deduction.toFixed(2),
            deduction_reason: refundReasonInput,
            handover_notes: `Exit settlement completed on ${refundDateInput}. Paid via ${refundMethodInput}.`,
          },
        }
      );

      // Local update
      setBackendDeposits((prev) =>
        prev.map((r) =>
          r.agreementId === refundModalItem.agreementId
            ? {
                ...r,
                securityDepositStatus: targetStatus,
                depositRefundDate: refundDateInput,
                refundAmount: netRefundCalc.netRefund,
                deductionAmount: deduction,
                deductionReason: refundReasonInput,
              }
            : r
        )
      );

      if (onRefreshData) {
        try {
          await onRefreshData();
        } catch {
          // ignore
        }
      }

      setToastMessage(
        `Exit refund processed! Returned ${formatINR(netRefundCalc.netRefund)} to ${refundModalItem.name} (Deductions: ${formatINR(deduction)}).`
      );
      setTimeout(() => setToastMessage(''), 4500);
      setRefundModalItem(null);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Refund process karne mein error aaya.'
      );
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const sendWhatsAppDepositReminder = (item: SecurityDepositItem) => {
    const rawPhone = item.phone || '';
    let cleanDigits = rawPhone.replace(/\D/g, '');
    if (cleanDigits.startsWith('0')) cleanDigits = cleanDigits.replace(/^0+/, '');
    const phoneWithCountry =
      cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;

    if (!phoneWithCountry) {
      setToastMessage(`Tenant ${item.name} ka valid mobile number nahi mila.`);
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    const message = `Hello ${item.name}, regarding Room ${item.roomNumber} at ${item.propertyName}. Your one-time move-in security deposit of ${formatINR(item.securityDeposit)} is currently pending. Please pay via UPI to confirm your deposit and room handover. Thank you!`;

    window.open(
      `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleExportCsv = () => {
    if (filteredTenants.length === 0) {
      setToastMessage('Export karne ke liye koi record nahi mila.');
      setTimeout(() => setToastMessage(''), 2500);
      return;
    }

    const headers = [
      'Tenant Name',
      'Phone',
      'Property',
      'Room Number',
      'Move In Date',
      'Security Deposit (INR)',
      'Status',
      'Paid Date',
      'Payment Ref',
      'Refund Date',
      'Deductions (INR)',
      'Refund Amount (INR)',
      'Handover Items Count',
    ];

    const rows = filteredTenants.map((t) => [
      `"${(t.name || '').replace(/"/g, '""')}"`,
      `"${t.phone || ''}"`,
      `"${(t.propertyName || '').replace(/"/g, '""')}"`,
      t.roomNumber || '',
      t.moveInDate || '',
      t.securityDeposit,
      t.securityDepositStatus || 'PENDING',
      t.depositPaidDate || '',
      t.depositTransactionRef || '',
      t.depositRefundDate || '',
      t.deductionAmount || 0,
      t.refundAmount || 0,
      t.handoverItems?.length || 0,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `security_deposits_report_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToastMessage('Security deposits report downloaded as CSV!');
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleTenantNameClick = (item: SecurityDepositItem) => {
    if (onSelectTenant) {
      const match = tenants.find(
        (x) => String(x.id) === String(item.tenantId) || x.agreementId === item.agreementId
      );
      if (match) {
        onSelectTenant(match);
      }
    }
    onNavigate('tenant_profile');
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight">
              Security Deposits &amp; Asset Handover
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EAF4F7] text-[#035E7B]">
              One-Time Escrow
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track one-time move-in deposits, room keys, appliances inventory, and exit settlements cleanly separated from monthly rent.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => onNavigate('tenants')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#035E7B] hover:bg-[#024B63] text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Tenant Agreement</span>
          </button>
        </div>
      </section>

      {/* 4 Dedicated Security Deposit KPI Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Deposit Pool */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Deposit Commitments</span>
            <ShieldCheck className="w-4 h-4 text-[#035E7B]" />
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mt-3">
            {formatINR(stats.totalCommitted)}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Across {stats.totalCount} tenant agreements
          </p>
        </div>

        {/* Card 2: Deposits Held in Escrow */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Deposits Held in Escrow</span>
            <CheckCircle2 className="w-4 h-4 text-[#0C8067]" />
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mt-3">
            {formatINR(stats.totalHeld)}
          </div>
          <p className="text-[11px] text-[#0C8067] font-semibold mt-2">
            {stats.collectionRate}% collected ({stats.heldCount} received)
          </p>
        </div>

        {/* Card 3: Pending Move-In Deposits */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Pending Move-In Deposits</span>
            <Clock className="w-4 h-4 text-[#A8680C]" />
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mt-3">
            {formatINR(stats.totalPending)}
          </div>
          <p className="text-[11px] text-[#A8680C] font-semibold mt-2">
            {stats.pendingCount} tenants awaiting move-in deposit
          </p>
        </div>

        {/* Card 4: Settled / Refunded on Exit */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Refunded on Exit</span>
            <Undo2 className="w-4 h-4 text-[#64748B]" />
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mt-3">
            {formatINR(stats.totalRefunded)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-2">
            {stats.refundedCount} exit settlements ({formatINR(stats.totalDeducted)} deducted)
          </p>
        </div>
      </section>

      {/* Main Table Section */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              One-Time Security Deposit &amp; Room Asset Roster
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Deposits are collected once at onboarding and safely refunded when tenant vacates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <select
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
                className="h-9 pl-3 pr-8 bg-white border border-slate-200 text-[#035E7B] font-semibold rounded-xl text-xs appearance-none focus:outline-none focus:border-[#035E7B]"
              >
                <option value="ALL">All Properties</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as unknown as typeof statusFilter)}
                className="h-9 pl-3 pr-8 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs appearance-none focus:outline-none focus:border-[#035E7B]"
              >
                <option value="ALL">All Statuses</option>
                <option value="PAID">Held / Paid in Escrow</option>
                <option value="PENDING">Pending Move-In</option>
                <option value="REFUNDED">Refunded / Settled on Exit</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tenant name, room number, property or phone..."
            className="w-full h-10 pl-10 pr-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
          />
        </div>

        {/* Roster Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="py-3 px-3 rounded-l-xl">Tenant &amp; Room</th>
                <th className="py-3 px-3">Deposit Amount</th>
                <th className="py-3 px-3 text-center">Deposit Status (1-Click)</th>
                <th className="py-3 px-3">Handover Room Assets</th>
                <th className="py-3 px-3 rounded-r-xl text-right">Settlement Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingApi && depositTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                    <RefreshCw className="w-6 h-6 text-[#035E7B] animate-spin mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">Loading security deposits from database...</p>
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                    <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No security deposit records found.</p>
                    <p className="mt-1 max-w-md mx-auto text-slate-400">
                      When you add tenants with rental agreements, their one-time security deposit and move-in room inventory will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t) => {
                  const rawStatus = (t.securityDepositStatus || 'PENDING').toUpperCase();
                  const isPaid = rawStatus === 'PAID';
                  const isPending = rawStatus === 'PENDING';
                  const isSettled = rawStatus === 'SETTLED' || rawStatus === 'REFUNDED';
                  const isUpdating = updatingAgreementId === t.agreementId;
                  const handoverCount = t.handoverItems?.length || 0;

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition">
                      {/* 1. Tenant & Room */}
                      <td className="py-3.5 px-3">
                        <strong
                          onClick={() => handleTenantNameClick(t)}
                          className="font-bold text-slate-800 hover:text-[#035E7B] cursor-pointer block text-xs"
                        >
                          {t.name}
                        </strong>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {t.propertyName} · Room {t.roomNumber}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                          <span>Move-in: {t.moveInDate || 'Active'}</span>
                          <span>·</span>
                          <span className="font-mono text-slate-600">{t.phone}</span>
                        </div>
                      </td>

                      {/* 2. Deposit Amount & Payment Details */}
                      <td className="py-3.5 px-3 text-slate-700">
                        <span className="font-bold text-slate-800 text-sm block">
                          {formatINR(t.securityDeposit)}
                        </span>
                        {isPaid && (
                          <span className="text-[10px] text-[#0C8067] font-semibold block mt-0.5">
                            Held in Escrow · Paid {t.depositPaidDate ? `on ${t.depositPaidDate}` : 'via UPI'}
                          </span>
                        )}
                        {isPending && (
                          <span className="text-[10px] text-[#A8680C] font-semibold block mt-0.5">
                            Awaiting move-in deposit
                          </span>
                        )}
                        {isSettled && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            <span className="font-bold text-[#035E7B]">
                              Refunded: {formatINR(t.refundAmount)}
                            </span>
                            {Number(t.deductionAmount) > 0 && (
                              <span className="block text-red-600">
                                Deductions: {formatINR(t.deductionAmount)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 3. Status Circle Button Toggle */}
                      <td className="py-3.5 px-3 text-center">
                        {isSettled ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <Undo2 className="w-3 h-3 text-slate-500" />
                            <span>{rawStatus === 'SETTLED' ? 'Partially Deducted' : 'Refunded'}</span>
                          </span>
                        ) : (
                          <div className="inline-flex items-center justify-center gap-2 p-1 bg-slate-50 rounded-full border border-slate-200">
                            {/* Pending Circle Button */}
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleQuickToggleStatus(t, 'PENDING')}
                              title="Mark deposit as Pending"
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition shadow-2xs ${
                                isPending
                                  ? 'bg-amber-100 text-amber-900 border border-amber-400 ring-2 ring-amber-300/40'
                                  : 'bg-white text-slate-400 border border-slate-200 hover:border-amber-300 hover:text-amber-700'
                              }`}
                            >
                              {isUpdating && isPending ? (
                                <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-600" />
                              ) : (
                                <span
                                  className={`w-2.5 h-2.5 rounded-full ${
                                    isPending ? 'bg-amber-500 ring-2 ring-amber-300' : 'bg-slate-300'
                                  }`}
                                />
                              )}
                              <span>Pending</span>
                            </button>

                            {/* Paid / Held Circle Button */}
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleQuickToggleStatus(t, 'PAID')}
                              title="Mark deposit as Received & Held"
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition shadow-2xs ${
                                isPaid
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-500 ring-2 ring-emerald-300/40'
                                  : 'bg-white text-slate-400 border border-slate-200 hover:border-emerald-300 hover:text-emerald-700'
                              }`}
                            >
                              {isUpdating && isPaid ? (
                                <RefreshCw className="w-2.5 h-2.5 animate-spin text-emerald-600" />
                              ) : (
                                <span
                                  className={`w-2.5 h-2.5 rounded-full ${
                                    isPaid ? 'bg-emerald-600 ring-2 ring-emerald-300' : 'bg-slate-300'
                                  }`}
                                />
                              )}
                              <span>Received</span>
                            </button>
                          </div>
                        )}
                      </td>

                      {/* 4. Handover Room Assets */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => openInventoryModal(t)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#EAF4F7] hover:bg-[#D9EAF0] text-[#035E7B] transition shadow-2xs"
                          >
                            <Key className="w-3.5 h-3.5 text-[#035E7B]" />
                            <span>
                              {handoverCount > 0
                                ? `${handoverCount} Items Handed Over`
                                : '+ Log Handover Items'}
                            </span>
                          </button>
                          {t.handoverItems && t.handoverItems.length > 0 && (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {t.handoverItems.slice(0, 3).map((item, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-medium truncate max-w-[120px]"
                                >
                                  {item.item}
                                </span>
                              ))}
                              {t.handoverItems.length > 3 && (
                                <span className="text-[9px] text-slate-400 font-bold self-center">
                                  +{t.handoverItems.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 5. Settlement Actions */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => openReceiveModal(t)}
                                className="px-2.5 py-1 bg-[#E8F8F4] text-[#0C8067] hover:bg-[#D3F3EB] rounded-lg text-xs font-bold transition shadow-2xs"
                              >
                                Receive Deposit
                              </button>
                              <button
                                type="button"
                                onClick={() => sendWhatsAppDepositReminder(t)}
                                className="p-1.5 bg-[#EAF7EE] text-[#0C8067] hover:bg-[#D4EEDC] rounded-lg transition"
                                title="Send WhatsApp Deposit Reminder"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {isPaid && (
                            <button
                              type="button"
                              onClick={() => openRefundModal(t)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-bold transition shadow-2xs"
                            >
                              <Undo2 className="w-3 h-3 text-amber-700" />
                              <span>Process Exit Refund</span>
                            </button>
                          )}

                          {isSettled && (
                            <button
                              type="button"
                              onClick={() => openRefundModal(t)}
                              className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 font-medium underline"
                            >
                              View Settlement
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

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100 gap-2">
          <span>
            Showing {filteredTenants.length} of {stats.totalCount} security deposit agreements
          </span>
          <span className="text-[11px] text-[#035E7B] font-semibold">
            One-Time Security Deposits are strictly kept separate from monthly rent collection
          </span>
        </div>
      </section>

      {/* ================= MODAL 1: MOVE-IN ASSETS & HANDOVER CHECKLIST MODAL ================= */}
      {inventoryModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => !isSavingInventory && setInventoryModalItem(null)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#F8FBFD]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#EAF4F7] text-[#035E7B] flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Room Handover Assets &amp; Inventory Checklist
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tenant: <strong className="text-slate-700">{inventoryModalItem.name}</strong> · Room {inventoryModalItem.roomNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInventoryModalItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInventory} className="p-6 space-y-4 text-xs overflow-y-auto">
              <div className="p-3 bg-[#F0F8FA] border border-[#CBD8E0] rounded-xl text-slate-600 space-y-1">
                <strong className="block text-slate-800 font-bold">
                  Track items handed over at move-in
                </strong>
                <span className="text-[11px] text-slate-500 block leading-relaxed">
                  Click on an item status pill to toggle between <strong>Handed Over</strong>, <strong>Returned</strong>, <strong>Missing</strong>, or <strong>Damaged</strong>.
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700">
                  Room Assets &amp; Keys Checklist ({handoverItemsDraft.length} items)
                </label>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {handoverItemsDraft.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <strong className="block text-slate-800 text-xs font-semibold truncate">
                          {item.item}
                        </strong>
                        <span className="text-[10px] text-slate-400">
                          Qty: {item.quantity || 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleItemStatus(idx)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition shadow-2xs ${
                            item.status === 'Handed Over'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-400'
                              : item.status === 'Returned'
                              ? 'bg-blue-100 text-blue-800 border border-blue-400'
                              : item.status === 'Missing'
                              ? 'bg-red-100 text-red-800 border border-red-400'
                              : 'bg-amber-100 text-amber-800 border border-amber-400'
                          }`}
                        >
                          {item.status}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveInventoryItem(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 transition"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Custom Item */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={customItemInput}
                  onChange={(e) => setCustomItemInput(e.target.value)}
                  placeholder="Add custom item (e.g. Geyser Remote, Curtains, etc.)..."
                  className="flex-1 h-9 px-3 border border-slate-200 rounded-xl bg-white text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
                />
                <button
                  type="button"
                  onClick={handleAddCustomInventoryItem}
                  className="px-3.5 h-9 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition"
                >
                  + Add
                </button>
              </div>

              {/* Handover & Condition Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Move-In Condition &amp; Handover Notes
                </label>
                <textarea
                  rows={2}
                  value={handoverNotesDraft}
                  onChange={(e) => setHandoverNotesDraft(e.target.value)}
                  placeholder="e.g. Room freshly painted, 2 keys handed over, bucket & mug provided brand new."
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:border-[#035E7B]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setInventoryModalItem(null)}
                  className="px-4 h-10 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingInventory}
                  className="px-5 h-10 bg-[#035E7B] hover:bg-[#024B63] disabled:opacity-50 text-white rounded-xl font-bold transition shadow-sm inline-flex items-center gap-1.5"
                >
                  {isSavingInventory ? 'Saving...' : 'Save Handover Checklist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: RECEIVE DEPOSIT MODAL ================= */}
      {receiveModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => !isReceivingDeposit && setReceiveModalItem(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#F8FBFD]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#E8F8F4] text-[#0C8067] flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Receive Move-In Security Deposit
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tenant: <strong className="text-slate-700">{receiveModalItem.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReceiveModalItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReceiveDeposit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Security Deposit Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={depositAmountInput}
                  onChange={(e) => setDepositAmountInput(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white font-bold text-slate-800 text-sm focus:outline-none focus:border-[#035E7B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Receipt Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={depositDateInput}
                    onChange={(e) => setDepositDateInput(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:border-[#035E7B]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={depositMethodInput}
                    onChange={(e) => setDepositMethodInput(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-xs font-semibold focus:outline-none focus:border-[#035E7B]"
                  >
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                    <option value="CARD">Debit / Credit Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Transaction Reference / UTR (Optional)
                </label>
                <input
                  type="text"
                  value={depositRefInput}
                  onChange={(e) => setDepositRefInput(e.target.value)}
                  placeholder="e.g. UPI-1234567890"
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white font-mono text-xs focus:outline-none focus:border-[#035E7B]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReceiveModalItem(null)}
                  className="px-4 h-10 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReceivingDeposit}
                  className="px-5 h-10 bg-[#0C8067] hover:bg-[#096652] disabled:opacity-50 text-white rounded-xl font-bold transition shadow-sm inline-flex items-center gap-1.5"
                >
                  {isReceivingDeposit ? 'Saving...' : 'Confirm Deposit Received'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: EXIT SETTLEMENT & REFUND MODAL ================= */}
      {refundModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => !isProcessingRefund && setRefundModalItem(null)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#F8FBFD]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Undo2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Exit Security Deposit Refund &amp; Settlement
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tenant: <strong className="text-slate-700">{refundModalItem.name}</strong> · Room {refundModalItem.roomNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRefundModalItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcessRefund} className="p-6 space-y-4 text-xs">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Total Deposit Held
                  </span>
                  <strong className="text-sm font-bold text-slate-800">
                    {formatINR(netRefundCalc.total)}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-red-500 uppercase font-bold block">
                    Deductions
                  </span>
                  <strong className="text-sm font-bold text-red-600">
                    -{formatINR(netRefundCalc.deduction)}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-600 uppercase font-bold block">
                    Net Refund Returned
                  </span>
                  <strong className="text-sm font-bold text-[#0C8067]">
                    {formatINR(netRefundCalc.netRefund)}
                  </strong>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Deductions Amount (Damage, unpaid electricity or repair charges)
                </label>
                <input
                  type="number"
                  min="0"
                  max={netRefundCalc.total}
                  value={refundDeductionInput}
                  onChange={(e) => setRefundDeductionInput(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white font-bold text-slate-800 focus:outline-none focus:border-[#035E7B]"
                />
              </div>

              {Number(refundDeductionInput) > 0 && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Deduction Reason / Breakdown *
                  </label>
                  <input
                    type="text"
                    required
                    value={refundReasonInput}
                    onChange={(e) => setRefundReasonInput(e.target.value)}
                    placeholder="e.g. Unpaid electricity dues ₹800 + lost key replacement ₹200 + wall touchup ₹500"
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:border-[#035E7B]"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Refund Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={refundDateInput}
                    onChange={(e) => setRefundDateInput(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:border-[#035E7B]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Refund Payment Method
                  </label>
                  <select
                    value={refundMethodInput}
                    onChange={(e) => setRefundMethodInput(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-xs font-semibold focus:outline-none focus:border-[#035E7B]"
                  >
                    <option value="UPI">UPI / Bank Transfer</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRefundModalItem(null)}
                  className="px-4 h-10 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingRefund}
                  className="px-5 h-10 bg-[#035E7B] hover:bg-[#024B63] disabled:opacity-50 text-white rounded-xl font-bold transition shadow-sm inline-flex items-center gap-1.5"
                >
                  {isProcessingRefund ? 'Processing...' : 'Confirm Refund & Settle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-emerald-300 rounded-2xl p-4 shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-xs font-bold text-slate-800">{toastMessage}</div>
        </div>
      )}
    </div>
  );
};