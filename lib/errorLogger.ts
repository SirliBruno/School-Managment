/**
 * نظام مراقبة وتسجيل الأخطاء الإدارية والتقنية (Administrative Error Monitoring)
 * يقوم بتسجيل الأخطاء التشغيلية مع تنقية وتشفير البيانات الحساسة (Sanitization)
 * لمنع تسريب الرموز الأمنية، المفاتيح، أو كلمات المرور إلى الواجهة
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export const ERROR_LOGS_STORAGE_KEY = "school_admin_error_logs_v1";
const MAX_LOCAL_ERROR_LOGS = 200;

export interface SystemErrorLog {
  id: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  page: string;
  timestamp: string;
  errorName: string;
  message: string;
  technicalDetails?: string;
  userFacingMessage: string;
  handled: boolean;
}

export interface CaptureErrorParams {
  error: unknown;
  page: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  customContext?: string;
  handled?: boolean;
}

let inMemoryErrorLogs: SystemErrorLog[] = [];

/**
 * تنقية النصوص التقنية والـ Stack Traces من الرموز الأمنية الحساسة
 */
export function sanitizeTechnicalDetails(raw: string): string {
  if (!raw) return "";

  return raw
    // إخفاء رموز التوكن (JWT / Bearer)
    .replace(/Bearer\s+[A-Za-z0-9\-_.]+/gi, "Bearer [REDACTED_TOKEN]")
    .replace(/token=([a-zA-Z0-9\-_]+)/gi, "token=[REDACTED_TOKEN]")
    // إخفاء مفاتيح الـ API و Supabase keys
    .replace(/(apikey|anon_key|service_role|secret)=([a-zA-Z0-9\-_.]+)/gi, "$1=[REDACTED_KEY]")
    // إخفاء كلمات المرور وسلاسل الاتصال
    .replace(/(password|passwd|pwd)[:=]([^\s&]+)/gi, "$1=[REDACTED_PASSWORD]")
    .replace(/postgres:\/\/[^:]+:[^@]+@/gi, "postgres://[USER]:[PASSWORD]@")
    // إخفاء مسارات النظام الحساسة الخاصة بسيرفر التطوير
    .replace(/[A-Z]:\\[^ \n\r\t]+\\node_modules\\/gi, "[MODULES]\\");
}

/**
 * تسجيل خطأ تشغيلي بنظام المراقبة مع ضمان أمان البيانات
 */
export function logSystemError(params: CaptureErrorParams): SystemErrorLog {
  const now = new Date().toISOString();
  const rawId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8).toUpperCase()
      : Math.random().toString(36).slice(2, 8).toUpperCase();
  const errorRef = `ERR-${rawId}`;

  let errorName = "UnknownError";
  let rawMessage = "حدث خطأ غير معروف";
  let rawStack = "";

  if (params.error instanceof Error) {
    errorName = params.error.name;
    rawMessage = params.error.message;
    rawStack = params.error.stack || "";
  } else if (typeof params.error === "string") {
    rawMessage = params.error;
  } else if (params.error && typeof params.error === "object") {
    rawMessage = JSON.stringify(params.error);
  }

  const technicalDetails = sanitizeTechnicalDetails(
    [params.customContext ? `Context: ${params.customContext}` : null, rawStack || rawMessage]
      .filter(Boolean)
      .join("\n\n")
  );

  // رسالة آمنة لا تكشف البنية الداخلية لقاعدة البيانات أو الخادم
  const userFacingMessage = `حدث خطأ غير متوقع أثناء معالجة الطلب في (${params.page}). رمز الخطأ للمتابعة: ${errorRef.slice(0, 12)}`;

  const logEntry: SystemErrorLog = {
    id: errorRef,
    userId: params.userId || "anonymous",
    userName: params.userName || "مستخدم النظام",
    userRole: params.userRole || "guest",
    page: params.page,
    timestamp: now,
    errorName,
    message: sanitizeTechnicalDetails(rawMessage),
    technicalDetails,
    userFacingMessage,
    handled: params.handled !== undefined ? params.handled : true,
  };

  // 1. التخزين المحلي الآمن
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(ERROR_LOGS_STORAGE_KEY);
      const list: SystemErrorLog[] = stored ? JSON.parse(stored) : [];
      const updated = [logEntry, ...list].slice(0, MAX_LOCAL_ERROR_LOGS);
      localStorage.setItem(ERROR_LOGS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // تجاوز أخطاء مساحة التخزين في بيئات المتصفح المقيدة
    }
  } else {
    inMemoryErrorLogs = [logEntry, ...inMemoryErrorLogs].slice(0, MAX_LOCAL_ERROR_LOGS);
  }

  // 2. المزامنة مع سوبابيز إن وُجد جدول audit_logs أو جدول مخصص
  if (isSupabaseConfigured() && supabase) {
    supabase
      .from("audit_logs")
      .insert({
        id: logEntry.id,
        user_id: logEntry.userId,
        user_name: logEntry.userName,
        user_role: logEntry.userRole,
        action: "SYSTEM_ERROR",
        entity_type: "SYSTEM",
        entity_id: logEntry.page,
        details: logEntry.message,
        old_value: null,
        new_value: {
          errorName: logEntry.errorName,
          technicalDetails: logEntry.technicalDetails,
          handled: logEntry.handled,
        },
        timestamp: logEntry.timestamp,
      })
      .then(
        () => {},
        () => {} // الصمت عند فشل المزامنة السحابية لعدم إحداث حلقة أخطاء
      );
  }

  return logEntry;
}

/**
 * جلب سجلات الأخطاء المسجلة محلياً
 */
export function getSystemErrorLogs(): SystemErrorLog[] {
  if (typeof window === "undefined") {
    return inMemoryErrorLogs;
  }
  try {
    const stored = localStorage.getItem(ERROR_LOGS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * مسح سجلات الأخطاء المحلية (للإدارة فقط)
 */
export function clearSystemErrorLogs(): void {
  inMemoryErrorLogs = [];
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(ERROR_LOGS_STORAGE_KEY);
    } catch {
      // noop
    }
  }
}
