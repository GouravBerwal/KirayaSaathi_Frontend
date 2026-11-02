
import React, { useEffect, useMemo, useState } from 'react';
import type { PageType, Property, Room } from '../types';
import {
  ArrowLeft,
  Edit,
  Plus,
  Building2,
  DoorOpen,
  IndianRupee,
  CheckCircle2,
  Clock,
  Wrench,
  MapPin,
  Users,
  RefreshCw,
} from 'lucide-react';

interface PropertyDetailProps {
  property?: Property | null;
  rooms: Room[];
  onNavigate: (page: PageType) => void;
  onSelectTenant?: (tenantName: string) => void;
  onRefreshData?: () => Promise<void> | void;
}

type RoomFilter = 'all' | 'occupied' | 'vacant' | 'maintenance';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);

const normalizeStatus = (status: Room['status']): RoomFilter => {
  const value = String(status).toLowerCase();

  if (value === 'occupied') return 'occupied';
  if (value === 'maintenance') return 'maintenance';

  return 'vacant';
};

const getPropertyImageUrl = (
  image?: string | null,
): string | null => {
  if (!image) return null;

  if (
    image.startsWith('http://') ||
    image.startsWith('https://')
  ) {
    return image;
  }

  return `${API_BASE_URL.replace(/\/$/, '')}/${image.replace(
    /^\//,
    '',
  )}`;
};

