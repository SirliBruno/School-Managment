"use client";

import React, { useState, useEffect, useId } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Calendar,
  User,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Upload,
  FileCheck,
  X,
  Loader2,
  ShieldCheck,
  Stethoscope,
  AlertOctagon,
  Users2,
  HelpCircle,
  FileDown,
  Check,
  RefreshCw,
} from "lucide-react";
import { AbsenceInquiry, AbsenceType } from "@/types/teacher";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { compressMedicalReportImage } from "@/lib/imageCompressor";
import { cn } from "@/lib/utils";
import {
  getAttachmentSlotsForType,
  parseAttachments,
  InquiryAttachmentItem,
  MAX_FALLBACK_DATA_URL_BYTES,
} from "@/lib/attachments";

const ABSENCE_TYPES: {
  type: AbsenceType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    type: "مرضي",
    label: "مرضي",
    description: "مرفق فارس + مرفق التقرير الطبي",
    icon: Stethoscope,
  },
  {
    type: "اضطراري",
    label: "اضطراري",
    description: "مرفق فارس",
    icon: AlertOctagon,
  },
  {
    type: "مرافق",
    label: "مرافق",
    description: "مرفق فارس + مرفق التقرير الطبي",
    icon: Users2,
  },
  {
    type: "أخرى",
    label: "أخرى (اكتب بين قوسين نوع الغياب)",
    description: "مرفق فارس + مرفقات أخرى",
    icon: HelpCircle,
  },
];

