export type PageType =
  | 'landing'
  | 'dashboard'
  | 'property_list'
  | 'property_filter'
  | 'property_detail'
  | 'add_property'
  | 'edit_property'
  | 'rooms'
  | 'add_room'
  | 'tenants'
  | 'add_tenant'
  | 'tenant_profile'
  | 'tenant_detail'
  | 'security_deposits'
  | 'rent_management'
  | 'electricity_bills'
  | 'electricity_bill_form'
  | 'invoice_list'
  | 'reports'
  | 'notifications'
  | 'settings';

export interface OwnerQrConfig {
  id: string;
  label: string;
  payeeName: string;
  upiId: string;
  qrImageDataUrl?: string | null;
  propertyName?: string;
  isDefault?: boolean;
}

export interface Property {
  id: string;
  name: string;
  type: string;
  address: string;
  locality: string;
  city: string;
  state: string;
  pinCode: string;
  totalRooms: number;
  occupiedRooms: number;
  rentCollected: number;
  pendingRent: number;
  monthlyRent: number;
  securityDeposit: number;
  rentDueDay: number;
  electricityRate: number;
  ownerName: string;
  contactNumber: string;
  imageTheme: 'one' | 'two' | 'three' | 'four';
  image?: string | null;
}

export interface RoomOccupant {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  agreementId?: number;
  monthlyRent?: number;
  moveInDate?: string;
}

export interface Room {
  id: string;
  number: string;
  propertyId: string;
  propertyName: string;
  floor: string;
  type: string;
  capacity?: number;
  occupiedBeds?: number;
  vacantBeds?: number;
  isFull?: boolean;
  occupants?: RoomOccupant[];
  tenantName: string | null;
  tenantId: string | null;
  moveInDate: string | null;
  monthlyRent: number;
  deposit: number;
  status: 'Occupied' | 'Vacant' | 'Maintenance';
  meterId?: string;
}

export interface Tenant {
  id: string;
  agreementId?: number;
  agreementStatus?: 'ACTIVE' | 'COMPLETED' | 'TERMINATED';
  agreementNotes?: string;
  name: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  dateOfBirth?: string;
  occupation: string;
  permanentAddress: string;
  propertyId: string;
  propertyName: string;
  roomId: string;
  roomNumber: string;
  monthlyRent: number;
  securityDeposit: number;
  securityDepositStatus?: 'PENDING' | 'PAID' | 'REFUNDED' | 'SETTLED';
  depositPaidDate?: string | null;
  depositRefundDate?: string | null;
  depositPaymentMethod?: string;
  depositTransactionRef?: string;
  refundAmount?: number;
  deductionAmount?: number;
  deductionReason?: string;
  handoverItems?: HandoverItem[];
  handoverNotes?: string;
  moveInDate: string;
  agreementEndDate: string;
  status: 'Active' | 'Past';
  balance: number;
  electricityPending: number;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
}

export interface HandoverItem {
  id?: string;
  item: string;
  quantity?: number;
  status: 'Handed Over' | 'Returned' | 'Missing' | 'Damaged';
  conditionNotes?: string;
}

export interface SecurityDepositRecord {
  id: string | number;
  agreementId: number;
  tenantId: number;
  tenantName: string;
  tenantPhone?: string;
  propertyId: string | number;
  propertyName: string;
  roomId: string | number;
  roomNumber: string;
  roomType?: string;
  startDate: string;
  endDate?: string | null;
  securityDeposit: number;
  securityDepositStatus: 'PENDING' | 'PAID' | 'REFUNDED' | 'SETTLED';
  depositPaidDate?: string | null;
  depositRefundDate?: string | null;
  depositPaymentMethod?: string;
  depositTransactionRef?: string;
  refundAmount?: number;
  deductionAmount?: number;
  deductionReason?: string;
  handoverItems: HandoverItem[];
  handoverNotes?: string;
  agreementStatus: 'ACTIVE' | 'COMPLETED' | 'TERMINATED';
}

