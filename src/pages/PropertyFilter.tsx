import React, { useMemo, useState } from 'react';
import { PageType, Property } from '../types';
import {
  Download,
  Plus,
  Search,
  MapPin,
  SlidersHorizontal,
  LayoutGrid,
  ChevronDown,
  ArrowUpRight,
  MoreVertical,
  Building,
  RotateCcw,
} from 'lucide-react';

interface PropertyFilterProps {
  properties: Property[];
  onNavigate: (page: PageType) => void;
  onSelectProperty?: (property: Property) => void;
}

type PropertyExtraFields = Property & {
  type?: string;
  propertyType?: string;
  property_type?: string;
  monthlyRent?: number | string;
  monthly_rent?: number | string;
  rentAmount?: number | string;
  rent_amount?: number | string;
  rent?: number | string;
};

const getPropertyType = (property: Property): string => {
  const item = property as PropertyExtraFields;

  return (
    item.propertyType ||
    item.property_type ||
    item.type ||
    'Not specified'
  );
};

const getMonthlyRent = (property: Property): number | null => {
  const item = property as PropertyExtraFields;
  const value =
    item.monthlyRent ??
    item.monthly_rent ??
    item.rentAmount ??
    item.rent_amount ??
    item.rent;

  if (value === undefined || value === null || (value as unknown) === '') {
    return null;
  }

  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
};

const formatCurrency = (amount: number): string =>
  `₹${amount.toLocaleString('en-IN')}`;

