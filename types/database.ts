/**
 * Strict database schema interfaces reflecting Supabase PostgreSQL tables
 */

import {
  DelayNoticeStatus,
  DirectorOpinion,
  InquiryStatus,
  AbsenceType,
} from "./teacher";

export interface DbTeacherRow {
  id: string;
  name: string;
  full_name: string;
  national_id?: string;
  job_number?: string;
  username?: string;
  mobile: string | null;
  email?: string | null;
  employment_status: string;
  job_title: string;
  teaching_field: string | null;
  specialty: string | null;
  total_absences: number;
  created_at?: string;
  updated_at?: string;
}

export interface DbAbsenceRecordRow {
  id: string;
  teacher_id: string;
  teacher_name: string;
  national_id?: string | null;
  job_number?: string;
  specialty: string | null;
  date: string;
  type: AbsenceType;
  reason: string;
  notes: string | null;
  attachment_url: string | null;
  timestamp: string;
  created_at?: string;
}

export interface DbDelayNoticeRow {
  id: string;
  notice_number: string | null;
  teacher_id: string;
  teacher_name: string;
  national_id?: string | null;
  job_number?: string;
  specialty: string | null;
  notice_date: string;
  violation_delay_start: boolean;
  delay_start_time: string | null;
  violation_absent_during: boolean;
  absent_from_time: string | null;
  absent_to_time: string | null;
  violation_early_departure: boolean;
  early_departure_time: string | null;
  violation_left_school: boolean;
  left_school_details: string | null;
  additional_notes: string | null;
  status: DelayNoticeStatus;
  teacher_reason: string | null;
  teacher_signature_date: string | null;
  director_opinion: DirectorOpinion;
  director_notes: string | null;
  director_signature_date: string | null;
  hijri_year: string | null;
  share_token: string;
  token_expires_at: string;
  teacher_response_submitted_at: string | null;
  teacher_ip_address: string | null;
  link_shared_at: string | null;
  created_at: string;
}

export interface DbAbsenceInquiryRow {
  id: string;
  teacher_id: string;
  teacher_name: string;
  national_id?: string | null;
  job_number?: string;
  specialty: string | null;
  mobile: string | null;
  absence_date: string;
  absence_end_date?: string | null;
  days_count?: number | null;
  is_multi_day?: boolean | null;
  token: string;
  status: InquiryStatus;
  expires_at: string;
  absence_type: AbsenceType | null;
  teacher_reason: string | null;
  attachment_url: string | null;
  admin_notes: string | null;
  submitted_at: string | null;
  created_at: string;
}

export interface DbAdminCredentialRow {
  id: string;
  username: string;
  password_hash: string;
  display_name: string;
  role: string;
  updated_at: string;
}

export interface DbEmployeePermissionRow {
  id: string;
  teacher_id: string;
  permission_date: string;
  exit_time: string;
  return_time: string;
  duration_minutes: number;
  reason: string;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at?: string | null;
  is_archived?: boolean | null;
  archived_at?: string | null;
  archived_by?: string | null;
  archive_reason?: string | null;
  archived_by_cascade?: boolean | null;
}

export interface DbDeductionDecisionRow {
  id: string;
  teacher_id: string;
  teacher_name: string;
  civil_id: string;
  specialization?: string | null;
  rank?: string | null;
  job_number?: string | null;
  current_action?: string | null;
  delay_minutes: number;
  total_hours: number;
  deduction_days: number;
  decision_number: string;
  decision_date: string;
  principal_name?: string | null;
  settled_notice_ids?: string[] | null;
  remainder_minutes: number;
  hijri_year?: string | null;
  is_archived?: boolean | null;
  archived_at?: string | null;
  archived_by?: string | null;
  archive_reason?: string | null;
  archived_by_cascade?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

export type AuditLogAction =
  | "CREATE"
  | "UPDATE"
  | "ARCHIVE"
  | "RESTORE"
  | "APPROVE"
  | "REJECT"
  | "ISSUE_DEDUCTION"
  | "EXPORT_REPORT"
  | "BACKUP_CREATED"
  | "BACKUP_RESTORED"
  | "LOGIN"
  | "LOGOUT";

export type AuditLogEntityType =
  | "teacher"
  | "absence"
  | "inquiry"
  | "delay"
  | "delay_notice"
  | "permission"
  | "deduction"
  | "report"
  | "backup"
  | "system";

export interface DbAuditLogRow {
  id: string;
  user_id?: string | null;
  user_name?: string | null;
  user_role?: string | null;
  action: AuditLogAction;
  entity_type: AuditLogEntityType;
  entity_id?: string | null;
  details?: string | null;
  old_value?: Record<string, unknown> | unknown | null;
  new_value?: Record<string, unknown> | unknown | null;
  ip_address?: string | null;
  timestamp: string;
}

export interface RealtimeDbPayload<T extends Record<string, unknown>> {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T;
  old: Partial<T>;
  errors?: string[] | null;
}

