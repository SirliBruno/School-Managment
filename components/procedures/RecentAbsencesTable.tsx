"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Trash2,
  Calendar,
  FileCheck2,
  FileDown,
  Loader2,
  ExternalLink,
  Pencil,
  Eye,
  FileText,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { useToast } from "@/context/ToastContext";
import { AbsenceRecord, AbsenceType, Teacher } from "@/types/teacher";
import { EditAbsenceModal } from "@/components/procedures/EditAbsenceModal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { printAbsencePdf } from "@/lib/printPdfService";
import {
  DataTable,
  ColumnDef,
  ActionMenu,
  ActionMenuItem,
} from "@/components/ui";
import { cn } from "@/lib/utils";

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

export const RecentAbsencesTable: React.FC = () => {
  const router = useRouter();
  const { absenceRecords, teachers, deleteAbsenceRecord } = useTeachers();
  const { showToast } = useToast();

  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [recordToEdit, setRecordToEdit] = useState<AbsenceRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<AbsenceRecord | null>(null);

  const activeRecords = absenceRecords.filter((r) => !r.isArchived);

  const handleExportPdf = async (record: AbsenceRecord) => {
    if (generatingId) return;

    const teacher =
      teachers.find((t) => t.id === record.teacherId) ||
      ({
        id: record.teacherId,
        fullName: record.teacherName,
        name: record.teacherName,
        username: record.jobNumber,
        jobNumber: record.jobNumber,
        specialty: record.specialty,
        employmentStatus: "دائم",
        jobTitle: "معلم",
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
        message: `تم تجهيز استمارة مساءلة الغياب الرسمية للمعلمة (${record.teacherName}) للطباعة بنجاح.`,
        type: "success",
      });
    } catch (err: unknown) {
      console.error("فشل طباعة مستند المساءلة PDF:", err);
      showToast({
        message: err instanceof Error ? err.message : "حدث خطأ أثناء إعداد ملف PDF للطباعة.",
        type: "error",
      });
    } finally {
      setGeneratingId(null);
    }
  };

  const confirmDeleteRecord = (reason?: string) => {
    if (recordToDelete) {
      const rec = recordToDelete;
      deleteAbsenceRecord(rec.id, reason);
      setRecordToDelete(null);

      showToast({
        message: "تم نقل سجل الغياب إلى الأرشيف الإداري",
        type: "success",
        action: {
          label: "عرض الأرشيف",
          onClick: () => router.push("/archive"),
        },
      });
    }
  };

  const columns: ColumnDef<AbsenceRecord>[] = [
    {
      id: "teacherName",
      header: "اسم المعلمة",
      sortable: true,
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200/80 text-[#137a85] flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
            {row.teacherName.charAt(0)}
          </div>
          <div>
            <span className="font-bold text-slate-900 block">{row.teacherName}</span>
            <span className="text-[11px] text-slate-400 font-mono">
              {row.nationalId || row.jobNumber} • {row.specialty || "عام"}
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
        <div className="flex items-center gap-1.5 font-mono text-slate-700">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{row.date}</span>
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
              "inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold border",
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
      header: "سبب الغياب",
      cell: ({ row }) => (
        <span className="text-xs text-slate-700 max-w-xs block truncate" title={row.reason}>
          {row.reason}
        </span>
      ),
    },
    {
      id: "attachment",
      header: "المرفق",
      align: "center",
      cell: ({ row }) => {
        if (!row.attachmentUrl) {
          return <span className="text-slate-400 text-xs">لا يوجد</span>;
        }

        return (
          <a
            href={row.attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200"
          >
            <Eye className="w-3 h-3" />
            <span>عرض</span>
          </a>
        );
      },
    },
    {
      id: "actions",
      header: "الإجراءات",
      align: "center",
      cell: ({ row }) => {
        const isExporting = generatingId === row.id;

        const menuItems: ActionMenuItem[] = [
          {
            id: "export-pdf",
            label: isExporting ? "جاري التصدير..." : "تصدير استمارة PDF",
            icon: isExporting ? Loader2 : FileDown,
            onClick: () => handleExportPdf(row),
          },
          {
            id: "edit",
            label: "تعديل تفاصيل السجل",
            icon: Pencil,
            onClick: () => setRecordToEdit(row),
          },
          ...(row.attachmentUrl
            ? [
                {
                  id: "view-attachment",
                  label: "معاينة المرفق الطبي",
                  icon: ExternalLink,
                  onClick: () => {
                    if (row.attachmentUrl) {
                      window.open(row.attachmentUrl, "_blank", "noopener,noreferrer");
                    }
                  },
                },
              ]
            : []),
          {
            id: "delete",
            label: "نقل للأرشيف الإداري",
            icon: Trash2,
            variant: "danger",
            onClick: () => setRecordToDelete(row),
          },
        ];

        return (
          <div className="flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => handleExportPdf(row)}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap bg-teal-50 text-[#137a85] hover:bg-[#137a85] hover:text-white border border-teal-200 transition-all cursor-pointer shadow-2xs disabled:opacity-60"
              title="تصدير استمارة المساءلة الرسمية PDF"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <FileDown className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="hidden sm:inline whitespace-nowrap">استمارة PDF</span>
            </button>

            <ActionMenu items={menuItems} align="left" />
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#137a85]" />
            <span>سجل مساءلات الغياب المعتمدة</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            سجلات الغياب المسجلة رسمياً مع خيار إصدار استمارة A4 وتعديل السجلات
          </p>
        </div>
      </div>

      <DataTable<AbsenceRecord>
        data={activeRecords}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="بحث في سجلات الغياب بالاسم أو السجل..."
        searchFilterKeys={[
          "teacherName",
          (item) => item.nationalId || "",
          (item) => item.jobNumber || "",
          "date",
          "reason",
        ]}
        onExportExcel={() => {
          import("xlsx").then((xlsx) => {
            const dataToExport = activeRecords.map((r, i) => ({
              "م": i + 1,
              "اسم المعلمة": r.teacherName,
              "السجل المدني / الرقم الوظيفي": r.nationalId || r.jobNumber,
              "تاريخ الغياب": r.date,
              "نوع الغياب": r.type,
              "السبب": r.reason,
            }));
            const ws = xlsx.utils.json_to_sheet(dataToExport);
            const wb = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(wb, ws, "سجلات الغياب");
            xlsx.writeFile(wb, `سجلات_الغياب_${new Date().toISOString().split("T")[0]}.xlsx`);
            showToast({ message: "تم تصدير سجلات الغياب بنجاح", type: "success" });
          }).catch(() => {
            showToast({ message: "تعذر تصدير الملف حالياً", type: "error" });
          });
        }}
        defaultPageSize={8}
        emptyTitle="لم يتم تسجيل أي مساءلة غياب بعد"
        emptyDescription="عند تسجيل غياب عبر النموذج أعلاه، ستظهر السجلات المعتمدة هنا."
        mobileCardRenderer={(record) => {
          const isExporting = generatingId === record.id;
          const style = TYPE_STYLES[record.type] || TYPE_STYLES["أخرى"];

          return (
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-[#137a85] flex items-center justify-center font-bold text-xs shrink-0">
                    {record.teacherName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{record.teacherName}</h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {record.nationalId || record.jobNumber}
                    </span>
                  </div>
                </div>

                <span
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[11px] font-bold border",
                    style.bg,
                    style.text,
                    style.border
                  )}
                >
                  {record.type}
                </span>
              </div>

              <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-400 block mb-0.5">سبب الغياب</span>
                <p className="line-clamp-2">{record.reason}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                <span className="font-mono">{record.date}</span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportPdf(record)}
                    disabled={isExporting}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 text-[#137a85] border border-teal-200"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecordToEdit(record)}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 border border-slate-200"
                    title="تعديل"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecordToDelete(record)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 border border-rose-200"
                    title="أرشفة"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        }}
      />

      {/* Edit Record Modal */}
      {recordToEdit && (
        <EditAbsenceModal
          record={recordToEdit}
          isOpen={!!recordToEdit}
          onClose={() => setRecordToEdit(null)}
        />
      )}

      {/* Delete / Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!recordToDelete}
        onCancel={() => setRecordToDelete(null)}
        onConfirm={confirmDeleteRecord}
        title="أرشفة سجل الغياب"
        message={
          recordToDelete
            ? `هل أنت متأكدة من رغبتك في نقل سجل غياب المعلمة (${recordToDelete.teacherName}) بتاريخ (${recordToDelete.date}) إلى الأرشيف الإداري؟ يمكنك استعادته في أي وقت.`
            : ""
        }
        confirmLabel="نقل إلى الأرشيف"
        variant="archive"
        showReasonInput={true}
      />
    </div>
  );
};
