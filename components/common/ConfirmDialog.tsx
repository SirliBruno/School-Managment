"use client";

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "primary";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "حذف نهائياً",
  cancelLabel = "إلغاء",
  variant = "danger",
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  // Focus cancel button or container for safety when opening destructive action
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => {
            if (!isLoading) onCancel();
          }}
          aria-hidden="true"
        />

        {/* Dialog Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 overflow-hidden z-10 text-right space-y-4"
        >
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                variant === "danger"
                  ? "bg-rose-50 text-rose-600 border border-rose-200"
                  : variant === "warning"
                  ? "bg-amber-50 text-amber-600 border border-amber-200"
                  : "bg-teal-50 text-[#137a85] border border-teal-200"
              )}
            >
              {variant === "danger" ? (
                <Trash2 className="w-6 h-6" aria-hidden="true" />
              ) : (
                <AlertTriangle className="w-6 h-6" aria-hidden="true" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3
                id="confirm-dialog-title"
                className="text-base font-bold text-slate-900"
              >
                {title}
              </h3>
              <p
                id="confirm-dialog-description"
                className="text-xs text-slate-600 mt-1.5 leading-relaxed"
              >
                {message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!isLoading) onCancel();
              }}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              {cancelLabel}
            </button>

            <motion.button
              ref={confirmButtonRef}
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={cn(
                "w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60",
                variant === "danger"
                  ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                  : variant === "warning"
                  ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                  : "bg-[#137a85] hover:bg-teal-700 shadow-teal-700/20"
              )}
            >
              {isLoading ? (
                <span>جاري التنفيذ...</span>
              ) : (
                <span>{confirmLabel}</span>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
