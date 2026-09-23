"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FileDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
  FileEdit,
  ShieldCheck,
  AlertTriangle,
  User,
  Calendar,
  LogIn,
  LogOut,
  DoorOpen,
  Check,
  Ban,
  Share2,
} from "lucide-react";
import { DelayNotice } from "@/types/teacher";
import { printDelayNoticePdf } from "@/lib/printDelayNoticePdfService";
import { cn } from "@/lib/utils";

interface DelayNoticeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notice: DelayNotice | null;
  onOpenEdit: (notice: DelayNotice) => void;
  onOpenTeacherResponse: (notice: DelayNotice) => void;
  onOpenDirectorDecision: (notice: DelayNotice) => void;
  onOpenDelete: (notice: DelayNotice) => void;
  onOpenShare?: (notice: DelayNotice) => void;
}

export const DelayNoticeDetailsModal: React.FC<DelayNoticeDetailsModalProps> = ({
  isOpen,
  onClose,
  notice,
  onOpenEdit,
  onOpenTeacherResponse,
  onOpenDirectorDecision,
  onOpenDelete,
  onOpenShare,
}) => {
  if (!isOpen || !notice) return null;

  const handlePrint = () => {
    try {
      printDelayNoticePdf(notice);
    } catch (err) {
      console.error("فشل طباعة التنبيه:", err);
    }
  };

  const isStage2Done =
    notice.status === "pending_director" || notice.status === "completed";
  const isStage3Done = notice.status === "completed";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden text-right flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-[#137a85] flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>تفاصيل تنبيه التأخر / الانصراف</span>
                  <span className="font-mono text-xs text-[#137a85] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                    {notice.noticeNumber}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  استعراض المراحل الثلاث للإجراء الإداري والتصدير الرسمي
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

          {/* Stepper / Timeline Header */}
          <div className="px-6 py-4 bg-slate-50/40 border-b border-slate-100">
            <div className="grid grid-cols-3 gap-2">
              {/* Step 1 */}
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200">
                <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  <Check className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-slate-900 block truncate">
                    1. إدخال الوكيلة
                  </span>
                  <span className="text-[10px] text-teal-600 font-semibold block">
                    مكتمل وموثق
                  </span>
                </div>
              </div>

              {/* Step 2 */}
              <div
                className={cn(
                  "flex items-center gap-2 p-2 rounded-xl border transition-all",
                  isStage2Done
                    ? "bg-white border-slate-200"
                    : "bg-sky-50/60 border-sky-300 ring-1 ring-sky-300/30"
                )}
              >
                <div
                  className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                    isStage2Done
                      ? "bg-teal-600 text-white"
                      : "bg-sky-600 text-white"
                  )}
                >
                  {isStage2Done ? <Check className="w-4 h-4" /> : "2"}
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-slate-900 block truncate">
                    2. إفادة المعلمة
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-semibold block",
                      isStage2Done ? "text-teal-600" : "text-sky-600"
                    )}
                  >
                    {isStage2Done ? "تم تقديم الإفادة" : "بانتظار الرد"}
                  </span>
                </div>
              </div>

              {/* Step 3 */}
              <div
                className={cn(
                  "flex items-center gap-2 p-2 rounded-xl border transition-all",
                  isStage3Done
                    ? "bg-white border-slate-200"
                    : notice.status === "pending_director"
                    ? "bg-amber-50/60 border-amber-300 ring-1 ring-amber-300/30"
                    : "bg-slate-50 border-slate-200 opacity-60"
                )}
              >
                <div
                  className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                    isStage3Done
                      ? "bg-emerald-600 text-white"
                      : notice.status === "pending_director"
                      ? "bg-amber-600 text-white"
                      : "bg-slate-300 text-slate-600"
                  )}
                >
                  {isStage3Done ? <Check className="w-4 h-4" /> : "3"}
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-slate-900 block truncate">
                    3. قرار المديرة
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-semibold block",
                      isStage3Done
                        ? "text-emerald-600"
                        : notice.status === "pending_director"
                        ? "text-amber-600"
                        : "text-slate-400"
                    )}
                  >
                    {isStage3Done
                      ? notice.directorOpinion === "accepted"
                        ? "تم قبول العذر"
                        : "تم إقرار الحسم"
                      : notice.status === "pending_director"
                      ? "بانتظار القرار"
                      : "مرحلة تالية"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
            {/* Teacher Info Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">المعلمة</span>
                <span className="font-bold text-slate-900 mt-0.5 block truncate">
                  {notice.teacherName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">الرقم الوظيفي</span>
                <span className="font-bold text-slate-800 mt-0.5 block font-mono">
                  {notice.jobNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">التخصص / المجال</span>
                <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                  {notice.specialty || "عام"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">تاريخ المخالفة</span>
                <span className="font-bold text-[#137a85] mt-0.5 block font-mono">
                  {notice.date}
                </span>
              </div>
            </div>

            {/* Stage 1 Box: Violations Details */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>المرحلة الأولى: المخالفات المسجلة من قبل الوكيلة</span>
                </span>
                {notice.status === "pending_teacher" && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenEdit(notice);
                    }}
                    className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>تعديل</span>
                  </button>
                )}
              </div>

              <div className="space-y-2 text-xs">
                {notice.violationDelayStart && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="font-bold text-slate-800 flex items-center gap-2">
                      <LogIn className="w-4 h-4 text-amber-600" />
                      <span>التأخر عن بداية الدوام الرسمي صباحاً</span>
                    </span>
                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                      <span className="font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {notice.delayStartFromTime ? `من ${notice.delayStartFromTime} إلى ` : "حضور: "}
                        {notice.delayStartTime || "—"}
                      </span>
                      {notice.calculatedDuration && (
                        <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          المدة: {notice.calculatedDuration}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {notice.violationAbsentDuring && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="font-bold text-slate-800 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>عدم التواجد أثناء الدوام الرسمي</span>
                    </span>
                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                      <span className="font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                        من: {notice.absentFromTime || "—"} إلى: {notice.absentToTime || "—"}
                      </span>
                      {notice.calculatedDuration && (
                        <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          المدة: {notice.calculatedDuration}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {notice.violationEarlyDeparture && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="font-bold text-slate-800 flex items-center gap-2">
                      <LogOut className="w-4 h-4 text-amber-600" />
                      <span>الانصراف المبكر قبل نهاية الدوام</span>
                    </span>
                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                      <span className="font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {notice.earlyDepartureFromTime ? `من ${notice.earlyDepartureFromTime} إلى ` : "انصراف: "}
                        {notice.earlyDepartureTime || "—"}
                      </span>
                      {notice.calculatedDuration && (
                        <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          المدة: {notice.calculatedDuration}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {notice.violationLeftSchool && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="font-bold text-slate-800 flex items-center gap-2">
                      <DoorOpen className="w-4 h-4 text-amber-600" />
                      <span>الخروج من المدرسة والعودة إليها أثناء الدوام</span>
                    </span>
                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                      <span className="text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {notice.leftSchoolFromTime && notice.leftSchoolToTime
                          ? `من ${notice.leftSchoolFromTime} إلى ${notice.leftSchoolToTime}`
                          : notice.leftSchoolDetails || "—"}
                      </span>
                      {notice.calculatedDuration && (
                        <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          المدة: {notice.calculatedDuration}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {notice.notes && (
                  <div className="mt-2 text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                    <strong className="text-slate-700 block mb-0.5">ملاحظات الوكيلة:</strong>
                    <span>{notice.notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stage 2 Box: Teacher Justification */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <FileEdit className="w-4 h-4 text-sky-600" />
                  <span>المرحلة الثانية: إفادة ومبرر المعلمة</span>
                </span>
                {notice.teacherSignedAt && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    تاريخ التوقيع: {notice.teacherSignedAt}
                  </span>
                )}
              </div>

              {notice.teacherReason ? (
                <div className="space-y-2">
                  <div className="p-3.5 rounded-xl bg-sky-50/50 border border-sky-100 text-xs sm:text-sm text-slate-800 leading-relaxed">
                    {notice.teacherReason}
                  </div>
                  {notice.teacherResponseSubmittedAt && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50/80 px-2.5 py-1 rounded-lg border border-emerald-200/60 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        تم استلام هذا الرد إلكترونياً عبر الرابط العام بتاريخ:{" "}
                        <strong className="font-mono">
                          {new Date(notice.teacherResponseSubmittedAt).toLocaleString("ar-SA")}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2.5">
                  <p className="text-xs text-slate-500">
                    لم يتم تسجيل إفادة المعلمة حتى الآن. يمكنك مشاركة الرابط معها عبر الواتساب لتعبئته من جوالها، أو تسجيلها يدوياً.
                  </p>
                  <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                    {onOpenShare && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenShare(notice);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer shadow-2xs"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>مشاركة الرابط عبر الواتساب</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenTeacherResponse(notice);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-all cursor-pointer"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>تسجيل الإفادة يدوياً</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Stage 3 Box: Principal Decision */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>المرحلة الثالثة: قرار مديرة المدرسة</span>
                </span>
                {notice.directorSignedAt && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    تاريخ الاعتماد: {notice.directorSignedAt}
                  </span>
                )}
              </div>

              {notice.directorOpinion ? (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">القرار المعتمد:</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold border",
                        notice.directorOpinion === "accepted"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : "bg-rose-50 text-rose-800 border-rose-300"
                      )}
                    >
                      {notice.directorOpinion === "accepted" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>قبول العذر وحفظ الإشعار دون حسم</span>
                        </>
                      ) : (
                        <>
                          <Ban className="w-3.5 h-3.5 text-rose-600" />
                          <span>عدم قبول العذر والحسم من الراتب</span>
                        </>
                      )}
                    </span>
                  </div>

                  {notice.directorNotes && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-600">
                      <strong className="text-slate-800 block mb-0.5">توجيهات المديرة:</strong>
                      <span>{notice.directorNotes}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
                  <p className="text-xs text-slate-500">
                    {notice.status === "pending_teacher"
                      ? "المرحلة الثالثة معلقة حتى تقديم المعلمة لإفادتها."
                      : "بانتظار اعتماد قرار مديرة المدرسة."}
                  </p>
                  {notice.status === "pending_director" && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenDirectorDecision(notice);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer shadow-2xs"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>اتخاذ قرار المديرة الآن</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition-all shadow-2xs cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-[#137a85]" />
              <span>تصدير إشعار التنبيه الرسمي (PDF)</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              {notice.status === "pending_teacher" && onOpenShare && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenShare(notice);
                  }}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>مشاركة الرابط</span>
                </button>
              )}

              {notice.status === "pending_teacher" && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenTeacherResponse(notice);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>تسجيل الإفادة</span>
                </button>
              )}

              {notice.status === "pending_director" && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDirectorDecision(notice);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>اتخاذ قرار المديرة</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDelete(notice);
                }}
                className="p-2.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                title="حذف هذا التنبيه"
                aria-label="حذف التنبيه"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
