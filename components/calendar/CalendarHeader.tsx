"use client";

import React, { useMemo } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Calendar as CalendarIcon,
  LayoutGrid,
  Columns,
  Square,
  List,
} from "lucide-react";
import { Button } from "@/components/ui";
import { CalendarViewMode, CalendarEventType } from "@/types/calendar";
import { ARABIC_MONTHS, formatHijriDate } from "@/services/calendarService";
import { cn } from "@/lib/utils";

export interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  totalEventsCount: number;
  eventCounts?: {
    all: number;
    absence: number;
    delay: number;
    permission: number;
    deduction: number;
  };
  activeEventType?: "all" | CalendarEventType;
  onSelectEventType?: (type: "all" | CalendarEventType) => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  viewMode,
  onViewModeChange,
  onPrev,
  onNext,
  onToday,
  eventCounts,
  activeEventType = "all",
  onSelectEventType,
}) => {
  const titleInfo = useMemo(() => {
    const yr = currentDate.getFullYear();
    const moIdx = currentDate.getMonth();
    const monthName = ARABIC_MONTHS[moIdx];
    const hijri = formatHijriDate(currentDate, { format: "header" });

    return {
      gregorian: `${monthName} ${yr} م`,
      hijri,
    };
  }, [currentDate]);

  const viewModes: Array<{
    mode: CalendarViewMode;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { mode: "month", label: "شهر", icon: LayoutGrid },
    { mode: "week", label: "أسبوع", icon: Columns },
    { mode: "day", label: "يوم", icon: Square },
    { mode: "agenda", label: "أجندة", icon: List },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-4">
      {/* Top Row: Title, Nav, View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Date Title & Hijri display */}
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-[#137a85] dark:text-teal-400 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {titleInfo.gregorian}
              </h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {titleInfo.hijri}
              </p>
            </div>
          </div>
        </div>

        {/* Middle Navigation Controls */}
        <div className="flex items-center gap-2">
          {/* RTL Navigation: Right Chevron = Previous, Left Chevron = Next */}
          <button
            type="button"
            onClick={onPrev}
            aria-label="الفترة السابقة"
            className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToday}
            className="text-xs font-bold px-3 py-1.5 h-9 border-slate-200/90 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            اليوم
          </Button>

          <button
            type="button"
            onClick={onNext}
            aria-label="الفترة التالية"
            className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* View Mode Selector Tabs */}
        <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 self-start md:self-auto">
          {viewModes.map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              type="button"
              onClick={() => onViewModeChange(mode)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                viewMode === mode
                  ? "bg-white dark:bg-slate-900 text-[#137a85] dark:text-teal-400 shadow-2xs font-extrabold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Summary Metrics Bar (Compact Summary Cards for Current Period) */}
      {eventCounts && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <button
              type="button"
              onClick={() => onSelectEventType?.("all")}
              className={cn(
                "flex items-center justify-between p-2 sm:p-2.5 rounded-xl border text-right transition-all cursor-pointer",
                activeEventType === "all"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-transparent shadow-xs"
                  : "bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 border-slate-200/70 dark:border-slate-800 text-slate-700 dark:text-slate-300"
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                <span className="text-xs font-bold truncate">إجمالي الأحداث</span>
              </div>
              <span className="text-xs font-mono font-black shrink-0 px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10">
                {eventCounts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelectEventType?.("absence")}
              className={cn(
                "flex items-center justify-between p-2 sm:p-2.5 rounded-xl border text-right transition-all cursor-pointer",
                activeEventType === "absence"
                  ? "bg-rose-600 text-white border-transparent shadow-xs"
                  : "bg-rose-50/40 hover:bg-rose-50 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 border-rose-200/70 dark:border-rose-900/40 text-rose-900 dark:text-rose-200"
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span className="text-xs font-bold truncate">الغياب</span>
              </div>
              <span className="text-xs font-mono font-black shrink-0 px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10">
                {eventCounts.absence}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelectEventType?.("delay")}
              className={cn(
                "flex items-center justify-between p-2 sm:p-2.5 rounded-xl border text-right transition-all cursor-pointer",
                activeEventType === "delay"
                  ? "bg-amber-600 text-white border-transparent shadow-xs"
                  : "bg-amber-50/40 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 border-amber-200/70 dark:border-amber-900/40 text-amber-900 dark:text-amber-200"
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="text-xs font-bold truncate">التأخر</span>
              </div>
              <span className="text-xs font-mono font-black shrink-0 px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10">
                {eventCounts.delay}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelectEventType?.("permission")}
              className={cn(
                "flex items-center justify-between p-2 sm:p-2.5 rounded-xl border text-right transition-all cursor-pointer",
                activeEventType === "permission"
                  ? "bg-sky-600 text-white border-transparent shadow-xs"
                  : "bg-sky-50/40 hover:bg-sky-50 dark:bg-sky-950/20 dark:hover:bg-sky-950/40 border-sky-200/70 dark:border-sky-900/40 text-sky-900 dark:text-sky-200"
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                <span className="text-xs font-bold truncate">الاستئذان</span>
              </div>
              <span className="text-xs font-mono font-black shrink-0 px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10">
                {eventCounts.permission}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelectEventType?.("deduction")}
              className={cn(
                "col-span-2 sm:col-span-1 flex items-center justify-between p-2 sm:p-2.5 rounded-xl border text-right transition-all cursor-pointer",
                activeEventType === "deduction"
                  ? "bg-purple-600 text-white border-transparent shadow-xs"
                  : "bg-purple-50/40 hover:bg-purple-50 dark:bg-purple-950/20 dark:hover:bg-purple-950/40 border-purple-200/70 dark:border-purple-900/40 text-purple-900 dark:text-purple-200"
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                <span className="text-xs font-bold truncate">قرارات الحسم</span>
              </div>
              <span className="text-xs font-mono font-black shrink-0 px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10">
                {eventCounts.deduction}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
