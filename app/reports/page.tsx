"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  FileText,
  Calendar,
  Filter,
  Printer,
  Eye,
  RotateCcw,
  CheckCircle2,
  Clock,
  User,
  School,
  AlertTriangle,
  History,
  Layers,
  ChevronLeft,
  Search,
  Sparkles,
  Download,
  LogOut,
  BarChart3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTeachers } from "@/context/TeacherContext";
import {
  useAuth,
  DEFAULT_ADMIN_NAME,
  DEFAULT_ADMIN_ROLE_LABEL,
} from "@/context/AuthContext";
import { ReportType, ReportFilterOptions, ReportHistoryItem } from "@/types/report";
import { generateReportData, ReportGeneratedData } from "@/lib/reportsEngine";
import { printReportPdf } from "@/lib/reportPdfService";
import { getSaudiToday } from "@/lib/timeUtils";
import { PageHeader, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  DEFAULT_STAMP_BASE64,
  DEFAULT_PRINCIPAL_SIGNATURE_BASE64,
  DEFAULT_VICE_PRINCIPAL_SIGNATURE_BASE64,
} from "@/lib/defaultApprovalAssets";
import { TeacherCombobox } from "@/components/procedures/TeacherCombobox";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/auditLogger";

interface ReportCardDef {
  type: ReportType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  accentColor: string;
}

const REPORT_CARDS: ReportCardDef[] = [
  {
    type: "absence_summary",
    title: "حصر الغياب الرسمي",
    description: "حصر شامل لغياب المعلمات خلال فترة محددة أو شهر معين مع تصنيف الأعذار والملاحظات الإدارية.",
    icon: Calendar,
    badge: "شهري / فترات",
    accentColor: "border-teal-500 text-teal-600 bg-teal-50 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-700",
  },
  {
    type: "delay_departure_summary",
    title: "حصر التأخر والانصراف المبكر",
    description: "رصد دقائق التأخر الصباحي والخروج المبكر، وتتبع حالات اعتماد الأعذار وقرارات المديرة.",
    icon: Clock,
    badge: "دقائق وساعات",
    accentColor: "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700",
  },
  {
    type: "deduction_decisions_summary",
    title: "حصر قرارات الحسم",
    description: "سجل قرارات الحسم الإدارية (نموذج 19) الناتجة عن بلوغ نصاب التأخر، وحصر الأيام والدقائق المرحلة.",
    icon: AlertTriangle,
    badge: "قرارات وزارية",
    accentColor: "border-rose-500 text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700",
  },
  {
    type: "teacher_detailed_record",
    title: "سجل معلمة تفصيلي",
    description: "سجل إداري تراكمي شامل لمعلمة محددة يجمع كل الغيابات، التأخرات، الاستئذان، وقرارات الحسم منذ بداية العام.",
    icon: User,
    badge: "ملف إداري فردي",
    accentColor: "border-indigo-500 text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-700",
  },
  {
    type: "permissions_summary",
    title: "حصر سجل استئذان الموظفين",
    description: "توثيق رسمي شامل لحالات خروج الموظفات أثناء الدوام، دقائق الاستئذان المعتمدة، وأسباب الخروج.",
    icon: LogOut,
    badge: "استئذان شهري",
    accentColor: "border-teal-600 text-teal-700 bg-teal-50 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-700",
  },
  {
    type: "teacher_permissions_record",
    title: "سجل استئذان موظفة فردي",
    description: "نموذج استئذان رسمي مفصل لموظفة محددة بكافة تواريخ وأوقات الخروج والعودة وحساب المدة الإجمالية.",
    icon: User,
    badge: "استئذان فردي",
    accentColor: "border-cyan-600 text-cyan-700 bg-cyan-50 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-700",
  },
  {
    type: "permissions_statistics",
    title: "تقرير إحصائي للاستئذان",
    description: "تحليل إحصائي لمؤشرات الاستئذان بالمدرسة: إجمالي الدقائق، أكثر الموظفات استئذاناً، ومتوسط المدة.",
    icon: BarChart3,
    badge: "مؤشرات تحليلية",
    accentColor: "border-violet-500 text-violet-600 bg-violet-50 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-700",
  },
  {
    type: "school_comprehensive",
    title: "التقرير الشامل للمدرسة",
    description: "تقرير إداري شامل لمديرة المدرسة يجمع المؤشرات العامة لجميع المعلمات ومستوى الانضباط.",
    icon: School,
    badge: "تقرير المديرة",
    accentColor: "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700",
  },
  {
    type: "custom_period",
    title: "تقرير فترة زمنية مخصص",
    description: "استخراج حصر مخصص يحدده المستخدم بتاريخ بداية ونهاية مع تصفيات دقيقة حسب التخصص وحالة العمل.",
    icon: Layers,
    badge: "مخصص ومرن",
    accentColor: "border-sky-500 text-sky-600 bg-sky-50 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-700",
  },
];

