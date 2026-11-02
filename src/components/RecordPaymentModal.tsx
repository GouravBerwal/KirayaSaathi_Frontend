import React, { useState, useEffect, useMemo } from 'react';
import { Tenant, RentRecord, ElectricityBill } from '../types';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenants: Tenant[];
  rentRecords?: RentRecord[];
  electricityBills?: ElectricityBill[];
  defaultTenantId?: string;
  defaultPaymentType?: 'rent' | 'electricity';
  defaultBillId?: string;
  onPaymentRecorded: (paymentData: {
    tenantId: string;
    agreementId?: number;
    rentRecordId?: number;
    electricityBillId?: number;
    amount: number;
    paymentType: 'rent' | 'electricity';
    mode: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'OTHER';
    transactionReference: string;
    note: string;
  }) => Promise<void> | void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  tenants,
  rentRecords = [],
  electricityBills = [],
  defaultTenantId,
  defaultPaymentType,
  defaultBillId,
  onPaymentRecorded,
}) => {
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [paymentType, setPaymentType] = useState<'rent' | 'electricity'>('rent');
  const [selectedBillId, setSelectedBillId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'OTHER'>('UPI');
  const [transactionReference, setTransactionReference] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const formattedToday = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Set default tenant & payment type when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    if (defaultPaymentType) {
      setPaymentType(defaultPaymentType);
    }
    if (defaultBillId) {
      setSelectedBillId(defaultBillId);
    }
    if (defaultTenantId) {
      setSelectedTenantId(defaultTenantId);
    } else if (tenants.length > 0 && !selectedTenantId) {
      setSelectedTenantId(tenants[0].id);
    }
  }, [isOpen, defaultTenantId, defaultPaymentType, defaultBillId, tenants, selectedTenantId]);

  const currentTenant = useMemo(
    () => tenants.find((t) => t.id === selectedTenantId),
    [tenants, selectedTenantId]
  );

  // Unpaid rent records for this tenant
  const tenantUnpaidRentRecords = useMemo(() => {
    if (!currentTenant) return [];
    return rentRecords.filter(
      (r) =>
        (r.tenantId === currentTenant.id ||
          r.tenantName.toLowerCase() === currentTenant.name.toLowerCase()) &&
        r.status !== 'Paid'
    );
  }, [rentRecords, currentTenant]);

  // Unpaid electricity bills for this tenant
  const tenantUnpaidElectricityBills = useMemo(() => {
    if (!currentTenant) return [];
    return electricityBills.filter(
      (b) =>
        (b.roomId === currentTenant.roomId ||
          b.tenantName.toLowerCase() === currentTenant.name.toLowerCase()) &&
        b.status !== 'Paid'
    );
  }, [electricityBills, currentTenant]);

  // Automatically pick the first unpaid bill/record and populate its balance
  useEffect(() => {
    if (!currentTenant) return;

    if (paymentType === 'rent') {
      if (tenantUnpaidRentRecords.length > 0) {
        const firstRecord = tenantUnpaidRentRecords[0];
        setSelectedBillId(firstRecord.id);
        setAmount(String(firstRecord.balance || firstRecord.rentDue || 0));
      } else {
        setSelectedBillId('');
        setAmount(String(currentTenant.balance || currentTenant.monthlyRent || 0));
      }
    } else {
      if (defaultBillId && tenantUnpaidElectricityBills.some((b) => b.id === defaultBillId)) {
        const matchingBill = tenantUnpaidElectricityBills.find((b) => b.id === defaultBillId)!;
        setSelectedBillId(matchingBill.id);
        const unpaidAmt = Math.max(0, matchingBill.amount - (matchingBill.amountPaid || 0));
        setAmount(String(unpaidAmt || matchingBill.amount || 0));
      } else if (tenantUnpaidElectricityBills.length > 0) {
        const firstBill = tenantUnpaidElectricityBills[0];
        setSelectedBillId(firstBill.id);
        const unpaidAmt = Math.max(0, firstBill.amount - (firstBill.amountPaid || 0));
        setAmount(String(unpaidAmt || firstBill.amount || 0));
      } else {
        setSelectedBillId('');
        setAmount(String(currentTenant.electricityPending || 0));
      }
    }
  }, [
    currentTenant,
    paymentType,
    tenantUnpaidRentRecords,
    tenantUnpaidElectricityBills,
  ]);

  if (!isOpen) return null;

  const handleBillSelectChange = (billId: string) => {
    setSelectedBillId(billId);
    if (paymentType === 'rent') {
      const rec = tenantUnpaidRentRecords.find((r) => r.id === billId);
      if (rec) setAmount(String(rec.balance));
    } else {
      const bill = tenantUnpaidElectricityBills.find((b) => b.id === billId);
      if (bill) {
        const unpaid = Math.max(0, bill.amount - (bill.amountPaid || 0));
        setAmount(String(unpaid));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!currentTenant) {
      setErrorMsg('Kripya ek valid tenant select karein.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onPaymentRecorded({
        tenantId: currentTenant.id,
        agreementId: currentTenant.agreementId,
        rentRecordId:
          paymentType === 'rent' && selectedBillId ? Number(selectedBillId) : undefined,
        electricityBillId:
          paymentType === 'electricity' && selectedBillId ? Number(selectedBillId) : undefined,
        amount: Number(amount) || 0,
        paymentType,
        mode,
        transactionReference: transactionReference.trim(),
        note:
          note.trim() ||
          `${paymentType === 'electricity' ? 'Electricity bill' : 'Rent'} payment`,
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setTransactionReference('');
        setNote('');
        onClose();
      }, 1200);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Payment save karne mein error aaya.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-800">Record a payment</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Saves payment directly to backend &amp; updates bill status
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Payment recorded!</h3>
            <p className="text-xs text-slate-500 mt-1">
              Tenant ledger &amp; backend payment records updated successfully.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Select Tenant *
              </label>
              <select
                value={selectedTenantId}
                onChange={(e) => setSelectedTenantId(e.target.value)}
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:border-[#035E7B] focus:ring-2 focus:ring-[#035E7B]/10"
                required
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.propertyName || 'Property'} · Room {t.roomNumber || 'N/A'})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Payment Type *
                </label>
                <select
                  value={paymentType}
                  onChange={(e) =>
                    setPaymentType(e.target.value as 'rent' | 'electricity')
                  }
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:border-[#035E7B]"
                >
                  <option value="rent">Monthly Rent</option>
                  <option value="electricity">Electricity Bill</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Target Bill / Record *
                </label>
                {paymentType === 'rent' ? (
                  <select
                    value={selectedBillId}
                    onChange={(e) => handleBillSelectChange(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:border-[#035E7B]"
                  >
                    {tenantUnpaidRentRecords.length === 0 ? (
                      <option value="">Auto-create current month bill</option>
                    ) : (
                      tenantUnpaidRentRecords.map((r) => (
                        <option key={r.id} value={r.id}>
                          {(r.billingMonth || r.dueDate).slice(0, 7)} · Due ₹{r.balance}
                        </option>
                      ))
                    )}
                  </select>
                ) : (
                  <select
                    value={selectedBillId}
                    onChange={(e) => handleBillSelectChange(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:border-[#035E7B]"
                  >
                    {tenantUnpaidElectricityBills.length === 0 ? (
                      <option value="">No unpaid electricity bill</option>
                    ) : (
                      tenantUnpaidElectricityBills.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.meterId} ({b.readingDate}) · ₹
                          {Math.max(0, b.amount - (b.amountPaid || 0))}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Amount Received (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 inset-y-0 flex items-center text-slate-400 text-xs">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full h-10 pl-7 pr-3 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-[#035E7B]"
                    required
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Payment Method *
                </label>
                <select
                  value={mode}
                  onChange={(e) =>
                    setMode(
                      e.target.value as
                        | 'CASH'
                        | 'UPI'
                        | 'BANK_TRANSFER'
                        | 'CARD'
                        | 'OTHER'
                    )
                  }
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:border-[#035E7B]"
                >
                  <option value="UPI">UPI (GPay / PhonePe)</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Transaction Ref (UTR/ID)
                </label>
                <input
                  type="text"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                  placeholder="e.g. UTR-429812391"
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Date
                </label>
                <input
                  type="text"
                  value={`Today, ${formattedToday}`}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 bg-slate-50"
                  readOnly
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Notes
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any remarks about this payment..."
                className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 h-10 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 h-10 bg-[#035E7B] hover:bg-[#024B63] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                {isSubmitting ? 'Saving...' : 'Save Payment'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};