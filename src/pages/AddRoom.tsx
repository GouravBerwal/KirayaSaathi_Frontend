import React, { useEffect, useMemo, useState } from 'react';
import { PageType, Property, Room } from '../types';
import {
  ArrowLeft,
  Building,
  Plus,
  DoorOpen,
  Users,
  Wallet,
  CheckCircle2,
  X,
  LoaderCircle,
  AlertCircle,
  Zap,
} from 'lucide-react';

interface AddRoomProps {
  onNavigate: (page: PageType) => void;
  onAddRoomSubmit: (
    newRoom: Room,
    stayOnPage?: boolean
  ) => void | Promise<void>;
  properties?: Property[];
  rooms?: Room[];
  defaultPropertyId?: string;
}

export const AddRoom: React.FC<AddRoomProps> = ({
  onNavigate,
  onAddRoomSubmit,
  properties = [],
  rooms = [],
  defaultPropertyId = '',
}) => {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    defaultPropertyId || (properties[0] ? String(properties[0].id) : '')
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [roomNumber, setRoomNumber] = useState('');
  const [floor, setFloor] = useState('First floor');
  const [roomType, setRoomType] = useState('Single Room');
  const [status, setStatus] = useState<'Vacant' | 'Occupied' | 'Maintenance'>('Vacant');
  const [rent, setRent] = useState('12000');
  const [deposit, setDeposit] = useState('24000');
  const [meterId, setMeterId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Auto-select first property when properties load
  useEffect(() => {
    if (!selectedPropertyId && properties.length > 0) {
      setSelectedPropertyId(String(properties[0].id));
    }
  }, [properties, selectedPropertyId]);

  const selectedProperty = useMemo(
    () =>
      properties.find(
        (property) => String(property.id) === String(selectedPropertyId)
      ),
    [properties, selectedPropertyId]
  );

  // Sync default rent and security deposit from the selected property's defaults
  useEffect(() => {
    if (selectedProperty) {
      if (selectedProperty.monthlyRent > 0) {
        setRent(String(selectedProperty.monthlyRent));
      }
      if (selectedProperty.securityDeposit > 0) {
        setDeposit(String(selectedProperty.securityDeposit));
      }
    }
  }, [selectedProperty]);

  // All backend rooms belonging to the selected property (or all rooms if none selected)
  const propertyRooms = useMemo(() => {
    if (!selectedPropertyId) return rooms;
    return rooms.filter(
      (room) => String(room.propertyId) === String(selectedPropertyId)
    );
  }, [rooms, selectedPropertyId]);

  const allocatedTenantsCount = useMemo(
    () =>
      propertyRooms.filter(
        (room) => room.status === 'Occupied' || Boolean(room.tenantName)
      ).length,
    [propertyRooms]
  );

  const totalRentPotential = useMemo(
    () =>
      propertyRooms.reduce(
        (sum, room) => sum + (Number(room.monthlyRent) || 0),
        0
      ),
    [propertyRooms]
  );

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(''), 3000);
  };

  const handleCreateRoom = async (
    event: React.FormEvent<HTMLFormElement>,
    stayOnPage = true
  ) => {
    event.preventDefault();
    setError('');

    if (!selectedProperty) {
      setError('Please select a property first.');
      return;
    }

    if (!roomNumber.trim()) {
      setError('Please enter a room number.');
      return;
    }

    if (Number(rent) < 0 || rent === '' || !Number.isFinite(Number(rent))) {
      setError('Please enter a valid monthly rent.');
      return;
    }

    if (
      deposit === '' ||
      Number(deposit) < 0 ||
      !Number.isFinite(Number(deposit))
    ) {
      setError('Please enter a valid security deposit.');
      return;
    }

    const duplicate = propertyRooms.some(
      (room) =>
        room.number.trim().toLowerCase() === roomNumber.trim().toLowerCase()
    );

    if (duplicate) {
      setError(
        `Room "${roomNumber.trim()}" already exists in ${selectedProperty.name}.`
      );
      return;
    }

    const capacity =
      roomType.includes('Double') || roomType.includes('Twin')
        ? 2
        : roomType.includes('Triple')
        ? 3
        : roomType.includes('Four') || roomType.includes('Shared')
        ? 4
        : 1;

    const createdRoom: Room = {
      id: `room-${Date.now()}`,
      number: roomNumber.trim(),
      propertyId: String(selectedProperty.id),
      propertyName: selectedProperty.name,
      floor,
      type: roomType,
      capacity,
      occupiedBeds: 0,
      vacantBeds: capacity,
      isFull: false,
      occupants: [],
      tenantName: null,
      tenantId: null,
      moveInDate: null,
      monthlyRent: Number(rent),
      deposit: Number(deposit),
      status,
      meterId: meterId.trim() || undefined,
    };

    try {
      setLoading(true);

      await onAddRoomSubmit(createdRoom, stayOnPage);

      setShowAddModal(false);
      setRoomNumber('');
      setMeterId('');
      setStatus('Vacant');
      setError('');

      showToast(
        `Room ${createdRoom.number} saved to ${selectedProperty.name} successfully!`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Room could not be saved. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fullPropertyAddress = selectedProperty
    ? [
        selectedProperty.address,
        selectedProperty.city,
        selectedProperty.state,
        selectedProperty.pinCode,
      ]
        .filter(Boolean)
        .join(', ')
    : 'Select a property to add and view its rooms.';

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="space-y-2">
        <button
          type="button"
          onClick={() => onNavigate('rooms')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-[#035E7B]"
        >
          <ArrowLeft className="h-4 w-4 text-[#035E7B]" />
          Rooms / Add room
        </button>

        <div className="flex flex-col justify-between gap-4 pt-1 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">
              Every room, ready to manage
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Add rooms to your property in the backend and optionally link an electricity meter.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={selectedPropertyId}
              onChange={(event) => setSelectedPropertyId(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-[#035E7B] shadow-sm focus:border-[#035E7B] focus:outline-none"
            >
              <option value="">Select a property</option>
              {properties.map((property) => (
                <option key={property.id} value={String(property.id)}>
                  {property.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                setError('');
                setShowAddModal(true);
              }}
              disabled={properties.length === 0}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#035E7B] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#024B63] disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>New room</span>
            </button>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#A8CBD6]/50 bg-[#EAF4F7] p-4 sm:p-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#035E7B] shadow-sm">
            <Building className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-800">
              {selectedProperty?.name || 'No property selected'}
            </div>
            <div className="mt-0.5 text-xs text-slate-500 truncate">
              {fullPropertyAddress}
            </div>
          </div>
        </div>

        {selectedProperty && (
          <div className="hidden sm:flex items-center gap-4 text-xs text-slate-600 shrink-0">
            <div>
              <span className="text-[10px] text-slate-400 block">Default Rent</span>
              <strong className="text-slate-800">
                ₹{selectedProperty.monthlyRent.toLocaleString('en-IN')}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Electricity Rate</span>
              <strong className="text-slate-800">
                ₹{selectedProperty.electricityRate.toFixed(2)}/kWh
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* Live Dynamic Stat Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total rooms in property"
          value={String(propertyRooms.length)}
          detail={
            selectedProperty
              ? `Live inventory for ${selectedProperty.name}`
              : 'Across all properties'
          }
          icon={<DoorOpen className="h-4 w-4 text-[#0D8AB0]" />}
        />
        <StatCard
          label="Occupied / Allocated"
          value={String(allocatedTenantsCount)}
          detail={`${Math.max(0, propertyRooms.length - allocatedTenantsCount)} vacant or in maintenance`}
          icon={<Users className="h-4 w-4 text-[#0D8AB0]" />}
        />
        <StatCard
          label="Monthly rent potential"
          value={`₹${totalRentPotential.toLocaleString('en-IN')}`}
          detail="Combined monthly rent of rooms listed below"
          icon={<Wallet className="h-4 w-4 text-[#0D8AB0]" />}
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Room inventory {selectedProperty ? `· ${selectedProperty.name}` : ''}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Synced live with Django backend rooms &amp; meters
            </p>
          </div>
          <span className="text-xs font-semibold text-[#035E7B]">
            {propertyRooms.length} room{propertyRooms.length === 1 ? '' : 's'}
          </span>
        </div>

        {propertyRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-6 flex items-center gap-2 rounded-full bg-[#EAF6F8] p-3">
              {['A-101', 'A-102', 'A-103'].map((number) => (
                <div
                  key={number}
                  className="flex h-20 w-16 flex-col items-center justify-center gap-1 rounded-xl border border-[#A9CFDD] bg-white text-[#035E7B]"
                >
                  <DoorOpen className="h-5 w-5" />
                  <span className="text-[10px] font-bold">{number}</span>
                </div>
              ))}
            </div>

            <h3 className="text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">
              A fresh start for every room
            </h3>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-500 sm:text-sm">
              {selectedProperty
                ? `No rooms have been added to ${selectedProperty.name} yet. Add your first room to start tracking rent and occupancy.`
                : 'Select or create a property first to start adding rooms.'}
            </p>

            <button
              type="button"
              onClick={() => {
                setError('');
                setShowAddModal(true);
              }}
              disabled={properties.length === 0}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#035E7B] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#024B63] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add first room
            </button>

            {properties.length === 0 && (
              <button
                type="button"
                onClick={() => onNavigate('add_property')}
                className="mt-3 text-xs font-bold text-[#035E7B] hover:underline"
              >
                + Create a property first →
              </button>
            )}
          </div>
        ) : (
          <div className="p-6">
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {propertyRooms.map((room) => (
                <div
                  key={room.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-[#035E7B]/40 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <strong className="text-sm font-bold text-slate-800">
                        Room {room.number}
                      </strong>
                      <div className="mt-1 text-[11px] text-slate-500">
                        {room.floor} · {room.type}
                      </div>
                      <div className="mt-0.5 text-[10px] text-slate-400">
                        {room.propertyName}
                      </div>
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        room.status === 'Occupied'
                          ? 'bg-[#E8F8F4] text-[#0C8067]'
                          : room.status === 'Maintenance'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-[#FFF6E8] text-[#A8680C]'
                      }`}
                    >
                      {room.status}
                    </span>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/60 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Monthly Rent</span>
                      <strong className="font-bold text-slate-800">
                        ₹{room.monthlyRent.toLocaleString('en-IN')}
                      </strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Tenant</span>
                      <span className="font-medium text-slate-700 truncate max-w-[120px]">
                        {room.tenantName || 'Unassigned'}
                      </span>
                    </div>
                    {room.meterId && (
                      <div className="flex justify-between text-[10px] text-[#035E7B]">
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" /> Meter
                        </span>
                        <span className="font-semibold">{room.meterId}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setShowAddModal(true);
                }}
                disabled={properties.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-[#035E7B] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#024B63] disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add another room
              </button>
              <button
                type="button"
                onClick={() => onNavigate('rooms')}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-[#035E7B] transition hover:bg-slate-50"
              >
                Manage all rooms
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 pt-2 sm:grid-cols-3">
        <Tip
          icon={<DoorOpen className="h-4 w-4" />}
          title="Name each room"
          text="Use familiar numbers such as A-101, A-102 and B-201."
        />
        <Tip
          icon={<Wallet className="h-4 w-4" />}
          title="Auto-link electricity meter"
          text="Entering a Meter Reference automatically registers an ElectricityMeter for that room in the backend."
        />
        <Tip
          icon={<Users className="h-4 w-4" />}
          title="Welcome a tenant"
          text="Allocate a tenant once the room is saved."
        />
      </section>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close room form"
            className="fixed inset-0 cursor-default bg-slate-900/40 backdrop-blur-sm"
            onClick={() => !loading && setShowAddModal(false)}
          />

          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Add room to backend
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  {selectedProperty?.name || 'Select a property'}
                </p>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => void handleCreateRoom(e, true)}
              className="space-y-4 p-6"
            >
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Property *
                </label>
                <select
                  required
                  value={selectedPropertyId}
                  onChange={(event) => setSelectedPropertyId(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Select property</option>
                  {properties.map((property) => (
                    <option key={property.id} value={String(property.id)}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Room number *">
                  <input
                    required
                    value={roomNumber}
                    onChange={(event) => setRoomNumber(event.target.value)}
                    placeholder="e.g. A-101"
                    className={inputClass}
                  />
                </Field>
                <Field label="Floor *">
                  <select
                    value={floor}
                    onChange={(event) => setFloor(event.target.value)}
                    className={inputClass}
                  >
                    <option value="Ground floor">Ground floor</option>
                    <option value="First floor">First floor</option>
                    <option value="Second floor">Second floor</option>
                    <option value="Third floor">Third floor</option>
                    <option value="Fourth floor">Fourth floor</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Room type *
                  </label>
                  <select
                    value={roomType}
                    onChange={(event) => setRoomType(event.target.value)}
                    className={inputClass}
                  >
                    <option value="Single Room">Single Room (1 Person)</option>
                    <option value="Double Sharing">Double Sharing (2 Persons)</option>
                    <option value="Triple Sharing">Triple Sharing (3 Persons)</option>
                    <option value="Four Sharing">Four Sharing (4 Persons)</option>
                    <option value="Shared">Shared Room (Multi-bed)</option>
                    <option value="1 BHK">1 BHK</option>
                    <option value="2 BHK">2 BHK</option>
                    <option value="Studio">Studio</option>
                  </select>
                  <p className="mt-1 text-[10px] text-slate-500 font-medium">
                    {roomType.includes('Double')
                      ? 'Capacity: 2 Tenants · Rent & electricity split 50/50 per tenant'
                      : roomType.includes('Triple')
                      ? 'Capacity: 3 Tenants · Rent & electricity split 33.3% per tenant'
                      : roomType.includes('Four') || roomType.includes('Shared')
                      ? 'Capacity: 4 Tenants · Rent & electricity split equally among occupants'
                      : 'Capacity: 1 Tenant · Single occupant bill'}
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Initial status *
                  </label>
                  <select
                    value={status}
                    onChange={(event) =>
                      setStatus(
                        event.target.value as 'Vacant' | 'Occupied' | 'Maintenance'
                      )
                    }
                    className={inputClass}
                  >
                    <option value="Vacant">Vacant</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <Field label="Electricity meter number (optional — auto-creates meter)">
                <input
                  value={meterId}
                  onChange={(event) => setMeterId(event.target.value)}
                  placeholder="e.g. MTR-0101"
                  className={inputClass}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Monthly rent (₹) *">
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={rent}
                    onChange={(event) => setRent(event.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Security deposit (₹) *">
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={deposit}
                    onChange={(event) => setDeposit(event.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setShowAddModal(false)}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !selectedProperty}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#035E7B] px-5 text-xs font-bold text-white shadow-sm hover:bg-[#024B63] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  {loading ? 'Saving...' : 'Save room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-emerald-300 bg-white p-4 shadow-xl">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <div className="text-xs font-bold text-slate-800">{toastMessage}</div>
        </div>
      )}

      <footer className="flex flex-col items-center justify-between gap-2 border-t border-slate-200/80 pt-6 text-[11px] text-slate-400 sm:flex-row">
        <span>KirayaSaathi · Smart rental management for every property owner</span>
        <span>All amounts in INR · IST</span>
      </footer>
    </div>
  );
};

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 focus:border-[#035E7B] focus:outline-none';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-3 text-3xl font-bold text-slate-800">{value}</div>
      <div className="mt-2 text-xs text-slate-400">{detail}</div>
    </div>
  );
}

function Tip({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF4F7] text-[#035E7B]">
        {icon}
      </div>
      <div>
        <h4 className="text-xs font-bold text-slate-800">{title}</h4>
        <p className="mt-1 text-[11px] text-slate-400">{text}</p>
      </div>
    </div>
  );
}