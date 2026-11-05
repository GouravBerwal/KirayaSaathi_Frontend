import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield,
  ShieldCheck,
  Lock,
  Eye,
  CheckCircle2,
  Printer,
  ArrowLeft,
  Smartphone,
  HardDrive,
  Camera,
  Bell,
  Trash2,
  Mail,
  Building2,
  FileText,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Globe,
  Database,
  Users,
} from "lucide-react";

interface PrivacyPolicyPageProps {
  onBackToLanding?: () => void;
  onOpenDashboard?: () => void;
  isAuthenticated?: boolean;
}

export default function PrivacyPolicyPage({
  onBackToLanding,
  onOpenDashboard,
  isAuthenticated = false,
}: PrivacyPolicyPageProps) {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>("overview");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.title = "Privacy Policy | KirayaSaathi — Official Legal & Data Protection Disclosures";

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Official Privacy Policy of KirayaSaathi. Compliant with Digital Personal Data Protection Act (DPDPA 2023), IT Rules 2021, Samsung Galaxy Store, and JioStore developer guidelines."
      );
    }
  }, []);

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -90;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const sections = [
    { id: "overview", label: "1. Overview & Controller" },
    { id: "collection", label: "2. Information We Collect" },
    { id: "permissions", label: "3. Mobile App Permissions" },
    { id: "usage", label: "4. Purpose & Legal Basis" },
    { id: "sharing", label: "5. Zero Data Sale & Sharing" },
    { id: "security", label: "6. Security & Storage" },
    { id: "deletion", label: "7. Account & Data Deletion" },
    { id: "rights", label: "8. User Rights (DPDPA)" },
    { id: "children", label: "9. Minors & Children" },
    { id: "store-notices", label: "10. Galaxy Store & JioStore" },
    { id: "grievance", label: "11. Grievance Officer" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans print:bg-white print:text-black">
      {/* =========================================================================
          TOP NAVIGATION BAR (FROSTED GLASS)
      ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToLanding || (() => navigate("/"))}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#035E7B] px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition mr-1"
              aria-label="Back to Homepage"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </button>

            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-xs">
                <img
                  src="/images/logo.png"
                  alt="KirayaSaathi Logo"
                  width="40"
                  height="40"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="text-lg sm:text-xl font-extrabold text-[#035E7B] block leading-none tracking-tight">
                  KirayaSaathi
                </span>
                <span className="text-[10px] sm:text-xs text-slate-500 font-semibold tracking-wide">
                  Legal &amp; Trust Center
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 bg-white text-xs sm:text-sm font-semibold shadow-xs transition"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={onOpenDashboard || (() => navigate("/dashboard"))}
                className="px-3 sm:px-4 py-2 rounded-xl bg-[#035E7B] hover:bg-[#024B63] text-white text-xs sm:text-sm font-bold shadow-sm transition inline-flex items-center gap-1.5"
              >
                <span>Dashboard</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="px-3 sm:px-4 py-2 rounded-xl text-[#035E7B] border border-[#035E7B]/30 hover:bg-[#EAF4F7] text-xs sm:text-sm font-bold transition"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================================
          HERO BANNER
      ========================================================================= */}
      <section className="bg-gradient-to-b from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white py-14 sm:py-18 relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38BDF8_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>DPDPA 2023 &amp; IT Rules Compliant • App Store Certified</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            KirayaSaathi Privacy Policy
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-3xl mx-auto leading-relaxed mb-6">
            Transparent, enterprise-grade privacy commitments safeguarding landlords, property managers,
            and tenants. Formulated in accordance with the <strong>Digital Personal Data Protection Act, 2023 (India)</strong>,
            and official developer guidelines for <strong>Samsung Galaxy Store</strong>, <strong>JioStore</strong>,
            and modern application ecosystems.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              Effective Date: <strong>November 01, 2026</strong>
            </span>
            <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
              Policy Version: <strong>2.4 Enterprise Production</strong>
            </span>
            <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              Security: <strong>256-Bit TLS 1.3 Encryption</strong>
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          MAIN CONTENT AREA WITH STICKY TABLE OF CONTENTS
      ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sticky Sidebar Navigation (Desktop) */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-28 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
            <div className="flex items-center gap-2 pb-4 mb-3 border-b border-slate-100">
              <FileText className="w-4 h-4 text-[#035E7B]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Table of Contents
              </h2>
            </div>
            <nav className="space-y-1">
              {sections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => scrollTo(sec.id)}
                  type="button"
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition flex items-center justify-between group ${
                    activeSection === sec.id
                      ? "bg-[#035E7B] text-white font-semibold shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span className="truncate">{sec.label}</span>
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform ${
                      activeSection === sec.id ? "text-white" : "text-slate-400 group-hover:translate-x-0.5"
                    }`}
                  />
                </button>
              ))}
            </nav>

            {/* Quick Assistance Box */}
            <div className="mt-6 pt-5 border-t border-slate-100 bg-slate-50 -mx-5 -mb-5 p-5 rounded-b-2xl">
              <div className="flex items-center gap-2 mb-2 text-slate-800 font-bold text-xs">
                <Mail className="w-4 h-4 text-[#035E7B]" />
                <span>Privacy &amp; Data Officer</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                Have questions about your rental records or wish to request data erasure?
              </p>
              <a
                href="mailto:support@kirayasaathi.app?subject=Privacy%20Inquiry%20or%20Data%20Request"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#035E7B] hover:text-[#024B63]"
              >
                <span>support@kirayasaathi.app</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </aside>

          {/* Policy Text Content */}
          <article className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-10 shadow-xs space-y-12">
            {/* Quick Compliance Badges Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
              <div>
                <div className="text-xs font-bold text-[#035E7B]">Zero Data Sale</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Never sold to ad brokers</div>
              </div>
              <div>
                <div className="text-xs font-bold text-[#035E7B]">DPDPA 2023</div>
                <div className="text-[11px] text-slate-500 mt-0.5">India Law Aligned</div>
              </div>
              <div>
                <div className="text-xs font-bold text-[#035E7B]">Galaxy Store</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Samsung Compliant</div>
              </div>
              <div>
                <div className="text-xs font-bold text-[#035E7B]">JioStore Approved</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Eco-friendly &amp; Secure</div>
              </div>
            </div>

            {/* 1. Overview & Data Controller */}
            <section id="overview" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200">
                <Building2 className="w-5 h-5 text-[#035E7B]" />
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  1. Overview &amp; Data Controller
                </h2>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                This Privacy Policy (&ldquo;Policy&rdquo;) outlines the foundational standards by which{" "}
                <strong>KirayaSaathi</strong> (&ldquo;KirayaSaathi&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;),
                operated by <strong>KirayaSaathi Technologies</strong> (headed by Founder Gourav Berwal), collects, uses,
                stores, processes, and protects your personal data and digital records when you access or interact with:
              </p>
              <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1.5">
                <li>
                  Our official website and web platform: <strong>https://kirayasaathi.app</strong> and associated APIs
                  at <strong>https://api.kirayasaathi.app</strong>.
                </li>
                <li>
                  The KirayaSaathi mobile application distributed via <strong>Samsung Galaxy Store</strong>,{" "}
                  <strong>Reliance JioStore</strong>, Android APK channels, and future application marketplaces.
                </li>
                <li>
                  All integrated property management services, electricity submeter formula modules, rent receipt engines,
                  and automated tenant communication tools.
                </li>
              </ul>
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs sm:text-sm text-blue-900 leading-relaxed">
                <strong>Data Controller Notice:</strong> Under the <em>Digital Personal Data Protection Act, 2023 (India)</em>,
                KirayaSaathi operates as a <strong>Data Fiduciary</strong> for registered property owners and account
                holders, and processes tenant records strictly on the lawful instruction of the respective property owner
                (acting as Data Processor / Service Provider).
              </div>
            </section>

            {/* 2. Information We Collect */}
            <section id="collection" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200">
                <Database className="w-5 h-5 text-[#035E7B]" />
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  2. Categories of Information We Collect
                </h2>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                We only collect data strictly necessary to fulfill our core utility: simplifying rental housing management,
                accurate electricity split billing, and legal lease record-keeping.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 border-b border-slate-200">Category</th>
                      <th className="py-3 px-4 border-b border-slate-200">Data Points</th>
                      <th className="py-3 px-4 border-b border-slate-200">Legal Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-600">
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-900">Account &amp; Identity</td>
                      <td className="py-3 px-4">Full name, email address, mobile number, encrypted password hash (PBKDF2/SHA-256).</td>
                      <td className="py-3 px-4">Account authentication, password reset, and secure session management.</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-900">Property &amp; Rooms</td>
                      <td className="py-3 px-4">Property name, physical address, floor details, room numbers, bed capacity, monthly tariff.</td>
                      <td className="py-3 px-4">Property inventory tracking and room occupancy reporting.</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-900">Tenant Directory</td>
                      <td className="py-3 px-4">Tenant name, phone number, emergency contact, move-in/out dates, optional ID proof document.</td>
                      <td className="py-3 px-4">Rent agreement formulation, police verification assistance, and invoicing.</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-900">Utility &amp; Submeter</td>
                      <td className="py-3 px-4">Submeter initial/final unit readings, rate per kWh, calculation formulas, dial photos.</td>
                      <td className="py-3 px-4">Accurate, dispute-free utility split bill calculation and historical audit trail.</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-900">Billing &amp; Financials</td>
                      <td className="py-3 px-4">Rent amount, payment mode (Cash/UPI), payment reference ID, static UPI QR code image.</td>
                      <td className="py-3 px-4">PDF receipt generation, balance reconciliation, and payment proof archive.</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-900">Device &amp; Diagnostics</td>
                      <td className="py-3 px-4">IP address, operating system, app version, device model (Samsung/Jio/etc.), crash telemetry.</td>
                      <td className="py-3 px-4">App performance optimization, security monitoring, and bug remediation.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs sm:text-sm text-amber-900 leading-relaxed flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Critical Financial Disclaimer:</strong> KirayaSaathi does <u>NOT</u> process, store, or transmit
                  raw credit card numbers, debit card CVV codes, net banking passwords, or UPI MPINs. Static or dynamic UPI QR
                  codes displayed in the platform simply direct peer-to-peer transfers straight from tenant to owner bank
                  accounts via external NPCI UPI apps (BHIM, PhonePe, GPay, Paytm).
                </div>
              </div>
            </section>

            {/* 3. Mobile App Permissions */}
            <section id="permissions" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200">
                <Smartphone className="w-5 h-5 text-[#035E7B]" />
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  3. Mobile Application Permissions Disclosures
                </h2>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                When installed through the <strong>Samsung Galaxy Store</strong> or <strong>Reliance JioStore</strong>,
                the KirayaSaathi mobile application requests only runtime permissions strictly required to execute user-initiated
                actions. We adhere to the principle of least privilege.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                    <Camera className="w-4 h-4 text-[#035E7B]" />
                    <span>android.permission.CAMERA</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong>Purpose:</strong> Optional permission requested only when an owner chooses to take a photo of an
                    electricity submeter reading, a property room, or a paper rent receipt.
                  </p>
                  <div className="text-[11px] text-emerald-700 font-semibold">
                    ✓ Never accessed in background or without explicit user tap.
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                    <HardDrive className="w-4 h-4 text-[#035E7B]" />
                    <span>READ_MEDIA_IMAGES / STORAGE</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong>Purpose:</strong> Used to let you select existing photos or PDF documents from your gallery to upload
                    property logos, owner verification ID proofs, or payment screenshots.
                  </p>
                  <div className="text-[11px] text-emerald-700 font-semibold">
                    ✓ Scoped strictly to files you manually choose.
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                    <Bell className="w-4 h-4 text-[#035E7B]" />
                    <span>POST_NOTIFICATIONS</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong>Purpose:</strong> Delivering transactional reminders for upcoming rent due dates, pending submeter
                    entries, and owner verification updates.
                  </p>
                  <div className="text-[11px] text-emerald-700 font-semibold">
                    ✓ You can toggle push notifications off anytime in device settings.
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                    <Globe className="w-4 h-4 text-[#035E7B]" />
                    <span>INTERNET &amp; NETWORK_STATE</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong>Purpose:</strong> Synchronizing rental calculations, backups, and invoices with our secure cloud servers
                    over encrypted HTTPS/TLS connections.
                  </p>
                  <div className="text-[11px] text-emerald-700 font-semibold">
                    ✓ Optimized for low-bandwidth Jio 4G/5G and Wi-Fi networks.
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                <strong>No Invasive Permissions:</strong> KirayaSaathi does <u>NOT</u> access background GPS location, device
                contacts, SMS logs, phone call records, microphone audio, or biometrics.
              </div>
            </section>

            {/* 4. Purpose & Legal Basis */}
            <section id="usage" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200">
                <CheckCircle2 className="w-5 h-5 text-[#035E7B]" />
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  4. Purpose of Data Processing &amp; Lawful Basis
                </h2>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Under Section 4 and Section 6 of the <em>Digital Personal Data Protection Act, 2023 (DPDPA 2023)</em>, KirayaSaathi
                processes personal data exclusively based on explicit consent and legitimate uses:
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#035E7B] mt-2 shrink-0" />
                  <span>
                    <strong>Provision of Platform Services:</strong> Managing property portfolios, creating tenant rent ledger
                    entries, computing proportional electricity bills, and producing downloadable PDF invoices.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#035E7B] mt-2 shrink-0" />
                  <span>
                    <strong>Owner Verification &amp; Security:</strong> Authenticating ownership credentials to deter rental fraud,
                    fake landlord listings, and identity duplication.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#035E7B] mt-2 shrink-0" />
                  <span>
                    <strong>Transactional Communications:</strong> Sending OTPs for account login, password reset links, and
                    important billing notifications via email or SMS.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#035E7B] mt-2 shrink-0" />
                  <span>
                    <strong>Statutory Compliance:</strong> Maintaining audit records required under the <em>Information Technology Act, 2000</em>
                    and cooperating with lawful governmental inquiries.
                  </span>
                </li>
              </ul>
            </section>

            {/* 5. Zero Data Sale & Sharing */}
            <section id="sharing" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200">
                <Shield className="w-5 h-5 text-[#035E7B]" />
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  5. Zero Data Sale Guarantee &amp; Third-Party Sub-processors
                </h2>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm sm:text-base">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Our Binding Commitment: We Never Sell Your Data</span>
                </div>
                <p className="text-xs sm:text-sm text-emerald-900 leading-relaxed">
                  KirayaSaathi has never sold, leased, monetized, rented, or traded any personal information, rental history, or
                  tenant records to data brokers, ad networks, or marketing telemarketers. We will never do so in the future.
                </p>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                To operate our cloud infrastructure, we work strictly with vetted, enterprise-grade infrastructure sub-processors:
              </p>

              <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between gap-4">
                  <div>
                    <strong className="text-slate-900 block">Cloud Hosting &amp; Relational Storage</strong>
                    <span className="text-xs text-slate-500">
                      Managed Linux Virtual Private Cloud (AWS / DigitalOcean / TiDB Cloud). Enterprise encrypted data centers
                      with ISO 27001 / SOC 2 certification.
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-slate-200 text-slate-700 text-[11px] font-semibold shrink-0">
                    Infrastructure
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between gap-4">
                  <div>
                    <strong className="text-slate-900 block">Transactional Email Delivery</strong>
                    <span className="text-xs text-slate-500">
                      Google Workspace / SMTP Infrastructure for secure one-time password (OTP) verification and system emails.
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-slate-200 text-slate-700 text-[11px] font-semibold shrink-0">
                    Communications
                  </span>
                </div>
              </div>
            </section>

            {/* 6. Security & Storage */}
            <section id="security" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200">
                <Lock className="w-5 h-5 text-[#035E7B]" />
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  6. Enterprise Data Security &amp; Encryption Standards
                </h2>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                We implement comprehensive technical and organizational safeguards adhering to <strong>ISO/IEC 27001</strong>{" "}
                principles and Apple/Google cloud security specifications:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-600">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                  <strong className="text-slate-900 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-emerald-600" />
                    <span>256-Bit TLS 1.3 in Transit</span>
                  </strong>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    All communications between browser/app clients and our servers are encrypted using modern Transport Layer
                    Security with Perfect Forward Secrecy.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                  <strong className="text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Salted PBKDF2 Password Hashing</span>
                  </strong>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    User passwords are cryptographically hashed using PBKDF2 with SHA-256 and unique per-user salts. Plaintext
                    passwords are never stored or logged anywhere.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                  <strong className="text-slate-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>Strict Tenant-Owner Isolation (RBAC)</span>
                  </strong>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Strict role-based access control partitions every landlord&rsquo;s properties. No property owner can query or
                    inspect records belonging to another owner.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                  <strong className="text-slate-900 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-600" />
                    <span>Automated Backups &amp; Resilience</span>
                  </strong>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Daily encrypted database snapshots with rapid disaster recovery protocols to protect against unintentional data
                    loss or system faults.
                  </p>
                </div>
              </div>
            </section>

            {/* 7. Account & Data Deletion */}
            <section id="deletion" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200">
                <Trash2 className="w-5 h-5 text-red-600" />
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  7. Account &amp; Data Deletion Policy (App Store Compliance)
                </h2>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                In strict compliance with <strong>Samsung Galaxy Store Developer Requirements</strong>,{" "}
                <strong>Reliance JioStore Developer Policies</strong>, and <strong>Apple App Store Review Guidelines 5.1</strong>,
                KirayaSaathi guarantees users the direct, unhindered right to permanently delete their account and associated personal
                data.
              </p>

              <div className="p-5 rounded-xl border border-red-200 bg-red-50/50 space-y-4 text-xs sm:text-sm text-slate-700">
                <h3 className="font-bold text-red-900 text-sm">How to Request Account &amp; Data Erasure:</h3>
                <ol className="list-decimal pl-5 space-y-2 text-xs sm:text-sm">
                  <li>
                    <strong>In-App Self-Service:</strong> Navigate to <em>Settings &rarr; Account Management &rarr; Delete Account</em>{" "}
                    to immediately initiate complete account decommissioning.
                  </li>
                  <li>
                    <strong>Direct Email Request:</strong> Send an email from your registered email address to{" "}
                    <a
                      href="mailto:support@kirayasaathi.app?subject=Account%20Deletion%20Request"
                      className="font-bold text-red-700 underline"
                    >
                      support@kirayasaathi.app
                    </a>{" "}
                    with the subject line &ldquo;Account Deletion Request&rdquo;.
                  </li>
                </ol>

                <div className="pt-2 border-t border-red-200/80 text-xs text-red-800 leading-relaxed">
                  <strong>Deletion Timeline &amp; Data Purging:</strong> Once confirmed, your user profile, registered properties,
                  tenant records, electricity readings, and uploaded documents are permanently purged from active production databases
                  within <strong>30 calendar days</strong>. Rolling backup copies expire automatically within 90 days.
                </div>
              </div>
            </section>

            {/* 8. User Rights (DPDPA) */}
            <section id="rights" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200">
                <FileText className="w-5 h-5 text-[#035E7B]" />
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  8. Your Statutory Rights Under DPDPA 2023
                </h2>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Under the Indian <em>Digital Personal Data Protection Act, 2023</em>, you have the following enforceable rights:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <strong className="text-slate-900 block mb-1">Right to Access Summary</strong>
                  <span className="text-xs text-slate-500">
                    Request a full summary of personal data being processed and the identity of any third-party processors.
                  </span>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <strong className="text-slate-900 block mb-1">Right to Correction &amp; Erasure</strong>
                  <span className="text-xs text-slate-500">
                    Correct inaccurate information, update obsolete contact numbers, or request complete data deletion.
                  </span>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <strong className="text-slate-900 block mb-1">Right of Grievance Redressal</strong>
                  <span className="text-xs text-slate-500">
                    Direct access to our appointed Grievance Officer for prompt investigation and formal resolution.
                  </span>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <strong className="text-slate-900 block mb-1">Right to Nominate</strong>
                  <span className="text-xs text-slate-500">
                    Nominate any individual who, in the event of death or incapacity, shall exercise your privacy rights.
                  </span>
                </div>
              </div>
            </section>

            {/* 9. Children's Privacy */}
            <section id="children" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200">
                <Users className="w-5 h-5 text-[#035E7B]" />
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  9. Protection of Minors &amp; Children
                </h2>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                KirayaSaathi is strictly intended for individuals aged <strong>18 years or older</strong> who possess the legal
                capacity to enter into binding rental agreements under the <em>Indian Contract Act, 1872</em>. We do not knowingly
                collect, solicit, or market services to children under 18. If we discover that personal data of a minor has been
                inadvertently collected, it will be deleted immediately upon notification.
              </p>
            </section>

            {/* 10. Galaxy Store & JioStore Disclosures */}
            <section id="store-notices" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200">
                <Smartphone className="w-5 h-5 text-[#035E7B]" />
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  10. App Store Specific Certifications &amp; Notices
                </h2>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/50 space-y-2">
                  <h3 className="font-bold text-sky-900 text-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
                    Samsung Galaxy Store Notice:
                  </h3>
                  <p className="text-xs sm:text-sm text-sky-900 leading-relaxed">
                    KirayaSaathi complies fully with Samsung Electronics developer certification policies. The application does not
                    modify Samsung Knox containers, does not access device identifiers beyond standard Android APIs, and respects
                    Samsung One UI dark mode and system privacy toggles.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
                  <h3 className="font-bold text-blue-900 text-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                    Reliance JioStore Notice:
                  </h3>
                  <p className="text-xs sm:text-sm text-blue-900 leading-relaxed">
                    For distribution across JioPhone, JioSetTopBox, and Android devices in the Jio ecosystem, KirayaSaathi ensures
                    optimized network utilization, low memory footprints, and strict adherence to Jio Developer Terms. No telemetry
                    is transmitted outside encrypted protocols.
                  </p>
                </div>
              </div>
            </section>

            {/* 11. Grievance Redressal Officer */}
            <section id="grievance" className="scroll-mt-28 space-y-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200">
                <Mail className="w-5 h-5 text-[#035E7B]" />
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  11. Statutory Grievance Redressal Officer
                </h2>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                In compliance with Rule 3(2) of the <em>Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</em>{" "}
                and the <em>Digital Personal Data Protection Act, 2023</em>, KirayaSaathi has designated a Grievance Officer:
              </p>

              <div className="p-5 rounded-2xl border border-slate-300 bg-slate-900 text-white space-y-3 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-white">Gourav Berwal</h3>
                    <p className="text-xs text-amber-400 font-medium">
                      Designated Grievance &amp; Data Protection Officer (DPO)
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold w-fit">
                    Active Office
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                  <div>
                    <span className="text-slate-400 block">Entity:</span>
                    <strong className="text-white">KirayaSaathi Technologies</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Operational Jurisdiction:</span>
                    <strong className="text-white">Haryana, India</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Official Support Email:</span>
                    <a
                      href="mailto:support@kirayasaathi.app"
                      className="text-sky-400 font-semibold hover:underline"
                    >
                      support@kirayasaathi.app
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Statutory Response SLA:</span>
                    <strong className="text-white">Acknowledgment &le; 48 hrs • Resolution &le; 30 days</strong>
                  </div>
                </div>
              </div>
            </section>
          </article>
        </div>
      </div>

      {/* =========================================================================
          FOOTER (SHARED CLEAN DESIGN)
      ========================================================================= */}
      <footer className="bg-[#0F172A] text-white py-10 border-t border-slate-800 mt-auto print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <img
              src="/images/logo.png"
              alt="KirayaSaathi Logo"
              width="24"
              height="24"
              className="w-6 h-6 object-contain"
            />
            <span className="font-bold text-white text-sm">KirayaSaathi</span>
            <span>— © 2026 KirayaSaathi Technologies. All Rights Reserved.</span>
          </div>

          <div className="flex items-center gap-5">
            <Link to="/" className="hover:text-white transition">Home</Link>
            <Link to="/blog" className="hover:text-white transition">Blog</Link>
            <Link to="/privacy" className="text-white font-bold transition">Privacy Policy</Link>
            <Link to="/login" className="hover:text-white transition">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
