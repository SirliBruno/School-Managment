"use client";

import React, { useState, useRef, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  Plus,
  ChevronLeft,
  Calendar,
  FileDown,
  Loader2,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  FileText,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeachers } from "@/context/TeacherContext";
import { AbsenceRecord, AbsenceType, Teacher } from "@/types/teacher";
import { KpiCards } from "@/components/analytics/KpiCards";
import { AbsenceCharts } from "@/components/analytics/AbsenceCharts";
import { TeacherProfileModal } from "@/components/teachers/TeacherProfileModal";
import { printAbsencePdf } from "@/lib/printPdfService";

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

const tableRowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.03,
      duration: 0.25,
      ease: "easeOut" as const,
    },
  }),
};

export default function DashboardPage() {
  const { teachers, absenceRecords } = useTeachers();
  const [searchQuery, setSearchQuery] = useState("");
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [selectedTeacherForProfile, setSelectedTeacherForProfile] =
    useState<Teacher | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Dynamic Arabic formatted date
  const todayFormatted = useMemo(() => {
    try {
      const now = new Date();
      return new Intl.DateTimeFormat("ar-SA", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(now);
    } catch {
      return "الأربعاء، 16 سبتمبر 2026 م";
    }
  }, []);

  // Filter recent absences based on search
  const filteredRecentAbsences = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const records = absenceRecords.slice(0, 10);
    if (!q) return records;

    return records.filter(
      (r) =>
        r.teacherName.toLowerCase().includes(q) ||
        r.specialty.toLowerCase().includes(q) ||
        r.jobNumber.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q)
    );
  }, [absenceRecords, searchQuery]);

  // Direct PDF export from dashboard
  const handleExportPdf = async (record: AbsenceRecord) => {
    if (generatingId) return;

    const teacher =
      teachers.find((t) => t.id === record.teacherId) ||
      ({
        id: record.teacherId,
        name: record.teacherName,
        jobNumber: record.jobNumber,
        specialty: record.specialty,
        totalAbsences: 1,
      } as Teacher);

    setGeneratingId(record.id);
    setFeedback(null);

    try {
      printAbsencePdf({
        teacherName: record.teacherName,
        username: record.jobNumber,
        specialty: record.specialty,
        jobTitle: teacher.jobTitle || "معلم",
        employmentStatus: teacher.employmentStatus || "دائم",
        absenceCount: teacher.totalAbsences || 1,
        absenceDate: record.date,
        absenceType: record.type,
        absenceReason: record.reason,
      });

      setFeedback({
        type: "success",
        message: `تم تجهيز استمارة مساءلة (${record.teacherName}) للطباعة بنجاح.`,
      });
    } catch (err) {
      console.error("فشل طباعة مستند المساءلة PDF:", err);
      setFeedback({
        type: "error",
        message: "تعذر طباعة الاستمارة حالياً. يرجى المحاولة لاحقاً.",
      });
    } finally {
      setGeneratingId(null);
    }
  };

  const openTeacherProfileByName = (teacherName: string, teacherId?: string) => {
    const matched =
      teachers.find((t) => (teacherId && t.id === teacherId) || t.name === teacherName);
    if (matched) {
      setSelectedTeacherForProfile(matched);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">

      {/* Top Bar Header */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-20 shadow-2xs">
        <div className="px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span>نظام الإدارة المدرسية</span>
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>لوحة التحكم الإدارية</span>
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="text-[#137a85] font-semibold">المؤشرات والإحصائيات</span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900">
              لوحة التحكم والتحليلات الإدارية
            </h1>
          </div>

          {/* User Profile & Date Header Controls */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium shadow-2xs">
              <Calendar className="w-4 h-4 text-[#137a85]" />
              <span>{todayFormatted}</span>
            </div>

            {/* User Avatar */}
            <div className="flex items-center gap-3 pr-2 border-r border-slate-200">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="w-10 h-10 rounded-full bg-[#137a85] text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-teal-100"
              >
                نش
              </motion.div>
              <div className="hidden md:block text-right">
                <span className="block text-sm font-bold text-slate-800 leading-tight">
                  أ. نورة الشهري
                </span>
                <span className="block text-xs text-slate-500">
                  وكيلة الشؤون التعليمية والمدرسية
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Animated Feedback Toast */}
      <AnimatePresence>
        {feedback && (
          <div className="px-6 lg:px-8 pt-4">
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              role="alert"
              className={cn(
                "p-3.5 rounded-2xl border flex items-center justify-between text-xs shadow-md max-w-7xl mx-auto",
                feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-950 border-emerald-300"
                  : "bg-rose-50 text-rose-950 border-rose-300"
              )}
            >
              <div className="flex items-center gap-2.5">
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="font-bold">{feedback.message}</span>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={() => setFeedback(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-black/5 cursor-pointer"
                aria-label="إغلاق الإشعار"
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Body */}
      <main className="flex-1 p-3.5 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl w-full mx-auto">
        {/* Section 1: KPI Cards */}
        <section aria-labelledby="kpi-heading">
          <div className="mb-4">
            <h2 id="kpi-heading" className="text-base font-bold text-slate-800">
              ملخص المؤشرات اليومية والشهرية
            </h2>
            <p className="text-xs text-slate-500">
              بيانات حية مستخرجة ومحدثة تلقائياً من سجلات الكادر التعليمي
            </p>
          </div>

          <KpiCards />
        </section>

        {/* Section 2: Interactive Analytics & Visualizations */}
        <section aria-labelledby="analytics-heading">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2
                id="analytics-heading"
                className="text-base font-bold text-slate-800"
              >
                التحليلات البيانية لحالات الغياب
              </h2>
              <p className="text-xs text-slate-500">
                متابعة اتجاهات الغياب وتوزيع أسبابه لاتخاذ الإجراءات الإدارية المناسبة
              </p>
            </div>
          </div>

          <AbsenceCharts />
        </section>

        {/* Section 3: Recent Absences Activity Table */}
        <section className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
          {/* Section Header */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  سجل المساءلات والإجراءات الإدارية الحديثة
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-[#137a85] border border-teal-200">
                  محدث لحظياً
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                عرض مباشر لآخر المساءلات المسجلة مع إمكانية تصدير استمارة مساءلة الغياب الرسمية
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/procedures/absence">
                <motion.span
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#137a85] text-white hover:bg-teal-700 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إصدار مساءلة جديدة</span>
                </motion.span>
              </Link>
              <Link href="/teachers">
                <motion.span
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
                >
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>إدارة المعلمات</span>
                </motion.span>
              </Link>
            </div>
          </div>

          {/* Quick Search Bar */}
          <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث باسم المعلمة، الرقم الوظيفي، أو التخصص..."
                className="w-full pl-8 pr-9 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#137a85]/20 focus:border-[#137a85] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="مسح البحث"
                  aria-label="مسح نص البحث"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>إجمالي المساءلات:</span>
              <strong className="font-mono text-slate-800 font-bold">
                {absenceRecords.length}
              </strong>
            </div>
          </div>

          {/* Table of Absences */}
          {absenceRecords.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-3.5">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-400 flex items-center justify-center shadow-2xs">
                <FileText className="w-7 h-7" aria-hidden="true" />
              </div>
              <div className="max-w-md space-y-1">
                <h4 className="text-base font-bold text-slate-800">
                  لا توجد مساءلات مسجلة حالياً
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  ابدئي بإنشاء أول مساءلة إدارية للمعلمات لمتابعة حالات الغياب بدقة وتوثيقها.
                </p>
              </div>
              <div className="pt-1 flex items-center gap-3">
                <Link href="/procedures/absence">
                  <motion.span
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#137a85] text-white hover:bg-teal-700 shadow-sm shadow-teal-700/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إصدار مساءلة جديدة</span>
                  </motion.span>
                </Link>
                <Link href="/teachers">
                  <motion.span
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    className="inline-block px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    استيراد المعلمات
                  </motion.span>
                </Link>
              </div>
            </div>
          ) : filteredRecentAbsences.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 space-y-2">
              <p className="font-bold text-slate-700">لا توجد نتائج مطابقة لبحثك &ldquo;{searchQuery}&rdquo;</p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-[#137a85] font-semibold hover:underline cursor-pointer"
              >
                إلغاء التصفية
              </button>
            </div>
          ) : (
            <>
              {/* Desktop / Tablet Table View (md+) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 select-none">
                    <tr>
                      <th scope="col" className="py-3 px-4">#</th>
                      <th scope="col" className="py-3 px-4">اسم المعلمة</th>
                      <th scope="col" className="py-3 px-4">التخصص</th>
                      <th scope="col" className="py-3 px-4">طبيعة الغياب</th>
                      <th scope="col" className="py-3 px-4">تاريخ الغياب</th>
                      <th scope="col" className="py-3 px-4">السبب المسجل</th>
                      <th scope="col" className="py-3 px-4 text-center">الإجراءات والملف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRecentAbsences.map((item, idx) => {
                      const style =
                        TYPE_STYLES[item.type] || TYPE_STYLES["أخرى"];
                      const isExporting = generatingId === item.id;

                      return (
                        <motion.tr
                          key={item.id}
                          custom={idx}
                          variants={tableRowVariants}
                          initial="hidden"
                          animate="visible"
                          className="hover:bg-slate-50/80 transition-colors duration-150"
                        >
                          <td className="py-3 px-4 font-mono text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <button
                              type="button"
                              onClick={() =>
                                openTeacherProfileByName(
                                  item.teacherName,
                                  item.teacherId
                                )
                              }
                              className="text-right hover:text-[#137a85] hover:underline cursor-pointer flex items-center gap-2 group"
                              title="عرض ملف المعلمة وسجلها التراكمي"
                            >
                              <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[11px] group-hover:bg-[#137a85] group-hover:text-white transition-colors">
                                {item.teacherName.charAt(0)}
                              </div>
                              <span>{item.teacherName}</span>
                            </button>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {item.specialty}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={cn(
                                "inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                                style.bg,
                                style.text,
                                style.border
                              )}
                            >
                              {item.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-mono">
                            {item.date}
                          </td>
                          <td className="py-3 px-4 text-slate-700 max-w-xs truncate font-medium">
                            {item.reason}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                type="button"
                                onClick={() => handleExportPdf(item)}
                                disabled={isExporting}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 text-[#137a85] hover:bg-[#137a85] hover:text-white border border-teal-200/80 transition-all cursor-pointer disabled:opacity-50"
                                title="تصدير استمارة مساءلة الغياب الرسمية PDF"
                              >
                                {isExporting ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <FileDown className="w-3.5 h-3.5" />
                                )}
                                <span>PDF</span>
                              </motion.button>
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                type="button"
                                onClick={() =>
                                  openTeacherProfileByName(
                                    item.teacherName,
                                    item.teacherId
                                  )
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                                title="عرض ملف المعلمة"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                <span>الملف</span>
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View (< md) */}
              <div className="md:hidden divide-y divide-slate-100">
                {filteredRecentAbsences.map((item, idx) => {
                  const style =
                    TYPE_STYLES[item.type] || TYPE_STYLES["أخرى"];
                  const isExporting = generatingId === item.id;

                  return (
                    <motion.div
                      key={item.id}
                      custom={idx}
                      variants={tableRowVariants}
                      initial="hidden"
                      animate="visible"
                      className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition-colors"
                    >
                      {/* Top Row: Teacher Avatar + Name + Type Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openTeacherProfileByName(
                              item.teacherName,
                              item.teacherId
                            )
                          }
                          className="flex items-center gap-2.5 text-right hover:text-[#137a85] cursor-pointer"
                        >
                          <div className="w-9 h-9 rounded-full bg-teal-50 text-[#137a85] flex items-center justify-center font-bold text-sm shrink-0 border border-teal-100">
                            {item.teacherName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-sm text-slate-900 block leading-tight">
                              {item.teacherName}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {item.specialty} • {item.jobNumber}
                            </span>
                          </div>
                        </button>

                        <span
                          className={cn(
                            "inline-block px-2.5 py-1 rounded-full text-xs font-bold border shrink-0",
                            style.bg,
                            style.text,
                            style.border
                          )}
                        >
                          {item.type}
                        </span>
                      </div>

                      {/* Middle Details: Date & Reason */}
                      <div className="bg-slate-50 rounded-xl p-2.5 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-slate-500">
                          <span className="flex items-center gap-1 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>تاريخ الغياب:</span>
                          </span>
                          <span className="font-mono font-semibold text-slate-700 tabular-nums">
                            {item.date}
                          </span>
                        </div>

                        <div className="text-slate-700 pt-1 border-t border-slate-200/60">
                          <span className="text-slate-400 font-medium ml-1">السبب:</span>
                          <span className="font-medium">{item.reason}</span>
                        </div>
                      </div>

                      {/* Bottom Actions: Full-Width PDF & Profile View */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => handleExportPdf(item)}
                          disabled={isExporting}
                          className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-teal-50 text-[#137a85] hover:bg-[#137a85] hover:text-white border border-teal-200/80 transition-all cursor-pointer disabled:opacity-50"
                          title="تصدير استمارة مساءلة الغياب الرسمية PDF"
                        >
                          {isExporting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <FileDown className="w-4 h-4" />
                          )}
                          <span>{isExporting ? "جاري التصدير..." : "استمارة PDF"}</span>
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() =>
                            openTeacherProfileByName(
                              item.teacherName,
                              item.teacherId
                            )
                          }
                          className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                          title="عرض ملف المعلمة"
                        >
                          <Eye className="w-4 h-4 text-slate-500" />
                          <span>عرض الملف</span>
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}

          {/* Table Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <span>
              عرض {filteredRecentAbsences.length} من أحدث المساءلات المعتمدة
            </span>
            <Link
              href="/procedures/absence"
              className="flex items-center gap-1 text-[#137a85] font-semibold hover:underline"
            >
              <span>الانتقال لصفحة مساءلة الغياب الكاملة</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      </main>

      {/* Teacher Profile Modal */}
      {selectedTeacherForProfile && (
        <TeacherProfileModal
          teacher={selectedTeacherForProfile}
          onClose={() => setSelectedTeacherForProfile(null)}
        />
      )}
    </div>
  );
}
