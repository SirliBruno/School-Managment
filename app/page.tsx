"use client";

import React, { useState, useRef, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Plus,
  ChevronLeft,
  Calendar,
  FileDown,
  Loader2,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  FileText,
  Inbox,
  Pencil,
  Trash2,
  Zap,
  Clock,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Activity,
  FileCheck,
  Send,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeachers } from "@/context/TeacherContext";
import { useToast } from "@/context/ToastContext";
import { AbsenceRecord, AbsenceType, Teacher } from "@/types/teacher";
import { TeacherProfileModal } from "@/components/teachers/TeacherProfileModal";
import { PageHeader } from "@/components/ui";
import {
  generateSchoolProactiveAlerts,
  getSchoolRadarKPIs,
} from "@/lib/delayDeductionIntegration";
import { getSaudiToday } from "@/lib/timeUtils";
import { EditAbsenceModal } from "@/components/procedures/EditAbsenceModal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { printAbsencePdf } from "@/lib/printPdfService";

const AbsenceCharts = dynamic(
  () =>
    import("@/components/analytics/AbsenceCharts").then(
      (mod) => mod.AbsenceCharts
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-80 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-center animate-pulse">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-[#137a85]" />
          <span>جاري تجهيز التحليلات البيانية...</span>
        </div>
      </div>
    ),
  }
);

const TYPE_STYLES: Record<
  AbsenceType,
  { bg: string; text: string; border: string }
> = {
  اضطراري: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
  },
  مرضي: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  مرافق: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  أخرى: {
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
  },
};

const tableRowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.03,
      duration: 0.25,
      ease: "easeOut" as const,
    },
  }),
};

