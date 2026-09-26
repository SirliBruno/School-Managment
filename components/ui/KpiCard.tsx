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
    iconBg: "bg-teal-50",
    iconText: "text-[#137a85]",
    valueText: "text-slate-900",
  },
  emerald: {
    iconBg: "bg-emerald-50",
    iconText: "text-emerald-600",
    valueText: "text-emerald-700",
  },
  sky: {
    iconBg: "bg-sky-50",
    iconText: "text-sky-600",
    valueText: "text-sky-700",
  },
  blue: {
    iconBg: "bg-blue-50",
    iconText: "text-blue-600",
    valueText: "text-blue-700",
  },
  amber: {
    iconBg: "bg-amber-50",
    iconText: "text-amber-600",
    valueText: "text-amber-700",
  },
  rose: {
    iconBg: "bg-rose-50",
    iconText: "text-rose-600",
    valueText: "text-rose-700",
  },
  purple: {
    iconBg: "bg-purple-50",
    iconText: "text-purple-600",
    valueText: "text-purple-700",
  },
  slate: {
    iconBg: "bg-slate-100",
    iconText: "text-slate-600",
    valueText: "text-slate-900",
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
        "bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between transition-all duration-200 hover:shadow-sm hover:border-slate-300",
        className
      )}
      dir="rtl"
    >
      {/* Card Header: Title & Icon */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <span className="text-xs font-semibold text-slate-500 truncate block">
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
            <span className="text-xs font-bold text-slate-500">
              {unit}
            </span>
          )}
          {badge && (
            <span className="ms-auto text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
              {badge}
            </span>
          )}
        </div>

        {/* Subtitle / Contextual Status */}
        {subtitle && (
          <div
            className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium truncate"
            dir="rtl"
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};