const LOCAL_STORAGE_HISTORY_KEY = "admin_school_report_history_v1";

export default function ReportsCenterPage() {
  const { user } = useAuth();
  const {
    teachers,
    absenceRecords,
    delayNotices,
    deductionDecisions,
    permissions,
    isLoading: isDataLoading,
  } = useTeachers();

  const [activeTab, setActiveTab] = useState<"builder" | "history">("builder");
  const [selectedType, setSelectedType] = useState<ReportType>("absence_summary");
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Select Type, 2: Filters, 3: Preview & Print
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // Filters State
  const [filters, setFilters] = useState<ReportFilterOptions>({
    month: "all",
    year: "2026",
    startDate: "",
    endDate: "",
    teacherId: "all",
    specialty: "all",
    employmentStatus: "all",
    status: "all",
  });

  // Report History State
  const [historyItems, setHistoryItems] = useState<ReportHistoryItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      if (stored) {
        setHistoryItems(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to read report history:", e);
    }

    // Hydrate report history from Supabase cloud audit_logs
    if (isSupabaseConfigured() && supabase) {
      supabase
        .from("audit_logs")
        .select("*")
        .eq("entity_type", "report")
        .order("timestamp", { ascending: false })
        .limit(30)
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            const cloudItems: ReportHistoryItem[] = data
              .map((row: Record<string, unknown>) => {
                try {
                  if (row.new_value) {
                    const parsed =
                      typeof row.new_value === "string"
                        ? JSON.parse(row.new_value)
                        : row.new_value;
                    return parsed as ReportHistoryItem;
                  }
                } catch {}
                return null;
              })
              .filter((item): item is ReportHistoryItem => item !== null && Boolean(item.id));

            if (cloudItems.length > 0) {
              setHistoryItems((prev) => {
                const map = new Map<string, ReportHistoryItem>();
                for (const item of cloudItems) map.set(item.id, item);
                for (const item of prev) {
                  if (!map.has(item.id)) map.set(item.id, item);
                }
                const merged = Array.from(map.values()).slice(0, 30);
                try {
                  localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(merged));
                } catch {}
                return merged;
              });
            }
          }
        }, () => {});
    }

    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const urlType = sp.get("reportType") as ReportType | null;
      const urlTeacherId = sp.get("teacherId");
      if (urlType && REPORT_CARDS.some((c) => c.type === urlType)) {
        setSelectedType(urlType);
        if (urlTeacherId) {
          setFilters((prev) => ({ ...prev, teacherId: urlTeacherId }));
        }
        setStep(2);
      } else if (urlTeacherId) {
        setSelectedType("teacher_detailed_record");
        setFilters((prev) => ({ ...prev, teacherId: urlTeacherId }));
        setStep(2);
      }
    }
  }, []);

  const saveToHistory = (item: ReportHistoryItem) => {
    setHistoryItems((prev) => {
      const updated = [item, ...prev.filter((h) => h.id !== item.id)].slice(0, 30); // keep last 30
      try {
        localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to persist report history:", err);
      }
      return updated;
    });

    logAuditEvent({
      action: "EXPORT_REPORT",
      entityType: "report",
      entityId: item.id,
      details: `تصدير تقرير: ${item.reportTitle}`,
      newValue: item as unknown as Record<string, unknown>,
    });
  };

  // Specialties list
  const specialties = useMemo(() => {
    const set = new Set<string>();
    teachers.forEach((t) => {
      if (t.specialty) set.add(t.specialty);
    });
    return Array.from(set);
  }, [teachers]);

  // Selected report title
  const currentCard = useMemo(() => {
    return REPORT_CARDS.find((c) => c.type === selectedType) || REPORT_CARDS[0];
  }, [selectedType]);

  // Generated Report Data
  const reportData = useMemo<ReportGeneratedData | null>(() => {
    if (step < 2) return null;
    return generateReportData(
      selectedType,
      filters,
      teachers,
      absenceRecords,
      delayNotices,
      deductionDecisions,
      user?.fullName || DEFAULT_ADMIN_NAME,
      permissions
    );
  }, [
    selectedType,
    filters,
    teachers,
    absenceRecords,
    delayNotices,
    deductionDecisions,
    permissions,
    user?.fullName,
    step,
  ]);

  const handleStartBuilder = (type: ReportType) => {
    setSelectedType(type);
    if (
      (type === "teacher_detailed_record" || type === "teacher_permissions_record") &&
      filters.teacherId === "all" &&
      teachers.length > 0
    ) {
      setFilters((prev) => ({ ...prev, teacherId: teachers[0].id }));
    }
    setStep(2);
  };

  const handleProceedToPreview = () => {
    setIsGenerating(true);
    setGenerationProgress(20);

    const timer1 = setTimeout(() => setGenerationProgress(65), 150);
    const timer2 = setTimeout(() => {
      setGenerationProgress(100);
      setIsGenerating(false);
      setStep(3);

      // Record in history
      if (reportData) {
        saveToHistory({
          id: `rep_${Date.now()}`,
          reportType: selectedType,
          reportTitle: reportData.payload.reportTitle,
          createdByName: user?.fullName || DEFAULT_ADMIN_NAME,
          createdAt: new Date().toISOString(),
          filters: { ...filters },
          retentionPeriod: "عام دراسي كامل",
          summaryStats: reportData.summaryHighlights.reduce((acc, curr) => {
            acc[curr.label] = curr.value;
            return acc;
          }, {} as Record<string, string | number>),
        });
      }
    }, 380);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  };

  const handlePrintPdf = () => {
    if (!reportData) return;
    printReportPdf(reportData.payload);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <PageHeader
        title="مركز التقارير والحصر الإداري"
        badge="التقارير الرسمية المعتمدة"
        breadcrumbs={[
          { label: "نظام الإدارة المدرسية", href: "/" },
          { label: "مركز التقارير" },
        ]}
        description="إنشاء وطباعة التقارير الرسمية المعتمدة لبيانات الغياب، تنبيهات التأخر، وقرارات الحسم بصيغة PDF فورية للرفع والأرشفة المدرسية"
        actions={
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <Button
              variant={activeTab === "builder" ? "primary" : "ghost"}
              size="sm"
              icon={<Layers className="w-4 h-4 shrink-0" />}
              onClick={() => setActiveTab("builder")}
            >
              منشئ التقارير
            </Button>
            <Button
              variant={activeTab === "history" ? "primary" : "ghost"}
              size="sm"
              icon={<History className="w-4 h-4 shrink-0" />}
              onClick={() => setActiveTab("history")}
              rightIcon={
                historyItems.length > 0 ? (
                  <span className="w-4 h-4 rounded-full bg-[#137a85]/20 text-[10px] flex items-center justify-center font-mono font-bold">
                    {historyItems.length}
                  </span>
                ) : undefined
              }
            >
              سجل التقارير
            </Button>
          </div>
        }
      />

      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto" dir="rtl">

      {/* Main Content Area */}
      {activeTab === "history" ? (
        /* History View */
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">سجل التقارير المستخرجة</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                قائمة بالتقارير والحصريات التي تم إنشاؤها مؤخراً مع إمكانية إعادة التوليد والطباعة
              </p>
            </div>
            {historyItems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("هل تريد مسح سجل التقارير السابقة؟")) {
                    localStorage.removeItem(LOCAL_STORAGE_HISTORY_KEY);
                    setHistoryItems([]);
                    if (isSupabaseConfigured() && supabase) {
                      supabase.from("audit_logs").delete().eq("entity_type", "report").then(() => {}, () => {});
                    }
                  }
                }}
                className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-bold px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                مسح السجل
              </button>
            )}
          </div>

          {historyItems.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400 space-y-3">
              <History className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">لا توجد تقارير سابقة محفوظة حتى الآن</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                عند إنشاء أي تقرير من منشئ التقارير، سيتم توثيقه تلقائياً هنا للرجوع إليه.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {historyItems.map((item) => (
                <div
                  key={item.id}
                  className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 p-2 rounded-xl transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{item.reportTitle}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {item.retentionPeriod}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span>أنشأه: {item.createdByName}</span>
                      <span>الوقت: {new Date(item.createdAt).toLocaleString("ar-SA")}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedType(item.reportType);
                      setFilters(item.filters);
                      setStep(3);
                      setActiveTab("builder");
                    }}
                    className="self-start md:self-auto px-3.5 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-[#137a85] dark:text-teal-300 text-xs font-bold border border-teal-200 dark:border-teal-800 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>إعادة فتح ومعاينة</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Report Builder Flow */
        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-2xs">
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={cn(
                  "p-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer",
                  step === 1
                    ? "bg-[#137a85] text-white border-[#137a85] shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                )}
              >
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
                <span>اختيار نوع التقرير</span>
              </button>

              <button
                type="button"
                onClick={() => selectedType && setStep(2)}
                className={cn(
                  "p-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer",
                  step === 2
                    ? "bg-[#137a85] text-white border-[#137a85] shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                )}
              >
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
                <span>تحديد الفلاتر والفترة</span>
              </button>

              <button
                type="button"
                disabled={step < 2}
                onClick={() => handleProceedToPreview()}
                className={cn(
                  "p-2.5 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer",
                  step === 3
                    ? "bg-[#137a85] text-white border-[#137a85] shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">3</span>
                <span>المعاينة وتصدير PDF</span>
              </button>
            </div>
          </div>

          {/* STEP 1: Select Report Type */}
          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {REPORT_CARDS.map((card) => {
                const IconComponent = card.icon;
                const isSelected = selectedType === card.type;

                return (
                  <div
                    key={card.type}
                    onClick={() => handleStartBuilder(card.type)}
                    className={cn(
                      "bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-2xs transition-all cursor-pointer flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5",
                      isSelected
                        ? "border-[#137a85] ring-2 ring-[#137a85]/20 bg-teal-50/20 dark:bg-teal-950/20"
                        : "border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    )}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className={cn("p-2.5 rounded-xl border", card.accentColor)}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {card.badge}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">{card.title}</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{card.description}</p>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">جاهز للتوليد الفوري</span>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg bg-[#137a85] hover:bg-[#0f646d] text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>إنشاء التقرير</span>
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* STEP 2: Configure Filters */}
          {step === 2 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
                <div>
                  <div className="text-xs text-[#137a85] dark:text-teal-400 font-bold">الخطوة الثانية: خيارات التقرير</div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">{currentCard.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium flex items-center gap-1 self-start sm:self-auto"
                >
                  <ChevronLeft className="w-4 h-4 rotate-180" />
                  <span>تغيير نوع التقرير</span>
                </button>
              </div>

              {/* Filters Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-bold text-slate-700 dark:text-slate-300">
                {/* Specific Teacher (for teacher_detailed_record, teacher_permissions_record or others) */}
                {(selectedType === "teacher_detailed_record" ||
                  selectedType === "teacher_permissions_record" ||
                  selectedType === "absence_summary" ||
                  selectedType === "delay_departure_summary" ||
                  selectedType === "permissions_summary" ||
                  selectedType === "deduction_decisions_summary") && (
                  <div className="space-y-1.5">
                    <TeacherCombobox
                      teachers={teachers}
                      selectedTeacherId={filters.teacherId === "all" || !filters.teacherId ? "" : filters.teacherId}
                      onSelect={(teacher) => {
                        setFilters({
                          ...filters,
                          teacherId: teacher
                            ? teacher.id
                            : selectedType === "teacher_detailed_record" || selectedType === "teacher_permissions_record"
                            ? teachers[0]?.id || ""
                            : "all",
                        });
                      }}
                      label={
                        selectedType === "teacher_detailed_record" || selectedType === "teacher_permissions_record"
                          ? "المعلمة المعنية (إلزامي)"
                          : "تحديد معلمة معينة"
                      }
                      required={
                        selectedType === "teacher_detailed_record" || selectedType === "teacher_permissions_record"
                      }
                      placeholder={
                        selectedType === "teacher_detailed_record" || selectedType === "teacher_permissions_record"
                          ? "ابحثي بالاسم أو رقم الهوية أو التخصص..."
                          : "جميع المعلمات (ابحثي لاختيار معلمة محددة)..."
                      }
                      allowAllOption={
                        selectedType !== "teacher_detailed_record" && selectedType !== "teacher_permissions_record"
                      }
                      allOptionLabel="جميع المعلمات (حصر عام)"
                    />
                  </div>
                )}

                {/* Period Mode */}
                <div className="space-y-1.5">
                  <label className="text-slate-700 dark:text-slate-300">الشهر (ميلادي)</label>
                  <select
                    value={filters.month}
                    onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-[#137a85]/40 outline-none"
                  >
                    <option value="all">كامل العام الدراسي</option>
                    <option value="01">يناير (01)</option>
                    <option value="02">فبراير (02)</option>
                    <option value="03">مارس (03)</option>
                    <option value="04">أبريل (04)</option>
                    <option value="05">مايو (05)</option>
                    <option value="06">يونيو (06)</option>
                    <option value="07">يوليو (07)</option>
                    <option value="08">أغسطس (08)</option>
                    <option value="09">سبتمبر (09)</option>
                    <option value="10">أكتوبر (10)</option>
                    <option value="11">نوفمبر (11)</option>
                    <option value="12">ديسمبر (12)</option>
                  </select>
                </div>

                {/* Year */}
                <div className="space-y-1.5">
                  <label className="text-slate-700 dark:text-slate-300">السنة</label>
                  <select
                    value={filters.year}
                    onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-[#137a85]/40 outline-none"
                  >
                    <option value="all">جميع السنوات</option>
                    <option value="2026">2026 م</option>
                    <option value="2025">2025 م</option>
                    <option value="2024">2024 م</option>
                  </select>
                </div>

                {/* Start Date */}
                <div className="space-y-1.5">
                  <label className="text-slate-700 dark:text-slate-300">من تاريخ (اختياري)</label>
                  <input
                    type="date"
                    value={filters.startDate || ""}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-[#137a85]/40 outline-none"
                  />
                </div>

                {/* End Date */}
                <div className="space-y-1.5">
                  <label className="text-slate-700 dark:text-slate-300">إلى تاريخ (اختياري)</label>
                  <input
                    type="date"
                    value={filters.endDate || ""}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-[#137a85]/40 outline-none"
                  />
                </div>

                {/* Specialty Filter */}
                {selectedType !== "teacher_detailed_record" && (
                  <div className="space-y-1.5">
                    <label className="text-slate-700 dark:text-slate-300">التخصص الدراسي</label>
                    <select
                      value={filters.specialty}
                      onChange={(e) => setFilters({ ...filters, specialty: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-[#137a85]/40 outline-none"
                    >
                      <option value="all">جميع التخصصات</option>
                      {specialties.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Employment Status */}
                {selectedType !== "teacher_detailed_record" && (
                  <div className="space-y-1.5">
                    <label className="text-slate-700 dark:text-slate-300">حالة التوظيف</label>
                    <select
                      value={filters.employmentStatus}
                      onChange={(e) => setFilters({ ...filters, employmentStatus: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-[#137a85]/40 outline-none"
                    >
                      <option value="all">جميع الحالات</option>
                      <option value="دائم">دائم / رسمي</option>
                      <option value="عقد">عقد</option>
                    </select>
                  </div>
                )}

                {/* Status for delay notice */}
                {selectedType === "delay_departure_summary" && (
                  <div className="space-y-1.5">
                    <label className="text-slate-700 dark:text-slate-300">حالة التنبيه</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-xs focus:ring-2 focus:ring-[#137a85]/40 outline-none"
                    >
                      <option value="all">جميع الحالات</option>
                      <option value="completed">مكتمل وموثق</option>
                      <option value="pending_director">بانتظار قرار المديرة</option>
                      <option value="pending_teacher">بانتظار رد المعلمة</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setFilters({
                      month: "all",
                      year: "2026",
                      startDate: "",
                      endDate: "",
                      teacherId: selectedType === "teacher_detailed_record" ? teachers[0]?.id : "all",
                      specialty: "all",
                      employmentStatus: "all",
                      status: "all",
                    })
                  }
                  className="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  إعادة تعيين الفلاتر
                </button>

                <button
                  type="button"
                  onClick={handleProceedToPreview}
                  disabled={isGenerating}
                  className="px-6 py-2.5 rounded-xl bg-[#137a85] hover:bg-[#0f646d] text-white text-xs font-black whitespace-nowrap transition-all shadow-2xs hover:shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Eye className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">معاينة التقرير ومتابعة التصدير</span>
                </button>
              </div>

              {/* Progress bar during generation */}
              {isGenerating && (
                <div className="space-y-1 pt-2">
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                    <span>جاري معالجة وتجميع بيانات التقرير...</span>
                    <span>{generationProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#137a85] h-2 rounded-full transition-all duration-200"
                      style={{ width: `${generationProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Preview & Print */}
          {step === 3 && reportData && (
            <div className="space-y-6">
              {/* Control Bar */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    title="العودة لتعديل الفلاتر"
                  >
                    <ChevronLeft className="w-4 h-4 rotate-180" />
                  </button>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {reportData.payload.reportTitle}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {reportData.rawRowsCount} سجل مطابق • رمز النموذج: {reportData.payload.reportCode}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer"
                  >
                    تعديل الفلاتر
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintPdf}
                    className="px-5 py-2.5 rounded-xl bg-[#137a85] hover:bg-[#0f646d] text-white text-xs font-black whitespace-nowrap shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4 shrink-0" />
                    <span className="whitespace-nowrap">تصدير وطباعة PDF الرسمي</span>
                  </button>
                </div>
              </div>

              {/* Preview Container (Simulating Official A4) */}
              <div className="bg-white text-slate-900 border border-slate-300 rounded-2xl p-6 md:p-10 shadow-md max-w-5xl mx-auto overflow-x-auto space-y-6">
                {/* Official Header */}
                <div className="border-b-2 border-[#0f766e] pb-3 flex justify-between items-center text-xs">
                  <div className="font-bold space-y-0.5 text-slate-800">
                    <div>المملكة العربية السعودية</div>
                    <div>وزارة التعليم</div>
                    <div>الإدارة العامة للتعليم بمنطقة مكة المكرمة</div>
                    <div>{reportData.payload.schoolName}</div>
                  </div>
                  <div className="text-center font-bold text-slate-700">
                    <div className="text-sm font-black text-[#0f766e]">وزارة التعليم</div>
                    <div className="text-[10px] text-slate-500">Ministry of Education</div>
                  </div>
                  <div className="text-left font-bold text-slate-600 space-y-0.5" dir="ltr">
                    <div>تاريخ الإصدار: {reportData.payload.dateFormatted}</div>
                    <div>الفترة: {reportData.payload.periodText}</div>
                    <div>وثيقة إدارية رسمية</div>
                  </div>
                </div>

                {/* Title Banner */}
                <div className="bg-teal-50 border border-teal-600 rounded-lg p-2.5 flex justify-between items-center">
                  <span className="font-black text-teal-900 text-sm">
                    {reportData.payload.reportTitle}
                  </span>
                  <span className="font-mono text-xs font-bold text-teal-700" dir="ltr">
                    {reportData.payload.reportCode}
                  </span>
                </div>

                {/* Teacher Profile if exists */}
                {reportData.payload.teacherDetailsCard && (
                  <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">اسم المعلمة:</span>
                      <strong className="text-slate-900">{reportData.payload.teacherDetailsCard.name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">رقم الهوية:</span>
                      <strong className="text-slate-900">{reportData.payload.teacherDetailsCard.nationalId}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">التخصص:</span>
                      <strong className="text-slate-900">{reportData.payload.teacherDetailsCard.specialty}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">المسمى الوظيفي:</span>
                      <strong className="text-slate-900">{reportData.payload.teacherDetailsCard.jobTitle}</strong>
                    </div>
                  </div>
                )}

                {/* Summary Cards */}
                {reportData.payload.summaryCards.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {reportData.payload.summaryCards.map((card, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 border border-slate-200 border-t-2 border-t-[#0f766e] rounded-lg p-3 text-center"
                      >
                        <div className="text-base font-black text-[#0f766e]">{card.value}</div>
                        <div className="text-[11px] text-slate-600 font-bold mt-0.5">{card.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Data Table */}
                <div className="border border-[#0f766e] rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-center border-collapse">
                    <thead>
                      <tr className="bg-[#0f766e] text-white font-bold">
                        {reportData.payload.tableHeaders.map((head, i) => (
                          <th key={i} className="p-2 border border-teal-600">
                            {head}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {reportData.payload.tableRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={reportData.payload.tableHeaders.length}
                            className="p-8 text-center text-slate-500 font-medium"
                          >
                            لا توجد بيانات مطابقة لمعايير البحث في هذه الفترة.
                          </td>
                        </tr>
                      ) : (
                        reportData.payload.tableRows.map((row, rowIdx) => (
                          <tr key={rowIdx} className="hover:bg-teal-50/30">
                            {row.map((cell, cellIdx) => (
                              <td key={cellIdx} className="p-2 border border-slate-200 text-slate-800">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Official Signatures */}
                <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-xs text-center">
                  <div className="space-y-2 flex flex-col items-center">
                    <span className="font-bold text-[#0f766e] block">
                      {user?.role === "principal" ? "مديرة المدرسة" : DEFAULT_ADMIN_ROLE_LABEL}
                    </span>
                    <span className="font-bold text-slate-800 block">{reportData.payload.creatorName}</span>
                    <div className="h-10 flex items-center justify-center">
                      <img
                        src={DEFAULT_VICE_PRINCIPAL_SIGNATURE_BASE64}
                        alt="توقيع الوكيلة"
                        className="max-h-10 max-w-28 object-contain"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[11px] font-bold text-[#0f766e] mb-1">الختم الرسمي للمدرسة</span>
                    <div className="w-24 h-24 flex items-center justify-center">
                      <img
                        src={DEFAULT_STAMP_BASE64}
                        alt="الختم الرسمي للمدرسة"
                        className="max-h-24 max-w-24 w-auto h-auto object-contain drop-shadow-md"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 flex flex-col items-center">
                    <span className="font-bold text-[#0f766e] block">مديرة المدرسة</span>
                    <span className="font-bold text-slate-800 block">{reportData.payload.principalName}</span>
                    <div className="h-10 flex items-center justify-center">
                      <img
                        src={DEFAULT_PRINCIPAL_SIGNATURE_BASE64}
                        alt="توقيع المديرة"
                        className="max-h-10 max-w-28 object-contain"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      </main>
    </div>
  );
}
