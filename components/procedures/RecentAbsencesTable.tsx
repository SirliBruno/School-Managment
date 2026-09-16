"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Trash2,
  Calendar,
  FileCheck2,
  FileDown,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { AbsenceRecord, AbsenceType, Teacher } from "@/types/teacher";
import { printAbsencePdf } from "@/lib/printPdfService";
import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<
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

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.04,
      duration: 0.25,
      ease: "easeOut" as const,
    },
  }),
};

export const RecentAbsencesTable: React.FC = () => {
  const { absenceRecords, teachers, deleteAbsenceRecord } = useTeachers();

  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const recentRecords = absenceRecords.slice(0, 5);

  const handleExportPdf = async (record: AbsenceRecord) => {
    if (generatingId) return;

    const teacher =
      teachers.find((t) => t.id === record.teacherId) ||
      ({
        id: record.teacherId,
        fullName: record.teacherName,
        name: record.teacherName,
        username: record.jobNumber,
        jobNumber: record.jobNumber,
        specialty: record.specialty,
        employmentStatus: "دائم",
        jobTitle: "معلم",
        totalAbsences: 1,
      } as Teacher);

    setGeneratingId(record.id);
    setFeedback(null);

    try {
      printAbsencePdf({
        teacherName: record.teacherName,
        username: record.jobNumber,
        specialty: record.specialty,
        jobTitle: teacher.jobTitle || "معلم",
        employmentStatus: teacher.employmentStatus || "دائم",
        absenceCount: teacher.totalAbsences || 1,
        absenceDate: record.date,
        absenceType: record.type,
        absenceReason: record.reason,
      });

      setFeedback({
        type: "success",
        message: `تم تجهيز استمارة مساءلة الغياب الرسمية للمعلمة (${record.teacherName}) للطباعة.`,
      });

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setFeedback(null), 6000);
    } catch (err: unknown) {
      console.error("فشل طباعة مستند المساءلة PDF:", err);
      setFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "حدث خطأ أثناء إعداد ملف PDF للطباعة. يرجى المحاولة مجدداً.",
      });
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden space-y-0">

      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#137a85] flex items-center justify-center shadow-2xs">
            <Clock className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              آخر 5 مساءلات غياب مسجلة
            </h3>
            <p className="text-[11px] text-slate-500">
              تصدير الاستمارة الرسمية لوزارة التعليم (نموذج رقم ٢٠) بصيغة PDF فورياً
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
          إجمالي المساءلات: {absenceRecords.length}
        </span>
      </div>

      {/* Accessible Animated Notification Toast */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            role="alert"
            aria-live="polite"
            className={cn(
              "m-4 p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs shadow-sm",
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-950 border-emerald-300"
                : "bg-rose-50 text-rose-950 border-rose-300"
            )}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
              )}
              <span className="font-bold">{feedback.message}</span>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-black/5 cursor-pointer"
              aria-label="إغلاق الإشعار"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table Content */}
      {recentRecords.length === 0 ? (
        <div className="p-10 text-center flex flex-col items-center justify-center space-y-2.5">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <FileCheck2 className="w-6 h-6" aria-hidden="true" />
          </div>
          <p className="text-xs md:text-sm font-bold text-slate-700">
            لم يتم تسجيل أي مساءلة غياب بعد
          </p>
          <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
            عند حفظ نموذج المساءلة أعلاه، ستظهر السجلات المعتمدة هنا مع إمكانية
            تصدير استمارة PDF الرسمية بضغطة زر.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs md:text-sm">
            <thead className="bg-slate-50/80 text-slate-700 font-bold border-b border-slate-200 select-none">
              <tr>
                <th scope="col" className="py-3.5 px-5">اسم المعلمة</th>
                <th scope="col" className="py-3.5 px-5">تاريخ الغياب</th>
                <th scope="col" className="py-3.5 px-5">نوع الغياب</th>
                <th scope="col" className="py-3.5 px-5">سبب الغياب</th>
                <th scope="col" className="py-3.5 px-5 text-center">الاستمارة الرسمية</th>
                <th scope="col" className="py-3.5 px-5 text-center">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentRecords.map((record, index) => {
                const style = TYPE_STYLES[record.type] || TYPE_STYLES["أخرى"];
                const isExporting = generatingId === record.id;

                return (
                  <motion.tr
                    key={record.id}
                    custom={index}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    className="hover:bg-slate-50/80 transition-colors duration-150"
                  >
                    {/* Teacher Name */}
                    <td className="py-3.5 px-5 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[11px]"
                          aria-hidden="true"
                        >
                          {record.teacherName.charAt(0)}
                        </div>
                        <div>
                          <span>{record.teacherName}</span>
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {record.jobNumber} • {record.specialty}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Absence Date */}
                    <td className="py-3.5 px-5 font-mono text-slate-700 tabular-nums">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                        <span>{record.date}</span>
                      </div>
                    </td>

                    {/* Absence Type */}
                    <td className="py-3.5 px-5">
                      <span
                        className={cn(
                          "inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border",
                          style.bg,
                          style.text,
                          style.border
                        )}
                      >
                        {record.type}
                      </span>
                    </td>

                    {/* Absence Reason */}
                    <td className="py-3.5 px-5 text-slate-700 max-w-xs truncate">
                      {record.reason}
                    </td>

                    {/* Export PDF Button */}
                    <td className="py-3.5 px-5 text-center">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => handleExportPdf(record)}
                        disabled={isExporting}
                        aria-busy={isExporting}
                        aria-label={`تصدير استمارة مساءلة الغياب الرسمية للمعلمة ${record.teacherName} بصيغة PDF`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-50 text-[#137a85] hover:bg-[#137a85] hover:text-white border border-teal-200/80 transition-all shadow-2xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85]"
                        title="تصدير استمارة مساءلة الغياب بصيغة A4 PDF"
                      >
                        {isExporting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>{isExporting ? "جاري التصدير..." : "تصدير PDF"}</span>
                      </motion.button>
                    </td>

                    {/* Action (Delete Record) */}
                    <td className="py-3.5 px-5 text-center">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={() => deleteAbsenceRecord(record.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                        title="حذف هذا الإجراء وتصحيح رصيد المعلمة"
                        aria-label={`حذف سجل مساءلة ${record.teacherName}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </motion.button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
