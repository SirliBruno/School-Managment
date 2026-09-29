"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FileCheck2,
  Calendar,
  User,
  ExternalLink,
  CheckCircle2,
  XCircle,
  FileDown,
  Loader2,
  AlertCircle,
  ShieldCheck,
  FileText,
  Clock,
  Eye,
  FileCheck,
} from "lucide-react";
import { AbsenceInquiry, Teacher } from "@/types/teacher";
import { useTeachers } from "@/context/TeacherContext";
import { printAbsencePdf } from "@/lib/printPdfService";
import { parseAttachments, openSafeAttachmentUrl } from "@/lib/attachments";
import { AttachmentViewerModal } from "@/components/common/AttachmentViewerModal";
import { cn } from "@/lib/utils";

interface InquiryReviewModalProps {
  inquiry: AbsenceInquiry | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InquiryReviewModal: React.FC<InquiryReviewModalProps> = ({
  inquiry,
  isOpen,
  onClose,
}) => {
  const { teachers, updateInquiryDecision } = useTeachers();

  const [adminNotes, setAdminNotes] = useState(inquiry?.adminNotes || "");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedViewerUrl, setSelectedViewerUrl] = useState<string | null>(null);
  const [selectedViewerTitle, setSelectedViewerTitle] = useState<string>("معاينة المرفق الرسمي");
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  if (!isOpen || !inquiry) return null;

  const teacher = teachers.find((t) => t.id === inquiry.teacherId);

