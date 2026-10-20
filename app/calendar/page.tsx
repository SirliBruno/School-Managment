"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTeachers } from "@/context/TeacherContext";
import {
  CalendarEvent,
  CalendarViewMode,
  CalendarFilterState,
} from "@/types/calendar";
import {
  fetchCalendarEvents,
  getMonthDateRange,
} from "@/services/calendarService";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { CalendarFilters } from "@/components/calendar/CalendarFilters";
import { MonthView } from "@/components/calendar/MonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { DayView } from "@/components/calendar/DayView";
import { AgendaView } from "@/components/calendar/AgendaView";
import { EventDetailsModal } from "@/components/calendar/EventDetailsModal";
import { PageHeader, Card, Button } from "@/components/ui";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function CalendarPage() {
  const {
    teachers,
    absenceRecords,
    delayNotices,
    permissions,
    deductionDecisions,
  } = useTeachers();

  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [filters, setFilters] = useState<CalendarFilterState>({
    eventType: "all",
    teacherId: "",
    searchQuery: "",
  });

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Auto-detect mobile screen and default to agenda view if screen is very narrow
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setViewMode("agenda");
    }
  }, []);

  const dateRange = useMemo(() => {
    const yr = currentDate.getFullYear();
    const mo = currentDate.getMonth();
    return getMonthDateRange(yr, mo);
  }, [currentDate]);

  const loadEvents = useCallback(async () => {
    setIsFetching(true);
    setFetchError(null);

    try {
      const fetched = await fetchCalendarEvents({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        fallbackData: {
          absenceRecords,
          delayNotices,
          permissions,
          deductionDecisions,
        },
      });

      setEvents(fetched);
    } catch (err) {
      console.error("Error loading calendar events:", err);
      setFetchError("تعذر تحميل بيانات التقويم.");
    } finally {
      setIsFetching(false);
    }
  }, [
    dateRange.startDate,
    dateRange.endDate,
    absenceRecords,
    delayNotices,
    permissions,
    deductionDecisions,
  ]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    const q = filters.searchQuery.trim().toLowerCase();
    const targetTeacherId = filters.teacherId;
    const targetType = filters.eventType;

    return events.filter((ev) => {
      if (targetType !== "all" && ev.type !== targetType) return false;
      if (targetTeacherId && ev.teacherId !== targetTeacherId) return false;
      if (q) {
        const matchesName = ev.teacherName.toLowerCase().includes(q);
        const matchesSpecialty = (ev.specialty || "").toLowerCase().includes(q);
        const matchesNationalId = (ev.nationalId || "").includes(q);
        const matchesTitle = ev.title.toLowerCase().includes(q);
        const matchesSubtitle = ev.subtitle.toLowerCase().includes(q);

        if (!matchesName && !matchesSpecialty && !matchesNationalId && !matchesTitle && !matchesSubtitle) {
          return false;
        }
      }
      return true;
    });
  }, [events, filters]);

  const eventCounts = useMemo(() => {
    let absence = 0;
    let delay = 0;
    let permission = 0;
    let deduction = 0;

    events.forEach((ev) => {
      if (ev.type === "absence") absence++;
      else if (ev.type === "delay") delay++;
      else if (ev.type === "permission") permission++;
      else if (ev.type === "deduction") deduction++;
    });

    return {
      all: events.length,
      absence,
      delay,
      permission,
      deduction,
    };
  }, [events]);

  const teachersList = useMemo(() => {
    return (teachers || [])
      .filter((t) => !t.isArchived)
      .map((t) => ({ id: t.id, name: t.name || t.fullName || "معلمة" }))
      .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [teachers]);

  const handlePrev = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === "month" || viewMode === "agenda") d.setMonth(d.getMonth() - 1);
      else if (viewMode === "week") d.setDate(d.getDate() - 7);
      else if (viewMode === "day") d.setDate(d.getDate() - 1);
      return d;
    });
  }, [viewMode]);

  const handleNext = useCallback(() => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === "month" || viewMode === "agenda") d.setMonth(d.getMonth() + 1);
      else if (viewMode === "week") d.setDate(d.getDate() + 7);
      else if (viewMode === "day") d.setDate(d.getDate() + 1);
      return d;
    });
  }, [viewMode]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleSelectDay = useCallback((dateStr: string) => {
    const parts = dateStr.split("-").map(Number);
    if (parts.length === 3) {
      setCurrentDate(new Date(parts[0], parts[1] - 1, parts[2]));
      setViewMode("day");
    }
  }, []);

  const handleFilterChange = useCallback((updated: Partial<CalendarFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  }, []);

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="التقويم الإداري"
        subtitle="استعراض زمني شامل لإجراءات الغياب والتأخر والاستئذان وقرارات الحسم"
        breadcrumbs={[
          { label: "لوحة التحكم", href: "/" },
          { label: "العمل اليومي", href: "/procedures/list" },
          { label: "التقويم الإداري" },
        ]}
      />

      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        totalEventsCount={filteredEvents.length}
        eventCounts={eventCounts}
        activeEventType={filters.eventType}
        onSelectEventType={(type) => handleFilterChange({ eventType: type })}
      />

      <CalendarFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        eventCounts={eventCounts}
        teachersList={teachersList}
      />

      {fetchError ? (
        <Card className="p-8 text-center space-y-3 border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20">
          <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">
            {fetchError}
          </h3>
          <Button variant="outline" size="sm" onClick={loadEvents} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            <span>إعادة المحاولة</span>
          </Button>
        </Card>
      ) : (
        <>
          {viewMode === "month" && (
            <MonthView
              currentDate={currentDate}
              events={filteredEvents}
              onSelectEvent={setSelectedEvent}
              onSelectDay={handleSelectDay}
            />
          )}

          {viewMode === "week" && (
            <WeekView
              currentDate={currentDate}
              events={filteredEvents}
              onSelectEvent={setSelectedEvent}
              onSelectDay={handleSelectDay}
            />
          )}

          {viewMode === "day" && (
            <DayView
              currentDate={currentDate}
              events={filteredEvents}
              onSelectEvent={setSelectedEvent}
            />
          )}

          {viewMode === "agenda" && (
            <AgendaView
              events={filteredEvents}
              onSelectEvent={setSelectedEvent}
              onSelectDay={handleSelectDay}
            />
          )}
        </>
      )}

      <EventDetailsModal
        event={selectedEvent}
        isOpen={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
