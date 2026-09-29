"use client";

import React, { useState, useEffect, useId } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  FileQuestion,
  Calendar,
  User,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  FileText,
  Clock,
  Paperclip,
  Check,
  AlertTriangle,
  UploadCloud,
  X,
  FileDown,
} from "lucide-react";
import { AdministrativeInquiry } from "@/types/teacher";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useTeachers, mapDbAdminInquiryToInquiry } from "@/context/TeacherContext";
import { isTokenExpired } from "@/lib/timeUtils";
import { compressMedicalReportImage } from "@/lib/imageCompressor";
import { printAdministrativeInquiryPdf } from "@/lib/printAdministrativeInquiryPdfService";
import { cn } from "@/lib/utils";

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5MB

export default function AdministrativeInquiryPublicResponsePage() {
  const params = useParams();
  const token = params?.token as string;
  const formId = useId();

  const { administrativeInquiries, submitTeacherAdministrativeResponse } = useTeachers();

  const [isLoading, setIsLoading] = useState(true);
  const [inquiry, setInquiry] = useState<AdministrativeInquiry | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  // Form Inputs
  const [teacherResponse, setTeacherResponse] = useState("");
  const [hasPledge, setHasPledge] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Submit State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // 1. Fetch Inquiry details by token
  useEffect(() => {
    const fetchInquiry = async () => {
      if (!token) {
        setErrorMessage("رمز المساءلة الإدارية غير صالح أو مفقود.");
        setIsLoading(false);
        return;
      }

      try {
        let foundInquiry: AdministrativeInquiry | null = null;

        // Try Supabase first
        if (isSupabaseConfigured() && supabase) {
          try {
            const { data, error } = await supabase
              .from("administrative_inquiries")
              .select("*")
              .eq("token", token)
              .maybeSingle();

            if (!error && data) {
              foundInquiry = mapDbAdminInquiryToInquiry(data);
            }
          } catch (cloudErr) {
            console.warn("فشل استعلام المساءلة من سوبابيز، البحث في البيانات المحلية:", cloudErr);
          }
        }

        // Fallback: Context or LocalStorage
        if (!foundInquiry) {
          const fromContext = administrativeInquiries.find((i) => i.token === token);
          if (fromContext) {
            foundInquiry = fromContext;
          } else if (typeof window !== "undefined") {
            const stored = localStorage.getItem("school_admin_administrative_inquiries_v1");
            if (stored) {
              const list: AdministrativeInquiry[] = JSON.parse(stored);
              const match = list.find((item) => item.token === token);
              if (match) foundInquiry = match;
            }
          }
        }

        if (!foundInquiry) {
          setErrorMessage("رابط المساءلة الإدارية غير صحيح أو قد تم حذفه من قبل الإدارة.");
          setIsLoading(false);
          return;
        }

        setInquiry(foundInquiry);

        // Check 48h token expiration
        if (
          foundInquiry.status === "pending_teacher" &&
          foundInquiry.tokenExpiresAt &&
          isTokenExpired(foundInquiry.tokenExpiresAt)
        ) {
          setIsExpired(true);
        }

        // Prepopulate if already answered
        if (foundInquiry.teacherResponse) {
          setTeacherResponse(foundInquiry.teacherResponse);
        }
      } catch (err) {
        console.error("خطأ أثناء تحميل المساءلة:", err);
        setErrorMessage("حدث خطأ أثناء تحميل البيانات. يرجى إعادة المحاولة.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInquiry();
  }, [token, administrativeInquiries]);

  // Handle File Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_BYTES) {
      setFormError("حجم الملف يجب ألا يتجاوز 5 ميجابايت.");
      return;
    }

    setFormError(null);

    if (file.type.startsWith("image/")) {
      setIsCompressing(true);
      try {
        const compressed = await compressMedicalReportImage(file);
        const finalFile = compressed.file || file;
        setAttachmentFile(finalFile);
        const reader = new FileReader();
        reader.onload = () => {
          setAttachmentPreview(reader.result as string);
        };
        reader.readAsDataURL(finalFile);
      } catch (compErr) {
        console.warn("تعذر ضغط الصورة، سيتم استخدام الملف الأصلي:", compErr);
        setAttachmentFile(file);
        const reader = new FileReader();
        reader.onload = () => {
          setAttachmentPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } finally {
        setIsCompressing(false);
      }
    } else {
      // PDF or other document
      setAttachmentFile(file);
      setAttachmentPreview(null);
    }
  };

  const removeAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
  };

  // Submit Response
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiry || isSubmitting || submitSuccess) return;

    if (!teacherResponse.trim() || teacherResponse.trim().length < 5) {
      setFormError("يرجى كتابة إفادتكم الخطية وتوضيح الأسباب بشكل كافٍ (5 أحرف على الأقل).");
      return;
    }

    if (!hasPledge) {
      setFormError("يرجى التأشير على إقرار صحة البيانات لتحمل المسؤولية النظامية.");
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      let attachmentUrl = inquiry.attachmentUrl || undefined;

      // Upload file to Supabase Storage if present
      if (attachmentFile) {
        if (isSupabaseConfigured() && supabase) {
          try {
            const ext = attachmentFile.name.split(".").pop() || "jpg";
            const path = `administrative-inquiries/${inquiry.id}_${Date.now()}.${ext}`;
            const { error: upErr } = await supabase.storage
              .from("absence-attachments")
              .upload(path, attachmentFile, { upsert: true });

            if (!upErr) {
              const { data: publicData } = supabase.storage
                .from("absence-attachments")
                .getPublicUrl(path);
              attachmentUrl = publicData.publicUrl;
            }
          } catch (uploadErr) {
            console.warn("فشل رفع المرفق لسوبابيز، استخدام DataURL:", uploadErr);
          }
        }

        // Fallback to Data URL if storage not available or failed
        if (!attachmentUrl && attachmentFile.size <= 800 * 1024) {
          attachmentUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve("");
            reader.readAsDataURL(attachmentFile);
          });
        }
      }

      // Fetch client IP if possible
      let clientIp = "";
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json", { signal: AbortSignal.timeout(2000) });
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          clientIp = ipData.ip || "";
        }
      } catch {}

      const res = await submitTeacherAdministrativeResponse(
        token,
        teacherResponse.trim(),
        attachmentUrl,
        clientIp || undefined
      );

      if (res.success && res.inquiry) {
        setInquiry(res.inquiry);
        setSubmitSuccess(true);
      } else {
        setFormError(res.error || "فشل إرسال الإفادة. يرجى المحاولة مرة أخرى.");
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء الإرسال");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4" dir="rtl">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            جاري التحقق من رابط المساءلة الإدارية...
          </p>
        </div>
      </div>
    );
  }

  // Error State
  if (errorMessage || !inquiry) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-900/50">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">تعذر فتح المساءلة</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {errorMessage || "الرابط المطلوب غير متوفر حالياً."}
          </p>
          <div className="pt-2">
            <span className="text-xs text-slate-400">
              الثانوية الخامسة مسارات — منصة الغياب والمساءلات الإدارية
            </span>
          </div>
        </motion.div>
      </div>
    );
  }

  // Expired State
  if (isExpired && inquiry.status === "pending_teacher" && !submitSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-900/50">
            <Clock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">انتهت مهلة الرد النظامية</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            مرحباً أستاذة <strong>{inquiry.teacherName}</strong>، لقد تجاوز هذا الرابط المهلة المحددة نظاماً لتقديم الإفادة الخطية (48 ساعة من تاريخ الإصدار).
          </p>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <div>رقم المساءلة: <strong className="font-mono text-slate-700 dark:text-slate-300">{inquiry.inquiryNumber || "—"}</strong></div>
            <div>تاريخ الواقعة: <strong className="font-mono text-slate-700 dark:text-slate-300">{inquiry.incidentDate}</strong></div>
          </div>
          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
            يرجى مراجعة إدارة المدرسة مباشرة لاستكمال الإجراءات الإدارية.
          </p>
        </motion.div>
      </div>
    );
  }

  // Already Responded / Success State
  if (submitSuccess || inquiry.status !== "pending_teacher") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4" dir="rtl">
        <div className="max-w-xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-2">
              <Building2 className="w-3.5 h-3.5" />
              <span>الثانوية الخامسة مسارات — الإدارة المدرسية</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">
              مساءلة خطية إلكترونية
            </h1>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
          >
            <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto border border-white/30">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold">تم استلام إفادتكِ الخطية بنجاح</h2>
              <p className="text-xs text-emerald-100">
                تم حفظ وتوثيق ردكِ في السجل الإداري برقم مرجعي: {inquiry.inquiryNumber || "—"}
              </p>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5">اسم المعلمة:</span>
                  <strong className="text-slate-900 dark:text-slate-100 text-sm">{inquiry.teacherName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5">تاريخ الواقعة:</span>
                  <strong className="font-mono text-slate-900 dark:text-slate-100">{inquiry.incidentDate}</strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5">نوع المساءلة:</span>
                  <strong className="text-slate-900 dark:text-slate-100">
                    {inquiry.inquiryType === "أخرى" ? inquiry.customType || "أخرى" : inquiry.inquiryType}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5">تاريخ تقديم الإفادة:</span>
                  <strong className="font-mono text-slate-900 dark:text-slate-100">
                    {inquiry.responseDate || "اليوم"}
                  </strong>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300">نص الإفادة المقدمة:</span>
                <p className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                  {inquiry.teacherResponse || teacherResponse}
                </p>
              </div>

              {inquiry.attachmentUrl && (
                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
                    <Paperclip className="w-4 h-4 text-indigo-600" />
                    <span>تم إرفاق مستند داعم</span>
                  </div>
                  <a
                    href={inquiry.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 rounded-xl bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold"
                  >
                    معاينة المرفق
                  </a>
                </div>
              )}

              {/* Status Indicator */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                {inquiry.status === "completed" ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>قرار الإدارة: {inquiry.directorDecision === "accepted" ? "عذر مقبول (اكتفاء بالإفادة)" : "عذر غير مقبول"}</span>
                    </div>
                    {inquiry.directorNotes && (
                      <p className="text-emerald-800 dark:text-emerald-300 text-xs mt-1">
                        توجيهات المديرة: {inquiry.directorNotes}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>إفادتك قيد المراجعة والاعتماد من قبل إدارة المدرسة.</span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => printAdministrativeInquiryPdf(inquiry)}
                  className="px-5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  <span>تحميل / طباعة المساءلة الخطية (PDF)</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Active Pending Form State
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4" dir="rtl">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Official Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5" />
            <span>المملكة العربية السعودية — وزارة التعليم — الثانوية الخامسة مسارات</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            مساءلة خطية إلكترونية
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            طلب إفادة خطية رسمية استناداً إلى اللوائح والأنظمة المنظمة لبيئة العمل التعليمي
          </p>
        </div>

        {/* Card Form */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
        >
          {/* Card Top Banner */}
          <div className="p-5 bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner">
                <FileQuestion className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold">نموذج الإفادة عن واقعة إدارية</h2>
                <div className="text-xs text-white/80 font-mono mt-0.5">
                  رقم المساءلة: {inquiry.inquiryNumber || "—"}
                </div>
              </div>
            </div>
            <div className="text-left text-[11px] text-white/80">
              <div className="font-semibold">مهلة الرد:</div>
              <div className="font-mono">48 ساعة</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {formError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{formError}</span>
              </div>
            )}

            {/* Teacher Details Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5">اسم المعلمة المكرمة:</span>
                <strong className="text-slate-900 dark:text-slate-100 text-sm">{inquiry.teacherName}</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5">السجل المدني / الوظيفي:</span>
                <strong className="font-mono text-slate-800 dark:text-slate-200">{inquiry.nationalId || inquiry.jobNumber || "—"}</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5">الوظيفة والتخصص:</span>
                <strong className="text-slate-800 dark:text-slate-200">{inquiry.jobTitle || "معلم"} ({inquiry.specialty || "عام"})</strong>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5">تاريخ الواقعة:</span>
                <strong className="font-mono text-slate-800 dark:text-slate-200">{inquiry.incidentDate}</strong>
              </div>
            </div>

            {/* Violation Notice Section */}
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/50 space-y-2">
              <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>موضوع المساءلة: {inquiry.inquiryType === "أخرى" ? inquiry.customType || "أخرى" : inquiry.inquiryType}</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-indigo-100 dark:border-slate-800 whitespace-pre-wrap">
                {inquiry.description}
              </p>
              {inquiry.vicePrincipalNotes && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 pt-0.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">ملاحظة الإدارة:</span>
                  <span>{inquiry.vicePrincipalNotes}</span>
                </div>
              )}
            </div>

            {/* Teacher Statement Input */}
            <div className="space-y-1.5">
              <label htmlFor={`${formId}-reason`} className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                بيان المعلمة / إفادتكم الخطية بالواقعة <span className="text-rose-500">*</span>
              </label>
              <textarea
                id={`${formId}-reason`}
                rows={4}
                required
                placeholder="اكتبي مبررات وأسباب الواقعة المذكورة أعلاه بدقة ووضوح..."
                value={teacherResponse}
                onChange={(e) => setTeacherResponse(e.target.value)}
                className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all leading-relaxed"
              />
            </div>

            {/* Optional Attachment Upload */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                إرفاق مستند أو تقرير داعم (اختياري)
              </label>

              {!attachmentFile ? (
                <label className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-50/50 dark:bg-slate-900/50 transition-colors">
                  <UploadCloud className="w-6 h-6 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    اضغطي لاختيار ملف أو صورة
                  </span>
                  <span className="text-[11px] text-slate-400">
                    (يدعم صور التقارير الطبية، مستندات PDF بحد أقصى 5MB)
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
                    <Paperclip className="w-4 h-4 text-indigo-600" />
                    <span className="font-semibold truncate max-w-[200px]">{attachmentFile.name}</span>
                    <span className="text-[11px] text-slate-400">
                      ({(attachmentFile.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={removeAttachment}
                    className="w-7 h-7 rounded-xl bg-white dark:bg-slate-800 text-rose-500 hover:bg-rose-50 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {isCompressing && (
                <div className="text-[11px] text-indigo-600 flex items-center gap-1.5 pt-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري ضغط وتحسين الصورة تلقائيًا...</span>
                </div>
              )}
            </div>

            {/* Legal Pledge Checkbox */}
            <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasPledge}
                  onChange={(e) => setHasPledge(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  أقر أنا المعلمة <strong>{inquiry.teacherName}</strong> بأن جميع البيانات والمعلومات المدونة أعلاه في هذه الإفادة صحيحة ومطابقة للواقع، وأتحمل كامل المسؤولية النظامية حيالها.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !hasPledge || !teacherResponse.trim()}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all focus:outline-none disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري إرسال الإفادة وتوثيقها...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>إرسال الإفادة رسميًا إلى إدارة المدرسة</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
