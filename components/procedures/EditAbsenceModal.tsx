"use client";

import React, { useState, useEffect, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  AlertOctagon,
  Stethoscope,
  Users2,
  HelpCircle,
  AlertCircle,
  Save,
  Loader2,
  Lock,
  FileText,
  User,
  Check,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { useToast } from "@/context/ToastContext";
import { AbsenceRecord, AbsenceType } from "@/types/teacher";
import { cn } from "@/lib/utils";
import { getSaudiToday } from "@/lib/timeUtils";

interface EditAbsenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AbsenceRecord | null;
  onSaved?: (updatedRecord: AbsenceRecord) => void;
}

const ABSENCE_TYPES: {
  type: AbsenceType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
}[] = [
  {
    type: "اضطراري",
    label: "اضطراري",
    description: "ظرف عائلي أو شخصي طارئ",
    icon: AlertOctagon,
    colorClass: "border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/50 hover:border-blue-400 dark:hover:border-blue-700",
  },
  {
    type: "مرضي",
    label: "مرضي",
    description: "إجازة أو تقرير طبي معتمد",
    icon: Stethoscope,
    colorClass: "border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/50 hover:border-emerald-400 dark:hover:border-emerald-700",
  },
  {
    type: "مرافق",
    label: "مرافق",
    description: "مرافقة مريض بتقرير طبي",
    icon: Users2,
    colorClass: "border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 bg-purple-50/70 dark:bg-purple-950/50 hover:border-purple-400 dark:hover:border-purple-700",
  },
  {
    type: "أخرى",
    label: "أخرى",
    description: "أسباب إدارية أو استثنائية",
    icon: HelpCircle,
    colorClass: "border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/50 hover:border-amber-400 dark:hover:border-amber-700",
  },
];

