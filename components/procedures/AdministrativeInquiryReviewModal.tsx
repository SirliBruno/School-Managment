"use client";

import React, { useState, useEffect, useId } from "react";
import { motion } from "framer-motion";
import {
  X,
  ShieldCheck,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  User,
  Paperclip,
  ExternalLink,
  Printer,
  Globe,
  Clock,
  Eye,
  Maximize2,
  FileCheck,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { useToast } from "@/context/ToastContext";
import { AdministrativeInquiry, AdministrativeDirectorDecision } from "@/types/teacher";
import { cn } from "@/lib/utils";
import { getSaudiToday } from "@/lib/timeUtils";
import { printAdministrativeInquiryPdf } from "@/lib/printAdministrativeInquiryPdfService";
import { AttachmentViewerModal } from "@/components/common/AttachmentViewerModal";
import { openSafeAttachmentUrl } from "@/lib/attachments";

interface AdministrativeInquiryReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: AdministrativeInquiry | null;
}

export const AdministrativeInquiryReviewModal: React.FC<AdministrativeInquiryReviewModalProps> = ({
  isOpen,
  onClose,
  inquiry,
}) => {
  const { submitAdministrativeDirectorDecision } = useTeachers();
  const { showToast } = useToast();
  const formId = useId();

  const [directorDecision, setDirectorDecision] =
    useState<AdministrativeDirectorDecision>("accepted");
  const [directorNotes, setDirectorNotes] = useState("");
  const [decisionDate, setDecisionDate] = useState(() => getSaudiToday());
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  useEffect(() => {
    if (inquiry) {
      setDirectorDecision(inquiry.directorDecision || "accepted");
      setDirectorNotes(inquiry.directorNotes || "");
      setDecisionDate(inquiry.decisionDate || getSaudiToday());
    }
    setErrorMsg(null);
  }, [inquiry, isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !inquiry) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!directorDecision) {
      setErrorMsg("يرجى تحديد رأي وقرار مديرة المدرسة.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const res = submitAdministrativeDirectorDecision(
        inquiry.id,
        directorDecision,
        directorNotes.trim() || undefined,
        decisionDate
      );

      if (res.success) {
        showToast({
          message:
            directorDecision === "accepted"
              ? `تم اعتماد قرار قبول العذر للمساءلة رقم (${inquiry.inquiryNumber || ""}) بنجاح.`
              : `تم اعتماد قرار عدم قبول العذر للمساءلة رقم (${inquiry.inquiryNumber || ""}).`,
          type: "success",
        });
        onClose();
      } else {
        setErrorMsg(res.error || "تعذر اعتماد القرار.");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "حدث خطأ أثناء اعتماد القرار");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    printAdministrativeInquiryPdf({
      ...inquiry,
      directorDecision,
      directorNotes: directorNotes.trim() || undefined,
      decisionDate,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${formId}-title`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6"
      >
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id={`${formId}-title`} className="text-xl font-bold tracking-tight">
                مراجعة الإفادة واعتماد قرار الإدارة
              </h2>
              <p className="text-xs text-white/80 mt-0.5">
                مساءلة إدارية رقم: {inquiry.inquiryNumber || "—"} | المعلمة: {inquiry.teacherName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="طباعة المساءلة الخطية الرسمية"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors focus:outline-none"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[calc(85vh-140px)] overflow-y-auto custom-scrollbar">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Teacher & Violation Summary */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
                <User className="w-4 h-4 text-indigo-500" />
                <span>{inquiry.teacherName}</span>
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  ({inquiry.specialty || "عام"})
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                <Calendar className="w-3.5 h-3.5" />
                <span>تاريخ الواقعة: {inquiry.incidentDate}</span>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-1">
                المخالفة: {inquiry.inquiryType === "أخرى" ? inquiry.customType || "أخرى" : inquiry.inquiryType}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                {inquiry.description || "لا يوجد وصف مدون"}
              </p>
            </div>

            {inquiry.vicePrincipalNotes && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <span>ملاحظات الوكيلة:</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">{inquiry.vicePrincipalNotes}</span>
              </div>
            )}
          </div>

          {/* Section 2: Teacher Statement / Response */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/50 space-y-3">
            <div className="flex items-center justify-between border-b border-indigo-200/50 dark:border-indigo-900/50 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>إفادة المعلمة الخطية</span>
              </div>
              {inquiry.responseDate && (
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>تاريخ الرد: {inquiry.responseDate}</span>
                  </span>
                  {inquiry.responseIp && (
                    <span className="flex items-center gap-1 font-mono">
                      <Globe className="w-3 h-3" />
                      <span>{inquiry.responseIp}</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {inquiry.teacherResponse ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-indigo-100 dark:border-slate-800 font-sans">
                  {inquiry.teacherResponse}
                </p>

                {inquiry.attachmentUrl && (
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <Paperclip className="w-4 h-4 text-indigo-500" />
                        <span>المرفق الداعم للإفادة</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsViewerOpen(true)}
                          className="px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>معاينة المرفق</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            openSafeAttachmentUrl(
                              inquiry.attachmentUrl!,
                              `administrative_inquiry_${inquiry.inquiryNumber || inquiry.id}`
                            )
                          }
                          className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                          title="فتح في نافذة مستقلة"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Inline Thumbnail / Document Preview Card */}
                    <div
                      onClick={() => setIsViewerOpen(true)}
                      className="group relative cursor-pointer rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-2 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
                    >
                      {inquiry.attachmentUrl.toLowerCase().includes(".pdf") ||
                      inquiry.attachmentUrl.startsWith("data:application/pdf") ? (
                        <div className="w-full h-36 rounded-lg overflow-hidden flex flex-col items-center justify-center bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 gap-2">
                          <FileText className="w-10 h-10 text-indigo-500" />
                          <span className="text-xs font-semibold">مستند PDF رسمي (اضغطي للعرض بالحجم الكامل)</span>
                        </div>
                      ) : (
                        <div className="relative flex items-center justify-center w-full max-h-56 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={inquiry.attachmentUrl}
                            alt="مرفق إفادة المعلمة"
                            className="max-h-52 w-auto object-contain rounded-lg transition-transform duration-200 group-hover:scale-[1.02]"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg gap-2 text-white font-semibold text-xs">
                            <Maximize2 className="w-4 h-4" />
                            <span>عرض وتكبير المرفق</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs text-center flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>لم تقم المعلمة بتقديم إفادتها الخطية بعد (يمكنك تسجيل القرار مباشرة إذا لزم الأمر).</span>
              </div>
            )}
          </div>

          {/* Section 3: Director Decision Form */}
          <div className="space-y-4 pt-1">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              رأي وقرار مديرة المدرسة <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDirectorDecision("accepted")}
                className={cn(
                  "p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 focus:outline-none",
                  directorDecision === "accepted"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-sm ring-1 ring-emerald-500/20"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                )}
              >
                <CheckCircle2
                  className={cn(
                    "w-5 h-5",
                    directorDecision === "accepted"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-400"
                  )}
                />
                <span className="font-bold text-xs">عذر مقبول</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  اكتفاء بالإفادة وحفظ المساءلة
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDirectorDecision("rejected")}
                className={cn(
                  "p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 focus:outline-none",
                  directorDecision === "rejected"
                    ? "bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-200 shadow-sm ring-1 ring-rose-500/20"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                )}
              >
                <XCircle
                  className={cn(
                    "w-5 h-5",
                    directorDecision === "rejected"
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-slate-400"
                  )}
                />
                <span className="font-bold text-xs">عذر غير مقبول</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  اتخاذ الإجراء الإداري النظامي
                </span>
              </button>
            </div>

            {/* Director Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                توجيهات أو أسباب قرار المديرة
              </label>
              <textarea
                rows={2}
                placeholder="اكتبي توجيهات المديرة، مثال: يتم قبول العذر لمرة واحدة مع التنبيه بعدم التكرار..."
                value={directorNotes}
                onChange={(e) => setDirectorNotes(e.target.value)}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all leading-relaxed"
              />
            </div>

            {/* Decision Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                تاريخ اعتماد القرار
              </label>
              <input
                type="date"
                value={decisionDate}
                onChange={(e) => setDecisionDate(e.target.value)}
                className="w-full h-10 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors focus:outline-none"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={isProcessing}
              className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all focus:outline-none disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الاعتماد...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>اعتماد القرار رسميًا</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Lightbox Attachment Viewer Modal */}
      <AttachmentViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        url={inquiry.attachmentUrl || null}
        title={`مرفق مساءلة — ${inquiry.teacherName}`}
        fileName={`inquiry_${inquiry.inquiryNumber || inquiry.id}`}
      />
    </div>
  );
};
