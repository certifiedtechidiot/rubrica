import { ArrowLeft, Sun, Moon, X } from 'lucide-react';
import { Link } from 'wouter';
import { useTheme } from '@/lib/theme';

export function TermsOfService() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <div className="min-h-[100dvh] bg-[#fbfaf7] dark:bg-background px-5 py-16 md:px-12 md:py-24 text-foreground">
      <div className="mx-auto max-w-3xl border-4 border-[#09090B] dark:border-border bg-white dark:bg-card p-8 shadow-[8px_8px_0_#09090B] dark:shadow-[8px_8px_0_#000] md:p-12">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <ArrowLeft size={16} /> Back to home
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="grid h-9 w-9 place-items-center border-2 border-[#09090B] dark:border-border bg-white dark:bg-secondary text-foreground shadow-[2px_2px_0_#09090B] dark:shadow-[2px_2px_0_#000] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Toggle theme"
              title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {resolvedTheme === 'dark' ? <Sun size={16} className="text-[#F59E0B]" /> : <Moon size={16} className="text-[#8B5CF6]" />}
            </button>
            <Link
              href="/"
              className="grid h-9 w-9 place-items-center border-2 border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted shadow-[2px_2px_0_#09090B] dark:shadow-[2px_2px_0_#000] dark:shadow-[2px_2px_0_#000] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Exit to home"
              title="Exit to home"
            >
              <X size={16} />
            </Link>
          </div>
        </div>
        <h1 className="mb-8 font-display text-4xl font-black text-[#09090B] dark:text-foreground">Terms of service</h1>
        
        <div className="prose prose-stone dark:prose-invert max-w-none prose-headings:font-display prose-headings:font-bold prose-headings:text-[#09090B] dark:prose-headings:text-foreground">
          <h3>1. Acceptance of Terms</h3>
          <p>By accessing and using Rubrica, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>
          
          <h3>2. Use License</h3>
          <p>Permission is granted to temporarily use the Rubrica platform for personal, educational, and non-commercial school use. You may not modify, copy, or resell the software.</p>
          
          <h3>3. Disclaimer</h3>
          <p>Rubrica provides AI-assisted grading recommendations. Teachers retain final responsibility for all grades assigned to students. The materials on Rubrica are provided on an 'as is' basis.</p>
          
          <h3>4. Limitations</h3>
          <p>In no event shall Rubrica be liable for any damages arising out of the use or inability to use the materials on the platform.</p>
          
          <h3>5. Contact Us</h3>
          <p>For support or questions regarding these terms, contact us at <strong>certifiedtechidiot@gmail.com</strong> or call us at <strong>9225141995</strong>.</p>
        </div>
      </div>
    </div>
  );
}
