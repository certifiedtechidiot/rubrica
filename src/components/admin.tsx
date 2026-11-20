import { useState, useEffect } from 'react';
import { getInstitutionStats, createInstitution, isCurrentUserAdmin } from '@/lib/api';
import { School, Users, Plus, LayoutDashboard, Settings2, DollarSign, ArrowLeft, X } from 'lucide-react';
import { useLocation, Link } from 'wouter';

export function AdminPanel() {
  const [stats, setStats] = useState<any[]>([]);
  // We no longer block the UI with loading to eliminate latency
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolQuota, setNewSchoolQuota] = useState('50');
  const [newSchoolCost, setNewSchoolCost] = useState('0');
  const [creating, setCreating] = useState(false);
  
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    let active = true;
    // Authorization is checked by the database, not by an email in localStorage.
    isCurrentUserAdmin().then((allowed) => {
      if (!active) return;
      setIsAdmin(allowed);
      if (!allowed) {
        setLocation('/');
        return;
      }
      loadStats();
    });
    return () => {
      active = false;
    };
  }, [setLocation]);

  const loadStats = async () => {
    try {
      // Create a simple timeout promise to prevent hanging if Supabase is down
      const timeout = (ms: number) => new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));
      
      const statsData = await Promise.race([getInstitutionStats(), timeout(1500)]).catch(() => []);
      setStats(statsData);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim() || !newSchoolQuota) return;
    
    setCreating(true);
    try {
      await createInstitution({ data: { name: newSchoolName.trim(), maxStudents: parseInt(newSchoolQuota, 10), cost: parseFloat(newSchoolCost) || 0 } });
      setNewSchoolName('');
      setNewSchoolQuota('50');
      setNewSchoolCost('0');
      await loadStats();
    } catch (err: any) {
      console.error('Create institution error:', err);
      alert(`Failed to create institution: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  if (isAdmin !== true) return null;

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-12 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" data-testid="link-admin-back-dashboard">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>
        <Link href="/" className="grid h-8 w-8 place-items-center border-2 border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" title="Exit to dashboard" aria-label="Exit to dashboard" data-testid="button-admin-exit-dashboard">
          <X size={15} />
        </Link>
      </div>

      <div className="mb-6 flex items-center gap-3 border-b-4 border-foreground dark:border-border pb-6">
        <span className="grid h-12 w-12 place-items-center border-2 border-[#09090B] dark:border-border bg-[#10B981] text-white shadow-[3px_3px_0_#09090B] dark:shadow-[3px_3px_0_#000]">
          <LayoutDashboard size={24} />
        </span>
        <div>
          <h1 className="font-display text-3xl font-black md:text-4xl text-foreground">Admin dashboard</h1>
          <p className="text-sm font-medium text-muted-foreground">Manage schools & quotas</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
        <div className="border-2 border-[#09090B] dark:border-border bg-[#FAFAFA] dark:bg-card p-6 shadow-[6px_6px_0_#09090B] dark:shadow-[6px_6px_0_#000]">
          <h2 className="mb-4 font-display text-xl font-bold text-foreground">Add Institution</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground">School name</label>
              <input 
                type="text" required value={newSchoolName} onChange={e => setNewSchoolName(e.target.value)}
                className="mt-1 h-10 w-full border-2 border-[#09090B] dark:border-border bg-white dark:bg-secondary/40 text-foreground px-3 font-medium outline-none focus:border-[#E52237]"
                placeholder="e.g. Lincoln High"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground">Student quota</label>
              <input 
                type="number" required min="1" value={newSchoolQuota} onChange={e => setNewSchoolQuota(e.target.value)}
                className="mt-1 h-10 w-full border-2 border-[#09090B] dark:border-border bg-white dark:bg-secondary/40 text-foreground px-3 font-medium outline-none focus:border-[#E52237]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground">Cost per school ($)</label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input 
                  type="number" required min="0" step="0.01" value={newSchoolCost} onChange={e => setNewSchoolCost(e.target.value)}
                  className="h-10 w-full border-2 border-[#09090B] dark:border-border bg-white dark:bg-secondary/40 text-foreground pl-9 pr-3 font-medium outline-none focus:border-[#E52237]"
                />
              </div>
            </div>
            <button 
              type="submit" disabled={creating}
              className="flex w-full items-center justify-center gap-2 border-2 border-[#09090B] dark:border-border bg-[#E52237] py-2 font-bold text-white shadow-[2px_2px_0_#09090B] dark:shadow-[2px_2px_0_#000] transition-transform hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-50"
            >
              <Plus size={16} /> {creating ? 'Adding...' : 'Add School'}
            </button>
          </form>
        </div>

        <div className="border-2 border-[#09090B] dark:border-border bg-[#FAFAFA] dark:bg-card p-6 shadow-[6px_6px_0_#09090B] dark:shadow-[6px_6px_0_#000]">
          <h2 className="mb-4 font-display text-xl font-bold text-foreground">Global AI Settings</h2>
          <p className="text-sm font-bold text-foreground">Managed by the server</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            The AI provider key is no longer stored in the database or sent to browsers. Set
            <code className="mx-1 bg-muted px-1 py-0.5 font-mono text-[11px]">AICREDITS_API_KEY</code>
            (and optionally <code className="mx-1 bg-muted px-1 py-0.5 font-mono text-[11px]">AICREDITS_MODEL</code>)
            in your hosting environment, then redeploy. Rotate any key that was previously stored here.
          </p>
        </div>

        {/* Database Config Viewer */}
        <div className="border-2 border-[#09090B] dark:border-border bg-[#FAFAFA] dark:bg-card p-6 shadow-[6px_6px_0_#09090B] dark:shadow-[6px_6px_0_#000]">
          <h2 className="mb-4 font-display text-xl font-bold text-foreground">Global Database Connection</h2>
          <p className="mb-4 text-xs font-semibold text-muted-foreground">
            These credentials connect your app to Supabase. To change them for all users, update the Environment Variables in your Vercel Dashboard.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground">VITE_SUPABASE_URL</label>
              <input 
                type="text" readOnly
                value={import.meta.env.VITE_SUPABASE_URL || 'https://eqhenaqedqcjkafsflyg.supabase.co (Fallback)'}
                className="mt-1 h-10 w-full border-2 border-border bg-muted px-3 font-mono text-xs font-medium text-muted-foreground outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground">VITE_SUPABASE_ANON_KEY</label>
              <input 
                type="text" readOnly
                value={import.meta.env.VITE_SUPABASE_ANON_KEY ? import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 15) + '...' : '(Using Hardcoded Fallback)'}
                className="mt-1 h-10 w-full border-2 border-border bg-muted px-3 font-mono text-xs font-medium text-muted-foreground outline-none"
              />
            </div>
          </div>
        </div>

      </div>

      <div className="mt-8">
        <div className="border-2 border-[#09090B] dark:border-border bg-white dark:bg-card shadow-[6px_6px_0_#09090B] dark:shadow-[6px_6px_0_#000]">
          <div className="border-b-2 border-[#09090B] dark:border-border bg-[#fbfaf7] dark:bg-muted p-4 font-display font-bold text-foreground">Registered Institutions</div>
          <div className="divide-y-2 divide-border">
            {stats.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No institutions found. Add one above.</div>
            ) : stats.map(inst => {
              const percentage = Math.min(100, Math.round((inst.current_students / inst.max_students) * 100));
              const isFull = inst.current_students >= inst.max_students;
              
              return (
                <div key={inst.id} className="p-4 transition-colors hover:bg-[#FAFAFA] dark:hover:bg-muted/40">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
                        <School size={16} className="text-muted-foreground" /> {inst.name}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        ID: {inst.id}, Cost: ${Number(inst.cost || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono-score text-lg font-bold ${isFull ? 'text-[#E52237]' : 'text-[#10B981]'}`}>
                        {inst.current_students} / {inst.max_students}
                      </div>
                      <p className="text-xs text-muted-foreground">Students</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 h-1.5 w-full bg-[#f0f0f0] dark:bg-muted">
                    <div 
                      className={`h-full ${isFull ? 'bg-[#E52237]' : 'bg-[#10B981]'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
