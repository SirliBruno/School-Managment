"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Trash2,
  Eye,
  UserPlus,
  Phone,
  MessageCircle,
  Pencil,
  Sparkles,
  Clock,
  ShieldAlert,
  Calendar,
  RotateCcw,
  FileSpreadsheet,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { useToast } from "@/context/ToastContext";
import { Teacher } from "@/types/teacher";
import {
  calculateSchoolDelaySummaries,
  TeacherDelaySummary,
} from "@/lib/delayDeductionIntegration";
import { TeacherProfileModal } from "@/components/teachers/TeacherProfileModal";
import { AddTeacherModal } from "@/components/teachers/AddTeacherModal";
import { SendInquiryModal } from "@/components/procedures/SendInquiryModal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import {
  DataTable,
  ColumnDef,
  ActionMenu,
  ActionMenuItem,
  Button,
} from "@/components/ui";
import { cn } from "@/lib/utils";

type FilterStatus = "all" | "دائم" | "عقد" | "with_absence";

export const TeacherTable: React.FC = () => {
  const router = useRouter();
  const {
    teachers,
    delayNotices,
    deductionDecisions,
    deleteTeacher,
    clearTeachers,
    loadOfficialTeachers,
    isLoading,
  } = useTeachers();
  const { showToast } = useToast();

  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>("all");
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [teacherToEdit, setTeacherToEdit] = useState<Teacher | null>(null);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isImportingOfficial, setIsImportingOfficial] = useState(false);
  const [selectedTeacherForProfile, setSelectedTeacherForProfile] =
    useState<Teacher | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSendInquiryModalOpen, setIsSendInquiryModalOpen] = useState(false);
  const [inquiryTeacherId, setInquiryTeacherId] = useState<string | undefined>(
    undefined
  );

  // Summary map of unexcused delays and deduction statuses
  const delaySummaryMap = useMemo(() => {
    const summaries = calculateSchoolDelaySummaries(
      teachers,
      delayNotices,
      deductionDecisions
    );
    const map = new Map<string, TeacherDelaySummary>();
    for (const s of summaries) {
      map.set(s.teacherId, s);
    }
    return map;
  }, [teachers, delayNotices, deductionDecisions]);

  const handleConfirmClearAll = () => {
    clearTeachers();
    setIsClearAllModalOpen(false);
    showToast({
      message: "تم حذف كافة بيانات المعلمات بنجاح وتفريغ المنصة بالكامل",
      type: "success",
    });
  };

  const handleLoadOfficialTeachers = () => {
    setIsImportingOfficial(true);
    try {
      const count = loadOfficialTeachers();
      showToast({
        message: `تم استيراد قائمة الكادر التعليمي المعتمد (${count} معلمة) بنجاح وببيانات مكتملة 100%`,
        type: "success",
      });
    } finally {
      setIsImportingOfficial(false);
    }
  };

  // Active (non-archived) teachers only
  const activeTeachers = useMemo(
    () => teachers.filter((t) => !t.isArchived),
    [teachers]
  );

  // Status filtered list
  const filteredTeachers = useMemo(() => {
    return activeTeachers.filter((t) => {
      if (selectedStatus === "دائم" && t.employmentStatus !== "دائم") {
        return false;
      }
      if (selectedStatus === "عقد" && t.employmentStatus !== "عقد") {
        return false;
      }
      if (selectedStatus === "with_absence" && (t.totalAbsences || 0) <= 0) {
        return false;
      }
      return true;
    });
  }, [activeTeachers, selectedStatus]);

  // Archive execution with toast
  const confirmDelete = (reason?: string) => {
    if (teacherToDelete) {
      deleteTeacher(teacherToDelete.id, reason);
      setTeacherToDelete(null);

      showToast({
        message: "تم نقل المعلمة إلى الأرشيف الإداري بنجاح",
        type: "success",
        action: {
          label: "عرض الأرشيف",
          onClick: () => router.push("/archive"),
        },
      });
    }
  };

  const permanentCount = activeTeachers.filter(
    (t) => t.employmentStatus === "دائم"
  ).length;
  const contractCount = activeTeachers.filter(
    (t) => t.employmentStatus === "عقد"
  ).length;
  const withAbsenceCount = activeTeachers.filter(
    (t) => (t.totalAbsences || 0) > 0
  ).length;

  // Export to Excel
  const handleExportExcel = () => {
    import("xlsx").then((xlsx) => {
      const dataToExport = filteredTeachers.map((t, i) => {
        const summary = delaySummaryMap.get(t.id);
        return {
          "م": i + 1,
          "اسم المعلمة": t.fullName || t.name,
          "رقم السجل المدني / الهوية": t.nationalId || t.username || t.jobNumber,
          "التخصص": t.specialty || "عام",
          "مجال التدريس": t.teachingField || "—",
          "المسمى الوظيفي": t.jobTitle || "معلم",
          "حالة التوظيف": t.employmentStatus || "دائم",
          "رقم الجوال": t.mobile || "—",
          "أيام الغياب": t.totalAbsences || 0,
          "ساعات التأخر غير المعذورة": summary ? (summary.totalUnexcusedMinutes / 60).toFixed(1) : "0",
          "حالة الحسم": summary?.status === "due_for_deduction" ? "مستحقة حسم" : "منتظمة",
        };
      });

      const ws = xlsx.utils.json_to_sheet(dataToExport);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "سجل المعلمات");
      xlsx.writeFile(wb, `سجل_المعلمات_${new Date().toISOString().split("T")[0]}.xlsx`);
      showToast({ message: "تم تصدير سجل المعلمات بنجاح", type: "success" });
    }).catch(() => {
      showToast({ message: "تعذر تصدير الملف حالياً", type: "error" });
    });
  };

  // DataTable Columns Definition
  const columns: ColumnDef<Teacher>[] = [
    {
      id: "name",
      header: "اسم المعلمة ورقم الهوية",
      sortable: true,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/80 text-[#137a85] flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
            {(row.fullName || row.name || "م").charAt(0)}
          </div>
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => setSelectedTeacherForProfile(row)}
              className="text-xs sm:text-sm font-bold text-slate-900 hover:text-teal-700 transition-colors block truncate text-right cursor-pointer"
            >
              {row.fullName || row.name}
            </button>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-slate-500 font-mono" dir="ltr">
                {row.nationalId || row.username || row.jobNumber}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-[11px] text-teal-700 font-medium">
                {row.jobTitle || "معلم"}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "specialty",
      header: "التخصص والمجال",
      sortable: true,
      cell: ({ row }) => (
        <div className="min-w-0">
          <span className="text-xs font-semibold text-slate-800 block truncate">
            {row.specialty || "عام"}
          </span>
          <span className="text-[11px] text-slate-400 block truncate">
            {row.teachingField || "—"}
          </span>
        </div>
      ),
    },
    {
      id: "employmentStatus",
      header: "حالة التوظيف",
      align: "center",
      sortable: true,
      cell: ({ row }) => {
        const isContract = row.employmentStatus === "عقد";
        return (
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border",
              isContract
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-emerald-50 text-emerald-800 border-emerald-200"
            )}
          >
            {row.employmentStatus || "دائم"}
          </span>
        );
      },
    },
    {
      id: "mobile",
      header: "الجوال والتواصل",
      cell: ({ row }) => {
        const rawPhone = row.mobile ? String(row.mobile).trim() : "";
        const cleanDigits = rawPhone.replace(/\D/g, "");
        const formattedMobile = cleanDigits.startsWith("966")
          ? cleanDigits
          : cleanDigits.startsWith("05")
          ? "966" + cleanDigits.slice(1)
          : cleanDigits
          ? "966" + cleanDigits
          : "";

        return (
          <div className="flex items-center gap-2">
            {rawPhone ? (
              <>
                <span className="text-xs font-mono text-slate-700" dir="ltr">
                  {rawPhone}
                </span>
                {formattedMobile && (
                  <a
                    href={`https://wa.me/${formattedMobile}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                    title="مراسلة عبر واتساب"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </a>
                )}
              </>
            ) : (
              <span className="text-xs text-slate-400">—</span>
            )}
          </div>
        );
      },
    },
    {
      id: "totalAbsences",
      header: "الغياب",
      align: "center",
      sortable: true,
      cell: ({ row }) => {
        const count = row.totalAbsences || 0;
        return (
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold font-mono border",
              count > 0
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-slate-50 text-slate-600 border-slate-200"
            )}
          >
            {count} {count === 1 ? "يوم" : count === 2 ? "يومان" : "أيام"}
          </span>
        );
      },
    },
    {
      id: "delays",
      header: "موقف التأخر والحسم",
      align: "center",
      cell: ({ row }) => {
        const summary = delaySummaryMap.get(row.id);
        const status = summary?.status || "regular";
        const hours = summary ? (summary.totalUnexcusedMinutes / 60).toFixed(1) : "0";

        if (status === "due_for_deduction") {
          return (
            <Link
              href="/procedures/deduction-hours"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500 text-white shadow-2xs hover:bg-rose-600 transition-colors"
              title="تجاوزت المعلمة نصاب 7 ساعات — إصدار قرار حسم"
            >
              <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
              <span>مستحقة حسم ({hours} س)</span>
            </Link>
          );
        }

        if (status === "warning") {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>إنذار قرب النصاب ({hours} س)</span>
            </span>
          );
        }

        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>منتظمة ({hours} س)</span>
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
            id: "profile",
            label: "عرض الملف الشامل",
            icon: Eye,
            onClick: () => setSelectedTeacherForProfile(row),
          },
          {
            id: "absence",
            label: "تسجيل مساءلة غياب",
            icon: Calendar,
            onClick: () => {
              setInquiryTeacherId(row.id);
              setIsSendInquiryModalOpen(true);
            },
          },
          {
            id: "delay",
            label: "تسجيل إشعار تأخر",
            icon: Clock,
            onClick: () => router.push("/procedures/delay-notice"),
          },
          {
            id: "edit",
            label: "تعديل البيانات الوظيفية",
            icon: Pencil,
            onClick: () => setTeacherToEdit(row),
          },
          {
            id: "delete",
            label: "نقل إلى الأرشيف الإداري",
            icon: Trash2,
            variant: "danger",
            onClick: () => setTeacherToDelete(row),
          },
        ];

        return <ActionMenu items={menuItems} align="left" />;
      },
    },
  ];

  // Mobile Card Renderer
  const renderMobileTeacherCard = (teacher: Teacher) => {
    const summary = delaySummaryMap.get(teacher.id);
    const status = summary?.status || "regular";
    const hours = summary ? (summary.totalUnexcusedMinutes / 60).toFixed(1) : "0";
    const rawPhone = teacher.mobile ? String(teacher.mobile).trim() : "";
    const cleanDigits = rawPhone.replace(/\D/g, "");
    const formattedMobile = cleanDigits.startsWith("966")
      ? cleanDigits
      : cleanDigits.startsWith("05")
      ? "966" + cleanDigits.slice(1)
      : cleanDigits
      ? "966" + cleanDigits
      : "";

    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-[#137a85] flex items-center justify-center font-bold text-sm shrink-0">
              {(teacher.fullName || teacher.name || "م").charAt(0)}
            </div>
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => setSelectedTeacherForProfile(teacher)}
                className="text-xs sm:text-sm font-bold text-slate-900 truncate block text-right"
              >
                {teacher.fullName || teacher.name}
              </button>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                <span>{teacher.specialty || "عام"}</span>
                <span className="text-slate-300">•</span>
                <span dir="ltr" className="font-mono text-slate-600">
                  {teacher.nationalId || teacher.username || teacher.jobNumber}
                </span>
              </div>
            </div>
          </div>

          <span
            className={cn(
              "px-2 py-0.5 rounded-md text-[11px] font-bold border shrink-0",
              teacher.employmentStatus === "عقد"
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-emerald-50 text-emerald-800 border-emerald-200"
            )}
          >
            {teacher.employmentStatus || "دائم"}
          </span>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500">أيام الغياب:</span>
            <span className="font-bold text-slate-800 font-mono">
              {teacher.totalAbsences || 0} يوم
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500">ساعات التأخر:</span>
            <span
              className={cn(
                "font-bold font-mono",
                status === "due_for_deduction" ? "text-rose-600" : "text-slate-800"
              )}
            >
              {hours} س
            </span>
          </div>
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            {formattedMobile && (
              <a
                href={`https://wa.me/${formattedMobile}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>واتساب</span>
              </a>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedTeacherForProfile(teacher)}
              className="text-xs py-1 h-8"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>الملف</span>
            </Button>
          </div>

          <ActionMenu
            items={[
              {
                id: "absence",
                label: "تسجيل مساءلة غياب",
                icon: Calendar,
                onClick: () => {
                  setInquiryTeacherId(teacher.id);
                  setIsSendInquiryModalOpen(true);
                },
              },
              {
                id: "delay",
                label: "تسجيل إشعار تأخر",
                icon: Clock,
                onClick: () => router.push("/procedures/delay-notice"),
              },
              {
                id: "edit",
                label: "تعديل البيانات",
                icon: Pencil,
                onClick: () => setTeacherToEdit(teacher),
              },
              {
                id: "delete",
                label: "أرشفة المعلمة",
                icon: Trash2,
                variant: "danger",
                onClick: () => setTeacherToDelete(teacher),
              },
            ]}
            align="left"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Smart DataTable */}
      <DataTable<Teacher>
        data={filteredTeachers}
        columns={columns}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        searchPlaceholder="البحث باسم المعلمة، السجل المدني، التخصص، الجوال..."
        searchFilterKeys={[
          "fullName",
          "name",
          "nationalId",
          "username",
          "jobNumber",
          "specialty",
          "teachingField",
          "mobile",
          "jobTitle",
        ]}
        defaultPageSize={10}
        onExportExcel={handleExportExcel}
        exportLabel="تصدير السجل Excel"
        mobileCardRenderer={renderMobileTeacherCard}
        filtersSlot={
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSelectedStatus("all")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0",
                selectedStatus === "all"
                  ? "bg-[#137a85] text-white shadow-2xs font-bold"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80"
              )}
            >
              الكل ({activeTeachers.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus("دائم")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0",
                selectedStatus === "دائم"
                  ? "bg-emerald-600 text-white shadow-2xs font-bold"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100/80 border border-emerald-200/60"
              )}
            >
              دائم ({permanentCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus("عقد")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0",
                selectedStatus === "عقد"
                  ? "bg-amber-600 text-white shadow-2xs font-bold"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100/80 border border-amber-200/60"
              )}
            >
              عقد ({contractCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatus("with_absence")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0",
                selectedStatus === "with_absence"
                  ? "bg-rose-600 text-white shadow-2xs font-bold"
                  : "bg-rose-50 text-rose-800 hover:bg-rose-100/80 border border-rose-200/60"
              )}
            >
              لديهن غياب ({withAbsenceCount})
            </button>
          </div>
        }
        actionsSlot={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="gap-1.5 text-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>إضافة معلمة</span>
            </Button>

            {activeTeachers.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadOfficialTeachers}
                disabled={isImportingOfficial}
                className="gap-1.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {isImportingOfficial ? "جاري الاستيراد..." : "استيراد الكادر المعتمد"}
                </span>
              </Button>
            )}

            {activeTeachers.length > 0 && (
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => setIsClearAllModalOpen(true)}
                className="text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف الكل</span>
              </Button>
            )}
          </div>
        }
        emptyTitle="لا توجد معلمات مسجلات"
        emptyDescription="لم يتم العثور على أي معلمات تطابق معايير التصفية الحالية، أو تم إفراغ المنصة."
        emptyAction={{
          label: "إضافة معلمة جديدة",
          onClick: () => setIsAddModalOpen(true),
        }}
      />

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(teacherToDelete)}
        title="نقل المعلمة إلى الأرشيف الإداري"
        message={
          teacherToDelete
            ? `المعلمة: "${teacherToDelete.fullName || teacherToDelete.name}" (${teacherToDelete.username || teacherToDelete.jobNumber})\nسيتم نقل المعلمة وجميع سجلاتها إلى الأرشيف الإداري. يمكنك استعادتها في أي وقت.`
            : ""
        }
        confirmLabel="نقل إلى الأرشيف"
        cancelLabel="إلغاء"
        variant="archive"
        showReasonInput={true}
        onConfirm={confirmDelete}
        onCancel={() => setTeacherToDelete(null)}
      />

      {/* Confirm Delete All Teachers Dialog */}
      <ConfirmDialog
        isOpen={isClearAllModalOpen}
        title="حذف كافة المعلمات من المنصة"
        message="هل أنتِ متأكدة من رغبتكِ في حذف كافة بيانات المعلمات وسجلات الغياب والتأخر التابعة لهن بالكامل من المنصة؟ هذا الإجراء سيفرغ المنصة تماماً لتتمكني من بدء استيراد نظيف."
        confirmLabel="نعم، حذف كافة البيانات"
        cancelLabel="إلغاء"
        variant="danger"
        showReasonInput={false}
        onConfirm={handleConfirmClearAll}
        onCancel={() => setIsClearAllModalOpen(false)}
      />

      {/* Manual Add / Edit Teacher Modal */}
      <AddTeacherModal
        isOpen={isAddModalOpen || Boolean(teacherToEdit)}
        teacherToEdit={teacherToEdit}
        onClose={() => {
          setIsAddModalOpen(false);
          setTeacherToEdit(null);
        }}
      />

      {/* Teacher Profile & Detailed History Modal */}
      {selectedTeacherForProfile && (
        <TeacherProfileModal
          teacher={selectedTeacherForProfile}
          onClose={() => setSelectedTeacherForProfile(null)}
        />
      )}

      {/* Send Inquiry Modal */}
      <SendInquiryModal
        isOpen={isSendInquiryModalOpen}
        onClose={() => {
          setIsSendInquiryModalOpen(false);
          setInquiryTeacherId(undefined);
        }}
        preselectedTeacherId={inquiryTeacherId}
      />
    </div>
  );
};
