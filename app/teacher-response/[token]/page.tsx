"use client";

import React, { useState, useEffect, useId } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Calendar,
  User,
  Building2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  FileText,
  LogIn,
  LogOut,
  DoorOpen,
  Check,
  FileDown,
  ChevronRight,
  Shield,
  HelpCircle,
} from "lucide-react";
import { DelayNotice, Teacher } from "@/types/teacher";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useTeachers } from "@/context/TeacherContext";
import { printDelayNoticePdf } from "@/lib/printDelayNoticePdfService";
import { cn } from "@/lib/utils";

export default function PublicTeacherResponsePage() {
  const params = useParams();
  const token = params?.token as string;
  const formId = useId();

  const { delayNotices, submitTeacherResponseByToken } = useTeachers();

  // Loading & Notice State
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<DelayNotice | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  // Form Inputs (Stage 2)
  const [teacherReason, setTeacherReason] = useState("");
  const [signatureDate, setSignatureDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [hasConsent, setHasConsent] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // 1. Fetch and validate DelayNotice by token
  useEffect(() => {
    const fetchNotice = async () => {
      if (!token) {
        setErrorMessage("رمز التنبيه غير صالح أو مفقود.");
        setIsLoading(false);
        return;
      }

      try {
        let foundNotice: DelayNotice | null = null;

        // Try Supabase first
        if (isSupabaseConfigured() && supabase) {
          try {
            const { data, error } = await supabase
              .from("delay_notices")
              .select("*")
              .eq("share_token", token)
              .maybeSingle();

            if (!error && data) {
              foundNotice = {
                id: data.id,
                noticeNumber: data.notice_number || undefined,
                teacherId: data.teacher_id,
                teacherName: data.teacher_name,
                jobNumber: data.job_number,
                specialty: data.specialty || undefined,
                noticeDate: data.notice_date,
                date: data.notice_date,
                violationDelayStart: data.violation_delay_start,
                delayStartTime: data.delay_start_time || undefined,
                violationAbsentDuring: data.violation_absent_during,
                absentFromTime: data.absent_from_time || undefined,
                absentToTime: data.absent_to_time || undefined,
                violationEarlyDeparture: data.violation_early_departure,
                earlyDepartureTime: data.early_departure_time || undefined,
                violationLeftSchool: data.violation_left_school,
                leftSchoolDetails: data.left_school_details || undefined,
                additionalNotes: data.additional_notes || undefined,
                notes: data.additional_notes || undefined,
                status: data.status,
                teacherReason: data.teacher_reason || undefined,
                teacherSignatureDate: data.teacher_signature_date || undefined,
                teacherSignedAt: data.teacher_signature_date || undefined,
                directorOpinion: data.director_opinion || null,
                directorNotes: data.director_notes || undefined,
                directorSignatureDate: data.director_signature_date || undefined,
                hijriYear: data.hijri_year || "١٤٤٨",
                createdAt: data.created_at,
                shareToken: data.share_token || token,
                tokenExpiresAt:
                  data.token_expires_at ||
                  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                teacherResponseSubmittedAt:
                  data.teacher_response_submitted_at || undefined,
                teacherIpAddress: data.teacher_ip_address || undefined,
                linkSharedAt: data.link_shared_at || undefined,
              };
            }
          } catch (cloudErr) {
            console.warn(
              "تعذر جلب التنبيه من سوبابيز، جاري فحص البيانات المحلية:",
              cloudErr
            );
          }
        }

        // Fallback: LocalStorage / Context
        if (!foundNotice) {
          const fromContext = delayNotices.find((n) => n.shareToken === token);
          if (fromContext) {
            foundNotice = fromContext;
          } else if (typeof window !== "undefined") {
            const stored = localStorage.getItem("school_admin_delay_notices_v1");
            if (stored) {
              const list: DelayNotice[] = JSON.parse(stored);
              const match = list.find((item) => item.shareToken === token);
              if (match) foundNotice = match;
            }
          }
        }

        if (!foundNotice) {
          setErrorMessage(
            "الرابط غير صحيح أو تم إلغاؤه من قبل إدارة المدرسة."
          );
          setIsLoading(false);
          return;
        }

        setNotice(foundNotice);

        // Check expiration (7 days validity)
        if (foundNotice.tokenExpiresAt) {
          const expiryDate = new Date(foundNotice.tokenExpiresAt);
          if (expiryDate < new Date()) {
            setIsExpired(true);
            setIsLoading(false);
            return;
          }
        }

        // Check if already submitted
        if (
          foundNotice.teacherResponseSubmittedAt ||
          foundNotice.status !== "pending_teacher"
        ) {
          setAlreadySubmitted(true);
          setTeacherReason(foundNotice.teacherReason || "");
          if (foundNotice.teacherSignatureDate) {
            setSignatureDate(foundNotice.teacherSignatureDate);
          }
        }
      } catch (err) {
        console.error("خطأ أثناء تحميل بيانات التنبيه:", err);
        setErrorMessage("حدث خطأ أثناء تحميل الصفحة. يرجى المحاولة مرة أخرى.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotice();
  }, [token, delayNotices]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notice) return;

    if (!teacherReason.trim()) {
      setFormError("يرجى كتابة أسباب ومبررات التأخر أو الانصراف.");
      return;
    }

    if (!hasConsent) {
      setFormError("يرجى التأشير على إقرار صحة البيانات لتحمل المسؤولية الإدارية.");
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      // Call Context & Supabase updater
      const res = await submitTeacherResponseByToken(
        token,
        teacherReason.trim(),
        signatureDate
      );

      if (res.success) {
        setSubmitSuccess(true);
        setNotice((prev) =>
          prev
            ? {
                ...prev,
                teacherReason: teacherReason.trim(),
                teacherSignatureDate: signatureDate,
                teacherResponseSubmittedAt: new Date().toISOString(),
                status: "pending_director",
              }
            : null
        );
      } else {
        setFormError(res.error || "فشل إرسال الرد، يرجى المحاولة لاحقاً.");
      }
    } catch (err) {
      console.error("خطأ أثناء إرسال إفادة المعلمة:", err);
      setFormError("حدث خطأ في الاتصال، يرجى التحقق من اتصال الإنترنت وإعادة المحاولة.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    if (!notice) return;
    try {
      printDelayNoticePdf({
        ...notice,
        teacherReason: teacherReason || notice.teacherReason,
        teacherSignatureDate: signatureDate || notice.teacherSignatureDate,
      });
    } catch (err) {
      console.error("فشل طباعة الاستمارة:", err);
    }
  };

  // Helper summary of violations
  const violationsList: { title: string; time?: string; icon: React.ComponentType<{ className?: string }> }[] = [];
  if (notice?.violationDelayStart) {
    violationsList.push({
      title: "التأخر الصباحي عن بداية الدوام الرسمي",
      time: `وقت الحضور الفعلي: ${notice.delayStartTime || "—"}`,
      icon: LogIn,
    });
  }
  if (notice?.violationAbsentDuring) {
    violationsList.push({
      title: "عدم التواجد أثناء الدوام الرسمي",
      time: `من الساعة ${notice.absentFromTime || "—"} إلى الساعة ${notice.absentToTime || "—"}`,
      icon: Clock,
    });
  }
  if (notice?.violationEarlyDeparture) {
    violationsList.push({
      title: "الانصراف المبكر قبل نهاية الدوام الرسمي",
      time: `وقت الانصراف الفعلي: ${notice.earlyDepartureTime || "—"}`,
      icon: LogOut,
    });
  }
  if (notice?.violationLeftSchool) {
    violationsList.push({
      title: "الخروج من المدرسة والعودة إليها أثناء الدوام",
      time: notice.leftSchoolDetails || "تفاصيل مسجلة بإشعار الإدارة",
      icon: DoorOpen,
    });
  }

  // 1. Loading State Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 bg-white p-8 rounded-3xl shadow-sm border border-slate-200/80 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center animate-pulse">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">
            جاري جلب بيانات إشعار التنبيه...
          </h3>
          <p className="text-xs text-slate-400">
            يرجى الانتظار لحظات للتحقق من أمان الرابط
          </p>
          <Loader2 className="w-5 h-5 text-teal-600 animate-spin mt-2" />
        </div>
      </div>
    );
  }

  // 2. Error State Screen
  if (errorMessage) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-rose-100 max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800">
            تعذر فتح الرابط
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {errorMessage}
          </p>
          <div className="pt-2 text-xs text-slate-400 border-t border-slate-100">
            الثانوية الخامسة مسارات — إدارة المدرسة
          </div>
        </div>
      </div>
    );
  }

  // 3. Expired Link State Screen
  if (isExpired) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-amber-100 max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800">
            انتهت صلاحية هذا الرابط
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            تنص اللائحة على أن صلاحية رابط تسجيل الإفادة هي 7 أيام من تاريخ صدور الإشعار. يرجى التواصل مع إدارة المدرسة إذا كنتِ ترغبين في تمديد المدة أو تقديم الإفادة يدوياً.
          </p>
          <div className="pt-2 text-xs text-slate-400 border-t border-slate-100">
            الثانوية الخامسة مسارات — مكتب الإدارة المدرسية
          </div>
        </div>
      </div>
    );
  }

  // 4. Already Submitted Screen (Read-Only)
  if (alreadySubmitted && !submitSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center py-6 px-4 sm:px-6">
        <div className="max-w-xl w-full space-y-4">
          {/* Header */}
          <div className="text-center space-y-1 py-2">
            <span className="text-xs font-bold text-teal-700 block">
              المملكة العربية السعودية — وزارة التعليم
            </span>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900">
              الثانوية الخامسة مسارات
            </h1>
            <p className="text-xs text-slate-500">
              نموذج تنبيه عن تأخر / انصراف (و.م.ع.ن - ٠٢ - ٠٢)
            </p>
          </div>

          {/* Success / Previous Submission Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-5 text-right">
            <div className="flex flex-col items-center text-center space-y-2 pb-4 border-b border-slate-100">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                تم تقديم إفادتكِ مسبقاً بنجاح
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md">
                تم استلام مبرراتكِ وإحالة المعاملة إلى مديرة المدرسة لاتخاذ القرار الإداري المعتمد.
              </p>
            </div>

            {/* Read-only Excerpt */}
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                <span className="text-slate-500">اسم المعلمة:</span>
                <span className="font-bold text-slate-800">{notice?.teacherName}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                <span className="text-slate-500">تاريخ التنبيه:</span>
                <span className="font-bold text-slate-800 font-mono">
                  {notice?.noticeDate || notice?.date}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/70 space-y-1.5">
                <span className="font-bold text-emerald-900 block text-xs">
                  نص الإفادة والمبرر المسجل:
                </span>
                <p className="text-slate-800 whitespace-pre-line leading-relaxed text-xs sm:text-sm">
                  {notice?.teacherReason || "لا يوجد نص مسجل"}
                </p>
                {notice?.teacherSignatureDate && (
                  <span className="text-[11px] text-emerald-700 block pt-1 font-mono">
                    تاريخ التوقيع الإلكتروني: {notice.teacherSignatureDate}
                  </span>
                )}
              </div>
            </div>

            {/* PDF Print Option */}
            <button
              type="button"
              onClick={handlePrint}
              className="w-full h-12 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition"
            >
              <FileDown className="w-4 h-4 text-teal-600" />
              <span>معاينة أو طباعة الاستمارة الرسمية (PDF)</span>
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-slate-400 pt-2">
            منظومة المتابعة الإدارية المدرسية — الثانوية الخامسة مسارات
          </p>
        </div>
      </div>
    );
  }

  // 5. Success Screen (Immediately After Submission)
  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-6 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white p-7 sm:p-8 rounded-3xl shadow-sm border border-emerald-100 text-center space-y-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h2 className="text-lg font-extrabold text-slate-900">
            تم إرسال ردكِ بنجاح
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            شكراً لكِ أستاذة <strong className="text-slate-900">{notice?.teacherName}</strong>. تم توثيق إفادتكِ إلكترونياً وإشعار إدارة المدرسة لمراجعتها واعتماد القرار النهائي.
          </p>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1 text-right font-medium">
            <div className="flex justify-between">
              <span>رقم التنبيه:</span>
              <span className="font-mono font-bold text-teal-700">
                {notice?.noticeNumber || "مسجل بالنظام"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>تاريخ الإرسال:</span>
              <span className="font-mono text-slate-700">
                {new Date().toLocaleDateString("ar-SA")}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="w-full h-12 flex items-center justify-center gap-2 bg-[#137a85] hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-md shadow-teal-600/20 transition"
          >
            <FileDown className="w-4 h-4" />
            <span>تحميل نسخة من استمارة التنبيه الرسمية (PDF)</span>
          </button>

          <div className="pt-3 text-[11px] text-slate-400 border-t border-slate-100">
            الثانوية الخامسة مسارات — إدارة المدرسة
          </div>
        </motion.div>
      </div>
    );
  }

  // 6. Active Submission Form Screen (Teacher Stage 2 Entry)
  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4 sm:px-6 flex flex-col items-center">
      <div className="max-w-2xl w-full space-y-4">
        {/* Top Ministry Header */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200/80 flex items-center justify-between gap-3 text-right">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-teal-50 text-[#137a85] flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-teal-700 block">
                المملكة العربية السعودية — وزارة التعليم
              </span>
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900">
                الثانوية الخامسة مسارات
              </h1>
              <p className="text-[11px] text-slate-500">
                تنبيه عن تأخر / انصراف (و.م.ع.ن - ٠٢ - ٠٢)
              </p>
            </div>
          </div>
          <div className="text-left shrink-0">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold">
              {notice?.noticeNumber || "إشعار إداري"}
            </span>
          </div>
        </div>

        {/* Section 1: Official Notice Excerpt (READ-ONLY) */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 space-y-3.5 text-right">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-teal-600" />
              <span>( ١ ) بيانات التنبيه المسجلة من إدارة المدرسة</span>
            </span>
            <span className="text-xs font-mono text-slate-500">
              {notice?.noticeDate || notice?.date} م
            </span>
          </div>

          {/* Teacher Greeting */}
          <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            المكرمة المعلمة /{" "}
            <strong className="text-slate-900 font-extrabold">
              {notice?.teacherName}
            </strong>{" "}
            وفقها الله،
            <br />
            السلام عليكم ورحمة الله وبركاته،، وبعد:
            <br />
            إنه في تاريخ (<span className="font-mono font-bold text-teal-700">{notice?.noticeDate || notice?.date}</span>) اتضح ما يلي:
          </div>

          {/* Violations Bullet Boxes */}
          <div className="space-y-2">
            {violationsList.map((v, i) => {
              const IconComponent = v.icon;
              return (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 flex items-start gap-3"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-100/80 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="text-xs sm:text-sm text-slate-800">
                    <strong className="block font-bold text-amber-900">
                      • {v.title}
                    </strong>
                    <span className="text-slate-600 font-medium">
                      {v.time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {notice?.additionalNotes && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
              <strong className="text-slate-700 block mb-0.5">ملاحظات الإدارة:</strong>
              <span>{notice.additionalNotes}</span>
            </div>
          )}

          <p className="text-xs text-slate-500 pt-1">
            عليه نأمل منكم توضيح أسباب ومبررات ذلك وتعبئة النموذج أدناه ،،، ولكم تحياتنا ..
          </p>
        </div>

        {/* Section 2: Teacher Input Form (Stage 2) */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/80 space-y-4 text-right"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>( ٢ ) إفادة المعلمة وتدوين الأسباب</span>
            </span>
            <span className="text-[11px] text-rose-500 font-semibold">
              * حقول إلزامية
            </span>
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{formError}</span>
            </div>
          )}

          {/* Teacher Reason Textarea */}
          <div className="space-y-1.5">
            <label
              htmlFor={`${formId}-reason`}
              className="block text-xs font-bold text-slate-800"
            >
              أسباب ومبررات التأخر / الانصراف <span className="text-rose-500">*</span>
            </label>
            <textarea
              id={`${formId}-reason`}
              rows={5}
              value={teacherReason}
              onChange={(e) => {
                setTeacherReason(e.target.value);
                setFormError(null);
              }}
              placeholder="اكتبي هنا مبرراتكِ وأسباب التأخر أو الانصراف بالتفصيل ليتم النظر فيها من قبل إدارة المدرسة..."
              className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-base text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#137a85]/20 focus:border-[#137a85] transition min-h-[140px]"
              required
            />
            <p className="text-[11px] text-slate-400">
              يرجى تحري الدقة في ذكر التفاصيل والأوقات الداعمة لمبرركِ.
            </p>
          </div>

          {/* Teacher Name & Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                اسم المعلمة (تلقائي)
              </label>
              <div className="h-12 flex items-center px-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
                {notice?.teacherName}
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor={`${formId}-date`}
                className="block text-xs font-bold text-slate-700"
              >
                تاريخ تقديم الإفادة
              </label>
              <input
                id={`${formId}-date`}
                type="date"
                value={signatureDate}
                onChange={(e) => setSignatureDate(e.target.value)}
                className="w-full h-12 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#137a85]/20 focus:border-[#137a85] transition"
              />
            </div>
          </div>

          {/* Legal Pledge / Consent Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-3 p-3.5 rounded-xl bg-teal-50/50 border border-teal-200/80 cursor-pointer hover:bg-teal-50 transition">
              <input
                type="checkbox"
                checked={hasConsent}
                onChange={(e) => {
                  setHasConsent(e.target.checked);
                  setFormError(null);
                }}
                className="mt-0.5 w-4 h-4 rounded text-teal-600 border-slate-300 focus:ring-teal-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-teal-950 leading-relaxed select-none">
                أقر بأن جميع البيانات والمبررات المدخلة صحيحة وأتحمل المسؤولية الإدارية والنظامية عن ذلك.
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isSubmitting || !hasConsent || !teacherReason.trim()}
              className={cn(
                "w-full h-14 rounded-xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 transition duration-150 shadow-md",
                isSubmitting || !hasConsent || !teacherReason.trim()
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25 active:scale-[0.99] cursor-pointer"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري إرسال الإفادة وتوثيق الرد...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>إرسال الإفادة إلكترونياً</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1 text-center">
            <Shield className="w-3.5 h-3.5 text-teal-600" />
            <span>يتم توثيق الرد وحفظه مباشرة في السجل الإداري للمدرسة</span>
          </div>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 py-2">
          الثانوية الخامسة مسارات — منصة المتابعة الإدارية
        </p>
      </div>
    </div>
  );
}
