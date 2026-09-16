"use client";

import React, { useState, useId, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  FileText,
  AlertOctagon,
  CheckCircle2,
  Stethoscope,
  Users2,
  HelpCircle,
  Clock,
  RotateCcw,
  Save,
  AlertCircle,
  Check,
  FileDown,
  Loader2,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { AbsenceRecord, AbsenceType, Teacher } from "@/types/teacher";
import { TeacherCombobox } from "@/components/procedures/TeacherCombobox";
import { printAbsencePdf } from "@/lib/printPdfService";
import { cn } from "@/lib/utils";

interface AbsenceFormProps {
  onSuccess?: () => void;
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
    colorClass: "border-blue-200 text-blue-700 hover:border-blue-400",
  },
  {
    type: "مرضي",
    label: "مرضي",
    description: "إجازة أو تقرير طبي معتمد",
    icon: Stethoscope,
    colorClass: "border-emerald-200 text-emerald-700 hover:border-emerald-400",
  },
  {
    type: "مرافق",
    label: "مرافق",
    description: "مرافقة مريض بتقرير طبي",
    icon: Users2,
    colorClass: "border-purple-200 text-purple-700 hover:border-purple-400",
  },
  {
    type: "أخرى",
    label: "أخرى",
    description: "أسباب إدارية أو استثنائية",
    icon: HelpCircle,
    colorClass: "border-amber-200 text-amber-700 hover:border-amber-400",
  },
];

