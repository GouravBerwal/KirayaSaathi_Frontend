import {
  useState,
  useEffect,
  useRef,
  type FormEvent,
  type ClipboardEvent,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import {
  ArrowLeft,
  Mail,
  ShieldCheck,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Sparkles,
} from "lucide-react";
import { apiRequest, ApiError } from "../utils/api";

type LoginPageProps = {
  onLoginSuccess: () => void;
  initialMode?: "login" | "signup";
  onBackToLanding?: () => void;
  onOpenAdminPortal?: () => void;
};

type AuthMode = "login" | "signup" | "otp_verification";

interface RegisterResponse {
  detail: string;
  email: string;
  masked_email: string;
  cooldown_seconds: number;
  expires_in_minutes: number;
}

interface ResendOtpResponse {
  detail: string;
  email?: string;
  masked_email?: string;
  cooldown_seconds: number;
  expires_in_minutes?: number;
}

interface VerifyOtpResponse {
  detail: string;
  user: {
    id: number;
    username: string;
    email: string;
    email_verified: boolean;
  };
}

export default function LoginPage({
  onLoginSuccess,
  initialMode = "login",
  onBackToLanding,
  onOpenAdminPortal,
}: LoginPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Form fields
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // OTP Verification state
  const [targetEmail, setTargetEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [cooldown, setCooldown] = useState<number>(60);
  const [isResending, setIsResending] = useState(false);
  const [resendNotice, setResendNotice] = useState("");

  // Status feedback
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // References for OTP input fields
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer effect for OTP resend cooldown
  useEffect(() => {
    if (mode !== "otp_verification" || cooldown <= 0) return;

    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [mode, cooldown]);

  // Auto-focus first OTP input when entering verification mode
  useEffect(() => {
    if (mode === "otp_verification") {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [mode]);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setSuccess("");
    setResendNotice("");
    setPassword("");
    setConfirmPassword("");
    if (nextMode !== "otp_verification") {
      setOtpDigits(["", "", "", "", "", ""]);
    }
  }

  // Handle OTP digit changes
  function handleOtpDigitChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    const rawVal = event.target.value;
    const digit = rawVal.replace(/\D/g, "").slice(-1); // Only keep the newest digit

    const updatedDigits = [...otpDigits];
    updatedDigits[index] = digit;
    setOtpDigits(updatedDigits);
    setError("");

    // Auto-advance to next input if digit was typed
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  }

  // Handle keyboard navigation for OTP inputs (Backspace, Left/Right arrow)
  function handleOtpKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        // Move back and clear previous input
        const updatedDigits = [...otpDigits];
        updatedDigits[index - 1] = "";
        setOtpDigits(updatedDigits);
        otpInputRefs.current[index - 1]?.focus();
        event.preventDefault();
      } else if (otpDigits[index]) {
        // Clear current
        const updatedDigits = [...otpDigits];
        updatedDigits[index] = "";
        setOtpDigits(updatedDigits);
        event.preventDefault();
      }
    } else if (event.key === "ArrowLeft" && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  }

  // Handle pasting full 6-digit OTP code into any box
  function handleOtpPaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pastedData = event.clipboardData.getData("text").trim();
    const cleanDigits = pastedData.replace(/\D/g, "").slice(0, 6);

    if (cleanDigits.length > 0) {
      const updatedDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        updatedDigits[i] = cleanDigits[i] || "";
      }
      setOtpDigits(updatedDigits);
      setError("");

      // Focus the appropriate input box
      const focusIndex = Math.min(cleanDigits.length, 5);
      otpInputRefs.current[focusIndex]?.focus();
    }
  }

  // Submit Handler for Login and Signup
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (mode === "signup") {
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          setLoading(false);
          return;
        }

        const trimmedEmail = email.trim().toLowerCase();
        const res = await apiRequest<RegisterResponse>("/api/auth/register/", {
          method: "POST",
          body: {
            username: username.trim(),
            email: trimmedEmail,
            password,
            confirm_password: confirmPassword,
          },
        });

        // Registration initiated -> Transition to dedicated OTP verification step
        setTargetEmail(res.email || trimmedEmail);
        setMaskedEmail(res.masked_email || trimmedEmail);
        setCooldown(res.cooldown_seconds || 60);
        setOtpDigits(["", "", "", "", "", ""]);
        setSuccess("Verification code sent to your email! Please check your inbox.");
        setMode("otp_verification");
      } else if (mode === "login") {
        await apiRequest("/api/auth/login/", {
          method: "POST",
          body: {
            identifier: identifier.trim(),
            password,
          },
        });

        onLoginSuccess();
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        // If unverified email detected during login
        if (err.code === "EMAIL_NOT_VERIFIED" || err.status === 403) {
          const userEmail = err.data?.email || identifier.trim();
          setTargetEmail(userEmail);
          setMaskedEmail(err.data?.masked_email || userEmail);
          setCooldown(60);
          setOtpDigits(["", "", "", "", "", ""]);
          setError("Your email address is not verified yet. Please enter the OTP below.");
          setMode("otp_verification");
          return;
        }
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Submit Handler for OTP Verification
  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResendNotice("");
    setSuccess("");

    const otpCode = otpDigits.join("");
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      await apiRequest<VerifyOtpResponse>("/api/auth/verify-email-otp/", {
        method: "POST",
        body: {
          email: targetEmail,
          otp: otpCode,
        },
      });

      setSuccess("Email verified successfully! Preparing your verification workspace...");
      setTimeout(() => {
        onLoginSuccess();
      }, 500);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to verify OTP. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Resend OTP Code
  async function handleResendOtp() {
    if (cooldown > 0 || isResending) return;

    setError("");
    setResendNotice("");
    setIsResending(true);

    try {
      const res = await apiRequest<ResendOtpResponse>("/api/auth/resend-email-otp/", {
        method: "POST",
        body: {
          email: targetEmail,
        },
      });

      setCooldown(res.cooldown_seconds || 60);
      setResendNotice("A new 6-digit code has been sent to your email inbox.");
      setOtpDigits(["", "", "", "", "", ""]);
      otpInputRefs.current[0]?.focus();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to resend verification code. Please try again later.");
      }
    } finally {
      setIsResending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#EAF4F7] px-4 py-8 sm:px-6 lg:px-8">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 sm:p-8 md:p-10 shadow-lg border border-gray-100 transition-all">
        {onBackToLanding && (
          <button
            type="button"
            onClick={onBackToLanding}
            className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#035E7B] hover:text-[#024B63] transition hover:underline focus:outline-none"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Website</span>
          </button>
        )}

        {/* Header Branding */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#035E7B]/10 text-[#035E7B] mb-3">
            <img src="images/logo.png" alt="logo" />
            {mode === "otp_verification" ? (
              <ShieldCheck className="h-6 w-6 text-[#035E7B]" />
            ) : (
              <Sparkles className="h-6 w-6 text-[#035E7B]" />
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#035E7B]">
            KirayaSaathi
          </h1>
          <p className="mt-1 text-sm text-[#142D3B]/80 font-medium">
            {mode === "login" && "Welcome back! Sign in to your owner dashboard."}
            {mode === "signup" && "Create your verified property owner account."}
            {mode === "otp_verification" && "Email OTP Verification"}
          </p>
        </div>

        {/* Tab switch between Login and Signup when not in OTP mode */}
        {mode !== "otp_verification" && (
          <div className="mb-6 grid grid-cols-2 rounded-xl bg-gray-100/90 p-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`rounded-lg py-2.5 text-sm font-semibold transition ${
                mode === "login"
                  ? "bg-white text-[#035E7B] shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`rounded-lg py-2.5 text-sm font-semibold transition ${
                mode === "signup"
                  ? "bg-white text-[#035E7B] shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODE 1 & 2: LOGIN / SIGNUP FORM                                */}
        {/* ============================================================== */}
        {mode !== "otp_verification" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "login" ? (
              <div>
                <label
                  htmlFor="identifier"
                  className="mb-1.5 block text-xs sm:text-sm font-semibold text-[#142D3B]"
                >
                  Username or Email
                </label>
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your username or email"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-[#035E7B] focus:ring-2 focus:ring-[#035E7B]/20"
                />
              </div>
            ) : (
              <>
                <div>
                  <label
                    htmlFor="username"
                    className="mb-1.5 block text-xs sm:text-sm font-semibold text-[#142D3B]"
                  >
                    Owner Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    required
                    minLength={3}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-[#035E7B] focus:ring-2 focus:ring-[#035E7B]/20"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-xs sm:text-sm font-semibold text-[#142D3B]"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-[#035E7B] focus:ring-2 focus:ring-[#035E7B]/20"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    We will send a 6-digit OTP to verify your email.
                  </p>
                </div>
              </>
            )}

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs sm:text-sm font-semibold text-[#142D3B]"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  mode === "login" ? "Enter your password" : "At least 8 characters"
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-[#035E7B] focus:ring-2 focus:ring-[#035E7B]/20"
              />
            </div>

            {mode === "signup" && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1.5 block text-xs sm:text-sm font-semibold text-[#142D3B]"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-[#035E7B] focus:ring-2 focus:ring-[#035E7B]/20"
                />
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-red-50 p-3.5 text-xs sm:text-sm text-red-700 border border-red-200"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="break-words">{error}</span>
              </div>
            )}

            {success && (
              <div
                role="status"
                className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3.5 text-xs sm:text-sm text-emerald-700 border border-emerald-200"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#035E7B] py-3.5 px-4 font-semibold text-white shadow-md transition hover:bg-[#024B63] focus:outline-none focus:ring-2 focus:ring-[#035E7B]/40 disabled:cursor-not-allowed disabled:opacity-60 text-sm sm:text-base"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <RotateCw className="h-4 w-4 animate-spin" />
                  Please wait...
                </span>
              ) : mode === "login" ? (
                "Sign In"
              ) : (
                "Continue to Verification"
              )}
            </button>
          </form>
        )}

        {/* ============================================================== */}
        {/* MODE 3: DEDICATED EMAIL OTP VERIFICATION SCREEN                */}
        {/* ============================================================== */}
        {mode === "otp_verification" && (
          <div className="space-y-6">
            {/* Context Box */}
            <div className="rounded-xl bg-[#EAF4F7]/60 border border-[#035E7B]/15 p-4 text-center">
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#035E7B]/10 text-[#035E7B] mb-2">
                <Mail className="h-4 w-4" />
              </div>
              <p className="text-xs sm:text-sm text-gray-600">
                A 6-digit one-time password was sent to:
              </p>
              <p className="font-bold text-[#035E7B] text-sm sm:text-base tracking-wide mt-0.5 select-all">
                {maskedEmail || targetEmail}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                Valid for 10 minutes. Check your Spam folder if not in inbox.
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-5">
              {/* 6-box keyboard-friendly OTP inputs */}
              <div>
                <label className="block text-center text-xs sm:text-sm font-semibold text-[#142D3B] mb-3">
                  Enter 6-Digit Verification Code
                </label>
                <div className="flex justify-center items-center gap-2 sm:gap-3">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        otpInputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(index, e)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={handleOtpPaste}
                      className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold rounded-xl border border-gray-300 bg-white text-gray-900 shadow-sm transition focus:border-[#035E7B] focus:ring-2 focus:ring-[#035E7B]/30 focus:outline-none"
                    />
                  ))}
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl bg-red-50 p-3.5 text-xs sm:text-sm text-red-700 border border-red-200"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="break-words">{error}</span>
                </div>
              )}

              {resendNotice && (
                <div
                  role="status"
                  className="flex items-start gap-2 rounded-xl bg-sky-50 p-3 text-xs sm:text-sm text-[#035E7B] border border-sky-200"
                >
                  <Mail className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{resendNotice}</span>
                </div>
              )}

              {success && (
                <div
                  role="status"
                  className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3.5 text-xs sm:text-sm text-emerald-700 border border-emerald-200"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{success}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otpDigits.join("").length !== 6}
                className="w-full rounded-xl bg-[#035E7B] py-3.5 px-4 font-semibold text-white shadow-md transition hover:bg-[#024B63] focus:outline-none focus:ring-2 focus:ring-[#035E7B]/40 disabled:cursor-not-allowed disabled:opacity-50 text-sm sm:text-base flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RotateCw className="h-4 w-4 animate-spin" />
                    Verifying Code...
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    Verify Email & Proceed
                  </>
                )}
              </button>
            </form>

            {/* Resend Code Section with Cooldown */}
            <div className="pt-2 text-center border-t border-gray-100">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 text-xs sm:text-sm text-gray-500">
                <span>Didn't receive the email code?</span>
                {cooldown > 0 ? (
                  <span className="font-semibold text-gray-400">
                    Resend in <span className="text-[#035E7B] tabular-nums font-mono">{cooldown}s</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isResending}
                    className="font-semibold text-[#035E7B] hover:text-[#024B63] hover:underline transition inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    {isResending ? (
                      <>
                        <RotateCw className="h-3.5 w-3.5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Resend Code"
                    )}
                  </button>
                )}
              </div>

              {/* Edit Email / Back to Signup */}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="text-xs text-gray-400 hover:text-gray-700 transition hover:underline"
                >
                  Wrong email address? Change email
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Mode Switcher */}
        {mode !== "otp_verification" && (
          <p className="mt-6 text-center text-xs sm:text-sm text-gray-500">
            {mode === "login"
              ? "Don't have an owner account? "
              : "Already have an account? "}

            <button
              type="button"
              onClick={() => switchMode(mode === "login" ? "signup" : "login")}
              className="font-bold text-[#035E7B] hover:underline"
            >
              {mode === "login" ? "Sign Up" : "Log In"}
            </button>
          </p>
        )}

        {onOpenAdminPortal && (
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <button
              type="button"
              onClick={onOpenAdminPortal}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-amber-600 font-semibold transition"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>Platform Staff & Admin Console</span>
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
