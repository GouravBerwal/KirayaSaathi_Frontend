
import React, { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import type { PageType, Property } from '../types';
import {
  Download,
  Plus,
  Search,
  MapPin,
  SlidersHorizontal,
  LayoutGrid,
  ArrowUpRight,
  MoreVertical,
  Building,
  RefreshCw,
  CheckCircle2,
  Clock,
  DoorOpen,
} from 'lucide-react';

interface PropertyListProps {
  properties: Property[];
  onNavigate: (page: PageType) => void;
  onSelectProperty?: (property: Property) => void;
  onRefreshData?: () => Promise<void> | void;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function getPropertyImageUrl(image?: string | null): string | null {
  if (!image?.trim()) {
    return null;
  }

  if (/^https?:\/\//i.test(image)) {
    return image;
  }

  return `${API_BASE_URL.replace(/\/$/, '')}/${image.replace(/^\/+/, '')}`;
}

export const PropertyList: React.FC<PropertyListProps> = ({
  properties,
  onNavigate,
  onSelectProperty,
  onRefreshData,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('All');
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (onRefreshData) {
      void onRefreshData();
    }
  }, []);

  const handleRefresh = async () => {
    if (!onRefreshData) return;
    setIsRefreshing(true);
    try {
      await onRefreshData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const cities = useMemo(() => {
    return Array.from(
      new Set(
        properties
          .map((property) => property.city?.trim())
          .filter((city): city is string => Boolean(city)),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [properties]);

  const filtered = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return properties.filter((property) => {
      const name = String(property.name ?? '').toLowerCase();
      const locality = String(property.locality ?? '').toLowerCase();
      const address = String(property.address ?? '').toLowerCase();
      const city = String(property.city ?? '').toLowerCase();

      const matchesSearch =
        name.includes(search) ||
        locality.includes(search) ||
        address.includes(search) ||
        city.includes(search);

      const matchesCity =
        cityFilter === 'All' || property.city?.trim() === cityFilter;

      return matchesSearch && matchesCity;
    });
  }, [properties, searchTerm, cityFilter]);

  const totalRooms = properties.reduce(
    (total, property) => total + Number(property.totalRooms || 0),
    0,
  );

  const occupiedRooms = properties.reduce(
    (total, property) => total + Number(property.occupiedRooms || 0),
    0,
  );

  const vacantRooms = Math.max(0, totalRooms - occupiedRooms);

  const portfolioOccupancy =
    totalRooms > 0
      ? Number(((occupiedRooms / totalRooms) * 100).toFixed(1))
      : 0;

  const totalRentCollected = properties.reduce(
    (total, property) => total + Number(property.rentCollected || 0),
    0,
  );

  const totalPendingRent = properties.reduce(
    (total, property) => total + Number(property.pendingRent || 0),
    0,
  );

  const totalCollectionBase = totalRentCollected + totalPendingRent;

  const collectionRate =
    totalCollectionBase > 0
      ? Number(((totalRentCollected / totalCollectionBase) * 100).toFixed(1))
      : 0;

  const handleExportPdf = () => {
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;

      const reportRooms = filtered.reduce(
        (total, property) => total + Number(property.totalRooms || 0),
        0,
      );

      const reportOccupied = filtered.reduce(
        (total, property) => total + Number(property.occupiedRooms || 0),
        0,
      );

      const reportVacant = Math.max(0, reportRooms - reportOccupied);

      const reportOccupancy =
        reportRooms > 0
          ? Number(((reportOccupied / reportRooms) * 100).toFixed(1))
          : 0;

      const formatMoney = (amount: number) =>
        `INR ${Number(amount || 0).toLocaleString('en-IN')}`;

      let y = 18;

      pdf.setFillColor(3, 94, 123);
      pdf.rect(0, 0, pageWidth, 39, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(21);
      pdf.text('KirayaSaathi', margin, y);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text('Properties Portfolio Report', margin, y + 8);

      pdf.setFontSize(8);
      pdf.text(
        `Generated: ${new Date().toLocaleString('en-IN')}`,
        margin,
        y + 15,
      );

      y = 49;

      pdf.setTextColor(30, 41, 59);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.text('Portfolio Summary', margin, y);

      y += 7;

      const summaryItems = [
        { label: 'Properties', value: String(filtered.length) },
        { label: 'Total Rooms', value: String(reportRooms) },
        { label: 'Occupied', value: String(reportOccupied) },
        { label: 'Vacant', value: String(reportVacant) },
        { label: 'Occupancy', value: `${reportOccupancy}%` },
      ];

      const gap = 3;
      const cardWidth = (contentWidth - gap * 4) / 5;

      summaryItems.forEach((item, index) => {
        const x = margin + index * (cardWidth + gap);

        pdf.setFillColor(240, 248, 250);
        pdf.roundedRect(x, y, cardWidth, 20, 2, 2, 'F');

        pdf.setTextColor(3, 94, 123);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text(item.value, x + 3, y + 8);

        pdf.setTextColor(100, 116, 139);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.text(item.label, x + 3, y + 15, {
          maxWidth: cardWidth - 5,
        });
      });

      y += 30;

      pdf.setTextColor(30, 41, 59);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.text('Property Details', margin, y);

      y += 8;

      if (filtered.length === 0) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(100, 116, 139);
        pdf.text(
          'No properties found for the selected search or filter.',
          margin,
          y + 5,
        );
      }

      filtered.forEach((property, index) => {
        const propertyRooms = Number(property.totalRooms || 0);
        const propertyOccupied = Number(property.occupiedRooms || 0);
        const vacantRooms = Math.max(0, propertyRooms - propertyOccupied);

        const occupancy =
          propertyRooms > 0
            ? Number(((propertyOccupied / propertyRooms) * 100).toFixed(1))
            : 0;

        const address = [
          property.address,
          property.locality,
          property.city,
        ]
          .filter(Boolean)
          .join(', ');

        const addressLines = pdf.splitTextToSize(
          address || 'Address not provided',
          contentWidth - 12,
        );

        const cardHeight = 48 + Math.max(0, addressLines.length - 1) * 4;

        if (y + cardHeight > pageHeight - 20) {
          pdf.addPage();
          y = 18;
        }

        pdf.setDrawColor(226, 232, 240);
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(
          margin,
          y,
          contentWidth,
          cardHeight,
          2,
          2,
          'FD',
        );

        pdf.setTextColor(3, 94, 123);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text(`${index + 1}. ${property.name}`, margin + 5, y + 8);

        pdf.setTextColor(100, 116, 139);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text(addressLines, margin + 5, y + 14);

        const detailsY = y + 20 + (addressLines.length - 1) * 4;

        pdf.setTextColor(51, 65, 85);
        pdf.setFontSize(8);
        pdf.text(
          `Rooms: ${propertyRooms}  |  Occupied: ${propertyOccupied}  |  Vacant: ${vacantRooms}`,
          margin + 5,
          detailsY,
        );

        pdf.text(
          `Occupancy: ${occupancy}%`,
          margin + 5,
          detailsY + 6,
        );

        pdf.setFont('helvetica', 'bold');
        pdf.text(
          `Rent Collected: ${formatMoney(property.rentCollected)}`,
          margin + 5,
          detailsY + 12,
        );

        pdf.setTextColor(168, 104, 12);
        pdf.text(
          `Pending Rent: ${formatMoney(property.pendingRent)}`,
          margin + 5,
          detailsY + 18,
        );

        y += cardHeight + 5;
      });

      const pageCount = pdf.getNumberOfPages();

      for (let page = 1; page <= pageCount; page++) {
        pdf.setPage(page);

        pdf.setDrawColor(226, 232, 240);
        pdf.line(
          margin,
          pageHeight - 12,
          pageWidth - margin,
          pageHeight - 12,
        );

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);

        pdf.text(
          'KirayaSaathi | Smart Rental Management',
          margin,
          pageHeight - 7,
        );

        pdf.text(
          `Page ${page} of ${pageCount}`,
          pageWidth - margin,
          pageHeight - 7,
          { align: 'right' },
        );
      }

      pdf.save('KirayaSaathi_Properties_Report.pdf');
    } catch (error) {
      console.error('PDF export failed:', error);
      window.alert('PDF download nahi ho paya. Please try again.');
    }
  };

  const getBannerClass = (imageTheme: Property['imageTheme']) => {
    switch (imageTheme) {
      case 'one':
        return 'bg-gradient-to-br from-[#D9E9E7] to-[#B8D3D7]';
      case 'two':
        return 'bg-gradient-to-br from-[#DDE8DD] to-[#BDD4C7]';
      case 'three':
        return 'bg-gradient-to-br from-[#D9E6EC] to-[#BED3DC]';
      default:
        return 'bg-gradient-to-br from-[#E9E4D6] to-[#D3D9C2]';
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 sm:text-3xl">
            Your properties, in one place
          </h1>

          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            {properties.length} properties · {totalRooms} rooms · Real-time portfolio metrics connected with backend.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-[#E8F8F4] text-[#0C8067] border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0C8067] animate-pulse" />
            Live Sync
          </span>

          {onRefreshData && (
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#035E7B] shadow-2xs transition hover:bg-slate-50"
              title="Sync properties and rooms with backend database"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync properties'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportPdf}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-[#035E7B] shadow-2xs transition hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('add_property')}
            className="inline-flex items-center gap-2 rounded-xl bg-[#035E7B] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#024B63] active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Add property</span>
          </button>
        </div>
      </section>

      {/* 4 Summary Stat Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total properties</span>
            <Building className="w-4 h-4 text-[#0D8AB0]" />
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mt-3">
            {properties.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            {cities.length} {cities.length === 1 ? 'city' : 'cities'} · Active portfolio
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Rooms &amp; Occupancy</span>
            <DoorOpen className="w-4 h-4 text-[#0D8AB0]" />
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mt-3">
            {occupiedRooms} / {totalRooms}
          </div>
          <span className="text-[11px] text-[#0C8067] font-semibold mt-2 block">
            {portfolioOccupancy}% occupied · {vacantRooms} vacant
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Rent collected</span>
            <CheckCircle2 className="w-4 h-4 text-[#0C8067]" />
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mt-3">
            ₹{totalRentCollected.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-[#0C8067] font-semibold mt-2 block">
            {collectionRate}% collection rate
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Pending rent</span>
            <Clock className="w-4 h-4 text-[#A8680C]" />
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mt-3">
            ₹{totalPendingRent.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-[#A8680C] font-semibold mt-2 block">
            Outstanding rent balance
          </span>
        </div>
      </section>

      <section className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search properties or locations..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs text-slate-800 shadow-2xs transition placeholder:text-slate-400 focus:border-[#035E7B] focus:outline-none focus:ring-2 focus:ring-[#035E7B]/10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCityFilter('All')}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              cityFilter === 'All'
                ? 'border-[#035E7B] bg-[#E8F4F7] text-[#035E7B]'
                : 'border-slate-200 bg-white text-[#035E7B] hover:bg-slate-50'
            }`}
          >
            All Cities
          </button>

          {cities.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => setCityFilter(city)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                cityFilter === city
                  ? 'border-[#035E7B] bg-[#E8F4F7] text-[#035E7B]'
                  : 'border-slate-200 bg-white text-[#035E7B] hover:bg-slate-50'
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              {city}
            </button>
          ))}

          <button
            type="button"
            onClick={() => onNavigate('property_filter')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#035E7B] shadow-2xs transition hover:bg-slate-50"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filters</span>
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-2xs transition"
            title="Grid view active"
          >
            <LayoutGrid className="h-3.5 w-3.5 text-[#035E7B]" />
            <span className="hidden sm:inline">Grid view</span>
          </button>
        </div>
      </section>

      {filtered.length > 0 ? (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {filtered.map((prop) => {
            const propertyRooms = Number(prop.totalRooms || 0);
            const propertyOccupied = Number(prop.occupiedRooms || 0);
            const vacantRooms = Math.max(0, propertyRooms - propertyOccupied);

            const occupancy =
              propertyRooms > 0
                ? Number(
                    ((propertyOccupied / propertyRooms) * 100).toFixed(1),
                  )
                : 0;

            const imageUrl = getPropertyImageUrl(prop.image);
            const showImage =
              Boolean(imageUrl) && !failedImages.includes(prop.id);

            const openProperty = () => {
              onSelectProperty?.(prop);
              onNavigate('property_detail');
            };

            return (
              <article
                key={prop.id}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs transition hover:shadow-md"
              >
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${prop.name} details`}
                  onClick={openProperty}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openProperty();
                    }
                  }}
                  className={`relative flex h-36 cursor-pointer items-center justify-center overflow-hidden transition sm:h-40 ${getBannerClass(
                    prop.imageTheme,
                  )}`}
                >
                  {showImage ? (
                    <img
                      src={imageUrl!}
                      alt={`${prop.name} property`}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      onError={() => {
                        setFailedImages((previous) =>
                          previous.includes(prop.id)
                            ? previous
                            : [...previous, prop.id],
                        );
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-[#718F9B]">
                      <Building className="h-9 w-9 opacity-80" />
                      <span className="text-[11px] font-medium tracking-wide">
                        Property image
                      </span>
                    </div>
                  )}

                  {showImage && (
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition group-hover:opacity-100" />
                  )}
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2
                        onClick={openProperty}
                        className="cursor-pointer text-base font-bold text-slate-800 transition hover:text-[#035E7B] sm:text-lg"
                      >
                        {prop.name}
                      </h2>

                      <p className="mt-1 text-xs text-slate-400">
                        {[prop.address, prop.locality, prop.city]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectProperty?.(prop);
                        onNavigate('edit_property');
                      }}
                      className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      title="Edit property"
                      aria-label={`Edit ${prop.name}`}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {propertyRooms} rooms · {propertyOccupied} occupied
                    </span>

                    {vacantRooms > 0 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-[#FFF0DF] px-2.5 py-1 text-[11px] font-semibold text-[#A8680C]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#A8680C]" />
                        {vacantRooms} vacant
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-[#E8F8F4] px-2.5 py-1 text-[11px] font-semibold text-[#0C8067]">
                        100% full
                      </span>
                    )}
                  </div>

                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#E8F3F6]">
                    <div
                      className="h-full rounded-full bg-[#14B8A6] transition-all duration-300"
                      style={{ width: `${occupancy}%` }}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-[1.2fr_0.8fr_auto] items-end gap-3 border-t border-slate-100 pt-4">
                    <div>
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        RENT COLLECTED · OCT
                      </span>
                      <strong className="text-base font-bold text-slate-800 sm:text-lg">
                        ₹
                        {Number(prop.rentCollected || 0).toLocaleString(
                          'en-IN',
                        )}
                      </strong>
                    </div>

                    <div>
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        PENDING
                      </span>
                      <strong className="text-xs font-semibold text-[#A8680C] sm:text-sm">
                        ₹
                        {Number(prop.pendingRent || 0).toLocaleString(
                          'en-IN',
                        )}
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={openProperty}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-[#035E7B] shadow-2xs transition hover:bg-[#F0F8FA]"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      <span>View</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <Building className="mx-auto h-10 w-10 text-slate-300" />

          <h2 className="mt-3 text-base font-semibold text-slate-700">
            No properties found
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Try another search term or select All Cities.
          </p>

          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setCityFilter('All');
            }}
            className="mt-4 rounded-xl bg-[#035E7B] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#024B63]"
          >
            Clear filters
          </button>
        </section>
      )}

      <div className="flex flex-col items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500 shadow-2xs sm:flex-row">
        <span>Showing {filtered.length} properties</span>

        <strong className="font-bold text-[#035E7B]">
          Portfolio occupancy: {portfolioOccupancy}% ({occupiedRooms} of{' '}
          {totalRooms} rooms)
        </strong>
      </div>

      <footer className="flex flex-col items-center justify-between gap-2 border-t border-slate-200/80 pt-6 text-[11px] text-slate-400 sm:flex-row">
        <span>
          KirayaSaathi · Smart rental management for every property owner
        </span>
        <span>All amounts in INR · IST</span>
      </footer>
    </div>
  );
};
