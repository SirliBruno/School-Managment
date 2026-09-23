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
  Paperclip,
  ExternalLink,
  Info,
  Pencil,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { useToast } from "@/context/ToastContext";
import { AbsenceRecord, AbsenceType, Teacher } from "@/types/teacher";
import { EditAbsenceModal } from "@/components/procedures/EditAbsenceModal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { printAbsencePdf } from "@/lib/printPdfService";
import { parseAttachments } from "@/lib/attachments";
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
  const { absenceRecords, teachers, deleteAbsenceRecord, restoreAbsenceRecord } =
    useTeachers();
  const { showToast } = useToast();

  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [recordToEdit, setRecordToEdit] = useState<AbsenceRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<AbsenceRecord | null>(
    null
  );
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const confirmDeleteRecord = () => {
    if (recordToDelete) {
      const rec = recordToDelete;
      const { deletedRecord } = deleteAbsenceRecord(rec.id);
      setRecordToDelete(null);

      showToast({
        message: `تم حذف سجل غياب المعلمة (${rec.teacherName}) بتاريخ (${rec.date}).`,
        type: "success",
        action: deletedRecord
          ? {
              label: "تراجع",
              onClick: () => {
                restoreAbsenceRecord(deletedRecord);
                showToast({
                  message: `تم استرجاع سجل غياب المعلمة (${rec.teacherName}) بنجاح.`,
                  type: "info",
                });
              },
            }
          : undefined,
      });
    }
  };

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
              تصدير استمارة مساءلة الغياب الرسمية بصيغة PDF فورياً
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
        <>
          {/* Mobile PDF Printing Notice */}
          <div className="md:hidden mx-4 my-3 p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
            <span>للحصول على أفضل نتيجة للطباعة، افتحي النموذج على جهاز الكمبيوتر.</span>
          </div>

          {/* Desktop / Tablet Table View (md+) */}
          <div className="hidden md:block overflow-x-auto">
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

                    {/* Export PDF Button & Attachment Link */}
                    <td className="py-3.5 px-5 text-center">
                      <div className="inline-flex items-center gap-1.5 justify-center">
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

                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => setRecordToEdit(record)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-600 hover:text-white border border-amber-200 transition-all shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                          title="تعديل سجل الغياب"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </motion.button>

                        {record.attachmentUrl && (() => {
                          const atts = parseAttachments(record.attachmentUrl);
                          if (atts.length === 0) return null;
                          if (atts.length === 1) {
                            return (
                              <a
                                href={atts[0].url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-[#137a85] border border-slate-200 transition-colors inline-flex items-center justify-center shadow-2xs"
                                title={`معاينة ${atts[0].label} للمعلمة ${record.teacherName}`}
                                aria-label={`معاينة ${atts[0].label}`}
                              >
                                <Paperclip className="w-3.5 h-3.5" />
                              </a>
                            );
                          }
                          return (
                            <div className="inline-flex items-center gap-1">
                              {atts.map((att, aIdx) => (
                                <a
                                  key={aIdx}
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100/70 text-teal-800 border border-teal-200 text-[10px] font-bold inline-flex items-center gap-1 transition-colors shadow-2xs"
                                  title={`معاينة ${att.label}`}
                                >
                                  <Paperclip className="w-3 h-3 text-[#137a85]" />
                                  <span>{att.label}</span>
                                </a>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </td>

                    {/* Action (Delete Record) */}
                    <td className="py-3.5 px-5 text-center">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={() => setRecordToDelete(record)}
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

        {/* Mobile Card List View (< md) */}
        <div className="md:hidden divide-y divide-slate-100">
          {recentRecords.map((record, index) => {
            const style = TYPE_STYLES[record.type] || TYPE_STYLES["أخرى"];
            const isExporting = generatingId === record.id;

            return (
              <motion.div
                key={record.id}
                custom={index}
                variants={rowVariants}
                initial="hidden"
                animate="visible"
                className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition-colors"
              >
                {/* Header: Teacher Name + Type badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-full bg-teal-50 text-[#137a85] flex items-center justify-center font-bold text-sm shrink-0 border border-teal-100"
                      aria-hidden="true"
                    >
                      {record.teacherName.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-sm text-slate-900 block leading-tight">
                        {record.teacherName}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {record.jobNumber} • {record.specialty}
                      </span>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "inline-block px-2.5 py-1 rounded-full text-xs font-bold border shrink-0",
                      style.bg,
                      style.text,
                      style.border
                    )}
                  >
                    {record.type}
                  </span>
                </div>

                {/* Body: Date & Reason */}
                <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>تاريخ الغياب:</span>
                    </span>
                    <span className="font-mono font-bold text-slate-800 tabular-nums">
                      {record.date}
                    </span>
                  </div>

                  <div className="text-slate-700 pt-1.5 border-t border-slate-200/60">
                    <span className="text-slate-400 font-medium me-1">السبب:</span>
                    <span className="font-medium">{record.reason}</span>
                  </div>

                  {record.attachmentUrl && (() => {
                    const atts = parseAttachments(record.attachmentUrl);
                    if (atts.length === 0) return null;
                    return (
                      <div className="pt-1.5 border-t border-slate-200/60 flex items-center gap-2">
                        <span className="text-slate-400 font-medium">المرفقات:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {atts.map((att, aIdx) => (
                            <a
                              key={aIdx}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-white hover:bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold inline-flex items-center gap-1 transition-colors"
                            >
                              <Paperclip className="w-3 h-3 text-[#137a85]" />
                              <span>{att.label}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Actions: Export PDF + Edit + Delete */}
                <div className="flex items-center gap-2 pt-1">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={() => handleExportPdf(record)}
                    disabled={isExporting}
                    aria-busy={isExporting}
                    className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-teal-50 text-[#137a85] hover:bg-[#137a85] hover:text-white border border-teal-300 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileDown className="w-4 h-4" />
                    )}
                    <span>{isExporting ? "جاري التصدير..." : "تصدير الاستمارة الرسمية PDF"}</span>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => setRecordToEdit(record)}
                    className="min-h-[44px] px-3.5 rounded-xl text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center justify-center cursor-pointer"
                    title="تعديل هذا الإجراء"
                    aria-label={`تعديل سجل مساءلة ${record.teacherName}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => setRecordToDelete(record)}
                    className="min-h-[44px] px-3.5 rounded-xl text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors flex items-center justify-center cursor-pointer"
                    title="حذف هذا الإجراء"
                    aria-label={`حذف سجل مساءلة ${record.teacherName}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </>
    )}

    {/* Edit Absence Modal */}
    <EditAbsenceModal
      isOpen={Boolean(recordToEdit)}
      record={recordToEdit}
      onClose={() => setRecordToEdit(null)}
    />

    {/* Confirm Delete Absence Dialog */}
    <ConfirmDialog
      isOpen={Boolean(recordToDelete)}
      title="تأكيد حذف سجل الغياب"
      message={
        recordToDelete
          ? `هل أنتِ متأكدة من حذف سجل غياب المعلمة "${recordToDelete.teacherName}" بتاريخ ${recordToDelete.date} (${recordToDelete.type})؟ سيتم تحديث رصيد غياب المعلمة تلقائياً مع توفر خيار التراجع الفوري.`
          : ""
      }
      confirmLabel="نعم، حذف السجل"
      cancelLabel="إلغاء"
      variant="danger"
      onConfirm={confirmDeleteRecord}
      onCancel={() => setRecordToDelete(null)}
    />
    </div>
  );
};
