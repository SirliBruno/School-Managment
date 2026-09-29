export type ReportType =
  | "absence_summary"
  | "delay_departure_summary"
  | "deduction_decisions_summary"
  | "teacher_detailed_record"
  | "permissions_summary"
  | "teacher_permissions_record"
  | "permissions_statistics"
  | "school_comprehensive"
  | "administrative_inquiries_summary"
  | "custom_period";

export interface ReportFilterOptions {
  month?: string; // e.g. "09", "10", or "all"
  year?: string;  // e.g. "2026" or "1448"
  startDate?: string;
  endDate?: string;
  teacherId?: string; // "all" or specific teacher id
  specialty?: string; // "all" or specific
  employmentStatus?: string; // "all" | "دائم" | "عقد"
  status?: string; // for delay notices: "all" | "completed" | "pending_director" | "pending_teacher"
}

export interface ReportHistoryItem {
  id: string;
  reportType: ReportType;
  reportTitle: string;
  createdByName: string;
  createdAt: string; // ISO string
  filters: ReportFilterOptions;
  retentionPeriod: string; // e.g. "عام دراسي كامل"
  summaryStats?: Record<string, string | number>;
}
