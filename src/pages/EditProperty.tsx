
import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Save,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';

import type { PageType, Property } from '../types';

interface EditPropertyProps {
  property?: Property;
  onNavigate: (page: PageType) => void;
  onUpdateProperty?: (
    updated: Partial<Property>,
    imageFile?: File | null,
  ) => Promise<boolean | void> | boolean | void;
  onDeleteProperty?: (
    propertyId: string,
  ) => Promise<boolean | void> | boolean | void;
}

interface PropertyForm {
  name: string;
  type: string;
  address: string;
  locality: string;
  city: string;
  state: string;
  pinCode: string;
  monthlyRent: string;
  securityDeposit: string;
  rentDueDay: string;
  electricityRate: string;
}

const PROPERTY_TYPES = [
  { value: 'BUILDING', label: 'Residential Building' },
  { value: 'APARTMENT', label: 'Apartment' },
  { value: 'HOSTEL', label: 'Hostel' },
  { value: 'PG', label: 'PG / Co-Living' },
  { value: 'HOUSE', label: 'Independent House' },
  { value: 'COMMERCIAL', label: 'Commercial Property' },
  { value: 'OTHER', label: 'Other' },
];

function createForm(property?: Property): PropertyForm {
  return {
    name: property?.name ?? '',
    type: property?.type?.toUpperCase() || 'BUILDING',
    address: property?.address ?? '',
    locality: property?.locality ?? '',
    city: property?.city ?? '',
    state: property?.state ?? '',
    pinCode: property?.pinCode ?? '',
    monthlyRent: String(property?.monthlyRent ?? 0),
    securityDeposit: String(property?.securityDeposit ?? 0),
    rentDueDay: String(property?.rentDueDay ?? 5),
    electricityRate: String(property?.electricityRate ?? 0),
  };
}