export const AbsenceForm: React.FC<AbsenceFormProps> = ({ onSuccess }) => {
  const { teachers, recordAbsence } = useTeachers();

  // Form states
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [absenceDate, setAbsenceDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [absenceType, setAbsenceType] = useState<AbsenceType>("اضطراري");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  // Validation & UI states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExportingDirect, setIsExportingDirect] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [lastSavedRecord, setLastSavedRecord] = useState<AbsenceRecord | null>(null);
  const [lastSavedTeacher, setLastSavedTeacher] = useState<Teacher | null>(null);

  const formId = useId();

  const handleTeacherSelect = (teacher: Teacher | null) => {
    if (teacher) {
      setSelectedTeacherId(teacher.id);
      setSelectedTeacher(teacher);
      setErrors((prev) => ({ ...prev, teacherId: "" }));
    } else {
      setSelectedTeacherId("");
      setSelectedTeacher(null);
    }
  };

  const handleReset = () => {
    setSelectedTeacherId("");
    setSelectedTeacher(null);
    setAbsenceDate(new Date().toISOString().split("T")[0]);
    setAbsenceType("اضطراري");
    setReason("");
    setNotes("");
    setErrors({});
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedTeacherId) {
      newErrors.teacherId = "يرجى اختيار المعلمة من القائمة.";
    }

    if (!absenceDate) {
      newErrors.date = "يرجى تحديد تاريخ الغياب.";
    }

    if (!reason.trim()) {
      newErrors.reason = "سبب الغياب مطلوب لإصدار نموذج المساءلة.";
    } else if (reason.trim().length < 3) {
      newErrors.reason = "يرجى كتابة سبب غياب واضح ومفصل (3 أحرف على الأقل).";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveRecord = (): AbsenceRecord | null => {
    if (!validate() || !selectedTeacher) return null;

    const teacherSnapshot = {
      ...selectedTeacher,
      totalAbsences: (selectedTeacher.totalAbsences || 0) + 1,
    };

    const newRecord = recordAbsence({
      teacherId: selectedTeacher.id,
      teacherName: selectedTeacher.fullName || selectedTeacher.name || "معلمة",
      jobNumber: selectedTeacher.username || selectedTeacher.jobNumber || "—",
      specialty: selectedTeacher.specialty || selectedTeacher.teachingField || "عام",
      date: absenceDate,
      type: absenceType,
      reason: reason.trim(),
      notes: notes.trim() || undefined,
    });

    setLastSavedRecord(newRecord);
    setLastSavedTeacher(teacherSnapshot);

    return newRecord;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      const newRecord = saveRecord();
      if (!newRecord) {
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(
        `تم تسجيل إجراء مساءلة الغياب للمعلمة (${newRecord.teacherName}) بنجاح وزيادة رصيد الغياب إلى ${
          (selectedTeacher?.totalAbsences || 0) + 1
        }.`
      );

      handleReset();
      if (onSuccess) onSuccess();

      setTimeout(() => {
        setSuccessMessage(null);
      }, 7000);
    } catch (err) {
      console.error("خطأ أثناء تسجيل الغياب:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndExportPdf = async () => {
    if (!validate() || !selectedTeacher) return;

    setIsExportingDirect(true);
    try {
      const teacherSnapshot = {
        ...selectedTeacher,
        totalAbsences: (selectedTeacher.totalAbsences || 0) + 1,
      };

      const newRecord = recordAbsence({
        teacherId: selectedTeacher.id,
        teacherName: selectedTeacher.fullName || selectedTeacher.name || "معلمة",
        jobNumber: selectedTeacher.username || selectedTeacher.jobNumber || "—",
        specialty: selectedTeacher.specialty || selectedTeacher.teachingField || "عام",
        date: absenceDate,
        type: absenceType,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });

      setLastSavedRecord(newRecord);
      setLastSavedTeacher(teacherSnapshot);

      // Send directly to print service
      try {
        printAbsencePdf({
          teacherName: newRecord.teacherName,
          username: newRecord.jobNumber,
          specialty: newRecord.specialty,
          jobTitle: teacherSnapshot.jobTitle || "معلم",
          employmentStatus: teacherSnapshot.employmentStatus || "دائم",
          absenceCount: teacherSnapshot.totalAbsences || 1,
          absenceDate: newRecord.date,
          absenceType: newRecord.type,
          absenceReason: newRecord.reason,
        });

        setSuccessMessage(
          `تم حفظ المساءلة وتجهيز استمارة الـ PDF للطباعة للمعلمة (${newRecord.teacherName}) بنجاح.`
        );

        handleReset();
        if (onSuccess) onSuccess();
      } catch (exportErr) {
        console.error("فشل طباعة ملف PDF:", exportErr);
      } finally {
        setIsExportingDirect(false);
      }
    } catch (err) {
      console.error("خطأ أثناء الحفظ والتصدير:", err);
      setIsExportingDirect(false);
    }
  };

  const handleDownloadLastPdf = () => {
    if (!lastSavedRecord || !lastSavedTeacher) return;

    try {
      printAbsencePdf({
        teacherName: lastSavedRecord.teacherName,
        username: lastSavedRecord.jobNumber,
        specialty: lastSavedRecord.specialty,
        jobTitle: lastSavedTeacher.jobTitle || "معلم",
        employmentStatus: lastSavedTeacher.employmentStatus || "دائم",
        absenceCount: lastSavedTeacher.totalAbsences || 1,
        absenceDate: lastSavedRecord.date,
        absenceType: lastSavedRecord.type,
        absenceReason: lastSavedRecord.reason,
      });
    } catch (err) {
      console.error("فشل طباعة ملف PDF:", err);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

      {/* Form Card Header */}
      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#137a85]" />
            <span>تسجيل إجراء مساءلة غياب جديد</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            توثيق غياب المعلمة وإصدار نموذج المساءلة الإدارية وفق اللوائح المدرسية
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-[#137a85]" />
          <span>التوثيق الفوري</span>
        </div>
      </div>

      {/* Success Toast with Direct PDF Download Shortcut */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            role="alert"
            className="m-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm shadow-sm"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">تم حفظ الإجراء بنجاح!</p>
                <p className="text-xs opacity-90 mt-0.5">{successMessage}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {lastSavedRecord && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={handleDownloadLastPdf}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#137a85] text-white hover:bg-teal-700 transition-colors shadow-2xs cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  <span>تحميل استمارة PDF</span>
                </motion.button>
              )}
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-1 rounded-lg hover:bg-emerald-100/60"
              >
                إغلاق
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Row 1: Teacher Combobox & Absence Date */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-8">
            <TeacherCombobox
              teachers={teachers}
              selectedTeacherId={selectedTeacherId}
              onSelect={handleTeacherSelect}
              error={errors.teacherId}
              disabled={isSubmitting || isExportingDirect}
            />
          </div>

          <div className="md:col-span-4 space-y-1.5">
            <label
              htmlFor={`${formId}-date`}
              className="block text-xs font-bold text-slate-700"
            >
              تاريخ الغياب <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar
                className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id={`${formId}-date`}
                type="date"
                value={absenceDate}
                onChange={(e) => {
                  setAbsenceDate(e.target.value);
                  setErrors((prev) => ({ ...prev, date: "" }));
                }}
                className={cn(
                  "w-full px-3.5 py-2.5 rounded-xl border text-xs md:text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 transition-all shadow-2xs",
                  errors.date
                    ? "border-rose-400 focus:ring-rose-200"
                    : "border-slate-200 focus:border-[#137a85] focus:ring-[#137a85]/20"
                )}
              />
            </div>
            {errors.date && (
              <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.date}</span>
              </p>
            )}
          </div>
        </div>

        {/* Row 2: Absence Type (Segmented Cards) */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            نوع الغياب <span className="text-rose-500">*</span>
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ABSENCE_TYPES.map((item) => {
              const Icon = item.icon;
              const isSelected = absenceType === item.type;

              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setAbsenceType(item.type)}
                  className={cn(
                    "p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-2 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85]",
                    isSelected
                      ? "bg-teal-50/70 border-[#137a85] ring-2 ring-[#137a85]/20 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                        isSelected
                          ? "bg-[#137a85] text-white"
                          : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div
                      className={cn(
                        "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                        isSelected
                          ? "border-[#137a85] bg-[#137a85] text-white"
                          : "border-slate-300 bg-white"
                      )}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5" />}
                    </div>
                  </div>

                  <div>
                    <span
                      className={cn(
                        "block text-xs md:text-sm font-bold",
                        isSelected ? "text-[#137a85]" : "text-slate-800"
                      )}
                    >
                      {item.label}
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-0.5 leading-tight">
                      {item.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: Reason for Absence */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor={`${formId}-reason`}
              className="block text-xs font-bold text-slate-700"
            >
              سبب الغياب (مطلوب) <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400">
              {reason.length}/200 حرف
            </span>
          </div>
          <textarea
            id={`${formId}-reason`}
            rows={3}
            maxLength={200}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setErrors((prev) => ({ ...prev, reason: "" }));
            }}
            placeholder="اكتبي سبب الغياب الموضح من المعلمة أو سبب رصد المساءلة بالتفصيل..."
            className={cn(
              "w-full p-3.5 rounded-xl border text-xs md:text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all shadow-2xs resize-none",
              errors.reason
                ? "border-rose-400 focus:ring-rose-200"
                : "border-slate-200 focus:border-[#137a85] focus:ring-[#137a85]/20"
            )}
          />
          {errors.reason && (
            <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors.reason}</span>
            </p>
          )}
        </div>

        {/* Row 4: Additional Notes (Optional) */}
        <div className="space-y-1.5">
          <label
            htmlFor={`${formId}-notes`}
            className="block text-xs font-bold text-slate-700"
          >
            ملاحظات إضافية (اختياري)
          </label>
          <textarea
            id={`${formId}-notes`}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أي ملاحظات تخص الحصص المعوضة، إشعار ولي الأمر، أو المرفقات الإدارية..."
            className="w-full p-3.5 rounded-xl border border-slate-200 text-xs md:text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-[#137a85] focus:ring-[#137a85]/20 transition-all shadow-2xs resize-none"
          />
        </div>

        {/* Form Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-3">
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={handleReset}
            disabled={isSubmitting || isExportingDirect}
            className="px-5 py-2.5 rounded-xl text-xs md:text-sm font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span>تفريغ الحقول</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={handleSaveAndExportPdf}
            disabled={isSubmitting || isExportingDirect}
            className="px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold bg-teal-50 text-[#137a85] hover:bg-teal-100 border border-teal-300 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85] disabled:opacity-60"
          >
            {isExportingDirect ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#137a85]" />
            ) : (
              <FileDown className="w-4 h-4 text-[#137a85]" />
            )}
            <span>{isExportingDirect ? "جاري الحفظ والتصدير..." : "حفظ وتصدير PDF"}</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.96 }}
            type="submit"
            disabled={isSubmitting || isExportingDirect}
            className="px-7 py-2.5 rounded-xl text-xs md:text-sm font-bold bg-[#137a85] text-white hover:bg-teal-700 shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85] focus-visible:ring-offset-2 disabled:opacity-60"
          >
            <Save className="w-4 h-4 text-teal-100" />
            <span>{isSubmitting ? "جاري الحفظ..." : "حفظ الإجراء"}</span>
          </motion.button>
        </div>
      </form>
    </div>
  );
};
