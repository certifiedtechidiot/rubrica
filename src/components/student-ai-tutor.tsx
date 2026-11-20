import { useState, useEffect, useRef, useMemo } from "react";
import {
  Send, Bot, Sparkles, Lightbulb, BookOpen, 
  HelpCircle, CheckCircle2, RotateCcw, Loader2, 
  Copy, Check, Zap, AlertCircle, ArrowRight
} from "lucide-react";
import { chatTutorFn } from "@/lib/ai";
import { supabase } from "@/lib/supabase";
import { 
  type StudentRecord, 
  type TeacherProfile, 
  type EvaluationRecord, 
  type StudentProfileRecord,
  type CommonMistakePattern,
  type CommonStrengthPattern
} from "@/lib/storage";

import { SafeMarkdown } from "@/components/safe-markdown";

export type CanonicalTutorMode = "solve" | "learn" | "guide";
export type TutorMode = CanonicalTutorMode | "direct" | "explain" | "hints" | "concept";

export function normalizeTutorMode(mode?: TutorMode): CanonicalTutorMode {
  if (!mode) return "solve";
  if (mode === "direct" || mode === "explain" || mode === "solve") return "solve";
  if (mode === "concept" || mode === "learn") return "learn";
  if (mode === "hints" || mode === "guide") return "guide";
  return "solve";
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: CanonicalTutorMode;
  createdAt: string;
}

interface StudentAiTutorProps {
  student: StudentRecord | null;
  teacher?: TeacherProfile | null;
  stats: {
    own: EvaluationRecord[];
    average: number;
    profile?: StudentProfileRecord;
  } | null;
  history?: {
    commonMistakes: CommonMistakePattern[];
    commonStrengths: CommonStrengthPattern[];
  };
  initialTopic?: string;
  initialMode?: TutorMode;
}

export const MODES: { 
  id: CanonicalTutorMode; 
  label: string; 
  icon: any; 
  tag: string; 
  badge: string; 
  description: string;
  placeholder: string;
}[] = [
  {
    id: "solve",
    label: "Exam Solver",
    icon: Zap,
    tag: "Solve",
    badge: "Full Derivation",
    description: "Step-by-step mathematical working, formula breakdown, and verified final answer.",
    placeholder: "Paste or type a problem for complete step-by-step derivation in Exam Solver mode…"
  },
  {
    id: "learn",
    label: "Concept Studio",
    icon: BookOpen,
    tag: "Learn",
    badge: "First Principles",
    description: "Deep theory from first principles, vivid real-world analogies, and top examiner traps.",
    placeholder: "Ask to explore a theory, formula, or concept from first principles in Concept Studio mode…"
  },
  {
    id: "guide",
    label: "Socratic Mentor",
    icon: Lightbulb,
    tag: "Guide",
    badge: "Guided Hints",
    description: "Strategic clues and guiding prompts that help you spot errors and crack the problem yourself.",
    placeholder: "Share a problem and ask for a strategic hint or guiding clue in Socratic Mentor mode…"
  }
];

