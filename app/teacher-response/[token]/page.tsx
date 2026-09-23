"use client";

import React, { useState, useEffect, useId } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Clock,
  Calendar,
  User,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  FileText,
  LogIn,
  LogOut,
  DoorOpen,
  Check,
  FileDown,
  RefreshCw,
} from "lucide-react";
import { DelayNotice } from "@/types/teacher";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useTeachers } from "@/context/TeacherContext";
import { printDelayNoticePdf } from "@/lib/printDelayNoticePdfService";
import { cn } from "@/lib/utils";
import {
  getSaudiToday,
  calculate48HoursExpiry,
  isTokenExpired,
} from "@/lib/timeUtils";

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
    return getSaudiToday();
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
                  calculate48HoursExpiry(),
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

        // Check expiration (48 hours validity)
        if (foundNotice.tokenExpiresAt && isTokenExpired(foundNotice.tokenExpiresAt)) {
          setIsExpired(true);
          setIsLoading(false);
          return;
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
    if (!notice || isSubmitting || submitSuccess || alreadySubmitted) return;

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
  const violationsList: {
    title: string;
    time?: string;
    duration?: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [];
  if (notice?.violationDelayStart) {
    violationsList.push({
      title: "التأخر الصباحي عن بداية الدوام الرسمي",
      time: notice.delayStartFromTime
        ? `من ${notice.delayStartFromTime} إلى ${notice.delayStartTime || "—"}`
        : `وقت الحضور الفعلي: ${notice.delayStartTime || "—"}`,
      duration: notice.calculatedDuration,
      icon: LogIn,
    });
  }
  if (notice?.violationAbsentDuring) {
    violationsList.push({
      title: "عدم التواجد أثناء الدوام الرسمي",
      time: `من الساعة ${notice.absentFromTime || "—"} إلى الساعة ${notice.absentToTime || "—"}`,
      duration: notice.calculatedDuration,
      icon: Clock,
    });
  }
  if (notice?.violationEarlyDeparture) {
    violationsList.push({
      title: "الانصراف المبكر قبل نهاية الدوام الرسمي",
      time: notice.earlyDepartureFromTime
        ? `من ${notice.earlyDepartureFromTime} إلى ${notice.earlyDepartureTime || "—"}`
        : `وقت الانصراف الفعلي: ${notice.earlyDepartureTime || "—"}`,
      duration: notice.calculatedDuration,
      icon: LogOut,
    });
  }
  if (notice?.violationLeftSchool) {
    violationsList.push({
      title: "الخروج من المدرسة والعودة إليها أثناء الدوام",
      time:
        notice.leftSchoolFromTime && notice.leftSchoolToTime
          ? `من ${notice.leftSchoolFromTime} إلى ${notice.leftSchoolToTime}`
          : notice.leftSchoolDetails || "تفاصيل مسجلة بإشعار الإدارة",
      duration: notice.calculatedDuration,
      icon: DoorOpen,
    });
  }

  // 1. Loading State Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 bg-white p-8 rounded-3xl shadow-2xs border border-slate-200 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#137a85] flex items-center justify-center animate-pulse">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">
            جاري جلب بيانات إشعار التنبيه...
          </h3>
          <p className="text-xs text-slate-400">
            يرجى الانتظار لحظات للتحقق من أمان الرابط
          </p>
          <Loader2 className="w-5 h-5 text-[#137a85] animate-spin mt-2" />
        </div>
      </div>
    );
  }

  // 2. Error State Screen
  if (errorMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xs border border-rose-200 max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800">
            تعذر فتح الرابط
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {errorMessage}
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
            نظام الإدارة المدرسية الموحد — منصة الغياب والمتابعة الإدارية
          </div>
        </div>
      </div>
    );
  }

  // 3. Expired Link State Screen
  if (isExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xs border border-amber-200 max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800">
            انتهت صلاحية هذا الرابط
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            عذراً أستاذة ({notice?.teacherName || "المعلمة"})، لقد انقضت المهلة المحددة للرد على إشعار التنبيه (48 ساعة من تاريخ الإرسال). يرجى مراجعة إدارة المدرسة شخصياً لتقديم إفادتك.
          </p>
          <div className="pt-2 text-xs text-slate-400 border-t border-slate-100">
            نظام الإدارة المدرسية الموحد — منصة المتابعة الإدارية
          </div>
        </div>
      </div>
    );
  }

  // 4. Already Submitted Screen / Immediate Success Screen
  if (alreadySubmitted || submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50/40 via-slate-50 to-slate-100 flex flex-col items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white p-7 sm:p-9 rounded-3xl shadow-sm border border-emerald-200 max-w-lg w-full text-center space-y-6 relative overflow-hidden"
        >
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />

          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-100/80 text-emerald-800 mb-2">
              {alreadySubmitted && !submitSuccess
                ? "تم استلام الإفادة مسبقاً"
                : "تم استلام الإفادة بنجاح"}
            </span>
            <h1 className="text-xl font-bold text-slate-900">
              شكراً لكِ، أستاذة {notice?.teacherName}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              تم توثيق إفادتكِ الإدارية في النظام وأُحيلت لمديرة المدرسة للمراجعة والاعتماد.
            </p>
          </div>

          {/* Details Card */}
          <div className="bg-slate-50 rounded-2xl p-4 text-right text-xs space-y-2.5 border border-slate-100">
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500">رقم التنبيه:</span>
              <span className="font-mono font-bold text-[#137a85]">
                {notice?.noticeNumber || "مسجل بالنظام"}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500">تاريخ التنبيه:</span>
              <span className="font-bold text-slate-800 font-mono">
                {notice?.noticeDate || notice?.date}
              </span>
            </div>
            {violationsList.length > 0 && (
              <div className="py-1 border-b border-slate-200/60">
                <span className="text-slate-500 block mb-1">المخالفات المسجلة بالإشعار:</span>
                <div className="space-y-1 mt-1">
                  {violationsList.map((v, i) => (
                    <div
                      key={i}
                      className="text-[11px] font-bold text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/70 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span>{v.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-normal text-slate-500 font-mono">
                        <span>({v.time})</span>
                        {v.duration && (
                          <span className="text-teal-700 font-bold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                            {v.duration}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="py-1 border-b border-slate-200/60">
              <span className="text-slate-500 block mb-1">سبب ومبرر التأخر أو الانصراف:</span>
              <p className="font-medium text-slate-800 bg-white p-3 rounded-xl border border-slate-200 whitespace-pre-line leading-relaxed">
                {notice?.teacherReason || teacherReason || "لا يوجد نص مسجل"}
              </p>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">حالة المعاملة:</span>
              <span className="font-bold px-2.5 py-0.5 rounded-lg bg-teal-50 text-[#137a85] border border-teal-200 text-[11px]">
                {notice?.status === "completed"
                  ? "معتمدة ومكتملة من مديرة المدرسة"
                  : "قيد مراجعة واعتماد مديرة المدرسة"}
              </span>
            </div>
          </div>

          {/* PDF Print Option */}
          <button
            type="button"
            onClick={handlePrint}
            className="w-full py-3.5 px-5 rounded-2xl bg-[#137a85] hover:bg-teal-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span>تحميل أو طباعة استمارة التنبيه الرسمية (PDF)</span>
          </button>

          <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>معاملة رسمية موثقة إلكترونياً برمز تحقق فريد</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // 5. Active Submission Form Screen (Teacher Stage 2 Entry)
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
            نموذج تنبيه عن تأخر / انصراف
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            إفادة المعلمة عن سبب ومبررات التأخر أو الانصراف وتوثيق الرد نظامياً
          </p>

          {notice?.noticeNumber && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 text-slate-600 font-mono text-[11px] font-bold border border-slate-200/80">
              <span>رقم التنبيه:</span>
              <span className="text-[#137a85]">{notice.noticeNumber}</span>
            </div>
          )}
        </header>

        {/* Teacher Details Card (2x2 Grid matching Inquiry Page) */}
        <section className="bg-white rounded-3xl p-5 sm:p-6 shadow-2xs border border-slate-200 space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-4 h-4 text-[#137a85]" />
            <span>بيانات المكرمة المعلمة</span>
          </h2>

          <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block text-[11px]">اسم المعلمة</span>
              <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                {notice?.teacherName}
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block text-[11px]">الرقم الوظيفي / السجل</span>
              <span className="font-bold text-slate-800 text-sm mt-0.5 block font-mono">
                {notice?.jobNumber}
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <span className="text-slate-400 block text-[11px]">التخصص / الكادر</span>
              <span className="font-semibold text-slate-700 mt-0.5 block">
                {notice?.specialty || "الكادر التعليمي"}
              </span>
            </div>

            <div className="bg-teal-50/70 p-3.5 rounded-2xl border border-teal-200">
              <span className="text-[#137a85] block text-[11px] font-semibold flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>تاريخ التنبيه</span>
              </span>
              <span className="font-extrabold text-[#137a85] text-sm mt-0.5 block font-mono">
                {notice?.noticeDate || notice?.date}
              </span>
            </div>
          </div>
        </section>

        {/* Section 1: Stage 1 Delay Notice Excerpt Card (READ-ONLY) */}
        <section className="bg-white rounded-3xl p-5 sm:p-6 shadow-2xs border border-slate-200 space-y-3.5 text-right">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h2 className="text-xs font-bold text-[#137a85] uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#137a85]" />
              <span>( ١ ) وقائع التنبيه المسجلة من إدارة المدرسة</span>
            </h2>
            <span className="text-xs font-mono text-slate-500 font-medium">
              {notice?.noticeDate || notice?.date} م
            </span>
          </div>

          {/* Teacher Greeting */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed space-y-1">
            <p className="font-semibold text-slate-800">
              المكرمة المعلمة /{" "}
              <span className="text-slate-900 font-extrabold">
                {notice?.teacherName}
              </span>{" "}
              وفقها الله،
            </p>
            <p className="text-slate-500 text-xs">
              السلام عليكم ورحمة الله وبركاته، وبعد:
            </p>
            <p className="text-slate-700 text-xs pt-1">
              إنه في تاريخ (<span className="font-mono font-bold text-[#137a85]">{notice?.noticeDate || notice?.date}</span>) اتضح ما يلي:
            </p>
          </div>

          {/* Violations Bullet Boxes */}
          <div className="space-y-2.5">
            {violationsList.map((v, i) => {
              const IconComponent = v.icon;
              return (
                <div
                  key={i}
                  className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3 transition-all"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-100/90 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="text-xs sm:text-sm text-slate-800 flex-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <strong className="font-bold text-amber-950">
                        • {v.title}
                      </strong>
                      {v.duration && (
                        <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          المدة: {v.duration}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-600 font-medium text-xs mt-1 block">
                      {v.time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {notice?.additionalNotes && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600">
              <strong className="text-slate-800 block mb-1 font-bold">ملاحظات إضافية من الإدارة:</strong>
              <p className="text-slate-700 leading-relaxed">{notice.additionalNotes}</p>
            </div>
          )}

          <p className="text-xs text-slate-500 pt-1">
            عليه نأمل منكم توضيح أسباب ومبررات ذلك وتعبئة النموذج أدناه ،،، ولكم تحياتنا ..
          </p>
        </section>

        {/* Section 2: Teacher Input Form (Stage 2) */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200 space-y-6 text-right"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-[#137a85] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#137a85]" />
              <span>( ٢ ) إفادة المعلمة وتدوين الأسباب</span>
            </span>
            <span className="text-[11px] font-semibold text-rose-500 bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-100">
              * حقول إلزامية
            </span>
          </div>

          {formError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Teacher Reason Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor={`${formId}-reason`}
                className="block text-xs font-bold text-slate-800"
              >
                أسباب ومبررات التأخر / الانصراف بالتفصيل <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {teacherReason.length}/400
              </span>
            </div>

            <textarea
              id={`${formId}-reason`}
              rows={5}
              maxLength={400}
              value={teacherReason}
              onChange={(e) => {
                setTeacherReason(e.target.value);
                setFormError(null);
              }}
              placeholder="اكتبي هنا مبرراتكِ وأسباب التأخر أو الانصراف بالتفصيل ليتم النظر فيها من قبل إدارة المدرسة..."
              className={cn(
                "w-full p-3.5 rounded-2xl border text-xs sm:text-sm bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all shadow-2xs resize-none",
                formError && !teacherReason.trim()
                  ? "border-rose-400 focus:ring-rose-200"
                  : "border-slate-200 focus:border-[#137a85] focus:ring-[#137a85]/20"
              )}
              required
            />
            <p className="text-[11px] text-slate-400">
              يرجى تحري الدقة في ذكر التفاصيل والأوقات الداعمة لمبرركِ.
            </p>
          </div>

          {/* Teacher Name & Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                اسم المعلمة (المقرّة بالإفادة)
              </label>
              <div className="h-12 flex items-center px-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800">
                {notice?.teacherName}
              </div>
            </div>

            <div className="space-y-1.5">
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
                className="w-full h-12 px-3.5 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#137a85]/20 focus:border-[#137a85] transition shadow-2xs"
              />
            </div>
          </div>

          {/* Legal Pledge / Consent Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-3 p-4 rounded-2xl bg-teal-50/70 border border-teal-200 cursor-pointer hover:bg-teal-50 transition select-none">
              <input
                type="checkbox"
                checked={hasConsent}
                onChange={(e) => {
                  setHasConsent(e.target.checked);
                  setFormError(null);
                }}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#137a85] focus:ring-[#137a85] cursor-pointer"
              />
              <span className="text-xs text-slate-700 leading-relaxed font-medium">
                أقر بصحة البيانات والمبررات المسجلة أعلاه، وأتحمل المسؤولية الإدارية والنظامية عن صحتها أمام إدارة المدرسة.
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSubmitting || !hasConsent || !teacherReason.trim()}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#137a85] hover:bg-teal-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري إرسال الإفادة وتوثيق الرد...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>إرسال الإفادة الإدارية إلكترونياً</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1 text-center">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>معاملة رسمية موثقة إلكترونياً وتُحال مباشرة إلى الإدارة المدرسية</span>
          </div>
        </form>

        {/* Footer */}
        <footer className="text-center text-xs text-slate-400 pb-6">
          نظام الإدارة المدرسية الموحد — منصة المتابعة الإدارية
        </footer>
      </div>
    </div>
  );
}
