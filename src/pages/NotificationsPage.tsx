import React, { useState, useMemo, useEffect } from 'react';
import { PageType, NotificationItem, Tenant } from '../types';
import { apiRequest } from '../utils/api';
import {
  Check,
  Sliders,
  AlertTriangle,
  Calendar,
  Zap,
  CheckCircle2,
  Moon,
  RefreshCw,
  BellOff,
  Bell,
  Search,
  Trash2,
  MessageCircle,
  Send,
  Phone,
  Mail,
  CheckCheck,
  CreditCard,
  Sparkles,
  X,
  MessageSquare,
  Share2,
  Clock,
  User,
  ArrowRight,
} from 'lucide-react';

interface NotificationsPageProps {
  notifications: NotificationItem[];
  tenants?: Tenant[];
  onNavigate: (page: PageType) => void;
  onMarkAllRead: () => void;
  onMarkSingleRead: (id: string) => void;
  onToggleRead?: (id: string) => void;
  onRefreshData?: () => Promise<void> | void;
  onDismissNotification?: (id: string) => void;
  onClearAllRead?: () => void;
  onOpenRecordPayment?: (
    tenantId?: string,
    paymentType?: 'rent' | 'electricity',
    billId?: string,
  ) => void;
}

const PREFS_STORAGE_KEY = 'KirayaSaathi_notification_prefs_v1';