  const handleDecision = async (status: "approved" | "rejected") => {
    setIsProcessing(true);
    setFeedback(null);
    try {
      const res = await updateInquiryDecision(inquiry.id, status, adminNotes);
      if (res.success) {
        setFeedback({
          type: "success",
          message:
            status === "approved"
              ? "تم قبول العذر واعتماد المساءلة وتوثيقها في رصيد المعلمة بنجاح."
              : "تم رفض العذر واحتساب المساءلة كغياب بدون عذر.",
        });
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "فشل تسجيل القرار.",
        });
      }
    } catch (err) {
      console.error("خطأ أثناء اتخاذ القرار:", err);
      setFeedback({ type: "error", message: "حدث خطأ غير متوقع." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintPdf = () => {
    try {
      printAbsencePdf({
        teacherName: inquiry.teacherName,
        username: inquiry.jobNumber,
        specialty: inquiry.specialty || teacher?.specialty || "الكادر التعليمي",
        jobTitle: teacher?.jobTitle || "معلم",
        employmentStatus: teacher?.employmentStatus || "دائم",
        absenceCount: (teacher?.totalAbsences || 0) + (inquiry.status === "approved" ? 0 : (inquiry.daysCount || 1)),
        absenceDate:
          inquiry.absenceEndDate && inquiry.absenceEndDate !== inquiry.absenceDate
            ? `${inquiry.absenceDate} إلى ${inquiry.absenceEndDate} (${inquiry.daysCount || 2} أيام)`
            : inquiry.absenceDate,
        absenceType: inquiry.absenceType || "مرضي",
        absenceReason: inquiry.teacherReason || "إفادة المساءلة الإلكترونية",
        attachmentUrl: inquiry.attachmentUrl,
      });
    } catch (err) {
      console.error("فشل طباعة الاستمارة:", err);
    }
  };

  const attachmentsList = parseAttachments(inquiry.attachmentUrl);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full overflow-hidden text-right flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/70 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-[#137a85] dark:text-teal-400 flex items-center justify-center">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>مراجعة واعتماد إفادة المساءلة</span>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                      inquiry.status === "approved"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60"
                        : inquiry.status === "rejected"
                        ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60"
                        : inquiry.status === "submitted"
                        ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800/60"
                        : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60"
                    )}
                  >
                    {inquiry.status === "approved"
                      ? "معتمد"
                      : inquiry.status === "rejected"
                      ? "مرفوض"
                      : inquiry.status === "submitted"
                      ? "تم الرد (بانتظار الاعتماد)"
                      : "بانتظار الرد"}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  معاينة رد المعلمة، فحص التقرير المرفق، واتخاذ القرار الإداري
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {feedback && (
              <div
                className={cn(
                  "p-3.5 rounded-2xl text-xs flex items-center gap-2 border",
                  feedback.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-300"
                    : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-300"
                )}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Teacher Info Card */}
            <div className="bg-slate-50/80 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[11px]">المعلمة</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 mt-0.5 block truncate">
                  {inquiry.teacherName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[11px]">رقم الهوية</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block font-mono">
                  {inquiry.nationalId || inquiry.jobNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[11px]">
                  {inquiry.absenceEndDate && inquiry.absenceEndDate !== inquiry.absenceDate
                    ? "فترة الغياب"
                    : "تاريخ الغياب"}
                </span>
                <span className="font-bold text-[#137a85] dark:text-teal-400 mt-0.5 block font-mono text-xs">
                  {inquiry.absenceEndDate && inquiry.absenceEndDate !== inquiry.absenceDate
                    ? `${inquiry.absenceDate} إلى ${inquiry.absenceEndDate} (${inquiry.daysCount || 2} أيام)`
                    : inquiry.absenceDate}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[11px]">تاريخ تقديم الرد</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5 block text-[11px]">
                  {inquiry.submittedAt
                    ? new Date(inquiry.submittedAt).toLocaleDateString("ar-SA")
                    : "لم يتم بعد"}
                </span>
              </div>
            </div>

            {/* Teacher Response Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#137a85] dark:text-teal-400" />
                <span>إفادة ومبرر المعلمة</span>
              </h3>

              <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">نوع الغياب المحدد:</span>
                  <span className="font-bold px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-[#137a85] dark:text-teal-400 border border-teal-200 dark:border-teal-800/60">
                    {inquiry.absenceType || "غير محدد بعد"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-xs block mb-1">
                    مبرر الغياب المكتوب:
                  </span>
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 leading-relaxed">
                    {inquiry.teacherReason || "بانتظار رد المعلمة..."}
                  </p>
                </div>
              </div>
            </div>

            {/* Attachment Preview Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-[#137a85] dark:text-teal-400" />
                  <span>المرفقات المقدمة ({attachmentsList.length})</span>
                </span>
              </h3>

              {attachmentsList.length > 0 ? (
                <div className="space-y-3">
                  {attachmentsList.map((att, idx) => {
                    const isPdf =
                      att.url.includes(".pdf") ||
                      att.url.startsWith("data:application/pdf");

                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-800/60 p-3.5 space-y-2.5"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700 pb-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <FileCheck className="w-4 h-4 text-[#137a85] dark:text-teal-400" />
                            <span>{att.label}</span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedViewerUrl(att.url);
                                setSelectedViewerTitle(`${att.label} — ${inquiry.teacherName}`);
                                setIsViewerOpen(true);
                              }}
                              className="text-[11px] font-bold text-[#137a85] dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>معاينة المرفق</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openSafeAttachmentUrl(att.url, `${inquiry.teacherName}_${att.label}`)}
                              className="p-1 rounded-md text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                              title="فتح في نافذة جديدة"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {!isPdf ? (
                          <div
                            onClick={() => {
                              setSelectedViewerUrl(att.url);
                              setSelectedViewerTitle(`${att.label} — ${inquiry.teacherName}`);
                              setIsViewerOpen(true);
                            }}
                            className="flex justify-center bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer group hover:border-[#137a85] transition-colors"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={att.url}
                              alt={att.label}
                              className="max-h-64 w-auto object-contain rounded-lg shadow-2xs group-hover:scale-[1.01] transition-transform"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-72 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                            <iframe
                              src={att.url}
                              title={att.label}
                              className="w-full h-full border-0"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 dark:text-slate-500">
                  لم يتم إرفاق مستند حتى الآن (المساءلة بانتظار رد المعلمة).
                </div>
              )}
            </div>

            {/* Admin Decision Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                ملاحظات وتوجيه الإدارة (اختياري)
              </label>
              <textarea
                rows={2}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="أي ملاحظات إدارية أو توجيه خاص بالحسم، الحصص، أو الاعتماد..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#137a85]/20 focus:border-[#137a85] transition-all resize-none shadow-2xs"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50/70 dark:bg-slate-850/70 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={handlePrintPdf}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all shadow-2xs cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-[#137a85] dark:text-teal-400" />
              <span>تصدير استمارة المساءلة (PDF)</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => handleDecision("rejected")}
                disabled={isProcessing || inquiry.status === "pending"}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60 dark:hover:bg-rose-900/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>رفض العذر</span>
              </button>

              <button
                type="button"
                onClick={() => handleDecision("approved")}
                disabled={isProcessing || inquiry.status === "pending"}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:shadow disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>قبول واعتماد العذر</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Attachment Lightbox Viewer Modal */}
        <AttachmentViewerModal
          isOpen={isViewerOpen}
          onClose={() => {
            setIsViewerOpen(false);
            setSelectedViewerUrl(null);
          }}
          url={selectedViewerUrl}
          title={selectedViewerTitle}
        />
      </div>
    </AnimatePresence>
  );
};
