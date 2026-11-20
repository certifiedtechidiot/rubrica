import { useState, useEffect } from "react";
import { X, Building2, BookOpen, GraduationCap, Loader2, Check, School } from "lucide-react";
import { getInstitutions, completeOnboarding } from "@/lib/api";

export const TARGET_EXAMS = [
  "Class 10th Board (CBSE / ICSE / State)",
  "Class 12th Board (CBSE / ISC / State)",
  "JEE Main & Advanced (Engineering)",
  "NEET-UG (Medical)",
  "College / University Degree",
  "Other Competitive Exam",
];

type OnboardingProps = {
  userId: string;
  email: string;
  name: string;
  role?: "teacher" | "student";
  onComplete: () => void;
  onBack?: () => void;
};

export function Onboarding({ userId, email, name, role = "student", onComplete, onBack }: OnboardingProps) {
  // Default to student or stored intended role
  const [activeRole, setActiveRole] = useState<"student" | "teacher">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("rubrica_intended_role");
      if (saved === "student") return "student";
      if (saved === "teacher") return "teacher";
    }
    return role || "student";
  });
  
  // Student state
  const [selectedExam, setSelectedExam] = useState(TARGET_EXAMS[1]); // Default Class 12th Board

  // Institution state
  const [customName, setCustomName] = useState("");
  const [isIndependent, setIsIndependent] = useState(false);
  const [institutionsList, setInstitutionsList] = useState<{ id: string; name: string }[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getInstitutions()
      .then((data) => {
        const filtered = (data || []).filter(
          (i) => !['test list', 'india', 'rehan'].includes(i.name.trim().toLowerCase())
        );
        setInstitutionsList(filtered);
      })
      .catch((err) => {
        console.warn("Could not fetch institutions:", err);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (activeRole === "student") {
        await completeOnboarding({
          data: {
            userId,
            email,
            name: name || "Student",
            role: "student",
            gradeOrExam: selectedExam,
            institutionId: selectedExam,
          },
        });
      } else {
        const instTitle = isIndependent
          ? "Independent Educator"
          : customName.trim() || "Independent Educator";

        await completeOnboarding({
          data: {
            userId,
            email,
            name: name || "Teacher",
            role: "teacher",
            institutionId: instTitle,
          },
        });
      }
      onComplete();
    } catch (err: any) {
      console.warn("Profile setup error, falling back locally:", err);
      onComplete();
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    setError("");
    try {
      await completeOnboarding({
        data: { 
          userId, 
          email, 
          name: name || (activeRole === "student" ? "Student" : "Teacher"), 
          role: activeRole,
          institutionId: activeRole === "student" ? selectedExam : "Independent Educator",
          gradeOrExam: activeRole === "student" ? selectedExam : undefined
        },
      });
    } catch (err: any) {
      console.warn("Skipping onboarding with local fallback:", err);
    } finally {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("rubrica_intended_role", activeRole);
      }
      setLoading(false);
      onComplete();
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-[#fbfaf7] dark:bg-[#121214] text-foreground p-4 sm:p-6">
      <div className="w-full max-w-lg border-4 border-[#09090B] dark:border-[#3f3f46] bg-white dark:bg-[#18181c] p-6 sm:p-8 shadow-[8px_8px_0_#E52237] dark:shadow-[8px_8px_0_#000] relative">
        {/* Go back / Cancel button top-right */}
        <button
          onClick={onBack ? onBack : handleSkip}
          disabled={loading}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center border-2 border-[#09090B] dark:border-[#52525b] bg-[#f2eee6] dark:bg-[#27272a] text-[#09090B] dark:text-white transition-transform hover:scale-105 active:scale-95"
          aria-label="Go back"
          title="Go back"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        {/* Brand header */}
        <div className="flex items-center gap-2 mb-3">
          <img src="/favicon.svg" alt="Rubrica" className="h-7 w-7 object-contain" />
          <span className="font-display text-xl font-black text-[#09090B] dark:text-white">
            rubri<span className="text-[#E52237]">ca</span>
          </span>
          <span className="ml-1 text-[11px] font-bold bg-[#E52237]/15 text-[#E52237] px-2 py-0.5 border border-[#E52237]/30">
            Profile setup
          </span>
        </div>

        <h2 className="font-display text-2xl sm:text-3xl font-black text-[#09090B] dark:text-white mb-1.5 pr-6">
          What describes you best?
        </h2>
        <p className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-300 mb-5 leading-relaxed">
          Welcome, <strong className="text-[#09090B] dark:text-white">{name || "there"}</strong>! Tell us how you plan to use Rubrica so we can tune your workspace.
        </p>

        {error && (
          <div className="mb-4 border-2 border-[#E52237] bg-[#fde8eb] dark:bg-[#E52237]/20 p-3 text-xs font-bold text-[#b81528] dark:text-[#ff8a9a]">
            {error}
          </div>
        )}

        {/* 1. What describes you best selector */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            type="button"
            onClick={() => {
              setActiveRole("student");
              try { localStorage.setItem("rubrica_intended_role", "student"); } catch {}
            }}
            className={`p-3.5 text-left border-2 transition-all relative ${
              activeRole === "student"
                ? "border-[#E52237] bg-[#E52237]/5 dark:bg-[#E52237]/10 shadow-[3px_3px_0_#E52237]"
                : "border-[#09090B] dark:border-[#52525b] bg-[#fbfaf7] dark:bg-[#27272a] hover:border-[#E52237]"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <GraduationCap size={18} className="text-[#E52237]" />
                <span className="font-bold text-sm text-[#09090B] dark:text-white">Student</span>
              </div>
              {activeRole === "student" && (
                <div className="w-5 h-5 rounded-full bg-[#E52237] text-white flex items-center justify-center">
                  <Check size={12} strokeWidth={3} />
                </div>
              )}
            </div>
            <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 leading-snug">
              Preparing for Boards, entrance exams, or college degrees.
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveRole("teacher");
              try { localStorage.setItem("rubrica_intended_role", "teacher"); } catch {}
            }}
            className={`p-3.5 text-left border-2 transition-all relative ${
              activeRole === "teacher"
                ? "border-[#E52237] bg-[#E52237]/5 dark:bg-[#E52237]/10 shadow-[3px_3px_0_#E52237]"
                : "border-[#09090B] dark:border-[#52525b] bg-[#fbfaf7] dark:bg-[#27272a] hover:border-[#E52237]"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <School size={18} className="text-[#E52237]" />
                <span className="font-bold text-sm text-[#09090B] dark:text-white">Educator</span>
              </div>
              {activeRole === "teacher" && (
                <div className="w-5 h-5 rounded-full bg-[#E52237] text-white flex items-center justify-center">
                  <Check size={12} strokeWidth={3} />
                </div>
              )}
            </div>
            <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300 leading-snug">
              Grading exam papers and managing classrooms.
            </p>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 2. Specific question tailored strictly to chosen role */}
          {activeRole === "student" ? (
            <div>
              <div className="mb-1.5">
                <label className="block text-xs font-bold text-foreground">
                  Which exam or board are you preparing for?
                </label>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Rubrica optimizes marking rubrics and practice problem sets to your exact syllabus.
                </p>
              </div>

              <div className="relative mt-2">
                <BookOpen
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                  size={18}
                />
                <select
                  value={selectedExam}
                  onChange={(e) => setSelectedExam(e.target.value)}
                  className="h-12 w-full appearance-none border-2 border-[#09090B] dark:border-[#52525b] bg-[#FAFAFA] dark:bg-[#27272a] text-[#09090B] dark:text-white pl-10 pr-10 text-sm font-bold outline-none focus:border-[#E52237]"
                >
                  {TARGET_EXAMS.map((exam) => (
                    <option key={exam} value={exam} className="dark:bg-[#18181c] text-foreground">
                      {exam}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  School, college, or coaching institute (optional)
                </label>
                <div className="relative">
                  <Building2
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                    size={18}
                  />
                  <input
                    type="text"
                    value={customName}
                    disabled={isIndependent}
                    onChange={(e) => {
                      setCustomName(e.target.value);
                      if (isIndependent) setIsIndependent(false);
                    }}
                    placeholder={isIndependent ? "Independent educator" : "e.g. Navy Children School, Delhi Public School, Allen"}
                    className={`h-12 w-full border-2 border-[#09090B] dark:border-[#52525b] ${
                      isIndependent ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400' : 'bg-[#FAFAFA] dark:bg-[#27272a] text-[#09090B] dark:text-white'
                    } pl-10 pr-4 text-sm font-bold outline-none focus:border-[#E52237] placeholder:text-zinc-400 dark:placeholder:text-zinc-500`}
                  />
                </div>

                {/* Common quick picks */}
                {institutionsList.length > 0 && !isIndependent && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium text-zinc-500">Suggestions:</span>
                    {institutionsList.slice(0, 4).map((inst) => (
                      <button
                        key={inst.id}
                        type="button"
                        onClick={() => setCustomName(inst.name)}
                        className="text-[11px] font-bold border border-[#09090B]/30 dark:border-border px-2 py-0.5 bg-white dark:bg-card hover:border-[#E52237] hover:text-[#E52237] transition-colors"
                      >
                        {inst.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Independent educator 1-click toggle card */}
              <div
                onClick={() => {
                  const next = !isIndependent;
                  setIsIndependent(next);
                  if (next) setCustomName("");
                }}
                className={`p-3.5 border-2 cursor-pointer transition-all flex items-center justify-between ${
                  isIndependent
                    ? 'border-[#E52237] bg-[#fef5f6] dark:bg-[#E52237]/15 shadow-[3px_3px_0_#E52237]'
                    : 'border-[#09090B] dark:border-[#52525b] bg-[#FAFAFA] dark:bg-[#27272a] hover:border-[#E52237]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <GraduationCap size={20} className={isIndependent ? "text-[#E52237]" : "text-zinc-400"} />
                  <div>
                    <p className="text-xs font-bold text-foreground">I teach independently / Private tutor</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Grading for your own students without an institution</p>
                  </div>
                </div>
                <div className={`h-5 w-5 grid place-items-center border-2 ${isIndependent ? 'border-[#E52237] bg-[#E52237] text-white' : 'border-[#09090B] dark:border-[#52525b]'}`}>
                  {isIndependent && <Check size={14} strokeWidth={3} />}
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 border-2 border-[#09090B] dark:border-[#3f3f46] bg-[#E52237] py-3.5 text-sm font-extrabold text-white shadow-[4px_4px_0_#09090B] dark:shadow-[4px_4px_0_#000] hover:bg-[#cc182b] active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 transition-all mt-4"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Saving...
              </>
            ) : activeRole === "student" ? (
              "Continue to student desk"
            ) : (
              "Continue to educator desk"
            )}
          </button>

          {/* Skip option */}
          <button
            type="button"
            onClick={handleSkip}
            disabled={loading}
            className="w-full text-center py-1 text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-[#09090B] dark:hover:text-white underline transition-colors"
          >
            {activeRole === "student" ? "Choose later / Skip for now" : "I teach independently / Skip for now"}
          </button>
        </form>
      </div>
    </div>
  );
}