interface NotificationPrefs {
  whatsappEnabled: boolean;
  emailSummary: 'Daily' | 'Weekly' | 'Monthly';
  reminderDaysBefore: number;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  notifications,
  tenants = [],
  onNavigate,
  onMarkAllRead,
  onMarkSingleRead,
  onToggleRead,
  onRefreshData,
  onDismissNotification,
  onClearAllRead,
  onOpenRecordPayment,
}) => {
  const [activeTab, setActiveTab] = useState<
    'all' | 'unread' | 'overdue' | 'payments' | 'rent' | 'electricity' | 'workspace'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditingPrefs, setIsEditingPrefs] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Custom Message Compose Modal State
  const [composingItem, setComposingItem] = useState<NotificationItem | null>(null);
  const [customChannel, setCustomChannel] = useState<'WHATSAPP' | 'EMAIL' | 'SMS' | 'ALL'>('WHATSAPP');
  const [customMessage, setCustomMessage] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [isDispatchingCustom, setIsDispatchingCustom] = useState(false);

  // Auto-sync notifications on mount
  useEffect(() => {
    if (onRefreshData) {
      void onRefreshData();
    }
  }, []);

  // Preferences persistence
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => {
    try {
      const saved = localStorage.getItem(PREFS_STORAGE_KEY);
      if (saved) return JSON.parse(saved) as NotificationPrefs;
    } catch {
      // ignore storage errors
    }
    return {
      whatsappEnabled: true,
      emailSummary: 'Weekly',
      reminderDaysBefore: 3,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore storage errors
    }
  }, [prefs]);

  // Helper to resolve live tenant record
  const resolveTenant = (item: NotificationItem) => {
    return (
      (item.tenantId ? tenants.find((t) => String(t.id) === String(item.tenantId)) : undefined) ||
      (item.tenantPhone
        ? tenants.find((t) =>
            t.phone.replace(/\D/g, '').endsWith(item.tenantPhone!.replace(/\D/g, '').slice(-10)),
          )
        : undefined) ||
      (item.tenantName
        ? tenants.find(
            (t) =>
              t.name.trim().toLowerCase() === item.tenantName!.trim().toLowerCase() &&
              t.status === 'Active',
          )
        : undefined) ||
      (item.tenantName
        ? tenants.find((t) => t.name.trim().toLowerCase() === item.tenantName!.trim().toLowerCase())
        : undefined)
    );
  };

  // Helper to format clean international phone digits
  const formatPhone = (phoneRaw?: string): string => {
    if (!phoneRaw) return '';
    let clean = phoneRaw.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = clean.replace(/^0+/, '');
    }
    return clean.length === 10 ? `91${clean}` : clean;
  };

  // Open Compose Modal for custom messaging
  const handleOpenComposeModal = (item: NotificationItem) => {
    const liveTenant = resolveTenant(item);
    const recipientPhone = liveTenant?.phone || item.tenantPhone || '';
    const recipientEmail = liveTenant?.email || item.tenantEmail || '';
    const recipientName = liveTenant?.name || item.tenantName || 'Tenant';

    const defaultText =
      item.formattedMessage ||
      `Namaste ${recipientName} ji!\n\nYeh KirayaSaathi ki taraf se ${item.title} ki reminder hai:\n• Details: ${item.description}\n• Due Amount: Rs. ${item.amountDue ? item.amountDue.toLocaleString('en-IN') : 'N/A'}\n\nKripya samay par bhugtan karein. Payment ke baad UPI UTR ya receipt share karein.\n\nDhanyawaad,\nProperty Management`;

    setComposingItem(item);
    setCustomChannel('WHATSAPP');
    setCustomMessage(defaultText);
    setCustomPhone(recipientPhone);
    setCustomEmail(recipientEmail);
  };

  // Dispatch custom message (WhatsApp, Email, SMS, or All)
  const handleDispatchCustomMessage = async () => {
    if (!composingItem) return;
    setIsDispatchingCustom(true);

    try {
      const liveTenant = resolveTenant(composingItem);
      const recipientName = liveTenant?.name || composingItem.tenantName || 'Tenant';
      const cleanPhoneDigits = formatPhone(customPhone);

      // 1. WhatsApp Dispatch
      if (customChannel === 'WHATSAPP' || customChannel === 'ALL') {
        if (cleanPhoneDigits) {
          const waUrl = `https://wa.me/${cleanPhoneDigits}?text=${encodeURIComponent(customMessage)}`;
          window.open(waUrl, '_blank', 'noopener,noreferrer');
        } else if (customChannel === 'WHATSAPP') {
          throw new Error(`Valid WhatsApp mobile number required for ${recipientName}`);
        }
      }

      // 2. Email Dispatch
      if (customChannel === 'EMAIL' || customChannel === 'ALL') {
        if (customEmail) {
          const mailUrl = `mailto:${customEmail}?subject=${encodeURIComponent(
            composingItem.title,
          )}&body=${encodeURIComponent(customMessage)}`;
          window.open(mailUrl, '_blank');
        } else if (customChannel === 'EMAIL') {
          throw new Error(`Valid email address required for ${recipientName}`);
        }
      }

      // 3. SMS Dispatch
      if (customChannel === 'SMS') {
        if (cleanPhoneDigits) {
          const smsUrl = `sms:${cleanPhoneDigits}?body=${encodeURIComponent(customMessage)}`;
          window.open(smsUrl, '_blank');
        } else {
          throw new Error(`Valid mobile number required for SMS`);
        }
      }

      // 4. Record delivery in Backend API if raw notification exists
      if (composingItem.rawId) {
        await apiRequest(`/api/notifications/${composingItem.rawId}/send/`, {
          method: 'POST',
          body: {
            channel: customChannel,
            recipient_phone: cleanPhoneDigits,
            recipient_email: customEmail,
            custom_message: customMessage,
          },
        }).catch(() => {});
      }

      setToastMessage(`Notice successfully sent to ${recipientName} via ${customChannel}!`);
      setTimeout(() => setToastMessage(''), 4000);
      setComposingItem(null);

      if (onRefreshData) await onRefreshData();
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Message dispatch failed.');
      setTimeout(() => setToastMessage(''), 4000);
    } finally {
      setIsDispatchingCustom(false);
    }
  };

  // Direct send message handler for card buttons
  const handleSendActualMessage = async (
    item: NotificationItem,
    channel: 'WHATSAPP' | 'SMS' | 'EMAIL' = 'WHATSAPP',
  ) => {
    setSendingId(item.id);
    try {
      const liveTenant = resolveTenant(item);
      const recipientPhone = liveTenant?.phone || item.tenantPhone || '';
      const recipientEmail = liveTenant?.email || item.tenantEmail || '';
      const recipientName = liveTenant?.name || item.tenantName || 'Tenant';
      const cleanPhoneDigits = formatPhone(recipientPhone);

      const msgText =
        item.formattedMessage ||
        `Namaste ${recipientName} ji! ${item.title}: ${item.description}. Due amount: Rs. ${item.amountDue || ''}. Kripya samay par bhugtan karein. Dhanyawaad!`;

      if (channel === 'WHATSAPP') {
        if (cleanPhoneDigits) {
          const url = item.whatsappUrl || `https://wa.me/${cleanPhoneDigits}?text=${encodeURIComponent(msgText)}`;
          window.open(url, '_blank', 'noopener,noreferrer');
        } else {
          setToastMessage(`Tenant ${recipientName} ka valid mobile number nahi mila.`);
          setTimeout(() => setToastMessage(''), 3500);
          return;
        }
      } else if (channel === 'EMAIL') {
        if (!recipientEmail) {
          setToastMessage(`Tenant ${recipientName} ka email address nahi mila.`);
          setTimeout(() => setToastMessage(''), 3500);
          return;
        }
        const mailtoUrl = `mailto:${recipientEmail}?subject=${encodeURIComponent(
          item.title,
        )}&body=${encodeURIComponent(msgText)}`;
        window.open(mailtoUrl, '_blank');
      } else if (channel === 'SMS') {
        if (cleanPhoneDigits) {
          const smsUrl = `sms:${cleanPhoneDigits}?body=${encodeURIComponent(msgText)}`;
          window.open(smsUrl, '_blank');
        } else {
          setToastMessage(`Tenant ${recipientName} ka valid phone number nahi mila.`);
          setTimeout(() => setToastMessage(''), 3500);
          return;
        }
      }

      // Record in backend
      if (item.rawId) {
        await apiRequest(`/api/notifications/${item.rawId}/send/`, {
          method: 'POST',
          body: { channel, recipient_phone: cleanPhoneDigits, recipient_email: recipientEmail },
        });
      }

      setToastMessage(`Message sent to ${recipientName} via ${channel}!`);
      setTimeout(() => setToastMessage(''), 3500);

      if (onRefreshData) await onRefreshData();
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Message dispatch failed.');
      setTimeout(() => setToastMessage(''), 3500);
    } finally {
      setSendingId(null);
    }
  };

  // Send bulk messages to all due tenants
  const handleSendBulkMessages = async () => {
    setIsSendingBulk(true);
    try {
      const res = await apiRequest<{
        message: string;
        total_processed: number;
        dispatched: Array<{ whatsapp_url?: string; tenant_name: string }>;
      }>('/api/notifications/send-bulk/', {
        method: 'POST',
        body: { channel: 'WHATSAPP' },
      });

      if (res.dispatched && res.dispatched.length > 0 && res.dispatched[0].whatsapp_url) {
        window.open(res.dispatched[0].whatsapp_url, '_blank', 'noopener,noreferrer');
      }

      setToastMessage(res.message || `Processed actual messages for ${res.total_processed} pending tenants!`);
      setTimeout(() => setToastMessage(''), 4000);

      if (onRefreshData) await onRefreshData();
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Bulk message sending failed.');
      setTimeout(() => setToastMessage(''), 3500);
    } finally {
      setIsSendingBulk(false);
    }
  };

  // Sync alerts with live database
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await apiRequest('/api/notifications/generate/', {
        method: 'POST',
        body: { days_ahead: 3 },
      }).catch(() => {});

      if (onRefreshData) {
        await onRefreshData();
      }
      setToastMessage('Alerts synchronized with backend database!');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Sync failed.');
      setTimeout(() => setToastMessage(''), 3000);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Dynamic counts for tabs & stat cards
  const counts = useMemo(() => {
    return {
      all: notifications.length,
      unread: notifications.filter((n) => !n.isRead).length,
      overdue: notifications.filter((n) => n.isOverdue || n.type === 'warning').length,
      payments: notifications.filter((n) => n.isPayment || n.type === 'success').length,
      rent: notifications.filter((n) => n.category === 'rent').length,
      electricity: notifications.filter((n) => n.category === 'electricity').length,
      workspace: notifications.filter(
        (n) => n.category === 'workspace' || n.category === 'general',
      ).length,
      sent: notifications.filter((n) => n.isSent).length,
    };
  }, [notifications]);

  // Filter notifications by active tab and search query
  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (activeTab === 'unread' && n.isRead) return false;
      if (activeTab === 'overdue' && !(n.isOverdue || n.type === 'warning')) return false;
      if (activeTab === 'payments' && !(n.isPayment || n.type === 'success')) return false;
      if (activeTab === 'rent' && n.category !== 'rent') return false;
      if (activeTab === 'electricity' && n.category !== 'electricity') return false;
      if (
        activeTab === 'workspace' &&
        n.category !== 'workspace' &&
        n.category !== 'general'
      ) {
        return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.description.toLowerCase().includes(q) ||
          n.time.toLowerCase().includes(q) ||
          (n.tenantName && n.tenantName.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [notifications, activeTab, searchTerm]);

  const todayFormattedHeader = useMemo(() => {
    return new Date()
      .toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
      })
      .toUpperCase();
  }, []);

  const todayNotifications = useMemo(
    () =>
      filtered.filter(
        (n) =>
          n.time.toLowerCase().includes('today') ||
          n.time.toLowerCase().includes('just now'),
      ),
    [filtered],
  );

  const earlierNotifications = useMemo(
    () =>
      filtered.filter(
        (n) =>
          !n.time.toLowerCase().includes('today') &&
          !n.time.toLowerCase().includes('just now'),
      ),
    [filtered],
  );

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-[#A8680C]" />;
      case 'electricity':
        return <Zap className="w-4 h-4 text-[#A8680C]" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-[#0C8067]" />;
      case 'blue':
      default:
        return <Calendar className="w-4 h-4 text-[#035E7B]" />;
    }
  };

  const getIconBg = (type: NotificationItem['type']) => {
    switch (type) {
      case 'warning':
      case 'electricity':
        return 'bg-[#FFF3DD] text-[#A8680C]';
      case 'success':
        return 'bg-[#E5F7F3] text-[#0C8067]';
      case 'blue':
      default:
        return 'bg-[#EAF4F7] text-[#035E7B]';
    }
  };

  // =========================================================================
  // RENDER: NOTIFICATION CARD (100% RESPONSIVE FOR MOBILE, TABLET, LAPTOP, DESKTOP)
  // =========================================================================
  const renderNotificationCard = (item: NotificationItem) => {
    const isOverdue = item.isOverdue || item.type === 'warning';
    const isPayment = item.isPayment || item.type === 'success';
    const liveTenant = resolveTenant(item);
    const tenantDisplayName = liveTenant?.name || item.tenantName;

    return (
      <article
        key={item.id}
        onClick={() => {
          if (!item.isRead) {
            if (onToggleRead) onToggleRead(item.id);
            else onMarkSingleRead(item.id);
          }
        }}
        className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition duration-150 flex flex-col gap-2.5 sm:gap-3 cursor-pointer ${
          !item.isRead
            ? 'bg-[#FBFCFD] border-slate-200/90 shadow-xs hover:border-slate-300'
            : 'bg-white border-slate-100 opacity-80 hover:opacity-100'
        }`}
      >
        {/* Top Row: Icon + Title & Badges + Status & Dismiss Actions */}
        <div className="flex items-start justify-between gap-2.5 sm:gap-3">
          <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
            <div
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${getIconBg(
                item.type,
              )}`}
            >
              {getIcon(item.type)}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 break-words leading-tight">
                  {item.title}
                </h3>

                {isPayment && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0C8067] bg-[#E5F7F3] px-2 py-0.5 rounded-full shrink-0">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>Payment Received</span>
                  </span>
                )}
                {isOverdue && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full shrink-0">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    <span>Overdue</span>
                  </span>
                )}
                {item.isSent && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                    <CheckCheck className="w-2.5 h-2.5" />
                    <span>Sent ({item.sentVia || 'WhatsApp'})</span>
                  </span>
                )}
              </div>

              {/* Timestamp & Tenant metadata */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-slate-400 mt-1">
                <span>{item.time}</span>
                {tenantDisplayName && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      {tenantDisplayName}
                    </span>
                  </>
                )}
                {item.amountDue !== undefined && item.amountDue > 0 && (
                  <>
                    <span>•</span>
                    <span className="font-bold text-[#035E7B]">
                      Rs. {item.amountDue.toLocaleString('en-IN')}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Header Actions: Read/Unread Pill + Dismiss */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleRead) {
                  onToggleRead(item.id);
                } else if (!item.isRead) {
                  onMarkSingleRead(item.id);
                }
              }}
              className="inline-flex items-center gap-1 text-[10px] font-semibold transition px-2 py-1 rounded-lg hover:bg-slate-100"
              title={item.isRead ? 'Mark as unread' : 'Mark as read'}
            >
              {!item.isRead ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-[#14B8A6]" />
                  <span className="text-xs text-[#035E7B] font-bold hidden xs:inline">Unread</span>
                </>
              ) : (
                <span className="text-slate-400 hover:text-slate-600">Read</span>
              )}
            </button>

            {onDismissNotification && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismissNotification(item.id);
                }}
                title="Dismiss notification"
                className="text-slate-300 hover:text-red-500 transition p-1 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Middle: Description text */}
        <p className="text-[11.5px] sm:text-xs text-slate-600 leading-relaxed break-words pl-0 sm:pl-11">
          {item.description}
        </p>

        {/* Bottom: Action Buttons Strip (Fully responsive flex-wrap row) */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-2 border-t border-slate-100 pl-0 sm:pl-11">
          {/* 1. Record Payment / Pay Now Button */}
          {!isPayment && onOpenRecordPayment && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const tId =
                  item.tenantId ||
                  (item.tenantName
                    ? tenants.find(
                        (t) =>
                          t.name.trim().toLowerCase() ===
                          item.tenantName!.trim().toLowerCase(),
                      )?.id
                    : undefined);
                const payType = item.category === 'electricity' ? 'electricity' : 'rent';
                const billId = item.id
                  .replace('rent-overdue-', '')
                  .replace('rent-pending-', '')
                  .replace('elec-unpaid-', '');
                onOpenRecordPayment(tId, payType, billId);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#035E7B] hover:bg-[#024B63] text-white rounded-xl text-xs font-bold transition shadow-xs active:scale-95"
              title="Record payment for this bill"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
          )}

          {/* 2. WhatsApp Button */}
          {!isPayment && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void handleSendActualMessage(item, 'WHATSAPP');
              }}
              disabled={sendingId === item.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E8F8F4] hover:bg-[#D4F2EB] text-[#0C8067] border border-emerald-200/80 rounded-xl text-xs font-bold transition active:scale-95 shadow-2xs"
              title="Send actual WhatsApp reminder to tenant"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#0C8067]" />
              <span>{sendingId === item.id ? 'Sending...' : 'WhatsApp'}</span>
            </button>
          )}

          {/* 3. SMS Button */}
          {!isPayment && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void handleSendActualMessage(item, 'SMS');
              }}
              disabled={sendingId === item.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95"
              title="Send SMS reminder"
            >
              <Send className="w-3 h-3 text-slate-500" />
              <span>SMS</span>
            </button>
          )}

          {/* 4. Email Button */}
          {!isPayment && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void handleSendActualMessage(item, 'EMAIL');
              }}
              disabled={sendingId === item.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95"
              title="Send Email reminder"
            >
              <Mail className="w-3 h-3 text-slate-500" />
              <span>Email</span>
            </button>
          )}

          {/* 5. Custom Compose Notice Modal Trigger */}
          {!isPayment && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenComposeModal(item);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition active:scale-95"
              title="Edit and compose custom message to tenant"
            >
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>Custom Notice</span>
            </button>
          )}

          {/* 6. Payment View Receipt Link */}
          {isPayment && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMarkSingleRead(item.id);
                onNavigate('invoice_list');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EAF4F7] hover:bg-[#D8EDF3] text-[#035E7B] rounded-xl text-xs font-bold transition shadow-2xs"
              title="View invoice & receipt"
            >
              <span>View Receipt</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* 7. Action text link */}
          {item.actionText && item.actionTarget && !isPayment && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMarkSingleRead(item.id);
                onNavigate(item.actionTarget!);
              }}
              className="text-xs font-semibold text-[#035E7B] hover:underline whitespace-nowrap ml-auto"
            >
              {item.actionText}
            </button>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-5 sm:space-y-6 max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
      {/* =========================================================================
          PAGE HEADER & ACTIONS
      ========================================================================= */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F8F4] text-[#0C8067] border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0C8067] animate-pulse" />
              Live Backend Connected
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
            Tenant Alerts &amp; Dispatch Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Real-time live updates for rent dues, meter bills, and payments. Dispatch WhatsApp, SMS, or Email notices to tenants instantly.
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-2 lg:pt-0">
          <button
            type="button"
            onClick={() => void handleSendBulkMessages()}
            disabled={isSendingBulk || counts.all === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0C8067] hover:bg-[#096652] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
            title="Dispatch actual WhatsApp reminder messages to all due tenants"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{isSendingBulk ? 'Dispatching...' : 'Send Bulk Reminders'}</span>
          </button>

          {onRefreshData && (
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#035E7B] rounded-xl text-xs font-semibold transition active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#035E7B]' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Alerts'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onMarkAllRead}
            disabled={counts.unread === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 disabled:opacity-50 rounded-xl text-xs font-semibold transition"
            title="Mark all notifications as read"
          >
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Mark all read</span>
            <span className="sm:hidden">Read all</span>
          </button>

          {onClearAllRead && counts.all > counts.unread && (
            <button
              type="button"
              onClick={onClearAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition"
              title="Clear all read notifications"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Clear read</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsEditingPrefs((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#035E7B] hover:bg-[#024B63] text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95 ml-auto sm:ml-0"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Preferences</span>
          </button>
        </div>
      </section>

      {/* =========================================================================
          4 SUMMARY STAT CARDS (Responsive Grid)
      ========================================================================= */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div
          onClick={() => setActiveTab('all')}
          className={`bg-white border rounded-2xl p-3.5 sm:p-5 shadow-xs cursor-pointer transition ${
            activeTab === 'all' ? 'border-[#035E7B] ring-2 ring-[#035E7B]/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Alerts</span>
            <Bell className="w-4 h-4 text-[#0D8AB0]" />
          </div>
          <div className="text-xl sm:text-3xl font-extrabold text-slate-800 tracking-tight mt-2 sm:mt-3">
            {counts.all}
          </div>
          <span className="text-[10.5px] sm:text-[11px] text-slate-400 mt-1 block truncate">
            {counts.unread} unread · {counts.all - counts.unread} read
          </span>
        </div>

        <div
          onClick={() => setActiveTab('overdue')}
          className={`bg-white border rounded-2xl p-3.5 sm:p-5 shadow-xs cursor-pointer transition ${
            activeTab === 'overdue' ? 'border-amber-500 ring-2 ring-amber-500/10' : 'border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Overdue Dues</span>
            <AlertTriangle className="w-4 h-4 text-[#A8680C]" />
          </div>
          <div className="text-xl sm:text-3xl font-extrabold text-[#A8680C] tracking-tight mt-2 sm:mt-3">
            {counts.overdue}
          </div>
          <span className="text-[10.5px] sm:text-[11px] text-[#A8680C] font-semibold mt-1 block truncate">
            Requires follow-up
          </span>
        </div>

        <div
          onClick={() => setActiveTab('payments')}
          className={`bg-white border rounded-2xl p-3.5 sm:p-5 shadow-xs cursor-pointer transition ${
            activeTab === 'payments' ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Payments Received</span>
            <CheckCircle2 className="w-4 h-4 text-[#0C8067]" />
          </div>
          <div className="text-xl sm:text-3xl font-extrabold text-[#0C8067] tracking-tight mt-2 sm:mt-3">
            {counts.payments}
          </div>
          <span className="text-[10.5px] sm:text-[11px] text-[#0C8067] font-semibold mt-1 block truncate">
            Live tracked
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Dispatched Notices</span>
            <MessageCircle className="w-4 h-4 text-[#035E7B]" />
          </div>
          <div className="text-xl sm:text-3xl font-extrabold text-slate-800 tracking-tight mt-2 sm:mt-3">
            {counts.sent}
          </div>
          <span className="text-[10.5px] sm:text-[11px] text-slate-400 mt-1 block truncate">
            WhatsApp · SMS · Email
          </span>
        </div>
      </section>

      {/* =========================================================================
          MAIN GRID: INBOX & PREFERENCES
      ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Left Column: Your Inbox (8 cols on lg, full width on mobile/tablet) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-6 shadow-xs space-y-4 sm:space-y-5">
          {/* Inbox Header + Responsive Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">Your Inbox</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {counts.unread > 0
                  ? `${counts.unread} unread updates require your attention.`
                  : 'All caught up! No pending unread alerts.'}
              </p>
            </div>

            {/* Search Input (100% width on mobile, 64 on desktop) */}
            <div className="relative w-full sm:w-64 lg:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search alerts by tenant, room, amount..."
                className="w-full h-9 pl-8 pr-8 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#035E7B] focus:ring-2 focus:ring-[#035E7B]/10 transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs (Horizontal touch scrolling on mobile) */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
            {[
              { id: 'all', label: 'All', count: counts.all },
              { id: 'unread', label: 'Unread', count: counts.unread },
              { id: 'overdue', label: 'Overdue', count: counts.overdue, highlight: 'amber' },
              { id: 'payments', label: 'Payments', count: counts.payments, highlight: 'emerald' },
              { id: 'rent', label: 'Rent', count: counts.rent },
              { id: 'electricity', label: 'Electricity', count: counts.electricity },
              { id: 'workspace', label: 'Workspace', count: counts.workspace },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-[#035E7B] text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/70'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    activeTab === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/80 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Empty State */}
          {filtered.length === 0 && (
            <div className="py-12 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-white text-slate-400 flex items-center justify-center mx-auto shadow-2xs border border-slate-100">
                <BellOff className="w-6 h-6 text-slate-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">No alerts in this category</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                  As rents become due, meter bills are recorded, or payments are received in the backend, live alerts will appear here automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleRefresh()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-[#035E7B] rounded-xl text-xs font-bold hover:bg-slate-50 transition shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync with Backend Now</span>
              </button>
            </div>
          )}

          {/* Today's Notifications List */}
          {todayNotifications.length > 0 && (
            <div className="space-y-3">
              <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>TODAY · {todayFormattedHeader}</span>
              </span>

              <div className="space-y-2.5">
                {todayNotifications.map((item) => renderNotificationCard(item))}
              </div>
            </div>
          )}

          {/* Earlier / Scheduled Notifications List */}
          {earlierNotifications.length > 0 && (
            <div className="space-y-3 pt-2">
              <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>EARLIER &amp; SCHEDULED UPDATES</span>
              </span>

              <div className="space-y-2.5">
                {earlierNotifications.map((item) => renderNotificationCard(item))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Preferences & Considerate Messaging */}
        <aside className="lg:col-span-4 space-y-5">
          {/* Notification Preferences Card */}
          <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Automation &amp; Preferences</h2>
                <p className="text-[11px] text-slate-500">Configure reminder triggers</p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#E5F7F3] text-[#0C8067] border border-emerald-200">
                Active
              </span>
            </div>

            {isEditingPrefs ? (
              <div className="space-y-3.5 text-xs pt-1">
                <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-slate-50 border border-slate-100">
                  <span className="text-slate-800 font-semibold">WhatsApp 1-Click Reminders</span>
                  <input
                    type="checkbox"
                    checked={prefs.whatsappEnabled}
                    onChange={(e) =>
                      setPrefs((p) => ({ ...p, whatsappEnabled: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-slate-300 text-[#035E7B] focus:ring-[#035E7B]"
                  />
                </label>

                <div>
                  <label className="text-slate-600 block text-xs font-semibold mb-1">
                    Email Digest Frequency
                  </label>
                  <select
                    value={prefs.emailSummary}
                    onChange={(e) =>
                      setPrefs((p) => ({
                        ...p,
                        emailSummary: e.target.value as NotificationPrefs['emailSummary'],
                      }))
                    }
                    className="w-full h-9 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:border-[#035E7B]"
                  >
                    <option value="Daily">Daily · 9:00 AM</option>
                    <option value="Weekly">Weekly · Monday, 9:00 AM</option>
                    <option value="Monthly">Monthly · 1st of month</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 block text-xs font-semibold mb-1">
                    Rent reminder schedule (Days before due date)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={15}
                    value={prefs.reminderDaysBefore}
                    onChange={(e) =>
                      setPrefs((p) => ({
                        ...p,
                        reminderDaysBefore: Number(e.target.value) || 3,
                      }))
                    }
                    className="w-full h-9 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsEditingPrefs(false);
                    setToastMessage('Notification preferences saved successfully!');
                    setTimeout(() => setToastMessage(''), 3000);
                  }}
                  className="w-full py-2.5 bg-[#035E7B] hover:bg-[#024B63] text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  Save Preferences
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">WhatsApp Reminders</span>
                    <strong className="text-slate-800 block text-xs mt-0.5">
                      {prefs.whatsappEnabled ? 'Enabled for rent & bills' : 'Paused'}
                    </strong>
                  </div>
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Email Summaries</span>
                    <strong className="text-slate-800 block text-xs mt-0.5">
                      {prefs.emailSummary} · 9:00 AM
                    </strong>
                  </div>
                  <Mail className="w-4 h-4 text-[#035E7B]" />
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Schedule Trigger</span>
                    <strong className="text-slate-800 block text-xs mt-0.5">
                      {prefs.reminderDaysBefore} days before the due date
                    </strong>
                  </div>
                  <Calendar className="w-4 h-4 text-amber-600" />
                </div>
              </div>
            )}

            <button
              onClick={() => setIsEditingPrefs((prev) => !prev)}
              className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#035E7B] rounded-xl text-xs font-bold transition"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{isEditingPrefs ? 'Close Preferences' : 'Edit Automation Preferences'}</span>
            </button>
          </section>

          {/* Considerate Quiet Hours Card */}
          <section className="bg-gradient-to-br from-[#EAF4F7] to-[#d8ecf2] border border-[#035E7B]/15 rounded-2xl p-4 sm:p-5 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-white text-[#035E7B] flex items-center justify-center shadow-2xs">
              <Moon className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#035E7B]">Quiet Hours Protected</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Automated reminders are restricted to 9:00 AM – 7:00 PM IST. Your tenants&apos; night hours stay strictly peaceful.
            </p>
          </section>
        </aside>
      </section>

      {/* =========================================================================
          CUSTOM MESSAGE / COMPOSE NOTICE MODAL ("Owner ko jo bhejna ho woh bhej ske")
      ========================================================================= */}
      {composingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#035E7B] to-[#0D8AB0] p-4 sm:p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold leading-tight">
                    Compose &amp; Dispatch Tenant Notice
                  </h3>
                  <p className="text-[11px] text-white/80">Customize message before sending</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setComposingItem(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Recipient Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Phone Number (WhatsApp / SMS)
                  </label>
                  <input
                    type="tel"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full h-9 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-[#035E7B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="tenant@example.com"
                    className="w-full h-9 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-[#035E7B]"
                  />
                </div>
              </div>

              {/* Channel Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                  Choose Delivery Channel
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'WHATSAPP', label: 'WhatsApp', icon: MessageCircle, color: 'text-emerald-700' },
                    { id: 'EMAIL', label: 'Email', icon: Mail, color: 'text-indigo-700' },
                    { id: 'SMS', label: 'SMS', icon: Send, color: 'text-sky-700' },
                    { id: 'ALL', label: 'All (Multi)', icon: Share2, color: 'text-amber-700' },
                  ].map((ch) => {
                    const Icon = ch.icon;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setCustomChannel(ch.id as typeof customChannel)}
                        className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 border transition ${
                          customChannel === ch.id
                            ? 'bg-[#035E7B] text-white border-[#035E7B] shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-[10px]">{ch.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Editable Message Body */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">
                    Message Content (Fully Editable)
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {customMessage.length} characters
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Type any custom reminder, discount note, or maintenance alert..."
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-[#035E7B] focus:ring-2 focus:ring-[#035E7B]/10 font-sans leading-relaxed resize-none"
                />
              </div>

              {/* Quick Template Fill Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-slate-400 font-semibold">Quick Templates:</span>
                <button
                  type="button"
                  onClick={() => {
                    const name = composingItem.tenantName || 'Tenant';
                    setCustomMessage(
                      `Namaste ${name} ji! Urgent reminder: KirayaSaathi par aapka Rs. ${composingItem.amountDue || ''} ka due pending hai. Kripya aaj hi clearance karein. Dhanyawaad!`,
                    );
                  }}
                  className="px-2 py-0.5 rounded-lg bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold hover:bg-red-100"
                >
                  Urgent Due Notice
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const name = composingItem.tenantName || 'Tenant';
                    setCustomMessage(
                      `Namaste ${name} ji! Yeh aapke rent bill ki gentle reminder hai. Payment time se karne par dhanyawaad! - KirayaSaathi`,
                    );
                  }}
                  className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold hover:bg-emerald-100"
                >
                  Gentle Reminder
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => setComposingItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleDispatchCustomMessage()}
                disabled={isDispatchingCustom || !customMessage.trim()}
                className="px-5 py-2.5 bg-[#035E7B] hover:bg-[#024B63] text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {isDispatchingCustom ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send via {customChannel}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TOAST ALERT
      ========================================================================= */}
      {toastMessage && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 bg-slate-900 text-white rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200 border border-slate-700 max-w-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs font-semibold leading-relaxed flex-1">{toastMessage}</div>
          <button
            type="button"
            onClick={() => setToastMessage('')}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="pt-4 pb-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
        <span>KirayaSaathi · Live Notifications &amp; Multichannel Tenant Dispatch</span>
        <span>All amounts in INR · IST</span>
      </footer>
    </div>
  );
};
