import { useEffect, useState } from 'react';
import { RotateCcw, X, Check } from 'lucide-react';

export type UndoAction = {
  id: string;
  message: string;
  onUndo: () => void | Promise<void>;
};

type UndoBannerProps = {
  action: UndoAction | null;
  onDismiss: () => void;
};

export function UndoBanner({ action, onDismiss }: UndoBannerProps) {
  const [progress, setProgress] = useState(100);
  const [undone, setUndone] = useState(false);

  useEffect(() => {
    if (!action) return;
    setProgress(100);
    setUndone(false);

    const DURATION = 10000; // 10 seconds
    const INTERVAL = 50;
    const step = (INTERVAL / DURATION) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - step;
      });
    }, INTERVAL);

    // Global keyboard listener for Ctrl+Z / Cmd+Z
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing inside an input or textarea
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleTriggerUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [action]);

  if (!action) return null;

  const handleTriggerUndo = async () => {
    try {
      setUndone(true);
      await action.onUndo();
      setTimeout(() => {
        onDismiss();
      }, 1200);
    } catch (err) {
      console.error('Failed to undo:', err);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 w-full max-w-md px-4 pointer-events-none animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="pointer-events-auto overflow-hidden border-2 border-[#09090B] bg-[#09090B] p-4 text-white shadow-[6px_6px_0_#E52237] flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {undone ? (
              <span className="grid h-7 w-7 shrink-0 place-items-center bg-[#10B981] text-white">
                <Check size={16} strokeWidth={3} />
              </span>
            ) : (
              <span className="grid h-7 w-7 shrink-0 place-items-center bg-[#E52237] text-white">
                <RotateCcw size={15} />
              </span>
            )}
            <p className="truncate text-xs font-semibold text-white">
              {undone ? 'Action restored successfully!' : action.message}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!undone && (
              <button
                type="button"
                onClick={handleTriggerUndo}
                className="flex items-center gap-1.5 border-2 border-[#10B981] bg-[#10B981] px-3 py-1.5 font-mono-score text-xs font-bold text-white shadow-[2px_2px_0_#09090B] hover:bg-[#0ea572] active:translate-x-[1px] active:translate-y-[1px] transition-all"
                data-testid="button-undo-action"
              >
                <RotateCcw size={12} /> UNDO
                <span className="hidden sm:inline opacity-75 font-normal text-[10px]">(Ctrl+Z)</span>
              </button>
            )}
            <button
              type="button"
              onClick={onDismiss}
              className="grid h-7 w-7 place-items-center text-white/50 hover:text-white transition-colors"
              title="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Progress Countdown Bar */}
        {!undone && (
          <div className="h-1 w-full bg-white/20 overflow-hidden">
            <div
              className="h-full bg-[#10B981] transition-all duration-75 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
