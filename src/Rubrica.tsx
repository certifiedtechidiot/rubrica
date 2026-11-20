import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import { AutomatedEvaluate } from '@/components/automated-evaluate';
import { AdminPanel } from '@/components/admin';
import { SafeMarkdown } from '@/components/safe-markdown';
import { UndoBanner, type UndoAction } from '@/components/undo-banner';
import {
  Bot, AlertTriangle, ArrowLeft, BarChart3, BookOpen, Check, ChevronRight, CircleHelp, Eye, FileCheck2,
  FileText, Filter, Home, Menu, PenLine, Plus, Search, Settings, Settings2, Trash2, Upload, Users, X, Zap, LogOut,
  Loader2, Sparkles, Sun, Moon, Laptop, Smartphone
} from 'lucide-react';
import { useTheme } from '@/lib/theme';
import {
  loadConfig, loadLocalData, loadTeacherProfile, saveConfig, saveTeacherProfile, 
  analyzeStudentHistory, fetchDashboardData, generateStudentProfile,
  getSampleBetaData, saveBetaData, resetBetaData,
  type EvaluationRecord, type RubricaConfig, type PersistedData, 
  type StudentRecord, type TeacherProfile, type VisionEvaluation, type ClassroomRecord,
  type StudentProfileRecord, type DPPRecord
} from '@/lib/storage';
import { LandingPage } from '@/components/landing-page';
import { MobileAppAuth } from '@/components/mobile-app-auth';
import { isAppEnvironment } from '@/lib/platform';
import { Classrooms, ClassroomProfile } from '@/components/classrooms';
import { Login } from '@/components/login';
import { Onboarding } from '@/components/onboarding';
import { addClassroomFn, updateClassroomRubricFn, addStudentFn, saveEvaluationFn, saveStudentProfileFn, getTeacherProfile, getInstitutions, deleteStudentFn, deleteClassroomFn, deleteEvaluationFn, isCurrentUserAdmin } from '@/lib/api';
import { generateDppFn } from '@/lib/ai';
import { supabase } from '@/lib/supabase';
import { PrivacyPolicy } from '@/components/privacy-policy';
import { TermsOfService } from '@/components/terms-of-service';
import { Contact } from '@/components/contact';
import { StudentAiTutor, type TutorMode } from '@/components/student-ai-tutor';
import { DppWorksheetViewer } from '@/components/dpp-worksheet-viewer';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { initBackButtonListener, setRouterNavigator, useBackButton } from '@/lib/back-button';

const queryClient = new QueryClient();
const palette = ['#E52237', '#10B981', '#F59E0B', '#8B5CF6', '#0EA5E9', '#14B8A6'];
const navItems = [
  { href: '/', label: 'Overview', icon: Home },
  { href: '/classrooms', label: 'Classrooms', icon: BookOpen },
  { href: '/students', label: 'Students', icon: Users },
  { href: '/evaluate', label: 'Evaluate paper', icon: FileCheck2 },
];

function initials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function cleanStudentName(name?: string | null) {
  if (!name || name.trim() === '' || name.toLowerCase() === 'self learner' || name.toLowerCase() === 'guest' || name.toLowerCase() === 'self-student' || name.toLowerCase() === 'teacher') {
    return 'Student';
  }
  return name.trim();
}

function cleanStudentGrade(grade?: string | null) {
  if (!grade || grade.trim() === '' || grade.toLowerCase() === 'self-prep' || grade.toLowerCase() === 'self prep') {
    return 'Target Exam';
  }
  return grade.trim();
}

function slug(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `student-${Date.now()}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} hr ago`;
  return `${Math.round(minutes / 1440)}d ago`;
}

function percent(score: number, max: number) {
  return max > 0 ? Math.round((score / max) * 100) : 0;
}

function SectionLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`mb-1 text-xs font-medium text-muted-foreground ${className}`}>{children}</p>;
}

function ScoreChip({ score }: { score: number }) {
  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 font-mono text-xs font-bold tabular-nums ${
        score >= 80
          ? 'border-emerald-600/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
          : score >= 70
          ? 'border-amber-600/40 bg-amber-500/10 text-amber-800 dark:text-amber-300'
          : 'border-primary/40 bg-primary/10 text-primary'
      }`}
    >
      {score}%
    </span>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="border-2 border-dashed border-border bg-card px-6 py-12 text-center"><BookOpen className="mx-auto mb-3 text-muted-foreground" size={24} /><p className="font-display text-lg font-bold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{text}</p></div>;
}

function AppShell({ 
  children, 
  teacher, 
  data, 
  onSettings,
  isAdmin = false
}: { 
  children: ReactNode; 
  teacher: TeacherProfile | null; 
  data: PersistedData; 
  onSettings: () => void;
  isAdmin?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location, setLocation] = useLocation();

  useEffect(() => {
    setRouterNavigator(setLocation);
  }, [setLocation]);

  useBackButton(() => {
    setMenuOpen(false);
    return true;
  }, menuOpen);

  const { resolvedTheme, toggleTheme } = useTheme();
  const isStudent = teacher?.role === 'student';
  const teacherName = isStudent ? cleanStudentName(teacher?.name) : (teacher?.name || 'Teacher');
  const hasClassrooms = Boolean(data?.classrooms && data.classrooms.length > 0);
  const hasStudents = Boolean(data?.students && data.students.length > 0);
  const canEvaluate = isStudent || (hasClassrooms && hasStudents);

  const activeNavItems = isStudent
    ? [
        { href: '/', label: 'Overview', icon: BarChart3 },
        { href: '/evaluate', label: 'Scan paper', icon: FileCheck2 },
        { href: '/papers', label: 'Test papers', icon: FileText },
        { href: '/dpps', label: 'Practice DPPs', icon: BookOpen },
        { href: '/mistakes', label: 'Mistake analytics', icon: Zap },
        { href: '/tutor', label: 'AI study tutor', icon: Bot },
      ]
    : navItems;

  const evaluateDisabledMsg = !hasClassrooms && !hasStudents
    ? 'Add classroom and students'
    : !hasStudents
    ? 'Add students'
    : !hasClassrooms
    ? 'Add classroom'
    : '';

  return <div className="min-h-[100dvh] bg-background">
    <aside className={`fixed inset-y-0 left-0 z-30 flex w-[244px] flex-col justify-between border-r border-border bg-[#f2eee6] dark:bg-[#141417] px-4 py-5 transition-transform duration-200 motion-reduce:transform-none md:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="mb-6 flex items-center justify-between px-2">
          <Link href="/" className="flex items-center gap-2.5" data-testid="link-brand">
            <img src="/favicon.svg" alt="Rubrica Logo" className="h-9 w-9 object-contain" />
            <span className="font-display text-xl font-bold tracking-tight">rubri<span className="text-primary">ca</span></span>
          </Link>
          <button className="md:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu" data-testid="button-close-menu"><X size={19} /></button>
        </div>
        <p className="mb-2 px-3 text-xs font-semibold text-muted-foreground">
          {isStudent ? 'Student desk' : 'Faculty desk'}
        </p>
        <nav className="space-y-1">
          {activeNavItems.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? location === '/' : location.startsWith(href);
            const isEvaluate = href === '/evaluate';
            const disabled = isEvaluate && !canEvaluate;

            if (disabled) {
              return (
                <Tooltip key={href}>
                  <TooltipTrigger asChild>
                    <button type="button" className="flex w-full items-center gap-3 border border-transparent px-3 py-2.5 text-xs font-semibold opacity-40 cursor-not-allowed text-muted-foreground select-none text-left" data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}-disabled`}>
                      <Icon size={16} />
                      <span>{label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="border-2 border-foreground bg-card font-bold text-foreground shadow-[2px_2px_0_#09090B] dark:shadow-[2px_2px_0_#000]">
                    {evaluateDisabledMsg}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link 
                key={href} 
                href={href} 
                onClick={() => setMenuOpen(false)} 
                data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`} 
                className={`flex items-center gap-3 border px-3 py-2.5 text-xs font-semibold transition-transform duration-150 motion-reduce:transform-none ${
                  active 
                    ? 'border-foreground bg-foreground text-background dark:border-primary dark:bg-card dark:text-white shadow-[2px_2px_0_var(--color-primary)]' 
                    : 'border-transparent text-muted-foreground hover:border-border hover:bg-[#e9e4da] dark:hover:bg-[#202026] hover:text-foreground'
                }`}
              >
                <Icon size={16} />
                <span>{label}</span>
                {active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            );
          })}
          {isAdmin && (
            <Link href="/admin" onClick={() => setMenuOpen(false)} className={`flex items-center gap-3 border px-3 py-2.5 text-xs font-semibold transition-transform duration-150 motion-reduce:transform-none ${location.startsWith('/admin') ? 'border-foreground bg-foreground text-background dark:border-primary dark:bg-card dark:text-white shadow-[2px_2px_0_var(--color-primary)]' : 'border-transparent text-muted-foreground hover:border-border hover:bg-[#e9e4da] dark:hover:bg-[#202026] hover:text-foreground'}`}><Settings2 size={16} /><span>Admin Panel</span>{location.startsWith('/admin') && <ChevronRight size={14} className="ml-auto" />}</Link>
          )}
        </nav>
      </div>

      <div className="pt-4 border-t border-border/70 space-y-1 shrink-0">
        {!isAppEnvironment() && (
          <a 
            href="https://certifiedtechidiot.github.io/rubrica-app/rubrica.apk" 
            className="flex w-full items-center justify-between border-2 border-transparent px-3 py-2 text-xs font-bold text-muted-foreground hover:border-border hover:bg-card hover:text-primary transition-colors"
            data-testid="link-sidebar-download-app"
          >
            <div className="flex items-center gap-3"><Smartphone size={16} className="text-primary" /> Download App</div>
            <span className="font-mono text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 border border-primary/40 font-bold">APK</span>
          </a>
        )}
        <button onClick={onSettings} className="flex w-full items-center justify-between border-2 border-transparent px-3 py-2 text-xs font-bold text-muted-foreground hover:border-border hover:bg-card hover:text-foreground transition-colors">
          <div className="flex items-center gap-3"><Settings size={16} /> Settings</div>
        </button>
        <button onClick={async () => { await supabase.auth.signOut(); localStorage.clear(); window.location.reload(); }} className="flex w-full items-center justify-between border-2 border-transparent px-3 py-2 text-xs font-bold text-muted-foreground hover:border-border hover:bg-card hover:text-primary transition-colors">
          <div className="flex items-center gap-3"><LogOut size={16} /> Log out</div>
        </button>
      </div>
    </aside>
    {menuOpen && <button className="fixed inset-0 z-20 bg-[#09090B]/20 md:hidden" onClick={() => setMenuOpen(false)} aria-label="Close navigation" data-testid="button-menu-backdrop" />}
    <main className="md:pl-[244px]">
      <header className="sticky top-0 z-10 flex h-[68px] items-center justify-between border-b border-border bg-[#FAFAFA]/95 dark:bg-[#141417]/95 px-5 backdrop-blur-sm md:px-9">
        <button className="md:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu" data-testid="button-open-menu"><Menu size={22} /></button>
        <div className="hidden items-center text-sm font-medium text-muted-foreground md:flex">
          <span>{teacherName}</span>
        </div>
        <div className="ml-auto flex items-center gap-3">

          <button
            onClick={toggleTheme}
            className="grid h-9 w-9 place-items-center border border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
            aria-label="Toggle theme"
            title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
            data-testid="button-app-theme-toggle"
          >
            {resolvedTheme === 'dark' ? <Sun size={17} className="text-[#F59E0B]" /> : <Moon size={17} className="text-[#8B5CF6]" />}
          </button>

          <button className="grid h-9 w-9 place-items-center border border-border bg-card text-muted-foreground hover:border-foreground" aria-label="Help" data-testid="button-help"><CircleHelp size={17} /></button>
          
          {teacher?.email?.toLowerCase() !== 'certifiedtechidiot@gmail.com' && (
            isStudent ? (
              <Link href="/evaluate" className="flex items-center gap-2 border-2 border-[#09090B] dark:border-border bg-primary hover:bg-primary/90 px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-[2px_2px_0_#09090B] dark:shadow-[2px_2px_0_#000] transition-transform hover:translate-x-0.5 hover:translate-y-0.5" data-testid="link-quick-evaluate">
                <Upload size={14} /> Scan paper
              </Link>
            ) : canEvaluate ? (
              <Link href="/evaluate" className="flex items-center gap-2 border-2 border-[#09090B] dark:border-border bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-[3px_3px_0_#09090B] dark:shadow-[3px_3px_0_#000] transition-transform hover:translate-x-0.5 hover:translate-y-0.5" data-testid="link-quick-evaluate">
                <Plus size={15} /> Evaluate paper
              </Link>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block cursor-not-allowed">
                    <button
                      type="button"
                      disabled
                      className="flex items-center gap-2 border-2 border-border bg-[#e4e4e7] dark:bg-muted/40 px-3 py-2 text-xs font-bold text-[#71717a] shadow-none opacity-60 cursor-not-allowed"
                      data-testid="link-quick-evaluate-disabled"
                    >
                      <Plus size={15} /> Evaluate paper
                    </button>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="border-2 border-[#09090B] bg-white font-bold text-[#09090B] shadow-[2px_2px_0_#09090B]">
                  {evaluateDisabledMsg}
                </TooltipContent>
              </Tooltip>
            )
          )}
        </div>
      </header>
      <div className="page-in mx-auto max-w-[1440px] p-5 md:p-9">{children}</div>
    </main>
  </div>;
}

