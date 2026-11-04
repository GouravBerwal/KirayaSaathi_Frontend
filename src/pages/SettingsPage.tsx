import { useEffect, useState, type ReactNode } from 'react';
import {
  UserRound,
  Building2,
  Bell,
  Save,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  LayoutDashboard,
} from 'lucide-react';
import { apiRequest } from '../utils/api';
import type { PageType } from '../types';

type SettingsPageProps = {
  onNavigate: (page: PageType) => void;
};

type SettingsData = {
  fullName: string;
  mobile: string;
  email: string;
  address: string;
  workspaceName: string;
  language: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  financialYear: string;
  whatsappReminders: boolean;
  weeklySummary: boolean;
  productUpdates: boolean;
  defaultRentDueDay: string;
  defaultRate: string;
  defaultDeposit: string;
  defaultReminderTiming: string;
};

const EMPTY_SETTINGS: SettingsData = {
  fullName: '',
  mobile: '',
  email: '',
  address: '',
  workspaceName: '',
  language: 'English (India)',
  currency: 'INR · Indian Rupee (₹)',
  timezone: 'Asia/Kolkata · IST (UTC+05:30)',
  dateFormat: 'DD MMM YYYY',
  financialYear: 'April – March',
  whatsappReminders: true,
  weeklySummary: true,
  productUpdates: false,
  defaultRentDueDay: '5th of each month',
  defaultRate: '8.00',
  defaultDeposit: "2 months' rent",
  defaultReminderTiming: '3 days before due date',
};

const SETTINGS_URL = '/api/properties/settings/';

type SettingsResponse = {
  data?: Partial<SettingsData>;
  message?: string;
  updated_at?: string;
};

type SectionProps = {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
};

function Section({
  icon,
  title,
  description,
  children,
}: SectionProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="rounded-lg bg-[#EAF4F7] p-2 text-[#035E7B]">
          {icon}
        </div>

        <div>
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">{children}</div>
    </section>
  );
}

type ToggleProps = {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? 'bg-[#035E7B]' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            checked ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
}

