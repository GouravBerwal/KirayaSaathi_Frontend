
import { useEffect, useState, type ReactNode } from 'react';
import {
  UserRound,
  Building2,
  Bell,
  ShieldCheck,
  Save,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
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
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
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
  onNavigate: _onNavigate,
}: SettingsPageProps) {
  const [settings, setSettings] = useState<SettingsData>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

    setSuccess('');
  }

  async function saveSettings() {
    if (saving) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

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
        response.message || 'Settings successfully save ho gayi hain.',
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Settings save nahi ho paayi. Dobara try karein.',
      );
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

  const inputClass =
    'mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#035E7B] focus:ring-2 focus:ring-[#035E7B]/10 disabled:cursor-not-allowed disabled:bg-slate-100';

  const labelClass = 'text-sm font-medium text-slate-700';

  if (loading) {
    return (
      <div className="flex min-h-[350px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Backend se settings load ho rahi hain...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#EAF4F7] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Settings
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Apne account aur workspace preferences manage karein.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={reloadSettings}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Reload
            </button>

            <button
              type="button"
              onClick={saveSettings}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#035E7B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#024c63] disabled:cursor-not-allowed disabled:opacity-60"
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

        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Request failed</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        <Section
          icon={<UserRound size={19} />}
          title="Profile information"
          description="Account ke profile details update karein."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={labelClass}>
              Full name
              <input
                className={inputClass}
                value={settings.fullName}
                onChange={(e) =>
                  updateSetting('fullName', e.currentTarget.value)
                }
                placeholder="Full name"
                autoComplete="name"
                disabled={saving}
              />
            </label>

            <label className={labelClass}>
              Email address
              <input
                className={inputClass}
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

            <label className={labelClass}>
              Phone number
              <input
                className={inputClass}
                type="tel"
                value={settings.mobile}
                onChange={(e) =>
                  updateSetting('mobile', e.currentTarget.value)
                }
                placeholder="+91..."
                autoComplete="tel"
                disabled={saving}
              />
            </label>

            <label className={labelClass}>
              Workspace name
              <input
                className={inputClass}
                value={settings.workspaceName}
                onChange={(e) =>
                  updateSetting('workspaceName', e.currentTarget.value)
                }
                placeholder="Workspace name"
                autoComplete="organization"
                disabled={saving}
              />
            </label>

            <label className={`${labelClass} sm:col-span-2`}>
              Address
              <textarea
                className={inputClass}
                rows={2}
                value={settings.address}
                onChange={(e) =>
                  updateSetting('address', e.currentTarget.value)
                }
                placeholder="Workspace address"
                disabled={saving}
              />
            </label>
          </div>
        </Section>

        <Section
          icon={<Building2 size={19} />}
          title="Workspace preferences"
          description="Currency, date format aur rent defaults configure karein."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={labelClass}>
              Currency
              <select
                className={inputClass}
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
                className={inputClass}
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
                className={inputClass}
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
                className={inputClass}
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
                className={inputClass}
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
              Default rate (%)
              <input
                className={inputClass}
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
                className={inputClass}
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
                className={inputClass}
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

          <p className="text-xs text-slate-500">
            Ye preferences settings mein save hongi. Billing calculations
            mein apply karne ke liye billing module ko bhi in settings ko
            read karna hoga.
          </p>
        </Section>

        <Section
          icon={<Bell size={19} />}
          title="Notifications"
          description="Apni notification preferences choose karein."
        >
          <Toggle
            label="WhatsApp reminders"
            description="Rent aur payment reminders ke liye preference."
            checked={settings.whatsappReminders}
            onChange={(value) =>
              updateSetting('whatsappReminders', value)
            }
            disabled={loading || saving}
          />

          <Toggle
            label="Weekly summary"
            description="Weekly account summary ki preference."
            checked={settings.weeklySummary}
            onChange={(value) => updateSetting('weeklySummary', value)}
            disabled={loading || saving}
          />

          <Toggle
            label="Product updates"
            description="KirayaSaathi product updates ki preference."
            checked={settings.productUpdates}
            onChange={(value) => updateSetting('productUpdates', value)}
            disabled={loading || saving}
          />

          <p className="text-xs text-slate-500">
            Preferences save hoti hain. Actual messages bhejne ke liye
            notification service configure karni hogi.
          </p>
        </Section>

        <div className="flex justify-end border-t border-slate-200 pt-5">
          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#035E7B] px-5 py-3 text-sm font-semibold text-white hover:bg-[#024c63] disabled:opacity-60"
          >
            {saving ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? 'Saving...' : 'Save all settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
