import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { apiRequest, asArray, ApiError } from './utils/api';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';

import {
  PageType,
  Property,
  Room,
  RoomOccupant,
  Tenant,
  RentRecord,
  PaymentRecord,
  ElectricityBill,
  Invoice,
  NotificationItem,
  HandoverItem,
  SecurityDepositRecord,
} from './types';

import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { SearchModal } from './components/SearchModal';
import { RecordPaymentModal } from './components/RecordPaymentModal';

import { DashboardPage } from './pages/DashboardPage';
import { PropertyList } from './pages/PropertyList';
import { PropertyFilter } from './pages/PropertyFilter';
import { PropertyDetail } from './pages/PropertyDetail';
import { AddProperty } from './pages/AddProperty';
import EditProperty from './pages/EditProperty';

import { RoomsPage } from './pages/RoomsPage';
import { AddRoom } from './pages/AddRoom';
import { TenantsPage } from './pages/TenantsPage';
import AddTenantPage from './pages/AddTenantPage';
import { TenantProfile } from './pages/TenantProfile';
import { TenantDetail } from './pages/TenantDetail';
import { SecurityDepositsPage } from './pages/SecurityDepositsPage';
import { RentManagement } from './pages/RentManagement';
import { ElectricityBills } from './pages/ElectricityBills';
import { InvoiceList } from './pages/InvoiceList';
import { ReportsPage } from './pages/ReportsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import OwnerVerificationPage, { CurrentUserProfile } from './pages/OwnerVerificationPage';
import AdminPortalPage from './pages/AdminPortalPage';

type ApiProperty = {
  id: number;
  name: string;
  property_type: string;
  address: string;
  city: string;
  state: string;
  pin_code: string;
  monthly_rent: string | number;
  security_deposit: string | number;
  rent_due_day: number;
  electricity_rate: string | number;
  image?: string | null;
  owner: number;
  owner_display_name?: string;
  contact_number?: string;
};

type ApiRoom = {
  id: number;
  room_number: string;
  floor: string | number;
  room_type: string;
  monthly_rent: string | number;
  security_deposit: string | number;
  status: string;
  property: number;
};

type ApiTenant = {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  alternate_phone?: string;
  date_of_birth?: string | null;
  address: string;
  occupation?: string;
  emergency_contact_name: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone: string;
};

type ApiRentalAgreement = {
  id: number;
  tenant: number;
  room: number;
  start_date: string;
  end_date: string | null;
  monthly_rent: string | number;
  security_deposit: string | number;
  security_deposit_status?: 'PENDING' | 'PAID' | 'REFUNDED' | 'SETTLED';
  deposit_paid_date?: string | null;
  deposit_refund_date?: string | null;
  deposit_payment_method?: string;
  deposit_transaction_ref?: string;
  refund_amount?: string | number;
  deduction_amount?: string | number;
  deduction_reason?: string;
  handover_items?: HandoverItem[];
  handover_notes?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'TERMINATED';
  notes?: string;
  property_id?: number;
  property_name?: string;
  tenant_name?: string;
  tenant_phone?: string;
  room_number?: string;
};

type ApiRentRecord = {
  id: number;
  agreement: number;
  billing_month: string;
  rent_amount: string | number;
  due_date: string;
  amount_paid: string | number;
  outstanding_amount: string | number;
  status: string;
  notes?: string;
  tenant_name: string;
  property_id?: number;
  property_name: string;
  room_number: string;
  is_archived?: boolean;
  archived_at?: string;
};

type ApiPayment = {
  id: number;
  agreement: number;
  rent_record: number | null;
  electricity_bill: number | null;
  amount: string | number;
  payment_date: string;
  payment_method: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'OTHER';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  transaction_reference: string;
  notes: string;
  property_id?: number;
  property_name?: string;
};

type ApiElectricityMeter = {
  id: number;
  room: number;
  meter_number: string;
  installation_date: string;
  is_active: boolean;
  notes: string;
};

type ApiMeterReading = {
  id: number;
  meter: number;
  reading_date: string;
  previous_reading: string | number;
  current_reading: string | number;
  notes: string;
};

type ApiElectricityBill = {
  id: number;
  meter: number;
  reading: number;
  billing_month: string;
  units_consumed: string | number;
  rate_per_unit: string | number;
  total_amount: string | number;
  due_date: string;
  amount_paid: string | number;
  status: string;
  property_id?: number;
  property_name?: string;
};

type ApiNotification = {
  id: number | string;
  tenant_name?: string;
  tenant_phone?: string;
  tenant_email?: string;
  property_name?: string;
  room_number?: string;
  title?: string;
  message?: string;
  description?: string;
  category?: string;
  notification_type?: string;
  amount_due?: string | number;
  due_date?: string;
  is_read?: boolean;
  is_sent?: boolean;
  sent_at?: string;
  sent_via?: string;
  whatsapp_url?: string;
  formatted_message?: string;
  created_at?: string;
};

const READ_NOTIFS_STORAGE_KEY = 'kirayasaathi_read_notifications_v1';
const DISMISSED_NOTIFS_STORAGE_KEY = 'kirayasaathi_dismissed_notifications_v1';
const LOCAL_PAYMENTS_CACHE_KEY = 'kirayasaathi_auto_tracked_payments_v1';

function getStoredIdSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set<string>(parsed.map(String));
    }
  } catch {
    // ignore storage errors
  }
  return new Set<string>();
}

function saveStoredIdSet(key: string, set: Set<string>): void {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    // ignore storage errors
  }
}

function getCachedPayments(): PaymentRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_PAYMENTS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as PaymentRecord[];
    }
  } catch {
    // ignore
  }
  return [];
}

