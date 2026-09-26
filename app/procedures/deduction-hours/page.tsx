"use client";

import React, { useState, useMemo, useEffect, Suspense, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Printer,
  Save,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Calculator,
  UserCheck,
  Building2,
  ShieldAlert,
  ChevronDown,
  FileCheck,
  Zap,
  Sparkles,
  Sliders,
  CheckSquare,
  Square,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { useToast } from "@/context/ToastContext";
import { Teacher, DeductionDecision, DelayNotice } from "@/types/teacher";
import { TeacherCombobox } from "@/components/procedures/TeacherCombobox";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageHeader, Card, Button, Badge } from "@/components/ui";
import {
  calculateDeduction,
  validateDeductionForm,
  MINUTES_PER_WORK_DAY,
  MINUTES_PER_HOUR,
} from "@/lib/deductionCalculator";
import {
  printDeductionDecisionPdf,
  DeductionDecisionPdfData,
} from "@/lib/printDeductionDecisionPdfService";
import {
  getTeacherDelaySummary,
  calculateSchoolDelaySummaries,
  getSchoolRadarKPIs,
  calculateNoticeDurationMinutes,
} from "@/lib/delayDeductionIntegration";
import { getSaudiToday } from "@/lib/timeUtils";
import { cn } from "@/lib/utils";

