"use client";

import React, { useMemo } from "react";
import { CalendarEvent } from "@/types/calendar";
import {
  ARABIC_WEEKDAYS,
  getWeekDateRange,
  formatHijriDate,
} from "@/services/calendarService";
import { getSaudiToday } from "@/lib/timeUtils";
import { cn } from "@/lib/utils";

export interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectDay: (dateStr: string) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  events,
  onSelectEvent,
  onSelectDay,
}) => {
  const todayStr = useMemo(() => getSaudiToday(), []);
  const { dates } = useMemo(() => getWeekDateRange(currentDate), [currentDate]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((ev) => {
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    });
    return map;
  }, [events]);

  const getBadgeClasses = (color: CalendarEvent["badgeColor"]) => {
    switch (color) {
      case "rose":
        return "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 hover:border-rose-300";
      case "amber":
        return "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 hover:border-amber-300";
      case "blue":
        return "bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900/60 text-sky-800 dark:text-sky-200 hover:border-sky-300";
      case "purple":
        return "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/60 text-purple-800 dark:text-purple-200 hover:border-purple-300";
      default:
        return "bg-slate-50 border-slate-200 text-slate-800";
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-slate-200/80 dark:divide-slate-800 min-h-[450px]">
        {dates.map((dateStr, idx) => {
          const dayName = ARABIC_WEEKDAYS[idx];
          const dObj = new Date(dateStr);
          const dayNum = dObj.getDate();
          const isToday = dateStr === todayStr;
          const isWeekend = idx === 5 || idx === 6;
          const dayEvents = eventsByDate.get(dateStr) || [];
          const hijri = formatHijriDate(dateStr, { format: "numeric" });

          return (
            <div
              key={dateStr}
              className={cn(
                "p-3 flex flex-col justify-start space-y-3 transition-colors",
                isToday && "bg-teal-50/20 dark:bg-teal-950/20",
                isWeekend && !isToday && "bg-slate-50/40 dark:bg-slate-950/40"
              )}
            >
              <div
                onClick={() => onSelectDay(dateStr)}
                className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 cursor-pointer group"
              >
                <div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-[#137a85] transition-colors">
                    {dayName}
                  </span>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    {hijri}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-xs font-mono font-bold w-6 h-6 rounded-lg flex items-center justify-center",
                    isToday
                      ? "bg-[#137a85] text-white shadow-2xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  )}
                >
                  {dayNum}
                </span>
              </div>

              <div className="space-y-2 flex-1 overflow-y-auto max-h-[380px] custom-scrollbar pr-0.5">
                {dayEvents.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-[11px] text-slate-400 dark:text-slate-600">لا توجد سجلات</p>
                  </div>
                ) : (
                  dayEvents.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => onSelectEvent(ev)}
                      className={cn(
                        "w-full text-right p-2 rounded-xl text-xs border transition-all cursor-pointer flex flex-col gap-1 shadow-2xs",
                        getBadgeClasses(ev.badgeColor)
                      )}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold truncate text-slate-900 dark:text-slate-100">
                          {ev.teacherName}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md font-semibold bg-white/60 dark:bg-black/40 shrink-0">
                          {ev.badgeLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {ev.title}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
