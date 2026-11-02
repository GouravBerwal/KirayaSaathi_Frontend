import React, { useEffect, useMemo, useState } from 'react';
import { PageType, Property, Room, Tenant } from '../types';
import { ArrowLeft, Info, Check, AlertCircle } from 'lucide-react';

interface TenantDetailProps {
  tenant?: Tenant;
  properties?: Property[];
  rooms?: Room[];
  onNavigate: (page: PageType) => void;
  onUpdateTenant?: (
    updated: Partial<Tenant>,
    agreementUpdate?: {
      propertyId: string;
      roomId: string;
      moveInDate: string;
      agreementEndDate: string;
      monthlyRent: number;
      securityDeposit: number;
      status: 'ACTIVE' | 'COMPLETED' | 'TERMINATED';
      notes: string;
    }
  ) => void | Promise<void>;
}

const toDateInput = (value: string): string => {
  if (!value) return '';

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    const match = value.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);

    if (match) {
      const months: Record<string, string> = {
        Jan: '01',
        Feb: '02',
        Mar: '03',
        Apr: '04',
        May: '05',
        Jun: '06',
        Jul: '07',
        Aug: '08',
        Sep: '09',
        Oct: '10',
        Nov: '11',
        Dec: '12',
      };

      const month =
        months[match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase()];

      if (month) {
        return `${match[3]}-${month}-${match[1].padStart(2, '0')}`;
      }
    }

    return '';
  }

  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(parsed.getDate()).padStart(2, '0')}`;
};

const formatDate = (value: string): string => {
  if (!value) return 'Not set';

  const date = toDateInput(value);

  if (!date) return value;

  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatMoney = (value: number): string =>
  `₹${Number(value || 0).toLocaleString('en-IN')}`;

export const TenantDetail: React.FC<TenantDetailProps> = ({
  tenant,
  properties = [],
  rooms = [],
  onNavigate,
  onUpdateTenant,
}) => {
  const [name, setName] = useState(tenant?.name ?? '');
  const [email, setEmail] = useState(tenant?.email ?? '');
  const [phone, setPhone] = useState(tenant?.phone ?? '');
  const [alternatePhone, setAlternatePhone] = useState(tenant?.alternatePhone ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(toDateInput(tenant?.dateOfBirth ?? ''));
  const [occupation, setOccupation] = useState(tenant?.occupation ?? '');
  const [address, setAddress] = useState(tenant?.permanentAddress ?? '');

  // Agreement & Room Allocation states
  const [selectedPropertyId, setSelectedPropertyId] = useState(tenant?.propertyId ?? '');
  const [selectedRoomId, setSelectedRoomId] = useState(tenant?.roomId ?? '');
  const [moveInDate, setMoveInDate] = useState(
    toDateInput(tenant?.moveInDate ?? '') || new Date().toISOString().slice(0, 10)
  );
  const [agreementEnd, setAgreementEnd] = useState(
    toDateInput(tenant?.agreementEndDate ?? '')
  );
  const [rent, setRent] = useState(String(tenant?.monthlyRent ?? 0));
  const [securityDeposit, setSecurityDeposit] = useState(
    String(tenant?.securityDeposit ?? 0)
  );
  const [agreementStatus, setAgreementStatus] = useState<
    'ACTIVE' | 'COMPLETED' | 'TERMINATED'
  >(tenant?.agreementStatus ?? (tenant?.status === 'Active' ? 'ACTIVE' : 'COMPLETED'));
  const [agreementNotes, setAgreementNotes] = useState(tenant?.agreementNotes ?? '');

  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState(
    tenant?.emergencyContact?.name ?? ''
  );
  const [emergencyRelation, setEmergencyRelation] = useState(
    tenant?.emergencyContact?.relationship ?? ''
  );
  const [emergencyPhone, setEmergencyPhone] = useState(
    tenant?.emergencyContact?.phone ?? ''
  );

  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    setName(tenant?.name ?? '');
    setEmail(tenant?.email ?? '');
    setPhone(tenant?.phone ?? '');
    setAlternatePhone(tenant?.alternatePhone ?? '');
    setDateOfBirth(toDateInput(tenant?.dateOfBirth ?? ''));
    setOccupation(tenant?.occupation ?? '');
    setAddress(tenant?.permanentAddress ?? '');
    setSelectedPropertyId(tenant?.propertyId ?? (properties[0]?.id || ''));
    setSelectedRoomId(tenant?.roomId ?? '');
    setMoveInDate(
      toDateInput(tenant?.moveInDate ?? '') || new Date().toISOString().slice(0, 10)
    );
    setAgreementEnd(toDateInput(tenant?.agreementEndDate ?? ''));
    setRent(String(tenant?.monthlyRent ?? 0));
    setSecurityDeposit(String(tenant?.securityDeposit ?? 0));
    setAgreementStatus(
      tenant?.agreementStatus ?? (tenant?.status === 'Active' ? 'ACTIVE' : 'COMPLETED')
    );
    setAgreementNotes(tenant?.agreementNotes ?? '');
    setEmergencyName(tenant?.emergencyContact?.name ?? '');
    setEmergencyRelation(tenant?.emergencyContact?.relationship ?? '');
    setEmergencyPhone(tenant?.emergencyContact?.phone ?? '');
  }, [tenant, properties]);

  // Show rooms belonging to selectedPropertyId that are either Vacant or already assigned to this tenant
  const selectableRooms = useMemo(() => {
    return rooms.filter(
      (r) =>
        (!selectedPropertyId || r.propertyId === selectedPropertyId) &&
        (r.status === 'Vacant' || r.id === tenant?.roomId)
    );
  }, [rooms, selectedPropertyId, tenant?.roomId]);

  const handleRoomSelect = (newRoomId: string) => {
    setSelectedRoomId(newRoomId);
    const rm = rooms.find((r) => r.id === newRoomId);
    if (rm && newRoomId !== tenant?.roomId) {
      setRent(String(rm.monthlyRent || 0));
      setSecurityDeposit(String(rm.deposit || 0));
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!tenant || !onUpdateTenant) {
      setSaveError(
        'Tenant record nahi mila. Tenant directory se existing tenant open karo.'
      );
      return;
    }

    if (isSaving) return;

    setIsSaving(true);
    setSaveError('');
    setShowToast(false);

    try {
      const selectedRoomObj = rooms.find((r) => r.id === selectedRoomId);
      const selectedPropObj = properties.find(
        (p) => p.id === (selectedRoomObj?.propertyId || selectedPropertyId)
      );

      await onUpdateTenant(
        {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          alternatePhone: alternatePhone.trim(),
          dateOfBirth: dateOfBirth || undefined,
          occupation: occupation.trim(),
          permanentAddress: address.trim(),
          propertyId: selectedPropObj?.id ?? tenant.propertyId,
          propertyName: selectedPropObj?.name ?? tenant.propertyName,
          roomId: selectedRoomId,
          roomNumber: selectedRoomObj?.number ?? tenant.roomNumber,
          monthlyRent: Number(rent) || 0,
          securityDeposit: Number(securityDeposit) || 0,
          moveInDate,
          agreementEndDate: agreementEnd,
          status: agreementStatus === 'ACTIVE' && selectedRoomId ? 'Active' : 'Past',
          agreementStatus,
          agreementNotes: agreementNotes.trim(),
          emergencyContact: {
            ...tenant.emergencyContact,
            name: emergencyName.trim(),
            relationship: emergencyRelation,
            phone: emergencyPhone.trim(),
          },
        },
        selectedRoomId
          ? {
              propertyId: selectedPropObj?.id || selectedPropertyId,
              roomId: selectedRoomId,
              moveInDate,
              agreementEndDate: agreementEnd,
              monthlyRent: Number(rent) || 0,
              securityDeposit: Number(securityDeposit) || 0,
              status: agreementStatus,
              notes: agreementNotes.trim(),
            }
          : undefined
      );

      setShowToast(true);

      window.setTimeout(() => {
        setShowToast(false);
        onNavigate('tenant_profile');
      }, 1200);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : 'Tenant details save nahi ho paaye. Dobara try karo.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  const selectedRoomObj = rooms.find((r) => r.id === selectedRoomId);
  const selectedPropObj = properties.find(
    (p) => p.id === (selectedRoomObj?.propertyId || selectedPropertyId)
  );

  const currentProperty =
    selectedPropObj?.name || tenant?.propertyName || 'Property not assigned';
  const currentRoom = selectedRoomObj?.number
    ? `Room ${selectedRoomObj.number}`
    : tenant?.roomNumber
    ? `Room ${tenant.roomNumber}`
    : 'Room not assigned';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <button
          type="button"
          onClick={() => onNavigate('tenant_profile')}
          className="hover:text-[#035E7B] flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-4 h-4 text-[#035E7B]" />
          <span>Tenants / {tenant?.name ?? 'Tenant'} / Edit</span>
        </button>
      </div>

      {/* Heading */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight">
          Edit {tenant?.name ?? 'Tenant'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Update contact information, room allocation, and rental agreement terms in the backend.
        </p>
      </div>

      {!tenant && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        >
          Tenant select nahi hua hai. Tenant directory se kisi existing tenant ko select karke edit page kholo.
        </div>
      )}

      {saveError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-center gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"
      >
        {/* Left Form Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal & Contact Details */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
            <h2 className="text-sm sm:text-base font-bold text-slate-800">
              Personal &amp; contact details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mobile number *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Alternate mobile number
                </label>
                <input
                  type="tel"
                  value={alternatePhone}
                  onChange={(e) => setAlternatePhone(e.target.value)}
                  placeholder="Optional"
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Date of birth
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Occupation / Role
                </label>
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder="e.g. Software Engineer / Student"
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Permanent address *
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
                />
              </div>
            </div>
          </section>

          {/* Dynamic Room Allocation */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-800">
                Room allocation &amp; property
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Assign a vacant room or update the current room allocation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Property
                </label>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => {
                    setSelectedPropertyId(e.target.value);
                    setSelectedRoomId('');
                  }}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:border-[#035E7B]"
                >
                  <option value="">Select Property</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Allocated Room
                </label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => handleRoomSelect(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:border-[#035E7B]"
                >
                  <option value="">No room assigned</option>
                  {selectableRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.number} ({r.type}) — {r.id === tenant?.roomId ? 'Current' : 'Vacant'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Interactive Room Cards */}
            {selectableRooms.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {selectableRooms.slice(0, 6).map((rm) => {
                  const isSelected = rm.id === selectedRoomId;
                  return (
                    <button
                      type="button"
                      key={rm.id}
                      onClick={() => handleRoomSelect(rm.id)}
                      className={`p-4 rounded-xl border-2 text-left flex flex-col justify-between min-h-[96px] transition ${
                        isSelected
                          ? 'border-[#035E7B] bg-[#E8F4F7]'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <strong className="text-sm font-bold text-slate-800">
                          Room {rm.number}
                        </strong>
                        <span
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? 'border-[#035E7B] bg-[#035E7B]'
                              : 'border-slate-300'
                          }`}
                        >
                          {isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-2">
                        {formatMoney(rm.monthlyRent)} / month · {rm.type}
                      </p>
                      <span className="text-[10px] font-bold mt-2 text-[#035E7B]">
                        {rm.id === tenant?.roomId ? 'Current allocation' : 'Available to assign'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Tenancy & Billing Agreement */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
            <h2 className="text-sm sm:text-base font-bold text-slate-800">
              Tenancy &amp; billing agreement
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Move-in date
                </label>
                <input
                  type="date"
                  value={moveInDate}
                  onChange={(e) => setMoveInDate(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Agreement end date
                </label>
                <input
                  type="date"
                  value={agreementEnd}
                  min={moveInDate || undefined}
                  onChange={(e) => setAgreementEnd(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Monthly rent (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 inset-y-0 flex items-center text-slate-400 text-xs">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={rent}
                    onChange={(e) => setRent(e.target.value)}
                    className="w-full h-10 pl-7 pr-3 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-[#035E7B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Security deposit held (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 inset-y-0 flex items-center text-slate-400 text-xs">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(e.target.value)}
                    className="w-full h-10 pl-7 pr-3 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-[#035E7B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Agreement status
                </label>
                <select
                  value={agreementStatus}
                  onChange={(e) =>
                    setAgreementStatus(
                      e.target.value as 'ACTIVE' | 'COMPLETED' | 'TERMINATED'
                    )
                  }
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:border-[#035E7B]"
                >
                  <option value="ACTIVE">Active Tenancy</option>
                  <option value="COMPLETED">Completed (Moved Out)</option>
                  <option value="TERMINATED">Terminated</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Agreement notes
                </label>
                <input
                  type="text"
                  value={agreementNotes}
                  onChange={(e) => setAgreementNotes(e.target.value)}
                  placeholder="Optional remarks..."
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
                />
              </div>
            </div>
          </section>

          {/* Emergency Contact */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
            <h2 className="text-sm sm:text-base font-bold text-slate-800">
              Emergency contact
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Contact name
                </label>
                <input
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Relationship
                </label>
                <select
                  value={emergencyRelation}
                  onChange={(e) => setEmergencyRelation(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:border-[#035E7B]"
                >
                  <option value="">Select relationship</option>
                  <option value="Mother">Mother</option>
                  <option value="Father">Father</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Friend">Friend</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mobile number
                </label>
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
                />
              </div>
            </div>
          </section>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <span className="text-xs text-slate-400">* Required fields</span>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => onNavigate('tenant_profile')}
                className="flex-1 sm:flex-initial px-5 h-10 border border-slate-200 rounded-xl text-xs font-semibold text-[#035E7B] bg-white hover:bg-slate-50 transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving || !tenant}
                className="flex-1 sm:flex-initial px-6 h-10 bg-[#035E7B] hover:bg-[#024B63] text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95 disabled:opacity-60"
              >
                {isSaving ? 'Saving to backend...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Dossier Column */}
        <aside className="space-y-5">
          {/* Tenant Summary */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[#EAF4F7] text-[#035E7B] flex items-center justify-center font-bold text-base shrink-0">
                {initials || '?'}
              </div>

              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-800">
                  {name || 'Tenant'}
                </h3>
                <p className="text-[10px] text-slate-400">
                  Tenant ID: {tenant?.id ?? '—'} · Agreement #{tenant?.agreementId ?? 'New'}
                </p>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">
                  Selected room
                </span>
                <strong className="text-slate-800 block mt-0.5">
                  {currentProperty} · {currentRoom}
                </strong>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px]">
                  Monthly rent
                </span>
                <strong className="text-slate-800 block mt-0.5">
                  {formatMoney(Number(rent) || 0)}
                </strong>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px]">
                  Outstanding balance
                </span>
                <strong className="text-slate-800 block mt-0.5">
                  {formatMoney(tenant?.balance ?? 0)}
                </strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('tenant_profile')}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#035E7B] rounded-xl text-xs font-bold transition"
            >
              View profile
            </button>
          </div>

          {/* Payment Info */}
          <div className="bg-[#E8F4F7] rounded-xl p-4 flex items-start gap-3 text-xs">
            <Info className="w-4 h-4 text-[#0D8AB0] shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-slate-800 block">
                Live Backend Sync
              </strong>
              <p className="text-slate-500 mt-0.5 text-[11px] leading-relaxed">
                Saving updates both the Tenant model and the active RentalAgreement in your Django database.
              </p>
            </div>
          </div>

          {/* Room Information */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-2.5">
            <h3 className="text-xs font-bold text-slate-800">
              Move-in date
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Changing agreement status to Completed or Terminated will automatically release the assigned room back to Vacant.
            </p>
            <div className="text-xs font-bold text-[#035E7B] pt-1">
              {formatDate(moveInDate)}
            </div>
          </div>
        </aside>
      </form>

      {/* Success Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-emerald-300 rounded-2xl p-4 shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <div className="text-xs font-bold text-slate-800">
              Tenant &amp; agreement updated
            </div>
            <div className="text-[11px] text-slate-500">
              {name}&apos;s profile has been saved to the backend.
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
        <span>
          KirayaSaathi · Smart rental management for every property owner
        </span>
        <span>All amounts in INR · IST</span>
      </footer>
    </div>
  );
};