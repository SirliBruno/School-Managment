"use client";

import React, { useMemo } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { CalendarEvent } from "@/types/calendar";
import { formatHijriDate, ARABIC_WEEKDAYS } from "@/services/calendarService";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface AgendaViewProps {
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onSelectDay: (dateStr: string) => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  events,
  onSelectEvent,
  onSelectDay,
}) => {
  const groupedEvents = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((ev) => {
      const list = map.get(ev.date) || [];
      list.push(ev);
      map.set(ev.date, list);
    });

    const dates = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
    return dates.map((dateStr) => ({
      dateStr,
      events: map.get(dateStr)!,
    }));
  }, [events]);

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

  const getCardClasses = (color: CalendarEvent["badgeColor"]) => {
    switch (color) {
      case "rose":
        return "border-rose-200/90 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10";
      case "amber":
        return "border-amber-200/90 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10";
      case "blue":
        return "border-sky-200/90 dark:border-sky-900/60 bg-sky-50/20 dark:bg-sky-950/10";
      case "purple":
        return "border-purple-200/90 dark:border-purple-900/60 bg-purple-50/20 dark:bg-purple-950/10";
      default:
        return "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900";
    }
  };

  if (groupedEvents.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 sm:p-12 text-center shadow-2xs space-y-2">
        <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto border border-slate-200 dark:border-slate-700">
          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
        </div>
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          لا توجد سجلات في هذه الفترة
        </h4>
        <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
          لم يتم العثور على أي إجراءات غياب أو تأخر أو استئذان أو حسم مطابقة لخيارات التصفية الحالية.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groupedEvents.map(({ dateStr, events: dayEvents }) => {
        const dObj = new Date(dateStr);
        const dayOfWeek = ARABIC_WEEKDAYS[dObj.getDay()];
        const hijri = formatHijriDate(dateStr, { format: "numeric" });

        return (
          <div
            key={dateStr}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden"
          >
            <div
              onClick={() => onSelectDay(dateStr)}
              className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#137a85]" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#137a85] transition-colors">
                  {dayOfWeek}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-mono" dir="ltr">
                  {dateStr}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                  • {hijri}
                </span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                {dayEvents.length} إجراء
              </span>
            </div>

            <div className="p-3 divide-y divide-slate-100 dark:divide-slate-800/80 space-y-1">
              {dayEvents.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => onSelectEvent(ev)}
                  className={cn(
                    "p-3 rounded-xl transition-colors cursor-pointer flex items-center justify-between gap-3 group border my-1",
                    getCardClasses(ev.badgeColor)
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        ev.badgeColor === "rose" && "bg-rose-500",
                        ev.badgeColor === "amber" && "bg-amber-500",
                        ev.badgeColor === "blue" && "bg-sky-500",
                        ev.badgeColor === "purple" && "bg-purple-500"
                      )}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {ev.teacherName}
                        </span>
                        <span
                          className={cn(
                            "px-1.5 py-0.2 rounded-md text-[9px] font-bold border shrink-0",
                            getBadgeClasses(ev.badgeColor)
                          )}
                        >
                          {ev.badgeLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {ev.title} • {ev.details}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-slate-400 group-hover:text-[#137a85] p-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
