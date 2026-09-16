"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  UserPlus,
  Save,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Phone,
  GraduationCap,
  BookOpen,
  UserCheck,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { Teacher } from "@/types/teacher";
import { cn } from "@/lib/utils";

interface AddTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTeacherAdded?: (teacher: Teacher) => void;
}

interface FormState {
  fullName: string;
  username: string;
  mobile: string;
  employmentStatus: "دائم" | "عقد";
  jobTitle: string;
  teachingField: string;
  specialty: string;
}

const INITIAL_STATE: FormState = {
  fullName: "",
  username: "",
  mobile: "",
  employmentStatus: "دائم",
  jobTitle: "معلم",
  teachingField: "",
  specialty: "",
};

export const AddTeacherModal: React.FC<AddTeacherModalProps> = ({
  isOpen,
  onClose,
  onTeacherAdded,
}) => {
  const { addTeacher } = useTeachers();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  const fullNameInputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const formId = useId();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setForm(INITIAL_STATE);
      setErrors({});
      setSuccessFeedback(null);
      setTimeout(() => {
        fullNameInputRef.current?.focus();
      }, 70);
    }
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleChange = (
    field: keyof FormState,
    value: string
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "", general: "" }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const cleanFullName = form.fullName.trim();
    if (!cleanFullName) {
      newErrors.fullName = "الاسم الرباعي للمعلمة مطلوب.";
    } else if (cleanFullName.split(/\s+/).length < 2) {
      newErrors.fullName = "يرجى إدخال الاسم كاملاً (الاسم الثنائي أو الرباعي على الأقل).";
    }

    const cleanUsername = form.username.trim();
    if (!cleanUsername) {
      newErrors.username = "اسم المستخدم / الرقم الوظيفي مطلوب.";
    } else if (cleanUsername.length < 3) {
      newErrors.username = "اسم المستخدم يجب أن يتكون من 3 خانات على الأقل.";
    }

    if (form.mobile.trim()) {
      const cleanPhone = form.mobile.trim().replace(/\D/g, "");
      if (cleanPhone.length < 9 || cleanPhone.length > 12) {
        newErrors.mobile = "يرجى كتابة رقم جوال صحيح (مثال: 0501234567).";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = (addAnother: boolean) => {
    if (!validate()) return;

    const result = addTeacher({
      fullName: form.fullName.trim(),
      username: form.username.trim(),
      mobile: form.mobile.trim() || undefined,
      employmentStatus: form.employmentStatus,
      jobTitle: form.jobTitle.trim() || "معلم",
      teachingField: form.teachingField.trim() || undefined,
      specialty: form.specialty.trim() || undefined,
      totalAbsences: 0,
    });

    if (!result.success) {
      setErrors((prev) => ({
        ...prev,
        username: result.error || "تعذر حفظ بيانات المعلمة.",
      }));
      return;
    }

    const savedTeacher = result.teacher!;
    if (onTeacherAdded) {
      onTeacherAdded(savedTeacher);
    }

    if (addAnother) {
      setSuccessFeedback(
        `تمت إضافة المعلمة (${savedTeacher.fullName}) بنجاح! يمكنك إدخال معلمة أخرى الآن.`
      );
      setForm(INITIAL_STATE);
      setErrors({});
      setTimeout(() => {
        fullNameInputRef.current?.focus();
      }, 50);

      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => {
        setSuccessFeedback(null);
      }, 5000);
    } else {
      onClose();
    }
  };

  const handleResetForm = () => {
    setForm(INITIAL_STATE);
    setErrors({});
    setSuccessFeedback(null);
    fullNameInputRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-teacher-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="p-5 md:p-6 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-teal-50 text-[#137a85] flex items-center justify-center font-bold shadow-2xs">
                <UserPlus className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="text-right">
                <h2
                  id="add-teacher-modal-title"
                  className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2"
                >
                  <span>إضافة معلمة جديدة يدوياً</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-100/70 text-[#137a85]">
                    كادر المدرسة
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  إدراج بيانات المعلمة المنقولة حديثاً أو المتعاقدة في نظام ث5 فورياً
                </p>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              ref={closeButtonRef}
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 cursor-pointer"
              aria-label="إغلاق النافذة"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </motion.button>
          </div>

          {/* Success Banner */}
          <AnimatePresence>
            {successFeedback && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                role="status"
                className="mx-6 mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center justify-between text-xs shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold">{successFeedback}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSuccessFeedback(null)}
                  className="text-emerald-700 hover:text-emerald-900 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scrollable Form Body */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave(false);
            }}
            className="p-5 md:p-6 overflow-y-auto space-y-5 text-xs md:text-sm"
          >
            {/* Row 1: Full Name & Username */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Field: Full Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor={`${formId}-fullName`}
                  className="block font-bold text-slate-700"
                >
                  الاسم الرباعي <span className="text-rose-500">*</span>
                </label>
                <input
                  ref={fullNameInputRef}
                  id={`${formId}-fullName`}
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  placeholder="مثال: سارة عبد الله سالم العتيبي"
                  className={cn(
                    "w-full px-3.5 py-2.5 rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all shadow-2xs",
                    errors.fullName
                      ? "border-rose-400 focus:ring-rose-200"
                      : "border-slate-200 focus:border-[#137a85] focus:ring-[#137a85]/20"
                  )}
                />
                {errors.fullName && (
                  <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.fullName}</span>
                  </p>
                )}
              </div>

              {/* Field: Username / Job ID */}
              <div className="space-y-1.5">
                <label
                  htmlFor={`${formId}-username`}
                  className="block font-bold text-slate-700"
                >
                  اسم المستخدم / الرقم الوظيفي <span className="text-rose-500">*</span>
                </label>
                <input
                  id={`${formId}-username`}
                  type="text"
                  required
                  value={form.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  placeholder="مثال: 1048291 أو sarah.otaibi"
                  className={cn(
                    "w-full px-3.5 py-2.5 rounded-xl border bg-white font-mono focus:outline-none focus:ring-2 transition-all shadow-2xs",
                    errors.username
                      ? "border-rose-400 focus:ring-rose-200"
                      : "border-slate-200 focus:border-[#137a85] focus:ring-[#137a85]/20"
                  )}
                />
                {errors.username && (
                  <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.username}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Row 2: Mobile & Employment Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Field: Mobile */}
              <div className="space-y-1.5">
                <label
                  htmlFor={`${formId}-mobile`}
                  className="block font-bold text-slate-700 flex items-center justify-between"
                >
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>رقم الجوال</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">(اختياري)</span>
                </label>
                <input
                  id={`${formId}-mobile`}
                  type="tel"
                  dir="ltr"
                  value={form.mobile}
                  onChange={(e) => handleChange("mobile", e.target.value)}
                  placeholder="0501234567"
                  className={cn(
                    "w-full px-3.5 py-2.5 rounded-xl border bg-white font-mono text-right focus:outline-none focus:ring-2 transition-all shadow-2xs",
                    errors.mobile
                      ? "border-rose-400 focus:ring-rose-200"
                      : "border-slate-200 focus:border-[#137a85] focus:ring-[#137a85]/20"
                  )}
                />
                {errors.mobile && (
                  <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.mobile}</span>
                  </p>
                )}
              </div>

              {/* Field: Employment Status (دائم / عقد) */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>حالة التوظيف</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange("employmentStatus", "دائم")}
                    className={cn(
                      "py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      form.employmentStatus === "دائم"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-400 ring-2 ring-emerald-200 shadow-2xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        form.employmentStatus === "دائم" ? "bg-emerald-600" : "bg-slate-300"
                      )}
                    />
                    <span>دائم (رسمي)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChange("employmentStatus", "عقد")}
                    className={cn(
                      "py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                      form.employmentStatus === "عقد"
                        ? "bg-amber-50 text-amber-800 border-amber-400 ring-2 ring-amber-200 shadow-2xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        form.employmentStatus === "عقد" ? "bg-amber-600" : "bg-slate-300"
                      )}
                    />
                    <span>عقد (تعاقد)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Row 3: Job Title & Teaching Field & Specialty */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Field: Job Title */}
              <div className="space-y-1.5">
                <label
                  htmlFor={`${formId}-jobTitle`}
                  className="block font-bold text-slate-700 flex items-center gap-1"
                >
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>المسمى الوظيفي</span>
                </label>
                <input
                  id={`${formId}-jobTitle`}
                  type="text"
                  value={form.jobTitle}
                  onChange={(e) => handleChange("jobTitle", e.target.value)}
                  placeholder="معلم / معلم ممارس"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:border-[#137a85] focus:ring-[#137a85]/20 transition-all shadow-2xs"
                />
              </div>

              {/* Field: Teaching Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor={`${formId}-teachingField`}
                  className="block font-bold text-slate-700 flex items-center gap-1"
                >
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>مجال التدريس</span>
                </label>
                <input
                  id={`${formId}-teachingField`}
                  type="text"
                  value={form.teachingField}
                  onChange={(e) => handleChange("teachingField", e.target.value)}
                  placeholder="مثال: لغة عربية، رياضيات"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:border-[#137a85] focus:ring-[#137a85]/20 transition-all shadow-2xs"
                />
              </div>

              {/* Field: Specialty */}
              <div className="space-y-1.5">
                <label
                  htmlFor={`${formId}-specialty`}
                  className="block font-bold text-slate-700 flex items-center gap-1"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                  <span>التخصص الدقيق</span>
                </label>
                <input
                  id={`${formId}-specialty`}
                  type="text"
                  value={form.specialty}
                  onChange={(e) => handleChange("specialty", e.target.value)}
                  placeholder="مثال: لغويات، كيمياء"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:border-[#137a85] focus:ring-[#137a85]/20 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetForm}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة ضبط الحقول</span>
              </button>

              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                {/* Save & Add Another Button */}
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={() => handleSave(true)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm bg-teal-50 text-[#137a85] hover:bg-teal-100 border border-teal-300 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-4 h-4 text-[#137a85]" />
                  <span>حفظ وإضافة أخرى</span>
                </motion.button>

                {/* Save and Close Button */}
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={() => handleSave(false)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs md:text-sm bg-[#137a85] text-white hover:bg-teal-700 shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85] focus-visible:ring-offset-2"
                >
                  <Save className="w-4 h-4 text-teal-100" />
                  <span>حفظ وإغلاق</span>
                </motion.button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};