export const PropertyFilter: React.FC<PropertyFilterProps> = ({
  properties,
  onNavigate,
  onSelectProperty,
}) => {
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('All cities');
  const [locality, setLocality] = useState('All');
  const [availability, setAvailability] = useState('All');
  const [propertyType, setPropertyType] = useState('All types');
  const [occupancy, setOccupancy] = useState('Any occupancy');
  const [minRent, setMinRent] = useState('');
  const [maxRent, setMaxRent] = useState('');

  const cities = useMemo(
    () =>
      [...new Set(
        properties
          .map((property) => property.city?.trim())
          .filter((value): value is string => Boolean(value))
      )].sort((a, b) => a.localeCompare(b)),
    [properties]
  );

  const localities = useMemo(
    () =>
      [...new Set(
        properties
          .filter((property) => city === 'All cities' || property.city === city)
          .map((property) => property.locality?.trim())
          .filter((value): value is string => Boolean(value))
      )].sort((a, b) => a.localeCompare(b)),
    [properties, city]
  );

  const propertyTypes = useMemo(
    () =>
      [...new Set(properties.map(getPropertyType))]
        .filter((value) => value !== 'Not specified')
        .sort((a, b) => a.localeCompare(b)),
    [properties]
  );

  const totalRooms = properties.reduce(
    (total, property) => total + (Number(property.totalRooms) || 0),
    0
  );

  const totalOccupied = properties.reduce(
    (total, property) => total + (Number(property.occupiedRooms) || 0),
    0
  );

  const totalVacant = Math.max(0, totalRooms - totalOccupied);

  const activeFilterCount = [
    city !== 'All cities',
    locality !== 'All',
    availability !== 'All',
    propertyType !== 'All types',
    occupancy !== 'Any occupancy',
    minRent.trim() !== '',
    maxRent.trim() !== '',
  ].filter(Boolean).length;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const min = minRent.trim() === '' ? null : Number(minRent);
    const max = maxRent.trim() === '' ? null : Number(maxRent);

    return properties.filter((property) => {
      const rooms = Math.max(0, Number(property.totalRooms) || 0);
      const occupied = Math.max(0, Number(property.occupiedRooms) || 0);
      const vacant = Math.max(0, rooms - occupied);
      const occupancyPercent =
        rooms > 0 ? (occupied / rooms) * 100 : 0;

      const rent = getMonthlyRent(property);
      const type = getPropertyType(property);

      const searchableText = [
        property.name,
        property.address,
        property.locality,
        property.city,
        type,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (query && !searchableText.includes(query)) {
        return false;
      }

      if (city !== 'All cities' && property.city !== city) {
        return false;
      }

      if (locality !== 'All' && property.locality !== locality) {
        return false;
      }

      if (availability === 'Has vacant rooms' && vacant <= 0) {
        return false;
      }

      if (availability === 'Fully occupied' && (rooms === 0 || vacant > 0)) {
        return false;
      }

      if (propertyType !== 'All types' && type !== propertyType) {
        return false;
      }

      if (occupancy === 'Above 80%' && occupancyPercent <= 80) {
        return false;
      }

      if (occupancy === 'Above 90%' && occupancyPercent <= 90) {
        return false;
      }

      if (min !== null && Number.isFinite(min)) {
        if (rent === null || rent < min) return false;
      }

      if (max !== null && Number.isFinite(max)) {
        if (rent === null || rent > max) return false;
      }

      return true;
    });
  }, [
    properties,
    search,
    city,
    locality,
    availability,
    propertyType,
    occupancy,
    minRent,
    maxRent,
  ]);

  const resetFilters = () => {
    setSearch('');
    setCity('All cities');
    setLocality('All');
    setAvailability('All');
    setPropertyType('All types');
    setOccupancy('Any occupancy');
    setMinRent('');
    setMaxRent('');
  };

  const selectProperty = (property: Property, page: PageType) => {
    onSelectProperty?.(property);
    onNavigate(page);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Hero */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight">
            Your properties, in one place
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {properties.length} properties · {totalRooms} rooms · A clearer view of every address.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('property_list')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-[#035E7B] transition shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          <button
            onClick={() => onNavigate('add_property')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#035E7B] hover:bg-[#024B63] text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add property</span>
          </button>
        </div>
      </section>

      {/* Toolbar */}
      <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search properties or locations..."
            className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#035E7B] shadow-2xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-[#035E7B] rounded-xl text-xs font-semibold shadow-2xs">
            <MapPin className="w-3.5 h-3.5" />
            <span>{city === 'All cities' ? `${cities.length} cities` : city}</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#035E7B] text-white rounded-xl text-xs font-bold shadow-2xs">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters · {activeFilterCount}</span>
          </div>

          <button
            onClick={() => onNavigate('property_list')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold shadow-2xs"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-[#035E7B]" />
            <span className="hidden sm:inline">Grid view</span>
          </button>
        </div>
      </section>

      {/* Filter Card */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">Refine your properties</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose locations and availability to find the right address.
            </p>
          </div>

          <button
            onClick={resetFilters}
            className="text-xs font-semibold text-[#035E7B] hover:underline flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset all</span>
          </button>
        </div>

        {/* Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
              City
            </label>
            <div className="relative">
              <select
                value={city}
                onChange={(event) => {
                  setCity(event.target.value);
                  setLocality('All');
                }}
                className="w-full h-10 px-3 pr-8 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white appearance-none focus:outline-none focus:border-[#035E7B]"
              >
                <option value="All cities">All cities</option>
                {cities.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
              Locality
            </label>
            <div className="relative">
              <select
                value={locality}
                onChange={(event) => setLocality(event.target.value)}
                className="w-full h-10 px-3 pr-8 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white appearance-none focus:outline-none focus:border-[#035E7B]"
              >
                <option value="All">All localities</option>
                {localities.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
              Availability
            </label>
            <div className="relative">
              <select
                value={availability}
                onChange={(event) => setAvailability(event.target.value)}
                className="w-full h-10 px-3 pr-8 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white appearance-none focus:outline-none focus:border-[#035E7B]"
              >
                <option value="All">All occupancy states</option>
                <option value="Has vacant rooms">Has vacant rooms</option>
                <option value="Fully occupied">Fully occupied</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
              Property type
            </label>
            <div className="relative">
              <select
                value={propertyType}
                onChange={(event) => setPropertyType(event.target.value)}
                className="w-full h-10 px-3 pr-8 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white appearance-none focus:outline-none focus:border-[#035E7B]"
              >
                <option value="All types">All types</option>
                {propertyTypes.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
              Occupancy
            </label>
            <div className="relative">
              <select
                value={occupancy}
                onChange={(event) => setOccupancy(event.target.value)}
                className="w-full h-10 px-3 pr-8 border border-slate-200 rounded-xl text-xs text-slate-800 bg-white appearance-none focus:outline-none focus:border-[#035E7B]"
              >
                <option value="Any occupancy">Any occupancy</option>
                <option value="Above 80%">Above 80%</option>
                <option value="Above 90%">Above 90%</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
              Minimum monthly rent
            </label>
            <input
              type="number"
              min="0"
              value={minRent}
              onChange={(event) => setMinRent(event.target.value)}
              placeholder="Any amount"
              className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
              Maximum monthly rent
            </label>
            <input
              type="number"
              min="0"
              value={maxRent}
              onChange={(event) => setMaxRent(event.target.value)}
              placeholder="Any amount"
              className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#035E7B]"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            Results update automatically when you change filters.
          </p>
          <button
            onClick={() => {
              setSearch('');
            }}
            className="w-full sm:w-auto px-6 h-10 bg-[#035E7B] hover:bg-[#024B63] text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
          >
            Clear search
          </button>
        </div>
      </section>

      {/* Active Filters */}
      <section className="flex flex-wrap items-center gap-2 text-xs">
        <strong className="text-slate-800 font-bold mr-1">
          {filtered.length} {filtered.length === 1 ? 'property' : 'properties'} found
        </strong>

        {search.trim() !== '' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E8F8F4] text-[#035E7B] rounded-lg font-medium">
            Search: {search}
            <button onClick={() => setSearch('')} aria-label="Remove search filter" className="hover:text-rose-500 font-bold">×</button>
          </span>
        )}

        {city !== 'All cities' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E8F8F4] text-[#035E7B] rounded-lg font-medium">
            {city}
            <button onClick={() => setCity('All cities')} aria-label="Remove city filter" className="hover:text-rose-500 font-bold">×</button>
          </span>
        )}

        {locality !== 'All' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E8F8F4] text-[#035E7B] rounded-lg font-medium">
            {locality}
            <button onClick={() => setLocality('All')} aria-label="Remove locality filter" className="hover:text-rose-500 font-bold">×</button>
          </span>
        )}

        {availability !== 'All' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E8F8F4] text-[#035E7B] rounded-lg font-medium">
            {availability}
            <button onClick={() => setAvailability('All')} aria-label="Remove availability filter" className="hover:text-rose-500 font-bold">×</button>
          </span>
        )}

        {propertyType !== 'All types' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E8F8F4] text-[#035E7B] rounded-lg font-medium">
            {propertyType}
            <button onClick={() => setPropertyType('All types')} aria-label="Remove property type filter" className="hover:text-rose-500 font-bold">×</button>
          </span>
        )}

        {occupancy !== 'Any occupancy' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E8F8F4] text-[#035E7B] rounded-lg font-medium">
            {occupancy}
            <button onClick={() => setOccupancy('Any occupancy')} aria-label="Remove occupancy filter" className="hover:text-rose-500 font-bold">×</button>
          </span>
        )}

        {minRent.trim() !== '' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E8F8F4] text-[#035E7B] rounded-lg font-medium">
            Min: {formatCurrency(Number(minRent) || 0)}
            <button onClick={() => setMinRent('')} aria-label="Remove minimum rent filter" className="hover:text-rose-500 font-bold">×</button>
          </span>
        )}

        {maxRent.trim() !== '' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E8F8F4] text-[#035E7B] rounded-lg font-medium">
            Max: {formatCurrency(Number(maxRent) || 0)}
            <button onClick={() => setMaxRent('')} aria-label="Remove maximum rent filter" className="hover:text-rose-500 font-bold">×</button>
          </span>
        )}

        {activeFilterCount > 0 && (
          <button onClick={resetFilters} className="text-xs text-[#035E7B] font-semibold hover:underline ml-2">
            Clear filters
          </button>
        )}
      </section>

      {/* Property Cards */}
      {filtered.length > 0 ? (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((prop) => {
            const rooms = Math.max(0, Number(prop.totalRooms) || 0);
            const occupied = Math.max(0, Number(prop.occupiedRooms) || 0);
            const vacantRooms = Math.max(0, rooms - occupied);
            const occPct = rooms > 0
              ? Math.min(100, Number(((occupied / rooms) * 100).toFixed(1)))
              : 0;

            return (
              <article
                key={prop.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition"
              >
                <div
                  onClick={() => selectProperty(prop, 'property_detail')}
                  className={`h-36 sm:h-40 flex items-center justify-center cursor-pointer transition ${
                    prop.imageTheme === 'one'
                      ? 'bg-gradient-to-br from-[#D9E9E7] to-[#B8D3D7]'
                      : 'bg-gradient-to-br from-[#DDE8DD] to-[#BDD4C7]'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2 text-[#718F9B]">
                    <Building className="w-9 h-9 opacity-80" />
                    <span className="text-[11px] font-medium tracking-wide">
                      Property image
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2
                        onClick={() => selectProperty(prop, 'property_detail')}
                        className="text-base sm:text-lg font-bold text-slate-800 hover:text-[#035E7B] transition cursor-pointer"
                      >
                        {prop.name}
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        {[prop.address, prop.locality, prop.city].filter(Boolean).join(', ')}
                      </p>
                    </div>

                    <button
                      onClick={() => selectProperty(prop, 'edit_property')}
                      aria-label={`Edit ${prop.name}`}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 mt-4">
                    <span>{rooms} rooms · {occupied} occupied</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#FFF0DF] text-[#A8680C]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#A8680C]" />
                      {vacantRooms} vacant
                    </span>
                  </div>

                  <div className="w-full bg-[#E8F3F6] h-1.5 rounded-full overflow-hidden mt-3">
                    <div
                      className="bg-[#14B8A6] h-full rounded-full"
                      style={{ width: `${occPct}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-[1.2fr_0.8fr_auto] items-end gap-3 mt-4 pt-4 border-t border-slate-100">
                    <div>
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        RENT COLLECTED
                      </span>
                      <strong className="text-base sm:text-lg font-bold text-slate-800">
                        {formatCurrency(Number(prop.rentCollected) || 0)}
                      </strong>
                    </div>

                    <div>
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        PENDING
                      </span>
                      <strong className="text-xs sm:text-sm font-semibold text-[#A8680C]">
                        {formatCurrency(Number(prop.pendingRent) || 0)}
                      </strong>
                    </div>

                    <button
                      onClick={() => selectProperty(prop, 'property_detail')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F0F8FA] border border-slate-200 text-[#035E7B] rounded-xl text-xs font-bold transition shadow-2xs"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>View property</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="bg-white border border-dashed border-slate-300 rounded-2xl px-5 py-12 text-center">
          <Building className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-800">
            {properties.length === 0 ? 'No properties available yet' : 'No matching properties'}
          </h2>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            {properties.length === 0
              ? 'Properties will appear here after they are loaded from your backend.'
              : 'Try changing your search or filters to see more properties.'}
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-5">
            {properties.length > 0 && (
              <button
                onClick={resetFilters}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-[#035E7B] hover:bg-slate-50"
              >
                Reset filters
              </button>
            )}
            <button
              onClick={() => onNavigate('add_property')}
              className="px-4 py-2 bg-[#035E7B] text-white rounded-xl text-xs font-bold hover:bg-[#024B63]"
            >
              Add property
            </button>
          </div>
        </section>
      )}

      {/* Result Footer */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 shadow-2xs">
        <span>Showing {filtered.length} of {properties.length} properties</span>
        <strong className="text-[#035E7B] font-bold">
          {totalRooms} rooms · {totalOccupied} occupied · {totalVacant} vacant
        </strong>
      </div>

      <footer className="pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
        <span>KirayaSaathi · Smart rental management for every property owner</span>
        <span>All amounts in INR · IST</span>
      </footer>
    </div>
  );
};
