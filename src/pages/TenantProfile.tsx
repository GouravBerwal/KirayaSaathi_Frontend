import React, { useState, useMemo } from 'react';
import {
  PageType,
  Tenant,
  Property,
  Room,
  RentRecord,
  ElectricityBill,
  PaymentRecord,
} from '../types';
import {
  ArrowLeft,
  Download,
  Edit,
  Mail,
  FileText,
  IndianRupee,
  ShieldCheck,
  Zap,
  CheckCircle2,
  MessageCircle,
  Plus,
  LogOut,
  Users,
} from 'lucide-react';

interface TenantProfileProps {
  tenant?: Tenant;
  properties?: Property[];
  rooms?: Room[];
  rentRecords?: RentRecord[];
  electricityBills?: ElectricityBill[];
  payments?: PaymentRecord[];
  onNavigate: (page: PageType) => void;
  onEditTenant: (tenant: Tenant) => void;
  onOpenRecordPayment?: (tenantId: string) => void;
  onSelectInvoice?: (tenantName: string) => void;
  onTerminateAgreement?: (tenant: Tenant) => Promise<void> | void;
}

const formatDate = (value?: string | null): string => {
  if (!value) return 'Not set';
  const clean = value.slice(0, 10);
  const d = new Date(`${clean}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const TenantProfile: React.FC<TenantProfileProps> = ({
  tenant,
  properties = [],
  rooms = [],
  rentRecords = [],
  electricityBills = [],
  payments = [],
  onNavigate,
  onEditTenant,
  onOpenRecordPayment,
  onSelectInvoice,
  onTerminateAgreement,
}) => {
  const [activeHistoryTab, setActiveHistoryTab] = useState<
    'recent' | 'rental' | 'deposit'
  >('recent');
  const [isTerminating, setIsTerminating] = useState(false);

  // Match real Property and Room objects for this tenant
  const assignedRoom = useMemo(
    () =>
      rooms.find(
        (r) =>
          (tenant?.roomId && String(r.id) === String(tenant.roomId)) ||
          (tenant?.roomNumber &&
            r.number === tenant.roomNumber &&
            r.propertyName === tenant.propertyName)
      ),
    [rooms, tenant]
  );

  const assignedProperty = useMemo(
    () =>
      properties.find(
        (p) =>
          (tenant?.propertyId && String(p.id) === String(tenant.propertyId)) ||
          (assignedRoom?.propertyId &&
            String(p.id) === String(assignedRoom.propertyId)) ||
          (tenant?.propertyName && p.name === tenant.propertyName)
      ),
    [properties, tenant, assignedRoom]
  );

  // Filter this tenant's real RentRecords
  const tenantRentRecords = useMemo(() => {
    if (!tenant) return [];
    return rentRecords.filter(
      (r) =>
        String(r.tenantId) === String(tenant.id) ||
        (tenant.agreementId && r.agreementId === tenant.agreementId) ||
        r.tenantName.toLowerCase() === tenant.name.toLowerCase()
    );
  }, [rentRecords, tenant]);

  // Filter this tenant's real ElectricityBills
  const tenantElectricityBills = useMemo(() => {
    if (!tenant) return [];
    return electricityBills.filter(
      (b) =>
        (tenant.roomId && String(b.roomId) === String(tenant.roomId)) ||
        b.tenantName.toLowerCase() === tenant.name.toLowerCase()
    );
  }, [electricityBills, tenant]);

  // Filter this tenant's real Payment transactions
  const tenantPayments = useMemo(() => {
    if (!tenant) return [];
    return payments.filter(
      (p) =>
        (tenant.agreementId && p.agreementId === tenant.agreementId) ||
        p.tenantName.toLowerCase() === tenant.name.toLowerCase()
    );
  }, [payments, tenant]);

  const latestElectricityBill = tenantElectricityBills[0] || null;
  const totalOutstanding =
    (Number(tenant?.balance) || 0) + (Number(tenant?.electricityPending) || 0);

  if (!tenant) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-[#EAF4F7] text-[#035E7B] flex items-center justify-center mx-auto">
          <Users className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">No tenant selected</h2>
        <p className="text-xs text-slate-500">
          Please select a tenant from the Tenant Directory to view their profile and ledger.
        </p>
        <button
          onClick={() => onNavigate('tenants')}
          className="px-4 py-2 bg-[#035E7B] text-white rounded-xl text-xs font-bold"
        >
          Go to Tenant Directory
        </button>
      </div>
    );
  }

  // Export real tenant statement as CSV
  const handleDownloadStatement = () => {
    const headers = [
      'Entry Type',
      'Period / Reference',
      'Date',
      'Billed / Due (INR)',
      'Paid / Received (INR)',
      'Balance (INR)',
      'Status',
    ];

    const rows: (string | number)[][] = [];

    tenantRentRecords.forEach((r) => {
      rows.push([
        'Monthly Rent Bill',
        (r.billingMonth || r.dueDate).slice(0, 7),
        r.dueDate,
        r.rentDue,
        r.received,
        r.balance,
        r.status,
      ]);
    });

    tenantElectricityBills.forEach((b) => {
      rows.push([
        `Electricity Bill (${b.meterId})`,
        `${b.units} kWh @ ₹${b.rate}`,
        b.readingDate,
        b.amount,
        b.amountPaid ?? (b.status === 'Paid' ? b.amount : 0),
        Math.max(0, b.amount - (b.amountPaid ?? (b.status === 'Paid' ? b.amount : 0))),
        b.status,
      ]);
    });

    tenantPayments.forEach((p) => {
      rows.push([
        `Payment (${p.paymentMethod})`,
        p.transactionReference || p.notes || p.paymentType,
        p.paymentDate.slice(0, 10),
        0,
        p.amount,
        0,
        p.status,
      ]);
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [
        `Tenant Statement: ${tenant.name} (ID: ${tenant.id})`,
        `Property: ${tenant.propertyName || 'N/A'} | Room: ${tenant.roomNumber || 'N/A'}`,
        '',
        headers.join(','),
        ...rows.map((row) =>
          row.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\r\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `statement_${tenant.name.replace(/\s+/g, '_').toLowerCase()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate printable Rental Agreement / Identity summary document
  const handlePrintDocument = (docType: 'agreement' | 'identity') => {
    const win = window.open('', '_blank', 'width=800,height=700');
    if (!win) return;

    const fullPropAddress = assignedProperty
      ? [
          assignedProperty.address,
          assignedProperty.city,
          assignedProperty.state,
          assignedProperty.pinCode,
        ]
          .filter(Boolean)
          .join(', ')
      : tenant.propertyName || 'Not specified';

    const html = `
      <html>
        <head>
          <title>${docType === 'agreement' ? 'Rental Agreement' : 'Tenant Verification'} - ${tenant.name}</title>
          <style>
            body { font-family: sans-serif; padding: 32px; color: #1e293b; line-height: 1.6; }
            h1 { color: #035E7B; margin-bottom: 4px; }
            .sub { color: #64748b; font-size: 13px; margin-bottom: 24px; }
            .box { border: 1px solid #cbd5e1; border-radius: 12px; padding: 18px; margin-bottom: 18px; }
            .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
            .label { color: #64748b; font-size: 13px; }
            .val { font-weight: bold; font-size: 14px; }
          </style>
        </head>
        <body>
          <h1>KirayaSaathi · ${docType === 'agreement' ? 'Official Rental Agreement Summary' : 'Tenant Identity & KYC Dossier'}</h1>
          <div class="sub">Generated from live backend records · Agreement ID: #${tenant.agreementId || 'N/A'}</div>
          <div class="box">
            <h3>Tenant Details</h3>
            <div class="row"><span class="label">Full Name</span><span class="val">${tenant.name}</span></div>
            <div class="row"><span class="label">Phone Number</span><span class="val">${tenant.phone || '—'}</span></div>
            <div class="row"><span class="label">Email</span><span class="val">${tenant.email || '—'}</span></div>
            <div class="row"><span class="label">Permanent Address</span><span class="val">${tenant.permanentAddress || '—'}</span></div>
            <div class="row"><span class="label">Emergency Contact</span><span class="val">${tenant.emergencyContact?.name || '—'} (${tenant.emergencyContact?.phone || '—'})</span></div>
          </div>
          <div class="box">
            <h3>Tenancy & Room Allocation</h3>
            <div class="row"><span class="label">Property</span><span class="val">${tenant.propertyName || '—'}</span></div>
            <div class="row"><span class="label">Property Address</span><span class="val">${fullPropAddress}</span></div>
            <div class="row"><span class="label">Room Number</span><span class="val">Room ${tenant.roomNumber || '—'}</span></div>
            <div class="row"><span class="label">Move-in Date</span><span class="val">${formatDate(tenant.moveInDate)}</span></div>
            <div class="row"><span class="label">Agreement End Date</span><span class="val">${formatDate(tenant.agreementEndDate)}</span></div>
            <div class="row"><span class="label">Monthly Rent</span><span class="val">₹${tenant.monthlyRent.toLocaleString('en-IN')}</span></div>
            <div class="row"><span class="label">Security Deposit</span><span class="val">₹${tenant.securityDeposit.toLocaleString('en-IN')}</span></div>
            <div class="row"><span class="label">Status</span><span class="val">${tenant.status}</span></div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
  };

  const handleWhatsAppMessage = () => {
    if (!tenant.phone) return;
    const cleanPhone = tenant.phone.replace(/\D/g, '');
    const phoneWithCountry =
      cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg =
      totalOutstanding > 0
        ? `Hello ${tenant.name}, this is a quick update regarding your tenancy at ${tenant.propertyName} (Room ${tenant.roomNumber}). Your current outstanding balance is ₹${totalOutstanding.toLocaleString('en-IN')}.`
        : `Hello ${tenant.name}, hope you are having a comfortable stay at ${tenant.propertyName} (Room ${tenant.roomNumber})!`;

    window.open(
      `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleCheckout = async () => {
    if (!onTerminateAgreement || !tenant.agreementId) return;
    const confirmed = window.confirm(
      `Mark ${tenant.name}'s rental agreement as Completed (Moved Out) and release Room ${tenant.roomNumber} as Vacant?`
    );
    if (!confirmed) return;

    setIsTerminating(true);
    try {
      await onTerminateAgreement(tenant);
    } finally {
      setIsTerminating(false);
    }
  };

  const fullPropertyAddress = assignedProperty
    ? [
        assignedProperty.address,
        assignedProperty.city,
        assignedProperty.state,
        assignedProperty.pinCode,
      ]
        .filter(Boolean)
        .join(', ')
    : 'Address configured in Property Settings';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <button
          onClick={() => onNavigate('tenants')}
          className="hover:text-[#035E7B] flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-4 h-4 text-[#035E7B]" />
          <span>Tenants / {tenant.name}</span>
        </button>
      </div>

      {/* Page Heading & Actions */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight">
            Tenant profile
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Contact details, room allocation and a clear record of every payment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadStatement}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-[#035E7B] rounded-xl text-xs font-semibold transition shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download statement</span>
          </button>

          {onOpenRecordPayment && (
            <button
              onClick={() => onOpenRecordPayment(tenant.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-[#035E7B] text-[#035E7B] rounded-xl text-xs font-bold transition shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record payment</span>
            </button>
          )}

          <button
            onClick={() => {
              onEditTenant(tenant);
              onNavigate('tenant_detail');
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#035E7B] hover:bg-[#024B63] text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit tenant</span>
          </button>
        </div>
      </section>

      {/* Tenant Identity Summary Card */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#EAF4F7] text-[#035E7B] flex items-center justify-center font-bold text-xl shrink-0">
            {tenant.name
              .split(' ')
              .filter(Boolean)
              .map((n) => n[0]?.toUpperCase())
              .join('')
              .slice(0, 2)}
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">{tenant.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tenant ID #{tenant.id} · Resident since {formatDate(tenant.moveInDate)} ·{' '}
              {tenant.propertyName || 'No Property'},{' '}
              {tenant.roomNumber ? `Room ${tenant.roomNumber}` : 'Unassigned'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              tenant.status === 'Active'
                ? 'bg-[#E8F8F4] text-[#0C8067]'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                tenant.status === 'Active' ? 'bg-[#0C8067]' : 'bg-slate-400'
              }`}
            />{' '}
            {tenant.status}
          </span>

          {tenant.phone && (
            <button
              type="button"
              onClick={handleWhatsAppMessage}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#E8F8F4] hover:bg-[#d5f2ea] text-[#0C8067] rounded-xl text-xs font-bold transition"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
          )}

          {tenant.email && (
            <a
              href={`mailto:${tenant.email}?subject=KirayaSaathi%20Rental%20Update`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#035E7B] rounded-xl text-xs font-semibold transition"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email</span>
            </a>
          )}

          {tenant.status === 'Active' && tenant.agreementId && onTerminateAgreement && (
            <button
              type="button"
              disabled={isTerminating}
              onClick={() => void handleCheckout()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isTerminating ? 'Ending...' : 'End Tenancy'}</span>
            </button>
          )}
        </div>
      </section>

      {/* 4 Dynamic Financial Stat Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Monthly rent</span>
            <IndianRupee className="w-4 h-4 text-[#0D8AB0]" />
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-3">
            ₹{tenant.monthlyRent.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Due on the {assignedProperty?.rentDueDay || 5}th of each month
          </p>
        </div>

        <div
          onClick={() => onNavigate('security_deposits')}
          className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs cursor-pointer hover:border-[#035E7B] transition"
          title="Click to view Security Deposits & Handover Assets"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>One-Time Security Deposit</span>
            <ShieldCheck className="w-4 h-4 text-[#0D8AB0]" />
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-3">
            ₹{tenant.securityDeposit.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-[#035E7B] font-semibold mt-2 flex items-center justify-between">
            <span>Status: {(tenant.securityDepositStatus || 'PENDING').toUpperCase()}</span>
            <span>Manage assets →</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Latest electricity</span>
            <Zap className="w-4 h-4 text-[#0D8AB0]" />
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-3">
            ₹{(latestElectricityBill?.amount ?? tenant.electricityPending ?? 0).toLocaleString('en-IN')}
          </div>
          <p
            className={`text-[11px] font-semibold mt-2 ${
              latestElectricityBill?.status === 'Paid'
                ? 'text-[#0C8067]'
                : latestElectricityBill
                ? 'text-[#A8680C]'
                : 'text-slate-400'
            }`}
          >
            {latestElectricityBill
              ? `${latestElectricityBill.units} kWh × ₹${latestElectricityBill.rate} · ${latestElectricityBill.status}`
              : 'No electricity bills billed yet'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Total outstanding</span>
            <CheckCircle2
              className={`w-4 h-4 ${
                totalOutstanding === 0 ? 'text-[#0C8067]' : 'text-[#A8680C]'
              }`}
            />
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-3">
            ₹{totalOutstanding.toLocaleString('en-IN')}
          </div>
          <p
            className={`text-[11px] font-semibold mt-2 ${
              totalOutstanding === 0 ? 'text-[#0C8067]' : 'text-[#A8680C]'
            }`}
          >
            {totalOutstanding === 0
              ? 'All rent & electricity dues cleared'
              : `Rent: ₹${tenant.balance.toLocaleString('en-IN')} · Elec: ₹${tenant.electricityPending.toLocaleString('en-IN')}`}
          </p>
        </div>
      </section>

      {/* 2-Column Details: Left Contact & Docs, Right Allocated Room & Payment History */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (1 span) */}
        <div className="space-y-5">
          {/* Contact Information */}
          <article className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-800">Contact information</h2>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">
                Mobile number
              </span>
              <a
                href={`tel:${tenant.phone}`}
                className="text-xs font-semibold text-[#0D8AB0] hover:underline block"
              >
                {tenant.phone || 'Not provided'}
              </a>
              {tenant.alternatePhone && (
                <span className="text-[11px] text-slate-500 block">
                  Alt: {tenant.alternatePhone}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">
                Email address
              </span>
              {tenant.email ? (
                <a
                  href={`mailto:${tenant.email}`}
                  className="text-xs font-semibold text-[#0D8AB0] hover:underline block truncate"
                >
                  {tenant.email}
                </a>
              ) : (
                <p className="text-xs text-slate-400">No email recorded</p>
              )}
            </div>

            {tenant.dateOfBirth && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  Date of birth
                </span>
                <p className="text-xs text-slate-700">{formatDate(tenant.dateOfBirth)}</p>
              </div>
            )}

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">
                Permanent address
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                {tenant.permanentAddress || 'No permanent address recorded'}
              </p>
            </div>

            <div className="h-px bg-slate-100" />

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">
                Emergency contact
              </span>
              <p className="text-xs font-medium text-slate-800">
                {tenant.emergencyContact?.name || 'Not specified'}
                {tenant.emergencyContact?.relationship
                  ? ` · ${tenant.emergencyContact.relationship}`
                  : ''}
              </p>
              {tenant.emergencyContact?.phone && (
                <a
                  href={`tel:${tenant.emergencyContact.phone}`}
                  className="text-xs text-[#0D8AB0] font-semibold hover:underline block"
                >
                  {tenant.emergencyContact.phone}
                </a>
              )}
            </div>
          </article>

          {/* Documents */}
          <article className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Documents &amp; Dossier</h2>
              <p className="text-[11px] text-slate-400">
                Printable records generated from backend agreement data.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-[#035E7B] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800 truncate">
                      Rental agreement summary
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Agreement #{tenant.agreementId || 'N/A'} · {formatDate(tenant.moveInDate)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handlePrintDocument('agreement')}
                  className="p-1 text-slate-400 hover:text-[#035E7B]"
                  title="Print / Save as PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-[#035E7B] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800 truncate">
                      Tenant KYC &amp; contact sheet
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Tenant ID #{tenant.id} · Active record
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handlePrintDocument('identity')}
                  className="p-1 text-slate-400 hover:text-[#035E7B]"
                  title="Print / Save as PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </article>
        </div>

        {/* Right Column (2 spans): Allocated Room + Payment History */}
        <div className="lg:col-span-2 space-y-5">
          {/* Allocated Room Card */}
          <article className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
            <h2 className="text-sm font-bold text-slate-800">Allocated room</h2>

            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {tenant.roomNumber ? `Room ${tenant.roomNumber}` : 'No Room Assigned'} ·{' '}
                  {tenant.propertyName || 'Unassigned Property'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Floor: {assignedRoom?.floor || 'G'} · Type: {assignedRoom?.type || 'Standard'} (Capacity: {assignedRoom?.capacity || 1} Bed{(assignedRoom?.capacity || 1) > 1 ? 's' : ''}) ·{' '}
                  Meter: {assignedRoom?.meterId || latestElectricityBill?.meterId || 'Not linked'}
                </p>

                {assignedRoom?.occupants && assignedRoom.occupants.length > 1 && (
                  <div className="mt-2.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-700">Room Sharing Occupants ({assignedRoom.occupants.length}/{assignedRoom.capacity || 2} Beds): </span>
                    {assignedRoom.occupants.map((occ, idx) => (
                      <span key={occ.id}>
                        {idx > 0 && ', '}
                        <strong className={occ.id === tenant.id ? 'text-[#035E7B]' : ''}>
                          {occ.name}{occ.id === tenant.id ? ' (Current)' : ''}
                        </strong>
                      </span>
                    ))}
                    <div className="text-[10px] text-[#035E7B] mt-1 font-medium">
                      Electricity & utility bills are automatically split equally among active occupants of this room.
                    </div>
                  </div>
                )}
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  assignedRoom?.status === 'Occupied' || tenant.status === 'Active'
                    ? 'bg-[#E8F8F4] text-[#0C8067]'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#0C8067]" />{' '}
                {assignedRoom?.status || tenant.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-400">
                  Move-in date
                </span>
                <p className="text-xs font-semibold text-slate-800 mt-0.5">
                  {formatDate(tenant.moveInDate)}
                </p>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-400">
                  Agreement ends
                </span>
                <p className="text-xs font-semibold text-slate-800 mt-0.5">
                  {formatDate(tenant.agreementEndDate)}
                </p>
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-400">
                  Electricity rate
                </span>
                <p className="text-xs font-semibold text-slate-800 mt-0.5">
                  ₹{(assignedProperty?.electricityRate ?? latestElectricityBill?.rate ?? 8).toFixed(2)} / kWh
                </p>
              </div>
            </div>

            {tenant.agreementNotes && (
              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <strong className="text-slate-700">Agreement notes:</strong> {tenant.agreementNotes}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs pt-3 border-t border-slate-100 gap-1">
              <span className="text-slate-400">Property address:</span>
              <span className="font-medium text-slate-700">{fullPropertyAddress}</span>
            </div>
          </article>

          {/* Dynamic Payment & Billing History */}
          <article className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Payment &amp; billing history</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Live rent records, electricity bills, and recorded receipts for {tenant.name}.
              </p>
            </div>

            {/* Sub-tabs */}
            <div className="flex items-center gap-5 border-b border-slate-200 pb-2 text-xs">
              <button
                onClick={() => setActiveHistoryTab('recent')}
                className={`pb-2 -mb-2.5 font-semibold transition border-b-2 ${
                  activeHistoryTab === 'recent'
                    ? 'border-[#035E7B] text-[#035E7B] font-bold'
                    : 'border-transparent text-slate-500'
                }`}
              >
                Recent payments · {tenantPayments.length}
              </button>
              <button
                onClick={() => setActiveHistoryTab('rental')}
                className={`pb-2 -mb-2.5 font-semibold transition border-b-2 ${
                  activeHistoryTab === 'rental'
                    ? 'border-[#035E7B] text-[#035E7B] font-bold'
                    : 'border-transparent text-slate-500'
                }`}
              >
                Rent &amp; electricity bills · {tenantRentRecords.length + tenantElectricityBills.length}
              </button>
              <button
                onClick={() => setActiveHistoryTab('deposit')}
                className={`pb-2 -mb-2.5 font-semibold transition border-b-2 ${
                  activeHistoryTab === 'deposit'
                    ? 'border-[#035E7B] text-[#035E7B] font-bold'
                    : 'border-transparent text-slate-500'
                }`}
              >
                Security deposit
              </button>
            </div>

            {/* Tab 1: Recent Payments */}
            {activeHistoryTab === 'recent' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-2 px-3 rounded-l-lg">Payment Type</th>
                      <th className="py-2 px-3">Paid on</th>
                      <th className="py-2 px-3">Amount</th>
                      <th className="py-2 px-3">Mode</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3 rounded-r-lg text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tenantPayments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No payment transactions recorded for this tenant yet.
                        </td>
                      </tr>
                    ) : (
                      tenantPayments.map((p) => (
                        <tr key={p.id}>
                          <td className="py-3 px-3 font-medium text-slate-800 capitalize">
                            {p.paymentType} · {p.transactionReference || p.notes || `ID #${p.id}`}
                          </td>
                          <td className="py-3 px-3 text-slate-500">
                            {formatDate(p.paymentDate)}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800">
                            ₹{p.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {p.paymentMethod.replace('_', ' ')}
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#E8F8F4] text-[#0C8067]">
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => {
                                if (onSelectInvoice) onSelectInvoice(tenant.name);
                                onNavigate('invoice_list');
                              }}
                              className="text-[#035E7B] font-semibold hover:underline"
                            >
                              RC-{p.id} ↗
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 2: Rent & Electricity Bills Ledger */}
            {activeHistoryTab === 'rental' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-2 px-3 rounded-l-lg">Bill / Period</th>
                      <th className="py-2 px-3">Due Date</th>
                      <th className="py-2 px-3">Billed</th>
                      <th className="py-2 px-3">Paid</th>
                      <th className="py-2 px-3">Balance</th>
                      <th className="py-2 px-3 rounded-r-lg text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tenantRentRecords.length === 0 && tenantElectricityBills.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No rent or electricity bills generated for this tenant yet.
                        </td>
                      </tr>
                    ) : (
                      <>
                        {tenantRentRecords.map((r) => (
                          <tr key={`rent-${r.id}`}>
                            <td className="py-3 px-3 font-medium text-slate-800">
                              Rent · {(r.billingMonth || r.dueDate).slice(0, 7)}
                            </td>
                            <td className="py-3 px-3 text-slate-500">{formatDate(r.dueDate)}</td>
                            <td className="py-3 px-3 font-semibold text-slate-800">
                              ₹{r.rentDue.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              ₹{r.received.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-800">
                              ₹{r.balance.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                  r.status === 'Paid'
                                    ? 'bg-[#E8F8F4] text-[#0C8067]'
                                    : r.status === 'Overdue'
                                    ? 'bg-red-50 text-red-600'
                                    : 'bg-[#FFF0DF] text-[#A8680C]'
                                }`}
                              >
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))}

                        {tenantElectricityBills.map((b) => {
                          const paidAmt =
                            b.amountPaid ?? (b.status === 'Paid' ? b.amount : 0);
                          const balAmt = Math.max(0, b.amount - paidAmt);
                          return (
                            <tr key={`elec-${b.id}`}>
                              <td className="py-3 px-3 font-medium text-slate-800">
                                Electricity ({b.meterId}) · {b.units} kWh
                              </td>
                              <td className="py-3 px-3 text-slate-500">{formatDate(b.dueDate)}</td>
                              <td className="py-3 px-3 font-semibold text-slate-800">
                                ₹{b.amount.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-3 text-slate-600">
                                ₹{paidAmt.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-3 font-bold text-slate-800">
                                ₹{balAmt.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    b.status === 'Paid'
                                      ? 'bg-[#E8F8F4] text-[#0C8067]'
                                      : 'bg-[#FFF0DF] text-[#A8680C]'
                                  }`}
                                >
                                  {b.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 3: Security Deposit Details */}
            {activeHistoryTab === 'deposit' && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Security Deposit Amount</span>
                  <strong className="text-sm font-bold text-slate-800">
                    ₹{tenant.securityDeposit.toLocaleString('en-IN')}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Agreement Start Date</span>
                  <strong className="text-slate-700">{formatDate(tenant.moveInDate)}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Refund Status</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8F8F4] text-[#0C8067]">
                    {tenant.status === 'Active' ? 'Held in Escrow / Active' : 'Tenancy Ended'}
                  </span>
                </div>
              </div>
            )}

            <div className="text-[11px] text-slate-400 pt-2">
              Showing live records for {tenant.name} · All amounts in INR
            </div>
          </article>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
        <span>KirayaSaathi · Smart rental management for every property owner</span>
        <span>All amounts in INR · IST</span>
      </footer>
    </div>
  );
};