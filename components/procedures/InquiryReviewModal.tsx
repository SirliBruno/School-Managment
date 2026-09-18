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
import { parseAttachments } from "@/lib/attachments";
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
        absenceCount: (teacher?.totalAbsences || 0) + (inquiry.status === "approved" ? 0 : 1),
        absenceDate: inquiry.absenceDate,
        absenceType: inquiry.absenceType || "مرضي",
        absenceReason: inquiry.teacherReason || "إفادة المساءلة الإلكترونية",
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
          className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden text-right flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#137a85] flex items-center justify-center">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>مراجعة واعتماد إفادة المساءلة</span>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                      inquiry.status === "approved"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : inquiry.status === "rejected"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : inquiry.status === "submitted"
                        ? "bg-sky-50 text-sky-700 border-sky-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
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
                <p className="text-xs text-slate-400 mt-0.5">
                  معاينة رد المعلمة، فحص التقرير المرفق، واتخاذ القرار الإداري
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 flex items-center justify-center transition-colors cursor-pointer"
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
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                )}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            {/* Teacher Info Card */}
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">المعلمة</span>
                <span className="font-bold text-slate-900 mt-0.5 block truncate">
                  {inquiry.teacherName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">الرقم الوظيفي</span>
                <span className="font-bold text-slate-800 mt-0.5 block font-mono">
                  {inquiry.jobNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">تاريخ الغياب</span>
                <span className="font-bold text-[#137a85] mt-0.5 block font-mono">
                  {inquiry.absenceDate}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">تاريخ تقديم الرد</span>
                <span className="font-semibold text-slate-700 mt-0.5 block text-[11px]">
                  {inquiry.submittedAt
                    ? new Date(inquiry.submittedAt).toLocaleDateString("ar-SA")
                    : "لم يتم بعد"}
                </span>
              </div>
            </div>

            {/* Teacher Response Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#137a85]" />
                <span>إفادة ومبرر المعلمة</span>
              </h3>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">نوع الغياب المحدد:</span>
                  <span className="font-bold px-2.5 py-1 rounded-lg bg-teal-50 text-[#137a85] border border-teal-200">
                    {inquiry.absenceType || "غير محدد بعد"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 text-xs block mb-1">
                    مبرر الغياب المكتوب:
                  </span>
                  <p className="text-xs sm:text-sm text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
                    {inquiry.teacherReason || "بانتظار رد المعلمة..."}
                  </p>
                </div>
              </div>
            </div>

            {/* Attachment Preview Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-[#137a85]" />
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
                        className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 p-3.5 space-y-2.5"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <FileCheck className="w-4 h-4 text-[#137a85]" />
                            <span>{att.label}</span>
                          </span>
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-[#137a85] hover:underline flex items-center gap-1"
                          >
                            <span>فتح بالحجم الكامل</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        {!isPdf ? (
                          <div className="flex justify-center bg-white p-2 rounded-xl border border-slate-200">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={att.url}
                              alt={att.label}
                              className="max-h-64 w-auto object-contain rounded-lg shadow-2xs"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-72 rounded-xl overflow-hidden border border-slate-200 bg-white">
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
                <div className="p-5 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                  لم يتم إرفاق مستند حتى الآن (المساءلة بانتظار رد المعلمة).
                </div>
              )}
            </div>

            {/* Admin Decision Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                ملاحظات وتوجيه الإدارة (اختياري)
              </label>
              <textarea
                rows={2}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="أي ملاحظات إدارية أو توجيه خاص بالحسم، الحصص، أو الاعتماد..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#137a85]/20 focus:border-[#137a85] transition-all resize-none shadow-2xs"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={handlePrintPdf}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition-all shadow-2xs cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-[#137a85]" />
              <span>تصدير استمارة المساءلة (PDF)</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => handleDecision("rejected")}
                disabled={isProcessing || inquiry.status === "pending"}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
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
      </div>
    </AnimatePresence>
  );
};
