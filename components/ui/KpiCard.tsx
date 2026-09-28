"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type KpiVariant =
  | "teal"
  | "emerald"
  | "sky"
  | "blue"
  | "amber"
  | "rose"
  | "purple"
  | "slate";

export interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  variant?: KpiVariant | string;
  icon: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  valueColor?: string;
  className?: string;
}

const variantStyles: Record<
  string,
  { iconBg: string; iconText: string; valueText: string }
> = {
  teal: {
    iconBg: "bg-teal-50 dark:bg-teal-950/60 border border-teal-200/60 dark:border-teal-800/60",
    iconText: "text-[#137a85] dark:text-teal-400",
    valueText: "text-slate-900 dark:text-slate-100",
  },
  emerald: {
    iconBg: "bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60",
    iconText: "text-emerald-600 dark:text-emerald-400",
    valueText: "text-emerald-700 dark:text-emerald-400",
  },
  sky: {
    iconBg: "bg-sky-50 dark:bg-sky-950/60 border border-sky-200/60 dark:border-sky-800/60",
    iconText: "text-sky-600 dark:text-sky-400",
    valueText: "text-sky-700 dark:text-sky-400",
  },
  blue: {
    iconBg: "bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60",
    iconText: "text-blue-600 dark:text-blue-400",
    valueText: "text-blue-700 dark:text-blue-400",
  },
  amber: {
    iconBg: "bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60",
    iconText: "text-amber-600 dark:text-amber-400",
    valueText: "text-amber-700 dark:text-amber-400",
  },
  rose: {
    iconBg: "bg-rose-50 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-800/60",
    iconText: "text-rose-600 dark:text-rose-400",
    valueText: "text-rose-700 dark:text-rose-400",
  },
  purple: {
    iconBg: "bg-purple-50 dark:bg-purple-950/60 border border-purple-200/60 dark:border-purple-800/60",
    iconText: "text-purple-600 dark:text-purple-400",
    valueText: "text-purple-700 dark:text-purple-400",
  },
  slate: {
    iconBg: "bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
    iconText: "text-slate-600 dark:text-slate-300",
    valueText: "text-slate-900 dark:text-slate-100",
  },
};

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  badge,
  variant = "teal",
  icon,
  iconBgColor,
  iconColor,
  valueColor,
  className,
}) => {
  const preset = variantStyles[variant] || variantStyles.teal;
  const finalIconBg = iconBgColor || preset.iconBg;
  const finalIconColor = iconColor || preset.iconText;
  const finalValueColor = valueColor || preset.valueText;

  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-all duration-200 hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-700",
        className
      )}
      dir="rtl"
    >
      {/* Card Header: Title & Icon */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate block">
          {title}
        </span>
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs",
            finalIconBg,
            finalIconColor
          )}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>

      {/* Main Metric Value & Unit */}
      <div>
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span
            className={cn(
              "text-2xl sm:text-3xl font-black font-mono tracking-tight",
              finalValueColor
            )}
          >
            {value}
          </span>
          {unit && (
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {unit}
            </span>
          )}
          {badge && (
            <span className="ms-auto text-[10px] text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/80 px-1.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
              {badge}
            </span>
          )}
        </div>

        {/* Subtitle / Contextual Status */}
        {subtitle && (
          <div
            className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate"
            dir="rtl"
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};