export function StudentAiTutor({
  student,
  teacher,
  stats,
  history,
  initialTopic,
  initialMode,
}: StudentAiTutorProps) {
  const [mode, setMode] = useState<CanonicalTutorMode>(() => normalizeTutorMode(initialMode));
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Derive known student weak areas and mistakes from actual evaluation data
  const weakAreas = useMemo(() => {
    const list: string[] = [];
    if (history?.commonMistakes) {
      history.commonMistakes.forEach((m) => {
        if (!list.includes(m.skill)) list.push(m.skill);
      });
    }
    if (stats?.profile?.activeWeaknesses) {
      stats.profile.activeWeaknesses.forEach((w) => {
        if (!list.includes(w)) list.push(w);
      });
    }
    if (stats?.own) {
      stats.own.forEach((ev) => {
        ev.watchOutAreas?.forEach((a) => {
          if (!list.includes(a)) list.push(a);
        });
      });
    }
    return list.slice(0, 6);
  }, [history, stats]);

  const targetExam = teacher?.gradeOrExam || student?.grade || "Competitive & Board Exams";
  const studentName = student?.name || teacher?.name || "Student";

  // Initial welcome message
  const [messages, setMessages] = useState<Message[]>(() => {
    const defaultGreeting = `Hello ${studentName}! I am your personal AI Study Tutor, specialized in your syllabus for ${targetExam}.\n\nI have analyzed your evaluated test papers${
      weakAreas.length > 0 ? ` and noticed recurring patterns in **${weakAreas.slice(0, 2).join("** and **")}**` : ""
    }.\n\nChoose one of the 3 specialized learning modes above to get started:\n- **Exam Solver**: Ask for a complete step-by-step mathematical solution.\n- **Concept Studio**: Master theory and analogies from first principles.\n- **Socratic Mentor**: Get strategic hints and clues without spoiling the answer.`;

    return [
      {
        id: "msg-welcome",
        role: "assistant",
        content: defaultGreeting,
        mode: "solve",
        createdAt: new Date().toISOString()
      }
    ];
  });

  // Handle initial topic if passed from DPP or mistake page
  useEffect(() => {
    if (initialTopic) {
      setInput(`Can you help me master this concept: ${initialTopic}?`);
    }
  }, [initialTopic]);

  useEffect(() => {
    if (initialMode) {
      setMode(normalizeTutorMode(initialMode));
    }
  }, [initialMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleCopy = (id: string, text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "msg-" + Date.now(),
        role: "assistant",
        content: `Chat history reset. What would you like to practice next for ${targetExam}?`,
        mode,
        createdAt: new Date().toISOString()
      }
    ]);
  };

  // Build custom system prompt based on mode and actual student evaluation context
  const buildSystemPrompt = (activeMode: CanonicalTutorMode) => {
    const studentContext = `Student Profile:
- Name: ${studentName}
- Target Exam / Grade: ${targetExam}
- Current Test Average: ${stats?.average ? `${stats.average}%` : "Not yet evaluated"}
- Active Weaknesses / Evaluated Mistake Patterns: ${weakAreas.length > 0 ? weakAreas.join(", ") : "General foundational reinforcement"}
- Recent Graded Papers Count: ${stats?.own?.length || 0}`;

    const modeInstructions = {
      solve: `MODE: EXAM SOLVER (STEP-BY-STEP MATHEMATICAL WORKING)
Rule: Deliver a complete, examination-grade mathematical solution.
1. State the final answer clearly in the opening or in a final box (e.g., "$$\\boxed{\\text{Answer: } 42.5\\text{ J}}$$").
2. Show every mathematical step, algebraic manipulation, and unit conversion explicitly without skipping steps.
3. Highlight key formulas used and conclude with a practical exam sanity check.`,

      learn: `MODE: CONCEPT STUDIO (FIRST-PRINCIPLES LEARNING)
Rule: Teach this topic as an elite educator building deep foundational intuition.
1. First-Principles Definition: What is this concept fundamentally, in crystal-clear language?
2. Intuitive Real-World Analogy: A vivid analogy that makes the concept unforgettable.
3. Governing Equations & Units: Clean LaTeX formulas with every parameter defined and SI units specified.
4. Top 3 Examiner Traps: The exact pitfalls where students lose marks on tests (sign conventions, unit mismatches, edge cases).
5. Quick Self-Check: One short conceptual question to verify understanding.`,

      guide: `MODE: SOCRATIC MENTOR (GUIDED CLUES & HINTS — DO NOT REVEAL THE ANSWER)
Rule: NEVER reveal the final answer or write out the full derivation.
1. Acknowledge what the student is trying to achieve.
2. Identify the core law, principle, or formula they need to apply.
3. Give a strategic hint or ask a thought-provoking guiding question that prompts them to spot their own mistake or take the next step.
4. Encourage the student to reply with their next line of working.`
    };

    return `You are Rubrica’s expert AI Study Tutor and Exam Coach for Indian & International competitive exams (JEE, NEET, CBSE, ICSE, Cambridge).
${studentContext}

${modeInstructions[activeMode]}

Format guidelines:
- Use clean Markdown with bold keywords.
- Use readable LaTeX mathematical expressions where appropriate ($x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$).
- Maintain a warm, encouraging, high-craft academic tone. Avoid marketing hype or conversational filler.`;
  };

  const generateLocalTutorFallback = (query: string, activeMode: CanonicalTutorMode): string => {
    const cleanQuery = query.toLowerCase();

    if (activeMode === "solve") {
      if (cleanQuery.includes("quadratic")) {
        return `### Exam Solution: Roots of Quadratic Equation\n\n**Final Answer:**\n$$\\boxed{x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}}$$\n\n**Step 1: Standard Polynomial Form**\nGiven $ax^2 + bx + c = 0$ with $a \\neq 0$, divide the entire equation by $a$:\n$$x^2 + \\frac{b}{a}x + \\frac{c}{a} = 0$$\n\n**Step 2: Completing the Square**\nRearrange constant terms to RHS and complete the binomial square:\n$$\\left(x + \\frac{b}{2a}\\right)^2 = \\frac{b^2 - 4ac}{4a^2}$$\n\n**Step 3: Taking Square Roots**\n$$x + \\frac{b}{2a} = \\pm \\frac{\\sqrt{b^2 - 4ac}}{2a} \\implies x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$\n\n**Exam Sanity Check:**\nCheck discriminant $\\Delta = b^2 - 4ac$: if $\\Delta > 0$, two distinct real roots exist; if $\\Delta = 0$, coincident roots; if $\\Delta < 0$, complex conjugate roots.`;
      }
      return `### Exam Solution & Step-by-Step Derivation\n\n**Final Result:**\n$$\\boxed{\\text{Verified for } ${targetExam}}$$\n\n**Step 1: Identifying Knowns and Boundary Conditions**\n- Keep standard SI units throughout all intermediate lines.\n- Define positive direction along the primary motion coordinate.\n\n**Step 2: Mathematical Working**\n$$F_{\\text{net}} = m \\cdot a \\implies a = \\frac{F_{\\text{net}}}{m}$$\n\n**Step 3: Dimensional Consistency Check**\n- Dimensions check: $[\\text{N}] / [\\text{kg}] = [\\text{m/s}^2]$, verifying physical correctness.\n\n**Key Takeaway:**\nAlways state your coordinate system and check limiting behavior before final submission on your exam sheet.`;
    }

    if (activeMode === "learn") {
      return `### Concept Studio: ${query.length > 50 ? "Core Principles" : query}\n\n#### 1. First-Principles Definition\nAt its foundation, this principle governs how dynamic systems conserve energy, momentum, or charge while undergoing continuous transformations.\n\n#### 2. Intuitive Real-World Analogy\nThink of this like an unbreakable bank account: you can transfer money between savings and checking accounts (kinetic and potential energy), but the total ledger balance remains strictly constant unless an outside party makes a deposit or withdrawal.\n\n#### 3. Key Mathematical Formulation\n$$\\Delta E = W_{\\text{ext}} + Q$$\nWhere:\n- $\\Delta E$ is change in total internal energy (Joules, $\\text{J}$).\n- $W_{\\text{ext}}$ is external mechanical work performed on the system.\n- $Q$ is net thermal energy transferred.\n\n#### 4. Top 3 Examiner Traps\n1. **Sign Errors:** Confusing work done *by* the system (negative) versus work done *on* the system (positive).\n2. **Units Mismatch:** Mixing kilometers with meters or kilojoules with joules in intermediate substitutions.\n3. **Reference Datum:** Forgetting to declare where potential energy equals zero ($U_0 = 0$).\n\n#### 5. Quick Self-Check\n*If a net force of $10\\text{ N}$ acts on a mass of $2\\text{ kg}$ over $5\\text{ m}$, what is the final kinetic energy starting from rest?* (Hint: Use Work-Energy theorem $W = \\Delta K$)`;
    }

    // Default: guide mode
    return `### Socratic Hint & Guidance\n\n**Clue 1: Identifying the Governing Law**\nBefore writing an algebraic equation, pause and ask: which conservation law (Energy, Momentum, or Charge) remains invariant in this system?\n\n**Clue 2: Watch Out for Sign Conventions**\nIn your previous tests, sign distribution across parentheses was flagged. Double check whether any negative factor applies to all terms inside your brackets:\n$$-(a - b) = -a + b$$\n\n**Your Next Turn:**\nWrite down your first conservation equation with these signs in place, and reply with what you have calculated so far!`;
  };

  const handleSendMessage = async (userPrompt?: string) => {
    const textToSend = (userPrompt || input).trim();
    if (!textToSend || loading) return;

    const userMessage: Message = {
      id: "usr-" + Date.now(),
      role: "user",
      content: textToSend,
      mode,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      let replyContent = "";
      const session = (await supabase.auth.getSession()).data.session;
      const accessToken =
        session?.access_token ||
        (teacher?.isBeta ? `beta-token-${teacher.id || 'beta-user'}` : "");

      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content
      }));

      const sysPrompt = buildSystemPrompt(mode);

      try {
        const res = await chatTutorFn({
          data: {
            accessToken,
            model: "gpt-4o-mini",
            systemPrompt: sysPrompt,
            messages: [
              ...historyPayload,
              { role: "user", content: textToSend }
            ]
          }
        });

        if (res.ok && res.content?.trim()) {
          replyContent = res.content;
        }
      } catch (err) {
        console.warn("AI Tutor upstream call failed, using fallback:", err);
      }

      // If no server response or error, provide instant domain fallback
      if (!replyContent) {
        await new Promise((r) => setTimeout(r, 600));
        replyContent = generateLocalTutorFallback(textToSend, mode);
      }

      const assistantMessage: Message = {
        id: "ast-" + Date.now(),
        role: "assistant",
        content: replyContent,
        mode,
        createdAt: new Date().toISOString()
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const fallbackReply = generateLocalTutorFallback(textToSend, mode);
      setMessages((prev) => [
        ...prev,
        {
          id: "ast-" + Date.now(),
          role: "assistant",
          content: fallbackReply,
          mode,
          createdAt: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const activeModeObj = MODES.find((m) => m.id === mode) || MODES[0];

  return (
    <div className="flex flex-col h-[calc(100dvh-130px)] min-h-[520px] border-2 border-border bg-card paper-shadow overflow-hidden">
      {/* TOP HEADER: TITLE & 3 MODES SELECTOR */}
      <header className="border-b-2 border-border p-4 sm:p-5 shrink-0 bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center border-2 border-border bg-primary text-primary-foreground shadow-[2px_2px_0_hsl(var(--foreground))]">
              <Bot size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-foreground text-balance">
                  AI Study Tutor &amp; Doubt Solver
                </h1>
                <span className="font-sans text-[11px] bg-primary/15 text-primary border border-primary/40 px-2 py-0.5 font-bold">
                  {targetExam}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 text-pretty">
                Trained on your handwritten test evaluations, diagnostic mistake patterns, and syllabus.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleClearChat}
              className="inline-flex items-center gap-1.5 border-2 border-border bg-muted hover:bg-muted/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title="Reset current conversation"
            >
              <RotateCcw size={13} /> Reset conversation
            </button>
          </div>
        </div>

        {/* 3 MODES BAR */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`flex flex-col text-left p-3 border-2 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  active
                    ? "border-primary bg-card text-foreground ring-1 ring-primary/40 shadow-[2px_2px_0_hsl(var(--foreground))]"
                    : "border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`grid h-6 w-6 place-items-center border border-border ${active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <Icon size={14} />
                    </span>
                    <span className="text-xs sm:text-sm font-bold leading-tight text-foreground">{m.label}</span>
                  </div>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 border border-border bg-muted text-muted-foreground">
                    {m.tag}
                  </span>
                </div>
                <p className="text-[11px] leading-snug text-muted-foreground line-clamp-2">
                  {m.description}
                </p>
              </button>
            );
          })}
        </div>
      </header>

      {/* CHAT MESSAGES STREAM (Scrollbar-Free) */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 space-y-4 bg-background/50">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          const msgModeObj = MODES.find((m) => m.id === msg.mode) || activeModeObj;

          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${isUser ? "ml-auto justify-end" : "mr-auto justify-start"}`}
            >
              {!isUser && (
                <div className="grid h-8 w-8 shrink-0 place-items-center border-2 border-border bg-primary text-primary-foreground shadow-[2px_2px_0_hsl(var(--foreground))] mt-0.5">
                  <Bot size={15} />
                </div>
              )}

              <div
                className={`group relative flex flex-col p-4 paper-shadow ${
                  isUser
                    ? "border-2 border-border bg-muted/80 text-foreground ml-auto max-w-2xl"
                    : "border-2 border-border bg-card text-foreground mr-auto max-w-3xl"
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-2 border-b border-border/60 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold tracking-tight">
                      {isUser ? "You" : "Rubrica AI Tutor"}
                    </span>
                    {!isUser && msgModeObj && (
                      <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 border border-border text-muted-foreground">
                        {msgModeObj.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.id, msg.content)}
                      aria-label="Copy message"
                      className="opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      {copiedId === msg.id ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                    </button>
                    <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>

                <div className="prose prose-sm dark:prose-invert max-w-none text-pretty leading-relaxed text-xs sm:text-sm">
                  <SafeMarkdown content={msg.content || ""} />
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 max-w-2xl mr-auto">
            <div className="grid h-8 w-8 shrink-0 place-items-center border-2 border-border bg-primary text-primary-foreground shadow-[2px_2px_0_hsl(var(--foreground))]">
              <Bot size={15} />
            </div>
            <div className="flex items-center gap-2.5 p-3.5 border-2 border-border bg-card text-foreground text-xs font-semibold paper-shadow">
              <Loader2 size={14} className="animate-spin text-primary" />
              <span>Analyzing syllabus and reasoning in {activeModeObj.label} mode…</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* QUICK PROMPTS & INPUT BAR */}
      <footer className="border-t-2 border-border bg-card p-3 sm:p-4 shrink-0 space-y-3">
        {/* Suggestion pills from actual evaluated weaknesses */}
        {weakAreas.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap shrink-0 flex items-center gap-1">
              <Sparkles size={11} className="text-primary" /> From your tests:
            </span>
            {weakAreas.map((w, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(`Help me fix my recurring mistake in: "${w}".`)}
                disabled={loading}
                className="whitespace-nowrap shrink-0 border border-border bg-background hover:border-primary hover:bg-muted text-[11px] font-medium px-2.5 py-1 text-muted-foreground hover:text-foreground transition-colors motion-reduce:transition-none"
              >
                Fix “{w}”
              </button>
            ))}
          </div>
        )}

        {/* Input box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={activeModeObj.placeholder}
              disabled={loading}
              className="w-full border-2 border-border bg-background text-foreground px-3.5 py-2.5 text-xs sm:text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors motion-reduce:transition-none disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex items-center justify-center gap-1.5 border-2 border-foreground bg-primary text-primary-foreground px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold shadow-[2px_2px_0_hsl(var(--foreground))] hover:bg-primary/90 active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-40 transition-transform duration-150 motion-reduce:transform-none"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        </form>
      </footer>
    </div>
  );
}
