"use client";

import React, { useState, useEffect, useId, useMemo } from "react";
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
  ChevronDown,
  Timer,
  Sparkles,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { useToast } from "@/context/ToastContext";
import { Teacher, DelayNotice } from "@/types/teacher";
import { TeacherCombobox } from "@/components/procedures/TeacherCombobox";
import { calculateTimeDifference, getSaudiToday } from "@/lib/timeUtils";
import { cn } from "@/lib/utils";

interface CreateDelayNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  noticeToEdit?: DelayNotice | null;
  preselectedTeacherId?: string;
}

export type ViolationTypeKey =
  | "delay_start"
  | "absent_during"
  | "early_departure"
  | "left_school";

interface ViolationTypeOption {
  id: ViolationTypeKey;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  fromLabel: string;
  toLabel: string;
  defaultFrom: string;
  defaultTo: string;
  badgeLabel: string;
}

const VIOLATION_TYPE_OPTIONS: ViolationTypeOption[] = [
  {
    id: "delay_start",
    title: "التأخر عن بداية الدوام الرسمي صباحاً",
    subtitle: "حضور المعلمة للمدرسة بعد جرس الاصطفاف أو بداية الحصة الأولى",
    icon: LogIn,
    fromLabel: "بداية الدوام الرسمي (من الساعة):",
    toLabel: "حضور المعلمة الفعلي (إلى الساعة):",
    defaultFrom: "07:00",
    defaultTo: "08:30",
    badgeLabel: "تأخر صباحي",
  },
  {
    id: "absent_during",
    title: "عدم التواجد أثناء الدوام الرسمي",
    subtitle: "غياب عن حصة دراسية، مناوبة، أو فترة محددة في منتصف اليوم الدراسي",
    icon: Clock,
    fromLabel: "بداية فترة عدم التواجد (من الساعة):",
    toLabel: "نهاية فترة عدم التواجد (إلى الساعة):",
    defaultFrom: "08:00",
    defaultTo: "10:00",
    badgeLabel: "عدم تواجد أثناء الدوام",
  },
  {
    id: "early_departure",
    title: "الانصراف المبكر قبل نهاية الدوام الرسمي",
    subtitle: "مغادرة المدرسة قبل انتهاء اليوم الدراسي بدون إذن رسمي معتمد",
    icon: LogOut,
    fromLabel: "وقت الانصراف الفعلي (من الساعة):",
    toLabel: "نهاية الدوام الرسمي (إلى الساعة):",
    defaultFrom: "11:30",
    defaultTo: "13:30",
    badgeLabel: "انصراف مبكر",
  },
  {
    id: "left_school",
    title: "الخروج من المدرسة والعودة إليها أثناء الدوام الرسمي",
    subtitle: "مغادرة مبنى المدرسة لفترة زمنية مؤقتة دون تصريح خروج رسمي",
    icon: DoorOpen,
    fromLabel: "وقت الخروج من المدرسة (من الساعة):",
    toLabel: "وقت العودة للمدرسة (إلى الساعة):",
    defaultFrom: "09:00",
    defaultTo: "11:00",
    badgeLabel: "خروج وعودة أثناء الدوام",
  },
];

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
    return getSaudiToday();
  });

  // Violation Type dropdown selection & Time range
  const [selectedViolationType, setSelectedViolationType] =
    useState<ViolationTypeKey>("delay_start");
  const [fromTime, setFromTime] = useState("07:00");
  const [toTime, setToTime] = useState("08:30");
  const [leftSchoolDetails, setLeftSchoolDetails] = useState("");

  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isEditing = Boolean(noticeToEdit);

  // Active configuration for selected violation type
  const activeOption = useMemo(() => {
    return (
      VIOLATION_TYPE_OPTIONS.find((opt) => opt.id === selectedViolationType) ||
      VIOLATION_TYPE_OPTIONS[0]
    );
  }, [selectedViolationType]);

  // Live calculation of duration
  const timeResult = useMemo(() => {
    return calculateTimeDifference(fromTime, toTime);
  }, [fromTime, toTime]);

  // Handle violation type change
  const handleViolationTypeChange = (newType: ViolationTypeKey) => {
    setSelectedViolationType(newType);
    const matched = VIOLATION_TYPE_OPTIONS.find((opt) => opt.id === newType);
    if (matched && !isEditing) {
      setFromTime(matched.defaultFrom);
      setToTime(matched.defaultTo);
    }
    setErrorMsg(null);
  };

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

      if (noticeToEdit.violationAbsentDuring) {
        setSelectedViolationType("absent_during");
        setFromTime(noticeToEdit.absentFromTime || "08:00");
        setToTime(noticeToEdit.absentToTime || "10:00");
      } else if (noticeToEdit.violationEarlyDeparture) {
        setSelectedViolationType("early_departure");
        setFromTime(noticeToEdit.earlyDepartureFromTime || "11:30");
        setToTime(noticeToEdit.earlyDepartureTime || "13:30");
      } else if (noticeToEdit.violationLeftSchool) {
        setSelectedViolationType("left_school");
        setFromTime(noticeToEdit.leftSchoolFromTime || "09:00");
        setToTime(noticeToEdit.leftSchoolToTime || "11:00");
        setLeftSchoolDetails(noticeToEdit.leftSchoolDetails || "");
      } else {
        // Default delay_start
        setSelectedViolationType("delay_start");
        setFromTime(noticeToEdit.delayStartFromTime || "07:00");
        setToTime(noticeToEdit.delayStartTime || "08:30");
      }

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
      setNoticeDate(getSaudiToday());
      setSelectedViolationType("delay_start");
      setFromTime("07:00");
      setToTime("08:30");
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

    if (!fromTime || !toTime) {
      setErrorMsg("يرجى إدخال وقت البداية ووقت النهاية.");
      return false;
    }

    if (!timeResult.isValid) {
      setErrorMsg(
        timeResult.error ||
          "يرجى التأكد من أن وقت النهاية يأتي بعد وقت البداية لاحتساب المدة."
      );
      return false;
    }

    if (selectedViolationType === "left_school" && !leftSchoolDetails.trim()) {
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
      const isDelayStart = selectedViolationType === "delay_start";
      const isAbsentDuring = selectedViolationType === "absent_during";
      const isEarlyDeparture = selectedViolationType === "early_departure";
      const isLeftSchool = selectedViolationType === "left_school";

      const payload = {
        teacherId: selectedTeacher.id,
        teacherName:
          selectedTeacher.fullName || selectedTeacher.name || "معلمة",
        jobNumber:
          selectedTeacher.username || selectedTeacher.jobNumber || "—",
        specialty:
          selectedTeacher.specialty ||
          selectedTeacher.teachingField ||
          "عام",
        noticeDate,
        date: noticeDate,

        violationDelayStart: isDelayStart,
        delayStartFromTime: isDelayStart ? fromTime : undefined,
        delayStartTime: isDelayStart ? toTime : undefined,

        violationAbsentDuring: isAbsentDuring,
        absentFromTime: isAbsentDuring ? fromTime : undefined,
        absentToTime: isAbsentDuring ? toTime : undefined,

        violationEarlyDeparture: isEarlyDeparture,
        earlyDepartureFromTime: isEarlyDeparture ? fromTime : undefined,
        earlyDepartureTime: isEarlyDeparture ? toTime : undefined,

        violationLeftSchool: isLeftSchool,
        leftSchoolFromTime: isLeftSchool ? fromTime : undefined,
        leftSchoolToTime: isLeftSchool ? toTime : undefined,
        leftSchoolDetails: isLeftSchool
          ? leftSchoolDetails.trim() ||
            `الخروج من الساعة ${fromTime} والعودة الساعة ${toTime}`
          : undefined,

        calculatedDuration: timeResult.formattedDuration,
        calculatedMinutes: timeResult.totalMinutes,

        additionalNotes: notes.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (isEditing && noticeToEdit) {
        const res = updateDelayNotice(noticeToEdit.id, payload);

        if (res.success) {
          showToast({
            message: `تم تحديث تنبيه التأخر للمعلمة (${
              selectedTeacher.fullName || selectedTeacher.name
            }) بنجاح.`,
            type: "success",
          });
          onClose();
        } else {
          setErrorMsg(res.error || "فشل تحديث التنبيه.");
        }
      } else {
        const res = createDelayNotice(payload);

        if (res.success && res.notice) {
          const num = res.notice.noticeNumber || res.notice.id;
          showToast({
            message: `تم إصدار تنبيه التأخر برقم (${num}) بنجاح. المدة المحتسبة: ${timeResult.formattedDuration}.`,
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
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>
                    {isEditing
                      ? "تعديل تنبيه تأخر / انصراف"
                      : "إنشاء تنبيه عن تأخر / انصراف"}
                  </span>
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
          <form
            onSubmit={handleSubmit}
            className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar"
          >
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Stage 1 Helper Notice */}
            <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200/80 text-teal-900 text-xs flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-lg bg-[#137a85] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 shadow-xs">
                1
              </div>
              <p className="leading-relaxed">
                حددي المعلمة وتاريخ الواقعة، ثم اختاري نوع المخالفة ووقت التأخر
                (من الساعة إلى الساعة) ليتم احتساب المدة بالساعات والدقائق تلقائياً.
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

            {/* Dropdown List for Violation Types */}
            <div className="space-y-2 pt-1">
              <label
                htmlFor={`${formId}-violation-type`}
                className="block text-xs font-bold text-slate-800 flex items-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>نوع التأخر أو المخالفة المسجلة</span>
                <span className="text-rose-500">*</span>
              </label>

              <div className="relative">
                <select
                  id={`${formId}-violation-type`}
                  value={selectedViolationType}
                  onChange={(e) =>
                    handleViolationTypeChange(
                      e.target.value as ViolationTypeKey
                    )
                  }
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-xs md:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#137a85]/20 focus:border-[#137a85] transition-all appearance-none cursor-pointer shadow-2xs hover:border-slate-300"
                >
                  {VIOLATION_TYPE_OPTIONS.map((opt) => (
                    <option
                      key={opt.id}
                      value={opt.id}
                      className="py-2 text-slate-800 font-medium"
                    >
                      {opt.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Selected Type Description Badge */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600">
                <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <activeOption.icon className="w-3.5 h-3.5" />
                </div>
                <span className="leading-normal">{activeOption.subtitle}</span>
              </div>
            </div>

            {/* Time Selection & Automatic Duration Calculation Box */}
            <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-300/80 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-amber-200/60 pb-2.5">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Timer className="w-4 h-4 text-amber-600" />
                  <span>تحديد أوقات التأخر واحتساب المدة</span>
                </span>
                <span className="text-[11px] text-amber-700 font-medium bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">
                  {activeOption.badgeLabel}
                </span>
              </div>

              {/* From & To Time Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* From Time */}
                <div className="space-y-1.5">
                  <label
                    htmlFor={`${formId}-from-time`}
                    className="block text-xs font-semibold text-slate-700"
                  >
                    {activeOption.fromLabel} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      id={`${formId}-from-time`}
                      type="time"
                      value={fromTime}
                      onChange={(e) => {
                        setFromTime(e.target.value);
                        setErrorMsg(null);
                      }}
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-amber-300 text-xs sm:text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400/30 font-mono shadow-2xs"
                    />
                  </div>
                </div>

                {/* To Time */}
                <div className="space-y-1.5">
                  <label
                    htmlFor={`${formId}-to-time`}
                    className="block text-xs font-semibold text-slate-700"
                  >
                    {activeOption.toLabel} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      id={`${formId}-to-time`}
                      type="time"
                      value={toTime}
                      onChange={(e) => {
                        setToTime(e.target.value);
                        setErrorMsg(null);
                      }}
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-amber-300 text-xs sm:text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400/30 font-mono shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Extra input for Left School */}
              {selectedViolationType === "left_school" && (
                <div className="space-y-1.5 pt-1 border-t border-amber-200/60 animate-in fade-in">
                  <label
                    htmlFor={`${formId}-left-school-details`}
                    className="block text-xs font-semibold text-slate-700"
                  >
                    تفاصيل وأسباب الخروج والعودة:{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id={`${formId}-left-school-details`}
                    type="text"
                    value={leftSchoolDetails}
                    onChange={(e) => setLeftSchoolDetails(e.target.value)}
                    placeholder="مثال: الخروج لظرف طارئ والعودة قبل بداية الحصة الخامسة"
                    className="w-full px-3.5 py-2 rounded-xl border border-amber-300 text-xs bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 shadow-2xs"
                  />
                </div>
              )}

              {/* Dynamic Live Calculated Duration Display */}
              <div
                className={cn(
                  "p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all",
                  timeResult.isValid
                    ? "bg-white border-teal-300 ring-1 ring-teal-300/30"
                    : "bg-rose-50 border-rose-200"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs",
                      timeResult.isValid
                        ? "bg-[#137a85] text-white"
                        : "bg-rose-500 text-white"
                    )}
                  >
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                      <span>إجمالي مدة التأخر المحتسبة بالساعات والدقائق:</span>
                    </div>
                    <div
                      className={cn(
                        "text-sm sm:text-base font-extrabold mt-0.5",
                        timeResult.isValid ? "text-teal-900" : "text-rose-700"
                      )}
                    >
                      {timeResult.isValid
                        ? timeResult.detailedText
                        : timeResult.error || "وقت غير صالح"}
                    </div>
                  </div>
                </div>

                {timeResult.isValid && (
                  <div className="self-end sm:self-center px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 font-mono font-bold text-xs text-[#137a85] flex items-center gap-1.5 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    <span>{timeResult.totalMinutes} دقيقة إجمالاً</span>
                  </div>
                )}
              </div>
            </div>

            {/* Optional Notes */}
            <div className="space-y-1.5 pt-1">
              <label
                htmlFor={`${formId}-notes`}
                className="block text-xs font-bold text-slate-700"
              >
                ملاحظات وتوجيه الوكيلة (اختياري)
              </label>
              <textarea
                id={`${formId}-notes`}
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
              disabled={isProcessing || !timeResult.isValid}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-[#137a85] hover:bg-teal-700 text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow disabled:opacity-60"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-teal-200" />
              )}
              <span>
                {isEditing ? "حفظ التعديلات" : "إصدار التنبيه ومتابعة الإجراء"}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
