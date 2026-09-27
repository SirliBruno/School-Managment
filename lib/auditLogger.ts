/**
 * محرك سجل العمليات والتدقيق الإداري الشامل (Audit Logging Engine)
 * لتتبع العمليات الحساسة، الأرشفة، الاستعادة، والاعتمادات الرسمية
 */

import { AuditLog, AuditLogAction, AuditLogEntityType } from "@/types/teacher";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const AUDIT_LOGS_STORAGE_KEY = "school_admin_audit_logs_v1";
const MAX_LOCAL_LOGS = 500;

export interface LogAuditParams {
  action: AuditLogAction;
  entityType: AuditLogEntityType;
  entityId?: string;
  details?: string;
  oldValue?: Record<string, unknown> | unknown;
  newValue?: Record<string, unknown> | unknown;
  userId?: string;
  userName?: string;
  userRole?: string;
}

let inMemoryAuditLogs: AuditLog[] = [];

/**
 * تسجيل عملية إدارية جديدة في سجل التدقيق
 */
export function logAuditEvent(params: LogAuditParams): AuditLog {
  const now = new Date().toISOString();
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const logEntry: AuditLog = {
    id,
    userId: params.userId || "admin",
    userName: params.userName || "أحلام صالح الضبيبي",
    userRole: params.userRole || "وكيلة المدرسة",
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    details: params.details,
    oldValue: params.oldValue,
    newValue: params.newValue,
    ipAddress: typeof window !== "undefined" ? "127.0.0.1" : undefined,
    timestamp: now,
  };

  // 1. التخزين المحلي الآمن (LocalStorage مع دعم الذاكرة المؤقتة لبيئات Node/SSR/Tests)
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
      const list: AuditLog[] = stored ? JSON.parse(stored) : [];
      const updated = [logEntry, ...list].slice(0, MAX_LOCAL_LOGS);
      localStorage.setItem(AUDIT_LOGS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("تعذر حفظ سجل العمليات في التخزين المحلي:", e);
    }
  } else {
    inMemoryAuditLogs = [logEntry, ...inMemoryAuditLogs].slice(0, MAX_LOCAL_LOGS);
  }

  // 2. المزامنة السحابية مع Supabase (إذا كان مهيأ)
  if (isSupabaseConfigured() && supabase) {
    supabase
      .from("audit_logs")
      .insert({
        id: logEntry.id,
        user_id: logEntry.userId || null,
        user_name: logEntry.userName || null,
        user_role: logEntry.userRole || null,
        action: logEntry.action,
        entity_type: logEntry.entityType,
        entity_id: logEntry.entityId || null,
        details: logEntry.details || null,
        old_value: logEntry.oldValue ? JSON.stringify(logEntry.oldValue) : null,
        new_value: logEntry.newValue ? JSON.stringify(logEntry.newValue) : null,
        ip_address: logEntry.ipAddress || null,
        timestamp: logEntry.timestamp,
      })
      .then(
        () => {},
        (err) => console.warn("تعذر مزامنة سجل العمليات مع سوبابيز:", err)
      );
  }

  return logEntry;
}

/**
 * جلب سجل العمليات المخزن محلياً
 */
export function getLocalAuditLogs(): AuditLog[] {
  if (typeof window === "undefined") {
    return inMemoryAuditLogs;
  }
  try {
    const stored = localStorage.getItem(AUDIT_LOGS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * تفريغ سجل العمليات المحلي (للإدارة فقط)
 */
export function clearLocalAuditLogs(): void {
  inMemoryAuditLogs = [];
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUDIT_LOGS_STORAGE_KEY);
  } catch {}
}
