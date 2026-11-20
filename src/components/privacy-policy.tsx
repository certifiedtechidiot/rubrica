import { ArrowLeft, Sun, Moon, X } from 'lucide-react';
import { Link } from 'wouter';
import { useTheme } from '@/lib/theme';

export function PrivacyPolicy() {
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
        <h1 className="mb-8 font-display text-4xl font-black text-[#09090B] dark:text-foreground">Privacy policy</h1>
        
        <div className="prose prose-stone dark:prose-invert max-w-none prose-headings:font-display prose-headings:font-bold prose-headings:text-[#09090B] dark:prose-headings:text-foreground">
          <h3>1. Information We Collect</h3>
          <p>We collect information you provide directly to us when you create an account, such as your name, email address, and school affiliation. We also securely process the student evaluation data you upload for grading purposes.</p>
          
          <h3>2. How We Use Your Information</h3>
          <p>We use the information we collect to operate, maintain, and improve our AI grading services. We do not sell your personal data or your students' data to third parties.</p>
          
          <h3>3. Data Security & AI Processing</h3>
          <p>Student answer sheets and evaluation data are processed securely. Our AI models analyze the content solely for the purpose of providing grading insights according to your rubrics.</p>
          
          <h3>4. Sub-processors &amp; Retention</h3>
          <p>Handwritten answer sheets and the text required for grading are sent over HTTPS to our AI inference provider, AICredits, solely to produce the evaluation you request. We do not sell this data and we do not use student work to train models. Evaluations, student profiles and generated practice sets remain in your account until you delete them; deleting a student removes their papers and derived analytics.</p>

          <h3>5. Contact Us</h3>
          <p>If you have any questions about this Privacy Policy, please contact us at <strong>certifiedtechidiot@gmail.com</strong>.</p>
        </div>
      </div>
    </div>
  );
}