function ProfileModal({ onSave }: { onSave: (profile: TeacherProfile) => void }) {
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-[#09090B]/70 dark:bg-black/80 backdrop-blur-sm p-4">
    <div className="w-full max-w-lg border-2 border-[#09090B] dark:border-border bg-[#fef5f6] dark:bg-[#18181c] p-6 shadow-[8px_8px_0_var(--color-primary)] dark:shadow-[8px_8px_0_#000] md:p-9">
      <h1 className="font-display text-3xl font-bold text-[#09090B] dark:text-foreground">Make the desk yours.</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Tell us who is doing the marking. This stays on your device and personalises your gradebook.</p>
      <div className="mt-7 space-y-4">
        <label className="block text-sm font-bold text-foreground">Teacher name and title<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Ms. Morgan Shah" className="mt-2 h-12 w-full border-2 border-[#09090B] dark:border-border bg-white dark:bg-secondary/40 text-foreground px-3 outline-none focus:border-primary" data-testid="input-teacher-name" /></label>
        <label className="block text-sm font-bold text-foreground">School or institution<input value={institution} onChange={(event) => setInstitution(event.target.value)} placeholder="e.g. Year 8, Hawthorne Academy" className="mt-2 h-12 w-full border-2 border-[#09090B] dark:border-border bg-white dark:bg-secondary/40 text-foreground px-3 outline-none focus:border-primary" data-testid="input-teacher-institution" /></label>
      </div>
      <button disabled={!name.trim() || !institution.trim()} onClick={() => onSave({ name: name.trim(), institution: institution.trim() })} className="mt-7 w-full border-2 border-[#09090B] dark:border-border bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-[4px_4px_0_#09090B] dark:shadow-[4px_4px_0_#000] disabled:cursor-not-allowed disabled:opacity-40 transition-transform hover:translate-x-[1px] hover:translate-y-[1px]" data-testid="button-save-teacher-profile">Open my gradebook</button>
    </div>
  </div>;
}

function SettingsDrawer({ 
  config, 
  onClose, 
  onSave,
  fontSize,
  onFontSizeChange,
  isStudent
}: { 
  config: RubricaConfig; 
  onClose: () => void; 
  onSave: (config: RubricaConfig) => void;
  fontSize: 'normal' | 'large' | 'xlarge';
  onFontSizeChange: (size: 'normal' | 'large' | 'xlarge') => void;
  isStudent?: boolean;
}) {
  const { theme, setTheme } = useTheme();
  const [draft, setDraft] = useState<RubricaConfig>(() => ({
    ...config,
    theme: config.theme || theme || 'system',
  }));
  const update = (key: keyof RubricaConfig, value: string) => setDraft((current) => ({ ...current, [key]: value }));

  const handleClose = () => {
    if (draft.theme !== (config.theme || theme)) {
      setTheme((config.theme as any) || 'system');
    }
    onClose();
  };

  const handleSave = () => {
    if (draft.theme) {
      setTheme(draft.theme as any);
    }
    onSave(draft);
  };

  return <div className="fixed inset-0 z-[60] bg-[#09090B]/45 dark:bg-black/60" onMouseDown={(event) => event.target === event.currentTarget && handleClose()}>
    <aside className="absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto border-l-2 border-[#09090B] dark:border-border bg-[#FAFAFA] dark:bg-card p-6 shadow-[-8px_0_0_rgba(9,9,11,.15)] dark:shadow-[-8px_0_0_rgba(0,0,0,.6)] md:p-8">
      <div className="flex items-start justify-between"><div><h2 className="font-display text-3xl font-bold">Desk settings</h2></div><button onClick={handleClose} className="grid h-8 w-8 place-items-center border-2 border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Close settings" title="Close settings" data-testid="button-close-settings"><X size={18} /></button></div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{isStudent ? 'Customize your study desk preferences, readability, and theme.' : 'Customize your desk preferences, readability, and connections for this browser.'}</p>

      {/* Readability & Vision / Font Size Setting */}
      <div className="mt-8 border-2 border-border bg-card p-5 paper-shadow">
        <h3 className="font-display text-lg font-bold">Interface text size</h3>
        <p className="mt-1 text-xs text-muted-foreground">Adjust text scaling for comfortable reading and eyesight fatigue.</p>
        
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { id: 'normal', label: 'Default', size: '100%', preview: 'A' },
            { id: 'large', label: 'Large', size: '115%', preview: 'A+' },
            { id: 'xlarge', label: 'Extra Large', size: '130%', preview: 'A++' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onFontSizeChange(item.id as 'normal' | 'large' | 'xlarge')}
              className={`flex flex-col items-center justify-center border-2 p-3 text-center transition-all ${
                fontSize === item.id
                  ? 'border-[#09090B] bg-primary text-primary-foreground shadow-[2px_2px_0_#09090B] dark:border-primary dark:shadow-[2px_2px_0_#000]'
                  : 'border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground'
              }`}
              data-testid={`button-fontsize-${item.id}`}
            >
              <span className="font-display font-bold text-lg leading-none">{item.preview}</span>
              <span className="mt-1 text-xs font-semibold">{item.label}</span>
              <span className="font-mono-score text-[9px] opacity-80">{item.size}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 space-y-6">
        <div>
          <label className="block text-sm font-bold text-foreground">Theme &amp; Appearance</label>
          <p className="mt-1 text-xs text-muted-foreground">Select your preferred color theme. Changes preview in real-time.</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setTheme('light');
                update('theme', 'light');
              }}
              data-testid="theme-select-light"
              className={`flex flex-col items-center justify-center gap-1.5 border-2 p-3 text-xs font-bold transition-all ${
                (draft.theme || theme) === 'light'
                  ? 'border-[#09090B] bg-white text-[#09090B] shadow-[3px_3px_0_var(--color-primary)] dark:border-primary dark:bg-secondary dark:text-white'
                  : 'border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground'
              }`}
            >
              <Sun size={18} className="text-[#F59E0B]" />
              <span>Light Mode</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTheme('dark');
                update('theme', 'dark');
              }}
              data-testid="theme-select-dark"
              className={`flex flex-col items-center justify-center gap-1.5 border-2 p-3 text-xs font-bold transition-all ${
                (draft.theme || theme) === 'dark'
                  ? 'border-[#09090B] bg-[#09090B] text-white shadow-[3px_3px_0_var(--color-primary)] dark:border-primary dark:bg-secondary dark:text-white'
                  : 'border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground'
              }`}
            >
              <Moon size={18} className="text-[#8B5CF6]" />
              <span>Dark Mode</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTheme('system');
                update('theme', 'system');
              }}
              data-testid="theme-select-system"
              className={`flex flex-col items-center justify-center gap-1.5 border-2 p-3 text-xs font-bold transition-all ${
                (draft.theme || theme) === 'system'
                  ? 'border-[#09090B] bg-white text-[#09090B] shadow-[3px_3px_0_var(--color-primary)] dark:border-primary dark:bg-secondary dark:text-white'
                  : 'border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground'
              }`}
            >
              <Laptop size={18} className="text-primary" />
              <span>System</span>
            </button>
          </div>
        </div>

        {!isStudent && (
          <div className="border-t border-border pt-6 space-y-4">
            <label className="block text-sm font-bold">Supabase URL<input value={draft.supabaseUrl} onChange={(event) => update('supabaseUrl', event.target.value)} placeholder="https://your-project.supabase.co" className="mt-2 h-11 w-full border-2 border-border bg-background px-3 outline-none focus:border-primary" data-testid="input-supabase-url" /></label>
            <label className="block text-sm font-bold">Supabase Anon Key<input type="password" value={draft.supabaseAnonKey} onChange={(event) => update('supabaseAnonKey', event.target.value)} placeholder="eyJ..." className="mt-2 h-11 w-full border-2 border-border bg-background px-3 outline-none focus:border-primary" data-testid="input-supabase-anon-key" /></label>
          </div>
        )}
      </div>
      <div className="mt-8 flex gap-3"><button onClick={handleClose} className="flex-1 border border-border px-4 py-3 text-sm font-bold hover:bg-muted" data-testid="button-cancel-settings">Cancel</button><button onClick={handleSave} className="flex-1 border-2 border-[#09090B] dark:border-border bg-primary hover:bg-primary/90 px-4 py-3 text-sm font-bold text-primary-foreground shadow-[3px_3px_0_#09090B] dark:shadow-[3px_3px_0_#000] transition-colors" data-testid="button-save-settings">Save settings</button></div>
    </aside>
  </div>;
}

