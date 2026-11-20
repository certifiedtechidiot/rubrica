import { ArrowLeft, Mail, Phone, Sun, Moon, X } from 'lucide-react';
import { Link } from 'wouter';
import { useTheme } from '@/lib/theme';

export function Contact() {
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
        <h1 className="mb-8 font-display text-4xl font-black text-[#09090B] dark:text-foreground">Reach us</h1>
        
        <div className="space-y-8">
          <p className="text-lg font-medium text-muted-foreground">
            Have questions about Rubrica or want to request a custom deployment for your school? We'd love to hear from you.
          </p>
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="border-2 border-[#09090B] dark:border-border bg-[#fde8eb] dark:bg-[#E52237]/10 p-6 shadow-[4px_4px_0_#09090B] dark:shadow-[4px_4px_0_#000]">
              <Mail className="mb-4 text-[#E52237]" size={32} />
              <h3 className="font-display text-xl font-bold dark:text-foreground">Email Us</h3>
              <a href="mailto:certifiedtechidiot@gmail.com" className="mt-2 block font-medium hover:underline dark:text-muted-foreground dark:hover:text-[#E52237]">certifiedtechidiot@gmail.com</a>
            </div>
            
            <div className="border-2 border-[#09090B] dark:border-border bg-[#d1fae5] dark:bg-[#10B981]/10 p-6 shadow-[4px_4px_0_#09090B] dark:shadow-[4px_4px_0_#000]">
              <Phone className="mb-4 text-[#10B981]" size={32} />
              <h3 className="font-display text-xl font-bold dark:text-foreground">Call Us</h3>
              <a href="tel:+919225141995" className="mt-2 block font-medium hover:underline dark:text-muted-foreground dark:hover:text-[#10B981]">+91 9225141995</a>
            </div>
          </div>
          
          <div className="border-2 border-[#09090B] dark:border-border p-6 shadow-[4px_4px_0_#09090B] dark:shadow-[4px_4px_0_#000] bg-white dark:bg-card">
            <h3 className="mb-4 font-display text-xl font-bold dark:text-foreground">Send a Message</h3>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert("Thanks for reaching out! We'll get back to you soon."); }}>
              <div>
                <label className="block text-xs font-semibold text-foreground">Name</label>
                <input type="text" className="mt-1 w-full border-2 border-[#09090B] dark:border-border bg-white dark:bg-secondary/40 text-foreground p-3 outline-none focus:border-[#E52237]" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground">Email</label>
                <input type="email" className="mt-1 w-full border-2 border-[#09090B] dark:border-border bg-white dark:bg-secondary/40 text-foreground p-3 outline-none focus:border-[#E52237]" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground">Message</label>
                <textarea rows={4} className="mt-1 w-full resize-none border-2 border-[#09090B] dark:border-border bg-white dark:bg-secondary/40 text-foreground p-3 outline-none focus:border-[#E52237]" required></textarea>
              </div>
              <button type="submit" className="w-full border-2 border-[#09090B] dark:border-border bg-[#E52237] py-4 font-bold text-white shadow-[4px_4px_0_#09090B] dark:shadow-[4px_4px_0_#000] transition-transform hover:translate-x-[2px] hover:translate-y-[2px]">
                Send message
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
