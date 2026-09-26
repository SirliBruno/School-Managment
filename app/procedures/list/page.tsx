"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Search,
  Filter,
  Printer,
  Trash2,
  Plus,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileCheck,
  ChevronDown,
  ArrowUpRight,
  ExternalLink,
  ShieldCheck,
  Building2,
  Users,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { useToast } from "@/context/ToastContext";
import { PageHeader, Card, Button, Badge, KpiCard } from "@/components/ui";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { AbsenceInquiry, DeductionDecision, DelayNotice } from "@/types/teacher";
import { printDeductionDecisionPdf } from "@/lib/printDeductionDecisionPdfService";
import { printDelayNoticePdf } from "@/lib/printDelayNoticePdfService";
import { printAbsencePdf } from "@/lib/printPdfService";

type ProcedureTab = "all" | "inquiry" | "deduction" | "delay";

interface UnifiedProcedureItem {
  id: string;
  type: "inquiry" | "deduction" | "delay";
  typeName: string;
  formNumberBadge: string;
  referenceNumber: string;
  teacherId: string;
  teacherName: string;
  civilId: string;
  date: string;
  details: string;
  statusBadge: {
    label: string;
    variant: "success" | "warning" | "error" | "info" | "neutral" | "brand";
  };
  rawItem: AbsenceInquiry | DeductionDecision | DelayNotice;
}

