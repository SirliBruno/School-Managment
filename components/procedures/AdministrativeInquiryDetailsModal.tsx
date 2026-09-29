"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  X,
  FileQuestion,
  Calendar,
  User,
  Printer,
  Share2,
  FileEdit,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Paperclip,
  ExternalLink,
  Globe,
  Tag,
} from "lucide-react";
import { AdministrativeInquiry } from "@/types/teacher";
import { useTeachers } from "@/context/TeacherContext";
import { printAdministrativeInquiryPdf } from "@/lib/printAdministrativeInquiryPdfService";
import { openAdministrativeInquiryWhatsApp } from "@/lib/administrativeInquiryWhatsappService";

interface AdministrativeInquiryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: AdministrativeInquiry | null;
  onEdit?: (inquiry: AdministrativeInquiry) => void;
  onReview?: (inquiry: AdministrativeInquiry) => void;
}

export const AdministrativeInquiryDetailsModal: React.FC<AdministrativeInquiryDetailsModalProps> = ({
  isOpen,
  onClose,
  inquiry,
  onEdit,
  onReview,
}) => {
  const { teachers, markAdministrativeInquiryLinkShared } = useTeachers();

  if (!isOpen || !inquiry) return null;

  const teacher = teachers.find((t) => t.id === inquiry.teacherId);
  const mobile = teacher?.mobile;

  const handlePrint = () => {
    printAdministrativeInquiryPdf(inquiry);
  };

  const handleShareWhatsApp = () => {
    openAdministrativeInquiryWhatsApp(inquiry, mobile);
    markAdministrativeInquiryLinkShared(inquiry.id);
  };

  const isExpired =
    inquiry.status === "pending_teacher" &&
    inquiry.tokenExpiresAt &&
    new Date(inquiry.tokenExpiresAt).getTime() < Date.now();

  const getStatusBadge = () => {
    if (isExpired) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
          <Clock className="w-3.5 h-3.5" />
          منتهية الصلاحية (تجاوزت 48 ساعة)
        </span>
      );
    }
    switch (inquiry.status) {
      case "pending_teacher":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5" />
            بانتظار إفادة المعلمة
          </span>
        );
      case "pending_director":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <ShieldCheck className="w-3.5 h-3.5" />
            تم الرد - بانتظار قرار الإدارة
          </span>
        );
      case "completed":
        return inquiry.directorDecision === "accepted" ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            عذر مقبول ومحفوظة
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5" />
            عذر غير مقبول
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      dir="rtl"
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-violet-700 via-indigo-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
              <FileQuestion className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">تفاصيل المساءلة الإدارية</h2>
              <p className="text-xs text-white/80 mt-0.5">
                رقم المساءلة: {inquiry.inquiryNumber || "—"} | تاريخ الواقعة: {inquiry.incidentDate}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[calc(85vh-140px)] overflow-y-auto custom-scrollbar">
          {/* Status & Teacher Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  {inquiry.teacherName}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {inquiry.jobTitle || "معلم"} — {inquiry.specialty || "عام"} (سجل: {inquiry.nationalId || inquiry.jobNumber || "—"})
                </div>
              </div>
            </div>
            <div>{getStatusBadge()}</div>
          </div>

          {/* Violation Details */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-400">
              <Tag className="w-4 h-4" />
              <span>
                موضوع المساءلة: {inquiry.inquiryType === "أخرى" ? inquiry.customType || "أخرى" : inquiry.inquiryType}
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 whitespace-pre-wrap">
              {inquiry.description || "لا يوجد وصف مدون"}
            </p>
            {inquiry.vicePrincipalNotes && (
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300">ملاحظات الوكيلة:</span>
                <span>{inquiry.vicePrincipalNotes}</span>
              </div>
            )}
          </div>

          {/* Teacher Response */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/50 space-y-3">
            <div className="flex items-center justify-between border-b border-indigo-200/50 dark:border-indigo-900/50 pb-2">
              <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                إفادة المعلمة الخطية
              </span>
              {inquiry.responseDate && (
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>بتاريخ: {inquiry.responseDate}</span>
                  {inquiry.responseIp && (
                    <span className="font-mono flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {inquiry.responseIp}
                    </span>
                  )}
                </div>
              )}
            </div>

            {inquiry.teacherResponse ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-indigo-100 dark:border-slate-800">
                  {inquiry.teacherResponse}
                </p>

                {inquiry.attachmentUrl && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                      <span>المرفق الداعم للإفادة</span>
                    </div>
                    <a
                      href={inquiry.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>معاينة المرفق</span>
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 text-center text-xs text-slate-500 dark:text-slate-400">
                لم تقدم المعلمة ردها بعد على رابط المساءلة.
              </div>
            )}
          </div>

          {/* Director Decision (if made) */}
          {inquiry.directorDecision && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>قرار مديرة المدرسة</span>
                </div>
                {inquiry.decisionDate && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    تاريخ الاعتماد: {inquiry.decisionDate}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs font-bold">
                {inquiry.directorDecision === "accepted" ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    عذر مقبول — اكتفاء بالإفادة
                  </span>
                ) : (
                  <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <XCircle className="w-4 h-4" />
                    عذر غير مقبول — اتخاذ الإجراء النظامي
                  </span>
                )}
              </div>
              {inquiry.directorNotes && (
                <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  {inquiry.directorNotes}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة النموذج الرسمي (PDF)</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-4 py-2 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 flex items-center gap-1.5 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>إرسال الرابط عبر واتساب</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onEdit && inquiry.status === "pending_teacher" && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(inquiry);
                }}
                className="px-4 py-2 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 flex items-center gap-1.5 transition-colors"
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>تعديل</span>
              </button>
            )}

            {onReview && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReview(inquiry);
                }}
                className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{inquiry.status === "completed" ? "تعديل القرار" : "مراجعة واعتماد القرار"}</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
