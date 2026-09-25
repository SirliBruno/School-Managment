"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Clock,
  CheckCircle2,
  XCircle,
  FileCheck2,
  Copy,
  ExternalLink,
  Trash2,
  Archive,
  Search,
  Filter,
  Send,
  Calendar,
  Eye,
  FileText,
  AlertCircle,
  Plus,
} from "lucide-react";
import { AbsenceInquiry } from "@/types/teacher";
import { useTeachers } from "@/context/TeacherContext";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { InquiryReviewModal } from "@/components/procedures/InquiryReviewModal";
import {
  formatSaudiMobile,
  generateInquiryMessage,
  getWhatsAppDirectUrl,
} from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

interface InquiriesTableProps {
  onOpenNewInquiryModal: () => void;
}

export const InquiriesTable: React.FC<InquiriesTableProps> = ({
  onOpenNewInquiryModal,
}) => {
  const router = useRouter();
  const { inquiries, deleteInquiry } = useTeachers();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedInquiryForReview, setSelectedInquiryForReview] =
    useState<AbsenceInquiry | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [copyFeedbackId, setCopyFeedbackId] = useState<string | null>(null);
  const [inquiryToDelete, setInquiryToDelete] = useState<AbsenceInquiry | null>(
    null
  );
  const [archiveToast, setArchiveToast] = useState<string | null>(null);

  const activeInquiries = useMemo(
    () => inquiries.filter((inq) => !inq.isArchived),
    [inquiries]
  );

  // Filtered inquiries
  const filteredInquiries = useMemo(() => {
    return activeInquiries.filter((inq) => {
      const matchesSearch =
        inq.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inq.nationalId && inq.nationalId.includes(searchQuery)) ||
        (inq.jobNumber && inq.jobNumber.includes(searchQuery));

      if (!matchesSearch) return false;

      if (statusFilter === "all") return true;
      if (statusFilter === "pending") return inq.status === "pending";
      if (statusFilter === "submitted") return inq.status === "submitted";
      if (statusFilter === "approved") return inq.status === "approved";
      if (statusFilter === "rejected") return inq.status === "rejected";

      return true;
    });
  }, [activeInquiries, searchQuery, statusFilter]);

  // Counts
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
      setTimeout(() => setCopyFeedbackId(null), 2000);
    } catch (e) {
      console.error("فشل النسخ:", e);
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header & Actions Bar */}
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/40">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
            <span>سجل مساءلات الغياب عبر الواتساب</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            متابعة المساءلات الإلكترونية المرسلة، ردود المعلمات، وفحص التقارير الطبية
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenNewInquiryModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إرسال مساءلة واتساب جديدة</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
          <button
            onClick={() => setStatusFilter("all")}
            className={cn(
              "px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer",
              statusFilter === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            الكل ({counts.all})
          </button>

          <button
            onClick={() => setStatusFilter("submitted")}
            className={cn(
              "px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1",
              statusFilter === "submitted"
                ? "bg-sky-600 text-white"
                : "bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200"
            )}
          >
            <span>تم الرد</span>
            <span className="bg-sky-200/60 px-1.5 py-0.2 rounded-md text-[10px]">
              {counts.submitted}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter("pending")}
            className={cn(
              "px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1",
              statusFilter === "pending"
                ? "bg-amber-600 text-white"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
            )}
          >
            <span>بانتظار الرد</span>
            <span className="bg-amber-200/60 px-1.5 py-0.2 rounded-md text-[10px]">
              {counts.pending}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter("approved")}
            className={cn(
              "px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-1",
              statusFilter === "approved"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
            )}
          >
            <span>معتمدة</span>
            <span className="bg-emerald-200/60 px-1.5 py-0.2 rounded-md text-[10px]">
              {counts.approved}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم أو الرقم..."
            className="w-full pl-3 pr-8 py-1.5 rounded-xl border border-slate-200 text-xs bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#137a85]/20 focus:border-[#137a85]"
          />
        </div>
      </div>

      {/* Inquiries Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold">
              <th className="py-3 px-4">المعلمة</th>
              <th className="py-3 px-4">تاريخ الغياب</th>
              <th className="py-3 px-4">رقم الجوال</th>
              <th className="py-3 px-4">نوع الغياب</th>
              <th className="py-3 px-4">المرفق الطبي</th>
              <th className="py-3 px-4">الحالة</th>
              <th className="py-3 px-4 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredInquiries.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <MessageCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold">لا توجد مساءلات تطابق البحث الحالي</p>
                  <p className="text-[11px] mt-0.5">
                    يمكنك إرسال مساءلة جديدة بالضغط على &quot;إرسال مساءلة واتساب جديدة&quot;
                  </p>
                </td>
              </tr>
            ) : (
              filteredInquiries.map((inq) => {
                const isPending = inq.status === "pending";
                const isSubmitted = inq.status === "submitted";
                const isApproved = inq.status === "approved";
                const isRejected = inq.status === "rejected";

                return (
                  <tr
                    key={inq.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Teacher Info */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{inq.teacherName}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {inq.nationalId || inq.jobNumber}
                      </div>
                    </td>

                    {/* Absence Date */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                      {inq.absenceEndDate && inq.absenceEndDate !== inq.absenceDate ? (
                        <div className="flex flex-col gap-1 items-start">
                          <span className="text-xs">
                            {inq.absenceDate} إلى {inq.absenceEndDate}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-md border border-teal-200">
                            {inq.daysCount || 2} أيام
                          </span>
                        </div>
                      ) : (
                        <span>{inq.absenceDate}</span>
                      )}
                    </td>

                    {/* Mobile */}
                    <td className="py-3.5 px-4">
                      {inq.mobile ? (
                        <span className="font-mono text-slate-600 dir-ltr text-[11px]">
                          {inq.mobile}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">غير محدد</span>
                      )}
                    </td>

                    {/* Absence Type */}
                    <td className="py-3.5 px-4">
                      {inq.absenceType ? (
                        <span className="px-2 py-0.5 rounded-lg bg-teal-50 text-[#137a85] font-semibold border border-teal-200/70 text-[11px]">
                          {inq.absenceType}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">بانتظار الإفادة</span>
                      )}
                    </td>

                    {/* Attachment */}
                    <td className="py-3.5 px-4">
                      {inq.attachmentUrl ? (
                        <button
                          type="button"
                          onClick={() => handleOpenReview(inq)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100/70 px-2 py-1 rounded-lg border border-teal-200 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>معاينة المرفق</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">لا يوجد</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {isPending && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" />
                          <span>بانتظار رد المعلمة</span>
                        </span>
                      )}
                      {isSubmitted && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 animate-pulse">
                          <CheckCircle2 className="w-3 h-3 text-sky-600" />
                          <span>تم الرد (بانتظار الاعتماد)</span>
                        </span>
                      )}
                      {isApproved && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>معتمدة</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>مرفوضة</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* If pending: resend WhatsApp button + copy button */}
                        {isPending ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleResendWhatsApp(inq)}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                              title="إعادة إرسال تذكير عبر الواتساب"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopyLink(inq)}
                              className="p-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                              title="نسخ الرابط والرسالة"
                            >
                              {copyFeedbackId === inq.id ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </>
                        ) : (
                          /* If submitted or reviewed: Review button */
                          <button
                            type="button"
                            onClick={() => handleOpenReview(inq)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#137a85] text-white hover:bg-teal-700 font-bold text-[11px] shadow-2xs transition-colors cursor-pointer"
                          >
                            <FileCheck2 className="w-3 h-3" />
                            <span>{isSubmitted ? "مراجعة واعتماد" : "عرض التفاصيل"}</span>
                          </button>
                        )}

                        {/* Archive / Delete button */}
                        <button
                          type="button"
                          onClick={() => setInquiryToDelete(inq)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                          title="نقل المساءلة إلى الأرشيف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Archive Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!inquiryToDelete}
        onCancel={() => setInquiryToDelete(null)}
        onConfirm={(reason) => {
          if (inquiryToDelete) {
            deleteInquiry(inquiryToDelete.id, reason);
            setInquiryToDelete(null);
            setArchiveToast("تم نقل سجل الغياب إلى الأرشيف الإداري");
            setTimeout(() => setArchiveToast(null), 4500);
          }
        }}
        title="نقل المساءلة للأرشيف"
        message={
          inquiryToDelete
            ? `سيتم نقل سجل مساءلة الغياب للمعلمة (${inquiryToDelete.teacherName}) بتاريخ (${inquiryToDelete.absenceDate}) إلى الأرشيف الإداري مع إمكانية استعادته في أي وقت.`
            : ""
        }
        confirmLabel="نقل إلى الأرشيف"
        variant="archive"
        showReasonInput={true}
      />

      {/* Archive Toast Notification */}
      {archiveToast && (
        <div
          dir="rtl"
          className="fixed bottom-6 left-6 z-50 flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Archive className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold">{archiveToast}</span>
          <button
            type="button"
            onClick={() => router.push("/archive")}
            className="text-xs font-extrabold text-amber-400 hover:text-amber-300 underline underline-offset-4 mr-1 cursor-pointer"
          >
            عرض الأرشيف
          </button>
        </div>
      )}

      {/* Review Modal */}
      <InquiryReviewModal
        inquiry={selectedInquiryForReview}
        isOpen={isReviewOpen}
        onClose={() => {
          setIsReviewOpen(false);
          setSelectedInquiryForReview(null);
        }}
      />
    </div>
  );
};
