"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
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
  Eye,
  FileCheck,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { useToast } from "@/context/ToastContext";
import { Teacher, DeductionDecision } from "@/types/teacher";
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
import { getSaudiToday } from "@/lib/timeUtils";

export default function DeductionHoursPage() {
  const { teachers, deductionDecisions, createDeductionDecision, deleteDeductionDecision } =
    useTeachers();
  const { showToast } = useToast();

  // Form State
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
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

  // Selected Teacher object
  const selectedTeacher = useMemo(
    () => teachers.find((t) => t.id === selectedTeacherId) || null,
    [teachers, selectedTeacherId]
  );

  // Handle teacher change
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
    }
  };

  // Calculation results
  const calculation = useMemo(
    () => calculateDeduction(delayMinutes),
    [delayMinutes]
  );

  // Set preset hours
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
    });

    if (res.success) {
      showToast({
        message: `تم حفظ قرار الحسم رقم (${decisionNumber}) بنجاح في سجل المعلمة.`,
        type: "success",
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
        {/* Top Legal Alert Banner */}
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-teal-200/80 rounded-2xl p-4 sm:p-5 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-teal-600/10 text-teal-700 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-teal-700" />
          </div>
          <div className="flex-1 text-sm text-slate-700 leading-relaxed">
            <div className="font-bold text-teal-900 text-base mb-1">
              المرجعية النظامية لإصدار القرار (المادة 21):
            </div>
            <p className="text-slate-600">
              يُحسم من راتب الموظف أجر الأيام التي يتغيب فيها عن عمله دون عذر مقبول، وتُجمع ساعات التأخر والخروج المبكر؛ بحيث يُحسم يوم عمل كامل عن كل <strong>7 ساعات تأخر</strong> متراكمة (420 دقيقة) بموجب الصلاحيات المفوضة لمديرات المدارس بالقرار الوزاري رقم <strong>١/١١٣٩</strong> وتاريخ <strong>١٤٢١/٣/١٧هـ</strong>.
            </p>
          </div>
        </div>

        {/* Form and Live Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Input Form (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="p-6 border-slate-200/80 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center font-bold">
                    ١
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      بيانات المعلمة محل القرار
                    </h2>
                    <p className="text-xs text-slate-500">
                      اختر المعلمة من السجل المدرسي المعتمد
                    </p>
                  </div>
                </div>
                {selectedTeacher && (
                  <Badge variant="brand">
                    {selectedTeacher.employmentStatus || "دائم"}
                  </Badge>
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

            {/* Delay & Hours Calculator Card */}
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
                      كل 7 ساعات (420 دقيقة) = حسم يوم عمل واحد
                    </p>
                  </div>
                </div>
                <Badge variant="error">
                  {calculation.deductionDays} يوم حسم
                </Badge>
              </div>

              {/* Quick Presets */}
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
                      className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all text-center ${
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
                      ويتبقى ({calculation.remainderMinutes}) دقيقة تُرحّل للمسير القادم
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

            {/* Decision Details Card */}
            <Card className="p-6 border-slate-200/80 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center font-bold">
                    ٣
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      بيانات القرار الرسمي والاعتماد
                    </h2>
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
                    placeholder="مثال: ١٩/٤٥"
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
                    placeholder="١٤٤٥/٠٨/١٥هـ"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 outline-none"
                  />
                  {errors.decisionDate && (
                    <p className="text-xs text-rose-600 mt-1 font-medium">{errors.decisionDate}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    اسم المدرسة
                  </label>
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
                  حفظ القرار في السجل الإداري
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

          {/* Right Column: Live Official Form 19 Preview Card (5 cols on lg) */}
          <div className="lg:col-span-5 sticky top-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-teal-700" />
                <h3 className="text-sm font-bold text-slate-800">
                  معاينة مباشرة للنموذج المعتمد (نموذج 19)
                </h3>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handlePrintPdf}
                className="text-teal-700 hover:text-teal-800 hover:bg-teal-50 text-xs px-2.5 h-8 font-bold"
              >
                <Printer className="w-3.5 h-3.5 ml-1.5" />
                طباعة الآن
              </Button>
            </div>

            {/* Official Scanned Paper Replica Card */}
            <div className="bg-white rounded-xl border-2 border-teal-700/80 shadow-md p-5 text-slate-900 font-sans text-xs leading-relaxed space-y-4 select-none">
              {/* Header Box */}
              <div className="flex justify-between items-start border-b-2 border-teal-700 pb-3">
                <div className="space-y-0.5 text-3xs font-semibold text-slate-700">
                  <div>المملكة العربية السعودية</div>
                  <div>وزارة التعليم</div>
                  <div>الإدارة العامة للتعليم بمكة المكرمة</div>
                  <div className="font-bold text-teal-800">{schoolName}</div>
                </div>
                <div className="text-center px-2">
                  <div className="font-extrabold text-teal-800 text-sm">وزارة التعليم</div>
                  <div className="text-3xs text-slate-400">Ministry of Education</div>
                </div>
                <div className="space-y-0.5 text-3xs text-left font-mono">
                  <div>القرار: {decisionNumber}</div>
                  <div>التاريخ: {decisionDate}</div>
                </div>
              </div>

              {/* Title Section */}
              <div className="text-center space-y-1">
                <div className="text-sm font-extrabold text-teal-800">
                  نموذج رقم ( ١٩ )
                </div>
                <div className="bg-teal-50 border border-teal-700/60 rounded px-2 py-1 flex justify-between text-3xs font-bold text-teal-900">
                  <span>اسم النموذج: قرار حسم مجموع ساعات تأخر وخروج مبكر</span>
                  <span>الرمز: ( و.م.ع.ن - ٠٢ - ٠٣ )</span>
                </div>
              </div>

              {/* Civil ID & School */}
              <div className="border border-teal-700 rounded overflow-hidden divide-y divide-teal-700">
                <div className="flex">
                  <div className="bg-teal-50 font-bold text-teal-900 px-3 py-1 w-24 border-l border-teal-700 text-center">
                    المدرسة
                  </div>
                  <div className="px-3 py-1 font-semibold flex-1 text-slate-800 truncate">
                    {schoolName}
                  </div>
                </div>
                <div className="flex">
                  <div className="bg-teal-50 font-bold text-teal-900 px-3 py-1 w-24 border-l border-teal-700 text-center">
                    السجل المدني
                  </div>
                  <div className="px-3 py-1 font-mono font-bold text-slate-900 flex-1">
                    {selectedTeacher?.nationalId || "—"}
                  </div>
                </div>
              </div>

              {/* Teacher Info Grid Table */}
              <div className="border border-teal-700 rounded overflow-hidden text-center text-3xs">
                <div className="grid grid-cols-4 bg-teal-50 border-b border-teal-700 font-bold text-teal-900 py-1">
                  <div className="border-l border-teal-700">الاسم</div>
                  <div className="border-l border-teal-700">التخصص</div>
                  <div className="border-l border-teal-700">المرتبة</div>
                  <div>العمل الحالي</div>
                </div>
                <div className="grid grid-cols-4 py-1.5 font-semibold text-slate-800 items-center">
                  <div className="border-l border-teal-700 font-bold text-teal-800 px-1 truncate">
                    {selectedTeacher?.fullName || "—"}
                  </div>
                  <div className="border-l border-teal-700 px-1 truncate">
                    {selectedTeacher?.specialty || selectedTeacher?.teachingField || "عام"}
                  </div>
                  <div className="border-l border-teal-700 px-1 truncate">{rank}</div>
                  <div className="px-1 truncate">{currentAction}</div>
                </div>
              </div>

              {/* Legal Text */}
              <div className="text-3xs text-justify leading-relaxed bg-slate-50/60 p-2.5 rounded border border-slate-200">
                <p>
                  إن قائدة المدرسة: <strong className="text-teal-900">{principalName}</strong> بناءً على صلاحياتها، وبناءً على المادة (<strong>٢١</strong>) من نظام الخدمة المدنية، وقرار معالي الوزير رقم <strong>١/١١٣٩</strong> وتاريخ <strong>١٤٢١/٣/١٧هـ</strong>، ولبلوغ ساعات التأخر عن الدوام والخروج المبكر (<strong className="text-rose-600 font-bold">{calculation.totalHours}</strong>) ساعة، وحيث إن عذرها غير مقبول وبمقتضى النظام.
                </p>
                <div className="font-extrabold text-teal-900 mt-2">يُقرر ما يلي:</div>
                <div className="space-y-1 mt-1 text-slate-800">
                  <div>
                    [١] حسم مدة الغياب الموضحة بعاليه وعددها (<strong className="text-rose-600 font-bold text-xs">{calculation.deductionDays}</strong>) يوماً من راتبها.
                  </div>
                  <div>
                    [٢] على إدارة شؤون الموظفات [تنفيذ الأنظمة] تنفيذ إجراء الحسم.
                  </div>
                </div>
              </div>

              {/* Signatures & Stamp Replica */}
              <div className="flex justify-between items-end pt-2 text-3xs">
                <div className="space-y-1">
                  <div className="font-bold text-teal-900">الرئيس المباشر</div>
                  <div>الاسم: {principalName}</div>
                  <div>التوقيع: ................................</div>
                  <div>التاريخ: {decisionDate}</div>
                </div>
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-300 font-bold text-4xs text-center p-1">
                  الختم الرسمي للمدرسة
                </div>
              </div>
            </div>
          </div>
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
                        <td className="py-3.5 px-4 font-bold text-teal-800">
                          {dec.teacherName}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {dec.civilId}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                          {dec.delayHours} س
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            {dec.deductionDays} يوم
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {dec.decisionDate}
                        </td>
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
