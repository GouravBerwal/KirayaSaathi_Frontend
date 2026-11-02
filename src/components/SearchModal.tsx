import React, { useState, useEffect } from 'react';
import { PageType, Property, Tenant, Room } from '../types';
import { Search, X, Building, DoorOpen, Users, ArrowRight } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: PageType) => void;
  properties: Property[];
  tenants: Tenant[];
  rooms: Room[];
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  properties,
  tenants,
  rooms,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Toggle or open
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const filteredProperties = properties.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.locality.toLowerCase().includes(query.toLowerCase())
  );

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.roomNumber.toLowerCase().includes(query.toLowerCase()) ||
      t.phone.includes(query)
  );

  const filteredRooms = rooms.filter(
    (r) =>
      r.number.toLowerCase().includes(query.toLowerCase()) ||
      r.propertyName.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tenant, property, room number, bills..."
            className="w-full text-sm text-slate-800 placeholder-slate-400 bg-transparent outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          {/* Quick Pages */}
          {!query && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Quick Navigation
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                {[
                  { label: 'Dashboard', page: 'dashboard' as PageType },
                  { label: 'Properties', page: 'property_list' as PageType },
                  { label: 'Rooms & Occupancy', page: 'rooms' as PageType },
                  { label: 'Tenants Directory', page: 'tenants' as PageType },
                  { label: 'Security Deposits', page: 'security_deposits' as PageType },
                  { label: 'Rent Management', page: 'rent_management' as PageType },
                  { label: 'Electricity Bills', page: 'electricity_bills' as PageType },
                  { label: 'Invoices & Receipts', page: 'invoice_list' as PageType },
                  { label: 'Reports & Analytics', page: 'reports' as PageType },
                ].map((item) => (
                  <button
                    key={item.page}
                    onClick={() => {
                      onNavigate(item.page);
                      onClose();
                    }}
                    className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 hover:bg-[#E8F4F7] hover:text-[#035E7B] rounded-xl transition text-left"
                  >
                    <span>{item.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Properties */}
          {filteredProperties.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Properties ({filteredProperties.length})
              </div>
              <div className="space-y-1 mt-1">
                {filteredProperties.slice(0, 3).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onNavigate('property_detail');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-700 hover:bg-[#E8F4F7] rounded-xl transition text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <Building className="w-4 h-4 text-[#035E7B]" />
                      <div>
                        <div className="font-bold text-slate-800">{p.name}</div>
                        <div className="text-[10px] text-slate-400">{p.locality}, {p.city} · {p.occupiedRooms}/{p.totalRooms} occupied</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-[#035E7B]">View →</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tenants */}
          {filteredTenants.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Tenants ({filteredTenants.length})
              </div>
              <div className="space-y-1 mt-1">
                {filteredTenants.slice(0, 4).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      onNavigate('tenant_profile');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-700 hover:bg-[#E8F4F7] rounded-xl transition text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className="w-4 h-4 text-[#0D8AB0]" />
                      <div>
                        <div className="font-bold text-slate-800">{t.name}</div>
                        <div className="text-[10px] text-slate-400">{t.propertyName} · Room {t.roomNumber} · {t.phone}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-[#035E7B]">Profile →</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rooms */}
          {filteredRooms.length > 0 && query && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Rooms ({filteredRooms.length})
              </div>
              <div className="space-y-1 mt-1">
                {filteredRooms.slice(0, 4).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      onNavigate('rooms');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-700 hover:bg-[#E8F4F7] rounded-xl transition text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <DoorOpen className="w-4 h-4 text-[#14B8A6]" />
                      <div>
                        <div className="font-bold text-slate-800">Room {r.number}</div>
                        <div className="text-[10px] text-slate-400">{r.propertyName} · {r.status} · ₹{r.monthlyRent}/mo</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500">{r.status}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query && filteredProperties.length === 0 && filteredTenants.length === 0 && filteredRooms.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-xs">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
          <span>Press ESC to close</span>
          <span>KirayaSaathi Smart Search</span>
        </div>
      </div>
    </div>
  );
};
