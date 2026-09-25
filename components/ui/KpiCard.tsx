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
        "bg-white p-4 lg:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between gap-3 transition-all duration-200 hover:shadow-sm hover:border-slate-300",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-slate-500 truncate">{title}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className={cn("text-xl lg:text-2xl font-extrabold font-mono", finalValueColor)}>
            {value}
          </p>
          {badge && (
            <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
              {badge}
            </span>
          )}
          {subtitle && <div className="shrink-0">{subtitle}</div>}
        </div>
      </div>
      <div
        className={cn(
          "w-10 h-10 lg:w-11 lg:h-11 rounded-xl flex items-center justify-center shrink-0 shadow-2xs",
          finalIconBg,
          finalIconColor
        )}
      >
        {icon}
      </div>
    </div>
  );
};
