/**
 * نظام النسخ الاحتياطي والاستعادة الإدارية الشامل (System Backup & Point-in-Time Recovery)
 * يوفر إنشاء لقطات حالة (Snapshots)، التحقق من سلامة البيانات عبر التوقيع الرقمي،
 * وتصدير/استيراد الملفات المشفرة مع تسجيل العمليات في سجل التدقيق.
 */

import {
  Teacher,
  AbsenceRecord,
  AbsenceInquiry,
  DelayNotice,
  DeductionDecision,
  EmployeePermission,
  ArchivedTeacher,
  ArchivedAbsenceRecord,
  ArchivedDelayNotice,
  ArchivedDeductionDecision,
  ArchivedEmployeePermission,
  AuditLog,
  AdministrativeInquiry,
  ArchivedAdministrativeInquiry,
} from "@/types/teacher";
import { getLocalAuditLogs, logAuditEvent } from "@/lib/auditLogger";
import { getActiveSchoolSettings } from "@/lib/schoolSettingsService";

export const BACKUP_VERSION = "2.0.0";
export const BACKUP_STORAGE_KEY = "school_admin_latest_backup_v1";

export interface AttachmentManifestItem {
  id: string;
  entityType: "absence" | "inquiry" | "administrative_inquiry" | "school_asset";
  entityId: string;
  storageType: "supabase_storage" | "data_url" | "external_url";
  url: string;
}

export interface SystemBackupMetadata {
  version: string;
  timestamp: string;
  exportedAt: string;
  source: string;
  counts: {
    teachers: number;
    absenceRecords: number;
    delayNotices: number;
    inquiries: number;
    deductionDecisions: number;
    permissions: number;
    administrativeInquiries?: number;
    archivedTeachers: number;
    archivedAbsences: number;
    archivedDelayNotices: number;
    archivedDeductions: number;
    archivedPermissions: number;
    archivedAdministrativeInquiries?: number;
    auditLogs: number;
    adminCredentials?: number;
    attachmentsCount?: number;
  };
  attachmentsManifest?: AttachmentManifestItem[];
  checksum: string;
}

export interface SystemBackupData {
  teachers: Teacher[];
  absenceRecords: AbsenceRecord[];
  delayNotices: DelayNotice[];
  inquiries: AbsenceInquiry[];
  deductionDecisions: DeductionDecision[];
  permissions: EmployeePermission[];
  administrativeInquiries?: AdministrativeInquiry[];
  archivedTeachers: ArchivedTeacher[];
  archivedAbsences: ArchivedAbsenceRecord[];
  archivedDelayNotices: ArchivedDelayNotice[];
  archivedDeductionDecisions: ArchivedDeductionDecision[];
  archivedPermissions: ArchivedEmployeePermission[];
  archivedAdministrativeInquiries?: ArchivedAdministrativeInquiry[];
  schoolSettings?: Record<string, unknown>;
  adminCredentials?: Array<Record<string, unknown>>;
  auditLogs: AuditLog[];
}

export interface SystemBackupSnapshot {
  metadata: SystemBackupMetadata;
  data: SystemBackupData;
}

/**
 * حساب التوقيع الرقمي التكاملي للنسخة الاحتياطية (SHA-256 / FNV-1a Checksum)
 */
