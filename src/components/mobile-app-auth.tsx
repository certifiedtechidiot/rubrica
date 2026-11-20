import { useState, useEffect } from "react";
import { 
  Eye, EyeOff, Mail, Lock, User, 
  Moon, Sun, Loader2, CheckCircle2, GraduationCap, School, 
  ArrowLeft, RefreshCw, Zap, Sparkles
} from "lucide-react";
import { 
  loginUser, registerUser, 
  signInWithGoogle, signInWithOtp, verifyOtp, resetPassword 
} from "@/lib/api";
import { type TeacherProfile } from "@/lib/storage";
import { useTheme } from "@/lib/theme";
import { isAppEnvironment } from "@/lib/platform";
import { useBackButton } from "@/lib/back-button";

interface MobileAppAuthProps {
  onLogin: (profile: TeacherProfile & { email?: string }) => void;
  onViewWeb?: () => void;
}

export function MobileAppAuth({ onLogin, onViewWeb }: MobileAppAuthProps) {
  const [targetAudience, setTargetAudience] = useState<"student" | "institution">(() => {
    if (typeof window !== "undefined") {
      const paramRole = new URLSearchParams(window.location.search).get("role");
      if (paramRole === "student") return "student";
      if (paramRole === "teacher" || paramRole === "institution") return "institution";
      const saved = localStorage.getItem("rubrica_intended_role");
      if (saved === "student") return "student";
      if (saved === "teacher" || saved === "institution") return "institution";
    }
    return "student";
  });

  // Standard platform auth tabs: "login" | "signup"
  const [tab, setTab] = useState<"login" | "signup">("login");

  // Sub-view: "main" | "forgot-password" | "otp"
  const [view, setView] = useState<"main" | "forgot-password" | "otp">("main");

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password state
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  // OTP flow state
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [countdown, setCountdown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const { resolvedTheme, toggleTheme } = useTheme();

  // Timer for OTP resend countdown
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  useBackButton(() => {
    if (view !== "main") {
      setView("main");
      return true;
    }
    return false;
  }, view !== "main");

  // Instant 1-Click Beta Testing Entry (Zero barriers, zero redirects, zero credentials required)
  const handleEnterBetaTesting = () => {
    try {
      localStorage.setItem("rubrica_app_mode", "true");
    } catch {}

    if (targetAudience === "student") {
      try { localStorage.setItem("rubrica_intended_role", "student"); } catch {}
      const studentBetaProfile: TeacherProfile = {
        id: "student-beta-session",
        name: "Aryan Patel",
        email: "student.beta@rubrica.in",
        role: "student",
        institution: "JEE Advanced Prep",
        institutionId: "student-beta-inst",
        gradeOrExam: "JEE Advanced 2026",
        isBeta: true,
        createdAt: new Date().toISOString()
      };
      onLogin(studentBetaProfile);
    } else {
      try { localStorage.setItem("rubrica_intended_role", "teacher"); } catch {}
      const facultyBetaProfile: TeacherProfile = {
        id: "b0000000-0000-4000-8000-000000000001",
        name: "Dr. Rehan Khan",
        email: "beta@rubrica.in",
        role: "teacher",
        institution: "Rubrica Academy",
        institutionId: "beta-institution",
        isBeta: true,
        createdAt: new Date().toISOString()
      };
      onLogin(facultyBetaProfile);
    }
  };

  // Handle Google OAuth
  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setError("");
      await signInWithGoogle(targetAudience === "student" ? "student" : "teacher");
    } catch (err: any) {
      setError(err.message || "Google sign in failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  // Handle Password Login / Sign Up Submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    const trimmedEmail = email.trim();
    const passwordValue = password;

    if (!trimmedEmail || !passwordValue) {
      setError("Please provide both email and password.");
      setLoading(false);
      return;
    }

    try {
      if (tab === "login") {
        const profile = await loginUser({ 
          data: { 
            email: trimmedEmail, 
            password: passwordValue,
            role: targetAudience === "student" ? "student" : "teacher"
          } 
        });
        onLogin({
          ...profile,
          role: targetAudience === "student" ? "student" : (profile.role || "teacher"),
        });
      } else {
        const trimmedName = name.trim();
        if (!trimmedName) {
          setError("Please enter your full name.");
          setLoading(false);
          return;
        }

        const profile = await registerUser({
          data: { 
            email: trimmedEmail, 
            password: passwordValue, 
            name: trimmedName, 
            role: targetAudience === "student" ? "student" : "teacher" 
          },
        });

        if (profile.session) {
          onLogin({
            ...profile,
            role: targetAudience === "student" ? "student" : "teacher",
          });
        } else {
          setSuccessMsg("Account created! Please check your email inbox to confirm your address, then log in.");
          setTab("login");
          setPassword("");
        }
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setError("Please enter your registered email address.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      await resetPassword(resetEmail.trim());
      setResetSent(true);
      setSuccessMsg(`We sent password reset instructions to ${resetEmail.trim()}`);
    } catch (err: any) {
      setError(err.message || "Could not send reset link. Please check your email address.");
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Send
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpEmail.trim()) {
      setError("Please enter your email address to receive an OTP code.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      await signInWithOtp(otpEmail.trim());
      setOtpStep("verify");
      setCountdown(45);
      setSuccessMsg(`We sent a 6-digit code to ${otpEmail.trim()}`);
    } catch (err: any) {
      setError(err.message || "Failed to send OTP code. Please check your email.");
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Verify
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const profile = await verifyOtp(otpEmail.trim(), otpCode.trim(), {
        role: targetAudience === "student" ? "student" : "teacher",
        name: otpEmail.trim().split("@")[0],
      });
      onLogin(profile);
    } catch (err: any) {
      setError(err.message || "Invalid or expired OTP code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#fbfaf7] dark:bg-[#121214] text-foreground flex flex-col justify-between py-6 px-4 sm:px-6">
      <div className="max-w-md mx-auto w-full">
        
        {/* Top Header */}
        <div className="flex items-center justify-between mb-5 pt-1">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="Rubrica" className="h-8 w-8 object-contain" />
            <span className="font-display text-2xl font-black tracking-tight text-[#09090B] dark:text-white">
              rubri<span className="text-[#E52237]">ca</span>
            </span>
            <span className="ml-1 text-xs font-semibold px-2 py-0.5 border bg-[#E52237]/15 text-[#E52237] border-[#E52237]/30">
              {targetAudience === "student" ? "Student" : "School & College"}
            </span>
          </div>

          <button
            onClick={toggleTheme}
            className="grid h-9 w-9 place-items-center border-2 border-[#09090B] dark:border-[#52525b] bg-white dark:bg-[#27272a] text-[#09090B] dark:text-white shadow-[2px_2px_0_#09090B] dark:shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px]"
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        {/* PRIMARY AUDIENCE SWITCHER (Student vs School/College) */}
        <div className="grid grid-cols-2 gap-2 p-1.5 border-4 border-[#09090B] dark:border-[#3f3f46] bg-[#f2eee6] dark:bg-[#1e1e24] mb-4 shadow-[4px_4px_0_#09090B] dark:shadow-[4px_4px_0_#000]">
          <button
            type="button"
            onClick={() => {
              setTargetAudience("student");
              try { localStorage.setItem("rubrica_intended_role", "student"); } catch {}
              setError("");
              setSuccessMsg("");
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-2 text-xs font-black transition-all ${
              targetAudience === "student"
                ? "bg-[#E52237] text-white shadow-[3px_3px_0_#09090B] dark:shadow-[3px_3px_0_#000]"
                : "text-zinc-600 dark:text-zinc-400 hover:text-foreground"
            }`}
          >
            <GraduationCap size={16} />
            <span>Student</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTargetAudience("institution");
              try { localStorage.setItem("rubrica_intended_role", "teacher"); } catch {}
              setError("");
              setSuccessMsg("");
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-2 text-xs font-black transition-all ${
              targetAudience === "institution"
                ? "bg-[#E52237] text-white shadow-[3px_3px_0_#09090B] dark:shadow-[3px_3px_0_#000]"
                : "text-zinc-600 dark:text-zinc-400 hover:text-foreground"
            }`}
          >
            <School size={16} />
            <span>School / College</span>
          </button>
        </div>

        {/* MAIN AUTH CONTAINER */}
        <div className="border-4 border-[#09090B] dark:border-[#3f3f46] bg-white dark:bg-[#18181c] p-5 sm:p-6 shadow-[6px_6px_0_#09090B] dark:shadow-[6px_6px_0_#000]">

          {/* VIEW 1: FORGOT PASSWORD */}
          {view === "forgot-password" ? (
            <div>
              <button
                type="button"
                onClick={() => {
                  setView("main");
                  setError("");
                  setSuccessMsg("");
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-[#E52237] mb-4 transition-colors"
              >
                <ArrowLeft size={14} /> Back to log in
              </button>

              <div className="mb-4">
                <h1 className="font-display text-2xl font-black tracking-tight text-[#09090B] dark:text-white">
                  Reset your password
                </h1>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  Enter your registered email address and we will send you a password reset link.
                </p>
              </div>

              {error && (
                <div className="mb-4 border-2 border-red-600 bg-red-100 dark:bg-red-950/40 p-3 text-xs font-bold text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="mb-4 border-2 border-emerald-600 bg-emerald-100 dark:bg-emerald-950/40 p-3 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0" /> {successMsg}
                </div>
              )}

              {resetSent ? (
                <div className="space-y-4 pt-2">
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    If an account exists for <span className="font-bold text-foreground">{resetEmail}</span>, you will receive an email shortly with instructions to reset your password.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setView("main");
                      setTab("login");
                      setError("");
                      setSuccessMsg("");
                    }}
                    className="w-full flex items-center justify-center gap-2 border-2 border-[#09090B] dark:border-[#3f3f46] text-white py-3 text-sm font-extrabold shadow-[4px_4px_0_#09090B] dark:shadow-[4px_4px_0_#000] active:translate-x-[2px] active:translate-y-[2px] bg-[#E52237] hover:bg-[#cc182b] transition-all"
                  >
                    Return to log in
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-3 text-zinc-400 dark:text-zinc-500" />
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="name@example.com"
                        required
                        autoFocus
                        className="w-full border-2 border-[#09090B] dark:border-[#52525b] bg-[#FAFAFA] dark:bg-[#27272a] text-[#09090B] dark:text-white pl-9 pr-3 py-2.5 text-sm font-bold outline-none focus:border-[#E52237]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 border-2 border-[#09090B] dark:border-[#3f3f46] text-white py-3 text-sm font-extrabold shadow-[4px_4px_0_#09090B] dark:shadow-[4px_4px_0_#000] active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 transition-all bg-[#E52237] hover:bg-[#cc182b]"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Sending link...
                      </>
                    ) : (
                      "Send reset link"
                    )}
                  </button>
                </form>
              )}
            </div>
          ) : view === "otp" ? (
            /* VIEW 2: OTP FLOW */
            <div>
              <button
                type="button"
                onClick={() => {
                  setView("main");
                  setError("");
                  setSuccessMsg("");
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-[#E52237] mb-4 transition-colors"
              >
                <ArrowLeft size={14} /> Back to password log in
              </button>

              <div className="mb-4">
                <h1 className="font-display text-2xl font-black tracking-tight text-[#09090B] dark:text-white">
                  {otpStep === "request" ? "Sign in with email code" : "Enter verification code"}
                </h1>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {otpStep === "request"
                    ? "Enter your email to receive a 6-digit one-time login code."
                    : `Enter the 6-digit code sent to ${otpEmail}`}
                </p>
              </div>

              {error && (
                <div className="mb-4 border-2 border-red-600 bg-red-100 dark:bg-red-950/40 p-3 text-xs font-bold text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="mb-4 border-2 border-emerald-600 bg-emerald-100 dark:bg-emerald-950/40 p-3 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0" /> {successMsg}
                </div>
              )}

              {otpStep === "request" ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-3 text-zinc-400 dark:text-zinc-500" />
                      <input
                        value={otpEmail}
                        onChange={(e) => setOtpEmail(e.target.value)}
                        type="email"
                        placeholder="name@example.com"
                        required
                        autoFocus
                        className="w-full border-2 border-[#09090B] dark:border-[#52525b] bg-[#FAFAFA] dark:bg-[#27272a] text-[#09090B] dark:text-white pl-9 pr-3 py-2.5 text-sm font-bold outline-none focus:border-[#E52237]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 border-2 border-[#09090B] dark:border-[#3f3f46] text-white py-3 text-sm font-extrabold shadow-[4px_4px_0_#09090B] dark:shadow-[4px_4px_0_#000] active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 transition-all bg-[#E52237] hover:bg-[#cc182b]"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Sending code...
                      </>
                    ) : (
                      "Send 6-digit code"
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        Enter 6-digit code
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpStep("request");
                          setOtpCode("");
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-[#E52237]"
                      >
                        <ArrowLeft size={12} /> Change email
                      </button>
                    </div>

                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                      autoFocus
                      required
                      placeholder="123456"
                      className="w-full h-14 border-2 border-[#09090B] dark:border-[#52525b] bg-[#FAFAFA] dark:bg-[#27272a] text-center font-mono text-2xl font-bold tracking-[0.4em] text-[#09090B] dark:text-white outline-none focus:border-[#E52237]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otpCode.length < 6}
                    className="w-full flex items-center justify-center gap-2 border-2 border-[#09090B] dark:border-[#3f3f46] text-white py-3.5 text-sm font-extrabold shadow-[4px_4px_0_#09090B] dark:shadow-[4px_4px_0_#000] active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 transition-all bg-[#E52237] hover:bg-[#cc182b]"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Verifying...
                      </>
                    ) : (
                      "Verify & enter desk"
                    )}
                  </button>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-zinc-500 dark:text-zinc-400">Didn't receive the code?</span>
                    <button
                      type="button"
                      disabled={countdown > 0 || loading}
                      onClick={handleSendOtp}
                      className="inline-flex items-center gap-1 font-bold text-[#E52237] hover:underline disabled:opacity-50"
                    >
                      <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                      {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* VIEW 3: MAIN AUTH INTERFACE WITH INSTANT BETA ACCESS */
            <div>
              {/* Card Title & Value Prop */}
              <div className="mb-4">
                <h1 className="font-display text-2xl font-black tracking-tight text-[#09090B] dark:text-white">
                  {targetAudience === "student" ? "Student Desk" : "School & College"}
                </h1>
                <p className="mt-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {targetAudience === "student"
                    ? "Evaluate handwritten papers, diagnose mistake patterns, and practice weak topics."
                    : "Grade handwritten exams with rubrics and track classroom mastery."}
                </p>
              </div>

              {/* PRIMARY: 1-CLICK LOGIN WITHOUT ACCOUNT */}
              <div className="mb-3">
                <button
                  type="button"
                  onClick={handleEnterBetaTesting}
                  className="w-full flex flex-col items-center justify-center p-3.5 border-2 border-foreground bg-primary text-primary-foreground shadow-[3px_3px_0_hsl(var(--foreground))] hover:bg-primary/90 active:translate-x-[1px] active:translate-y-[1px] transition-transform motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-center gap-2">
                    <Zap size={16} className="fill-current text-primary-foreground" />
                    <span className="text-sm font-black tracking-tight">
                      {targetAudience === "student" ? "Login without account (Student Desk)" : "Login without account (Educator)"}
                    </span>
                  </div>
                  <span className="mt-0.5 text-[11px] font-medium opacity-90">
                    Instant access without credentials
                  </span>
                </button>
              </div>

              {/* 2. GOOGLE SIGN IN BUTTON */}
              <div className="mb-3">
                <button
                  type="button"
                  disabled={loading || googleLoading}
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-2.5 border-2 border-border bg-card py-2.5 text-xs font-bold text-foreground shadow-[3px_3px_0_hsl(var(--foreground))] active:translate-x-[1px] active:translate-y-[1px] hover:bg-muted transition-transform motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {googleLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-primary" /> Connecting to Google...
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                        <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z" fill="#EA4335"/>
                        <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4"/>
                        <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05"/>
                        <path d="M12.0004 24C15.2404 24 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26537 14.29L1.27539 17.385C3.25539 21.31 7.3104 24 12.0004 24Z" fill="#34A853"/>
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>
              </div>

              {/* CLEAN DIVIDER */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                </div>
                <span className="relative bg-white dark:bg-[#18181c] px-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  or sign in with credentials
                </span>
              </div>

              {/* STANDARD TABS (Log in vs Sign up) */}
              <div className="grid grid-cols-2 gap-2 p-1 border-2 border-[#09090B] dark:border-[#52525b] bg-[#f2eee6] dark:bg-[#27272a] mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setTab("login");
                    setError("");
                    setSuccessMsg("");
                  }}
                  className={`py-1.5 text-xs font-black transition-all ${
                    tab === "login"
                      ? "bg-[#E52237] text-white shadow-[2px_2px_0_#09090B] dark:shadow-[2px_2px_0_#000]"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-foreground"
                  }`}
                >
                  Log In
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTab("signup");
                    setError("");
                    setSuccessMsg("");
                  }}
                  className={`py-1.5 text-xs font-black transition-all ${
                    tab === "signup"
                      ? "bg-[#E52237] text-white shadow-[2px_2px_0_#09090B] dark:shadow-[2px_2px_0_#000]"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-foreground"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Notification Banners */}
              {error && (
                <div className="mb-4 border-2 border-red-600 bg-red-100 dark:bg-red-950/40 p-3 text-xs font-bold text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="mb-4 border-2 border-emerald-600 bg-emerald-100 dark:bg-emerald-950/40 p-3 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0" /> {successMsg}
                </div>
              )}

              {/* FORM: EMAIL + PASSWORD */}
              <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                {tab === "signup" && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Full name
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-3 text-zinc-400 dark:text-zinc-500" />
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        type="text"
                        placeholder={targetAudience === "student" ? "Alex Sharma" : "Dr. Rajesh Sharma"}
                        required
                        className="w-full border-2 border-[#09090B] dark:border-[#52525b] bg-[#FAFAFA] dark:bg-[#27272a] text-[#09090B] dark:text-white pl-9 pr-3 py-2 text-sm font-bold outline-none focus:border-[#E52237]"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-3 text-zinc-400 dark:text-zinc-500" />
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      placeholder="name@example.com"
                      required
                      autoCapitalize="none"
                      autoComplete="email"
                      className="w-full border-2 border-[#09090B] dark:border-[#52525b] bg-[#FAFAFA] dark:bg-[#27272a] text-[#09090B] dark:text-white pl-9 pr-3 py-2 text-sm font-bold outline-none focus:border-[#E52237]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Password
                    </label>
                    {tab === "login" && (
                      <button
                        type="button"
                        onClick={() => {
                          setResetEmail(email);
                          setView("forgot-password");
                          setError("");
                          setSuccessMsg("");
                        }}
                        className="text-xs font-bold text-[#E52237] hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-3 text-zinc-400 dark:text-zinc-500" />
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      autoComplete={tab === "login" ? "current-password" : "new-password"}
                      className="w-full border-2 border-[#09090B] dark:border-[#52525b] bg-[#FAFAFA] dark:bg-[#27272a] text-[#09090B] dark:text-white pl-9 pr-10 py-2 text-sm font-bold outline-none focus:border-[#E52237]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-zinc-400 dark:text-zinc-400 hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {tab === "signup" && (
                    <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                      Must be at least 6 characters
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full flex items-center justify-center gap-2 border-2 border-[#09090B] dark:border-[#3f3f46] text-white py-3 text-sm font-extrabold shadow-[4px_4px_0_#09090B] dark:shadow-[4px_4px_0_#000] active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 transition-all bg-[#E52237] hover:bg-[#cc182b]"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Please wait...
                    </>
                  ) : tab === "login" ? (
                    targetAudience === "student" ? "Log in as student" : "Log in to faculty desk"
                  ) : (
                    targetAudience === "student" ? "Create student account" : "Create institution account"
                  )}
                </button>
              </form>

              {/* Switcher & Secondary Options */}
              <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2 text-center text-xs">
                {tab === "login" ? (
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setTab("signup");
                        setError("");
                        setSuccessMsg("");
                      }}
                      className="font-bold text-[#E52237] hover:underline"
                    >
                      Sign up
                    </button>
                  </p>
                ) : (
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setTab("login");
                        setError("");
                        setSuccessMsg("");
                      }}
                      className="font-bold text-[#E52237] hover:underline"
                    >
                      Log in
                    </button>
                  </p>
                )}

                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpEmail(email);
                      setView("otp");
                      setOtpStep("request");
                      setError("");
                      setSuccessMsg("");
                    }}
                    className="text-zinc-500 dark:text-zinc-400 hover:text-[#E52237] hover:underline"
                  >
                    Sign in with email OTP code instead
                  </button>
                </div>
              </div>
            </div>
          )}

          {onViewWeb && !isAppEnvironment() && (
            <div className="mt-4 pt-3 border-t border-border/40 text-center">
              <button
                type="button"
                onClick={onViewWeb}
                className="text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-[#E52237] underline"
              >
                View marketing website
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-5 text-center space-y-2">
          <div className="flex items-center justify-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
            <a href="/privacy" className="hover:text-[#E52237] hover:underline">Privacy Policy</a>
            <a href="/terms" className="hover:text-[#E52237] hover:underline">Terms of Service</a>
            <a href="/contact" className="hover:text-[#E52237] hover:underline">Support</a>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Rubrica for students and schools
          </p>
        </div>
      </div>
    </div>
  );
}
