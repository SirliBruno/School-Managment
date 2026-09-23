"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Archive,
  RotateCcw,
  Trash2,
  Search,
  Users,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Calendar,
  AlertCircle,
  Briefcase,
  Layers,
  Sparkles,
  Phone,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { useToast } from "@/context/ToastContext";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { cn } from "@/lib/utils";

type ArchiveTab = "teachers" | "absences" | "delays";

export default function ArchivePage() {
  const {
    archivedTeachers,
    archivedAbsences,
    archivedDelayNotices,
    restoreFromArchive,
    permanentDeleteFromArchive,
    clearArchive,
  } = useTeachers();

  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<ArchiveTab>("teachers");
  const [searchQuery, setSearchQuery] = useState("");

  // Confirmation Modals State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "teacher" | "absence" | "delay";
    id: string;
    title: string;
  } | null>(null);

  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);

  // Filtered Lists
  const filteredTeachers = useMemo(() => {
    if (!searchQuery.trim()) return archivedTeachers;
    const q = searchQuery.toLowerCase().trim();
    return archivedTeachers.filter(
      (a) =>
        a.teacher.fullName.toLowerCase().includes(q) ||
        (a.teacher.username && a.teacher.username.toLowerCase().includes(q)) ||
        (a.teacher.specialty && a.teacher.specialty.toLowerCase().includes(q))
    );
  }, [archivedTeachers, searchQuery]);

  const filteredAbsences = useMemo(() => {
    if (!searchQuery.trim()) return archivedAbsences;
    const q = searchQuery.toLowerCase().trim();
    return archivedAbsences.filter(
      (a) =>
        a.record.teacherName.toLowerCase().includes(q) ||
        a.record.date.includes(q) ||
        a.record.type.toLowerCase().includes(q) ||
        a.record.reason.toLowerCase().includes(q)
    );
  }, [archivedAbsences, searchQuery]);

  const filteredDelays = useMemo(() => {
    if (!searchQuery.trim()) return archivedDelayNotices;
    const q = searchQuery.toLowerCase().trim();
    return archivedDelayNotices.filter(
      (d) =>
        (d.notice.teacherName &&
          d.notice.teacherName.toLowerCase().includes(q)) ||
        d.notice.noticeDate.includes(q) ||
        (d.notice.noticeNumber &&
          d.notice.noticeNumber.toLowerCase().includes(q)) ||
        (d.notice.notes && d.notice.notes.toLowerCase().includes(q))
    );
  }, [archivedDelayNotices, searchQuery]);

  // Handlers
  const handleRestore = (
    type: "teacher" | "absence" | "delay",
    id: string,
    name: string
  ) => {
    const success = restoreFromArchive(type, id);
    if (success) {
      showToast({
        message: `تمت استعادة (${name}) بنجاح وإعادتها إلى القوائم النشطة.`,
        type: "success",
      });
    } else {
      showToast({
        message: "لم يتم العثور على العنصر في الأرشيف.",
        type: "error",
      });
    }
  };

  const confirmPermanentDelete = () => {
    if (!deleteTarget) return;
    const success = permanentDeleteFromArchive(
      deleteTarget.type,
      deleteTarget.id
    );
    if (success) {
      showToast({
        message: `تم حذف (${deleteTarget.title}) نهائياً من الأرشيف.`,
        type: "info",
      });
    }
    setDeleteTarget(null);
  };

  const handleClearAll = () => {
    clearArchive();
    setIsClearAllModalOpen(false);
    showToast({
      message: "تم تفريغ الأرشيف ومسح كافة العناصر المؤرشفة نهائياً.",
      type: "info",
    });
  };

  const totalArchived =
    archivedTeachers.length +
    archivedAbsences.length +
    archivedDelayNotices.length;

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
        <div className="px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span>نظام الإدارة المدرسية</span>
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="text-[#137a85] font-semibold">
                الأرشيف الإداري
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <Archive className="w-6 h-6 text-[#137a85]" />
              سجل الأرشيف والاستعادة
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {totalArchived > 0 && (
              <button
                type="button"
                onClick={() => setIsClearAllModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>تفريغ الأرشيف بالكامل</span>
              </button>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200/60 text-xs text-[#137a85] font-semibold">
              <Layers className="w-4 h-4" />
              <span>إجمالي المؤرشف: {totalArchived}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Teachers */}
          <div
            onClick={() => setActiveTab("teachers")}
            className={cn(
              "p-5 rounded-2xl border transition-all cursor-pointer shadow-xs",
              activeTab === "teachers"
                ? "bg-teal-50/50 border-[#137a85] ring-2 ring-[#137a85]/20"
                : "bg-white border-slate-200 hover:border-slate-300"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">
                  المعلمات المؤرشفات
                </p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">
                  {archivedTeachers.length}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  مع حفظ سجلاتهن المرتبطة
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-teal-100/60 text-[#137a85] flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Card 2: Absences */}
          <div
            onClick={() => setActiveTab("absences")}
            className={cn(
              "p-5 rounded-2xl border transition-all cursor-pointer shadow-xs",
              activeTab === "absences"
                ? "bg-teal-50/50 border-[#137a85] ring-2 ring-[#137a85]/20"
                : "bg-white border-slate-200 hover:border-slate-300"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">
                  سجلات الغياب المؤرشفة
                </p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">
                  {archivedAbsences.length}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  سجلات فردية قابلة للاستعادة
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-100/60 text-amber-700 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Card 3: Delay Notices */}
          <div
            onClick={() => setActiveTab("delays")}
            className={cn(
              "p-5 rounded-2xl border transition-all cursor-pointer shadow-xs",
              activeTab === "delays"
                ? "bg-teal-50/50 border-[#137a85] ring-2 ring-[#137a85]/20"
                : "bg-white border-slate-200 hover:border-slate-300"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">
                  تنبيهات التأخر المؤرشفة
                </p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">
                  {archivedDelayNotices.length}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  إشعارات ومسودات محفوظة
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-100/60 text-indigo-700 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Header & Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Tab Switcher */}
          <div className="flex items-center gap-2 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab("teachers")}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                activeTab === "teachers"
                  ? "bg-white text-[#137a85] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Users className="w-4 h-4" />
              <span>المعلمات ({archivedTeachers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("absences")}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                activeTab === "absences"
                  ? "bg-white text-[#137a85] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <FileText className="w-4 h-4" />
              <span>سجلات الغياب ({archivedAbsences.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("delays")}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                activeTab === "delays"
                  ? "bg-white text-[#137a85] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Clock className="w-4 h-4" />
              <span>تنبيهات التأخر ({archivedDelayNotices.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في العناصر المؤرشفة..."
              className="w-full pr-10 pl-4 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#137a85]/20 focus:border-[#137a85] transition-all"
            />
          </div>
        </div>

        {/* Content Tab 1: Teachers */}
        {activeTab === "teachers" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {filteredTeachers.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Users className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-slate-700 text-sm">
                  لا توجد معلمات في الأرشيف
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  عند حذف أي معلمة من قائمة المعلمات، ستُحفظ هنا تلقائياً مع كامل سجلاتها ومساءلاتها.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">اسم المعلمة</th>
                      <th className="py-3.5 px-4">الرقم الوظيفي</th>
                      <th className="py-3.5 px-4">التخصص</th>
                      <th className="py-3.5 px-4">السجلات المحفوظة معها</th>
                      <th className="py-3.5 px-4">تاريخ الأرشفة</th>
                      <th className="py-3.5 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredTeachers.map((item) => (
                      <tr
                        key={item.teacher.id}
                        className="hover:bg-teal-50/30 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">
                            {item.teacher.fullName}
                          </div>
                          {item.teacher.mobile && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" />
                              <span dir="ltr">{item.teacher.mobile}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium">
                          {item.teacher.username || "—"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                            {item.teacher.specialty || item.teacher.teachingField || "عام"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 font-semibold text-[11px]">
                              {item.associatedRecords?.length || 0} غياب
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-semibold text-[11px]">
                              {item.associatedDelayNotices?.length || 0} تنبيه
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                          {new Date(item.archivedAt).toLocaleDateString("ar-SA", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleRestore(
                                  "teacher",
                                  item.teacher.id,
                                  item.teacher.fullName
                                )
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-[#137a85] hover:bg-teal-100 font-bold border border-teal-200/60 transition-all"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>استعادة</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  type: "teacher",
                                  id: item.teacher.id,
                                  title: item.teacher.fullName,
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold border border-rose-200/60 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف نهائي</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Content Tab 2: Absences */}
        {activeTab === "absences" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {filteredAbsences.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <FileText className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-slate-700 text-sm">
                  لا توجد سجلات غياب في الأرشيف
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  عند حذف أي سجل غياب فردي، سيُحفظ هنا مع إمكانية استعادته بضغطة زر.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">اسم المعلمة</th>
                      <th className="py-3.5 px-4">تاريخ الغياب</th>
                      <th className="py-3.5 px-4">نوع الغياب</th>
                      <th className="py-3.5 px-4">السبب الموثق</th>
                      <th className="py-3.5 px-4">تاريخ الأرشفة</th>
                      <th className="py-3.5 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredAbsences.map((item) => (
                      <tr
                        key={item.record.id}
                        className="hover:bg-teal-50/30 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {item.record.teacherName}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium">
                          {item.record.date}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              "px-2.5 py-0.5 rounded-full font-bold text-[11px]",
                              item.record.type === "مرضي"
                                ? "bg-rose-50 text-rose-700 border border-rose-200/60"
                                : item.record.type === "اضطراري"
                                ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                                : "bg-sky-50 text-sky-700 border border-sky-200/60"
                            )}
                          >
                            {item.record.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs truncate text-slate-600">
                          {item.record.reason || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                          {new Date(item.archivedAt).toLocaleDateString("ar-SA", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleRestore(
                                  "absence",
                                  item.record.id,
                                  `غياب ${item.record.teacherName} في ${item.record.date}`
                                )
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-[#137a85] hover:bg-teal-100 font-bold border border-teal-200/60 transition-all"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>استعادة</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  type: "absence",
                                  id: item.record.id,
                                  title: `غياب ${item.record.teacherName} في ${item.record.date}`,
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold border border-rose-200/60 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف نهائي</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Content Tab 3: Delay Notices */}
        {activeTab === "delays" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {filteredDelays.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Clock className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-slate-700 text-sm">
                  لا توجد تنبيهات تأخر في الأرشيف
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  عند حذف أي إشعار تأخر، سيُحفظ هنا مع خيار استعادته أو حذفه نهائياً.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">رقم الإشعار</th>
                      <th className="py-3.5 px-4">اسم المعلمة</th>
                      <th className="py-3.5 px-4">تاريخ الإشعار</th>
                      <th className="py-3.5 px-4">حالة الإشعار</th>
                      <th className="py-3.5 px-4">تاريخ الأرشفة</th>
                      <th className="py-3.5 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredDelays.map((item) => (
                      <tr
                        key={item.notice.id}
                        className="hover:bg-teal-50/30 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                          {item.notice.noticeNumber || "—"}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {item.notice.teacherName || "معلمة"}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium">
                          {item.notice.noticeDate}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              "px-2.5 py-0.5 rounded-full font-bold text-[11px]",
                              item.notice.status === "completed"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                : item.notice.status === "pending_director"
                                ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                                : "bg-sky-50 text-sky-700 border border-sky-200/60"
                            )}
                          >
                            {item.notice.status === "completed"
                              ? "مكتمل ومعتمد"
                              : item.notice.status === "pending_director"
                              ? "بانتظار قرار المديرة"
                              : "بانتظار رد المعلمة"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                          {new Date(item.archivedAt).toLocaleDateString("ar-SA", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleRestore(
                                  "delay",
                                  item.notice.id,
                                  `إشعار تأخر ${item.notice.teacherName || ""}`
                                )
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-[#137a85] hover:bg-teal-100 font-bold border border-teal-200/60 transition-all"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>استعادة</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget({
                                  type: "delay",
                                  id: item.notice.id,
                                  title: `إشعار تأخر ${item.notice.teacherName || ""}`,
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold border border-rose-200/60 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>حذف نهائي</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Confirmation Dialog for Single Permanent Delete */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="تأكيد الحذف النهائي"
        message={`هل أنتِ متأكدة من حذف (${deleteTarget?.title || ""}) نهائياً من الأرشيف؟ لا يمكن التراجع عن هذا الإجراء وسيتم مسحه كلياً.`}
        confirmLabel="نعم، حذف نهائي"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={confirmPermanentDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Confirmation Dialog for Clearing All Archive */}
      <ConfirmDialog
        isOpen={isClearAllModalOpen}
        title="تفريغ الأرشيف بالكامل"
        message="تحذير: سيتم حذف كافة المعلمات وسجلات الغياب وتنبيهات التأخر المؤرشفة نهائياً من النظام. هل ترغبين بالتأكيد؟"
        confirmLabel="تفريغ ومسح الكل"
        cancelLabel="تراجع"
        variant="danger"
        onConfirm={handleClearAll}
        onCancel={() => setIsClearAllModalOpen(false)}
      />
    </div>
  );
}
