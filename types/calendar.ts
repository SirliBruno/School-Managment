export type CalendarEventType = "absence" | "delay" | "permission" | "deduction";
export type CalendarViewMode = "month" | "week" | "day" | "agenda";

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  date: string; // YYYY-MM-DD
  teacherId: string;
  teacherName: string;
  nationalId?: string;
  specialty?: string;
  title: string;
  subtitle: string;
  badgeLabel: string;
  badgeColor: "rose" | "amber" | "blue" | "purple";
  details: string;
  statusText?: string;
  originalPageUrl?: string;
  rawItem?: unknown;
}

export interface CalendarFilterState {
  eventType: "all" | CalendarEventType;
  teacherId: string;
  searchQuery: string;
}

export interface DayCalendarInfo {
  dateStr: string;
  dayNum: number;
  dayOfWeek: number; // 0 = Sunday
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  events: CalendarEvent[];
}
