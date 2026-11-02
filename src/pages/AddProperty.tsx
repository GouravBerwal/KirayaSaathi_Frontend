import React, { useState } from 'react';
import { PageType, Property } from '../types';
import {
  ArrowLeft,
  Building,
  Upload,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface AddPropertyProps {
  onNavigate: (page: PageType) => void;
  onAddProperty: (newProp: Partial<Property>) => void | Promise<void>;
}

export const AddProperty: React.FC<AddPropertyProps> = ({
  onNavigate,
  onAddProperty,
}) => {
  const [propertyName, setPropertyName] = useState('');
  const [propertyType, setPropertyType] = useState('BUILDING');
  const [ownerName, setOwnerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [locality, setLocality] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [state, setState] = useState('Karnataka');
  const [pinCode, setPinCode] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [rentDueDay, setRentDueDay] = useState('5');
  const [electricityRate, setElectricityRate] = useState('8.0');
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      await onAddProperty({
        name: propertyName.trim() || 'New Property',
        type: propertyType,
        address: streetAddress.trim(),
        locality: locality.trim(),
        city: city.trim(),
        state: state.trim(),
        pinCode: pinCode.trim(),
        monthlyRent: Number(monthlyRent) || 0,
        securityDeposit: Number(securityDeposit) || 0,
        rentDueDay: Number(rentDueDay) || 5,
        electricityRate: Number(electricityRate) || 8.0,
        ownerName: ownerName.trim(),
        contactNumber: contactNumber.trim(),
        totalRooms: 0,
        occupiedRooms: 0,
        rentCollected: 0,
        pendingRent: 0,
        imageTheme: 'one',
      });

      setShowSavedToast(true);
      setTimeout(() => {
        setShowSavedToast(false);
        onNavigate('property_list');
      }, 1000);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Property create nahi ho paayi.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <button
          onClick={() => onNavigate('property_list')}
          className="hover:text-[#035E7B] flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-4 h-4 text-[#035E7B]" />
          <span>Properties / Add property</span>
        </button>
      </div>

      {/* Heading */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight">
          Make room for your next property
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Start with the essentials. You can add rooms and tenants once the property is created.
        </p>
      </div>

      {/* Stepper Progress */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:px-6 flex items-center justify-between text-xs shadow-2xs">
        <div className="flex items-center gap-2.5 font-bold text-[#035E7B]">
          <span className="w-6 h-6 rounded-full bg-[#035E7B] text-white flex items-center justify-center text-xs">
            1
          </span>
          <span>Property details</span>
        </div>
        <div className="flex-1 h-px bg-slate-200 mx-4 max-w-28 hidden sm:block" />
        <div className="flex items-center gap-2.5 text-slate-400">
          <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs">
            2
          </span>
          <span className="hidden sm:inline">Add rooms</span>
        </div>
        <div className="flex-1 h-px bg-slate-200 mx-4 max-w-28 hidden sm:block" />
        <div className="flex items-center gap-2.5 text-slate-400">
          <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs">
            3
          </span>
          <span className="hidden sm:inline">Allocate tenants</span>
        </div>
      </div>

      {/* Form Grid: Left Fields, Right Sidebar */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Form Panels (2 spans) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Property Details */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-800">Property details</h2>
              <p className="text-xs text-slate-400 mt-0.5">Use a name that helps you and your tenants identify the building.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Property name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  placeholder="Enter property name"
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Property type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:border-[#035E7B]"
                >
                  <option value="BUILDING">Residential Building</option>
                  <option value="APARTMENT">Apartment</option>
                  <option value="HOSTEL">Hostel</option>
                  <option value="PG">PG / Co-Living</option>
                  <option value="HOUSE">Independent House</option>
                  <option value="COMMERCIAL">Commercial Property</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Owner / manager name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Enter owner name"
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Contact number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
                />
              </div>
            </div>
          </section>

          {/* Address */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-800">Property address</h2>
              <p className="text-xs text-slate-400 mt-0.5">A complete address keeps records and tenant communication clear.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Street address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="Building number, street and area"
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Locality <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  placeholder="Enter locality"
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  City <span className="text-rose-500">*</span>
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:border-[#035E7B]"
                >
                  <option value="Bengaluru">Bengaluru</option>
                  <option value="Indore">Indore</option>
                  <option value="Pune">Pune</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Hyderabad">Hyderabad</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  State <span className="text-rose-500">*</span>
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:border-[#035E7B]"
                >
                  <option value="Karnataka">Karnataka</option>
                  <option value="Madhya Pradesh">Madhya Pradesh</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Telangana">Telangana</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  PIN code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder="6-digit PIN code"
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
                />
              </div>
            </div>
          </section>

          {/* Billing Preferences */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-800">Default billing preferences</h2>
              <p className="text-xs text-slate-400 mt-0.5">These defaults apply to new rooms. Room-level rent can be adjusted later.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Monthly rent / room <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 inset-y-0 flex items-center text-slate-400 text-xs">₹</span>
                  <input
                    type="number"
                    required
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(e.target.value)}
                    className="w-full h-10 pl-7 pr-3 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-[#035E7B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Security deposit / room <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 inset-y-0 flex items-center text-slate-400 text-xs">₹</span>
                  <input
                    type="number"
                    required
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(e.target.value)}
                    className="w-full h-10 pl-7 pr-3 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-[#035E7B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Rent due day <span className="text-rose-500">*</span>
                </label>
                <select
                  value={rentDueDay}
                  onChange={(e) => setRentDueDay(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:border-[#035E7B]"
                >
                  <option value="1">1st of each month</option>
                  <option value="5">5th of each month</option>
                  <option value="7">7th of each month</option>
                  <option value="10">10th of each month</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Electricity rate <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={electricityRate}
                    onChange={(e) => setElectricityRate(e.target.value)}
                    className="w-full h-10 pl-3 pr-14 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-[#035E7B]"
                  />
                  <span className="absolute right-3 inset-y-0 flex items-center text-slate-400 text-xs pointer-events-none">
                    / kWh
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Billed on actual meter consumption.</p>
              </div>
            </div>
          </section>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <p className="text-xs text-slate-400">
              <span className="text-rose-500">*</span> Required fields
            </p>

            {errorMessage && (
              <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => onNavigate('property_list')}
                className="flex-1 sm:flex-initial px-5 h-10 border border-slate-200 rounded-xl text-xs font-semibold text-[#035E7B] bg-white hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial px-6 h-10 bg-[#035E7B] hover:bg-[#024B63] disabled:opacity-60 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
              >
                {isSubmitting ? 'Creating property...' : 'Create property'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Info Column (1 span) */}
        <aside className="space-y-5">
          {/* Cover Photo Placeholder */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Property cover</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Optional · Make your property easy to recognise.</p>
            </div>

            <div className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:bg-slate-50 transition bg-slate-50/50">
              <Upload className="w-6 h-6 text-[#0D8AB0] mb-2" />
              <strong className="text-xs font-bold text-[#035E7B]">Click to upload or drag a photo</strong>
              <small className="text-[10px] text-slate-400 mt-1">JPG or PNG · Up to 5 MB</small>
            </div>
          </div>

          {/* Setup Guidance */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-[#EAF4F7] text-[#035E7B]">
              PROPERTY SETUP
            </div>
            <h3 className="text-sm font-bold text-slate-800">A simple start</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Create the property first, then build its room inventory. No tenants or bills will be created yet.
            </p>

            <div className="h-px bg-slate-100 my-2" />

            <h4 className="text-xs font-bold text-slate-700">What happens next?</h4>
            <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside">
              <li>Add room numbers and floor details</li>
              <li>Set rent and meter information</li>
              <li>Allocate tenants when they move in</li>
            </ol>
          </div>

          {/* Information Card */}
          <div className="bg-[#E8F4F7] rounded-xl p-4 flex items-start gap-3 text-xs">
            <Info className="w-4 h-4 text-[#0D8AB0] shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-slate-800 block">Your portfolio stays organised</strong>
              <p className="text-slate-500 mt-0.5 text-[11px] leading-relaxed">
                All new properties are added to the Mehta Properties owner workspace.
              </p>
            </div>
          </div>
        </aside>
      </form>

      {/* Toast Notification */}
      {showSavedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-emerald-200 rounded-2xl p-4 shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <div className="text-xs font-bold text-slate-800">Property created successfully!</div>
            <div className="text-[11px] text-slate-500">Redirecting to room setup...</div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
        <span>KirayaSaathi · Smart rental management for every property owner</span>
        <span>All amounts in INR · IST</span>
      </footer>
    </div>
  );
};
