import { FileText, CheckCircle2, Menu, X, BarChart, ShieldCheck, HelpCircle, FilePlus2, MessageSquareText, FileEdit, Users, Clock, Zap, BookOpen, Calculator, LineChart, FileImage, PenTool, LayoutGrid, FlaskConical, Type, Sparkles, BrainCircuit, Sun, Moon, Smartphone, Download } from 'lucide-react';
import { Link } from 'wouter';
import { useState } from 'react';
import { useTheme } from '@/lib/theme';

type LandingPageProps = {
  onStartSetup: () => void;
  onLoginClick: () => void;
  isLoginOpen?: boolean;
};

export function LandingPage({ onStartSetup, onLoginClick, isLoginOpen }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <div className="min-h-[100dvh] bg-background dark:bg-background selection:bg-primary/20 font-sans text-foreground">
      
      {/* Header */}
      {!isLoginOpen && (
        <header className="sticky top-0 z-40 border-b-4 border-border dark:border-border bg-background dark:bg-background/95 backdrop-blur-md px-5 py-4 md:px-12">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="Rubrica Logo" className="h-9 w-9 object-contain" />
            <span className="font-display text-xl font-bold tracking-tight text-foreground dark:text-foreground">rubri<span className="text-primary">ca</span></span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 font-bold text-sm">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a 
              href="https://certifiedtechidiot.github.io/rubrica-app/rubrica.apk" 
              className="inline-flex items-center gap-1.5 text-foreground hover:text-primary transition-colors"
            >
              <Smartphone size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span>Download App</span>
            </a>
            <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">Policy</Link>
            <Link href="/contact" className="hover:text-primary transition-colors">Reach Us</Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="grid h-10 w-10 place-items-center border-2 border-border dark:border-border bg-card dark:bg-card text-foreground shadow-[3px_3px_0_hsl(var(--foreground))] transition-transform hover:translate-x-[1px] hover:translate-y-[1px]"
              aria-label="Toggle theme"
              title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
              data-testid="button-landing-theme-toggle"
            >
              {resolvedTheme === 'dark' ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-indigo-500" />}
            </button>
            <button 
              onClick={onLoginClick} 
              className="flex items-center gap-2 border-2 border-border bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-[3px_3px_0_hsl(var(--foreground))] transition-transform motion-reduce:transition-none hover:translate-x-[1px] hover:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Login without account
            </button>
          </div>

          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              className="grid h-9 w-9 place-items-center border-2 border-border dark:border-border bg-card dark:bg-card text-foreground shadow-[2px_2px_0_hsl(var(--foreground))]"
              aria-label="Toggle theme"
              title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {resolvedTheme === 'dark' ? <Sun size={16} className="text-amber-500" /> : <Moon size={16} className="text-indigo-500" />}
            </button>
            <button className="p-2 text-foreground" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full border-b-4 border-border dark:border-border bg-background dark:bg-card p-5 flex flex-col gap-4 font-bold shadow-2xl">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="py-2 border-b border-border/40 text-foreground">Features</a>
            <a 
              href="https://certifiedtechidiot.github.io/rubrica-app/rubrica.apk"
              onClick={() => setMobileMenuOpen(false)} 
              className="py-2 border-b border-border/40 text-foreground flex items-center justify-between"
            >
              <span className="flex items-center gap-2"><Smartphone size={18} className="text-emerald-600 dark:text-emerald-400" /> Download Android App</span>
              <span className="font-mono-score text-[10px] bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 dark:text-emerald-400 px-2 py-0.5 border border-emerald-600">APK v1.0.0</span>
            </a>
            <Link href="/terms" onClick={() => setMobileMenuOpen(false)} className="py-2 border-b border-border/40 text-foreground">Terms</Link>
            <Link href="/privacy" onClick={() => setMobileMenuOpen(false)} className="py-2 border-b border-border/40 text-foreground">Privacy Policy</Link>
            <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="py-2 border-b border-border/40 text-foreground">Reach Us</Link>
            <button 
              onClick={() => { setMobileMenuOpen(false); onLoginClick(); }} 
              className="mt-2 w-full flex justify-center items-center gap-2 border-2 border-border bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[3px_3px_0_hsl(var(--foreground))] transition-transform motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Login without account
            </button>
          </div>
        )}
      </header>
      )}

      <main className="mx-auto max-w-7xl px-5 pb-24 pt-16 md:px-12 md:pt-24">
        
        {/* Original Hero Section */}
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-8 xl:gap-16 mb-32 border-b-2 border-border/40 pb-20">
          <div className="flex flex-col justify-center">
            <h1 className="font-display text-5xl font-black leading-[1.1] tracking-tight text-foreground dark:text-foreground md:text-6xl lg:text-7xl">
              Grade papers in seconds, not weekends.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              Rubrica uses Vision AI to evaluate handwritten answer sheets against your rubrics, tracks long-term student progress, and highlights recurring mistakes across your classrooms.
            </p>
            
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button 
                onClick={onStartSetup} 
                className="inline-flex h-14 items-center justify-center gap-2 border-2 border-border bg-primary px-8 text-base font-bold text-primary-foreground shadow-[4px_4px_0_hsl(var(--foreground))] transition-transform motion-reduce:transition-none hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_hsl(var(--foreground))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Login without account
              </button>
              <a 
                href="https://certifiedtechidiot.github.io/rubrica-app/rubrica.apk"
                className="inline-flex h-14 items-center justify-center gap-2 border-2 border-border dark:border-border bg-card dark:bg-card text-foreground px-6 text-base font-bold shadow-[4px_4px_0_hsl(var(--foreground))] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_hsl(var(--foreground))]"
              >
                <Smartphone size={20} className="text-emerald-600 dark:text-emerald-400" />
                <span>Download App (APK)</span>
              </a>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute -inset-4 bg-primary/10 blur-2xl lg:-inset-8" />
            <div className="absolute -bottom-8 -left-8 h-32 w-32 bg-emerald-600/20 blur-xl" />
            
            <div className="relative z-10 flex flex-col border-4 border-border dark:border-border bg-card dark:bg-card shadow-[6px_6px_0_hsl(var(--foreground))]">
              <div className="flex items-center gap-2 border-b-4 border-border dark:border-border bg-muted/60 dark:bg-muted/80 px-4 py-3">
                <div className="h-3 w-3 rounded-full border-2 border-border bg-primary" />
                <div className="h-3 w-3 rounded-full border-2 border-border bg-amber-500" />
                <div className="h-3 w-3 rounded-full border-2 border-border bg-emerald-600" />
                <p className="ml-2 font-mono-score text-xs font-medium text-foreground dark:text-muted-foreground">Evaluation report</p>
              </div>
              <div className="p-6 md:p-8">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-2xl font-bold text-foreground dark:text-foreground">Science Mid-term</h3>
                    <p className="text-xs text-muted-foreground">Year 8, Maya Robinson</p>
                  </div>
                  <span className="inline-flex items-center gap-1 border-2 border-emerald-600 bg-accent/20 dark:bg-emerald-600/25 px-3 py-1 font-mono-score text-lg font-bold text-emerald-800 dark:text-emerald-300 dark:text-emerald-400">
                    85%
                  </span>
                </div>
                <div className="mt-8 space-y-4">
                  <div className="border-l-4 border-emerald-600 bg-accent/10 dark:bg-emerald-600/15 p-4"><p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 dark:text-emerald-400">Confirmed strengths</p><p className="mt-1 text-sm font-semibold text-foreground dark:text-foreground">Excellent diagram labeling and clear unit conversions.</p></div>
                  <div className="border-l-4 border-primary bg-primary/10 dark:bg-primary/15 p-4"><p className="text-xs font-semibold text-primary dark:text-destructive">Watch-out areas</p><p className="mt-1 text-sm font-semibold text-foreground dark:text-foreground">Repeated mistake in balancing multi-step chemical equations.</p></div>
                </div>
                <div className="mt-6 flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={16} /> Saved to gradebook</div>
              </div>
            </div>
            
            <div className="absolute -right-4 bottom-12 z-20 hidden border-2 border-border bg-foreground p-4 text-background shadow-[4px_4px_0_hsl(var(--primary))] sm:block md:-right-8"><div className="flex items-center gap-3"><BrainCircuit className="text-amber-500" size={24} /><div><p className="font-display text-sm font-bold">AI Memory</p><p className="font-mono-score text-[10px] text-background/80">Tracks patterns over time</p></div></div></div>
          </div>
        </div>

        {/* Impact Section */}
        <div className="text-center mb-24">
          <h2 className="font-display text-4xl md:text-5xl font-black text-foreground dark:text-foreground mb-6">
            Proven impact from our pilot evaluations
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground font-medium mb-12">
            Rubrica is already matching human grading quality while dramatically cutting the time teachers spend on evaluation.
          </p>

          <div className="relative w-full -mx-5 px-5 md:mx-0 md:px-0">
            {/* Mobile Touch-Swipeable Card Carousel */}
            <div className="flex overflow-x-auto no-scrollbar gap-4 md:hidden snap-x snap-mandatory py-2 scroll-smooth">
              {[
                { title: "Accuracy vs Manual", stat: "93%", desc: "Based on pilot comparisons with human graders" },
                { title: "Time Saved", stat: "97%", desc: "Reduce late-night correction marathons to a fraction" },
                { title: "Weekly Time Saved", stat: "9 hrs", desc: "Average saved per teacher per week in pilots" },
                { title: "Papers Graded", stat: "50k+", desc: "Handwritten answer sheets processed to date" },
                { title: "Grading Speed", stat: "10 sec", desc: "Approximate time to grade a single paper" }
              ].map((item, j) => (
                <div key={j} className="w-[280px] shrink-0 snap-start border-4 border-border dark:border-border bg-card dark:bg-card p-6 shadow-[4px_4px_0_hsl(var(--foreground))] text-left">
                  <p className="text-xs font-semibold text-muted-foreground mb-4">{item.title}</p>
                  <p className="font-mono-score text-4xl font-bold text-primary mb-3">{item.stat}</p>
                  <p className="text-xs font-medium text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
            
            {/* Desktop Grid */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-5 gap-6 text-left">
              {[
                { title: "Accuracy vs Manual", stat: "93%", desc: "Based on pilot comparisons with human graders" },
                { title: "Time Saved", stat: "97%", desc: "Reduce late-night correction marathons to a fraction" },
                { title: "Weekly Time Saved", stat: "9 hrs", desc: "Average saved per teacher per week in pilots" },
                { title: "Papers Graded", stat: "50k+", desc: "Handwritten answer sheets processed to date" },
                { title: "Grading Speed", stat: "10 sec", desc: "Approximate time to grade a single paper" }
              ].map((item, j) => (
                <div key={j} className="border-4 border-border dark:border-border bg-card dark:bg-card p-6 shadow-[6px_6px_0_hsl(var(--foreground))]">
                  <p className="text-xs font-semibold text-muted-foreground mb-4">{item.title}</p>
                  <p className="font-mono-score text-4xl font-bold text-primary mb-3">{item.stat}</p>
                  <p className="text-xs font-medium text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Subjects Supported Section */}
        <div className="text-center mb-32 border-t-2 border-border/40 pt-20">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground dark:text-foreground mb-6">
            What types of subjects does Rubrica support?
          </h2>
          <p className="mx-auto max-w-3xl text-base text-muted-foreground font-medium mb-12">
            From theory-heavy papers to numerical, graphical and diagram-based exams, Rubrica understands the most common answer formats used across schools and universities.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { icon: BookOpen, title: 'Theory & long answers' },
              { icon: Calculator, title: 'Numerical problems' },
              { icon: LineChart, title: 'Graphs & diagrams' },
              { icon: FileImage, title: 'Labelled drawings' },
              { icon: PenTool, title: 'Design & architecture' },
              { icon: LayoutGrid, title: 'Tabular answers' },
              { icon: FlaskConical, title: 'Lab observations' },
              { icon: Type, title: 'Short answers' }
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center justify-center gap-3 border-2 border-border dark:border-border bg-card dark:bg-card p-6 shadow-[4px_4px_0_hsl(var(--foreground))] transition-transform hover:-translate-y-1">
                <item.icon className="text-primary" size={28} />
                <p className="font-display text-sm font-bold text-center">{item.title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Core Features Grid */}
        <div id="features" className="mb-24">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground dark:text-foreground mb-12 text-center">
            Powerful AI features for modern educators
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="border-4 border-border dark:border-border bg-card dark:bg-card p-8 shadow-[6px_6px_0_hsl(var(--foreground))]">
              <div className="mb-6 grid h-12 w-12 place-items-center rounded-full border-2 border-border dark:border-border bg-primary text-white">
                <Users size={20} />
              </div>
              <h3 className="font-display text-xl font-bold mb-4 text-foreground">“Grade this whole class”</h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                Drop a single PDF of every student's submission. The agent splits it into individual papers on its own and grades all of them in minutes, saving 15 to 20 hours a week.
              </p>
            </div>
            
            <div className="border-4 border-border dark:border-border bg-card dark:bg-card p-8 shadow-[6px_6px_0_hsl(var(--foreground))]">
              <div className="mb-6 grid h-12 w-12 place-items-center rounded-full border-2 border-border dark:border-border bg-emerald-600 text-white">
                <ShieldCheck size={20} />
              </div>
              <h3 className="font-display text-xl font-bold mb-4 text-foreground">“Check for copying”</h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                In minutes the agent flags students who copied each other, AI-generated text similarity, and matching images or diagrams across the entire class for your review.
              </p>
            </div>

            <div className="border-4 border-border dark:border-border bg-card dark:bg-card p-8 shadow-[6px_6px_0_hsl(var(--foreground))]">
              <div className="mb-6 grid h-12 w-12 place-items-center rounded-full border-2 border-border dark:border-border bg-amber-500 text-white">
                <HelpCircle size={20} />
              </div>
              <h3 className="font-display text-xl font-bold mb-4 text-foreground">“What should I do now?”</h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                The agent checks the timetable and evaluation reports and answers: revise this topic next period, because 30% of the class didn't get it, and Student X scored 20/100 and missed the core concept.
              </p>
            </div>

            <div className="border-4 border-border dark:border-border bg-card dark:bg-card p-8 shadow-[6px_6px_0_hsl(var(--foreground))]">
              <div className="mb-6 grid h-12 w-12 place-items-center rounded-full border-2 border-border dark:border-border bg-indigo-500 text-white">
                <FilePlus2 size={20} />
              </div>
              <h3 className="font-display text-xl font-bold mb-4 text-foreground">“Build me an assignment”</h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                Generate a ready-to-share assignment from a single prompt, tailored to your syllabus. Prefer full control? Manual creation options are always there too.
              </p>
            </div>

            <div className="border-4 border-border dark:border-border bg-card dark:bg-card p-8 shadow-[6px_6px_0_hsl(var(--foreground))]">
              <div className="mb-6 grid h-12 w-12 place-items-center rounded-full border-2 border-border dark:border-border bg-sky-500 text-white">
                <BarChart size={20} />
              </div>
              <h3 className="font-display text-xl font-bold mb-4 text-foreground">“Make a report”</h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                Just ask. The agent produces detailed reports and graphs with question-by-question analysis, strengths, weaknesses, and personalized feedback for every student.
              </p>
            </div>

            <div className="border-4 border-border dark:border-border bg-card dark:bg-card p-8 shadow-[6px_6px_0_hsl(var(--foreground))]">
              <div className="mb-6 grid h-12 w-12 place-items-center rounded-full border-2 border-border dark:border-border bg-foreground text-white">
                <FileEdit size={20} />
              </div>
              <h3 className="font-display text-xl font-bold mb-4 text-foreground">“Annotate the papers”</h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                The agent marks corrections directly on the paper. Handwritten, MCQ, typed, diagrams, chemical equations, and language answers are all supported.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-20 border-4 border-border dark:border-border bg-primary px-8 py-16 text-center shadow-[6px_6px_0_hsl(var(--foreground))]">
          <h2 className="font-display text-3xl md:text-5xl font-black text-white">Ready to reclaim your weekends?</h2>
          <p className="mx-auto mt-6 max-w-xl text-white/90 font-medium">
            Join the teachers who have already graded over 50,000 papers using Rubrica's AI assistant.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onStartSetup} 
              className="inline-flex items-center gap-2 border-4 border-border bg-accent px-8 py-4 font-bold text-accent-foreground shadow-[6px_6px_0_hsl(var(--foreground))] transition-transform motion-reduce:transition-none hover:translate-x-[2px] hover:translate-y-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Login without account
            </button>
            <a 
              href="https://certifiedtechidiot.github.io/rubrica-app/rubrica.apk"
              className="inline-flex items-center gap-2 border-4 border-border dark:border-border bg-white text-foreground px-8 py-4 font-bold shadow-[6px_6px_0_hsl(var(--foreground))] transition-transform hover:translate-x-[2px] hover:translate-y-[2px]"
            >
              <Smartphone size={20} className="text-primary" /> Download Android App
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t-4 border-border dark:border-border bg-muted/40 dark:bg-card py-12 px-5 md:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <div className="flex items-center gap-2">
              <img src="/favicon.svg" alt="Rubrica Logo" className="h-8 w-8 object-contain" />
              <span className="font-display text-lg font-bold tracking-tight text-foreground dark:text-foreground">rubri<span className="text-primary">ca</span></span>
            </div>
            <p className="text-xs font-normal text-muted-foreground">
              Designed & Built by <span className="font-bold text-foreground">Rehan Khan</span>, Rubrica Technologies
            </p>
          </div>
          
          <div className="flex flex-col items-center gap-4 sm:items-end">
            <div className="flex flex-wrap gap-4 font-mono-score text-xs font-bold text-muted-foreground">
              <a 
                href="https://certifiedtechidiot.github.io/rubrica-app/rubrica.apk"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <Smartphone size={13} /> Android App (APK)
              </a>
              <Link href="/privacy" className="hover:text-primary hover:underline">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-primary hover:underline">Terms of Service</Link>
              <Link href="/contact" className="hover:text-primary hover:underline">Reach Us</Link>
            </div>
            <div className="font-mono-score text-xs text-muted-foreground text-center sm:text-right">
              Support: <a href="mailto:certifiedtechidiot@gmail.com" className="hover:text-foreground dark:hover:text-foreground">certifiedtechidiot@gmail.com</a>
              <span className="mx-2 hidden sm:inline">,</span>
              <br className="sm:hidden" />
              Phone: <a href="tel:+919225141995" className="hover:text-foreground dark:hover:text-foreground">+91 9225141995</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
