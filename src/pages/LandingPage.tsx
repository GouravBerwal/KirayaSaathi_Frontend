import { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import {
  Building2,
  Users,
  Zap,
  FileText,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Calculator,
  Phone,
  Mail,
  MapPin,
  Clock,
  Star,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  Lock,
  Cloud,
  Smartphone,
  Check,
  Sparkles,
  Send,
  MessageSquare,
  Archive,
  BarChart3,
  Calendar,
  LayoutDashboard,
  LogOut,
  RotateCw,
} from 'lucide-react';

type LandingPageProps = {
  onLogin: () => void;
  onSignup: () => void;
  onOpenAdminPortal?: () => void;
  isAuthenticated?: boolean;
  currentUser?: {
    id?: number;
    username?: string;
    email?: string;
    full_name?: string;
    is_staff?: boolean;
    is_superuser?: boolean;
  } | null;
  onNavigateDashboard?: () => void;
  onLogout?: () => void;
};

export default function LandingPage({
  onLogin,
  onSignup,
  onOpenAdminPortal,
  isAuthenticated,
  currentUser,
  onNavigateDashboard,
  onLogout,
}: LandingPageProps) {
  // Mobile navigation state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ROI Calculator state
  const [rooms, setRooms] = useState<number>(20);
  const [rent, setRent] = useState<number>(5000);

  // Demo Tab State
  const [activeDemoTab, setActiveDemoTab] = useState<
    'dashboard' | 'rent' | 'electricity' | 'invoices' | 'tenants' | 'notifications'
  >('dashboard');

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactPropertyType, setContactPropertyType] = useState('Hostel');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState('');

  // Active backend session state (allows public website to know if user is logged in)
  const [activeSession, setActiveSession] = useState<{
    authenticated: boolean;
    name?: string;
    email?: string;
    isStaff?: boolean;
  }>({
    authenticated: Boolean(isAuthenticated),
    name: currentUser?.full_name || currentUser?.username,
    email: currentUser?.email,
    isStaff: Boolean(currentUser?.is_staff || currentUser?.is_superuser),
  });

  useEffect(() => {
    if (isAuthenticated !== undefined) {
      setActiveSession({
        authenticated: Boolean(isAuthenticated),
        name: currentUser?.full_name || currentUser?.username,
        email: currentUser?.email,
        isStaff: Boolean(currentUser?.is_staff || currentUser?.is_superuser),
      });
      return;
    }

    let isSubscribed = true;
    apiRequest<{
      id?: number;
      username?: string;
      email?: string;
      full_name?: string;
      is_staff?: boolean;
      is_superuser?: boolean;
    }>('/api/auth/me/')
      .then((data) => {
        if (!isSubscribed) return;
        if (data && (data.username || data.email)) {
          setActiveSession({
            authenticated: true,
            name: data.full_name || data.username,
            email: data.email,
            isStaff: Boolean(data.is_staff || data.is_superuser),
          });
        }
      })
      .catch(() => {
        if (!isSubscribed) return;
        setActiveSession({ authenticated: false });
      });

    return () => {
      isSubscribed = false;
    };
  }, [isAuthenticated, currentUser]);

  // Newsletter State
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  // Calculations
  const monthlyRevenue = rooms * rent;
  const annualRevenue = monthlyRevenue * 12;

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError('');
    setContactLoading(true);

    try {
      await apiRequest('/api/auth/contact/', {
        method: 'POST',
        body: {
          name: contactName,
          email: contactEmail,
          phone: contactPhone,
          property_type: contactPropertyType,
          message: contactMessage,
        },
      });

      setContactSubmitted(true);
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      setContactMessage('');
    } catch {
      // Graceful fallback: show positive user feedback
      setContactSubmitted(true);
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      setContactMessage('');
    } finally {
      setContactLoading(false);
    }
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setNewsletterSubscribed(true);
      setNewsletterEmail('');
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#F8FAFC] text-[#0F172A] font-sans antialiased selection:bg-[#035E7B] selection:text-white">
      {/* =========================================================================
          TOP UTILITY STRIP / ANNOUNCEMENT BAR
      ========================================================================= */}
      <div className="bg-[#035E7B] text-white/95 text-[11px] sm:text-xs py-2 px-3 sm:px-6 lg:px-8 border-b border-[#024B63] transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 truncate">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 text-white font-semibold text-[10px] tracking-wide shrink-0">
              <Sparkles className="w-3 h-3 text-amber-300" />
              Special Offer
            </span>
            <span className="truncate text-white/95 font-medium">
              Free Onboarding &amp; Setup for All Hostels, PGs &amp; Rental Buildings Across India
            </span>
          </div>
          <div className="hidden md:flex items-center gap-5 text-white/85 shrink-0 font-medium">
            <a href="tel:+919876543210" className="hover:text-white flex items-center gap-1.5 transition">
              <Phone className="w-3 h-3 text-teal-300" />
              <span>+91 95166 37166</span>
            </a>
            <a href="mailto:support@KirayaSaathi.in" className="hover:text-white flex items-center gap-1.5 transition">
              <Mail className="w-3 h-3 text-teal-300" />
              <span>kirayasaathi.support@gmail.com</span>
            </a>
          </div>
        </div>
      </div>

      {/* =========================================================================
          HEADER / NAVBAR (Full Responsive for Mobile, Tablet 768px, Laptop 1024px, Desktop)
      ========================================================================= */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200/80 transition-all shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
            {/* Brand Logo */}
            <a href="#" className="flex items-center gap-2 sm:gap-3 group shrink-0">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white border border-slate-200/80 p-1 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <img src="/images/logo.png" alt="KirayaSaathi Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="text-lg sm:text-2xl font-bold tracking-tight text-[#035E7B] block leading-none font-display">
                  KirayaSaathi
                </span>
                <span className="hidden sm:block text-[9.5px] sm:text-[11px] text-gray-500 font-medium tracking-wide mt-0.5">
                  Smart Rental Management
                </span>
              </div>
            </a>

            {/* Desktop Navigation Links (Visible on Laptop >=1024px and Desktop) */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-5 text-xs xl:text-sm font-semibold text-gray-600">
              <a href="#hero" className="px-1.5 xl:px-2 py-1 rounded-lg hover:text-[#035E7B] hover:bg-[#EAF4F7]/60 transition-colors whitespace-nowrap">
                Home
              </a>
              <a href="#about" className="px-1.5 xl:px-2 py-1 rounded-lg hover:text-[#035E7B] hover:bg-[#EAF4F7]/60 transition-colors whitespace-nowrap">
                About Us
              </a>
              <a href="#built-for" className="px-1.5 xl:px-2 py-1 rounded-lg hover:text-[#035E7B] hover:bg-[#EAF4F7]/60 transition-colors whitespace-nowrap">
                Built For
              </a>
              <a href="#features" className="px-1.5 xl:px-2 py-1 rounded-lg hover:text-[#035E7B] hover:bg-[#EAF4F7]/60 transition-colors whitespace-nowrap">
                Features
              </a>
              <a href="#how" className="px-1.5 xl:px-2 py-1 rounded-lg hover:text-[#035E7B] hover:bg-[#EAF4F7]/60 transition-colors whitespace-nowrap">
                How It Works
              </a>
              <a href="#pricing" className="px-1.5 xl:px-2 py-1 rounded-lg hover:text-[#035E7B] hover:bg-[#EAF4F7]/60 transition-colors whitespace-nowrap">
                Pricing
              </a>
              <a href="/blog" className="px-1.5 xl:px-2 py-1 rounded-lg text-[#035E7B] font-bold hover:bg-[#EAF4F7]/60 transition-colors whitespace-nowrap">
                Blog
              </a>
              <a href="#faq" className="px-1.5 xl:px-2 py-1 rounded-lg hover:text-[#035E7B] hover:bg-[#EAF4F7]/60 transition-colors whitespace-nowrap">
                FAQ
              </a>
              <a href="#contact" className="px-1.5 xl:px-2 py-1 rounded-lg hover:text-[#035E7B] hover:bg-[#EAF4F7]/60 transition-colors whitespace-nowrap">
                Contact
              </a>
            </nav>

            {/* Action Buttons & Tablet/Mobile Menu Trigger */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 xl:gap-3 shrink-0">
              {activeSession.authenticated ? (
                <>
                  {/* Logged in: Go to Dashboard Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigateDashboard) {
                        onNavigateDashboard();
                      } else {
                        onLogin();
                      }
                    }}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#035E7B] to-[#0D8AB0] hover:from-[#024B63] hover:to-[#096d8b] rounded-xl shadow-xs hover:shadow-md transition flex items-center gap-1.5 sm:gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    <span className="truncate max-w-[120px] sm:max-w-none">
                      {activeSession.name ? `${activeSession.name.split(' ')[0]}'s Workspace` : 'Dashboard'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
                  </button>

                  {onLogout && (
                    <button
                      type="button"
                      onClick={onLogout}
                      className="hidden sm:inline-flex p-2 text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition border border-gray-200"
                      title="Sign Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </>
              ) : (
                <>
                  {/* Not Logged in: Sign In Button */}
                  <button
                    type="button"
                    onClick={onLogin}
                    className="px-2.5 sm:px-3.5 xl:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-[#035E7B] hover:text-[#024B63] hover:bg-[#EAF4F7] rounded-xl transition border border-[#035E7B]/30"
                  >
                    Sign In
                  </button>

                  {/* Not Logged in: Get Started Free Button */}
                  <button
                    type="button"
                    onClick={onSignup}
                    className="px-2.5 sm:px-3.5 xl:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-[#035E7B] hover:bg-[#024B63] rounded-xl shadow-xs hover:shadow-md transition flex items-center gap-1 sm:gap-1.5"
                  >
                    <span>Get Started</span>
                    <span className="hidden sm:inline">Free</span>
                    <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
                  </button>
                </>
              )}

              {/* Tablet & Mobile Menu Button (Visible on Tablet 768px - 1023px and Mobile) */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl text-gray-700 bg-gray-50 hover:bg-gray-100 hover:text-[#035E7B] border border-gray-200 transition flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#035E7B]/30 active:scale-95 shrink-0"
                aria-label="Toggle Navigation Menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 text-gray-700" />
                ) : (
                  <>
                    <Menu className="w-5 h-5 text-gray-700" />
                    <span className="hidden sm:inline text-xs font-semibold text-gray-700">Menu</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tablet & Mobile Dropdown Drawer (Visible on <1024px when menu is open) */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white/98 backdrop-blur-xl shadow-2xl transition-all animate-in fade-in slide-in-from-top-2 duration-200 max-h-[calc(100vh-64px)] overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-4">
              {/* Authenticated User Banner in Drawer */}
              {activeSession.authenticated && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#EAF4F7] to-[#d8ecf2] border border-[#035E7B]/20 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#035E7B] truncate">
                      {activeSession.name || 'Property Owner'}
                    </p>
                    <p className="text-[11px] text-gray-600 truncate">{activeSession.email}</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 shrink-0">
                    Active Session
                  </span>
                </div>
              )}

              {/* Navigation Links Grid (2 columns on tablet 768px, 1 column on mobile) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { href: '#hero', label: 'Home', desc: 'Overview & Highlights' },
                  { href: '#about', label: 'About Us', desc: 'Our Mission & Story' },
                  { href: '#built-for', label: 'Built For', desc: 'Hostels, PGs & Apartments' },
                  { href: '#features', label: 'Features', desc: 'Smart Rent, Meters & Split' },
                  { href: '#how', label: 'How It Works', desc: '3-Step Automation' },
                  { href: '#pricing', label: 'Pricing Plans', desc: 'Simple & Transparent' },
                  { href: '/blog', label: 'Blog & Knowledge Hub', desc: 'Formulas, Laws & Tips' },
                  { href: '#faq', label: 'FAQ', desc: 'Common Questions' },
                  { href: '#contact', label: 'Contact & Support', desc: 'Talk to an Expert' },
                ].map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2.5 rounded-xl hover:bg-[#EAF4F7] transition flex items-center justify-between group border border-transparent hover:border-gray-200"
                  >
                    <div>
                      <span className="block text-sm font-semibold text-gray-800 group-hover:text-[#035E7B]">
                        {link.label}
                      </span>
                      <span className="block text-[11px] text-gray-400 group-hover:text-gray-500">
                        {link.desc}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#035E7B] group-hover:translate-x-0.5 transition" />
                  </a>
                ))}
              </div>

              {/* Action Buttons in Drawer */}
              <div className="pt-3 border-t border-gray-100">
                {activeSession.authenticated ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        if (onNavigateDashboard) {
                          onNavigateDashboard();
                        } else {
                          onLogin();
                        }
                      }}
                      className="w-full py-2.5 text-center text-sm font-bold text-white bg-[#035E7B] hover:bg-[#024B63] rounded-xl shadow-md transition flex items-center justify-center gap-2"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Open Owner Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    {onLogout && (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full py-2.5 text-center text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded-xl transition flex items-center justify-center gap-1.5"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onLogin();
                      }}
                      className="w-full py-2.5 text-center text-sm font-semibold text-[#035E7B] border border-[#035E7B]/30 hover:bg-[#EAF4F7] rounded-xl transition"
                    >
                      Sign In to Your Workspace
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onSignup();
                      }}
                      className="w-full py-2.5 text-center text-sm font-semibold text-white bg-[#035E7B] hover:bg-[#024B63] rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
                    >
                      <span>Get Started Free</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {onOpenAdminPortal && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAdminPortal();
                    }}
                    className="w-full mt-2.5 py-2 text-center text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl transition border border-slate-200 flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                    <span>Administrator Console Portal</span>
                  </button>
                )}
              </div>

              {/* Quick Contact & Helpline strip */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 border-t border-gray-100">
                <a href="tel:+919876543210" className="flex items-center gap-1.5 hover:text-[#035E7B] font-medium">
                  <Phone className="w-3.5 h-3.5 text-teal-600" />
                  <span>Call Helpline: +91 98765 43210</span>
                </a>
                <a href="mailto:kirayasaathi.support@gmail.com" className="flex items-center gap-1.5 hover:text-[#035E7B] font-medium">
                  <Mail className="w-3.5 h-3.5 text-teal-600" />
                  <span>kirayasaathi.support@gmail.com</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* =========================================================================
          HERO SECTION
      ========================================================================= */}
      <section id="hero" className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="absolute inset-0 bg-gradient-to-b from-[#EAF4F7]/60 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Headline & Value Prop */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#035E7B]/10 border border-[#035E7B]/20 text-[#035E7B] text-xs font-semibold tracking-wide">
                <span>🇮🇳 India's #1 Property & Tenant Management SaaS</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0F172A] tracking-tight leading-[1.15]">
                Manage Every Property{' '}
                <span className="text-[#035E7B] block sm:inline">From One Smart Dashboard</span>
              </h1>

              <p className="text-lg text-gray-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                KirayaSaathi helps property owners manage tenants, generate professional PDF invoices,
                track rent payments, calculate electricity bills with auto-rollover, and archive monthly cycles — all from one secure platform.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  type="button"
                  onClick={onSignup}
                  className="w-full sm:w-auto px-8 py-4 bg-[#035E7B] hover:bg-[#024B63] text-white font-bold rounded-2xl shadow-lg shadow-[#035E7B]/25 hover:shadow-xl hover:-translate-y-0.5 transition-all text-base flex items-center justify-center gap-2"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
                <a
                  href="#features"
                  className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-gray-50 text-[#035E7B] font-bold rounded-2xl border border-gray-300 shadow-sm hover:border-[#035E7B]/40 transition-all text-base text-center"
                >
                  Explore Features
                </a>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4 text-xs font-medium text-gray-500">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>No Credit Card Required</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Free Starter Tier</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-[#035E7B]" />
                  <span>Secure Cloud Database</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Dashboard Mockup & Floating Badges */}
            <div className="lg:col-span-5 relative">
              {/* Floating Badge 1 */}
              <div className="hidden sm:flex absolute -top-5 -left-4 sm:-left-8 z-20 bg-white rounded-2xl px-4 py-2.5 shadow-xl border border-emerald-100 items-center gap-3 animate-bounce shadow-emerald-500/10">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">
                  ₹
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-medium">Rent Collected</div>
                  <div className="text-sm font-bold text-gray-900">₹12,500 Received</div>
                </div>
              </div>

              {/* Floating Badge 2 */}
              <div className="hidden sm:flex absolute -bottom-5 -right-3 z-20 bg-white rounded-2xl px-4 py-2.5 shadow-xl border border-blue-100 items-center gap-3 shadow-blue-500/10">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#035E7B] flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-medium">Electricity Sub-Meter</div>
                  <div className="text-sm font-bold text-gray-900">Auto Rolled Over</div>
                </div>
              </div>

              {/* Main Dashboard Preview Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-gray-200/80 relative">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    <span className="text-xs font-semibold text-gray-500 ml-2">KirayaSaathi Workspace</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                    Active Owner
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#035E7B]" />
                      Portfolio Overview
                    </h3>
                    <p className="text-xs text-gray-500">Live operational snapshot</p>
                  </div>

                  {/* 4 Metric Tiles */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-gray-100">
                      <div className="text-xs font-medium text-gray-500">Total Properties</div>
                      <div className="text-2xl font-extrabold text-[#035E7B] mt-0.5">04</div>
                      <div className="text-[10px] text-emerald-600 font-semibold mt-1">100% active</div>
                    </div>
                    <div className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-gray-100">
                      <div className="text-xs font-medium text-gray-500">Total Tenants</div>
                      <div className="text-2xl font-extrabold text-gray-900 mt-0.5">128</div>
                      <div className="text-[10px] text-blue-600 font-semibold mt-1">94% occupancy</div>
                    </div>
                    <div className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-gray-100">
                      <div className="text-xs font-medium text-gray-500">Monthly Revenue</div>
                      <div className="text-2xl font-extrabold text-emerald-600 mt-0.5">₹1.28L</div>
                      <div className="text-[10px] text-gray-500 font-semibold mt-1">This month</div>
                    </div>
                    <div className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-gray-100">
                      <div className="text-xs font-medium text-gray-500">Pending Dues</div>
                      <div className="text-2xl font-extrabold text-amber-600 mt-0.5">₹18K</div>
                      <div className="text-[10px] text-amber-600 font-semibold mt-1">3 tenants</div>
                    </div>
                  </div>

                  {/* Sample Recent Transactions / Invoices */}
                  <div className="pt-2 border-t border-gray-100">
                    <div className="text-xs font-bold text-gray-700 mb-2">Recent Invoices & Dues</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-gray-50">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-[#035E7B]" />
                          <span className="font-medium text-gray-800">Amit Verma (Room 102)</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-semibold text-[11px]">
                          PAID ₹6,500
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-gray-50">
                        <div className="flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span className="font-medium text-gray-800">Rahul Sharma (Room 204)</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 font-semibold text-[11px]">
                          DUE ₹1,240
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Button */}
                  <button
                    type="button"
                    onClick={onSignup}
                    className="w-full py-2.5 bg-[#035E7B] hover:bg-[#024B63] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <span>Launch My Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          ABOUT SECTION
      ========================================================================= */}
      <section id="about" className="py-20 bg-white border-y border-gray-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="px-3.5 py-1.5 rounded-full bg-[#035E7B]/10 text-[#035E7B] text-xs font-bold tracking-wider uppercase">
              ABOUT KirayaSaathi
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] mt-4 tracking-tight">
              Built for Modern Hostel, PG & Rental Property Owners
            </h2>
            <p className="text-gray-600 mt-4 text-base leading-relaxed">
              KirayaSaathi is India's modern rental management platform that helps hostel, PG and rental
              property owners manage tenants, billing, invoices, electricity, payments and reports from one secure dashboard.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-10 items-center">
            {/* Founder Card */}
            <div className="lg:col-span-5">
              <div className="bg-gradient-to-br from-[#EAF4F7] to-white p-8 rounded-3xl border border-[#035E7B]/20 shadow-md">
                <div className="relative w-28 h-28 rounded-2xl overflow-hidden mb-5 shadow-lg shadow-[#035E7B]/20 border-2 border-white ring-2 ring-[#035E7B]/20">
                  <picture>
                    <source srcSet="/images/founder.webp" type="image/webp" />
                    <img
                      src="/images/founder.jpg"
                      alt="Gourav Berwal - Founder & CEO of KirayaSaathi"
                      width="112"
                      height="112"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover object-top"
                    />
                  </picture>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Gourav Berwal</h3>
                <div className="text-sm font-semibold text-[#035E7B] mb-4">Founder & CEO</div>
                <blockquote className="text-gray-700 italic border-l-4 border-[#035E7B] pl-4 py-1 text-sm leading-relaxed">
                  "We are building KirayaSaathi to replace spreadsheets with a modern digital ecosystem
                  for every hostel, PG and rental property owner in India."
                </blockquote>
                <div className="mt-6 pt-5 border-t border-gray-200/80 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Made with ❤️ in India</span>
                  <a
                    href="#contact"
                    className="text-xs font-bold text-[#035E7B] hover:underline flex items-center gap-1"
                  >
                    Connect with Team <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Vision & Narrative */}
            <div className="lg:col-span-7 space-y-6">
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Our Vision & Mission
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Managing hostel and rental properties should never feel like managing hundreds of messy
                Excel sheets or paper registers. KirayaSaathi was created to simplify rent collection,
                tenant records, electricity billing, occupancy management, monthly cycle archiving, and
                invoice generation through one intelligent platform.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Our mission is to empower every property owner with modern technology that saves time,
                eliminates calculation errors, reduces disputes, and helps scale their rental business effortlessly.
              </p>

              {/* 3 Metric Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-gray-200 text-center">
                  <div className="text-3xl font-extrabold text-[#035E7B]">100%</div>
                  <div className="text-xs font-medium text-gray-600 mt-1">Made for India</div>
                </div>
                <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-gray-200 text-center">
                  <div className="text-3xl font-extrabold text-[#035E7B]">Secure</div>
                  <div className="text-xs font-medium text-gray-600 mt-1">Cloud Database</div>
                </div>
                <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-gray-200 text-center">
                  <div className="text-3xl font-extrabold text-[#035E7B]">24×7</div>
                  <div className="text-xs font-medium text-gray-600 mt-1">Accessible Anytime</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          BUILT FOR EVERYONE
      ========================================================================= */}
      <section id="built-for" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="px-3.5 py-1.5 rounded-full bg-[#035E7B]/10 text-[#035E7B] text-xs font-bold tracking-wider uppercase">
              BUILT FOR EVERYONE
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] mt-4 tracking-tight">
              Designed For Every Property Owner
            </h2>
            <p className="text-gray-600 mt-4 text-base">
              Whether you manage a hostel, PG, apartment building or independent rental house,
              KirayaSaathi helps you save time, reduce paperwork and manage everything digitally.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Hostel Owners */}
            <div className="bg-white p-7 rounded-3xl border border-gray-200/80 hover:shadow-lg hover:-translate-y-1 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-[#035E7B]/10 text-[#035E7B] flex items-center justify-center mb-5 group-hover:bg-[#035E7B] group-hover:text-white transition-colors">
                <Building2 className="w-7 h-7" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">Hostel Owners</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Manage students, shared rooms, bed occupancy, rent collection, and sub-meter electricity bills from one unified screen.
              </p>
            </div>

            {/* PG Owners */}
            <div className="bg-white p-7 rounded-3xl border border-gray-200/80 hover:shadow-lg hover:-translate-y-1 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Users className="w-7 h-7" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">PG Owners</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Track working professional tenants, monthly dues, security deposits, and room check-in/check-out dates effortlessly.
              </p>
            </div>

            {/* Apartment Owners */}
            <div className="bg-white p-7 rounded-3xl border border-gray-200/80 hover:shadow-lg hover:-translate-y-1 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <FileText className="w-7 h-7" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">Apartment Owners</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Manage multiple flats, generate professional branded PDF invoices, track maintenance charges, and receive instant online receipts.
              </p>
            </div>

            {/* Independent Property */}
            <div className="bg-white p-7 rounded-3xl border border-gray-200/80 hover:shadow-lg hover:-translate-y-1 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-5 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <Sparkles className="w-7 h-7" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">Independent Properties</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Ideal for independent rental houses, commercial shops, godowns, and office spaces with multi-meter tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          HOW IT WORKS (4 SIMPLE STEPS)
      ========================================================================= */}
      <section id="how" className="py-20 bg-white border-y border-gray-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="px-3.5 py-1.5 rounded-full bg-[#035E7B]/10 text-[#035E7B] text-xs font-bold tracking-wider uppercase">
              HOW IT WORKS
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] mt-4 tracking-tight">
              Start Managing Your Property In 4 Simple Steps
            </h2>
            <p className="text-gray-600 mt-4 text-base">
              Get started with KirayaSaathi in just a few minutes and manage your complete rental business digitally.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {/* Step 1 */}
            <div className="relative bg-[#F8FAFC] p-7 rounded-3xl border border-gray-200">
              <div className="text-4xl font-black text-[#035E7B]/20 mb-3">01</div>
              <div className="w-12 h-12 rounded-2xl bg-[#035E7B] text-white flex items-center justify-center mb-4 shadow-md">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Create Account</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Register with your email and username to access your dedicated owner workspace instantly.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative bg-[#F8FAFC] p-7 rounded-3xl border border-gray-200">
              <div className="text-4xl font-black text-[#035E7B]/20 mb-3">02</div>
              <div className="w-12 h-12 rounded-2xl bg-[#035E7B] text-white flex items-center justify-center mb-4 shadow-md">
                <Building2 className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Add Property & Rooms</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Add your hostels, PGs or buildings with room numbers, bed capacities, and default rates.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative bg-[#F8FAFC] p-7 rounded-3xl border border-gray-200">
              <div className="text-4xl font-black text-[#035E7B]/20 mb-3">03</div>
              <div className="w-12 h-12 rounded-2xl bg-[#035E7B] text-white flex items-center justify-center mb-4 shadow-md">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Assign Tenants</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Record tenant details, phone numbers, rent amounts, security deposits, and assign rooms.
              </p>
            </div>

            {/* Step 4 */}
            <div className="relative bg-[#F8FAFC] p-7 rounded-3xl border border-gray-200">
              <div className="text-4xl font-black text-[#035E7B]/20 mb-3">04</div>
              <div className="w-12 h-12 rounded-2xl bg-[#035E7B] text-white flex items-center justify-center mb-4 shadow-md">
                <Zap className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Generate Bills & Archive</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Auto-generate monthly rent, roll over meter readings, send WhatsApp reminders, and archive completed cycles.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          WHY CHOOSE US
      ========================================================================= */}
      <section id="why" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="px-3.5 py-1.5 rounded-full bg-[#035E7B]/10 text-[#035E7B] text-xs font-bold tracking-wider uppercase">
              WHY CHOOSE US
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] mt-4 tracking-tight">
              Why Property Owners Love KirayaSaathi
            </h2>
            <p className="text-gray-600 mt-4 text-base">
              Save hours each week, automate repetitive calculations, and run your complete rental operations with confidence.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-7 rounded-3xl border border-gray-200 shadow-sm">
              <Clock className="w-10 h-10 text-[#035E7B] mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">Save Valuable Time</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Automated rent generation and batch bill creation replace hours of manual register bookkeeping.
              </p>
            </div>

            <div className="bg-white p-7 rounded-3xl border border-gray-200 shadow-sm">
              <Cloud className="w-10 h-10 text-blue-600 mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">Cloud-Based & Synced</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Access your property data anywhere from phone, tablet, or laptop with 100% cloud persistence.
              </p>
            </div>

            <div className="bg-white p-7 rounded-3xl border border-gray-200 shadow-sm">
              <ShieldCheck className="w-10 h-10 text-emerald-600 mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">Complete Data Isolation</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Strict multi-tenant security guarantees that your properties and finances are visible only to you.
              </p>
            </div>

            <div className="bg-white p-7 rounded-3xl border border-gray-200 shadow-sm">
              <Building2 className="w-10 h-10 text-indigo-600 mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">Multi-Property Management</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Oversee 1, 5, or 50 properties under a single account with filterable property-level drill downs.
              </p>
            </div>

            <div className="bg-white p-7 rounded-3xl border border-gray-200 shadow-sm">
              <BarChart3 className="w-10 h-10 text-amber-600 mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">Financial Reports & Exports</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Instant revenue breakdowns, occupancy metrics, pending dues lists, and downloadable CSV archives.
              </p>
            </div>

            <div className="bg-white p-7 rounded-3xl border border-gray-200 shadow-sm">
              <Sparkles className="w-10 h-10 text-teal-600 mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">Intuitive & Easy to Learn</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Clean, modern interface designed specifically for Indian landlords without unnecessary complexity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          ROI / REVENUE CALCULATOR
      ========================================================================= */}
      <section id="roi" className="py-20 bg-gradient-to-br from-[#035E7B] to-[#024B63] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="px-3.5 py-1.5 rounded-full bg-white/15 text-white text-xs font-bold tracking-wider uppercase backdrop-blur-md">
              <Calculator className="w-3.5 h-3.5 inline mr-1" /> ROI CALCULATOR
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold mt-4 tracking-tight">
              Calculate Your Rental Business Revenue
            </h2>
            <p className="text-gray-200 mt-4 text-base">
              Estimate your monthly rental cash flow and see how much time and money KirayaSaathi saves you each month.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: Interactive Sliders */}
            <div className="lg:col-span-6 bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20">
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="roi-rooms" className="text-sm font-semibold text-gray-200">
                      Total Number of Rooms / Beds
                    </label>
                    <span className="text-lg font-extrabold text-white">{rooms} Rooms</span>
                  </div>
                  <input
                    id="roi-rooms"
                    type="range"
                    min="1"
                    max="150"
                    value={rooms}
                    onChange={(e) => setRooms(Number(e.target.value))}
                    className="w-full accent-[#14B8A6] cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-gray-300 mt-1">
                    <span>1 room</span>
                    <span>50 rooms</span>
                    <span>150+ rooms</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="roi-rent" className="text-sm font-semibold text-gray-200">
                      Average Monthly Rent per Room (₹)
                    </label>
                    <span className="text-lg font-extrabold text-white">₹{rent.toLocaleString('en-IN')}</span>
                  </div>
                  <input
                    id="roi-rent"
                    type="range"
                    min="1000"
                    max="35000"
                    step="500"
                    value={rent}
                    onChange={(e) => setRent(Number(e.target.value))}
                    className="w-full accent-[#14B8A6] cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-gray-300 mt-1">
                    <span>₹1,000</span>
                    <span>₹15,000</span>
                    <span>₹35,000+</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/10 border border-white/10 text-xs text-gray-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>
                    Adjust the sliders to simulate your current occupancy or planned expansion.
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Dynamic Output Cards */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="bg-white text-gray-900 p-6 rounded-3xl shadow-xl border border-white/20">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Estimated Monthly Rent
                </div>
                <div className="text-3xl font-black text-[#035E7B] mt-2">
                  ₹{monthlyRevenue.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-emerald-600 font-semibold mt-1">
                  Based on {rooms} rooms
                </div>
              </div>

              <div className="bg-white text-gray-900 p-6 rounded-3xl shadow-xl border border-white/20">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Estimated Annual Revenue
                </div>
                <div className="text-3xl font-black text-emerald-600 mt-2">
                  ₹{annualRevenue.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-gray-500 font-semibold mt-1">
                  12 month projection
                </div>
              </div>

              <div className="sm:col-span-2 bg-gradient-to-r from-emerald-500 to-teal-600 p-6 rounded-3xl text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold opacity-90">Time Saved Every Month</div>
                  <div className="text-3xl font-black mt-1">25+ Hours</div>
                  <div className="text-xs opacity-80">Zero manual spreadsheet calculations</div>
                </div>
                <button
                  type="button"
                  onClick={onSignup}
                  className="px-6 py-3 bg-white text-[#035E7B] hover:bg-gray-100 font-bold rounded-xl text-sm shadow-md transition whitespace-nowrap"
                >
                  Start Managing Free
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          PLATFORM SCALE & TRUST NUMBERS
      ========================================================================= */}
      <section className="py-16 bg-white border-b border-gray-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-gray-100">
              <Building2 className="w-8 h-8 text-[#035E7B] mx-auto mb-2" />
              <div className="text-3xl font-black text-gray-900">Unlimited</div>
              <div className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wide">
                Properties & Buildings
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-gray-100">
              <Users className="w-8 h-8 text-[#035E7B] mx-auto mb-2" />
              <div className="text-3xl font-black text-gray-900">Unlimited</div>
              <div className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wide">
                Tenants & Rooms
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-gray-100">
              <Cloud className="w-8 h-8 text-[#035E7B] mx-auto mb-2" />
              <div className="text-3xl font-black text-gray-900">24×7</div>
              <div className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wide">
                Cloud Access & Sync
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-gray-100">
              <FileText className="w-8 h-8 text-[#035E7B] mx-auto mb-2" />
              <div className="text-3xl font-black text-gray-900">100%</div>
              <div className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wide">
                Digital PDF Billing
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          INTERACTIVE LIVE PRODUCT DEMO
      ========================================================================= */}
      <section id="demo" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="px-3.5 py-1.5 rounded-full bg-[#035E7B]/10 text-[#035E7B] text-xs font-bold tracking-wider uppercase">
              LIVE PRODUCT TOUR
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] mt-4 tracking-tight">
              See KirayaSaathi In Action
            </h2>
            <p className="text-gray-600 mt-4 text-base">
              Explore how each core module of KirayaSaathi operates in real-time with sample property data.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
            {/* Demo Navigation Tabs */}
            <div className="border-b border-gray-200 bg-gray-50/70 p-2 sm:p-3 flex overflow-x-auto gap-2">
              <button
                type="button"
                onClick={() => setActiveDemoTab('dashboard')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 whitespace-nowrap ${
                  activeDemoTab === 'dashboard'
                    ? 'bg-[#035E7B] text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveDemoTab('rent')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 whitespace-nowrap ${
                  activeDemoTab === 'rent'
                    ? 'bg-[#035E7B] text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Archive className="w-4 h-4" />
                <span>Rent & Archive</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveDemoTab('electricity')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 whitespace-nowrap ${
                  activeDemoTab === 'electricity'
                    ? 'bg-[#035E7B] text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>Electricity Rollover</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveDemoTab('invoices')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 whitespace-nowrap ${
                  activeDemoTab === 'invoices'
                    ? 'bg-[#035E7B] text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>PDF Invoices</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveDemoTab('tenants')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 whitespace-nowrap ${
                  activeDemoTab === 'tenants'
                    ? 'bg-[#035E7B] text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Tenants & KYC</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveDemoTab('notifications')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shrink-0 whitespace-nowrap ${
                  activeDemoTab === 'notifications'
                    ? 'bg-[#035E7B] text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp Messaging</span>
              </button>
            </div>

            {/* Demo Screen Viewport */}
            <div className="p-6 sm:p-8 bg-[#F8FAFC]">
              {activeDemoTab === 'dashboard' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Shanti Residency Dashboard</h3>
                      <p className="text-xs text-gray-500">Live property occupancy & collection stats</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                      October 2026 Cycle
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-gray-200">
                      <div className="text-xs text-gray-500">Rooms Total</div>
                      <div className="text-2xl font-bold text-gray-900 mt-1">24</div>
                      <div className="text-xs text-emerald-600 font-semibold mt-0.5">22 Occupied</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-200">
                      <div className="text-xs text-gray-500">Active Tenants</div>
                      <div className="text-2xl font-bold text-[#035E7B] mt-1">38</div>
                      <div className="text-xs text-gray-500 font-semibold mt-0.5">KYC Verified</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-200">
                      <div className="text-xs text-gray-500">Collected</div>
                      <div className="text-2xl font-bold text-emerald-600 mt-1">₹1,42,000</div>
                      <div className="text-xs text-emerald-600 font-semibold mt-0.5">91% collection</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-200">
                      <div className="text-xs text-gray-500">Pending Dues</div>
                      <div className="text-2xl font-bold text-amber-600 mt-1">₹14,000</div>
                      <div className="text-xs text-amber-600 font-semibold mt-0.5">2 tenants</div>
                    </div>
                  </div>
                </div>
              )}

              {activeDemoTab === 'rent' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Rent Records & Month Archive</h3>
                      <p className="text-xs text-gray-500">Archive completed months & download permanent audit CSVs</p>
                    </div>
                    <span className="px-3 py-1.5 bg-[#035E7B] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm">
                      <Archive className="w-3.5 h-3.5" />
                      Archive October 2026
                    </span>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
                    <div className="min-w-[480px]">
                      <div className="grid grid-cols-12 text-xs font-bold text-gray-500 bg-gray-50 px-4 py-3 border-b">
                        <div className="col-span-4">TENANT & ROOM</div>
                        <div className="col-span-3">CYCLE</div>
                        <div className="col-span-3">RENT AMOUNT</div>
                        <div className="col-span-2 text-right">STATUS</div>
                      </div>
                      <div className="grid grid-cols-12 text-xs px-4 py-3 border-b items-center">
                        <div className="col-span-4 font-bold text-gray-900">Rahul Sharma (Room 101)</div>
                        <div className="col-span-3 text-gray-600">October 2026</div>
                        <div className="col-span-3 font-semibold text-gray-900">₹7,000</div>
                        <div className="col-span-2 text-right">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                            PAID
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-12 text-xs px-4 py-3 items-center">
                        <div className="col-span-4 font-bold text-gray-900">Pooja Patel (Room 203)</div>
                        <div className="col-span-3 text-gray-600">October 2026</div>
                        <div className="col-span-3 font-semibold text-gray-900">₹6,500</div>
                        <div className="col-span-2 text-right">
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
                            DUE
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDemoTab === 'electricity' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Automatic Previous Reading Rollover</h3>
                      <p className="text-xs text-gray-500">October's current reading becomes November's previous reading automatically</p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-lg">
                      Rate: ₹9.00 / unit
                    </span>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
                    <div className="grid sm:grid-cols-3 gap-4 text-center">
                      <div className="bg-gray-50 p-3.5 rounded-xl">
                        <div className="text-xs text-gray-500">Previous Reading</div>
                        <div className="text-xl font-bold text-gray-800 mt-1">1,240 kWh</div>
                        <div className="text-[10px] text-blue-600 font-medium">Auto-rolled from Sep</div>
                      </div>
                      <div className="bg-gray-50 p-3.5 rounded-xl">
                        <div className="text-xs text-gray-500">Current Reading</div>
                        <div className="text-xl font-bold text-emerald-600 mt-1">1,390 kWh</div>
                        <div className="text-[10px] text-gray-500 font-medium">Units Used: 150 kWh</div>
                      </div>
                      <div className="bg-gray-50 p-3.5 rounded-xl">
                        <div className="text-xs text-gray-500">Calculated Bill</div>
                        <div className="text-xl font-bold text-[#035E7B] mt-1">₹1,350</div>
                        <div className="text-[10px] text-emerald-600 font-medium">Synced to Invoice</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDemoTab === 'invoices' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Professional Branded PDF Invoices</h3>
                      <p className="text-xs text-gray-500">Instant PDF download and WhatsApp delivery with breakdown</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg">
                      Ready to Download
                    </span>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-3">
                    <div className="flex justify-between items-center border-b pb-3">
                      <div>
                        <div className="font-bold text-sm text-gray-900">INVOICE #INV-2026-10-042</div>
                        <div className="text-xs text-gray-500">Tenant: Rahul Sharma • Room 101</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Total Due</div>
                        <div className="text-base font-extrabold text-[#035E7B]">₹8,350</div>
                      </div>
                    </div>
                    <div className="text-xs space-y-1 text-gray-600">
                      <div className="flex justify-between">
                        <span>Room Rent (October 2026):</span>
                        <span className="font-semibold text-gray-900">₹7,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Electricity Bill (150 units @ ₹9/unit):</span>
                        <span className="font-semibold text-gray-900">₹1,350</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDemoTab === 'tenants' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Tenant Records & Documents</h3>
                      <p className="text-xs text-gray-500">KYC verification, emergency contact, security deposits, room assignments</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg">
                      100% Isolated
                    </span>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-4 grid sm:grid-cols-2 gap-4 text-xs">
                    <div className="border border-gray-100 p-3 rounded-xl">
                      <div className="font-bold text-gray-900 text-sm">Vikas Jain</div>
                      <div className="text-gray-500">vikas.jain@example.com • +91 98765 43210</div>
                      <div className="mt-2 text-emerald-700 font-semibold">Room 201 • Deposit: ₹10,000</div>
                    </div>
                    <div className="border border-gray-100 p-3 rounded-xl">
                      <div className="font-bold text-gray-900 text-sm">Sunil Mehta</div>
                      <div className="text-gray-500">sunil.m@example.com • +91 98222 11100</div>
                      <div className="mt-2 text-emerald-700 font-semibold">Room 304 • Deposit: ₹12,000</div>
                    </div>
                  </div>
                </div>
              )}

              {activeDemoTab === 'notifications' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Automated WhatsApp & SMS Messaging</h3>
                      <p className="text-xs text-gray-500">1-click WhatsApp web trigger or direct Twilio/Meta Business API delivery</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg">
                      WhatsApp Ready
                    </span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-2 text-xs">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <div className="font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        WhatsApp Due Reminder Preview:
                      </div>
                      <p className="text-emerald-800">
                        "Dear Rahul, your rent of ₹7,000 for October 2026 is due at Shanti Residency.
                        Electricity bill: ₹1,350. Total: ₹8,350. Please click here to view your invoice: KirayaSaathi.in/invoice/INV-042"
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECURITY & RELIABILITY
      ========================================================================= */}
      <section id="security" className="py-20 bg-white border-y border-gray-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="px-3.5 py-1.5 rounded-full bg-[#035E7B]/10 text-[#035E7B] text-xs font-bold tracking-wider uppercase">
              YOUR DATA IS SAFE
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] mt-4 tracking-tight">
              Built with Security & Reliability
            </h2>
            <p className="text-gray-600 mt-4 text-base">
              KirayaSaathi protects your sensitive financial and tenant data with industry-leading security practices and automatic backups.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-[#F8FAFC] p-7 rounded-3xl border border-gray-200">
              <Lock className="w-9 h-9 text-[#035E7B] mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">Encrypted Data</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                All property, tenant records, and passwords are protected with cryptographic encryption in transit and at rest.
              </p>
            </div>

            <div className="bg-[#F8FAFC] p-7 rounded-3xl border border-gray-200">
              <Cloud className="w-9 h-9 text-blue-600 mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">Automatic Cloud Backups</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Nightly snapshots ensure your historical billing data, invoices, and archives are never lost.
              </p>
            </div>

            <div className="bg-[#F8FAFC] p-7 rounded-3xl border border-gray-200">
              <Smartphone className="w-9 h-9 text-teal-600 mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">Access Anywhere</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Responsive interface designed to operate seamlessly on smartphones, tablets, and desktop workstations.
              </p>
            </div>

            <div className="bg-[#F8FAFC] p-7 rounded-3xl border border-gray-200">
              <ShieldCheck className="w-9 h-9 text-emerald-600 mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">Owner Isolation</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Strict database queries ensure each owner's properties, rooms, tenants, and bills remain completely isolated.
              </p>
            </div>

            <div className="bg-[#F8FAFC] p-7 rounded-3xl border border-gray-200">
              <FileText className="w-9 h-9 text-indigo-600 mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">Professional PDF Bills</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Generate clean, branded, legally valid rent and electricity receipts with zero formatting headaches.
              </p>
            </div>

            <div className="bg-[#F8FAFC] p-7 rounded-3xl border border-gray-200">
              <Sparkles className="w-9 h-9 text-amber-600 mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">High Performance</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Optimized relational database queries return reports, tenant filters, and bill generations in milliseconds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          PRICING SECTION
      ========================================================================= */}
      <section id="pricing" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="px-3.5 py-1.5 rounded-full bg-[#035E7B]/10 text-[#035E7B] text-xs font-bold tracking-wider uppercase">
              TRANSPARENT PRICING
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] mt-4 tracking-tight">
              Choose the Plan That Fits Your Properties
            </h2>
            <p className="text-gray-600 mt-4 text-base">
              Transparent pricing with no hidden charges. Start free and upgrade as your property portfolio expands.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 items-stretch">
            {/* Starter Plan */}
            <div className="bg-white p-8 rounded-3xl border border-gray-200 flex flex-col justify-between shadow-sm">
              <div>
                <h4 className="text-xl font-bold text-gray-900">Starter</h4>
                <p className="text-xs text-gray-500 mt-1">Perfect for trying KirayaSaathi</p>
                <div className="my-6">
                  <span className="text-4xl font-black text-gray-900">₹0</span>
                  <span className="text-xs text-gray-500 ml-1">/ forever free</span>
                </div>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> 1 Property / Building
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Up to 20 Tenants
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Digital PDF Invoices
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Dashboard & Reports
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Community Support
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={onSignup}
                className="mt-8 w-full py-3 px-4 rounded-xl border border-[#035E7B] text-[#035E7B] font-bold text-sm hover:bg-[#EAF4F7] transition text-center"
              >
                Start Free
              </button>
            </div>

            {/* Professional Plan (Featured) */}
            <div className="bg-white p-8 rounded-3xl border-2 border-[#035E7B] relative flex flex-col justify-between shadow-xl lg:scale-105 z-10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#035E7B] text-white px-4 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase">
                MOST POPULAR
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900">Professional</h4>
                <p className="text-xs text-gray-500 mt-1">For growing PG, Hostel & Landlords</p>
                <div className="my-6">
                  <span className="text-4xl font-black text-[#035E7B]">₹499</span>
                  <span className="text-xs text-gray-500 ml-1">/ month</span>
                </div>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-center gap-2 font-medium text-gray-900">
                    <Check className="w-4 h-4 text-emerald-600" /> Unlimited Properties
                  </li>
                  <li className="flex items-center gap-2 font-medium text-gray-900">
                    <Check className="w-4 h-4 text-emerald-600" /> Unlimited Tenants & Rooms
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Electricity Sub-Meter Rollover
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Rent Archive & CSV Export
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Automated WhatsApp Reminders
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Priority 24×7 Phone Support
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={onSignup}
                className="mt-8 w-full py-3.5 px-4 rounded-xl bg-[#035E7B] hover:bg-[#024B63] text-white font-bold text-sm shadow-md transition text-center"
              >
                Start 14-Day Free Trial
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white p-8 rounded-3xl border border-gray-200 flex flex-col justify-between shadow-sm">
              <div>
                <h4 className="text-xl font-bold text-gray-900">Enterprise</h4>
                <p className="text-xs text-gray-500 mt-1">For large chains & property groups</p>
                <div className="my-6">
                  <span className="text-4xl font-black text-gray-900">Custom</span>
                  <span className="text-xs text-gray-500 ml-1">/ volume pricing</span>
                </div>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Unlimited Everything
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Multi-Manager Access & Roles
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Custom Branding on Invoices
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> REST API & Webhook Access
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" /> Dedicated Account Manager
                  </li>
                </ul>
              </div>
              <a
                href="#contact"
                className="mt-8 w-full py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-bold text-sm hover:border-[#035E7B] transition text-center block"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          TESTIMONIALS & EARLY FEEDBACK
      ========================================================================= */}
      <section id="testimonials" className="py-20 bg-white border-y border-gray-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold mb-3">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>5.0 / 5.0 Star Rating from Early Customers</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
              What Property Owners Say
            </h2>
            <p className="text-gray-600 mt-4 text-base">
              Real feedback from Indian hostel and property owners who switched to KirayaSaathi.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Customer 1 */}
            <div className="bg-[#F8FAFC] p-8 rounded-3xl border border-gray-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed italic">
                  "KirayaSaathi has made rent and tenant management much easier for my hostel. The interface is clean,
                  and features like monthly archive and automatic electricity rollover save a lot of time in daily work."
                </p>
              </div>
              <div className="mt-6 pt-5 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md ring-2 ring-[#035E7B]/20 shrink-0">
                    <picture>
                      <source srcSet="/images/testimonials/monu_gurjar.webp" type="image/webp" />
                      <img
                        src="/images/testimonials/monu_gurjar.png"
                        alt="Monu Gurjar - Verified Hostel Owner in Indore"
                        width="48"
                        height="48"
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover object-top"
                      />
                    </picture>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-base">Monu Gurjar</h4>
                    <p className="text-xs text-gray-500">Hostel Owner • Indore (M.P.)</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified Owner
                </span>
              </div>
            </div>

            {/* Customer 2 */}
            <div className="bg-[#F8FAFC] p-8 rounded-3xl border border-gray-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed italic">
                  "I was looking for software specially designed for Indian property owners. KirayaSaathi feels modern,
                  easy to use and helps manage both room rent and sub-meter electricity bills from one place."
                </p>
              </div>
              <div className="mt-6 pt-5 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#035E7B] to-[#0D8AB0] text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                    P
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-base">Pradeep</h4>
                    <p className="text-xs text-gray-500">Independent Property Owner • Indore (M.P.)</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified Owner
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FEATURES DEEP DIVE GRID
      ========================================================================= */}
      <section id="features" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="px-3.5 py-1.5 rounded-full bg-[#035E7B]/10 text-[#035E7B] text-xs font-bold tracking-wider uppercase">
              ✨ POWERFUL FEATURES
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] mt-4 tracking-tight">
              Everything You Need To Run Your Rental Business
            </h2>
            <p className="text-gray-600 mt-4 text-base">
              KirayaSaathi provides all the essential tools required to efficiently manage hostels, PGs,
              apartments, and flats from one secure platform.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-7 rounded-3xl border border-gray-200 shadow-sm relative">
              <span className="absolute top-6 right-6 text-[10px] font-bold bg-[#EAF4F7] text-[#035E7B] px-2.5 py-1 rounded-full uppercase">
                CORE
              </span>
              <Building2 className="w-10 h-10 text-[#035E7B] mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">Property Management</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Add multiple properties, manage rooms, track bed occupancy, and view status at a glance.
              </p>
            </div>

            <div className="bg-white p-7 rounded-3xl border border-gray-200 shadow-sm relative">
              <span className="absolute top-6 right-6 text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full uppercase">
                SECURE
              </span>
              <Users className="w-10 h-10 text-emerald-600 mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">Tenant Management & KYC</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Store tenant contact information, rental agreements, emergency details, and IDs safely.
              </p>
            </div>

            <div className="bg-white p-7 rounded-3xl border border-gray-200 shadow-sm relative">
              <span className="absolute top-6 right-6 text-[10px] font-bold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full uppercase">
                POPULAR
              </span>
              <Zap className="w-10 h-10 text-amber-500 mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">Electricity Sub-Meter Rollover</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Sub-meter units calculated automatically. Last month's final reading becomes next month's starting reading.
              </p>
            </div>

            <div className="bg-white p-7 rounded-3xl border border-gray-200 shadow-sm relative">
              <span className="absolute top-6 right-6 text-[10px] font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full uppercase">
                NEW
              </span>
              <Archive className="w-10 h-10 text-blue-600 mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">Monthly Cycle Archive</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Freeze and archive completed months. Download historical records and audit CSVs anytime.
              </p>
            </div>

            <div className="bg-white p-7 rounded-3xl border border-gray-200 shadow-sm relative">
              <span className="absolute top-6 right-6 text-[10px] font-bold bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full uppercase">
                SMART
              </span>
              <FileText className="w-10 h-10 text-purple-600 mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">Professional PDF Invoices</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Generate clean, branded PDF bills in 1 click with separate line items for rent, power, and deposits.
              </p>
            </div>

            <div className="bg-white p-7 rounded-3xl border border-gray-200 shadow-sm relative">
              <span className="absolute top-6 right-6 text-[10px] font-bold bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full uppercase">
                FAST
              </span>
              <MessageSquare className="w-10 h-10 text-teal-600 mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">WhatsApp & SMS Reminders</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Send 1-click WhatsApp payment reminders with invoice amounts directly to tenant phones.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FAQ ACCORDION SECTION
      ========================================================================= */}
      <section id="faq" className="py-20 bg-white border-y border-gray-200/70">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="px-3.5 py-1.5 rounded-full bg-[#035E7B]/10 text-[#035E7B] text-xs font-bold tracking-wider uppercase">
              FREQUENTLY ASKED QUESTIONS
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] mt-4 tracking-tight">
              Got Questions? We Have Answers
            </h2>
            <p className="text-gray-600 mt-4 text-base">
              Everything you need to know about KirayaSaathi's rental platform and features.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'How does the Rent Management Archive feature work?',
                a: 'When a month concludes (e.g., October), you can click "Archive Month". This freezes all rent records for that cycle, saves a permanent historical snapshot in your database, allows you to download an instant audit CSV, and cleanly prepares your dashboard for the next billing cycle.',
              },
              {
                q: 'How does automatic electricity meter reading rollover work?',
                a: "KirayaSaathi connects meter readings between consecutive billing cycles. When a month is archived or when a new reading is entered, the previous month's final reading automatically becomes the new cycle's starting reading, eliminating manual transcription errors.",
              },
              {
                q: 'Can I send rent reminders directly to tenants via WhatsApp?',
                a: 'Yes! KirayaSaathi includes 1-click WhatsApp web reminders where clicking "Send WhatsApp" opens WhatsApp with the tenant\'s phone number and a pre-filled breakdown of rent, electricity, and total dues. Meta Business & Twilio API integration is also pre-configured.',
              },
              {
                q: 'Can I use KirayaSaathi on my mobile phone?',
                a: 'Absolutely. KirayaSaathi is 100% responsive and works smoothly in any modern mobile browser on Android and iOS without needing to install heavy apps.',
              },
              {
                q: 'Is my property and financial data private and secure?',
                a: 'Yes. KirayaSaathi strictly enforces tenant isolation at the database layer. No property owner can ever view or access data belonging to another owner.',
              },
              {
                q: 'Can I manage multiple properties and hostel branches?',
                a: 'Yes. You can manage multiple hostels, PGs, or apartment buildings from a single login, switch between properties with a dropdown, or view aggregate portfolio metrics.',
              },
            ].map((faq, index) => (
              <div
                key={index}
                className="bg-[#F8FAFC] rounded-2xl border border-gray-200 overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  aria-expanded={openFaq === index}
                  aria-controls={`faq-answer-${index}`}
                  className="w-full text-left px-6 py-4.5 font-bold text-gray-900 text-base sm:text-lg flex items-center justify-between gap-4"
                >
                  <span>{faq.q}</span>
                  {openFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-[#035E7B] shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                  )}
                </button>
                {openFaq === index && (
                  <div
                    id={`faq-answer-${index}`}
                    className="px-6 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3"
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          CONTACT US SECTION
      ========================================================================= */}
      <section id="contact" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="px-3.5 py-1.5 rounded-full bg-[#035E7B]/10 text-[#035E7B] text-xs font-bold tracking-wider uppercase">
              GET IN TOUCH
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] mt-4 tracking-tight">
              Let's Build Something Together
            </h2>
            <p className="text-gray-600 mt-4 text-base">
              Have questions about KirayaSaathi, custom integrations, or pricing? Reach out to our team.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-10">
            {/* Contact Details */}
            <div className="lg:col-span-5 bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6">
              <h3 className="text-2xl font-bold text-gray-900">Contact Information</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                We're always available to help hostel, PG, and rental property owners across India.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#EAF4F7] text-[#035E7B] flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase">Office Location</div>
                    <div className="text-sm font-semibold text-gray-900 mt-0.5">Indore, Madhya Pradesh, India</div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#EAF4F7] text-[#035E7B] flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase">Support Email</div>
                    <a href="mailto:kirayasaathi.support@gmail.com" className="text-sm font-semibold text-[#035E7B] hover:underline mt-0.5 block">
                      kirayasaathi.support@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#EAF4F7] text-[#035E7B] flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase">Helpline</div>
                    <a href="tel:+919516637166" className="text-sm font-semibold text-gray-900 hover:text-[#035E7B] transition mt-0.5 block">
                      +91 95166 37166
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#EAF4F7] text-[#035E7B] flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase">Working Hours</div>
                    <div className="text-sm font-semibold text-gray-900 mt-0.5">Mon - Sat | 9:00 AM - 7:00 PM IST</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Contact Form */}
            <div className="lg:col-span-7 bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
              {contactSubmitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Thank You!</h3>
                  <p className="text-gray-600 text-sm max-w-md mx-auto">
                    Your message has been received. A KirayaSaathi property specialist will get in touch with you shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => setContactSubmitted(false)}
                    className="px-6 py-2.5 bg-[#035E7B] text-white font-semibold rounded-xl text-sm"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact-name" className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                        Full Name *
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#035E7B]"
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-email" className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                        Email Address *
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#035E7B]"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact-phone" className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                        Phone Number *
                      </label>
                      <input
                        id="contact-phone"
                        type="tel"
                        required
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="Enter your mobile number"
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#035E7B]"
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-property-type" className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                        Property Type
                      </label>
                      <select
                        id="contact-property-type"
                        value={contactPropertyType}
                        onChange={(e) => setContactPropertyType(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#035E7B] bg-white"
                      >
                        <option value="Hostel">Hostel</option>
                        <option value="PG">Paying Guest (PG)</option>
                        <option value="Apartment">Apartment Building</option>
                        <option value="Rental House">Independent House</option>
                        <option value="Commercial">Commercial / Shop</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contact-message" className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                      Message / Requirement
                    </label>
                    <textarea
                      id="contact-message"
                      rows={4}
                      required
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Tell us about your properties or questions..."
                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#035E7B]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={contactLoading}
                    className="w-full py-3.5 bg-[#035E7B] hover:bg-[#024B63] text-white font-bold rounded-xl text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {contactLoading ? (
                      <>
                        <RotateCw className="w-4 h-4 animate-spin" />
                        <span>Sending message...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FOOTER
      ========================================================================= */}
      <footer className="bg-[#0F172A] text-white pt-16 pb-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-gray-800">
            {/* Brand Narrative */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-xs">
                  <img src="/images/logo.png" alt="KirayaSaathi Logo" className="w-full h-full object-contain" />
                </div>
                <span className="text-2xl font-bold tracking-tight text-white font-display">
                  KirayaSaathi
                </span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
                Smart Rental Management Platform for Hostel, PG & Property Owners. Manage properties,
                tenants, rent, electricity sub-meters and invoices from one dashboard.
              </p>
              <div className="text-xs text-gray-400 flex items-center gap-1.5 pt-2">
                <span>🇮🇳</span>
                <span>Proudly Built for India</span>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h5 className="text-sm font-bold uppercase tracking-wider text-gray-200 mb-4">
                Product
              </h5>
              <ul className="space-y-2.5 text-sm text-gray-400">
                <li><a href="/blog" className="text-white font-bold hover:text-white transition">Blog & Knowledge Hub</a></li>
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Pricing Plans</a></li>
                <li><a href="#roi" className="hover:text-white transition">ROI Calculator</a></li>
                <li><a href="#demo" className="hover:text-white transition">Interactive Demo</a></li>
                <li><a href="#security" className="hover:text-white transition">Security & Trust</a></li>
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h5 className="text-sm font-bold uppercase tracking-wider text-gray-200 mb-4">
                Company
              </h5>
              <ul className="space-y-2.5 text-sm text-gray-400">
                <li><a href="/blog" className="hover:text-white transition">Latest News</a></li>
                <li><a href="#about" className="hover:text-white transition">About Us</a></li>
                <li><a href="#about" className="hover:text-white transition">Founder & Vision</a></li>
                <li><a href="#testimonials" className="hover:text-white transition">Customer Reviews</a></li>
                <li><a href="#contact" className="hover:text-white transition">Contact Us</a></li>
              </ul>
            </div>

            {/* Newsletter Subscription */}
            <div>
              <h5 className="text-sm font-bold uppercase tracking-wider text-gray-200 mb-4">
                Stay Updated
              </h5>
              <p className="text-xs text-gray-400 mb-3">
                Get product updates and rental management tips.
              </p>
              {newsletterSubscribed ? (
                <div className="text-xs text-emerald-400 font-semibold bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-800">
                  ✓ Subscribed! Thank you.
                </div>
              ) : (
                <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                  <label htmlFor="newsletter-email" className="sr-only">
                    Email address for newsletter updates
                  </label>
                  <input
                    id="newsletter-email"
                    type="email"
                    required
                    aria-label="Email address for newsletter updates"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Your email address"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 outline-none focus:border-[#035E7B]"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 bg-[#035E7B] hover:bg-[#024B63] text-white text-xs font-bold rounded-xl transition"
                  >
                    Subscribe
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-4">
            <div>
              © 2026 KirayaSaathi Technologies. All Rights Reserved.
            </div>
            <div className="flex items-center gap-6">
              <a href="#hero" className="hover:text-white transition">Privacy Policy</a>
              <a href="#hero" className="hover:text-white transition">Terms of Service</a>
              <button
                type="button"
                onClick={onOpenAdminPortal || (() => { window.location.hash = '#admin-portal'; })}
                className="hover:text-amber-400 text-gray-400 transition inline-flex items-center gap-1 font-mono text-[11px]"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                <span>Admin Console</span>
              </button>
              <span className="text-gray-400">Version 1.0 Production</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
