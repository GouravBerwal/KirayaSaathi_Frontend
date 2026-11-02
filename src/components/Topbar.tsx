import React, { useEffect, useState, useRef } from 'react';
import { PageType } from '../types';
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  User,
  Settings,
  Globe,
  LogOut,
  LayoutDashboard,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import { apiRequest } from '../utils/api';

interface TopbarProps {
  title: string;
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  onOpenMobileMenu: () => void;
  onOpenSearch: () => void;
  unreadCount?: number;
  onLogout?: () => void;
  isLoggingOut?: boolean;
  userEmail?: string;
  userRole?: string;
}

interface CurrentUser {
  id?: number;
  username?: string;
  email?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
}

interface CurrentUserResponse {
  authenticated?: boolean;
  user?: CurrentUser | null;
  id?: number;
  username?: string;
  email?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
}

const getOwnerDisplayName = (data: CurrentUserResponse): string => {
  const user = data.user ?? data;

  const firstName = user.first_name?.trim() ?? '';
  const lastName = user.last_name?.trim() ?? '';
  const combinedName = [firstName, lastName].filter(Boolean).join(' ');

  return (
    user.full_name?.trim() ||
    user.name?.trim() ||
    combinedName ||
    user.username?.trim() ||
    user.email?.split('@')[0]?.trim() ||
    ''
  );
};

const getInitials = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return 'OW';
  }

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();
};

export const Topbar: React.FC<TopbarProps> = ({
  title,
  currentPage,
  onNavigate,
  onOpenMobileMenu,
  onOpenSearch,
  unreadCount = 5,
  onLogout,
  isLoggingOut = false,
  userEmail,
  userRole,
}) => {
  const [ownerName, setOwnerName] = useState('');
  const [fetchedEmail, setFetchedEmail] = useState('');
  const [isStaffUser, setIsStaffUser] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    apiRequest<CurrentUserResponse>('/api/auth/me/')
      .then((data) => {
        if (cancelled) return;

        const resolvedUser = data.user ?? data;
        setOwnerName(getOwnerDisplayName(data));
        setFetchedEmail(resolvedUser.email || '');
        setIsStaffUser(Boolean(resolvedUser.is_staff || resolvedUser.is_superuser));
      })
      .catch((error) => {
        console.error('Topbar owner API error:', error);
        if (!cancelled) {
          setOwnerName('');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Close dropdown on outside click or Esc
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileMenuOpen]);

  const displayName = ownerName || 'Owner';
  const displayEmail = userEmail || fetchedEmail || '';
  const initials = getInitials(displayName);
  const roleLabel = userRole || (isStaffUser ? 'Administrator' : 'Property Owner');

  return (
    <header className="sticky top-0 z-30 h-16 sm:h-[70px] bg-white border-b border-slate-200 px-3 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 shadow-xs print:hidden transition-all">
      {/* Left: Mobile/Tablet Hamburger Menu and Page Title */}
      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 -ml-1 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition active:scale-95 shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5 text-[#035E7B]" />
        </button>

        <div className="min-w-0">
          <h1 className="text-sm sm:text-base lg:text-lg font-bold text-slate-800 tracking-tight truncate">
            {title}
          </h1>
        </div>
      </div>

      {/* Right: Search, Notifications and Profile */}
      <div className="flex items-center gap-1.5 sm:gap-3 lg:gap-4 shrink-0">
        {/* Desktop & Laptop Search Bar (>=1024px) */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="hidden lg:flex items-center gap-2.5 w-60 xl:w-72 h-9 px-3 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 rounded-xl text-xs text-slate-500 transition cursor-pointer text-left"
          title="Search properties, rooms, tenants, and bills (⌘K)"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="flex-1 truncate">Search anything...</span>
          <kbd className="inline-flex text-[10px] font-mono bg-slate-200/80 text-slate-600 px-1.5 py-0.5 rounded border border-slate-300/70">
            ⌘ K
          </kbd>
        </button>

        {/* Tablet Search Bar (640px to 1023px) */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="hidden sm:flex lg:hidden items-center gap-2 w-36 md:w-48 h-8 px-2.5 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 rounded-xl text-xs text-slate-500 transition cursor-pointer text-left"
          title="Search"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">Search...</span>
        </button>

        {/* Mobile Search Button (<640px) */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="sm:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition active:scale-95"
          aria-label="Search"
        >
          <Search className="w-4 h-4 text-slate-600" />
        </button>

        {/* Notifications Bell */}
        <button
          type="button"
          onClick={() => onNavigate('notifications')}
          className={`relative p-2 rounded-xl hover:bg-slate-100 transition text-slate-600 active:scale-95 ${
            currentPage === 'notifications' ? 'bg-[#E8F4F7] text-[#035E7B]' : ''
          }`}
          aria-label="View notifications"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#14B8A6] ring-2 ring-white" />
            </span>
          )}
        </button>

        <div className="hidden sm:block h-6 w-px bg-slate-200" />

        {/* Logged-in Owner Profile Button & Popover */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className={`flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl transition cursor-pointer border ${
              isProfileMenuOpen
                ? 'bg-[#EAF4F7] border-[#035E7B]/30'
                : 'border-transparent hover:bg-slate-100/80 hover:border-slate-200'
            }`}
            aria-label={`User menu for ${displayName}`}
            aria-expanded={isProfileMenuOpen}
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[#035E7B] to-[#0D8AB0] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
              {initials}
            </div>

            <div className="hidden md:flex flex-col text-left max-w-36 lg:max-w-44">
              <span className="text-xs font-semibold text-slate-800 truncate leading-tight">
                {displayName}
              </span>
              <span className="text-[10px] text-slate-400 font-medium truncate leading-none mt-0.5">
                {roleLabel}
              </span>
            </div>

            <ChevronDown
              className={`hidden md:inline-block w-3 h-3 text-slate-400 transition-transform ${
                isProfileMenuOpen ? 'rotate-180 text-[#035E7B]' : ''
              }`}
            />
          </button>

          {/* Profile Dropdown Menu */}
          {isProfileMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* User Header */}
              <div className="p-3 bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] rounded-xl border border-slate-100 mb-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-[#035E7B] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
                    {displayEmail && (
                      <p className="text-[11px] text-slate-500 truncate">{displayEmail}</p>
                    )}
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-slate-600 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-emerald-600" />
                    <span>{roleLabel}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Verified
                  </span>
                </div>
              </div>

              {/* Navigation Options */}
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onNavigate('dashboard');
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                    currentPage === 'dashboard'
                      ? 'bg-[#E8F4F7] text-[#035E7B] font-bold'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-[#035E7B]'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-slate-400" />
                  <span>Owner Dashboard</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onNavigate('settings');
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                    currentPage === 'settings'
                      ? 'bg-[#E8F4F7] text-[#035E7B] font-bold'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-[#035E7B]'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>Workspace Settings</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onNavigate('landing');
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                    currentPage === 'landing'
                      ? 'bg-[#E8F4F7] text-[#035E7B] font-bold'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-[#035E7B]'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 text-[#035E7B]" />
                  <span>Public Website</span>
                </button>
              </div>

              {/* Logout Option */}
              {onLogout && (
                <div className="pt-1.5 mt-1.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onLogout();
                    }}
                    disabled={isLoggingOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition disabled:opacity-60"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{isLoggingOut ? 'Logging out...' : 'Sign Out'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
