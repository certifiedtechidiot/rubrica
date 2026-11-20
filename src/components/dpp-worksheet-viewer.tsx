import { useState, useMemo } from "react";
import {
  CheckCircle2, Circle, Lightbulb, HelpCircle, 
  Bot, Sparkles, ChevronDown, ChevronUp, 
  Target, PenTool, Check, Copy
} from "lucide-react";
import { MathText } from "@/components/math-text";
import { type TutorMode } from "@/components/student-ai-tutor";

export interface DPPRecord {
  id: string;
  createdAt: string;
  content: string;
  basedOnMistakes?: string[];
}

export interface DppProblem {
  id: string;
  number: number;
  tag?: string;
  statement: string;
  hint?: string;
  solution?: string;
}

interface DppWorksheetViewerProps {
  dpp: DPPRecord;
  studentName?: string;
  subject?: string;
  onDiscussInTutor?: (topic: string, mode?: TutorMode) => void;
}

function parseDppContent(content: string) {
  const lines = (content || "").replace(/\r\n/g, "\n").split("\n");
  let title = "Targeted practice worksheet";
  const guidanceLines: string[] = [];
  const problemEntries: {
    number: number;
    tag?: string;
    lines: string[];
    hint?: string;
    solution?: string;
  }[] = [];
  let currentEntry: {
    number: number;
    tag?: string;
    lines: string[];
    hint?: string;
    solution?: string;
  } | null = null;
  let inGuidance = false;

  const headerPattern = /^(?:(?:\d+[\.\)]\s*)?(?:\*\*|###?\s*))(?:Problem|Question)\s*(\d+)[:\s]*(?:\(([^)]+)\))?[:\s]*(?:\*\*)?/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (i === 0 && trimmed.startsWith("#")) {
      const cleanTitle = trimmed
        .replace(/^#+\s*/, "")
        .replace(/^Targeted Practice:\s*/i, "")
        .trim();
      if (cleanTitle) {
        title = cleanTitle;
      }
      continue;
    }

    if (
      /^(-{3,}|\*{3,})$/.test(trimmed) ||
      /^#+\s*(?:hints|guidance|solutions)/i.test(trimmed) ||
      /^\*\*(?:hints|guidance|solutions)/i.test(trimmed)
    ) {
      inGuidance = true;
      if (currentEntry) {
        problemEntries.push(currentEntry);
        currentEntry = null;
      }
      continue;
    }

    if (inGuidance) {
      if (trimmed) {
        guidanceLines.push(trimmed);
      }
      continue;
    }

    const match = headerPattern.exec(trimmed);
    if (match) {
      if (currentEntry) {
        problemEntries.push(currentEntry);
      }
      const num = parseInt(match[1], 10);
      const tag = (match[2] || "").trim();
      const headerRaw = match[0];
      const remainder = trimmed.slice(headerRaw.length).replace(/^[:\s*]+/, "").trim();
      currentEntry = {
        number: num,
        tag: tag || undefined,
        lines: remainder ? [remainder] : [],
      };
      continue;
    }

    if (currentEntry) {
      currentEntry.lines.push(line);
    }
  }

  if (currentEntry) {
    problemEntries.push(currentEntry);
  }

  // Map guidance items to specific problems
  const generalGuidance: string[] = [];
  for (const gline of guidanceLines) {
    const probMatch = /(?:Problem|Q)\s*(\d+)/i.exec(gline);
    let matchedProblem = false;

    if (probMatch) {
      const idx = parseInt(probMatch[1], 10);
      const target = problemEntries.find((p) => p.number === idx);
      if (target) {
        matchedProblem = true;
        if (/solution|answer/i.test(gline)) {
          target.solution = target.solution ? `${target.solution}\n${gline}` : gline;
        } else {
          target.hint = target.hint ? `${target.hint}\n${gline}` : gline;
        }
      }
    }

    if (!matchedProblem) {
      const startNumMatch = /^(\d+)[\.\)]\s*(.*)/.exec(gline);
      if (startNumMatch) {
        const idx = parseInt(startNumMatch[1], 10);
        const target = problemEntries.find((p) => p.number === idx);
        if (target) {
          matchedProblem = true;
          const text = startNumMatch[2].trim();
          if (/solution|answer/i.test(text)) {
            target.solution = target.solution ? `${target.solution}\n${text}` : text;
          } else {
            target.hint = target.hint ? `${target.hint}\n${text}` : text;
          }
        }
      }
    }

    if (!matchedProblem) {
      generalGuidance.push(gline);
    }
  }

  const problems: DppProblem[] = problemEntries.map((pe, idx) => ({
    id: `prob-${pe.number || idx + 1}`,
    number: pe.number || idx + 1,
    tag: pe.tag,
    statement: pe.lines.join("\n").trim(),
    hint: pe.hint,
    solution: pe.solution,
  }));

  return {
    title,
    problems,
    generalGuidance: generalGuidance.join("\n").trim(),
    rawFallback: problems.length === 0 ? content : undefined,
  };
}

