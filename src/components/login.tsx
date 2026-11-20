import { useState, useEffect } from 'react';
import { 
  X, Loader2, Mail, Lock, User, Eye, EyeOff, 
  ArrowLeft, CheckCircle2, GraduationCap, School, Zap, ChevronDown, ChevronUp, Sparkles
} from 'lucide-react';
import { 
  loginUser, 
  registerUser, 
  signInWithGoogle, 
  resetPassword, 
  signInWithOtp, 
  verifyOtp
} from '@/lib/api';
import { type TeacherProfile } from '@/lib/storage';
import { useBackButton } from '@/lib/back-button';

type LoginProps = {
  onClose: () => void;
  onLogin: (profile: TeacherProfile & { email?: string }) => void;
};

export function Login({ onClose, onLogin }: LoginProps) {
  const [targetAudience, setTargetAudience] = useState<'student' | 'teacher'>('student');
  const [customName, setCustomName] = useState('');
  const [customDetail, setCustomDetail] = useState('');
  const [showCloudLogin, setShowCloudLogin] = useState(false);

  // Standard platform auth tabs: "login" | "signup"
  const [tab, setTab] = useState<'login' | 'signup'>('login');

  // Sub-view for cloud auth: "main" | "forgot-password" | "otp"
  const [view, setView] = useState<'main' | 'forgot-password' | 'otp'>('main');

  // Form fields for cloud auth
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // OTP flow state
  const [otpStep, setOtpStep] = useState<'request' | 'verify'>('request');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useBackButton(() => {
    if (view !== 'main') {
      setView('main');
      return true;
    }
    if (showCloudLogin) {
      setShowCloudLogin(false);
      return true;
    }
    onClose();
    return true;
  }, true);

  // Timer for OTP resend countdown
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Primary: Enter without account instantly
  const handleEnterWithoutAccount = () => {
    try {
      localStorage.setItem("rubrica_app_mode", "true");
    } catch {}

    if (targetAudience === 'student') {
      try { localStorage.setItem("rubrica_intended_role", "student"); } catch {}
      const finalName = customName.trim() || "Aryan Patel";
      const finalExam = customDetail.trim() || "JEE Advanced 2026";
      const studentProfile: TeacherProfile = {
        id: "student-beta-session",
        name: finalName,
        email: "student.beta@rubrica.in",
        role: "student",
        institution: "JEE Advanced Prep",
        institutionId: "student-beta-inst",
        gradeOrExam: finalExam,
        isBeta: true,
        createdAt: new Date().toISOString()
      };
      onLogin(studentProfile);
    } else {
      try { localStorage.setItem("rubrica_intended_role", "teacher"); } catch {}
      const finalName = customName.trim() || "Dr. Rehan Khan";
      const finalInst = customDetail.trim() || "Rubrica Academy";
      const facultyProfile: TeacherProfile = {
        id: "b0000000-0000-4000-8000-000000000001",
        name: finalName,
        email: "beta@rubrica.in",
        role: "teacher",
        institution: finalInst,
        institutionId: "beta-institution",
        isBeta: true,
        createdAt: new Date().toISOString()
      };
      onLogin(facultyProfile);
    }
  };

  // Handle Google OAuth
  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setError('');
      await signInWithGoogle(targetAudience);
    } catch (err: any) {
      setError(err.message || 'Google sign in failed. Please try again.');
      setGoogleLoading(false);
    }
  };

  // Handle Password Login / Sign Up Submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    const trimmedEmail = email.trim();
    const passwordValue = password;

    if (!trimmedEmail || !passwordValue) {
      setError('Please provide both email and password.');
      setLoading(false);
      return;
    }

    try {
      if (tab === 'login') {
        const profile = await loginUser({ 
          data: { 
            email: trimmedEmail, 
            password: passwordValue,
            role: targetAudience
          } 
        });
        onLogin({
          ...profile,
          role: targetAudience === 'student' ? 'student' : (profile.role || 'teacher'),
        });
      } else {
        const trimmedName = name.trim();
        if (!trimmedName) {
          setError('Please enter your full name.');
          setLoading(false);
          return;
        }

        const profile = await registerUser({
          data: { 
            email: trimmedEmail, 
            password: passwordValue, 
            name: trimmedName, 
            role: targetAudience
          },
        });

        if (profile.session) {
          onLogin({
            ...profile,
            role: targetAudience,
          });
        } else {
          setSuccessMsg('Account created! Please check your email inbox to confirm your address, then log in.');
          setTab('login');
          setPassword('');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setError('Please enter your registered email address.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      await resetPassword(resetEmail.trim());
      setResetSent(true);
      setSuccessMsg('Password reset instructions sent. Please check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Could not send reset link. Please check your email address.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpEmail.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      await signInWithOtp(otpEmail.trim());
      setOtpStep('verify');
      setCountdown(60);
      setSuccessMsg(`A 6-digit login code has been sent to ${otpEmail.trim()}`);
    } catch (err: any) {
      setError(err.message || 'Could not send OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const profile = await verifyOtp(otpEmail.trim(), otpCode.trim(), { role: targetAudience });
      onLogin({
        ...profile,
        role: targetAudience,
      });
    } catch (err: any) {
      setError(err.message || 'Invalid or expired code. Please request a new code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-dialog-title"
        className="relative w-full max-w-lg border-2 border-border bg-card text-card-foreground p-5 sm:p-7 paper-shadow shadow-[6px_6px_0_hsl(var(--foreground))] my-auto max-h-[92dvh] overflow-y-auto no-scrollbar"
      >
        {/* Top bar with close button */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="Rubrica" className="h-6 w-6 object-contain" />
            <span className="font-display text-lg font-black tracking-tight text-foreground">
              rubri<span className="text-primary">ca</span>
            </span>
            <span className="text-[11px] font-bold bg-primary/10 text-primary px-2 py-0.5 border border-primary/30">
              Zero setup
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="grid h-8 w-8 place-items-center border-2 border-border bg-muted hover:bg-muted/80 text-foreground transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X size={15} />
          </button>
        </div>

        {/* Headline & Description */}
        <div className="mb-4">
          <h2 id="login-dialog-title" className="font-display text-xl sm:text-2xl font-black text-foreground text-balance">
            Login without account
          </h2>
          <p className="mt-1 text-xs text-muted-foreground text-pretty">
            Start evaluating handwritten answer sheets, analyzing error patterns, and using the AI study tutor immediately. No passwords or email verifications needed.
          </p>
        </div>

        {/* WORKSPACE SELECTION CARDS */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <button
            type="button"
            onClick={() => {
              setTargetAudience('student');
              try { localStorage.setItem('rubrica_intended_role', 'student'); } catch {}
              setError('');
              setSuccessMsg('');
            }}
            className={`flex flex-col text-left p-3 border-2 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              targetAudience === 'student'
                ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary/40 shadow-[2px_2px_0_hsl(var(--foreground))]'
                : 'border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">
                <GraduationCap size={15} className={targetAudience === 'student' ? 'text-primary' : 'text-muted-foreground'} />
                Student Desk
              </span>
              {targetAudience === 'student' && (
                <span className="h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Mock tests, mistake tracker, KaTeX DPP worksheets & 3-mode AI tutor
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setTargetAudience('teacher');
              try { localStorage.setItem('rubrica_intended_role', 'teacher'); } catch {}
              setError('');
              setSuccessMsg('');
            }}
            className={`flex flex-col text-left p-3 border-2 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              targetAudience === 'teacher'
                ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary/40 shadow-[2px_2px_0_hsl(var(--foreground))]'
                : 'border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground">
                <School size={15} className={targetAudience === 'teacher' ? 'text-primary' : 'text-muted-foreground'} />
                Educator Dashboard
              </span>
              {targetAudience === 'teacher' && (
                <span className="h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Classrooms, Vision AI paper grading, split-screen verification & gradebook
            </p>
          </button>
        </div>

        {/* OPTIONAL PROFILE CUSTOMIZATION */}
        <div className="space-y-2.5 p-3 border border-border bg-muted/20 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground">
              Profile details (optional)
            </span>
            <span className="text-[10px] text-muted-foreground">
              Saved locally
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label htmlFor="login-custom-name" className="block text-[11px] font-bold text-foreground mb-1">
                Your name
              </label>
              <input
                id="login-custom-name"
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={targetAudience === 'student' ? 'Aryan Patel' : 'Dr. Rehan Khan'}
                className="w-full border-2 border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors motion-reduce:transition-none"
              />
            </div>

            <div>
              <label htmlFor="login-custom-detail" className="block text-[11px] font-bold text-foreground mb-1">
                {targetAudience === 'student' ? 'Target Exam / Grade' : 'School / Institution'}
              </label>
              <input
                id="login-custom-detail"
                type="text"
                value={customDetail}
                onChange={(e) => setCustomDetail(e.target.value)}
                placeholder={targetAudience === 'student' ? 'JEE Advanced 2026' : 'Rubrica Academy'}
                className="w-full border-2 border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors motion-reduce:transition-none"
              />
            </div>
          </div>
        </div>

        {/* PRIMARY CTA: ENTER WITHOUT ACCOUNT */}
        <button
          type="button"
          onClick={handleEnterWithoutAccount}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-foreground bg-primary text-primary-foreground font-black text-xs sm:text-sm shadow-[3px_3px_0_hsl(var(--foreground))] hover:bg-primary/90 active:translate-x-[1px] active:translate-y-[1px] transition-transform motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary mb-2"
        >
          <Zap size={16} className="fill-current text-primary-foreground" />
          <span>Enter {targetAudience === 'student' ? 'Student Desk' : 'Educator Dashboard'} without account</span>
        </button>

        <p className="text-center text-[10px] text-muted-foreground font-medium mb-4">
          All test scans, rubrics, and practice problem sets are saved directly to your browser session.
        </p>

        {/* COLLAPSIBLE CLOUD ACCOUNT OPTIONS */}
        <div className="border-t border-border pt-3">
          <button
            type="button"
            onClick={() => {
              setShowCloudLogin(!showCloudLogin);
              setError('');
              setSuccessMsg('');
            }}
            className="w-full flex items-center justify-between text-left text-xs font-bold text-muted-foreground hover:text-foreground transition-colors motion-reduce:transition-none py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span>Have an existing cloud account?</span>
            <span className="flex items-center gap-1 text-[11px] text-primary">
              {showCloudLogin ? 'Hide cloud sign in' : 'Sign in with Google / email'}
              {showCloudLogin ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </span>
          </button>

          {showCloudLogin && (
            <div className="mt-3 pt-3 border-t border-border/60 space-y-3">
              {/* Google OAuth */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-2.5 py-2 px-3 border-2 border-border bg-background hover:bg-muted text-foreground text-xs font-bold shadow-[2px_2px_0_hsl(var(--foreground))] transition-transform motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
              >
                {googleLoading ? (
                  <Loader2 size={14} className="animate-spin text-primary" />
                ) : (
                  <>
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              {/* View 1: Forgot Password */}
              {view === 'forgot-password' ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => { setView('main'); setError(''); setSuccessMsg(''); }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <ArrowLeft size={13} /> Back to email sign in
                  </button>

                  <h3 className="text-sm font-bold text-foreground">Reset your password</h3>

                  {error && (
                    <div className="border border-destructive bg-destructive/10 p-2 text-xs font-semibold text-destructive">
                      {error}
                    </div>
                  )}

                  {successMsg && (
                    <div className="border border-accent bg-accent/10 p-2 text-xs font-semibold text-accent-foreground flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-accent" /> {successMsg}
                    </div>
                  )}

                  <form onSubmit={handleForgotPassword} className="space-y-2.5">
                    <div>
                      <label htmlFor="login-reset-email" className="block text-[11px] font-bold text-foreground mb-1">
                        Email address
                      </label>
                      <input
                        id="login-reset-email"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="name@example.com"
                        required
                        className="w-full border-2 border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2 bg-primary text-primary-foreground font-bold text-xs shadow-[2px_2px_0_hsl(var(--foreground))] border-2 border-foreground hover:bg-primary/90 transition-transform motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {loading ? <Loader2 size={13} className="animate-spin" /> : 'Send reset link'}
                    </button>
                  </form>
                </div>
              ) : view === 'otp' ? (
                /* View 2: OTP */
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => { setView('main'); setError(''); setSuccessMsg(''); }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <ArrowLeft size={13} /> Back to email sign in
                  </button>

                  <h3 className="text-sm font-bold text-foreground">
                    {otpStep === 'request' ? 'Sign in with email OTP' : 'Enter 6-digit code'}
                  </h3>

                  {error && (
                    <div className="border border-destructive bg-destructive/10 p-2 text-xs font-semibold text-destructive">
                      {error}
                    </div>
                  )}

                  {successMsg && (
                    <div className="border border-accent bg-accent/10 p-2 text-xs font-semibold text-accent-foreground flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-accent" /> {successMsg}
                    </div>
                  )}

                  {otpStep === 'request' ? (
                    <form onSubmit={handleSendOtp} className="space-y-2.5">
                      <div>
                        <label htmlFor="login-otp-email" className="block text-[11px] font-bold text-foreground mb-1">
                          Email address
                        </label>
                        <input
                          id="login-otp-email"
                          type="email"
                          value={otpEmail}
                          onChange={(e) => setOtpEmail(e.target.value)}
                          placeholder="name@example.com"
                          required
                          className="w-full border-2 border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 bg-primary text-primary-foreground font-bold text-xs shadow-[2px_2px_0_hsl(var(--foreground))] border-2 border-foreground hover:bg-primary/90 transition-transform motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {loading ? <Loader2 size={13} className="animate-spin" /> : 'Send login code'}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-2.5">
                      <div>
                        <label htmlFor="login-otp-code" className="block text-[11px] font-bold text-foreground mb-1">
                          6-digit code
                        </label>
                        <input
                          id="login-otp-code"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]{6}"
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="123456"
                          required
                          className="w-full border-2 border-border bg-background px-3 py-1.5 text-center font-mono text-base tracking-widest font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading || otpCode.length !== 6}
                        className="w-full py-2 bg-primary text-primary-foreground font-bold text-xs shadow-[2px_2px_0_hsl(var(--foreground))] border-2 border-foreground hover:bg-primary/90 transition-transform motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {loading ? <Loader2 size={13} className="animate-spin" /> : 'Verify & sign in'}
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                /* View 3: Email password login / signup */
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-1.5 p-1 border border-border bg-muted/40">
                    <button
                      type="button"
                      onClick={() => { setTab('login'); setError(''); setSuccessMsg(''); }}
                      className={`py-1 text-xs font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        tab === 'login' ? 'bg-primary text-primary-foreground shadow-[1px_1px_0_hsl(var(--foreground))]' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Log in
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTab('signup'); setError(''); setSuccessMsg(''); }}
                      className={`py-1 text-xs font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        tab === 'signup' ? 'bg-primary text-primary-foreground shadow-[1px_1px_0_hsl(var(--foreground))]' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Sign up
                    </button>
                  </div>

                  {error && (
                    <div className="border border-destructive bg-destructive/10 p-2 text-xs font-semibold text-destructive">
                      {error}
                    </div>
                  )}

                  {successMsg && (
                    <div className="border border-accent bg-accent/10 p-2 text-xs font-semibold text-accent-foreground flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-accent" /> {successMsg}
                    </div>
                  )}

                  <form onSubmit={handleAuthSubmit} className="space-y-2.5">
                    {tab === 'signup' && (
                      <div>
                        <label htmlFor="login-signup-name" className="block text-[11px] font-bold text-foreground mb-1">
                          Full name
                        </label>
                        <input
                          id="login-signup-name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your name"
                          required
                          className="w-full border-2 border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        />
                      </div>
                    )}

                    <div>
                      <label htmlFor="login-email" className="block text-[11px] font-bold text-foreground mb-1">
                        Email address
                      </label>
                      <input
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        required
                        className="w-full border-2 border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="login-password" className="block text-[11px] font-bold text-foreground">
                          Password
                        </label>
                        {tab === 'login' && (
                          <button
                            type="button"
                            onClick={() => { setResetEmail(email); setView('forgot-password'); setError(''); setSuccessMsg(''); }}
                            className="text-[11px] font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          minLength={6}
                          className="w-full border-2 border-border bg-background pl-3 pr-8 py-1.5 text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2 bg-primary text-primary-foreground font-bold text-xs shadow-[2px_2px_0_hsl(var(--foreground))] border-2 border-foreground hover:bg-primary/90 transition-transform motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {loading ? <Loader2 size={13} className="animate-spin" /> : tab === 'login' ? 'Log in' : 'Create account'}
                    </button>
                  </form>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => { setOtpEmail(email); setView('otp'); setOtpStep('request'); setError(''); setSuccessMsg(''); }}
                      className="text-[11px] text-muted-foreground hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      Sign in with email OTP code instead
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
