"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Users,
  UserX,
  CalendarDays,
  AlertCircle,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: number | string;
  unit?: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBgColor: string;
  iconColor: string;
  badgeText?: string;
  badgeType?: "info" | "warning" | "danger" | "success";
  loading?: boolean;
}

const cardItemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" as const },
  },
};

const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  unit = "معلمة",
  subtitle,
  icon: Icon,
  iconBgColor,
  iconColor,
  badgeText,
  badgeType = "info",
  loading = false,
}) => {
  return (
    <motion.div
      variants={cardItemVariants}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-default border border-slate-200 hover:border-slate-300/80 flex flex-col justify-between group"
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5">
            <p className="text-xs md:text-sm font-semibold text-slate-500">
              {title}
            </p>
            {loading ? (
              <div className="h-9 w-20 bg-slate-200/70 rounded-lg animate-pulse my-1" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight tabular-nums font-mono">
                  {value}
                </span>
                {unit && (
                  <span className="text-xs text-slate-400 font-medium">
                    {unit}
                  </span>
                )}
              </div>
            )}
            <p className="text-xs text-slate-500 leading-relaxed">{subtitle}</p>
          </div>

          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-200",
              iconBgColor
            )}
          >
            <Icon className={cn("w-6 h-6", iconColor)} />
          </div>
        </div>
      </div>

      {badgeText && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold border transition-colors",
              badgeType === "danger" &&
                "bg-rose-50 text-rose-700 border-rose-200",
              badgeType === "warning" &&
                "bg-amber-50 text-amber-700 border-amber-200",
              badgeType === "info" &&
                "bg-teal-50 text-[#137a85] border-teal-200",
              badgeType === "success" &&
                "bg-emerald-50 text-emerald-700 border-emerald-200"
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {badgeText}
          </span>
          <span className="text-slate-400 font-medium">محدّث لحظياً</span>
        </div>
      )}
    </motion.div>
  );
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

export const KpiCards: React.FC = () => {
  const { isLoading } = useTeachers();
  const stats = useDashboardStats();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
    >
      {/* 1. غياب اليوم — الأكثر إلحاحاً صباحاً */}
      <KpiCard
        title="غياب اليوم"
        value={stats.todayAbsences}
        unit="معلمة غائبة"
        subtitle="حالات الغياب المسجلة بتاريخ اليوم"
        icon={UserX}
        iconBgColor="bg-rose-50"
        iconColor="text-rose-600"
        badgeText={
          stats.todayAbsences === 0
            ? "انضباط تام اليوم"
            : `${stats.todayAbsences} تستلزم مساءلة فورية`
        }
        badgeType={stats.todayAbsences === 0 ? "success" : "danger"}
        loading={isLoading}
      />

      {/* 2. الإجراءات المعلقة — تستوجب متابعة */}
      <KpiCard
        title="الإجراءات المعلقة"
        value={stats.pendingProcedures}
        unit="إجراء معلق"
        subtitle={
          stats.pendingDelayNotices > 0
            ? `مساءلات وتنبيهات (${stats.pendingDelayNotices} تأخر بانتظار المتابعة)`
            : "مساءلات وملاحظات بانتظار الإفادة أو الاعتماد"
        }
        icon={AlertCircle}
        iconBgColor="bg-amber-50"
        iconColor="text-amber-600"
        badgeText={
          stats.pendingProcedures === 0
            ? "جميع الإجراءات مكتملة"
            : "تتطلب متابعة الوكيلة"
        }
        badgeType={stats.pendingProcedures === 0 ? "success" : "warning"}
        loading={isLoading}
      />

      {/* 3. إجمالي الغياب (هذا الشهر) */}
      <KpiCard
        title="إجمالي الغياب (هذا الشهر)"
        value={stats.monthAbsences}
        unit="حالة غياب"
        subtitle="مجموع أيام الغياب خلال الشهر الحالي"
        icon={CalendarDays}
        iconBgColor="bg-indigo-50"
        iconColor="text-indigo-600"
        badgeText={
          stats.monthAbsences === 0
            ? "لا يوجد غياب هذا الشهر"
            : `معدل شهري تراكمي`
        }
        badgeType="info"
        loading={isLoading}
      />

      {/* 4. إجمالي المعلمات */}
      <KpiCard
        title="إجمالي المعلمات"
        value={stats.totalTeachers}
        unit="معلمة"
        subtitle="المعلمات المسجلات بنظام المدرسة"
        icon={Users}
        iconBgColor="bg-teal-50"
        iconColor="text-[#137a85]"
        badgeText={
          stats.totalTeachers > 0
            ? `${stats.totalTeachers} معلمة نشطة`
            : "لا توجد معلمات مسجلات"
        }
        badgeType="info"
        loading={isLoading}
      />
    </motion.div>
  );
};