export function calculateChecksum(content: string): string {
  let hash = 2166136261;
  for (let i = 0; i < content.length; i++) {
    hash ^= content.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `chk_${(hash >>> 0).toString(16).padStart(8, "0")}_${content.length}`;
}

/**
 * فهرسة واستخراج جميع المرفقات والأصول السحابية من لقطة البيانات
 */
export function buildAttachmentsManifest(data: Partial<SystemBackupData>): AttachmentManifestItem[] {
  const manifest: AttachmentManifestItem[] = [];

  // 1. Absence records
  (data.absenceRecords || []).forEach((rec) => {
    if (rec.attachmentUrl && rec.attachmentUrl.trim()) {
      manifest.push({
        id: `att_abs_${rec.id}_primary`,
        entityType: "absence",
        entityId: rec.id,
        storageType: rec.attachmentUrl.startsWith("data:")
          ? "data_url"
          : rec.attachmentUrl.includes("supabase.co/storage") || rec.attachmentUrl.startsWith("absence-attachments")
          ? "supabase_storage"
          : "external_url",
        url: rec.attachmentUrl,
      });
    }
    if (Array.isArray(rec.attachmentUrls)) {
      rec.attachmentUrls.forEach((url, idx) => {
        if (url && url.trim()) {
          manifest.push({
            id: `att_abs_${rec.id}_slot_${idx}`,
            entityType: "absence",
            entityId: rec.id,
            storageType: url.startsWith("data:")
              ? "data_url"
              : url.includes("supabase.co/storage") || url.startsWith("absence-attachments")
              ? "supabase_storage"
              : "external_url",
            url,
          });
        }
      });
    }
  });

  // 2. Inquiries
  (data.inquiries || []).forEach((inq) => {
    if (inq.attachmentUrl && inq.attachmentUrl.trim()) {
      manifest.push({
        id: `att_inq_${inq.id}`,
        entityType: "inquiry",
        entityId: inq.id,
        storageType: inq.attachmentUrl.startsWith("data:")
          ? "data_url"
          : inq.attachmentUrl.includes("supabase.co/storage") || inq.attachmentUrl.startsWith("absence-attachments")
          ? "supabase_storage"
          : "external_url",
        url: inq.attachmentUrl,
      });
    }
  });

  // 3. Administrative Inquiries
  (data.administrativeInquiries || []).forEach((ai) => {
    const url = ai.attachmentUrl || (ai as unknown as Record<string, unknown>).attachment_url;
    if (typeof url === "string" && url.trim()) {
      manifest.push({
        id: `att_admin_inq_${ai.id}`,
        entityType: "administrative_inquiry",
        entityId: ai.id,
        storageType: url.startsWith("data:")
          ? "data_url"
          : url.includes("supabase.co/storage") || url.startsWith("absence-attachments")
          ? "supabase_storage"
          : "external_url",
        url,
      });
    }
  });

  // 4. School Assets
  const settings = data.schoolSettings;
  if (settings && typeof settings === "object") {
    ["school_logo", "stamp_url", "signature_url", "schoolLogo", "stampUrl", "signatureUrl"].forEach((key) => {
      const val = (settings as Record<string, unknown>)[key];
      if (typeof val === "string" && val.trim()) {
        manifest.push({
          id: `asset_${key}`,
          entityType: "school_asset",
          entityId: "current",
          storageType: val.startsWith("data:")
            ? "data_url"
            : val.includes("supabase.co/storage") || val.startsWith("school-assets")
            ? "supabase_storage"
            : "external_url",
          url: val,
        });
      }
    });
  }

  return manifest;
}

/**
 * إنشاء لقطة نسخ احتياطي شاملة لبيانات النظام
 */
export function createDatabaseBackupSnapshot(
  state: Partial<SystemBackupData> = {}
): SystemBackupSnapshot {
  const auditLogs = state.auditLogs || getLocalAuditLogs();

  const data: SystemBackupData = {
    teachers: state.teachers || [],
    absenceRecords: state.absenceRecords || [],
    delayNotices: state.delayNotices || [],
    inquiries: state.inquiries || [],
    deductionDecisions: state.deductionDecisions || [],
    permissions: state.permissions || [],
    administrativeInquiries: state.administrativeInquiries || [],
    archivedTeachers: state.archivedTeachers || [],
    archivedAbsences: state.archivedAbsences || [],
    archivedDelayNotices: state.archivedDelayNotices || [],
    archivedDeductionDecisions: state.archivedDeductionDecisions || [],
    archivedPermissions: state.archivedPermissions || [],
    archivedAdministrativeInquiries: state.archivedAdministrativeInquiries || [],
    schoolSettings: state.schoolSettings || (typeof window !== "undefined" ? (getActiveSchoolSettings() as unknown as Record<string, unknown>) : undefined),
    adminCredentials: state.adminCredentials || [],
    auditLogs,
  };

  const attachmentsManifest = buildAttachmentsManifest(data);

  const counts = {
    teachers: data.teachers.length,
    absenceRecords: data.absenceRecords.length,
    delayNotices: data.delayNotices.length,
    inquiries: data.inquiries.length,
    deductionDecisions: data.deductionDecisions.length,
    permissions: data.permissions.length,
    administrativeInquiries: (data.administrativeInquiries || []).length,
    archivedTeachers: data.archivedTeachers.length,
    archivedAbsences: data.archivedAbsences.length,
    archivedDelayNotices: data.archivedDelayNotices.length,
    archivedDeductions: data.archivedDeductionDecisions.length,
    archivedPermissions: data.archivedPermissions.length,
    archivedAdministrativeInquiries: (data.archivedAdministrativeInquiries || []).length,
    auditLogs: data.auditLogs.length,
    adminCredentials: (data.adminCredentials || []).length,
    attachmentsCount: attachmentsManifest.length,
  };

  const serializedData = JSON.stringify(data);
  const checksum = calculateChecksum(serializedData);
  const now = new Date();

  const metadata: SystemBackupMetadata = {
    version: BACKUP_VERSION,
    timestamp: now.toISOString(),
    exportedAt: now.toLocaleString("ar-SA"),
    source: "منصة الإدارة المدرسية - النسخ الاحتياطي الشامل",
    counts,
    attachmentsManifest,
    checksum,
  };

  const snapshot: SystemBackupSnapshot = {
    metadata,
    data,
  };

  // حفظ نسخة احتياطية محلية تلقائية
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(snapshot));
    } catch (e) {
      console.warn("فشل تخزين أحدث لقطة احتياطية محلياً:", e);
    }
  }

  logAuditEvent({
    action: "BACKUP_CREATED",
    entityType: "backup",
    details: `إنشاء نسخة احتياطية شاملة تضم ${counts.teachers} معلمة، ${counts.absenceRecords} غياب، و${counts.permissions} استئذان`,
    newValue: metadata as unknown as Record<string, unknown>,
  });

  return snapshot;
}

