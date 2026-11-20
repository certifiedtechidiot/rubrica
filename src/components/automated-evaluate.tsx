import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileImage,
  Library,
  Loader2,
  RotateCcw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  type PersistedData,
  type QuestionEvaluation,
  type VisionEvaluation,
  type QuestionPaperRecord,
  type RubricaConfig,
  type TeacherProfile,
  loadQuestionPapers,
  saveQuestionPaper,
  deleteQuestionPaper,
  getDeletedQuestionPaperIds,
  restoreQuestionPaper,
} from '@/lib/storage';
import type { UndoAction } from '@/components/undo-banner';
import { supabase } from '@/lib/supabase';
import { evaluatePaperFn } from '@/lib/ai';
import { useBackButton } from '@/lib/back-button';
import {
  SAMPLE_PAGE_1_DATA_URL,
  SAMPLE_PAGE_2_DATA_URL,
  SAMPLE_BETA_RESULT,
  SAMPLE_BETA_QUESTIONS,
} from '@/lib/sample-paper';

// Longest edge (px) for uploaded answer-sheet images after client-side compression.
const MAX_UPLOAD_EDGE = 1600;

type EvaluationPayload = {
  id?: string;
  studentId: string;
  fileName: string;
  title?: string;
  subject?: string;
  result: VisionEvaluation;
};

type AutomatedEvaluateProps = {
  data: PersistedData;
  teacher?: TeacherProfile | null;
  config?: RubricaConfig;
  initialEvaluationId?: string;
  onSaveEvaluation: (payload: EvaluationPayload) => Promise<void>;
  onDeleteEvaluation?: (id: string) => Promise<void>;
  onDashboard: (studentId?: string) => void;
  onUndoAction?: (action: UndoAction) => void;
};

type Stage = 'choose' | 'analyzing' | 'results' | 'error';

const progressStages = [
  'Preparing your paper',
  'Reading the handwriting',
  'Checking the response',
  'Building teacher feedback',
];