export default function EditProperty({
  property,
  onNavigate,
  onUpdateProperty,
  onDeleteProperty,
}: EditPropertyProps) {
  const [form, setForm] = useState<PropertyForm>(() =>
    createForm(property),
  );

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    setForm(createForm(property));
    setSuccessMessage('');
    setErrorMessage('');
    setSelectedImage(null);
    setImagePreview(null);
  }, [property]);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const updateField = (
    field: keyof PropertyForm,
    value: string,
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleImageChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('JPG, PNG ya WebP image select karein.');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size 5 MB se kam honi chahiye.');
      event.target.value = '';
      return;
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setSuccessMessage('');
    setErrorMessage('');
    event.target.value = '';
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleSave = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!property) {
      setErrorMessage('Property select nahi hui hai.');
      return;
    }

    if (!onUpdateProperty) {
      setErrorMessage('Property update function available nahi hai.');
      return;
    }

    const monthlyRent = Number(form.monthlyRent);
    const securityDeposit = Number(form.securityDeposit);
    const rentDueDay = Number(form.rentDueDay);
    const electricityRate = Number(form.electricityRate);

    if (
      !form.name.trim() ||
      !form.address.trim() ||
      !form.city.trim() ||
      !form.state.trim() ||
      !form.pinCode.trim()
    ) {
      setErrorMessage('Saare required fields fill karein.');
      return;
    }

    if (!/^\d{5,10}$/.test(form.pinCode.trim())) {
      setErrorMessage('Valid PIN code enter karein.');
      return;
    }

    if (
      !Number.isFinite(monthlyRent) ||
      !Number.isFinite(securityDeposit) ||
      !Number.isFinite(electricityRate) ||
      monthlyRent < 0 ||
      securityDeposit < 0 ||
      electricityRate < 0
    ) {
      setErrorMessage(
        'Rent, deposit aur electricity rate valid hone chahiye.',
      );
      return;
    }

    if (
      !Number.isInteger(rentDueDay) ||
      rentDueDay < 1 ||
      rentDueDay > 28
    ) {
      setErrorMessage(
        'Rent due day 1 se 28 ke beech enter karein.',
      );
      return;
    }

    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const fullAddress = [
        form.address.trim(),
        form.locality.trim(),
      ]
        .filter(Boolean)
        .join(', ');

      const result = await onUpdateProperty(
        {
          id: property.id,
          name: form.name.trim(),
          type: form.type,
          address: fullAddress,
          locality: form.locality.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          pinCode: form.pinCode.trim(),
          monthlyRent,
          securityDeposit,
          rentDueDay,
          electricityRate,
        },
        selectedImage,
      );

      if (result === false) {
        throw new Error('Property update nahi ho paayi.');
      }

      setSuccessMessage(
        selectedImage
          ? 'Property details aur image successfully update ho gaye.'
          : 'Property successfully update ho gayi.',
      );

      setSelectedImage(null);
      setImagePreview(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Property update karte waqt error aaya.',
      );
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100';

  const labelClass = 'text-sm font-medium text-slate-700';

  const roomCount = property?.totalRooms ?? 0;
  const occupiedCount = property?.occupiedRooms ?? 0;
  const vacantCount = Math.max(roomCount - occupiedCount, 0);

  if (!property) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <button
          type="button"
          onClick={() => onNavigate('property_list')}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:text-sky-900"
        >
          <ArrowLeft size={18} />
          Back to Properties
        </button>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          Edit karne ke liye pehle ek property select karein.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => onNavigate('property_detail')}
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-sky-700"
          >
            <ArrowLeft size={17} />
            Back to Property Details
          </button>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Edit Property
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Update the property information and rental settings.
          </p>
        </div>

        <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-800">
          Property ID: {property.id}
        </span>
      </div>

      {successMessage && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
          <div>{successMessage}</div>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <XCircle size={20} className="mt-0.5 shrink-0" />
          <div>{errorMessage}</div>
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"
      >
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-lg bg-sky-50 p-2.5 text-sky-700">
                <ImagePlus size={21} />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Property Cover Image
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Upload a photo of your property.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Property cover preview"
                  className="h-64 w-full object-cover"
                />
              ) : property.image ? (
                <img
                  src={
                    property.image.startsWith('http')
                      ? property.image
                      : `http://localhost:8000${property.image}`
                  }
                  alt={`${property.name} cover`}
                  className="h-64 w-full object-cover"
                />
              ) : (
                <div className="flex h-64 flex-col items-center justify-center gap-3 px-4 text-center">
                  <div className="rounded-full bg-white p-4 shadow-sm">
                    <Building2
                      size={32}
                      className="text-slate-400"
                    />
                  </div>

                  <div>
                    <p className="font-medium text-slate-700">
                      No property image
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Choose a property photo to preview it here.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label
                className={`inline-flex items-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800 ${
                  saving
                    ? 'cursor-not-allowed opacity-60'
                    : 'cursor-pointer'
                }`}
              >
                <Upload size={17} />
                Choose Image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={saving}
                />
              </label>

              {(imagePreview || selectedImage) && (
                <button
                  type="button"
                  onClick={removeImage}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  <Trash2 size={16} />
                  Remove New Image
                </button>
              )}
            </div>

            <p className="mt-3 text-xs text-slate-500">
              JPG, PNG or WebP. Maximum size: 5 MB.
            </p>

            {selectedImage && (
              <p className="mt-2 break-all text-xs text-slate-600">
                Selected: {selectedImage.name}
              </p>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-lg bg-sky-50 p-2.5 text-sky-700">
                <Building2 size={21} />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Basic Information
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the property name and type.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="property-name">
                  Property Name *
                </label>
                <input
                  id="property-name"
                  className={inputClass}
                  value={form.name}
                  onChange={(event) =>
                    updateField('name', event.target.value)
                  }
                  placeholder="Enter property name"
                  maxLength={150}
                  required
                  disabled={saving}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="property-type">
                  Property Type *
                </label>
                <select
                  id="property-type"
                  className={inputClass}
                  value={form.type}
                  onChange={(event) =>
                    updateField('type', event.target.value)
                  }
                  required
                  disabled={saving}
                >
                  {PROPERTY_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6">
              <h2 className="font-semibold text-slate-900">
                Property Address
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Update the address used for this property.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="street-address">
                  Street Address *
                </label>
                <textarea
                  id="street-address"
                  className={inputClass}
                  value={form.address}
                  onChange={(event) =>
                    updateField('address', event.target.value)
                  }
                  placeholder="House number, street and area"
                  rows={3}
                  required
                  disabled={saving}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="locality">
                  Locality / Area
                </label>
                <input
                  id="locality"
                  className={inputClass}
                  value={form.locality}
                  onChange={(event) =>
                    updateField('locality', event.target.value)
                  }
                  placeholder="Enter locality (optional)"
                  disabled={saving}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Locality address ke saath combine ki jayegi.
                </p>
              </div>

              <div>
                <label className={labelClass} htmlFor="city">
                  City *
                </label>
                <input
                  id="city"
                  className={inputClass}
                  value={form.city}
                  onChange={(event) =>
                    updateField('city', event.target.value)
                  }
                  placeholder="Enter city"
                  maxLength={100}
                  required
                  disabled={saving}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="state">
                  State *
                </label>
                <input
                  id="state"
                  className={inputClass}
                  value={form.state}
                  onChange={(event) =>
                    updateField('state', event.target.value)
                  }
                  placeholder="Enter state"
                  maxLength={100}
                  required
                  disabled={saving}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="pin-code">
                  PIN Code *
                </label>
                <input
                  id="pin-code"
                  className={inputClass}
                  value={form.pinCode}
                  onChange={(event) =>
                    updateField(
                      'pinCode',
                      event.target.value.replace(/\D/g, '').slice(0, 10),
                    )
                  }
                  placeholder="Enter PIN code"
                  inputMode="numeric"
                  required
                  disabled={saving}
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6">
              <h2 className="font-semibold text-slate-900">
                Rent &amp; Billing Settings
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Configure the monthly rent and billing amounts.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="monthly-rent">
                  Monthly Rent (₹) *
                </label>
                <input
                  id="monthly-rent"
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.monthlyRent}
                  onChange={(event) =>
                    updateField('monthlyRent', event.target.value)
                  }
                  required
                  disabled={saving}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="security-deposit">
                  Security Deposit (₹) *
                </label>
                <input
                  id="security-deposit"
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.securityDeposit}
                  onChange={(event) =>
                    updateField('securityDeposit', event.target.value)
                  }
                  required
                  disabled={saving}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="rent-due-day">
                  Rent Due Day *
                </label>
                <select
                  id="rent-due-day"
                  className={inputClass}
                  value={form.rentDueDay}
                  onChange={(event) =>
                    updateField('rentDueDay', event.target.value)
                  }
                  required
                  disabled={saving}
                >
                  {Array.from({ length: 28 }, (_, index) => index + 1).map(
                    (day) => (
                      <option key={day} value={day}>
                        {day}
                        {day === 1
                          ? 'st'
                          : day === 2
                            ? 'nd'
                            : day === 3
                              ? 'rd'
                              : 'th'}{' '}
                        of every month
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="electricity-rate">
                  Electricity Rate (₹ / unit) *
                </label>
                <input
                  id="electricity-rate"
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.electricityRate}
                  onChange={(event) =>
                    updateField('electricityRate', event.target.value)
                  }
                  required
                  disabled={saving}
                />
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {property && onDeleteProperty ? (
              <button
                type="button"
                onClick={async () => {
                  const ok = window.confirm(
                    `Kya aap sach me "${property.name}" ko delete karna chahte hain? Is property ke saare rooms aur records remove ho jayenge.`
                  );
                  if (ok) {
                    await onDeleteProperty(property.id);
                  }
                }}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
              >
                <Trash2 size={16} />
                <span>Delete Property</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('property_detail')}
                className="rounded-lg border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={17} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">
              Property at a Glance
            </h2>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-500">Total Rooms</span>
                <span className="font-semibold text-slate-900">
                  {roomCount}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-500">
                  Occupied Rooms
                </span>
                <span className="font-semibold text-green-700">
                  {occupiedCount}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-500">Vacant Rooms</span>
                <span className="font-semibold text-amber-700">
                  {vacantCount}
                </span>
              </div>
            </div>

            <div className="mt-5 rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Monthly Property Rent
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                ₹
                {Number(form.monthlyRent || 0).toLocaleString('en-IN')}
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">
              Before You Save
            </h2>

            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li>
                • Property details and selected image are sent to the update
                handler.
              </li>
              <li>
                • Address and locality are stored together in the address field.
              </li>
              <li>
                • Owner name and contact number are not separate fields in the
                current backend model.
              </li>
              <li>
                • Room counts use the currently loaded property data.
              </li>
            </ul>
          </section>
        </aside>
      </form>
    </div>
  );
}