function saveCachedPayments(list: PaymentRecord[]): void {
  try {
    localStorage.setItem(LOCAL_PAYMENTS_CACHE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

const money = (value: string | number | null | undefined): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

function formatMonthLabel(dateIso?: string): string {
  if (!dateIso) return 'Current Cycle';
  const clean = dateIso.slice(0, 7);
  const [y, m] = clean.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  if (Number.isNaN(d.getTime())) return clean;
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function normaliseRoomStatus(status: string): Room['status'] {
  switch (status.toUpperCase()) {
    case 'OCCUPIED':
      return 'Occupied';
    case 'MAINTENANCE':
      return 'Maintenance';
    default:
      return 'Vacant';
  }
}

function normaliseRentStatus(status: string): RentRecord['status'] {
  switch (status.toUpperCase()) {
    case 'PAID':
      return 'Paid';
    case 'OVERDUE':
      return 'Overdue';
    case 'PARTIAL':
      return 'Partial';
    default:
      return 'Pending';
  }
}

function normaliseElectricityStatus(status: string): ElectricityBill['status'] {
  switch (status.toUpperCase()) {
    case 'PAID':
      return 'Paid';
    case 'OVERDUE':
      return 'Overdue';
    case 'PARTIAL':
      return 'Partial';
    default:
      return 'Pending';
  }
}

async function fetchElectricityApi(
  subPath: string,
  options?: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown }
): Promise<unknown> {
  const prefixes = ['/api/electricity', '/api/billing', '/api'];
  let lastErr: unknown = null;
  for (const prefix of prefixes) {
    try {
      return await apiRequest<unknown>(`${prefix}${subPath}`, options);
    } catch (err) {
      lastErr = err;
    }
  }
  if (options?.method && options.method !== 'GET') {
    throw lastErr || new Error('Electricity endpoint unreachable');
  }
  return [];
}

async function fetchPaymentsApi(): Promise<unknown> {
  const endpoints = ['/api/payments/', '/api/billing/payments/'];
  for (const ep of endpoints) {
    try {
      return await apiRequest<unknown>(ep);
    } catch {
      // try next endpoint
    }
  }
  return [];
}

async function fetchBackendNotificationsApi(): Promise<ApiNotification[]> {
  const endpoints = ['/api/notifications/'];
  for (const ep of endpoints) {
    try {
      await apiRequest('/api/notifications/generate/', {
        method: 'POST',
        body: { days_ahead: 3 },
      }).catch(() => {});
      const res = await apiRequest<unknown>(ep);
      return asArray<ApiNotification>(res);
    } catch {
      // optional endpoint
    }
  }
  return [];
}

async function postPaymentApi(payload: Record<string, unknown>): Promise<ApiPayment> {
  const endpoints = ['/api/payments/', '/api/billing/payments/'];
  let lastError: unknown = null;

  for (const ep of endpoints) {
    try {
      return await apiRequest<ApiPayment>(ep, {
        method: 'POST',
        body: payload,
      });
    } catch (err) {
      lastError = err;
      if (err instanceof ApiError && [400, 403, 409, 422].includes(err.status)) {
        throw err;
      }
    }
  }
  throw lastError || new Error('Payment endpoint not reachable.');
}

const normalizePropertyType = (type?: string): string => {
  if (!type) return 'BUILDING';
  const upper = type.trim().toUpperCase();
  const mapping: Record<string, string> = {
    APARTMENT: 'APARTMENT',
    FLAT: 'APARTMENT',
    RESIDENTIAL: 'BUILDING',
    'RESIDENTIAL BUILDING': 'BUILDING',
    BUILDING: 'BUILDING',
    HOSTEL: 'HOSTEL',
    PG: 'PG',
    'PG / HOSTEL': 'HOSTEL',
    'PG / CO-LIVING': 'PG',
    HOUSE: 'HOUSE',
    INDEPENDENT: 'HOUSE',
    'INDEPENDENT HOUSE': 'HOUSE',
    COMMERCIAL: 'COMMERCIAL',
    'COMMERCIAL PROPERTY': 'COMMERCIAL',
    OTHER: 'OTHER',
  };
  return mapping[upper] || 'BUILDING';
};

const normalizeRoomType = (type?: string): string => {
  if (!type) return 'SINGLE';
  const upper = type.trim().toUpperCase();
  if (upper.includes('DOUBLE') || upper.includes('TWIN')) return 'DOUBLE';
  if (upper.includes('TRIPLE')) return 'TRIPLE';
  if (upper.includes('FOUR')) return 'FOUR';
  if (upper.includes('SHARED') || upper.includes('DORM') || upper.includes('HALL')) return 'SHARED';
  return 'SINGLE';
};

const normalizeRoomStatus = (status?: string): string => {
  if (!status) return 'VACANT';
  const upper = status.trim().toUpperCase();
  if (upper.includes('OCCUPIED')) return 'OCCUPIED';
  if (upper.includes('MAINTENANCE')) return 'MAINTENANCE';
  return 'VACANT';
};

// ============================================================================
// REACT ROUTER URL <-> PAGETYPE MAPPING
// ============================================================================
const PAGE_TO_PATH: Record<PageType, string> = {
  landing: '/welcome',
  dashboard: '/dashboard',
  property_list: '/properties',
  property_filter: '/properties/filter',
  property_detail: '/properties/detail',
  add_property: '/properties/add',
  edit_property: '/properties/edit',
  rooms: '/rooms',
  add_room: '/rooms/add',
  tenants: '/tenants',
  add_tenant: '/tenants/add',
  tenant_profile: '/tenants/profile',
  tenant_detail: '/tenants/edit',
  security_deposits: '/security-deposits',
  rent_management: '/rent-management',
  electricity_bills: '/electricity-bills',
  electricity_bill_form: '/electricity-bills/new',
  invoice_list: '/invoices',
  reports: '/reports',
  notifications: '/notifications',
  settings: '/settings',
};

const PATH_TO_PAGE: Record<string, PageType> = Object.entries(PAGE_TO_PATH).reduce(
  (acc, [page, path]) => {
    acc[path.toLowerCase()] = page as PageType;
    return acc;
  },
  {} as Record<string, PageType>
);

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('login');

  // Derive currentPage directly from the active URL path
  const cleanPathname = location.pathname.toLowerCase().replace(/\/+$/, '') || '/dashboard';
  const currentPage: PageType = PATH_TO_PAGE[cleanPathname] || 'dashboard';

  const [properties, setProperties] = useState<Property[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rentRecords, setRentRecords] = useState<RentRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>(() => getCachedPayments());
  const [electricityBills, setElectricityBills] = useState<ElectricityBill[]>([]);

  const [sessionNotifications, setSessionNotifications] = useState<NotificationItem[]>([]);
  const [apiNotifications, setApiNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() =>
    getStoredIdSet(READ_NOTIFS_STORAGE_KEY)
  );
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() =>
    getStoredIdSet(DISMISSED_NOTIFS_STORAGE_KEY)
  );

  const [tenantRefreshKey, setTenantRefreshKey] = useState(0);

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [preselectedRoomForAllocation, setPreselectedRoomForAllocation] =
    useState<Room | null>(null);
  const [selectedInvoiceTenantName, setSelectedInvoiceTenantName] = useState('');
  const [paymentModalTenantId, setPaymentModalTenantId] = useState<string | undefined>(
    undefined
  );
  const [paymentModalDefaultType, setPaymentModalDefaultType] = useState<
    'rent' | 'electricity'
  >('rent');
  const [paymentModalDefaultBillId, setPaymentModalDefaultBillId] = useState<
    string | undefined
  >(undefined);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);

  const [dataError, setDataError] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(false);

  const [currentUserProfile, setCurrentUserProfile] = useState<CurrentUserProfile | null>(null);

  const checkIsAdminPortal = useCallback(() => {
    const hash = window.location.hash.toLowerCase();
    const path = location.pathname.toLowerCase();
    const search = location.search.toLowerCase();
    return (
      hash.includes('admin') ||
      path.includes('admin') ||
      search.includes('admin')
    );
  }, [location.pathname, location.search]);

  const [isAdminPortal, setIsAdminPortal] = useState<boolean>(() => checkIsAdminPortal());

  useEffect(() => {
    setIsAdminPortal(checkIsAdminPortal());
  }, [checkIsAdminPortal]);

  useEffect(() => {
    const handleRouteChange = () => {
      setIsAdminPortal(checkIsAdminPortal());
    };
    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);
    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [checkIsAdminPortal]);

  const handleNavigate = useCallback(
    (page: PageType) => {
      if (page !== 'add_tenant') {
        setPreselectedRoomForAllocation(null);
      }
      const targetPath = PAGE_TO_PATH[page] || '/dashboard';
      navigate(targetPath);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [navigate]
  );

  const refreshCurrentUserProfile = useCallback(async (): Promise<CurrentUserProfile | null> => {
    try {
      const data = await apiRequest<CurrentUserProfile>('/api/auth/me/');
      setCurrentUserProfile(data);
      if (data) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      return data;
    } catch {
      setIsAuthenticated(false);
      setCurrentUserProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;

    refreshCurrentUserProfile().finally(() => {
      if (active) setIsCheckingAuth(false);
    });

    return () => {
      active = false;
    };
  }, [refreshCurrentUserProfile]);

  // Unified backend data loading for Properties, Rooms, Tenants, Agreements, Billing, Electricity, Payments & Notifications

  const loadTenantRentAndElectricityData = useCallback(async (): Promise<Property[]> => {
    if (
      !isAuthenticated ||
      !(
        currentUserProfile?.is_authorized ||
        currentUserProfile?.is_staff ||
        currentUserProfile?.is_superuser
      )
    ) {
      return [];
    }

    try {
      const [
        propertyResponse,
        roomResponse,
        tenantResponse,
        agreementResponse,
        rentResponse,
        paymentsResponse,
        metersResponse,
        readingsResponse,
        billsResponse,
        backendNotifsResponse,
      ] = await Promise.all([
        apiRequest<unknown>('/api/properties/'),
        apiRequest<unknown>('/api/properties/rooms/'),
        apiRequest<unknown>('/api/tenants/'),
        apiRequest<unknown>('/api/tenants/rental-agreements/'),
        apiRequest<unknown>('/api/billing/'),
        fetchPaymentsApi(),
        fetchElectricityApi('/meters/'),
        fetchElectricityApi('/readings/'),
        fetchElectricityApi('/bills/'),
        fetchBackendNotificationsApi(),
      ]);

      const apiProperties = asArray<ApiProperty>(propertyResponse);
      const apiRooms = asArray<ApiRoom>(roomResponse);
      const apiTenants = asArray<ApiTenant>(tenantResponse);
      const agreements = asArray<ApiRentalAgreement>(agreementResponse);
      const apiRentRecords = asArray<ApiRentRecord>(rentResponse);
      const apiPayments = asArray<ApiPayment>(paymentsResponse);
      const apiMeters = asArray<ApiElectricityMeter>(metersResponse);
      const apiReadings = asArray<ApiMeterReading>(readingsResponse);
      const apiBills = asArray<ApiElectricityBill>(billsResponse);

      const activeAgreements = agreements.filter(
        (agreement) => agreement.status.toUpperCase() === 'ACTIVE',
      );

      const agreementByTenant = new Map<number, ApiRentalAgreement>();
      const latestAgreementByTenant = new Map<number, ApiRentalAgreement>();
      const activeTenantsByRoomId = new Map<string, ApiTenant[]>();
      const activeAgreementsByRoomId = new Map<string, ApiRentalAgreement[]>();

      const sortedAgreements = [...agreements].sort((a, b) => {
        const aActive = a.status.toUpperCase() === 'ACTIVE' ? 1 : 0;
        const bActive = b.status.toUpperCase() === 'ACTIVE' ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        return b.id - a.id;
      });
      for (const agr of sortedAgreements) {
        if (!latestAgreementByTenant.has(agr.tenant)) {
          latestAgreementByTenant.set(agr.tenant, agr);
        }
      }

      for (const agreement of activeAgreements) {
        agreementByTenant.set(agreement.tenant, agreement);
        const rId = String(agreement.room);
        const curAgrs = activeAgreementsByRoomId.get(rId) || [];
        curAgrs.push(agreement);
        activeAgreementsByRoomId.set(rId, curAgrs);

        const foundTenant = apiTenants.find((t) => t.id === agreement.tenant);
        if (foundTenant) {
          const curTenants = activeTenantsByRoomId.get(rId) || [];
          if (!curTenants.some((t) => t.id === foundTenant.id)) {
            curTenants.push(foundTenant);
            activeTenantsByRoomId.set(rId, curTenants);
          }
        }
      }

      const agreementById = new Map<number, ApiRentalAgreement>(
        agreements.map((agreement) => [agreement.id, agreement]),
      );

      const tenantById = new Map<number, ApiTenant>(
        apiTenants.map((t) => [t.id, t]),
      );

      const propertyById = new Map<number, ApiProperty>(
        apiProperties.map((p) => [p.id, p]),
      );
      const propertyNameById = new Map<number, string>(
        apiProperties.map((p) => [p.id, p.name]),
      );
      const roomById = new Map<number, ApiRoom>(
        apiRooms.map((r) => [r.id, r]),
      );

      // Build enriched mappedRooms with full multi-tenant capacity & bed occupancy tracking
      const mappedRooms: Room[] = apiRooms.map((room) => {
        const propName = propertyNameById.get(room.property) ?? 'Property';
        const roomAgrs = activeAgreementsByRoomId.get(String(room.id)) || [];
        const roomTenants = activeTenantsByRoomId.get(String(room.id)) || [];

        const occupants: RoomOccupant[] = roomAgrs.map((ag) => {
          const t = tenantById.get(ag.tenant);
          return {
            id: String(ag.tenant),
            name: t?.full_name || 'Tenant',
            phone: t?.phone,
            email: t?.email,
            agreementId: ag.id,
            monthlyRent: money(ag.monthly_rent),
            moveInDate: ag.start_date || undefined,
          };
        });

        const rType = (room.room_type || '').toUpperCase();
        const fallbackCapacity =
          rType.includes('DOUBLE') || rType.includes('TWIN')
            ? 2
            : rType.includes('TRIPLE')
            ? 3
            : rType.includes('FOUR') || rType.includes('SHARED')
            ? 4
            : 1;

        const rawCapacity = (room as unknown as { capacity?: number }).capacity;
        const capacity = Number(rawCapacity) || fallbackCapacity;
        const occupiedBeds = occupants.length;
        const vacantBeds = Math.max(0, capacity - occupiedBeds);
        const isFull = occupiedBeds >= capacity;

        const tenantNames = occupants.map((o) => o.name).join(', ');
        const primaryTenant = occupants[0];
        const rmMeter = apiMeters.find((m) => m.room === room.id);

        return {
          id: String(room.id),
          number: room.room_number,
          propertyId: String(room.property),
          propertyName: propName,
          floor: String(room.floor),
          type: room.room_type,
          capacity,
          occupiedBeds,
          vacantBeds,
          isFull,
          occupants,
          tenantName: tenantNames || null,
          tenantId: primaryTenant ? primaryTenant.id : null,
          moveInDate: primaryTenant ? (primaryTenant.moveInDate || null) : null,
          meterId: rmMeter?.meter_number ?? undefined,
          monthlyRent: money(room.monthly_rent),
          deposit: money(room.security_deposit),
          status: isFull
            ? 'Occupied'
            : occupiedBeds > 0
            ? 'Occupied'
            : normaliseRoomStatus(room.status),
        };
      });

      const rentRecordsByTenant = new Map<number, ApiRentRecord[]>();

      for (const record of apiRentRecords) {
        const agreement = agreementById.get(record.agreement);
        if (!agreement) continue;

        const existing = rentRecordsByTenant.get(agreement.tenant) ?? [];
        existing.push(record);
        rentRecordsByTenant.set(agreement.tenant, existing);
      }

      const meterById = new Map<number, ApiElectricityMeter>(
        apiMeters.map((m) => [m.id, m]),
      );
      const readingById = new Map<number, ApiMeterReading>(
        apiReadings.map((r) => [r.id, r]),
      );

      const mappedElectricityBills: ElectricityBill[] = apiBills.map((bill) => {
        const meter = meterById.get(bill.meter);
        const reading = readingById.get(bill.reading);
        const roomObj = meter ? roomById.get(meter.room) : undefined;
        const propObj = roomObj ? propertyById.get(roomObj.property) : undefined;
        const roomItem = mappedRooms.find((r) => r.id === String(meter?.room ?? ''));
        const roomTenants = meter
          ? activeTenantsByRoomId.get(String(meter.room)) || []
          : [];
        const tenantDisplayName =
          roomTenants.length > 0
            ? roomTenants.map((t) => t.full_name).join(', ')
            : roomItem?.tenantName ?? 'Unassigned';

        return {
          id: String(bill.id),
          meterDbId: bill.meter,
          readingDbId: bill.reading,
          roomId: roomObj ? String(roomObj.id) : (roomItem?.id ?? (meter ? String(meter.room) : '')),
          propertyId: propObj ? String(propObj.id) : (bill.property_id ? String(bill.property_id) : (roomItem?.propertyId ?? '')),
          meterId: meter?.meter_number ?? `MTR-${bill.meter}`,
          tenantName: tenantDisplayName,
          propertyName: propObj?.name || bill.property_name || roomItem?.propertyName || 'Property',
          roomNumber: roomObj?.room_number ?? roomItem?.number ?? (meter ? String(meter.room) : 'N/A'),
          previousReading: money(reading?.previous_reading),
          currentReading: money(reading?.current_reading),
          units: money(bill.units_consumed),
          rate: money(bill.rate_per_unit),
          amount: money(bill.total_amount),
          amountPaid: money(bill.amount_paid),
          status: normaliseElectricityStatus(bill.status),
          readingDate: reading?.reading_date ?? bill.billing_month,
          billingMonth: bill.billing_month,
          dueDate: bill.due_date,
        };
      });

      const mappedPaymentsFromApi: PaymentRecord[] = apiPayments.map((p) => {
        const agreement = agreementById.get(p.agreement);
        const tenantObj = agreement ? tenantById.get(agreement.tenant) : undefined;
        const roomObj = agreement ? roomById.get(agreement.room) : undefined;
        const propObj = roomObj ? propertyById.get(roomObj.property) : undefined;
        const roomItem = mappedRooms.find(
          (r) => r.id === String(agreement?.room ?? '')
        );

        return {
          id: String(p.id),
          agreementId: p.agreement,
          rentRecordId: p.rent_record,
          electricityBillId: p.electricity_bill,
          tenantName: tenantObj?.full_name ?? 'Tenant',
          propertyName: propObj?.name ?? p.property_name ?? roomItem?.propertyName ?? 'Property',
          roomNumber: roomObj?.room_number ?? roomItem?.number ?? 'Room',
          amount: money(p.amount),
          paymentDate: p.payment_date,
          paymentMethod: p.payment_method,
          status: p.status,
          transactionReference: p.transaction_reference || '',
          notes: p.notes || '',
          paymentType: p.electricity_bill ? 'electricity' : 'rent',
        };
      });

      // Merge API payments with any locally cached auto-tracked payments
      const cachedLocal = getCachedPayments();
      const mergedPaymentsMap = new Map<string, PaymentRecord>();
      mappedPaymentsFromApi.forEach((p) =>
        mergedPaymentsMap.set(p.transactionReference || `api-${p.id}`, p)
      );
      cachedLocal.forEach((p) => {
        const key = p.transactionReference || p.id;
        if (!mergedPaymentsMap.has(key)) {
          mergedPaymentsMap.set(key, p);
        }
      });
      const mergedPayments = Array.from(mergedPaymentsMap.values()).sort(
        (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
      );

      // Compute locally tracked payments per rentRecord / electricityBill if backend endpoint didn't auto-update status
      const paidByRentRecord = new Map<number, number>();
      const paidByElecBill = new Map<number, number>();
      const paidByAgrMonth = new Map<string, number>();
      mergedPayments.forEach((p) => {
        if (p.rentRecordId) {
          paidByRentRecord.set(
            p.rentRecordId,
            (paidByRentRecord.get(p.rentRecordId) || 0) + p.amount
          );
        }
        if (p.electricityBillId) {
          paidByElecBill.set(
            p.electricityBillId,
            (paidByElecBill.get(p.electricityBillId) || 0) + p.amount
          );
        }
        if (!p.rentRecordId && !p.electricityBillId && p.agreementId && p.paymentType === 'rent') {
          const k = `${p.agreementId}-${(p.paymentDate || '').slice(0, 7)}`;
          paidByAgrMonth.set(k, (paidByAgrMonth.get(k) || 0) + p.amount);
        }
      });

      const enrichedElectricityBills: ElectricityBill[] = mappedElectricityBills.map(
        (b) => {
          const trackedPaid = paidByElecBill.get(Number(b.id)) || 0;
          const effectivePaid = Math.max(b.amountPaid || 0, trackedPaid);
          const isNowPaid = effectivePaid >= b.amount && b.amount > 0;
          return {
            ...b,
            amountPaid: effectivePaid,
            status: isNowPaid ? 'Paid' : b.status,
          };
        }
      );

      const todayIsoStr = new Date().toISOString().split('T')[0];

      const mappedRentRecords: RentRecord[] = apiRentRecords.map((record) => {
        const agreement = agreementById.get(record.agreement);
        const tenantObj = agreement ? tenantById.get(agreement.tenant) : undefined;
        const roomObj = agreement ? roomById.get(agreement.room) : undefined;
        const propObj = roomObj ? propertyById.get(roomObj.property) : undefined;
        const roomItem = mappedRooms.find(
          (item) => item.id === String(agreement?.room ?? ''),
        );
        const rentDue = money(record.rent_amount);
        const mKey = `${record.agreement}-${(record.billing_month || record.due_date || '').slice(0, 7)}`;
        const agrPaid = paidByAgrMonth.get(mKey) || 0;
        const trackedPaid = (paidByRentRecord.get(record.id) || 0) + agrPaid;
        const received = Math.max(money(record.amount_paid), trackedPaid);
        const balance = Math.max(0, rentDue - received);
        const rawStatus = normaliseRentStatus(record.status);
        const isPastDue = record.due_date && record.due_date < todayIsoStr;
        const status: RentRecord['status'] =
          balance <= 0 && rentDue > 0
            ? 'Paid'
            : isPastDue && balance > 0
            ? 'Overdue'
            : received > 0 && balance > 0
            ? 'Partial'
            : rawStatus;

        const monthPrefix = (record.billing_month || record.due_date || '').slice(0, 7);
        const matchingElec =
          enrichedElectricityBills.find(
            (b) =>
              (b.roomId === String(roomObj?.id ?? '') || b.roomNumber === (roomObj?.room_number || record.room_number)) &&
              (b.billingMonth || b.readingDate || '').slice(0, 7) === monthPrefix
          ) ||
          enrichedElectricityBills.find(
            (b) => b.roomId === String(roomObj?.id ?? '') || b.roomNumber === (roomObj?.room_number || record.room_number)
          );

        const roomOccupantsCount = Math.max(
          1,
          activeAgreementsByRoomId.get(String(agreement?.room ?? ''))?.length || 1
        );
        const rawElecAmt = matchingElec ? matchingElec.amount : 0;
        const electricityAmount = matchingElec
          ? Math.round((rawElecAmt / roomOccupantsCount) * 100) / 100
          : 0;

        return {
          id: String(record.id),
          agreementId: record.agreement,
          tenantId: String(agreement?.tenant ?? ''),
          tenantName: tenantObj?.full_name || record.tenant_name,
          tenantPhone: tenantObj?.phone || '',
          tenantEmail: tenantObj?.email || '',
          propertyId: propObj ? String(propObj.id) : (record.property_id ? String(record.property_id) : (roomItem?.propertyId ?? '')),
          propertyName: propObj?.name || record.property_name || roomItem?.propertyName || 'Property',
          roomNumber: roomObj?.room_number || roomItem?.number || record.room_number,
          billingMonth: record.billing_month,
          rentDue,
          received,
          balance,
          dueDate: record.due_date,
          status,
          notes: record.notes,
          isArchived: Boolean(record.is_archived),
          archivedAt: record.archived_at,
          electricityAmount,
          baseRentAmount: rentDue,
        };
      });

      const mappedTenants: Tenant[] = apiTenants.map((tenant) => {
        const activeAgreement = agreementByTenant.get(tenant.id);
        const fallbackAgreement = latestAgreementByTenant.get(tenant.id);
        const agreement = activeAgreement ?? fallbackAgreement;
        const roomObj = agreement ? roomById.get(agreement.room) : undefined;
        const propObj = roomObj ? propertyById.get(roomObj.property) : undefined;
        const roomItem = mappedRooms.find((r) => r.id === String(agreement?.room ?? ''));

        const tenantRentList = mappedRentRecords.filter(
          (r) => r.tenantId === String(tenant.id)
        );

        const balance = tenantRentList.reduce(
          (total, record) => total + record.balance,
          0,
        );

        const roomOccupantsCount = Math.max(
          1,
          agreement
            ? activeAgreementsByRoomId.get(String(agreement.room))?.length || 1
            : 1
        );

        const electricityPending = enrichedElectricityBills
          .filter(
            (b) =>
              b.roomId === String(roomObj?.id ?? '') &&
              b.status !== 'Paid',
          )
          .reduce(
            (sum, b) => {
              const unpaid = Math.max(0, b.amount - (b.amountPaid ?? 0));
              return sum + Math.round((unpaid / roomOccupantsCount) * 100) / 100;
            },
            0,
          );

        return {
          id: String(tenant.id),
          agreementId: agreement?.id,
          agreementStatus: agreement?.status,
          agreementNotes: agreement?.notes ?? '',
          name: tenant.full_name,
          email: tenant.email,
          phone: tenant.phone,
          alternatePhone: tenant.alternate_phone ?? '',
          dateOfBirth: tenant.date_of_birth ?? '',
          occupation: tenant.occupation ?? '',
          permanentAddress: tenant.address,
          propertyId: propObj ? String(propObj.id) : (roomItem?.propertyId ?? ''),
          propertyName: propObj?.name ?? (roomItem?.propertyName ?? ''),
          roomId: roomObj ? String(roomObj.id) : (roomItem?.id ?? ''),
          roomNumber: roomObj?.room_number ?? (roomItem?.number ?? ''),
          monthlyRent: money(agreement?.monthly_rent),
          securityDeposit: money(agreement?.security_deposit),
          securityDepositStatus: (agreement?.security_deposit_status || 'PENDING') as 'PENDING' | 'PAID' | 'REFUNDED' | 'SETTLED',
          depositPaidDate: agreement?.deposit_paid_date ?? null,
          depositRefundDate: agreement?.deposit_refund_date ?? null,
          depositPaymentMethod: agreement?.deposit_payment_method ?? 'UPI',
          depositTransactionRef: agreement?.deposit_transaction_ref ?? '',
          refundAmount: money(agreement?.refund_amount),
          deductionAmount: money(agreement?.deduction_amount),
          deductionReason: agreement?.deduction_reason ?? '',
          handoverItems: Array.isArray(agreement?.handover_items) ? agreement.handover_items : [],
          handoverNotes: agreement?.handover_notes ?? '',
          moveInDate: agreement?.start_date ?? '',
          agreementEndDate: agreement?.end_date ?? '',
          status: activeAgreement ? 'Active' : 'Past',
          balance,
          electricityPending,
          emergencyContact: {
            name: tenant.emergency_contact_name,
            relationship: tenant.emergency_contact_relationship ?? '',
            phone: tenant.emergency_contact_phone,
          },
        };
      });

      const mappedProperties: Property[] = apiProperties.map((property, index) => {
        const propRooms = mappedRooms.filter(
          (room) => room.propertyId === String(property.id)
        );

        const propRentRecords = mappedRentRecords.filter(
          (r) =>
            r.propertyId === String(property.id) ||
            r.propertyName.trim().toLowerCase() === property.name.trim().toLowerCase()
        );

        const collected = propRentRecords.reduce((s, r) => s + r.received, 0);
        const pending = propRentRecords.reduce((s, r) => s + r.balance, 0);

        return {
          id: String(property.id),
          name: property.name,
          image: property.image ?? null,
          type: property.property_type,
          address: property.address,
          locality: '',
          city: property.city,
          state: property.state,
          pinCode: property.pin_code,
          totalRooms: propRooms.length,
          occupiedRooms: propRooms.filter(
            (room) => room.status === 'Occupied'
          ).length,
          rentCollected: collected,
          pendingRent: pending,
          monthlyRent: money(property.monthly_rent),
          securityDeposit: money(property.security_deposit),
          rentDueDay: property.rent_due_day,
          electricityRate: money(property.electricity_rate),
          ownerName: property.owner_display_name ?? '',
          contactNumber: property.contact_number ?? '',
          imageTheme: (['one', 'two', 'three', 'four'] as const)[index % 4],
        };
      });

      const mappedApiNotifs: NotificationItem[] = backendNotifsResponse.map((n) => {
        const rawCat = (n.category || n.notification_type || 'general').toLowerCase();
        const category: NotificationItem['category'] =
          rawCat.includes('rent')
            ? 'rent'
            : rawCat.includes('elec')
            ? 'electricity'
            : rawCat.includes('work') || rawCat.includes('prop') || rawCat.includes('room')
            ? 'workspace'
            : 'general';
        const isOverdue = rawCat.includes('overdue');

        return {
          id: `api-notif-${n.id}`,
          rawId: typeof n.id === 'number' ? n.id : parseInt(String(n.id).replace(/\D/g, ''), 10) || undefined,
          tenantName: n.tenant_name,
          tenantPhone: n.tenant_phone,
          tenantEmail: n.tenant_email,
          amountDue: money(n.amount_due),
          dueDate: n.due_date,
          isSent: Boolean(n.is_sent),
          sentAt: n.sent_at,
          sentVia: n.sent_via,
          whatsappUrl: n.whatsapp_url,
          formattedMessage: n.formatted_message,
          title: n.title || 'System Notification',
          description: n.description || n.message || '',
          time: n.created_at
            ? `Today · ${new Date(n.created_at).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
              })}`
            : 'Today',
          category,
          isOverdue,
          isRead: Boolean(n.is_read),
          type:
            isOverdue
              ? 'warning'
              : category === 'electricity'
              ? 'electricity'
              : category === 'rent'
              ? 'warning'
              : 'blue',
          actionText:
            category === 'rent'
              ? 'Review rent →'
              : category === 'electricity'
              ? 'View bills →'
              : 'Open dashboard →',
          actionTarget:
            category === 'rent'
              ? 'rent_management'
              : category === 'electricity'
              ? 'electricity_bills'
              : 'dashboard',
        };
      });

      setProperties(mappedProperties);
      setSelectedProperty((previous) => {
        if (!previous) return mappedProperties[0] ?? null;
        return (
          mappedProperties.find((p) => p.id === previous.id) ??
          mappedProperties[0] ??
          null
        );
      });
      setRooms(mappedRooms);
      setElectricityBills(enrichedElectricityBills);
      setTenants(mappedTenants);
      setRentRecords(mappedRentRecords);
      setPayments(mergedPayments);
      setApiNotifications(mappedApiNotifs);

      setSelectedTenant((previous) => {
        if (!previous) return mappedTenants[0] ?? null;
        return (
          mappedTenants.find((tenant) => tenant.id === previous.id) ??
          previous
        );
      });

      return mappedProperties;
    } catch (error) {
      setDataError(
        error instanceof Error
          ? error.message
          : 'Tenants, rent aur electricity records load nahi ho sake.',
      );
      return [];
    }
  }, [isAuthenticated, currentUserProfile]);

  const loadPropertyData = useCallback(async (): Promise<Property[]> => {
    return await loadTenantRentAndElectricityData();
  }, [loadTenantRentAndElectricityData]);

  const handleRefreshAll = useCallback(async (): Promise<void> => {
    await loadTenantRentAndElectricityData();
    setTenantRefreshKey((prev) => prev + 1);
  }, [loadTenantRentAndElectricityData]);

  useEffect(() => {
    void loadTenantRentAndElectricityData();
  }, [loadTenantRentAndElectricityData, tenantRefreshKey]);

  // Dynamically synthesize combined Rent + Electricity Invoices from backend records
  const invoices = useMemo<Invoice[]>(() => {
    const list: Invoice[] = [];
    const handledTenantMonths = new Set<string>();
    const handledElectricityBillIds = new Set<string>();

    // 1. Build combined invoices for every RentRecord
    rentRecords.forEach((r) => {
      const tenant =
        (r.tenantId ? tenants.find((t) => String(t.id) === String(r.tenantId)) : undefined) ||
        (r.agreementId ? tenants.find((t) => t.agreementId === r.agreementId) : undefined) ||
        (r.roomNumber ? tenants.find((t) => t.roomNumber === r.roomNumber && t.status === 'Active') : undefined) ||
        tenants.find((t) => t.name.trim().toLowerCase() === r.tenantName.trim().toLowerCase() && t.status === 'Active') ||
        tenants.find((t) => t.name.trim().toLowerCase() === r.tenantName.trim().toLowerCase());
      const prop = properties.find(
        (p) => p.id === (r.propertyId || tenant?.propertyId) || p.name === r.propertyName
      );
      const monthPrefix = (r.billingMonth || r.dueDate || '').slice(0, 7);
      const key = `${tenant?.id || r.tenantId || r.tenantName}-${monthPrefix}`;
      handledTenantMonths.add(key);

      const matchingElec =
        electricityBills.find(
          (b) =>
            (b.roomId === tenant?.roomId || b.roomNumber === r.roomNumber) &&
            (b.billingMonth || b.readingDate || '').slice(0, 7) === monthPrefix
        ) ||
        electricityBills.find(
          (b) => b.roomId === tenant?.roomId || b.roomNumber === r.roomNumber
        );

      if (matchingElec) {
        handledElectricityBillIds.add(String(matchingElec.id));
      }

      const targetRoom = rooms.find(
        (rm) =>
          (tenant?.roomId && rm.id === tenant.roomId) ||
          (rm.number === r.roomNumber &&
            (rm.propertyId === (r.propertyId || tenant?.propertyId) ||
              rm.propertyName === (r.propertyName || tenant?.propertyName)))
      );
      const roomActiveTenants = tenants.filter(
        (t) =>
          t.status === 'Active' &&
          ((targetRoom?.id && t.roomId === targetRoom.id) ||
            (t.roomNumber === r.roomNumber &&
              (t.propertyId === (r.propertyId || tenant?.propertyId) ||
                t.propertyName === (r.propertyName || tenant?.propertyName))))
      );
      const sharingCount = Math.max(1, roomActiveTenants.length || targetRoom?.occupants?.length || 1);

      const rentAmount = Number(r.rentDue) || 0;
      const rawElecAmount = Number(matchingElec?.amount) || 0;
      const rawElecUnits = Number(matchingElec?.units) || 0;
      const elecAmount = matchingElec
        ? Math.round((rawElecAmount / sharingCount) * 100) / 100
        : 0;
      const elecUnits = matchingElec
        ? Math.round((rawElecUnits / sharingCount) * 10) / 10
        : 0;
      const total = rentAmount + elecAmount;

      const rawElecPaid =
        matchingElec?.amountPaid ??
        (matchingElec?.status === 'Paid' ? rawElecAmount : 0);
      const elecPaid = matchingElec
        ? Math.round((rawElecPaid / sharingCount) * 100) / 100
        : 0;
      const amountPaid = (Number(r.received) || 0) + elecPaid;
      const balanceDue = Math.max(0, total - amountPaid);

      const latestPayment = payments.find(
        (p) =>
          p.rentRecordId === Number(r.id) ||
          (matchingElec && p.electricityBillId === Number(matchingElec.id)) ||
          p.tenantName.toLowerCase() === r.tenantName.toLowerCase()
      );

      const fullAddress = prop
        ? [prop.address, prop.city, prop.state, prop.pinCode]
            .filter(Boolean)
            .join(', ')
        : r.propertyName;

      list.push({
        id: `inv-rent-${r.id}`,
        invoiceNumber: `INV-${monthPrefix.replace('-', '')}-R${r.roomNumber || r.id}-${tenant?.id || r.tenantId || 'T'}`,
        receiptNumber: latestPayment?.transactionReference || `RCT-${r.id}`,
        tenantId: tenant?.id || r.tenantId,
        agreementId: r.agreementId || tenant?.agreementId,
        rentRecordId: Number(r.id),
        electricityBillId: matchingElec ? Number(matchingElec.id) : undefined,
        tenantName: tenant?.name || r.tenantName,
        tenantEmail: tenant?.email || r.tenantEmail || '',
        tenantPhone: tenant?.phone || r.tenantPhone || '',
        propertyId: prop?.id || tenant?.propertyId || r.propertyId,
        propertyName: prop?.name || tenant?.propertyName || r.propertyName,
        propertyAddress: fullAddress,
        roomNumber: tenant?.roomNumber || r.roomNumber,
        issueDate: r.billingMonth || r.dueDate,
        dueDate: r.dueDate,
        billingMonth: formatMonthLabel(r.billingMonth || r.dueDate),
        rentAmount,
        electricityAmount: elecAmount,
        electricityRate: matchingElec?.rate ?? prop?.electricityRate ?? 8,
        electricityUnits: elecUnits,
        meterId: matchingElec?.meterId,
        meterReadings: matchingElec
          ? {
              prev: matchingElec.previousReading,
              curr: matchingElec.currentReading,
            }
          : { prev: 0, curr: 0 },
        subtotal: total,
        total,
        amountPaid,
        balanceDue,
        status:
          balanceDue <= 0 && total > 0
            ? 'Paid'
            : r.status === 'Overdue'
            ? 'Overdue'
            : 'Pending',
        paymentDate: latestPayment
          ? new Date(latestPayment.paymentDate).toLocaleString('en-IN')
          : undefined,
        paymentMode: latestPayment?.paymentMethod || 'UPI',
        transactionRef: latestPayment?.transactionReference,
        roomType: targetRoom?.type,
        sharingCount,
        electricitySplitNote:
          sharingCount > 1
            ? `Split 1/${sharingCount} (Total Room Electricity: ₹${rawElecAmount.toLocaleString('en-IN')} for ${rawElecUnits} kWh)`
            : undefined,
      });
    });

    // 2. Build invoices for standalone Electricity Bills that were not attached to a RentRecord
    electricityBills.forEach((b) => {
      if (handledElectricityBillIds.has(String(b.id))) return;
      const monthPrefix = (b.billingMonth || b.readingDate || '').slice(0, 7);

      const targetRoom = rooms.find(
        (rm) => rm.id === b.roomId || rm.number === b.roomNumber
      );
      const roomActiveTenants = tenants.filter(
        (t) =>
          (b.roomId && t.roomId === b.roomId) ||
          (b.roomNumber && t.roomNumber === b.roomNumber)
      );
      const tenant =
        roomActiveTenants.find((t) => t.status === 'Active') ||
        roomActiveTenants[0];
      const prop = properties.find(
        (p) =>
          p.id === (b.propertyId || tenant?.propertyId || targetRoom?.propertyId) ||
          p.name === b.propertyName
      );
      const sharingCount = Math.max(
        1,
        roomActiveTenants.length || targetRoom?.occupants?.length || 1
      );

      const rawElecAmount = Number(b.amount) || 0;
      const rawElecUnits = Number(b.units) || 0;
      const elecAmount = Math.round((rawElecAmount / sharingCount) * 100) / 100;
      const elecUnits = Math.round((rawElecUnits / sharingCount) * 10) / 10;
      const total = elecAmount;

      const rawElecPaid =
        b.amountPaid ?? (b.status === 'Paid' ? rawElecAmount : 0);
      const elecPaid = Math.round((rawElecPaid / sharingCount) * 100) / 100;
      const amountPaid = elecPaid;
      const balanceDue = Math.max(0, total - amountPaid);

      const latestPayment = payments.find(
        (p) => p.electricityBillId === Number(b.id)
      );

      const fullAddress = prop
        ? [prop.address, prop.city, prop.state, prop.pinCode]
            .filter(Boolean)
            .join(', ')
        : b.propertyName || 'Property Address';

      const invKey = `${tenant?.id || b.roomId}-${monthPrefix}`;
      handledTenantMonths.add(invKey);

      list.push({
        id: `inv-elec-${b.id}`,
        invoiceNumber: `INV-${monthPrefix.replace('-', '')}-E${b.roomNumber || b.id}-${b.id}`,
        receiptNumber: latestPayment?.transactionReference || `RCT-E-${b.id}`,
        tenantId: tenant?.id || `T-R${b.roomNumber || b.id}`,
        agreementId: tenant?.agreementId,
        electricityBillId: Number(b.id),
        tenantName: tenant?.name || `Occupant (Room ${b.roomNumber})`,
        tenantEmail: tenant?.email || '',
        tenantPhone: tenant?.phone || '',
        propertyId: prop?.id || tenant?.propertyId || b.propertyId,
        propertyName: prop?.name || tenant?.propertyName || b.propertyName || 'Property',
        propertyAddress: fullAddress,
        roomNumber: b.roomNumber || tenant?.roomNumber || 'N/A',
        issueDate: b.billingMonth || b.readingDate || `${monthPrefix}-01`,
        dueDate: b.dueDate || `${monthPrefix}-10`,
        billingMonth: formatMonthLabel(b.billingMonth || b.readingDate),
        rentAmount: 0,
        electricityAmount: elecAmount,
        electricityRate: b.rate ?? prop?.electricityRate ?? 8,
        electricityUnits: elecUnits,
        meterId: b.meterId,
        meterReadings: {
          prev: b.previousReading ?? 0,
          curr: b.currentReading ?? 0,
        },
        subtotal: total,
        total,
        amountPaid,
        balanceDue,
        status:
          balanceDue <= 0 && total > 0
            ? 'Paid'
            : b.status === 'Overdue'
            ? 'Overdue'
            : 'Pending',
        paymentDate: latestPayment
          ? new Date(latestPayment.paymentDate).toLocaleString('en-IN')
          : undefined,
        paymentMode: latestPayment?.paymentMethod || 'UPI',
        transactionRef: latestPayment?.transactionReference,
        roomType: targetRoom?.type,
        sharingCount,
        electricitySplitNote:
          sharingCount > 1
            ? `Split 1/${sharingCount} (Total Room Electricity: ₹${rawElecAmount.toLocaleString('en-IN')} for ${rawElecUnits} kWh)`
            : undefined,
      });
    });

    // 3. Also ensure active tenants without a RentRecord yet still have a previewable monthly bill
    const currentMonthIso = `${new Date().toISOString().slice(0, 7)}-01`;
    tenants
      .filter((t) => t.status === 'Active')
      .forEach((t) => {
        const monthPrefix = currentMonthIso.slice(0, 7);
        const key = `${t.id}-${monthPrefix}`;
        if (handledTenantMonths.has(key)) return;

        const prop = properties.find(
          (p) => p.id === t.propertyId || p.name === t.propertyName
        );
        const matchingElec = electricityBills.find(
          (b) => b.roomId === t.roomId || b.roomNumber === t.roomNumber
        );

        const targetRoom = rooms.find(
          (rm) =>
            rm.id === t.roomId ||
            (rm.number === t.roomNumber && rm.propertyId === t.propertyId)
        );
        const roomActiveTenants = tenants.filter(
          (item) =>
            item.status === 'Active' &&
            ((t.roomId && item.roomId === t.roomId) ||
              (item.roomNumber === t.roomNumber && item.propertyId === t.propertyId))
        );
        const sharingCount = Math.max(
          1,
          roomActiveTenants.length || targetRoom?.occupants?.length || 1
        );

        const rentAmount = Number(t.monthlyRent) || 0;
        const rawElecAmount = Number(matchingElec?.amount) || 0;
        const rawElecUnits = Number(matchingElec?.units) || 0;
        const elecAmount = matchingElec
          ? Math.round((rawElecAmount / sharingCount) * 100) / 100
          : 0;
        const elecUnits = matchingElec
          ? Math.round((rawElecUnits / sharingCount) * 10) / 10
          : 0;
        const total = rentAmount + elecAmount;
        const rawElecPaid =
          matchingElec?.amountPaid ??
          (matchingElec?.status === 'Paid' ? rawElecAmount : 0);
        const elecPaid = matchingElec
          ? Math.round((rawElecPaid / sharingCount) * 100) / 100
          : 0;
        const balanceDue = Math.max(0, total - elecPaid);

        const fullAddress = prop
          ? [prop.address, prop.city, prop.state, prop.pinCode]
              .filter(Boolean)
              .join(', ')
          : t.propertyName;

        list.push({
          id: `inv-tenant-${t.id}`,
          invoiceNumber: `INV-${monthPrefix.replace('-', '')}-R${t.roomNumber || t.id}-${t.id}`,
          tenantId: t.id,
          agreementId: t.agreementId,
          electricityBillId: matchingElec ? Number(matchingElec.id) : undefined,
          tenantName: t.name,
          tenantEmail: t.email,
          tenantPhone: t.phone,
          propertyId: t.propertyId,
          propertyName: t.propertyName || 'Property',
          propertyAddress: fullAddress || 'Property Address',
          roomNumber: t.roomNumber || 'N/A',
          issueDate: currentMonthIso,
          dueDate: `${monthPrefix}-${String(prop?.rentDueDay || 5).padStart(2, '0')}`,
          billingMonth: formatMonthLabel(currentMonthIso),
          rentAmount,
          electricityAmount: elecAmount,
          electricityRate: matchingElec?.rate ?? prop?.electricityRate ?? 8,
          electricityUnits: elecUnits,
          meterId: matchingElec?.meterId,
          meterReadings: matchingElec
            ? {
                prev: matchingElec.previousReading,
                curr: matchingElec.currentReading,
              }
            : { prev: 0, curr: 0 },
          subtotal: total,
          total,
          amountPaid: elecPaid,
          balanceDue,
          status: balanceDue <= 0 && total > 0 ? 'Paid' : 'Pending',
          roomType: targetRoom?.type,
          sharingCount,
          electricitySplitNote:
            sharingCount > 1
              ? `Split 1/${sharingCount} (Total Room Electricity: ₹${rawElecAmount.toLocaleString('en-IN')} for ${rawElecUnits} kWh)`
              : undefined,
        });
      });

    return list;
  }, [rentRecords, tenants, properties, electricityBills, payments, rooms]);

  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [...sessionNotifications, ...apiNotifications];
    const todayIsoStr = new Date().toISOString().split('T')[0];

    rentRecords
      .filter(
        (r) =>
          !r.isArchived &&
          (r.status === 'Overdue' || (r.dueDate && r.dueDate < todayIsoStr)) &&
          r.balance > 0
      )
      .forEach((r) => {
        const matchedTenant =
          (r.tenantId ? tenants.find((t) => String(t.id) === String(r.tenantId)) : undefined) ||
          (r.agreementId ? tenants.find((t) => t.agreementId === r.agreementId) : undefined) ||
          (r.roomNumber ? tenants.find((t) => t.roomNumber === r.roomNumber && t.status === 'Active') : undefined) ||
          tenants.find((t) => t.name.trim().toLowerCase() === r.tenantName.trim().toLowerCase() && t.status === 'Active') ||
          tenants.find((t) => t.name.trim().toLowerCase() === r.tenantName.trim().toLowerCase());
        items.push({
          id: `rent-overdue-${r.id}`,
          title: `Overdue rent: ${matchedTenant?.name || r.tenantName} (Room ${matchedTenant?.roomNumber || r.roomNumber})`,
          description: `₹${r.balance.toLocaleString('en-IN')} is overdue for ${matchedTenant?.propertyName || r.propertyName} · Due date was ${r.dueDate}.`,
          time: `Due ${r.dueDate}`,
          category: 'rent',
          isOverdue: true,
          isRead: false,
          type: 'warning',
          actionText: 'Send reminder →',
          actionTarget: 'rent_management',
          tenantId: matchedTenant?.id || r.tenantId,
          tenantName: matchedTenant?.name || r.tenantName,
          tenantPhone: matchedTenant?.phone || r.tenantPhone || '',
          tenantEmail: matchedTenant?.email || r.tenantEmail || '',
          amountDue: r.balance,
          dueDate: r.dueDate,
        });
      });

    rentRecords
      .filter(
        (r) =>
          !r.isArchived &&
          (r.status === 'Pending' || r.status === 'Partial') &&
          !(r.dueDate && r.dueDate < todayIsoStr) &&
          r.balance > 0
      )
      .forEach((r) => {
        const matchedTenant =
          (r.tenantId ? tenants.find((t) => String(t.id) === String(r.tenantId)) : undefined) ||
          (r.agreementId ? tenants.find((t) => t.agreementId === r.agreementId) : undefined) ||
          (r.roomNumber ? tenants.find((t) => t.roomNumber === r.roomNumber && t.status === 'Active') : undefined) ||
          tenants.find((t) => t.name.trim().toLowerCase() === r.tenantName.trim().toLowerCase() && t.status === 'Active') ||
          tenants.find((t) => t.name.trim().toLowerCase() === r.tenantName.trim().toLowerCase());
        items.push({
          id: `rent-pending-${r.id}`,
          title: `${r.status} rent: ${matchedTenant?.name || r.tenantName} (Room ${matchedTenant?.roomNumber || r.roomNumber})`,
          description: `Balance of ₹${r.balance.toLocaleString('en-IN')} pending for ${matchedTenant?.propertyName || r.propertyName} · Due on ${r.dueDate}.`,
          time: `Billing ${(r.billingMonth || r.dueDate).slice(0, 7)}`,
          category: 'rent',
          isRead: false,
          type: 'blue',
          actionText: 'View QR Bill →',
          actionTarget: 'invoice_list',
          tenantId: matchedTenant?.id || r.tenantId,
          tenantName: matchedTenant?.name || r.tenantName,
          tenantPhone: matchedTenant?.phone || r.tenantPhone || '',
          tenantEmail: matchedTenant?.email || r.tenantEmail || '',
          amountDue: r.balance,
          dueDate: r.dueDate,
        });
      });

    electricityBills
      .filter((b) => b.status !== 'Paid')
      .forEach((b) => {
        const isOverdue = Boolean(b.status === 'Overdue' || (b.dueDate && b.dueDate < todayIsoStr));
        const unpaidAmt = Math.max(0, b.amount - (b.amountPaid || 0));
        if (unpaidAmt <= 0) return;

        const matchedTenant =
          (b.roomId ? tenants.find((t) => String(t.roomId) === String(b.roomId) && t.status === 'Active') : undefined) ||
          (b.roomNumber ? tenants.find((t) => t.roomNumber === b.roomNumber && t.status === 'Active') : undefined) ||
          tenants.find((t) => t.name.trim().toLowerCase() === b.tenantName.trim().toLowerCase() && t.status === 'Active') ||
          tenants.find((t) => t.name.trim().toLowerCase() === b.tenantName.trim().toLowerCase());

        items.push({
          id: `elec-unpaid-${b.id}`,
          title: `${isOverdue ? 'Overdue' : 'Pending'} electricity: Room ${matchedTenant?.roomNumber || b.roomNumber}`,
          description: `${matchedTenant?.name || b.tenantName} (${matchedTenant?.propertyName || b.propertyName} · ${b.meterId}) consumed ${b.units} kWh · ₹${unpaidAmt.toLocaleString('en-IN')} due on ${b.dueDate}.`,
          time: `${isOverdue ? 'Overdue' : 'Due'} ${b.dueDate}`,
          category: 'electricity',
          isOverdue,
          isRead: false,
          type: isOverdue ? 'warning' : 'electricity',
          actionText: 'View electricity bills →',
          actionTarget: 'electricity_bills',
          tenantId: matchedTenant?.id,
          tenantName: matchedTenant?.name || b.tenantName,
          tenantPhone: matchedTenant?.phone || '',
          tenantEmail: matchedTenant?.email || '',
          amountDue: unpaidAmt,
          dueDate: b.dueDate,
        });
      });

    const sortedPayments = [...payments].sort((a, b) => {
      const tA = new Date(a.paymentDate).getTime();
      const tB = new Date(b.paymentDate).getTime();
      return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
    });

    sortedPayments.forEach((p) => {
      const pDate = new Date(p.paymentDate);
      const isToday =
        !isNaN(pDate.getTime()) && pDate.toDateString() === new Date().toDateString();
      const formattedDate = !isNaN(pDate.getTime())
        ? isToday
          ? 'Today'
          : pDate.toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
        : 'Recent';

      const matchedTenant =
        tenants.find((t) => t.name.trim().toLowerCase() === p.tenantName.trim().toLowerCase()) ||
        (p.roomNumber ? tenants.find((t) => t.roomNumber === p.roomNumber) : undefined);

      items.push({
        id: `payment-rec-${p.id}`,
        title: `Payment Received: ${p.tenantName}`,
        description: `₹${p.amount.toLocaleString('en-IN')} received for ${p.paymentType === 'electricity' ? 'Electricity' : 'Rent'} (${p.propertyName || 'Property'} · Room ${p.roomNumber || 'N/A'}) via ${p.paymentMethod.replace('_', ' ')}${p.transactionReference ? ` · Ref: ${p.transactionReference}` : ''}.`,
        time: `${formattedDate} · ${p.paymentType === 'electricity' ? 'Electricity' : 'Rent'}`,
        category: p.paymentType === 'electricity' ? 'electricity' : 'rent',
        isPayment: true,
        isRead: false,
        type: 'success',
        actionText: 'View in invoices →',
        actionTarget: 'invoice_list',
        tenantId: matchedTenant?.id,
        tenantName: p.tenantName,
        amountDue: p.amount,
      });
    });

    const seen = new Set<string>();
    return items
      .filter((item) => {
        if (dismissedIds.has(item.id)) return false;
        let dedupKey = item.id;
        if (item.id.startsWith('api-notif-') && item.rawId) {
          dedupKey = `${item.tenantName}-${item.category}-${item.amountDue}-${item.dueDate}`;
        }
        if (seen.has(dedupKey)) return false;
        seen.add(dedupKey);
        return true;
      })
      .map((item) => ({
        ...item,
        isRead: item.isRead || readIds.has(item.id),
      }));
  }, [
    sessionNotifications,
    apiNotifications,
    rentRecords,
    electricityBills,
    payments,
    readIds,
    dismissedIds,
    tenants,
  ]);

  const handleLoginSuccess = async () => {
    setAuthError('');
    setIsCheckingAuth(true);
    try {
      const profile = await refreshCurrentUserProfile();
      if (profile) {
        setIsAuthenticated(true);
        navigate('/dashboard');
      }
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLogout = async () => {
    setAuthError('');
    setIsLoggingOut(true);

    try {
      await apiRequest('/api/auth/logout/', { method: 'POST' }).catch(() => {});
      localStorage.removeItem('kiraya_auth_token');

      setIsAuthenticated(false);
      setCurrentUserProfile(null);
      setIsMobileMenuOpen(false);
      setIsSearchOpen(false);
      setIsRecordPaymentOpen(false);

      setSelectedProperty(null);
      setSelectedTenant(null);
      setPreselectedRoomForAllocation(null);
      setSelectedInvoiceTenantName('');

      setProperties([]);
      setRooms([]);
      setTenants([]);
      setRentRecords([]);
      setPayments([]);
      setElectricityBills([]);
      setSessionNotifications([]);
      setApiNotifications([]);
      setDataError('');
      navigate('/');
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : 'Logout nahi ho saka. Dobara try karein.',
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === 'k'
      ) {
        event.preventDefault();
        setIsSearchOpen((previous) => !previous);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated]);

  const handleOpenPaymentModal = (
    defaultTenantId?: string,
    defaultType: 'rent' | 'electricity' = 'rent',
    defaultBillId?: string,
  ) => {
    setPaymentModalTenantId(defaultTenantId);
    setPaymentModalDefaultType(defaultType);
    setPaymentModalDefaultBillId(defaultBillId);
    setIsRecordPaymentOpen(true);
  };

  const handleAddProperty = async (newProperty: Partial<Property>) => {
    try {
      setDataError('');

      const fullAddress = [
        newProperty.address?.trim(),
        newProperty.locality?.trim(),
      ]
        .filter(Boolean)
        .join(', ');

      const created = await apiRequest<ApiProperty>('/api/properties/', {
        method: 'POST',
        body: {
          name: newProperty.name?.trim() || 'New Property',
          property_type: normalizePropertyType(newProperty.type),
          address: fullAddress,
          city: newProperty.city || '',
          state: newProperty.state || '',
          pin_code: newProperty.pinCode || '',
          monthly_rent: newProperty.monthlyRent ?? 0,
          security_deposit: newProperty.securityDeposit ?? 0,
          rent_due_day: newProperty.rentDueDay ?? 5,
          electricity_rate: newProperty.electricityRate ?? 0,
          owner_display_name: newProperty.ownerName ?? '',
          contact_number: newProperty.contactNumber ?? '',
        },
      });

      const refreshedProperties = await loadPropertyData();
      const addedProperty = refreshedProperties.find(
        (property) => property.id === String(created.id),
      );

      if (addedProperty) setSelectedProperty(addedProperty);
      handleNavigate('property_list');
    } catch (error) {
      setDataError(
        error instanceof Error
          ? error.message
          : 'Property create nahi ho paayi.',
      );
      throw error;
    }
  };

  const handleUpdateProperty = async (
    updatedProperty: Partial<Property>,
    imageFile?: File | null,
  ): Promise<boolean> => {
    if (!selectedProperty) {
      setDataError('Pehle property select karein.');
      return false;
    }

    try {
      setDataError('');

      const body: Record<string, unknown> = {};

      if (updatedProperty.name !== undefined) body.name = updatedProperty.name;
      if (updatedProperty.type !== undefined) body.property_type = normalizePropertyType(updatedProperty.type);
      if (updatedProperty.address !== undefined) body.address = updatedProperty.address;
      if (updatedProperty.city !== undefined) body.city = updatedProperty.city;
      if (updatedProperty.state !== undefined) body.state = updatedProperty.state;
      if (updatedProperty.pinCode !== undefined) body.pin_code = updatedProperty.pinCode;
      if (updatedProperty.monthlyRent !== undefined) body.monthly_rent = updatedProperty.monthlyRent;
      if (updatedProperty.securityDeposit !== undefined) body.security_deposit = updatedProperty.securityDeposit;
      if (updatedProperty.rentDueDay !== undefined) body.rent_due_day = updatedProperty.rentDueDay;
      if (updatedProperty.electricityRate !== undefined) body.electricity_rate = updatedProperty.electricityRate;
      if (updatedProperty.ownerName !== undefined) body.owner_display_name = updatedProperty.ownerName;
      if (updatedProperty.contactNumber !== undefined) body.contact_number = updatedProperty.contactNumber;

      const endpoint = `/api/properties/${selectedProperty.id}/`;

      if (imageFile) {
        const formData = new FormData();

        Object.entries(body).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, String(value));
          }
        });

        formData.append('image', imageFile);

        await apiRequest(endpoint, {
          method: 'PATCH',
          body: formData,
        });
      } else {
        await apiRequest(endpoint, {
          method: 'PATCH',
          body,
        });
      }

      const refreshedProperties = await loadTenantRentAndElectricityData();
      const refreshedProperty = refreshedProperties.find(
        (item) => item.id === selectedProperty.id,
      );

      if (refreshedProperty) {
        setSelectedProperty(refreshedProperty);
      }
      return true;
    } catch (error) {
      setDataError(
        error instanceof Error
          ? error.message
          : 'Property update nahi ho paayi.',
      );
      return false;
    }
  };

  const handleDeleteProperty = async (propertyId: string): Promise<boolean> => {
    setDataError('');
    try {
      await apiRequest(`/api/properties/${propertyId}/`, {
        method: 'DELETE',
      });
      const refreshed = await loadTenantRentAndElectricityData();
      setSelectedProperty(refreshed[0] ?? null);
      handleNavigate('property_list');
      return true;
    } catch (error) {
      setDataError(
        error instanceof Error ? error.message : 'Property delete nahi ho paayi.'
      );
      return false;
    }
  };

  const handleAddRoom = async (newRoom: Room, stayOnPage = true) => {
    const propertyId = Number(newRoom.propertyId);

    if (!Number.isInteger(propertyId) || propertyId <= 0) {
      throw new Error('Room ke liye valid property select karein.');
    }

    setDataError('');

    const createdRoom = await apiRequest<ApiRoom>('/api/properties/rooms/', {
      method: 'POST',
      body: {
        room_number: newRoom.number.trim(),
        floor: newRoom.floor,
        room_type: normalizeRoomType(newRoom.type),
        monthly_rent: newRoom.monthlyRent,
        security_deposit: newRoom.deposit,
        status: normalizeRoomStatus(newRoom.status),
        property: propertyId,
      },
    });

    if (newRoom.meterId && createdRoom?.id) {
      try {
        await fetchElectricityApi('/meters/', {
          method: 'POST',
          body: {
            room: createdRoom.id,
            meter_number: newRoom.meterId.trim(),
            installation_date: new Date().toISOString().slice(0, 10),
            is_active: true,
            notes: `Created with Room ${newRoom.number.trim()}`,
          },
        });
      } catch {
        // Ignore if meter number already exists
      }
    }

    const refreshedProperties = await loadTenantRentAndElectricityData();
    setTenantRefreshKey((prev) => prev + 1);

    const roomProperty = refreshedProperties.find(
      (property) => property.id === String(propertyId),
    );

    if (roomProperty) setSelectedProperty(roomProperty);
    if (!stayOnPage) {
      handleNavigate('rooms');
    }
  };

  const handleUpdateRoom = async (roomId: string, updated: Partial<Room>) => {
    setDataError('');
    const body: Record<string, unknown> = {};
    if (updated.number !== undefined) body.room_number = updated.number;
    if (updated.floor !== undefined) body.floor = updated.floor;
    if (updated.type !== undefined) body.room_type = normalizeRoomType(updated.type);
    if (updated.monthlyRent !== undefined) body.monthly_rent = updated.monthlyRent;
    if (updated.deposit !== undefined) body.security_deposit = updated.deposit;
    if (updated.status !== undefined) body.status = normalizeRoomStatus(updated.status);

    await apiRequest(`/api/properties/rooms/${roomId}/`, {
      method: 'PATCH',
      body,
    });

    if (updated.meterId) {
      try {
        await fetchElectricityApi('/meters/', {
          method: 'POST',
          body: {
            room: Number(roomId),
            meter_number: updated.meterId.trim(),
            installation_date: new Date().toISOString().slice(0, 10),
            is_active: true,
            notes: `Linked to Room ${updated.number || roomId}`,
          },
        });
      } catch {
        // Meter already exists
      }
    }

    await loadTenantRentAndElectricityData();
    setTenantRefreshKey((prev) => prev + 1);
  };

  const handleDeleteRoom = async (roomId: string) => {
    setDataError('');
    await apiRequest(`/api/properties/rooms/${roomId}/`, {
      method: 'DELETE',
    });
    await loadTenantRentAndElectricityData();
    setTenantRefreshKey((prev) => prev + 1);
  };

  const handleUpdateTenant = async (
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
    },
  ) => {
    if (!selectedTenant) {
      throw new Error('Pehle tenant select karein.');
    }

    try {
      setDataError('');

      const payload: Record<string, unknown> = {
        full_name: updated.name ?? selectedTenant.name,
        email: updated.email ?? selectedTenant.email,
        phone: updated.phone ?? selectedTenant.phone,
        alternate_phone: updated.alternatePhone ?? selectedTenant.alternatePhone ?? '',
        date_of_birth: updated.dateOfBirth || null,
        address: updated.permanentAddress ?? selectedTenant.permanentAddress,
        occupation: updated.occupation ?? selectedTenant.occupation ?? '',
        emergency_contact_name:
          updated.emergencyContact?.name ??
          selectedTenant.emergencyContact.name,
        emergency_contact_relationship:
          updated.emergencyContact?.relationship ??
          selectedTenant.emergencyContact.relationship ??
          '',
        emergency_contact_phone:
          updated.emergencyContact?.phone ??
          selectedTenant.emergencyContact.phone,
      };

      await apiRequest<ApiTenant>(
        `/api/tenants/${selectedTenant.id}/`,
        {
          method: 'PATCH',
          body: payload,
        },
      );

      if (agreementUpdate && agreementUpdate.roomId) {
        const previousRoomId = selectedTenant.roomId;
        const newRoomId = agreementUpdate.roomId;

        if (selectedTenant.agreementId) {
          await apiRequest(
            `/api/tenants/rental-agreements/${selectedTenant.agreementId}/`,
            {
              method: 'PATCH',
              body: {
                room: Number(newRoomId),
                start_date: agreementUpdate.moveInDate,
                end_date: agreementUpdate.agreementEndDate || null,
                monthly_rent: agreementUpdate.monthlyRent.toFixed(2),
                security_deposit: agreementUpdate.securityDeposit.toFixed(2),
                status: agreementUpdate.status,
                notes: agreementUpdate.notes,
              },
            },
          );
        } else {
          await apiRequest('/api/tenants/rental-agreements/', {
            method: 'POST',
            body: {
              tenant: Number(selectedTenant.id),
              room: Number(newRoomId),
              start_date: agreementUpdate.moveInDate,
              end_date: agreementUpdate.agreementEndDate || null,
              monthly_rent: agreementUpdate.monthlyRent.toFixed(2),
              security_deposit: agreementUpdate.securityDeposit.toFixed(2),
              status: agreementUpdate.status,
              notes: agreementUpdate.notes,
            },
          });
        }

        if (previousRoomId && previousRoomId !== newRoomId) {
          try {
            await apiRequest(`/api/properties/rooms/${previousRoomId}/`, {
              method: 'PATCH',
              body: { status: 'VACANT' },
            });
          } catch {
            // ignore
          }
        }

        const targetRoomStatus =
          agreementUpdate.status === 'ACTIVE' ? 'OCCUPIED' : 'VACANT';
        try {
          await apiRequest(`/api/properties/rooms/${newRoomId}/`, {
            method: 'PATCH',
            body: { status: targetRoomStatus },
          });
        } catch {
          // ignore
        }
      }

      await loadTenantRentAndElectricityData();
      setTenantRefreshKey((prev) => prev + 1);
    } catch (error) {
      setDataError(
        error instanceof Error
          ? error.message
          : 'Tenant update nahi ho paaya.',
      );
      throw error;
    }
  };

  const handleTerminateAgreement = async (tenant: Tenant) => {
    if (!tenant.agreementId) return;
    try {
      setDataError('');
      await apiRequest(`/api/tenants/rental-agreements/${tenant.agreementId}/`, {
        method: 'PATCH',
        body: {
          status: 'COMPLETED',
          end_date: new Date().toISOString().slice(0, 10),
        },
      });

      if (tenant.roomId) {
        try {
          await apiRequest(`/api/properties/rooms/${tenant.roomId}/`, {
            method: 'PATCH',
            body: { status: 'VACANT' },
          });
        } catch {
          // ignore
        }
      }

      await loadTenantRentAndElectricityData();
      setTenantRefreshKey((prev) => prev + 1);
    } catch (err) {
      setDataError(
        err instanceof Error ? err.message : 'Agreement end nahi ho saka.',
      );
    }
  };

  // Automatic UPI QR Payment Confirmation from InvoiceList -> RentManagement Tracking
  const handleAutoConfirmInvoicePayment = async (
    invoice: Invoice,
    paymentDetails: {
      amount: number;
      upiId: string;
      payeeName: string;
      transactionRef: string;
      paymentApp: string;
    }
  ) => {
    const nowIso = new Date().toISOString();
    const matchedTenant =
      (invoice.tenantId ? tenants.find((t) => String(t.id) === String(invoice.tenantId)) : undefined) ||
      (invoice.agreementId ? tenants.find((t) => t.agreementId === invoice.agreementId) : undefined) ||
      (invoice.roomNumber ? tenants.find((t) => t.roomNumber === invoice.roomNumber && t.status === 'Active') : undefined) ||
      tenants.find((t) => t.name.trim().toLowerCase() === invoice.tenantName.trim().toLowerCase() && t.status === 'Active') ||
      tenants.find((t) => t.name.trim().toLowerCase() === invoice.tenantName.trim().toLowerCase());
    const agreementId = invoice.agreementId || matchedTenant?.agreementId;

    let rentRecId = invoice.rentRecordId;
    if (!rentRecId && agreementId) {
      const existingRec = rentRecords.find(
        (r) =>
          Number(r.agreementId) === Number(agreementId) ||
          r.tenantName.trim().toLowerCase() === invoice.tenantName.trim().toLowerCase()
      );
      if (existingRec) {
        rentRecId = Number(existingRec.id);
      }
    }

    if (!rentRecId && agreementId && invoice.rentAmount > 0) {
      try {
        const currentMonthFirst = `${nowIso.slice(0, 7)}-01`;
        const created = await apiRequest<ApiRentRecord>('/api/billing/', {
          method: 'POST',
          body: {
            agreement: agreementId,
            billing_month: currentMonthFirst,
            rent_amount: invoice.rentAmount.toFixed(2),
            due_date: invoice.dueDate || nowIso.slice(0, 10),
            notes: `Auto-created during QR UPI Payment (${paymentDetails.transactionRef})`,
          },
        });
        rentRecId = created.id;
      } catch {
        // ignore if already exists
      }
    }

    // 1. Record Rent portion payment
    if (invoice.rentAmount > 0 && agreementId) {
      const rentPayAmt =
        invoice.electricityAmount > 0
          ? Math.min(invoice.rentAmount, paymentDetails.amount)
          : paymentDetails.amount;

      if (rentRecId) {
        await postPaymentApi({
          agreement: agreementId,
          rent_record: rentRecId,
          electricity_bill: null,
          amount: rentPayAmt.toFixed(2),
          payment_date: nowIso,
          payment_method: 'UPI',
          status: 'COMPLETED',
          transaction_reference: paymentDetails.transactionRef,
          notes: `Auto-Tracked via ${paymentDetails.paymentApp} to ${paymentDetails.payeeName} (${paymentDetails.upiId})`,
        });
      }
    }

    // 2. Record Electricity portion payment (if included in combined invoice)
    if (invoice.electricityAmount > 0 && invoice.electricityBillId && agreementId) {
      const elecUtr = `${paymentDetails.transactionRef}-EL`;
      await postPaymentApi({
        agreement: agreementId,
        rent_record: null,
        electricity_bill: invoice.electricityBillId,
        amount: invoice.electricityAmount.toFixed(2),
        payment_date: nowIso,
        payment_method: 'UPI',
        status: 'COMPLETED',
        transaction_reference: elecUtr,
        notes: `Auto-Tracked Electricity via ${paymentDetails.paymentApp} (${paymentDetails.upiId})`,
      });
    }

    await loadTenantRentAndElectricityData();
    setTenantRefreshKey((prev) => prev + 1);

    setSessionNotifications((prev) => [
      {
        id: `notif-autopay-${Date.now()}`,
        title: `Auto-Tracked UPI Payment: ${invoice.tenantName}`,
        description: `₹${paymentDetails.amount.toLocaleString('en-IN')} received via ${paymentDetails.paymentApp} (UTR: ${paymentDetails.transactionRef}) for Room ${invoice.roomNumber}.`,
        time: 'Today · Just now',
        category: 'rent',
        isRead: false,
        type: 'success',
        actionText: 'View in Rent Management →',
        actionTarget: 'rent_management',
      },
      ...prev,
    ]);
  };

  const handlePaymentRecorded = async (data: {
    tenantId: string;
    agreementId?: number;
    rentRecordId?: number;
    electricityBillId?: number;
    amount: number;
    paymentType: 'rent' | 'electricity';
    mode: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'OTHER';
    transactionReference: string;
    note: string;
  }) => {
    const tenant = tenants.find((item) => item.id === data.tenantId);
    if (!tenant) {
      throw new Error('Selected tenant nahi mila.');
    }

    const agreementId = data.agreementId ?? tenant.agreementId;
    if (!agreementId) {
      throw new Error('Is tenant ka koi active Rental Agreement nahi mila.');
    }

    let targetRentRecordId = data.rentRecordId;
    let targetElectricityBillId = data.electricityBillId;

    if (data.paymentType === 'rent' && !targetRentRecordId) {
      const todayIso = new Date().toISOString().split('T')[0];
      const currentMonthFirst = `${todayIso.slice(0, 7)}-01`;
      const prop = properties.find((p) => String(p.id) === String(tenant.propertyId));
      const dueDay = prop?.rentDueDay || 5;
      const [yStr, mStr] = currentMonthFirst.split('-');
      const maxDays = new Date(Number(yStr), Number(mStr), 0).getDate();
      const validDay = Math.min(Math.max(1, dueDay), maxDays);
      const dueDateIso = `${yStr}-${mStr}-${String(validDay).padStart(2, '0')}`;

      const createdRecord = await apiRequest<ApiRentRecord>('/api/billing/', {
        method: 'POST',
        body: {
          agreement: agreementId,
          billing_month: currentMonthFirst,
          rent_amount: (tenant.monthlyRent || data.amount).toFixed(2),
          due_date: dueDateIso,
          notes: 'Auto-created during payment recording',
        },
      });
      targetRentRecordId = createdRecord.id;
    }

    if (data.paymentType === 'electricity' && !targetElectricityBillId) {
      throw new Error('Pehle is room ke liye Electricity Bill generate karein.');
    }

    const nowIso = new Date().toISOString();
    const autoRef =
      data.transactionReference || `TXN${Date.now().toString().slice(-8)}`;

    await postPaymentApi({
      agreement: agreementId,
      rent_record: data.paymentType === 'rent' ? targetRentRecordId : null,
      electricity_bill:
        data.paymentType === 'electricity' ? targetElectricityBillId : null,
      amount: data.amount.toFixed(2),
      payment_date: nowIso,
      payment_method: data.mode,
      status: 'COMPLETED',
      transaction_reference: autoRef,
      notes: data.note,
    });

    await loadTenantRentAndElectricityData();
    setTenantRefreshKey((prev) => prev + 1);

    const notification: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: `Payment recorded from ${tenant.name}`,
      description: `₹${data.amount.toLocaleString('en-IN')} received via ${data.mode} (Ref: ${autoRef}).`,
      time: 'Today · Just now',
      category: data.paymentType === 'electricity' ? 'electricity' : 'rent',
      isRead: false,
      type: 'success',
      actionText: 'View records →',
      actionTarget:
        data.paymentType === 'electricity' ? 'electricity_bills' : 'rent_management',
    };

    setSessionNotifications((previous) => [notification, ...previous]);
  };

  const handleMarkAllRead = () => {
    setReadIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => next.add(n.id));
      saveStoredIdSet(READ_NOTIFS_STORAGE_KEY, next);
      return next;
    });

    notifications.forEach((n) => {
      if (n.id.startsWith('api-notif-')) {
        const rawId = n.id.replace('api-notif-', '');
        void apiRequest(`/api/notifications/${rawId}/`, {
          method: 'PATCH',
          body: { is_read: true },
        }).catch(() => {});
      }
    });
  };

  const handleMarkSingleRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveStoredIdSet(READ_NOTIFS_STORAGE_KEY, next);
      return next;
    });

    if (id.startsWith('api-notif-')) {
      const rawId = id.replace('api-notif-', '');
      void apiRequest(`/api/notifications/${rawId}/`, {
        method: 'PATCH',
        body: { is_read: true },
      }).catch(() => {});
    }
  };

  const handleToggleRead = (id: string) => {
    const isCurrentlyRead =
      readIds.has(id) ||
      Boolean(notifications.find((n) => n.id === id)?.isRead);

    if (isCurrentlyRead) {
      setReadIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        saveStoredIdSet(READ_NOTIFS_STORAGE_KEY, next);
        return next;
      });
      if (id.startsWith('api-notif-')) {
        const rawId = id.replace('api-notif-', '');
        void apiRequest(`/api/notifications/${rawId}/`, {
          method: 'PATCH',
          body: { is_read: false },
        }).catch(() => {});
      }
    } else {
      handleMarkSingleRead(id);
    }
  };

  const handleClearAllRead = () => {
    const readItemIds = notifications.filter((n) => n.isRead).map((n) => n.id);
    setDismissedIds((prev) => {
      const next = new Set(prev);
      readItemIds.forEach((id) => next.add(id));
      saveStoredIdSet(DISMISSED_NOTIFS_STORAGE_KEY, next);
      return next;
    });
  };

  const handleDismissNotification = (id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveStoredIdSet(DISMISSED_NOTIFS_STORAGE_KEY, next);
      return next;
    });

    if (id.startsWith('api-notif-')) {
      const rawId = id.replace('api-notif-', '');
      void apiRequest(`/api/notifications/${rawId}/`, {
        method: 'DELETE',
      }).catch(() => {});
    }
  };

  if (isAdminPortal) {
    return (
      <AdminPortalPage
        onExit={() => {
          if (window.location.hash.toLowerCase().includes('admin')) {
            window.location.hash = '';
          }
          setIsAdminPortal(false);
          navigate(isAuthenticated ? '/dashboard' : '/');
        }}
      />
    );
  }

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#EAF4F7] text-[#142D3B]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200/80 p-2.5 mx-auto mb-4 shadow-sm">
            <img src="/images/logo.png" alt="KirayaSaathi Logo" className="w-full h-full object-contain" />
          </div>
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-[#035E7B] border-r-transparent align-[-0.125em]" />
          <h1 className="mt-3 text-2xl font-bold text-[#035E7B]">KirayaSaathi</h1>
          <p className="mt-1 text-sm text-gray-600">Checking your session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route
          path="/login"
          element={
            <LoginPage
              initialMode="login"
              onLoginSuccess={handleLoginSuccess}
              onBackToLanding={() => navigate('/')}
              onOpenAdminPortal={() => {
                navigate('/admin-portal');
                setIsAdminPortal(true);
              }}
            />
          }
        />
        <Route
          path="/signup"
          element={
            <LoginPage
              initialMode="signup"
              onLoginSuccess={handleLoginSuccess}
              onBackToLanding={() => navigate('/')}
              onOpenAdminPortal={() => {
                navigate('/admin-portal');
                setIsAdminPortal(true);
              }}
            />
          }
        />
        <Route
          path="*"
          element={
            <LandingPage
              onLogin={() => {
                setAuthInitialMode('login');
                navigate('/login');
              }}
              onSignup={() => {
                setAuthInitialMode('signup');
                navigate('/signup');
              }}
              onOpenAdminPortal={() => {
                navigate('/admin-portal');
                setIsAdminPortal(true);
              }}
              isAuthenticated={false}
              currentUser={null}
            />
          }
        />
      </Routes>
    );
  }

  // STRICT SECURITY & WORKSPACE GUARD:
  // After signup and OTP verification, or for any unapproved/suspended owner:
  // The owner dashboard MUST NEVER be displayed.
  // Instead, the owner must be directed exclusively to the Verification workspace.
  if (
    !currentUserProfile ||
    (!currentUserProfile.is_authorized &&
      !currentUserProfile.is_staff &&
      !currentUserProfile.is_superuser)
  ) {
    if (!currentUserProfile) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#EAF4F7] text-[#142D3B]">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200/80 p-2.5 mx-auto mb-4 shadow-sm">
              <img src="/images/logo.png" alt="KirayaSaathi Logo" className="w-full h-full object-contain" />
            </div>
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-[#035E7B] border-r-transparent align-[-0.125em]" />
            <h1 className="mt-3 text-xl font-bold text-[#035E7B]">KirayaSaathi</h1>
            <p className="mt-1 text-sm text-gray-600">Verifying account authorization...</p>
          </div>
        </div>
      );
    }

    return (
      <OwnerVerificationPage
        user={currentUserProfile}
        onRefreshUser={refreshCurrentUserProfile}
        onLogout={handleLogout}
      />
    );
  }

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead,
  ).length;

  const getPageTitle = (page: PageType): string => {
    switch (page) {
      case 'landing':
        return 'Public Website';
      case 'dashboard':
        return 'Dashboard';
      case 'property_list':
      case 'property_filter':
      case 'property_detail':
      case 'add_property':
      case 'edit_property':
        return 'Properties';
      case 'rooms':
      case 'add_room':
        return 'Rooms';
      case 'tenants':
      case 'add_tenant':
      case 'tenant_profile':
      case 'tenant_detail':
        return 'Tenants';
      case 'security_deposits':
        return 'Security Deposits';
      case 'rent_management':
        return 'Rent Management';
      case 'electricity_bills':
      case 'electricity_bill_form':
        return 'Electricity Bills';
      case 'invoice_list':
        return 'Invoices & Receipts';
      case 'reports':
        return 'Reports & Analytics';
      case 'notifications':
        return 'Notifications';
      case 'settings':
        return 'Settings';
      default:
        return 'KirayaSaathi';
    }
  };

  return (
    <div className="flex min-h-screen bg-[#EAF4F7] font-['Space_Grotesk'] text-[#142D3B] antialiased">
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        unreadNotificationsCount={unreadCount}
        mobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      <div className="flex min-w-0 flex-1 flex-col transition-all lg:pl-[236px] print:pl-0 print:m-0 print:p-0">
        <Topbar
          title={getPageTitle(currentPage)}
          currentPage={currentPage}
          onNavigate={handleNavigate}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenSearch={() => setIsSearchOpen(true)}
          unreadCount={unreadCount}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
          userEmail={currentUserProfile?.email}
          userRole={currentUserProfile?.is_staff ? 'Administrator' : 'Property Owner'}
        />

        {(isLoadingData || dataError || authError) && (
          <div className="flex flex-wrap items-center justify-end gap-3 px-4 pt-2.5 sm:px-7 md:px-8 print:hidden">
            {isLoadingData && (
              <p className="text-xs text-[#035E7B] font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#035E7B] animate-pulse" />
                Loading property data...
              </p>
            )}

            {dataError && (
              <div
                role="alert"
                className="flex flex-wrap items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-lg"
              >
                <span>{dataError}</span>
                <button
                  type="button"
                  onClick={() => void loadPropertyData()}
                  className="underline font-bold"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => setDataError('')}
                  className="underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {authError && (
              <p role="alert" className="break-all text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-lg">
                {authError}
              </p>
            )}
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 print:p-0 print:m-0 print:overflow-visible">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route path="/signup" element={<Navigate to="/dashboard" replace />} />

            <Route
              path="/welcome"
              element={
                <div className="-m-3 sm:-m-6 md:-m-8">
                  <LandingPage
                    onLogin={() => handleNavigate('dashboard')}
                    onSignup={() => handleNavigate('dashboard')}
                    isAuthenticated={isAuthenticated}
                    currentUser={currentUserProfile}
                    onNavigateDashboard={() => handleNavigate('dashboard')}
                    onLogout={handleLogout}
                    onOpenAdminPortal={() => {
                      navigate('/admin-portal');
                      setIsAdminPortal(true);
                    }}
                  />
                </div>
              }
            />

            <Route
              path="/dashboard"
              element={
                <DashboardPage
                  onNavigate={handleNavigate}
                  onOpenRecordPayment={(tenantId, paymentType, billId) =>
                    handleOpenPaymentModal(tenantId, paymentType, billId)
                  }
                  properties={properties}
                  rooms={rooms}
                  tenants={tenants}
                  rentRecords={rentRecords}
                  electricityBills={electricityBills}
                  onRefreshData={handleRefreshAll}
                  refreshTrigger={tenantRefreshKey}
                />
              }
            />

            <Route
              path="/properties"
              element={
                <PropertyList
                  properties={properties}
                  onNavigate={handleNavigate}
                  onSelectProperty={setSelectedProperty}
                  onRefreshData={handleRefreshAll}
                />
              }
            />

            <Route
              path="/properties/filter"
              element={
                <PropertyFilter
                  properties={properties}
                  onNavigate={handleNavigate}
                  onSelectProperty={setSelectedProperty}
                />
              }
            />

            <Route
              path="/properties/detail"
              element={
                selectedProperty ? (
                  <PropertyDetail
                    property={selectedProperty}
                    rooms={rooms}
                    onNavigate={handleNavigate}
                    onRefreshData={handleRefreshAll}
                    onSelectTenant={(tenantName) => {
                      const matchingTenant =
                        tenants.find(
                          (tenant) =>
                            tenant.name.toLowerCase() === tenantName.toLowerCase() &&
                            tenant.status === 'Active'
                        ) ||
                        tenants.find(
                          (tenant) => tenant.name.toLowerCase() === tenantName.toLowerCase()
                        );

                      if (matchingTenant) setSelectedTenant(matchingTenant);
                    }}
                  />
                ) : (
                  <Navigate to="/properties" replace />
                )
              }
            />

            <Route
              path="/properties/add"
              element={
                <AddProperty
                  onNavigate={handleNavigate}
                  onAddProperty={handleAddProperty}
                />
              }
            />

            <Route
              path="/properties/edit"
              element={
                <EditProperty
                  property={selectedProperty ?? undefined}
                  onNavigate={handleNavigate}
                  onUpdateProperty={handleUpdateProperty}
                  onDeleteProperty={handleDeleteProperty}
                />
              }
            />

            <Route
              path="/rooms"
              element={
                <RoomsPage
                  rooms={rooms}
                  properties={properties}
                  onNavigate={handleNavigate}
                  onAllocateRoom={(room) => {
                    setPreselectedRoomForAllocation(room);
                    navigate('/tenants/add');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onSelectTenantByIdOrName={(tenantId, tenantName) => {
                    const found =
                      (tenantId
                        ? tenants.find((t) => String(t.id) === String(tenantId))
                        : undefined) ||
                      (tenantName
                        ? tenants.find(
                            (t) =>
                              t.name.toLowerCase() === tenantName.toLowerCase() &&
                              t.status === 'Active'
                          ) ||
                          tenants.find(
                            (t) => t.name.toLowerCase() === tenantName.toLowerCase()
                          )
                        : undefined);
                    if (found) setSelectedTenant(found);
                  }}
                  onUpdateRoom={handleUpdateRoom}
                  onDeleteRoom={handleDeleteRoom}
                  onRefreshData={async () => {
                    await loadTenantRentAndElectricityData();
                    setTenantRefreshKey((prev) => prev + 1);
                  }}
                />
              }
            />

            <Route
              path="/rooms/add"
              element={
                <AddRoom
                  properties={properties}
                  rooms={rooms}
                  defaultPropertyId={selectedProperty?.id}
                  onNavigate={handleNavigate}
                  onAddRoomSubmit={handleAddRoom}
                />
              }
            />

            <Route
              path="/tenants"
              element={
                <TenantsPage
                  tenants={tenants}
                  rooms={rooms}
                  onNavigate={handleNavigate}
                  onSelectTenant={(tenant) => {
                    setSelectedTenant(tenant);
                  }}
                  onOpenAddTenant={() => handleNavigate('add_tenant')}
                  onRefreshData={handleRefreshAll}
                />
              }
            />

            <Route
              path="/tenants/add"
              element={
                <AddTenantPage
                  properties={properties}
                  rooms={rooms}
                  preselectedRoom={preselectedRoomForAllocation}
                  onNavigate={handleNavigate}
                  onTenantCreated={async () => {
                    await loadPropertyData();
                    setTenantRefreshKey((previous) => previous + 1);
                  }}
                />
              }
            />

            <Route
              path="/tenants/profile"
              element={
                <TenantProfile
                  tenant={selectedTenant ?? undefined}
                  properties={properties}
                  rooms={rooms}
                  rentRecords={rentRecords}
                  electricityBills={electricityBills}
                  payments={payments}
                  onNavigate={handleNavigate}
                  onEditTenant={(tenant) => {
                    setSelectedTenant(tenant);
                  }}
                  onOpenRecordPayment={(tenantId) => handleOpenPaymentModal(tenantId)}
                  onSelectInvoice={setSelectedInvoiceTenantName}
                  onTerminateAgreement={handleTerminateAgreement}
                />
              }
            />

            <Route
              path="/tenants/edit"
              element={
                <TenantDetail
                  tenant={selectedTenant ?? undefined}
                  properties={properties}
                  rooms={rooms}
                  onNavigate={handleNavigate}
                  onUpdateTenant={handleUpdateTenant}
                />
              }
            />

            <Route
              path="/security-deposits"
              element={
                <SecurityDepositsPage
                  tenants={tenants}
                  properties={properties}
                  onNavigate={handleNavigate}
                  onSelectTenant={setSelectedTenant}
                  onRefreshData={handleRefreshAll}
                />
              }
            />

            <Route
              path="/rent-management"
              element={
                <RentManagement
                  rentRecords={rentRecords}
                  electricityBills={electricityBills}
                  properties={properties}
                  tenants={tenants}
                  payments={payments}
                  onNavigate={handleNavigate}
                  onOpenRecordPayment={(tenantId) => handleOpenPaymentModal(tenantId)}
                  onSelectInvoice={setSelectedInvoiceTenantName}
                  onSelectTenant={setSelectedTenant}
                  onRefreshData={handleRefreshAll}
                />
              }
            />

            <Route
              path="/electricity-bills"
              element={
                <ElectricityBills
                  bills={electricityBills}
                  properties={properties}
                  rooms={rooms}
                  tenants={tenants}
                  payments={payments}
                  rentRecords={rentRecords}
                  onNavigate={handleNavigate}
                  onRefreshData={handleRefreshAll}
                  onOpenRecordPayment={(tenantId, paymentType, billId) =>
                    handleOpenPaymentModal(tenantId, paymentType, billId)
                  }
                  initialMode="list"
                />
              }
            />

            <Route
              path="/electricity-bills/new"
              element={
                <ElectricityBills
                  bills={electricityBills}
                  properties={properties}
                  rooms={rooms}
                  tenants={tenants}
                  payments={payments}
                  rentRecords={rentRecords}
                  onNavigate={handleNavigate}
                  onRefreshData={handleRefreshAll}
                  onOpenRecordPayment={(tenantId, paymentType, billId) =>
                    handleOpenPaymentModal(tenantId, paymentType, billId)
                  }
                  initialMode="form"
                />
              }
            />

            <Route
              path="/invoices"
              element={
                <InvoiceList
                  invoices={invoices}
                  properties={properties}
                  rooms={rooms}
                  tenants={tenants}
                  onNavigate={handleNavigate}
                  selectedTenantName={selectedInvoiceTenantName}
                  onAutoConfirmInvoicePayment={handleAutoConfirmInvoicePayment}
                  onRefreshData={handleRefreshAll}
                />
              }
            />

            <Route
              path="/reports"
              element={
                <ReportsPage
                  onNavigate={handleNavigate}
                  rentRecords={rentRecords}
                  payments={payments}
                  properties={properties}
                  tenants={tenants}
                  electricityBills={electricityBills}
                  onRefreshData={handleRefreshAll}
                />
              }
            />

            <Route
              path="/notifications"
              element={
                <NotificationsPage
                  notifications={notifications}
                  tenants={tenants}
                  onNavigate={handleNavigate}
                  onMarkAllRead={handleMarkAllRead}
                  onMarkSingleRead={handleMarkSingleRead}
                  onToggleRead={handleToggleRead}
                  onRefreshData={handleRefreshAll}
                  onDismissNotification={handleDismissNotification}
                  onClearAllRead={handleClearAllRead}
                  onOpenRecordPayment={(tenantId, paymentType, billId) =>
                    handleOpenPaymentModal(tenantId, paymentType, billId)
                  }
                />
              }
            />

            <Route
              path="/settings"
              element={<SettingsPage onNavigate={handleNavigate} />}
            />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleNavigate}
        properties={properties}
        tenants={tenants}
        rooms={rooms}
      />

      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        tenants={tenants}
        rentRecords={rentRecords}
        electricityBills={electricityBills}
        defaultTenantId={paymentModalTenantId}
        defaultPaymentType={paymentModalDefaultType}
        defaultBillId={paymentModalDefaultBillId}
        onPaymentRecorded={handlePaymentRecorded}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}