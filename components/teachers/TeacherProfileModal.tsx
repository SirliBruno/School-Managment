"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Briefcase,
  GraduationCap,
  Calendar,
  FileDown,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileCheck,
  Pencil,
  Trash2,
  Clock,
  ShieldCheck,
  FileEdit,
} from "lucide-react";
import { Teacher, AbsenceRecord, AbsenceType, DelayNotice } from "@/types/teacher";
import { useTeachers } from "@/context/TeacherContext";
import { useToast } from "@/context/ToastContext";
import { EditAbsenceModal } from "@/components/procedures/EditAbsenceModal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { printAbsencePdf } from "@/lib/printPdfService";
import { printDelayNoticePdf } from "@/lib/printDelayNoticePdfService";
import { cn } from "@/lib/utils";

interface TeacherProfileModalProps {
  teacher: Teacher | null;
  onClose: () => void;
}

const TYPE_BADGE_STYLES: Record<
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

export const TeacherProfileModal: React.FC<TeacherProfileModalProps> = ({
  teacher,
  onClose,
}) => {
  const router = useRouter();
  const {
    teachers,
    absenceRecords,
    delayNotices,
    deleteAbsenceRecord,
  } = useTeachers();
  const { showToast } = useToast();

  // Dynamically resolve the live teacher from context state
  const currentTeacher = useMemo(() => {
    if (!teacher) return null;
    return teachers.find((t) => t.id === teacher.id) || teacher;
  }, [teachers, teacher]);

  const [activeHistoryTab, setActiveHistoryTab] = useState<
    "absences" | "delays"
  >("absences");
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [recordToEdit, setRecordToEdit] = useState<AbsenceRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<AbsenceRecord | null>(
    null
  );
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const confirmDeleteRecord = (reason?: string) => {
    if (recordToDelete) {
      const rec = recordToDelete;
      deleteAbsenceRecord(rec.id, reason);
      setRecordToDelete(null);

      showToast({
        message: "تم نقل العنصر إلى الأرشيف الإداري",
        type: "success",
        action: {
          label: "عرض الأرشيف",
          onClick: () => {
            onClose();
            router.push("/archive");
          },
        },
      });
    }
  };

  // Close modal on Escape key
  useEffect(() => {
    const timer = feedbackTimeoutRef.current;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timer) clearTimeout(timer);
    };
  }, [onClose]);

  // Focus close button on mount
  useEffect(() => {
    if (currentTeacher) {
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    }
  }, [currentTeacher]);

  // Filter absences strictly by immutable teacherId
  const teacherAbsences = useMemo(() => {
    if (!currentTeacher) return [];
    return absenceRecords.filter(
      (record) => record.teacherId === currentTeacher.id
    );
  }, [absenceRecords, currentTeacher]);

  // Filter delay notices strictly by immutable teacherId
  const teacherDelayNotices = useMemo(() => {
    if (!currentTeacher) return [];
    return delayNotices.filter(
      (notice) => notice.teacherId === currentTeacher.id
    );
  }, [delayNotices, currentTeacher]);

  // Calculate breakdown counters
  const sickLeavesCount = useMemo(
    () => teacherAbsences.filter((r) => r.type === "مرضي").length,
    [teacherAbsences]
  );
  const emergencyLeavesCount = useMemo(
    () => teacherAbsences.filter((r) => r.type === "اضطراري").length,
    [teacherAbsences]
  );
  const companionLeavesCount = useMemo(
    () => teacherAbsences.filter((r) => r.type === "مرافق").length,
    [teacherAbsences]
  );
  const otherLeavesCount = useMemo(
    () => teacherAbsences.filter((r) => r.type === "أخرى").length,
    [teacherAbsences]
  );

  const handleExportDelayPdf = (notice: DelayNotice) => {
    if (!currentTeacher) return;
    try {
      printDelayNoticePdf(notice, currentTeacher);
    } catch (err) {
      console.error("فشل طباعة تنبيه التأخر:", err);
    }
  };

  const handleExportPdf = (record: AbsenceRecord) => {
    if (!currentTeacher || exportingId) return;

    setExportingId(record.id);

    try {
      printAbsencePdf({
        teacherName: currentTeacher.fullName || currentTeacher.name || "معلمة",
        nationalId: currentTeacher.nationalId || currentTeacher.username || currentTeacher.jobNumber || "—",
        username: currentTeacher.nationalId || currentTeacher.username || currentTeacher.jobNumber || "—",
        specialty: currentTeacher.specialty || currentTeacher.teachingField || "عام",
        jobTitle: currentTeacher.jobTitle || "معلم",
        employmentStatus: currentTeacher.employmentStatus || "دائم",
        absenceCount: teacherAbsences.length || 1,
        absenceDate: record.date,
        absenceType: record.type,
        absenceReason: record.reason,
      });

    } catch (err) {
      console.error("فشل طباعة الـ PDF من ملف المعلمة:", err);
    } finally {
      setExportingId(null);
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!currentTeacher) return null;

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="teacher-profile-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      >
        {/* Animated Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />


        {/* Animated Dialog Window with Spring physics */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="relative bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden z-10"
        >
          {/* Modal Header */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/80 flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="w-14 h-14 rounded-2xl bg-[#137a85] text-white flex items-center justify-center font-bold text-xl shadow-md ring-4 ring-teal-50 shrink-0 mt-0.5"
              >
                {(currentTeacher.fullName || currentTeacher.name || "م").charAt(0)}
              </motion.div>
              <div className="space-y-1.5 text-right">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id="teacher-profile-title"
                    className="text-lg md:text-xl font-bold text-slate-900"
                  >
                    {currentTeacher.fullName || currentTeacher.name}
                  </h2>
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-xs font-bold border",
                      currentTeacher.employmentStatus === "عقد"
                        ? "bg-amber-50 text-amber-800 border-amber-300"
                        : "bg-emerald-50 text-emerald-800 border-emerald-300"
                    )}
                  >
                    {currentTeacher.employmentStatus || "دائم"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-600 font-medium">
                  <span className="flex items-center gap-1 font-mono">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    <span>رقم الهوية: <strong className="text-slate-800">{currentTeacher.nationalId || currentTeacher.username || currentTeacher.jobNumber}</strong></span>
                  </span>
                  {currentTeacher.email && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="font-mono text-slate-700">✉️ {currentTeacher.email}</span>
                    </>
                  )}
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    <span>التخصص: <strong className="text-slate-800">{currentTeacher.specialty || currentTeacher.teachingField || "عام"}</strong></span>
                  </span>
                  {currentTeacher.teachingField && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span>المجال: <strong className="text-slate-800">{currentTeacher.teachingField}</strong></span>
                    </>
                  )}
                  {currentTeacher.mobile && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span dir="ltr" className="font-mono text-slate-700">📱 {currentTeacher.mobile}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              ref={closeButtonRef}
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 cursor-pointer"
              aria-label="إغلاق ملف المعلمة"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </motion.button>
          </div>

          {/* Feedback Alert */}
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              className={cn(
                "mx-6 mt-4 p-3 rounded-xl border flex items-center justify-between text-xs",
                feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                  : "bg-rose-50 text-rose-900 border-rose-300"
              )}
            >
              <div className="flex items-center gap-2">
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                )}
                <span className="font-bold">{feedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}

          {/* Modal Scrollable Body */}
          <div className="p-6 overflow-y-auto space-y-6">
            {/* Summary Cards */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                ملخص إحصائيات الغياب المعتمدة
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {/* Total */}
                <motion.div
                  whileHover={{ y: -2 }}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-sm"
                >
                  <span className="block text-[11px] font-medium text-slate-500 mb-1">
                    إجمالي الغياب
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900 font-mono">
                      {teacherAbsences.length}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">يوم</span>
                  </div>
                </motion.div>

                {/* Sick */}
                <motion.div
                  whileHover={{ y: -2 }}
                  className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200/60 shadow-sm"
                >
                  <span className="block text-[11px] font-medium text-blue-700 mb-1">
                    إجازات مرضية
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-blue-800 font-mono">
                      {sickLeavesCount}
                    </span>
                    <span className="text-[11px] text-blue-600/70 font-medium">يوم</span>
                  </div>
                </motion.div>

                {/* Emergency */}
                <motion.div
                  whileHover={{ y: -2 }}
                  className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-200/60 shadow-sm"
                >
                  <span className="block text-[11px] font-medium text-rose-700 mb-1">
                    غياب اضطراري
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-rose-800 font-mono">
                      {emergencyLeavesCount}
                    </span>
                    <span className="text-[11px] text-rose-600/70 font-medium">يوم</span>
                  </div>
                </motion.div>

                {/* Companion / Other */}
                <motion.div
                  whileHover={{ y: -2 }}
                  className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200/60 shadow-sm"
                >
                  <span className="block text-[11px] font-medium text-purple-700 mb-1">
                    مرافق وأخرى
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-purple-800 font-mono">
                      {companionLeavesCount + otherLeavesCount}
                    </span>
                    <span className="text-[11px] text-purple-600/70 font-medium">يوم</span>
                  </div>
                </motion.div>

                {/* Delay Notices */}
                <motion.div
                  whileHover={{ y: -2 }}
                  onClick={() => setActiveHistoryTab("delays")}
                  className={cn(
                    "p-3.5 rounded-xl border shadow-sm cursor-pointer transition-all",
                    activeHistoryTab === "delays"
                      ? "bg-amber-50 border-amber-300 ring-2 ring-amber-400/20"
                      : "bg-amber-50/50 border-amber-200/60 hover:bg-amber-50"
                  )}
                >
                  <span className="block text-[11px] font-medium text-amber-800 mb-1">
                    تنبيهات التأخر
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-amber-900 font-mono">
                      {teacherDelayNotices.length}
                    </span>
                    <span className="text-[11px] text-amber-700/70 font-medium">إشعار</span>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* History Section Tabs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveHistoryTab("absences")}
                    className={cn(
                      "py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer",
                      activeHistoryTab === "absences"
                        ? "bg-[#137a85] text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    مساءلات الغياب ({teacherAbsences.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveHistoryTab("delays")}
                    className={cn(
                      "py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                      activeHistoryTab === "delays"
                        ? "bg-amber-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>تنبيهات التأخر والانصراف ({teacherDelayNotices.length})</span>
                  </button>
                </div>

                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  مرتبة من الأحدث إلى الأقدم
                </span>
              </div>

              {/* Tab 1: Absences */}
              {activeHistoryTab === "absences" && (
                <div>
                  {teacherAbsences.length === 0 ? (
                    <div className="p-8 rounded-xl bg-slate-50/80 border border-dashed border-slate-200 text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                        <FileCheck className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <p className="text-xs md:text-sm font-bold text-slate-700">
                        سجل المعلمة منضبط بالكامل
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        لم يتم تسجيل أي استمارات مساءلة أو أيام غياب لهذه المعلمة حتى الآن.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                              <th scope="col" className="py-3 px-4">تاريخ الغياب</th>
                              <th scope="col" className="py-3 px-4">النوع</th>
                              <th scope="col" className="py-3 px-4">السبب المسجل</th>
                              <th scope="col" className="py-3 px-4">الملاحظات</th>
                              <th scope="col" className="py-3 px-4 text-center">الإجراءات والاستمارة</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {teacherAbsences.map((rec) => {
                              const style =
                                TYPE_BADGE_STYLES[rec.type] || TYPE_BADGE_STYLES["أخرى"];
                              const isExporting = exportingId === rec.id;

                              return (
                                <tr
                                  key={rec.id}
                                  className="hover:bg-slate-50/80 transition-colors duration-150"
                                >
                                  <td className="py-3 px-4 font-mono font-semibold text-slate-800 whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                      <span>{rec.date}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 whitespace-nowrap">
                                    <span
                                      className={cn(
                                        "inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                                        style.bg,
                                        style.text,
                                        style.border
                                      )}
                                    >
                                      {rec.type}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-slate-700 max-w-xs truncate font-medium">
                                    {rec.reason || "—"}
                                  </td>
                                  <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                                    {rec.notes || "—"}
                                  </td>
                                  <td className="py-3 px-4 text-center whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        type="button"
                                        onClick={() => handleExportPdf(rec)}
                                        disabled={isExporting}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-teal-50 text-[#137a85] hover:bg-[#137a85] hover:text-white border border-teal-200/80 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="تصدير استمارة مساءلة الغياب (نموذج 20)"
                                      >
                                        {isExporting ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <FileDown className="w-3.5 h-3.5" />
                                        )}
                                        <span>PDF</span>
                                      </motion.button>
                                      <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        type="button"
                                        onClick={() => setRecordToEdit(rec)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-600 hover:text-white border border-amber-200 transition-all cursor-pointer"
                                        title="تعديل سجل الغياب"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                        <span>تعديل</span>
                                      </motion.button>
                                      <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        type="button"
                                        onClick={() => setRecordToDelete(rec)}
                                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                                        title="حذف سجل الغياب"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                        <span>حذف</span>
                                      </motion.button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Delay Notices */}
              {activeHistoryTab === "delays" && (
                <div>
                  {teacherDelayNotices.length === 0 ? (
                    <div className="p-8 rounded-xl bg-slate-50/80 border border-dashed border-slate-200 text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                        <Clock className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <p className="text-xs md:text-sm font-bold text-slate-700">
                        لا توجد تنبيهات تأخر أو انصراف
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        المعلمة ملتزمة بمواعيد الدوام الرسمي ولم يصدر بحقها أي تنبيه.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                              <th scope="col" className="py-3 px-4">رقم وتاريخ التنبيه</th>
                              <th scope="col" className="py-3 px-4">المخالفات المسجلة</th>
                              <th scope="col" className="py-3 px-4">إفادة ومبرر المعلمة</th>
                              <th scope="col" className="py-3 px-4">حالة الإجراء وقرار المديرة</th>
                              <th scope="col" className="py-3 px-4 text-center">الاستمارة</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {teacherDelayNotices.map((notice) => {
                              return (
                                <tr
                                  key={notice.id}
                                  className="hover:bg-slate-50/80 transition-colors duration-150"
                                >
                                  <td className="py-3 px-4 whitespace-nowrap">
                                    <div className="font-mono font-bold text-[#137a85]">
                                      {notice.noticeNumber || `ت-${notice.id.slice(-4)}`}
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                      {notice.noticeDate || notice.date}
                                    </div>
                                  </td>

                                  <td className="py-3 px-4">
                                    <div className="flex flex-wrap gap-1">
                                      {notice.violationDelayStart && (
                                        <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                                          تأخر صباحي ({notice.delayStartTime})
                                        </span>
                                      )}
                                      {notice.violationAbsentDuring && (
                                        <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                                          عدم تواجد ({notice.absentFromTime} - {notice.absentToTime})
                                        </span>
                                      )}
                                      {notice.violationEarlyDeparture && (
                                        <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                                          انصراف مبكر ({notice.earlyDepartureTime})
                                        </span>
                                      )}
                                      {notice.violationLeftSchool && (
                                        <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                                          خروج وعودة
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  <td className="py-3 px-4 max-w-xs truncate text-slate-700">
                                    {notice.teacherReason || (
                                      <span className="text-slate-400 italic">بانتظار الإفادة</span>
                                    )}
                                  </td>

                                  <td className="py-3 px-4 whitespace-nowrap">
                                    {notice.status === "pending_teacher" && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                                        بانتظار المعلمة
                                      </span>
                                    )}
                                    {notice.status === "pending_director" && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                        بانتظار قرار المديرة
                                      </span>
                                    )}
                                    {notice.status === "completed" && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                        {notice.directorOpinion === "accepted"
                                          ? "مكتمل (قبول العذر)"
                                          : "مكتمل (تقرر الحسم)"}
                                      </span>
                                    )}
                                  </td>

                                  <td className="py-3 px-4 text-center whitespace-nowrap">
                                    <motion.button
                                      whileTap={{ scale: 0.95 }}
                                      type="button"
                                      onClick={() => handleExportDelayPdf(notice)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-teal-50 text-[#137a85] hover:bg-[#137a85] hover:text-white border border-teal-200/80 transition-all cursor-pointer"
                                      title="طباعة إشعار التنبيه الرسمي (PDF)"
                                    >
                                      <FileDown className="w-3.5 h-3.5" />
                                      <span>PDF</span>
                                    </motion.button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              النموذج الرسمي متوافق مع لوائح الخدمة المدنية ووزارة التعليم
            </span>
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-all cursor-pointer"
            >
              إغلاق
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Edit Absence Modal */}
      <EditAbsenceModal
        isOpen={Boolean(recordToEdit)}
        record={recordToEdit}
        onClose={() => setRecordToEdit(null)}
      />

      {/* Confirm Archive Absence Dialog */}
      <ConfirmDialog
        isOpen={Boolean(recordToDelete)}
        title="نقل سجل الغياب إلى الأرشيف"
        message={
          recordToDelete
            ? `المعلمة: "${recordToDelete.teacherName}" (${recordToDelete.date} — ${recordToDelete.type})\nسيتم نقل هذا السجل إلى الأرشيف الإداري وتحديث عداد المعلمة تلقائياً.`
            : ""
        }
        confirmLabel="نقل إلى الأرشيف"
        cancelLabel="إلغاء"
        variant="archive"
        showReasonInput={true}
        onConfirm={confirmDeleteRecord}
        onCancel={() => setRecordToDelete(null)}
      />
    </AnimatePresence>
  );
};