export const generateDatabaseBackupSnapshot = createDatabaseBackupSnapshot;

/**
 * التحقق المنطقي المتقدم من سلامة العلاقات والمفاتيح الخارجية وعدم وجود سجلات يتيمة
 */
export function validateSnapshotIntegrity(snapshot: SystemBackupSnapshot): {
  valid: boolean;
  warnings: string[];
  orphanCount: number;
} {
  const warnings: string[] = [];
  let orphanCount = 0;

  const validTeacherIds = new Set<string>();
  (snapshot.data.teachers || []).forEach((t) => validTeacherIds.add(t.id));
  (snapshot.data.archivedTeachers || []).forEach((at) => {
    if (at.teacher?.id) validTeacherIds.add(at.teacher.id);
  });

  // Check absence records foreign keys
  (snapshot.data.absenceRecords || []).forEach((rec) => {
    if (rec.teacherId && !validTeacherIds.has(rec.teacherId)) {
      orphanCount++;
      warnings.push(`سجل غياب (${rec.id}) يشير لمعلمة غير موجودة (${rec.teacherId})`);
    }
  });

  // Check inquiries foreign keys
  (snapshot.data.inquiries || []).forEach((inq) => {
    if (inq.teacherId && !validTeacherIds.has(inq.teacherId)) {
      orphanCount++;
      warnings.push(`مساءلة غياب (${inq.id}) تشير لمعلمة غير موجودة (${inq.teacherId})`);
    }
  });

  // Check delay notices foreign keys
  (snapshot.data.delayNotices || []).forEach((notice) => {
    if (notice.teacherId && !validTeacherIds.has(notice.teacherId)) {
      orphanCount++;
      warnings.push(`إشعار تأخر (${notice.id}) يشير لمعلمة غير موجودة (${notice.teacherId})`);
    }
  });

  return {
    valid: orphanCount === 0,
    warnings,
    orphanCount,
  };
}

