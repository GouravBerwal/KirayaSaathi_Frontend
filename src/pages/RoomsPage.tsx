import React, { useMemo, useState } from 'react';
import { PageType, Property, Room } from '../types';
import {
  Download,
  Plus,
  DoorOpen,
  Users,
  Key,
  IndianRupee,
  Search,
  ChevronDown,
  ArrowRight,
  Edit3,
  Trash2,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Zap,
} from 'lucide-react';

interface RoomsPageProps {
  rooms: Room[];
  properties?: Property[];
  onNavigate: (page: PageType) => void;
  onAllocateRoom?: (room: Room) => void;
  onSelectTenantByIdOrName?: (tenantId: string | null, tenantName: string | null) => void;
  onUpdateRoom?: (roomId: string, updated: Partial<Room>) => Promise<void>;
  onDeleteRoom?: (roomId: string) => Promise<void>;
  onRefreshData?: () => Promise<void> | void;
}

export const RoomsPage: React.FC<RoomsPageProps> = ({
  rooms,
  properties: propList = [],
  onNavigate,
  onAllocateRoom,
  onSelectTenantByIdOrName,
  onUpdateRoom,
  onDeleteRoom,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<
    'all' | 'occupied' | 'vacant' | 'maintenance'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [actionError, setActionError] = useState('');

  // Edit Room Modal State
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editNumber, setEditNumber] = useState('');
  const [editFloor, setEditFloor] = useState('');
  const [editType, setEditType] = useState('');
  const [editRent, setEditRent] = useState('');
  const [editDeposit, setEditDeposit] = useState('');
  const [editStatus, setEditStatus] = useState<'Occupied' | 'Vacant' | 'Maintenance'>('Vacant');
  const [editMeterId, setEditMeterId] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const totalRooms = rooms.length;
  const totalBeds = rooms.reduce((sum, r) => sum + (r.capacity || 1), 0);
  const occupiedBeds = rooms.reduce(
    (sum, r) => sum + (r.occupiedBeds || (r.status === 'Occupied' ? 1 : 0)),
    0
  );
  const vacantBeds = Math.max(0, totalBeds - occupiedBeds);
  const occupiedRooms = rooms.filter(
    (room) => room.status === 'Occupied' || (room.occupiedBeds && room.occupiedBeds > 0)
  ).length;
  const vacantRooms = rooms.filter(
    (room) => room.status === 'Vacant' && (!room.occupiedBeds || room.occupiedBeds === 0)
  ).length;
  const maintenanceRooms = rooms.filter(
    (room) => room.status === 'Maintenance'
  ).length;

  const occupancyRate =
    totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const avgRent =
    occupiedRooms > 0
      ? rooms
          .filter((room) => room.status === 'Occupied' || (room.occupiedBeds && room.occupiedBeds > 0))
          .reduce((sum, room) => sum + Number(room.monthlyRent || 0), 0) /
        occupiedRooms
      : totalRooms > 0
      ? rooms.reduce((sum, room) => sum + Number(room.monthlyRent || 0), 0) /
        totalRooms
      : 0;

  const propertyNames = useMemo(() => {
    const names = new Set<string>();
    propList.forEach((p) => {
      if (p.name) names.add(p.name);
    });
    rooms.forEach((r) => {
      if (r.propertyName) names.add(r.propertyName);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [propList, rooms]);

  const filteredRooms = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return rooms.filter((room) => {
      if (activeTab === 'occupied' && room.status !== 'Occupied' && (!room.occupiedBeds || room.occupiedBeds === 0)) {
        return false;
      }

      if (activeTab === 'vacant' && room.status !== 'Vacant' && (!room.vacantBeds || room.vacantBeds === 0)) {
        return false;
      }

      if (activeTab === 'maintenance' && room.status !== 'Maintenance') {
        return false;
      }

      if (propertyFilter !== 'All' && room.propertyName !== propertyFilter) {
        return false;
      }

      if (!query) return true;

      return (
        String(room.number || '').toLowerCase().includes(query) ||
        String(room.propertyName || '').toLowerCase().includes(query) ||
        String(room.tenantName || '').toLowerCase().includes(query) ||
        String(room.meterId || '').toLowerCase().includes(query) ||
        String(room.type || '').toLowerCase().includes(query)
      );
    });
  }, [rooms, activeTab, propertyFilter, searchTerm]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(''), 3000);
  };

  const handleRefresh = async () => {
    if (!onRefreshData) return;
    setIsRefreshing(true);
    setActionError('');
    try {
      await onRefreshData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const openEditModal = (room: Room) => {
    setActionError('');
    setEditingRoom(room);
    setEditNumber(room.number);
    setEditFloor(room.floor || 'First floor');
    setEditType(room.type || 'Single Room');
    setEditRent(String(room.monthlyRent || 0));
    setEditDeposit(String(room.deposit || 0));
    setEditStatus(room.status);
    setEditMeterId(room.meterId || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom || !onUpdateRoom) return;

    setIsSavingEdit(true);
    setActionError('');
    try {
      await onUpdateRoom(editingRoom.id, {
        number: editNumber.trim(),
        floor: editFloor,
        type: editType,
        monthlyRent: Number(editRent) || 0,
        deposit: Number(editDeposit) || 0,
        status: editStatus,
        meterId: editMeterId.trim() || undefined,
      });
      setEditingRoom(null);
      showToast(`Room ${editNumber.trim()} updated in backend!`);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Room update nahi ho saka.'
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (room: Room) => {
    if (!onDeleteRoom) return;
    if (room.status === 'Occupied' || room.tenantName) {
      setActionError(
        `Room ${room.number} is currently occupied by ${room.tenantName}. End the tenancy before deleting the room.`
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete Room ${room.number} (${room.propertyName}) from the backend?`
    );
    if (!confirmed) return;

    setActionError('');
    try {
      await onDeleteRoom(room.id);
      showToast(`Room ${room.number} deleted successfully.`);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Room delete nahi ho saka (Check karein ki is room se koi purana agreement ya meter linked na ho).'
      );
    }
  };

  const exportRooms = () => {
    const columns = [
      'Room Number',
      'Property',
      'Floor',
      'Type',
      'Tenant',
      'Move-in Date',
      'Monthly Rent',
      'Deposit',
      'Status',
      'Meter ID',
    ];

    const escapeCsv = (value: unknown) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`;

    const rows = filteredRooms.map((room) => [
      room.number,
      room.propertyName,
      room.floor,
      room.type,
      room.tenantName || 'Unassigned',
      room.moveInDate || '—',
      room.monthlyRent,
      room.deposit,
      room.status,
      room.meterId || '—',
    ]);

    const csv = [columns, ...rows]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\r\n');

    const blob = new Blob(['\uFEFF', csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `KirayaSaathi-rooms-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {actionError && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError('')}
            className="font-bold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">
            A clear view of every room
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Manage room availability, rent, meters, and tenant allocations across your portfolio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onRefreshData && (
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#035E7B] shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={exportRooms}
            disabled={filteredRooms.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#035E7B] shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export rooms</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('add_room')}
            className="inline-flex items-center gap-2 rounded-xl bg-[#035E7B] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#024B63] active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Add room</span>
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 sm:gap-4">
        <StatCard
          label="Total rooms / beds"
          value={`${totalRooms} rms · ${totalBeds} beds`}
          detail={`Across ${propertyNames.length} properties`}
          icon={<DoorOpen className="h-4 w-4 text-[#0D8AB0]" />}
        />
        <StatCard
          label="Occupied beds"
          value={`${occupiedBeds} / ${totalBeds}`}
          detail={`${occupancyRate}% bed occupancy (${occupiedRooms} rooms)`}
          icon={<Users className="h-4 w-4 text-[#0D8AB0]" />}
        />
        <StatCard
          label="Available beds"
          value={`${vacantBeds} beds`}
          detail={
            maintenanceRooms > 0
              ? `${vacantRooms} vacant rms · ${maintenanceRooms} in maintenance`
              : `${vacantRooms} vacant rms available`
          }
          icon={<Key className="h-4 w-4 text-[#0D8AB0]" />}
        />
        <StatCard
          label="Average monthly rent"
          value={`₹${Math.round(avgRent).toLocaleString('en-IN')}`}
          detail={occupiedRooms > 0 ? 'Based on occupied rooms' : 'Portfolio average'}
          icon={<IndianRupee className="h-4 w-4 text-[#0D8AB0]" />}
        />
      </section>

      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <h2 className="text-base font-bold text-slate-800">Room inventory</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Your rooms, live tenant sharing allocations, capacity tracking, and instant actions.
          </p>
        </div>

        <div className="flex items-center gap-6 border-b border-slate-200 pb-2 text-xs overflow-x-auto">
          <TabButton
            active={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
          >
            All rooms · {totalRooms}
          </TabButton>
          <TabButton
            active={activeTab === 'occupied'}
            onClick={() => setActiveTab('occupied')}
          >
            Occupied · {occupiedRooms} ({occupiedBeds} beds)
          </TabButton>
          <TabButton
            active={activeTab === 'vacant'}
            onClick={() => setActiveTab('vacant')}
          >
            Vacant beds · {vacantBeds} ({vacantRooms} empty rms)
          </TabButton>
          <TabButton
            active={activeTab === 'maintenance'}
            onClick={() => setActiveTab('maintenance')}
          >
            Maintenance · {maintenanceRooms}
          </TabButton>
        </div>

        <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search room, property, meter or tenant..."
              className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-xs text-slate-800 focus:border-[#035E7B] focus:outline-none"
            />
          </div>

          <div className="relative">
            <select
              value={propertyFilter}
              onChange={(event) => setPropertyFilter(event.target.value)}
              className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-9 text-xs font-semibold text-[#035E7B] focus:border-[#035E7B] focus:outline-none sm:w-auto"
            >
              <option value="All">All properties</option>
              {propertyNames.map((property) => (
                <option key={property} value={property}>
                  {property}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <th className="rounded-l-lg px-3 py-2.5">Room / Meter</th>
                <th className="px-3 py-2.5">Property / Type</th>
                <th className="px-3 py-2.5">Tenant</th>
                <th className="px-3 py-2.5">Monthly Rent</th>
                <th className="px-3 py-2.5">Deposit</th>
                <th className="px-3 py-2.5">Occupancy</th>
                <th className="rounded-r-lg px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredRooms.map((room) => (
                <tr
                  key={room.id}
                  className="transition hover:bg-slate-50/60"
                >
                  <td className="px-3 py-3">
                    <strong className="font-bold text-slate-800 block">
                      Room {room.number}
                    </strong>
                    {room.meterId ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#035E7B] font-medium">
                        <Zap className="h-2.5 w-2.5" /> {room.meterId}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">No meter</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-slate-800">
                      {room.propertyName}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {room.floor} · {room.type}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {room.occupants && room.occupants.length > 0 ? (
                      <div className="space-y-1">
                        {room.occupants.map((occ) => (
                          <div key={occ.id} className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectTenantByIdOrName?.(occ.id, occ.name);
                                onNavigate('tenant_profile');
                              }}
                              className="font-semibold text-slate-800 hover:text-[#035E7B] hover:underline"
                            >
                              {occ.name}
                            </button>
                            {occ.monthlyRent ? (
                              <span className="text-[10px] text-slate-500 font-mono">
                                (₹{occ.monthlyRent.toLocaleString('en-IN')})
                              </span>
                            ) : null}
                          </div>
                        ))}
                        <div className="text-[10px] text-slate-400">
                          {room.occupiedBeds || room.occupants.length}/{room.capacity || 1} beds occupied
                          {(room.vacantBeds ?? 0) > 0 ? ` · ${room.vacantBeds} available` : ''}
                        </div>
                      </div>
                    ) : room.tenantName ? (
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectTenantByIdOrName?.(
                              room.tenantId,
                              room.tenantName
                            );
                            onNavigate('tenant_profile');
                          }}
                          className="font-semibold text-slate-800 hover:text-[#035E7B] hover:underline"
                        >
                          {room.tenantName}
                        </button>
                        {room.moveInDate && (
                          <div className="text-[10px] text-slate-400">
                            Move-in: {room.moveInDate}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="text-slate-400">No tenant assigned</div>
                        <div className="text-[10px] text-[#A8680C]">
                          {room.status === 'Maintenance'
                            ? 'Under maintenance'
                            : `Available now (${room.capacity || 1} bed${(room.capacity || 1) > 1 ? 's' : ''})`}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-800">
                    ₹{Number(room.monthlyRent || 0).toLocaleString('en-IN')}
                    {(room.capacity || 1) > 1 && (
                      <span className="block text-[10px] text-slate-400 font-normal">
                        ₹{Math.round(Number(room.monthlyRent || 0) / (room.capacity || 1)).toLocaleString('en-IN')}/bed
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                    ₹{Number(room.deposit || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-3 py-3">
                    {room.status === 'Maintenance' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700">
                        <Wrench className="h-3 w-3" /> Maintenance
                      </span>
                    ) : room.isFull || (room.capacity && (room.occupiedBeds || 0) >= room.capacity) ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-[#E8F8F4] text-[#0C8067]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0C8067]" />
                        Full ({room.capacity}/{room.capacity} Beds)
                      </span>
                    ) : (room.occupiedBeds || 0) > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-[#FFF0DF] text-[#A8680C]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#A8680C]" />
                        {room.occupiedBeds}/{room.capacity} Beds ({room.vacantBeds} free)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Vacant ({room.capacity || 1} Bed{(room.capacity || 1) > 1 ? 's' : ''})
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    <div className="inline-flex items-center justify-end gap-2.5">
                      {room.status !== 'Maintenance' && (!room.isFull && (room.vacantBeds === undefined || room.vacantBeds > 0)) ? (
                        <button
                          type="button"
                          onClick={() => {
                            onAllocateRoom?.(room);
                          }}
                          className="inline-flex items-center gap-1 font-bold text-[#035E7B] hover:underline"
                          title={`Allocate tenant to room ${room.number}`}
                        >
                          {(room.occupiedBeds || 0) > 0 ? 'Add Bed' : 'Allocate'}
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      ) : room.tenantName ? (
                        <button
                          type="button"
                          onClick={() => {
                            const primaryId = room.occupants?.[0]?.id || room.tenantId;
                            const primaryName = room.occupants?.[0]?.name || room.tenantName;
                            onSelectTenantByIdOrName?.(primaryId, primaryName);
                            onNavigate('tenant_profile');
                          }}
                          className="font-semibold text-[#035E7B] hover:underline"
                        >
                          View tenant
                        </button>
                      ) : null}

                      {onUpdateRoom && (
                        <button
                          type="button"
                          onClick={() => openEditModal(room)}
                          title="Edit room"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#035E7B] transition"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {onDeleteRoom && room.status !== 'Occupied' && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(room)}
                          title="Delete room"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredRooms.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <DoorOpen className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      No rooms found
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Try changing the search or property filter, or add a new room.
                    </p>
                    <button
                      type="button"
                      onClick={() => onNavigate('add_room')}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#035E7B] px-4 py-2 text-xs font-bold text-white hover:bg-[#024B63]"
                    >
                      <Plus className="h-4 w-4" />
                      Add room
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-400 sm:flex-row">
          <span>
            Showing {filteredRooms.length} of {totalRooms} rooms
          </span>
          <span>Synced with Django backend</span>
        </div>
      </section>

      {/* Edit Room Modal */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => !isSavingEdit && setEditingRoom(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Edit Room {editingRoom.number}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editingRoom.propertyName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRoom(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Room number *
                  </label>
                  <input
                    required
                    value={editNumber}
                    onChange={(e) => setEditNumber(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-800 focus:border-[#035E7B] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Floor *
                  </label>
                  <input
                    required
                    value={editFloor}
                    onChange={(e) => setEditFloor(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-800 focus:border-[#035E7B] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Room type *
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 focus:border-[#035E7B] focus:outline-none"
                  >
                    <option value="Single Room">Single Room</option>
                    <option value="Double Sharing">Double Sharing</option>
                    <option value="Triple Sharing">Triple Sharing</option>
                    <option value="Shared">Shared</option>
                    <option value="1 BHK">1 BHK</option>
                    <option value="2 BHK">2 BHK</option>
                    <option value="Studio">Studio</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Occupancy status *
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) =>
                      setEditStatus(
                        e.target.value as 'Occupied' | 'Vacant' | 'Maintenance'
                      )
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 focus:border-[#035E7B] focus:outline-none"
                  >
                    <option value="Vacant">Vacant</option>
                    <option value="Occupied">Occupied</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Monthly rent (₹) *
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={editRent}
                    onChange={(e) => setEditRent(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-800 focus:border-[#035E7B] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Security deposit (₹) *
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={editDeposit}
                    onChange={(e) => setEditDeposit(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-800 focus:border-[#035E7B] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Electricity Meter ID
                </label>
                <input
                  value={editMeterId}
                  onChange={(e) => setEditMeterId(e.target.value)}
                  placeholder="e.g. MTR-0101"
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs text-slate-800 focus:border-[#035E7B] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="h-10 rounded-xl bg-[#035E7B] px-5 text-xs font-bold text-white hover:bg-[#024B63] disabled:opacity-50"
                >
                  {isSavingEdit ? 'Saving...' : 'Save changes'}
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

function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">
        {value}
      </div>
      <p className="mt-2 text-[11px] text-slate-400">{detail}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-2.5 border-b-2 pb-2 font-semibold whitespace-nowrap transition ${
        active
          ? 'border-[#035E7B] font-bold text-[#035E7B]'
          : 'border-transparent text-slate-500 hover:text-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'Occupied') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-[#E8F8F4] px-2.5 py-1 text-[10px] font-semibold text-[#0C8067]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#0C8067]" />
        Occupied
      </span>
    );
  }

  if (status === 'Maintenance') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-600">
        <Wrench className="h-2.5 w-2.5" />
        Maintenance
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-[#FFF6E8] px-2.5 py-1 text-[10px] font-semibold text-[#A8680C]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#A8680C]" />
      Vacant
    </span>
  );
}