"use client";

import React, { useState, useEffect } from "react";
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
  RotateCcw,
  Send,
  Copy,
  Check,
  AlertTriangle,
  History,
  FileQuestion,
  RefreshCw,
} from "lucide-react";
import { AbsenceInquiry, Teacher } from "@/types/teacher";
import { useTeachers } from "@/context/TeacherContext";
import { printAbsencePdf } from "@/lib/printPdfService";
import { parseAttachments, openSafeAttachmentUrl } from "@/lib/attachments";
import { AttachmentViewerModal } from "@/components/common/AttachmentViewerModal";
import { DualDateBadge } from "@/components/ui/DualDateBadge";
import { cn } from "@/lib/utils";
import { addDaysToDateStr, calculateDaysBetween, formatSaudiDateTime } from "@/lib/timeUtils";
import { generateInquiryMessage, getWhatsAppDirectUrl } from "@/lib/whatsapp";
import { getInquiryPublicUrl } from "@/lib/appConfig";

interface InquiryReviewModalProps {
  inquiry: AbsenceInquiry | null;
  isOpen: boolean;
  onClose: () => void;
}

const REJECTION_REASONS = [
  "مرفقات خاطئة",
  "عذر غير مقبول نظاماً",
  "عدم تقديم تقرير طبي معتمد",
  "تجاوز المدة المحددة للتقرير",
  "أخرى",
] as const;

