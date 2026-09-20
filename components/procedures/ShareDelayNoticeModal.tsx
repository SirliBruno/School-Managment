"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Share2,
  Copy,
  CheckCircle2,
  ExternalLink,
  Clock,
  Calendar,
  User,
  Shield,
  MessageSquare,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { useToast } from "@/context/ToastContext";
import { DelayNotice, Teacher } from "@/types/teacher";
import {
  formatSaudiMobile,
  generateDelayNoticeWhatsAppMessage,
  getWhatsAppDirectUrl,
} from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

interface ShareDelayNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  notice: DelayNotice | null;
}

export const ShareDelayNoticeModal: React.FC<ShareDelayNoticeModalProps> = ({
  isOpen,
  onClose,
  notice,
}) => {
  const { teachers, markDelayNoticeLinkShared } = useTeachers();
  const { showToast } = useToast();

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedFullMessage, setCopiedFullMessage] = useState(false);

  // Find teacher associated with the notice to get mobile number and details
  const teacher: Teacher | undefined = notice
    ? teachers.find((t) => t.id === notice.teacherId)
    : undefined;

  const teacherName = notice?.teacherName || teacher?.fullName || "المعلمة";
  const teacherMobile = teacher?.mobile || "";
  const noticeDate = notice?.noticeDate || notice?.date || "";

  // Compute public full URL
  const [publicUrl, setPublicUrl] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined" && notice?.shareToken) {
      const origin = window.location.origin;
      setPublicUrl(`${origin}/teacher-response/${notice.shareToken}`);
    } else {
      setPublicUrl("");
    }
    setCopiedLink(false);
    setCopiedFullMessage(false);
  }, [notice]);

  if (!isOpen || !notice) return null;

  const fullWhatsAppMessage = generateDelayNoticeWhatsAppMessage(
    teacherName,
    noticeDate,
    publicUrl
  );

  const handleCopyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedLink(true);
      markDelayNoticeLinkShared(notice.id);
      showToast({
        message: "تم نسخ الرابط العام بنجاح",
        type: "success",
      });
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      showToast({
        message: "تعذر نسخ الرابط تلقائياً، يرجى نسخه يدوياً",
        type: "error",
      });
    }
  };

  const handleCopyFullMessage = async () => {
    try {
      await navigator.clipboard.writeText(fullWhatsAppMessage);
      setCopiedFullMessage(true);
      markDelayNoticeLinkShared(notice.id);
      showToast({
        message: "تم نسخ الرسالة والرابط بالكامل",
        type: "success",
      });
      setTimeout(() => setCopiedFullMessage(false), 2500);
    } catch {
      showToast({
        message: "تعذر نسخ الرسالة، يرجى نسخها يدوياً",
        type: "error",
      });
    }
  };

  const handleOpenWhatsApp = () => {
    markDelayNoticeLinkShared(notice.id);
    const waUrl = getWhatsAppDirectUrl(teacherMobile, fullWhatsAppMessage);
    window.open(waUrl, "_blank");
    showToast({
      message: "جاري فتح تطبيق الواتساب...",
      type: "info",
    });
  };

  // Helper summary of violations
  const violationsList: string[] = [];
  if (notice.violationDelayStart) {
    violationsList.push(`تأخر صباحي (حضور ${notice.delayStartTime || "—"})`);
  }
  if (notice.violationAbsentDuring) {
    violationsList.push(
      `عدم تواجد أثناء الدوام (من ${notice.absentFromTime || "—"} إلى ${
        notice.absentToTime || "—"
      })`
    );
  }
  if (notice.violationEarlyDeparture) {
    violationsList.push(`انصراف مبكر (${notice.earlyDepartureTime || "—"})`);
  }
  if (notice.violationLeftSchool) {
    violationsList.push(
      `خروج وعودة أثناء الدوام (${notice.leftSchoolDetails || "تفاصيل مسجلة"})`
    );
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-10 flex flex-col my-auto max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-l from-teal-50/70 via-white to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600/10 text-teal-700 flex items-center justify-center">
                <Share2 className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800">
                  مشاركة تنبيه التأخر مع المعلمة
                </h3>
                <p className="text-xs text-slate-500">
                  رابط إلكتروني مؤمن للمعلمة لتقديم إفادتها عبر الجوال
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-right">
            {/* Teacher & Notice Overview Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-teal-600" />
                  <span className="text-sm font-bold text-slate-800">
                    {teacherName}
                  </span>
                  {notice.noticeNumber && (
                    <span className="text-xs px-2 py-0.5 rounded-md bg-teal-100/80 text-teal-800 font-mono font-bold">
                      {notice.noticeNumber}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>تاريخ التنبيه: {noticeDate}</span>
                </div>
              </div>

              {/* Violations Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {violationsList.map((v, i) => (
                  <span
                    key={i}
                    className="text-xs bg-white text-slate-700 border border-slate-200 px-2.5 py-1 rounded-md font-medium"
                  >
                    • {v}
                  </span>
                ))}
              </div>

              {/* Mobile Number Badge */}
              <div className="text-xs text-slate-500 pt-1 flex items-center justify-between border-t border-slate-200/60 mt-2">
                <span>رقم الجوال المسجل:</span>
                {teacherMobile ? (
                  <span className="font-mono font-bold text-slate-700 dir-ltr">
                    {teacherMobile}
                  </span>
                ) : (
                  <span className="text-amber-600 font-medium">
                    غير مسجل بالملف (سيُفتح الواتساب لاختيار جهة الاتصال)
                  </span>
                )}
              </div>
            </div>

            {/* Unique Link Input Section */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                الرابط المباشر للمعلمة (مؤمن وفريد)
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    readOnly
                    value={publicUrl}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-mono text-left select-all focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
                <button
                  onClick={handleCopyLink}
                  type="button"
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs transition whitespace-nowrap shadow-sm",
                    copiedLink
                      ? "bg-emerald-600 text-white"
                      : "bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200"
                  )}
                >
                  {copiedLink ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>نسخ الرابط</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>الرابط صالح لمدة 7 أيام من تاريخ الإصدار.</span>
              </p>
            </div>

            {/* WhatsApp Message Preview Section */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                معاينة رسالة الواتساب الرسمية
              </label>
              <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-3.5 text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-line shadow-inner">
                {fullWhatsAppMessage}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              {/* Primary Green WhatsApp Action Button */}
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="w-full flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 px-4 rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 active:scale-[0.99] transition duration-150"
              >
                <svg
                  className="w-5 h-5 fill-current"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.158.572 4.184 1.572 5.941l-1.669 6.095 6.273-1.644c1.701.927 3.652 1.458 5.724 1.458 6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12zm0 21.854c-1.895 0-3.666-.523-5.187-1.431l-.372-.222-3.859 1.012 1.03-3.762-.244-.388c-1.003-1.597-1.568-3.488-1.568-5.503 0-5.432 4.418-9.85 9.85-9.85 5.432 0 9.85 4.418 9.85 9.85 0 5.432-4.418 9.85-9.85 9.85z" />
                </svg>
                <span>إرسال عبر الواتساب مباشرة</span>
              </button>

              {/* Secondary Action: Copy Full Message */}
              <button
                type="button"
                onClick={handleCopyFullMessage}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-4 rounded-xl font-semibold text-xs transition"
              >
                {copiedFullMessage ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">
                      تم نسخ الرسالة والرابط بالكامل
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>نسخ نص الرسالة بالكامل لمشاركته بوسائل أخرى (SMS / إيميل)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Footer Note */}
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-teal-600" />
              رابط إلكتروني رسمي مؤمن وفق اللائحة الإدارية
            </span>
            <button
              onClick={onClose}
              className="text-slate-600 hover:text-slate-800 font-bold"
            >
              إغلاق
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
