"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Label,
  LabelList,
} from "recharts";
import {
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowLeft,
  LogIn,
  LogOut,
  DoorOpen,
  CheckCircle2,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { AbsenceType } from "@/types/teacher";

const TYPE_COLORS: Record<AbsenceType, string> = {
  اضطراري: "#e11d48", // Rose Red for Emergency
  مرضي: "#2563eb", // Royal Blue for Sick leaves
  مرافق: "#7c3aed", // Violet for Companion leaves
  أخرى: "#0d9488", // Teal for Other reasons
};

const ARABIC_DAYS_MAP = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: { name?: string; count?: number; dayName?: string; date?: string; fill?: string };
  }>;
  label?: string;
}

// Accessible, RTL-styled Tooltip
const CustomChartTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
        className="bg-white/95 backdrop-blur-xs p-3 rounded-xl shadow-lg border border-slate-200 text-right min-w-[140px] text-xs space-y-1"
      >
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: data.payload.fill || "#137a85" }}
          />
          <span>{data.name || data.payload.dayName}</span>
        </div>
        <p className="text-slate-500 font-mono">
          العدد:{" "}
          <strong className="text-slate-900 font-bold text-sm">
            {data.value}
          </strong>{" "}
          حالة
        </p>
        {data.payload.date && (
          <p className="text-[10px] text-slate-400 font-mono">{data.payload.date}</p>
        )}
      </motion.div>
    );
  }
  return null;
};