export const EditAbsenceModal: React.FC<EditAbsenceModalProps> = ({
  isOpen,
  onClose,
  record,
  onSaved,
}) => {
  const { updateAbsenceRecord } = useTeachers();
  const { showToast } = useToast();

  const [absenceDate, setAbsenceDate] = useState("");
  const [absenceType, setAbsenceType] = useState<AbsenceType>("اضطراري");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formId = useId();

  // Populate data when record changes
  useEffect(() => {
    if (record && isOpen) {
      setAbsenceDate(record.date || getSaudiToday());
      setAbsenceType(record.type || "اضطراري");
      setReason(record.reason || "");
      setNotes(record.notes || "");
      setErrors({});
    }
  }, [record, isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!absenceDate) {
      newErrors.date = "يرجى تحديد تاريخ الغياب.";
    }

    if (!reason.trim()) {
      newErrors.reason = "يرجى كتابة سبب أو مبرر الغياب.";
    } else if (reason.trim().length < 3) {
      newErrors.reason = "يرجى كتابة سبب واضح ومفصل (3 أحرف على الأقل).";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const result = updateAbsenceRecord(record.id, {
        date: absenceDate,
        type: absenceType,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });

      if (!result.success) {
        setErrors({ general: result.error || "حدث خطأ أثناء حفظ التعديلات." });
        setIsSubmitting(false);
        return;
      }

      showToast({
        message: `تم تحديث سجل غياب المعلمة (${record.teacherName}) بنجاح.`,
        type: "success",
      });

      if (onSaved && result.record) {
        onSaved(result.record);
      }

      onClose();
    } catch (err: any) {
      setErrors({
        general: err?.message || "تعذر حفظ التعديلات، يرجى المحاولة مرة أخرى.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !record) return null;

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-absence-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={isSubmitting ? undefined : onClose}
          aria-hidden="true"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 320 }}
          className="relative bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 z-10 max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800/60">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3
                  id="edit-absence-title"
                  className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug"
                >
                  تعديل سجل الغياب
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  تحديث بيانات وتاريخ ومبرر غياب المعلمة
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              aria-label="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Form Content */}
          <form
            id={formId}
            onSubmit={handleSubmit}
            className="space-y-4 sm:space-y-5 overflow-y-auto flex-1 pr-0.5 pl-0.5"
          >
            {/* 1. Read-Only Teacher Info Banner */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-3.5 sm:p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <User className="w-4 h-4 text-[#137a85] dark:text-teal-400" />
                  <span>المعلمة المسند إليها الغياب</span>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-semibold">
                  <Lock className="w-3 h-3" />
                  للقراءة فقط
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {record.teacherName}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                  <span>
                    رقم الهوية:{" "}
                    <strong className="font-mono text-slate-800 dark:text-slate-200">
                      {record.nationalId || record.jobNumber || "—"}
                    </strong>
                  </span>
                  {record.specialty && (
                    <span className="text-slate-400 dark:text-slate-500">• {record.specialty}</span>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-0.5">
                * لتغيير المعلمة، يرجى حذف هذا السجل وإنشاء سجل غياب جديد للمعلمة المقصودة.
              </p>
            </div>

            {/* 2. PDF Notice Banner */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 sm:p-3.5 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                <strong>تنبيه إداري:</strong> بعد تعديل بيانات أو تاريخ هذا الغياب، يجب إعادة تصدير استمارة الغياب بصيغة PDF لضمان مطابقة المستند الورقي مع النظام.
              </div>
            </div>

            {/* General Error Display */}
            {errors.general && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{errors.general}</span>
              </div>
            )}

            {/* 3. Absence Date Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-absence-date"
                className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300"
              >
                تاريخ الغياب <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar
                  className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="edit-absence-date"
                  type="date"
                  value={absenceDate}
                  onChange={(e) => {
                    setAbsenceDate(e.target.value);
                    if (errors.date) setErrors((prev) => ({ ...prev, date: "" }));
                  }}
                  className={cn(
                    "w-full pl-3 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border bg-slate-50/60 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 transition-all font-mono",
                    errors.date
                      ? "border-rose-400 focus:ring-rose-400/20 focus:border-rose-500"
                      : "border-slate-200 dark:border-slate-700 focus:ring-[#137a85]/20 focus:border-[#137a85]"
                  )}
                />
              </div>
              {errors.date && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{errors.date}</p>
              )}
            </div>

            {/* 4. Absence Type Selector */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                نوع الغياب <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ABSENCE_TYPES.map((t) => {
                  const Icon = t.icon;
                  const isSelected = absenceType === t.type;

                  return (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() => setAbsenceType(t.type)}
                      className={cn(
                        "relative flex flex-col items-center justify-center p-3 rounded-xl border-2 text-center transition-all cursor-pointer min-h-[76px]",
                        isSelected
                          ? "border-[#137a85] bg-teal-50/50 dark:bg-teal-950/40 shadow-xs font-bold text-slate-900 dark:text-slate-100"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 font-medium"
                      )}
                    >
                      {isSelected && (
                        <span className="absolute top-1.5 left-1.5 w-4 h-4 bg-[#137a85] text-white rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                      <Icon
                        className={cn(
                          "w-5 h-5 mb-1.5",
                          isSelected ? "text-[#137a85] dark:text-teal-400" : "text-slate-400 dark:text-slate-500"
                        )}
                      />
                      <span className="text-xs">{t.label}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">
                        {t.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Reason Textarea */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-absence-reason"
                className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300"
              >
                سبب / مبرر الغياب <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="edit-absence-reason"
                rows={3}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (errors.reason) setErrors((prev) => ({ ...prev, reason: "" }));
                }}
                placeholder="اكتبي سبب الغياب كما ورد من المعلمة أو الإدارة..."
                className={cn(
                  "w-full p-3 text-xs sm:text-sm rounded-xl border bg-slate-50/60 dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 transition-all resize-none",
                  errors.reason
                    ? "border-rose-400 focus:ring-rose-400/20 focus:border-rose-500"
                    : "border-slate-200 dark:border-slate-700 focus:ring-[#137a85]/20 focus:border-[#137a85]"
                )}
              />
              {errors.reason && (
                <p className="text-xs text-rose-600 dark:text-rose-400">{errors.reason}</p>
              )}
            </div>

            {/* 6. Administrative Notes (Optional) */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-absence-notes"
                className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                ملاحظات إدارية (اختياري)
              </label>
              <textarea
                id="edit-absence-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي ملاحظات إدارية أو إحالة..."
                className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#137a85]/20 focus:border-[#137a85] transition-all resize-none"
              />
            </div>
          </form>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50 min-h-[44px]"
            >
              إلغاء
            </button>
            <button
              type="submit"
              form={formId}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#137a85] hover:bg-[#0f626b] transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer disabled:opacity-50 inline-flex items-center gap-2 min-h-[44px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جارٍ الحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>حفظ التعديلات</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