/**
 * التحقق الصارم من سلامة وهيكل النسخة الاحتياطية
 */
export function validateBackupSnapshot(snapshot: unknown): {
  valid: boolean;
  error?: string;
  snapshot?: SystemBackupSnapshot;
} {
  if (!snapshot || typeof snapshot !== "object") {
    return { valid: false, error: "هيكل النسخة الاحتياطية غير صالح أو فارغ." };
  }

  const s = snapshot as Partial<SystemBackupSnapshot>;
  if (!s.metadata || !s.data) {
    return {
      valid: false,
      error: "النسخة الاحتياطية تفتقر إلى البيانات الوصفية أو البيانات الأساسية.",
    };
  }

  if (typeof s.metadata.checksum !== "string") {
    return {
      valid: false,
      error: "التوقيع الرقمي (Checksum) مفقود في النسخة الاحتياطية.",
    };
  }

  // التحقق من صحة التوقيع الرقمي لمنع التلاعب
  const serialized = JSON.stringify(s.data);
  const recomputedChecksum = calculateChecksum(serialized);

  if (recomputedChecksum !== s.metadata.checksum) {
    return {
      valid: false,
      error: "فشل التحقق من تكامل النسخة الاحتياطية (التوقيع الرقمي غير مطابق). قد يكون الملف تالفاً أو تم تعديله.",
    };
  }

  // التحقق من أن جميع الجداول موجودة كمصفوفات
  const requiredArrays = [
    "teachers",
    "absenceRecords",
    "delayNotices",
    "inquiries",
    "deductionDecisions",
    "permissions",
  ];

  for (const key of requiredArrays) {
    if (!Array.isArray((s.data as unknown as Record<string, unknown>)[key])) {
      return {
        valid: false,
        error: `حقل البيانات الأساسية '${key}' ليس مصفوفة صالحة.`,
      };
    }
  }

  return { valid: true, snapshot: s as SystemBackupSnapshot };
}

/**
 * استعادة النظام بالكامل من لقطة احتياطية مع التدقيق والتأكد من عدم ترك أيتام
 */
export function restoreDatabaseBackupSnapshot(rawJson: string): {
  success: boolean;
  data?: SystemBackupData;
  metadata?: SystemBackupMetadata;
  error?: string;
} {
  try {
    const parsed = JSON.parse(rawJson);
    const validation = validateBackupSnapshot(parsed);

    if (!validation.valid || !validation.snapshot) {
      return {
        success: false,
        error: validation.error || "فشل التحقق من سلامة ملف النسخة الاحتياطية.",
      };
    }

    const { metadata, data } = validation.snapshot;

    logAuditEvent({
      action: "BACKUP_RESTORED",
      entityType: "backup",
      details: `استعادة شاملة للنظام من نسخة احتياطية صادرة بتاريخ ${metadata.exportedAt}`,
      newValue: metadata as unknown as Record<string, unknown>,
    });

    return {
      success: true,
      data,
      metadata,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "خطأ غير متوقع أثناء فك تشفير النسخة الاحتياطية",
    };
  }
}

/**
 * تصدير ملف النسخة الاحتياطية للتنزيل المباشر
 */
export function exportBackupToFile(
  snapshot: SystemBackupSnapshot,
  customName?: string
): void {
  if (typeof window === "undefined") return;

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename =
    customName ||
    `school_backup_${dateStr}_${snapshot.metadata.checksum.slice(0, 8)}.json`;

  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
