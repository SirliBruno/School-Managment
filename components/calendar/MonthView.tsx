"use client";

import React, { useMemo, useState } from "react";
import {
  FileText,
  Clock,
  DoorOpen,
  Scale,
  User,
  ArrowUpRight,
} from "lucide-react";
import { CalendarEvent } from "@/types/calendar";
import {
  ARABIC_WEEKDAYS,
  getMonthDateRange,
  formatToISODate,
} from "@/services/calendarService";
import { getSaudiToday } from "@/lib/timeUtils";
import { cn } from "@/lib/utils";

export interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectDay: (dateStr: string) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  events,
  onSelectEvent,
  onSelectDay,
}) => {
  const todayStr = useMemo(() => getSaudiToday(), []);
  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((ev) => {
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    });
    return map;
  }, [events]);

  const gridCells = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const { daysInMonth, firstDayOfWeek } = getMonthDateRange(year, month);

    const cells: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isWeekend: boolean;
      dayOfWeek: number;
    }> = [];

    // Filler days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, d);
      const dateStr = formatToISODate(prevDate);
      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isWeekend: prevDate.getDay() === 5 || prevDate.getDay() === 6,
        dayOfWeek: prevDate.getDay(),
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const curDate = new Date(year, month, d);
      const dateStr = formatToISODate(curDate);
      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isWeekend: curDate.getDay() === 5 || curDate.getDay() === 6,
        dayOfWeek: curDate.getDay(),
      });
    }

    // Filler days from next month
    const totalSlots = cells.length > 35 ? 42 : 35;
    const remaining = totalSlots - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const dateStr = formatToISODate(nextDate);
      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isWeekend: nextDate.getDay() === 5 || nextDate.getDay() === 6,
        dayOfWeek: nextDate.getDay(),
      });
    }

    return cells;
  }, [currentDate, todayStr]);

  const getBadgeClasses = (color: CalendarEvent["badgeColor"]) => {
    switch (color) {
      case "rose":
        return "bg-rose-50/90 dark:bg-rose-950/60 border-rose-200/90 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/60";
      case "amber":
        return "bg-amber-50/90 dark:bg-amber-950/60 border-amber-200/90 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60";
      case "blue":
        return "bg-sky-50/90 dark:bg-sky-950/60 border-sky-200/90 dark:border-sky-900/60 text-sky-800 dark:text-sky-200 hover:bg-sky-100 dark:hover:bg-sky-900/60";
      case "purple":
        return "bg-purple-50/90 dark:bg-purple-950/60 border-purple-200/90 dark:border-purple-900/60 text-purple-800 dark:text-purple-200 hover:bg-purple-100 dark:hover:bg-purple-900/60";
      default:
        return "bg-slate-100 dark:bg-slate-800 border-slate-200 text-slate-800";
    }
  };

  const getEventDotColor = (color: CalendarEvent["badgeColor"]) => {
    switch (color) {
      case "rose":
        return "bg-rose-500";
      case "amber":
        return "bg-amber-500";
      case "blue":
        return "bg-sky-500";
      case "purple":
        return "bg-purple-500";
      default:
        return "bg-slate-400";
    }
  };

  const getEventIcon = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "absence":
        return <FileText className="w-3 h-3 text-rose-600 dark:text-rose-400" />;
      case "delay":
        return <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />;
      case "permission":
        return <DoorOpen className="w-3 h-3 text-sky-600 dark:text-sky-400" />;
      case "deduction":
        return <Scale className="w-3 h-3 text-purple-600 dark:text-purple-400" />;
    }
  };

  const getEventSecondaryTag = (ev: CalendarEvent) => {
    if (ev.type === "absence") return ev.badgeLabel || "غياب";
    const match = ev.title.match(/\((.*?)\)/);
    if (match && match[1]) return match[1];
    return ev.badgeLabel;
  };

  return (
    <div
      role="grid"
      aria-label="التقويم الإداري الشهري"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden"
    >
      {/* Weekday headers */}
      <div
        role="row"
        className="grid grid-cols-7 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-center text-xs font-bold text-slate-600 dark:text-slate-300 py-3 select-none"
      >
        {ARABIC_WEEKDAYS.map((day, idx) => (
          <div
            key={day}
            role="columnheader"
            className={cn(
              "px-1 truncate",
              idx === 5 || idx === 6 ? "text-slate-400 dark:text-slate-500" : ""
            )}
          >
            <span>{day}</span>
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/80 divide-x-reverse bg-slate-100/30 dark:bg-slate-950/30">
        {gridCells.map((cell) => {
          const dayEvents = eventsByDate.get(cell.dateStr) || [];
          const visibleEvents = dayEvents.slice(0, 3);
          const hiddenCount = dayEvents.length - visibleEvents.length;

          return (
            <div
              key={cell.dateStr}
              role="gridcell"
              tabIndex={0}
              onClick={() => onSelectDay(cell.dateStr)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectDay(cell.dateStr);
                }
              }}
              className={cn(
                "min-h-[105px] sm:min-h-[125px] p-1.5 sm:p-2 flex flex-col justify-between transition-all bg-white dark:bg-slate-900 group relative cursor-pointer",
                !cell.isCurrentMonth && "bg-slate-50/60 dark:bg-slate-950/50 text-slate-400 dark:text-slate-600",
                cell.isWeekend && cell.isCurrentMonth && "bg-slate-50/30 dark:bg-slate-900/60",
                cell.isToday && "bg-teal-50/40 dark:bg-teal-950/20 ring-1 ring-teal-500/40 dark:ring-teal-500/30",
                "hover:bg-slate-50/90 dark:hover:bg-slate-800/50"
              )}
            >
              {/* Day header row */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-lg font-mono",
                    cell.isToday
                      ? "bg-[#137a85] text-white shadow-2xs font-black ring-2 ring-teal-200 dark:ring-teal-900"
                      : cell.isCurrentMonth
                      ? "text-slate-700 dark:text-slate-200"
                      : "text-slate-400 dark:text-slate-600"
                  )}
                >
                  {cell.dayNum}
                </span>

                {dayEvents.length > 0 && (
                  <span
                    title={`يوجد ${dayEvents.length} أحداث في هذا اليوم`}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono transition-colors"
                  >
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Event pills stack */}
              <div className="space-y-1 overflow-visible flex-1">
                {visibleEvents.map((ev) => {
                  const secondaryTag = getEventSecondaryTag(ev);
                  const isHovered = hoveredEvent?.id === ev.id;

                  return (
                    <div
                      key={ev.id}
                      className="relative"
                      onMouseEnter={() => setHoveredEvent(ev)}
                      onMouseLeave={() => setHoveredEvent(null)}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(ev);
                        }}
                        className={cn(
                          "w-full text-right p-1 rounded-md text-[10px] font-semibold border flex items-center justify-between gap-1 transition-all cursor-pointer group/pill truncate",
                          getBadgeClasses(ev.badgeColor)
                        )}
                        title={`${ev.teacherName} - ${ev.title}`}
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full shrink-0",
                              getEventDotColor(ev.badgeColor)
                            )}
                          />
                          <span className="truncate font-bold text-slate-900 dark:text-slate-100">
                            {ev.teacherName}
                          </span>
                        </div>
                        {secondaryTag && (
                          <span className="shrink-0 text-[9px] px-1 py-0.2 rounded bg-black/5 dark:bg-white/10 opacity-90 font-medium">
                            {secondaryTag}
                          </span>
                        )}
                      </button>

                      {/* Desktop Hover Tooltip */}
                      {isHovered && (
                        <div
                          role="tooltip"
                          className="hidden md:block absolute bottom-full mb-1.5 right-0 z-40 w-64 p-3 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 text-right pointer-events-none animate-in fade-in zoom-in-95 duration-150"
                        >
                          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-1.5">
                              {getEventIcon(ev.type)}
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {ev.badgeLabel}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {ev.statusText}
                            </span>
                          </div>

                          <div className="space-y-1 mb-2">
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              <span>{ev.teacherName}</span>
                            </div>
                            {ev.specialty && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 pr-4">
                                التخصص: {ev.specialty}
                              </p>
                            )}
                          </div>

                          <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-300 space-y-0.5">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              {ev.subtitle}
                            </p>
                            <p className="text-slate-500 dark:text-slate-400">
                              {ev.details}
                            </p>
                          </div>

                          <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[9px] text-slate-400">
                            <span className="font-mono">{ev.date}</span>
                            <span className="text-[#137a85] dark:text-teal-400 font-semibold flex items-center gap-0.5">
                              انقر لعرض السجل
                              <ArrowUpRight className="w-2.5 h-2.5" />
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDay(cell.dateStr);
                    }}
                    className="w-full text-center py-0.5 rounded text-[10px] font-bold text-[#137a85] dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-colors cursor-pointer"
                  >
                    + {hiddenCount} أخرى
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
