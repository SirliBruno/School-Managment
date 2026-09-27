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

export const getAuditLogs = getLocalAuditLogs;

export interface FetchAuditLogsParams {
  page?: number;
  pageSize?: number;
  action?: AuditLogAction;
  entityType?: AuditLogEntityType;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
}

export interface FetchAuditLogsResult {
  logs: AuditLog[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  source: "cloud" | "local";
}

/**
 * جلب سجل العمليات والتدقيق من سوبابيز مباشرة مع دعم التصفح والفلترة والبحث،
 * مع الرجوع التلقائي للتخزين المحلي في حال عدم توفر الاتصال السحابي.
 */
export async function fetchAuditLogsFromCloud(
  params: FetchAuditLogsParams = {}
): Promise<FetchAuditLogsResult> {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.max(1, Math.min(100, params.pageSize || 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("timestamp", { ascending: false });

      if (params.action) {
        query = query.eq("action", params.action);
      }
      if (params.entityType) {
        query = query.eq("entity_type", params.entityType);
      }
      if (params.startDate) {
        query = query.gte("timestamp", params.startDate);
      }
      if (params.endDate) {
        query = query.lte("timestamp", params.endDate);
      }
      if (params.searchQuery && params.searchQuery.trim()) {
        const q = params.searchQuery.trim();
        query = query.or(`details.ilike.%${q}%,user_name.ilike.%${q}%`);
      }

      const { data, count, error } = await query.range(from, to);

      if (!error && data) {
        const total = count ?? data.length;
        const mappedLogs: AuditLog[] = data.map((row: Record<string, unknown>) => ({
          id: String(row.id),
          userId: (row.user_id as string) || undefined,
          userName: (row.user_name as string) || undefined,
          userRole: (row.user_role as string) || undefined,
          action: row.action as AuditLogAction,
          entityType: row.entity_type as AuditLogEntityType,
          entityId: (row.entity_id as string) || undefined,
          details: (row.details as string) || undefined,
          oldValue: row.old_value
            ? typeof row.old_value === "string"
              ? JSON.parse(row.old_value)
              : row.old_value
            : undefined,
          newValue: row.new_value
            ? typeof row.new_value === "string"
              ? JSON.parse(row.new_value)
              : row.new_value
            : undefined,
          ipAddress: (row.ip_address as string) || undefined,
          timestamp: (row.timestamp as string) || new Date().toISOString(),
        }));

        return {
          logs: mappedLogs,
          totalCount: total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize) || 1,
          source: "cloud",
        };
      }
    } catch (err) {
      console.warn("تعذر جلب سجل العمليات من السحابة، التراجع للمحلي:", err);
    }
  }

  // Fallback to local logs
  let localLogs = getLocalAuditLogs();
  if (params.action) {
    localLogs = localLogs.filter((l) => l.action === params.action);
  }
  if (params.entityType) {
    localLogs = localLogs.filter((l) => l.entityType === params.entityType);
  }
  if (params.startDate) {
    localLogs = localLogs.filter((l) => l.timestamp >= params.startDate!);
  }
  if (params.endDate) {
    localLogs = localLogs.filter((l) => l.timestamp <= params.endDate!);
  }
  if (params.searchQuery && params.searchQuery.trim()) {
    const q = params.searchQuery.trim().toLowerCase();
    localLogs = localLogs.filter(
      (l) =>
        (l.details && l.details.toLowerCase().includes(q)) ||
        (l.userName && l.userName.toLowerCase().includes(q))
    );
  }

  const total = localLogs.length;
  const paged = localLogs.slice(from, to + 1);

  return {
    logs: paged,
    totalCount: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
    source: "local",
  };
}
