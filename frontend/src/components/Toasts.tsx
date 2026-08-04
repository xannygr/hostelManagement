import { X, CheckCircle2, AlertTriangle } from 'lucide-react';

export interface ToastItem {
  id: number;
  type: 'error' | 'success';
  message: string;
}

export function Toasts({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 text-sm text-white shadow-lg ${
            t.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
          }`}
        >
          {t.type === 'error' ? (
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          )}
          <span className="flex-1 leading-snug">{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            className="shrink-0 rounded-md p-1 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Закрыть"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
