"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Plus,
  Calendar,
  Loader2,
  CheckCircle2,
  AlertCircle,
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
  DoorOpen,
  ListTodo,
  FileBarChart,
  ArrowLeft,
  ChevronDown,
  Check,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, DEFAULT_ADMIN_NAME, DEFAULT_ADMIN_ROLE_LABEL } from "@/context/AuthContext";
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
} from "@/components/ui";
import {
  generateSchoolProactiveAlerts,
  getSchoolRadarKPIs,
} from "@/lib/delayDeductionIntegration";
import { getSaudiToday } from "@/lib/timeUtils";
import { EditAbsenceModal } from "@/components/procedures/EditAbsenceModal";
import { CreatePermissionModal } from "@/components/procedures/CreatePermissionModal";
import { CreateDelayNoticeModal } from "@/components/procedures/CreateDelayNoticeModal";
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

interface TimelineActivity {
  id: string;
  type: "absence" | "delay" | "permission" | "inquiry";
  title: string;
  teacherName: string;
  specialty?: string;
  date: string;
  badgeLabel: string;
  badgeVariant: "teal" | "amber" | "rose" | "blue" | "emerald";
  details?: string;
  rawAbsence?: AbsenceRecord;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    teachers,
    absenceRecords,
    delayNotices,
    deductionDecisions,
    inquiries,
    permissions,
    deleteAbsenceRecord,
  } = useTeachers();
  const { showToast } = useToast();

  const adminDisplayName = user?.fullName || DEFAULT_ADMIN_NAME;
  const adminRoleTitle =
    user?.role === "principal" ? "مديرة المدرسة" : DEFAULT_ADMIN_ROLE_LABEL;

  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [selectedTeacherForProfile, setSelectedTeacherForProfile] =
    useState<Teacher | null>(null);
  const [recordToEdit, setRecordToEdit] = useState<AbsenceRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<AbsenceRecord | null>(null);
  const [isCreatePermissionOpen, setIsCreatePermissionOpen] = useState(false);
  const [isCreateDelayNoticeOpen, setIsCreateDelayNoticeOpen] = useState(false);
  const [isQuickActionsDropdownOpen, setIsQuickActionsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<"records" | "analytics">("records");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<"all" | AbsenceType>("all");

  // Today in Saudi format (YYYY-MM-DD)
  const todayDateStr = useMemo(() => getSaudiToday(), []);

  // Close quick action dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsQuickActionsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
      pendingInquiriesCount,
      totalPendingMatters,
      teachersDueCount: radarKpis.teachersDueCount,
      totalUnexcusedHours: radarKpis.totalUnexcusedHours,
    };
  }, [teachers, absenceRecords, delayNotices, inquiries, todayDateStr, radarKpis]);

  // Radar Stream 1: Immediate Action Required (🔴 يحتاج إجراء الآن)
  const immediateActionItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      subtitle: string;
      badgeText: string;
      actionLabel: string;
      actionUrl: string;
      teacherName: string;
    }> = [];

    // Due teachers for deduction from proactiveAlerts
    proactiveAlerts
      .filter((a) => a.type === "due_for_deduction")
      .forEach((alert) => {
        items.push({
          id: alert.id,
          title: alert.teacherName,
          subtitle: alert.description,
          badgeText: "استحقاق حسم مالي",
          actionLabel: alert.actionLabel || "إصدار قرار حسم",
          actionUrl: alert.actionUrl || `/procedures/deduction-hours?teacherId=${alert.teacherId}`,
          teacherName: alert.teacherName,
        });
      });

    // Delay notices pending director approval
    delayNotices
      .filter((d) => !d.isArchived && d.status === "pending_director")
      .forEach((dn) => {
        items.push({
          id: `pending-delay-${dn.id}`,
          title: dn.teacherName || "معلمة",
          subtitle: `إشعار تأخر بتاريخ (${dn.noticeDate || dn.date}) بانتظار توقيع الإدارة`,
          badgeText: "اعتماد مطلوب",
          actionLabel: "مراجعة واعتماد",
          actionUrl: "/procedures/delay-notice",
          teacherName: dn.teacherName || "معلمة",
        });
      });

    return items;
  }, [proactiveAlerts, delayNotices]);

  // Radar Stream 2: Pending Follow-up (🟡 يحتاج متابعة)
  const pendingFollowUpItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      subtitle: string;
      badgeText: string;
      actionLabel: string;
      actionUrl: string;
      teacherName: string;
    }> = [];

    // WhatsApp inquiries pending teacher response
    inquiries
      .filter((i) => !i.isArchived && i.status === "pending")
      .forEach((inq) => {
        items.push({
          id: `pending-inq-${inq.id}`,
          title: inq.teacherName || "معلمة",
          subtitle: "مساءلة غياب أُرسلت عبر الواتساب وبانتظار تقديم الإفادة",
          badgeText: "بانتظار الإفادة",
          actionLabel: "متابعة المساءلة",
          actionUrl: "/procedures/absence",
          teacherName: inq.teacherName || "معلمة",
        });
      });

    // Warning alerts (e.g. approaching 7h threshold: 5 - 6.9 hours)
    proactiveAlerts
      .filter((a) => a.severity === "warning")
      .forEach((alert) => {
        items.push({
          id: alert.id,
          title: alert.teacherName,
          subtitle: alert.description,
          badgeText: "إنذار اقتراب النصاب",
          actionLabel: alert.actionLabel || "معاينة السجل",
          actionUrl: alert.actionUrl || "/procedures/delay-notice",
          teacherName: alert.teacherName,
        });
      });

    return items;
  }, [inquiries, proactiveAlerts]);

  // Radar Stream 3: Completed Today (🟢 مكتمل اليوم)
  const completedTodayItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      subtitle: string;
      badgeText: string;
      badgeVariant: "emerald" | "teal";
      actionLabel: string;
      rawAbsence?: AbsenceRecord;
      actionUrl?: string;
    }> = [];

    // Absences recorded today
    absenceRecords
      .filter((r) => !r.isArchived && r.date === todayDateStr)
      .forEach((abs) => {
        items.push({
          id: `abs-today-${abs.id}`,
          title: abs.teacherName,
          subtitle: `غياب (${abs.type}) - ${abs.reason || "تم الرصد بنجاح"}`,
          badgeText: "غياب موثق",
          badgeVariant: "teal",
          actionLabel: "طباعة المساءلة",
          rawAbsence: abs,
        });
      });

    // Permissions recorded today
    (permissions || [])
      .filter((p) => !p.isArchived && p.permissionDate === todayDateStr)
      .forEach((perm) => {
        items.push({
          id: `perm-today-${perm.id}`,
          title: perm.teacherName || "معلمة",
          subtitle: `استئذان (${perm.durationMinutes} دقيقة) من ${perm.exitTime} إلى ${perm.returnTime}`,
          badgeText: "استئذان معتمد",
          badgeVariant: "emerald",
          actionLabel: "عرض السجل",
          actionUrl: "/procedures/permissions",
        });
      });

    return items;
  }, [absenceRecords, permissions, todayDateStr]);

  // Unified Activity Timeline (top 8 recent operations)
  const timelineActivities = useMemo<TimelineActivity[]>(() => {
    const list: TimelineActivity[] = [];

    // Absences
    absenceRecords
      .filter((r) => !r.isArchived)
      .forEach((r) => {
        list.push({
          id: `t-abs-${r.id}`,
          type: "absence",
          title: `تم إنشاء مساءلة غياب (${r.type})`,
          teacherName: r.teacherName,
          specialty: r.specialty,
          date: r.date,
          badgeLabel: r.type,
          badgeVariant: r.type === "اضطراري" ? "rose" : r.type === "مرضي" ? "blue" : "teal",
          details: r.reason || "لا توجد تفاصيل إضافية",
          rawAbsence: r,
        });
      });

    // Delays
    delayNotices
      .filter((d) => !d.isArchived)
      .forEach((d) => {
        list.push({
          id: `t-del-${d.id}`,
          type: "delay",
          title: "تم توثيق إشعار تأخر / انصراف",
          teacherName: d.teacherName || "معلمة",
          date: d.noticeDate || d.date || todayDateStr,
          badgeLabel: d.status === "completed" ? "معتمد" : "قيد الإجراء",
          badgeVariant: d.status === "completed" ? "emerald" : "amber",
          details: d.calculatedDuration || (d.calculatedMinutes ? `${d.calculatedMinutes} دقيقة` : "تأخر مرصود"),
        });
      });

    // Permissions
    (permissions || [])
      .filter((p) => !p.isArchived)
      .forEach((p) => {
        list.push({
          id: `t-perm-${p.id}`,
          type: "permission",
          title: `تم اعتماد استئذان رسمي (${p.durationMinutes} دقيقة)`,
          teacherName: p.teacherName || "معلمة",
          date: p.permissionDate || todayDateStr,
          badgeLabel: "استئذان",
          badgeVariant: "blue",
          details: `السبب: ${p.reason || "شخصي"}`,
        });
      });

    // Inquiries
    inquiries
      .filter((i) => !i.isArchived)
      .forEach((i) => {
        list.push({
          id: `t-inq-${i.id}`,
          type: "inquiry",
          title: "تم إرسال مساءلة غياب عبر الواتساب",
          teacherName: i.teacherName || "معلمة",
          date: i.createdAt ? new Date(i.createdAt).toISOString().split("T")[0] : todayDateStr,
          badgeLabel: i.status === "submitted" || i.status === "approved" ? "تمت الإفادة" : i.status === "expired" ? "منتهية" : "بانتظار الرد",
          badgeVariant: i.status === "submitted" || i.status === "approved" ? "emerald" : i.status === "expired" ? "rose" : "amber",
          details: i.teacherReason ? `الإفادة: ${i.teacherReason}` : "بانتظار إفادة المعلمة",
        });
      });

    // Sort by date descending
    list.sort((a, b) => b.date.localeCompare(a.date));
    return list.slice(0, 6);
  }, [absenceRecords, delayNotices, permissions, inquiries, todayDateStr]);

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
    import("xlsx")
      .then((xlsx) => {
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
      })
      .catch(() => {
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
          <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200/70 text-[#137a85] flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
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
              "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border",
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
            <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-[#137a85] flex items-center justify-center font-bold text-xs shrink-0">
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
            className="inline-flex flex-row items-center gap-1.5 text-xs py-1 h-8 whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5 text-teal-700 shrink-0" />
            <span className="whitespace-nowrap">طباعة المساءلة</span>
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
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/70 pb-16">
      {/* Main Container */}
      <div className="flex-1 p-3.5 sm:p-6 lg:p-7 space-y-5 max-w-7xl w-full mx-auto">
        {/* Section 1: Compact, Elegant Welcome Header */}
        <header className="relative bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-xs z-20">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* User Greeting & Realtime Smart Summary */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">السلام عليكم،</span>
                <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                  أ. {adminDisplayName}
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200/80">
                  {adminRoleTitle} • الثانوية الخامسة مسارات
                </span>
              </div>

              {/* Dynamic Daily Summary Pills */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">لديكِ اليوم:</span>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-700 font-semibold border border-slate-200/90 shadow-2xs">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      todayPulse.pendingInquiriesCount > 0 ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                    )}
                  />
                  <span>
                    <strong className="font-bold text-slate-900">{todayPulse.pendingInquiriesCount}</strong> مساءلة تنتظر التوجيه
                  </span>
                </span>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-700 font-semibold border border-slate-200/90 shadow-2xs">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      todayPulse.teachersDueCount > 0 ? "bg-rose-500 animate-pulse" : "bg-emerald-500"
                    )}
                  />
                  <span>
                    <strong className="font-bold text-slate-900">{todayPulse.teachersDueCount}</strong> حالات حسم
                  </span>
                </span>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-700 font-semibold border border-slate-200/90 shadow-2xs">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      todayPulse.todayAbsences > 0 ? "bg-rose-500" : "bg-emerald-500"
                    )}
                  />
                  <span>
                    <strong className="font-bold text-slate-900">{todayPulse.todayAbsences}</strong> غياب اليوم
                  </span>
                </span>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/90 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>الانضباط: {todayPulse.disciplineRate}%</span>
                </span>
              </div>
            </div>

            {/* Primary Action Button with Animated Dropdown */}
            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsQuickActionsDropdownOpen((prev) => !prev)}
                className="inline-flex flex-row items-center justify-center gap-2.5 px-4.5 py-2.5 rounded-xl bg-gradient-to-b from-[#137a85] to-[#0c5961] hover:from-[#158894] hover:to-[#0f666f] text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
                aria-expanded={isQuickActionsDropdownOpen}
                aria-haspopup="menu"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>إجراء إداري جديد</span>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-teal-200 transition-transform duration-200",
                    isQuickActionsDropdownOpen && "rotate-180"
                  )}
                />
              </button>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {isQuickActionsDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsQuickActionsDropdownOpen(false)}
                      aria-hidden="true"
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      role="menu"
                      className="absolute left-0 top-full mt-2 w-64 rounded-2xl bg-white border border-slate-200/90 shadow-2xl p-2 z-50 space-y-1 text-right text-xs"
                    >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsQuickActionsDropdownOpen(false);
                        router.push("/procedures/absence");
                      }}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-slate-800 hover:bg-teal-50 hover:text-teal-950 font-bold transition-colors cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#137a85] group-hover:bg-[#137a85] group-hover:text-white flex items-center justify-center transition-colors">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="block truncate">تسجيل غياب ومساءلة</span>
                        <span className="text-[10px] text-slate-400 font-normal block truncate">إصدار نموذج مساءلة رسمي</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsQuickActionsDropdownOpen(false);
                        setIsCreatePermissionOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-slate-800 hover:bg-blue-50 hover:text-blue-950 font-bold transition-colors cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
                        <DoorOpen className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="block truncate">تسجيل استئذان</span>
                        <span className="text-[10px] text-slate-400 font-normal block truncate">توثيق خروج مؤقت واحتساب الرصيد</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsQuickActionsDropdownOpen(false);
                        setIsCreateDelayNoticeOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-slate-800 hover:bg-amber-50 hover:text-amber-950 font-bold transition-colors cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white flex items-center justify-center transition-colors">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="block truncate">تنبيه تأخر</span>
                        <span className="text-[10px] text-slate-400 font-normal block truncate">إشعار تأخر صباحي أو انصراف</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsQuickActionsDropdownOpen(false);
                        router.push("/procedures/deduction-hours");
                      }}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-slate-800 hover:bg-rose-50 hover:text-rose-950 font-bold transition-colors cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white flex items-center justify-center transition-colors">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="block truncate">قرار حسم</span>
                        <span className="text-[10px] text-slate-400 font-normal block truncate">حسم لمن بلغت 7 ساعات</span>
                      </div>
                    </button>

                    <div className="h-px bg-slate-100 my-1" />

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsQuickActionsDropdownOpen(false);
                        router.push("/reports");
                      }}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-slate-800 hover:bg-purple-50 hover:text-purple-950 font-bold transition-colors cursor-pointer group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center transition-colors">
                        <FileBarChart className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="block truncate">إنشاء تقرير</span>
                        <span className="text-[10px] text-slate-400 font-normal block truncate">حصر إداري وطباعة مجمعة</span>
                      </div>
                    </button>
                  </motion.div>
                </>
              )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Section 2: Reorganized Quick Actions (Hierarchical: Daily vs Admin Tools) */}
        <section aria-label="الإجراءات السريعة" className="space-y-2">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            {/* Daily Actions (Most Used) - 6 cols */}
            <div className="lg:col-span-6 space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  الإجراءات اليومية (الأكثر استخداماً)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Card 1: تسجيل غياب */}
                <Link
                  href="/procedures/absence"
                  className="group relative p-3.5 rounded-2xl bg-white hover:bg-teal-50/30 border border-slate-200/90 hover:border-teal-300 transition-all duration-150 shadow-2xs hover:shadow-xs flex items-center gap-3 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#137a85] group-hover:bg-[#137a85] group-hover:text-white flex items-center justify-center shrink-0 border border-teal-200/80 transition-colors shadow-2xs">
                    <FileText className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-[#0c535b] block truncate">
                      تسجيل غياب ومساءلة
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      رصد غياب أو إثبات عذر
                    </span>
                  </div>
                </Link>

                {/* Card 2: تسجيل استئذان (Modal) */}
                <button
                  type="button"
                  onClick={() => setIsCreatePermissionOpen(true)}
                  className="group relative p-3.5 rounded-2xl bg-white hover:bg-blue-50/30 border border-slate-200/90 hover:border-blue-300 transition-all duration-150 shadow-2xs hover:shadow-xs flex items-center gap-3 text-right cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center shrink-0 border border-blue-200/80 transition-colors shadow-2xs">
                    <DoorOpen className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-blue-900 block truncate">
                      تسجيل استئذان موظفة
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      توثيق خروج مؤقت
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Administrative Tools - 6 cols */}
            <div className="lg:col-span-6 space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  أدوات الإدارة والمتابعة
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Card 3: تنبيه تأخر (Modal) */}
                <button
                  type="button"
                  onClick={() => setIsCreateDelayNoticeOpen(true)}
                  className="group relative p-3 rounded-2xl bg-white hover:bg-amber-50/30 border border-slate-200/90 hover:border-amber-300 transition-all duration-150 shadow-2xs hover:shadow-xs flex items-center gap-2.5 text-right cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white flex items-center justify-center shrink-0 border border-amber-200/80 transition-colors shadow-2xs">
                    <Clock className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-amber-900 block truncate">
                      تنبيه تأخر
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      صباحي / انصراف
                    </span>
                  </div>
                </button>

                {/* Card 4: قرار حسم */}
                <Link
                  href="/procedures/deduction-hours"
                  className="group relative p-3 rounded-2xl bg-white hover:bg-rose-50/30 border border-slate-200/90 hover:border-rose-300 transition-all duration-150 shadow-2xs hover:shadow-xs flex items-center gap-2.5 cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white flex items-center justify-center shrink-0 border border-rose-200/80 transition-colors shadow-2xs">
                    <ShieldAlert className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-rose-900 block truncate">
                      قرار حسم
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      نصاب 7 ساعات
                    </span>
                  </div>
                </Link>

                {/* Card 5: التقارير والحصر */}
                <Link
                  href="/reports"
                  className="group relative p-3 rounded-2xl bg-white hover:bg-purple-50/30 border border-slate-200/90 hover:border-purple-300 transition-all duration-150 shadow-2xs hover:shadow-xs flex items-center gap-2.5 cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center shrink-0 border border-purple-200/80 transition-colors shadow-2xs">
                    <FileBarChart className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-purple-900 block truncate">
                      التقارير والحصر
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      تصدير وإحصاء
                    </span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: High-Impact KPI Cards (Large, Bold Numbers) */}
        <section aria-label="مؤشرات الانضباط اليومي" className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* KPI 1 */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">غيابات اليوم</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#137a85] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {todayPulse.todayAbsences}
              </span>
              <span className="text-xs font-medium text-slate-400">معلمة</span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              {todayPulse.todayAbsences === 0 ? "انضباط كلي مسجل اليوم ✨" : `${todayPulse.todayAbsences} حالات مرصودة`}
            </p>
          </div>

          {/* KPI 2 */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">تأخر وخروج اليوم</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {todayPulse.todayDelays}
              </span>
              <span className="text-xs font-medium text-slate-400">حالة</span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              {todayPulse.todayDelays === 0 ? "لا توجد حالات جديدة" : `${todayPulse.todayDelays} إشعارات مسجلة`}
            </p>
          </div>

          {/* KPI 3 */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">استحقاق الحسم المالي</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {todayPulse.teachersDueCount}
              </span>
              <span className="text-xs font-medium text-slate-400">معلمة</span>
            </div>
            <p className="text-[11px] text-slate-500 truncate" dir="rtl">
              إجمالي: <strong className="font-mono text-slate-800">{todayPulse.totalUnexcusedHours}</strong> س غير مسوّغة
            </p>
          </div>

          {/* KPI 4 */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">معاملات بانتظار الاعتماد</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                {todayPulse.totalPendingMatters}
              </span>
              <span className="text-xs font-medium text-slate-400">معاملة</span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              {todayPulse.totalPendingMatters === 0 ? "كافة الإجراءات مكتملة ✓" : "بانتظار الإفادة والتوجيه"}
            </p>
          </div>
        </section>

        {/* Section 4: Daily Administrative Radar (الرادار الإداري اليومي - مركز القرار الفوري) */}
        <section aria-label="الرادار الإداري اليومي" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#137a85]" />
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                الرادار الإداري اليومي
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              مركز القرار والمتابعة الفورية
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
            {/* Stream 1: 🔴 يحتاج إجراء الآن */}
            <div className="bg-white rounded-2xl border border-rose-200/80 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-rose-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <h3 className="text-xs sm:text-sm font-bold text-rose-950">
                    يحتاج إجراء الآن
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-mono font-bold">
                  {immediateActionItems.length}
                </span>
              </div>

              {immediateActionItems.length === 0 ? (
                <div className="py-7 text-center space-y-1.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">لا توجد إجراءات معلقة حالياً</p>
                  <p className="text-[11px] text-slate-400">ممتاز، جميع الحالات تحت السيطرة والانضباط مكتمل.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto custom-scrollbar pr-0.5">
                  {immediateActionItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-rose-50/50 border border-rose-200/90 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                          <p className="text-[11px] text-rose-800 mt-0.5 leading-snug">
                            {item.subtitle}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-rose-200 text-rose-900 text-[10px] font-bold shrink-0">
                          {item.badgeText}
                        </span>
                      </div>

                      <div className="pt-1 flex justify-end">
                        <Link href={item.actionUrl}>
                          <Button
                            size="sm"
                            variant="danger"
                            className="text-xs py-1 h-7 inline-flex flex-row items-center gap-1.5 whitespace-nowrap"
                          >
                            <span>{item.actionLabel}</span>
                            <ArrowLeft className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stream 2: 🟡 يحتاج متابعة */}
            <div className="bg-white rounded-2xl border border-amber-200/80 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-amber-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <h3 className="text-xs sm:text-sm font-bold text-amber-950">
                    يحتاج متابعة
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-mono font-bold">
                  {pendingFollowUpItems.length}
                </span>
              </div>

              {pendingFollowUpItems.length === 0 ? (
                <div className="py-7 text-center space-y-1.5">
                  <div className="w-9 h-9 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-200">
                    <Check className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">لا توجد مساءلات معلقة</p>
                  <p className="text-[11px] text-slate-400">جميع إفادات وتبريرات المعلمات مستوفاة.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto custom-scrollbar pr-0.5">
                  {pendingFollowUpItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/90 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                          <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">
                            {item.subtitle}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 text-[10px] font-bold shrink-0">
                          {item.badgeText}
                        </span>
                      </div>

                      <div className="pt-1 flex justify-end">
                        <Link href={item.actionUrl}>
                          <Button
                            size="sm"
                            variant="warning"
                            className="text-xs py-1 h-7 inline-flex flex-row items-center gap-1.5 whitespace-nowrap"
                          >
                            <span>{item.actionLabel}</span>
                            <ArrowLeft className="w-3 h-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stream 3: 🟢 مكتمل اليوم */}
            <div className="bg-white rounded-2xl border border-emerald-200/80 p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h3 className="text-xs sm:text-sm font-bold text-emerald-950">
                    مكتمل اليوم
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-mono font-bold">
                  {completedTodayItems.length}
                </span>
              </div>

              {completedTodayItems.length === 0 ? (
                <div className="py-7 text-center space-y-1.5">
                  <div className="w-9 h-9 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-200">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">لا توجد عمليات مسجلة لتاريخ اليوم</p>
                  <p className="text-[11px] text-slate-400">العمليات المنجزة اليوم ستظهر هنا تلقائياً.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto custom-scrollbar pr-0.5">
                  {completedTodayItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-200/90 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                          <p className="text-[11px] text-emerald-800 mt-0.5 leading-snug">
                            {item.subtitle}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 shrink-0">
                          {item.badgeText}
                        </span>
                      </div>

                      <div className="pt-1 flex justify-end">
                        {item.rawAbsence ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExportPdf(item.rawAbsence!)}
                            className="text-xs py-1 h-7 inline-flex flex-row items-center gap-1.5 whitespace-nowrap text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                          >
                            <span>{item.actionLabel}</span>
                          </Button>
                        ) : item.actionUrl ? (
                          <Link href={item.actionUrl}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs py-1 h-7 inline-flex flex-row items-center gap-1.5 whitespace-nowrap text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                            >
                              <span>{item.actionLabel}</span>
                            </Button>
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 5: Activity Timeline (آخر العمليات) */}
        <section aria-label="آخر العمليات والأنشطة" className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">آخر العمليات</h3>
              <p className="text-xs text-slate-500 mt-0.5">تسلسل زمني لآخر الأنشطة والإجراءات المنفذة</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("records")}
              className="text-xs font-bold text-[#137a85] hover:text-[#0c5961] hover:underline cursor-pointer"
            >
              عرض جميع العمليات ←
            </button>
          </div>

          {timelineActivities.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              لا توجد أنشطة مسجلة حتى الآن.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {timelineActivities.map((act) => (
                <div
                  key={act.id}
                  className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {act.teacherName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {act.teacherName}
                        </span>
                        <span
                          className={cn(
                            "px-2 py-0.2 rounded text-[10px] font-bold border shrink-0",
                            act.badgeVariant === "rose" && "bg-rose-50 text-rose-700 border-rose-200",
                            act.badgeVariant === "blue" && "bg-blue-50 text-blue-700 border-blue-200",
                            act.badgeVariant === "teal" && "bg-teal-50 text-teal-700 border-teal-200",
                            act.badgeVariant === "amber" && "bg-amber-50 text-amber-800 border-amber-200",
                            act.badgeVariant === "emerald" && "bg-emerald-50 text-emerald-800 border-emerald-200"
                          )}
                        >
                          {act.badgeLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {act.title} {act.details ? `• ${act.details}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-[11px] font-mono text-slate-500" dir="ltr">
                      {act.date}
                    </span>
                    {act.rawAbsence && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExportPdf(act.rawAbsence!)}
                        className="text-xs py-1 h-7 inline-flex flex-row items-center gap-1 whitespace-nowrap"
                      >
                        <FileText className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                        <span>طباعة</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 6: Comprehensive Records Hub (DataTable & Analytics) */}
        <section className="space-y-3 pt-1">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("records")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0",
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
              onClick={() => setActiveTab("analytics")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0",
                activeTab === "analytics"
                  ? "bg-[#137a85] text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <TrendingUp className="w-4 h-4" />
              <span>التحليلات والمؤشرات البيانية</span>
            </button>
          </div>

          {/* Tab 1: Absence Records Table */}
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
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                    {(["all", "اضطراري", "مرضي", "مرافق", "أخرى"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTypeFilter(t)}
                        className={cn(
                          "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border",
                          selectedTypeFilter === t
                            ? "bg-[#137a85] text-white border-[#137a85] shadow-2xs font-extrabold"
                            : "bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200/80"
                        )}
                      >
                        {t === "all" ? "الكل" : t}
                      </button>
                    ))}
                  </div>
                }
                actionsSlot={
                  <Link href="/procedures/absence">
                    <Button
                      variant="primary"
                      size="sm"
                      className="inline-flex flex-row items-center gap-2 px-4 py-2 text-xs font-bold shadow-2xs whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4 shrink-0" />
                      <span className="whitespace-nowrap">مساءلة جديدة</span>
                    </Button>
                  </Link>
                }
                emptyTitle="لا توجد مساءلات مسجلة"
                emptyDescription="لم يتم تسجيل أي حالات غياب تطابق خيارات التصفية الحالية. يمكنك البدء بإصدار إجراء مساءلة جديد للمعلمة."
                emptyAction={{
                  label: "أضف مساءلة جديدة",
                  onClick: () => router.push("/procedures/absence"),
                }}
              />
            </Card>
          )}

          {/* Tab 2: Analytics Charts */}
          {activeTab === "analytics" && (
            <Card variant="default" className="p-4 sm:p-6">
              <AbsenceCharts />
            </Card>
          )}
        </section>
      </div>

      {/* Direct Permission Modal */}
      <CreatePermissionModal
        isOpen={isCreatePermissionOpen}
        onClose={() => setIsCreatePermissionOpen(false)}
      />

      {/* Direct Delay Notice Modal */}
      <CreateDelayNoticeModal
        isOpen={isCreateDelayNoticeOpen}
        onClose={() => setIsCreateDelayNoticeOpen(false)}
      />

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