export default function DashboardPage() {
  const router = useRouter();
  const {
    teachers,
    absenceRecords,
    delayNotices,
    deductionDecisions,
    inquiries,
    deleteAbsenceRecord,
  } = useTeachers();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [selectedTeacherForProfile, setSelectedTeacherForProfile] =
    useState<Teacher | null>(null);
  const [recordToEdit, setRecordToEdit] = useState<AbsenceRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<AbsenceRecord | null>(
    null
  );
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Today in Saudi format (YYYY-MM-DD)
  const todayDateStr = useMemo(() => getSaudiToday(), []);

  // Today formatted text
  const todayFormatted = useMemo(() => {
    try {
      const now = new Date();
      return new Intl.DateTimeFormat("ar-SA", {
        timeZone: "Asia/Riyadh",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(now);
    } catch {
      return "الأربعاء، 16 سبتمبر 2026 م";
    }
  }, []);

  // Proactive Alerts from Integration Engine
  const proactiveAlerts = useMemo(() => {
    return generateSchoolProactiveAlerts({
      teachers,
      delayNotices,
      deductionDecisions,
      inquiries,
    });
  }, [teachers, delayNotices, deductionDecisions, inquiries]);

  // Radar KPIs
  const radarKpis = useMemo(() => {
    return getSchoolRadarKPIs({
      teachers,
      delayNotices,
      deductionDecisions,
      inquiries,
    });
  }, [teachers, delayNotices, deductionDecisions, inquiries]);

  // Executive Pulse Stats for Today
  const todayPulse = useMemo(() => {
    const activeTeachers = teachers.filter((t) => !t.isArchived);
    const totalTeachersCount = activeTeachers.length || 1;

    // Today's absences
    const todayAbs = absenceRecords.filter(
      (r) => !r.isArchived && r.date === todayDateStr
    ).length;

    // Today's delays
    const todayDel = delayNotices.filter(
      (n) => !n.isArchived && (n.noticeDate === todayDateStr || n.date === todayDateStr)
    ).length;

    // Discipline Rate %
    const absentTeachersCount = todayAbs;
    const disciplineRate = Math.max(
      0,
      Math.min(
        100,
        Math.round(((totalTeachersCount - absentTeachersCount) / totalTeachersCount) * 100)
      )
    );

    // Pending administrative items (pending teacher inquiries + pending director notices)
    const pendingInquiriesCount = inquiries.filter(
      (i) => !i.isArchived && i.status === "pending"
    ).length;
    const pendingDirectorCount = delayNotices.filter(
      (n) => !n.isArchived && n.status === "pending_director"
    ).length;
    const totalPendingMatters = pendingInquiriesCount + pendingDirectorCount;

    return {
      todayAbsences: todayAbs,
      todayDelays: todayDel,
      disciplineRate,
      totalPendingMatters,
      teachersDueCount: radarKpis.teachersDueCount,
      totalUnexcusedHours: radarKpis.totalUnexcusedHours,
    };
  }, [teachers, absenceRecords, delayNotices, inquiries, todayDateStr, radarKpis]);

  const confirmDeleteRecord = (reason?: string) => {
    if (recordToDelete) {
      const rec = recordToDelete;
      deleteAbsenceRecord(rec.id, reason);
      setRecordToDelete(null);

      showToast({
        message: "تم نقل العنصر إلى الأرشيف الإداري",
        type: "success",
        action: {
          label: "عرض الأرشيف",
          onClick: () => router.push("/archive"),
        },
      });
    }
  };

  // Filter recent active absences based on search
  const filteredRecentAbsences = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const activeRecords = absenceRecords.filter((r) => !r.isArchived);
    const records = activeRecords.slice(0, 10);
    if (!q) return records;

    return records.filter(
      (r) =>
        r.teacherName.toLowerCase().includes(q) ||
        r.specialty.toLowerCase().includes(q) ||
        (r.nationalId && r.nationalId.toLowerCase().includes(q)) ||
        (r.jobNumber && r.jobNumber.toLowerCase().includes(q)) ||
        r.type.toLowerCase().includes(q)
    );
  }, [absenceRecords, searchQuery]);

  // Direct PDF export from dashboard
  const handleExportPdf = async (record: AbsenceRecord) => {
    if (generatingId) return;

    const teacher =
      teachers.find((t) => t.id === record.teacherId) ||
      ({
        id: record.teacherId,
        fullName: record.teacherName,
        name: record.teacherName,
        nationalId: record.nationalId,
        username: record.nationalId || record.jobNumber,
        jobNumber: record.nationalId || record.jobNumber,
        specialty: record.specialty,
        totalAbsences: 1,
      } as Teacher);

    setGeneratingId(record.id);
    setFeedback(null);

    try {
      printAbsencePdf({
        teacherName: record.teacherName,
        nationalId: record.nationalId || teacher.nationalId,
        username: record.nationalId || record.jobNumber,
        specialty: record.specialty,
        jobTitle: teacher.jobTitle || "معلم",
        employmentStatus: teacher.employmentStatus || "دائم",
        absenceCount: teacher.totalAbsences || 1,
        absenceDate: record.date,
        absenceType: record.type,
        absenceReason: record.reason,
      });

      setFeedback({
        type: "success",
        message: `تم تجهيز استمارة مساءلة (${record.teacherName}) للطباعة بنجاح.`,
      });
    } catch (err) {
      console.error("فشل طباعة مستند المساءلة PDF:", err);
      setFeedback({
        type: "error",
        message: "تعذر طباعة الاستمارة حالياً. يرجى المحاولة لاحقاً.",
      });
    } finally {
      setGeneratingId(null);
    }
  };

  const openTeacherProfileByName = (teacherName: string, teacherId?: string) => {
    const matched =
      teachers.find((t) => (teacherId && t.id === teacherId) || t.name === teacherName);
    if (matched) {
      setSelectedTeacherForProfile(matched);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/50 pb-16">
      {/* Top Bar Header */}
      <PageHeader
        breadcrumbs={[
          { label: "مركز القيادة والتحكم الإداري", href: "/" },
          { label: "المتابعة الاستراتيجية والانضباط المدرسي" },
        ]}
        title="مركز القيادة والتحكم الإداري"
        badge="لوحة قيادة الوكيلة"
        actions={
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Vice Principal Name Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200/80 text-xs font-bold text-teal-800 shadow-xs">
              <span className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center text-[10px] font-extrabold shrink-0">
                أ
              </span>
              <div className="flex flex-col leading-none">
                <span className="text-[10px] text-slate-400 font-medium mb-0.5">
                  وكيلة الشؤون التعليمية والمدرسية
                </span>
                <span className="text-xs font-bold text-slate-800">
                  احلام صالح الضبيبي
                </span>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 font-medium shadow-xs">
              <Calendar className="w-4 h-4 text-teal-700" />
              <span>{todayFormatted}</span>
            </div>
          </div>
        }
      />

      {/* Animated Feedback Toast */}
      <AnimatePresence>
        {feedback && (
          <div className="px-4 sm:px-6 lg:px-8 pt-4">
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              role="alert"
              className={cn(
                "p-3.5 rounded-2xl border flex items-center justify-between text-xs shadow-md max-w-7xl mx-auto",
                feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-950 border-emerald-300"
                  : "bg-rose-50 text-rose-950 border-rose-300"
              )}
            >
              <div className="flex items-center gap-2.5">
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="font-bold">{feedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-black/5 cursor-pointer"
                aria-label="إغلاق الإشعار"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Body */}
      <main className="flex-1 p-3.5 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl w-full mx-auto">
        {/* Section 1: Executive Pulse Bar (شريط النبض الإداري اليومي) */}
        <section aria-labelledby="pulse-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-700" />
              <h2 id="pulse-heading" className="text-base font-bold text-slate-800">
                شريط النبض الإداري اليومي
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              رصد حي للدوام ومؤشرات الانضباط
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            {/* Today Absences */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-xs text-slate-500 font-medium">غياب اليوم</span>
              <div className="flex items-baseline justify-between mt-2">
                <span
                  className={cn(
                    "text-2xl font-mono font-black",
                    todayPulse.todayAbsences > 0 ? "text-rose-600" : "text-slate-800"
                  )}
                >
                  {todayPulse.todayAbsences}
                </span>
                <span className="text-xs text-slate-400 font-semibold">معلمة</span>
              </div>
            </div>

            {/* Today Delays */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-xs text-slate-500 font-medium">تأخر وانصراف اليوم</span>
              <div className="flex items-baseline justify-between mt-2">
                <span
                  className={cn(
                    "text-2xl font-mono font-black",
                    todayPulse.todayDelays > 0 ? "text-amber-600" : "text-slate-800"
                  )}
                >
                  {todayPulse.todayDelays}
                </span>
                <span className="text-xs text-slate-400 font-semibold">حالة</span>
              </div>
            </div>

            {/* Discipline Rate */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-xs text-slate-500 font-medium">مؤشر الانضباط العام</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-mono font-black text-emerald-600">
                  {todayPulse.disciplineRate}%
                </span>
                <span className="text-xs text-emerald-700 font-bold">
                  {todayPulse.disciplineRate >= 95 ? "ممتاز" : "مستقر"}
                </span>
              </div>
            </div>

            {/* Pending Administrative Matters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-xs text-slate-500 font-medium">معاملات بانتظار الإجراء</span>
              <div className="flex items-baseline justify-between mt-2">
                <span
                  className={cn(
                    "text-2xl font-mono font-black",
                    todayPulse.totalPendingMatters > 0 ? "text-amber-600" : "text-slate-800"
                  )}
                >
                  {todayPulse.totalPendingMatters}
                </span>
                <span className="text-xs text-slate-400 font-semibold">معاملة</span>
              </div>
            </div>

            {/* Due for Deduction Counter */}
            <div
              className={cn(
                "p-4 rounded-2xl border shadow-xs flex flex-col justify-between transition-all",
                todayPulse.teachersDueCount > 0
                  ? "bg-rose-50/80 border-rose-200 text-rose-950"
                  : "bg-white border-slate-200/80"
              )}
            >
              <span
                className={cn(
                  "text-xs font-bold",
                  todayPulse.teachersDueCount > 0 ? "text-rose-800" : "text-slate-500"
                )}
              >
                استحقاق حسم فوري (≥ 7س)
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span
                  className={cn(
                    "text-2xl font-mono font-black",
                    todayPulse.teachersDueCount > 0 ? "text-rose-700" : "text-slate-800"
                  )}
                >
                  {todayPulse.teachersDueCount}
                </span>
                <span className="text-xs text-rose-700 font-bold">
                  {todayPulse.teachersDueCount > 0 ? "مستحقة 🚨" : "لا يوجد"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Action Required Radar (رادار الإجراءات والتدخلات العاجلة) */}
        <section aria-labelledby="radar-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <h2 id="radar-heading" className="text-base font-bold text-slate-900">
                رادار المهام والإجراءات المستحقة
              </h2>
              {proactiveAlerts.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                  {proactiveAlerts.length} إجراء عاجل
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              رصد استباقي يمنع فوات المهل وتراكم ساعات الحسم
            </span>
          </div>

          {proactiveAlerts.length === 0 ? (
            <div className="p-6 rounded-2xl bg-white border border-emerald-200/80 flex items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    كافة الإجراءات الإدارية والمدد في وضع سليم ومستقر
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    لا توجد معلمات بلغن نصاب الحسم (7 ساعات)، ولا توجد مساءلات متجاوزة لمهلة الـ 48 ساعة.
                  </p>
                </div>
              </div>
              <Link
                href="/procedures/deduction-hours"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors"
              >
                <span>سجل الحسم</span>
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {proactiveAlerts.map((alert) => {
                const isCritical = alert.severity === "critical";
                const isWarning = alert.severity === "warning";

                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-all",
                      isCritical
                        ? "bg-gradient-to-r from-rose-50/90 via-red-50/60 to-white border-rose-200"
                        : isWarning
                        ? "bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-white border-amber-200"
                        : "bg-gradient-to-r from-sky-50/80 via-blue-50/50 to-white border-sky-200"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                          isCritical
                            ? "bg-rose-600 text-white shadow-xs"
                            : isWarning
                            ? "bg-amber-500 text-white"
                            : "bg-sky-500 text-white"
                        )}
                      >
                        {alert.type === "due_for_deduction" ? (
                          <Zap className="w-4 h-4" />
                        ) : alert.type === "expired_inquiry" ? (
                          <Clock className="w-4 h-4" />
                        ) : alert.type === "pending_director" ? (
                          <FileCheck className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                            {alert.title}
                          </h4>
                          {isCritical && (
                            <span className="px-2 py-0.2 rounded-full text-2xs font-extrabold bg-rose-600 text-white animate-pulse">
                              عاجل
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {alert.description}
                        </p>
                      </div>
                    </div>

                    <div className="sm:self-center shrink-0 pt-1 sm:pt-0">
                      <Link href={alert.actionUrl}>
                        <motion.span
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          className={cn(
                            "inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer w-full sm:w-auto",
                            isCritical
                              ? "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200"
                              : isWarning
                              ? "bg-amber-600 text-white hover:bg-amber-700 shadow-amber-200"
                              : "bg-sky-600 text-white hover:bg-sky-700 shadow-sky-200"
                          )}
                        >
                          <span>{alert.actionLabel}</span>
                          <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                        </motion.span>
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 3: Instant 1-Click Launchpad (شريط العمليات السريعة للوكيلة) */}
        <section aria-labelledby="launchpad-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-teal-700" />
              <h2 id="launchpad-heading" className="text-base font-bold text-slate-800">
                منصة العمليات والإجراءات السريعة
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              وصول مباشر بنقرة واحدة لكافة النماذج المعتمدة
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Link href="/procedures/absence" className="group">
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-teal-500 hover:shadow-md transition-all flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 group-hover:bg-teal-600 group-hover:text-white transition-colors flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    رصد غياب اليوم
                  </span>
                  <span className="text-2xs text-slate-400">إصدار ومساءلة (نموذج 20)</span>
                </div>
              </div>
            </Link>

            <Link href="/procedures/delay-notice" className="group">
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-teal-500 hover:shadow-md transition-all flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    رصد تأخر / انصراف
                  </span>
                  <span className="text-2xs text-slate-400">تنبيه تأخر (و.م.ع.ن-02-02)</span>
                </div>
              </div>
            </Link>

            <Link href="/procedures/deduction-hours" className="group">
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-rose-500 hover:shadow-md transition-all flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 group-hover:bg-rose-600 group-hover:text-white transition-colors flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    إصدار قرار حسم
                  </span>
                  <span className="text-2xs text-slate-400">مجموع الساعات (نموذج 19)</span>
                </div>
              </div>
            </Link>

            <Link href="/teachers" className="group">
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-teal-500 hover:shadow-md transition-all flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 group-hover:bg-teal-600 group-hover:text-white transition-colors flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    كشف وسجل المعلمات
                  </span>
                  <span className="text-2xs text-slate-400">ملف 360° والكادر المدرسي</span>
                </div>
              </div>
            </Link>

            <Link href="/procedures/list" className="group">
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-teal-500 hover:shadow-md transition-all flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white transition-colors flex items-center justify-center">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    سجل الإجراءات الموحد
                  </span>
                  <span className="text-2xs text-slate-400">أرشيف كافة القرارات الصادرة</span>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* Section 4: Analytics & Visualizations */}
        <section aria-labelledby="analytics-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="analytics-heading" className="text-base font-bold text-slate-800">
                التحليلات البيانية لحالات الغياب والتأخر
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                متابعة اتجاهات الغياب وتوزيع أسبابه ومقارنة التخصصات
              </p>
            </div>
          </div>

          <AbsenceCharts />
        </section>

        {/* Section 5: Recent Activity & Absence Procedures Table */}
        <section className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
          {/* Section Header */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  سجل المساءلات والإجراءات الإدارية الحديثة
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                  محدث لحظياً
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                عرض مباشر لآخر المساءلات المسجلة مع إمكانية تصدير استمارة مساءلة الغياب الرسمية
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/procedures/absence">
                <motion.span
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إصدار مساءلة جديدة</span>
                </motion.span>
              </Link>
              <Link href="/teachers">
                <motion.span
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
                >
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>إدارة المعلمات</span>
                </motion.span>
              </Link>
            </div>
          </div>

          {/* Quick Search Bar */}
          <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث باسم المعلمة، رقم الهوية، أو التخصص..."
                className="w-full pl-8 pr-9 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="مسح البحث"
                  aria-label="مسح نص البحث"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>إجمالي المساءلات:</span>
              <strong className="font-mono text-slate-800 font-bold">
                {absenceRecords.length}
              </strong>
            </div>
          </div>

          {/* Table of Absences */}
          {absenceRecords.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-3.5">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-400 flex items-center justify-center shadow-2xs">
                <FileText className="w-7 h-7" aria-hidden="true" />
              </div>
              <div className="max-w-md space-y-1">
                <h4 className="text-base font-bold text-slate-800">
                  لا توجد مساءلات مسجلة حالياً
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  ابدئي بإنشاء أول مساءلة إدارية للمعلمات لمتابعة حالات الغياب بدقة وتوثيقها.
                </p>
              </div>
              <div className="pt-1 flex items-center gap-3">
                <Link href="/procedures/absence">
                  <motion.span
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إصدار مساءلة جديدة</span>
                  </motion.span>
                </Link>
                <Link href="/teachers">
                  <motion.span
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    className="inline-block px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    استيراد المعلمات
                  </motion.span>
                </Link>
              </div>
            </div>
          ) : filteredRecentAbsences.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 space-y-2">
              <p className="font-bold text-slate-700">لا توجد نتائج مطابقة لبحثك &ldquo;{searchQuery}&rdquo;</p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-teal-700 font-semibold hover:underline cursor-pointer"
              >
                إلغاء التصفية
              </button>
            </div>
          ) : (
            <>
              {/* Desktop / Tablet Table View (md+) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 select-none">
                    <tr>
                      <th scope="col" className="py-3 px-4">#</th>
                      <th scope="col" className="py-3 px-4">اسم المعلمة</th>
                      <th scope="col" className="py-3 px-4">التخصص</th>
                      <th scope="col" className="py-3 px-4">طبيعة الغياب</th>
                      <th scope="col" className="py-3 px-4">تاريخ الغياب</th>
                      <th scope="col" className="py-3 px-4">السبب المسجل</th>
                      <th scope="col" className="py-3 px-4 text-center">الإجراءات والملف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRecentAbsences.map((item, idx) => {
                      const style =
                        TYPE_STYLES[item.type] || TYPE_STYLES["أخرى"];
                      const isExporting = generatingId === item.id;

                      return (
                        <motion.tr
                          key={item.id}
                          custom={idx}
                          variants={tableRowVariants}
                          initial="hidden"
                          animate="visible"
                          className="hover:bg-slate-50/80 transition-colors duration-150"
                        >
                          <td className="py-3 px-4 font-mono text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <button
                              type="button"
                              onClick={() =>
                                openTeacherProfileByName(
                                  item.teacherName,
                                  item.teacherId
                                )
                              }
                              className="text-right hover:text-teal-700 hover:underline cursor-pointer flex items-center gap-2 group"
                              title="عرض ملف المعلمة وسجلها التراكمي"
                            >
                              <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[11px] group-hover:bg-teal-600 group-hover:text-white transition-colors">
                                {item.teacherName.charAt(0)}
                              </div>
                              <span>{item.teacherName}</span>
                            </button>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {item.specialty}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={cn(
                                "inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                                style.bg,
                                style.text,
                                style.border
                              )}
                            >
                              {item.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-mono">
                            {item.date}
                          </td>
                          <td className="py-3 px-4 text-slate-700 max-w-xs truncate font-medium">
                            {item.reason}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                type="button"
                                onClick={() => handleExportPdf(item)}
                                disabled={isExporting}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white border border-teal-200/80 transition-all cursor-pointer disabled:opacity-50"
                                title="تصدير استمارة مساءلة الغياب الرسمية PDF"
                                aria-label={`تصدير استمارة مساءلة الغياب للمعلمة ${item.teacherName} بصيغة PDF`}
                              >
                                {isExporting ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <FileDown className="w-3.5 h-3.5" />
                                )}
                                <span>PDF</span>
                              </motion.button>
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                type="button"
                                onClick={() =>
                                  openTeacherProfileByName(
                                    item.teacherName,
                                    item.teacherId
                                  )
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                                title="عرض ملف المعلمة"
                                aria-label={`عرض الملف الشامل للمعلمة ${item.teacherName}`}
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                <span>الملف</span>
                              </motion.button>
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                type="button"
                                onClick={() => setRecordToEdit(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-600 hover:text-white border border-amber-200 transition-all cursor-pointer"
                                title="تعديل سجل الغياب"
                                aria-label={`تعديل سجل غياب المعلمة ${item.teacherName}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>تعديل</span>
                              </motion.button>
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                type="button"
                                onClick={() => setRecordToDelete(item)}
                                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                                title="حذف سجل الغياب"
                                aria-label={`حذف سجل غياب المعلمة ${item.teacherName}`}
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                <span className="sr-only sm:not-sr-only">حذف</span>
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View (< md) */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredRecentAbsences.map((item, idx) => {
                  const style =
                    TYPE_STYLES[item.type] || TYPE_STYLES["أخرى"];
                  const isExporting = generatingId === item.id;

                  return (
                    <motion.div
                      key={item.id}
                      custom={idx}
                      variants={tableRowVariants}
                      initial="hidden"
                      animate="visible"
                      className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openTeacherProfileByName(
                              item.teacherName,
                              item.teacherId
                            )
                          }
                          aria-label={`عرض الملف الشامل للمعلمة ${item.teacherName}`}
                          className="flex items-center gap-2.5 text-right hover:text-teal-700 cursor-pointer"
                        >
                          <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm shrink-0 border border-teal-100">
                            {item.teacherName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-sm text-slate-900 block leading-tight">
                              {item.teacherName}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {item.specialty} • {item.nationalId || item.jobNumber}
                            </span>
                          </div>
                        </button>

                        <span
                          className={cn(
                            "inline-block px-2.5 py-1 rounded-full text-xs font-bold border shrink-0",
                            style.bg,
                            style.text,
                            style.border
                          )}
                        >
                          {item.type}
                        </span>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-2.5 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-slate-500">
                          <span className="flex items-center gap-1 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>تاريخ الغياب:</span>
                          </span>
                          <span className="font-mono font-semibold text-slate-700 tabular-nums">
                            {item.date}
                          </span>
                        </div>

                        <div className="text-slate-700 pt-1 border-t border-slate-200/60">
                          <span className="text-slate-400 font-medium me-1">السبب:</span>
                          <span className="font-medium">{item.reason}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => handleExportPdf(item)}
                          disabled={isExporting}
                          className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold bg-teal-50 text-teal-700 hover:bg-teal-600 hover:text-white border border-teal-200/80 transition-all cursor-pointer disabled:opacity-50"
                          title="تصدير استمارة مساءلة الغياب الرسمية PDF"
                        >
                          {isExporting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <FileDown className="w-3.5 h-3.5" />
                          )}
                          <span>{isExporting ? "تصدير..." : "استمارة PDF"}</span>
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() =>
                            openTeacherProfileByName(
                              item.teacherName,
                              item.teacherId
                            )
                          }
                          className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>الملف</span>
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => setRecordToEdit(item)}
                          className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-600 hover:text-white border border-amber-200 transition-all cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => setRecordToDelete(item)}
                          className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50/60 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>حذف</span>
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}

          {/* Table Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <span>
              عرض {filteredRecentAbsences.length} من أحدث المساءلات المعتمدة
            </span>
            <Link
              href="/procedures/absence"
              className="flex items-center gap-1.5 text-teal-700 font-bold hover:underline"
            >
              <span>الانتقال لصفحة مساءلة الغياب الكاملة</span>
              <ChevronLeft className="w-3.5 h-3.5 rotate-180" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      {/* Teacher Profile Modal */}
      {selectedTeacherForProfile && (
        <TeacherProfileModal
          teacher={selectedTeacherForProfile}
          onClose={() => setSelectedTeacherForProfile(null)}
        />
      )}

      {/* Edit Absence Modal */}
      <EditAbsenceModal
        isOpen={Boolean(recordToEdit)}
        record={recordToEdit}
        onClose={() => setRecordToEdit(null)}
      />

      {/* Confirm Archive Absence Record Dialog */}
      <ConfirmDialog
        isOpen={Boolean(recordToDelete)}
        title="نقل سجل الغياب إلى الأرشيف"
        message={
          recordToDelete
            ? `المعلمة: "${recordToDelete.teacherName}" (${recordToDelete.date} — ${recordToDelete.type})\nسيتم نقل هذا السجل إلى الأرشيف الإداري وتحديث عداد المعلمة تلقائياً.`
            : ""
        }
        confirmLabel="نقل إلى الأرشيف"
        cancelLabel="إلغاء"
        variant="archive"
        showReasonInput={true}
        onConfirm={confirmDeleteRecord}
        onCancel={() => setRecordToDelete(null)}
      />
    </div>
  );
}