function DeductionHoursContent() {
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLDivElement>(null);

  const {
    teachers,
    delayNotices,
    deductionDecisions,
    inquiries,
    createDeductionDecision,
    deleteDeductionDecision,
  } = useTeachers();
  const { showToast } = useToast();

  // Mode: smart (auto-calculated from delay notices) vs manual (custom input)
  const [calculationMode, setCalculationMode] = useState<"smart" | "manual">("smart");

  // Form State
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [selectedNoticeIds, setSelectedNoticeIds] = useState<string[]>([]);
  const [delayMinutes, setDelayMinutes] = useState<number>(420); // Default 7 hours = 1 day
  const [decisionNumber, setDecisionNumber] = useState<string>(
    () => `١٩/${new Date().getFullYear() % 100}/${Math.floor(100 + Math.random() * 900)}`
  );
  const [decisionDate, setDecisionDate] = useState<string>(() => getSaudiToday());
  const [schoolName, setSchoolName] = useState<string>("مدرسة الثانوية الخامسة مسارات");
  const [principalName, setPrincipalName] = useState<string>("أ. فاطمة بنت محمد الحربي");
  const [rank, setRank] = useState<string>("معلم ممارس");
  const [currentAction, setCurrentAction] = useState<string>("معلمة");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [decisionToDelete, setDecisionToDelete] = useState<DeductionDecision | null>(null);

  // Read URL parameters on mount
  useEffect(() => {
    const paramTeacherId = searchParams.get("teacherId");
    if (paramTeacherId && teachers.some((t) => t.id === paramTeacherId)) {
      setSelectedTeacherId(paramTeacherId);
      const found = teachers.find((t) => t.id === paramTeacherId);
      if (found?.jobTitle) setCurrentAction(found.jobTitle);
      setCalculationMode("smart");
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [searchParams, teachers]);

  // Mode switcher handler
  const handleSwitchMode = (mode: "smart" | "manual") => {
    setCalculationMode(mode);
    if (mode === "manual" && delayMinutes === 0) {
      setDelayMinutes(420);
    } else if (mode === "smart" && currentTeacherSummary) {
      setDelayMinutes(currentTeacherSummary.totalUnexcusedMinutes);
    }
  };

  // Selected Teacher object
  const selectedTeacher = useMemo(
    () => teachers.find((t) => t.id === selectedTeacherId) || null,
    [teachers, selectedTeacherId]
  );

  // School KPIs
  const schoolKpis = useMemo(() => {
    return getSchoolRadarKPIs({
      teachers,
      delayNotices,
      deductionDecisions,
      inquiries,
    });
  }, [teachers, delayNotices, deductionDecisions, inquiries]);

  // School summaries for radar
  const schoolSummaries = useMemo(() => {
    return calculateSchoolDelaySummaries(teachers, delayNotices, deductionDecisions);
  }, [teachers, delayNotices, deductionDecisions]);

  // Teachers due for deduction
  const teachersDue = useMemo(() => {
    return schoolSummaries.filter((s) => s.status === "due_for_deduction");
  }, [schoolSummaries]);

  // Teacher delay summary for selected teacher
  const currentTeacherSummary = useMemo(() => {
    if (!selectedTeacher) return null;
    return getTeacherDelaySummary(selectedTeacher, delayNotices, deductionDecisions);
  }, [selectedTeacher, delayNotices, deductionDecisions]);

  // Sync selected notices and minutes when teacher changes or smart mode is active
  useEffect(() => {
    if (!currentTeacherSummary) {
      setSelectedNoticeIds([]);
      return;
    }

    if (calculationMode === "smart") {
      const allUnsettledIds = currentTeacherSummary.unsettledNotices.map((n) => n.id);
      setSelectedNoticeIds(allUnsettledIds);

      // Total minutes = unsettled selected + carried over
      const activeMinutes = currentTeacherSummary.totalUnexcusedMinutes;
      setDelayMinutes(activeMinutes);
    }
  }, [selectedTeacherId, calculationMode, currentTeacherSummary]);

  // When selectedNoticeIds changes in smart mode, recompute minutes
  const handleToggleNotice = (noticeId: string) => {
    if (calculationMode !== "smart" || !currentTeacherSummary) return;

    setSelectedNoticeIds((prev) => {
      const isSelected = prev.includes(noticeId);
      const next = isSelected ? prev.filter((id) => id !== noticeId) : [...prev, noticeId];

      // Recompute minutes
      const chosenNotices = currentTeacherSummary.unsettledNotices.filter((n) =>
        next.includes(n.id)
      );
      const chosenNoticesMinutes = chosenNotices.reduce(
        (acc, curr) => acc + calculateNoticeDurationMinutes(curr),
        0
      );
      const total = chosenNoticesMinutes + currentTeacherSummary.carriedOverMinutes;
      setDelayMinutes(total);

      return next;
    });
  };

  // Quick Action from Radar: Auto-fill teacher
  const handleQuickDeductTeacher = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    setCalculationMode("smart");
    const t = teachers.find((item) => item.id === teacherId);
    if (t?.jobTitle) setCurrentAction(t.jobTitle);

    setErrors({});
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle teacher change from combobox
  const handleTeacherSelect = (teacher: Teacher | null) => {
    if (teacher) {
      setSelectedTeacherId(teacher.id);
      if (teacher.jobTitle) setCurrentAction(teacher.jobTitle);
      setErrors((prev) => {
        const next = { ...prev };
        delete next.teacherId;
        delete next.civilId;
        return next;
      });
    } else {
      setSelectedTeacherId("");
      setSelectedNoticeIds([]);
    }
  };

  // Calculation results
  const calculation = useMemo(
    () => calculateDeduction(delayMinutes),
    [delayMinutes]
  );

  // Set preset hours in manual mode
  const setPresetHours = (hours: number) => {
    const mins = hours * MINUTES_PER_HOUR;
    setDelayMinutes(mins);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.delayMinutes;
      delete next.totalHours;
      delete next.deductionDays;
      return next;
    });
  };

  // Prepare PDF data
  const pdfData: DeductionDecisionPdfData = useMemo(() => {
    return {
      teacherName: selectedTeacher?.fullName || "— يرجى اختيار المعلمة —",
      civilId: selectedTeacher?.nationalId || "—",
      specialization: selectedTeacher?.specialty || selectedTeacher?.teachingField || "عام",
      rank: rank || "معلم ممارس",
      jobNumber: selectedTeacher?.jobNumber || selectedTeacher?.nationalId || "—",
      currentAction: currentAction || selectedTeacher?.jobTitle || "معلمة",
      schoolName: schoolName,
      principalName: principalName,
      delayHours: calculation.totalHours,
      deductionDays: calculation.deductionDays,
      decisionNumber: decisionNumber,
      decisionDate: decisionDate,
    };
  }, [
    selectedTeacher,
    rank,
    currentAction,
    schoolName,
    principalName,
    calculation,
    decisionNumber,
    decisionDate,
  ]);

  // Handle Print Action
  const handlePrintPdf = () => {
    const validation = validateDeductionForm({
      teacherId: selectedTeacherId,
      teacherName: selectedTeacher?.fullName,
      civilId: selectedTeacher?.nationalId,
      delayMinutes,
      totalHours: calculation.totalHours,
      deductionDays: calculation.deductionDays,
      decisionNumber,
      decisionDate,
      principalName,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      showToast({
        message: "يرجى تعبئة كافة الحقول المطلوبة قبل الطباعة.",
        type: "error",
      });
      return;
    }

    setErrors({});
    printDeductionDecisionPdf(pdfData);
  };

  // Handle Save Action
  const handleSaveDecision = () => {
    const validation = validateDeductionForm({
      teacherId: selectedTeacherId,
      teacherName: selectedTeacher?.fullName,
      civilId: selectedTeacher?.nationalId,
      delayMinutes,
      totalHours: calculation.totalHours,
      deductionDays: calculation.deductionDays,
      decisionNumber,
      decisionDate,
      principalName,
    });

    if (!validation.isValid || !selectedTeacher) {
      setErrors(validation.errors);
      showToast({
        message: "يرجى استكمال الحقول المطلوبة لحفظ القرار.",
        type: "error",
      });
      return;
    }

    setErrors({});

    // Settle notice IDs if in smart mode, otherwise empty
    const settledNoticeIds =
      calculationMode === "smart" ? selectedNoticeIds : undefined;
    const remainderMinutes = calculation.remainderMinutes;

    const res = createDeductionDecision({
      decisionNumber,
      decisionDate,
      teacherId: selectedTeacher.id,
      teacherName: selectedTeacher.fullName,
      civilId: selectedTeacher.nationalId,
      specialization: selectedTeacher.specialty || selectedTeacher.teachingField || "عام",
      rank,
      jobNumber: selectedTeacher.jobNumber || selectedTeacher.nationalId,
      currentAction,
      schoolName,
      principalName,
      delayHours: calculation.totalHours,
      delayMinutes,
      deductionDays: calculation.deductionDays,
      settledNoticeIds,
      remainderMinutes,
    });

    if (res.success) {
      const savedPdfPayload: DeductionDecisionPdfData = {
        teacherName: selectedTeacher.fullName,
        civilId: selectedTeacher.nationalId,
        specialization: selectedTeacher.specialty || selectedTeacher.teachingField || "عام",
        rank,
        jobNumber: selectedTeacher.jobNumber || selectedTeacher.nationalId,
        currentAction,
        schoolName,
        principalName,
        delayHours: calculation.totalHours,
        deductionDays: calculation.deductionDays,
        decisionNumber,
        decisionDate,
      };

      showToast({
        message: `تم حفظ قرار الحسم رقم (${decisionNumber}) بنجاح وتمت تسوية (${
          settledNoticeIds?.length || 0
        }) تنبيه تأخر منعاً للازدواجية.`,
        type: "success",
        action: {
          label: "طباعة القرار (PDF)",
          onClick: () => printDeductionDecisionPdf(savedPdfPayload),
        },
      });
      // Generate next decision number
      setDecisionNumber(
        `١٩/${new Date().getFullYear() % 100}/${Math.floor(100 + Math.random() * 900)}`
      );
    } else {
      showToast({
        message: res.error || "تعذر حفظ القرار، يرجى المحاولة لاحقاً.",
        type: "error",
      });
    }
  };

  // Confirm delete decision
  const confirmDeleteDecision = (reason?: string) => {
    if (decisionToDelete) {
      deleteDeductionDecision(decisionToDelete.id, reason);
      setDecisionToDelete(null);
      showToast({
        message: "تم نقل قرار الحسم إلى الأرشيف الإداري.",
        type: "success",
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/50 pb-16">
      <PageHeader
        breadcrumbs={[
          { label: "الإجراءات الإدارية", href: "/procedures/list" },
          { label: "قرار حسم مجموع ساعات (نموذج 19)" },
        ]}
        title="قرار حسم مجموع ساعات تأخر وخروج مبكر"
        subtitle="نموذج رقم ( ١٩ ) برمز ( و.م.ع.ن - ٠٢ - ٠٣ ) استناداً للمادة (٢١) من لائحة الخدمة المدنية وقرار معالي الوزير رقم ١/١١٣٩"
        badge="نموذج رسمي 19"
      />

      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-medium block">
                إجمالي التأخر غير المعذور
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-mono font-extrabold text-slate-800">
                  {schoolKpis.totalUnexcusedHours}
                </span>
                <span className="text-xs text-slate-400 font-semibold">ساعة</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div
            className={cn(
              "p-4 rounded-2xl border shadow-xs flex items-center justify-between transition-colors",
              schoolKpis.teachersDueCount > 0
                ? "bg-rose-50/70 border-rose-200"
                : "bg-white border-slate-200/80"
            )}
          >
            <div>
              <span
                className={cn(
                  "text-xs font-bold block",
                  schoolKpis.teachersDueCount > 0 ? "text-rose-800" : "text-slate-500"
                )}
              >
                معلمات مستحقات للحسم (≥ 7س)
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span
                  className={cn(
                    "text-2xl font-mono font-extrabold",
                    schoolKpis.teachersDueCount > 0 ? "text-rose-700" : "text-slate-800"
                  )}
                >
                  {schoolKpis.teachersDueCount}
                </span>
                <span className="text-xs text-slate-400 font-semibold">معلمة</span>
              </div>
            </div>
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                schoolKpis.teachersDueCount > 0
                  ? "bg-rose-600 text-white shadow-sm shadow-rose-200 animate-pulse"
                  : "bg-slate-100 text-slate-500"
              )}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-medium block">
                قرارات الحسم الصادرة
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-mono font-extrabold text-teal-800">
                  {schoolKpis.decisionsIssuedCount}
                </span>
                <span className="text-xs text-slate-400 font-semibold">قرار</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-medium block">
                أيام الراتب المحسومة
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-mono font-extrabold text-slate-800">
                  {schoolKpis.totalDeductionDaysIssued}
                </span>
                <span className="text-xs text-slate-400 font-semibold">يوم عمل</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Proactive Radar: Teachers Due for Deduction */}
        {teachersDue.length > 0 && (
          <section className="bg-gradient-to-br from-rose-50/90 via-red-50/50 to-orange-50/40 border border-rose-200 rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-sm shadow-rose-300 shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-rose-950 flex items-center gap-2">
                    <span>رادار استحقاق الحسم المباشر (المادة 21)</span>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-rose-200 text-rose-800 font-extrabold">
                      {teachersDue.length} حالة مستحقة
                    </span>
                  </h3>
                  <p className="text-xs text-rose-700 mt-0.5">
                    معلمات تجاوزن نصاب الـ 7 ساعات (420 دقيقة) من التأخر غير المعذور ويستوجب النظام إصدار قرار حسم بحقهن.
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-white/80 border-b border-rose-200 text-rose-900 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">اسم المعلمة</th>
                    <th className="py-2.5 px-3">السجل المدني</th>
                    <th className="py-2.5 px-3">التخصص</th>
                    <th className="py-2.5 px-3">ساعات التأخر غير المعذورة</th>
                    <th className="py-2.5 px-3">أيام الحسم المستحقة</th>
                    <th className="py-2.5 px-3">تنبيهات غير مسواة</th>
                    <th className="py-2.5 px-3 text-center">إجراء فوري</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100 bg-white/60">
                  {teachersDue.map((due) => (
                    <tr key={due.teacherId} className="hover:bg-rose-50/80 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900">{due.teacherName}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">{due.nationalId}</td>
                      <td className="py-3 px-3 text-slate-600">{due.specialty}</td>
                      <td className="py-3 px-3 font-mono font-bold text-rose-700">
                        {due.totalUnexcusedHours} س ({due.totalUnexcusedMinutes} د)
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          {due.deductionDays} يوم
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {due.unsettledNotices.length} تنبيه
                        {due.carriedOverMinutes > 0 && (
                          <span className="text-2xs text-amber-700 block">
                            + {due.carriedOverMinutes} دقيقة مرحلة
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleQuickDeductTeacher(due.teacherId)}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-1.5 shadow-sm"
                        >
                          <Zap className="w-3.5 h-3.5 ml-1" />
                          إصدار قرار الحسم الآن ⚡
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Input Form Section */}
        <div ref={formRef} className="max-w-4xl mx-auto w-full space-y-6">
          {/* Mode Selector Toggle */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-teal-700" />
              <span className="text-xs font-bold text-slate-800">طريقة احتساب ساعات الحسم:</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleSwitchMode("smart")}
                className={cn(
                  "flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer",
                  calculationMode === "smart"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>حساب ذكي من واقع التنبيهات (المعتمد)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode("manual")}
                className={cn(
                  "flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer",
                  calculationMode === "manual"
                    ? "bg-slate-800 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>إدخال يدوي مخصص</span>
              </button>
            </div>
          </div>

          {/* Section 1: Teacher Selection Card */}
          <Card className="p-6 border-slate-200/80 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center font-bold">
                  ١
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">بيانات المعلمة محل القرار</h2>
                  <p className="text-xs text-slate-500">اختر المعلمة من السجل المدرسي المعتمد</p>
                </div>
              </div>
              {selectedTeacher && (
                <Badge variant="brand">{selectedTeacher.employmentStatus || "دائم"}</Badge>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                اسم المعلمة <span className="text-rose-500">*</span>
              </label>
              <TeacherCombobox
                teachers={teachers}
                selectedTeacherId={selectedTeacherId}
                onSelect={handleTeacherSelect}
                error={errors.teacherId}
              />
            </div>

            {selectedTeacher && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50/80 rounded-xl border border-slate-200/60 text-xs"
              >
                <div>
                  <span className="text-slate-400 block mb-0.5">السجل المدني</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedTeacher.nationalId}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">التخصص</span>
                  <span className="font-semibold text-slate-800">
                    {selectedTeacher.specialty || selectedTeacher.teachingField || "عام"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">الرقم الوظيفي</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {selectedTeacher.jobNumber || selectedTeacher.nationalId}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">حالة التوظيف</span>
                  <span className="font-semibold text-teal-700">
                    {selectedTeacher.employmentStatus || "دائم"}
                  </span>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  المستوى / المرتبة
                </label>
                <input
                  type="text"
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                  placeholder="مثال: معلم ممارس"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  العمل الحالي
                </label>
                <input
                  type="text"
                  value={currentAction}
                  onChange={(e) => setCurrentAction(e.target.value)}
                  placeholder="معلمة"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 outline-none"
                />
              </div>
            </div>
          </Card>

          {/* Section 2: Delay & Hours Calculator Card */}
          <Card className="p-6 border-slate-200/80 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  ٢
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    حاسبة ساعات التأخر وأيام الحسم
                  </h2>
                  <p className="text-xs text-slate-500">
                    كل 7 ساعات (420 دقيقة) = حسم يوم عمل واحد نظاماً
                  </p>
                </div>
              </div>
              <Badge variant="error">{calculation.deductionDays} يوم حسم</Badge>
            </div>

            {/* Smart Mode: Interactive Breakdown Table of Notices Being Settled */}
            {calculationMode === "smart" && currentTeacherSummary && (
              <div className="space-y-3 p-4 rounded-2xl bg-teal-50/50 border border-teal-200/70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-700" />
                    <h3 className="text-xs font-bold text-teal-900">
                      تنبيهات التأخر غير المعذورة المشمولة في هذا القرار:
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-teal-800">
                    {selectedNoticeIds.length} من {currentTeacherSummary.unsettledNotices.length} محددة
                  </span>
                </div>

                {currentTeacherSummary.unsettledNotices.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                    لا توجد تنبيهات تأخر غير معذورة مكتملة لهذه المعلمة حالياً.
                    {currentTeacherSummary.carriedOverMinutes > 0 && (
                      <span className="block mt-1 font-bold text-amber-700">
                        يوجد رصيد مرحل ({currentTeacherSummary.carriedOverMinutes}) دقيقة من قرارات سابقة.
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <tr>
                          <th className="py-2.5 px-3 w-8 text-center">شمول</th>
                          <th className="py-2.5 px-3">رقم وتاريخ التنبيه</th>
                          <th className="py-2.5 px-3">نوع المخالفة</th>
                          <th className="py-2.5 px-3">المدة المحتسبة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {currentTeacherSummary.unsettledNotices.map((n) => {
                          const isChecked = selectedNoticeIds.includes(n.id);
                          const duration = calculateNoticeDurationMinutes(n);
                          return (
                            <tr
                              key={n.id}
                              onClick={() => handleToggleNotice(n.id)}
                              className={cn(
                                "hover:bg-teal-50/30 transition-colors cursor-pointer",
                                isChecked ? "bg-teal-50/20" : "opacity-60"
                              )}
                            >
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleToggleNotice(n.id);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                                />
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                                {n.noticeNumber || `ت-${n.id.slice(-4)}`}{" "}
                                <span className="text-slate-400 font-normal">
                                  ({n.noticeDate || n.date})
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                {n.violationDelayStart && "تأخر صباحي"}
                                {n.violationAbsentDuring && "عدم تواجد أثناء الدوام"}
                                {n.violationEarlyDeparture && "انصراف مبكر"}
                                {n.violationLeftSchool && "خروج وعودة"}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-teal-800">
                                {duration} دقيقة ({(duration / 60).toFixed(1)} س)
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {currentTeacherSummary.carriedOverMinutes > 0 && (
                  <div className="flex items-center justify-between text-xs p-2.5 bg-amber-50 text-amber-900 rounded-lg border border-amber-200">
                    <span className="font-bold flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                      دقائق فائضة مرحلة من قرار حسم سابق:
                    </span>
                    <span className="font-mono font-bold">
                      +{currentTeacherSummary.carriedOverMinutes} دقيقة
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Manual Mode Presets */}
            {calculationMode === "manual" && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  اختيارات سريعة للمدد المتراكمة:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { hours: 7, label: "7 ساعات (يوم 1)" },
                    { hours: 14, label: "14 ساعة (يومان)" },
                    { hours: 21, label: "21 ساعة (3 أيام)" },
                    { hours: 28, label: "28 ساعة (4 أيام)" },
                  ].map((preset) => (
                    <button
                      key={preset.hours}
                      type="button"
                      onClick={() => setPresetHours(preset.hours)}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all text-center cursor-pointer ${
                        calculation.totalHours === preset.hours
                          ? "bg-rose-500 text-white border-rose-600 shadow-sm shadow-rose-200"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Precise Minutes / Hours Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  إجمالي دقائق التأخر والخروج (بالدقائق) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={delayMinutes}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      setDelayMinutes(val);
                      setErrors((prev) => {
                        const n = { ...prev };
                        delete n.delayMinutes;
                        delete n.totalHours;
                        delete n.deductionDays;
                        return n;
                      });
                    }}
                    className="w-full pl-12 pr-4 py-2.5 text-sm font-mono font-bold bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-semibold pointer-events-none">
                    دقيقة
                  </span>
                </div>
                {errors.delayMinutes && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{errors.delayMinutes}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  المعادل بالساعات
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step={0.1}
                    value={calculation.totalHours}
                    onChange={(e) => {
                      const h = parseFloat(e.target.value) || 0;
                      setDelayMinutes(Math.round(h * MINUTES_PER_HOUR));
                    }}
                    className="w-full pl-12 pr-4 py-2.5 text-sm font-mono font-bold bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-semibold pointer-events-none">
                    ساعة
                  </span>
                </div>
              </div>
            </div>

            {/* Calculator Summary Card */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-right">
                <div className="text-xs text-rose-700 font-bold">
                  نتيجة الاحتساب النظامي الصادرة بالقرار:
                </div>
                <div className="text-sm font-extrabold text-slate-900">
                  حسم <span className="text-rose-600 text-lg mx-1">({calculation.deductionDays})</span> يوماً من الراتب
                </div>
                {calculation.remainderMinutes > 0 && (
                  <div className="text-xs text-slate-500">
                    ويتبقى ({calculation.remainderMinutes}) دقيقة تُرحّل آلياً للقرار القادم
                  </div>
                )}
                {selectedTeacher && calculation.deductionDays === 0 && (
                  <div className="text-2xs text-amber-800 font-medium bg-amber-50/90 px-2.5 py-1 rounded-lg border border-amber-200 mt-1">
                    تنبيه نظامي: لم يبلغ المجموع عتبة الـ 7 ساعات (420 دقيقة) الموجبة لخصم يوم عمل وفق المادة 21.
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-center px-4 py-2 bg-white/90 rounded-lg border border-rose-200 shadow-2xs">
                  <span className="text-2xs text-slate-400 block">إجمالي الساعات</span>
                  <span className="font-mono text-base font-bold text-slate-800">
                    {calculation.totalHours} س
                  </span>
                </div>
                <div className="text-center px-4 py-2 bg-rose-600 text-white rounded-lg shadow-sm">
                  <span className="text-2xs text-rose-200 block">أيام الحسم</span>
                  <span className="font-mono text-base font-bold">
                    {calculation.deductionDays} يوم
                  </span>
                </div>
              </div>
            </div>
            {errors.deductionDays && (
              <p className="text-xs text-rose-600 font-medium">{errors.deductionDays}</p>
            )}
          </Card>

          {/* Section 3: Decision Details Card */}
          <Card className="p-6 border-slate-200/80 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center font-bold">
                  ٣
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">بيانات القرار الرسمي والاعتماد</h2>
                  <p className="text-xs text-slate-500">
                    رقم القرار وتاريخه وتوقيع رئيس المدرسة المباشر
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  رقم القرار <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={decisionNumber}
                  onChange={(e) => setDecisionNumber(e.target.value)}
                  placeholder="مثال: ١٩/٤٨"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 outline-none"
                />
                {errors.decisionNumber && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{errors.decisionNumber}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  تاريخ القرار <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={decisionDate}
                  onChange={(e) => setDecisionDate(e.target.value)}
                  placeholder="١٤٤٨/٠٢/١٥هـ"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 outline-none"
                />
                {errors.decisionDate && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{errors.decisionDate}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">اسم المدرسة</label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  قائدة المدرسة (الرئيس المباشر)
                </label>
                <input
                  type="text"
                  value={principalName}
                  onChange={(e) => setPrincipalName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 outline-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="primary"
                onClick={handleSaveDecision}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 shadow-sm"
              >
                <Save className="w-4 h-4 ml-2" />
                حفظ القرار وتسوية التنبيهات
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handlePrintPdf}
                className="flex-1 border-teal-600 text-teal-700 hover:bg-teal-50 font-bold py-2.5"
              >
                <Printer className="w-4 h-4 ml-2 text-teal-700" />
                معاينة وطباعة قرار الحسم (PDF)
              </Button>
            </div>
          </Card>
        </div>

        {/* Bottom Section: Recent Recorded Deduction Decisions */}
        <div className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-teal-700" />
              <h3 className="text-base font-bold text-slate-800">
                سجل قرارات الحسم الصادرة بالمدرسة ({deductionDecisions.length})
              </h3>
            </div>
            <Link
              href="/procedures/list"
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 hover:underline"
            >
              عرض كافة الإجراءات الإدارية
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            </Link>
          </div>

          <Card className="border-slate-200/80 shadow-sm overflow-hidden">
            {deductionDecisions.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <div className="text-sm font-bold text-slate-700">لا توجد قرارات حسم صادرة حالياً</div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  عند إصدار قرارات حسم لساعات التأخر والخروج المبكر، ستظهر جميع السجلات هنا مع إمكانية إعادة طباعتها في أي وقت.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-3 px-4">رقم القرار</th>
                      <th className="py-3 px-4">المعلمة</th>
                      <th className="py-3 px-4">السجل المدني</th>
                      <th className="py-3 px-4">ساعات التأخر</th>
                      <th className="py-3 px-4">أيام الحسم</th>
                      <th className="py-3 px-4">تنبيهات مسواة</th>
                      <th className="py-3 px-4">تاريخ القرار</th>
                      <th className="py-3 px-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deductionDecisions.map((dec) => (
                      <tr key={dec.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {dec.decisionNumber}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-teal-800">{dec.teacherName}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">{dec.civilId}</td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                          {dec.delayHours} س
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            {dec.deductionDays} يوم
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {Array.isArray(dec.settledNoticeIds) && dec.settledNoticeIds.length > 0 ? (
                            <span className="font-semibold text-teal-800">
                              {dec.settledNoticeIds.length} تنبيه
                            </span>
                          ) : (
                            <span className="text-slate-400">إدخال مباشر</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{dec.decisionDate}</td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
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
                                })
                              }
                              className="h-8 px-2 text-teal-700 hover:text-teal-800 hover:bg-teal-50"
                              title="طباعة قرار الحسم"
                            >
                              <Printer className="w-3.5 h-3.5 ml-1" />
                              طباعة
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDecisionToDelete(dec)}
                              className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              title="حذف ونقل للأرشيف"
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
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(decisionToDelete)}
        title="أرشفة قرار الحسم"
        message={`هل أنتِ متأكدة من رغبتك في نقل قرار الحسم رقم (${decisionToDelete?.decisionNumber}) للمعلمة (${decisionToDelete?.teacherName}) إلى الأرشيف الإداري؟`}
        confirmLabel="نقل للأرشيف"
        cancelLabel="إلغاء"
        variant="archive"
        showReasonInput={true}
        onConfirm={confirmDeleteDecision}
        onCancel={() => setDecisionToDelete(null)}
      />
    </div>
  );
}

export default function DeductionHoursPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400 text-xs">
          جاري تحميل شاشة قرار الحسم...
        </div>
      }
    >
      <DeductionHoursContent />
    </Suspense>
  );
}
