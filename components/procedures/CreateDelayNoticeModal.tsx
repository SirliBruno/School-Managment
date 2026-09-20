"use client";

import React, { useState, useEffect, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  AlertTriangle,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
  User,
  LogOut,
  LogIn,
  DoorOpen,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { useToast } from "@/context/ToastContext";
import { Teacher, DelayNotice } from "@/types/teacher";
import { TeacherCombobox } from "@/components/procedures/TeacherCombobox";
import { cn } from "@/lib/utils";

interface CreateDelayNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  noticeToEdit?: DelayNotice | null;
  preselectedTeacherId?: string;
}

export const CreateDelayNoticeModal: React.FC<CreateDelayNoticeModalProps> = ({
  isOpen,
  onClose,
  noticeToEdit,
  preselectedTeacherId,
}) => {
  const { teachers, createDelayNotice, updateDelayNotice } = useTeachers();
  const { showToast } = useToast();
  const formId = useId();

  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [noticeDate, setNoticeDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  // 4 Violation Checkboxes & their corresponding fields
  const [violationDelayStart, setViolationDelayStart] = useState(false);
  const [delayStartTime, setDelayStartTime] = useState("07:30");

  const [violationAbsentDuring, setViolationAbsentDuring] = useState(false);
  const [absentFromTime, setAbsentFromTime] = useState("09:00");
  const [absentToTime, setAbsentToTime] = useState("10:30");

  const [violationEarlyDeparture, setViolationEarlyDeparture] = useState(false);
  const [earlyDepartureTime, setEarlyDepartureTime] = useState("12:00");

  const [violationLeftSchool, setViolationLeftSchool] = useState(false);
  const [leftSchoolDetails, setLeftSchoolDetails] = useState("");

  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isEditing = Boolean(noticeToEdit);

  // Initialize or populate when opening / editing
  useEffect(() => {
    if (!isOpen) {
      setErrorMsg(null);
      return;
    }

    if (noticeToEdit) {
      setSelectedTeacherId(noticeToEdit.teacherId);
      const found = teachers.find((t) => t.id === noticeToEdit.teacherId);
      setSelectedTeacher(found || null);
      setNoticeDate(noticeToEdit.noticeDate || noticeToEdit.date || "");
      setViolationDelayStart(noticeToEdit.violationDelayStart);
      setDelayStartTime(noticeToEdit.delayStartTime || "07:30");
      setViolationAbsentDuring(noticeToEdit.violationAbsentDuring);
      setAbsentFromTime(noticeToEdit.absentFromTime || "09:00");
      setAbsentToTime(noticeToEdit.absentToTime || "10:30");
      setViolationEarlyDeparture(noticeToEdit.violationEarlyDeparture);
      setEarlyDepartureTime(noticeToEdit.earlyDepartureTime || "12:00");
      setViolationLeftSchool(noticeToEdit.violationLeftSchool);
      setLeftSchoolDetails(noticeToEdit.leftSchoolDetails || "");
      setNotes(noticeToEdit.additionalNotes || noticeToEdit.notes || "");
    } else {
      // Create mode
      if (preselectedTeacherId) {
        const found = teachers.find((t) => t.id === preselectedTeacherId);
        if (found) {
          setSelectedTeacherId(found.id);
          setSelectedTeacher(found);
        }
      } else {
        setSelectedTeacherId("");
        setSelectedTeacher(null);
      }
      setNoticeDate(new Date().toISOString().split("T")[0]);
      setViolationDelayStart(true);
      setDelayStartTime("07:30");
      setViolationAbsentDuring(false);
      setAbsentFromTime("09:00");
      setAbsentToTime("10:30");
      setViolationEarlyDeparture(false);
      setEarlyDepartureTime("12:00");
      setViolationLeftSchool(false);
      setLeftSchoolDetails("");
      setNotes("");
    }
    setErrorMsg(null);
  }, [isOpen, noticeToEdit, preselectedTeacherId, teachers]);

  const handleTeacherSelect = (teacher: Teacher | null) => {
    setSelectedTeacher(teacher);
    setSelectedTeacherId(teacher ? teacher.id : "");
    setErrorMsg(null);
  };

  const validate = (): boolean => {
    if (!selectedTeacherId || !selectedTeacher) {
      setErrorMsg("يرجى اختيار المعلمة من القائمة أولاً.");
      return false;
    }

    if (!noticeDate) {
      setErrorMsg("يرجى تحديد تاريخ المخالفة.");
      return false;
    }

    const hasAnyViolation =
      violationDelayStart ||
      violationAbsentDuring ||
      violationEarlyDeparture ||
      violationLeftSchool;

    if (!hasAnyViolation) {
      setErrorMsg("يرجى تحديد نوع مخالفة واحد على الأقل (المرحلة الأولى: إدخال الوكيلة).");
      return false;
    }

    if (violationDelayStart && !delayStartTime.trim()) {
      setErrorMsg("يرجى إدخال وقت الحضور الفعلي للتأخر الصباحي.");
      return false;
    }

    if (violationAbsentDuring && (!absentFromTime.trim() || !absentToTime.trim())) {
      setErrorMsg("يرجى إدخال وقت الغياب (من الساعة - إلى الساعة).");
      return false;
    }

    if (violationEarlyDeparture && !earlyDepartureTime.trim()) {
      setErrorMsg("يرجى إدخال وقت الانصراف المبكر الفعلي.");
      return false;
    }

    if (violationLeftSchool && !leftSchoolDetails.trim()) {
      setErrorMsg("يرجى كتابة تفاصيل الخروج والعودة أثناء الدوام.");
      return false;
    }

    setErrorMsg(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !selectedTeacher) return;

    setIsProcessing(true);
    try {
      if (isEditing && noticeToEdit) {
        const res = updateDelayNotice(noticeToEdit.id, {
          teacherId: selectedTeacher.id,
          teacherName: selectedTeacher.fullName || selectedTeacher.name || "معلمة",
          jobNumber: selectedTeacher.username || selectedTeacher.jobNumber || "—",
          specialty: selectedTeacher.specialty || selectedTeacher.teachingField || "عام",
          noticeDate,
          date: noticeDate,
          violationDelayStart,
          delayStartTime: violationDelayStart ? delayStartTime : undefined,
          violationAbsentDuring,
          absentFromTime: violationAbsentDuring ? absentFromTime : undefined,
          absentToTime: violationAbsentDuring ? absentToTime : undefined,
          violationEarlyDeparture,
          earlyDepartureTime: violationEarlyDeparture ? earlyDepartureTime : undefined,
          violationLeftSchool,
          leftSchoolDetails: violationLeftSchool ? leftSchoolDetails : undefined,
          additionalNotes: notes.trim() || undefined,
          notes: notes.trim() || undefined,
        });

        if (res.success) {
          showToast({
            message: `تم تحديث تنبيه التأخر للمعلمة (${selectedTeacher.fullName || selectedTeacher.name}) بنجاح.`,
            type: "success",
          });
          onClose();
        } else {
          setErrorMsg(res.error || "فشل تحديث التنبيه.");
        }
      } else {
        const res = createDelayNotice({
          teacherId: selectedTeacher.id,
          teacherName: selectedTeacher.fullName || selectedTeacher.name || "معلمة",
          jobNumber: selectedTeacher.username || selectedTeacher.jobNumber || "—",
          specialty: selectedTeacher.specialty || selectedTeacher.teachingField || "عام",
          noticeDate,
          date: noticeDate,
          violationDelayStart,
          delayStartTime: violationDelayStart ? delayStartTime : undefined,
          violationAbsentDuring,
          absentFromTime: violationAbsentDuring ? absentFromTime : undefined,
          absentToTime: violationAbsentDuring ? absentToTime : undefined,
          violationEarlyDeparture,
          earlyDepartureTime: violationEarlyDeparture ? earlyDepartureTime : undefined,
          violationLeftSchool,
          leftSchoolDetails: violationLeftSchool ? leftSchoolDetails : undefined,
          additionalNotes: notes.trim() || undefined,
          notes: notes.trim() || undefined,
        });

        if (res.success && res.notice) {
          const num = res.notice.noticeNumber || res.notice.id;
          showToast({
            message: `تم إصدار تنبيه التأخر برقم (${num}) بنجاح. الخطوة التالية: إفادة المعلمة.`,
            type: "success",
          });
          onClose();
        } else {
          setErrorMsg(res.error || "فشل إنشاء تنبيه التأخر.");
        }
      }
    } catch (err) {
      console.error("خطأ حفظ تنبيه التأخر:", err);
      setErrorMsg("حدث خطأ غير متوقع أثناء حفظ التنبيه.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

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
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>{isEditing ? "تعديل تنبيه تأخر / انصراف" : "إنشاء تنبيه عن تأخر / انصراف"}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    نموذج و.م.ع.ن - ٠٢ - ٠٢
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  المرحلة الأولى: إدخال بيانات المخالفة بواسطة وكيلة الشؤون التعليمية
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

            {/* Stage 1 Helper Notice */}
            <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200/80 text-teal-900 text-xs flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-lg bg-[#137a85] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                1
              </div>
              <p className="leading-relaxed">
                تقوم الوكيلة بتحديد المعلمة وتاريخ الواقعة واختيار نوع أو أكثر من المخالفات مع تحديد الأوقات بدقة. بعد الحفظ، ينتقل التنبيه لحالة <strong>(بانتظار إفادة المعلمة)</strong>.
              </p>
            </div>

            {/* Teacher Selection */}
            <div>
              <TeacherCombobox
                teachers={teachers}
                selectedTeacherId={selectedTeacherId}
                onSelect={handleTeacherSelect}
                error={!selectedTeacherId && errorMsg ? errorMsg : undefined}
                disabled={isProcessing || (isEditing && Boolean(noticeToEdit))}
              />
            </div>

            {/* Notice Date */}
            <div className="space-y-1.5">
              <label
                htmlFor={`${formId}-date`}
                className="block text-xs font-bold text-slate-700"
              >
                تاريخ حدوث المخالفة <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id={`${formId}-date`}
                  type="date"
                  value={noticeDate}
                  onChange={(e) => setNoticeDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs md:text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#137a85]/20 focus:border-[#137a85] transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Violations Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>تحديد نوع المخالفة المسجلة بحق المعلمة</span>
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">يمكن تحديد أكثر من مخالفة</span>
              </div>

              {/* 1. التأخر الصباحي */}
              <div
                className={cn(
                  "p-4 rounded-2xl border transition-all space-y-3",
                  violationDelayStart
                    ? "bg-amber-50/40 border-amber-300 ring-1 ring-amber-300/30"
                    : "bg-white border-slate-200 hover:border-slate-300"
                )}
              >
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={violationDelayStart}
                      onChange={(e) => setViolationDelayStart(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#137a85] focus:ring-[#137a85]"
                    />
                    <div>
                      <span className="text-xs md:text-sm font-bold text-slate-800 block">
                        التأخر عن بداية الدوام الرسمي صباحاً
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        حضور المعلمة للمدرسة بعد جرس الاصطفاف أو بداية الحصة الأولى
                      </span>
                    </div>
                  </div>
                  <LogIn className="w-4 h-4 text-slate-400" />
                </label>

                {violationDelayStart && (
                  <div className="pt-2 border-t border-amber-200/60 flex items-center gap-3 animate-in fade-in">
                    <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                      وقت الحضور الفعلي للمدرسة:
                    </label>
                    <div className="relative flex-1 max-w-xs">
                      <Clock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="time"
                        value={delayStartTime}
                        onChange={(e) => setDelayStartTime(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-amber-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2. عدم التواجد أثناء الدوام */}
              <div
                className={cn(
                  "p-4 rounded-2xl border transition-all space-y-3",
                  violationAbsentDuring
                    ? "bg-amber-50/40 border-amber-300 ring-1 ring-amber-300/30"
                    : "bg-white border-slate-200 hover:border-slate-300"
                )}
              >
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={violationAbsentDuring}
                      onChange={(e) => setViolationAbsentDuring(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#137a85] focus:ring-[#137a85]"
                    />
                    <div>
                      <span className="text-xs md:text-sm font-bold text-slate-800 block">
                        عدم التواجد أثناء الدوام الرسمي
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        غياب عن حصة دراسية، مناوبة، أو فترة محددة في منتصف اليوم الدراسي
                      </span>
                    </div>
                  </div>
                  <Clock className="w-4 h-4 text-slate-400" />
                </label>

                {violationAbsentDuring && (
                  <div className="pt-2 border-t border-amber-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        من الساعة:
                      </label>
                      <input
                        type="time"
                        value={absentFromTime}
                        onChange={(e) => setAbsentFromTime(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-amber-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        إلى الساعة:
                      </label>
                      <input
                        type="time"
                        value={absentToTime}
                        onChange={(e) => setAbsentToTime(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-amber-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 3. الانصراف المبكر */}
              <div
                className={cn(
                  "p-4 rounded-2xl border transition-all space-y-3",
                  violationEarlyDeparture
                    ? "bg-amber-50/40 border-amber-300 ring-1 ring-amber-300/30"
                    : "bg-white border-slate-200 hover:border-slate-300"
                )}
              >
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={violationEarlyDeparture}
                      onChange={(e) => setViolationEarlyDeparture(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#137a85] focus:ring-[#137a85]"
                    />
                    <div>
                      <span className="text-xs md:text-sm font-bold text-slate-800 block">
                        الانصراف المبكر قبل نهاية الدوام الرسمي
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        مغادرة المدرسة قبل انتهاء اليوم الدراسي بدون إذن رسمي معتمد
                      </span>
                    </div>
                  </div>
                  <LogOut className="w-4 h-4 text-slate-400" />
                </label>

                {violationEarlyDeparture && (
                  <div className="pt-2 border-t border-amber-200/60 flex items-center gap-3 animate-in fade-in">
                    <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                      وقت الانصراف الفعلي:
                    </label>
                    <div className="relative flex-1 max-w-xs">
                      <Clock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="time"
                        value={earlyDepartureTime}
                        onChange={(e) => setEarlyDepartureTime(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-amber-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 4. الخروج والعودة */}
              <div
                className={cn(
                  "p-4 rounded-2xl border transition-all space-y-3",
                  violationLeftSchool
                    ? "bg-amber-50/40 border-amber-300 ring-1 ring-amber-300/30"
                    : "bg-white border-slate-200 hover:border-slate-300"
                )}
              >
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={violationLeftSchool}
                      onChange={(e) => setViolationLeftSchool(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-[#137a85] focus:ring-[#137a85]"
                    />
                    <div>
                      <span className="text-xs md:text-sm font-bold text-slate-800 block">
                        الخروج من المدرسة والعودة إليها أثناء الدوام الرسمي
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        مغادرة مبنى المدرسة لفترة زمنية مؤقتة دون تصريح خروج رسمي
                      </span>
                    </div>
                  </div>
                  <DoorOpen className="w-4 h-4 text-slate-400" />
                </label>

                {violationLeftSchool && (
                  <div className="pt-2 border-t border-amber-200/60 space-y-1.5 animate-in fade-in">
                    <label className="text-xs font-semibold text-slate-700 block">
                      تفاصيل أوقات الخروج والعودة:
                    </label>
                    <input
                      type="text"
                      value={leftSchoolDetails}
                      onChange={(e) => setLeftSchoolDetails(e.target.value)}
                      placeholder="مثال: الخروج الساعة 09:30 صباحاً والعودة الساعة 11:00 صباحاً"
                      className="w-full px-3 py-2 rounded-lg border border-amber-300 text-xs bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Optional Notes */}
            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-bold text-slate-700">
                ملاحظات وتوجيه الوكيلة (اختياري)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي ملاحظات إدارية، رقم الحصة المتأخر عنها، أو سوابق التنبيهات..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#137a85]/20 focus:border-[#137a85] transition-all resize-none shadow-2xs"
              />
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
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-[#137a85] hover:bg-teal-700 text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow disabled:opacity-60"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-teal-200" />
              )}
              <span>{isEditing ? "حفظ التعديلات" : "إصدار التنبيه ومتابعة الإجراء"}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
