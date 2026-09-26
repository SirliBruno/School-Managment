"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Plus,
  Calendar,
  FileDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  FileText,
  Pencil,
  Trash2,
  Clock,
  ShieldAlert,
  AlertTriangle,
  TrendingUp,
  Activity,
  Sparkles,
  Building2,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeachers } from "@/context/TeacherContext";
import { useToast } from "@/context/ToastContext";
import { AbsenceRecord, AbsenceType, Teacher } from "@/types/teacher";
import { TeacherProfileModal } from "@/components/teachers/TeacherProfileModal";
import {
  Button,
  Card,
  DataTable,
  ColumnDef,
  ActionMenu,
  ActionMenuItem,
  KpiCard,
} from "@/components/ui";
import { SmartRadarSection } from "@/components/analytics/SmartRadarSection";
import {
  generateSchoolProactiveAlerts,
  getSchoolRadarKPIs,
  calculateSchoolDelaySummaries,
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

  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [selectedTeacherForProfile, setSelectedTeacherForProfile] =
    useState<Teacher | null>(null);
  const [recordToEdit, setRecordToEdit] = useState<AbsenceRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<AbsenceRecord | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<"records" | "radar" | "analytics">("records");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<"all" | AbsenceType>("all");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Today in Saudi format (YYYY-MM-DD)
  const todayDateStr = useMemo(() => getSaudiToday(), []);

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

    // Pending administrative items
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
        message: "تم نقل السجل إلى الأرشيف الإداري بنجاح",
        type: "success",
        action: {
          label: "عرض الأرشيف",
          onClick: () => router.push("/archive"),
        },
      });
    }
  };

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

      showToast({
        type: "success",
        message: `تم تجهيز استمارة مساءلة (${record.teacherName}) للطباعة.`,
      });
    } catch (err) {
      console.error("فشل طباعة مستند المساءلة PDF:", err);
      showToast({
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

  // Active unarchived absences filtered by selected type
  const activeAbsences = useMemo(() => {
    const list = absenceRecords.filter((r) => !r.isArchived);
    if (selectedTypeFilter === "all") return list;
    return list.filter((r) => r.type === selectedTypeFilter);
  }, [absenceRecords, selectedTypeFilter]);

  // Export active absences to Excel
  const handleExportExcel = () => {
    import("xlsx").then((xlsx) => {
      const dataToExport = activeAbsences.map((r, i) => ({
        "م": i + 1,
        "اسم المعلمة": r.teacherName,
        "التخصص": r.specialty,
        "تاريخ الغياب": r.date,
        "نوع الغياب": r.type,
        "السبب والمسوغ": r.reason || "—",
        "تاريخ الرصد": r.timestamp ? new Date(r.timestamp).toLocaleDateString("ar-SA") : "—",
      }));
      const ws = xlsx.utils.json_to_sheet(dataToExport);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "سجلات الغياب");
      xlsx.writeFile(wb, `سجلات_الغياب_${todayDateStr}.xlsx`);
      showToast({ message: "تم تصدير ملف الإكسل بنجاح", type: "success" });
    }).catch(() => {
      showToast({ message: "تعذر تصدير الملف حالياً", type: "error" });
    });
  };

  // DataTable Columns Definition
  const absenceColumns: ColumnDef<AbsenceRecord>[] = [
    {
      id: "teacherName",
      header: "المعلمة والتخصص",
      sortable: true,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200/70 text-[#137a85] flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
            {row.teacherName.charAt(0)}
          </div>
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => openTeacherProfileByName(row.teacherName, row.teacherId)}
              className="text-xs font-bold text-slate-900 hover:text-teal-700 transition-colors block truncate text-right cursor-pointer"
            >
              {row.teacherName}
            </button>
            <span className="text-[11px] text-slate-500 font-medium block truncate">
              {row.specialty || "عام"}
            </span>
          </div>
        </div>
      ),
    },
    {
      id: "date",
      header: "تاريخ الغياب",
      sortable: true,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
          <Calendar className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          <span dir="ltr" className="font-mono">{row.date}</span>
        </div>
      ),
    },
    {
      id: "type",
      header: "نوع الغياب",
      sortable: true,
      cell: ({ row }) => {
        const style = TYPE_STYLES[row.type] || TYPE_STYLES["أخرى"];
        return (
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border",
              style.bg,
              style.text,
              style.border
            )}
          >
            {row.type}
          </span>
        );
      },
    },
    {
      id: "reason",
      header: "السبب والمسوغ",
      cell: ({ row }) => (
        <span className="text-xs text-slate-600 line-clamp-1 max-w-xs" title={row.reason}>
          {row.reason || "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "الإجراءات",
      align: "center",
      cell: ({ row }) => {
        const menuItems: ActionMenuItem[] = [
          {
            id: "print",
            label: generatingId === row.id ? "جاري التجهيز..." : "طباعة استمارة المساءلة (PDF)",
            icon: FileText,
            onClick: () => handleExportPdf(row),
            disabled: generatingId === row.id,
          },
          {
            id: "profile",
            label: "عرض ملف المعلمة وسجلها",
            icon: Eye,
            onClick: () => openTeacherProfileByName(row.teacherName, row.teacherId),
          },
          {
            id: "edit",
            label: "تعديل بيانات السجل",
            icon: Pencil,
            onClick: () => setRecordToEdit(row),
          },
          {
            id: "archive",
            label: "نقل إلى الأرشيف الإداري",
            icon: Trash2,
            variant: "danger",
            onClick: () => setRecordToDelete(row),
          },
        ];

        return <ActionMenu items={menuItems} align="left" />;
      },
    },
  ];

  // Mobile Card Renderer for Absence Records
  const renderMobileAbsenceCard = (item: AbsenceRecord) => {
    const style = TYPE_STYLES[item.type] || TYPE_STYLES["أخرى"];
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-[#137a85] flex items-center justify-center font-bold text-xs shrink-0">
              {item.teacherName.charAt(0)}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-900 truncate">
                {item.teacherName}
              </h4>
              <p className="text-[11px] text-slate-500 truncate">
                {item.specialty}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "px-2.5 py-0.5 rounded-md text-[11px] font-bold border shrink-0",
              style.bg,
              style.text,
              style.border
            )}
          >
            {item.type}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-teal-600" />
            <span dir="ltr" className="font-mono text-slate-700">{item.date}</span>
          </div>
          {item.reason && (
            <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
              {item.reason}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleExportPdf(item)}
            className="text-xs py-1 h-8"
          >
            <FileText className="w-3.5 h-3.5 text-teal-700" />
            <span>طباعة المساءلة</span>
          </Button>

          <ActionMenu
            items={[
              {
                id: "profile",
                label: "عرض ملف المعلمة",
                icon: Eye,
                onClick: () => openTeacherProfileByName(item.teacherName, item.teacherId),
              },
              {
                id: "edit",
                label: "تعديل السجل",
                icon: Pencil,
                onClick: () => setRecordToEdit(item),
              },
              {
                id: "delete",
                label: "أرشفة السجل",
                icon: Trash2,
                variant: "danger",
                onClick: () => setRecordToDelete(item),
              },
            ]}
            align="left"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/60 pb-16">
      {/* Main Container */}
      <div className="flex-1 p-3.5 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Section 1: Hero Welcome & Quick Administrative Command */}
        <section className="bg-gradient-to-l from-[#137a85] to-[#0f666f] rounded-3xl p-5 sm:p-7 text-white shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-teal-100 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>مؤشر الانضباط المدرسي اليوم: {todayPulse.disciplineRate}%</span>
                <span className="text-white/40">|</span>
                <span>
                  {todayPulse.todayAbsences === 0
                    ? "انضباط كلي مسجل اليوم ✨"
                    : `${todayPulse.todayAbsences} حالات غياب`}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white leading-tight">
                مركز القيادة والمتابعة الإدارية
              </h1>
              <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed">
                متابعة لحظية للدوام، رصد الغياب والتأخر، إصدار المساءلات الرسمية، ومراقبة استحقاقات الحسم المالي آلياً وفق اللائحة التعليمية المعتمدة.
              </p>
            </div>

            {/* Direct Procedure Triggers */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <Link href="/procedures/absence">
                <Button
                  variant="primary"
                  size="md"
                  className="bg-white text-teal-900 hover:bg-teal-50 border-white shadow-sm font-bold"
                >
                  <Plus className="w-4 h-4 text-teal-700 stroke-[2.5]" />
                  <span>رصد غياب</span>
                </Button>
              </Link>
              <Link href="/procedures/delay-notice">
                <Button
                  variant="warning"
                  size="md"
                  className="bg-amber-400 text-slate-950 hover:bg-amber-300 border-amber-400 shadow-sm font-bold"
                >
                  <Clock className="w-4 h-4 stroke-[2.5]" />
                  <span>إشعار تأخر</span>
                </Button>
              </Link>
              <Link href="/procedures/deduction-hours">
                <Button
                  variant="danger"
                  size="md"
                  className="bg-rose-600 text-white hover:bg-rose-700 border-rose-600 shadow-sm font-bold"
                >
                  <ShieldAlert className="w-4 h-4 stroke-[2.5]" />
                  <span>قرار حسم</span>
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Section 2: Proactive Critical Alert Banner (if any) */}
        {proactiveAlerts.length > 0 && proactiveAlerts[0].severity === "critical" && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs sm:text-sm text-rose-950">
                    {proactiveAlerts[0].title}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-800 text-[10px] font-bold">
                    إجراء فوري مطلوب
                  </span>
                </div>
                <p className="text-xs text-rose-800 mt-0.5">
                  {proactiveAlerts[0].description}
                </p>
              </div>
            </div>

            {proactiveAlerts[0].actionUrl && (
              <Link href={proactiveAlerts[0].actionUrl} className="shrink-0">
                <Button size="sm" variant="danger" className="text-xs">
                  {proactiveAlerts[0].actionLabel || "معالجة التنبيه الآن"}
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Section 3: 4 Unified Executive KPI Cards */}
        <section aria-label="مؤشرات الانضباط اليومي" className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          <KpiCard
            title="غيابات اليوم"
            value={`${todayPulse.todayAbsences} معلمة`}
            subtitle={todayPulse.todayAbsences === 0 ? "انضباط كلي اليوم ✨" : "حالات غياب مسجلة"}
            icon={<Users className="w-5 h-5" />}
            iconBgColor={todayPulse.todayAbsences > 0 ? "bg-rose-50" : "bg-slate-50"}
            iconColor={todayPulse.todayAbsences > 0 ? "text-rose-600" : "text-slate-400"}
          />

          <KpiCard
            title="تأخر وخروج اليوم"
            value={`${todayPulse.todayDelays} حالة`}
            subtitle={todayPulse.todayDelays === 0 ? "لا يوجد تأخر مرصود" : "إشعارات مسجلة اليوم"}
            icon={<Clock className="w-5 h-5" />}
            iconBgColor={todayPulse.todayDelays > 0 ? "bg-amber-50" : "bg-slate-50"}
            iconColor={todayPulse.todayDelays > 0 ? "text-amber-600" : "text-slate-400"}
          />

          <KpiCard
            title="استحقاق الحسم المالي"
            value={`${todayPulse.teachersDueCount} معلمات`}
            subtitle={`إجمالي: ${todayPulse.totalUnexcusedHours} ساعة تأخر`}
            icon={<ShieldAlert className="w-5 h-5" />}
            iconBgColor={todayPulse.teachersDueCount > 0 ? "bg-rose-50" : "bg-emerald-50"}
            iconColor={todayPulse.teachersDueCount > 0 ? "text-rose-600" : "text-emerald-600"}
          />

          <KpiCard
            title="معاملات بانتظار الاعتماد"
            value={`${todayPulse.totalPendingMatters} إجراء`}
            subtitle="مساءلات بانتظار الإفادة أو التوجيه"
            icon={<Activity className="w-5 h-5" />}
            iconBgColor={todayPulse.totalPendingMatters > 0 ? "bg-teal-50" : "bg-slate-50"}
            iconColor={todayPulse.totalPendingMatters > 0 ? "text-teal-700" : "text-slate-400"}
          />
        </section>

        {/* Section 4: Main Interactive Tabs */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("records")}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0",
                activeTab === "records"
                  ? "bg-[#137a85] text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <FileText className="w-4 h-4" />
              <span>سجلات الغياب والمساءلات</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-mono font-bold",
                  activeTab === "records" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                )}
              >
                {absenceRecords.filter((r) => !r.isArchived).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("radar")}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0",
                activeTab === "radar"
                  ? "bg-[#137a85] text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>الرادار الإداري للتنبيهات</span>
              {proactiveAlerts.length > 0 && (
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-mono font-bold",
                    activeTab === "radar" ? "bg-rose-500 text-white" : "bg-rose-100 text-rose-700"
                  )}
                >
                  {proactiveAlerts.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("analytics")}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0",
                activeTab === "analytics"
                  ? "bg-[#137a85] text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <TrendingUp className="w-4 h-4" />
              <span>التحليلات والمؤشرات البيانية</span>
            </button>
          </div>

          {/* Tab 1: Records Table */}
          {activeTab === "records" && (
            <Card variant="default">
              <DataTable<AbsenceRecord>
                data={activeAbsences}
                columns={absenceColumns}
                keyExtractor={(item) => item.id}
                title="أحدث إجراءات ومساءلات الغياب"
                subtitle="إدارة مباشرة لآخر المساءلات المسجلة مع إمكانية إصدار نموذج 20 الرسمي بنقرة واحدة"
                searchPlaceholder="البحث باسم المعلمة، التخصص، أو تاريخ الغياب..."
                searchFilterKeys={["teacherName", "specialty", "type", "date", "reason"]}
                defaultPageSize={10}
                onExportExcel={handleExportExcel}
                exportLabel="تصدير السجلات Excel"
                mobileCardRenderer={renderMobileAbsenceCard}
                filtersSlot={
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {(["all", "اضطراري", "مرضي", "مرافق", "أخرى"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTypeFilter(t)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0",
                          selectedTypeFilter === t
                            ? "bg-[#137a85] text-white shadow-2xs font-bold"
                            : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80"
                        )}
                      >
                        {t === "all" ? "الكل" : t}
                      </button>
                    ))}
                  </div>
                }
                actionsSlot={
                  <Link href="/procedures/absence">
                    <Button variant="primary" size="sm" className="gap-1.5 text-xs">
                      <Plus className="w-3.5 h-3.5" />
                      <span>مساءلة جديدة</span>
                    </Button>
                  </Link>
                }
                emptyTitle="لا توجد مساءلات مسجلة"
                emptyDescription="لم يتم تسجيل أي حالات غياب تطابق خيارات التصفية الحالية."
                emptyAction={{
                  label: "إصدار مساءلة جديدة",
                  onClick: () => router.push("/procedures/absence"),
                }}
              />
            </Card>
          )}

          {/* Tab 2: Smart Radar Section */}
          {activeTab === "radar" && (
            <SmartRadarSection alerts={proactiveAlerts} />
          )}

          {/* Tab 3: Analytics Charts */}
          {activeTab === "analytics" && (
            <Card variant="default" className="p-4 sm:p-6">
              <AbsenceCharts />
            </Card>
          )}
        </section>
      </div>

      {/* Teacher Profile Modal */}
      <TeacherProfileModal
        teacher={selectedTeacherForProfile}
        onClose={() => setSelectedTeacherForProfile(null)}
      />

      {/* Edit Absence Modal */}
      <EditAbsenceModal
        record={recordToEdit}
        isOpen={Boolean(recordToEdit)}
        onClose={() => setRecordToEdit(null)}
        onSaved={() => {
          showToast({
            message: "تم تحديث بيانات سجل المساءلة بنجاح",
            type: "success",
          });
        }}
      />

      {/* Confirm Deletion / Archive Dialog */}
      <ConfirmDialog
        isOpen={Boolean(recordToDelete)}
        onCancel={() => setRecordToDelete(null)}
        onConfirm={confirmDeleteRecord}
        title="أرشفة سجل الغياب"
        message={`هل أنتِ متأكدة من رغبتكِ في نقل سجل غياب المعلمة (${recordToDelete?.teacherName}) بتاريخ (${recordToDelete?.date}) إلى الأرشيف الإداري؟`}
        confirmLabel="نقل إلى الأرشيف"
        variant="archive"
        showReasonInput={true}
      />
    </div>
  );
}
