"use client";

import React, { useState, useEffect, useId, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  FileQuestion,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
  User,
  Clock,
  DoorOpen,
  ClipboardList,
  ShieldAlert,
  HelpCircle,
  Send,
  MessageSquare,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Save,
  Phone,
  Copy,
  Check,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { useToast } from "@/context/ToastContext";
import { Teacher, AdministrativeInquiry, AdministrativeInquiryType } from "@/types/teacher";
import { TeacherCombobox } from "@/components/procedures/TeacherCombobox";
import { getSaudiToday } from "@/lib/timeUtils";
import { cn } from "@/lib/utils";
import { formatSaudiMobile, normalizeSaudiMobileInput } from "@/lib/whatsapp";
import { openAdministrativeInquiryWhatsApp, generateAdministrativeInquiryWhatsAppMessage } from "@/lib/administrativeInquiryWhatsappService";

interface CreateAdministrativeInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiryToEdit?: AdministrativeInquiry | null;
  preselectedTeacherId?: string;
}

interface InquiryTypeOption {
  type: AdministrativeInquiryType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

// الأنواع الأساسية الأربعة المعتمدة رسمياً في استمارة المساءلة الخطية + أخرى
const INQUIRY_TYPE_OPTIONS: InquiryTypeOption[] = [
  {
    type: "التأخير عن دخول الحصص",
    label: "التأخير عن دخول الحصص",
    description: "التأخر عن الحصة الدراسية المقررة في الجدول المدرسي",
    icon: Clock,
  },
  {
    type: "الخروج من الحصص قبل انتهاء الوقت",
    label: "الخروج من الحصص قبل انتهاء الوقت",
    description: "مغادرة الفصل الدراسي قبل قرع جرس نهاية الحصة",
    icon: DoorOpen,
  },
  {
    type: "الامتناع عن دخول حصص الانتظار",
    label: "الامتناع عن دخول حصص الانتظار",
    description: "عدم تغطية حصص الاحتياط والانتظار المسندة للمعلمة",
    icon: ClipboardList,
  },
  {
    type: "الامتناع عن المناوبة",
    label: "الامتناع عن المناوبة",
    description: "التقصير أو الامتناع عن أداء فترات المناوبة والإشراف اليومي",
    icon: ShieldAlert,
  },
  {
    type: "أخرى",
    label: "أخرى (تحديد نوع المساءلة يدوياً)",
    description: "أي واقعة أو مخالفة إدارية أو تعليمية أخرى تستوجب مساءلة خطية",
    icon: HelpCircle,
  },
];

type StepNumber = 1 | 2 | 3 | 4;

const STEPS = [
  { num: 1, title: "اختيار المعلمة" },
  { num: 2, title: "نوع المساءلة" },
  { num: 3, title: "بيانات الواقعة" },
  { num: 4, title: "المراجعة والإرسال" },
];

export const CreateAdministrativeInquiryModal: React.FC<CreateAdministrativeInquiryModalProps> = ({
  isOpen,
  onClose,
  inquiryToEdit,
  preselectedTeacherId,
}) => {
  const { teachers, updateTeacher, createAdministrativeInquiry, updateAdministrativeInquiry, markAdministrativeInquiryLinkShared } = useTeachers();
  const { showToast } = useToast();
  const formId = useId();

  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [mobileInput, setMobileInput] = useState("");
  const [saveMobileToProfile, setSaveMobileToProfile] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [incidentDate, setIncidentDate] = useState(() => getSaudiToday());
  const [inquiryType, setInquiryType] = useState<AdministrativeInquiryType>("التأخير عن دخول الحصص");
  const [customType, setCustomType] = useState("");
  const [description, setDescription] = useState("");
  const [vicePrincipalNotes, setVicePrincipalNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state on open or edit
  useEffect(() => {
    if (inquiryToEdit) {
      setSelectedTeacherId(inquiryToEdit.teacherId);
      const t = teachers.find((tch) => tch.id === inquiryToEdit.teacherId) || null;
      setSelectedTeacher(t);
      setMobileInput(inquiryToEdit.teacherPhone || t?.mobile || t?.phone || "");
      setIncidentDate(inquiryToEdit.incidentDate || getSaudiToday());
      setInquiryType(inquiryToEdit.inquiryType || "التأخير عن دخول الحصص");
      setCustomType(inquiryToEdit.customType || inquiryToEdit.customViolationType || "");
      setDescription(inquiryToEdit.description || inquiryToEdit.incidentDescription || "");
      setVicePrincipalNotes(inquiryToEdit.vicePrincipalNotes || "");
      setCurrentStep(1);
    } else {
      const initialTeacherId = preselectedTeacherId || "";
      setSelectedTeacherId(initialTeacherId);
      if (initialTeacherId) {
        const t = teachers.find((tch) => tch.id === initialTeacherId) || null;
        setSelectedTeacher(t);
        setMobileInput(t?.mobile || t?.phone || "");
      } else {
        setSelectedTeacher(null);
        setMobileInput("");
      }
      setIncidentDate(getSaudiToday());
      setInquiryType("التأخير عن دخول الحصص");
      setCustomType("");
      setDescription("");
      setVicePrincipalNotes("");
      setCurrentStep(1);
    }
    setSaveMobileToProfile(false);
    setCopiedSuccess(false);
    setErrorMsg(null);
  }, [inquiryToEdit, preselectedTeacherId, teachers, isOpen]);

  const handleTeacherChange = (teacher: Teacher | null) => {
    setSelectedTeacher(teacher);
    setSelectedTeacherId(teacher?.id || "");
    setMobileInput(teacher?.mobile || teacher?.phone || "");
    setErrorMsg(null);
  };

  // Keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Validation per step
  const validateStep = (step: StepNumber): boolean => {
    setErrorMsg(null);
    if (step === 1) {
      if (!selectedTeacherId || !selectedTeacher) {
        setErrorMsg("يرجى اختيار المعلمة المعنية بالمساءلة أولاً.");
        return false;
      }
    } else if (step === 2) {
      if (!inquiryType) {
        setErrorMsg("يرجى تحديد نوع المساءلة الإدارية.");
        return false;
      }
      if (inquiryType === "أخرى" && !customType.trim()) {
        setErrorMsg("يرجى كتابة نوع المساءلة في الحقل المخصص.");
        return false;
      }
    } else if (step === 3) {
      if (!incidentDate) {
        setErrorMsg("يرجى تحديد تاريخ الواقعة.");
        return false;
      }
      if (!description.trim()) {
        setErrorMsg("يرجى كتابة تفاصيل وملابسات الواقعة.");
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(4, prev + 1) as StepNumber);
    }
  };

  const handlePrevStep = () => {
    setErrorMsg(null);
    setCurrentStep((prev) => Math.max(1, prev - 1) as StepNumber);
  };

  const previewMessage = useMemo(() => {
    if (!selectedTeacher) return "";
    return generateAdministrativeInquiryWhatsAppMessage({
      teacherName: selectedTeacher.fullName || selectedTeacher.name,
      inquiryType,
      customType: inquiryType === "أخرى" ? customType.trim() : undefined,
      incidentDate,
      token: inquiryToEdit?.token || "XXXX-SAMPLE-TOKEN-XXXX",
    });
  }, [selectedTeacher, inquiryType, customType, incidentDate, inquiryToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (openWhatsApp = false) => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    const targetPhone = mobileInput.trim() || selectedTeacher?.mobile || selectedTeacher?.phone || "";
    if (saveMobileToProfile && targetPhone && selectedTeacher && targetPhone !== selectedTeacher.mobile) {
      updateTeacher(selectedTeacher.id, { mobile: targetPhone });
    }

    try {
      if (inquiryToEdit) {
        const res = updateAdministrativeInquiry(inquiryToEdit.id, {
          inquiryType,
          customType: inquiryType === "أخرى" ? customType.trim() : undefined,
          incidentDate,
          description: description.trim(),
          vicePrincipalNotes: vicePrincipalNotes.trim() || undefined,
        });

        if (res.success && res.inquiry) {
          if (openWhatsApp) {
            openAdministrativeInquiryWhatsApp(res.inquiry, targetPhone);
            markAdministrativeInquiryLinkShared(res.inquiry.id);
          }
          showToast({
            message: `تم تحديث المساءلة الإدارية للمعلمة (${selectedTeacher?.fullName || selectedTeacher?.name}) بنجاح.`,
            type: "success",
          });
          onClose();
        } else {
          setErrorMsg(res.error || "فشل تحديث المساءلة الإدارية.");
        }
      } else {
        const res = createAdministrativeInquiry({
          teacherId: selectedTeacherId,
          inquiryType,
          customType: inquiryType === "أخرى" ? customType.trim() : undefined,
          incidentDate,
          description: description.trim(),
          vicePrincipalNotes: vicePrincipalNotes.trim() || undefined,
        });

        if (res.success && res.inquiry) {
          if (openWhatsApp) {
            openAdministrativeInquiryWhatsApp(res.inquiry, targetPhone);
            markAdministrativeInquiryLinkShared(res.inquiry.id);
          }
          showToast({
            message: `تم إنشاء المساءلة الإدارية رقم (${res.inquiry.inquiryNumber}) للمعلمة بنجاح.`,
            type: "success",
          });
          onClose();
        } else {
          setErrorMsg(res.error || "فشل إنشاء المساءلة الإدارية.");
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyLinkAndMessage = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    const targetPhone = mobileInput.trim() || selectedTeacher?.mobile || selectedTeacher?.phone || "";
    if (saveMobileToProfile && targetPhone && selectedTeacher && targetPhone !== selectedTeacher.mobile) {
      updateTeacher(selectedTeacher.id, { mobile: targetPhone });
    }

    try {
      let inquiryObj = inquiryToEdit;

      if (inquiryToEdit) {
        const res = updateAdministrativeInquiry(inquiryToEdit.id, {
          inquiryType,
          customType: inquiryType === "أخرى" ? customType.trim() : undefined,
          incidentDate,
          description: description.trim(),
          vicePrincipalNotes: vicePrincipalNotes.trim() || undefined,
        });
        if (res.success && res.inquiry) {
          inquiryObj = res.inquiry;
        } else {
          setErrorMsg(res.error || "فشل تحديث المساءلة.");
          setIsProcessing(false);
          return;
        }
      } else {
        const res = createAdministrativeInquiry({
          teacherId: selectedTeacherId,
          inquiryType,
          customType: inquiryType === "أخرى" ? customType.trim() : undefined,
          incidentDate,
          description: description.trim(),
          vicePrincipalNotes: vicePrincipalNotes.trim() || undefined,
        });
        if (res.success && res.inquiry) {
          inquiryObj = res.inquiry;
        } else {
          setErrorMsg(res.error || "فشل إنشاء المساءلة.");
          setIsProcessing(false);
          return;
        }
      }

      if (inquiryObj) {
        const msg = generateAdministrativeInquiryWhatsAppMessage(inquiryObj);
        await navigator.clipboard.writeText(msg);
        markAdministrativeInquiryLinkShared(inquiryObj.id);
        setCopiedSuccess(true);
        showToast({
          message: "تم نسخ رسالة ورابط المساءلة الإدارية بنجاح إلى الحافظة.",
          type: "success",
        });
        setTimeout(() => {
          setCopiedSuccess(false);
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error("فشل نسخ الرسالة:", err);
      setErrorMsg("تعذر نسخ الرسالة إلى الحافظة.");
    } finally {
      setIsProcessing(false);
    }
  };

  const displayInquiryTypeName =
    inquiryType === "أخرى" && customType.trim()
      ? `أخرى: ${customType.trim()}`
      : inquiryType;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${formId}-title`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-0 sm:my-6 flex flex-col h-[94vh] sm:h-auto sm:max-h-[90vh]"
      >
        {/* Header */}
        <div className="relative px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner shrink-0">
              <FileQuestion className="w-5 h-5" />
            </div>
            <div>
              <h2 id={`${formId}-title`} className="text-base sm:text-xl font-bold tracking-tight">
                {inquiryToEdit ? "تعديل المساءلة الإدارية" : "إصدار مساءلة إدارية خطية"}
              </h2>
              <p className="text-xs text-white/80 mt-0.5">
                نموذج المساءلة الإدارية المعتمد للإفادة الخطية عن المخالفات الإدارية
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 shrink-0 touch-target"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Wizard Bar */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="grid grid-cols-4 gap-2">
            {STEPS.map((s) => {
              const isPassed = currentStep > s.num;
              const isCurrent = currentStep === s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num < currentStep) {
                      setCurrentStep(s.num as StepNumber);
                      setErrorMsg(null);
                    } else if (s.num > currentStep) {
                      if (validateStep(currentStep)) {
                        setCurrentStep(s.num as StepNumber);
                      }
                    }
                  }}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center",
                    isCurrent
                      ? "bg-indigo-600 text-white shadow-sm"
                      : isPassed
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                  )}
                >
                  <span
                    className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center text-[10px]",
                      isCurrent
                        ? "bg-white text-indigo-600 font-extrabold"
                        : isPassed
                        ? "bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    )}
                  >
                    {isPassed ? "✓" : s.num}
                  </span>
                  <span className="hidden sm:inline truncate">{s.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: اختيار المعلمة */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-4"
            >
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  الخطوة الأولى: اختيار المعلمة المعنية بالمساءلة
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  ابحثي باسم المعلمة أو رقم السجل المدني لاختيار المعلمة المراد توجيه المساءلة إليها.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  اسم المعلمة أو السجل المدني <span className="text-rose-500">*</span>
                </label>
                <TeacherCombobox
                  teachers={teachers}
                  selectedTeacherId={selectedTeacherId}
                  onSelect={handleTeacherChange}
                  disabled={Boolean(inquiryToEdit)}
                />

                {selectedTeacher ? (
                  <div className="mt-3 p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-indigo-950 dark:text-indigo-100">
                        {selectedTeacher.fullName || selectedTeacher.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-[11px]">
                        {selectedTeacher.employmentStatus || "دائم"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-600 dark:text-slate-400 pt-1 border-t border-indigo-100 dark:border-indigo-900/40">
                      <div>
                        السجل المدني: <strong className="text-slate-800 dark:text-slate-200 font-mono">{selectedTeacher.nationalId || "—"}</strong>
                      </div>
                      <div>
                        التخصص: <strong className="text-slate-800 dark:text-slate-200">{selectedTeacher.specialty || selectedTeacher.teachingField || "عام"}</strong>
                      </div>
                      <div>
                        الجوال: <strong className="text-slate-800 dark:text-slate-200 font-mono">{selectedTeacher.mobile || "غير مسجل"}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
                    يرجى اختيار معلمة من القائمة المنسدلة أعلاه للمتابعة
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 2: اختيار نوع المساءلة */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-4"
            >
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  الخطوة الثانية: اختيار نوع المساءلة الإدارية
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  حددي نوع المخالفة المرتكبة من الخيارات الأربعة المعتمدة في النموذج الرسمي أو اختاري &quot;أخرى&quot;.
                </p>
              </div>

              {/* Inquiry Type Cards */}
              <div className="space-y-2.5">
                {INQUIRY_TYPE_OPTIONS.map((opt) => {
                  const isSelected = inquiryType === opt.type;
                  const IconComponent = opt.icon;
                  return (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => {
                        setInquiryType(opt.type);
                        setErrorMsg(null);
                      }}
                      className={cn(
                        "w-full p-3.5 rounded-2xl text-right transition-all border flex items-center gap-3 relative focus:outline-none cursor-pointer",
                        isSelected
                          ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 text-indigo-950 dark:text-indigo-100 shadow-sm ring-1 ring-indigo-500/20"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                      )}
                    >
                      <div
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                          isSelected
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        )}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-xs sm:text-sm leading-snug">{opt.label}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {opt.description}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Custom Type Input if 'أخرى' */}
              <AnimatePresence>
                {inquiryType === "أخرى" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-2"
                  >
                    <label className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      اكتب نوع المساءلة <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="اكتبي مسمى المساءلة بوضوح ودقة..."
                      value={customType}
                      onChange={(e) => setCustomType(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                      autoFocus
                    />
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      سيتم إدراج هذا النص في المساءلة الخطية والرسالة الموجهة للمعلمة.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* STEP 3: بيانات المساءلة */}
          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-4"
            >
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  الخطوة الثالثة: بيانات وتفاصيل المساءلة
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  حددي تاريخ الواقعة واكتبي تفاصيل المخالفة وتوجيهات الوكيلة إن وجدت.
                </p>
              </div>

              {/* Incident Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  تاريخ الواقعة <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  className="w-full h-11 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                />
              </div>

              {/* Description / Violation Details */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  وصف أو تفاصيل إضافية عن الواقعة <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="مثال: لوحظ عدم تواجدكم في الحصة الثالثة يوم الأحد الموافق... أو الامتناع عن أداء حصة الانتظار..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all leading-relaxed"
                />
              </div>

              {/* Vice Principal Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
                  ملاحظات الوكيل (اختياري)
                </label>
                <input
                  type="text"
                  placeholder="مثال: يرجى تقديم الإفادة خلال 48 ساعة من تاريخ الاستلام..."
                  value={vicePrincipalNotes}
                  onChange={(e) => setVicePrincipalNotes(e.target.value)}
                  className="w-full h-11 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </motion.div>
          )}

          {/* STEP 4: المراجعة والإرسال */}
          {currentStep === 4 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-4"
            >
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  الخطوة الرابعة: المراجعة والإرسال
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  راجعي بيانات المساءلة ونص الرسالة الرسمية التي ستصل للمعلمة عبر الواتساب.
                </p>
              </div>

              {/* Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  ملخص بيانات المساءلة الخطية:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">اسم المعلمة:</span>
                    <strong className="text-slate-800 dark:text-slate-200 text-sm">
                      {selectedTeacher?.fullName || selectedTeacher?.name}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">نوع المساءلة:</span>
                    <strong className="text-indigo-700 dark:text-indigo-400 font-bold">
                      {displayInquiryTypeName}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">تاريخ الواقعة:</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">
                      {incidentDate}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block">رقم جوال المعلمة:</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">
                      {mobileInput || selectedTeacher?.mobile || "غير مسجل"}
                    </strong>
                  </div>
                </div>

                {description && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5">التفاصيل:</span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                      {description}
                    </p>
                  </div>
                )}
              </div>

              {/* Teacher Mobile Number Input for WhatsApp */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={`${formId}-mobile`}
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    رقم جوال المعلمة (واتساب) <span className="text-rose-500">*</span>
                  </label>
                  {formatSaudiMobile(mobileInput) && (
                    <span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60 px-2 py-0.5 rounded-md border">
                      +{formatSaudiMobile(mobileInput)}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Phone
                    className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id={`${formId}-mobile`}
                    type="tel"
                    dir="ltr"
                    placeholder="05XXXXXXXX أو 9665XXXXXXXX"
                    value={mobileInput}
                    onChange={(e) => setMobileInput(normalizeSaudiMobileInput(e.target.value))}
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs md:text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                  />
                </div>
                {selectedTeacher && mobileInput && mobileInput !== selectedTeacher.mobile && (
                  <label className="flex items-center gap-2 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={saveMobileToProfile}
                      onChange={(e) => setSaveMobileToProfile(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                    />
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">
                      حفظ وتحديث رقم الجوال في ملف المعلمة الدائم
                    </span>
                  </label>
                )}
              </div>

              {/* WhatsApp Message Preview */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  نص الرسالة التي ستصل للمعلمة عبر واتساب:
                </label>
                <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-slate-800 dark:text-slate-200 text-xs leading-relaxed font-mono whitespace-pre-wrap">
                  {previewMessage}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 pb-safe bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Left: Prev or Cancel */}
          <div className="w-full sm:w-auto flex items-center gap-2">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={isProcessing}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors flex items-center justify-center gap-1.5 focus:outline-none cursor-pointer touch-target"
              >
                <ChevronRight className="w-4 h-4" />
                <span>السابق</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors focus:outline-none cursor-pointer flex items-center justify-center touch-target"
              >
                إلغاء
              </button>
            )}
          </div>

          {/* Right: Next or Submit */}
          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={currentStep === 1 && !selectedTeacherId}
                className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition-all focus:outline-none disabled:opacity-50 cursor-pointer touch-target"
              >
                <span>التالي: {STEPS[currentStep].title}</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={isProcessing || !selectedTeacherId}
                  className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-2xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors focus:outline-none disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer touch-target"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>حفظ فقط</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLinkAndMessage}
                  disabled={isProcessing || !selectedTeacherId}
                  className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-2xl border border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-300 text-xs font-bold transition-all focus:outline-none disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer touch-target"
                >
                  {copiedSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 dark:text-emerald-300">تم النسخ!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>نسخ الرسالة والرابط</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  disabled={isProcessing || !selectedTeacherId}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all focus:outline-none disabled:opacity-50 cursor-pointer touch-target"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري المعالجة...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>إرسال عبر واتساب</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
