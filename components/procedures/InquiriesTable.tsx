"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  MessageCircle,
  Clock,
  CheckCircle2,
  XCircle,
  FileCheck2,
  Copy,
  ExternalLink,
  Trash2,
  Send,
  Calendar,
  Eye,
  Plus,
} from "lucide-react";
import { AbsenceInquiry } from "@/types/teacher";
import { useTeachers } from "@/context/TeacherContext";
import { useToast } from "@/context/ToastContext";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { InquiryReviewModal } from "@/components/procedures/InquiryReviewModal";
import {
  generateInquiryMessage,
  getWhatsAppDirectUrl,
} from "@/lib/whatsapp";
import {
  DataTable,
  ColumnDef,
  ActionMenu,
  ActionMenuItem,
  Button,
} from "@/components/ui";
import { cn } from "@/lib/utils";

interface InquiriesTableProps {
  onOpenNewInquiryModal: () => void;
}

export const InquiriesTable: React.FC<InquiriesTableProps> = ({
  onOpenNewInquiryModal,
}) => {
  const router = useRouter();
  const { inquiries, deleteInquiry } = useTeachers();
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedInquiryForReview, setSelectedInquiryForReview] =
    useState<AbsenceInquiry | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [copyFeedbackId, setCopyFeedbackId] = useState<string | null>(null);
  const [inquiryToDelete, setInquiryToDelete] = useState<AbsenceInquiry | null>(null);

  const activeInquiries = useMemo(
    () => inquiries.filter((inq) => !inq.isArchived),
    [inquiries]
  );

  // Filtered by status tab
  const statusFilteredInquiries = useMemo(() => {
    return activeInquiries.filter((inq) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "pending") return inq.status === "pending";
      if (statusFilter === "submitted") return inq.status === "submitted";
      if (statusFilter === "approved") return inq.status === "approved";
      if (statusFilter === "rejected") return inq.status === "rejected";
      return true;
    });
  }, [activeInquiries, statusFilter]);

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: activeInquiries.length,
      pending: activeInquiries.filter((i) => i.status === "pending").length,
      submitted: activeInquiries.filter((i) => i.status === "submitted").length,
      approved: activeInquiries.filter((i) => i.status === "approved").length,
    };
  }, [activeInquiries]);

  // Copy Link Helper
  const handleCopyLink = async (inq: AbsenceInquiry) => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://school-absence.gov.sa";
    const isMulti = Boolean(inq.absenceEndDate && inq.absenceEndDate !== inq.absenceDate);
    const queryParam = isMulti ? `?end=${inq.absenceEndDate}&days=${inq.daysCount || 2}` : "";
    const link = `${origin}/inquiry/${inq.token}${queryParam}`;
    const msg = generateInquiryMessage(
      inq.teacherName,
      inq.absenceDate,
      link,
      inq.absenceEndDate,
      inq.daysCount
    );

    try {
      await navigator.clipboard.writeText(msg);
      setCopyFeedbackId(inq.id);
      showToast({ message: "تم نسخ رسالة ورابط المساءلة بنجاح", type: "success" });
      setTimeout(() => setCopyFeedbackId(null), 2500);
    } catch (e) {
      console.error("فشل النسخ:", e);
      showToast({ message: "تعذر نسخ الرابط", type: "error" });
    }
  };

  // Resend WhatsApp Helper
  const handleResendWhatsApp = (inq: AbsenceInquiry) => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://school-absence.gov.sa";
    const isMulti = Boolean(inq.absenceEndDate && inq.absenceEndDate !== inq.absenceDate);
    const queryParam = isMulti ? `?end=${inq.absenceEndDate}&days=${inq.daysCount || 2}` : "";
    const link = `${origin}/inquiry/${inq.token}${queryParam}`;
    const msg = generateInquiryMessage(
      inq.teacherName,
      inq.absenceDate,
      link,
      inq.absenceEndDate,
      inq.daysCount
    );
    const waUrl = getWhatsAppDirectUrl(inq.mobile || "", msg);
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const handleOpenReview = (inq: AbsenceInquiry) => {
    setSelectedInquiryForReview(inq);
    setIsReviewOpen(true);
  };

  const confirmDelete = (reason?: string) => {
    if (inquiryToDelete) {
      deleteInquiry(inquiryToDelete.id, reason);
      setInquiryToDelete(null);
      showToast({
        message: "تم نقل سجل المساءلة إلى الأرشيف الإداري",
        type: "success",
        action: {
          label: "عرض الأرشيف",
          onClick: () => router.push("/archive"),
        },
      });
    }
  };

  const columns: ColumnDef<AbsenceInquiry>[] = [
    {
      id: "teacherName",
      header: "المعلمة والسجل",
      sortable: true,
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
            {row.teacherName.charAt(0)}
          </div>
          <div>
            <span className="font-bold text-slate-900 block">{row.teacherName}</span>
            <span className="text-[11px] text-slate-400 font-mono">
              {row.nationalId || row.jobNumber || "—"}
            </span>
          </div>
        </div>
      ),
    },
    {
      id: "absenceDate",
      header: "تاريخ الغياب",
      sortable: true,
      cell: ({ row }) => {
        const isMulti = Boolean(row.absenceEndDate && row.absenceEndDate !== row.absenceDate);

        return (
          <div className="font-mono text-slate-700">
            {isMulti ? (
              <div className="flex flex-col gap-1 items-start">
                <span className="text-xs">
                  {row.absenceDate} إلى {row.absenceEndDate}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-md border border-teal-200">
                  {row.daysCount || 2} أيام
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{row.absenceDate}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "mobile",
      header: "رقم الجوال",
      cell: ({ row }) => (
        <span className="font-mono text-slate-600 text-xs dir-ltr block" dir="ltr">
          {row.mobile || "—"}
        </span>
      ),
    },
    {
      id: "absenceType",
      header: "النوع الموضح",
      cell: ({ row }) => {
        if (!row.absenceType) {
          return <span className="text-slate-400 text-xs">بانتظار الإفادة</span>;
        }

        return (
          <span className="px-2 py-0.5 rounded-lg bg-teal-50 text-[#137a85] font-semibold border border-teal-200 text-xs">
            {row.absenceType}
          </span>
        );
      },
    },
    {
      id: "attachment",
      header: "المرفق الطبي",
      align: "center",
      cell: ({ row }) => {
        if (!row.attachmentUrl) {
          return <span className="text-slate-400 text-xs">لا يوجد</span>;
        }

        return (
          <button
            type="button"
            onClick={() => handleOpenReview(row)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 transition-colors cursor-pointer"
          >
            <Eye className="w-3 h-3" />
            <span>معاينة</span>
          </button>
        );
      },
    },
    {
      id: "status",
      header: "حالة المساءلة",
      align: "center",
      sortable: true,
      cell: ({ row }) => {
        if (row.status === "pending") {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="w-3 h-3" />
              <span>بانتظار الرد</span>
            </span>
          );
        }

        if (row.status === "submitted") {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 animate-pulse">
              <CheckCircle2 className="w-3 h-3 text-sky-600" />
              <span>تم الرد (بانتظار الاعتماد)</span>
            </span>
          );
        }

        if (row.status === "approved") {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>معتمدة</span>
            </span>
          );
        }

        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>مرفوضة</span>
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "الإجراءات",
      align: "center",
      cell: ({ row }) => {
        const isPending = row.status === "pending";

        const menuItems: ActionMenuItem[] = [
          {
            id: "review",
            label: isPending ? "معاينة النموذج" : "مراجعة واعتماد المساءلة",
            icon: FileCheck2,
            onClick: () => handleOpenReview(row),
          },
          {
            id: "resend-wa",
            label: "إرسال تذكير عبر الواتساب",
            icon: Send,
            onClick: () => handleResendWhatsApp(row),
          },
          {
            id: "copy-link",
            label: "نسخ رابط المساءلة والرسالة",
            icon: Copy,
            onClick: () => handleCopyLink(row),
          },
          {
            id: "archive",
            label: "نقل المساءلة للأرشيف",
            icon: Trash2,
            variant: "danger",
            onClick: () => setInquiryToDelete(row),
          },
        ];

        return (
          <div className="flex items-center justify-center gap-1.5">
            {isPending ? (
              <>
                <button
                  type="button"
                  onClick={() => handleResendWhatsApp(row)}
                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                  title="إرسال تذكير عبر الواتساب"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyLink(row)}
                  className="p-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                  title="نسخ الرابط"
                >
                  {copyFeedbackId === row.id ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenReview(row)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#137a85] text-white hover:bg-teal-700 font-bold text-xs shadow-2xs transition-colors cursor-pointer"
              >
                <FileCheck2 className="w-3 h-3" />
                <span>{row.status === "submitted" ? "اعتماد" : "عرض"}</span>
              </button>
            )}

            <ActionMenu items={menuItems} align="left" />
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Header & New Inquiry Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>سجل مساءلات الغياب عبر الواتساب</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            متابعة المساءلات الإلكترونية المرسلة، ردود المعلمات، وفحص التقارير الطبية
          </p>
        </div>

        <Button
          variant="emerald"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={onOpenNewInquiryModal}
        >
          إرسال مساءلة واتساب جديدة
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={cn(
            "px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer",
            statusFilter === "all"
              ? "bg-slate-900 text-white shadow-2xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          الكل ({counts.all})
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("submitted")}
          className={cn(
            "px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5",
            statusFilter === "submitted"
              ? "bg-sky-600 text-white shadow-2xs"
              : "bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200"
          )}
        >
          <span>تم الرد</span>
          <span className="bg-sky-200/60 px-1.5 py-0.2 rounded-md text-[10px]">
            {counts.submitted}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("pending")}
          className={cn(
            "px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5",
            statusFilter === "pending"
              ? "bg-amber-600 text-white shadow-2xs"
              : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
          )}
        >
          <span>بانتظار الرد</span>
          <span className="bg-amber-200/60 px-1.5 py-0.2 rounded-md text-[10px]">
            {counts.pending}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("approved")}
          className={cn(
            "px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1.5",
            statusFilter === "approved"
              ? "bg-emerald-600 text-white shadow-2xs"
              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
          )}
        >
          <span>معتمدة</span>
          <span className="bg-emerald-200/60 px-1.5 py-0.2 rounded-md text-[10px]">
            {counts.approved}
          </span>
        </button>
      </div>

      {/* Main DataTable */}
      <DataTable<AbsenceInquiry>
        data={statusFilteredInquiries}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="بحث في المساءلات بالاسم أو السجل أو الجوال..."
        searchFilterKeys={[
          "teacherName",
          (item) => item.nationalId || "",
          (item) => item.jobNumber || "",
          (item) => item.mobile || "",
          "absenceDate",
        ]}
        onExportExcel={() => {
          import("xlsx").then((xlsx) => {
            const dataToExport = statusFilteredInquiries.map((inq, i) => ({
              "م": i + 1,
              "اسم المعلمة": inq.teacherName,
              "السجل المدني / الرقم الوظيفي": inq.nationalId || inq.jobNumber || "—",
              "تاريخ الغياب": inq.absenceDate,
              "رقم الجوال": inq.mobile || "—",
              "نوع الغياب": inq.absenceType || "بانتظار الإفادة",
              "الحالة":
                inq.status === "pending"
                  ? "بانتظار الرد"
                  : inq.status === "submitted"
                  ? "تم الرد"
                  : inq.status === "approved"
                  ? "معتمدة"
                  : "مرفوضة",
            }));
            const ws = xlsx.utils.json_to_sheet(dataToExport);
            const wb = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(wb, ws, "مساءلات الواتساب");
            xlsx.writeFile(wb, `مساءلات_الواتساب_${new Date().toISOString().split("T")[0]}.xlsx`);
            showToast({ message: "تم تصدير سجل المساءلات بنجاح", type: "success" });
          }).catch(() => {
            showToast({ message: "تعذر تصدير الملف حالياً", type: "error" });
          });
        }}
        defaultPageSize={8}
        emptyTitle="لا توجد مساءلات تطابق التصفية الحالية"
        emptyDescription="يمكنك إرسال مساءلة جديدة بالضغط على 'إرسال مساءلة واتساب جديدة'."
        mobileCardRenderer={(inq) => {
          const isPending = inq.status === "pending";

          return (
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {inq.teacherName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{inq.teacherName}</h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {inq.nationalId || inq.jobNumber || "—"}
                    </span>
                  </div>
                </div>

                {isPending ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    بانتظار الرد
                  </span>
                ) : inq.status === "submitted" ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                    تم الرد
                  </span>
                ) : inq.status === "approved" ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    معتمدة
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    مرفوضة
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{inq.absenceDate}</span>
                </div>
                <span className="font-mono text-[11px] text-slate-500" dir="ltr">
                  {inq.mobile || "—"}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                {inq.attachmentUrl ? (
                  <button
                    type="button"
                    onClick={() => handleOpenReview(inq)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-teal-700"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>معاينة المرفق</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400">بدون مرفق</span>
                )}

                <div className="flex items-center gap-1.5">
                  {isPending ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleResendWhatsApp(inq)}
                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200"
                        title="إعادة إرسال واتساب"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyLink(inq)}
                        className="p-1.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-200"
                        title="نسخ الرابط"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenReview(inq)}
                      className="px-2.5 py-1 rounded-lg bg-[#137a85] text-white font-bold text-xs"
                    >
                      مراجعة
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setInquiryToDelete(inq)}
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

      {/* Review Modal */}
      <InquiryReviewModal
        inquiry={selectedInquiryForReview}
        isOpen={isReviewOpen}
        onClose={() => {
          setIsReviewOpen(false);
          setSelectedInquiryForReview(null);
        }}
      />

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!inquiryToDelete}
        onCancel={() => setInquiryToDelete(null)}
        onConfirm={confirmDelete}
        title="نقل المساءلة للأرشيف الإداري"
        message={
          inquiryToDelete
            ? `سيتم نقل سجل مساءلة الغياب للمعلمة (${inquiryToDelete.teacherName}) بتاريخ (${inquiryToDelete.absenceDate}) إلى الأرشيف الإداري مع إمكانية استعادته في أي وقت.`
            : ""
        }
        confirmLabel="نقل إلى الأرشيف"
        variant="archive"
        showReasonInput={true}
      />
    </div>
  );
};
