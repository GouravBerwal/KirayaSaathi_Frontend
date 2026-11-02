import { useState, type FormEvent, type ChangeEvent } from "react";
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
  Upload,
  CheckCircle2,
  Building,
  RotateCw,
  LogOut,
  Mail,
  HelpCircle,
  MapPin,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { apiRequest, ApiError, API_BASE_URL } from "../utils/api";

export interface CurrentUserProfile {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  email_verified: boolean;
  approval_status: "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_MORE_INFORMATION";
  access_status: "ACTIVE" | "SUSPENDED" | "REVOKED";
  is_authorized: boolean;
  owner_facing_message?: string;
  rejection_reason?: string;
  suspension_reason?: string;
  latest_request?: {
    id: number;
    property_name: string;
    city: string;
    status: string;
    submitted_at: string;
    owner_facing_message?: string;
    rejection_reason?: string;
  } | null;
}

interface OwnerVerificationPageProps {
  user: CurrentUserProfile;
  onRefreshUser: () => void;
  onLogout: () => void;
}

export default function OwnerVerificationPage({
  user,
  onRefreshUser,
  onLogout,
}: OwnerVerificationPageProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [isEditingResubmission, setIsEditingResubmission] = useState(false);

  // Form fields for property verification submission
  const [propertyName, setPropertyName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [propertyType, setPropertyType] = useState("BUILDING");
  const [relationship, setRelationship] = useState("OWNER");
  const [notes, setNotes] = useState("");

  // Uploaded file handles
  const [ownershipProofFile, setOwnershipProofFile] = useState<File | null>(null);
  const [utilityBillFile, setUtilityBillFile] = useState<File | null>(null);
  const [authLetterFile, setAuthLetterFile] = useState<File | null>(null);

  const approvalStatus = user.approval_status;
  const accessStatus = user.access_status;

  // Handle Form Submission
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!ownershipProofFile) {
      setFormError("Primary ownership proof document (PDF, PNG, or JPEG) is mandatory.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("property_name", propertyName.trim());
      formData.append("address", address.trim());
      formData.append("city", city.trim());
      formData.append("state", state.trim());
      formData.append("postal_code", postalCode.trim());
      formData.append("property_type", propertyType);
      formData.append("relationship", relationship);
      formData.append("ownership_proof", ownershipProofFile);

      if (utilityBillFile) {
        formData.append("utility_bill", utilityBillFile);
      }
      if (authLetterFile) {
        formData.append("authorization_letter", authLetterFile);
      }
      if (notes.trim()) {
        formData.append("notes", notes.trim());
      }

      await apiRequest("/api/auth/verification-requests/", {
        method: "POST",
        body: formData,
      });

      setFormSuccess("Verification request submitted successfully! Under administrative review.");
      setIsEditingResubmission(false);
      onRefreshUser();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("Failed to submit verification request. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // Format file change helper
  function handleFileChange(
    setter: (file: File | null) => void,
    e: ChangeEvent<HTMLInputElement>
  ) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
      if (!validTypes.includes(file.type)) {
        setFormError("Only PDF, PNG, and JPEG documents are permitted.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setFormError("File size exceeds 10 MB limit.");
        return;
      }
      setFormError("");
      setter(file);
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F6F8] flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#035E7B]/10 text-[#035E7B] flex items-center justify-center font-bold text-xl">
            K
          </div>
          <div>
            <h1 className="font-extrabold text-[#035E7B] text-lg tracking-tight">KirayaSaathi</h1>
            <p className="text-[11px] font-medium text-gray-500">Property Owner Verification Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-sm font-semibold text-gray-800">{user.username}</span>
            <span className="text-xs text-gray-500">{user.email}</span>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* ============================================================== */}
        {/* CASE 0: APPROVED & READY                                       */}
        {/* ============================================================== */}
        {approvalStatus === "APPROVED" && accessStatus === "ACTIVE" && (
          <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-sm border border-emerald-200 text-center animate-in fade-in">
            <div className="w-20 h-20 rounded-2xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-5 border border-emerald-200 shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <span className="inline-block px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-3 border border-emerald-200">
              Workspace Approved
            </span>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3">
              Congratulations! Your Account is Approved
            </h2>
            <p className="text-sm text-gray-600 max-w-lg mx-auto mb-8 leading-relaxed">
              Your property owner account has been approved by the platform administrator. Your KirayaSaathi workspace is ready to manage properties, rooms, tenants, and rental income.
            </p>

            <button
              type="button"
              onClick={() => {
                onRefreshUser();
                window.location.reload();
              }}
              className="px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base shadow-lg shadow-emerald-600/30 transition inline-flex items-center gap-2 transform hover:-translate-y-0.5"
            >
              <span>Continue to Owner Dashboard</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step Indicator Banner for Not Submitted */}
        {accessStatus === "ACTIVE" && approvalStatus === "NOT_SUBMITTED" && (
          <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 shadow-sm flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 text-[10px] font-extrabold uppercase tracking-wider">
                  Action Required
                </span>
                <span className="text-xs font-bold text-amber-800">Under Verification — Step 2 of 2</span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-amber-950 mt-1">
                Email Verified! Please Submit Your Property Ownership Proof
              </h3>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Your email address has been verified successfully. To activate your owner dashboard workspace and manage properties, please provide your rental property details and upload verified ownership documentation below for administrative review and approval.
              </p>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* CASE 1: SUSPENDED (ON HOLD) OR REVOKED ACCESS                  */}
        {/* ============================================================== */}
        {accessStatus === "SUSPENDED" && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-orange-200 text-center">
            <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-600 mx-auto flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <span className="inline-block px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-bold uppercase tracking-wider mb-2">
              Account On Hold / Suspended
            </span>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Owner Workspace On Hold</h2>
            <p className="text-sm text-gray-600 max-w-lg mx-auto mb-6">
              Your property owner workspace access has been temporarily placed on hold by an administrator.
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 max-w-lg mx-auto text-left mb-6">
              <span className="text-xs font-bold text-orange-800 uppercase tracking-wider block mb-1">
                Administrator's Note
              </span>
              <p className="text-sm text-orange-950 font-medium">
                {user.suspension_reason || user.owner_facing_message || "Administrative compliance review in progress."}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onRefreshUser}
                className="px-5 py-2.5 rounded-xl bg-[#035E7B] text-white text-xs font-semibold hover:bg-[#024B63] transition flex items-center gap-2"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Check Status</span>
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold transition"
              >
                Logout
              </button>
            </div>
          </div>
        )}

        {(accessStatus === "REVOKED" || approvalStatus === "REJECTED") && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-red-200 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8" />
            </div>
            <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold uppercase tracking-wider mb-2">
              Account Access Rejected
            </span>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Request Rejected</h2>
            <p className="text-sm text-gray-600 max-w-lg mx-auto mb-6">
              Your property owner account / verification request has been rejected by administration.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-w-lg mx-auto text-left mb-6">
              <span className="text-xs font-bold text-red-800 uppercase tracking-wider block mb-1">
                Administrator's Note / Reason
              </span>
              <p className="text-sm text-red-950 font-medium">
                {user.rejection_reason || user.owner_facing_message || "Registration details or documentation did not meet platform criteria."}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsEditingResubmission(true)}
                className="px-5 py-2.5 rounded-xl bg-[#035E7B] text-white text-xs font-semibold hover:bg-[#024B63] transition inline-flex items-center gap-2"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Submit Revised Verification</span>
              </button>
              <button
                type="button"
                onClick={onRefreshUser}
                className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold transition flex items-center gap-2"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Check Status</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* CASE 2: PENDING ADMINISTRATIVE REVIEW                          */}
        {/* ============================================================== */}
        {accessStatus === "ACTIVE" && approvalStatus === "PENDING" && !isEditingResubmission && (
          <div className="bg-white rounded-2xl p-6 sm:p-10 shadow-sm border border-amber-200 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 mx-auto flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2">
              Review in Progress
            </span>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
              Verification Request Under Review
            </h2>
            <p className="text-sm text-gray-600 max-w-xl mx-auto mb-8">
              Thank you for submitting your property ownership proof. Our administrative verification team is actively reviewing your documents.
            </p>

            {user.latest_request && (
              <div className="bg-[#F8FAFC] border border-gray-200 rounded-xl p-5 max-w-md mx-auto text-left mb-8 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase">
                  <Building className="w-3.5 h-3.5" />
                  <span>Submitted Property</span>
                </div>
                <p className="font-bold text-gray-900 text-base">{user.latest_request.property_name}</p>
                <p className="text-xs text-gray-600 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  {user.latest_request.city}
                </p>
                <p className="text-[11px] text-gray-400 pt-2 border-t border-gray-100">
                  Submission Date: {new Date(user.latest_request.submitted_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}

            {/* Verification Steps Indicator */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto text-left text-xs mb-8">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2 font-bold text-emerald-800 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>1. Email Verified</span>
                </div>
                <span className="text-emerald-700">Completed via OTP</span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2 font-bold text-amber-800 mb-1">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>2. Document Review</span>
                </div>
                <span className="text-amber-700">In Admin Queue</span>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                <div className="flex items-center gap-2 font-bold text-gray-500 mb-1">
                  <ShieldCheck className="w-4 h-4 text-gray-400" />
                  <span>3. Workspace Active</span>
                </div>
                <span className="text-gray-400">Dashboard Unlocks</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={onRefreshUser}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#035E7B] text-white text-xs font-semibold hover:bg-[#024B63] transition flex items-center justify-center gap-2"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Check Verification Status</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditingResubmission(true)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-xs font-semibold transition flex items-center justify-center gap-2"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload / Update Property Documents</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* CASE 3: NEEDS MORE INFORMATION                                 */}
        {/* ============================================================== */}
        {accessStatus === "ACTIVE" && approvalStatus === "NEEDS_MORE_INFORMATION" && !isEditingResubmission && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-sky-300 text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 border border-sky-200 text-sky-600 mx-auto flex items-center justify-center mb-4">
              <HelpCircle className="w-8 h-8" />
            </div>
            <span className="inline-block px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold uppercase tracking-wider mb-2">
              Action Required
            </span>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Additional Information Required</h2>
            <p className="text-sm text-gray-600 max-w-lg mx-auto mb-6">
              The administrator has reviewed your property application and requires further documents or clarification before approving your workspace.
            </p>

            {user.owner_facing_message && (
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 max-w-lg mx-auto text-left mb-6">
                <span className="text-xs font-bold text-sky-800 uppercase tracking-wider block mb-1">
                  Administrator's Request
                </span>
                <p className="text-sm text-sky-950 font-medium">{user.owner_facing_message}</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsEditingResubmission(true)}
              className="px-6 py-2.5 rounded-xl bg-[#035E7B] text-white text-sm font-semibold hover:bg-[#024B63] transition inline-flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Provide Requested Documents</span>
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* CASE 4: REJECTED                                               */}
        {/* ============================================================== */}
        {accessStatus === "ACTIVE" && approvalStatus === "REJECTED" && !isEditingResubmission && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-red-200 text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 mx-auto flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8" />
            </div>
            <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold uppercase tracking-wider mb-2">
              Request Not Approved
            </span>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Request Rejected</h2>
            <p className="text-sm text-gray-600 max-w-lg mx-auto mb-6">
              Your submitted property verification request was not approved at this time.
            </p>

            {user.rejection_reason && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-w-lg mx-auto text-left mb-6">
                <span className="text-xs font-bold text-red-800 uppercase tracking-wider block mb-1">
                  Reason for Rejection
                </span>
                <p className="text-sm text-red-950 font-medium">{user.rejection_reason}</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsEditingResubmission(true)}
              className="px-6 py-2.5 rounded-xl bg-[#035E7B] text-white text-sm font-semibold hover:bg-[#024B63] transition inline-flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Submit Revised Verification Request</span>
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* CASE 5: SUBMISSION FORM (NOT_SUBMITTED or EDITING)             */}
        {/* ============================================================== */}
        {accessStatus === "ACTIVE" &&
          (approvalStatus === "NOT_SUBMITTED" || isEditingResubmission) && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Form Header */}
              <div className="bg-gradient-to-r from-[#035E7B] to-[#00877C] p-6 text-white">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <ShieldCheck className="w-6 h-6" />
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                    Property Ownership Verification
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-emerald-50 max-w-2xl leading-relaxed">
                  KirayaSaathi guarantees high security for property owners and tenants. Please provide your rental property details and upload verified ownership documentation for administrative approval.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
                {formError && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{formSuccess}</span>
                  </div>
                )}

                {/* Section 1: Property Details */}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                    <Building className="w-4 h-4 text-[#035E7B]" />
                    <span>1. Property Identification</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Property Name / Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={propertyName}
                        onChange={(e) => setPropertyName(e.target.value)}
                        placeholder="e.g. Sunrise Residency, Sharma Niwas, Krishna Villa"
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-[#035E7B] focus:ring-2 focus:ring-[#035E7B]/20 transition"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Complete Physical Address <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="House / Plot number, Street, Landmark, Colony"
                        className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 outline-none focus:border-[#035E7B] focus:ring-2 focus:ring-[#035E7B]/20 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Indore, Bhopal, Jaipur"
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-[#035E7B] focus:ring-2 focus:ring-[#035E7B]/20 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        State <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="e.g. Madhya Pradesh, Rajasthan"
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-[#035E7B] focus:ring-2 focus:ring-[#035E7B]/20 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Postal Code / PIN <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="6-digit PIN code"
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-[#035E7B] focus:ring-2 focus:ring-[#035E7B]/20 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Property Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={propertyType}
                        onChange={(e) => setPropertyType(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-[#035E7B] focus:ring-2 focus:ring-[#035E7B]/20 transition bg-white"
                      >
                        <option value="BUILDING">Building / Residential Complex</option>
                        <option value="HOSTEL">Hostel</option>
                        <option value="PG">PG / Co-Living</option>
                        <option value="APARTMENT">Apartment / Flat</option>
                        <option value="HOUSE">Independent House / Villa</option>
                        <option value="COMMERCIAL">Commercial Property</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Applicant Relationship to Property <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={relationship}
                        onChange={(e) => setRelationship(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-[#035E7B] focus:ring-2 focus:ring-[#035E7B]/20 transition bg-white"
                      >
                        <option value="OWNER">Direct Property Owner</option>
                        <option value="AUTHORIZED_MANAGER">Authorized Manager / Caretaker</option>
                        <option value="LEASE_HOLDER">Master Lease Holder</option>
                        <option value="OTHER">Other Authorized Representative</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Document Proofs */}
                <div className="pt-2">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#035E7B]" />
                    <span>2. Ownership Verification Documents</span>
                  </h3>

                  <div className="space-y-4">
                    {/* Primary Proof */}
                    <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70">
                      <label className="block text-xs font-bold text-gray-900 mb-1">
                        Primary Ownership Proof <span className="text-red-500">* (Mandatory)</span>
                      </label>
                      <p className="text-[11px] text-gray-500 mb-2">
                        Accepted: Registered Sale Deed, Property Tax Receipt, Registry, or Mutation Certificate (PDF, PNG, JPG max 10MB).
                      </p>
                      <input
                        type="file"
                        required={!ownershipProofFile}
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => handleFileChange(setOwnershipProofFile, e)}
                        className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#035E7B] file:text-white hover:file:bg-[#024B63] file:cursor-pointer cursor-pointer"
                      />
                      {ownershipProofFile && (
                        <p className="text-xs font-medium text-emerald-700 mt-2 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Selected: {ownershipProofFile.name} ({(ownershipProofFile.size / 1024).toFixed(0)} KB)
                        </p>
                      )}
                    </div>

                    {/* Utility Bill (Optional) */}
                    <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70">
                      <label className="block text-xs font-bold text-gray-900 mb-1">
                        Utility Bill <span className="text-gray-400 font-normal">(Optional Supporting Proof)</span>
                      </label>
                      <p className="text-[11px] text-gray-500 mb-2">
                        Electricity, water, or piped gas bill in applicant or property owner's name.
                      </p>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => handleFileChange(setUtilityBillFile, e)}
                        className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-700 file:text-white hover:file:bg-gray-800 file:cursor-pointer cursor-pointer"
                      />
                      {utilityBillFile && (
                        <p className="text-xs font-medium text-emerald-700 mt-2 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Selected: {utilityBillFile.name}
                        </p>
                      )}
                    </div>

                    {/* Authorization Letter (Optional) */}
                    {relationship !== "OWNER" && (
                      <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70">
                        <label className="block text-xs font-bold text-gray-900 mb-1">
                          Manager Authorization Letter / Power of Attorney
                        </label>
                        <p className="text-[11px] text-gray-500 mb-2">
                          Signed authority letter authorizing you to manage the property on behalf of the owner.
                        </p>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={(e) => handleFileChange(setAuthLetterFile, e)}
                          className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-700 file:text-white hover:file:bg-gray-800 file:cursor-pointer cursor-pointer"
                        />
                        {authLetterFile && (
                          <p className="text-xs font-medium text-emerald-700 mt-2 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Selected: {authLetterFile.name}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Optional Notes */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Additional Notes / Remarks (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any additional information for the administrator..."
                        className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-900 outline-none focus:border-[#035E7B] focus:ring-2 focus:ring-[#035E7B]/20 transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100">
                  {isEditingResubmission && (
                    <button
                      type="button"
                      onClick={() => setIsEditingResubmission(false)}
                      className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition"
                    >
                      Cancel / Back to Status
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto ml-auto px-8 py-3 rounded-xl bg-[#035E7B] text-white font-bold text-sm shadow-md hover:bg-[#024B63] transition flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <RotateCw className="w-4 h-4 animate-spin" />
                        <span>Uploading & Submitting...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Submit for Administrative Verification</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
      </main>
    </div>
  );
}
