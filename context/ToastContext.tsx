"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  action?: ToastAction;
  duration?: number;
}

interface ToastContextType {
  showToast: (params: {
    message: string;
    type?: ToastType;
    action?: ToastAction;
    duration?: number;
  }) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({
      message,
      type = "success",
      action,
      duration = 5000,
    }: {
      message: string;
      type?: ToastType;
      action?: ToastAction;
      duration?: number;
    }) => {
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      const newToast: ToastItem = { id, message, type, action, duration };

      setToasts((prev) => [newToast, ...prev.slice(0, 3)]); // Keep max 4 toasts

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}

      {/* Floating Toast Notification Container (Bottom Right in RTL) */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-4 right-4 left-4 sm:left-auto sm:right-6 sm:w-96 z-[100] flex flex-col gap-2.5 pointer-events-none"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const isSuccess = toast.type === "success";
            const isError = toast.type === "error";

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                role="status"
                className={cn(
                  "pointer-events-auto p-4 rounded-2xl border shadow-xl flex items-center justify-between gap-3 text-xs md:text-sm font-medium transition-all backdrop-blur-md",
                  isSuccess
                    ? "bg-emerald-50/95 text-emerald-950 border-emerald-300 shadow-emerald-900/10"
                    : isError
                    ? "bg-rose-50/95 text-rose-950 border-rose-300 shadow-rose-900/10"
                    : "bg-slate-900/95 text-white border-slate-700 shadow-slate-950/20"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isSuccess ? (
                    <CheckCircle2
                      className="w-5 h-5 text-emerald-600 shrink-0"
                      aria-hidden="true"
                    />
                  ) : isError ? (
                    <AlertCircle
                      className="w-5 h-5 text-rose-600 shrink-0"
                      aria-hidden="true"
                    />
                  ) : (
                    <Info
                      className="w-5 h-5 text-teal-400 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <span className="leading-snug break-words">{toast.message}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {toast.action && (
                    <button
                      type="button"
                      onClick={() => {
                        toast.action?.onClick();
                        removeToast(toast.id);
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                        isSuccess
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                          : "bg-white/20 hover:bg-white/30 text-white"
                      )}
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{toast.action.label}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => removeToast(toast.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-black/5 transition-colors cursor-pointer"
                    aria-label="إغلاق التنبيه"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