export default function TeacherInquiryPage() {
  const params = useParams();
  const token = params?.token as string;
  const formId = useId();

  // Loading & Data State
  const [isLoading, setIsLoading] = useState(true);
  const [inquiry, setInquiry] = useState<AbsenceInquiry | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form inputs
  const [absenceType, setAbsenceType] = useState<AbsenceType>("مرضي");
  const [customOtherType, setCustomOtherType] = useState("");
  const [reason, setReason] = useState("");
  const [slotFiles, setSlotFiles] = useState<
    Record<
      string,
      {
        file: File;
        preview: string | null;
        compressionRatio: number | null;
        isCompressing?: boolean;
      }
    >
  >({});
  const [confirmedPledge, setConfirmedPledge] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // 1. Fetch Inquiry details by token
  useEffect(() => {
    const fetchInquiry = async () => {
      if (!token) {
        setErrorMessage("رمز المساءلة غير صالح.");
        setIsLoading(false);
        return;
      }

      try {
        let foundInquiry: AbsenceInquiry | null = null;

        // Try Supabase first
        if (isSupabaseConfigured() && supabase) {
          try {
            const { data, error } = await supabase
              .from("absence_inquiries")
              .select("*")
              .eq("token", token)
              .maybeSingle();

            if (!error && data) {
              foundInquiry = {
                id: data.id,
                teacherId: data.teacher_id,
                teacherName: data.teacher_name,
                jobNumber: data.job_number,
                specialty: data.specialty || undefined,
                mobile: data.mobile || undefined,
                absenceDate: data.absence_date,
                token: data.token,
                status: data.status,
                expiresAt: data.expires_at,
                absenceType: data.absence_type || undefined,
                teacherReason: data.teacher_reason || undefined,
                attachmentUrl: data.attachment_url || undefined,
                adminNotes: data.admin_notes || undefined,
                submittedAt: data.submitted_at || undefined,
                createdAt: data.created_at,
              };
            }
          } catch (cloudErr) {
            console.warn("فشل جلب المساءلة من سوبابيز، جاري فحص التخزين المحلي:", cloudErr);
          }
        }

        // Fallback to localStorage
        if (!foundInquiry && typeof window !== "undefined") {
          const stored = localStorage.getItem("school_admin_inquiries_v1");
          if (stored) {
            const list: AbsenceInquiry[] = JSON.parse(stored);
            const match = list.find((item) => item.token === token);
            if (match) foundInquiry = match;
          }
        }

        if (!foundInquiry) {
          setErrorMessage("لم يتم العثور على سجل المساءلة المطلوب أو تم إلغاؤه من قبل الإدارة.");
        } else {
          setInquiry(foundInquiry);
          if (foundInquiry.status !== "pending") {
            setSubmittedSuccess(true);
          }
        }
      } catch (err) {
        console.error("خطأ أثناء استرجاع بيانات المساءلة:", err);
        setErrorMessage("حدث خطأ أثناء تحميل بيانات المساءلة. يرجى إعادة المحاولة.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInquiry();
  }, [token]);

  // Handle file selection for a specific slot with automatic client-side compression
  const handleSlotFileChange = async (
    slotId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    // 1. فحص ملفات الـ PDF (حد أقصى 3 ميغابايت)
    if (isPdf) {
      const MAX_PDF_SIZE = 3 * 1024 * 1024; // 3MB
      if (file.size > MAX_PDF_SIZE) {
        setFormErrors((prev) => ({
          ...prev,
          [`slot_${slotId}`]: `حجم ملف الـ PDF كبير (${(
            file.size /
            (1024 * 1024)
          ).toFixed(1)} ميغابايت). الحد الأقصى لملفات PDF هو 3 ميغابايت.`,
        }));
        return;
      }
    }

    // 2. فحص الصور (يُسمح حتى 20 ميغابايت)
    if (!isPdf && file.size > 20 * 1024 * 1024) {
      setFormErrors((prev) => ({
        ...prev,
        [`slot_${slotId}`]: "حجم الصورة كبير جداً. الحد الأقصى المسموح به هو 20 ميغابايت.",
      }));
      return;
    }

    setFormErrors((prev) => ({ ...prev, [`slot_${slotId}`]: "" }));

    if (file.type.startsWith("image/")) {
      setSlotFiles((prev) => ({
        ...prev,
        [slotId]: {
          file,
          preview: null,
          compressionRatio: null,
          isCompressing: true,
        },
      }));

      try {
        const compressed = await compressMedicalReportImage(file);
        setSlotFiles((prev) => ({
          ...prev,
          [slotId]: {
            file: compressed.file,
            preview: compressed.previewUrl,
            compressionRatio: compressed.compressionRatio,
            isCompressing: false,
          },
        }));
      } catch (err) {
        console.warn("تعذر ضغط الصورة، استخدام الملف الأصلي:", err);
        const reader = new FileReader();
        reader.onload = () => {
          setSlotFiles((prev) => ({
            ...prev,
            [slotId]: {
              file,
              preview: reader.result as string,
              compressionRatio: null,
              isCompressing: false,
            },
          }));
        };
        reader.readAsDataURL(file);
      }
    } else {
      // PDF or non-image
      setSlotFiles((prev) => ({
        ...prev,
        [slotId]: {
          file,
          preview: null,
          compressionRatio: null,
          isCompressing: false,
        },
      }));
    }
  };

  const removeSlotFile = (slotId: string) => {
    setSlotFiles((prev) => {
      const next = { ...prev };
      delete next[slotId];
      return next;
    });
    setFormErrors((prev) => ({ ...prev, [`slot_${slotId}`]: "" }));
  };

  // Validation
  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!reason.trim()) {
      errors.reason = "يرجى كتابة سبب ومبرر الغياب بالتفصيل.";
    } else if (reason.trim().length < 5) {
      errors.reason = "يرجى كتابة سبب واضح (5 أحرف على الأقل).";
    }

    if (absenceType === "أخرى" && !customOtherType.trim()) {
      errors.customOtherType = "يرجى كتابة وتحديد نوع الغياب بين قوسين.";
    }

    const currentSlots = getAttachmentSlotsForType(absenceType);
    for (const slot of currentSlots) {
      if (slot.required && !slotFiles[slot.id]?.file) {
        errors[`slot_${slot.id}`] = `يرجى إرفاق (${slot.label}) لإكمال المساءلة.`;
      }
    }

    if (!confirmedPledge) {
      errors.pledge = "يجب الإقرار بصحة البيانات والمرفقات المقدمة للمتابعة.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || submittedSuccess || !inquiry || inquiry.status !== "pending") return;
    if (!validate()) return;

    setIsSubmitting(true);
    setUploadProgress("جاري معالجة ورفع المرفقات والتحقق...");

    try {
      const currentSlots = getAttachmentSlotsForType(absenceType);
      const uploadedAttachments: InquiryAttachmentItem[] = [];

      for (let i = 0; i < currentSlots.length; i++) {
        const slot = currentSlots[i];
        const slotData = slotFiles[slot.id];
        if (!slotData?.file) continue;

        setUploadProgress(`جاري رفع (${slot.label}) [${i + 1}/${currentSlots.length}]...`);
        let finalUrl = "";

        // 1. Upload to Supabase Storage if configured
        if (isSupabaseConfigured() && supabase) {
          try {
            const fileExt = slotData.file.name.split(".").pop() || "jpg";
            const fileName = `${inquiry.id}_${slot.id}_${Date.now()}.${fileExt}`;
            const filePath = `inquiries/${fileName}`;

            const { data: uploadData, error: uploadErr } = await supabase.storage
              .from("absence-attachments")
              .upload(filePath, slotData.file, {
                cacheControl: "3600",
                upsert: true,
              });

            if (!uploadErr && uploadData) {
              const { data: publicUrlData } = supabase.storage
                .from("absence-attachments")
                .getPublicUrl(filePath);
              finalUrl = publicUrlData.publicUrl;
            }
          } catch (storageErr) {
            console.warn(`خطأ خدمة التخزين لـ ${slot.label}:`, storageErr);
          }
        }

        // 2. Fallback to Data URL if storage fails or not configured
        if (!finalUrl) {
          if (slotData.file.size <= MAX_FALLBACK_DATA_URL_BYTES) {
            finalUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => resolve("");
              reader.readAsDataURL(slotData.file);
            });
          } else {
            console.warn(
              `الملف (${slot.label}) بحجم ${(slotData.file.size / 1024).toFixed(0)}KB أكبر من الحد الآمن للحفظ المحلي (750KB). تم تخطي تخزينه محلياً.`
            );
          }
        }

        if (finalUrl) {
          uploadedAttachments.push({
            slotId: slot.id,
            label: slot.label,
            url: finalUrl,
          });
        }
      }

      setUploadProgress("جاري تسجيل الإفادة الإدارية...");

      const submittedAt = new Date().toISOString();
      const finalAbsenceType =
        absenceType === "أخرى"
          ? customOtherType.trim()
            ? `أخرى (${customOtherType.trim()})`
            : "أخرى"
          : absenceType;

      const attachmentPayload = JSON.stringify(uploadedAttachments);

      const updatedData: Partial<AbsenceInquiry> = {
        status: "submitted",
        absenceType: finalAbsenceType as AbsenceType,
        teacherReason: reason.trim(),
        attachmentUrl: attachmentPayload,
        submittedAt,
      };

      // 2. Update Supabase
      if (isSupabaseConfigured() && supabase) {
        try {
          await supabase
            .from("absence_inquiries")
            .update({
              status: "submitted",
              absence_type: finalAbsenceType,
              teacher_reason: reason.trim(),
              attachment_url: attachmentPayload,
              submitted_at: submittedAt,
            })
            .eq("id", inquiry.id);
        } catch (dbUpdateErr) {
          console.warn("خطأ تحديث سوبابيز:", dbUpdateErr);
        }
      }

      // 3. Update localStorage fallback
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("school_admin_inquiries_v1");
        if (stored) {
          try {
            const list: AbsenceInquiry[] = JSON.parse(stored);
            const updatedList = list.map((item) =>
              item.id === inquiry.id ? { ...item, ...updatedData } : item
            );
            localStorage.setItem(
              "school_admin_inquiries_v1",
              JSON.stringify(updatedList)
            );
          } catch (localErr) {
            console.error("فشل التحديث المحلي:", localErr);
          }
        }
      }

      // Update state
      setInquiry({
        ...inquiry,
        ...updatedData,
      });

      setSubmittedSuccess(true);
    } catch (err) {
      console.error("خطأ أثناء إرسال المساءلة:", err);
      setFormErrors((prev) => ({
        ...prev,
        general: "حدث خطأ غير متوقع أثناء إرسال الرد. يرجى التحقق من اتصال الإنترنت وإعادة المحاولة.",
      }));
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  // Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center gap-4 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-[#137a85] flex items-center justify-center animate-pulse">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">
              جاري تحميل نموذج المساءلة...
            </h2>
            <p className="text-xs text-slate-400 mt-1">نظام الإدارة المدرسية الموحد</p>
          </div>
        </div>
      </div>
    );
  }

  // Error Screen
  if (errorMessage || !inquiry) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-rose-200 max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">تعذر فتح المساءلة</h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            {errorMessage || "رابط المساءلة غير صحيح أو تم حذفه من قبل الإدارة."}
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => window.location.reload()}
              type="button"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white font-medium text-xs sm:text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              إعادة المحاولة
            </button>
          </div>
          <div className="pt-2 text-xs text-slate-400 border-t border-slate-100">
            إذا كنتِ تعتقدين أن هذا خطأ، يرجى التواصل مع إدارة المدرسة لتجديد الرابط.
          </div>
        </div>
      </div>
    );
  }

  // Check 48-hour expiration
  const isExpired =
    inquiry.status === "pending" &&
    new Date(inquiry.expiresAt).getTime() < Date.now();

  if (isExpired) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-amber-200 max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-bold text-slate-900">انتهت صلاحية الرابط</h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            عذراً أستاذة ({inquiry.teacherName})، لقد انقضت المهلة المحددة للرد على هذه المساءلة (48 ساعة من تاريخ الإرسال).
          </p>
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-800 text-right space-y-1">
            <p className="font-bold">بيانات المساءلة:</p>
            <p>تاريخ الغياب: {inquiry.absenceDate}</p>
            <p>تاريخ الانتهاء: {new Date(inquiry.expiresAt).toLocaleDateString("ar-SA")}</p>
          </div>
          <p className="text-xs text-slate-400">
            يرجى مراجعة إدارة المدرسة شخصياً لتقديم إفادتك الورقية.
          </p>
        </div>
      </div>
    );
  }

  // Already Submitted / Success Screen
  if (submittedSuccess || inquiry.status !== "pending") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50/40 via-slate-50 to-slate-100 flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white p-7 sm:p-9 rounded-3xl shadow-sm border border-emerald-200 max-w-lg w-full text-center space-y-6"
        >
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-100/80 text-emerald-800 mb-2">
              تم استلام الإفادة بنجاح
            </span>
            <h1 className="text-xl font-bold text-slate-900">
              شكراً لكِ، أستاذة {inquiry.teacherName}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              تم توثيق إفادتك الإدارية ومرفقك في النظام وأُحيلت لوكيلة الشؤون التعليمية للمراجعة.
            </p>
          </div>

          {/* Details Card */}
          <div className="bg-slate-50 rounded-2xl p-4 text-right text-xs space-y-2.5 border border-slate-100">
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500">تاريخ الغياب المعني:</span>
              <span className="font-bold text-slate-800">{inquiry.absenceDate}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500">نوع الغياب المختار:</span>
              <span className="font-bold text-[#137a85]">{inquiry.absenceType || absenceType}</span>
            </div>
            <div className="py-1 border-b border-slate-200/60">
              <span className="text-slate-500 block mb-1">سبب ومبرر الغياب:</span>
              <p className="font-medium text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200">
                {inquiry.teacherReason || reason}
              </p>
            </div>
            {inquiry.attachmentUrl && (() => {
              const atts = parseAttachments(inquiry.attachmentUrl);
              if (atts.length === 0) return null;
              return (
                <div className="py-2 border-b border-slate-200/60 text-right">
                  <span className="text-slate-500 block mb-1.5 font-bold">المرفقات المسلمة ({atts.length}):</span>
                  <div className="space-y-1.5">
                    {atts.map((att, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 text-xs"
                      >
                        <span className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
                          <FileCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{att.label}</span>
                        </span>
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-[#137a85] hover:underline shrink-0"
                        >
                          عرض المرفق
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">حالة المساءلة:</span>
              <span className="font-bold px-2.5 py-0.5 rounded-lg bg-teal-50 text-[#137a85] border border-teal-200 text-[11px]">
                {inquiry.status === "approved"
                  ? "معتمدة من الإدارة"
                  : inquiry.status === "rejected"
                  ? "مرفوضة من الإدارة"
                  : "قيد تدقيق واعتماد الإدارة"}
              </span>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>معاملة رسمية موثقة إلكترونياً برمز تحقق فريد</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // Active Inquiry Form
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Top Header Card */}
        <header className="bg-white rounded-3xl p-6 shadow-2xs border border-slate-200 text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#137a85] to-teal-500" />
          
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#137a85] mb-2">
            <Building2 className="w-4 h-4" />
            <span>المملكة العربية السعودية — وزارة التعليم</span>
          </div>

          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
            نموذج إفادة ومساءلة غياب
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            إفادة المعلمة عن سبب الغياب وإرفاق المسوغات الطبية أو النظامية
          </p>
        </header>

        {/* Teacher & Absence Details Card */}
        <section className="bg-white rounded-3xl p-5 sm:p-6 shadow-2xs border border-slate-200 space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-4 h-4 text-[#137a85]" />
            <span>بيانات المكرمة المعلمة</span>
          </h2>

          <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block text-[11px]">اسم المعلمة</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                {inquiry.teacherName}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block text-[11px]">الرقم الوظيفي / السجل</span>
              <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                {inquiry.jobNumber}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block text-[11px]">التخصص</span>
              <span className="font-semibold text-slate-700 mt-0.5 block">
                {inquiry.specialty || "الكادر التعليمي"}
              </span>
            </div>

            <div className="bg-teal-50/70 p-3 rounded-2xl border border-teal-200">
              <span className="text-[#137a85] block text-[11px] font-semibold flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>تاريخ الغياب المطلوب</span>
              </span>
              <span className="font-extrabold text-[#137a85] text-sm mt-0.5 block">
                {inquiry.absenceDate}
              </span>
            </div>
          </div>
        </section>

        {/* Main Response Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200 space-y-6">
          
          {/* General Error Alert */}
          {formErrors.general && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formErrors.general}</span>
            </div>
          )}

          {/* 1. Absence Type Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              نوع الغياب <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              {ABSENCE_TYPES.map((item) => {
                const Icon = item.icon;
                const isSelected = absenceType === item.type;

                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setAbsenceType(item.type)}
                    className={cn(
                      "p-3 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2 cursor-pointer focus:outline-none",
                      isSelected
                        ? "bg-teal-50/80 border-[#137a85] ring-2 ring-[#137a85]/20 shadow-2xs"
                        : "bg-slate-50/60 border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div
                        className={cn(
                          "w-7 h-7 rounded-xl flex items-center justify-center text-xs",
                          isSelected
                            ? "bg-[#137a85] text-white"
                            : "bg-white text-slate-600 border border-slate-200"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>

                      <div
                        className={cn(
                          "w-4 h-4 rounded-full border flex items-center justify-center",
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
                          "block text-xs font-bold",
                          isSelected ? "text-[#137a85]" : "text-slate-800"
                        )}
                      >
                        {item.label}
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5 leading-tight">
                        {item.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Other Type Field */}
            {absenceType === "أخرى" && (
              <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-1.5 animate-in fade-in">
                <label
                  htmlFor={`${formId}-custom-other`}
                  className="block text-xs font-bold text-slate-800"
                >
                  اكتبي نوع الغياب بين قوسين بالتحديد <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-xl border border-teal-200">
                  <span className="font-bold text-[#137a85] text-sm">(</span>
                  <input
                    id={`${formId}-custom-other`}
                    type="text"
                    value={customOtherType}
                    onChange={(e) => {
                      setCustomOtherType(e.target.value);
                      setFormErrors((prev) => ({ ...prev, customOtherType: "" }));
                    }}
                    placeholder="مثال: مهمة رسمية، إجازة وضع، دورة تدريبية..."
                    className="w-full text-xs sm:text-sm bg-transparent border-0 focus:outline-none placeholder:text-slate-400 text-slate-800 font-semibold"
                  />
                  <span className="font-bold text-[#137a85] text-sm">)</span>
                </div>
                {formErrors.customOtherType && (
                  <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{formErrors.customOtherType}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 2. Reason for Absence */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor={`${formId}-reason`}
                className="block text-xs font-bold text-slate-800"
              >
                سبب ومبرر الغياب بالتفصيل <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">{reason.length}/300</span>
            </div>

            <textarea
              id={`${formId}-reason`}
              rows={4}
              maxLength={300}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setFormErrors((prev) => ({ ...prev, reason: "" }));
              }}
              placeholder="اكتبي تفاصيل ومبررات ظرف الغياب للإدارة المدرسية..."
              className={cn(
                "w-full p-3.5 rounded-2xl border text-xs sm:text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all shadow-2xs resize-none",
                formErrors.reason
                  ? "border-rose-400 focus:ring-rose-200"
                  : "border-slate-200 focus:border-[#137a85] focus:ring-[#137a85]/20"
              )}
            />

            {formErrors.reason && (
              <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{formErrors.reason}</span>
              </p>
            )}
          </div>

          {/* 3. Dynamic Mandatory Attachments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                المرفقات المطلوبة حسب نوع الغياب <span className="text-rose-500">* (إلزامية)</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {getAttachmentSlotsForType(absenceType).length} مرفق مطلوب
              </span>
            </div>

            <div className="space-y-3">
              {getAttachmentSlotsForType(absenceType).map((slot) => {
                const slotData = slotFiles[slot.id];
                const slotFile = slotData?.file;
                const slotPreview = slotData?.preview;
                const slotCompressing = slotData?.isCompressing;
                const slotRatio = slotData?.compressionRatio;
                const slotError = formErrors[`slot_${slot.id}`];

                return (
                  <div
                    key={slot.id}
                    className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-white space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-teal-50 text-[#137a85] flex items-center justify-center font-bold text-xs shrink-0">
                          {slot.id === "faris" ? (
                            <Building2 className="w-4 h-4" />
                          ) : slot.id === "medical" ? (
                            <Stethoscope className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <span>{slot.label}</span>
                            <span className="text-rose-500">*</span>
                          </h3>
                          <p className="text-[10px] text-slate-400">{slot.hint}</p>
                        </div>
                      </div>
                      {slotFile && (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                          تم الإرفاق
                        </span>
                      )}
                    </div>

                    {slotCompressing ? (
                      <div className="border-2 border-dashed border-teal-300 bg-teal-50/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-center animate-pulse">
                        <Loader2 className="w-6 h-6 animate-spin text-[#137a85]" />
                        <p className="text-xs font-bold text-slate-800">
                          جاري ضغط وتحسين جودة الصورة...
                        </p>
                        <p className="text-[10px] text-slate-500">
                          تقليل استهلاك المساحة السحابية بنسبة تتجاوز 80% مع حفظ وضوح الخط والأختام
                        </p>
                      </div>
                    ) : !slotFile ? (
                      <label
                        htmlFor={`${formId}-file-${slot.id}`}
                        className={cn(
                          "border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-all hover:bg-slate-50/80",
                          slotError
                            ? "border-rose-300 bg-rose-50/40"
                            : "border-slate-300 bg-slate-50/40 hover:border-[#137a85]"
                        )}
                      >
                        <input
                          id={`${formId}-file-${slot.id}`}
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => handleSlotFileChange(slot.id, e)}
                          className="hidden"
                        />
                        <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#137a85] flex items-center justify-center">
                          <Upload className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            اضغطي هنا لاختيار ({slot.label})
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            PDF (حتى 3MB) أو صورة للمستند (يتم ضغطها فورياً)
                          </p>
                        </div>
                      </label>
                    ) : (
                      <div className="p-3 rounded-2xl bg-teal-50/60 border border-teal-200 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          {slotPreview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={slotPreview}
                              alt="معاينة المرفق"
                              className="w-11 h-11 rounded-xl object-cover border border-teal-200 shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-teal-100 text-[#137a85] flex items-center justify-center shrink-0">
                              <FileCheck className="w-5 h-5" />
                            </div>
                          )}
                          <div className="truncate text-right">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {slotFile.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[10px] text-slate-500 font-medium">
                                {slotFile.size > 1024 * 1024
                                  ? `${(slotFile.size / (1024 * 1024)).toFixed(2)} ميغابايت`
                                  : `${Math.round(slotFile.size / 1024)} كيلوبايت`}
                              </p>
                              {slotRatio !== null && slotRatio > 0 && (
                                <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200/60">
                                  تم الضغط {slotRatio}%
                                </span>
                              )}
                              {(slotFile.type === "application/pdf" ||
                                slotFile.name.toLowerCase().endsWith(".pdf")) && (
                                <span className="text-[9px] font-bold text-rose-800 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200/60">
                                  مستند PDF
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeSlotFile(slot.id)}
                          className="w-7 h-7 rounded-xl bg-white text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 flex items-center justify-center transition-colors shrink-0"
                          title="حذف المرفق"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {slotError && (
                      <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{slotError}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Acknowledgment Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmedPledge}
                onChange={(e) => {
                  setConfirmedPledge(e.target.checked);
                  setFormErrors((prev) => ({ ...prev, pledge: "" }));
                }}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#137a85] focus:ring-[#137a85] cursor-pointer"
              />
              <span className="text-xs text-slate-700 leading-relaxed">
                أقر بصحة البيانات المسجلة أعلاه ومطابقة المرفق المرفوع للواقع، وأتحمل المسؤولية الإدارية عن صحتها.
              </span>
            </label>
            {formErrors.pledge && (
              <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 mt-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{formErrors.pledge}</span>
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#137a85] hover:bg-teal-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{uploadProgress || "جاري الإرسال..."}</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>إرسال الإفادة الإدارية</span>
                </>
              )}
            </button>
          </div>

        </form>

        <footer className="text-center text-xs text-slate-400 pb-6">
          نظام الإدارة المدرسية الموحد — منصة الغياب الإدارية
        </footer>
      </div>
    </div>
  );
}
