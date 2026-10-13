"use client";

import React from "react";
import { Calendar } from "lucide-react";
import { getDualDate, formatOfficialDateRange } from "@/lib/hijriDateService";
import { cn } from "@/lib/utils";

export interface DualDateBadgeProps {
  date?: string;
  endDate?: string;
  className?: string;
  showDayName?: boolean;
  compact?: boolean;
}

export const DualDateBadge: React.FC<DualDateBadgeProps> = ({
  date,
  endDate,
  className,
  showDayName = false,
  compact = false,
}) => {
  if (!date) return <span className="text-slate-400">—</span>;

  const isRange = Boolean(endDate && endDate !== date);

  if (isRange && endDate) {
    const range = formatOfficialDateRange(date, endDate);
    return (
      <div className={cn("inline-flex flex-col text-right", className)}>
        <span
          className={cn(
            "font-extrabold text-teal-800 dark:text-teal-300 leading-tight",
            compact ? "text-[11px]" : "text-xs"
          )}
        >
          {range.hijriRange}
        </span>
        <span
          className={cn(
            "text-slate-500 dark:text-slate-400 font-medium font-mono leading-tight mt-0.5 flex items-center gap-1",
            compact ? "text-[10px]" : "text-[11px]"
          )}
        >
          <Calendar className="w-2.5 h-2.5 opacity-60 shrink-0" />
          <span>{range.gregorianRange} م</span>
        </span>
      </div>
    );
  }

  const dual = getDualDate(date);

  return (
    <div className={cn("inline-flex flex-col text-right", className)}>
      <span
        className={cn(
          "font-bold text-slate-900 dark:text-slate-100 leading-tight",
          compact ? "text-[11px]" : "text-xs"
        )}
      >
        {showDayName ? `يوم ${dual.dayName} ` : ""}
        {dual.hijriParts.day} {dual.hijriParts.monthName} {dual.hijriParts.year} هـ
      </span>
      <span
        className={cn(
          "text-slate-500 dark:text-slate-400 font-medium font-mono leading-tight mt-0.5 flex items-center gap-1",
          compact ? "text-[10px]" : "text-[11px]"
        )}
      >
        <Calendar className="w-2.5 h-2.5 opacity-60 shrink-0" />
        <span>{dual.gregorianShort}</span>
      </span>
    </div>
  );
};
