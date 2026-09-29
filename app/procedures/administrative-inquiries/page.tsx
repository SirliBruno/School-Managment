"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Scale,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Printer,
  Share2,
  Eye,
  Pencil,
  Trash2,
  ShieldCheck,
  FileEdit,
  User,
  MessageSquare,
  FileText,
  Copy,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { useToast } from "@/context/ToastContext";
import {
  AdministrativeInquiry,
  AdministrativeInquiryStatus,
  AdministrativeInquiryType,
} from "@/types/teacher";
import { CreateAdministrativeInquiryModal } from "@/components/procedures/CreateAdministrativeInquiryModal";
import { AdministrativeInquiryReviewModal } from "@/components/procedures/AdministrativeInquiryReviewModal";
import { AdministrativeInquiryDetailsModal } from "@/components/procedures/AdministrativeInquiryDetailsModal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { printAdministrativeInquiryPdf } from "@/lib/printAdministrativeInquiryPdfService";
import { openAdministrativeInquiryWhatsApp, generateAdministrativeInquiryWhatsAppMessage } from "@/lib/administrativeInquiryWhatsappService";
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

type FilterTab = "all" | AdministrativeInquiryStatus;

const VIOLATION_TYPE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "جميع المخالفات والمسائلات" },
  { value: "التأخير عن دخول الحصص", label: "التأخير عن دخول الحصص" },
  { value: "الخروج من الحصص قبل انتهاء الوقت", label: "الخروج من الحصص قبل انتهاء الوقت" },
  { value: "الامتناع عن دخول حصص الانتظار", label: "الامتناع عن دخول حصص الانتظار" },
  { value: "الامتناع عن المناوبة", label: "الامتناع عن المناوبة" },
  { value: "أخرى", label: "أخرى (مخالفة مخصصة)" },
];