export const InquiryReviewModal: React.FC<InquiryReviewModalProps> = ({
  inquiry,
  isOpen,
  onClose,
}) => {
  const { teachers, inquiries, updateInquiryDecision, rejectInquiryWithOptionalResend } = useTeachers();

  const [adminNotes, setAdminNotes] = useState(inquiry?.adminNotes || "");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedViewerUrl, setSelectedViewerUrl] = useState<string | null>(null);
  const [selectedViewerTitle, setSelectedViewerTitle] = useState<string>("معاينة المرفق الرسمي");
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Sprint 3: Rejection & Resend States
  const [isRejectMode, setIsRejectMode] = useState(false);
  const [selectedRejectionReason, setSelectedRejectionReason] = useState<string>("مرفقات خاطئة");
  const [customRejectionReason, setCustomRejectionReason] = useState<string>("");
  const [resendOption, setResendOption] = useState<"yes" | "no">("yes");
  const [createdResendInquiry, setCreatedResendInquiry] = useState<AbsenceInquiry | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showPreviousDetails, setShowPreviousDetails] = useState(false);

  // Admin Duration Adjustment States
  const [adminDaysCount, setAdminDaysCount] = useState<number>(inquiry?.daysCount || 1);
  const [adminEndDate, setAdminEndDate] = useState<string>(
    inquiry?.absenceEndDate || inquiry?.absenceDate || ""
  );
  const [isEditingDuration, setIsEditingDuration] = useState(false);

  useEffect(() => {
    if (inquiry) {
      setAdminNotes(inquiry.adminNotes || "");
      setAdminDaysCount(inquiry.daysCount || 1);
      setAdminEndDate(inquiry.absenceEndDate || inquiry.absenceDate || "");
      setIsEditingDuration(false);
      setIsRejectMode(false);
      setSelectedRejectionReason("مرفقات خاطئة");
      setCustomRejectionReason("");
      setResendOption("yes");
      setCreatedResendInquiry(null);
      setIsCopied(false);
      setShowPreviousDetails(false);
    }
  }, [inquiry]);

  if (!isOpen || !inquiry) return null;

  const teacher = teachers.find((t) => t.id === inquiry.teacherId);
  const previousInquiry = inquiry.previousInquiryId
    ? inquiries.find((i) => i.id === inquiry.previousInquiryId)
    : null;

  const handleDecision = async (status: "approved" | "rejected") => {
    setIsProcessing(true);
    setFeedback(null);
    try {
      const isMulti =
        adminDaysCount > 1 &&
        Boolean(adminEndDate && adminEndDate !== inquiry.absenceDate);
      const res = await updateInquiryDecision(
        inquiry.id,
        status,
        adminNotes,
        isEditingDuration ||
          inquiry.isMultiDay !== isMulti ||
          inquiry.daysCount !== adminDaysCount
          ? {
              absenceEndDate: isMulti ? adminEndDate : undefined,
              daysCount: adminDaysCount,
              isMultiDay: isMulti,
            }
          : undefined
      );
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

  const handleConfirmRejection = async () => {
    setIsProcessing(true);
    setFeedback(null);
    try {
      const finalReason =
        selectedRejectionReason === "أخرى"
          ? customRejectionReason.trim() || "أخرى"
          : selectedRejectionReason;

      const shouldResend =
        selectedRejectionReason === "مرفقات خاطئة" && resendOption === "yes";

      const res = await rejectInquiryWithOptionalResend(inquiry.id, {
        rejectionReason: finalReason,
        resendRequested: shouldResend,
        adminNotes: adminNotes.trim() || undefined,
      });

      if (res.success) {
        if (shouldResend && res.newInquiry) {
          setCreatedResendInquiry(res.newInquiry);
          setFeedback({
            type: "success",
            message:
              "تم رفض العذر السابق، وتم إنشاء دورة استفسار جديدة (دورة 2) بصلاحية 7 أيام كاملة للمرفقات الصحيحة.",
          });
        } else {
          setFeedback({
            type: "success",
            message: "تم رفض العذر واحتساب الغياب بدون عذر بنجاح.",
          });
          setTimeout(() => {
            onClose();
          }, 1400);
        }
      } else {
        setFeedback({
          type: "error",
          message: res.error || "فشل تسجيل رفض العذر.",
        });
      }
    } catch (err) {
      console.error("خطأ أثناء رفض العذر:", err);
      setFeedback({ type: "error", message: "حدث خطأ غير متوقع أثناء معالجة الرفض." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyResendMessage = async () => {
    if (!createdResendInquiry) return;
    const isMulti = Boolean(
      createdResendInquiry.absenceEndDate &&
        createdResendInquiry.absenceEndDate !== createdResendInquiry.absenceDate
    );
    const link = getInquiryPublicUrl(createdResendInquiry.token, {
      endDate: isMulti ? createdResendInquiry.absenceEndDate : undefined,
      daysCount: createdResendInquiry.daysCount,
    });
    const msg = generateInquiryMessage(
      createdResendInquiry.teacherName,
      createdResendInquiry.absenceDate,
      link,
      createdResendInquiry.absenceEndDate,
      createdResendInquiry.daysCount,
      true
    );
    try {
      await navigator.clipboard.writeText(msg);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.error("فشل النسخ:", err);
    }
  };

  const handleOpenResendWhatsApp = () => {
    if (!createdResendInquiry) return;
    const isMulti = Boolean(
      createdResendInquiry.absenceEndDate &&
        createdResendInquiry.absenceEndDate !== createdResendInquiry.absenceDate
    );
    const link = getInquiryPublicUrl(createdResendInquiry.token, {
      endDate: isMulti ? createdResendInquiry.absenceEndDate : undefined,
      daysCount: createdResendInquiry.daysCount,
    });
    const msg = generateInquiryMessage(
      createdResendInquiry.teacherName,
      createdResendInquiry.absenceDate,
      link,
      createdResendInquiry.absenceEndDate,
      createdResendInquiry.daysCount,
      true
    );
    const phone = createdResendInquiry.mobile || teacher?.phone || "";
    const waUrl = getWhatsAppDirectUrl(phone, msg);
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const handlePrintPdf = () => {
    try {
      printAbsencePdf({
        teacherName: inquiry.teacherName,
        username: inquiry.jobNumber,
        specialty: inquiry.specialty || teacher?.specialty || "الكادر التعليمي",
        jobTitle: teacher?.jobTitle || "معلم",
        employmentStatus: teacher?.employmentStatus || "دائم",
        absenceCount: adminDaysCount || inquiry.daysCount || 1,
        absenceDate:
          adminEndDate && adminEndDate !== inquiry.absenceDate
            ? `${inquiry.absenceDate} إلى ${adminEndDate} (${adminDaysCount || 2} أيام)`
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
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full overflow-hidden text-right flex flex-col h-[94vh] sm:h-auto sm:max-h-[92vh]"
        >
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/70 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-[#137a85] dark:text-teal-400 flex items-center justify-center shrink-0">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-2">
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
                  {inquiry.cycleNumber && inquiry.cycleNumber > 1 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/50 text-[#137a85] dark:text-teal-300 border border-teal-200 dark:border-teal-800/60">
                      دورة بديلة #{inquiry.cycleNumber}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  معاينة رد المعلمة، فحص التقرير المرفق، واتخاذ القرار الإداري
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0 touch-target"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
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

            {/* Created Resend Inquiry WhatsApp Action Card */}
            {createdResendInquiry ? (
              <div className="p-5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border-2 border-teal-500/30 dark:border-teal-500/40 space-y-4 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-teal-500 text-white flex items-center justify-center shrink-0 shadow-md">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-teal-950 dark:text-teal-100">
                      جاهز للإرسال: رابط المساءلة البديل (دورة {createdResendInquiry.cycleNumber || 2})
                    </h3>
                    <p className="text-xs text-teal-700 dark:text-teal-300 mt-0.5">
                      تم إنشاء الرابط الجديد وتوثيق رفض المرفقات السابقة مع الحفاظ على كامل السجل.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800/60 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold">المعلمة:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      {createdResendInquiry.teacherName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold">صلاحية الرابط الجديد:</span>
                    <span className="font-bold text-teal-700 dark:text-teal-300">
                      7 أيام كاملة (تنتهي: {formatSaudiDateTime(createdResendInquiry.expiresAt, { dateOnly: true })})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold">رقم الجوال:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 dir-ltr">
                      {createdResendInquiry.mobile || teacher?.phone || "غير محدد"}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    تنبيه نظامي: لا يتم إرسال الرسالة تلقائياً بدون تدخل المستخدم. يرجى النقر على زر فتح واتساب أدناه لإرسال الرابط الجديد مباشرة للمعلمة.
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleOpenResendWhatsApp}
                    className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm touch-target"
                  >
                    <Send className="w-4 h-4" />
                    <span>فتح واتساب وإرسال الرابط الجديد</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyResendMessage}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer touch-target"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-600 font-bold">تم نسخ الرسالة!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>نسخ رسالة ورابط الواتساب</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Previous Inquiry History Badge (Cycle 2+) */}
                {inquiry.previousInquiryId && previousInquiry && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold">
                        <History className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>هذه دورة مساءلة بديلة (دورة {inquiry.cycleNumber || 2})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPreviousDetails(!showPreviousDetails)}
                        className="text-[11px] font-bold text-amber-800 dark:text-amber-300 underline cursor-pointer"
                      >
                        {showPreviousDetails ? "إخفاء تفاصيل المساءلة السابقة" : "عرض تفاصيل المساءلة السابقة"}
                      </button>
                    </div>
                    <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90">
                      تم إنشاء هذه الدورة البديلة بعد رفض المرفقات السابقة بسبب:{" "}
                      <strong>{previousInquiry.rejectionReason || "مرفقات خاطئة"}</strong>.
                    </p>

                    {showPreviousDetails && (
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-800/60 space-y-2 text-slate-700 dark:text-slate-300">
                        <div>
                          <span className="text-[11px] text-slate-400 block">مبرر المعلمة السابق:</span>
                          <p className="text-xs bg-slate-50 dark:bg-slate-800 p-2 rounded-lg mt-0.5">
                            {previousInquiry.teacherReason || "لا توجد إفادة مسجلة"}
                          </p>
                        </div>
                        {previousInquiry.attachmentUrl && (
                          <div>
                            <span className="text-[11px] text-slate-400 block mb-1">المرفقات السابقة المرفوضة:</span>
                            <div className="flex flex-wrap gap-2">
                              {parseAttachments(previousInquiry.attachmentUrl).map((att, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setSelectedViewerUrl(att.url);
                                    setSelectedViewerTitle(`المرفق السابق: ${att.label}`);
                                    setIsViewerOpen(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>{att.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Already Rejected Notice */}
                {inquiry.status === "rejected" && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs space-y-1.5">
                    <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold">
                      <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                      <span>هذه المساءلة تم رفضها</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400">
                      سبب الرفض المسجل: <strong>{inquiry.rejectionReason || "عذر غير مقبول"}</strong>
                    </p>
                    {inquiry.resendRequested && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 dark:bg-teal-950 text-[#137a85] dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        <RefreshCw className="w-3 h-3" />
                        <span>تمت إعادة الإرسال للمعلمة برابط جديد</span>
                      </span>
                    )}
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
                      {adminEndDate && adminEndDate !== inquiry.absenceDate
                        ? "فترة الغياب"
                        : "تاريخ الغياب"}
                    </span>
                    <div className="mt-0.5">
                      <DualDateBadge
                        date={inquiry.absenceDate}
                        endDate={adminEndDate && adminEndDate !== inquiry.absenceDate ? adminEndDate : undefined}
                        compact
                      />
                      {adminEndDate && adminEndDate !== inquiry.absenceDate && (
                        <span className="text-[10px] text-teal-700 dark:text-teal-300 font-bold block mt-0.5">
                          ({adminDaysCount} أيام)
                        </span>
                      )}
                    </div>
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

                {/* Multi-day Absence Extension Notice & Admin Editor */}
                {inquiry.status !== "approved" && inquiry.status !== "rejected" && (
                  <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/60 text-xs space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-teal-900 dark:text-teal-200">
                        <Calendar className="w-4 h-4 text-[#137a85] dark:text-teal-400 shrink-0" />
                        <span>
                          {adminDaysCount > 1 ? (
                            <>
                              المساءلة تغطي غياباً ممتداً لمدة <strong>({adminDaysCount} أيام)</strong> من{" "}
                              <strong>{inquiry.absenceDate}</strong> إلى <strong>{adminEndDate}</strong>.
                            </>
                          ) : (
                            <>
                              المساءلة مسجلة ليوم واحد: <strong>{inquiry.absenceDate}</strong>.
                            </>
                          )}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsEditingDuration(!isEditingDuration)}
                        className="text-[11px] font-bold text-[#137a85] dark:text-teal-400 hover:underline shrink-0 cursor-pointer"
                      >
                        {isEditingDuration ? "إغلاق التعديل" : "تعديل مدة الغياب المعتمدة"}
                      </button>
                    </div>

                    {isEditingDuration && (
                      <div className="pt-2 border-t border-teal-200/60 dark:border-teal-800/40 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            تعديل عدد الأيام المعتمدة (1 إلى 5):
                          </label>
                          <div className="grid grid-cols-5 gap-1.5">
                            {[1, 2, 3, 4, 5].map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => {
                                  setAdminDaysCount(d);
                                  setAdminEndDate(
                                    d > 1 ? addDaysToDateStr(inquiry.absenceDate, d - 1) : inquiry.absenceDate
                                  );
                                }}
                                className={cn(
                                  "py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer text-center",
                                  adminDaysCount === d
                                    ? "bg-[#137a85] text-white border-[#137a85]"
                                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#137a85]"
                                )}
                              >
                                {d} {d === 1 ? "يوم" : "أيام"}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            تاريخ نهاية الغياب:
                          </label>
                          <input
                            type="date"
                            value={adminEndDate}
                            min={inquiry.absenceDate}
                            max={addDaysToDateStr(inquiry.absenceDate, 4)}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAdminEndDate(val);
                              const days = calculateDaysBetween(inquiry.absenceDate, val);
                              setAdminDaysCount(Math.min(5, Math.max(1, days)));
                            }}
                            className="w-full p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-800 dark:text-slate-200"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
                              <div
                                onClick={() => {
                                  setSelectedViewerUrl(att.url);
                                  setSelectedViewerTitle(`${att.label} — ${inquiry.teacherName}`);
                                  setIsViewerOpen(true);
                                }}
                                className="w-full p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 hover:border-teal-500 dark:hover:border-teal-400 transition-all cursor-pointer shadow-2xs group flex flex-col items-center justify-center text-center gap-3"
                              >
                                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                                  <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-1.5">
                                    <span>{att.label} (مستند PDF)</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                      معتمد
                                    </span>
                                  </h4>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                    انقري هنا لعرض المستند بالحجم الكامل أو فتحه في قارئ الـ PDF المستقل
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center justify-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedViewerUrl(att.url);
                                      setSelectedViewerTitle(`${att.label} — ${inquiry.teacherName}`);
                                      setIsViewerOpen(true);
                                    }}
                                    className="px-3.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-[#137a85] dark:text-teal-300 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer touch-target"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>معاينة وتكبير المرفق</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openSafeAttachmentUrl(att.url, `${inquiry.teacherName}_${att.label}`)}
                                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer touch-target"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>فتح في نافذة مستقلة</span>
                                  </button>
                                </div>
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

                {/* Rejection Configuration Panel (when in reject mode) */}
                {isRejectMode && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 space-y-4 animate-in fade-in">
                    <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
                      <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm">تحديد سبب رفض العذر</h4>
                        <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
                          يرجى اختيار سبب الرفض النظامي المعتمد لتوثيقه في السجل الإداري.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        سبب الرفض:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {REJECTION_REASONS.map((reason) => (
                          <button
                            key={reason}
                            type="button"
                            onClick={() => setSelectedRejectionReason(reason)}
                            className={cn(
                              "p-3 rounded-xl text-xs font-bold text-right border transition-all cursor-pointer flex items-center justify-between",
                              selectedRejectionReason === reason
                                ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-400"
                            )}
                          >
                            <span>{reason}</span>
                            {selectedRejectionReason === reason && <Check className="w-4 h-4" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedRejectionReason === "أخرى" && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          اكتب سبب الرفض بالتفصيل:
                        </label>
                        <input
                          type="text"
                          value={customRejectionReason}
                          onChange={(e) => setCustomRejectionReason(e.target.value)}
                          placeholder="مثال: عدم وضوح الختم الطبي، تقرير صادر من جهة غير معتمدة..."
                          className="w-full p-2.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                        />
                      </div>
                    )}

                    {/* Resend Question — Triggered ONLY when reason is "مرفقات خاطئة" */}
                    {selectedRejectionReason === "مرفقات خاطئة" && (
                      <div className="p-4 rounded-xl bg-white dark:bg-slate-850 border border-rose-200 dark:border-rose-800 space-y-3">
                        <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-xs">
                          <RefreshCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>هل تريد إعادة إرسال الاستفسار للمعلم عبر واتساب؟</span>
                        </div>

                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                          عند اختيار <strong>&quot;نعم&quot;</strong>: سيتم حفظ المساءلة الحالية كمرفوضة، وإنشاء دورة استفسار جديدة (دورة 2) برابط سري جديد وصلاحية كاملة لمدة <strong>7 أيام (168 ساعة)</strong>، مع الحفاظ على رد ومرفقات المعلمة السابقة في السجل دون حذف.
                        </p>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setResendOption("yes")}
                            className={cn(
                              "p-3 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer flex items-center justify-center gap-1.5",
                              resendOption === "yes"
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500"
                            )}
                          >
                            <Check className="w-4 h-4" />
                            <span>نعم، إعادة الإرسال (موصى به)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setResendOption("no")}
                            className={cn(
                              "p-3 rounded-xl text-xs font-bold text-center border transition-all cursor-pointer flex items-center justify-center gap-1.5",
                              resendOption === "no"
                                ? "bg-slate-800 text-white border-slate-800 shadow-xs"
                                : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                            )}
                          >
                            <span>لا، بدون إعادة إرسال</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 pb-safe bg-slate-50/70 dark:bg-slate-850/70 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            {createdResendInquiry ? (
              <div className="w-full flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  تم توثيق الرفض وتجهيز الرابط بنجاح
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
                >
                  إغلاق النافذة
                </button>
              </div>
            ) : isRejectMode ? (
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setIsRejectMode(false)}
                  disabled={isProcessing}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                >
                  إلغاء والتراجع
                </button>

                <button
                  type="button"
                  onClick={handleConfirmRejection}
                  disabled={isProcessing}
                  className={cn(
                    "w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm",
                    selectedRejectionReason === "مرفقات خاطئة" && resendOption === "yes"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  )}
                >
                  {isProcessing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : selectedRejectionReason === "مرفقات خاطئة" && resendOption === "yes" ? (
                    <RefreshCw className="w-3.5 h-3.5" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {selectedRejectionReason === "مرفقات خاطئة" && resendOption === "yes"
                      ? "تأكيد الرفض وإعادة الإرسال"
                      : "تأكيد الرفض واحتساب غياب بدون عذر"}
                  </span>
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handlePrintPdf}
                  className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all shadow-2xs cursor-pointer touch-target"
                >
                  <FileDown className="w-4 h-4 text-[#137a85] dark:text-teal-400" />
                  <span>تصدير استمارة المساءلة (PDF)</span>
                </button>

                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto justify-end">
                  {inquiry.status !== "approved" && inquiry.status !== "rejected" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsRejectMode(true)}
                        disabled={isProcessing}
                        className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60 dark:hover:bg-rose-900/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 touch-target"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>رفض العذر</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDecision("approved")}
                        disabled={isProcessing}
                        className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:shadow disabled:opacity-50 touch-target"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>قبول واعتماد العذر</span>
                      </button>
                    </>
                  )}

                  {(inquiry.status === "approved" || inquiry.status === "rejected") && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer touch-target"
                    >
                      إغلاق
                    </button>
                  )}
                </div>
              </>
            )}
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
