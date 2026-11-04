import { useState, useEffect, type FormEvent, type ChangeEvent } from "react";
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
  EyeOff,
  LogOut,
  UserCheck,
  UserX,
  Filter,
  Check,
  X,
  BookOpen,
  Plus,
  Trash2,
  Edit3,
  Image as ImageIcon,
  UploadCloud,
  Globe,
  Tag,
  Sparkles,
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

interface AdminBlogItem {
  id: number;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  cover_image: string;
  author_name: string;
  author_role: string;
  read_time: string;
  tags: string;
  is_published: boolean;
  is_featured: boolean;
  views_count: number;
  created_at: string;
  formatted_date?: string;
}

interface AdminPortalPageProps {
  onExit?: () => void;
}

export default function AdminPortalPage({ onExit }: AdminPortalPageProps) {
  const [activeTab, setActiveTab] = useState<"requests" | "owners" | "audit" | "blogs">("requests");

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
  const [adminBlogs, setAdminBlogs] = useState<AdminBlogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Requests filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Owners filters
  const [ownerSearchQuery, setOwnerSearchQuery] = useState<string>("");
  const [ownerStatusFilter, setOwnerStatusFilter] = useState<string>("ALL");

  // Audit filters
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>("");

  // Blog Management Filters & Form State
  const [blogSearchQuery, setBlogSearchQuery] = useState("");
  const [blogCategoryFilter, setBlogCategoryFilter] = useState("ALL");
  const [blogModalOpen, setBlogModalOpen] = useState(false);
  const [blogModalMode, setBlogModalMode] = useState<"create" | "edit">("create");
  const [editingBlogId, setEditingBlogId] = useState<number | null>(null);
  const [blogForm, setBlogForm] = useState({
    title: "",
    slug: "",
    category: "Tenant Management",
    excerpt: "",
    content: "",
    cover_image: "",
    author_name: "Gourav Berwal",
    author_role: "Founder & Creator of KirayaSaathi",
    read_time: "5 min read",
    tags: "",
    is_featured: false,
    is_published: true,
  });
  const [blogSaving, setBlogSaving] = useState(false);
  const [blogImageUploading, setBlogImageUploading] = useState(false);
  const [blogFormError, setBlogFormError] = useState("");

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
        admin_token?: string;
      }>("/api/auth/me/");

      if (me.is_staff || me.is_superuser) {
        if (me.admin_token) {
          sessionStorage.setItem("kiraya_admin_token", me.admin_token);
        }
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
      const [reqs, owns, logs, blogs] = await Promise.all([
        apiRequest<VerificationRequestItem[]>("/api/admin/verification-requests/"),
        apiRequest<OwnerItem[]>("/api/admin/owners/"),
        apiRequest<AuditLogItem[]>("/api/admin/audit-logs/"),
        apiRequest<AdminBlogItem[]>("/api/admin/blogs/").catch(() => []),
      ]);
      setRequests(Array.isArray(reqs) ? reqs : []);
      setOwners(Array.isArray(owns) ? owns : []);
      setAuditLogs(Array.isArray(logs) ? logs : []);
      setAdminBlogs(Array.isArray(blogs) ? blogs : []);
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

  // =========================================================================
  // BLOG MANAGEMENT HANDLERS
  // =========================================================================

  function openCreateBlogModal() {
    setBlogModalMode("create");
    setEditingBlogId(null);
    setBlogFormError("");
    setBlogForm({
      title: "",
      slug: "",
      category: "Tenant Management",
      excerpt: "",
      content: "<h2>Introduction</h2>\n<p>Write your article introduction here...</p>\n\n<h2>Key Guidelines</h2>\n<ul>\n  <li>Guideline point 1</li>\n  <li>Guideline point 2</li>\n</ul>",
      cover_image: "",
      author_name: "Gourav Berwal",
      author_role: "Founder & Creator of KirayaSaathi",
      read_time: "5 min read",
      tags: "Rental, Tenant, PG, India",
      is_featured: false,
      is_published: true,
    });
    setBlogModalOpen(true);
  }

  function openEditBlogModal(blog: AdminBlogItem) {
    setBlogModalMode("edit");
    setEditingBlogId(blog.id);
    setBlogFormError("");
    setBlogForm({
      title: blog.title,
      slug: blog.slug,
      category: blog.category,
      excerpt: blog.excerpt,
      content: blog.content,
      cover_image: blog.cover_image,
      author_name: blog.author_name,
      author_role: blog.author_role,
      read_time: blog.read_time,
      tags: blog.tags || "",
      is_featured: blog.is_featured,
      is_published: blog.is_published,
    });
    setBlogModalOpen(true);
  }

  async function handleSaveBlog(e: FormEvent) {
    e.preventDefault();
    setBlogFormError("");
    if (!blogForm.title.trim()) {
      setBlogFormError("Article title is required.");
      return;
    }
    if (!blogForm.excerpt.trim()) {
      setBlogFormError("Short summary / excerpt is required for search previews.");
      return;
    }
    if (!blogForm.content.trim()) {
      setBlogFormError("Article content cannot be empty.");
      return;
    }

    setBlogSaving(true);
    try {
      if (blogModalMode === "create") {
        await apiRequest("/api/admin/blogs/", {
          method: "POST",
          body: blogForm,
        });
        setStatusNotice({
          type: "success",
          message: `Blog article "${blogForm.title}" published successfully!`,
        });
      } else if (editingBlogId) {
        await apiRequest(`/api/admin/blogs/${editingBlogId}/`, {
          method: "PUT",
          body: blogForm,
        });
        setStatusNotice({
          type: "success",
          message: `Blog article "${blogForm.title}" updated successfully!`,
        });
      }
      setBlogModalOpen(false);
      await loadAdminData();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setBlogFormError(err.message);
      } else {
        setBlogFormError("Failed to save blog post. Please check fields and try again.");
      }
    } finally {
      setBlogSaving(false);
    }
  }

  async function handleDeleteBlog(id: number, title: string) {
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently delete "${title}"? This cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      await apiRequest(`/api/admin/blogs/${id}/`, {
        method: "DELETE",
      });
      setStatusNotice({
        type: "success",
        message: `Blog article "${title}" deleted successfully.`,
      });
      await loadAdminData();
    } catch (err: unknown) {
      setStatusNotice({
        type: "error",
        message: err instanceof ApiError ? err.message : "Failed to delete blog article.",
      });
    }
  }

  async function handleTogglePublish(blog: AdminBlogPost) {
    const nextState = !blog.is_published;
    try {
      await apiRequest(`/api/admin/blogs/${blog.id}/`, {
        method: "PUT",
        body: { is_published: nextState },
      });
      setStatusNotice({
        type: "success",
        message: nextState
          ? `"${blog.title}" is now unhidden and visible on the public blog page!`
          : `"${blog.title}" has been hidden from the public blog page.`,
      });
      setBlogs((prev) =>
        prev.map((b) => (b.id === blog.id ? { ...b, is_published: nextState } : b))
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : (err as any)?.message || "Failed to update blog visibility status.";
      setStatusNotice({
        type: "error",
        message: errMsg,
      });
    }
  }

  async function handleBlogImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    setBlogImageUploading(true);
    setBlogFormError("");
    try {
      const res = await apiRequest<{ url: string }>("/api/admin/blogs/upload-image/", {
        method: "POST",
        body: formData,
      });
      if (res && res.url) {
        const fullUrl = res.url.startsWith("http") ? res.url : `${API_BASE_URL}${res.url}`;
        setBlogForm((prev) => ({ ...prev, cover_image: fullUrl }));
      }
    } catch (err: unknown) {
      setBlogFormError(
        err instanceof ApiError ? err.message : "Failed to upload image. Please try again."
      );
    } finally {
      setBlogImageUploading(false);
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
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 p-2 mx-auto flex items-center justify-center mb-3 shadow-md">
              <img src="/images/logo.png" alt="KirayaSaathi Logo" className="w-full h-full object-contain" />
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

  const filteredBlogs = adminBlogs.filter((b) => {
    if (blogCategoryFilter !== "ALL" && b.category.toLowerCase() !== blogCategoryFilter.toLowerCase()) {
      return false;
    }
    if (blogSearchQuery.trim()) {
      const q = blogSearchQuery.toLowerCase();
      return (
        b.title.toLowerCase().includes(q) ||
        b.excerpt.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        b.author_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-[#1E293B] border-b border-slate-800 px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-xs">
            <img src="/images/logo.png" alt="KirayaSaathi Logo" className="w-full h-full object-contain" />
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
          onClick={() => setActiveTab("blogs")}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 ${
            activeTab === "blogs"
              ? "bg-amber-500 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Blog Manager ({adminBlogs.length})</span>
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

        {/* ============================================================== */}
        {/* TAB 4: BLOG MANAGER                                            */}
        {/* ============================================================== */}
        {activeTab === "blogs" && (
          <div className="space-y-6">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1E293B] p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  <span>Public Blog & SEO Editorial Manager</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Create and manage SEO-optimized rental guides, utility formulas, and property articles that drive Google & AI search traffic.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <a
                  href="/blog"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition inline-flex items-center gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5 text-[#035E7B]" />
                  <span>View Public Blog</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>

                <button
                  type="button"
                  onClick={openCreateBlogModal}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md transition inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Blog Post</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1E293B]/60 p-3 rounded-xl border border-slate-800">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={blogSearchQuery}
                  onChange={(e) => setBlogSearchQuery(e.target.value)}
                  placeholder="Search articles by title, excerpt, author..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">Category:</span>
                <select
                  value={blogCategoryFilter}
                  onChange={(e) => setBlogCategoryFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-500"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Tenant Management">Tenant Management</option>
                  <option value="Electricity Submetering">Electricity Submetering</option>
                  <option value="Rent Laws & Agreements">Rent Laws & Agreements</option>
                  <option value="PG & Hostel Guide">PG & Hostel Guide</option>
                  <option value="Property Investment">Property Investment</option>
                  <option value="General Tips">General Tips</option>
                </select>
              </div>
            </div>

            {/* Blogs Table / List */}
            <div className="bg-[#1E293B] rounded-2xl overflow-hidden border border-slate-800 shadow-sm">
              {filteredBlogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-3">
                  <BookOpen className="w-10 h-10 mx-auto text-slate-600" />
                  <p className="text-sm">No blog posts found matching your criteria.</p>
                  <button
                    type="button"
                    onClick={openCreateBlogModal}
                    className="px-3.5 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs"
                  >
                    Create First Article
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3.5 px-4">Article</th>
                        <th className="py-3.5 px-4">Category</th>
                        <th className="py-3.5 px-4">Author</th>
                        <th className="py-3.5 px-4">Views</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Published Date</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {filteredBlogs.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-800/50 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {b.cover_image ? (
                                <img
                                  src={b.cover_image}
                                  alt={b.title}
                                  className="w-12 h-10 object-cover rounded-lg border border-slate-700 shrink-0"
                                />
                              ) : (
                                <div className="w-12 h-10 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-center shrink-0">
                                  <ImageIcon className="w-4 h-4 text-slate-500" />
                                </div>
                              )}
                              <div className="min-w-0 max-w-sm sm:max-w-md">
                                <div className="font-bold text-white truncate text-sm">{b.title}</div>
                                <div className="text-[11px] text-slate-400 font-mono truncate">/blog/{b.slug}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700">
                              {b.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-medium">
                            {b.author_name}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-amber-400">
                            {b.views_count.toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => handleTogglePublish(b)}
                              className="group cursor-pointer transition focus:outline-none"
                              title={b.is_published ? "Click to Hide blog from public website" : "Click to Unhide / Publish blog to website"}
                            >
                              {b.is_published ? (
                                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1.5 hover:bg-emerald-500/30 transition">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>Visible</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1.5 hover:bg-amber-500/25 transition">
                                  <EyeOff className="w-3 h-3 text-amber-400" />
                                  <span>Hidden (Draft)</span>
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                            {b.created_at ? new Date(b.created_at).toLocaleDateString() : "—"}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* One-click Hide / Unhide Toggle */}
                              <button
                                type="button"
                                onClick={() => handleTogglePublish(b)}
                                className={`p-1.5 rounded-lg border transition ${
                                  b.is_published
                                    ? "bg-slate-800 hover:bg-amber-950/50 text-slate-400 hover:text-amber-400 border-slate-700 hover:border-amber-700/60"
                                    : "bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border-emerald-800/60"
                                }`}
                                title={b.is_published ? "Hide from Public Website" : "Unhide / Publish to Public Website"}
                              >
                                {b.is_published ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <a
                                href={`/blog/${b.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                                title="Preview on Website"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                              <button
                                type="button"
                                onClick={() => openEditBlogModal(b)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition"
                                title="Edit Article"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBlog(b.id, b.title)}
                                className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/60 transition"
                                title="Delete Article"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
      {/* ============================================================== */}
      {/* CREATE / EDIT BLOG POST MODAL                                  */}
      {/* ============================================================== */}
      {blogModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-[#1E293B] border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl text-white my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">
                    {blogModalMode === "create" ? "Create New Blog Post" : "Edit Blog Post"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Publish comprehensive rental guides to attract property owners & tenants.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBlogModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {blogFormError && (
              <div className="mb-6 p-3.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{blogFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveBlog} className="space-y-5 text-xs">
              {/* Title & Slug */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Article Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={blogForm.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setBlogForm((prev) => ({
                        ...prev,
                        title: newTitle,
                        slug:
                          blogModalMode === "create"
                            ? newTitle
                                .toLowerCase()
                                .replace(/[^a-z0-9]+/g, "-")
                                .replace(/(^-|-$)+/g, "")
                            : prev.slug,
                      }));
                    }}
                    placeholder="e.g. 5 Proven Ways to Reduce PG Vacancies"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    URL Slug (e.g. 5-ways-to-reduce-pg-vacancies) *
                  </label>
                  <input
                    type="text"
                    required
                    value={blogForm.slug}
                    onChange={(e) =>
                      setBlogForm((prev) => ({
                        ...prev,
                        slug: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/(^-|-$)+/g, ""),
                      }))
                    }
                    placeholder="article-slug-url"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Category & Read Time */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Category *
                  </label>
                  <select
                    value={blogForm.category}
                    onChange={(e) => setBlogForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-500"
                  >
                    <option value="Tenant Management">Tenant Management</option>
                    <option value="Electricity Submetering">Electricity Submetering</option>
                    <option value="Rent Laws & Agreements">Rent Laws & Agreements</option>
                    <option value="PG & Hostel Guide">PG & Hostel Guide</option>
                    <option value="Property Investment">Property Investment</option>
                    <option value="General Tips">General Tips</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Estimated Read Time
                  </label>
                  <input
                    type="text"
                    value={blogForm.read_time}
                    onChange={(e) => setBlogForm((prev) => ({ ...prev, read_time: e.target.value }))}
                    placeholder="e.g. 5 min read"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Excerpt / Google Meta Description (120-160 characters recommended) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={blogForm.excerpt}
                  onChange={(e) => setBlogForm((prev) => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="Short summary displayed on cards, social previews, and Google search snippets..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-500"
                />
              </div>

              {/* Cover Photo Upload & URL */}
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-700 space-y-3">
                <label className="block text-slate-200 font-bold">
                  Cover Photo / Article Image
                </label>
                <div className="grid sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-8 space-y-2">
                    <input
                      type="text"
                      value={blogForm.cover_image}
                      onChange={(e) => setBlogForm((prev) => ({ ...prev, cover_image: e.target.value }))}
                      placeholder="Paste image URL (https://...) or upload from computer"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-500 font-mono text-xs"
                    />
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 transition">
                        <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
                        <span>{blogImageUploading ? "Uploading..." : "Upload Photo from PC"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBlogImageUpload}
                          disabled={blogImageUploading}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[11px] text-slate-500">Supports JPG, PNG, WEBP</span>
                    </div>
                  </div>

                  <div className="sm:col-span-4 flex items-center justify-center">
                    {blogForm.cover_image ? (
                      <div className="w-full aspect-video rounded-xl overflow-hidden border border-slate-700 bg-slate-800 relative">
                        <img
                          src={blogForm.cover_image}
                          alt="Cover Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-video rounded-xl border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 text-[10px]">
                        <ImageIcon className="w-5 h-5 mb-1" />
                        <span>No image selected</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Author Info & Tags */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Author Name
                  </label>
                  <input
                    type="text"
                    value={blogForm.author_name}
                    onChange={(e) => setBlogForm((prev) => ({ ...prev, author_name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Author Role / Title
                  </label>
                  <input
                    type="text"
                    value={blogForm.author_role}
                    onChange={(e) => setBlogForm((prev) => ({ ...prev, author_role: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Tags (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={blogForm.tags}
                    onChange={(e) => setBlogForm((prev) => ({ ...prev, tags: e.target.value }))}
                    placeholder="Electricity, Rent, PG"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Status Toggles & Visibility */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      {blogForm.is_published ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">Public Visibility: Visible (Unhidden)</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-4 h-4 text-amber-400" />
                          <span className="text-amber-400">Public Visibility: Hidden (Draft only)</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {blogForm.is_published
                        ? "This article is public and viewable by everyone on the blog page."
                        : "This article is hidden from the public blog page. Only admins can see it here."}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={blogForm.is_published}
                      onChange={(e) => setBlogForm((prev) => ({ ...prev, is_published: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Featured Spotlight</span>
                    </div>
                    <p className="text-xs text-slate-400">Pin as top hero guide on the blog page.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={blogForm.is_featured}
                      onChange={(e) => setBlogForm((prev) => ({ ...prev, is_featured: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>

              {/* Full Article Content */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-200 font-bold">
                    Article Content (Supports HTML headings, bold, lists, quotes) *
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setBlogForm((prev) => ({
                          ...prev,
                          content: prev.content + "\n<h2>Subheading</h2>\n<p>Paragraph text...</p>",
                        }))
                      }
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-mono"
                    >
                      + H2
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setBlogForm((prev) => ({
                          ...prev,
                          content: prev.content + "\n<ul>\n  <li>Bullet item 1</li>\n  <li>Bullet item 2</li>\n</ul>",
                        }))
                      }
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-mono"
                    >
                      + List
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setBlogForm((prev) => ({
                          ...prev,
                          content: prev.content + "\n<blockquote>\n  <strong>Key Takeaway:</strong> Add note here.\n</blockquote>",
                        }))
                      }
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-mono"
                    >
                      + Quote
                    </button>
                  </div>
                </div>
                <textarea
                  rows={10}
                  required
                  value={blogForm.content}
                  onChange={(e) => setBlogForm((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter full article content..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-500 font-mono text-xs leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setBlogModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={blogSaving || blogImageUploading}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20 transition disabled:opacity-60 flex items-center gap-2"
                >
                  {blogSaving ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>Saving Article...</span>
                    </>
                  ) : (
                    <span>{blogModalMode === "create" ? "Publish Article" : "Save Changes"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}