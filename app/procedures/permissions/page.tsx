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
            <button
              type="button"
              onClick={() => handlePrint(row)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap bg-teal-50 text-[#137a85] hover:bg-[#137a85] hover:text-white border border-teal-200 transition-all cursor-pointer shadow-2xs"
              title="طباعة الاستمارة الرسمية A4"
            >
              <FileDown className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">طباعة</span>
            </button>

            <ActionMenu items={menuItems} align="left" />
          </div>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 md:p-8 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* Top Banner Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#137a85] text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>نظام الانضباط وخروج الموظفين</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            سجل استئذان الموظفين
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl">
            إدارة ومتابعة حالات خروج الموظفات أثناء الدوام الرسمي، وتوثيق أوقات الخروج والعودة وحساب المدد بدقة.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setPermissionToEdit(null);
            setIsCreateModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold whitespace-nowrap bg-[#137a85] text-white hover:bg-teal-700 active:scale-[0.98] shadow-2xs hover:shadow-xs transition-all cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
          <span className="whitespace-nowrap">تسجيل استئذان جديد</span>
        </button>
      </div>

      {/* KPI Cards Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Month Permissions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">إجمالي استئذانات الشهر</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#137a85] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 font-mono">
              {totalMonthPermissionsCount}
            </span>
            <span className="text-xs font-bold text-slate-400">حالة خروج</span>
          </div>
          <p className="text-[11px] text-teal-700 mt-2 font-medium">الشهر الحالي</p>
        </div>

        {/* Card 2: Unique Teachers Count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">الموظفات المستأذنات</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 font-mono">
              {uniqueMonthTeachersCount}
            </span>
            <span className="text-xs font-bold text-slate-400">من أصل {teachers.length}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">موظفة مستفيدة</p>
        </div>

        {/* Card 3: Total Minutes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">إجمالي دقائق الاستئذان</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 font-mono">
              {totalMonthMinutes}
            </span>
            <span className="text-xs font-bold text-slate-400">دقيقة</span>
          </div>
          <p className="text-[11px] text-amber-700 mt-2 font-medium">
            تعادل {(totalMonthMinutes / 60).toFixed(1)} ساعة تقريباً
          </p>
        </div>

        {/* Card 4: Average Duration */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">متوسط مدة الاستئذان</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Timer className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 font-mono">
              {averageDurationMinutes}
            </span>
            <span className="text-xs font-bold text-slate-400">دقيقة / حالة</span>
          </div>
          <p className="text-[11px] text-indigo-700 mt-2 font-medium">متوسط زمن الخروج</p>
        </div>
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
