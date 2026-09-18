"use client";

import React, { useState, useId, useRef } from "react";
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
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { AbsenceRecord, AbsenceType, Teacher } from "@/types/teacher";
import { TeacherCombobox } from "@/components/procedures/TeacherCombobox";
import { SendInquiryModal } from "@/components/procedures/SendInquiryModal";
import { printAbsencePdf } from "@/lib/printPdfService";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { compressMedicalReportImage } from "@/lib/imageCompressor";
import { cn } from "@/lib/utils";



interface AbsenceFormProps {
  onSuccess?: () => void;
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

export const AbsenceForm: React.FC<AbsenceFormProps> = ({ onSuccess }) => {
  const { teachers, recordAbsence } = useTeachers();

  // Form states
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [absenceDate, setAbsenceDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [absenceType, setAbsenceType] = useState<AbsenceType>("اضطراري");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

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
    setAbsenceDate(new Date().toISOString().split("T")[0]);
    setAbsenceType("اضطراري");
    setReason("");
    setNotes("");
    removeSelectedFile();
    setErrors({});
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
      publicUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve("");
        reader.readAsDataURL(attachmentFile);
      });
    }

    return publicUrl || undefined;
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedTeacherId) {
      newErrors.teacherId = "يرجى اختيار المعلمة من القائمة.";
    }

    if (!absenceDate) {
      newErrors.date = "يرجى تحديد تاريخ الغياب.";
    }

    if (!reason.trim()) {
      newErrors.reason = "سبب الغياب مطلوب لإصدار نموذج المساءلة.";
    } else if (reason.trim().length < 3) {
      newErrors.reason = "يرجى كتابة سبب غياب واضح ومفصل (3 أحرف على الأقل).";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveRecord = async (): Promise<AbsenceRecord | null> => {
    if (!validate() || !selectedTeacher) return null;

    const teacherSnapshot = {
      ...selectedTeacher,
      totalAbsences: (selectedTeacher.totalAbsences || 0) + 1,
    };

    const attachmentUrl = await uploadAttachment();

    const newRecord = recordAbsence({
      teacherId: selectedTeacher.id,
      teacherName: selectedTeacher.fullName || selectedTeacher.name || "معلمة",
      jobNumber: selectedTeacher.username || selectedTeacher.jobNumber || "—",
      specialty: selectedTeacher.specialty || selectedTeacher.teachingField || "عام",
      date: absenceDate,
      type: absenceType,
      reason: reason.trim(),
      notes: notes.trim() || undefined,
      attachmentUrl,
    });

    setLastSavedRecord(newRecord);
    setLastSavedTeacher(teacherSnapshot);

    return newRecord;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      const newRecord = await saveRecord();
      if (!newRecord) {
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(
        `تم تسجيل إجراء مساءلة الغياب للمعلمة (${newRecord.teacherName}) بنجاح وزيادة رصيد الغياب إلى ${
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndExportPdf = async () => {
    if (!validate() || !selectedTeacher) return;

    setIsExportingDirect(true);
    try {
      const newRecord = await saveRecord();
      if (!newRecord) {
        setIsExportingDirect(false);
        return;
      }

      // Send directly to print service
      try {
        printAbsencePdf({
          teacherName: newRecord.teacherName,
          username: newRecord.jobNumber,
          specialty: newRecord.specialty,
          jobTitle: selectedTeacher.jobTitle || "معلم",
          employmentStatus: selectedTeacher.employmentStatus || "دائم",
          absenceCount: (selectedTeacher.totalAbsences || 0) + 1,
          absenceDate: newRecord.date,
          absenceType: newRecord.type,
          absenceReason: newRecord.reason,
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
      setIsExportingDirect(false);
    }
  };

  const handleDownloadLastPdf = () => {
    if (!lastSavedRecord || !lastSavedTeacher) return;

    try {
      printAbsencePdf({
        teacherName: lastSavedRecord.teacherName,
        username: lastSavedRecord.jobNumber,
        specialty: lastSavedRecord.specialty,
        jobTitle: lastSavedTeacher.jobTitle || "معلم",
        employmentStatus: lastSavedTeacher.employmentStatus || "دائم",
        absenceCount: lastSavedTeacher.totalAbsences || 1,
        absenceDate: lastSavedRecord.date,
        absenceType: lastSavedRecord.type,
        absenceReason: lastSavedRecord.reason,
      });
    } catch (err) {
      console.error("فشل طباعة ملف PDF:", err);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

      {/* Form Card Header */}
      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#137a85]" />
            <span>تسجيل إجراء مساءلة غياب جديد</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            توثيق غياب المعلمة وإصدار نموذج المساءلة الإدارية وفق اللوائح المدرسية
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsInquiryModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>إرسال عبر الواتساب</span>
          </button>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-[#137a85]" />
            <span>التوثيق الفوري</span>
          </div>
        </div>
      </div>

      {/* Success Toast with Direct PDF Download Shortcut */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            role="alert"
            className="m-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm shadow-sm"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#137a85] text-white hover:bg-teal-700 transition-colors shadow-2xs cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  <span>تحميل استمارة PDF</span>
                </motion.button>
              )}
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-1 rounded-lg hover:bg-emerald-100/60"
              >
                إغلاق
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Row 1: Teacher Combobox & Absence Date */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-8">
            <TeacherCombobox
              teachers={teachers}
              selectedTeacherId={selectedTeacherId}
              onSelect={handleTeacherSelect}
              error={errors.teacherId}
              disabled={isSubmitting || isExportingDirect}
            />
          </div>

          <div className="md:col-span-4 space-y-1.5">
            <label
              htmlFor={`${formId}-date`}
              className="block text-xs font-bold text-slate-700"
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
                value={absenceDate}
                onChange={(e) => {
                  setAbsenceDate(e.target.value);
                  setErrors((prev) => ({ ...prev, date: "" }));
                }}
                className={cn(
                  "w-full px-3.5 py-2.5 min-h-[48px] rounded-xl border text-base md:text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 transition-all shadow-2xs",
                  errors.date
                    ? "border-rose-400 focus:ring-rose-200"
                    : "border-slate-200 focus:border-[#137a85] focus:ring-[#137a85]/20"
                )}
              />
            </div>
            {errors.date && (
              <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.date}</span>
              </p>
            )}
          </div>
        </div>

        {/* Row 2: Absence Type (Segmented Cards) */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">
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
                  onClick={() => setAbsenceType(item.type)}
                  className={cn(
                    "p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-2 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85]",
                    isSelected
                      ? "bg-teal-50/70 border-[#137a85] ring-2 ring-[#137a85]/20 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                        isSelected
                          ? "bg-[#137a85] text-white"
                          : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div
                      className={cn(
                        "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                        isSelected
                          ? "border-[#137a85] bg-[#137a85] text-white"
                          : "border-slate-300 bg-white"
                      )}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5" />}
                    </div>
                  </div>

                  <div>
                    <span
                      className={cn(
                        "block text-xs md:text-sm font-bold",
                        isSelected ? "text-[#137a85]" : "text-slate-800"
                      )}
                    >
                      {item.label}
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-0.5 leading-tight">
                      {item.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: Reason for Absence */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor={`${formId}-reason`}
              className="block text-xs font-bold text-slate-700"
            >
              سبب الغياب (مطلوب) <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400">
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
            placeholder="اكتبي سبب الغياب الموضح من المعلمة أو سبب رصد المساءلة بالتفصيل..."
            className={cn(
              "w-full p-3.5 min-h-[96px] rounded-xl border text-base md:text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all shadow-2xs resize-none",
              errors.reason
                ? "border-rose-400 focus:ring-rose-200"
                : "border-slate-200 focus:border-[#137a85] focus:ring-[#137a85]/20"
            )}
          />
          {errors.reason && (
            <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors.reason}</span>
            </p>
          )}
        </div>

        {/* Row 4: Additional Notes (Optional) */}
        <div className="space-y-1.5">
          <label
            htmlFor={`${formId}-notes`}
            className="block text-xs font-bold text-slate-700"
          >
            ملاحظات إضافية (اختياري)
          </label>
          <textarea
            id={`${formId}-notes`}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أي ملاحظات تخص الحصص المعوضة، إشعار ولي الأمر، أو المرفقات الإدارية..."
            className="w-full p-3.5 min-h-[80px] rounded-xl border border-slate-200 text-base md:text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-[#137a85] focus:ring-[#137a85]/20 transition-all shadow-2xs resize-none"
          />
        </div>

        {/* Row 5: Attachments (Optional) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor={`${formId}-attachment`}
              className="block text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <Paperclip className="w-3.5 h-3.5 text-[#137a85]" />
              <span>المرفقات والتقارير الطبية (اختياري)</span>
            </label>
            <span className="text-[11px] text-slate-400">
              يدعم صور الجوال والتقارير بصيغة PDF
            </span>
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
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group",
                errors.attachment
                  ? "border-rose-300 bg-rose-50/40"
                  : "border-slate-200 hover:border-[#137a85] bg-slate-50/50 hover:bg-teal-50/20"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-white text-slate-500 group-hover:text-[#137a85] group-hover:scale-105 flex items-center justify-center shadow-xs border border-slate-100 transition-all">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 group-hover:text-[#137a85] transition-colors">
                  انقري هنا لإرفاق تقرير طبي، إجازة صحتي، أو مستند عذر
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  الصور تُضغط تلقائياً لتوفير المساحة • الحد الأقصى للـ PDF هو 3 ميغابايت
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl border border-teal-200 bg-teal-50/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {attachmentPreview ? (
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-teal-300 shrink-0 bg-white shadow-2xs">
                    <img
                      src={attachmentPreview}
                      alt="معاينة المرفق"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 font-bold text-xs border border-rose-200">
                    PDF
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate" title={attachmentFile.name}>
                    {attachmentFile.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] font-mono text-slate-500">
                      {(attachmentFile.size / 1024).toFixed(0)} كيلوبايت
                    </span>
                    {compressionRatio !== null && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
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
                    className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                    title="معاينة المرفق بالحجم الكامل"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={removeSelectedFile}
                  className="p-2 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                  title="حذف هذا المرفق"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {isCompressing && (
            <div className="flex items-center gap-2 text-xs text-teal-700 font-semibold px-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>جاري تحسين وضغط المستند المرفق تلقائياً...</span>
            </div>
          )}

          {errors.attachment && (
            <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errors.attachment}</span>
            </p>
          )}
        </div>

        {/* Form Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-3">
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={handleReset}
            disabled={isSubmitting || isExportingDirect}
            className="w-full sm:w-auto min-h-[48px] px-5 py-2.5 rounded-xl text-xs md:text-sm font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span>تفريغ الحقول</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={handleSaveAndExportPdf}
            disabled={isSubmitting || isExportingDirect}
            className="w-full sm:w-auto min-h-[48px] px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold bg-teal-50 text-[#137a85] hover:bg-teal-100 border border-teal-300 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85] disabled:opacity-60"
          >
            {isExportingDirect ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#137a85]" />
            ) : (
              <FileDown className="w-4 h-4 text-[#137a85]" />
            )}
            <span>{isExportingDirect ? "جاري الحفظ والتصدير..." : "حفظ وتصدير PDF"}</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.96 }}
            type="submit"
            disabled={isSubmitting || isExportingDirect}
            className="w-full sm:w-auto min-h-[48px] px-7 py-2.5 rounded-xl text-xs md:text-sm font-bold bg-[#137a85] text-white hover:bg-teal-700 shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85] focus-visible:ring-offset-2 disabled:opacity-60"
          >
            <Save className="w-4 h-4 text-teal-100" />
            <span>{isSubmitting ? "جاري الحفظ..." : "حفظ الإجراء"}</span>
          </motion.button>
        </div>
      </form>

      {/* Send Inquiry Modal */}
      <SendInquiryModal
        isOpen={isInquiryModalOpen}
        onClose={() => setIsInquiryModalOpen(false)}
        preselectedTeacherId={selectedTeacherId || undefined}
      />
    </div>
  );
};

