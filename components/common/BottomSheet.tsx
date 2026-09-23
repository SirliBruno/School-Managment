"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  maxWidthClass?: string;
  hideCloseButton?: boolean;
}

/**
 * مكوّن BottomSheet موحد للجوال:
 * - على الجوال (< 768px): يرتفع من أسفل الشاشة بارتفاع يصل إلى 90vh مع مقبض سحب وإمكانية السحب للإغلاق.
 * - على الديسكتوب (>= 768px): يتحول تلقائياً إلى Modal متمركز وأنيق.
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  className,
  maxWidthClass = "max-w-xl",
  hideCloseButton = false,
}) => {
  // إغلاق النافذة بزر Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // قفل تمرير الصفحة أثناء فتح النافذة
  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isOpen]);

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    // إذا سحب المستخدم للأسفل أكثر من 100px أو بسرعة عالية
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4"
        >
          {/* Animated Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet / Modal Window */}
          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            className={cn(
              "relative bg-white z-10 w-full flex flex-col text-right overflow-hidden shadow-2xl",
              // Mobile BottomSheet styling:
              "rounded-t-3xl max-h-[92vh] pb-safe",
              // Desktop Modal styling:
              "md:rounded-3xl md:max-h-[88vh] md:drag-none",
              maxWidthClass,
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Handle Bar */}
            <div className="md:hidden flex items-center justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1.5 rounded-full bg-slate-300" />
            </div>

            {/* Header */}
            {(title || !hideCloseButton) && (
              <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/70 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {icon && (
                    <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#137a85] flex items-center justify-center shrink-0 shadow-sm">
                      {icon}
                    </div>
                  )}
                  <div className="min-w-0">
                    {title && (
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                        {title}
                      </h3>
                    )}
                    {subtitle && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {!hideCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-11 h-11 rounded-xl bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    aria-label="إغلاق النافذة"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 p-5 sm:p-6 custom-scrollbar space-y-4">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="p-4 sm:px-6 bg-slate-50/80 border-t border-slate-100 shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