export function DppWorksheetViewer({
  dpp,
  studentName = "Student",
  subject,
  onDiscussInTutor,
}: DppWorksheetViewerProps) {
  const parsed = useMemo(() => parseDppContent(dpp.content || ""), [dpp.content]);

  const solvedStorageKey = `rubrica_dpp_solved_${dpp.id}`;
  const notesStorageKey = `rubrica_dpp_notes_${dpp.id}`;

  const [solvedMap, setSolvedMap] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem(solvedStorageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [notesMap, setNotesMap] = useState<Record<number, string>>(() => {
    try {
      const saved = localStorage.getItem(notesStorageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [expandedHints, setExpandedHints] = useState<Record<number, boolean>>({});
  const [expandedSolutions, setExpandedSolutions] = useState<Record<number, boolean>>({});
  const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleSolved = (num: number) => {
    setSolvedMap((prev) => {
      const next = { ...prev, [num]: !prev[num] };
      try {
        localStorage.setItem(solvedStorageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const updateNotes = (num: number, val: string) => {
    setNotesMap((prev) => {
      const next = { ...prev, [num]: val };
      try {
        localStorage.setItem(notesStorageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleCopy = (id: string, text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const totalProblems = parsed.problems.length;
  const solvedCount = parsed.problems.filter((p) => solvedMap[p.number]).length;
  const progressRatio = totalProblems > 0 ? solvedCount / totalProblems : 0;
  const progressPercent = Math.round(progressRatio * 100);

  const formattedDate = useMemo(() => {
    try {
      return new Date(dpp.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Recent";
    }
  }, [dpp.createdAt]);

  return (
    <div className="space-y-6">
      {/* ═══ WORKSHEET HEADER ═══ */}
      <div className="border-2 border-border bg-card p-5 paper-shadow">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-foreground">
                {subject || "Targeted revision"}
              </span>
              <span className="text-muted-foreground text-xs" aria-hidden="true">•</span>
              <span className="text-xs text-muted-foreground">
                Generated <span className="tabular-nums font-mono">{formattedDate}</span>
              </span>
            </div>
            <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground text-balance break-words">
              {parsed.title}
            </h3>
            <p className="text-xs text-muted-foreground text-pretty max-w-2xl">
              Targeted practice worksheet generated for {studentName} to remediate specific error patterns from test evaluations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onDiscussInTutor && (
              <button
                type="button"
                onClick={() => onDiscussInTutor(parsed.title, "solve")}
                className="inline-flex items-center gap-1.5 whitespace-nowrap border-2 border-foreground bg-primary text-primary-foreground px-3 py-1.5 text-xs font-bold shadow-[2px_2px_0_hsl(var(--foreground))] hover:bg-primary/90 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Bot size={13} />
                <span>Discuss in Exam Solver</span>
              </button>
            )}
          </div>
        </div>

        {/* TARGET WEAKNESSES CHIPS */}
        {dpp.basedOnMistakes && dpp.basedOnMistakes.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
              <Target size={12} className="text-primary" /> Target areas:
            </span>
            {dpp.basedOnMistakes.map((mistake, idx) => (
              <span
                key={idx}
                className="border border-border bg-muted/60 px-2 py-0.5 text-[11px] text-foreground font-medium"
              >
                {mistake}
              </span>
            ))}
          </div>
        )}

        {/* PROGRESS BAR (TRANSFORM SCALE INSTEAD OF LAYOUT WIDTH) */}
        {totalProblems > 0 && (
          <div className="mt-4 pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">Self-check progress:</span>
              <span className="tabular-nums text-muted-foreground">
                <span className="font-mono">{solvedCount}</span> of <span className="font-mono">{totalProblems}</span> completed (<span className="font-mono">{progressPercent}%</span>)
              </span>
            </div>
            <div className="w-full sm:w-48 h-2 border border-border bg-muted overflow-hidden">
              <div
                className="h-full w-full bg-primary origin-left transition-transform duration-300 motion-reduce:transition-none"
                style={{ transform: `scaleX(${progressRatio})` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ═══ PROBLEMS LIST ═══ */}
      {parsed.problems.length > 0 ? (
        <div className="space-y-4">
          {parsed.problems.map((problem) => {
            const isSolved = Boolean(solvedMap[problem.number]);
            const showHint = Boolean(expandedHints[problem.number]);
            const showSolution = Boolean(expandedSolutions[problem.number]);
            const showNotes = Boolean(expandedNotes[problem.number]);
            const userNotes = notesMap[problem.number] || "";

            return (
              <div
                key={problem.id}
                className={`border-2 transition-colors motion-reduce:transition-none p-4 sm:p-5 paper-shadow ${
                  isSolved
                    ? "border-primary/50 bg-card/60"
                    : "border-border bg-card"
                }`}
              >
                {/* PROBLEM TOP ROW */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-border">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="text-xs font-bold px-2 py-0.5 border border-border bg-muted text-foreground">
                      Problem <span className="font-mono tabular-nums">{problem.number < 10 ? `0${problem.number}` : problem.number}</span>
                    </span>
                    {problem.tag && (
                      <span className="text-xs font-bold text-foreground">
                        {problem.tag}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleCopy(problem.id, problem.statement)}
                      aria-label="Copy problem statement"
                      className="p-1 border border-border bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95 disabled:opacity-50"
                    >
                      {copiedId === problem.id ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSolved(problem.number)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold border transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95 disabled:opacity-50 ${
                        isSolved
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {isSolved ? (
                        <>
                          <CheckCircle2 size={13} className="text-primary" />
                          <span>Solved</span>
                        </>
                      ) : (
                        <>
                          <Circle size={13} />
                          <span>Mark solved</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* PROBLEM STATEMENT WITH KATEX RENDERING */}
                <div className="py-4 text-sm sm:text-base leading-relaxed text-foreground text-pretty">
                  <MathText text={problem.statement} />
                </div>

                {/* HINT ACCORDION */}
                {problem.hint && (
                  <div className="mt-2">
                    {showHint && (
                      <div className="mb-3 border-2 border-border bg-muted/40 p-3.5 text-xs sm:text-sm text-foreground">
                        <div className="flex items-center gap-1.5 font-bold text-foreground mb-1">
                          <Lightbulb size={13} className="text-primary" />
                          <span>Guiding hint:</span>
                        </div>
                        <div className="text-pretty leading-relaxed">
                          <MathText text={problem.hint} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SOLUTION ACCORDION */}
                {problem.solution && (
                  <div className="mt-2">
                    {showSolution && (
                      <div className="mb-3 border-2 border-primary/40 bg-primary/5 p-3.5 text-xs sm:text-sm text-foreground">
                        <div className="flex items-center gap-1.5 font-bold text-primary mb-1">
                          <HelpCircle size={13} />
                          <span>Step-by-step solution:</span>
                        </div>
                        <div className="text-pretty leading-relaxed">
                          <MathText text={problem.solution} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STUDENT WORKING SCRATCHPAD */}
                {showNotes && (
                  <div className="mb-3 border-2 border-border bg-muted/20 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground flex items-center gap-1">
                        <PenTool size={12} /> Rough calculations & reasoning
                      </span>
                      <span className="text-[11px] text-muted-foreground">Auto-saved locally</span>
                    </div>
                    <textarea
                      value={userNotes}
                      onChange={(e) => updateNotes(problem.number, e.target.value)}
                      placeholder="Write your intermediate working steps, final values, or questions here..."
                      rows={3}
                      className="w-full border border-border bg-background p-2 font-mono text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-y"
                    />
                  </div>
                )}

                {/* PROBLEM ACTION BUTTONS */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border text-xs">
                  {problem.hint ? (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedHints((prev) => ({
                          ...prev,
                          [problem.number]: !prev[problem.number],
                        }))
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 font-bold border border-border bg-muted text-foreground hover:bg-muted/80 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95 disabled:opacity-50"
                    >
                      <Lightbulb size={12} className="text-primary" />
                      <span>{showHint ? "Hide hint" : "Show hint"}</span>
                      {showHint ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  ) : null}

                  {problem.solution ? (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedSolutions((prev) => ({
                          ...prev,
                          [problem.number]: !prev[problem.number],
                        }))
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 font-bold border border-border bg-muted text-foreground hover:bg-muted/80 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95 disabled:opacity-50"
                    >
                      <HelpCircle size={12} className="text-primary" />
                      <span>{showSolution ? "Hide solution" : "Show solution"}</span>
                      {showSolution ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() =>
                      setExpandedNotes((prev) => ({
                        ...prev,
                        [problem.number]: !prev[problem.number],
                      }))
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 font-bold border border-border bg-muted text-muted-foreground hover:text-foreground transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95 disabled:opacity-50"
                  >
                    <PenTool size={12} />
                    <span>{showNotes ? "Hide scratchpad" : "Rough notes"}</span>
                  </button>

                  {onDiscussInTutor && (
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onDiscussInTutor(
                            `Problem ${problem.number} (${problem.tag || "Exercise"}): ${problem.statement}`,
                            "guide"
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 font-bold border border-border bg-muted text-foreground hover:bg-primary hover:text-primary-foreground transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95 disabled:opacity-50"
                      >
                        <Bot size={12} />
                        <span>Socratic hint</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onDiscussInTutor(
                            problem.tag || problem.statement,
                            "learn"
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 font-bold border border-border bg-muted text-foreground hover:bg-primary hover:text-primary-foreground transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95 disabled:opacity-50"
                      >
                        <Sparkles size={12} />
                        <span>Concept Studio</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* FALLBACK IF UNSTRUCTURED */
        <div className="border-2 border-border bg-card p-5 paper-shadow">
          <div className="text-sm leading-relaxed text-foreground text-pretty">
            <MathText text={parsed.rawFallback || dpp.content} />
          </div>
        </div>
      )}

      {/* ═══ GENERAL REVISION GUIDANCE ═══ */}
      {parsed.generalGuidance && (
        <div className="border-2 border-border bg-card p-5 paper-shadow">
          <div className="flex items-center gap-2 font-display text-base font-bold text-foreground mb-3 pb-2 border-b border-border">
            <Lightbulb size={16} className="text-primary" />
            <span>Revision guidance & strategic tips</span>
          </div>
          <div className="text-xs sm:text-sm text-foreground leading-relaxed text-pretty space-y-2">
            <MathText text={parsed.generalGuidance} />
          </div>
        </div>
      )}
    </div>
  );
}
