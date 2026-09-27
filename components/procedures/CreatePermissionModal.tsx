"use client";

import React, { useState, useEffect, useId, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  DoorOpen,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileText,
  User,
  Sparkles,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { useToast } from "@/context/ToastContext";
import { useAuth, DEFAULT_ADMIN_NAME } from "@/context/AuthContext";
import { Teacher, EmployeePermission } from "@/types/teacher";
import { TeacherCombobox } from "@/components/procedures/TeacherCombobox";
import { calculateTimeDifference, getSaudiToday } from "@/lib/timeUtils";
import { cn } from "@/lib/utils";

interface CreatePermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissionToEdit?: EmployeePermission | null;
  preselectedTeacherId?: string;
}

export const CreatePermissionModal: React.FC<CreatePermissionModalProps> = ({
  isOpen,
  onClose,
  permissionToEdit,
  preselectedTeacherId,
}) => {
  const { user } = useAuth();
  const { teachers, createPermission, updatePermission } = useTeachers();
  const { showToast } = useToast();

  const titleId = useId();
  const descId = useId();

  // Form State
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [permissionDate, setPermissionDate] = useState<string>("");
  const [exitTime, setExitTime] = useState<string>("09:15");
  const [returnTime, setReturnTime] = useState<string>("10:00");
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Reset or Populate on Open / Edit
  useEffect(() => {
    if (!isOpen) return;

    if (permissionToEdit) {
      setSelectedTeacherId(permissionToEdit.teacherId);
      setPermissionDate(permissionToEdit.permissionDate);
      setExitTime(permissionToEdit.exitTime);
      setReturnTime(permissionToEdit.returnTime);
      setReason(permissionToEdit.reason);
      setNotes(permissionToEdit.notes || "");
    } else {
      setSelectedTeacherId(preselectedTeacherId || "");
      setPermissionDate(getSaudiToday());
      setExitTime("09:15");
      setReturnTime("10:00");
      setReason("");
      setNotes("");
    }
    setFormErrors({});
  }, [isOpen, permissionToEdit, preselectedTeacherId]);

  // Selected Teacher Info
  const selectedTeacher = useMemo<Teacher | null>(() => {
    return teachers.find((t) => t.id === selectedTeacherId) || null;
  }, [teachers, selectedTeacherId]);

  // Real-time Duration Calculation
  const durationCalc = useMemo(() => {
    if (!exitTime || !returnTime) {
      return { totalMinutes: 0, text: "0 دقيقة", isValid: false, error: "" };
    }
    const diff = calculateTimeDifference(exitTime, returnTime);
    if (!diff.isValid) {
      return {
        totalMinutes: 0,
        text: "وقت غير صالح",
        isValid: false,
        error: diff.error || "وقت العودة يجب أن يكون بعد وقت الخروج",
      };
    }
    return {
      totalMinutes: diff.totalMinutes,
      text: diff.formattedDuration,
      isValid: true,
      error: "",
    };
  }, [exitTime, returnTime]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!selectedTeacherId) {
      errors.teacher = "يرجى اختيار الموظفة المستأذنة";
    }
    if (!permissionDate) {
      errors.date = "يرجى تحديد تاريخ الاستئذان";
    }
    if (!exitTime) {
      errors.exitTime = "يرجى تحديد وقت الخروج";
    }
    if (!returnTime) {
      errors.returnTime = "يرجى تحديد وقت العودة";
    }
    if (!durationCalc.isValid) {
      errors.timeRange = durationCalc.error || "وقت العودة يجب أن يكون بعد وقت الخروج";
    }
    if (!reason.trim()) {
      errors.reason = "يرجى كتابة سبب / مبررات الاستئذان";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      if (permissionToEdit) {
        const res = updatePermission(permissionToEdit.id, {
          permissionDate,
          exitTime,
          returnTime,
          durationMinutes: durationCalc.totalMinutes,
          reason: reason.trim(),
          notes: notes.trim() || undefined,
        });

        if (!res.success) {
          showToast({ message: res.error || "تعذر تعديل الاستئذان", type: "error" });
          setIsSubmitting(false);
          return;
        }

        showToast({
          message: "تم تحديث سجل الاستئذان بنجاح",
          type: "success",
        });
      } else {
        const res = createPermission({
          teacherId: selectedTeacherId,
          teacherName: selectedTeacher?.fullName || selectedTeacher?.name,
          nationalId: selectedTeacher?.nationalId,
          jobNumber: selectedTeacher?.jobNumber,
          specialty: selectedTeacher?.specialty,
          permissionDate,
          exitTime,
          returnTime,
          durationMinutes: durationCalc.totalMinutes,
          reason: reason.trim(),
          notes: notes.trim() || undefined,
          createdByName: user?.fullName || DEFAULT_ADMIN_NAME,
        });

        if (!res.success) {
          showToast({ message: res.error || "تعذر حفظ الاستئذان", type: "error" });
          setIsSubmitting(false);
          return;
        }

        showToast({
          message: `تم توثيق استئذان المعلمة (${selectedTeacher?.fullName || ""}) بمدة ${durationCalc.text}`,
          type: "success",
        });
      }

      onClose();
    } catch {
      showToast({ message: "حدث خطأ غير متوقع أثناء الحفظ", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full overflow-hidden text-right flex flex-col max-h-[92vh] z-10"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/80 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-[#137a85] dark:text-teal-400 flex items-center justify-center shadow-2xs shrink-0">
                <DoorOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 id={titleId} className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                  {permissionToEdit ? "تعديل سجل استئذان" : "تسجيل استئذان موظفة جديد"}
                </h2>
                <p id={descId} className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  توثيق خروج وعودة الموظفة أثناء الدوام الرسمي واحتساب المدة
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
            {/* Step 1: Teacher Selection */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#137a85] dark:text-teal-400" />
                <span>اختيار الموظفة المعنية</span>
                <span className="text-rose-500">*</span>
              </label>

              <TeacherCombobox
                teachers={teachers.filter((t) => !t.isArchived)}
                selectedTeacherId={selectedTeacherId}
                onSelect={(t) => {
                  setSelectedTeacherId(t ? t.id : "");
                  if (formErrors.teacher) {
                    setFormErrors((prev) => {
                      const next = { ...prev };
                      delete next.teacher;
                      return next;
                    });
                  }
                }}
                disabled={Boolean(permissionToEdit)}
                error={formErrors.teacher}
              />

              {/* Selected Teacher Quick Badge */}
              {selectedTeacher && (
                <div className="p-3 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-black text-slate-900 dark:text-slate-100 block">{selectedTeacher.fullName}</span>
                    <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] block">
                      هوية: {selectedTeacher.nationalId} • التخصص: {selectedTeacher.specialty || "عام"}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-teal-100/80 dark:bg-teal-900/60 text-[#137a85] dark:text-teal-300 font-bold text-[11px]">
                    {selectedTeacher.jobTitle || "معلم"}
                  </span>
                </div>
              )}
            </div>

            {/* Step 2: Date & Times */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>تاريخ الاستئذان</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={permissionDate}
                  onChange={(e) => setPermissionDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#137a85]"
                />
                {formErrors.date && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold">{formErrors.date}</p>
                )}
              </div>

              {/* Exit Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>وقت الخروج (HH:MM)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  value={exitTime}
                  onChange={(e) => setExitTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold font-mono text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#137a85]"
                />
                {formErrors.exitTime && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold">{formErrors.exitTime}</p>
                )}
              </div>

              {/* Return Time */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>وقت العودة (HH:MM)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setReturnTime("13:30");
                      if (!notes) setNotes("استئذان حتى نهاية الدوام الرسمي (بدون عودة)");
                    }}
                    className="text-[10px] font-bold text-[#137a85] dark:text-teal-400 hover:underline cursor-pointer bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-800"
                    title="تعبئة تلقائية لنهاية الدوام الرسمي"
                  >
                    بدون عودة (13:30)
                  </button>
                </div>
                <input
                  type="time"
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold font-mono text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#137a85]"
                />
                {formErrors.returnTime && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold">{formErrors.returnTime}</p>
                )}
              </div>
            </div>

            {/* Calculated Duration Banner */}
            <div
              className={cn(
                "p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all",
                durationCalc.isValid
                  ? durationCalc.totalMinutes >= 420
                    ? "bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200"
                    : "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200"
                  : "bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80 text-rose-900 dark:text-rose-200"
              )}
            >
              <div className="flex items-center gap-2">
                {durationCalc.isValid ? (
                  durationCalc.totalMinutes >= 420 ? (
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <div className="text-xs font-bold">
                  {durationCalc.isValid ? (
                    <div>
                      <span>
                        مدة الاستئذان المحتسبة:{" "}
                        <strong className="text-emerald-800 dark:text-emerald-400 text-sm font-black underline">
                          {durationCalc.text}
                        </strong>
                      </span>
                      {durationCalc.totalMinutes >= 420 && (
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold mt-0.5">
                          تنبيه نظامي: بلغت المدة يوم عمل كامل (420 دقيقة / 7 ساعات)، وفق اللائحة يفضل توثيقها كإجازة أو غياب.
                        </p>
                      )}
                    </div>
                  ) : (
                    <span>{durationCalc.error || "يرجى تحديد أوقات خروج وعودة صحيحة"}</span>
                  )}
                </div>
              </div>

              {durationCalc.isValid && (
                <span className="font-mono text-xs font-black bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 shrink-0 self-start sm:self-auto">
                  {durationCalc.totalMinutes} دقيقة
                </span>
              )}
            </div>

            {/* Step 3: Reason & Justifications */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#137a85] dark:text-teal-400" />
                <span>مبررات وسبب الخروج</span>
                <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (formErrors.reason) {
                    setFormErrors((prev) => {
                      const next = { ...prev };
                      delete next.reason;
                      return next;
                    });
                  }
                }}
                placeholder="مثال: مراجعة مستشفى حكومي، ظرف عائلي طارئ، مهمة تدريبية خارجية..."
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#137a85]"
              />
              {formErrors.reason && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold">{formErrors.reason}</p>
              )}
            </div>

            {/* Step 4: Notes (Optional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                ملاحظات إضافية من الإدارة (اختياري)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: تم إسناد حصص الانتظار للزميلة أمل..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#137a85]"
              />
            </div>
          </form>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50/70 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !durationCalc.isValid}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-[#137a85] text-white hover:bg-teal-700 shadow-2xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{isSubmitting ? "جاري الحفظ..." : permissionToEdit ? "تحديث الاستئذان" : "اعتماد وتوثيق الاستئذان"}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
