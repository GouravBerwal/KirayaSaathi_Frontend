import { useState, useEffect, type FormEvent } from "react";
import {
  ShieldCheck,
  Building,
  Users,
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  Search,
  ExternalLink,
  HelpCircle,
  ShieldAlert,
  Eye,
  LogOut,
  UserCheck,
  UserX,
  Filter,
  Check,
  X,
} from "lucide-react";
import { apiRequest, ApiError, API_BASE_URL } from "../utils/api";

interface VerificationRequestItem {
  id: number;
  owner: number;
  owner_username: string;
  owner_email: string;
  property_name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  property_type: string;
  relationship: string;
  ownership_proof: string;
  utility_bill?: string | null;
  authorization_letter?: string | null;
  notes?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_MORE_INFORMATION";
  submitted_at: string;
  reviewed_at?: string | null;
  reviewed_by_username?: string;
  owner_facing_message?: string;
  rejection_reason?: string;
}

interface OwnerItem {
  id: number;
  username: string;
  email: string;
  full_name: string;
  is_staff: boolean;
  is_superuser: boolean;
  is_active: boolean;
  email_verified: boolean;
  approval_status: "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_MORE_INFORMATION";
  access_status: "ACTIVE" | "SUSPENDED" | "REVOKED";
  approved_at?: string | null;
  approved_by?: string | null;
  suspension_reason?: string;
  revocation_reason?: string;
  properties_count: number;
  date_joined: string;
}

interface AuditLogItem {
  id: number;
  owner: number;
  owner_username: string;
  performed_by_username: string;
  action: string;
  notes: string;
  ip_address?: string;
  created_at: string;
}

interface AdminPortalPageProps {
  onExit?: () => void;
}

