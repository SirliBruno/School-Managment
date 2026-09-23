"use client";

import React, { useState, useEffect, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ShieldCheck,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
  User,
  Check,
  Ban,
  Clock,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { useToast } from "@/context/ToastContext";
import { DelayNotice, DirectorOpinion } from "@/types/teacher";
import { cn } from "@/lib/utils";
import { getSaudiToday } from "@/lib/timeUtils";

interface DirectorDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  notice: DelayNotice | null;
}

export const DirectorDecisionModal: React.FC<DirectorDecisionModalProps> = ({
  isOpen,
  onClose,
  notice,
}) => {
  const { submitDirectorDecision } = useTeachers();
  const { showToast } = useToast();
  const formId = useId();

  const [directorOpinion, setDirectorOpinion] =
    useState<DirectorOpinion>("accepted");
  const [directorNotes, setDirectorNotes] = useState("");
  const [directorSignedAt, setDirectorSignedAt] = useState(() => {
    return getSaudiToday();
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (notice) {
      setDirectorOpinion(notice.directorOpinion || "accepted");
      setDirectorNotes(notice.directorNotes || "");
      setDirectorSignedAt(
        notice.directorSignedAt || getSaudiToday()
      );
    }
    setErrorMsg(null);
  }, [notice, isOpen]);

  if (!isOpen || !notice) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!directorOpinion) {
      setErrorMsg("يرجى تحديد رأي وقرار مديرة المدرسة.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const res = await submitDirectorDecision(
        notice.id,
        directorOpinion,
        directorNotes.trim() || undefined,
        directorSignedAt
      );

      if (res.success) {
        showToast({
          message:
            directorOpinion === "accepted"
              ? `تم اعتماد قرار قبول العذر لتنبيه المعلمة (${notice.teacherName}) وحفظه بنجاح.`
              : `تم اعتماد قرار عدم قبول العذر والحسم لتنبيه المعلمة (${notice.teacherName}).`,
          type: "success",
        });
        onClose();
      } else {
        setErrorMsg(res.error || "فشل تسجيل قرار المديرة.");
      }
    } catch (err) {
      console.error("خطأ تسجيل قرار المديرة:", err);
      setErrorMsg("حدث خطأ غير متوقع أثناء تسجيل القرار.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden text-right flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>قرار مديرة المدرسة</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    المرحلة الثالثة (النهائية)
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  فحص إفادة المعلمة وإصدار التوجيه الإداري النهائي
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

            {/* Teacher's Statement Display */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-sky-600" />
                <span>إفادة ومبرر المعلمة المسجلة:</span>
                {(notice.teacherSignatureDate || notice.teacherSignedAt) && (
                  <span className="text-[11px] text-slate-400 font-normal ms-auto">
                    بتاريخ: {notice.teacherSignatureDate || notice.teacherSignedAt}
                  </span>
                )}
              </label>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
                {notice.teacherReason || "لا توجد إفادة مسجلة بعد."}
              </div>
            </div>

            {/* Decision Radio Cards */}
            <div className="space-y-2.5 pt-1">
              <label className="block text-xs font-bold text-slate-800">
                رأي وتوجيه مديرة المدرسة <span className="text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. قبول العذر */}
                <div
                  onClick={() => setDirectorOpinion("accepted")}
                  className={cn(
                    "p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 select-none",
                    directorOpinion === "accepted"
                      ? "bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-400/30"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>قبول العذر</span>
                    </span>
                    <span
                      className={cn(
                        "w-4 h-4 rounded-full border flex items-center justify-center",
                        directorOpinion === "accepted"
                          ? "border-emerald-600 bg-emerald-600"
                          : "border-slate-300 bg-white"
                      )}
                    >
                      {directorOpinion === "accepted" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    قبول عذر المعلمة وحفظ التنبيه في ملفها الإداري دون إجراء حسم من الراتب.
                  </p>
                </div>

                {/* 2. عدم قبول العذر والحسم */}
                <div
                  onClick={() => setDirectorOpinion("rejected_with_deduction")}
                  className={cn(
                    "p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 select-none",
                    directorOpinion === "rejected_with_deduction"
                      ? "bg-rose-50/70 border-rose-300 ring-2 ring-rose-400/30"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                      <Ban className="w-4 h-4 text-rose-600" />
                      <span>عدم قبول العذر والحسم</span>
                    </span>
                    <span
                      className={cn(
                        "w-4 h-4 rounded-full border flex items-center justify-center",
                        directorOpinion === "rejected_with_deduction"
                          ? "border-rose-600 bg-rose-600"
                          : "border-slate-300 bg-white"
                      )}
                    >
                      {directorOpinion === "rejected_with_deduction" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-800 leading-relaxed">
                    عدم قبول العذر، والحسم من راتب المعلمة بمقدار ساعات التأخر / الانصراف.
                  </p>
                </div>
              </div>
            </div>

            {/* Optional Director Notes */}
            <div className="space-y-1.5">
              <label
                htmlFor={`${formId}-notes`}
                className="block text-xs font-bold text-slate-700"
              >
                توجيهات أو ملاحظات إضافية (اختياري)
              </label>
              <textarea
                id={`${formId}-notes`}
                rows={2}
                value={directorNotes}
                onChange={(e) => setDirectorNotes(e.target.value)}
                placeholder="توجيه المعلمة بالالتزام، تحويل لشؤون الموظفين، أو توثيق ساعات التأخر المجمعة..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#137a85]/20 focus:border-[#137a85] transition-all resize-none shadow-2xs"
              />
            </div>

            {/* Signature Date */}
            <div className="space-y-1.5">
              <label
                htmlFor={`${formId}-sig-date`}
                className="block text-xs font-bold text-slate-700"
              >
                تاريخ توقيع واعتماد المديرة <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id={`${formId}-sig-date`}
                  type="date"
                  value={directorSignedAt}
                  onChange={(e) => setDirectorSignedAt(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs md:text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#137a85]/20 focus:border-[#137a85] transition-all shadow-2xs"
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
              className={cn(
                "w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow disabled:opacity-60",
                directorOpinion === "accepted"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              )}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>اعتماد قرار المديرة وإغلاق التنبيه</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
