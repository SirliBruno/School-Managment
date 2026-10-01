"use client";

import React, { useState, useId, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  FileText,
  AlertOctagon,
  CheckCircle2,
  Stethoscope,
  Users2,
  HelpCircle,
  Clock,
  RotateCcw,
  Save,
  AlertCircle,
  Check,
  FileDown,
  Loader2,
  MessageCircle,
  Upload,
  Paperclip,
  X,
  Sparkles,
  Eye,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { useToast } from "@/context/ToastContext";
import { AbsenceRecord, AbsenceType, Teacher } from "@/types/teacher";
import { TeacherCombobox } from "@/components/procedures/TeacherCombobox";
import { SendInquiryModal } from "@/components/procedures/SendInquiryModal";
import { printAbsencePdf } from "@/lib/printPdfService";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { compressMedicalReportImage } from "@/lib/imageCompressor";
import {
  getSaudiToday,
  calculateDaysBetween,
  formatDaysCountArabic,
  getDatesInRange,
} from "@/lib/timeUtils";
import { MAX_FALLBACK_DATA_URL_BYTES } from "@/lib/attachments";
import { cn } from "@/lib/utils";

interface AbsenceFormProps {
  onSuccess?: () => void;
  preselectedTeacherId?: string;
}

const ABSENCE_TYPES: {
  type: AbsenceType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
}[] = [
  {
    type: "اضطراري",
    label: "اضطراري",
    description: "ظرف عائلي أو شخصي طارئ",
    icon: AlertOctagon,
    colorClass: "border-blue-200 text-blue-700 hover:border-blue-400",
  },
  {
    type: "مرضي",
    label: "مرضي",
    description: "إجازة أو تقرير طبي معتمد",
    icon: Stethoscope,
    colorClass: "border-emerald-200 text-emerald-700 hover:border-emerald-400",
  },
  {
    type: "مرافق",
    label: "مرافق",
    description: "مرافقة مريض بتقرير طبي",
    icon: Users2,
    colorClass: "border-purple-200 text-purple-700 hover:border-purple-400",
  },
  {
    type: "أخرى",
    label: "أخرى",
    description: "أسباب إدارية أو استثنائية",
    icon: HelpCircle,
    colorClass: "border-amber-200 text-amber-700 hover:border-amber-400",
  },
];

const WIZARD_STEPS = [
  { step: 1, label: "المعلمة", description: "تحديد المعلمة المعنية" },
  { step: 2, label: "بيانات الغياب", description: "التاريخ والنوع والمسوغ" },
  { step: 3, label: "المرفقات والتوثيق", description: "التقارير والمستندات" },
  { step: 4, label: "المراجعة والاعتماد", description: "تأكيد الإجراء وحفظه" },
];

export const AbsenceForm: React.FC<AbsenceFormProps> = ({ onSuccess, preselectedTeacherId }) => {
  const { teachers, recordAbsence, absenceRecords } = useTeachers();
  const { showToast } = useToast();

  // Wizard Step State
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  // Sync preselected teacher if provided
  useEffect(() => {
    if (preselectedTeacherId && teachers.length > 0) {
      const found = teachers.find((t) => t.id === preselectedTeacherId);
      if (found) {
        setSelectedTeacherId(found.id);
        setSelectedTeacher(found);
        setErrors((prev) => ({ ...prev, teacherId: "" }));
      }
    }
  }, [preselectedTeacherId, teachers]);
  const [durationMode, setDurationMode] = useState<"single" | "multiple">("single");
  const [absenceDate, setAbsenceDate] = useState(() => getSaudiToday());
  const [absenceEndDate, setAbsenceEndDate] = useState(() => getSaudiToday());
  const [absenceType, setAbsenceType] = useState<AbsenceType | "">("اضطراري");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  // Computed days for multi-day range
  const calculatedDays = useMemo(() => {
    if (durationMode === "single") return 1;
    return calculateDaysBetween(absenceDate, absenceEndDate);
  }, [durationMode, absenceDate, absenceEndDate]);

  const daysLabel = useMemo(() => {
    return formatDaysCountArabic(calculatedDays);
  }, [calculatedDays]);

  // Attachment states
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [compressionRatio, setCompressionRatio] = useState<number | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation & UI states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExportingDirect, setIsExportingDirect] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);

  const [lastSavedRecord, setLastSavedRecord] = useState<AbsenceRecord | null>(null);
  const [lastSavedTeacher, setLastSavedTeacher] = useState<Teacher | null>(null);

  const formId = useId();

  const handleTeacherSelect = (teacher: Teacher | null) => {
    if (teacher) {
      setSelectedTeacherId(teacher.id);
      setSelectedTeacher(teacher);
      setErrors((prev) => ({ ...prev, teacherId: "" }));
    } else {
      setSelectedTeacherId("");
      setSelectedTeacher(null);
    }
  };

  const removeSelectedFile = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
    setCompressionRatio(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleReset = () => {
    setSelectedTeacherId("");
    setSelectedTeacher(null);
    setDurationMode("single");
    setAbsenceDate(getSaudiToday());
    setAbsenceEndDate(getSaudiToday());
    setAbsenceType("اضطراري");
    setReason("");
    setNotes("");
    removeSelectedFile();
    setErrors({});
    setCurrentStep(1);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      const MAX_PDF_SIZE = 3 * 1024 * 1024; // 3MB
      if (file.size > MAX_PDF_SIZE) {
        setErrors((prev) => ({
          ...prev,
          attachment: `حجم ملف الـ PDF كبير (${(file.size / (1024 * 1024)).toFixed(1)} ميغابايت). الحد الأقصى هو 3 ميغابايت.`,
        }));
        return;
      }
    }

    if (!isPdf && file.size > 20 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        attachment: "حجم الصورة كبير جداً. الحد الأقصى المسموح به هو 20 ميغابايت.",
      }));
      return;
    }

    setErrors((prev) => ({ ...prev, attachment: "" }));

    if (file.type.startsWith("image/")) {
      setIsCompressing(true);
      try {
        const compressed = await compressMedicalReportImage(file);
        setAttachmentFile(compressed.file);
        setAttachmentPreview(compressed.previewUrl);
        setCompressionRatio(compressed.compressionRatio);
      } catch (err) {
        console.warn("تعذر ضغط الصورة، استخدام الملف الأصلي:", err);
        setAttachmentFile(file);
        const reader = new FileReader();
        reader.onload = () => setAttachmentPreview(reader.result as string);
        reader.readAsDataURL(file);
      } finally {
        setIsCompressing(false);
      }
    } else {
      setAttachmentFile(file);
      setAttachmentPreview(null);
      setCompressionRatio(null);
    }
  };

  const uploadAttachment = async (): Promise<string | undefined> => {
    if (!attachmentFile) return undefined;

    let publicUrl = "";
    if (isSupabaseConfigured() && supabase) {
      try {
        const fileExt = attachmentFile.name.split(".").pop() || "jpg";
        const fileName = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${fileExt}`;
        const filePath = `manual-records/${fileName}`;

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("absence-attachments")
          .upload(filePath, attachmentFile, {
            cacheControl: "3600",
            upsert: true,
          });

        if (!uploadErr && uploadData) {
          const { data: urlData } = supabase.storage
            .from("absence-attachments")
            .getPublicUrl(filePath);
          publicUrl = urlData.publicUrl;
        }
      } catch (e) {
        console.warn("خطأ خدمة التخزين:", e);
      }
    }

    if (!publicUrl && attachmentFile) {
      if (attachmentFile.size <= MAX_FALLBACK_DATA_URL_BYTES) {
        publicUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve("");
          reader.readAsDataURL(attachmentFile);
        });
      } else {
        console.warn(
          `حجم المرفق (${(attachmentFile.size / 1024).toFixed(0)}KB) يتجاوز الحد الآمن للحفظ المحلي (750KB). تم تخطي تخزينه محلياً لتفادي امتلاء المتصفح.`
        );
      }
    }

    return publicUrl || undefined;
  };

  // Step Validation
  const validateStep = (stepNumber: number): boolean => {
    const newErrors: Record<string, string> = {};
    const today = getSaudiToday();

    if (stepNumber === 1) {
      if (!selectedTeacherId || !selectedTeacher) {
        newErrors.teacherId = "يرجى اختيار المعلمة من القائمة للمتابعة.";
      }
    }

    if (stepNumber === 2) {
      if (!absenceDate) {
        newErrors.date = "يرجى تحديد تاريخ الغياب.";
      } else if (absenceDate > today) {
        newErrors.date = "لا يمكن تسجيل غياب بتاريخ مستقبلي يتجاوز تاريخ اليوم.";
      }

      if (durationMode === "multiple") {
        if (!absenceEndDate) {
          newErrors.endDate = "يرجى تحديد تاريخ نهاية الغياب.";
        } else if (absenceEndDate > today) {
          newErrors.endDate = "لا يمكن أن يتجاوز تاريخ نهاية الغياب تاريخ اليوم.";
        } else if (absenceEndDate < absenceDate) {
          newErrors.endDate = "تاريخ نهاية الغياب يجب ألا يسبق تاريخ البداية.";
        }
      }

      if (selectedTeacherId && !newErrors.date && !newErrors.endDate) {
        if (durationMode === "single") {
          const isDuplicate = absenceRecords.some(
            (rec) => rec.teacherId === selectedTeacherId && rec.date === absenceDate && !rec.isArchived
          );
          if (isDuplicate) {
            newErrors.date = "تم تسجيل غياب لهذه المعلمة مسبقاً في هذا التاريخ.";
          }
        } else {
          const dates = getDatesInRange(absenceDate, absenceEndDate);
          const duplicateDates = dates.filter((d) =>
            absenceRecords.some((rec) => rec.teacherId === selectedTeacherId && rec.date === d && !rec.isArchived)
          );
          if (duplicateDates.length > 0) {
            newErrors.endDate = `يوجد غياب مسجل مسبقاً للمعلمة في التواريخ: ${duplicateDates.slice(0, 3).join(", ")}${duplicateDates.length > 3 ? "..." : ""}`;
          }
        }
      }

      if (!absenceType) {
        newErrors.type = "يرجى اختيار نوع الغياب.";
      }

      if (!reason.trim()) {
        newErrors.reason = "سبب الغياب مطلوب لإصدار نموذج المساءلة.";
      } else if (reason.trim().length < 3) {
        newErrors.reason = "يرجى كتابة سبب غياب واضح ومفصل (3 أحرف على الأقل).";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(4, prev + 1) as 1 | 2 | 3 | 4);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1) as 1 | 2 | 3 | 4);
  };

  const validateAll = (): boolean => {
    return validateStep(1) && validateStep(2);
  };

  const saveRecord = async (): Promise<AbsenceRecord | null> => {
    if (!validateAll() || !selectedTeacher || !absenceType) return null;

    const daysCount = durationMode === "multiple" ? calculatedDays : 1;
    const teacherSnapshot = {
      ...selectedTeacher,
      totalAbsences: (selectedTeacher.totalAbsences || 0) + daysCount,
    };

    const attachmentUrl = await uploadAttachment();
    let primaryRecord: AbsenceRecord | null = null;

    if (durationMode === "multiple") {
      const dates = getDatesInRange(absenceDate, absenceEndDate);
      dates.forEach((targetDate, index) => {
        const rec = recordAbsence({
          teacherId: selectedTeacher.id,
          teacherName: selectedTeacher.fullName || selectedTeacher.name || "معلمة",
          jobNumber: selectedTeacher.nationalId || selectedTeacher.username || selectedTeacher.jobNumber || "—",
          nationalId: selectedTeacher.nationalId,
          specialty: selectedTeacher.specialty || selectedTeacher.teachingField || "عام",
          date: targetDate,
          type: absenceType,
          reason: reason.trim(),
          notes: notes.trim()
            ? `${notes.trim()} (ضمن فترة غياب ${daysLabel}: من ${absenceDate} إلى ${absenceEndDate})`
            : `ضمن فترة غياب ${daysLabel}: من ${absenceDate} إلى ${absenceEndDate}`,
          attachmentUrl,
        });
        if (index === 0) {
          primaryRecord = rec;
        }
      });
    } else {
      primaryRecord = recordAbsence({
        teacherId: selectedTeacher.id,
        teacherName: selectedTeacher.fullName || selectedTeacher.name || "معلمة",
        jobNumber: selectedTeacher.nationalId || selectedTeacher.username || selectedTeacher.jobNumber || "—",
        nationalId: selectedTeacher.nationalId,
        specialty: selectedTeacher.specialty || selectedTeacher.teachingField || "عام",
        date: absenceDate,
        type: absenceType,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        attachmentUrl,
      });
    }

    if (primaryRecord) {
      setLastSavedRecord(primaryRecord);
      setLastSavedTeacher(teacherSnapshot);
    }

    return primaryRecord;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setIsSubmitting(true);
    try {
      const newRecord = await saveRecord();
      if (!newRecord) {
        setIsSubmitting(false);
        return;
      }

      const daysCount = durationMode === "multiple" ? calculatedDays : 1;
      setSuccessMessage(
        durationMode === "multiple"
          ? `تم تسجيل غياب المعلمة (${newRecord.teacherName}) لفترة ${daysLabel} بنجاح وزيادة رصيد الغياب إلى ${
              (selectedTeacher?.totalAbsences || 0) + daysCount
            }.`
          : `تم تسجيل إجراء مساءلة الغياب للمعلمة (${newRecord.teacherName}) بنجاح وزيادة رصيد الغياب إلى ${
              (selectedTeacher?.totalAbsences || 0) + 1
            }.`
      );

      handleReset();
      if (onSuccess) onSuccess();

      setTimeout(() => {
        setSuccessMessage(null);
      }, 7000);
    } catch (err) {
      console.error("خطأ أثناء تسجيل الغياب:", err);
      showToast({
        message: "تعذر حفظ سجل الغياب، يرجى التحقق من الاتصال والمحاولة مجدداً.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndExportPdf = async () => {
    if (!validateAll() || !selectedTeacher) return;

    setIsExportingDirect(true);
    try {
      const newRecord = await saveRecord();
      if (!newRecord) {
        setIsExportingDirect(false);
        return;
      }

      const daysCount = durationMode === "multiple" ? calculatedDays : 1;
      const formattedAbsenceDate =
        durationMode === "multiple"
          ? `من ${absenceDate} إلى ${absenceEndDate} (${daysLabel})`
          : newRecord.date;

      try {
        printAbsencePdf({
          teacherName: newRecord.teacherName,
          nationalId: newRecord.nationalId || selectedTeacher.nationalId,
          username: newRecord.nationalId || newRecord.jobNumber,
          specialty: newRecord.specialty,
          jobTitle: selectedTeacher.jobTitle || "معلم",
          employmentStatus: selectedTeacher.employmentStatus || "دائم",
          absenceCount: (selectedTeacher.totalAbsences || 0) + daysCount,
          absenceDate: formattedAbsenceDate,
          absenceType: newRecord.type,
          absenceReason: newRecord.reason,
          attachmentUrl: newRecord.attachmentUrl,
        });

        setSuccessMessage(
          `تم حفظ المساءلة وتجهيز استمارة الـ PDF للطباعة للمعلمة (${newRecord.teacherName}) بنجاح.`
        );

        handleReset();
        if (onSuccess) onSuccess();
      } catch (exportErr) {
        console.error("فشل طباعة ملف PDF:", exportErr);
      } finally {
        setIsExportingDirect(false);
      }
    } catch (err) {
      console.error("خطأ أثناء الحفظ والتصدير:", err);
      showToast({
        message: "تعذر حفظ وتصدير استمارة الغياب، يرجى المحاولة مجدداً.",
        type: "error",
      });
      setIsExportingDirect(false);
    }
  };

  const handleDownloadLastPdf = () => {
    if (!lastSavedRecord || !lastSavedTeacher) return;

    try {
      printAbsencePdf({
        teacherName: lastSavedRecord.teacherName,
        nationalId: lastSavedRecord.nationalId || lastSavedTeacher.nationalId,
        username: lastSavedRecord.nationalId || lastSavedRecord.jobNumber,
        specialty: lastSavedRecord.specialty,
        jobTitle: lastSavedTeacher.jobTitle || "معلم",
        employmentStatus: lastSavedTeacher.employmentStatus || "دائم",
        absenceCount: lastSavedTeacher.totalAbsences || 1,
        absenceDate: lastSavedRecord.date,
        absenceType: lastSavedRecord.type,
        absenceReason: lastSavedRecord.reason,
        attachmentUrl: lastSavedRecord.attachmentUrl,
      });
    } catch (err) {
      console.error("فشل طباعة ملف PDF:", err);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Institutional Header */}
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#137a85] dark:text-teal-400 shrink-0" />
            <span>تسجيل إجراء مساءلة غياب جديد</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            توثيق غياب المعلمة وإصدار استمارة المساءلة الرسمية وفق اللوائح المدرسية
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsInquiryModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/80 dark:border-emerald-800/60 transition-colors shadow-2xs cursor-pointer min-h-[36px]"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>إرسال عبر الواتساب</span>
          </button>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs min-h-[36px]">
            <Clock className="w-3.5 h-3.5 text-[#137a85] dark:text-teal-400" />
            <span>التوثيق الفوري</span>
          </div>
        </div>
      </div>

      {/* Stepper Progress Indicator */}
      <div className="px-3 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="grid grid-cols-4 gap-1 sm:gap-2">
          {WIZARD_STEPS.map((s) => {
            const isCompleted = currentStep > s.step;
            const isCurrent = currentStep === s.step;

            return (
              <button
                key={s.step}
                type="button"
                onClick={() => {
                  if (s.step < currentStep) {
                    setCurrentStep(s.step as 1 | 2 | 3 | 4);
                  } else if (s.step > currentStep && validateStep(currentStep)) {
                    setCurrentStep(s.step as 1 | 2 | 3 | 4);
                  }
                }}
                className={cn(
                  "text-right group cursor-pointer transition-all pb-2 border-b-2 flex flex-col gap-1 focus-visible:outline-none",
                  isCurrent
                    ? "border-[#137a85] dark:border-teal-400"
                    : isCompleted
                    ? "border-emerald-500 dark:border-emerald-400"
                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                )}
              >
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span
                    className={cn(
                      "w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors",
                      isCurrent
                        ? "bg-[#137a85] dark:bg-teal-500 text-white"
                        : isCompleted
                        ? "bg-emerald-500 dark:bg-emerald-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
                    )}
                  >
                    {isCompleted ? <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : s.step}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] sm:text-xs font-bold truncate",
                      isCurrent
                        ? "text-slate-900 dark:text-slate-100"
                        : isCompleted
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-slate-500 dark:text-slate-400"
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                <span className="hidden sm:block text-[10px] text-slate-400 dark:text-slate-500 truncate">
                  {s.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Success Notification Banner */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            role="alert"
            className="m-4 sm:m-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm shadow-2xs"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">تم حفظ الإجراء بنجاح!</p>
                <p className="text-xs opacity-90 mt-0.5">{successMessage}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {lastSavedRecord && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={handleDownloadLastPdf}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#137a85] dark:bg-teal-600 text-white hover:bg-teal-700 dark:hover:bg-teal-500 transition-colors shadow-2xs cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  <span>تحميل استمارة PDF</span>
                </motion.button>
              )}
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 text-xs font-bold px-2 py-1 rounded-lg hover:bg-emerald-100/60 dark:hover:bg-emerald-900/60"
              >
                إغلاق
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form Wizard Body */}
      <div className="p-4 sm:p-6 space-y-6">
        {/* STEP 1: Select Teacher */}
        {currentStep === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <div className="max-w-xl">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-1">
                <UserCheck className="w-4 h-4 text-[#137a85] dark:text-teal-400" />
                <span>الخطوة 1: اختيار المعلمة المعنية بالمساءلة</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ابحثي عن اسم المعلمة أو السجل المدني لإصدار المساءلة وتحديث سجل الغياب التراكمي
              </p>
            </div>

            <div className="max-w-2xl">
              <TeacherCombobox
                teachers={teachers}
                selectedTeacherId={selectedTeacherId}
                onSelect={handleTeacherSelect}
                error={errors.teacherId}
                disabled={isSubmitting || isExportingDirect}
              />
            </div>

            {/* Quick Teacher Profile Summary Card when selected */}
            {selectedTeacher && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/60 max-w-2xl"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#137a85] dark:bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                      {selectedTeacher.fullName?.charAt(0) || "م"}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {selectedTeacher.fullName || selectedTeacher.name}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-mono">{selectedTeacher.nationalId || "—"}</span>
                        <span>•</span>
                        <span>{selectedTeacher.specialty || selectedTeacher.teachingField || "عام"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">رصيد الغياب الحالي</span>
                    <span className="text-sm font-extrabold text-[#137a85] dark:text-teal-400 font-mono">
                      {selectedTeacher.totalAbsences || 0} أيام
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* STEP 2: Absence Data (Date, Range, Type, Reason) */}
        {currentStep === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-[#137a85] dark:text-teal-400" />
                <span>الخطوة 2: بيانات وتفاصيل الغياب</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                تحديد فترة الغياب، نوع العذر، والمسوغ الإداري المكتوب
              </p>
            </div>

            {/* Duration Mode Switch */}
            <div className="space-y-1.5 max-w-md">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                مدة وفترة الغياب <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setDurationMode("single")}
                  className={cn(
                    "py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                    durationMode === "single"
                      ? "bg-white dark:bg-slate-900 text-[#137a85] dark:text-teal-400 shadow-2xs font-extrabold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  )}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>يوم واحد</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDurationMode("multiple");
                    if (absenceEndDate <= absenceDate) {
                      const next = new Date(absenceDate);
                      next.setDate(next.getDate() + 1);
                      const todayStr = getSaudiToday();
                      const nextStr = next.toISOString().split("T")[0];
                      setAbsenceEndDate(nextStr > todayStr ? todayStr : nextStr);
                    }
                  }}
                  className={cn(
                    "py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                    durationMode === "multiple"
                      ? "bg-white dark:bg-slate-900 text-[#137a85] dark:text-teal-400 shadow-2xs font-extrabold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  )}
                >
                  <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>عدة أيام (فترة غياب)</span>
                </button>
              </div>
            </div>

            {/* Date Pickers */}
            {durationMode === "single" ? (
              <div className="space-y-1.5 max-w-md">
                <label
                  htmlFor={`${formId}-date`}
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  تاريخ الغياب <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar
                    className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id={`${formId}-date`}
                    type="date"
                    max={getSaudiToday()}
                    value={absenceDate}
                    onChange={(e) => {
                      setAbsenceDate(e.target.value);
                      setErrors((prev) => ({ ...prev, date: "" }));
                    }}
                    aria-invalid={!!errors.date}
                    aria-describedby={errors.date ? `${formId}-date-error` : undefined}
                    className={cn(
                      "w-full px-3.5 py-2.5 min-h-[46px] rounded-xl border text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all shadow-2xs",
                      errors.date
                        ? "border-rose-400 focus:ring-rose-200 dark:focus:ring-rose-900"
                        : "border-slate-200 dark:border-slate-700 focus:border-[#137a85] dark:focus:border-teal-400 focus:ring-[#137a85]/20 dark:focus:ring-teal-400/20"
                    )}
                  />
                </div>
                {errors.date && (
                  <p
                    id={`${formId}-date-error`}
                    className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errors.date}</span>
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3 p-4 rounded-xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-800/60 max-w-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#137a85] dark:text-teal-400" />
                    <span>تحديد فترة الغياب الممتدة</span>
                  </span>
                  {calculatedDays > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#137a85] dark:bg-teal-600 text-white shadow-2xs">
                      <span>المدة:</span>
                      <span>{daysLabel}</span>
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`${formId}-start-date`}
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      من تاريخ (بداية الغياب) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar
                        className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        id={`${formId}-start-date`}
                        type="date"
                        max={getSaudiToday()}
                        value={absenceDate}
                        onChange={(e) => {
                          setAbsenceDate(e.target.value);
                          if (e.target.value > absenceEndDate) {
                            setAbsenceEndDate(e.target.value);
                          }
                          setErrors((prev) => ({ ...prev, date: "" }));
                        }}
                        className={cn(
                          "w-full px-3.5 py-2.5 min-h-[46px] rounded-xl border text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all shadow-2xs",
                          errors.date
                            ? "border-rose-400 focus:ring-rose-200 dark:focus:ring-rose-900"
                            : "border-slate-200 dark:border-slate-700 focus:border-[#137a85] dark:focus:border-teal-400 focus:ring-[#137a85]/20 dark:focus:ring-teal-400/20"
                        )}
                      />
                    </div>
                    {errors.date && (
                      <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.date}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor={`${formId}-end-date`}
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      إلى تاريخ (نهاية الغياب) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar
                        className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        id={`${formId}-end-date`}
                        type="date"
                        min={absenceDate}
                        max={getSaudiToday()}
                        value={absenceEndDate}
                        onChange={(e) => {
                          setAbsenceEndDate(e.target.value);
                          setErrors((prev) => ({ ...prev, endDate: "" }));
                        }}
                        className={cn(
                          "w-full px-3.5 py-2.5 min-h-[46px] rounded-xl border text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all shadow-2xs",
                          errors.endDate
                            ? "border-rose-400 focus:ring-rose-200 dark:focus:ring-rose-900"
                            : "border-slate-200 dark:border-slate-700 focus:border-[#137a85] dark:focus:border-teal-400 focus:ring-[#137a85]/20 dark:focus:ring-teal-400/20"
                        )}
                      />
                    </div>
                    {errors.endDate && (
                      <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errors.endDate}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Absence Type Cards */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                نوع الغياب <span className="text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {ABSENCE_TYPES.map((item) => {
                  const Icon = item.icon;
                  const isSelected = absenceType === item.type;

                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => {
                        setAbsenceType(item.type);
                        setErrors((prev) => ({ ...prev, type: "" }));
                      }}
                      className={cn(
                        "p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-2 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85] dark:focus-visible:ring-teal-400",
                        isSelected
                          ? "bg-teal-50/80 dark:bg-teal-950/50 border-[#137a85] dark:border-teal-400 ring-2 ring-[#137a85]/20 dark:ring-teal-400/20 shadow-2xs"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/60 dark:hover:bg-slate-750"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                            isSelected
                              ? "bg-[#137a85] dark:bg-teal-600 text-white"
                              : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-600"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        <div
                          className={cn(
                            "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                            isSelected
                              ? "border-[#137a85] dark:border-teal-400 bg-[#137a85] dark:bg-teal-500 text-white"
                              : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                          )}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5" />}
                        </div>
                      </div>

                      <div>
                        <span
                          className={cn(
                            "block text-xs md:text-sm font-bold",
                            isSelected ? "text-[#137a85] dark:text-teal-400" : "text-slate-800 dark:text-slate-200"
                          )}
                        >
                          {item.label}
                        </span>
                        <span className="block text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">
                          {item.description}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {errors.type && (
                <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.type}</span>
                </p>
              )}
            </div>

            {/* Reason Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={`${formId}-reason`}
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  سبب الغياب (مطلوب) <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {reason.length}/200 حرف
                </span>
              </div>
              <textarea
                id={`${formId}-reason`}
                rows={3}
                maxLength={200}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setErrors((prev) => ({ ...prev, reason: "" }));
                }}
                aria-invalid={!!errors.reason}
                aria-describedby={errors.reason ? `${formId}-reason-error` : undefined}
                placeholder="اكتبي سبب الغياب الموضح من المعلمة أو مسوغ الرصد الإداري..."
                className={cn(
                  "w-full p-3.5 min-h-[90px] rounded-xl border text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all shadow-2xs resize-none",
                  errors.reason
                    ? "border-rose-400 focus:ring-rose-200 dark:focus:ring-rose-900"
                    : "border-slate-200 dark:border-slate-700 focus:border-[#137a85] dark:focus:border-teal-400 focus:ring-[#137a85]/20 dark:focus:ring-teal-400/20"
                )}
              />
              {errors.reason && (
                <p
                  id={`${formId}-reason-error`}
                  className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.reason}</span>
                </p>
              )}
            </div>

            {/* Optional Notes */}
            <div className="space-y-1.5">
              <label
                htmlFor={`${formId}-notes`}
                className="block text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                ملاحظات إدارية إضافية (اختياري)
              </label>
              <textarea
                id={`${formId}-notes`}
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أي ملاحظات تخص الحصص البديلة، أو تنبيهات الإدارة المدرسية..."
                className="w-full p-3.5 min-h-[70px] rounded-xl border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:border-[#137a85] dark:focus:border-teal-400 focus:ring-[#137a85]/20 dark:focus:ring-teal-400/20 transition-all shadow-2xs resize-none"
              />
            </div>
          </motion.div>
        )}

        {/* STEP 3: Attachments and Medical Documentation */}
        {currentStep === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-1">
                <Paperclip className="w-4 h-4 text-[#137a85] dark:text-teal-400" />
                <span>الخطوة 3: المرفقات والتوثيق الطبي</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                إرفاق التقارير الطبية أو إجازات منصة صحتي (اختياري ولكن يُنصح به لتوثيق العذر رسمياً)
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
              onChange={handleFileChange}
              className="hidden"
              id={`${formId}-attachment`}
            />

            {!attachmentFile ? (
              <div
                tabIndex={0}
                role="button"
                aria-label="انقري أو اضغطي Enter لإرفاق تقرير طبي أو مستند عذر"
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85] dark:focus-visible:ring-teal-400",
                  errors.attachment
                    ? "border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-[#137a85] dark:hover:border-teal-400 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-teal-50/20 dark:hover:bg-teal-950/20"
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-[#137a85] dark:group-hover:text-teal-400 group-hover:scale-105 flex items-center justify-center shadow-2xs border border-slate-100 dark:border-slate-700 transition-all">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#137a85] dark:group-hover:text-teal-400 transition-colors">
                    انقري هنا لإرفاق تقرير طبي، إجازة صحتي، أو مستند عذر
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    يدعم صور الجوال المباشرة ومستندات PDF حتى 3 ميغابايت • ضغط ذكي تلقائي
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-teal-200 dark:border-teal-800/80 bg-teal-50/40 dark:bg-teal-950/40 flex items-center justify-between gap-3 max-w-xl">
                <div className="flex items-center gap-3 min-w-0">
                  {attachmentPreview ? (
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-teal-300 dark:border-teal-700 shrink-0 bg-white dark:bg-slate-800 shadow-2xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={attachmentPreview}
                        alt="معاينة المرفق"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0 font-bold text-xs border border-rose-200 dark:border-rose-800">
                      PDF
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={attachmentFile.name}>
                      {attachmentFile.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {(attachmentFile.size / 1024).toFixed(0)} كيلوبايت
                      </span>
                      {compressionRatio !== null && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/70 px-2 py-0.5 rounded-full">
                          <Sparkles className="w-3 h-3" />
                          <span>وفرت {compressionRatio}%</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {attachmentPreview && (
                    <a
                      href={attachmentPreview}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                      title="معاينة المرفق بالحجم الكامل"
                      aria-label="معاينة المرفق بالحجم الكامل"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={removeSelectedFile}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                    title="حذف هذا المرفق"
                    aria-label="حذف هذا المرفق"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {isCompressing && (
              <div className="flex items-center gap-2 text-xs text-teal-700 dark:text-teal-300 font-semibold px-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>جاري معالجة وتحسين جودة المستند المرفق...</span>
              </div>
            )}

            {errors.attachment && (
              <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.attachment}</span>
              </p>
            )}
          </motion.div>
        )}

        {/* STEP 4: Review and Official Confirmation */}
        {currentStep === 4 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>الخطوة 4: مراجعة واعتماد مساءلة الغياب</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                يرجى التأكد من صحة البيانات المسجلة قبل الاعتماد الرسمي في سجلات المدرسة
              </p>
            </div>

            {/* Institutional Summary Sheet */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
                <div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 block mb-0.5">المعلمة المعنية</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {selectedTeacher?.fullName || selectedTeacher?.name || "—"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    السجل المدني: {selectedTeacher?.nationalId || "—"}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 block mb-0.5">التخصص والمسمى</span>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {selectedTeacher?.specialty || selectedTeacher?.teachingField || "عام"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    الحالة الوظيفية: {selectedTeacher?.employmentStatus || "دائم"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
                <div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 block mb-0.5">فترة الغياب</span>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                    {durationMode === "single"
                      ? absenceDate
                      : `من ${absenceDate} إلى ${absenceEndDate}`}
                  </p>
                  <span className="inline-block mt-1 text-[11px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                    {daysLabel}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 block mb-0.5">نوع الغياب</span>
                  <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-[#137a85] dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    {absenceType || "—"}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 block mb-0.5">حالة المرفقات</span>
                  {attachmentFile ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <Check className="w-3.5 h-3.5" />
                      <span>مرفق: {attachmentFile.name}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500">بدون مرفقات</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 block mb-1">سبب ومسوغ الغياب</span>
                <p className="text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  {reason || "—"}
                </p>
              </div>

              {notes && (
                <div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 block mb-1">ملاحظات إضافية</span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    {notes}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Wizard Navigation & Action Controls */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          {/* Previous / Reset Button */}
          <div className="w-full sm:w-auto flex items-center gap-2">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={isSubmitting || isExportingDirect}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
                <span>الخطوة السابقة</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleReset}
                disabled={isSubmitting || isExportingDirect}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>تفريغ الحقول</span>
              </button>
            )}
          </div>

          {/* Next / Submit Buttons */}
          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="w-full sm:w-auto min-h-[46px] px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap bg-[#137a85] dark:bg-teal-600 text-white hover:bg-teal-700 dark:hover:bg-teal-500 shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="whitespace-nowrap">متابعة للخطوة التالية</span>
                <ChevronLeft className="w-4 h-4 shrink-0" />
              </button>
            ) : (
              <>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={handleSaveAndExportPdf}
                  disabled={isSubmitting || isExportingDirect}
                  className="w-full sm:w-auto min-h-[46px] px-5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap bg-teal-50 dark:bg-teal-950/60 text-[#137a85] dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-300 dark:border-teal-700 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isExportingDirect ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#137a85] dark:text-teal-400 shrink-0" />
                  ) : (
                    <FileDown className="w-4 h-4 text-[#137a85] dark:text-teal-400 shrink-0" />
                  )}
                  <span className="whitespace-nowrap">{isExportingDirect ? "جاري الحفظ والتصدير..." : "حفظ وتصدير PDF"}</span>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={isSubmitting || isExportingDirect}
                  className="w-full sm:w-auto min-h-[46px] px-7 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap bg-[#137a85] dark:bg-teal-600 text-white hover:bg-teal-700 dark:hover:bg-teal-500 shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <Save className="w-4 h-4 text-teal-100 shrink-0" />
                  <span className="whitespace-nowrap">{isSubmitting ? "جاري الحفظ..." : "اعتماد وحفظ المساءلة"}</span>
                </motion.button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Send Inquiry Modal */}
      <SendInquiryModal
        isOpen={isInquiryModalOpen}
        onClose={() => setIsInquiryModalOpen(false)}
        preselectedTeacherId={selectedTeacherId || undefined}
      />
    </div>
  );
};