export default function ProceduresListPage() {
  const {
    teachers,
    inquiries,
    delayNotices,
    deductionDecisions,
    deleteInquiry,
    deleteDelayNotice,
    deleteDeductionDecision,
  } = useTeachers();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<ProcedureTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [itemToDelete, setItemToDelete] = useState<UnifiedProcedureItem | null>(null);

  // Active records (non-archived)
  const activeInquiries = useMemo(
    () => inquiries.filter((i) => !i.isArchived),
    [inquiries]
  );
  const activeDelayNotices = useMemo(
    () => delayNotices.filter((d) => !d.isArchived),
    [delayNotices]
  );
  const activeDeductions = useMemo(
    () => deductionDecisions.filter((d) => !d.isArchived),
    [deductionDecisions]
  );

  // KPI Metrics
  const totalCount =
    activeInquiries.length + activeDelayNotices.length + activeDeductions.length;
  const inquiryCount = activeInquiries.length;
  const deductionCount = activeDeductions.length;
  const delayCount = activeDelayNotices.length;

  // Unify all procedures into a single sorted timeline
  const unifiedItems = useMemo<UnifiedProcedureItem[]>(() => {
    const list: UnifiedProcedureItem[] = [];

    // 1. Inquiries (نموذج 20)
    for (const inq of activeInquiries) {
      let statusLabel = "قيد الانتظار";
      let statusVariant: UnifiedProcedureItem["statusBadge"]["variant"] = "warning";
      if (inq.status === "approved") {
        statusLabel = "عذر مقبول ومعتمد";
        statusVariant = "success";
      } else if (inq.status === "rejected") {
        statusLabel = "عذر مرفوض (حسم)";
        statusVariant = "error";
      } else if (inq.status === "submitted") {
        statusLabel = "تم تقديم العذر";
        statusVariant = "info";
      }

      list.push({
        id: `inq-${inq.id}`,
        type: "inquiry",
        typeName: "مساءلة غياب",
        formNumberBadge: "نموذج (٢٠)",
        referenceNumber: inq.id.slice(0, 8),
        teacherId: inq.teacherId,
        teacherName: inq.teacherName,
        civilId: inq.nationalId || inq.jobNumber || "—",
        date: inq.absenceDate,
        details: inq.isMultiDay
          ? `غياب ${inq.daysCount || 1} أيام (${inq.absenceDate} إلى ${inq.absenceEndDate})`
          : `غياب يوم (${inq.absenceDate}) - نوع: ${inq.absenceType || "اضطراري"}`,
        statusBadge: {
          label: statusLabel,
          variant: statusVariant,
        },
        rawItem: inq,
      });
    }

    // 2. Deduction Decisions (نموذج 19)
    for (const dec of activeDeductions) {
      list.push({
        id: `dec-${dec.id}`,
        type: "deduction",
        typeName: "قرار حسم ساعات",
        formNumberBadge: "نموذج (١٩)",
        referenceNumber: dec.decisionNumber,
        teacherId: dec.teacherId,
        teacherName: dec.teacherName,
        civilId: dec.civilId,
        date: dec.decisionDate,
        details: `حسم (${dec.deductionDays}) يوماً لبلوغ التأخر (${dec.delayHours}) ساعة`,
        statusBadge: {
          label: "قرار حسم صادر",
          variant: "error",
        },
        rawItem: dec,
      });
    }

    // 3. Delay Notices
    for (const dn of activeDelayNotices) {
      let statusLabel = "بانتظار رد المعلمة";
      let statusVariant: UnifiedProcedureItem["statusBadge"]["variant"] = "warning";
      if (dn.status === "completed") {
        statusLabel = dn.directorOpinion === "accepted" ? "عذر مقبول" : "حسم معتمد";
        statusVariant = dn.directorOpinion === "accepted" ? "success" : "error";
      } else if (dn.status === "pending_director") {
        statusLabel = "بانتظار قرار المديرة";
        statusVariant = "info";
      }

      list.push({
        id: `delay-${dn.id}`,
        type: "delay",
        typeName: "إشعار تأخر / خروج",
        formNumberBadge: "إشعار إداري",
        referenceNumber: dn.noticeNumber || dn.id.slice(0, 8),
        teacherId: dn.teacherId,
        teacherName: dn.teacherName || "—",
        civilId: dn.nationalId || dn.jobNumber || "—",
        date: dn.noticeDate || dn.date || "—",
        details: dn.calculatedDuration
          ? `تأخر مدته: ${dn.calculatedDuration}`
          : `تأخر: ${dn.calculatedMinutes || 0} دقيقة`,
        statusBadge: {
          label: statusLabel,
          variant: statusVariant,
        },
        rawItem: dn,
      });
    }

    // Sort by date descending
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [activeInquiries, activeDeductions, activeDelayNotices]);

  // Filtered Items based on Tab & Search Query
  const filteredItems = useMemo(() => {
    return unifiedItems.filter((item) => {
      // Tab filter
      if (activeTab !== "all" && item.type !== activeTab) {
        return false;
      }

      // Search query filter
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      return (
        item.teacherName.toLowerCase().includes(q) ||
        item.civilId.toLowerCase().includes(q) ||
        item.referenceNumber.toLowerCase().includes(q) ||
        item.details.toLowerCase().includes(q) ||
        item.typeName.toLowerCase().includes(q)
      );
    });
  }, [unifiedItems, activeTab, searchQuery]);

  // Handle PDF Print per item type
  const handlePrintItem = (item: UnifiedProcedureItem) => {
    if (item.type === "deduction") {
      const dec = item.rawItem as DeductionDecision;
      printDeductionDecisionPdf({
        teacherName: dec.teacherName,
        civilId: dec.civilId,
        specialization: dec.specialization,
        rank: dec.rank,
        jobNumber: dec.jobNumber,
        currentAction: dec.currentAction,
        schoolName: dec.schoolName,
        principalName: dec.principalName,
        delayHours: dec.delayHours,
        deductionDays: dec.deductionDays,
        decisionNumber: dec.decisionNumber,
        decisionDate: dec.decisionDate,
      });
    } else if (item.type === "delay") {
      const dn = item.rawItem as DelayNotice;
      printDelayNoticePdf(dn);
    } else if (item.type === "inquiry") {
      const inq = item.rawItem as AbsenceInquiry;
      printAbsencePdf({
        teacherName: inq.teacherName,
        nationalId: inq.nationalId,
        specialty: inq.specialty || "عام",
        jobTitle: "معلمة",
        employmentStatus: "دائم",
        absenceCount: inq.daysCount || 1,
        absenceDate: inq.absenceDate,
        absenceType: inq.absenceType || "اضطراري",
        absenceReason: inq.teacherReason || "مساءلة غياب رسمية",
      });
    }
  };

  // Handle Archive Confirmation
  const confirmDeleteItem = async (reason?: string) => {
    if (!itemToDelete) return;

    if (itemToDelete.type === "deduction") {
      deleteDeductionDecision((itemToDelete.rawItem as DeductionDecision).id, reason);
    } else if (itemToDelete.type === "delay") {
      deleteDelayNotice((itemToDelete.rawItem as DelayNotice).id, reason);
    } else if (itemToDelete.type === "inquiry") {
      await deleteInquiry((itemToDelete.rawItem as AbsenceInquiry).id, reason);
    }

    setItemToDelete(null);
    showToast({
      message: "تم نقل الإجراء إلى الأرشيف الإداري بنجاح.",
      type: "success",
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/50 pb-16">
      <PageHeader
        breadcrumbs={[
          { label: "لوحة التحكم", href: "/" },
          { label: "قائمة الإجراءات الإدارية" },
        ]}
        title="قائمة الإجراءات الإدارية الموحدة"
        subtitle="سجل شامل لجميع مساءلات الغياب (نموذج 20)، وقرارات حسم الساعات التراكمية (نموذج 19)، وإشعارات التأخر"
        badge="سجل الإدارة المدرسية"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/procedures/deduction-hours">
              <Button variant="primary" size="sm" className="font-bold shadow-sm">
                <Plus className="w-4 h-4 ml-1.5" />
                قرار حسم ساعات (نموذج 19)
              </Button>
            </Link>
            <Link href="/procedures/absence">
              <Button variant="outline" size="sm" className="font-bold">
                <FileText className="w-4 h-4 ml-1.5 text-teal-700" />
                مساءلة غياب (نموذج 20)
              </Button>
            </Link>
            <Link href="/procedures/delay-notice">
              <Button variant="outline" size="sm" className="font-bold">
                <Clock className="w-4 h-4 ml-1.5 text-amber-600" />
                إشعار تأخر / انصراف
              </Button>
            </Link>
          </div>
        }
      />

      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="إجمالي الإجراءات المسجلة"
            value={totalCount}
            subtitle="كافة القرارات والمساءلات"
            icon={<FileCheck className="w-5 h-5 text-teal-700" />}
            variant="emerald"
          />
          <KpiCard
            title="قرارات حسم الساعات"
            value={deductionCount}
            subtitle="نموذج رقم (١٩) معتمد"
            icon={<ShieldCheck className="w-5 h-5 text-rose-600" />}
            variant="rose"
          />
          <KpiCard
            title="مساءلات الغياب"
            value={inquiryCount}
            subtitle="نموذج رقم (٢٠) رسمي"
            icon={<FileText className="w-5 h-5 text-blue-600" />}
            variant="blue"
          />
          <KpiCard
            title="إشعارات التأخر والخروج"
            value={delayCount}
            subtitle="تنبيهات الدوام والانصراف"
            icon={<Clock className="w-5 h-5 text-amber-600" />}
            variant="amber"
          />
        </div>

        {/* Filter Tabs & Search Bar Card */}
        <Card className="p-4 border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl">
              {[
                { id: "all", label: "الكل", count: totalCount },
                { id: "deduction", label: "قرارات حسم الساعات (١٩)", count: deductionCount },
                { id: "inquiry", label: "مساءلات الغياب (٢٠)", count: inquiryCount },
                { id: "delay", label: "إشعارات التأخر", count: delayCount },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as ProcedureTab)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                    activeTab === tab.id
                      ? "bg-white text-teal-800 shadow-xs border border-slate-200/60"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-3xs font-mono font-bold ${
                      activeTab === tab.id
                        ? "bg-teal-50 text-teal-800"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث برقم القرار، اسم المعلمة، أو السجل المدني..."
                className="w-full pr-10 pl-4 py-2 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
              />
            </div>
          </div>
        </Card>

        {/* Unified Procedures Table */}
        <Card className="border-slate-200/80 shadow-sm overflow-hidden">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="text-base font-bold text-slate-700">
                لا توجد إجراءات إدارية مطابقة
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery
                  ? "لم نجد أي نتائج تطابق البحث المدخل. جربي تغيير كلمات البحث."
                  : "لم يتم تسجيل أي إجراءات إدارية تحت هذا التصنيف حتى الآن."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 font-bold">
                  <tr>
                    <th className="py-3 px-4">نوع الإجراء</th>
                    <th className="py-3 px-4">رقم الإجراء</th>
                    <th className="py-3 px-4">اسم المعلمة</th>
                    <th className="py-3 px-4">السجل المدني</th>
                    <th className="py-3 px-4">التاريخ</th>
                    <th className="py-3 px-4">تفاصيل الإجراء والموقف</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Procedure Type Badge */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-3xs font-bold ${
                              item.type === "deduction"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : item.type === "inquiry"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {item.formNumberBadge}
                          </span>
                          <span className="font-semibold text-slate-800">
                            {item.typeName}
                          </span>
                        </div>
                      </td>

                      {/* Reference Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {item.referenceNumber}
                      </td>

                      {/* Teacher Name */}
                      <td className="py-3.5 px-4 font-bold text-teal-800">
                        {item.teacherName}
                      </td>

                      {/* Civil ID */}
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {item.civilId}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {item.date}
                      </td>

                      {/* Details */}
                      <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate font-medium">
                        {item.details}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <Badge variant={item.statusBadge.variant}>
                          {item.statusBadge.label}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePrintItem(item)}
                            className="h-8 px-2 text-teal-700 hover:text-teal-800 hover:bg-teal-50"
                            title="طباعة النموذج المعتمد (PDF)"
                          >
                            <Printer className="w-3.5 h-3.5 ml-1" />
                            طباعة
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setItemToDelete(item)}
                            className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            title="نقل للأرشيف"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>

      {/* Delete / Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(itemToDelete)}
        title="أرشفة الإجراء الإداري"
        message={`هل أنتِ متأكدة من رغبتك في نقل ${itemToDelete?.typeName} رقم (${itemToDelete?.referenceNumber}) للمعلمة (${itemToDelete?.teacherName}) إلى الأرشيف الإداري؟`}
        confirmLabel="نقل للأرشيف"
        cancelLabel="إلغاء"
        variant="archive"
        showReasonInput={true}
        onConfirm={confirmDeleteItem}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
}
