import React, { useEffect } from 'react';
import { RotateCcw, AlertTriangle, X } from 'lucide-react';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="reset-confirm-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="reset-confirm-modal-dialog"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200/90 transition-transform"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-modal-title"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h3 id="reset-modal-title" className="text-base font-bold text-slate-900 font-display">
                Reset to Default Data
              </h3>
              <p className="text-xs text-slate-500">Restore default initial state</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-3.5 border border-slate-200/80 text-xs text-slate-600 space-y-2">
          <p className="font-medium text-slate-800">
            This operation will perform the following resets:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-600 text-[12px]">
            <li>Restore all transactions to default sample expenses for the current month</li>
            <li>Reset all category budgets back to standard default limits (₹0)</li>
            <li>Clear any active category or search filters</li>
            <li>Navigate view back to the current active month</li>
          </ul>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            id="btn-cancel-reset"
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="btn-confirm-reset"
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-semibold text-white shadow-2xs transition active:scale-[0.98] cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Yes, Reset to Default</span>
          </button>
        </div>
      </div>
    </div>
  );
};
