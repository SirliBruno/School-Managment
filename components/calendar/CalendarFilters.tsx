"use client";

import React from "react";
import { Search, X } from "lucide-react";
import { CalendarFilterState, CalendarEventType } from "@/types/calendar";
import { cn } from "@/lib/utils";

export interface CalendarFiltersProps {
  filters: CalendarFilterState;
  onFilterChange: (updated: Partial<CalendarFilterState>) => void;
  eventCounts: {
    all: number;
    absence: number;
    delay: number;
    permission: number;
    deduction: number;
  };
  teachersList: Array<{ id: string; name: string }>;
}

export const CalendarFilters: React.FC<CalendarFiltersProps> = ({
  filters,
  onFilterChange,
  eventCounts,
  teachersList,
}) => {
  const typeTabs: Array<{
    type: "all" | CalendarEventType;
    label: string;
    count: number;
    dotColor: string;
    activeClass: string;
  }> = [
    {
      type: "all",
      label: "جميع الأحداث",
      count: eventCounts.all,
      dotColor: "bg-slate-400",
      activeClass: "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
    },
    {
      type: "absence",
      label: "غياب",
      count: eventCounts.absence,
      dotColor: "bg-rose-500",
      activeClass: "bg-rose-600 text-white shadow-2xs",
    },
    {
      type: "delay",
      label: "تأخر / انصراف",
      count: eventCounts.delay,
      dotColor: "bg-amber-500",
      activeClass: "bg-amber-600 text-white shadow-2xs",
    },
    {
      type: "permission",
      label: "استئذان",
      count: eventCounts.permission,
      dotColor: "bg-sky-500",
      activeClass: "bg-sky-600 text-white shadow-2xs",
    },
    {
      type: "deduction",
      label: "قرار حسم",
      count: eventCounts.deduction,
      dotColor: "bg-purple-500",
      activeClass: "bg-purple-600 text-white shadow-2xs",
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 sm:p-4 shadow-2xs space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Type filter pill tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 custom-scrollbar">
          {typeTabs.map(({ type, label, count, dotColor, activeClass }) => {
            const isActive = filters.eventType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onFilterChange({ eventType: type })}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border",
                  isActive
                    ? `${activeClass} border-transparent`
                    : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full shrink-0", dotColor)} />
                <span>{label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                    isActive
                      ? "bg-black/20 text-white"
                      : "bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Teacher Filter */}
        <div className="flex items-center gap-2">
          {/* Teacher selector */}
          <div className="relative min-w-[160px] sm:min-w-[190px]">
            <select
              value={filters.teacherId}
              onChange={(e) => onFilterChange({ teacherId: e.target.value })}
              className="w-full h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 px-3 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#137a85] cursor-pointer"
            >
              <option value="">جميع المعلمات</option>
              {teachersList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث عن موظف بالاسم أو التخصص"
              value={filters.searchQuery}
              onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
              className="w-full h-9 pl-7 pr-8 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#137a85]"
            />
            {filters.searchQuery && (
              <button
                type="button"
                onClick={() => onFilterChange({ searchQuery: "" })}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