export default function AdministrativeInquiriesPage() {
  const router = useRouter();
  const {
    administrativeInquiries,
    teachers,
    deleteAdministrativeInquiry,
    markAdministrativeInquiryLinkShared,
  } = useTeachers();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [selectedViolationType, setSelectedViolationType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [inquiryToEdit, setInquiryToEdit] = useState<AdministrativeInquiry | null>(null);
  const [selectedInquiryForDetails, setSelectedInquiryForDetails] =
    useState<AdministrativeInquiry | null>(null);
  const [selectedInquiryForReview, setSelectedInquiryForReview] =
    useState<AdministrativeInquiry | null>(null);
  const [inquiryToDelete, setInquiryToDelete] = useState<AdministrativeInquiry | null>(null);

  // Active records
  const activeInquiries = useMemo(
    () => (administrativeInquiries || []).filter((i) => !i.isArchived),
    [administrativeInquiries]
  );

  // KPI Statistics
  const totalCount = activeInquiries.length;
  const pendingTeacherCount = activeInquiries.filter(
    (i) => i.status === "pending_teacher"
  ).length;
  const pendingDirectorCount = activeInquiries.filter(
    (i) => i.status === "pending_director"
  ).length;
  const acceptedCount = activeInquiries.filter(
    (i) => i.directorDecision === "accepted"
  ).length;
  const rejectedCount = activeInquiries.filter(
    (i) => i.directorDecision === "rejected"
  ).length;
  const expiredCount = activeInquiries.filter(
    (i) => i.status === "expired"
  ).length;

  // Filtered List
  const filteredInquiries = useMemo(() => {
    return activeInquiries.filter((inq) => {
      // Tab filter
      if (activeTab !== "all") {
        if (activeTab === "pending_director" && (inq.status === "pending_director" || inq.status === "teacher_responded")) {
          // both represent waiting for director review
        } else if (inq.status !== activeTab) {
          return false;
        }
      }

      // Violation type filter
      if (selectedViolationType !== "all") {
        const inqType = inq.inquiryType || inq.violationType || inq.violationTypeArabic || "";
        if (selectedViolationType === "أخرى") {
          const isStandard =
            inqType === "التأخير عن دخول الحصص" ||
            inqType === "الخروج من الحصص قبل انتهاء الوقت" ||
            inqType === "الامتناع عن دخول حصص الانتظار" ||
            inqType === "الامتناع عن المناوبة";
          if (isStandard) return false;
        } else {
          if (inqType !== selectedViolationType && inq.violationType !== selectedViolationType) {
            return false;
          }
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName = (inq.teacherName || "").toLowerCase().includes(q);
        const matchesCivilId = (inq.nationalId || "").toLowerCase().includes(q);
        const matchesNumber = (inq.inquiryNumber || "").toLowerCase().includes(q);
        const matchesDesc = (inq.incidentDescription || inq.description || inq.customType || "").toLowerCase().includes(q);
        const matchesType = (inq.violationTypeArabic || inq.violationType || inq.inquiryType || "").toLowerCase().includes(q);

        if (!matchesName && !matchesCivilId && !matchesNumber && !matchesDesc && !matchesType) {
          return false;
        }
      }

      return true;
    });
  }, [activeInquiries, activeTab, selectedViolationType, searchQuery]);

  // Handle Quick Print
  const handleQuickPrint = (inq: AdministrativeInquiry) => {
    try {
      printAdministrativeInquiryPdf(inq);
      showToast({
        message: "تم تجهيز نموذج المساءلة الإدارية الرسمي للطباعة.",
        type: "success",
      });
    } catch (err) {
      console.error("فشل طباعة المساءلة الإدارية:", err);
      showToast({
        message: "حدث خطأ أثناء تجهيز ملف الطباعة.",
        type: "error",
      });
    }
  };

  // Handle Quick WhatsApp Share
  const handleWhatsAppShare = (inq: AdministrativeInquiry) => {
    const teacher = teachers.find((t) => t.id === inq.teacherId);
    const phone = inq.teacherPhone || teacher?.mobile || teacher?.phone || "";
    openAdministrativeInquiryWhatsApp(inq, phone);
    markAdministrativeInquiryLinkShared(inq.id);
    showToast({
      message: "تم فتح محادثة واتساب مع المعلمة برابط المساءلة المباشر.",
      type: "success",
    });
  };

  // Handle Copy Message & Link
  const handleCopyMessage = async (inq: AdministrativeInquiry) => {
    try {
      const msg = generateAdministrativeInquiryWhatsAppMessage(inq);
      await navigator.clipboard.writeText(msg);
      markAdministrativeInquiryLinkShared(inq.id);
      showToast({
        message: "تم نسخ رسالة ورابط المساءلة الإدارية بنجاح إلى الحافظة.",
        type: "success",
      });
    } catch (err) {
      console.error("فشل نسخ الرسالة:", err);
      showToast({
        message: "تعذر نسخ الرسالة إلى الحافظة.",
        type: "error",
      });
    }
  };

  // Handle Soft-Delete to Archive
  const handleConfirmDelete = async (reason?: string) => {
    if (!inquiryToDelete) return;
    const target = inquiryToDelete;
    setInquiryToDelete(null);

    const { deletedInquiry } = deleteAdministrativeInquiry(target.id, reason);
    if (deletedInquiry) {
      showToast({
        message: "تم نقل المساءلة الإدارية إلى الأرشيف الإداري بنجاح.",
        type: "success",
        action: {
          label: "عرض الأرشيف",
          onClick: () => router.push("/archive"),
        },
      });
    } else {
      showToast({
        message: "تعذر نقل المساءلة إلى الأرشيف.",
        type: "error",
      });
    }
  };

  // Columns Definition
  const columns: ColumnDef<AdministrativeInquiry>[] = [
    {
      id: "inquiryNumber",
      header: "رقم المساءلة",
      accessorKey: "inquiryNumber",
      align: "right",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shrink-0 font-mono text-xs font-bold">
            <Scale className="w-4 h-4" />
          </span>
          <div>
            <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 block">
              {row.inquiryNumber}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">مساءلة خطية</span>
          </div>
        </div>
      ),
    },
    {
      id: "teacher",
      header: "المعلمة / الموظفة",
      accessorKey: "teacherName",
      align: "right",
      cell: ({ row }) => (
        <div>
          <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>{row.teacherName}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
            <span>سجل: {row.nationalId || "—"}</span>
            {row.jobTitle && <span>• {row.jobTitle}</span>}
          </div>
        </div>
      ),
    },
    {
      id: "violationType",
      header: "نوع المساءلة",
      accessorKey: "inquiryType",
      align: "right",
      cell: ({ row }) => {
        const displayType =
          row.inquiryType === "أخرى" && (row.customType || row.customViolationType)
            ? `أخرى: ${row.customType || row.customViolationType}`
            : row.inquiryType || row.violationTypeArabic || row.violationType || "مساءلة خطية";
        return (
          <div className="max-w-xs">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
              {displayType}
            </span>
            {(row.description || row.incidentDescription) && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1">
                {row.description || row.incidentDescription}
              </p>
            )}
          </div>
        );
      },
    },
    {
      id: "incidentDate",
      header: "التاريخ",
      accessorKey: "incidentDate",
      align: "center",
      cell: ({ row }) => (
        <div className="text-center font-mono text-xs text-slate-700 dark:text-slate-300">
          <div className="flex items-center justify-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{row.incidentDate}</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            حررت: {row.inquiryDate || row.incidentDate}
          </span>
        </div>
      ),
    },
    {
      id: "status",
      header: "الحالة",
      accessorKey: "status",
      align: "center",
      cell: ({ row }) => {
        if (row.status === "completed") {
          const isAccepted = row.directorDecision === "accepted";
          return (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border",
                isAccepted
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80"
                  : "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/80"
              )}
            >
              {isAccepted ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              )}
              <span>{isAccepted ? "عذر مقبول (حفظ)" : "عذر غير مقبول"}</span>
            </span>
          );
        }

        if (row.status === "pending_director" || row.status === "teacher_responded") {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{row.status === "teacher_responded" ? "تم إرسال الإفادة" : "بانتظار قرار الإدارة"}</span>
            </span>
          );
        }

        if (row.status === "expired") {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
              <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
              <span>منتهية الصلاحية (48 س)</span>
            </span>
          );
        }

        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80">
            <FileEdit className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>بانتظار إفادة المعلمة</span>
          </span>
        );
      },
    },
    {
      id: "createdAt",
      header: "تاريخ الإنشاء",
      accessorKey: "createdAt",
      align: "center",
      cell: ({ row }) => (
        <div className="text-center font-mono text-xs text-slate-500 dark:text-slate-400">
          <span>{row.createdAt ? row.createdAt.split("T")[0] : "—"}</span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "الإجراءات",
      align: "center",
      cell: ({ row }) => {
        const menuItems: ActionMenuItem[] = [
          {
            id: "details",
            label: "عرض",
            icon: Eye,
            onClick: () => setSelectedInquiryForDetails(row),
          },
          {
            id: "print",
            label: "طباعة",
            icon: Printer,
            onClick: () => handleQuickPrint(row),
          },
          {
            id: "whatsapp",
            label: "إعادة إرسال الرابط",
            icon: MessageSquare,
            onClick: () => handleWhatsAppShare(row),
          },
          {
            id: "copy",
            label: "نسخ الرسالة والرابط",
            icon: Copy,
            onClick: () => handleCopyMessage(row),
          },
        ];

        if (row.status === "pending_director" || row.status === "teacher_responded") {
          menuItems.push({
            id: "review",
            label: "مراجعة الإفادة واعتماد القرار",
            icon: ShieldCheck,
            onClick: () => setSelectedInquiryForReview(row),
          });
        }

        if (row.status === "pending_teacher") {
          menuItems.push({
            id: "edit",
            label: "تعديل قبل الإرسال",
            icon: Pencil,
            onClick: () => {
              setInquiryToEdit(row);
              setIsCreateModalOpen(true);
            },
          });
        }

        menuItems.push({
          id: "delete",
          label: "أرشفة",
          icon: Trash2,
          variant: "danger",
          onClick: () => setInquiryToDelete(row),
        });

        return (
          <div className="flex items-center justify-center gap-1.5">
            {row.status === "pending_director" && (
              <Button
                size="sm"
                variant="warning"
                onClick={() => setSelectedInquiryForReview(row)}
                className="text-[11px] h-7 px-2.5 font-bold"
              >
                <span>مراجعة واعتماد</span>
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleQuickPrint(row)}
              className="text-[11px] h-7 px-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="طباعة المساءلة"
            >
              <Printer className="w-3.5 h-3.5" />
            </Button>

            <ActionMenu items={menuItems} align="left" />
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/50 dark:bg-slate-950 pb-16 font-sans" dir="rtl">
      {/* Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: "لوحة التحكم", href: "/" },
          { label: "الإجراءات والقرارات", href: "/procedures/list" },
          { label: "المسائلات الإدارية" },
        ]}
        title="سجل المسائلات الإدارية"
        subtitle="إدارة دورة المسائلات الإدارية والخطية وتتبع إفادات المعلمات وقرارات الإدارة المعتمدة بدقة وسرية تامة"
        badge={totalCount > 0 ? `${totalCount} مساءلة مسجلة` : "دورة إدارية متكاملة"}
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="primary"
              onClick={() => {
                setInquiryToEdit(null);
                setIsCreateModalOpen(true);
              }}
              className="gap-2 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>إنشاء مساءلة إدارية جديدة</span>
            </Button>
          </div>
        }
      />

      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div onClick={() => setActiveTab("all")} className="cursor-pointer">
            <KpiCard
              title="إجمالي المسائلات"
              value={totalCount}
              subtitle="كافة المسائلات المسجلة"
              icon={<Scale className="w-5 h-5 text-indigo-700 dark:text-indigo-400" />}
              variant="indigo"
              className={activeTab === "all" ? "ring-2 ring-indigo-600" : ""}
            />
          </div>

          <div onClick={() => setActiveTab("pending_teacher")} className="cursor-pointer">
            <KpiCard
              title="بانتظار إفادة المعلمة"
              value={pendingTeacherCount}
              subtitle="رابط المساءلة مرسل"
              icon={<Clock className="w-5 h-5 text-sky-600 dark:text-sky-400" />}
              variant="sky"
              className={activeTab === "pending_teacher" ? "ring-2 ring-sky-600" : ""}
            />
          </div>

          <div onClick={() => setActiveTab("pending_director")} className="cursor-pointer">
            <KpiCard
              title="بانتظار قرار المديرة"
              value={pendingDirectorCount}
              subtitle="تم تقديم الإفادة"
              icon={<ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
              variant="amber"
              className={activeTab === "pending_director" ? "ring-2 ring-amber-600" : ""}
            />
          </div>

          <div className="cursor-pointer">
            <KpiCard
              title="عذر مقبول (حفظ)"
              value={acceptedCount}
              subtitle="تم قبول المبررات"
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
              variant="emerald"
            />
          </div>

          <div className="cursor-pointer">
            <KpiCard
              title="عذر غير مقبول"
              value={rejectedCount}
              subtitle="محال للإجراء النظامي"
              icon={<XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
              variant="rose"
            />
          </div>

          <div onClick={() => setActiveTab("expired")} className="cursor-pointer">
            <KpiCard
              title="منتهية الصلاحية"
              value={expiredCount}
              subtitle="تجاوزت مهلة 48 ساعة"
              icon={<AlertTriangle className="w-5 h-5 text-slate-600 dark:text-slate-400" />}
              variant="slate"
              className={activeTab === "expired" ? "ring-2 ring-slate-600" : ""}
            />
          </div>
        </div>

        {/* Filter Tabs & Search Controls */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Horizontal Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800 rounded-xl">
              {[
                { id: "all", label: "الكل", count: totalCount },
                { id: "pending_teacher", label: "بانتظار إفادة المعلمة", count: pendingTeacherCount },
                { id: "pending_director", label: "بانتظار قرار المديرة", count: pendingDirectorCount },
                { id: "completed", label: "مكتملة ومعتمدة", count: acceptedCount + rejectedCount },
                { id: "expired", label: "منتهية الصلاحية", count: expiredCount },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as FilterTab)}
                  className={cn(
                    "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer",
                    activeTab === tab.id
                      ? "bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs border border-slate-200/60 dark:border-slate-700"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-full text-3xs font-mono font-bold",
                      activeTab === tab.id
                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Violation Dropdown & Search Input */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <div className="w-full sm:w-56">
                <select
                  value={selectedViolationType}
                  onChange={(e) => setSelectedViolationType(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  {VIOLATION_TYPE_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث باسم المعلمة، الهوية، رقم المساءلة..."
                  className="w-full pr-10 pl-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <DataTable<AdministrativeInquiry>
          columns={columns}
          data={filteredInquiries}
          keyExtractor={(item) => item.id}
          emptyTitle="لا توجد مسائلات إدارية"
          emptyDescription="لم يتم العثور على أي مسائلات إدارية تطابق خيارات التصفية الحالية."
        />
      </main>

      {/* Create / Edit Modal */}
      <CreateAdministrativeInquiryModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setInquiryToEdit(null);
        }}
        inquiryToEdit={inquiryToEdit}
      />

      {/* Review Modal */}
      <AdministrativeInquiryReviewModal
        isOpen={Boolean(selectedInquiryForReview)}
        onClose={() => setSelectedInquiryForReview(null)}
        inquiry={selectedInquiryForReview}
      />

      {/* Details Modal */}
      <AdministrativeInquiryDetailsModal
        isOpen={Boolean(selectedInquiryForDetails)}
        onClose={() => setSelectedInquiryForDetails(null)}
        inquiry={selectedInquiryForDetails}
        onEdit={(inq) => {
          setSelectedInquiryForDetails(null);
          setInquiryToEdit(inq);
          setIsCreateModalOpen(true);
        }}
        onReview={(inq) => {
          setSelectedInquiryForDetails(null);
          setSelectedInquiryForReview(inq);
        }}
      />

      {/* Soft-Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(inquiryToDelete)}
        title="نقل المساءلة إلى الأرشيف الإداري"
        message={`هل أنتِ متأكدة من رغبتكِ في أرشفة مساءلة المعلمة (${inquiryToDelete?.teacherName || ""}) رقم (${inquiryToDelete?.inquiryNumber || ""})؟ ستتمكنين من استعادتها من الأرشيف في أي وقت.`}
        confirmLabel="نعم، نقل للأرشيف"
        variant="archive"
        showReasonInput={true}
        reasonPlaceholder="اكتبي سبب أرشفة المساءلة (مثال: حفظت بقرار داخلي / تكرار...)"
        onConfirm={handleConfirmDelete}
        onCancel={() => setInquiryToDelete(null)}
      />
    </div>
  );
}
