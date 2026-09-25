"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Archive,
  Users,
  FileText,
  Clock,
  Undo2,
  Trash2,
  Search,
  ChevronLeft,
  Calendar,
  AlertTriangle,
  Sparkles,
  CheckSquare,
  Square,
  Info,
  Layers,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { useToast } from "@/context/ToastContext";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageHeader, KpiCard, Button } from "@/components/ui";
import { cn } from "@/lib/utils";

type ArchiveTab = "all" | "teachers" | "absences" | "delays";
type ArchiveEntityType = "teacher" | "absence" | "delay";

interface UnifiedArchiveItem {
  uid: string; // `${type}:${entityId}`
  type: ArchiveEntityType;
  entityId: string;
  title: string;
  subtitle: string;
  details: string;
  archivedAt: string;
  archiveReason?: string;
  archivedByCascade?: boolean;
  cascadedCount?: number;
}

const formatArabicArchiveDate = (isoDate: string): string => {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return isoDate;
    const datePart = new Intl.DateTimeFormat("ar-SA", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
    const timePart = new Intl.DateTimeFormat("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
    return `${datePart} - ${timePart}`;
  } catch {
    return isoDate;
  }
};

export default function ArchivePage() {
  const {
    archivedTeachers,
    archivedAbsences,
    archivedDelayNotices,
    restoreFromArchive,
    permanentDeleteFromArchive,
  } = useTeachers();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<ArchiveTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());

  // Single permanent delete confirmation state
  const [itemToDeletePermanently, setItemToDeletePermanently] =
    useState<UnifiedArchiveItem | null>(null);

  // Bulk permanent delete confirmation state
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

  // Build unified items sorted newest archivedAt first
  const allUnifiedItems = useMemo<UnifiedArchiveItem[]>(() => {
    const items: UnifiedArchiveItem[] = [];

    for (const at of archivedTeachers) {
      const t = at.teacher;
      const teacherName = t.fullName || t.name || "معلمة";
      const idDisplay = t.nationalId || t.username || t.jobNumber || "—";
      const spec = t.specialty || t.teachingField || "عام";
      const emp = t.employmentStatus || "دائم";

      // Count remaining cascaded records in archive for this teacher
      const cascadedAbs = archivedAbsences.filter(
        (a) => a.record.teacherId === t.id
      ).length;
      const cascadedDelays = archivedDelayNotices.filter(
        (d) => d.notice.teacherId === t.id
      ).length;

      items.push({
        uid: `teacher:${t.id}`,
        type: "teacher",
        entityId: t.id,
        title: teacherName,
        subtitle: `رقم الهوية: ${idDisplay} • التخصص: ${spec} • الحالة: ${emp}`,
        details:
          cascadedAbs + cascadedDelays > 0
            ? `مرتبط بها في الأرشيف: ${cascadedAbs} سجل غياب و ${cascadedDelays} تنبيه تأخر`
            : "لا توجد سجلات فرعية مرتبطة",
        archivedAt: at.archivedAt || t.archivedAt || new Date().toISOString(),
        archiveReason: at.archiveReason || t.archiveReason,
        archivedByCascade: false,
        cascadedCount: cascadedAbs + cascadedDelays,
      });
    }

    for (const aa of archivedAbsences) {
      const r = aa.record;
      const isCascade = Boolean(aa.archivedByCascade || r.archivedByCascade);
      items.push({
        uid: `absence:${r.id}`,
        type: "absence",
        entityId: r.id,
        title: `${r.teacherName || "معلمة"} — غياب (${r.type || "اضطراري"})`,
        subtitle: `تاريخ الغياب: ${r.date} • رقم الهوية: ${r.nationalId || r.jobNumber || "—"} • التخصص: ${r.specialty || "عام"}`,
        details: r.reason ? `السبب المسجل: ${r.reason}` : "",
        archivedAt: aa.archivedAt || r.archivedAt || new Date().toISOString(),
        archiveReason: aa.archiveReason || r.archiveReason,
        archivedByCascade: isCascade,
      });
    }

    for (const ad of archivedDelayNotices) {
      const n = ad.notice;
      const isCascade = Boolean(ad.archivedByCascade || n.archivedByCascade);
      const displayNum = n.noticeNumber || `ت-${n.id.slice(-4)}`;
      const statusLabel =
        n.status === "completed"
          ? "مكتمل"
          : n.status === "pending_director"
          ? "بانتظار المديرة"
          : "بانتظار إفادة المعلمة";

      items.push({
        uid: `delay:${n.id}`,
        type: "delay",
        entityId: n.id,
        title: `${n.teacherName || "معلمة"} — تنبيه تأخر رقم (${displayNum})`,
        subtitle: `تاريخ التنبيه: ${n.noticeDate || n.date || "—"} • رقم الهوية: ${n.nationalId || n.jobNumber || "—"} • الحالة: ${statusLabel}`,
        details: n.calculatedDuration
          ? `المدة المحتسبة: ${n.calculatedDuration}`
          : n.additionalNotes || "",
        archivedAt: ad.archivedAt || n.archivedAt || new Date().toISOString(),
        archiveReason: ad.archiveReason || n.archiveReason,
        archivedByCascade: isCascade,
      });
    }

    return items.sort(
      (a, b) =>
        new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime()
    );
  }, [archivedTeachers, archivedAbsences, archivedDelayNotices]);

  // Filter by activeTab and searchQuery
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allUnifiedItems.filter((item) => {
      if (activeTab === "teachers" && item.type !== "teacher") return false;
      if (activeTab === "absences" && item.type !== "absence") return false;
      if (activeTab === "delays" && item.type !== "delay") return false;

      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.details.toLowerCase().includes(q) ||
        (item.archiveReason || "").toLowerCase().includes(q)
      );
    });
  }, [allUnifiedItems, activeTab, searchQuery]);

  // Toggle single selection
  const toggleSelectItem = (uid: string) => {
    setSelectedUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  };

  // Toggle Select All for currently filtered items
  const isAllFilteredSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedUids.has(item.uid));

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      setSelectedUids((prev) => {
        const next = new Set(prev);
        for (const item of filteredItems) {
          next.delete(item.uid);
        }
        return next;
      });
    } else {
      setSelectedUids((prev) => {
        const next = new Set(prev);
        for (const item of filteredItems) {
          next.add(item.uid);
        }
        return next;
      });
    }
  };

  // Handle Single Restore
  const handleRestoreItem = (item: UnifiedArchiveItem) => {
    const result = restoreFromArchive(item.type, item.entityId);
    if (result.success) {
      setSelectedUids((prev) => {
        const next = new Set(prev);
        next.delete(item.uid);
        return next;
      });
      showToast({
        message:
          result.message ||
          `تم استعادة (${item.title}) إلى سجله الأصلي بنجاح.`,
        type: "success",
      });
    } else {
      showToast({
        message: result.error || "تعذر استعادة العنصر.",
        type: "error",
      });
    }
  };

  // Handle Single Permanent Delete
  const handleConfirmSinglePermanentDelete = () => {
    if (!itemToDeletePermanently) return;
    const target = itemToDeletePermanently;
    setItemToDeletePermanently(null);

    permanentDeleteFromArchive(target.type, target.entityId);
    setSelectedUids((prev) => {
      const next = new Set(prev);
      next.delete(target.uid);
      return next;
    });

    showToast({
      message: `تم الحذف النهائي للعنصر (${target.title}) من النظام.`,
      type: "info",
    });
  };

  // Handle Bulk Restore
  const handleBulkRestore = () => {
    if (selectedUids.size === 0) return;

    // Restore teachers first so any selected records belonging to them don't fail or duplicate
    const selectedItems = allUnifiedItems
      .filter((item) => selectedUids.has(item.uid))
      .sort((a, b) => (a.type === "teacher" ? -1 : b.type === "teacher" ? 1 : 0));

    let restoredCount = 0;
    let lastError: string | undefined;

    for (const item of selectedItems) {
      const res = restoreFromArchive(item.type, item.entityId);
      if (res.success) {
        restoredCount++;
      } else if (res.error) {
        lastError = res.error;
      }
    }

    setSelectedUids(new Set());

    if (restoredCount > 0) {
      showToast({
        message: `تم استعادة (${restoredCount}) عنصر إلى قوائمها النشطة بنجاح.`,
        type: "success",
      });
    } else if (lastError) {
      showToast({
        message: lastError,
        type: "error",
      });
    }
  };

  // Handle Bulk Permanent Delete
  const handleConfirmBulkPermanentDelete = () => {
    const selectedItems = allUnifiedItems.filter((item) =>
      selectedUids.has(item.uid)
    );
    for (const item of selectedItems) {
      permanentDeleteFromArchive(item.type, item.entityId);
    }
    const count = selectedItems.length;
    setSelectedUids(new Set());
    setIsBulkDeleteConfirmOpen(false);

    showToast({
      message: `تم الحذف النهائي لعدد (${count}) عنصر من الأرشيف الإداري.`,
      type: "info",
    });
  };

  return (
    <div dir="rtl" className="flex-1 flex flex-col min-w-0 font-sans">
      {/* Top Header */}
      <PageHeader
        breadcrumbs={[
          { label: "لوحة التحكم", href: "/" },
          { label: "الأرشيف الإداري" },
        ]}
        title="الأرشيف الإداري"
        subtitle="جميع العناصر المحذوفة محفوظة هنا. يمكنك استعادتها إلى قوائمها الأصلية أو حذفها نهائياً."
        badge={allUnifiedItems.length > 0 ? `${allUnifiedItems.length} عنصر` : undefined}
      />

      {/* Main Body */}
      <main className="flex-1 p-6 lg:p-8 space-y-6 max-w-6xl w-full mx-auto pb-28">
        {/* 3 KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div onClick={() => setActiveTab("teachers")} className="cursor-pointer">
            <KpiCard
              title="المعلمات المؤرشفة"
              value={archivedTeachers.length}
              variant="teal"
              icon={<Users className="w-5 h-5" />}
              className={activeTab === "teachers" ? "ring-2 ring-[#137a85]" : ""}
            />
          </div>

          <div onClick={() => setActiveTab("absences")} className="cursor-pointer">
            <KpiCard
              title="سجلات الغياب المؤرشفة"
              value={archivedAbsences.length}
              variant="sky"
              icon={<FileText className="w-5 h-5" />}
              className={activeTab === "absences" ? "ring-2 ring-sky-600" : ""}
            />
          </div>

          <div onClick={() => setActiveTab("delays")} className="cursor-pointer">
            <KpiCard
              title="تنبيهات التأخر المؤرشفة"
              value={archivedDelayNotices.length}
              variant="amber"
              icon={<Clock className="w-5 h-5" />}
              className={activeTab === "delays" ? "ring-2 ring-amber-600" : ""}
            />
          </div>
        </div>

          {/* Filter Tabs + Search + Select All Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
              {/* 4 Horizontal Scrollable Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer",
                    activeTab === "all"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <Layers className="w-3.5 h-3.5 text-[#137a85]" />
                  <span>الكل</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono">
                    {allUnifiedItems.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("teachers")}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer",
                    activeTab === "teachers"
                      ? "bg-white text-[#137a85] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>المعلمات</span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-50 text-[#137a85] text-[10px] font-mono">
                    {archivedTeachers.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("absences")}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer",
                    activeTab === "absences"
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>سجلات الغياب</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-mono">
                    {archivedAbsences.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("delays")}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer",
                    activeTab === "delays"
                      ? "bg-white text-amber-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>تنبيهات التأخر</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-mono">
                    {archivedDelayNotices.length}
                  </span>
                </button>
              </div>

              {/* Search Input */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث باسم المعلمة، رقم الهوية، التاريخ، السبب..."
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50/70 focus:bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#137a85]/20 focus:border-[#137a85] transition-all"
                />
              </div>
            </div>

            {/* Select All Bar when items exist */}
            {filteredItems.length > 0 && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="inline-flex items-center gap-2 font-bold text-slate-700 hover:text-[#137a85] transition-colors cursor-pointer"
                >
                  {isAllFilteredSelected ? (
                    <CheckSquare className="w-4 h-4 text-[#137a85]" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>تحديد الكل ({filteredItems.length})</span>
                </button>

                {selectedUids.size > 0 && (
                  <span className="text-xs font-bold text-[#137a85]">
                    تم تحديد {selectedUids.size} عنصر
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Archive Cards List or Empty State */}
          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Archive className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                الأرشيف فارغ حالياً
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                أي معلمة أو سجل يتم حذفه سيظهر هنا تلقائياً لتتمكني من استعادته عند الحاجة.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item) => {
                  const isSelected = selectedUids.has(item.uid);

                  const badgeConfig =
                    item.type === "teacher"
                      ? {
                          label: "معلمة",
                          bg: "bg-teal-50 text-[#137a85] border-teal-200",
                          iconBg: "bg-teal-50 text-[#137a85] border-teal-100",
                          Icon: Users,
                        }
                      : item.type === "absence"
                      ? {
                          label: "سجل غياب",
                          bg: "bg-blue-50 text-blue-700 border-blue-200",
                          iconBg: "bg-blue-50 text-blue-600 border-blue-100",
                          Icon: FileText,
                        }
                      : {
                          label: "تنبيه تأخر",
                          bg: "bg-amber-50 text-amber-800 border-amber-200",
                          iconBg: "bg-amber-50 text-amber-600 border-amber-100",
                          Icon: Clock,
                        };

                  const TypeIcon = badgeConfig.Icon;

                  return (
                    <motion.div
                      key={item.uid}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      className={cn(
                        "bg-white rounded-2xl border p-5 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs",
                        isSelected
                          ? "border-[#137a85] bg-teal-50/20 ring-1 ring-[#137a85]/20"
                          : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        {/* Selection Checkbox */}
                        <button
                          type="button"
                          onClick={() => toggleSelectItem(item.uid)}
                          className="mt-2 text-slate-400 hover:text-[#137a85] transition-colors cursor-pointer shrink-0"
                          aria-label={`تحديد ${item.title}`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-[#137a85]" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>

                        {/* Type Icon */}
                        <div
                          className={cn(
                            "w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 mt-0.5",
                            badgeConfig.iconBg
                          )}
                        >
                          <TypeIcon className="w-5 h-5" />
                        </div>

                        {/* Item Details */}
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                                badgeConfig.bg
                              )}
                            >
                              {badgeConfig.label}
                            </span>

                            {item.archivedByCascade && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                أُرشف تلقائياً
                              </span>
                            )}

                            <h3 className="text-sm font-bold text-slate-900 truncate">
                              {item.title}
                            </h3>
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed">
                            {item.subtitle}
                          </p>

                          {item.details && (
                            <p className="text-xs text-slate-500">
                              {item.details}
                            </p>
                          )}

                          {/* Archive Metadata Row */}
                          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
                            <span className="inline-flex items-center gap-1 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                أُرشف في: {formatArabicArchiveDate(item.archivedAt)}
                              </span>
                            </span>

                            {item.archiveReason && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-medium">
                                <Info className="w-3 h-3 text-[#137a85]" />
                                <span>سبب الأرشفة: {item.archiveReason}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleRestoreItem(item)}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-all cursor-pointer"
                        >
                          <Undo2 className="w-4 h-4" />
                          <span>استعادة</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setItemToDeletePermanently(item)}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50/60 hover:bg-rose-600 hover:text-white border border-rose-200 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>حذف نهائي</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </main>

        {/* Floating Bulk Action Bar */}
        <AnimatePresence>
          {selectedUids.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed bottom-5 left-4 right-4 lg:right-72 z-40 max-w-3xl mx-auto"
            >
              <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 font-bold font-mono text-sm flex items-center justify-center border border-teal-400/30">
                    {selectedUids.size}
                  </span>
                  <span className="text-xs sm:text-sm font-bold">
                    عنصر محدد من الأرشيف الإداري
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedUids(new Set())}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    إلغاء التحديد
                  </button>

                  <button
                    type="button"
                    onClick={handleBulkRestore}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>استعادة المحدد ({selectedUids.size})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsBulkDeleteConfirmOpen(true)}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف نهائي ({selectedUids.size})</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Single Permanent Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(itemToDeletePermanently)}
        title="تأكيد الحذف النهائي"
        message={
          itemToDeletePermanently
            ? `العنصر: "${itemToDeletePermanently.title}"\nتحذير: الحذف النهائي لا يمكن التراجع عنه! سيتم إزالة هذا العنصر من النظام بشكل دائم.`
            : ""
        }
        confirmLabel="نعم، حذف نهائي"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={handleConfirmSinglePermanentDelete}
        onCancel={() => setItemToDeletePermanently(null)}
      />

      {/* Bulk Permanent Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={isBulkDeleteConfirmOpen}
        title={`تأكيد الحذف النهائي لـ (${selectedUids.size}) عنصر`}
        message="تحذير: الحذف النهائي لا يمكن التراجع عنه! سيتم إزالة جميع العناصر المحددة من النظام بشكل دائم."
        confirmLabel={`حذف نهائي (${selectedUids.size})`}
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={handleConfirmBulkPermanentDelete}
        onCancel={() => setIsBulkDeleteConfirmOpen(false)}
      />
    </div>
  );
}