export interface RentRecord {
  id: string;
  agreementId?: number;
  tenantId: string;
  tenantName: string;
  tenantPhone?: string;
  tenantEmail?: string;
  propertyId: string;
  propertyName: string;
  roomNumber: string;
  billingMonth?: string;
  rentDue: number;
  received: number;
  balance: number;
  dueDate: string;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Partial';
  notes?: string;
  isArchived?: boolean;
  archivedAt?: string;
  electricityAmount?: number;
  miscAmount?: number;
  baseRentAmount?: number;
  miscDescription?: string;
}

export interface BillingArchiveItem {
  record_id?: number;
  tenant_id?: number;
  tenant_name: string;
  tenant_phone?: string;
  property_id?: number;
  property_name: string;
  room_id?: number;
  room_number: string;
  billing_month: string;
  due_date: string;
  rent_amount: string | number;
  rent_paid: string | number;
  rent_balance: string | number;
  rent_status: string;
  meter_number?: string;
  previous_reading?: string | number;
  current_reading?: string | number;
  units_consumed?: string | number;
  rate_per_unit?: string | number;
  electricity_amount?: string | number;
  electricity_paid?: string | number;
  electricity_status?: string;
  total_billed: string | number;
  total_paid: string | number;
  balance: string | number;
}

export interface BillingArchive {
  id: string | number;
  billing_month: string;
  billing_month_formatted?: string;
  property?: string | number | null;
  property_name?: string;
  total_tenants: number;
  total_billed: number;
  total_paid: number;
  total_balance: number;
  archived_at: string;
  snapshot_data: BillingArchiveItem[];
  notes?: string;
}

export interface PaymentRecord {
  id: string;
  agreementId: number;
  rentRecordId?: number | null;
  electricityBillId?: number | null;
  tenantName: string;
  propertyName: string;
  roomNumber: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'OTHER';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  transactionReference: string;
  notes: string;
  paymentType: 'rent' | 'electricity';
}

export interface ElectricityBill {
  id: string;
  meterDbId?: number;
  readingDbId?: number;
  roomId?: string;
  propertyId?: string;
  meterId: string;
  tenantName: string;
  propertyName: string;
  roomNumber: string;
  previousReading: number;
  currentReading: number;
  units: number;
  rate: number;
  amount: number;
  amountPaid?: number;
  status: 'Paid' | 'Pending' | 'Partial' | 'Overdue';
  readingDate: string;
  billingMonth?: string;
  dueDate: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  receiptNumber?: string;
  tenantId: string;
  agreementId?: number;
  rentRecordId?: number;
  electricityBillId?: number;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  propertyId?: string;
  propertyName: string;
  propertyAddress: string;
  ownerPhone?: string;
  roomNumber: string;
  issueDate: string;
  dueDate?: string;
  billingMonth: string;
  rentAmount: number;
  electricityAmount: number;
  electricityRate?: number;
  electricityUnits?: number;
  meterId?: string;
  meterReadings?: {
    prev: number;
    curr: number;
  };
  subtotal: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  status: 'Paid' | 'Overdue' | 'Pending';
  paymentDate?: string;
  paymentMode?: string;
  transactionRef?: string;
  qrConfigId?: string;
  roomType?: string;
  sharingCount?: number;
  electricitySplitNote?: string;
}

export interface NotificationItem {
  id: string;
  rawId?: number;
  tenantId?: string;
  tenantName?: string;
  tenantPhone?: string;
  tenantEmail?: string;
  amountDue?: number;
  dueDate?: string;
  title: string;
  description: string;
  time: string;
  category: 'rent' | 'electricity' | 'workspace' | 'general';
  isRead: boolean;
  type: 'warning' | 'blue' | 'electricity' | 'success';
  actionText?: string;
  actionTarget?: PageType;
  isSent?: boolean;
  sentAt?: string;
  sentVia?: string;
  whatsappUrl?: string;
  formattedMessage?: string;
  isOverdue?: boolean;
  isPayment?: boolean;
}