export const PropertyDetail: React.FC<PropertyDetailProps> = ({
  property,
  rooms,
  onNavigate,
  onSelectTenant,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<RoomFilter>('all');
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (onRefreshData) {
      void onRefreshData();
    }
  }, []);

  const handleRefresh = async () => {
    if (!onRefreshData) return;
    setIsRefreshing(true);
    try {
      await onRefreshData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const propertyImageUrl = getPropertyImageUrl(property?.image);

  const propertyRooms = useMemo(
    () =>
      property
        ? rooms.filter(
            (room) =>
              String(room.propertyId) === String(property.id),
          )
        : [],
    [rooms, property],
  );

  const occupiedRooms = useMemo(
    () =>
      propertyRooms.filter(
        (room) => normalizeStatus(room.status) === 'occupied',
      ),
    [propertyRooms],
  );

  const vacantRooms = useMemo(
    () =>
      propertyRooms.filter(
        (room) => normalizeStatus(room.status) === 'vacant',
      ),
    [propertyRooms],
  );

  const maintenanceRooms = useMemo(
    () =>
      propertyRooms.filter(
        (room) => normalizeStatus(room.status) === 'maintenance',
      ),
    [propertyRooms],
  );

  const totalRooms = propertyRooms.length;
  const occupiedCount = occupiedRooms.length;
  const vacantCount = vacantRooms.length;
  const maintenanceCount = maintenanceRooms.length;

  const occupancyPercentage =
    totalRooms > 0 ? (occupiedCount / totalRooms) * 100 : 0;

  const expectedRent = occupiedRooms.reduce(
    (total, room) =>
      total + (Number(room.monthlyRent) || 0),
    0,
  );

  const rentCollected = Number(property?.rentCollected) || 0;
  const pendingRent = Number(property?.pendingRent) || 0;
  const collectionBase = rentCollected + pendingRent;

  const collectionPercentage =
    collectionBase > 0
      ? (rentCollected / collectionBase) * 100
      : 0;

  const address = property
    ? [
        property.address,
        property.locality,
        property.city,
        property.state,
        property.pinCode,
      ]
        .filter(Boolean)
        .filter(
          (value, index, values) =>
            values.indexOf(value) === index,
        )
        .join(', ')
    : '';

  const filteredRooms = useMemo(
    () =>
      propertyRooms.filter((room) => {
        if (activeTab === 'all') return true;
        return normalizeStatus(room.status) === activeTab;
      }),
    [propertyRooms, activeTab],
  );

  const floorGroups = useMemo(() => {
    const groups = new Map<string, Room[]>();

    filteredRooms.forEach((room) => {
      const floorName =
        String(room.floor || '').trim() ||
        'Floor not specified';

      if (!groups.has(floorName)) {
        groups.set(floorName, []);
      }

      groups.get(floorName)!.push(room);
    });

    return Array.from(groups.entries()).sort(
      ([floorA], [floorB]) =>
        floorA.localeCompare(floorB, undefined, {
          numeric: true,
          sensitivity: 'base',
        }),
    );
  }, [filteredRooms]);

  const filterButtonClass = (tab: RoomFilter) =>
    `whitespace-nowrap border-b-2 pb-3 text-xs font-semibold transition ${
      activeTab === tab
        ? 'border-[#035E7B] text-[#035E7B]'
        : 'border-transparent text-slate-500 hover:text-slate-800'
    }`;

  const handleRoomClick = (room: Room) => {
    if (room.tenantName) {
      onSelectTenant?.(room.tenantName);
      onNavigate('tenant_profile');
      return;
    }

    onNavigate('rooms');
  };

  if (!property) {
    return (
      <div className="mx-auto max-w-7xl py-16 text-center">
        <Building2 className="mx-auto h-10 w-10 text-slate-400" />

        <h2 className="mt-4 text-lg font-bold text-slate-800">
          No property selected
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Select a property to view its details and rooms.
        </p>

        <button
          type="button"
          onClick={() => onNavigate('property_list')}
          className="mt-5 rounded-xl bg-[#035E7B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#024B63]"
        >
          Back to properties
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Breadcrumb and page heading */}
      <section className="space-y-3">
        <button
          type="button"
          onClick={() => onNavigate('property_list')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-[#035E7B]"
        >
          <ArrowLeft className="h-4 w-4 text-[#035E7B]" />
          <span>Properties / {property.name}</span>
        </button>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">
              {property.name}
            </h1>

            <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-500 sm:text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{address || 'Address not provided'}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-[#E8F8F4] text-[#0C8067] border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0C8067] animate-pulse" />
              Live Sync
            </span>

            {onRefreshData && (
              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#035E7B] shadow-sm transition hover:bg-slate-50"
                title="Sync property details from backend"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigate('edit_property')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#035E7B] shadow-sm transition hover:bg-slate-50"
            >
              <Edit className="h-3.5 w-3.5" />
              Edit property
            </button>

            <button
              type="button"
              onClick={() => onNavigate('add_room')}
              className="inline-flex items-center gap-2 rounded-xl bg-[#035E7B] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#024B63]"
            >
              <Plus className="h-4 w-4" />
              Add room
            </button>
          </div>
        </div>
      </section>

      {/* Property overview with uploaded image */}
      <section className="grid grid-cols-1 items-stretch gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 md:grid-cols-[220px_1fr]">
        <div className="relative min-h-[160px] overflow-hidden rounded-xl border border-[#A9C7D1]/60 bg-gradient-to-br from-[#D9E9E7] to-[#B8D3D7]">
          {propertyImageUrl && !imageLoadFailed ? (
            <img
              src={propertyImageUrl}
              alt={`${property.name} property`}
              className="absolute inset-0 h-full min-h-[160px] w-full object-cover"
              onError={() => setImageLoadFailed(true)}
            />
          ) : (
            <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 text-[#035E7B]">
              <Building2 className="h-10 w-10 opacity-70" />
              <span className="text-xs font-medium tracking-wide">
                Property overview
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between gap-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {property.name}
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  {property.type || 'Property'} · ID: {property.id}
                </p>
              </div>

              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#E8F8F4] px-3 py-1 text-xs font-semibold text-[#0C8067]">
                <span className="h-2 w-2 rounded-full bg-[#0C8067]" />
                Active
              </span>
            </div>

            <div className="my-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
              <div>
                <span className="block text-[11px] text-slate-400">
                  Room inventory
                </span>
                <strong className="mt-1 block text-xs font-semibold text-slate-800">
                  {totalRooms} {totalRooms === 1 ? 'room' : 'rooms'}
                </strong>
              </div>

              <div>
                <span className="block text-[11px] text-slate-400">
                  Property type
                </span>
                <strong className="mt-1 block text-xs font-semibold text-slate-800">
                  {property.type || 'Not specified'}
                </strong>
              </div>

              <div>
                <span className="block text-[11px] text-slate-400">
                  Managed by
                </span>
                <strong className="mt-1 block text-xs font-semibold text-slate-800">
                  {property.ownerName || 'Owner not provided'}
                </strong>
              </div>
            </div>
          </div>

          <div>
            <div
              className="h-2 overflow-hidden rounded-full bg-[#E8F3F6]"
              role="progressbar"
              aria-label="Room occupancy"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(occupancyPercentage)}
            >
              <div
                className="h-full rounded-full bg-[#14B8A6] transition-all"
                style={{ width: `${occupancyPercentage}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-500">
                {occupiedCount} of {totalRooms} rooms occupied
              </span>
              <span className="font-bold text-[#0C8067]">
                {occupancyPercentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Summary cards */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-400">
            <span>Occupied rooms</span>
            <DoorOpen className="h-4 w-4 text-[#0D8AB0]" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-800">
            {occupiedCount} / {totalRooms}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            {vacantCount} vacant
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-400">
            <span>Expected monthly rent</span>
            <IndianRupee className="h-4 w-4 text-[#0D8AB0]" />
          </div>
          <div className="mt-3 text-xl font-bold text-slate-800 sm:text-2xl">
            {formatCurrency(expectedRent)}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Based on occupied rooms
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-400">
            <span>Rent collected</span>
            <CheckCircle2 className="h-4 w-4 text-[#0C8067]" />
          </div>
          <div className="mt-3 text-xl font-bold text-slate-800 sm:text-2xl">
            {formatCurrency(rentCollected)}
          </div>
          <p className="mt-2 text-[11px] font-semibold text-[#0C8067]">
            {collectionBase > 0
              ? `${collectionPercentage.toFixed(1)}% collected`
              : 'No collection data available'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-400">
            <span>Rent outstanding</span>
            <Clock className="h-4 w-4 text-[#A8680C]" />
          </div>
          <div className="mt-3 text-xl font-bold text-slate-800 sm:text-2xl">
            {formatCurrency(pendingRent)}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Pending rent recorded for this property
          </p>
        </div>
      </section>

      {/* Rooms and property information */}
      <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <article className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Rooms &amp; occupancy
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Select a room to review its tenant and rental details.
            </p>
          </div>

          {/* Room filters */}
          <div className="flex gap-5 overflow-x-auto border-b border-slate-200 text-xs sm:gap-6">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={filterButtonClass('all')}
            >
              All rooms · {totalRooms}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('occupied')}
              className={filterButtonClass('occupied')}
            >
              Occupied · {occupiedCount}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('vacant')}
              className={filterButtonClass('vacant')}
            >
              Vacant · {vacantCount}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('maintenance')}
              className={filterButtonClass('maintenance')}
            >
              Maintenance · {maintenanceCount}
            </button>
          </div>

          {/* Rooms grouped by floor */}
          {floorGroups.length > 0 ? (
            <div className="space-y-5">
              {floorGroups.map(([floorName, floorRooms]) => {
                const floorOccupiedCount = floorRooms.filter(
                  (room) =>
                    normalizeStatus(room.status) === 'occupied',
                ).length;

                return (
                  <div key={floorName} className="space-y-2.5">
                    <div className="text-xs font-semibold text-slate-500">
                      {floorName} · {floorOccupiedCount} of{' '}
                      {floorRooms.length} occupied
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                      {floorRooms.map((room) => {
                        const status = normalizeStatus(room.status);

                        const roomStyle =
                          status === 'occupied'
                            ? 'border-[#B8E6D9] bg-[#EFFAF6] text-[#0C8067]'
                            : status === 'maintenance'
                              ? 'border-[#E5D5F8] bg-[#F7F1FF] text-[#7E4BB7]'
                              : 'border-[#F5D9AF] bg-[#FFF6E8] text-[#A8680C]';

                        const statusBar =
                          status === 'occupied'
                            ? 'bg-[#14B8A6]'
                            : status === 'maintenance'
                              ? 'bg-[#9B72CF]'
                              : 'bg-[#DCA33C]';

                        const statusLabel =
                          status === 'occupied'
                            ? room.tenantName || 'Occupied'
                            : status === 'maintenance'
                              ? 'Maintenance'
                              : 'Vacant';

                        return (
                          <button
                            type="button"
                            key={room.id}
                            onClick={() => handleRoomClick(room)}
                            className={`flex min-h-[100px] flex-col justify-between rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${roomStyle}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-bold">
                                {room.number}
                              </span>

                              {status === 'maintenance' && (
                                <Wrench className="h-3.5 w-3.5 shrink-0" />
                              )}

                              {status === 'occupied' && (
                                <Users className="h-3.5 w-3.5 shrink-0" />
                              )}
                            </div>

                            <div>
                              <div className="mt-2 truncate text-[10px] font-medium">
                                {statusLabel}
                              </div>

                              <div className="mt-1 truncate text-[10px] opacity-75">
                                {formatCurrency(
                                  Number(room.monthlyRent) || 0,
                                )}
                                /month
                              </div>

                              <div
                                className={`mt-2 h-1 w-5 rounded-full ${statusBar}`}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
              <DoorOpen className="mx-auto h-8 w-8 text-slate-300" />

              <h3 className="mt-3 text-sm font-semibold text-slate-700">
                {activeTab === 'maintenance'
                  ? 'No rooms under maintenance'
                  : activeTab === 'occupied'
                    ? 'No occupied rooms'
                    : activeTab === 'vacant'
                      ? 'No vacant rooms'
                      : 'No rooms added yet'}
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                {activeTab === 'all'
                  ? 'Add a room to start managing this property.'
                  : 'Try another filter or check the room status.'}
              </p>

              {activeTab === 'all' && (
                <button
                  type="button"
                  onClick={() => onNavigate('add_room')}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#035E7B] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#024B63]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add room
                </button>
              )}
            </div>
          )}
        </article>

        {/* Property information */}
        <aside className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Property information
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Basic details and billing preferences
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-500">Property name</span>
              <strong className="max-w-[60%] text-right text-slate-800">
                {property.name || 'Not provided'}
              </strong>
            </div>

            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-500">Property type</span>
              <strong className="max-w-[60%] text-right text-slate-800">
                {property.type || 'Not specified'}
              </strong>
            </div>

            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-500">Total rooms</span>
              <strong className="text-right text-slate-800">
                {totalRooms}
              </strong>
            </div>

            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-500">Monthly rent</span>
              <strong className="text-right text-slate-800">
                {formatCurrency(Number(property.monthlyRent) || 0)}
              </strong>
            </div>

            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-500">Security deposit</span>
              <strong className="text-right text-slate-800">
                {formatCurrency(
                  Number(property.securityDeposit) || 0,
                )}
              </strong>
            </div>

            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-500">Rent due day</span>
              <strong className="max-w-[60%] text-right text-slate-800">
                {property.rentDueDay > 0
                  ? `${property.rentDueDay} of each month`
                  : 'Not specified'}
              </strong>
            </div>

            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-500">Electricity rate</span>
              <strong className="text-right text-slate-800">
                {formatCurrency(
                  Number(property.electricityRate) || 0,
                )}
                /unit
              </strong>
            </div>

            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-500">Owner</span>
              <strong className="max-w-[60%] text-right text-slate-800">
                {property.ownerName || 'Not provided'}
              </strong>
            </div>

            <div className="flex items-start justify-between gap-3">
              <span className="text-slate-500">Contact number</span>
              <strong className="max-w-[60%] break-words text-right text-slate-800">
                {property.contactNumber || 'Not provided'}
              </strong>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          <button
            type="button"
            onClick={() => onNavigate('edit_property')}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-[#035E7B] transition hover:bg-slate-100"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit property details
          </button>
        </aside>
      </section>

      {/* Footer */}
      <footer className="flex flex-col items-center justify-between gap-2 border-t border-slate-200/80 pt-6 text-[11px] text-slate-400 sm:flex-row">
        <span>KirayaSaathi · Smart rental management</span>
        <span>All amounts in INR</span>
      </footer>
    </div>
  );
};
