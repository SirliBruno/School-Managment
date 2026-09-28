"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  Plus,
  Users,
  Eye,
  Pencil,
  Trash2,
  FileEdit,
  ShieldCheck,
  Calendar,
  LogIn,
  LogOut,
  DoorOpen,
  Share2,
  FileDown,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { useToast } from "@/context/ToastContext";
import { DelayNotice, DelayNoticeStatus } from "@/types/teacher";
import { CreateDelayNoticeModal } from "@/components/procedures/CreateDelayNoticeModal";
import { TeacherResponseModal } from "@/components/procedures/TeacherResponseModal";
import { DirectorDecisionModal } from "@/components/procedures/DirectorDecisionModal";
import { DelayNoticeDetailsModal } from "@/components/procedures/DelayNoticeDetailsModal";
import { ShareDelayNoticeModal } from "@/components/procedures/ShareDelayNoticeModal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { printDelayNoticePdf } from "@/lib/printDelayNoticePdfService";
import {
  PageHeader,
  KpiCard,
  Button,
  DataTable,
  ColumnDef,
  ActionMenu,
  ActionMenuItem,
} from "@/components/ui";
import { cn } from "@/lib/utils";

type FilterTab = "all" | DelayNoticeStatus;

export default function DelayNoticePage() {
  const router = useRouter();
  const { delayNotices, teachers, deleteDelayNotice } = useTeachers();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [noticeToEdit, setNoticeToEdit] = useState<DelayNotice | null>(null);
  const [selectedNoticeForDetails, setSelectedNoticeForDetails] =
    useState<DelayNotice | null>(null);
  const [selectedNoticeForShare, setSelectedNoticeForShare] =
    useState<DelayNotice | null>(null);
  const [selectedNoticeForResponse, setSelectedNoticeForResponse] =
    useState<DelayNotice | null>(null);
  const [selectedNoticeForDecision, setSelectedNoticeForDecision] =
    useState<DelayNotice | null>(null);
  const [noticeToDelete, setNoticeToDelete] = useState<DelayNotice | null>(null);

  const activeDelayNotices = useMemo(
    () => delayNotices.filter((n) => !n.isArchived),
    [delayNotices]
  );

  // Statistics
  const totalCount = activeDelayNotices.length;
  const pendingTeacherCount = activeDelayNotices.filter(
    (n) => n.status === "pending_teacher"
  ).length;
  const pendingDirectorCount = activeDelayNotices.filter(
    (n) => n.status === "pending_director"
  ).length;
  const completedCount = activeDelayNotices.filter(
    (n) => n.status === "completed"
  ).length;

  // Filtered list by activeTab
  const filteredNotices = useMemo(() => {
    if (activeTab === "all") return activeDelayNotices;
    return activeDelayNotices.filter((n) => n.status === activeTab);
  }, [activeDelayNotices, activeTab]);

  // Handle Soft-Delete to Archive with Toast Link
  const handleConfirmDelete = async (reason?: string) => {
    if (!noticeToDelete) return;
    const target = noticeToDelete;
    setNoticeToDelete(null);

    const { deletedNotice } = deleteDelayNotice(target.id, reason);
    if (deletedNotice) {
      showToast({
        message: "تم نقل العنصر إلى الأرشيف الإداري بنجاح",
        type: "success",
        action: {
          label: "عرض الأرشيف",
          onClick: () => router.push("/archive"),
        },
      });
    } else {
      showToast({
        message: "تعذر نقل التنبيه إلى الأرشيف.",
        type: "error",
      });
    }
  };

  const handleQuickPrint = (notice: DelayNotice) => {
    try {
      printDelayNoticePdf(notice);
      showToast({
        message: "تم تجهيز نموذج التنبيه الرسمي للطباعة.",
        type: "success",
      });
    } catch (err) {
      console.error("فشل طباعة التنبيه:", err);
      showToast({ message: "حدث خطأ أثناء إعداد الـ PDF.", type: "error" });
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    import("xlsx").then((xlsx) => {
      const dataToExport = filteredNotices.map((n, i) => ({
        "م": i + 1,
        "رقم التنبيه": n.noticeNumber || `ت-${n.id.slice(-4)}`,
        "تاريخ التنبيه": n.noticeDate || n.date,
        "اسم المعلمة": n.teacherName,
        "السجل المدني": n.jobNumber || "—",
        "التخصص": n.specialty || "عام",
        "تأخر بداية الدوام": n.violationDelayStart ? `${n.delayStartTime || "نعم"}` : "لا",
        "عدم تواجد أثناء الدوام": n.violationAbsentDuring ? `${n.absentFromTime} - ${n.absentToTime}` : "لا",
        "انصراف مبكر": n.violationEarlyDeparture ? `${n.earlyDepartureTime || "نعم"}` : "لا",
        "المدة المحتسبة": n.calculatedDuration || "—",
        "حالة التنبيه":
          n.status === "completed"
            ? "مكتمل"
            : n.status === "pending_director"
            ? "بانتظار قرار المديرة"
            : "بانتظار إفادة المعلمة",
      }));

      const ws = xlsx.utils.json_to_sheet(dataToExport);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "تنبيهات التأخر");
      xlsx.writeFile(wb, `تنبيهات_التأخر_${new Date().toISOString().split("T")[0]}.xlsx`);
      showToast({ message: "تم تصدير ملف الإكسل بنجاح", type: "success" });
    }).catch(() => {
      showToast({ message: "تعذر تصدير الملف حالياً", type: "error" });
    });
  };

  // DataTable Columns
  const columns: ColumnDef<DelayNotice>[] = [
    {
      id: "noticeNumber",
      header: "رقم وتاريخ التنبيه",
      sortable: true,
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          <span className="font-mono font-bold text-[#137a85] text-xs block">
            {row.noticeNumber || `ت-${row.id.slice(-4)}`}
          </span>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="font-mono">{row.noticeDate || row.date}</span>
          </div>
        </div>
      ),
    },
    {
      id: "teacherName",
      header: "المعلمة",
      sortable: true,
      cell: ({ row }) => (
        <div>
          <span className="font-bold text-slate-900 text-xs block">
            {row.teacherName}
          </span>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
            <span className="font-mono">{row.jobNumber}</span>
            <span>•</span>
            <span>{row.specialty || "عام"}</span>
          </div>
        </div>
      ),
    },
    {
      id: "violations",
      header: "المخالفات الموثقة",
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-1.5 max-w-sm">
          {row.violationDelayStart && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-[10px] font-semibold">
              <LogIn className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>تأخر بداية الدوام</span>
            </span>
          )}
          {row.violationAbsentDuring && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-[10px] font-semibold">
              <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>عدم تواجد</span>
            </span>
          )}
          {row.violationEarlyDeparture && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-[10px] font-semibold">
              <LogOut className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>انصراف مبكر</span>
            </span>
          )}
          {row.violationLeftSchool && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-[10px] font-semibold">
              <DoorOpen className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>خروج دون إذن</span>
            </span>
          )}
          {row.calculatedDuration && (
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold">
              {row.calculatedDuration}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "status",
      header: "الحالة والمرحلة",
      align: "center",
      sortable: true,
      cell: ({ row }) => {
        if (row.status === "completed") {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>مكتمل ومعتمد</span>
            </span>
          );
        }
        if (row.status === "pending_director") {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 animate-pulse">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>بانتظار قرار المديرة</span>
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80">
            <FileEdit className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>بانتظار إفادة المعلمة</span>
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "الإجراءات",
      align: "center",
      cell: ({ row }) => {
        const menuItems: ActionMenuItem[] = [
          {
            id: "details",
            label: "عرض المراحل والتفاصيل",
            icon: Eye,
            onClick: () => setSelectedNoticeForDetails(row),
          },
          {
            id: "print",
            label: "طباعة النموذج الرسمي (PDF)",
            icon: FileDown,
            onClick: () => handleQuickPrint(row),
          },
          {
            id: "share",
            label: "مشاركة الرابط والواتساب",
            icon: Share2,
            onClick: () => setSelectedNoticeForShare(row),
          },
        ];

        if (row.status === "pending_teacher") {
          menuItems.push({
            id: "response",
            label: "تسجيل إفادة المعلمة",
            icon: FileEdit,
            onClick: () => setSelectedNoticeForResponse(row),
          });
          menuItems.push({
            id: "edit",
            label: "تعديل بيانات التنبيه",
            icon: Pencil,
            onClick: () => {
              setNoticeToEdit(row);
              setIsCreateModalOpen(true);
            },
          });
        }

        if (row.status === "pending_director") {
          menuItems.push({
            id: "decision",
            label: "اتخاذ قرار المديرة",
            icon: ShieldCheck,
            onClick: () => setSelectedNoticeForDecision(row),
          });
        }

        menuItems.push({
          id: "delete",
          label: "نقل إلى الأرشيف الإداري",
          icon: Trash2,
          variant: "danger",
          onClick: () => setNoticeToDelete(row),
        });

        return (
          <div className="flex items-center justify-center gap-1.5">
            {row.status === "pending_teacher" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedNoticeForResponse(row)}
                className="text-[11px] h-7 px-2 border-sky-200 dark:border-sky-800/80 text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60"
              >
                <span>الإفادة</span>
              </Button>
            )}

            {row.status === "pending_director" && (
              <Button
                size="sm"
                variant="warning"
                onClick={() => setSelectedNoticeForDecision(row)}
                className="text-[11px] h-7 px-2"
              >
                <span>القرار</span>
              </Button>
            )}

            <ActionMenu items={menuItems} align="left" />
          </div>
        );
      },
    },
  ];

  // Mobile Card Renderer
  const renderMobileNoticeCard = (notice: DelayNotice) => {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div>
            <span className="font-mono font-bold text-[#137a85] dark:text-teal-400 text-xs block">
              {notice.noticeNumber || `ت-${notice.id.slice(-4)}`}
            </span>
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm mt-0.5">
              {notice.teacherName}
            </h4>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              <span>{notice.specialty || "عام"}</span>
              <span>•</span>
              <span className="font-mono">{notice.noticeDate || notice.date}</span>
            </div>
          </div>

          <div>
            {notice.status === "completed" ? (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
                مكتمل
              </span>
            ) : notice.status === "pending_director" ? (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                قرار المديرة
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-900/50">
                إفادة المعلمة
              </span>
            )}
          </div>
        </div>

        {/* Violations tags */}
        <div className="flex flex-wrap gap-1 text-xs">
          {notice.violationDelayStart && (
            <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 text-[10px]">
              تأخر بداية
            </span>
          )}
          {notice.violationAbsentDuring && (
            <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 text-[10px]">
              عدم تواجد
            </span>
          )}
          {notice.violationEarlyDeparture && (
            <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 text-[10px]">
              انصراف مبكر
            </span>
          )}
          {notice.calculatedDuration && (
            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold">
              {notice.calculatedDuration}
            </span>
          )}
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            {notice.status === "pending_teacher" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedNoticeForResponse(notice)}
                className="text-xs py-1 h-8"
              >
                <span>تسجيل الإفادة</span>
              </Button>
            )}

            {notice.status === "pending_director" && (
              <Button
                size="sm"
                variant="warning"
                onClick={() => setSelectedNoticeForDecision(notice)}
                className="text-xs py-1 h-8"
              >
                <span>اتخاذ القرار</span>
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleQuickPrint(notice)}
              className="text-xs py-1 h-8"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>PDF</span>
            </Button>
          </div>

          <ActionMenu
            items={[
              {
                id: "details",
                label: "عرض المراحل والتفاصيل",
                icon: Eye,
                onClick: () => setSelectedNoticeForDetails(notice),
              },
              {
                id: "share",
                label: "مشاركة الرابط والواتساب",
                icon: Share2,
                onClick: () => setSelectedNoticeForShare(notice),
              },
              {
                id: "delete",
                label: "نقل إلى الأرشيف",
                icon: Trash2,
                variant: "danger",
                onClick: () => setNoticeToDelete(notice),
              },
            ]}
            align="left"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/60 dark:bg-slate-950 pb-16">
      {/* Top Header */}
      <PageHeader
        breadcrumbs={[
          { label: "الإجراءات الإدارية", href: "/procedures/list" },
          { label: "تنبيه عن تأخر / انصراف" },
        ]}
        title="تنبيه عن تأخر / انصراف"
        badge="نموذج و.م.ع.ن - ٠٢ - ٠٢"
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setNoticeToEdit(null);
                setIsCreateModalOpen(true);
              }}
            >
              إصدار تنبيه جديد
            </Button>

            <Link
              href="/teachers"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs"
            >
              <Users className="w-4 h-4 text-[#137a85] dark:text-teal-400" />
              <span>سجل المعلمات ({teachers.length})</span>
            </Link>
          </div>
        }
      />

      {/* Main Content Body */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* KPI Mini-Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          <KpiCard
            title="إجمالي تنبيهات التأخر"
            value={totalCount}
            variant="teal"
            icon={<Clock className="w-5 h-5" />}
          />
          <KpiCard
            title="بانتظار إفادة المعلمة"
            value={pendingTeacherCount}
            variant="sky"
            icon={<FileEdit className="w-5 h-5" />}
          />
          <KpiCard
            title="بانتظار قرار المديرة"
            value={pendingDirectorCount}
            variant="amber"
            icon={<ShieldCheck className="w-5 h-5" />}
          />
          <KpiCard
            title="تنبيهات مكتملة"
            value={completedCount}
            variant="emerald"
            icon={<ShieldCheck className="w-5 h-5" />}
          />
        </div>

        {/* Smart DataTable */}
        <DataTable<DelayNotice>
          data={filteredNotices}
          columns={columns}
          keyExtractor={(item) => item.id}
          searchPlaceholder="البحث برقم التنبيه، اسم المعلمة، أو السجل..."
          searchFilterKeys={["noticeNumber", "teacherName", "jobNumber", "specialty", "noticeDate", "date"]}
          defaultPageSize={10}
          onExportExcel={handleExportExcel}
          exportLabel="تصدير التنبيهات Excel"
          mobileCardRenderer={renderMobileNoticeCard}
          filtersSlot={
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0",
                  activeTab === "all"
                    ? "bg-[#137a85] text-white shadow-2xs font-bold"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/80 dark:hover:bg-slate-700"
                )}
              >
                الكل ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pending_teacher")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0",
                  activeTab === "pending_teacher"
                    ? "bg-sky-600 text-white shadow-2xs font-bold"
                    : "bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 hover:bg-sky-100/80 dark:hover:bg-sky-900/50 border border-sky-200/60 dark:border-sky-900/50"
                )}
              >
                إفادة المعلمة ({pendingTeacherCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pending_director")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0",
                  activeTab === "pending_director"
                    ? "bg-amber-600 text-white shadow-2xs font-bold"
                    : "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 hover:bg-amber-100/80 dark:hover:bg-amber-900/50 border border-amber-200/60 dark:border-amber-900/50"
                )}
              >
                قرار المديرة ({pendingDirectorCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("completed")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0",
                  activeTab === "completed"
                    ? "bg-emerald-600 text-white shadow-2xs font-bold"
                    : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50 border border-emerald-200/60 dark:border-emerald-900/50"
                )}
              >
                مكتمل ({completedCount})
              </button>
            </div>
          }
          actionsSlot={
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                setNoticeToEdit(null);
                setIsCreateModalOpen(true);
              }}
              className="text-xs"
            >
              إصدار تنبيه جديد
            </Button>
          }
          emptyTitle="لا توجد تنبيهات مسجلة"
          emptyDescription="لم يتم العثور على أي تنبيهات تأخر تطابق خيارات التصفية الحالية."
          emptyAction={{
            label: "إصدار تنبيه جديد",
            onClick: () => {
              setNoticeToEdit(null);
              setIsCreateModalOpen(true);
            },
          }}
        />
      </main>

      {/* 1. Modal: Create / Edit Delay Notice (Stage 1) */}
      <CreateDelayNoticeModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setNoticeToEdit(null);
        }}
        noticeToEdit={noticeToEdit}
      />

      {/* 2. Modal: Share Delay Notice with Teacher (Public Link & WhatsApp) */}
      <ShareDelayNoticeModal
        isOpen={Boolean(selectedNoticeForShare)}
        onClose={() => setSelectedNoticeForShare(null)}
        notice={selectedNoticeForShare}
      />

      {/* 3. Modal: Teacher Response (Stage 2) */}
      <TeacherResponseModal
        isOpen={Boolean(selectedNoticeForResponse)}
        onClose={() => setSelectedNoticeForResponse(null)}
        notice={selectedNoticeForResponse}
      />

      {/* 4. Modal: Director Decision (Stage 3) */}
      <DirectorDecisionModal
        isOpen={Boolean(selectedNoticeForDecision)}
        onClose={() => setSelectedNoticeForDecision(null)}
        notice={selectedNoticeForDecision}
      />

      {/* 5. Modal: Full 3-Stage Details */}
      <DelayNoticeDetailsModal
        isOpen={Boolean(selectedNoticeForDetails)}
        onClose={() => setSelectedNoticeForDetails(null)}
        notice={selectedNoticeForDetails}
        onOpenEdit={(n) => {
          setNoticeToEdit(n);
          setIsCreateModalOpen(true);
        }}
        onOpenTeacherResponse={(n) => setSelectedNoticeForResponse(n)}
        onOpenDirectorDecision={(n) => setSelectedNoticeForDecision(n)}
        onOpenShare={(n) => setSelectedNoticeForShare(n)}
        onOpenDelete={(n) => setNoticeToDelete(n)}
      />

      {/* 6. Archive Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(noticeToDelete)}
        title="نقل تنبيه التأخر إلى الأرشيف"
        message={
          noticeToDelete
            ? `المعلمة: "${noticeToDelete.teacherName || "المعلمة"}" — تنبيه رقم (${noticeToDelete.noticeNumber || `ت-${noticeToDelete.id.slice(-4)}`})\nسيتم نقل التنبيه إلى الأرشيف الإداري وتحديث عداد المعلمة تلقائياً.`
            : ""
        }
        confirmLabel="نقل إلى الأرشيف"
        cancelLabel="إلغاء"
        variant="archive"
        showReasonInput={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setNoticeToDelete(null)}
      />
    </div>
  );
}