export default function AdminPortalPage({ onExit }: AdminPortalPageProps) {
  const [activeTab, setActiveTab] = useState<"requests" | "owners" | "audit">("requests");

  // Authentication check for admin
  const [isAdminUser, setIsAdminUser] = useState<boolean | null>(null);
  const [currentAdminName, setCurrentAdminName] = useState<string>("");

  // Login fields for unauthenticated admin access
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Data states
  const [requests, setRequests] = useState<VerificationRequestItem[]>([]);
  const [owners, setOwners] = useState<OwnerItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Requests filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Owners filters
  const [ownerSearchQuery, setOwnerSearchQuery] = useState<string>("");
  const [ownerStatusFilter, setOwnerStatusFilter] = useState<string>("ALL");

  // Audit filters
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>("");

  // Global notice banner
  const [statusNotice, setStatusNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Action Modals
  const [actionModal, setActionModal] = useState<{
    type: "approve" | "reject" | "more_info" | "grant" | "suspend" | "restore" | "revoke";
    targetId: number;
    targetTitle: string;
  } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  // Check admin authorization on mount
  useEffect(() => {
    checkAdminAuth();
  }, []);

  async function checkAdminAuth() {
    try {
      const adminToken = sessionStorage.getItem("kiraya_admin_token");
      if (adminToken) {
        try {
          const res = await apiRequest<{
            authenticated: boolean;
            admin_user?: { username: string; is_staff: boolean; is_superuser: boolean };
          }>("/api/admin/auth/me/");
          if (res.authenticated && res.admin_user) {
            setIsAdminUser(true);
            setCurrentAdminName(res.admin_user.username);
            await loadAdminData();
            return;
          }
        } catch {
          sessionStorage.removeItem("kiraya_admin_token");
        }
      }

      const me = await apiRequest<{
        id: number;
        username: string;
        is_staff?: boolean;
        is_superuser?: boolean;
      }>("/api/auth/me/");

      if (me.is_staff || me.is_superuser) {
        setIsAdminUser(true);
        setCurrentAdminName(me.username);
        await loadAdminData();
      } else {
        setIsAdminUser(false);
      }
    } catch {
      setIsAdminUser(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAdminLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const res = await apiRequest<{
        detail: string;
        admin_token: string;
        admin_user: { username: string; is_staff: boolean; is_superuser: boolean };
      }>("/api/admin/auth/login/", {
        method: "POST",
        body: {
          identifier: adminUsername.trim(),
          password: adminPassword,
        },
      });

      if (res && res.admin_token) {
        sessionStorage.setItem("kiraya_admin_token", res.admin_token);
        setIsAdminUser(true);
        setCurrentAdminName(res.admin_user.username);
        await loadAdminData();
      } else {
        setLoginError("Failed to authenticate as administrator.");
        setIsAdminUser(false);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setLoginError(err.message);
      } else {
        setLoginError("Invalid administrator credentials. Please check your username and password.");
      }
    } finally {
      setLoginLoading(false);
    }
  }

  async function loadAdminData() {
    setIsLoading(true);
    try {
      const [reqs, owns, logs] = await Promise.all([
        apiRequest<VerificationRequestItem[]>("/api/admin/verification-requests/"),
        apiRequest<OwnerItem[]>("/api/admin/owners/"),
        apiRequest<AuditLogItem[]>("/api/admin/audit-logs/"),
      ]);
      setRequests(Array.isArray(reqs) ? reqs : []);
      setOwners(Array.isArray(owns) ? owns : []);
      setAuditLogs(Array.isArray(logs) ? logs : []);
    } catch (e) {
      console.error("Failed to load admin portal data", e);
      setStatusNotice({
        type: "error",
        message: "Failed to load admin data from server. Please refresh.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Handle Review Action (Approve / Reject / More Info)
  async function submitReviewAction() {
    if (!actionModal) return;
    setActionError("");
    setActionSubmitting(true);

    const { type, targetId, targetTitle } = actionModal;
    let endpointAction = "APPROVE";
    if (type === "reject") endpointAction = "REJECT";
    if (type === "more_info") endpointAction = "REQUEST_MORE_INFO";

    try {
      await apiRequest(`/api/admin/verification-requests/${targetId}/review/`, {
        method: "POST",
        body: {
          action: endpointAction,
          owner_facing_message: actionReason.trim(),
          rejection_reason: type === "reject" ? actionReason.trim() : "",
          internal_notes: `Processed by ${currentAdminName}`,
        },
      });

      setStatusNotice({
        type: "success",
        message: `Successfully processed review for "${targetTitle}". Notification email dispatched.`,
      });

      setActionModal(null);
      setActionReason("");
      await loadAdminData();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError("Failed to submit review action.");
      }
    } finally {
      setActionSubmitting(false);
    }
  }

  // Handle Access Management Action (Grant / Suspend / Restore / Revoke)
  async function executeAccessAction() {
    if (!actionModal) return;
    setActionError("");
    setActionSubmitting(true);

    const { type, targetId, targetTitle } = actionModal;

    try {
      await apiRequest(`/api/admin/owners/${targetId}/manage-access/`, {
        method: "POST",
        body: {
          action: type,
          reason: actionReason.trim(),
        },
      });

      setStatusNotice({
        type: "success",
        message: `Successfully executed "${type.toUpperCase()}" action on owner "${targetTitle}".`,
      });

      setActionModal(null);
      setActionReason("");
      await loadAdminData();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError("Failed to update owner access status.");
      }
    } finally {
      setActionSubmitting(false);
    }
  }

  async function handleLogout() {
    sessionStorage.removeItem("kiraya_admin_token");
    setIsAdminUser(false);
    if (onExit) onExit();
  }

  // =========================================================================
  // VIEW 1: LOADING SESSION
  // =========================================================================
  if (isAdminUser === null) {
    return (
      <main className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
        <div className="text-center text-slate-300">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-4">
            <RotateCw className="w-7 h-7 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-white">Connecting to Admin Console...</h2>
          <p className="text-xs text-slate-400 mt-1">Verifying administrator authorization privileges</p>
        </div>
      </main>
    );
  }

  // =========================================================================
  // VIEW 2: ADMIN LOGIN (IF NOT AUTHENTICATED AS STAFF/ADMIN)
  // =========================================================================
  if (isAdminUser === false) {
    return (
      <main className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
        <section className="w-full max-w-md bg-[#1E293B] rounded-2xl p-6 sm:p-8 border border-slate-700 shadow-2xl text-white">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-3">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">KirayaSaathi Admin Console</h1>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Restricted Area: Platform Staff & Administrator Authorization Required
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-400 text-[11px] leading-relaxed mb-4">
            <span className="font-semibold text-amber-400 block mb-0.5">💡 Multi-User Testing Tip:</span>
            Browsers share cookies across tabs. If testing as a new Owner in your main browser, open this Admin Console in an <strong className="text-slate-200">Incognito / Private Window</strong> to approve requests without overwriting the owner session.
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Admin Username or Email
              </label>
              <input
                type="text"
                required
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="Enter admin username"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500 transition"
              />
            </div>

            {loginError && (
              <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-800 text-red-200 text-xs leading-relaxed flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm hover:bg-amber-400 transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-amber-500/20"
            >
              {loginLoading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  Verifying Credentials...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Sign In as Administrator
                </>
              )}
            </button>

            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="w-full text-center text-xs text-slate-400 hover:text-slate-200 transition pt-2 block"
              >
                ← Back to Public Website
              </button>
            )}
          </form>
        </section>
      </main>
    );
  }

  // =========================================================================
  // VIEW 3: AUTHENTICATED ADMIN CONSOLE
  // =========================================================================
  const filteredRequests = requests.filter((r) => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchOwner =
        r.owner_username.toLowerCase().includes(q) ||
        r.owner_email.toLowerCase().includes(q);
      const matchProp =
        r.property_name.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q);
      if (!matchOwner && !matchProp) return false;
    }
    return true;
  });

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const moreInfoCount = requests.filter((r) => r.status === "NEEDS_MORE_INFORMATION").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = requests.filter((r) => r.status === "REJECTED").length;

  const filteredOwners = owners.filter((o) => {
    if (ownerStatusFilter === "APPROVED" && o.approval_status !== "APPROVED") return false;
    if (ownerStatusFilter === "PENDING" && o.approval_status !== "PENDING") return false;
    if (ownerStatusFilter === "UNVERIFIED" && o.email_verified) return false;
    if (ownerStatusFilter === "SUSPENDED" && o.access_status !== "SUSPENDED") return false;
    if (ownerStatusFilter === "REVOKED" && o.access_status !== "REVOKED") return false;

    if (ownerSearchQuery.trim()) {
      const q = ownerSearchQuery.toLowerCase();
      const matchName =
        o.username.toLowerCase().includes(q) ||
        (o.full_name && o.full_name.toLowerCase().includes(q));
      const matchEmail = o.email.toLowerCase().includes(q);
      if (!matchName && !matchEmail) return false;
    }
    return true;
  });

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (!auditSearchQuery.trim()) return true;
    const q = auditSearchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.owner_username.toLowerCase().includes(q) ||
      log.performed_by_username.toLowerCase().includes(q) ||
      log.notes.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-[#1E293B] border-b border-slate-800 px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-lg shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-white text-base sm:text-lg tracking-tight">KirayaSaathi</h1>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider">
                Admin Console
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] font-medium text-slate-400">
              Property Verification & Owner Lifecycle Management
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 ml-auto">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-200">{currentAdminName}</span>
            <span className="text-[11px] text-amber-400 font-mono">Platform Admin</span>
          </div>

          <a
            href="/admin/"
            target="_blank"
            rel="noreferrer"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 transition"
          >
            <span>Django Admin</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-xs font-semibold text-red-300 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Exit Console</span>
          </button>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="bg-[#1E293B]/80 border-b border-slate-800 px-4 sm:px-6 py-2 flex items-center gap-2 overflow-x-auto sticky top-[57px] sm:top-[69px] z-30 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setActiveTab("requests")}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 ${
            activeTab === "requests"
              ? "bg-amber-500 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Verification Requests</span>
          {pendingCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === "requests" ? "bg-slate-950 text-amber-400" : "bg-amber-500 text-slate-950"
              }`}
            >
              {pendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("owners")}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 ${
            activeTab === "owners"
              ? "bg-amber-500 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Owner Accounts ({owners.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 ${
            activeTab === "audit"
              ? "bg-amber-500 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Audit Trail ({auditLogs.length})</span>
        </button>

        <button
          type="button"
          onClick={loadAdminData}
          title="Refresh All Data"
          className="ml-auto p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      {/* Main Tab Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Global Notice Banner */}
        {statusNotice && (
          <div
            className={`p-4 rounded-xl mb-6 border flex items-center justify-between text-xs sm:text-sm animate-in fade-in transition ${
              statusNotice.type === "success"
                ? "bg-emerald-950/80 border-emerald-700 text-emerald-200"
                : "bg-red-950/80 border-red-700 text-red-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusNotice.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{statusNotice.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusNotice(null)}
              className="p-1 rounded-md text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 1: VERIFICATION REQUESTS                                   */}
        {/* ============================================================== */}
        {activeTab === "requests" && (
          <div className="space-y-6">
            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1E293B] p-4 rounded-2xl border border-slate-800">
              {/* Status Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { key: "ALL", label: `All (${requests.length})` },
                  { key: "PENDING", label: `Pending (${pendingCount})` },
                  { key: "NEEDS_MORE_INFORMATION", label: `Needs Info (${moreInfoCount})` },
                  { key: "APPROVED", label: `Approved (${approvedCount})` },
                  { key: "REJECTED", label: `Rejected (${rejectedCount})` },
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setStatusFilter(f.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      statusFilter === f.key
                        ? "bg-slate-700 text-white font-bold border border-slate-600 shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative min-w-[240px] md:w-72">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search owner, email, property..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* Requests List */}
            {isLoading ? (
              <div className="py-20 text-center text-slate-500 flex items-center justify-center gap-2">
                <RotateCw className="w-5 h-5 animate-spin" />
                <span>Loading verification requests from database...</span>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="bg-[#1E293B] rounded-2xl p-12 text-center border border-slate-800">
                <FileCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-300">No verification requests found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {statusFilter !== "ALL" || searchQuery
                    ? "Try clearing the search query or status filter to see other requests."
                    : "No property owners have submitted verification requests yet. New submissions will appear here automatically."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-[#1E293B] rounded-2xl p-5 border border-slate-800 shadow-sm hover:border-slate-700 transition"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-xs font-mono font-bold text-amber-400">
                            REQ #{req.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider uppercase ${
                              req.status === "APPROVED"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : req.status === "PENDING"
                                ? "bg-amber-950 text-amber-400 border border-amber-800"
                                : req.status === "NEEDS_MORE_INFORMATION"
                                ? "bg-sky-950 text-sky-400 border border-sky-800"
                                : "bg-red-950 text-red-400 border border-red-800"
                            }`}
                          >
                            {req.status}
                          </span>
                          <span className="text-xs text-slate-500">
                            Submitted: {new Date(req.submitted_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                          <Building className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>{req.property_name}</span>
                          <span className="text-xs font-normal text-slate-400">({req.property_type})</span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          {req.address}, {req.city}, {req.state} - {req.postal_code}
                        </p>
                      </div>

                      {/* Owner Details */}
                      <div className="bg-slate-900/80 rounded-xl px-4 py-2.5 border border-slate-800 text-xs shrink-0">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Applicant / Owner
                        </span>
                        <p className="font-bold text-slate-200 mt-0.5">{req.owner_username}</p>
                        <p className="text-slate-400 font-mono text-[11px]">{req.owner_email}</p>
                        <p className="text-[11px] text-amber-400 mt-0.5">Role: {req.relationship}</p>
                      </div>
                    </div>

                    {/* Document Proofs & Review Actions */}
                    <div className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Document Links */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400 mr-1">
                          Uploaded Evidence:
                        </span>

                        <a
                          href={`${API_BASE_URL}/api/auth/verification-requests/${req.id}/document/ownership_proof/`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-bold text-amber-300 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ownership Proof</span>
                        </a>

                        {req.utility_bill && (
                          <a
                            href={`${API_BASE_URL}/api/auth/verification-requests/${req.id}/document/utility_bill/`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Utility Bill</span>
                          </a>
                        )}

                        {req.authorization_letter && (
                          <a
                            href={`${API_BASE_URL}/api/auth/verification-requests/${req.id}/document/authorization_letter/`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Authorization Letter</span>
                          </a>
                        )}
                      </div>

                      {/* Admin Decision Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        {req.status !== "APPROVED" && (
                          <button
                            type="button"
                            onClick={() =>
                              setActionModal({
                                type: "approve",
                                targetId: req.id,
                                targetTitle: `${req.owner_username} — ${req.property_name}`,
                              })
                            }
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve Request</span>
                          </button>
                        )}

                        {req.status !== "REJECTED" && (
                          <button
                            type="button"
                            onClick={() =>
                              setActionModal({
                                type: "reject",
                                targetId: req.id,
                                targetTitle: `${req.owner_username} — ${req.property_name}`,
                              })
                            }
                            className="px-3 py-1.5 rounded-lg bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 font-bold text-xs transition flex items-center gap-1.5"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            setActionModal({
                              type: "more_info",
                              targetId: req.id,
                              targetTitle: `${req.owner_username} — ${req.property_name}`,
                            })
                          }
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold text-xs transition flex items-center gap-1.5"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Request More Info</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: OWNER ACCESS MANAGEMENT                                 */}
        {/* ============================================================== */}
        {activeTab === "owners" && (
          <div className="space-y-4">
            {/* Owner Filters & Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1E293B] p-4 rounded-2xl border border-slate-800">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { key: "ALL", label: `All Owners (${owners.length})` },
                  { key: "APPROVED", label: "Approved" },
                  { key: "PENDING", label: "Pending" },
                  { key: "UNVERIFIED", label: "Unverified" },
                  { key: "SUSPENDED", label: "Suspended" },
                  { key: "REVOKED", label: "Revoked" },
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setOwnerStatusFilter(f.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      ownerStatusFilter === f.key
                        ? "bg-slate-700 text-white font-bold border border-slate-600 shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[240px] md:w-72">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={ownerSearchQuery}
                  onChange={(e) => setOwnerSearchQuery(e.target.value)}
                  placeholder="Search owners by name, email..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-[#1E293B] rounded-2xl overflow-hidden border border-slate-800 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Owner Profile</th>
                      <th className="py-3.5 px-4">Email Status</th>
                      <th className="py-3.5 px-4">Property Verification</th>
                      <th className="py-3.5 px-4">Access State</th>
                      <th className="py-3.5 px-4">Properties</th>
                      <th className="py-3.5 px-4 text-right">Access Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {filteredOwners.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-800/50 transition">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-white text-sm">{o.username}</p>
                          <p className="text-slate-400 font-mono text-[11px]">{o.email}</p>
                          {o.is_superuser && (
                            <span className="text-[10px] text-amber-400 font-bold uppercase">Superuser</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {o.email_verified ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-[11px] font-semibold border border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[11px] font-semibold">
                              Unverified
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              o.approval_status === "APPROVED"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : o.approval_status === "PENDING"
                                ? "bg-amber-950 text-amber-400 border border-amber-800"
                                : o.approval_status === "NEEDS_MORE_INFORMATION"
                                ? "bg-sky-950 text-sky-400 border border-sky-800"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {o.approval_status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              o.access_status === "ACTIVE"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : o.access_status === "SUSPENDED"
                                ? "bg-orange-950 text-orange-400 border border-orange-800"
                                : "bg-red-950 text-red-400 border border-red-800"
                            }`}
                          >
                            {o.access_status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-300">
                          {o.properties_count}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                            {o.approval_status !== "APPROVED" && (
                              <button
                                type="button"
                                onClick={() =>
                                  setActionModal({
                                    type: "grant",
                                    targetId: o.id,
                                    targetTitle: `${o.username} (${o.email})`,
                                  })
                                }
                                className="px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[11px] transition shadow"
                              >
                                Approve & Activate
                              </button>
                            )}

                            {o.access_status === "ACTIVE" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActionModal({
                                      type: "suspend",
                                      targetId: o.id,
                                      targetTitle: `${o.username} (${o.email})`,
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-md bg-amber-950/80 hover:bg-amber-900 border border-amber-700 text-amber-300 font-semibold text-[11px] transition"
                                >
                                  Put On Hold
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActionModal({
                                      type: "revoke",
                                      targetId: o.id,
                                      targetTitle: `${o.username} (${o.email})`,
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-md bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 font-semibold text-[11px] transition"
                                >
                                  Reject
                                </button>
                              </>
                            ) : o.access_status === "SUSPENDED" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActionModal({
                                      type: "restore",
                                      targetId: o.id,
                                      targetTitle: `${o.username} (${o.email})`,
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-md bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-[11px] transition"
                                >
                                  Restore
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActionModal({
                                      type: "revoke",
                                      targetId: o.id,
                                      targetTitle: `${o.username} (${o.email})`,
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-md bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 font-semibold text-[11px] transition"
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setActionModal({
                                    type: "grant",
                                    targetId: o.id,
                                    targetTitle: `${o.username} (${o.email})`,
                                  })
                                }
                                className="px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[11px] transition"
                              >
                                Re-Approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden space-y-3">
              {filteredOwners.map((o) => (
                <div
                  key={o.id}
                  className="bg-[#1E293B] rounded-2xl p-4 border border-slate-800 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-white text-sm">{o.username}</h4>
                      <p className="text-slate-400 font-mono text-xs">{o.email}</p>
                    </div>
                    {o.is_superuser && (
                      <span className="text-[10px] text-amber-400 font-bold uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Superuser
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        o.email_verified
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {o.email_verified ? "Email Verified" : "Email Unverified"}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        o.approval_status === "APPROVED"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : o.approval_status === "PENDING"
                          ? "bg-amber-950 text-amber-400 border border-amber-800"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {o.approval_status}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        o.access_status === "ACTIVE"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : "bg-red-950 text-red-400 border border-red-800"
                      }`}
                    >
                      {o.access_status}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400">
                      Properties: <strong className="text-white">{o.properties_count}</strong>
                    </span>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {o.approval_status !== "APPROVED" && (
                        <button
                          type="button"
                          onClick={() =>
                            setActionModal({
                              type: "grant",
                              targetId: o.id,
                              targetTitle: `${o.username} (${o.email})`,
                            })
                          }
                          className="px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs"
                        >
                          Approve
                        </button>
                      )}

                      {o.access_status === "ACTIVE" ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setActionModal({
                                type: "suspend",
                                targetId: o.id,
                                targetTitle: `${o.username} (${o.email})`,
                              })
                            }
                            className="px-2 py-1 rounded-md bg-amber-950/80 border border-amber-700 text-amber-300 font-semibold text-xs"
                          >
                            Hold
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActionModal({
                                type: "revoke",
                                targetId: o.id,
                                targetTitle: `${o.username} (${o.email})`,
                              })
                            }
                            className="px-2 py-1 rounded-md bg-red-950 border border-red-800 text-red-300 font-semibold text-xs"
                          >
                            Reject
                          </button>
                        </>
                      ) : o.access_status === "SUSPENDED" ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setActionModal({
                                type: "restore",
                                targetId: o.id,
                                targetTitle: `${o.username} (${o.email})`,
                              })
                            }
                            className="px-2 py-1 rounded-md bg-emerald-800 text-white font-bold text-xs"
                          >
                            Restore
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActionModal({
                                type: "revoke",
                                targetId: o.id,
                                targetTitle: `${o.username} (${o.email})`,
                              })
                            }
                            className="px-2 py-1 rounded-md bg-red-950 border border-red-800 text-red-300 font-semibold text-xs"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setActionModal({
                              type: "grant",
                              targetId: o.id,
                              targetTitle: `${o.username} (${o.email})`,
                            })
                          }
                          className="px-2.5 py-1 rounded-md bg-emerald-700 text-white font-bold text-xs"
                        >
                          Re-Approve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: AUDIT TRAIL                                             */}
        {/* ============================================================== */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#1E293B] p-4 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-400 font-semibold">
                Chronological Platform Activity Logs ({filteredAuditLogs.length} entries)
              </span>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={auditSearchQuery}
                  onChange={(e) => setAuditSearchQuery(e.target.value)}
                  placeholder="Filter audit entries..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>

            <div className="bg-[#1E293B] rounded-2xl overflow-hidden border border-slate-800 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Timestamp</th>
                      <th className="py-3.5 px-4">Action</th>
                      <th className="py-3.5 px-4">Target Owner</th>
                      <th className="py-3.5 px-4">Performed By</th>
                      <th className="py-3.5 px-4">Details / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300 font-mono text-[11px]">
                    {filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/50 transition">
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-amber-400">{log.action}</span>
                        </td>
                        <td className="py-3 px-4 text-white font-semibold">{log.owner_username}</td>
                        <td className="py-3 px-4 text-slate-300">{log.performed_by_username}</td>
                        <td className="py-3 px-4 text-slate-300 font-sans text-xs">{log.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* ACTION CONFIRMATION MODAL                                      */}
      {/* ============================================================== */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#1E293B] border border-slate-700 rounded-2xl p-6 shadow-2xl text-white">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  actionModal.type === "approve" || actionModal.type === "grant" || actionModal.type === "restore"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : actionModal.type === "reject" || actionModal.type === "revoke"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-amber-500/20 text-amber-400"
                }`}
              >
                {actionModal.type === "approve" || actionModal.type === "grant" || actionModal.type === "restore" ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  {actionModal.type === "approve" && "Confirm Verification Approval"}
                  {actionModal.type === "grant" && "Directly Grant Workspace Access"}
                  {actionModal.type === "restore" && "Restore Owner Access"}
                  {actionModal.type === "reject" && "Reject Verification Request"}
                  {actionModal.type === "more_info" && "Request Additional Information"}
                  {actionModal.type === "suspend" && "Suspend Owner Access"}
                  {actionModal.type === "revoke" && "Revoke Owner Access Privileges"}
                </h3>
                <p className="text-xs text-slate-400">{actionModal.targetTitle}</p>
              </div>
            </div>

            {/* Modal Input Body */}
            <div className="space-y-3 mb-6">
              {actionModal.type === "approve" && (
                <p className="text-xs text-slate-300 leading-relaxed">
                  Approving this request will verify property ownership and immediately grant the owner full dashboard access. The workspace-ready welcome email will be dispatched.
                </p>
              )}

              {actionModal.type === "grant" && (
                <p className="text-xs text-slate-300 leading-relaxed">
                  Directly granting approval will activate the owner's dashboard workspace without requiring further document review. The welcome email will be sent automatically.
                </p>
              )}

              {actionModal.type === "restore" && (
                <p className="text-xs text-slate-300 leading-relaxed">
                  Restoring access will lift any existing suspension and allow this owner to log in and manage their properties again.
                </p>
              )}

              {(actionModal.type === "reject" ||
                actionModal.type === "more_info" ||
                actionModal.type === "suspend" ||
                actionModal.type === "revoke") && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {actionModal.type === "reject" && "Rejection Note (Owner will receive this in email) *"}
                    {actionModal.type === "more_info" && "Instructions / Note for Putting On Hold (Sent via email) *"}
                    {actionModal.type === "suspend" && "Reason / Note for Putting Account On Hold (Sent via email) *"}
                    {actionModal.type === "revoke" && "Rejection Note (Owner will receive this in email) *"}
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Enter administrator note to be sent to the owner..."
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {actionError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs">
                  {actionError}
                </div>
              )}
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setActionModal(null);
                  setActionReason("");
                  setActionError("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={actionSubmitting}
                onClick={() => {
                  if (
                    actionModal.type === "grant" ||
                    actionModal.type === "suspend" ||
                    actionModal.type === "restore" ||
                    actionModal.type === "revoke"
                  ) {
                    executeAccessAction();
                  } else {
                    submitReviewAction();
                  }
                }}
                className={`px-5 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 shadow-md disabled:opacity-50 ${
                  actionModal.type === "approve" || actionModal.type === "grant" || actionModal.type === "restore"
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                    : actionModal.type === "reject" || actionModal.type === "revoke"
                    ? "bg-red-600 hover:bg-red-500 text-white"
                    : "bg-amber-500 hover:bg-amber-400 text-slate-950"
                }`}
              >
                {actionSubmitting && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {actionModal.type === "approve" && "Confirm Approval & Activate"}
                  {actionModal.type === "grant" && "Grant Access"}
                  {actionModal.type === "restore" && "Confirm Restore"}
                  {actionModal.type === "reject" && "Confirm Rejection"}
                  {actionModal.type === "more_info" && "Send Info Request"}
                  {actionModal.type === "suspend" && "Confirm Suspension"}
                  {actionModal.type === "revoke" && "Confirm Revocation"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}