"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, User } from "lucide-react";
import { CalendarEvent } from "@/types/calendar";
import {
  ARABIC_WEEKDAYS,
  formatToISODate,
  formatHijriDate,
} from "@/services/calendarService";
import { cn } from "@/lib/utils";

export interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
}

export const DayView: React.FC<DayViewProps> = ({
  currentDate,
  events,
  onSelectEvent,
}) => {
  const dateStr = useMemo(() => formatToISODate(currentDate), [currentDate]);
  const dayOfWeekName = ARABIC_WEEKDAYS[currentDate.getDay()];
  const hijriStr = useMemo(() => formatHijriDate(currentDate, { format: "text" }), [currentDate]);

  const dayEvents = useMemo(
    () => events.filter((ev) => ev.date === dateStr),
    [events, dateStr]
  );

  const getCardClasses = (color: CalendarEvent["badgeColor"]) => {
    switch (color) {
      case "rose":
        return "border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20";
      case "amber":
        return "border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20";
      case "blue":
        return "border-sky-200 dark:border-sky-900/60 bg-sky-50/30 dark:bg-sky-950/20";
      case "purple":
        return "border-purple-200 dark:border-purple-900/60 bg-purple-50/30 dark:bg-purple-950/20";
      default:
        return "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900";
    }
  };

  const getBadgeClasses = (color: CalendarEvent["badgeColor"]) => {
    switch (color) {
      case "rose":
        return "bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      case "amber":
        return "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "blue":
        return "bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800";
      case "purple":
        return "bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-6 shadow-2xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-[#137a85] dark:text-teal-400 flex flex-col items-center justify-center font-bold">
            <span className="text-base font-black leading-none">{currentDate.getDate()}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">{dayOfWeekName}</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              سجل أحداث يوم {dayOfWeekName}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              {dateStr} م • {hijriStr}
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
            {dayEvents.length} إجراء إداري مسجل
          </span>
        </div>
      </div>

      {dayEvents.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto border border-slate-200 dark:border-slate-700">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            لا توجد أحداث أو إجراءات مسجلة لهذا اليوم
          </h4>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
            كافة السجلات منضبطة ولم يتم رصد أي غياب أو تأخر أو استئذان أو حسم مسجل في هذا التاريخ.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {dayEvents.map((ev) => (
            <div
              key={ev.id}
              onClick={() => onSelectEvent(ev)}
              className={cn(
                "p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4",
                getCardClasses(ev.badgeColor)
              )}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <User className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {ev.teacherName}
                    </h4>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-bold border",
                        getBadgeClasses(ev.badgeColor)
                      )}
                    >
                      {ev.badgeLabel}
                    </span>
                    {ev.statusText && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                        {ev.statusText}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {ev.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {ev.details}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                {ev.originalPageUrl && (
                  <Link
                    href={ev.originalPageUrl}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 hover:border-[#137a85] text-slate-700 dark:text-slate-300 hover:text-[#137a85] transition-colors"
                  >
                    <span>فتح صفحة الإجراء</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