function studentStats(student: StudentRecord, evaluations: EvaluationRecord[], profiles: PersistedData['profiles'], index: number) {
  const own = evaluations.filter((evaluation) => evaluation.studentId === student.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const average = own.length ? Math.round(own.reduce((sum, evaluation) => sum + percent(evaluation.score, evaluation.maxScore), 0) / own.length) : 0;
  const prior = own[1] ? percent(own[1].score, own[1].maxScore) : average;
  const profile = profiles.find((item) => item.studentId === student.id);
  return { own, average, trend: own.length > 1 ? `${average - prior >= 0 ? '+' : ''}${average - prior}%` : 'new', profile, color: palette[index % palette.length] };
}

function Dashboard({ data, teacher, onResetBetaData }: { data: PersistedData; teacher: TeacherProfile | null; onResetBetaData?: () => void }) {
  const hasClassrooms = Boolean(data?.classrooms && data.classrooms.length > 0);
  const hasStudents = Boolean(data?.students && data.students.length > 0);
  const canEvaluate = hasClassrooms && hasStudents;
  const evaluateDisabledMsg = !hasClassrooms && !hasStudents
    ? 'Add classroom and students'
    : !hasStudents
    ? 'Add students'
    : !hasClassrooms
    ? 'Add classroom'
    : '';
  const recent = [...data.evaluations].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const avg = data.evaluations.length ? Math.round(data.evaluations.reduce((sum, evaluation) => sum + percent(evaluation.score, evaluation.maxScore), 0) / data.evaluations.length) : 0;
  const lookup = useMemo(() => new Map(data.students.map((student) => [student.id, student])), [data.students]);
  const subjectAverages = useMemo(() => {
    const map = new Map<string, { display: string; scores: number[] }>();
    data.evaluations.forEach((item) => {
      const s = (item.subject || 'General').trim();
      const key = s.toLowerCase();
      const existing = map.get(key) || { display: s, scores: [] };
      existing.scores.push(percent(item.score, item.maxScore));
      map.set(key, existing);
    });
    return Array.from(map.values()).map(({ display, scores }) => ({
      subject: display,
      average: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    })).sort((a, b) => b.average - a.average);
  }, [data.evaluations]);
  return <div className="space-y-9">
    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">Your desk, in focus.</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">{teacher ? `A clear view of ${teacher.institution}, the papers, progress, and people who need your attention.` : 'A clear view of the papers, progress, and people who need your attention.'}</p>
      </div>
      {canEvaluate ? (
        <Link href="/evaluate" className="flex w-fit items-center gap-2 border-2 border-[#09090B] bg-[#09090B] px-4 py-3 text-sm font-bold text-white paper-shadow-coral" data-testid="link-start-marking">
          <Upload size={17} /> Start marking
        </Link>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block cursor-not-allowed">
              <button
                type="button"
                disabled
                className="flex w-fit items-center gap-2 border-2 border-border bg-[#e4e4e7] px-4 py-3 text-sm font-bold text-[#71717a] shadow-none opacity-60 cursor-not-allowed"
                data-testid="link-start-marking-disabled"
              >
                <Upload size={17} /> Start marking
              </button>
            </span>
          </TooltipTrigger>
          <TooltipContent className="border-2 border-[#09090B] bg-white font-bold text-[#09090B] shadow-[2px_2px_0_#09090B]">
            {evaluateDisabledMsg}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
    <div className="grid gap-4 md:grid-cols-3">
      {[['Papers evaluated', data.evaluations.length ? String(data.evaluations.length) : '—', data.evaluations.length ? 'All saved evaluations' : 'No papers yet', 'coral'], ['Class average', data.evaluations.length ? `${avg}%` : '—', data.evaluations.length ? 'Across every evaluated paper' : 'Appears after first marking', 'mint'], ['Marking pile', recent.length ? String(recent.length) : '—', recent.length ? 'Most recent saved papers' : 'Your desk is clear', 'ink']].map(([label, value, note, tone]) => <div key={label} className={`border-2 border-border bg-card p-5 paper-shadow ${tone === 'coral' ? 'bg-primary/10' : ''}`}><SectionLabel>{label}</SectionLabel><p className={`font-display text-3xl font-bold ${tone === 'coral' ? 'text-primary' : tone === 'mint' ? 'text-[#07825b]' : ''}`}>{value}</p><p className="mt-2 text-xs text-muted-foreground">{note}</p></div>)}
    </div>
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <section className="border-2 border-border bg-card paper-shadow">
        <div className="flex items-center justify-between border-b-2 border-border px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-bold">The marking pile</h2>
          </div>
          {canEvaluate ? (
            <Link href="/evaluate" className="text-xs font-semibold text-primary hover:underline" data-testid="link-view-all-work">
              Evaluate another
            </Link>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block cursor-not-allowed text-xs font-semibold text-muted-foreground opacity-60">
                  Evaluate another
                </span>
              </TooltipTrigger>
              <TooltipContent className="border-2 border-[#09090B] bg-white font-bold text-[#09090B] shadow-[2px_2px_0_#09090B]">
                {evaluateDisabledMsg}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {recent.length ? (
          <div>{recent.map((item, index) => { const student = lookup.get(item.studentId); return <Link key={item.id} href={`/evaluate?id=${item.id}`} className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-0 hover:bg-primary/5 dark:hover:bg-[#1f1a1d] transition-colors cursor-pointer group" title="Click to review & verify in split-screen viewer"><div className="grid h-10 w-10 shrink-0 place-items-center border-2 border-[#09090B] font-display text-sm font-bold text-white" style={{ backgroundColor: palette[index % palette.length] }}>{initials(student?.name || 'Unknown')}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold group-hover:text-primary transition-colors">{student?.name || 'Student removed'}</p><p className="truncate text-xs text-muted-foreground">{item.title} <span className="mx-1">,</span> {relativeTime(item.createdAt)}</p></div><div className="flex items-center gap-3 shrink-0"><ScoreChip score={percent(item.score, item.maxScore)} /><span className="hidden sm:inline-flex items-center text-xs font-bold text-primary group-hover:underline">Review and edit</span></div></Link>; })}</div>
        ) : (
          <div className="p-5">
            <EmptyState 
              title="Your desk is clear!" 
              text={!canEvaluate ? (evaluateDisabledMsg ? `To start marking, please ${evaluateDisabledMsg.toLowerCase()} first.` : "Add classrooms and students to grade answer sheets.") : "Click '+ Evaluate paper' to grade your first answer sheet."} 
            />
          </div>
        )}
      </section>
      <section className="border-2 border-border bg-[#09090B] p-5 text-[#FAFAFA] paper-shadow-coral"><div className="mb-7 flex items-start justify-between"><div><h2 className="font-display text-xl font-bold">Class insights</h2></div><BarChart3 className="text-[#10B981]" size={23} /></div>{subjectAverages.length ? <><p className="max-w-sm text-lg leading-snug">Your class is strongest in <span className="text-[#10B981]">{subjectAverages[0].subject}</span>{subjectAverages.length > 1 && <> and has the most room in <span className="text-primary">{subjectAverages[subjectAverages.length - 1].subject}</span></>}.</p><div className="mt-8 space-y-4">{subjectAverages.slice(0, 3).map((item) => <div key={item.subject}><div className="mb-2 flex justify-between font-mono-score text-[10px]"><span>{item.subject}</span><span>{item.average}%</span></div><div className="h-2 bg-white/15"><div className="h-full bg-[#10B981]" style={{ width: `${item.average}%` }} /></div></div>)}</div></> : <p className="max-w-sm text-lg leading-snug text-white/70">Mark a paper and Rubrica will turn your saved results into a useful class view.</p>}<Link href="/students" className="mt-8 inline-flex items-center gap-2 text-xs font-bold text-[#10B981] hover:underline" data-testid="link-class-insights">See student detail</Link></section>
    </div>
    <section><div className="mb-4 flex items-end justify-between"><div><h2 className="font-display text-2xl font-bold">Class snapshot</h2></div><Link href="/students" className="text-xs font-semibold text-primary hover:underline" data-testid="link-all-students">All students</Link></div>{data.students.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.students.slice(0, 3).map((student, index) => <StudentCard key={student.id} student={student} stats={studentStats(student, data.evaluations, data.profiles, index)} />)}</div> : <EmptyState title="No students yet" text="Add a student before you mark their first paper." />}</section>
  </div>;
}

function StudentCard({ student, stats }: { student: StudentRecord; stats: ReturnType<typeof studentStats> }) {
  return <Link href={`/students/${student.id}`} className="lift-on-hover flex items-center gap-4 border-2 border-border bg-card p-4 paper-shadow" data-testid={`card-student-${student.id}`}><div className="grid h-12 w-12 shrink-0 place-items-center border-2 border-[#09090B] font-display text-sm font-bold text-white" style={{ backgroundColor: stats.color }}>{initials(student.name)}</div><div className="min-w-0 flex-1"><p className="truncate font-display font-bold">{student.name}</p><p className="font-mono-score text-xs text-muted-foreground">{student.grade}, {stats.own.length} papers</p></div><div className="text-right">{stats.own.length ? <ScoreChip score={stats.average} /> : <span className="font-mono-score text-xs text-muted-foreground">—</span>}<p className={`mt-1 font-mono-score text-[10px] ${stats.trend.startsWith('-') ? 'text-primary' : 'text-[#07825b]'}`}>{stats.trend}</p></div></Link>;
}

function Students({ data, onAdd, onDelete }: { data: PersistedData; onAdd: (name: string, classroomId: string, grade: string) => void; onDelete?: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [classroomId, setClassroomId] = useState(data.classrooms[0]?.id || '');

  const filtered = useMemo(() => data.students.filter((student) => `${student.name}`.toLowerCase().includes(query.toLowerCase())), [data.students, query]);
  
  const addStudent = () => { 
    if (!name.trim() || !classroomId) return; 
    const selectedClass = data.classrooms.find(c => c.id === classroomId);
    onAdd(name.trim(), classroomId, selectedClass?.grade || 'General'); 
    setName(''); 
    setShowAdd(false); 
  };

  useBackButton(() => {
    setShowAdd(false);
    return true;
  }, showAdd);
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" data-testid="link-students-back-dashboard">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>
        <Link href="/" className="grid h-8 w-8 place-items-center border-2 border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" title="Exit to dashboard" aria-label="Exit to dashboard" data-testid="button-students-exit-dashboard">
          <X size={15} />
        </Link>
      </div>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Students</h1>
          <p className="mt-2 text-sm text-muted-foreground">{data.students.length} learners saved in your gradebook</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex w-fit items-center gap-2 border-2 border-foreground bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-[2px_2px_0_#09090B] dark:shadow-[2px_2px_0_#000] hover:bg-primary/90 transition-colors" data-testid="button-add-student">
          <Plus size={17} /> Add student
        </button>
      </div>
    <div className="flex flex-col gap-3 border-2 border-border bg-card p-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-3 text-muted-foreground" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name..." className="h-10 w-full border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary" data-testid="input-search-students" /></div><button className="flex h-10 items-center justify-center gap-2 border border-border px-4 text-xs font-bold hover:bg-muted" data-testid="button-filter-students"><Filter size={14} /> Filter <span className="font-mono-score text-muted-foreground">{filtered.length}</span></button></div>
    {filtered.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((student, index) => <StudentCard key={student.id} student={student} stats={studentStats(student, data.evaluations, data.profiles, index)} />)}</div> : <EmptyState title="No students found" text={data.students.length ? 'Try a different name, or add someone to the gradebook.' : 'Add your first learner to start building the gradebook.'} />}
    {showAdd && (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
        <div className="w-full max-w-md border-4 border-[#09090B] dark:border-border bg-[#fef5f6] dark:bg-[#18181c] p-8 shadow-[8px_8px_0_var(--color-primary)] dark:shadow-[8px_8px_0_#000]">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="font-display text-3xl font-bold text-[#09090B] dark:text-foreground">Add a student</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="grid h-8 w-8 place-items-center border-2 border-[#09090B] dark:border-border bg-white dark:bg-secondary text-[#09090B] dark:text-foreground hover:bg-muted transition-transform hover:scale-105"
              aria-label="Close"
              data-testid="button-close-add-student"
            >
              <X size={18} strokeWidth={3} />
            </button>
          </div>
          <div className="mt-7 space-y-4">
            <div>
              <label className="block text-xs font-bold text-primary dark:text-primary">Student name</label>
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && addStudent()}
                placeholder="e.g. Maya Robinson"
                className="mt-1 h-12 w-full border-2 border-[#09090B] dark:border-border bg-white dark:bg-secondary/40 px-3 font-medium text-foreground outline-none focus:border-primary"
                data-testid="input-student-name"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-primary dark:text-primary">Classroom</label>
              <select
                value={classroomId}
                onChange={(e) => setClassroomId(e.target.value)}
                className="mt-1 h-12 w-full border-2 border-[#09090B] dark:border-border bg-white dark:bg-secondary/40 px-3 font-medium text-foreground outline-none focus:border-primary"
              >
                {data.classrooms.map(c => <option key={c.id} value={c.id} className="dark:bg-[#18181c] text-foreground">{c.name} ({c.grade}, {c.subject})</option>)}
              </select>
            </div>
          </div>
          <button
            onClick={addStudent}
            disabled={!name.trim() || !classroomId}
            className="mt-6 flex w-full items-center justify-center border-2 border-[#09090B] dark:border-border bg-primary py-3 text-sm font-bold text-white shadow-[3px_3px_0_#09090B] dark:shadow-[3px_3px_0_#000] transition-all hover:translate-x-[1px] hover:translate-y-[1px] disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:border-border disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
            data-testid="button-save-student"
          >
            Add to gradebook
          </button>
        </div>
      </div>
    )}
    </div>
  );
}

function StudentProfile({ 
  data, 
  teacher, 
  onDelete, 
  onUpdateProfile,
  initialView = 'overview'
}: { 
  data: PersistedData; 
  teacher?: TeacherProfile | null; 
  onDelete?: (id: string) => void; 
  onUpdateProfile?: (p: StudentProfileRecord) => Promise<void>;
  initialView?: 'overview' | 'papers' | 'dpps' | 'mistakes' | 'tutor';
}) {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const isStudent = teacher?.role === 'student';

  const student = useMemo(() => {
    if (id) {
      const match = data.students.find(s => s.id === id);
      if (match) {
        return {
          ...match,
          name: cleanStudentName(match.name),
          grade: cleanStudentGrade(match.grade)
        };
      }
      return null;
    }
    if (isStudent) {
      const match = data.students.find(s => s.id === teacher?.id || (teacher?.name && s.name.toLowerCase() === teacher.name.toLowerCase()));
      if (match) {
        return {
          ...match,
          name: cleanStudentName(match.name),
          grade: cleanStudentGrade(match.grade)
        };
      }
      return {
        id: teacher?.id || 'student',
        name: cleanStudentName(teacher?.name || 'Student'),
        grade: cleanStudentGrade(teacher?.gradeOrExam || 'General'),
        classroomId: data.classrooms[0]?.id || 'student-classroom',
        createdAt: new Date().toISOString()
      };
    }
    return data.students[0] || null;
  }, [id, isStudent, data.students, teacher]);

  const studentDisplayName = isStudent ? cleanStudentName(teacher?.name || student?.name) : (student?.name || 'Student');
  const studentDisplayGrade = isStudent ? cleanStudentGrade(teacher?.gradeOrExam || student?.grade) : (student?.grade || 'General');

  const [currentView, setCurrentView] = useState<'overview' | 'papers' | 'dpps' | 'mistakes' | 'tutor'>(initialView);
  const [mistakeFilter, setMistakeFilter] = useState<'all' | 'recurring' | 'improving' | 'resolved'>('all');
  const [generatingDPP, setGeneratingDPP] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [tutorTopic, setTutorTopic] = useState<string | undefined>();
  const [tutorMode, setTutorMode] = useState<TutorMode | undefined>();

  const handleDiscussInTutor = (topic: string, mode?: TutorMode) => {
    setTutorTopic(topic);
    if (mode) setTutorMode(mode);
    handleSelectView('tutor');
  };

  useEffect(() => {
    if (initialView) {
      setCurrentView(initialView);
    }
  }, [initialView]);

  const stats = useMemo(() => {
    if (!student) return null;
    const own = data.evaluations.filter((ev) => ev.studentId === student.id);

    const sortedOwn = [...own].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const average = sortedOwn.length ? Math.round(sortedOwn.reduce((sum, ev) => sum + percent(ev.score, ev.maxScore), 0) / sortedOwn.length) : 0;
    const prior = sortedOwn[1] ? percent(sortedOwn[1].score, sortedOwn[1].maxScore) : average;
    const profile = data.profiles.find((p) => p.studentId === student.id);

    return {
      own: sortedOwn,
      average,
      trend: sortedOwn.length > 1 ? `${average - prior >= 0 ? '+' : ''}${average - prior}%` : 'new',
      profile
    };
  }, [student, data.evaluations, data.profiles]);

  const history = useMemo(() => {
    if (!stats) return { commonMistakes: [], commonStrengths: [] };
    return analyzeStudentHistory(stats.own);
  }, [stats]);

  const displayedMistakes = useMemo(() => {
    return history.commonMistakes.filter(m => mistakeFilter === 'all' || m.status === mistakeFilter);
  }, [history, mistakeFilter]);

  const mistakeCounts = useMemo(() => {
    return {
      all: history.commonMistakes.length,
      recurring: history.commonMistakes.filter(m => m.status === 'recurring').length,
      improving: history.commonMistakes.filter(m => m.status === 'improving').length,
      resolved: history.commonMistakes.filter(m => m.status === 'resolved').length,
    };
  }, [history]);

  const handleSelectView = (view: 'overview' | 'papers' | 'dpps' | 'mistakes' | 'tutor') => {
    setCurrentView(view);
    if (isStudent) {
      const routeMap: Record<string, string> = {
        overview: '/',
        papers: '/papers',
        dpps: '/dpps',
        mistakes: '/mistakes',
        tutor: '/tutor'
      };
      if (routeMap[view]) {
        setLocation(routeMap[view]);
      }
    }
  };

  useBackButton(() => {
    setShowDeleteConfirm(false);
    return true;
  }, showDeleteConfirm);

  useBackButton(() => {
    handleSelectView('overview');
    return true;
  }, isStudent && currentView !== 'overview');

  const handleGenerateDPP = async () => {
    if (!student || !stats || generatingDPP) return;
    setGeneratingDPP(true);
    try {
      const mistakes: string[] = [];
      displayedMistakes.forEach(m => {
        if (!mistakes.includes(m.skill)) mistakes.push(m.skill);
      });
      if (mistakes.length === 0) {
        stats.own.forEach(ev => {
          if (ev.watchOutAreas) {
            ev.watchOutAreas.forEach(a => {
              if (!mistakes.includes(a)) mistakes.push(a);
            });
          }
        });
      }
      if (mistakes.length === 0 && stats.profile?.activeWeaknesses) {
        stats.profile.activeWeaknesses.forEach(w => {
          if (!mistakes.includes(w)) mistakes.push(w);
        });
      }

      const targetMistakes = mistakes.slice(0, 5);
      const studentClassroom = data.classrooms.find(c => c.id === student.classroomId);
      const targetSubject = stats.own[0]?.subject || studentClassroom?.subject || 'General';
      const sampleMistake = targetMistakes[0] || 'Linear equation expansion';

      // In beta mode or authenticated mode, attempt real AI generation via server gateway;
      // if offline or provider error occurs in beta mode, fall back to rich KaTeX worksheet.
      let content = '';
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token || (teacher?.isBeta ? `beta-token-${teacher.id || 'beta-user'}` : null);
        if (!accessToken) {
          throw new Error('Please sign in again to generate practice problems.');
        }

        const aiResult = await generateDppFn({
          data: {
            accessToken,
            studentName: student.name,
            grade: student.grade,
            subject: targetSubject,
            mistakes: targetMistakes,
          },
        });
        if (aiResult.ok) {
          content = aiResult.content;
        } else {
          throw new Error(aiResult.message || 'AI generation failed');
        }
      } catch (err: any) {
        if (teacher?.isBeta) {
          console.warn('Real AI generation fell back to sample KaTeX DPP:', err);
          content = `### Targeted Practice Worksheet: ${targetSubject}\n\n**Practice Problems:**\n\n1. **Problem 1 (${sampleMistake}):**\nSolve the following equation demonstrating all step-by-step algebraic manipulations:\n$$3(2x - 4) - 2(x + 5) = 14$$\n\n2. **Problem 2 (Rational Expressions):**\nSimplify the following rational expression into lowest polynomial terms:\n$$\\frac{4x^2 - 9}{2x + 3} + 5x$$\n\n3. **Problem 3 (Verification & Proof):**\nSubstitute your calculated value of $x$ from Problem 1 into the original equation to prove the equality holds.\n\n---\n#### Hints & Guidance:\n1. For Problem 1, pay close attention to negative sign distribution across brackets: $-2(x + 5) = -2x - 10$.\n- Solution for Problem 1: Expanding gives $6x - 12 - 2x - 10 = 14 \\implies 4x - 22 = 14 \\implies 4x = 36 \\implies x = 9$.\n2. For Problem 2, notice the difference of two squares in the numerator: $4x^2 - 9 = (2x - 3)(2x + 3)$.\n- Solution for Problem 2: $\\frac{(2x - 3)(2x + 3)}{2x + 3} + 5x = (2x - 3) + 5x = 7x - 3$.\n3. For Problem 3, calculate LHS: $3(2(9) - 4) - 2(9 + 5) = 3(14) - 2(14) = 42 - 28 = 14 = \\text{RHS}$.`;
        } else {
          throw err;
        }
      }

      const newDPP: DPPRecord = {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2)),
        createdAt: new Date().toISOString(),
        content,
        basedOnMistakes: targetMistakes.length > 0 ? targetMistakes : ['Negative bracket sign distribution']
      };

      const existingProfile = stats.profile || {
        studentId: student.id,
        activeWeaknesses: [],
        stableStrengths: [],
        updatedAt: new Date().toISOString(),
        dpps: []
      };

      const updatedProfile: StudentProfileRecord = {
        ...existingProfile,
        dpps: [newDPP, ...(existingProfile.dpps || [])],
        updatedAt: new Date().toISOString()
      };

      if (onUpdateProfile) {
        await onUpdateProfile(updatedProfile);
      }
    } catch (err: any) {
      console.error('DPP generation error:', err);
      alert(err.message || 'Error generating DPP');
    } finally {
      setGeneratingDPP(false);
    }
  };

  if (!student || !stats) return <EmptyState title="Student not found" text="This grade card is no longer in the gradebook." />;

  return (
    <div className="space-y-6">
      {/* Teacher Delete Confirmation Dialog */}
      {!isStudent && showDeleteConfirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4">
          <div className="w-full max-w-lg border-2 border-border bg-card p-6 shadow-[6px_6px_0_#09090B] dark:shadow-[6px_6px_0_#000]">
            <div className="flex items-start justify-between gap-4 border-b-2 border-border pb-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center bg-destructive text-destructive-foreground">
                  <AlertTriangle size={22} strokeWidth={2.5} />
                </span>
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground">Are you absolutely sure?</h2>
                  <p className="text-xs font-medium text-destructive">Permanent action</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmInput('');
                }}
                className="grid h-8 w-8 place-items-center border-2 border-border bg-card text-foreground hover:bg-muted transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Close dialog"
              >
                <X size={16} strokeWidth={3} />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-foreground/80 leading-relaxed">
              <p>
                This action cannot be undone lightly. It will permanently delete the student profile for <strong className="text-foreground">{student.name}</strong>, along with their <strong className="text-foreground">{stats.own.length} evaluated paper{stats.own.length !== 1 ? 's' : ''}</strong>, grade history, and longitudinal learning analysis.
              </p>
              <div className="border border-destructive/40 bg-muted/40 p-3 font-mono-score text-xs text-foreground">
                <span className="text-muted-foreground">To confirm, type </span>
                <strong className="text-destructive font-bold select-all bg-destructive/10 px-1.5 py-0.5 border border-destructive/40">{student.name}</strong>
                <span className="text-muted-foreground"> in the box below:</span>
              </div>
            </div>

            <div className="mt-4">
              <input
                type="text"
                autoFocus
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && deleteConfirmInput.trim().toLowerCase() === student.name.trim().toLowerCase()) {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmInput('');
                    onDelete?.(student.id);
                    setLocation('/students');
                  }
                }}
                placeholder={`Type "${student.name}" to confirm`}
                className="h-11 w-full border-2 border-border bg-background px-3 font-mono-score text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                data-testid="input-confirm-delete-student"
              />
            </div>

            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmInput('');
                }}
                className="whitespace-nowrap border-2 border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground hover:bg-muted transition-colors motion-reduce:transition-none text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Cancel / Keep Student
              </button>
              <button
                type="button"
                disabled={deleteConfirmInput.trim().toLowerCase() !== student.name.trim().toLowerCase()}
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmInput('');
                  onDelete?.(student.id);
                  setLocation('/students');
                }}
                className="flex items-center justify-center gap-1.5 whitespace-nowrap border-2 border-border bg-destructive px-4 py-2.5 text-xs font-bold text-destructive-foreground shadow-[2px_2px_0_#09090B] dark:shadow-[2px_2px_0_#000] hover:bg-destructive/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                data-testid="button-confirm-delete-student"
              >
                <Trash2 size={13} /> Delete {student.name}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back button for teacher view */}
      {!isStudent && (
        <div className="flex items-center justify-between">
          {currentView !== 'overview' ? (
            <button
              type="button"
              onClick={() => handleSelectView('overview')}
              className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              data-testid="button-back-to-student-overview"
            >
              <ArrowLeft size={14} /> Back to {student?.name || 'student'} profile
            </button>
          ) : (
            <Link href="/students" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" data-testid="link-back-students">
              <ArrowLeft size={14} /> Back to students
            </Link>
          )}
          <Link href="/students" className="grid h-8 w-8 place-items-center border-2 border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" title="Exit to students" aria-label="Exit to students" data-testid="button-exit-to-students">
            <X size={15} />
          </Link>
        </div>
      )}

      {/* Back button for student subviews */}
      {isStudent && currentView !== 'overview' && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleSelectView('overview')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            data-testid="button-back-to-overview"
          >
            <ArrowLeft size={14} /> Back to dashboard
          </button>
          <button
            type="button"
            onClick={() => handleSelectView('overview')}
            className="grid h-8 w-8 place-items-center border-2 border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Exit to dashboard"
            aria-label="Exit to dashboard"
            data-testid="button-exit-to-overview"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ═══ STUDENT PROFILE HERO / WORKSPACE HEADER (DASHBOARD ONLY) ═══ */}
      {(currentView === 'overview' || !isStudent) && (
        <div className="border-2 border-border bg-card p-5 sm:p-6 paper-shadow">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-bold text-foreground">
                  {isStudent ? 'Student dashboard' : 'Student diagnostic profile'}
                </span>
                <span className="border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {isStudent ? studentDisplayGrade : student.grade}
                </span>
                <span className="border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <span className="font-mono tabular-nums font-bold text-foreground">{stats.own.length}</span> evaluation{stats.own.length !== 1 ? 's' : ''}
                </span>
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground text-balance break-words">
                {isStudent ? `Welcome back, ${studentDisplayName}.` : studentDisplayName}
              </h1>

              <p className="text-xs sm:text-sm text-muted-foreground text-pretty max-w-2xl leading-relaxed">
                {isStudent
                  ? 'Your personal academic workspace for test diagnostics, personalized error remediation worksheets, and 4-mode AI study tutoring.'
                  : `Longitudinal grading performance, mastery mapping, and targeted practice for ${studentDisplayName}.`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {!isStudent && (
                <button
                  type="button"
                  onClick={() => { setDeleteConfirmInput(''); setShowDeleteConfirm(true); }}
                  className="flex items-center gap-1.5 border-2 border-destructive bg-destructive/10 text-destructive px-3 py-2 text-xs font-bold hover:bg-destructive hover:text-destructive-foreground transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                  data-testid="button-delete-student"
                >
                  <Trash2 size={13} />
                  <span>Delete student</span>
                </button>
              )}
              <Link
                href="/evaluate"
                className="inline-flex items-center gap-2 border-2 border-foreground bg-primary text-primary-foreground shadow-[2px_2px_0_#09090B] dark:shadow-[2px_2px_0_#000] hover:bg-primary/90 px-4 py-2 text-xs font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                data-testid="button-profile-mark-paper"
              >
                <Upload size={14} />
                <span>{isStudent ? 'Scan paper' : 'Mark paper'}</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ═══ VIEW 1: OVERVIEW ═══ */}
      {currentView === 'overview' && (
        <div className="space-y-6">
          {/* Diagnostic Pulse Grid (3 Balanced Stat Cards) */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Card 1: Overall Average */}
            <div className="border-2 border-border bg-card p-5 paper-shadow flex flex-col justify-between">
              <div>
                <SectionLabel>{isStudent ? 'Overall test average' : 'Academic average'}</SectionLabel>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-3xl sm:text-4xl font-bold text-primary tabular-nums">
                    {stats.own.length ? `${stats.average}%` : '—'}
                  </span>
                  {stats.own.length > 0 && stats.trend !== 'new' && (
                    <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {stats.trend}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span>{stats.own.length ? `${stats.own.length} test paper${stats.own.length !== 1 ? 's' : ''} evaluated` : 'Awaiting first test'}</span>
                <span className="text-[11px] text-primary font-bold">
                  {stats.average >= 80 ? 'Mastery' : stats.average >= 70 ? 'Proficient' : 'Developing'}
                </span>
              </div>
            </div>

            {/* Card 2: Confirmed Strengths */}
            <div className="border-2 border-border bg-card p-5 paper-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <SectionLabel>{isStudent ? 'Demonstrated strengths' : 'Solid mastery'}</SectionLabel>
                  <span className="text-[11px] text-muted-foreground">
                    <span className="font-mono tabular-nums font-semibold">{stats.profile?.stableStrengths?.length || 0}</span> skills
                  </span>
                </div>
                <div className="mt-2.5 space-y-1.5">
                  {stats.profile?.stableStrengths && stats.profile.stableStrengths.length > 0 ? (
                    stats.profile.stableStrengths.slice(0, 3).map((strength, sIdx) => (
                      <div key={sIdx} className="flex items-center gap-2 text-xs font-medium text-foreground">
                        <Check size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="truncate">{strength}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No verified strengths recorded yet. Complete a test evaluation to map competencies.</p>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border text-[11px] text-muted-foreground">
                Verified from test answer steps
              </div>
            </div>

            {/* Card 3: Priority Remediation Areas */}
            <div className="border-2 border-border bg-card p-5 paper-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <SectionLabel>{isStudent ? 'Priority focus areas' : 'Watch out areas'}</SectionLabel>
                  <span className="text-[11px] text-muted-foreground">
                    <span className="font-mono tabular-nums font-semibold">{stats.profile?.activeWeaknesses?.length || 0}</span> flagged
                  </span>
                </div>
                <div className="mt-2.5 space-y-1.5">
                  {stats.profile?.activeWeaknesses && stats.profile.activeWeaknesses.length > 0 ? (
                    stats.profile.activeWeaknesses.slice(0, 3).map((weakness, wIdx) => (
                      <div key={wIdx} className="flex items-center gap-2 text-xs font-medium text-foreground">
                        <AlertTriangle size={13} className="text-primary shrink-0" />
                        <span className="truncate">{weakness}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No recurring error patterns flagged yet.</p>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleSelectView('dpps')}
                  className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 focus-visible:outline-none"
                >
                  <span>Practice in DPP</span>
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Latest Diagnostic Feedback Callout */}
          <div className="border-2 border-border bg-card p-5 paper-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <FileCheck2 size={16} className="text-primary" />
                <h3 className="font-display text-base font-bold text-foreground">
                  {isStudent ? 'Latest diagnostic evaluation feedback' : 'Recent educator marking note'}
                </h3>
              </div>
              {stats.own[0] && (
                <span className="text-xs text-muted-foreground">
                  Evaluated on <span className="font-mono tabular-nums">{formatDate(stats.own[0].createdAt)}</span>
                </span>
              )}
            </div>
            <p className="mt-3 text-xs sm:text-sm leading-relaxed text-foreground text-pretty">
              {stats.own[0]?.summary || (isStudent
                ? 'Scan an answer paper to view question-by-question scoring criteria, discover conceptual blindspots, and generate targeted practice worksheets.'
                : 'Evaluate a test paper to generate automated scoring and customized student feedback.')}
            </p>
          </div>

          {/* Feature Highlights: Practice DPPs & AI Tutor */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* DPP Feature Card */}
            <div className="flex flex-col justify-between border-2 border-border bg-card p-5 paper-shadow">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center border border-border bg-primary/10 text-primary">
                    <BookOpen size={16} />
                  </span>
                  <h3 className="font-display text-base font-bold text-foreground">Daily practice worksheets (DPP)</h3>
                </div>
                <p className="text-xs text-muted-foreground text-pretty leading-relaxed">
                  Personalized worksheets targeting your specific exam mistakes with formatted KaTeX formulas, step-by-step solutions, and rough working notes.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  <span className="font-mono tabular-nums font-bold text-foreground">{(stats.profile?.dpps || []).length}</span> worksheet{(stats.profile?.dpps || []).length !== 1 ? 's' : ''} available
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectView('dpps')}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap border-2 border-foreground bg-secondary hover:bg-primary hover:text-primary-foreground px-3 py-1.5 text-xs font-bold text-foreground shadow-[2px_2px_0_#09090B] dark:shadow-[2px_2px_0_#000] transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
                >
                  <span>Open practice DPPs</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>

            {/* AI Tutor Feature Card */}
            <div className="flex flex-col justify-between border-2 border-border bg-card p-5 paper-shadow">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center border border-border bg-primary/10 text-primary">
                    <Bot size={16} />
                  </span>
                  <h3 className="font-display text-base font-bold text-foreground">AI study tutor (3 specialized modes)</h3>
                </div>
                <p className="text-xs text-muted-foreground text-pretty leading-relaxed">
                  Stuck on a tricky problem or concept? Get step derivations with Exam Solver, master first principles with Concept Studio, or get guided clues with Socratic Mentor.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-xs font-medium text-primary">
                  Trained on your exam mistakes
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectView('tutor')}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap border-2 border-foreground bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-[2px_2px_0_#09090B] dark:shadow-[2px_2px_0_#000] hover:bg-primary/90 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
                >
                  <Bot size={13} />
                  <span>Ask AI tutor</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* ═══ LONGITUDINAL MISTAKE PATTERNS & CONCEPT TRACKER ═══ */}
          <section className="border-2 border-border bg-card paper-shadow">
            <div className="flex flex-col gap-4 border-b-2 border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between bg-muted/20">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-primary" />
                  <h2 className="font-display text-base sm:text-lg font-bold text-foreground">Patterns across tests</h2>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Track recurring conceptual blindspots, improving areas, and resolved traps across all evaluated papers
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['all', 'recurring', 'improving', 'resolved'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setMistakeFilter(tab)}
                    className={`border-2 border-border px-3 py-1.5 text-xs font-bold capitalize transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      mistakeFilter === tab
                        ? 'border-foreground bg-primary text-primary-foreground shadow-[2px_2px_0_#09090B] dark:shadow-[2px_2px_0_#000]'
                        : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {tab} ({mistakeCounts[tab]})
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5">
              {stats.own.length < 2 && (
                <div className="border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  <Zap className="mx-auto mb-2 opacity-50" size={20} />
                  {isStudent
                    ? 'Evaluate 2 or more test papers to unlock longitudinal tracking and recurring mistake analysis.'
                    : 'Evaluate a second paper to unlock longitudinal tracking and recurring mistake analysis.'}
                </div>
              )}

              {displayedMistakes.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {displayedMistakes.map((mistake, i) => (
                    <div key={i} className="flex flex-col justify-between border-2 border-border bg-background p-4 paper-shadow transition-colors hover:border-foreground">
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <p className="font-display text-base sm:text-lg font-bold leading-tight text-foreground">{mistake.skill}</p>
                          <span className={`shrink-0 border px-2 py-0.5 text-xs font-semibold capitalize ${
                            mistake.status === 'recurring'
                              ? 'border-destructive/40 bg-destructive/10 text-destructive'
                              : mistake.status === 'improving'
                              ? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {mistake.status}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center gap-3 font-mono text-xs text-muted-foreground tabular-nums">
                          <span>Seen in {mistake.occurrenceCount} of {mistake.totalTests} tests</span>
                          <span className="h-1 w-1 rounded-full bg-border" />
                          <span className={mistake.status === 'recurring' ? 'text-destructive font-semibold' : ''}>{mistake.trend}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {mistake.testTitles.map((t, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1.5 border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
                              <FileText size={10} className="text-muted-foreground" /> {t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-border flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleDiscussInTutor(mistake.skill, 'guide')}
                          className="inline-flex items-center gap-1.5 whitespace-nowrap border-2 border-border bg-card px-3 py-1 text-xs font-bold text-foreground hover:bg-primary hover:text-primary-foreground hover:border-foreground transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
                        >
                          <Bot size={13} /> Master in AI Tutor
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                stats.own.length >= 2 && (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      {isStudent
                        ? `No ${mistakeFilter !== 'all' ? mistakeFilter : ''} mistake patterns detected yet. Great job!`
                        : `No ${mistakeFilter !== 'all' ? mistakeFilter : ''} patterns found in the gradebook yet.`}
                    </p>
                  </div>
                )
              )}
            </div>
          </section>

          {/* Performance Progress & Recent Assessments */}
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            {/* Score Progress */}
            <section className="border-2 border-border bg-card paper-shadow">
              <div className="flex items-center justify-between border-b-2 border-border px-5 py-4">
                <h3 className="font-display text-base sm:text-lg font-bold text-foreground">{isStudent ? 'Score progress history' : 'Score history'}</h3>
                {stats.own.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSelectView('papers')}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap border border-border bg-muted px-2.5 py-1 text-xs font-bold text-foreground hover:bg-primary hover:text-primary-foreground transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
                    data-testid="button-see-all-papers"
                  >
                    <Eye size={12} />
                    <span>View all papers</span>
                  </button>
                )}
              </div>
              <div className="space-y-4 p-5">
                {stats.own.length ? stats.own.map((item) => {
                  const score = percent(item.score, item.maxScore);
                  return (
                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pb-3 border-b border-border/60 last:border-b-0 last:pb-0">
                      <span className="font-mono text-xs text-muted-foreground tabular-nums shrink-0 sm:w-24">{formatDate(item.createdAt)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="mb-1.5 flex justify-between text-xs font-bold text-foreground">
                          <span className="truncate">{item.title}</span>
                          <span className="font-mono tabular-nums text-primary ml-2">{score}%</span>
                        </div>
                        <div className="h-2 w-full border border-border bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary origin-left transition-transform duration-300 motion-reduce:transition-none"
                            style={{ transform: `scaleX(${score / 100})` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-6 text-center space-y-2">
                    <p className="font-display text-base font-bold text-foreground">No score history yet</p>
                    <p className="text-xs text-muted-foreground">{isStudent ? 'Scan an answer paper to start tracking your score history.' : 'Mark a paper to start a useful record.'}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Recent Graded Papers */}
            <section className="border-2 border-border bg-card paper-shadow">
              <div className="flex items-center justify-between border-b-2 border-border px-5 py-4">
                <h3 className="font-display text-base sm:text-lg font-bold text-foreground">{isStudent ? 'Recent graded papers' : 'Recent papers'}</h3>
                {stats.own.length > 3 && (
                  <button
                    type="button"
                    onClick={() => handleSelectView('papers')}
                    className="text-xs font-bold text-primary hover:underline focus-visible:outline-none"
                  >
                    See all
                  </button>
                )}
              </div>
              {stats.own.length ? (
                <div className="divide-y divide-border">
                  {stats.own.slice(0, 4).map((item) => (
                    <Link
                      key={item.id}
                      href={`/evaluate?id=${item.id}`}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/40 transition-colors motion-reduce:transition-none cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      title="Click to review & verify in split-screen viewer"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center border border-border bg-muted group-hover:border-primary transition-colors">
                          <FileText size={14} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-bold truncate text-foreground group-hover:text-primary transition-colors">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground">{item.subject || 'General'}, {formatDate(item.createdAt)}</p>
                        </div>
                      </div>
                      <ScoreChip score={percent(item.score, item.maxScore)} />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center space-y-2">
                  <p className="text-xs text-muted-foreground">No papers in library yet.</p>
                  <Link href="/evaluate" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <Upload size={13} />
                    <span>Scan first paper</span>
                  </Link>
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* ═══ VIEW 2: TEST PAPERS ═══ */}
      {currentView === 'papers' && (
        <section className="border-2 border-border bg-card paper-shadow">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-border px-5 py-4 bg-muted/20">
            <div>
              <h2 className="font-display text-xl font-bold">{isStudent ? 'Test paper library' : `${student.name}’s marking pile`}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="tabular-nums font-semibold">{stats.own.length}</span> paper{stats.own.length !== 1 ? 's' : ''} evaluated
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/evaluate"
                className="inline-flex items-center gap-1.5 whitespace-nowrap border-2 border-foreground bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-[2px_2px_0_#09090B] dark:shadow-[2px_2px_0_#000] hover:bg-primary/90 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Upload size={13} /> {isStudent ? 'Scan paper' : 'Mark paper'}
              </Link>
            </div>
          </div>
          {stats.own.length ? (
            <div className="divide-y divide-border">
              {stats.own.map((item) => {
                const score = percent(item.score, item.maxScore);
                return (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-5 hover:bg-muted/30 transition-colors motion-reduce:transition-none">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <span className="grid h-11 w-11 shrink-0 place-items-center border-2 border-border bg-primary/10">
                        <FileText size={18} className="text-primary" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.subject || 'General'}, {formatDate(item.createdAt)}</p>
                        {item.summary && <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{item.summary}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <ScoreChip score={score} />
                      <Link
                        href={`/evaluate?id=${item.id}`}
                        className="inline-flex items-center gap-2 whitespace-nowrap border-2 border-foreground bg-secondary hover:bg-primary hover:text-primary-foreground px-3.5 py-2 text-xs font-bold text-foreground transition-colors motion-reduce:transition-none shadow-[2px_2px_0_#09090B] dark:shadow-[2px_2px_0_#000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        title="Open in Split-Screen Review & Edit"
                      >
                        <PenLine size={13} /> Review &amp; Edit
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center space-y-4">
              <div className="grid h-12 w-12 place-items-center border-2 border-border bg-primary/10 text-primary mx-auto">
                <FileText size={22} />
              </div>
              <div>
                <p className="font-display text-lg font-bold text-foreground">No evaluated papers yet</p>
                <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto text-pretty">
                  Scan your handwritten test paper or upload an answer PDF to start building your test library and unlock mistake analytics.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  href="/evaluate"
                  className="inline-flex items-center gap-2 whitespace-nowrap border-2 border-foreground bg-primary text-primary-foreground px-4 py-2 text-xs font-bold shadow-[2px_2px_0_#09090B] dark:shadow-[2px_2px_0_#000] hover:bg-primary/90 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Upload size={14} /> Scan test paper
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ═══ VIEW 3: PRACTICE DPPS ═══ */}
      {currentView === 'dpps' && (
        <section className="border-2 border-border bg-card shadow-[4px_4px_0_#09090B] dark:shadow-[4px_4px_0_#000]">
          <div className="flex flex-col gap-4 border-b-2 border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between bg-muted/20">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">Targeted practice sheets (DPP)</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Worksheets generated for concept mastery and mistake correction</p>
            </div>
            <button
              onClick={handleGenerateDPP}
              disabled={generatingDPP}
              className="flex items-center gap-2 whitespace-nowrap border-2 border-foreground bg-primary text-primary-foreground px-4 py-2 text-xs font-bold shadow-[2px_2px_0_#09090B] dark:shadow-[2px_2px_0_#000] hover:bg-primary/90 transition-colors motion-reduce:transition-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {generatingDPP ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Generate Revision DPP
            </button>
          </div>
          <div className="p-5 space-y-6">
            {!stats.profile?.dpps?.length ? (
              <div className="py-8 text-center space-y-3">
                <div className="grid h-12 w-12 place-items-center border-2 border-border bg-primary/10 text-primary mx-auto">
                  <BookOpen size={22} />
                </div>
                <p className="font-display text-base font-bold text-foreground">No practice problems generated yet</p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto text-pretty">
                  Click “Generate Revision DPP” to create a worksheet targeting key concepts and exam question patterns based on your tests.
                </p>
                <div className="pt-2">
                  <button 
                    onClick={handleGenerateDPP} 
                    disabled={generatingDPP}
                    className="inline-flex items-center gap-2 whitespace-nowrap border-2 border-foreground bg-primary text-primary-foreground px-4 py-2 text-xs font-bold shadow-[2px_2px_0_#09090B] dark:shadow-[2px_2px_0_#000] hover:bg-primary/90 disabled:opacity-50 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {generatingDPP ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    <span>Generate starter DPP</span>
                  </button>
                </div>
              </div>
            ) : (
              stats.profile.dpps.map((dpp: any) => (
                <DppWorksheetViewer
                  key={dpp.id || Math.random()}
                  dpp={dpp}
                  studentName={studentDisplayName}
                  subject={stats.own[0]?.subject || 'Targeted Revision'}
                  onDiscussInTutor={handleDiscussInTutor}
                />
              ))
            )}
          </div>
        </section>
      )}

      {/* ═══ VIEW 4: MISTAKE ANALYTICS ═══ */}
      {currentView === 'mistakes' && (
        <section className="border-2 border-border bg-card paper-shadow">
          <div className="flex flex-col gap-4 border-b-2 border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between bg-muted/20">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">Longitudinal mistake analytics</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Error patterns, frequency, and improvement trends across tests</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'recurring', 'improving', 'resolved'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setMistakeFilter(tab)}
                  className={`border-2 border-border px-3 py-1.5 text-xs font-bold capitalize transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    mistakeFilter === tab
                      ? 'border-foreground bg-primary text-primary-foreground shadow-[2px_2px_0_#09090B] dark:shadow-[2px_2px_0_#000]'
                      : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {tab} ({mistakeCounts[tab]})
                </button>
              ))}
            </div>
          </div>
          <div className="p-5">
            {stats.own.length < 2 && (
              <div className="mb-6 border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                <Zap className="mx-auto mb-2 opacity-50" size={20} />
                {isStudent
                  ? 'Evaluate 2 or more test papers to unlock longitudinal tracking and recurring mistake analysis.'
                  : 'Evaluate a second paper to unlock longitudinal tracking and recurring mistake analysis.'}
              </div>
            )}
            {displayedMistakes.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {displayedMistakes.map((mistake, i) => (
                  <div key={i} className="flex flex-col justify-between border-2 border-border bg-background p-4 paper-shadow transition-colors hover:border-foreground">
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <p className="font-display text-lg font-bold leading-tight text-foreground">{mistake.skill}</p>
                        <span className={`shrink-0 border px-2 py-0.5 text-xs font-semibold capitalize ${
                          mistake.status === 'recurring'
                            ? 'border-destructive/40 bg-destructive/10 text-destructive'
                            : mistake.status === 'improving'
                            ? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {mistake.status}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-3 font-mono text-xs text-muted-foreground tabular-nums">
                        <span>Seen in {mistake.occurrenceCount} of {mistake.totalTests} tests</span>
                        <span className="h-1 w-1 rounded-full bg-border" />
                        <span className={mistake.status === 'recurring' ? 'text-destructive font-semibold' : ''}>{mistake.trend}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {mistake.testTitles.map((t, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1.5 border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
                            <FileText size={10} className="text-muted-foreground" /> {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-border flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleDiscussInTutor(mistake.skill, 'guide')}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap border-2 border-border bg-card px-3 py-1 text-xs font-bold text-foreground hover:bg-primary hover:text-primary-foreground hover:border-foreground transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
                      >
                        <Bot size={13} /> Master in AI Tutor
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {isStudent
                    ? `No ${mistakeFilter !== 'all' ? mistakeFilter : ''} mistake patterns detected yet. Great job!`
                    : `No ${mistakeFilter !== 'all' ? mistakeFilter : ''} patterns found in the gradebook yet.`}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══ VIEW 5: AI STUDY TUTOR (3 MODES) ═══ */}
      {currentView === 'tutor' && (
        <StudentAiTutor
          student={student}
          teacher={teacher || null}
          stats={stats}
          history={history}
          initialTopic={tutorTopic}
          initialMode={tutorMode}
        />
      )}
    </div>
  );
}


function Evaluate({ data, initialEvaluationId, onSave, onDelete, onDashboard, onUndoAction, teacher }: { data: PersistedData; initialEvaluationId?: string; onSave: (payload: { id?: string; studentId: string; fileName: string; title?: string; subject?: string; result: VisionEvaluation }) => Promise<void>; onDelete?: (id: string) => Promise<void>; onDashboard: (id?: string) => void; onUndoAction?: (action: UndoAction) => void; teacher?: TeacherProfile | null }) {
  return <AutomatedEvaluate data={data} initialEvaluationId={initialEvaluationId} onSaveEvaluation={onSave} onDeleteEvaluation={onDelete} onDashboard={onDashboard} onUndoAction={onUndoAction} teacher={teacher} />;
}

function App() {
  const [teacher, setTeacher] = useState<TeacherProfile | null>(() => loadTeacherProfile());
  const [needsOnboarding, setNeedsOnboarding] = useState<{userId: string, email: string, name: string, role?: 'teacher' | 'student'} | null>(null);
  const [config, setConfig] = useState<RubricaConfig>(() => loadConfig());
  const [data, setData] = useState<PersistedData>(() => {
    const savedTeacher = loadTeacherProfile();
    if (savedTeacher?.isBeta || savedTeacher?.id === 'b0000000-0000-4000-8000-000000000001') {
      return getSampleBetaData();
    }
    return { classrooms: [], students: [], evaluations: [], profiles: [] };
  });
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [forceWeb, setForceWeb] = useState(false);
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>(() => {
    return (localStorage.getItem('rubrica_font_size') as 'normal' | 'large' | 'xlarge') || 'normal';
  });

  useEffect(() => {
    localStorage.setItem('rubrica_font_size', fontSize);
    const root = document.documentElement;
    if (fontSize === 'large') {
      root.style.fontSize = '18.5px';
    } else if (fontSize === 'xlarge') {
      root.style.fontSize = '21px';
    } else {
      root.style.fontSize = '16px';
    }
  }, [fontSize]);

  // Global Android Hardware & Gesture Back Button Listener
  useEffect(() => {
    const cleanup = initBackButtonListener();
    return cleanup;
  }, []);

  useBackButton(() => {
    setShowLogin(false);
    return true;
  }, showLogin);

  useBackButton(() => {
    setSettingsOpen(false);
    return true;
  }, settingsOpen);
  
  // Admin UI is gated by a database check, never by an email stored in localStorage.
  useEffect(() => {
    if (!teacher?.id || teacher.isBeta) {
      setIsAdmin(false);
      return;
    }
    let active = true;
    isCurrentUserAdmin().then((allowed) => {
      if (active) setIsAdmin(allowed);
    });
    return () => {
      active = false;
    };
  }, [teacher?.id, teacher?.isBeta]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentTeacher = loadTeacherProfile();
      if (currentTeacher?.isBeta || currentTeacher?.id === 'b0000000-0000-4000-8000-000000000001') {
        return;
      }
      if (event === 'SIGNED_IN' && session?.user) {
        // If this is an anonymous or demo session, immediately unlock demo desk without onboarding
        if (session.user.is_anonymous || session.user.email === 'guest@rubrica.in' || session.user.email === 'beta@rubrica.in') {
          const isStudent = (typeof localStorage !== 'undefined' && localStorage.getItem('rubrica_intended_role') === 'student');
          const guestProfile: TeacherProfile = {
            id: session.user.id,
            name: isStudent ? 'Student Demo' : 'Demo Faculty',
            email: session.user.email || 'guest@rubrica.in',
            role: isStudent ? 'student' : 'teacher',
            institution: 'Demo Academy',
            institutionId: 'guest-institution',
            isBeta: true,
            createdAt: new Date().toISOString()
          };
          saveTeacherProfile(guestProfile);
          setTeacher(guestProfile);
          setNeedsOnboarding(null);
          setData(getSampleBetaData());
          return;
        }

        // Fetch teacher profile
        try {
          const profile = await getTeacherProfile(session.user.id);
          const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
          const savedIntendedRole = (typeof localStorage !== 'undefined' ? localStorage.getItem('rubrica_intended_role') : null) as 'student' | 'teacher' | null;
          const queryRole = (searchParams?.get('role') as 'student' | 'teacher' | null);
          const effectiveRole: 'student' | 'teacher' = savedIntendedRole || queryRole || profile?.role || (session.user.user_metadata?.role as any) || 'student';

          // Sync auth user metadata so role is always preserved
          if (session.user.user_metadata?.role !== effectiveRole) {
            try {
              await supabase.auth.updateUser({ data: { role: effectiveRole } });
            } catch {}
          }

          const isStudent = effectiveRole === 'student';
          const isConfigured = isStudent 
            ? Boolean(profile?.gradeOrExam || session.user.user_metadata?.gradeOrExam)
            : Boolean(profile?.institutionId || profile?.institution || session.user.user_metadata?.institution);

          if (profile && isConfigured) {
            const syncedProfile = { ...profile, role: effectiveRole };
            saveTeacherProfile(syncedProfile);
            setTeacher(syncedProfile);
            setNeedsOnboarding(null);
          } else {
            // Need onboarding
            setNeedsOnboarding({
              userId: session.user.id,
              email: session.user.email || profile?.email || '',
              name: profile?.name || session.user.user_metadata?.name || session.user.user_metadata?.full_name || (isStudent ? 'Student' : 'Teacher'),
              role: effectiveRole,
            });
          }
        } catch (err) {
          console.error("Failed to fetch profile during auth state change:", err);
        }
      } else if (event === 'SIGNED_OUT') {
        setTeacher(null);
        setNeedsOnboarding(null);
        localStorage.removeItem('rubrica_teacher_profile');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Capacitor Native Deep Link Listener (Google OAuth & App Links callback)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let sub: any;
    const registerDeepLinkHandler = async () => {
      try {
        sub = await CapApp.addListener('appUrlOpen', async ({ url }) => {
          try {
            await Browser.close();
          } catch {}

          // Accept only this app's registered OAuth redirect targets. Rejecting
          // everything else stops another installed app from injecting a session
          // through a crafted deep link. The URL (which may contain a code) is
          // never written to the log.
          let parsed: URL;
          try {
            parsed = new URL(url);
          } catch {
            return;
          }

          const isCustomScheme =
            parsed.protocol === 'in.rubrica.app:' && parsed.hostname === 'auth-callback';
          const isWebAppLink =
            parsed.protocol === 'https:' &&
            parsed.hostname === 'rubrica.in' &&
            parsed.pathname === '/app';
          if (!isCustomScheme && !isWebAppLink) return;

          const code = parsed.searchParams.get('code');
          if (!code) return;

          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) console.error('[Capacitor] Code exchange failed:', error.message);
        });
      } catch (err) {
        console.warn('[Capacitor] Unable to attach appUrlOpen listener:', err);
      }
    };

    registerDeepLinkHandler();

    return () => {
      if (sub?.remove) sub.remove();
    };
  }, []);

  useEffect(() => { 
    if (teacher?.id) {
      if (teacher.isBeta || teacher.id === 'b0000000-0000-4000-8000-000000000001' || teacher.email === 'beta@rubrica.in') {
        setData(getSampleBetaData());
        setLoading(false);
        return;
      }
      setLoading(true);
      fetchDashboardData(teacher.id).then((remote) => {
        if (remote) setData(remote);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [teacher?.id, teacher?.isBeta]);

  const saveProfile = (profile: TeacherProfile) => { 
    saveTeacherProfile(profile); 
    setTeacher(profile); 
    if (profile.isBeta || profile.id === 'b0000000-0000-4000-8000-000000000001' || profile.email === 'guest@rubrica.in' || profile.email === 'beta@rubrica.in' || profile.institutionId === 'guest-institution') {
      setNeedsOnboarding(null);
      setData(getSampleBetaData());
      return;
    }
    const isStudent = profile.role === 'student';
    const isConfigured = isStudent
      ? Boolean(profile.gradeOrExam)
      : Boolean(profile.institutionId || (profile.institution && profile.institution !== 'Independent Academy'));

    if (!isConfigured) {
      setNeedsOnboarding({
        userId: profile.id || '',
        email: profile.email || '',
        name: profile.name || (isStudent ? 'Student' : 'Teacher'),
        role: isStudent ? 'student' : 'teacher',
      });
    } else {
      setNeedsOnboarding(null);
    }
  };
  const saveSettings = (next: RubricaConfig) => { saveConfig(next); setConfig(next); setSettingsOpen(false); };
  
  const addStudent = async (name: string, classroomId: string, grade: string) => {
    if (!teacher?.id) return;
    const student: StudentRecord = { id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2)), name, classroomId, grade, createdAt: new Date().toISOString() };
    const nextData = { ...data, students: [student, ...data.students] };
    setData(nextData);
    if (teacher.isBeta) {
      saveBetaData(nextData);
      return;
    }
    await addStudentFn({ data: { ...student, userId: teacher.id } }).catch(console.error);
  };
  
  const addClassroom = async (name: string, grade: string, subject: string) => {
    if (!teacher?.id) return;
    const classroom: ClassroomRecord = { id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2)), name, grade, subject, createdAt: new Date().toISOString() };
    const nextData = { ...data, classrooms: [classroom, ...data.classrooms] };
    setData(nextData);
    if (teacher.isBeta) {
      saveBetaData(nextData);
      return;
    }
    await addClassroomFn({ data: { ...classroom, userId: teacher.id } }).catch(console.error);
  };

  const updateClassroomRubric = async (id: string, rubric: string) => {
    if (!teacher?.id) return;
    const nextClassrooms = data.classrooms.map(c => c.id === id ? { ...c, rubric } : c);
    const nextData = { ...data, classrooms: nextClassrooms };
    setData(nextData);
    if (teacher.isBeta) {
      saveBetaData(nextData);
      return;
    }
    await updateClassroomRubricFn({ data: { id, userId: teacher.id, rubric } }).catch(console.error);
  };

  const saveEvaluation = async ({ id: existingId, studentId, fileName, title, subject, result }: { id?: string; studentId: string; fileName: string; title?: string; subject?: string; result: VisionEvaluation }) => {
    if (!studentId || !teacher?.id) return;
    const existingEvaluation = existingId ? data.evaluations.find(e => e.id === existingId) : undefined;
    const id = existingId || ((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2)));
    const student = data.students.find((s) => s.id === studentId);
    const studentClassroom = data.classrooms.find((c) => c.id === student?.classroomId);
    
    const evaluation: EvaluationRecord = {
      id, 
      studentId, 
      title: title?.trim() || existingEvaluation?.title || `${student?.name || 'Student'} Paper`, 
      subject: subject?.trim() || existingEvaluation?.subject || studentClassroom?.subject || 'General', 
      score: result.score, 
      maxScore: result.maxScore, 
      percentage: result.percentage,
      fileName: fileName || existingEvaluation?.fileName || 'Answer paper', 
      summary: result.overallFeedback, 
      confirmedStrengths: result.confirmedStrengths, 
      watchOutAreas: result.watchOutAreas,
      detailedAnalysis: result.detailedAnalysis, 
      rawJsonResult: result, 
      createdAt: existingEvaluation?.createdAt || new Date().toISOString()
    };
    
    const nextEvaluations = existingId
      ? data.evaluations.map(e => e.id === existingId ? evaluation : e)
      : [evaluation, ...data.evaluations];

    const affectedStudentIds = new Set<string>([studentId]);
    if (existingEvaluation && existingEvaluation.studentId !== studentId) {
      affectedStudentIds.add(existingEvaluation.studentId);
    }

    let nextProfiles = [...data.profiles];
    for (const sId of affectedStudentIds) {
      const studentEvals = nextEvaluations.filter(e => e.studentId === sId);
      const existingProfile = data.profiles.find(p => p.studentId === sId);
      const updatedProfile: StudentProfileRecord = {
        ...generateStudentProfile(studentEvals),
        dpps: existingProfile?.dpps || []
      };
      nextProfiles = [updatedProfile, ...nextProfiles.filter(p => p.studentId !== sId)];
      if (!teacher.isBeta) {
        await saveStudentProfileFn({ data: { ...updatedProfile, userId: teacher.id } }).catch(console.error);
      }
    }

    let nextStudents = [...data.students];
    if (teacher.role === 'student' && !nextStudents.some(s => s.id === studentId)) {
      nextStudents = [
        ...nextStudents,
        {
          id: studentId,
          name: cleanStudentName(teacher.name),
          grade: cleanStudentGrade(teacher.gradeOrExam),
          classroomId: data.classrooms[0]?.id || 'self-classroom',
          createdAt: new Date().toISOString()
        }
      ];
    }

    const nextData = { ...data, students: nextStudents, evaluations: nextEvaluations, profiles: nextProfiles };
    
    setData(nextData);
    if (teacher.isBeta) {
      saveBetaData(nextData);
      return;
    }
    await saveEvaluationFn({ data: { ...evaluation, userId: teacher.id, overallFeedback: result.overallFeedback } }).catch(console.error);
  };

  const updateStudentProfile = async (profile: StudentProfileRecord) => {
    if (!teacher?.id) return;
    const nextProfiles = [profile, ...data.profiles.filter(p => p.studentId !== profile.studentId)];
    const nextData = { ...data, profiles: nextProfiles };
    setData(nextData);
    if (teacher.isBeta) {
      saveBetaData(nextData);
      return;
    }
    await saveStudentProfileFn({ data: { ...profile, userId: teacher.id } }).catch(console.error);
  };

  const deleteStudent = async (id: string) => {
    if (!teacher?.id) return;
    const deletedStudent = data.students.find(s => s.id === id);
    if (!deletedStudent) return;
    const deletedEvals = data.evaluations.filter(e => e.studentId === id);
    const deletedProfile = data.profiles.find(p => p.studentId === id);

    const nextData = { 
      ...data, 
      students: data.students.filter(s => s.id !== id),
      evaluations: data.evaluations.filter(e => e.studentId !== id),
      profiles: data.profiles.filter(p => p.studentId !== id)
    };
    setData(nextData);
    if (teacher.isBeta) {
      saveBetaData(nextData);
    } else {
      await deleteStudentFn({ data: { id, userId: teacher.id } }).catch(console.error);
    }

    setUndoAction({
      id: `student-${id}-${Date.now()}`,
      message: `Deleted student "${deletedStudent.name}" (${deletedEvals.length} paper${deletedEvals.length !== 1 ? 's' : ''})`,
      onUndo: async () => {
        setData(current => ({
          ...current,
          students: [deletedStudent, ...current.students.filter(s => s.id !== id)],
          evaluations: [...deletedEvals, ...current.evaluations.filter(e => e.studentId !== id)],
          profiles: deletedProfile ? [deletedProfile, ...current.profiles.filter(p => p.studentId !== id)] : current.profiles
        }));
        if (teacher.isBeta) {
          const restored = {
            ...data,
            students: [deletedStudent, ...data.students.filter(s => s.id !== id)],
            evaluations: [...deletedEvals, ...data.evaluations.filter(e => e.studentId !== id)],
            profiles: deletedProfile ? [deletedProfile, ...data.profiles.filter(p => p.studentId !== id)] : data.profiles
          };
          saveBetaData(restored);
        } else {
          await addStudentFn({ data: { id: deletedStudent.id, userId: teacher.id, classroomId: deletedStudent.classroomId, name: deletedStudent.name, grade: deletedStudent.grade, createdAt: deletedStudent.createdAt } }).catch(console.error);
          for (const ev of deletedEvals) {
            await saveEvaluationFn({ data: { ...ev, userId: teacher.id } }).catch(console.error);
          }
          if (deletedProfile) {
            await saveStudentProfileFn({ data: { ...deletedProfile, userId: teacher.id } }).catch(console.error);
          }
        }
      }
    });
  };

  const deleteClassroom = async (id: string) => {
    if (!teacher?.id) return;
    const deletedClass = data.classrooms.find(c => c.id === id);
    if (!deletedClass) return;

    const nextData = { ...data, classrooms: data.classrooms.filter(c => c.id !== id) };
    setData(nextData);
    if (teacher.isBeta) {
      saveBetaData(nextData);
    } else {
      await deleteClassroomFn({ data: { id, userId: teacher.id } }).catch(console.error);
    }

    setUndoAction({
      id: `classroom-${id}-${Date.now()}`,
      message: `Deleted classroom "${deletedClass.name}"`,
      onUndo: async () => {
        setData(current => ({
          ...current,
          classrooms: [deletedClass, ...current.classrooms.filter(c => c.id !== id)]
        }));
        if (teacher.isBeta) {
          saveBetaData({ ...data, classrooms: [deletedClass, ...data.classrooms.filter(c => c.id !== id)] });
        } else {
          await addClassroomFn({ data: { id: deletedClass.id, userId: teacher.id, name: deletedClass.name, grade: deletedClass.grade, rubric: deletedClass.rubric } }).catch(console.error);
        }
      }
    });
  };

  const deleteEvaluation = async (id: string) => {
    if (!teacher?.id) return;
    const deletedEval = data.evaluations.find(e => e.id === id);
    if (!deletedEval) return;

    const nextData = { ...data, evaluations: data.evaluations.filter(e => e.id !== id) };
    setData(nextData);
    if (teacher.isBeta) {
      saveBetaData(nextData);
    } else {
      await deleteEvaluationFn({ data: { id, userId: teacher.id } }).catch(console.error);
    }

    setUndoAction({
      id: `eval-${id}-${Date.now()}`,
      message: `Deleted evaluation "${deletedEval.title}"`,
      onUndo: async () => {
        setData(current => {
          const restoredEvals = [deletedEval, ...current.evaluations.filter(e => e.id !== id)];
          const studentEvals = restoredEvals.filter(e => e.studentId === deletedEval.studentId);
          const existingProfile = current.profiles.find(p => p.studentId === deletedEval.studentId);
          const restoredProfile: StudentProfileRecord = {
            ...generateStudentProfile(studentEvals),
            dpps: existingProfile?.dpps || []
          };
          const nextProfiles = [restoredProfile, ...current.profiles.filter(p => p.studentId !== deletedEval.studentId)];
          const restored = { ...current, evaluations: restoredEvals, profiles: nextProfiles };
          if (teacher.isBeta) {
            saveBetaData(restored);
          }
          return restored;
        });
        if (!teacher.isBeta) {
          await saveEvaluationFn({ data: { ...deletedEval, userId: teacher.id } }).catch(console.error);
        }
      }
    });
  };
    const EvaluateRoute = () => {
      const [, setLocation] = useLocation();
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
      const evalId = params.get('id') || undefined;
      return (
        <Evaluate
          data={data}
          initialEvaluationId={evalId}
          onSave={saveEvaluation}
          onDelete={deleteEvaluation}
          onDashboard={(id) => setLocation(teacher?.role === 'student' ? '/' : (id ? `/students/${id}` : '/'))}
          onUndoAction={setUndoAction}
          teacher={teacher}
        />
      );
    };

  if (needsOnboarding && !teacher?.isBeta && teacher?.id !== 'b0000000-0000-4000-8000-000000000001' && teacher?.email !== 'guest@rubrica.in' && teacher?.email !== 'beta@rubrica.in' && teacher?.institutionId !== 'guest-institution') {
    return (
      <Onboarding 
        userId={needsOnboarding.userId} 
        email={needsOnboarding.email} 
        name={needsOnboarding.name} 
        role={needsOnboarding.role}
        onComplete={async () => {
          try {
            const profile = await getTeacherProfile(needsOnboarding.userId);
            if (profile) {
              const fullProfile = {
                ...profile,
                role: needsOnboarding.role || profile.role || 'teacher'
              };
              saveTeacherProfile(fullProfile);
              setTeacher(fullProfile);
            } else {
              const fallback: TeacherProfile = {
                id: needsOnboarding.userId,
                name: needsOnboarding.name || (needsOnboarding.role === 'student' ? 'Student' : 'Teacher'),
                email: needsOnboarding.email,
                institution: needsOnboarding.role === 'student' ? 'Student Desk' : 'Independent Academy',
                role: needsOnboarding.role || 'teacher',
                createdAt: new Date().toISOString()
              };
              saveTeacherProfile(fallback);
              setTeacher(fallback);
            }
          } catch {
            const fallback: TeacherProfile = {
              id: needsOnboarding.userId,
              name: needsOnboarding.name || (needsOnboarding.role === 'student' ? 'Student' : 'Teacher'),
              email: needsOnboarding.email,
              institution: needsOnboarding.role === 'student' ? 'Student Desk' : 'Independent Academy',
              role: needsOnboarding.role || 'teacher',
              createdAt: new Date().toISOString()
            };
            saveTeacherProfile(fallback);
            setTeacher(fallback);
          }
          setNeedsOnboarding(null);
        }} 
        onBack={async () => {
          // Dismiss onboarding safely into the user desk
          const fallback: TeacherProfile = {
            id: needsOnboarding.userId,
            name: needsOnboarding.name || (needsOnboarding.role === 'student' ? 'Student' : 'Teacher'),
            email: needsOnboarding.email,
            institution: needsOnboarding.role === 'student' ? 'Student Desk' : 'Independent Academy',
            role: needsOnboarding.role || 'teacher',
            createdAt: new Date().toISOString()
          };
          saveTeacherProfile(fallback);
          setTeacher(fallback);
          setNeedsOnboarding(null);
        }}
      />
    );
  }

  if (!teacher) {
    const isApp = isAppEnvironment();

    return (
      <ErrorBoundary>
        <WouterRouter base={(import.meta.env.BASE_URL || '').replace(/\/$/, '')}>
          <Switch>
            <Route path="/privacy" component={PrivacyPolicy} />
            <Route path="/terms" component={TermsOfService} />
            <Route path="/contact" component={Contact} />
            <Route path="/app" component={() => (
              <MobileAppAuth 
                onLogin={(profile) => {
                  saveProfile(profile);
                  window.history.replaceState(null, '', '/');
                }}
                onViewWeb={() => setForceWeb(true)} 
              />
            )} />
            <Route path="/login" component={() => (
              <MobileAppAuth 
                onLogin={(profile) => {
                  saveProfile(profile);
                  window.history.replaceState(null, '', '/');
                }}
                onViewWeb={() => setForceWeb(true)} 
              />
            )} />
            <Route component={() => (
              isApp && !forceWeb ? (
                <MobileAppAuth 
                  onLogin={(profile) => {
                    saveProfile(profile);
                    window.history.replaceState(null, '', '/');
                  }}
                  onViewWeb={() => setForceWeb(true)}
                />
              ) : (
                <LandingPage 
                  onStartSetup={() => { setShowLogin(true); }} 
                  onLoginClick={() => { setShowLogin(true); }}
                  isLoginOpen={showLogin}
                />
              )
            )} />
          </Switch>
          {showLogin && (
            <Login onClose={() => setShowLogin(false)} onLogin={(profile) => {
              saveProfile(profile);
              setShowLogin(false);
              window.history.replaceState(null, '', '/');
            }} />
          )}
        </WouterRouter>
      </ErrorBoundary>
    );
  }

  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={(import.meta.env.BASE_URL || '').replace(/\/$/, '')}><ErrorBoundary>
        <AppShell 
          teacher={teacher} 
          data={data}
          isAdmin={isAdmin}
          onSettings={() => setSettingsOpen(true)}
        >
          <Switch>
            <Route path="/admin" component={() => <AdminPanel />} />
            <Route path="/" component={() => (
              teacher?.role === 'student' ? (
                <StudentProfile 
                  data={data} 
                  teacher={teacher} 
                  initialView="overview"
                  onDelete={deleteStudent} 
                  onUpdateProfile={updateStudentProfile} 
                />
              ) : (
                <Dashboard
                  data={data}
                  teacher={teacher}
                  onResetBetaData={() => {
                    const refreshed = resetBetaData();
                    setData(refreshed);
                  }}
                />
              )
            )} />
            <Route path="/classrooms" component={() => <Classrooms data={data} onAdd={addClassroom} />} />
            <Route path="/classrooms/:id" component={() => <ClassroomProfile data={data} onUpdateRubric={updateClassroomRubric} />} />
            <Route path="/students" component={() => (
              teacher?.role === 'student' ? (
                <StudentProfile 
                  data={data} 
                  teacher={teacher} 
                  initialView="papers"
                  onDelete={deleteStudent} 
                  onUpdateProfile={updateStudentProfile} 
                />
              ) : (
                <Students data={data} onAdd={addStudent} onDelete={deleteStudent} />
              )
            )} />
            <Route path="/papers" component={() => (
              <StudentProfile 
                data={data} 
                teacher={teacher} 
                initialView="papers"
                onDelete={deleteStudent} 
                onUpdateProfile={updateStudentProfile} 
              />
            )} />
            <Route path="/dpps" component={() => (
              <StudentProfile 
                data={data} 
                teacher={teacher} 
                initialView="dpps"
                onDelete={deleteStudent} 
                onUpdateProfile={updateStudentProfile} 
              />
            )} />
            <Route path="/mistakes" component={() => (
              <StudentProfile 
                data={data} 
                teacher={teacher} 
                initialView="mistakes"
                onDelete={deleteStudent} 
                onUpdateProfile={updateStudentProfile} 
              />
            )} />
            <Route path="/tutor" component={() => (
              <StudentProfile 
                data={data} 
                teacher={teacher} 
                initialView="tutor"
                onDelete={deleteStudent} 
                onUpdateProfile={updateStudentProfile} 
              />
            )} />
            <Route path="/students/:id" component={() => <StudentProfile data={data} teacher={teacher} onDelete={deleteStudent} onUpdateProfile={updateStudentProfile} />} />
            <Route path="/evaluate" component={EvaluateRoute} />
            <Route path="/privacy" component={PrivacyPolicy} />
            <Route path="/terms" component={TermsOfService} />
            <Route path="/contact" component={Contact} />
            <Route component={() => <EmptyState title="Page not found" text="This page has wandered out of the gradebook." />} />
          </Switch>
        </AppShell>
      </ErrorBoundary></WouterRouter><Toaster /><UndoBanner action={undoAction} onDismiss={() => setUndoAction(null)} />{settingsOpen && (
        <SettingsDrawer 
          config={config} 
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
          onClose={() => setSettingsOpen(false)} 
          onSave={saveSettings} 
          isStudent={teacher?.role === 'student'}
        />
      )}</TooltipProvider></QueryClientProvider>;
}



function TestLoginModal({ onClose, onLogin }: { onClose: () => void, onLogin: (profile: TeacherProfile & { email?: string }) => void }) {
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [schoolMode, setSchoolMode] = useState<'select' | 'manual'>('select');
  const [selectedSchool, setSelectedSchool] = useState('');
  
  useEffect(() => {
    // Only attempt to fetch if not using the fallback
    getInstitutions().then(data => {
      setInstitutions(data || []);
      if (data && data.length > 0) setSelectedSchool(data[0].name);
      else setSchoolMode('manual');
    }).catch(err => {
      console.error("Could not load institutions for test login:", err);
      setSchoolMode('manual');
    });
  }, []);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md border-4 border-[#09090B] dark:border-border bg-[#fef5f6] dark:bg-[#18181c] p-8 shadow-[8px_8px_0_var(--color-primary)] dark:shadow-[8px_8px_0_#000]">
        <div className="mb-6 flex items-start justify-between">
          <h2 className="font-display text-3xl font-bold text-[#09090B] dark:text-foreground">Test Login</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center border-2 border-[#09090B] dark:border-border bg-white dark:bg-secondary text-[#09090B] dark:text-foreground hover:bg-muted transition-transform hover:scale-105"
            aria-label="Close"
          >
            <X size={18} strokeWidth={3} />
          </button>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const username = (fd.get('username') as string || '').trim();
          let schoolName = selectedSchool;
          if (schoolMode === 'manual') {
            schoolName = (fd.get('manual_school') as string || '').trim();
          }
          if (!username || !schoolName) return;
          
          if (username.toLowerCase() === 'admin') {
            const password = prompt('Enter admin password:');
            if (password === 'admin') {
              onLogin({ name: 'Admin', institution: 'Global Admin', id: 'f9f324e7-23e2-4e91-8131-583eef5cb1f1', email: 'certifiedtechidiot@gmail.com' });
            } else {
              alert('Incorrect password');
            }
          } else {
            onLogin({ name: username, institution: schoolName, id: 'f9f324e7-23e2-4e91-8131-583eef5cb1f1', email: username.toLowerCase().replace(/\s+/g, '') + '@test.com' });
          }
        }} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-primary dark:text-primary">Username</label>
            <input
              name="username"
              autoFocus
              className="mt-1 h-12 w-full border-2 border-[#09090B] dark:border-border bg-white dark:bg-secondary/40 text-foreground px-3 font-medium outline-none focus:border-primary"
              placeholder="Enter any name, or 'admin'"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-primary dark:text-primary">Select school</label>
            {schoolMode === 'select' ? (
              <select 
                className="mt-1 h-12 w-full border-2 border-[#09090B] dark:border-border bg-white dark:bg-secondary/40 text-foreground px-3 font-medium outline-none focus:border-primary"
                value={selectedSchool}
                onChange={(e) => {
                  if (e.target.value === '___other___') {
                    setSchoolMode('manual');
                  } else {
                    setSelectedSchool(e.target.value);
                  }
                }}
              >
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.name} className="dark:bg-[#18181c] text-foreground">{inst.name}</option>
                ))}
                <option value="___other___" className="dark:bg-[#18181c] text-foreground">Other (Type manually)...</option>
              </select>
            ) : (
              <input
                name="manual_school"
                autoFocus
                className="mt-1 h-12 w-full border-2 border-[#09090B] dark:border-border bg-white dark:bg-secondary/40 text-foreground px-3 font-medium outline-none focus:border-primary"
                placeholder="Enter school name manually"
              />
            )}
            {schoolMode === 'manual' && institutions.length > 0 && (
              <button type="button" onClick={() => setSchoolMode('select')} className="mt-2 text-xs font-bold text-muted-foreground hover:text-primary underline">
                Back to list
              </button>
            )}
          </div>
          
          <button
            type="submit"
            className="mt-4 flex w-full items-center justify-center border-2 border-[#09090B] dark:border-border bg-primary py-3 text-sm font-bold text-white shadow-[3px_3px_0_#09090B] dark:shadow-[3px_3px_0_#000] transition-transform hover:translate-x-[1px] hover:translate-y-[1px]"
          >
            Continue to App
          </button>
        </form>
      </div>
    </div>
  );
}
export default App;