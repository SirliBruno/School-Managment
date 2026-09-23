"use client";

import React, { useState, useEffect, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FileEdit,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  User,
  AlertTriangle,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { useToast } from "@/context/ToastContext";
import { DelayNotice } from "@/types/teacher";
import { cn } from "@/lib/utils";
import { getSaudiToday } from "@/lib/timeUtils";

interface TeacherResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  notice: DelayNotice | null;
}

export const TeacherResponseModal: React.FC<TeacherResponseModalProps> = ({
  isOpen,
  onClose,
  notice,
}) => {
  const { submitTeacherResponse } = useTeachers();
  const { showToast } = useToast();
  const formId = useId();

  const [teacherReason, setTeacherReason] = useState("");
  const [teacherSignedAt, setTeacherSignedAt] = useState(() => {
    return getSaudiToday();
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (notice) {
      setTeacherReason(notice.teacherReason || "");
      setTeacherSignedAt(
        notice.teacherSignatureDate ||
          notice.teacherSignedAt ||
          getSaudiToday()
      );
    }
    setErrorMsg(null);
  }, [notice, isOpen]);

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

  if (!isOpen || !notice) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teacherReason.trim()) {
      setErrorMsg("يرجى كتابة أسباب التأخر / عدم التواجد / الانصراف في خانة الإفادة.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const res = submitTeacherResponse(
        notice.id,
        teacherReason.trim(),
        teacherSignedAt
      );

      if (res.success) {
        showToast({
          message: `تم تسجيل إفادة المعلمة (${notice.teacherName || "المعلمة"}) بنجاح. التنبيه الآن بانتظار قرار المديرة.`,
          type: "success",
        });
        onClose();
      } else {
        setErrorMsg(res.error || "فشل تسجيل إفادة المعلمة.");
      }
    } catch (err) {
      console.error("خطأ تسجيل إفادة المعلمة:", err);
      setErrorMsg("حدث خطأ غير متوقع أثناء تسجيل الإفادة.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden text-right flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shadow-sm">
                <FileEdit className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>تسجيل إفادة المعلمة</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                    المرحلة الثانية
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  توثيق أسباب ومبررات المعلمة عن واقعة التأخر أو الانصراف
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق النافذة"
              className="w-8 h-8 rounded-xl bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Notice Summary Card */}
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">المعلمة</span>
                <span className="font-bold text-slate-900 mt-0.5 block truncate">
                  {notice.teacherName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">رقم الإشعار</span>
                <span className="font-bold text-[#137a85] mt-0.5 block font-mono">
                  {notice.noticeNumber || `ت-${notice.id.slice(-4)}`}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">تاريخ الواقعة</span>
                <span className="font-bold text-slate-800 mt-0.5 block font-mono">
                  {notice.noticeDate || notice.date}
                </span>
              </div>
            </div>

            {/* Violations Summary */}
            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>المخالفات المسجلة بحق المعلمة:</span>
              </div>
              <ul className="list-disc list-inside space-y-1.5 text-amber-900 pr-2">
                {notice.violationDelayStart && (
                  <li>
                    تأخركم من بداية الدوام وحضوركم الساعة (
                    {notice.delayStartFromTime ? `من ${notice.delayStartFromTime} إلى ` : "حضور: "}
                    <strong>{notice.delayStartTime || "—"}</strong>
                    {notice.calculatedDuration && ` — المدة: ${notice.calculatedDuration}`})
                  </li>
                )}
                {notice.violationAbsentDuring && (
                  <li>
                    عدم تواجدكم أثناء الدوام من الساعة (
                    <strong>{notice.absentFromTime || "—"}</strong>) إلى الساعة (
                    <strong>{notice.absentToTime || "—"}</strong>
                    {notice.calculatedDuration && ` — المدة: ${notice.calculatedDuration}`})
                  </li>
                )}
                {notice.violationEarlyDeparture && (
                  <li>
                    انصرافكم مبكراً قبل نهاية الدوام من الساعة (
                    {notice.earlyDepartureFromTime ? `من ${notice.earlyDepartureFromTime} إلى ` : "انصراف: "}
                    <strong>{notice.earlyDepartureTime || "—"}</strong>
                    {notice.calculatedDuration && ` — المدة: ${notice.calculatedDuration}`})
                  </li>
                )}
                {notice.violationLeftSchool && (
                  <li>
                    انصرافكم من غير المدرسة (
                    {notice.leftSchoolFromTime && notice.leftSchoolToTime
                      ? `من ${notice.leftSchoolFromTime} إلى ${notice.leftSchoolToTime}`
                      : notice.leftSchoolDetails || "—"}
                    {notice.calculatedDuration && ` — المدة: ${notice.calculatedDuration}`})
                  </li>
                )}
              </ul>
            </div>

            {/* Teacher Justification Input */}
            <div className="space-y-1.5">
              <label
                htmlFor={`${formId}-reason`}
                className="block text-xs font-bold text-slate-700"
              >
                أسباب التأخر / عدم التواجد / الانصراف المبكر <span className="text-rose-500">*</span>
              </label>
              <textarea
                id={`${formId}-reason`}
                rows={4}
                value={teacherReason}
                onChange={(e) => setTeacherReason(e.target.value)}
                placeholder="اكتبي بالتفصيل مبرر وإفادة المعلمة عن الواقعة كما وردت منها..."
                className="w-full p-3.5 rounded-xl border border-slate-200 text-xs md:text-sm bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all resize-none shadow-sm leading-relaxed"
              />
            </div>

            {/* Signature Date */}
            <div className="space-y-1.5">
              <label
                htmlFor={`${formId}-sig-date`}
                className="block text-xs font-bold text-slate-700"
              >
                تاريخ توقيع وإفادة المعلمة <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id={`${formId}-sig-date`}
                  type="date"
                  value={teacherSignedAt}
                  onChange={(e) => setTeacherSignedAt(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs md:text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#137a85]/20 focus:border-[#137a85] transition-all shadow-sm"
                />
              </div>
            </div>
          </form>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isProcessing}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow disabled:opacity-60"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-sky-200" />
              )}
              <span>حفظ الإفادة وإحالة التنبيه للمديرة</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