export const AbsenceCharts: React.FC = () => {
  const { absenceRecords, delayNotices, isLoading } = useTeachers();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const delayNoticeStats = useMemo(() => {
    const total = delayNotices.length;
    const morning = delayNotices.filter((d) => d.violationDelayStart).length;
    const during = delayNotices.filter((d) => d.violationAbsentDuring).length;
    const early = delayNotices.filter((d) => d.violationEarlyDeparture).length;
    const left = delayNotices.filter((d) => d.violationLeftSchool).length;
    const completed = delayNotices.filter((d) => d.status === "completed").length;
    return { total, morning, during, early, left, completed };
  }, [delayNotices]);

  // 1. Data for Donut Chart (Absence Types Distribution)
  const pieData = useMemo(() => {
    const counts: Record<AbsenceType, number> = {
      اضطراري: 0,
      مرضي: 0,
      مرافق: 0,
      أخرى: 0,
    };

    absenceRecords.forEach((record) => {
      if (counts[record.type] !== undefined) {
        counts[record.type]++;
      } else {
        counts["أخرى"]++;
      }
    });

    const entries: { name: AbsenceType; value: number; color: string }[] = [
      { name: "اضطراري", value: counts["اضطراري"], color: TYPE_COLORS["اضطراري"] },
      { name: "مرضي", value: counts["مرضي"], color: TYPE_COLORS["مرضي"] },
      { name: "مرافق", value: counts["مرافق"], color: TYPE_COLORS["مرافق"] },
      { name: "أخرى", value: counts["أخرى"], color: TYPE_COLORS["أخرى"] },
    ];

    const activeEntries = entries.filter((e) => e.value > 0);
    return activeEntries.length > 0 ? activeEntries : entries;
  }, [absenceRecords]);

  // 2. Data for Bar Chart (Last 7 Days)
  const barData = useMemo(() => {
    const result: { date: string; dayName: string; count: number }[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      const dayName = ARABIC_DAYS_MAP[d.getDay()];

      const count = absenceRecords.filter((r) => r.date === dateStr).length;

      result.push({
        date: dateStr,
        dayName,
        count,
      });
    }

    return result;
  }, [absenceRecords]);

  const hasAbsences = absenceRecords.length > 0;

  if (!mounted || isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-150 shadow-xs h-80 flex flex-col justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-200" />
            <div className="space-y-2">
              <div className="w-32 h-4 bg-slate-200 rounded" />
              <div className="w-48 h-3 bg-slate-100 rounded" />
            </div>
          </div>
          <div className="h-44 w-44 rounded-full border-8 border-slate-100 mx-auto" />
          <div className="w-full h-4 bg-slate-100 rounded" />
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-150 shadow-xs h-80 flex flex-col justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-200" />
            <div className="space-y-2">
              <div className="w-32 h-4 bg-slate-200 rounded" />
              <div className="w-48 h-3 bg-slate-100 rounded" />
            </div>
          </div>
          <div className="h-40 w-full flex items-end justify-between gap-2 px-6">
            <div className="w-8 h-16 bg-slate-200 rounded-t" />
            <div className="w-8 h-28 bg-slate-200 rounded-t" />
            <div className="w-8 h-20 bg-slate-200 rounded-t" />
            <div className="w-8 h-32 bg-slate-200 rounded-t" />
            <div className="w-8 h-14 bg-slate-200 rounded-t" />
            <div className="w-8 h-24 bg-slate-200 rounded-t" />
            <div className="w-8 h-36 bg-slate-200 rounded-t" />
          </div>
          <div className="w-full h-4 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Donut Chart: أنواع الغياب */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-2xs">
                <PieIcon className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm md:text-base font-bold text-slate-900">
                  توزيع حالات الغياب حسب النوع
                </h3>
                <p className="text-xs text-slate-500">
                  تصنيف الغياب المسجل (اضطراري، مرضي، مرافق، أخرى)
                </p>
              </div>
            </div>

            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200/60">
              {absenceRecords.length} حالة مسجلة
            </span>
          </div>

          {!hasAbsences ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                <HelpCircle className="w-6 h-6" aria-hidden="true" />
              </div>
              <p className="text-sm font-bold text-slate-700">
                لا توجد إحصائيات متاحة حتى الآن
              </p>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                ستظهر الرسوم البيانية لتوزيع أنواع الغياب تلقائياً فور تسجيل أول
                مساءلة غياب في النظام.
              </p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={4}
                    dataKey="value"
                    animationDuration={600}
                    animationEasing="ease-out"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    ))}
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) - 4}
                                className="fill-slate-900 text-3xl font-black font-mono"
                              >
                                {absenceRecords.length}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 16}
                                className="fill-slate-500 text-xs font-bold"
                              >
                                حالة
                              </tspan>
                            </text>
                          );
                        }
                        return null;
                      }}
                      position="center"
                    />
                  </Pie>
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string) => (
                      <span className="text-xs font-semibold text-slate-700 px-1">
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* 2. Bar Chart: معدل الغياب خلال آخر 7 أيام */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow duration-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#137a85] flex items-center justify-center shadow-2xs">
                <BarChart3 className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm md:text-base font-bold text-slate-900">
                  معدل الغياب خلال آخر 7 أيام
                </h3>
                <p className="text-xs text-slate-500">
                  تتبع حالات الغياب اليومية لكافة المعلمات
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
              <Calendar className="w-3.5 h-3.5 text-[#137a85]" />
              <span>آخر 7 أيام</span>
            </div>
          </div>

          {!hasAbsences ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" aria-hidden="true" />
              </div>
              <p className="text-sm font-bold text-slate-700">
                لا توجد بيانات غياب في الأيام الماضية
              </p>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                يتم تحديث المخطط البياني اليومي فورياً بمجرد إدراج تاريخ الغياب في
                استمارة المساءلة.
              </p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  margin={{ top: 22, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="dayName"
                    tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />
                  <YAxis
                    orientation="right"
                    allowDecimals={false}
                    tick={{ fill: "#64748b", fontSize: 11, fontFamily: "monospace" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar
                    dataKey="count"
                    name="عدد حالات الغياب"
                    fill="#137a85"
                    radius={[6, 6, 0, 0]}
                    barSize={32}
                    maxBarSize={42}
                    animationDuration={600}
                    animationEasing="ease-out"
                  >
                    <LabelList
                      dataKey="count"
                      position="top"
                      offset={6}
                      fill="#137a85"
                      fontSize={11}
                      fontWeight={800}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* 3. تنبيهات التأخر والانصراف */}
      {delayNoticeStats.total > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-2xs">
                <Clock className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-sm md:text-base font-bold text-slate-900">
                  توزيع مخالفات تنبيهات التأخر والانصراف
                </h3>
                <p className="text-xs text-slate-500">
                  تصنيف حالات التأخر الصباحي، عدم التواجد، والانصراف المبكر (نموذج و.م.ع.ن - ٠٢ - ٠٢)
                </p>
              </div>
            </div>

            <Link
              href="/procedures/delay-notice"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors self-start sm:self-center cursor-pointer"
            >
              <span>إدارة تنبيهات التأخر ({delayNoticeStats.total})</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1 font-medium">
                <LogIn className="w-3.5 h-3.5 text-amber-600" />
                <span>تأخر صباحي</span>
              </div>
              <span className="text-xl font-bold font-mono text-slate-900">
                {delayNoticeStats.morning}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1 font-medium">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>عدم تواجد أثناء الدوام</span>
              </div>
              <span className="text-xl font-bold font-mono text-slate-900">
                {delayNoticeStats.during}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1 font-medium">
                <LogOut className="w-3.5 h-3.5 text-amber-600" />
                <span>انصراف مبكر</span>
              </div>
              <span className="text-xl font-bold font-mono text-slate-900">
                {delayNoticeStats.early}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1 font-medium">
                <DoorOpen className="w-3.5 h-3.5 text-amber-600" />
                <span>خروج وعودة</span>
              </div>
              <span className="text-xl font-bold font-mono text-slate-900">
                {delayNoticeStats.left}
              </span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
