import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../utils/api';
import type { PageType, Property, Room } from '../types';

type CreatedTenant = {
  id: number;
  full_name: string;
};

type CreatedAgreement = {
  id: number;
  tenant: number;
  room: number;
};

type AddTenantPageProps = {
  properties: Property[];
  rooms: Room[];
  preselectedRoom?: Room | null;
  onNavigate: (page: PageType) => void;
  onTenantCreated: () => void | Promise<void>;
};

export function AddTenantPage({
  properties,
  rooms,
  preselectedRoom = null,
  onNavigate,
  onTenantCreated,
}: AddTenantPageProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  const [propertyId, setPropertyId] = useState(
    preselectedRoom?.propertyId || ''
  );
  const [roomId, setRoomId] = useState(preselectedRoom?.id || '');
  const [moveInDate, setMoveInDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [agreementEndDate, setAgreementEndDate] = useState('');
  const [monthlyRent, setMonthlyRent] = useState(
    preselectedRoom ? String(preselectedRoom.monthlyRent || '') : ''
  );
  const [securityDeposit, setSecurityDeposit] = useState(
    preselectedRoom ? String(preselectedRoom.deposit || '') : ''
  );
  const [notes, setNotes] = useState('');
  const [generateInitialRentBill, setGenerateInitialRentBill] = useState(true);

  const [createdTenant, setCreatedTenant] = useState<CreatedTenant | null>(
    null,
  );
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync preselected room if passed from RoomsPage "Allocate" button
  useEffect(() => {
    if (preselectedRoom) {
      setPropertyId(String(preselectedRoom.propertyId));
      setRoomId(String(preselectedRoom.id));
      setMonthlyRent(String(preselectedRoom.monthlyRent || 0));
      setSecurityDeposit(String(preselectedRoom.deposit || 0));
    }
  }, [preselectedRoom]);

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === propertyId),
    [properties, propertyId]
  );

  const propertyRooms = useMemo(
    () => rooms.filter((room) => room.propertyId === propertyId),
    [rooms, propertyId]
  );

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === roomId),
    [rooms, roomId]
  );

  useEffect(() => {
    if (!roomId) return;

    const currentRoom = rooms.find((room) => room.id === roomId);
    if (!currentRoom) return;

    const cap = currentRoom.capacity || 1;
    const baseRent = Number(currentRoom.monthlyRent || selectedProperty?.monthlyRent || 0);
    const baseDeposit = Number(currentRoom.deposit || selectedProperty?.securityDeposit || 0);

    const splitRent = cap > 1 ? Math.round(baseRent / cap) : baseRent;
    const splitDeposit = cap > 1 ? Math.round(baseDeposit / cap) : baseDeposit;

    setMonthlyRent(String(splitRent));
    setSecurityDeposit(String(splitDeposit));
  }, [roomId, rooms, selectedProperty]);

  const handlePropertyChange = (value: string) => {
    setPropertyId(value);
    setRoomId('');
    const prop = properties.find((p) => p.id === value);
    setMonthlyRent(prop ? String(prop.monthlyRent || '') : '');
    setSecurityDeposit(prop ? String(prop.securityDeposit || '') : '');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!fullName.trim() || !phone.trim()) {
      setError('Tenant ka naam aur phone number required hai.');
      return;
    }

    if (!createdTenant && roomId && !propertyId) {
      setError('Pehle property select karein.');
      return;
    }

    if (!createdTenant && roomId && !moveInDate) {
      setError('Move-in date select karein.');
      return;
    }

    setIsSubmitting(true);

    try {
      let tenant = createdTenant;

      if (!tenant) {
        tenant = await apiRequest<CreatedTenant>('/api/tenants/', {
          method: 'POST',
          body: {
            full_name: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            alternate_phone: alternatePhone.trim(),
            date_of_birth: dateOfBirth || null,
            address: address.trim(),
            emergency_contact_name: emergencyName.trim(),
            emergency_contact_phone: emergencyPhone.trim(),
          },
        });

        setCreatedTenant(tenant);
      }

      if (roomId) {
        const createdAgreement = await apiRequest<CreatedAgreement>(
          '/api/tenants/rental-agreements/',
          {
            method: 'POST',
            body: {
              tenant: tenant.id,
              room: Number(roomId),
              start_date: moveInDate,
              end_date: agreementEndDate || null,
              monthly_rent: Number(monthlyRent || 0).toFixed(2),
              security_deposit: Number(securityDeposit || 0).toFixed(2),
              status: 'ACTIVE',
              notes: notes.trim(),
            },
          },
        );

        try {
          await apiRequest(`/api/properties/rooms/${roomId}/`, {
            method: 'PATCH',
            body: { status: 'OCCUPIED' },
          });
        } catch {
          // Ignore if backend signal already updated room status
        }

        if (generateInitialRentBill && createdAgreement?.id) {
          try {
            const billingMonth = `${moveInDate.slice(0, 7)}-01`;
            const dueDay = selectedProperty?.rentDueDay || 5;
            const [yStr, mStr] = billingMonth.split('-');
            const maxDays = new Date(Number(yStr), Number(mStr), 0).getDate();
            const validDay = Math.min(Math.max(1, dueDay), maxDays);
            const dueDateIso = `${yStr}-${mStr}-${String(validDay).padStart(2, '0')}`;

            await apiRequest('/api/billing/', {
              method: 'POST',
              body: {
                agreement: createdAgreement.id,
                billing_month: billingMonth,
                rent_amount: Number(monthlyRent || 0).toFixed(2),
                due_date: dueDateIso,
                notes: 'Initial rent bill created upon tenant onboarding',
              },
            });
          } catch {
            // Ignore if a rent bill for this month already exists
          }
        }
      }

      setSuccess(
        roomId
          ? 'Tenant, room allocation aur rental agreement successfully save ho gaye.'
          : 'Tenant profile successfully create ho gayi.',
      );

      await onTenantCreated();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Tenant save nahi ho paaya. Dobara try karein.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setAlternatePhone('');
    setDateOfBirth('');
    setAddress('');
    setEmergencyName('');
    setEmergencyPhone('');
    setPropertyId('');
    setRoomId('');
    setMoveInDate(new Date().toISOString().slice(0, 10));
    setAgreementEndDate('');
    setMonthlyRent('');
    setSecurityDeposit('');
    setNotes('');
    setCreatedTenant(null);
    setError('');
    setSuccess('');
  };

  const inputClass =
    'mt-1 w-full rounded-lg border border-[#D5E2E7] bg-white px-3 py-2.5 text-sm text-[#142D3B] outline-none focus:border-[#035E7B] focus:ring-2 focus:ring-[#035E7B]/10';

  const labelClass = 'block text-sm font-medium text-[#294553]';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => onNavigate('tenants')}
            className="mb-2 text-sm text-[#035E7B] hover:underline"
          >
            ← Back to Tenants
          </button>
          <h1 className="text-2xl font-bold text-[#142D3B]">Add Tenant</h1>
          <p className="mt-1 text-sm text-gray-500">
            Tenant details aur room rental agreement backend mein save karein.
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p>{error}</p>
          {createdTenant && (
            <p className="mt-2">
              Tenant <strong>{createdTenant.full_name}</strong> pehle hi create ho chuka hai.
              Form dobara submit karne par tenant duplicate nahi hoga; sirf selected
              room ka agreement retry hoga.
            </p>
          )}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          <p className="font-semibold">{success}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate('tenants')}
              className="rounded-lg bg-[#035E7B] px-4 py-2 font-medium text-white"
            >
              View Tenants Directory
            </button>
            <button
              type="button"
              onClick={() => onNavigate('rooms')}
              className="rounded-lg border border-green-300 bg-white px-4 py-2 font-medium text-green-900"
            >
              Back to Rooms
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-green-300 bg-white px-4 py-2 font-medium text-green-900"
            >
              Add Another Tenant
            </button>
          </div>
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-xl border border-[#DCE8EC] bg-white p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Personal Information</h2>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className={labelClass}>
                Full Name *
                <input
                  className={inputClass}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={Boolean(createdTenant)}
                  maxLength={150}
                  placeholder="Enter tenant full name"
                />
              </label>

              <label className={labelClass}>
                Phone Number *
                <input
                  className={inputClass}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  disabled={Boolean(createdTenant)}
                  maxLength={15}
                  inputMode="tel"
                  placeholder="Enter 10-digit mobile number"
                />
              </label>

              <label className={labelClass}>
                Email
                <input
                  className={inputClass}
                  type="email"
                  value={email}
                  disabled={Boolean(createdTenant)}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tenant@example.com"
                />
              </label>

              <label className={labelClass}>
                Alternate Phone
                <input
                  className={inputClass}
                  value={alternatePhone}
                  disabled={Boolean(createdTenant)}
                  onChange={(e) => setAlternatePhone(e.target.value)}
                  maxLength={15}
                  inputMode="tel"
                  placeholder="Optional alternate phone"
                />
              </label>

              <label className={labelClass}>
                Date of Birth
                <input
                  className={inputClass}
                  type="date"
                  value={dateOfBirth}
                  disabled={Boolean(createdTenant)}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </label>

              <label className={`${labelClass} sm:col-span-2`}>
                Permanent Address
                <textarea
                  className={inputClass}
                  value={address}
                  disabled={Boolean(createdTenant)}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  placeholder="Enter permanent residential address"
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-[#DCE8EC] bg-white p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Emergency Contact</h2>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className={labelClass}>
                Contact Name
                <input
                  className={inputClass}
                  value={emergencyName}
                  disabled={Boolean(createdTenant)}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  maxLength={150}
                  placeholder="Parent / Guardian / Spouse name"
                />
              </label>

              <label className={labelClass}>
                Contact Phone
                <input
                  className={inputClass}
                  value={emergencyPhone}
                  disabled={Boolean(createdTenant)}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  maxLength={15}
                  inputMode="tel"
                  placeholder="Emergency contact mobile number"
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-[#DCE8EC] bg-white p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Room &amp; Rental Agreement</h2>
            <p className="mt-1 text-sm text-gray-500">
              Room assign karna optional hai. Room select karne par active RentalAgreement banega aur room Occupied mark ho jayega.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className={labelClass}>
                Property
                <select
                  className={inputClass}
                  value={propertyId}
                  onChange={(e) => handlePropertyChange(e.target.value)}
                >
                  <option value="">No property selected</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className={labelClass}>
                Select Room & Bed Allocation
                <select
                  className={inputClass}
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  disabled={!propertyId}
                >
                  <option value="">Do not assign a room yet</option>
                  {propertyRooms.map((room) => {
                    const cap = room.capacity || 1;
                    const occ = room.occupiedBeds ?? (room.status === 'Occupied' ? 1 : 0);
                    const vac = Math.max(0, cap - occ);
                    const isFull = occ >= cap && room.status !== 'Vacant';
                    const isMaint = room.status === 'Maintenance';
                    return (
                      <option
                        key={room.id}
                        value={room.id}
                        disabled={isMaint || (isFull && room.id !== preselectedRoom?.id)}
                      >
                        Room {room.number} — {room.type} (
                        {isMaint
                          ? 'Under Maintenance'
                          : isFull
                          ? `FULL · ${occ}/${cap} beds occupied`
                          : occ > 0
                          ? `${occ}/${cap} occupied · ${vac} bed${vac > 1 ? 's' : ''} available`
                          : `Vacant · ${cap} bed${cap > 1 ? 's' : ''} available`}
                        ) · Total ₹{room.monthlyRent}/mo
                      </option>
                    );
                  })}
                </select>
                {propertyId && propertyRooms.length > 0 && propertyRooms.every(r => (r.occupiedBeds ?? 0) >= (r.capacity || 1)) && (
                  <span className="mt-1 block text-xs text-amber-700">
                    Is property ke saare rooms full hain.
                  </span>
                )}
              </label>

              {selectedRoom && (
                <div className="sm:col-span-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="font-semibold text-slate-800">
                    Room {selectedRoom.number} ({selectedRoom.type}) · Capacity: {selectedRoom.capacity || 1} Tenant{(selectedRoom.capacity || 1) > 1 ? 's' : ''}
                  </div>
                  <div className="text-slate-600">
                    {(selectedRoom.capacity || 1) > 1 ? (
                      <span>
                        • <strong>Room Sharing Mode:</strong> Total room rent ₹{Number(selectedRoom.monthlyRent).toLocaleString('en-IN')} has been split to <strong>₹{Number(monthlyRent).toLocaleString('en-IN')}</strong>/tenant ({Math.round(100 / (selectedRoom.capacity || 1))}% per bed). You can adjust this amount below.<br />
                        • Electricity bills will also automatically split equally among occupants of this room.
                      </span>
                    ) : (
                      <span>
                        • <strong>Single Occupancy Mode:</strong> 100% room rent and room electricity bill will be assigned to this tenant.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {selectedProperty && (
                <p className="text-xs text-slate-500 sm:col-span-2">
                  Selected property: <strong>{selectedProperty.name}</strong> · Default Rent Due Day: {selectedProperty.rentDueDay}th of month
                </p>
              )}

              <label className={labelClass}>
                Move-in Date {roomId ? '*' : ''}
                <input
                  className={inputClass}
                  type="date"
                  value={moveInDate}
                  onChange={(e) => setMoveInDate(e.target.value)}
                  required={Boolean(roomId)}
                />
              </label>

              <label className={labelClass}>
                Agreement End Date
                <input
                  className={inputClass}
                  type="date"
                  value={agreementEndDate}
                  min={moveInDate || undefined}
                  onChange={(e) => setAgreementEndDate(e.target.value)}
                />
              </label>

              <label className={labelClass}>
                Monthly Rent (₹) {roomId ? '*' : ''}
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.01"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(e.target.value)}
                  required={Boolean(roomId)}
                  placeholder="0.00"
                />
              </label>

              <label className={labelClass}>
                Security Deposit (₹)
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.01"
                  value={securityDeposit}
                  onChange={(e) => setSecurityDeposit(e.target.value)}
                  placeholder="0.00"
                />
              </label>

              <label className={`${labelClass} sm:col-span-2`}>
                Agreement Notes
                <textarea
                  className={inputClass}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional rental agreement terms or remarks"
                />
              </label>

              {roomId && (
                <label className="flex items-center gap-2.5 text-sm text-[#142D3B] sm:col-span-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateInitialRentBill}
                    onChange={(e) => setGenerateInitialRentBill(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#035E7B] focus:ring-[#035E7B]"
                  />
                  <span>
                    Automatically generate first month&apos;s rent bill ({moveInDate.slice(0, 7)}) in Rent Management
                  </span>
                </label>
              )}
            </div>
          </section>

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => onNavigate('tenants')}
              className="rounded-lg border border-[#CADCE2] px-5 py-2.5 text-sm font-medium hover:bg-white"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-[#035E7B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#024C63] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? 'Saving to backend...'
                : createdTenant
                ? 'Save Room Agreement'
                : 'Create Tenant'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default AddTenantPage;