function ResultList({ items, tone }: { items: string[]; tone: 'mint' | 'coral' }) {
  return (
    <ul className="mt-4 space-y-3">
      {items.length ? items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-3 text-sm leading-relaxed">
          <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center ${tone === 'mint' ? 'bg-[#10B981] text-white' : 'bg-[#E52237] text-white'}`}>
            <Check size={13} strokeWidth={3} />
          </span>
          <span>{item}</span>
        </li>
      )) : <li className="text-sm text-muted-foreground">No specific observations were returned for this paper.</li>}
    </ul>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * SPLIT-SCREEN RESULTS VIEW — Teacher Verification & Correction Interface
 * ═══════════════════════════════════════════════════════════════════════════ */

function ResultsView({
  evaluationId,
  result: initialResult,
  studentId: initialStudentId,
  filePreviewUrls,
  data,
  initialTitle,
  initialSubject,
  onSaveEvaluation,
  onDashboard,
  onAnother,
  onDeleteEvaluation,
}: {
  evaluationId?: string;
  result: VisionEvaluation;
  studentId: string;
  filePreviewUrls: string[];
  data: PersistedData;
  initialTitle?: string;
  initialSubject?: string;
  onSaveEvaluation: (payload: EvaluationPayload) => Promise<void>;
  onDashboard: (studentId?: string) => void;
  onAnother: () => void;
  onDeleteEvaluation?: () => void;
}) {
  const existingEval = evaluationId ? data.evaluations.find(e => e.id === evaluationId) : null;
  const originalQuestions = useMemo(() => initialResult.questions ?? [], [initialResult.questions]);
  const [questions, setQuestions] = useState<QuestionEvaluation[]>(originalQuestions);
  const [history, setHistory] = useState<QuestionEvaluation[][]>([originalQuestions]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId);
  const [testTitle, setTestTitle] = useState(initialTitle || existingEval?.title || '');
  const [testSubject, setTestSubject] = useState(initialSubject || existingEval?.subject || 'General');
  const [activePage, setActivePage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Preserve non-question fields
  const [overallFeedback] = useState(initialResult.overallFeedback);
  const [detailedAnalysis] = useState(initialResult.detailedAnalysis);
  const [confirmedStrengths] = useState(initialResult.confirmedStrengths);
  const [watchOutAreas] = useState(initialResult.watchOutAreas);

  const hasQuestions = questions.length > 0;

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const undo = () => {
    if (!canUndo) return;
    const prevIdx = historyIndex - 1;
    setHistoryIndex(prevIdx);
    setQuestions(history[prevIdx]);
  };

  const redo = () => {
    if (!canRedo) return;
    const nextIdx = historyIndex + 1;
    setHistoryIndex(nextIdx);
    setQuestions(history[nextIdx]);
  };

  const updateQuestion = (index: number, patch: Partial<QuestionEvaluation>) => {
    setQuestions(prev => {
      const next = prev.map((q, i) => i === index ? { ...q, ...patch } : q);
      const newHistory = [...history.slice(0, historyIndex + 1), next];
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      return next;
    });
  };

  const revertQuestion = (index: number) => {
    const orig = originalQuestions[index];
    if (!orig) return;
    updateQuestion(index, { marksAwarded: orig.marksAwarded, reason: orig.reason });
  };

  const revertAll = () => {
    setQuestions(originalQuestions);
    const newHistory = [...history.slice(0, historyIndex + 1), originalQuestions];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const anyModified = useMemo(() => {
    if (!originalQuestions.length || originalQuestions.length !== questions.length) return false;
    return questions.some((q, i) => {
      const orig = originalQuestions[i];
      return orig && (orig.marksAwarded !== q.marksAwarded || orig.reason !== q.reason);
    });
  }, [questions, originalQuestions]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  // Live recalculating score — ZERO API CALLS, purely local math
  const liveScore = useMemo(() => {
    if (!hasQuestions) return initialResult.score;
    return questions.reduce((sum, q) => sum + (Number(q.marksAwarded) || 0), 0);
  }, [questions, hasQuestions, initialResult.score]);

  const liveMaxScore = useMemo(() => {
    if (!hasQuestions) return initialResult.maxScore;
    return questions.reduce((sum, q) => sum + (Number(q.maxMarks) || 0), 0);
  }, [questions, hasQuestions, initialResult.maxScore]);

  const livePercentage = liveMaxScore > 0 ? Math.round((liveScore / liveMaxScore) * 100) : 0;

  const selectedStudent = data.students.find(s => s.id === selectedStudentId);
  const totalPages = filePreviewUrls.length;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedResult: VisionEvaluation = {
        score: liveScore,
        maxScore: liveMaxScore,
        percentage: livePercentage,
        confirmedStrengths,
        watchOutAreas,
        overallFeedback,
        detailedAnalysis,
        questions: hasQuestions ? questions : undefined,
      };
      const oldStudent = existingEval ? data.students.find(s => s.id === existingEval.studentId) : null;
      const wasOldAutoTitle = existingEval?.title === `${oldStudent?.name || 'Student'} Paper`;
      const computedTitle = testTitle.trim() || (wasOldAutoTitle ? `${selectedStudent?.name || 'Student'} Paper` : existingEval?.title) || `${selectedStudent?.name || 'Student'} Paper`;

      await onSaveEvaluation({
        id: evaluationId,
        studentId: selectedStudentId,
        fileName: selectedStudent?.name ?? 'Answer paper',
        title: computedTitle,
        subject: testSubject.trim() || existingEval?.subject || 'General',
        result: updatedResult,
      });
      onDashboard(selectedStudentId);
    } catch (e) {
      console.error('Failed to save:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDeleteEvaluation?.();
  };

  return (
    <div className="page-in mx-auto max-w-7xl space-y-5">
      {/* Top back & exit bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onDashboard(selectedStudentId)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          data-testid="button-review-back-dashboard"
        >
          <ArrowLeft size={14} /> Back to dashboard
        </button>
        <button
          type="button"
          onClick={() => onDashboard(selectedStudentId)}
          className="grid h-8 w-8 place-items-center border-2 border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title="Exit review"
          aria-label="Exit review"
          data-testid="button-review-exit"
        >
          <X size={15} />
        </button>
      </div>

      {/* Top header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Review the evaluation</h1>
          <p className="mt-1 text-sm text-muted-foreground">Check marks, fix reasoning, and reassign if needed. All edits are instant and free.</p>
        </div>
        <div className="flex items-center gap-2 border border-[#E52237]/40 bg-[#fef5f6] dark:bg-[#E52237]/10 px-3 py-2 text-xs font-semibold text-[#E52237]">
          <ShieldCheck size={16} /> You are in control
        </div>
      </div>

      {/* Test details strip — Edit Test Name, Subject, and Assigned Student */}
      <div className="flex flex-wrap items-center gap-4 border-2 border-[#09090B] dark:border-border bg-white dark:bg-card p-4 shadow-[3px_3px_0_#09090B] dark:shadow-[3px_3px_0_#000]">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-bold text-[#E52237] mb-1">Test or exam name</label>
          <input
            type="text"
            value={testTitle}
            onChange={(e) => setTestTitle(e.target.value)}
            placeholder="e.g. Science Mid-term Exam"
            className="mt-1 h-9 w-full border-2 border-[#09090B] dark:border-border bg-[#fbfaf7] dark:bg-secondary px-3 font-display text-sm font-bold text-foreground outline-none focus:border-[#E52237]"
            data-testid="input-review-test-title"
          />
        </div>
        <div className="w-52 min-w-[140px]">
          <label className="block text-xs font-bold text-[#E52237] mb-1">Subject</label>
          <input
            type="text"
            value={testSubject}
            onChange={(e) => setTestSubject(e.target.value)}
            placeholder="e.g. Science"
            className="mt-1 h-9 w-full border-2 border-[#09090B] dark:border-border bg-[#fbfaf7] dark:bg-secondary px-3 font-mono-score text-xs font-bold text-foreground outline-none focus:border-[#E52237]"
            data-testid="input-review-test-subject"
          />
        </div>
        <div className="w-60 min-w-[170px]">
          <label className="block text-xs font-bold text-[#E52237] mb-1">Assigned learner</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="mt-1 h-9 w-full border-2 border-[#09090B] dark:border-border bg-[#fbfaf7] dark:bg-secondary px-3 font-display text-xs font-bold text-foreground outline-none focus:border-[#E52237] cursor-pointer"
            data-testid="select-review-student"
          >
            {data.students.map(s => (
              <option key={s.id} value={s.id} className="dark:bg-card text-foreground">{s.name} ({s.grade})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Split screen */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 min-h-[80vh]">
        {/* ─── LEFT COLUMN: Scanned Paper Viewer ─── */}
        <div className="border-2 border-[#09090B] dark:border-border bg-[#faf9f6] dark:bg-card paper-shadow flex flex-col">
          {/* Page switcher */}
          <div className="flex items-center gap-2 border-b-2 border-[#09090B] dark:border-border bg-white dark:bg-card px-4 py-3 overflow-x-auto">
            <button
              onClick={() => setActivePage(p => Math.max(0, p - 1))}
              disabled={activePage === 0}
              className="grid h-8 w-8 shrink-0 place-items-center border-2 border-[#09090B] dark:border-border bg-white dark:bg-secondary text-[#09090B] dark:text-foreground disabled:opacity-30 hover:bg-[#f2eee6] dark:hover:bg-muted"
            >
              <ChevronLeft size={16} />
            </button>
            {filePreviewUrls.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActivePage(idx)}
                className={`shrink-0 px-3 py-1.5 text-xs font-bold border-2 transition-colors ${
                  activePage === idx
                    ? 'border-[#E52237] bg-[#E52237] text-white shadow-[2px_2px_0_#09090B] dark:shadow-[2px_2px_0_#000]'
                    : 'border-[#09090B] dark:border-border bg-white dark:bg-secondary text-[#09090B] dark:text-foreground hover:bg-[#f2eee6] dark:hover:bg-muted'
                }`}
              >
                Page {idx + 1}
              </button>
            ))}
            <button
              onClick={() => setActivePage(p => Math.min(totalPages - 1, p + 1))}
              disabled={activePage >= totalPages - 1}
              className="grid h-8 w-8 shrink-0 place-items-center border-2 border-[#09090B] dark:border-border bg-white dark:bg-secondary text-[#09090B] dark:text-foreground disabled:opacity-30 hover:bg-[#f2eee6] dark:hover:bg-muted"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Image viewport */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            {filePreviewUrls.length > 0 ? (
              <img
                src={filePreviewUrls[activePage]}
                alt={`Answer paper page ${activePage + 1}`}
                className="max-h-[75vh] w-full object-contain mx-auto select-none"
                draggable={false}
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <FileImage size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">No page images available to preview.</p>
              </div>
            )}
          </div>

          <div className="border-t border-border px-4 py-2 text-center font-mono-score text-[10px] text-muted-foreground">
            Page {activePage + 1} of {Math.max(1, totalPages)}
          </div>
        </div>

        {/* ─── RIGHT COLUMN: Question Audit & Live Correction ─── */}
        <div className="flex flex-col border-2 border-[#09090B] bg-card paper-shadow">
          {/* Sticky score header */}
          <div className="sticky top-0 z-10 border-b-2 border-[#09090B] bg-[#09090B] p-5 text-white">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-white/70">Live score</p>
                <div className="mt-1 flex items-end gap-2">
                  <span className="font-mono-score text-4xl font-medium text-[#10B981]">{liveScore}</span>
                  <span className="mb-0.5 font-mono-score text-lg text-white/50">/ {liveMaxScore}</span>
                </div>
              </div>

              {/* Undo / Redo controls */}
              <div className="flex flex-col items-end gap-2">
                <span className={`font-mono-score text-3xl font-bold ${livePercentage >= 60 ? 'text-[#10B981]' : livePercentage >= 35 ? 'text-[#F59E0B]' : 'text-[#E52237]'}`}>
                  {livePercentage}%
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={undo}
                    disabled={!canUndo}
                    className="flex items-center gap-1 border border-white/20 bg-white/10 px-2 py-0.5 font-mono-score text-[11px] font-bold text-white hover:bg-white/20 active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-25 disabled:pointer-events-none transition-all"
                    title="Undo mark/reason edit (Ctrl+Z)"
                  >
                    <RotateCcw size={11} /> Undo
                  </button>
                  <button
                    type="button"
                    onClick={redo}
                    disabled={!canRedo}
                    className="flex items-center gap-1 border border-white/20 bg-white/10 px-2 py-0.5 font-mono-score text-[11px] font-bold text-white hover:bg-white/20 active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-25 disabled:pointer-events-none transition-all"
                    title="Redo edit (Ctrl+Y)"
                  >
                    <RotateCcw size={11} className="-scale-x-100" /> Redo
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-3 h-2 bg-white/15">
              <div className="h-full bg-[#E52237] transition-all duration-200" style={{ width: `${Math.max(0, Math.min(100, livePercentage))}%` }} />
            </div>

            {/* Reassign student + delete */}
            <div className="mt-4 flex items-center gap-3">
              <label className="flex-1">
                <span className="text-xs font-medium text-white/70">Assign to student</span>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="mt-1 h-9 w-full border-2 border-white/20 bg-white/10 px-2 text-sm text-white outline-none focus:border-[#E52237]"
                >
                  {data.students.map(s => (
                    <option key={s.id} value={s.id} className="text-[#09090B]">{s.name}, {s.grade}</option>
                  ))}
                </select>
              </label>
              {onDeleteEvaluation && (
                confirmDelete ? (
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="flex items-center gap-1 border-2 border-[#E52237] bg-[#E52237] px-2.5 py-1.5 font-mono-score text-xs font-bold text-white hover:bg-[#cc182b] transition-colors"
                      title="Permanently delete"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="flex items-center gap-1 border border-white/30 bg-white/10 px-2.5 py-1.5 font-mono-score text-xs font-bold text-white hover:bg-white/20 transition-colors"
                      title="Cancel and keep evaluation"
                    >
                      Cancel / Undo
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="mt-4 grid h-9 w-9 shrink-0 place-items-center border-2 border-white/20 bg-white/10 text-white/60 hover:text-[#E52237] hover:border-[#E52237] transition-colors"
                    title="Delete this evaluation"
                  >
                    <Trash2 size={16} />
                  </button>
                )
              )}
            </div>
            {confirmDelete && (
              <p className="mt-2 text-xs text-[#E52237]">Are you sure? Click Delete to confirm, or Cancel to undo.</p>
            )}
          </div>

          {/* Question cards — scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {hasQuestions ? (
              questions.map((q, idx) => {
                const orig = originalQuestions[idx];
                const isModified = orig && (orig.marksAwarded !== q.marksAwarded || orig.reason !== q.reason);
                return (
                <div key={idx} className="border-2 border-border bg-white dark:bg-card p-4 paper-shadow">
                  {/* Question header */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center border-2 border-[#09090B] dark:border-border bg-[#09090B] dark:bg-secondary font-mono-score text-xs font-bold text-white">
                        {q.questionNumber}
                      </span>
                      <span className="font-mono-score text-xs text-muted-foreground">Max: {q.maxMarks}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Per-question undo / revert */}
                      {isModified && (
                        <button
                          type="button"
                          onClick={() => revertQuestion(idx)}
                          className="flex items-center gap-1 border border-[#E52237] bg-[#fdf2f4] dark:bg-[#E52237]/20 px-2 py-0.5 font-mono-score text-[10px] font-bold text-[#b81528] dark:text-[#ff8a9a] hover:bg-[#E52237] hover:text-white transition-colors"
                          title={`Undo edits to this question (AI was ${orig.marksAwarded})`}
                        >
                          <RotateCcw size={10} /> Undo (AI: {orig.marksAwarded})
                        </button>
                      )}

                      {/* Page anchor badges */}
                      <div className="flex gap-1.5">
                        {q.pages.map(pg => (
                          <button
                            key={pg}
                            onClick={() => setActivePage(pg - 1)}
                            className={`px-2 py-0.5 text-[10px] font-bold border transition-colors ${
                              activePage === pg - 1
                                ? 'border-[#E52237] bg-[#E52237] text-white'
                                : 'border-border bg-[#f2eee6] dark:bg-secondary text-muted-foreground hover:border-[#E52237] hover:text-[#E52237]'
                            }`}
                          >
                            Pg {pg}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Editable marks */}
                  <div className="mt-3 flex items-center gap-3">
                    <label className="font-mono-score text-xs text-muted-foreground">Marks:</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={q.maxMarks}
                      value={q.marksAwarded}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(q.maxMarks, Number(e.target.value) || 0));
                        updateQuestion(idx, { marksAwarded: val });
                      }}
                      className="w-20 border-2 border-[#09090B] dark:border-border bg-white dark:bg-secondary p-1.5 font-mono-score text-lg font-bold text-center text-[#09090B] dark:text-foreground outline-none focus:border-[#E52237]"
                    />
                    <span className="font-mono-score text-xs text-muted-foreground">/ {q.maxMarks}</span>
                    {q.marksAwarded === q.maxMarks && (
                      <CheckCircle2 size={16} className="text-[#10B981]" />
                    )}
                  </div>

                  {/* Editable reason */}
                  <textarea
                    rows={2}
                    value={q.reason}
                    onChange={(e) => updateQuestion(idx, { reason: e.target.value })}
                    placeholder="Reason for marks awarded..."
                    className="mt-3 w-full border border-border bg-[#faf9f6] dark:bg-secondary/40 p-2 text-sm leading-relaxed text-foreground outline-none focus:border-[#E52237] resize-y"
                  />
                </div>
              );
            })
            ) : (
              /* Fallback: no structured questions, show detailedAnalysis */
              <div className="space-y-5">
                <div className="border-2 border-border bg-white dark:bg-card p-5">
                  <div className="flex items-center gap-2">
                    <Sparkles size={17} className="text-[#E52237]" />
                    <p className="text-xs font-semibold text-muted-foreground">Overall feedback</p>
                  </div>
                  <p className="mt-4 font-display text-xl font-semibold leading-snug">{overallFeedback}</p>
                </div>

                <div className="border-2 border-border bg-white dark:bg-card p-5">
                  <p className="text-xs font-semibold text-muted-foreground">Detailed analysis</p>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-foreground/80">{detailedAnalysis}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="border-2 border-border bg-white dark:bg-card p-4">
                    <p className="text-xs font-semibold text-[#087f5b] dark:text-[#34d399]">Confirmed strengths</p>
                    <ResultList items={confirmedStrengths} tone="mint" />
                  </div>
                  <div className="border-2 border-[#E52237]/30 bg-[#fff0f3] dark:bg-[#E52237]/10 p-4">
                    <p className="text-xs font-semibold text-[#b81528] dark:text-[#ff7588]">Watch-out areas</p>
                    <ResultList items={watchOutAreas} tone="coral" />
                  </div>
                </div>
              </div>
            )}

            {/* Strengths & watch-outs summary even when questions exist */}
            {hasQuestions && (
              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <div className="border-2 border-border bg-white dark:bg-card p-4">
                  <p className="text-xs font-semibold text-[#087f5b] dark:text-[#34d399]">Strengths</p>
                  <ResultList items={confirmedStrengths} tone="mint" />
                </div>
                <div className="border-2 border-[#E52237]/30 bg-[#fff0f3] dark:bg-[#E52237]/10 p-4">
                  <p className="text-xs font-semibold text-[#b81528] dark:text-[#ff7588]">Watch-outs</p>
                  <ResultList items={watchOutAreas} tone="coral" />
                </div>
              </div>
            )}
          </div>

          {/* Bottom actions */}
          <div className="border-t-2 border-[#09090B] dark:border-border p-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-card">
            <button
              onClick={onAnother}
              className="inline-flex items-center justify-center gap-2 border border-border bg-white dark:bg-secondary px-4 py-3 text-sm font-bold text-foreground hover:bg-muted"
            >
              <RotateCcw size={16} /> Analyze another paper
            </button>
            <div className="flex items-center gap-3">
              {anyModified && (
                <button
                  type="button"
                  onClick={revertAll}
                  className="inline-flex items-center gap-1.5 border-2 border-border bg-white dark:bg-secondary px-4 py-2.5 font-mono-score text-xs font-bold text-[#E52237] hover:bg-[#fdf2f4] dark:hover:bg-[#E52237]/20 transition-colors"
                  title="Revert all edited marks and reasons back to original AI grading"
                >
                  <RotateCcw size={13} /> Revert All to AI
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 border-2 border-[#09090B] dark:border-border bg-[#E52237] px-5 py-3 text-sm font-bold text-white paper-shadow disabled:opacity-50 hover:bg-[#cc182b] transition-colors"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {saving ? 'Saving…' : 'Save Changes & Finish'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
 * MAIN EVALUATION ORCHESTRATOR
 * ═══════════════════════════════════════════════════════════════════════════ */

export function AutomatedEvaluate({ data, teacher, config, initialEvaluationId, onSaveEvaluation, onDeleteEvaluation, onDashboard, onUndoAction }: AutomatedEvaluateProps) {
  const [stage, setStage] = useState<Stage>('choose');
  const [studentId, setStudentId] = useState(() => {
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const urlStudentId = searchParams?.get('studentId');
    if (urlStudentId && data.students.some(s => s.id === urlStudentId)) {
      return urlStudentId;
    }
    if (teacher?.role === 'student') {
      const selfStudent = data.students.find(s => s.id === teacher.id || s.name.toLowerCase() === teacher.name?.toLowerCase());
      if (selfStudent) return selfStudent.id;
    }
    return data.students[0]?.id ?? '';
  });
  const [files, setFiles] = useState<File[]>([]);
  const [questionFiles, setQuestionFiles] = useState<File[]>([]);
  const [result, setResult] = useState<VisionEvaluation | null>(null);
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeEvaluationId, setActiveEvaluationId] = useState<string | undefined>(initialEvaluationId);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const questionInputRef = useRef<HTMLInputElement>(null);
  const questionCameraInputRef = useRef<HTMLInputElement>(null);
  const student = data.students.find((item) => item.id === studentId);
  const classroom = data.classrooms?.find((c) => c.id === student?.classroomId);

  useBackButton(() => {
    if (stage === 'results') {
      onDashboard(studentId);
      return true;
    }
    if (stage === 'analyzing') {
      reset();
      return true;
    }
    onDashboard(studentId);
    return true;
  }, true);

  // Test details & Question paper library state
  const [testTitle, setTestTitle] = useState('');
  const [testSubject, setTestSubject] = useState(() => {
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const urlSubj = searchParams?.get('subject');
    if (urlSubj) return urlSubj;
    return classroom?.subject || 'General';
  });
  const [qpMode, setQpMode] = useState<'upload' | 'library'>('library');
  const [selectedQpId, setSelectedQpId] = useState<string | null>(null);
  const [saveQpToLibrary, setSaveQpToLibrary] = useState(true);
  const [libraryRefreshTrigger, setLibraryRefreshTrigger] = useState(0);

  const savedQuestionPapers = useMemo(() => {
    const fromStorage = loadQuestionPapers();
    const fromData = data.questionPapers || [];
    const deletedIds = new Set(getDeletedQuestionPaperIds());
    const map = new Map<string, QuestionPaperRecord>();
    for (const qp of fromData) {
      if (!deletedIds.has(qp.id)) map.set(qp.id, qp);
    }
    for (const qp of fromStorage) {
      if (!deletedIds.has(qp.id)) map.set(qp.id, qp);
    }
    return Array.from(map.values());
  }, [data.questionPapers, libraryRefreshTrigger]);

  const selectQuestionPaperFromLibrary = (qp: QuestionPaperRecord) => {
    setSelectedQpId(qp.id);
    if (!testTitle.trim()) setTestTitle(qp.title);
    if (qp.subject) setTestSubject(qp.subject);
  };

  const clearSelectedQuestionPaper = () => {
    setSelectedQpId(null);
  };

  const handleDeleteQuestionPaper = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const paperToDelete = savedQuestionPapers.find(q => q.id === id);
    if (!paperToDelete) return;

    deleteQuestionPaper(id);
    if (selectedQpId === id) setSelectedQpId(null);
    setLibraryRefreshTrigger(t => t + 1);

    if (onUndoAction) {
      onUndoAction({
        id: `qp-${id}-${Date.now()}`,
        message: `Deleted question paper "${paperToDelete.title}"`,
        onUndo: () => {
          restoreQuestionPaper(paperToDelete);
          setLibraryRefreshTrigger(t => t + 1);
        }
      });
    }
  };

  useEffect(() => {
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const isDemo = searchParams?.get('demo') === 'sample';
    const id = initialEvaluationId || searchParams?.get('id');

    if (isDemo && !id) {
      const mayaId = data.students.find(s => s.name.includes('Maya'))?.id || data.students[0]?.id || '';
      setStudentId(mayaId);
      setTestTitle('Science Mid-term');
      setTestSubject('Science');
      setResult(SAMPLE_BETA_RESULT);
      setFilePreviewUrls([SAMPLE_PAGE_1_DATA_URL, SAMPLE_PAGE_2_DATA_URL]);
      setActiveEvaluationId(data.evaluations[0]?.id);
      setStage('results');
      return;
    }
    if (!id) {
      const urlStudentId = searchParams?.get('studentId');
      if (urlStudentId && data.students.some(s => s.id === urlStudentId)) {
        setStudentId(urlStudentId);
      } else if (!studentId) {
        setStudentId(data.students[0]?.id || 'self-student');
      }
      const urlSubj = searchParams?.get('subject');
      if (urlSubj) {
        setTestSubject(urlSubj);
      }
      return;
    }
    const target = data.evaluations.find(e => e.id === id);
    if (!target) return;

    setActiveEvaluationId(target.id);
    setStudentId(target.studentId);
    setTestTitle(target.title || '');
    setTestSubject(target.subject || 'General');
    const existingRaw = target.rawJsonResult;
    const questions: QuestionEvaluation[] = existingRaw?.questions && Array.isArray(existingRaw.questions) && existingRaw.questions.length > 0
      ? existingRaw.questions
      : SAMPLE_BETA_QUESTIONS;

    const previewUrls: string[] = existingRaw?.filePreviewUrls && Array.isArray(existingRaw.filePreviewUrls) && existingRaw.filePreviewUrls.length > 0
      ? existingRaw.filePreviewUrls
      : [SAMPLE_PAGE_1_DATA_URL, SAMPLE_PAGE_2_DATA_URL];

    const res: VisionEvaluation = {
      score: target.score,
      maxScore: target.maxScore,
      percentage: target.percentage ?? Math.round((target.score / target.maxScore) * 100),
      confirmedStrengths: target.confirmedStrengths || [],
      watchOutAreas: target.watchOutAreas || [],
      overallFeedback: target.summary || '',
      detailedAnalysis: target.detailedAnalysis || '',
      questions,
    };

    setResult(res);
    setFilePreviewUrls(previewUrls);
    setStage('results');
  }, [initialEvaluationId, data.evaluations]);

  const loadSampleEvaluation = () => {
    const mayaId = data.students.find(s => s.name.includes('Maya'))?.id || data.students[0]?.id || '';
    setStudentId(mayaId);
    setResult(SAMPLE_BETA_RESULT);
    setFilePreviewUrls([SAMPLE_PAGE_1_DATA_URL, SAMPLE_PAGE_2_DATA_URL]);
    setActiveEvaluationId(data.evaluations[0]?.id);
    setStage('results');
  };

  const selectFile = (newFiles?: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;
    const validFiles = Array.from(newFiles);
    setFiles(prev => [...prev, ...validFiles]);
    setErrorMessage('');
    setStage('choose');
  };

  const selectQuestionFile = (newFiles?: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;
    const validFiles = Array.from(newFiles);
    setQuestionFiles(prev => [...prev, ...validFiles]);
    setErrorMessage('');
    setStage('choose');
  };

  const readAsDataUrl = (target: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read this image.'));
    reader.onerror = () => reject(new Error('Could not read this image.'));
    reader.readAsDataURL(target);
  });

  // Scanned pages are uploaded through our server-side AI proxy, so keep each
  // request small: downscale photos to a readable-but-compact JPEG. PDFs and
  // animated images are sent unchanged.
  const readUploadAsDataUrl = async (target: File) => {
    const original = await readAsDataUrl(target);
    if (!target.type.startsWith('image/') || target.type === 'image/gif' || target.type === 'image/svg+xml') {
      return original;
    }
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error('Image could not be decoded.'));
        element.src = original;
      });
      const scale = Math.min(1, MAX_UPLOAD_EDGE / Math.max(image.width, image.height));
      if (scale >= 1 && original.length < 900_000) return original;

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) return original;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL('image/jpeg', 0.82);
      return compressed.length < original.length ? compressed : original;
    } catch {
      return original;
    }
  };

  const analyze = async () => {
    if (files.length === 0 || !studentId) return;
    setStage('analyzing');
    setErrorMessage('');
    try {
      const dataUrls = await Promise.all(files.map(readUploadAsDataUrl));
      
      let qDataUrls: string[] = [];
      const selectedSavedPaper = selectedQpId ? savedQuestionPapers.find(q => q.id === selectedQpId) : null;
      if (selectedSavedPaper && selectedSavedPaper.fileUrls.length > 0) {
        qDataUrls = selectedSavedPaper.fileUrls;
      } else if (questionFiles.length > 0) {
        qDataUrls = await Promise.all(questionFiles.map(readUploadAsDataUrl));
        // Save to library for re-use if requested
        if (saveQpToLibrary && qDataUrls.length > 0) {
          const newQp: QuestionPaperRecord = {
            id: 'qp-' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2))),
            title: testTitle.trim() || `${testSubject.trim() || classroom?.subject || 'Class'} Question Paper`,
            subject: testSubject.trim() || classroom?.subject || 'General',
            fileUrls: qDataUrls,
            pageCount: qDataUrls.length,
            createdAt: new Date().toISOString()
          };
          saveQuestionPaper(newQp);
          setLibraryRefreshTrigger(t => t + 1);
        }
      }

      // Generate preview URLs for the answer paper images (for split-screen viewer)
      const previewUrls = files.map(f => URL.createObjectURL(f));
      setFilePreviewUrls(previewUrls);
      
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken =
        sessionData.session?.access_token ||
        (teacher?.isBeta ? `beta-token-${teacher.id || 'beta-user'}` : '');
      if (!accessToken) {
        throw new Error('Please sign in again before evaluating a paper.');
      }

      const totalChars = [...qDataUrls, ...dataUrls].reduce((sum, url) => sum + url.length, 0);
      if (totalChars > 3_800_000) {
        throw new Error('This paper is too large to process. Upload fewer pages, or smaller images.');
      }

      const aiResult = await evaluatePaperFn({
        data: {
          accessToken,
          rubric: classroom?.rubric || undefined,
          questionImages: qDataUrls,
          answerImages: dataUrls,
        },
      });
      if (!aiResult.ok) {
        throw new Error(aiResult.message);
      }

      const contentText = aiResult.content;
      const cleaned = contentText.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
      let parsed: unknown;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start < 0 || end < start) throw new Error('The Vision AI returned an invalid JSON evaluation.');
        parsed = JSON.parse(cleaned.slice(start, end + 1));
      }
      const raw = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;
      const maxScore = Math.max(0, Number(raw.maxScore) || 100);
      const score = Math.max(0, Math.min(maxScore, Number(raw.score) || 0));
      const percentage = Math.max(0, Math.min(100, Number(raw.percentage) || (maxScore ? (score / maxScore) * 100 : 0)));
      const toStrings = (value: unknown) => Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [];

      // Parse and validate the questions array safely
      const rawQuestions = Array.isArray(raw.questions) ? raw.questions : [];
      const parsedQuestions: QuestionEvaluation[] = rawQuestions
        .filter((q: unknown): q is Record<string, unknown> => q != null && typeof q === 'object')
        .map((q: Record<string, unknown>) => ({
          questionNumber: typeof q.questionNumber === 'string' ? q.questionNumber : `Q${rawQuestions.indexOf(q) + 1}`,
          pages: Array.isArray(q.pages) ? q.pages.map(Number).filter(n => !isNaN(n) && n > 0) : [1],
          maxMarks: Math.max(0, Number(q.maxMarks) || 0),
          marksAwarded: Math.max(0, Number(q.marksAwarded) || 0),
          reason: typeof q.reason === 'string' ? q.reason.trim() : '',
        }));

      const responseData: VisionEvaluation = {
        score,
        maxScore,
        percentage,
        confirmedStrengths: toStrings(raw.confirmedStrengths),
        watchOutAreas: toStrings(raw.watchOutAreas),
        overallFeedback: typeof raw.overallFeedback === 'string' ? raw.overallFeedback.trim() : '',
        detailedAnalysis: typeof raw.detailedAnalysis === 'string' ? raw.detailedAnalysis.trim() : '',
        questions: parsedQuestions.length > 0 ? parsedQuestions : undefined,
      };
      // NOTE: We do NOT save yet — teacher verifies first in the split-screen view
      setResult(responseData);
      setStage('results');
    } catch (caught) {
      setErrorMessage(caught instanceof Error ? caught.message : 'The paper could not be analyzed right now. Please try again.');
      setStage('error');
    }
  };

  const reset = () => {
    // Revoke any blob URLs to free memory (skip data URIs)
    filePreviewUrls.forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    setFiles([]);
    setQuestionFiles([]);
    setResult(null);
    setFilePreviewUrls([]);
    setActiveEvaluationId(undefined);
    setTestTitle('');
    setTestSubject(classroom?.subject || 'General');
    setSelectedQpId(null);
    setErrorMessage('');
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/evaluate');
    }
    setStage('choose');
  };

  if (!data.students.length) {
    return <div className="mx-auto max-w-2xl border-2 border-dashed border-border bg-card px-6 py-14 text-center paper-shadow"><ScanSearch className="mx-auto mb-4 text-[#E52237]" size={30} /><h1 className="font-display text-3xl font-bold">Choose a student first</h1><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Rubrica needs a student record before it can file an AI evaluation.</p><button onClick={() => onDashboard()} className="mt-6 inline-flex items-center gap-2 border-2 border-[#09090B] bg-[#09090B] px-4 py-3 text-sm font-bold text-white paper-shadow-coral" data-testid="button-empty-dashboard">Return to dashboard</button></div>;
  }

  if (stage === 'results' && result) {
    return (
      <ResultsView
        key={activeEvaluationId || 'new'}
        evaluationId={activeEvaluationId}
        result={result}
        studentId={studentId}
        filePreviewUrls={filePreviewUrls}
        data={data}
        initialTitle={testTitle}
        initialSubject={testSubject}
        onSaveEvaluation={onSaveEvaluation}
        onDeleteEvaluation={activeEvaluationId && onDeleteEvaluation ? async () => {
          await onDeleteEvaluation(activeEvaluationId);
          onDashboard(studentId);
        } : () => onDashboard(studentId)}
        onDashboard={onDashboard}
        onAnother={reset}
      />
    );
  }

  if (stage === 'analyzing') {
    return (
      <div className="page-in mx-auto max-w-3xl py-10 space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            data-testid="button-cancel-analyzing"
          >
            <ArrowLeft size={14} /> Cancel / Back
          </button>
          <button
            type="button"
            onClick={reset}
            className="grid h-8 w-8 place-items-center border-2 border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Cancel evaluation"
            aria-label="Cancel evaluation"
            data-testid="button-exit-analyzing"
          >
            <X size={15} />
          </button>
        </div>
        <div className="border-2 border-[#09090B] bg-[#09090B] p-7 text-white paper-shadow-coral md:p-10"><div className="flex items-start gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center bg-[#E52237]"><Loader2 className="animate-spin" size={23} /></div><div><p className="text-xs font-semibold text-[#E52237]">Rubrica vision</p><h1 className="mt-1 font-display text-3xl font-bold">Reading this paper carefully.</h1><p className="mt-2 max-w-lg text-sm leading-relaxed text-white/65">The assistant is examining the handwriting and checking the response before it writes its evaluation.</p></div></div><div className="mt-10 space-y-5">{progressStages.map((item, index) => <div key={item} className="flex items-center gap-3 text-sm"><span className={`grid h-6 w-6 place-items-center border ${index === 0 ? 'border-[#E52237] bg-[#E52237] text-white' : 'border-white/25 text-white/35'}`}>{index === 0 ? <Check size={14} /> : <span className="font-mono-score text-[10px]">{index + 1}</span>}</span><span className={index === 0 ? 'text-white' : 'text-white/45'}>{item}</span>{index === 0 && <span className="ml-auto text-xs font-semibold text-[#E52237]">working</span>}</div>)}</div></div>
      </div>
    );
  }

  return (
    <div className="page-in mx-auto max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onDashboard(studentId)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          data-testid="button-evaluate-back-dashboard"
        >
          <ArrowLeft size={14} /> Back to dashboard
        </button>
        <button
          type="button"
          onClick={() => onDashboard(studentId)}
          className="grid h-8 w-8 place-items-center border-2 border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title="Exit evaluation"
          aria-label="Exit evaluation"
          data-testid="button-evaluate-exit-dashboard"
        >
          <X size={15} />
        </button>
      </div>

      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">A second set of eyes.</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Choose the learner, add one clear photo of their handwritten answer paper, and Rubrica will produce a review for you to check.</p>
      </div>

    {/* Beta Instant Preview Banner */}
    <div className="border-2 border-[#E52237] bg-[#fef5f6] dark:bg-[#E52237]/10 p-5 paper-shadow flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center border-2 border-[#09090B] bg-[#E52237] text-white">
          <Sparkles size={20} />
        </span>
        <div>
          <p className="font-display text-base font-bold text-[#09090B] dark:text-foreground">Explore Beta / Instant Split-Screen Preview</p>
          <p className="text-xs text-muted-foreground">Test the new split-screen verification &amp; correction interface with pre-loaded handwritten answer pages.</p>
        </div>
      </div>
      <button
        type="button"
        onClick={loadSampleEvaluation}
        className="shrink-0 inline-flex items-center gap-2 border-2 border-[#09090B] bg-[#09090B] px-4 py-2.5 text-xs font-bold text-white paper-shadow-coral hover:bg-[#E52237] transition-colors"
        data-testid="button-load-sample-evaluation"
      >
        <Sparkles size={14} /> Try sample paper demo
      </button>
    </div>

    <section className="border-2 border-border bg-card p-5 paper-shadow md:p-7 space-y-6">
      {/* Learner, Test Name, and Subject Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#09090B] dark:text-foreground">
            Student <span className="text-[#E52237]">*</span>
          </label>
          <select
            value={studentId}
            onChange={(event) => {
              const newId = event.target.value;
              setStudentId(newId);
              const newStudent = data.students.find(s => s.id === newId);
              const newClassroom = data.classrooms?.find(c => c.id === newStudent?.classroomId);
              if (!testSubject || testSubject === 'General' || (classroom && testSubject === classroom.subject)) {
                if (newClassroom?.subject) {
                  setTestSubject(newClassroom.subject);
                }
              }
            }}
            className="mt-1.5 h-11 w-full border-2 border-[#09090B] bg-background px-3 font-medium outline-none focus:border-[#E52237]"
            data-testid="select-evaluation-student"
          >
            {data.students.length > 0 ? (
              data.students.map((item) => (
                <option key={item.id} value={item.id}>{item.name}, {item.grade}</option>
              ))
            ) : (
              <option value="self-student">Practice paper (Self)</option>
            )}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#09090B] dark:text-foreground">
            Test or exam name
          </label>
          <input
            type="text"
            value={testTitle}
            onChange={(e) => setTestTitle(e.target.value)}
            placeholder="e.g. Mid-Term Assessment 2026"
            className="mt-1.5 h-11 w-full border-2 border-[#09090B] bg-background px-3 font-medium outline-none focus:border-[#E52237]"
            data-testid="input-evaluation-test-title"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#09090B] dark:text-foreground">
            Subject
          </label>
          <input
            type="text"
            value={testSubject}
            onChange={(e) => setTestSubject(e.target.value)}
            placeholder="e.g. Mathematics, Science"
            className="mt-1.5 h-11 w-full border-2 border-[#09090B] bg-background px-3 font-medium outline-none focus:border-[#E52237]"
            data-testid="input-evaluation-subject"
          />
        </div>
      </div>

      {/* Question Paper Section with Tab Selector */}
      <div className="border-t border-border pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-sm font-bold flex items-center gap-2">
              <BookOpen size={16} className="text-[#09090B]" />
              Question paper <span className="font-normal text-muted-foreground">(optional, improves accuracy)</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload once and reuse for all students taking the same exam.
            </p>
          </div>
          {/* Mode Switcher */}
          <div className="flex border-2 border-[#09090B] dark:border-border bg-white dark:bg-card p-0.5 self-start sm:self-auto shadow-[2px_2px_0_#09090B] dark:shadow-[2px_2px_0_#000]">
            <button
              type="button"
              onClick={() => setQpMode('library')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all ${
                qpMode === 'library'
                  ? 'border-2 border-[#09090B] dark:border-[#E52237] bg-[#09090B] dark:bg-[#E52237] text-white shadow-[2px_2px_0_#E52237] dark:shadow-none'
                  : 'text-[#09090B] dark:text-muted-foreground hover:bg-muted dark:hover:text-foreground'
              }`}
              data-testid="button-qp-mode-library"
            >
              <Library size={13} /> Select from Library ({savedQuestionPapers.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setQpMode('upload');
                setSelectedQpId(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all ${
                qpMode === 'upload'
                  ? 'border-2 border-[#09090B] dark:border-[#E52237] bg-[#09090B] dark:bg-[#E52237] text-white shadow-[2px_2px_0_#E52237] dark:shadow-none'
                  : 'text-[#09090B] dark:text-muted-foreground hover:bg-muted dark:hover:text-foreground'
              }`}
              data-testid="button-qp-mode-upload"
            >
              <UploadCloud size={13} /> Upload New Paper
            </button>
          </div>
        </div>

        {qpMode === 'library' ? (
          <div>
            {savedQuestionPapers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {savedQuestionPapers.map((qp) => {
                  const isSelected = selectedQpId === qp.id;
                  return (
                    <div
                      key={qp.id}
                      onClick={() => selectQuestionPaperFromLibrary(qp)}
                      className={`relative cursor-pointer border-2 p-3 transition-all ${isSelected ? 'border-[#E52237] bg-[#fef5f6] dark:bg-[#E52237]/20 shadow-[3px_3px_0_#E52237]' : 'border-[#09090B] dark:border-border bg-white dark:bg-card hover:bg-[#fef5f6] dark:hover:bg-secondary hover:border-[#E52237]'}`}
                      data-testid={`card-qp-${qp.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`grid h-7 w-7 place-items-center border ${isSelected ? 'border-[#E52237] bg-[#E52237] text-white' : 'border-[#09090B] dark:border-border bg-[#fbfaf7] dark:bg-muted'}`}>
                            {isSelected ? <Check size={14} strokeWidth={3} /> : <BookOpen size={13} />}
                          </span>
                          <span className="font-mono-score text-xs font-medium px-1.5 py-0.5 bg-muted">
                            {qp.subject}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteQuestionPaper(e, qp.id)}
                          className="text-muted-foreground hover:text-[#E52237] transition-colors p-1"
                          title="Delete from library"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <p className="mt-2 text-sm font-bold truncate text-[#09090B] dark:text-foreground">{qp.title}</p>
                      <p className="mt-1 font-mono-score text-xs text-muted-foreground">
                        {qp.pageCount} page(s), {new Date(qp.createdAt).toLocaleDateString()}
                      </p>
                      {isSelected && (
                        <div className="mt-2 flex items-center justify-between border-t border-[#E52237]/40 pt-1.5">
                          <span className="text-[11px] font-bold text-[#E52237] flex items-center gap-1">
                            <CheckCircle2 size={12} /> Active for this evaluation
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearSelectedQuestionPaper();
                            }}
                            className="text-[10px] font-bold text-muted-foreground hover:text-foreground underline"
                          >
                            Deselect
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border-2 border-dashed border-border bg-[#fbfaf7] dark:bg-card/40 p-6 text-center">
                <BookOpen size={24} className="mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-sm font-bold text-[#09090B] dark:text-foreground">No saved question papers in your library yet</p>
                <p className="text-xs text-muted-foreground mt-1">Upload a question paper once, and it will be saved here for re-use.</p>
                <button
                  type="button"
                  onClick={() => setQpMode('upload')}
                  className="mt-3 inline-flex items-center gap-1.5 border-2 border-[#09090B] dark:border-border bg-white dark:bg-secondary px-3.5 py-2 text-xs font-bold text-[#09090B] dark:text-foreground hover:bg-muted shadow-[2px_2px_0_#09090B] dark:shadow-[2px_2px_0_#000] transition-transform hover:translate-x-[1px] hover:translate-y-[1px]"
                >
                  <UploadCloud size={14} className="text-[#E52237]" /> Upload a Question Paper
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => questionInputRef.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => { event.preventDefault(); selectQuestionFile(event.dataTransfer.files); }}
                className={`flex min-h-[130px] w-full flex-col items-center justify-center border-2 border-dashed p-4 text-center transition-colors ${questionFiles.length > 0 ? 'border-[#E52237] bg-[#fef5f6]' : 'border-border bg-[#fbfaf7] hover:border-[#E52237] hover:bg-[#fef5f6]'}`}
                data-testid="button-upload-question-paper"
              >
                {questionFiles.length > 0 ? (
                  <>
                    <span className="grid h-9 w-9 place-items-center bg-[#E52237] text-white">
                      <FileImage size={18} />
                    </span>
                    <span className="mt-2 max-w-full truncate font-display text-sm font-bold">
                      {questionFiles.length} file(s) selected
                    </span>
                    <span className="mt-0.5 font-mono-score text-[10px] text-muted-foreground truncate max-w-full px-2">
                      {questionFiles.map(f => f.name).join(', ')}
                    </span>
                    <span className="mt-2 text-xs font-bold text-[#E52237]">Add more or change</span>
                  </>
                ) : (
                  <>
                    <span className="grid h-9 w-9 place-items-center border-2 border-[#E52237] bg-[#fdf2f4] text-[#E52237]">
                      <UploadCloud size={18} />
                    </span>
                    <span className="mt-2 font-display text-sm font-bold">Upload Question Paper</span>
                    <span className="mt-0.5 text-xs text-muted-foreground">PDFs, images, documents</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => questionCameraInputRef.current?.click()}
                className="flex min-h-[130px] w-full flex-col items-center justify-center border-2 border-dashed border-border bg-[#fbfaf7] p-4 text-center transition-colors hover:border-[#E52237] hover:bg-[#fef5f6]"
              >
                <span className="grid h-9 w-9 place-items-center border-2 border-[#E52237] bg-[#fdf2f4] text-[#E52237]">
                  <ScanSearch size={18} />
                </span>
                <span className="mt-2 font-display text-sm font-bold">Take Photo</span>
                <span className="mt-0.5 text-xs text-muted-foreground">Use device camera</span>
              </button>
            </div>
            <input ref={questionInputRef} type="file" accept="image/*,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,.doc,.docx" multiple className="hidden" onChange={(event) => selectQuestionFile(event.target.files)} data-testid="input-question-paper-image" />
            <input ref={questionCameraInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(event) => selectQuestionFile(event.target.files)} />

            {questionFiles.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={saveQpToLibrary}
                    onChange={(e) => setSaveQpToLibrary(e.target.checked)}
                    className="h-4 w-4 border-2 border-[#09090B] text-[#E52237] focus:ring-0 rounded-none cursor-pointer"
                  />
                  <span className="text-xs font-bold text-[#09090B] dark:text-foreground">
                    Save this question paper to Library for future evaluations
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setQuestionFiles([])}
                  className="text-xs font-bold text-[#E52237] hover:underline"
                >
                  ✕ Remove question paper
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Answer Paper Section */}
      <div className="border-t border-border pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">Answer paper image <span className="text-[#E52237]">*</span></p>
          {files.length > 0 && (
            <button
              type="button"
              onClick={() => setFiles([])}
              className="text-xs font-bold text-[#E52237] hover:underline"
            >
              ✕ Clear selected files
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <button type="button" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); selectFile(event.dataTransfer.files); }} className={`flex min-h-[230px] w-full flex-col items-center justify-center border-2 border-dashed p-6 text-center transition-colors ${files.length > 0 ? 'border-[#E52237] bg-[#fef5f6]' : 'border-border bg-[#fbfaf7] hover:border-[#E52237] hover:bg-[#fef5f6]'}`} data-testid="button-upload-paper">
            {files.length > 0 ? <><span className="grid h-12 w-12 place-items-center bg-[#E52237] text-white"><FileImage size={23} /></span><span className="mt-4 max-w-full truncate font-display text-lg font-bold">{files.length} file(s) selected</span><span className="mt-1 font-mono-score text-[10px] text-muted-foreground">{files.map(f => f.name).join(', ')}</span><span className="mt-4 text-xs font-bold text-[#E52237]">Add more or change</span></> : <><span className="grid h-12 w-12 place-items-center border-2 border-[#E52237] bg-[#fdf2f4] text-[#E52237]"><UploadCloud size={23} /></span><span className="mt-4 font-display text-lg font-bold">Upload Files</span><span className="mt-1 text-sm text-muted-foreground">or drop files here</span><span className="mt-4 text-xs text-muted-foreground">Multiple photos, PDFs, PPTs</span></>}
          </button>
          <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex min-h-[230px] w-full flex-col items-center justify-center border-2 border-dashed border-border bg-[#fbfaf7] p-6 text-center transition-colors hover:border-[#E52237] hover:bg-[#fef5f6]">
            <span className="grid h-12 w-12 place-items-center border-2 border-[#E52237] bg-[#fdf2f4] text-[#E52237]"><ScanSearch size={23} /></span>
            <span className="mt-4 font-display text-lg font-bold">Take Photo</span>
            <span className="mt-1 text-sm text-muted-foreground">Use device camera</span>
          </button>
        </div>
        <input ref={inputRef} type="file" accept="image/*,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,.doc,.docx" multiple className="hidden" onChange={(event) => selectFile(event.target.files)} data-testid="input-paper-image" />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(event) => selectFile(event.target.files)} />
      </div>
      {stage === 'error' && <div className="mt-5 flex gap-3 border-2 border-[#E52237]/40 bg-[#fff0f3] p-4 text-sm" role="alert" data-testid="status-evaluation-error"><AlertCircle className="mt-0.5 shrink-0 text-[#E52237]" size={18} /><div><p className="font-bold text-[#b81528]">We could not finish the evaluation.</p><p className="mt-1 text-muted-foreground">{errorMessage || 'Please check the image and try again.'}</p><button onClick={() => setStage('choose')} className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#b81528] underline" data-testid="button-retry-evaluation"><RotateCcw size={13} /> Try again</button></div></div>}
      <div className="mt-7 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck size={15} className="text-[#E52237]" /> You stay in control of the final review.</p><button onClick={analyze} disabled={files.length === 0 || !studentId} className="inline-flex items-center justify-center gap-2 border-2 border-[#09090B] bg-[#E52237] px-5 py-3 text-sm font-bold text-white paper-shadow disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-analyze-paper"><ScanSearch size={17} /> Analyze paper</button></div>
    </section>
    </div>
  );
}

export default AutomatedEvaluate;