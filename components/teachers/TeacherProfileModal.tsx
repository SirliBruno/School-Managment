"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Briefcase,
  GraduationCap,
  Calendar,
  FileDown,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileCheck,
} from "lucide-react";
import { Teacher, AbsenceRecord, AbsenceType } from "@/types/teacher";
import { useTeachers } from "@/context/TeacherContext";
import { AbsencePdfTemplate } from "@/components/procedures/AbsencePdfTemplate";
import { exportHtmlToPdf } from "@/lib/pdfGenerator";
import { cn } from "@/lib/utils";

interface TeacherProfileModalProps {
  teacher: Teacher | null;
  onClose: () => void;
}

const TYPE_BADGE_STYLES: Record<
  AbsenceType,
  { bg: string; text: string; border: string }
> = {
  اضطراري: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
  },
  مرضي: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  مرافق: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  أخرى: {
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
  },
};

export const TeacherProfileModal: React.FC<TeacherProfileModalProps> = ({
  teacher,
  onClose,
}) => {
  const { absenceRecords } = useTeachers();
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [selectedPdfRecord, setSelectedPdfRecord] =
    useState<AbsenceRecord | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, [onClose]);

  // Focus close button on mount
  useEffect(() => {
    if (teacher) {
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    }
  }, [teacher]);

  if (!teacher) return null;

  // Filter absences specifically for this teacher
  const teacherAbsences = absenceRecords.filter(
    (record) =>
      record.teacherId === teacher.id ||
      record.jobNumber === teacher.jobNumber
  );

  // Calculate breakdown counters
  const sickLeavesCount = teacherAbsences.filter(
    (r) => r.type === "مرضي"
  ).length;
  const emergencyLeavesCount = teacherAbsences.filter(
    (r) => r.type === "اضطراري"
  ).length;
  const companionLeavesCount = teacherAbsences.filter(
    (r) => r.type === "مرافق"
  ).length;
  const otherLeavesCount = teacherAbsences.filter(
    (r) => r.type === "أخرى"
  ).length;

  const handleExportPdf = async (record: AbsenceRecord) => {
    if (exportingId) return;

    setSelectedPdfRecord(record);
    setExportingId(record.id);
    setFeedback(null);

    setTimeout(async () => {
      try {
        const cleanName = teacher.name.trim().replace(/\s+/g, "_");
        const filename = `مساءلة_غياب_${cleanName}_${record.date}.pdf`;

        await exportHtmlToPdf({
          element: pdfTemplateRef.current,
          filename,
        });

        setFeedback({
          type: "success",
          message: `تم تنزيل استمارة الغياب للمعلمة (${teacher.name}) بنجاح.`,
        });

        if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), 5000);
      } catch (err) {
        console.error("فشل تصدير الـ PDF من ملف المعلمة:", err);
        setFeedback({
          type: "error",
          message: "حدث خطأ أثناء تصدير استمارة المساءلة. يرجى إعادة المحاولة.",
        });
      } finally {
        setExportingId(null);
      }
    }, 180);
  };

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="teacher-profile-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      >
        {/* Animated Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Hidden PDF Template for Single Record Export */}
        <AbsencePdfTemplate
          ref={pdfTemplateRef}
          record={selectedPdfRecord}
          teacher={teacher}
        />

        {/* Animated Dialog Window with Spring physics */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="relative bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden z-10"
        >
          {/* Modal Header */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/80 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="w-14 h-14 rounded-2xl bg-[#137a85] text-white flex items-center justify-center font-bold text-xl shadow-md ring-4 ring-teal-50 shrink-0"
              >
                {teacher.name.charAt(0)}
              </motion.div>
              <div className="space-y-1 text-right">
                <div className="flex items-center gap-2">
                  <h2
                    id="teacher-profile-title"
                    className="text-lg md:text-xl font-bold text-slate-900"
                  >
                    ملف المعلمة: {teacher.name}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-[#137a85] border border-teal-200">
                    كادر تعليمي
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    رقم الوظيفة: <strong className="text-slate-700 font-mono">{teacher.jobNumber}</strong>
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    التخصص: <strong className="text-slate-700">{teacher.specialty}</strong>
                  </span>
                </div>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              ref={closeButtonRef}
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 cursor-pointer"
              aria-label="إغلاق ملف المعلمة"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </motion.button>
          </div>

          {/* Feedback Alert */}
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              className={cn(
                "mx-6 mt-4 p-3 rounded-xl border flex items-center justify-between text-xs",
                feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                  : "bg-rose-50 text-rose-900 border-rose-300"
              )}
            >
              <div className="flex items-center gap-2">
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                )}
                <span className="font-bold">{feedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}

          {/* Modal Scrollable Body */}
          <div className="p-6 overflow-y-auto space-y-6">
            {/* Summary Cards */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                ملخص إحصائيات الغياب المعتمدة
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Total */}
                <motion.div
                  whileHover={{ y: -2 }}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs"
                >
                  <span className="block text-xs font-medium text-slate-500 mb-1">
                    إجمالي الغياب
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900 font-mono">
                      {teacher.totalAbsences}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">يوم</span>
                  </div>
                </motion.div>

                {/* Sick */}
                <motion.div
                  whileHover={{ y: -2 }}
                  className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/60 shadow-2xs"
                >
                  <span className="block text-xs font-medium text-blue-700 mb-1">
                    إجازات مرضية
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-blue-800 font-mono">
                      {sickLeavesCount}
                    </span>
                    <span className="text-[11px] text-blue-600/70 font-medium">يوم</span>
                  </div>
                </motion.div>

                {/* Emergency */}
                <motion.div
                  whileHover={{ y: -2 }}
                  className="p-4 rounded-xl bg-rose-50/50 border border-rose-200/60 shadow-2xs"
                >
                  <span className="block text-xs font-medium text-rose-700 mb-1">
                    غياب اضطراري
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-rose-800 font-mono">
                      {emergencyLeavesCount}
                    </span>
                    <span className="text-[11px] text-rose-600/70 font-medium">يوم</span>
                  </div>
                </motion.div>

                {/* Companion / Other */}
                <motion.div
                  whileHover={{ y: -2 }}
                  className="p-4 rounded-xl bg-purple-50/50 border border-purple-200/60 shadow-2xs"
                >
                  <span className="block text-xs font-medium text-purple-700 mb-1">
                    مرافق وأخرى
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-purple-800 font-mono">
                      {companionLeavesCount + otherLeavesCount}
                    </span>
                    <span className="text-[11px] text-purple-600/70 font-medium">يوم</span>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* Absence History Log Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  سجل المساءلات وحالات الغياب المفصلة ({teacherAbsences.length})
                </h3>
                {teacherAbsences.length > 0 && (
                  <span className="text-[11px] text-slate-400">
                    مرتبة من الأحدث إلى الأقدم
                  </span>
                )}
              </div>

              {teacherAbsences.length === 0 ? (
                <div className="p-8 rounded-xl bg-slate-50/80 border border-dashed border-slate-200 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <FileCheck className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <p className="text-xs md:text-sm font-bold text-slate-700">
                    سجل المعلمة منضبط بالكامل
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    لم يتم تسجيل أي استمارات مساءلة أو أيام غياب لهذه المعلمة حتى
                    الآن.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th scope="col" className="py-3 px-4">تاريخ الغياب</th>
                          <th scope="col" className="py-3 px-4">النوع</th>
                          <th scope="col" className="py-3 px-4">السبب المسجل</th>
                          <th scope="col" className="py-3 px-4">الملاحظات</th>
                          <th scope="col" className="py-3 px-4 text-center">الاستمارة الرسمية</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {teacherAbsences.map((rec) => {
                          const style =
                            TYPE_BADGE_STYLES[rec.type] || TYPE_BADGE_STYLES["أخرى"];
                          const isExporting = exportingId === rec.id;

                          return (
                            <tr
                              key={rec.id}
                              className="hover:bg-slate-50/80 transition-colors duration-150"
                            >
                              <td className="py-3 px-4 font-mono font-semibold text-slate-800 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{rec.date}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span
                                  className={cn(
                                    "inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                                    style.bg,
                                    style.text,
                                    style.border
                                  )}
                                >
                                  {rec.type}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-700 max-w-xs truncate font-medium">
                                {rec.reason || "—"}
                              </td>
                              <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                                {rec.notes || "—"}
                              </td>
                              <td className="py-3 px-4 text-center whitespace-nowrap">
                                <motion.button
                                  whileTap={{ scale: 0.95 }}
                                  type="button"
                                  onClick={() => handleExportPdf(rec)}
                                  disabled={isExporting}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 text-[#137a85] hover:bg-[#137a85] hover:text-white border border-teal-200/80 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85]"
                                  title="تصدير استمارة مساءلة الغياب (نموذج 20)"
                                >
                                  {isExporting ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <FileDown className="w-3.5 h-3.5" />
                                  )}
                                  <span>{isExporting ? "تصدير..." : "تصدير PDF"}</span>
                                </motion.button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              النموذج الرسمي متوافق مع لوائح الخدمة المدنية ووزارة التعليم
            </span>
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-all cursor-pointer"
            >
              إغلاق
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
