import React, { useEffect, useState } from 'react';
import { apiRequest } from '../utils/api';
import { PageType } from '../types';
import {
  LayoutDashboard,
  Building2,
  DoorOpen,
  Users,
  ShieldCheck,
  Wallet,
  Zap,
  FileText,
  BarChart3,
  Bell,
  Settings,
  HelpCircle,
  LogOut,
  ChevronsUpDown,
  X,
  Globe,
} from 'lucide-react';

interface SidebarProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  unreadNotificationsCount?: number;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  onLogout?: () => void;
  isLoggingOut?: boolean;
}

interface CurrentUserResponse {
  id?: number;
  username?: string;
  email?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  user?: {
    username?: string;
    email?: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    name?: string;
  };
}

const getOwnerDisplayName = (response: CurrentUserResponse): string => {
  const user = response.user ?? response;

  const firstLast = [
    user.first_name?.trim(),
    user.last_name?.trim(),
  ]
    .filter(Boolean)
    .join(' ');

  return (
    user.full_name?.trim() ||
    user.name?.trim() ||
    firstLast ||
    user.username?.trim() ||
    user.email?.split('@')[0]?.trim() ||
    'Owner'
  );
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return 'O';
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  unreadNotificationsCount = 5,
  mobileOpen = false,
  onCloseMobile,
  onLogout,
  isLoggingOut = false,
}) => {
  const [ownerName, setOwnerName] = useState('');
  const [ownerLoading, setOwnerLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchOwner = async () => {
      try {
        const response =
          await apiRequest<CurrentUserResponse>('/api/auth/me/');

        if (isMounted) {
          setOwnerName(getOwnerDisplayName(response));
        }
      } catch (error) {
        console.error('Failed to load sidebar owner profile:', error);

        if (isMounted) {
          setOwnerName('');
        }
      } finally {
        if (isMounted) {
          setOwnerLoading(false);
        }
      }
    };

    void fetchOwner();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayName = ownerName || (ownerLoading ? 'Loading...' : 'Owner');
  const ownerInitials = getInitials(ownerName || 'Owner');

  // Map subpages to their main category so the active indicator stays correct.
  const isPropertiesActive = [
    'property_list',
    'property_filter',
    'property_detail',
    'add_property',
    'edit_property',
  ].includes(currentPage);

  const isRoomsActive = ['rooms', 'add_room'].includes(currentPage);

  const isTenantsActive = [
    'tenants',
    'tenant_profile',
    'tenant_detail',
  ].includes(currentPage);

  const isElectricityActive = [
    'electricity_bills',
    'electricity_bill_form',
  ].includes(currentPage);

  const navItems = [
    {
      id: 'dashboard' as PageType,
      label: 'Dashboard',
      icon: LayoutDashboard,
      isActive: currentPage === 'dashboard',
    },
    {
      id: 'property_list' as PageType,
      label: 'Properties',
      icon: Building2,
      isActive: isPropertiesActive,
    },
    {
      id: 'rooms' as PageType,
      label: 'Rooms',
      icon: DoorOpen,
      isActive: isRoomsActive,
    },
    {
      id: 'tenants' as PageType,
      label: 'Tenants',
      icon: Users,
      isActive: isTenantsActive,
    },
    {
      id: 'security_deposits' as PageType,
      label: 'Security Deposits',
      icon: ShieldCheck,
      isActive: currentPage === 'security_deposits',
    },
    {
      id: 'rent_management' as PageType,
      label: 'Rent Management',
      icon: Wallet,
      isActive: currentPage === 'rent_management',
    },
    {
      id: 'electricity_bills' as PageType,
      label: 'Electricity Bills',
      icon: Zap,
      isActive: isElectricityActive,
    },
    {
      id: 'invoice_list' as PageType,
      label: 'Invoices & Receipts',
      icon: FileText,
      isActive: currentPage === 'invoice_list',
    },
    {
      id: 'reports' as PageType,
      label: 'Reports & Analytics',
      icon: BarChart3,
      isActive: currentPage === 'reports',
    },
    {
      id: 'notifications' as PageType,
      label: 'Notifications',
      icon: Bell,
      isActive: currentPage === 'notifications',
      badge:
        unreadNotificationsCount > 0
          ? unreadNotificationsCount
          : undefined,
    },
    {
      id: 'settings' as PageType,
      label: 'Settings',
      icon: Settings,
      isActive: currentPage === 'settings',
    },
  ];

  const handleNavClick = (page: PageType) => {
    onNavigate(page);

    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white text-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-[74px] px-5 flex items-center justify-between border-b border-slate-100 shrink-0">
        <button
          onClick={() => handleNavClick('dashboard')}
          className="flex items-center gap-2.5 text-left transition hover:opacity-90"
        >
          <div className="w-[36px] h-[36px] rounded-xl bg-white border border-slate-200/80 p-1 flex items-center justify-center shrink-0 shadow-xs">
            <img src="/images/logo.png" alt="KirayaSaathi Logo" className="w-full h-full object-contain" />
          </div>

          <div>
            <div className="text-[19px] font-bold text-[#035E7B] leading-tight tracking-tight">
              KirayaSaathi
            </div>
            <div className="text-[7.5px] uppercase tracking-wider text-slate-400 font-bold">
              SMART RENTAL MANAGEMENT
            </div>
          </div>
        </button>

        {mobileOpen && (
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Workspace Switcher */}
      <div className="px-3.5 pt-3.5 pb-2">
        <div
          onClick={() => handleNavClick('settings')}
          className="flex items-center justify-between border border-slate-200 rounded-xl p-2 bg-slate-50/70 hover:bg-slate-100/70 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#EAF4F7] text-[#035E7B] font-bold text-xs flex items-center justify-center shrink-0">
              {ownerInitials}
            </div>

            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-800 truncate">
                {displayName}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                Owner workspace
              </div>
            </div>
          </div>

          <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </div>
      </div>

      {/* Nav Section Label */}
      <div className="px-6 pt-3 pb-1 text-[9px] font-bold tracking-widest uppercase text-slate-400">
        WORKSPACE
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition group ${
                item.isActive
                  ? 'bg-[#E8F4F7] text-[#035E7B] font-bold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#035E7B]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 shrink-0 transition ${
                    item.isActive
                      ? 'text-[#0D8AB0]'
                      : 'text-slate-400 group-hover:text-[#035E7B]'
                  }`}
                />

                <span className="truncate text-md">{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    item.isActive
                      ? 'bg-[#14B8A6]/20 text-[#0C8067]'
                      : 'bg-emerald-50 text-[#0C8067]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-slate-100 space-y-1 bg-white shrink-0">
        <button
          type="button"
          onClick={() => handleNavClick('landing')}
          className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition ${
            currentPage === 'landing'
              ? 'bg-[#E8F4F7] text-[#035E7B]'
              : 'text-slate-600 hover:bg-slate-50 hover:text-[#035E7B]'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <Globe className="w-4 h-4 text-[#035E7B]" />
            <span>Public Website</span>
          </span>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
            View
          </span>
        </button>

        <a
          href="mailto:support@KirayaSaathi.in?subject=Help%20and%20Support"
          className="flex items-center justify-between px-3 py-1.5 text-xs text-slate-600 font-medium hover:bg-slate-50 hover:text-[#035E7B] rounded-xl transition"
        >
          <span className="flex items-center gap-2.5">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>Help &amp; Support ↗</span>
          </span>
        </a>

        <div
          onClick={() => handleNavClick('settings')}
          className="flex items-center justify-between px-2 pt-2 border-t border-slate-100 cursor-pointer hover:bg-slate-50/70 p-1.5 rounded-xl transition group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#EAF4F7] text-[#035E7B] font-bold text-xs flex items-center justify-center shrink-0">
              {ownerInitials}
            </div>

            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-800 truncate group-hover:text-[#035E7B]">
                {displayName}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                Workspace owner
              </div>
            </div>
          </div>

          {onLogout ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onLogout();
              }}
              disabled={isLoggingOut}
              title="Sign out of KirayaSaathi"
              className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleNavClick('settings');
              }}
              title="Settings"
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex flex-col w-[236px] fixed inset-y-0 left-0 border-r border-slate-200 z-30 bg-white print:hidden">
        {sidebarContent}
      </aside>

      {/* Mobile / Tablet Drawer Sidebar with Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden print:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={onCloseMobile}
          />

          {/* Drawer content */}
          <div className="fixed inset-y-0 left-0 w-[270px] max-w-[85vw] shadow-2xl bg-white animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
