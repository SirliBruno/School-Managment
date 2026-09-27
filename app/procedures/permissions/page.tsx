"use client";

import React, { useState, useMemo } from "react";
import {
  DoorOpen,
  Plus,
  Clock,
  Users,
  Calendar,
  Eye,
  Pencil,
  Trash2,
  FileDown,
  Timer,
  Search,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { useToast } from "@/context/ToastContext";
import { EmployeePermission, Teacher } from "@/types/teacher";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { ActionMenu, ActionMenuItem } from "@/components/ui/ActionMenu";
import { PageHeader, KpiCard, Button } from "@/components/ui";
import { CreatePermissionModal } from "@/components/procedures/CreatePermissionModal";
import { printPermissionPdf } from "@/lib/printPermissionPdfService";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { getSaudiToday } from "@/lib/timeUtils";
import { cn } from "@/lib/utils";

export default function PermissionsManagementPage() {
  const {
    teachers,
    permissions,
    deletePermission,
    isLoading,
  } = useTeachers();
  const { showToast } = useToast();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [permissionToEdit, setPermissionToEdit] = useState<EmployeePermission | null>(null);
  const [permissionToDelete, setPermissionToDelete] = useState<EmployeePermission | null>(null);
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>("all");

  const activePermissions = useMemo(() => {
    return (permissions || []).filter((p) => !p.isArchived);
  }, [permissions]);

  // Teachers map for quick lookup
  const teachersMap = useMemo(() => {
    const map = new Map<string, Teacher>();
    teachers.forEach((t) => map.set(t.id, t));
    return map;
  }, [teachers]);

  // Current Month Permissions (for KPIs)
  const currentMonthStr = useMemo(() => {
    const today = getSaudiToday();
    const parts = today.split("-");
    return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : "";
  }, []);

  const monthPermissions = useMemo(() => {
    if (!currentMonthStr) return activePermissions;
    return activePermissions.filter((p) => p.permissionDate.startsWith(currentMonthStr));
  }, [activePermissions, currentMonthStr]);

  // KPI Calculations
  const totalMonthPermissionsCount = monthPermissions.length;
  const uniqueMonthTeachersCount = useMemo(() => {
    return new Set(monthPermissions.map((p) => p.teacherId)).size;
  }, [monthPermissions]);

  const totalMonthMinutes = useMemo(() => {
    return monthPermissions.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
  }, [monthPermissions]);

  const averageDurationMinutes = useMemo(() => {
    if (totalMonthPermissionsCount === 0) return 0;
    return Math.round(totalMonthMinutes / totalMonthPermissionsCount);
  }, [totalMonthPermissionsCount, totalMonthMinutes]);

  // Filtered List
  const filteredPermissions = useMemo(() => {
    if (selectedTeacherFilter === "all") return activePermissions;
    return activePermissions.filter((p) => p.teacherId === selectedTeacherFilter);
  }, [activePermissions, selectedTeacherFilter]);

  const handlePrint = (perm: EmployeePermission) => {
    const teacher = teachersMap.get(perm.teacherId);
    try {
      printPermissionPdf({ permission: perm, teacher });
      showToast({
        message: "تم تجهيز استمارة الاستئذان الرسمية للطباعة بنجاح",
        type: "success",
      });
    } catch {
      showToast({ message: "تعذر فتح نافذة الطباعة", type: "error" });
    }
  };

  const confirmDelete = () => {
    if (permissionToDelete) {
      deletePermission(permissionToDelete.id, "أرشفة يدوية من صفحة الاستئذان");
      setPermissionToDelete(null);
      showToast({
        message: "تم نقل سجل الاستئذان إلى الأرشيف الإداري بنجاح",
        type: "success",
      });
    }
  };

  // Table Columns Definition
  const columns: ColumnDef<EmployeePermission>[] = [
    {
      id: "index",
      header: "#",
      width: "50px",
      align: "center",
      cell: ({ index }) => <span className="font-mono text-slate-400 font-bold">{index + 1}</span>,
    },
    {
      id: "teacherName",
      header: "اسم الموظفة",
      accessorKey: "teacherName",
      cell: ({ row }) => {
        const teacher = teachersMap.get(row.teacherId);
        return (
          <div className="space-y-0.5">
            <span className="font-black text-slate-900 block">{teacher?.fullName || row.teacherName || "—"}</span>
            <span className="text-slate-400 text-2xs font-mono block">
              سجل: {teacher?.nationalId || row.nationalId || "—"} • {teacher?.specialty || row.specialty || "عام"}
            </span>
          </div>
        );
      },
    },
    {
      id: "date",
      header: "التاريخ",
      accessorKey: "permissionDate",
      align: "center",
      cell: ({ row }) => {
        let dayName = "";
        try {
          dayName = new Date(row.permissionDate).toLocaleDateString("ar-SA", { weekday: "short" });
        } catch {}
        return (
          <div className="text-center font-mono">
            <span className="font-bold text-slate-800 block text-xs">{row.permissionDate}</span>
            {dayName && <span className="text-[10px] text-teal-700 block font-sans">{dayName}</span>}
          </div>
        );
      },
    },
    {
      id: "exitTime",
      header: "وقت الخروج",
      accessorKey: "exitTime",
      align: "center",
      cell: ({ row }) => (
        <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80 text-xs" dir="ltr">
          {row.exitTime}
        </span>
      ),
    },
    {
      id: "returnTime",
      header: "وقت العودة",
      accessorKey: "returnTime",
      align: "center",
      cell: ({ row }) => (
        <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/80 text-xs" dir="ltr">
          {row.returnTime}
        </span>
      ),
    },
    {
      id: "durationMinutes",
      header: "مدة الاستئذان",
      accessorKey: "durationMinutes",
      align: "center",
      cell: ({ row }) => {
        const hrs = Math.floor(row.durationMinutes / 60);
        const mins = row.durationMinutes % 60;
        let txt = `${row.durationMinutes} دقيقة`;
        if (hrs > 0) txt = `${hrs} س و ${mins} د`;
        return (
          <span className="font-mono font-black text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg text-xs">
            {txt}
          </span>
        );
      },
    },
    {
      id: "reason",
      header: "مبررات الخروج",
      accessorKey: "reason",
      cell: ({ row }) => (
        <div className="max-w-xs space-y-0.5" title={row.reason}>
          <p className="truncate font-semibold text-slate-800">{row.reason}</p>
          {row.notes && <p className="truncate text-slate-400 text-2xs">ملاحظة: {row.notes}</p>}
        </div>
      ),
    },
    {
      id: "status",
      header: "الحالة",
      align: "center",
      cell: () => (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
          <CheckCircle2 className="w-3 h-3 shrink-0" />
          <span>معتمد وموثق</span>
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
            label: "طباعة استمارة الاستئذان",
            icon: FileDown,
            onClick: () => handlePrint(row),
          },
          {
            id: "edit",
            label: "تعديل تفاصيل الاستئذان",
            icon: Pencil,
            onClick: () => {
              setPermissionToEdit(row);
              setIsCreateModalOpen(true);
            },
          },
          {
            id: "archive",
            label: "نقل للأرشيف الإداري",
            icon: Trash2,
            variant: "danger",
            onClick: () => setPermissionToDelete(row),
          },
        ];

        return (
          <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
            <Button
              variant="outline"
              size="sm"
              icon={<FileDown className="w-3.5 h-3.5" />}
              onClick={() => handlePrint(row)}
              title="طباعة الاستمارة الرسمية A4"
            >
              طباعة
            </Button>

            <ActionMenu items={menuItems} align="left" />
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <PageHeader
        title="سجل استئذان الموظفين"
        breadcrumbs={[
          { label: "نظام الإدارة المدرسية", href: "/" },
          { label: "الإجراءات الإدارية" },
          { label: "استئذان الموظفين" },
        ]}
        description="إدارة ومتابعة حالات خروج الموظفات أثناء الدوام الرسمي، وتوثيق أوقات الخروج والعودة وحساب المدد بدقة"
        actionButtons={
          <Button
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
            onClick={() => {
              setPermissionToEdit(null);
              setIsCreateModalOpen(true);
            }}
          >
            تسجيل استئذان جديد
          </Button>
        }
      />

      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto" dir="rtl">
        {/* KPI Cards Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="إجمالي استئذانات الشهر"
            value={totalMonthPermissionsCount}
            subtitle={<span className="text-xs text-teal-700 font-medium">الشهر الحالي</span>}
            icon={<Calendar className="w-5 h-5" />}
            iconBgColor="bg-teal-50"
            iconColor="text-[#137a85]"
          />
          <KpiCard
            title="الموظفات المستأذنات"
            value={uniqueMonthTeachersCount}
            subtitle={<span className="text-xs text-slate-400 font-medium">من أصل {teachers.length} موظفة</span>}
            icon={<Users className="w-5 h-5" />}
            iconBgColor="bg-cyan-50"
            iconColor="text-cyan-700"
          />
          <KpiCard
            title="إجمالي دقائق الاستئذان"
            value={totalMonthMinutes}
            subtitle={<span className="text-xs text-amber-700 font-medium">تعادل {(totalMonthMinutes / 60).toFixed(1)} ساعة</span>}
            icon={<Clock className="w-5 h-5" />}
            iconBgColor="bg-amber-50"
            iconColor="text-amber-700"
          />
          <KpiCard
            title="متوسط مدة الاستئذان"
            value={averageDurationMinutes}
            subtitle={<span className="text-xs text-indigo-700 font-medium">دقيقة / حالة</span>}
            icon={<Timer className="w-5 h-5" />}
            iconBgColor="bg-indigo-50"
            iconColor="text-indigo-700"
          />
        </div>

      {/* Main Table Container */}
      <DataTable<EmployeePermission>
        data={filteredPermissions}
        columns={columns}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        title="سجل حالات الاستئذان المعتمدة"
        subtitle="توثيق معتمد إلكترونياً لجميع أوقات الخروج والعودة مع خيار طباعة الاستمارة الإدارية A4"
        searchPlaceholder="البحث باسم الموظفة، السجل المدني، مبررات الاستئذان..."
        searchFilterKeys={["teacherName", "nationalId", "reason", "permissionDate", "notes"]}
        filtersSlot={
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-600 whitespace-nowrap">
              تصفية بالمعلمة:
            </label>
            <select
              value={selectedTeacherFilter}
              onChange={(e) => setSelectedTeacherFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#137a85]"
            >
              <option value="all">جميع المعلمات ({activePermissions.length})</option>
              {teachers
                .filter((t) => !t.isArchived)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName}
                  </option>
                ))}
            </select>
          </div>
        }
      />

      </main>

      {/* Create / Edit Permission Modal */}
      <CreatePermissionModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setPermissionToEdit(null);
        }}
        permissionToEdit={permissionToEdit}
      />

      {/* Delete / Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(permissionToDelete)}
        title="أرشفة سجل الاستئذان"
        message={`هل أنتِ متأكدة من رغبتك في نقل استئذان المعلمة (${permissionToDelete?.teacherName || ""}) بتاريخ ${permissionToDelete?.permissionDate || ""} إلى الأرشيف الإداري؟ يمكنك استعادته في أي وقت.`}
        confirmLabel="نقل للأرشيف"
        variant="archive"
        onConfirm={confirmDelete}
        onCancel={() => setPermissionToDelete(null)}
      />
    </div>
  );
}
