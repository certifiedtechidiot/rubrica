import { useState, useMemo } from 'react';
import { Plus, Search, Filter, Users, Settings2, BookOpen, ArrowLeft, Check, ChevronRight, X } from 'lucide-react';
import { Link, useLocation, useParams } from 'wouter';
import type { PersistedData, ClassroomRecord } from '@/lib/storage';
import { useBackButton } from '@/lib/back-button';

function SectionLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`mb-1 text-xs font-medium text-muted-foreground ${className}`}>{children}</p>;
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="border-2 border-dashed border-border bg-card px-6 py-12 text-center">
      <BookOpen className="mx-auto mb-3 text-muted-foreground" size={24} />
      <p className="font-display text-lg font-bold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export function Classrooms({ data, onAdd }: { data: PersistedData; onAdd: (name: string, grade: string, subject: string) => void }) {
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');

  const filtered = useMemo(() => 
    data.classrooms.filter(c => `${c.name} ${c.grade} ${c.subject}`.toLowerCase().includes(query.toLowerCase())), 
  [data.classrooms, query]);

  const addClassroom = () => { 
    if (!name.trim() || !grade.trim() || !subject.trim()) return; 
    onAdd(name.trim(), grade.trim(), subject.trim()); 
    setName(''); setGrade(''); setSubject(''); 
    setShowAdd(false); 
  };

  useBackButton(() => {
    setShowAdd(false);
    return true;
  }, showAdd);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>
        <Link href="/" className="grid h-8 w-8 place-items-center border-2 border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" title="Exit to dashboard" aria-label="Exit to dashboard">
          <X size={15} />
        </Link>
      </div>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Classrooms</h1>
          <p className="mt-2 text-sm text-muted-foreground">{data.classrooms.length} classes saved in your gradebook</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex w-fit items-center gap-2 border-2 border-[#09090B] bg-[#10B981] px-4 py-3 text-sm font-bold text-white paper-shadow" data-testid="button-add-classroom">
          <Plus size={17} /> Add classroom
        </button>
      </div>

      <div className="flex flex-col gap-3 border-2 border-border bg-card p-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-muted-foreground" size={17} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, grade, or subject..." className="h-10 w-full border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-[#E52237]" data-testid="input-search-classrooms" />
        </div>
        <button className="flex h-10 items-center justify-center gap-2 border border-border px-4 text-xs font-bold hover:bg-muted" data-testid="button-filter-classrooms">
          <Filter size={14} /> Filter <span className="font-mono-score text-muted-foreground">{filtered.length}</span>
        </button>
      </div>

      {filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(classroom => (
            <Link key={classroom.id} href={`/classrooms/${classroom.id}`} className="lift-on-hover flex flex-col justify-between gap-4 border-2 border-border bg-card p-5 paper-shadow" data-testid={`card-classroom-${classroom.id}`}>
              <div>
                <p className="font-display text-xl font-bold">{classroom.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{classroom.grade}, {classroom.subject}</p>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Users size={14} /> 
                  <span>{data.students.filter(s => s.classroomId === classroom.id).length} students</span>
                </div>
                <ChevronRight size={16} className="text-muted-foreground group-hover:text-[#E52237] transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="No classrooms found" text={data.classrooms.length ? 'Try a different search term.' : 'Add your first classroom to start organizing your students.'} />
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md border-4 border-[#09090B] dark:border-border bg-[#fef5f6] dark:bg-[#18181c] p-8 shadow-[8px_8px_0_#E52237] dark:shadow-[8px_8px_0_#000]">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="font-display text-3xl font-bold text-[#09090B] dark:text-foreground">Create a class</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="grid h-8 w-8 place-items-center border-2 border-[#09090B] dark:border-border bg-white dark:bg-secondary text-[#09090B] dark:text-foreground hover:bg-muted transition-transform hover:scale-105"
                aria-label="Close"
              >
                <X size={18} strokeWidth={3} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#E52237] dark:text-[#ff6b7e]">Class</label>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Year 8"
                  className="mt-1 h-12 w-full border-2 border-[#09090B] dark:border-border bg-white dark:bg-secondary/40 text-foreground px-3 font-medium outline-none focus:border-[#E52237]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#E52237] dark:text-[#ff6b7e]">Section</label>
                <input
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="e.g. A, B, C"
                  className="mt-1 h-12 w-full border-2 border-[#09090B] dark:border-border bg-white dark:bg-secondary/40 text-foreground px-3 font-medium outline-none focus:border-[#E52237]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#E52237] dark:text-[#ff6b7e]">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Science"
                  className="mt-1 h-12 w-full border-2 border-[#09090B] dark:border-border bg-white dark:bg-secondary/40 text-foreground px-3 font-medium outline-none focus:border-[#E52237]"
                />
              </div>
            </div>
            <button
              onClick={addClassroom}
              disabled={!name.trim() || !grade.trim() || !subject.trim()}
              className="mt-6 flex w-full items-center justify-center border-2 border-[#09090B] dark:border-border bg-[#E52237] py-3 text-sm font-bold text-white shadow-[3px_3px_0_#09090B] dark:shadow-[3px_3px_0_#000] transition-all hover:translate-x-[1px] hover:translate-y-[1px] disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:border-border disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
            >
              Create Class
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ClassroomProfile({ data, onUpdateRubric }: { data: PersistedData; onUpdateRubric: (id: string, rubric: string) => void }) {
  const { id } = useParams<{ id: string }>();
  const classroom = data.classrooms.find(c => c.id === id);
  const [rubricDraft, setRubricDraft] = useState(classroom?.rubric || '');
  const [isSaved, setIsSaved] = useState(false);

  if (!classroom) return <EmptyState title="Classroom not found" text="This class does not exist in your gradebook." />;
  
  const classStudents = data.students.filter(s => s.classroomId === id);

  const saveRubric = () => {
    onUpdateRubric(id!, rubricDraft);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Link href="/classrooms" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <ArrowLeft size={14} /> Back to classrooms
        </Link>
        <Link href="/classrooms" className="grid h-8 w-8 place-items-center border-2 border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" title="Exit to classrooms" aria-label="Exit to classrooms">
          <X size={15} />
        </Link>
      </div>
      
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-4xl font-bold">{classroom.name}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{classroom.grade}, {classroom.subject}, {classStudents.length} students enrolled</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <section className="border-2 border-border bg-card paper-shadow">
          <div className="border-b-2 border-border px-5 py-4">
            <h2 className="font-display text-xl font-bold">Marking rubric</h2>
            <p className="mt-1 text-xs text-muted-foreground">The AI will use these rules when grading papers for this class.</p>
          </div>
          <div className="p-5 space-y-4">
            <textarea 
              value={rubricDraft} 
              onChange={(e) => setRubricDraft(e.target.value)} 
              placeholder="e.g. Always deduct 1 mark for missing units. Ignore spelling mistakes. Award partial credit if formula is correct but calculation is wrong."
              className="h-48 w-full resize-none border-2 border-border bg-background p-3 text-sm outline-none focus:border-[#E52237]"
            />
            <button 
              onClick={saveRubric} 
              className="inline-flex w-full items-center justify-center gap-2 border-2 border-[#09090B] bg-[#09090B] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-muted-foreground"
            >
              {isSaved ? <><Check size={16} className="text-[#10B981]" /> Saved</> : 'Save Rubric'}
            </button>
          </div>
        </section>

        <section className="border-2 border-border bg-card paper-shadow">
          <div className="border-b-2 border-border px-5 py-4 flex justify-between items-end">
            <div>
              <h2 className="font-display text-xl font-bold">Students</h2>
            </div>
            <Link href="/students" className="text-xs font-bold text-[#E52237] hover:underline">Manage students</Link>
          </div>
          {classStudents.length ? (
            <div className="divide-y divide-border">
              {classStudents.map(student => (
                <div key={student.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/50">
                  <span className="font-semibold text-sm">{student.name}</span>
                  <Link href={`/students/${student.id}`} className="text-xs font-mono-score text-muted-foreground hover:text-foreground">View Profile</Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">No students in this class yet. Go to Students to add them.</div>
          )}
        </section>
      </div>
    </div>
  );
}