export default function SettingsPage({
  onNavigate,
}: SettingsPageProps) {
  const [settings, setSettings] = useState<SettingsData>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        setLoading(true);
        setError('');

        const response =
          await apiRequest<SettingsResponse>(SETTINGS_URL);

        if (active) {
          setSettings({
            ...EMPTY_SETTINGS,
            ...(response.data ?? {}),
          });
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Settings load nahi ho paayi.',
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      active = false;
    };
  }, []);

  function updateSetting<K extends keyof SettingsData>(
    key: K,
    value: SettingsData[K],
  ) {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));

    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }

    setSuccess('');
    setError('');
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    const missing: string[] = [];

    if (!settings.fullName || !settings.fullName.trim()) {
      errors.fullName = 'Full Name zaroori hai.';
      missing.push('Full Name');
    }

    if (!settings.email || !settings.email.trim()) {
      errors.email = 'Email Address zaroori hai.';
      missing.push('Email Address');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email.trim())) {
      errors.email = 'Kripya sahi email address enter karein.';
      missing.push('Valid Email');
    }

    if (!settings.mobile || !settings.mobile.trim()) {
      errors.mobile = 'Phone Number zaroori hai.';
      missing.push('Phone Number');
    }

    if (!settings.workspaceName || !settings.workspaceName.trim()) {
      errors.workspaceName = 'Workspace Name zaroori hai.';
      missing.push('Workspace Name');
    }

    setFieldErrors(errors);

    if (missing.length > 0) {
      setError(`Kripya zaroori fields bharein: ${missing.join(', ')}`);
      return false;
    }

    return true;
  }

  async function saveSettings() {
    if (saving) return;

    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');
      setFieldErrors({});

      const response = await apiRequest<SettingsResponse>(
        SETTINGS_URL,
        {
          method: 'PUT',
          body: { data: settings },
        },
      );

      setSettings((previous) => ({
        ...previous,
        ...(response.data ?? {}),
      }));

      setSuccess(
        response.message || 'Settings successfully save ho gayi hain! Dashboard par redirect ho rahe hain...',
      );

      // Smooth auto-redirect to dashboard after 1.2s
      setTimeout(() => {
        onNavigate('dashboard');
      }, 1200);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Settings save nahi ho paayi. Dobara try karein.',
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  }

  async function reloadSettings() {
    if (saving) return;

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      setFieldErrors({});

      const response =
        await apiRequest<SettingsResponse>(SETTINGS_URL);

      setSettings({
        ...EMPTY_SETTINGS,
        ...(response.data ?? {}),
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Settings reload nahi ho paayi.',
      );
    } finally {
      setLoading(false);
    }
  }

  const baseInputClass =
    'mt-2 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100';

  const getInputClass = (fieldName: string) => {
    if (fieldErrors[fieldName]) {
      return `${baseInputClass} border-red-400 bg-red-50/30 focus:border-red-500 focus:ring-2 focus:ring-red-100`;
    }
    return `${baseInputClass} border-slate-200 focus:border-[#035E7B] focus:ring-2 focus:ring-[#035E7B]/10`;
  };

  const labelClass = 'text-sm font-medium text-slate-700';

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-sm text-slate-600">
          <LoaderCircle className="h-7 w-7 animate-spin text-[#035E7B]" />
          <span>KirayaSaathi settings load ho rahi hain...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#EAF4F7] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#035E7B] hover:underline"
              >
                <ArrowLeft size={14} />
                Dashboard
              </button>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Settings
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Apne account aur KirayaSaathi workspace preferences manage karein.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            >
              <LayoutDashboard size={15} />
              Dashboard
            </button>

            <button
              type="button"
              onClick={reloadSettings}
              disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition shadow-2xs"
            >
              <RefreshCw size={15} />
              Reload
            </button>

            <button
              type="button"
              onClick={saveSettings}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#035E7B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#024c63] disabled:cursor-not-allowed disabled:opacity-60 transition shadow-sm"
            >
              {saving ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-xs animate-shake"
          >
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-600" />
            <div className="flex-1">
              <p className="font-semibold text-red-900">Missing or Invalid Information</p>
              <p className="mt-0.5 text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div
            role="status"
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-950">Success</p>
                <p className="text-emerald-800">{success}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition"
            >
              Abhi Dashboard par jayein →
            </button>
          </div>
        )}

        {/* Profile Information */}
        <Section
          icon={<UserRound size={19} />}
          title="Profile information"
          description="Owner profile aur contact details update karein."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                Full name <span className="text-red-500">*</span>
                <input
                  className={getInputClass('fullName')}
                  value={settings.fullName}
                  onChange={(e) =>
                    updateSetting('fullName', e.currentTarget.value)
                  }
                  placeholder="e.g. Gourav Berwal"
                  autoComplete="name"
                  disabled={saving}
                />
              </label>
              {fieldErrors.fullName && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  {fieldErrors.fullName}
                </p>
              )}
            </div>

            <div>
              <label className={labelClass}>
                Email address <span className="text-red-500">*</span>
                <input
                  className={getInputClass('email')}
                  type="email"
                  value={settings.email}
                  onChange={(e) =>
                    updateSetting('email', e.currentTarget.value)
                  }
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={saving}
                />
              </label>
              {fieldErrors.email && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label className={labelClass}>
                Phone number <span className="text-red-500">*</span>
                <input
                  className={getInputClass('mobile')}
                  type="tel"
                  value={settings.mobile}
                  onChange={(e) =>
                    updateSetting('mobile', e.currentTarget.value)
                  }
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                  disabled={saving}
                />
              </label>
              {fieldErrors.mobile && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  {fieldErrors.mobile}
                </p>
              )}
            </div>

            <div>
              <label className={labelClass}>
                Workspace name <span className="text-red-500">*</span>
                <input
                  className={getInputClass('workspaceName')}
                  value={settings.workspaceName}
                  onChange={(e) =>
                    updateSetting('workspaceName', e.currentTarget.value)
                  }
                  placeholder="e.g. Berwal PG & Rentals"
                  autoComplete="organization"
                  disabled={saving}
                />
              </label>
              {fieldErrors.workspaceName && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  {fieldErrors.workspaceName}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className={labelClass}>
                Property / Office Address
                <textarea
                  className={getInputClass('address')}
                  rows={2}
                  value={settings.address}
                  onChange={(e) =>
                    updateSetting('address', e.currentTarget.value)
                  }
                  placeholder="Official address for invoices and receipts"
                  disabled={saving}
                />
              </label>
            </div>
          </div>
        </Section>

        {/* Workspace Preferences */}
        <Section
          icon={<Building2 size={19} />}
          title="Workspace preferences"
          description="Currency, date format aur default rent parameters."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={labelClass}>
              Currency
              <select
                className={getInputClass('currency')}
                value={settings.currency}
                onChange={(e) =>
                  updateSetting('currency', e.currentTarget.value)
                }
                disabled={saving}
              >
                <option value="INR · Indian Rupee (₹)">
                  INR — Indian Rupee (₹)
                </option>
                <option value="USD · US Dollar ($)">
                  USD — US Dollar ($)
                </option>
                <option value="EUR · Euro (€)">
                  EUR — Euro (€)
                </option>
              </select>
            </label>

            <label className={labelClass}>
              Date format
              <select
                className={getInputClass('dateFormat')}
                value={settings.dateFormat}
                onChange={(e) =>
                  updateSetting('dateFormat', e.currentTarget.value)
                }
                disabled={saving}
              >
                <option value="DD MMM YYYY">DD MMM YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </label>

            <label className={labelClass}>
              Time zone
              <select
                className={getInputClass('timezone')}
                value={settings.timezone}
                onChange={(e) =>
                  updateSetting('timezone', e.currentTarget.value)
                }
                disabled={saving}
              >
                <option value="Asia/Kolkata · IST (UTC+05:30)">
                  India (Asia/Kolkata)
                </option>
                <option value="UTC">UTC</option>
              </select>
            </label>

            <label className={labelClass}>
              Financial year
              <select
                className={getInputClass('financialYear')}
                value={settings.financialYear}
                onChange={(e) =>
                  updateSetting('financialYear', e.currentTarget.value)
                }
                disabled={saving}
              >
                <option value="April – March">April – March</option>
                <option value="January – December">
                  January – December
                </option>
              </select>
            </label>

            <label className={labelClass}>
              Default rent due day
              <select
                className={getInputClass('defaultRentDueDay')}
                value={settings.defaultRentDueDay}
                onChange={(e) =>
                  updateSetting('defaultRentDueDay', e.currentTarget.value)
                }
                disabled={saving}
              >
                <option value="1st of each month">1st of each month</option>
                <option value="5th of each month">5th of each month</option>
                <option value="10th of each month">10th of each month</option>
                <option value="15th of each month">15th of each month</option>
              </select>
            </label>

            <label className={labelClass}>
              Default electricity rate (₹/unit)
              <input
                className={getInputClass('defaultRate')}
                type="number"
                min={0}
                step="0.01"
                value={settings.defaultRate}
                onChange={(e) =>
                  updateSetting('defaultRate', e.currentTarget.value)
                }
                disabled={saving}
              />
            </label>

            <label className={labelClass}>
              Default security deposit
              <select
                className={getInputClass('defaultDeposit')}
                value={settings.defaultDeposit}
                onChange={(e) =>
                  updateSetting('defaultDeposit', e.currentTarget.value)
                }
                disabled={saving}
              >
                <option value="1 month's rent">1 month's rent</option>
                <option value="2 months' rent">2 months' rent</option>
                <option value="3 months' rent">3 months' rent</option>
                <option value="No deposit">No deposit</option>
              </select>
            </label>

            <label className={labelClass}>
              Payment reminder timing
              <select
                className={getInputClass('defaultReminderTiming')}
                value={settings.defaultReminderTiming}
                onChange={(e) =>
                  updateSetting(
                    'defaultReminderTiming',
                    e.currentTarget.value,
                  )
                }
                disabled={saving}
              >
                <option value="On due date">On due date</option>
                <option value="1 day before due date">
                  1 day before due date
                </option>
                <option value="3 days before due date">
                  3 days before due date
                </option>
                <option value="7 days before due date">
                  7 days before due date
                </option>
              </select>
            </label>
          </div>
        </Section>

        {/* Notifications */}
        <Section
          icon={<Bell size={19} />}
          title="Notifications"
          description="Apni communication aur reminder preferences choose karein."
        >
          <Toggle
            label="WhatsApp reminders"
            description="Tenants ko rent aur payment reminders bhejne ki preference."
            checked={settings.whatsappReminders}
            onChange={(value) =>
              updateSetting('whatsappReminders', value)
            }
            disabled={loading || saving}
          />

          <Toggle
            label="Weekly summary"
            description="Owner weekly financial aur occupancy summary report."
            checked={settings.weeklySummary}
            onChange={(value) => updateSetting('weeklySummary', value)}
            disabled={loading || saving}
          />

          <Toggle
            label="Product updates"
            description="KirayaSaathi product improvements aur feature announcements."
            checked={settings.productUpdates}
            onChange={(value) => updateSetting('productUpdates', value)}
            disabled={loading || saving}
          />
        </Section>

        {/* Bottom Action Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-5">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <ArrowLeft size={16} />
            Cancel &amp; Back to Dashboard
          </button>

          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#035E7B] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#024c63] disabled:opacity-60 transition shadow-sm"
          >
            {saving ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? 'Saving Settings...' : 'Save All Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
