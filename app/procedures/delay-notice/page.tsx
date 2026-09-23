"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Clock,
  Plus,
  Users,
  Search,
  Filter,
  FileDown,
  Eye,
  Pencil,
  Trash2,
  FileEdit,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  LogIn,
  LogOut,
  DoorOpen,
  ArrowRight,
  RotateCcw,
  Share2,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { useToast } from "@/context/ToastContext";
import { DelayNotice, DelayNoticeStatus } from "@/types/teacher";
import { CreateDelayNoticeModal } from "@/components/procedures/CreateDelayNoticeModal";
import { TeacherResponseModal } from "@/components/procedures/TeacherResponseModal";
import { DirectorDecisionModal } from "@/components/procedures/DirectorDecisionModal";
import { DelayNoticeDetailsModal } from "@/components/procedures/DelayNoticeDetailsModal";
import { ShareDelayNoticeModal } from "@/components/procedures/ShareDelayNoticeModal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { printDelayNoticePdf } from "@/lib/printDelayNoticePdfService";
import { cn } from "@/lib/utils";

type FilterTab = "all" | DelayNoticeStatus;

export default function DelayNoticePage() {
  const { delayNotices, teachers, deleteDelayNotice, restoreDelayNotice } =
    useTeachers();
  const { showToast } = useToast();

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [noticeToEdit, setNoticeToEdit] = useState<DelayNotice | null>(null);

  const [selectedNoticeForDetails, setSelectedNoticeForDetails] =
    useState<DelayNotice | null>(null);
  const [selectedNoticeForShare, setSelectedNoticeForShare] =
    useState<DelayNotice | null>(null);
  const [selectedNoticeForResponse, setSelectedNoticeForResponse] =
    useState<DelayNotice | null>(null);
  const [selectedNoticeForDecision, setSelectedNoticeForDecision] =
    useState<DelayNotice | null>(null);
  const [noticeToDelete, setNoticeToDelete] = useState<DelayNotice | null>(null);

  // Statistics
  const totalCount = delayNotices.length;
  const pendingTeacherCount = delayNotices.filter(
    (n) => n.status === "pending_teacher"
  ).length;
  const pendingDirectorCount = delayNotices.filter(
    (n) => n.status === "pending_director"
  ).length;
  const completedCount = delayNotices.filter(
    (n) => n.status === "completed"
  ).length;

  // Filtered and searched list
  const filteredNotices = useMemo(() => {
    return delayNotices.filter((notice) => {
      // Tab filter
      if (activeTab !== "all" && notice.status !== activeTab) {
        return false;
      }

      // Search query
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      const name = (notice.teacherName || "").toLowerCase();
      const job = (notice.jobNumber || "").toLowerCase();
      const num = (notice.noticeNumber || notice.id).toLowerCase();
      const spec = (notice.specialty || "").toLowerCase();
      const d = notice.noticeDate || notice.date || "";

      return (
        name.includes(q) ||
        job.includes(q) ||
        num.includes(q) ||
        spec.includes(q) ||
        d.includes(q)
      );
    });
  }, [delayNotices, activeTab, searchQuery]);

  // Handle Delete with Undo Toast
  const handleConfirmDelete = async () => {
    if (!noticeToDelete) return;
    const target = noticeToDelete;
    setNoticeToDelete(null);

    const { deletedNotice } = deleteDelayNotice(target.id);
    if (deletedNotice) {
      const backup = deletedNotice;
      const displayNum = backup.noticeNumber || `ت-${backup.id.slice(-4)}`;
      showToast({
        message: `تم حذف تنبيه التأخر برقم (${displayNum}) للمعلمة (${target.teacherName || "المعلمة"}).`,
        type: "success",
        action: {
          label: "تراجع",
          onClick: () => {
            restoreDelayNotice(backup);
            showToast({
              message: `تم استرجاع التنبيه برقم (${displayNum}) بنجاح.`,
              type: "info",
            });
          },
        },
      });
    } else {
      showToast({
        message: "تعذر حذف التنبيه.",
        type: "error",
      });
    }
  };

  const handleQuickPrint = (notice: DelayNotice) => {
    try {
      printDelayNoticePdf(notice);
    } catch (err) {
      console.error("فشل طباعة التنبيه:", err);
      showToast({ message: "حدث خطأ أثناء إعداد الـ PDF.", type: "error" });
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
        <div className="px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span>نظام الإدارة المدرسية</span>
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>الإجراءات الإدارية</span>
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="text-[#137a85] font-semibold">
                تنبيه عن تأخر / انصراف
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <span>تنبيه عن تأخر / انصراف</span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                نموذج و.م.ع.ن - ٠٢ - ٠٢
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setNoticeToEdit(null);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#137a85] hover:bg-teal-700 text-white shadow-sm transition-all cursor-pointer hover:shadow"
            >
              <Plus className="w-4 h-4" />
              <span>إصدار تنبيه جديد</span>
            </button>

            <Link
              href="/teachers"
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors shadow-2xs"
            >
              <Users className="w-4 h-4 text-[#137a85]" />
              <span>سجل المعلمات ({teachers.length})</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 p-6 lg:p-8 space-y-6 max-w-6xl w-full mx-auto">
        {/* KPI Mini-Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">
                إجمالي تنبيهات التأخر
              </p>
              <p className="text-2xl font-extrabold text-slate-900 mt-0.5 font-mono">
                {totalCount}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#137a85] flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Pending Teacher */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">
                بانتظار إفادة المعلمة
              </p>
              <p className="text-2xl font-extrabold text-sky-600 mt-0.5 font-mono">
                {pendingTeacherCount}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <FileEdit className="w-5 h-5" />
            </div>
          </div>

          {/* Pending Director */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">
                بانتظار قرار المديرة
              </p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-extrabold text-amber-600 font-mono">
                  {pendingDirectorCount}
                </span>
                {pendingDirectorCount > 0 && (
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                    يتطلب اعتماد
                  </span>
                )}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          {/* Completed */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">
                إجراءات مكتملة ومعتمدة
              </p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-0.5 font-mono">
                {completedCount}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Workflow Guide Banner */}
        <div className="bg-linear-to-r from-teal-50 via-emerald-50/40 to-slate-50 p-4 rounded-2xl border border-teal-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <span className="font-bold text-[#137a85] block text-sm">
              المسار الإداري المعتمد لنموذج (و.م.ع.ن - ٠٢ - ٠٢):
            </span>
            <p className="text-slate-600 leading-relaxed">
              1. الوكيلة تُسجل المخالفة وتحدد وقتها ⬅️ 2. المعلمة تُقدم إفادتها ومبررها ⬅️ 3. المديرة تصدر قرارها (قبول العذر أو الحسم) ثم طباعة النموذج الرسمي A4.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setNoticeToEdit(null);
              setIsCreateModalOpen(true);
            }}
            className="self-start md:self-center shrink-0 px-3.5 py-2 rounded-xl bg-[#137a85] text-white font-bold hover:bg-teal-700 transition-colors shadow-2xs cursor-pointer"
          >
            بدء إجراء جديد
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200/80 overflow-x-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={cn(
                "py-1.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                activeTab === "all"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              الكل ({totalCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("pending_teacher")}
              className={cn(
                "py-1.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5",
                activeTab === "pending_teacher"
                  ? "bg-white text-sky-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <span>بانتظار المعلمة</span>
              <span className="px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-800 text-[10px]">
                {pendingTeacherCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("pending_director")}
              className={cn(
                "py-1.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5",
                activeTab === "pending_director"
                  ? "bg-white text-amber-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <span>بانتظار المديرة</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px]">
                {pendingDirectorCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("completed")}
              className={cn(
                "py-1.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5",
                activeTab === "completed"
                  ? "bg-white text-emerald-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <span>مكتمل</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
                {completedCount}
              </span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم المعلمة أو رقم التنبيه..."
              className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#137a85]/20 focus:border-[#137a85] transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Notices Table / Cards */}
        {filteredNotices.length === 0 ? (
          <div className="p-12 rounded-3xl bg-white border border-slate-200 text-center space-y-3 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Clock className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {searchQuery || activeTab !== "all"
                ? "لم يتم العثور على تنبيهات مطابقة للبحث أو التصفية"
                : "لا توجد تنبيهات تأخر مسجلة حتى الآن"}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              {searchQuery || activeTab !== "all"
                ? "جربي تعديل كلمة البحث أو اختيار تصنيف آخر لعرض السجلات."
                : "يمكنك إصدار أول تنبيه تأخر رسمي للمعلمة بضغطة زر وتوثيق النموذج كاملاً."}
            </p>
            {searchQuery || activeTab !== "all" ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveTab("all");
                }}
                className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#137a85] hover:bg-teal-50 transition-colors"
              >
                <span>إعادة ضبط التصفية</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setNoticeToEdit(null);
                  setIsCreateModalOpen(true);
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#137a85] text-white hover:bg-teal-700 transition-colors shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>إصدار أول تنبيه</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th scope="col" className="py-3.5 px-4">رقم وتاريخ التنبيه</th>
                      <th scope="col" className="py-3.5 px-4">المعلمة</th>
                      <th scope="col" className="py-3.5 px-4">نوع المخالفة الموثقة</th>
                      <th scope="col" className="py-3.5 px-4">الحالة والمرحلة</th>
                      <th scope="col" className="py-3.5 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredNotices.map((notice) => {
                      return (
                        <tr
                          key={notice.id}
                          className="hover:bg-slate-50/70 transition-colors duration-150"
                        >
                          {/* Number and Date */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-mono font-bold text-[#137a85] text-xs">
                              {notice.noticeNumber || `ت-${notice.id.slice(-4)}`}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              <span className="font-mono">{notice.noticeDate || notice.date}</span>
                            </div>
                          </td>

                          {/* Teacher info */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 text-xs">
                              {notice.teacherName}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                              <span className="font-mono">{notice.jobNumber}</span>
                              <span>•</span>
                              <span>{notice.specialty || "عام"}</span>
                            </div>
                          </td>

                          {/* Violations tags */}
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {notice.violationDelayStart && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                                  <LogIn className="w-3 h-3 text-amber-600" />
                                  <span>
                                    تأخر من بداية الدوام ({notice.delayStartFromTime ? `${notice.delayStartFromTime} - ` : ""}{notice.delayStartTime || "—"})
                                  </span>
                                  {notice.calculatedDuration && (
                                    <span className="bg-amber-200/60 px-1 rounded text-[9px] text-amber-900">
                                      {notice.calculatedDuration}
                                    </span>
                                  )}
                                </span>
                              )}
                              {notice.violationAbsentDuring && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>عدم تواجد أثناء الدوام ({notice.absentFromTime} - {notice.absentToTime})</span>
                                  {notice.calculatedDuration && (
                                    <span className="bg-amber-200/60 px-1 rounded text-[9px] text-amber-900">
                                      {notice.calculatedDuration}
                                    </span>
                                  )}
                                </span>
                              )}
                              {notice.violationEarlyDeparture && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                                  <LogOut className="w-3 h-3 text-amber-600" />
                                  <span>
                                    انصراف مبكر قبل نهاية الدوام ({notice.earlyDepartureFromTime ? `${notice.earlyDepartureFromTime} - ` : ""}{notice.earlyDepartureTime || "—"})
                                  </span>
                                  {notice.calculatedDuration && (
                                    <span className="bg-amber-200/60 px-1 rounded text-[9px] text-amber-900">
                                      {notice.calculatedDuration}
                                    </span>
                                  )}
                                </span>
                              )}
                              {notice.violationLeftSchool && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                                  <DoorOpen className="w-3 h-3 text-amber-600" />
                                  <span>
                                    انصراف من غير المدرسة {notice.leftSchoolFromTime && notice.leftSchoolToTime ? `(${notice.leftSchoolFromTime} - ${notice.leftSchoolToTime})` : ""}
                                  </span>
                                  {notice.calculatedDuration && (
                                    <span className="bg-amber-200/60 px-1 rounded text-[9px] text-amber-900">
                                      {notice.calculatedDuration}
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {notice.status === "pending_teacher" && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-600 animate-pulse" />
                                  <span>بانتظار إفادة المعلمة</span>
                                </span>
                                {notice.linkSharedAt && (
                                  <span
                                    title="تمت مشاركة رابط الإفادة مع المعلمة"
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs"
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>تم إرسال الرابط</span>
                                  </span>
                                )}
                              </div>
                            )}
                            {notice.status === "pending_director" && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                                <span>بانتظار قرار المديرة</span>
                              </span>
                            )}
                            {notice.status === "completed" && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>
                                  {notice.directorOpinion === "accepted"
                                    ? "مكتمل (قبول العذر)"
                                    : "مكتمل (تقرر الحسم)"}
                                </span>
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Details button */}
                              <button
                                type="button"
                                onClick={() => setSelectedNoticeForDetails(notice)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                                title="عرض المراحل والتفاصيل"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Share with Teacher Button */}
                              {notice.status === "pending_teacher" && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedNoticeForShare(notice)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 transition-all cursor-pointer shadow-2xs"
                                  title="مشاركة الرابط وإرساله عبر الواتساب"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                  <span>مشاركة</span>
                                </button>
                              )}

                              {/* Smart Stage CTA Button */}
                              {notice.status === "pending_teacher" && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedNoticeForResponse(notice)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white border border-sky-200 transition-all cursor-pointer"
                                  title="تسجيل إفادة المعلمة يدوياً"
                                >
                                  <FileEdit className="w-3.5 h-3.5" />
                                  <span>الإفادة</span>
                                </button>
                              )}

                              {notice.status === "pending_director" && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedNoticeForDecision(notice)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-600 hover:text-white border border-amber-200 transition-all cursor-pointer"
                                  title="اتخاذ قرار المديرة"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>القرار</span>
                                </button>
                              )}

                              {/* PDF Print Button */}
                              <button
                                type="button"
                                onClick={() => handleQuickPrint(notice)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-teal-50 text-[#137a85] hover:bg-[#137a85] hover:text-white border border-teal-200 transition-all cursor-pointer"
                                title="طباعة النموذج الرسمي A4 (PDF)"
                              >
                                <FileDown className="w-3.5 h-3.5" />
                                <span>PDF</span>
                              </button>

                              {/* Edit button (only if stage 1) */}
                              {notice.status === "pending_teacher" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNoticeToEdit(notice);
                                    setIsCreateModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-50 border border-amber-200 transition-colors cursor-pointer"
                                  title="تعديل بيانات التنبيه"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete button */}
                              <button
                                type="button"
                                onClick={() => setNoticeToDelete(notice)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                                title="حذف التنبيه"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {filteredNotices.map((notice) => {
                return (
                  <div
                    key={notice.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <span className="font-mono text-xs font-bold text-[#137a85] block">
                          {notice.noticeNumber || `ت-${notice.id.slice(-4)}`}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900 mt-0.5">
                          {notice.teacherName}
                        </h4>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {notice.jobNumber} • {notice.specialty || "عام"}
                        </span>
                      </div>

                      <div className="text-left">
                        <span className="text-[11px] font-mono text-slate-500 block">
                          {notice.noticeDate || notice.date}
                        </span>
                        <div className="mt-1">
                          {notice.status === "pending_teacher" && (
                            <div className="flex items-center gap-1 flex-wrap justify-end">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                                <span>إفادة المعلمة</span>
                              </span>
                              {notice.linkSharedAt && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>أُرسل الرابط</span>
                                </span>
                              )}
                            </div>
                          )}
                          {notice.status === "pending_director" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <span>قرار المديرة</span>
                            </span>
                          )}
                          {notice.status === "completed" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span>معتمد</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Violations */}
                    <div className="flex flex-wrap gap-1">
                      {notice.violationDelayStart && (
                        <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                          <span>تأخر من بداية الدوام ({notice.delayStartFromTime ? `${notice.delayStartFromTime} - ` : ""}{notice.delayStartTime})</span>
                          {notice.calculatedDuration && <span className="font-bold">({notice.calculatedDuration})</span>}
                        </span>
                      )}
                      {notice.violationAbsentDuring && (
                        <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                          <span>عدم تواجد أثناء الدوام ({notice.absentFromTime} - {notice.absentToTime})</span>
                          {notice.calculatedDuration && <span className="font-bold">({notice.calculatedDuration})</span>}
                        </span>
                      )}
                      {notice.violationEarlyDeparture && (
                        <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                          <span>انصراف مبكر قبل نهاية الدوام ({notice.earlyDepartureFromTime ? `${notice.earlyDepartureFromTime} - ` : ""}{notice.earlyDepartureTime})</span>
                          {notice.calculatedDuration && <span className="font-bold">({notice.calculatedDuration})</span>}
                        </span>
                      )}
                      {notice.violationLeftSchool && (
                        <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                          <span>انصراف من غير المدرسة {notice.leftSchoolFromTime && notice.leftSchoolToTime ? `(${notice.leftSchoolFromTime} - ${notice.leftSchoolToTime})` : ""}</span>
                          {notice.calculatedDuration && <span className="font-bold">({notice.calculatedDuration})</span>}
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setSelectedNoticeForDetails(notice)}
                        className="flex-1 min-w-[70px] py-1.5 rounded-xl text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>التفاصيل</span>
                      </button>

                      {notice.status === "pending_teacher" && (
                        <button
                          type="button"
                          onClick={() => setSelectedNoticeForShare(notice)}
                          className="flex-1 min-w-[70px] py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>مشاركة</span>
                        </button>
                      )}

                      {notice.status === "pending_teacher" && (
                        <button
                          type="button"
                          onClick={() => setSelectedNoticeForResponse(notice)}
                          className="flex-1 min-w-[70px] py-1.5 rounded-xl text-xs font-bold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                          <span>الإفادة</span>
                        </button>
                      )}

                      {notice.status === "pending_director" && (
                        <button
                          type="button"
                          onClick={() => setSelectedNoticeForDecision(notice)}
                          className="flex-1 min-w-[70px] py-1.5 rounded-xl text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>القرار</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleQuickPrint(notice)}
                        className="py-1.5 px-2.5 rounded-xl text-xs font-bold bg-teal-50 text-[#137a85] border border-teal-200 hover:bg-[#137a85] hover:text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setNoticeToDelete(notice)}
                        className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* 1. Modal: Create / Edit Delay Notice (Stage 1) */}
      <CreateDelayNoticeModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setNoticeToEdit(null);
        }}
        noticeToEdit={noticeToEdit}
      />

      {/* 2. Modal: Share Delay Notice with Teacher (Public Link & WhatsApp) */}
      <ShareDelayNoticeModal
        isOpen={Boolean(selectedNoticeForShare)}
        onClose={() => setSelectedNoticeForShare(null)}
        notice={selectedNoticeForShare}
      />

      {/* 3. Modal: Teacher Response (Stage 2) */}
      <TeacherResponseModal
        isOpen={Boolean(selectedNoticeForResponse)}
        onClose={() => setSelectedNoticeForResponse(null)}
        notice={selectedNoticeForResponse}
      />

      {/* 4. Modal: Director Decision (Stage 3) */}
      <DirectorDecisionModal
        isOpen={Boolean(selectedNoticeForDecision)}
        onClose={() => setSelectedNoticeForDecision(null)}
        notice={selectedNoticeForDecision}
      />

      {/* 5. Modal: Full 3-Stage Details */}
      <DelayNoticeDetailsModal
        isOpen={Boolean(selectedNoticeForDetails)}
        onClose={() => setSelectedNoticeForDetails(null)}
        notice={selectedNoticeForDetails}
        onOpenEdit={(n) => {
          setNoticeToEdit(n);
          setIsCreateModalOpen(true);
        }}
        onOpenTeacherResponse={(n) => setSelectedNoticeForResponse(n)}
        onOpenDirectorDecision={(n) => setSelectedNoticeForDecision(n)}
        onOpenShare={(n) => setSelectedNoticeForShare(n)}
        onOpenDelete={(n) => setNoticeToDelete(n)}
      />

      {/* 5. Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(noticeToDelete)}
        title="تأكيد حذف تنبيه التأخر"
        message={
          noticeToDelete
            ? `هل أنتِ متأكدة من حذف إشعار التنبيه برقم (${noticeToDelete.noticeNumber || `ت-${noticeToDelete.id.slice(-4)}`}) الصادر بحق المعلمة (${noticeToDelete.teacherName || "المعلمة"})؟ سيتم تحديث رصيد المعلمة تلقائياً مع إمكانية التراجع الفوري.`
            : ""
        }
        confirmLabel="نعم، حذف التنبيه"
        cancelLabel="إلغاء"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setNoticeToDelete(null)}
      />
    </div>
  );
}
