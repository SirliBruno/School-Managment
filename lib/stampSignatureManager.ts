/**
 * محرك ونظام إدارة ختم المدرسة وتوقيع الاعتماد الإداري
 * (School Stamp & Signature Management System)
 * يربط الأختام والتواقيع تلقائياً بالنماذج الرسمية التي تتطلب اعتماداً نظامياً
 */

import {
  DEFAULT_STAMP_BASE64,
  DEFAULT_SIGNATURE_BASE64,
} from "./defaultApprovalAssets";
import { SCHOOL_CONFIG } from "./appConfig";
import { DEFAULT_ADMIN_NAME, DEFAULT_ADMIN_ROLE_LABEL } from "@/context/AuthContext";
import { logAuditEvent } from "./auditLogger";

export const APPROVAL_SETTINGS_STORAGE_KEY = "school_settings_approval_v1";

export interface SchoolApprovalSettings {
  schoolStampUrl: string;
  principalSignatureUrl: string;
  stampEnabled: boolean;
  signatureEnabled: boolean;
  updatedBy: string;
  updatedAt: string;
}

export const DEFAULT_APPROVAL_SETTINGS: SchoolApprovalSettings = {
  schoolStampUrl: DEFAULT_STAMP_BASE64,
  principalSignatureUrl: DEFAULT_SIGNATURE_BASE64,
  stampEnabled: true,
  signatureEnabled: true,
  updatedBy: DEFAULT_ADMIN_NAME,
  updatedAt: "2026-09-27T00:00:00.000Z",
};

// In-memory cache for SSR, Node, and test environments
let inMemorySettings: SchoolApprovalSettings = { ...DEFAULT_APPROVAL_SETTINGS };

/**
 * جلب إعدادات الختم والتوقيع الحالية
 */
export function getSchoolApprovalSettings(): SchoolApprovalSettings {
  if (typeof window === "undefined") {
    return inMemorySettings;
  }

  try {
    const raw = localStorage.getItem(APPROVAL_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return inMemorySettings;
    }
    const parsed = JSON.parse(raw);
    return {
      schoolStampUrl: typeof parsed.schoolStampUrl === "string" ? parsed.schoolStampUrl : DEFAULT_STAMP_BASE64,
      principalSignatureUrl: typeof parsed.principalSignatureUrl === "string" ? parsed.principalSignatureUrl : DEFAULT_SIGNATURE_BASE64,
      stampEnabled: parsed.stampEnabled !== false,
      signatureEnabled: parsed.signatureEnabled !== false,
      updatedBy: parsed.updatedBy || DEFAULT_ADMIN_NAME,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch (err) {
    console.warn("تعذر قراءة إعدادات الختم والتوقيع، تم استخدام الإعدادات الافتراضية:", err);
    return inMemorySettings;
  }
}

/**
 * تحديث إعدادات الختم والتوقيع وحفظها
 */
export function updateSchoolApprovalSettings(
  partial: Partial<SchoolApprovalSettings>,
  adminName: string = DEFAULT_ADMIN_NAME
): SchoolApprovalSettings {
  const current = getSchoolApprovalSettings();
  const updated: SchoolApprovalSettings = {
    ...current,
    ...partial,
    updatedBy: adminName,
    updatedAt: new Date().toISOString(),
  };

  inMemorySettings = updated;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(APPROVAL_SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("تعذر تخزين إعدادات الختم والتوقيع محلياً:", e);
    }
  }

  logAuditEvent({
    action: "APPROVAL_ASSETS_UPDATED",
    entityType: "settings",
    userName: adminName,
    userRole: DEFAULT_ADMIN_ROLE_LABEL,
    details: `تحديث بيانات الختم والتوقيع الإداري (ختم: ${updated.stampEnabled ? "مفعل" : "معطل"}, توقيع: ${updated.signatureEnabled ? "مفعل" : "معطل"})`,
    newValue: {
      stampEnabled: updated.stampEnabled,
      signatureEnabled: updated.signatureEnabled,
      hasStamp: !!updated.schoolStampUrl,
      hasSignature: !!updated.principalSignatureUrl,
    },
  });

  return updated;
}

/**
 * استعادة الأصول الافتراضية للختم والتوقيع من ملفات المشروع الرسمية
 */
export function resetSchoolApprovalSettings(adminName: string = DEFAULT_ADMIN_NAME): SchoolApprovalSettings {
  return updateSchoolApprovalSettings(
    {
      schoolStampUrl: DEFAULT_STAMP_BASE64,
      principalSignatureUrl: DEFAULT_SIGNATURE_BASE64,
      stampEnabled: true,
      signatureEnabled: true,
    },
    adminName
  );
}

/**
 * حذف الختم الحالي
 */
export function deleteSchoolStamp(adminName: string = DEFAULT_ADMIN_NAME): SchoolApprovalSettings {
  return updateSchoolApprovalSettings(
    {
      schoolStampUrl: "",
      stampEnabled: false,
    },
    adminName
  );
}

/**
 * حذف التوقيع الحالي
 */
export function deletePrincipalSignature(adminName: string = DEFAULT_ADMIN_NAME): SchoolApprovalSettings {
  return updateSchoolApprovalSettings(
    {
      principalSignatureUrl: "",
      signatureEnabled: false,
    },
    adminName
  );
}

export interface OfficialApprovalFooterOptions {
  schoolName?: string;
  officialTitle?: string;
  officialName?: string;
  secondaryTitle?: string;
  secondaryName?: string;
  date?: string;
  customStampUrl?: string;
  customSignatureUrl?: string;
  forceShowStamp?: boolean;
  forceShowSignature?: boolean;
  layout?: "3boxes" | "2boxes" | "compact";
}

/**
 * إنشاء عنصر كود HTML موحد لاعتماد النماذج والتقارير (OfficialApprovalFooter)
 * يضمن تناسق الأبعاد، الاتجاه RTL، ومحاذاة الختم والتوقيع بدقة
 */
export function renderOfficialApprovalFooterHtml(options: OfficialApprovalFooterOptions = {}): string {
  const settings = getSchoolApprovalSettings();

  const schoolName = options.schoolName || SCHOOL_CONFIG.schoolName;
  const officialTitle = options.officialTitle || DEFAULT_ADMIN_ROLE_LABEL; // وكيلة المدرسة
  const officialName = options.officialName || DEFAULT_ADMIN_NAME; // أحلام صالح الضبيبي
  const secondaryTitle = options.secondaryTitle || "مديرة المدرسة";
  const secondaryName = options.secondaryName || "فاطمة فلاتة";
  const dateStr = options.date || new Date().toLocaleDateString("ar-SA");

  const showStamp =
    options.forceShowStamp !== undefined
      ? options.forceShowStamp
      : settings.stampEnabled && !!(options.customStampUrl || settings.schoolStampUrl);

  const showSignature =
    options.forceShowSignature !== undefined
      ? options.forceShowSignature
      : settings.signatureEnabled && !!(options.customSignatureUrl || settings.principalSignatureUrl);

  const stampSrc = options.customStampUrl || settings.schoolStampUrl || DEFAULT_STAMP_BASE64;
  const sigSrc = options.customSignatureUrl || settings.principalSignatureUrl || DEFAULT_SIGNATURE_BASE64;

  const stampElementHtml = showStamp && stampSrc
    ? `<img src="${stampSrc}" alt="ختم المدرسة الرسمي" style="max-height: 110px; max-width: 110px; width: 105px; height: 105px; object-fit: contain; filter: drop-shadow(0 1px 3px rgba(0,0,0,0.18)); display: block; margin: 0 auto;" />`
    : `<div style="font-size: 8pt; color: #94a3b8; border: 1.5px dashed #cbd5e1; border-radius: 50%; width: 90px; height: 90px; margin: 0 auto; display: flex; align-items: center; justify-content: center; text-align: center;">الختم الرسمي للمنشأة</div>`;

  const signatureElementHtml = showSignature && sigSrc
    ? `<img src="${sigSrc}" alt="توقيع الاعتماد" style="max-height: 48px; max-width: 140px; width: auto; height: auto; object-fit: contain; display: block; margin: 2px auto 0 auto;" />`
    : `<div style="height: 38px; display: flex; align-items: flex-end; justify-content: center; color: #94a3b8; font-size: 8pt; letter-spacing: 1px;">...............................</div>`;

  if (options.layout === "2boxes") {
    return `
<div class="approval-footer-container" style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 18px; padding-top: 14px; border-top: 1.5px solid #0f766e; direction: rtl; text-align: center; font-family: 'Cairo', sans-serif;">
  <div style="flex: 1; padding: 0 10px;">
    <div style="font-size: 9.5pt; font-weight: 800; color: #0f766e; margin-bottom: 4px;">الاعتماد الإداري: ${officialTitle}</div>
    <div style="font-size: 10pt; font-weight: 800; color: #0f172a;">${officialName}</div>
    <div style="min-height: 48px; margin: 4px 0; display: flex; align-items: center; justify-content: center;">
      ${signatureElementHtml}
    </div>
    <div style="font-size: 8pt; color: #64748b;">التاريخ: ${dateStr} م</div>
  </div>

  <div style="width: 150px; text-align: center; padding: 0 10px;">
    <div style="font-size: 9.5pt; font-weight: 800; color: #0f766e; margin-bottom: 6px;">الختم الرسمي</div>
    <div style="display: flex; align-items: center; justify-content: center; min-height: 110px;">
      ${stampElementHtml}
    </div>
  </div>
</div>`;
  }

  // Standard 3 boxes layout (Official Reports, Absences, Permissions, etc.)
  return `
<div class="approval-footer-container" style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 16px; padding-top: 12px; border-top: 1.5px solid #0f766e; direction: rtl; text-align: center; font-family: 'Cairo', sans-serif;">
  <!-- Vice Principal / Executor -->
  <div style="flex: 1; padding: 0 8px;">
    <div style="font-size: 9.5pt; font-weight: 800; color: #0f766e; margin-bottom: 3px;">${officialTitle}</div>
    <div style="font-size: 9.5pt; font-weight: 800; color: #0f172a;">${officialName}</div>
    <div style="min-height: 48px; margin: 4px 0; display: flex; align-items: center; justify-content: center;">
      <div style="height: 38px; display: flex; align-items: flex-end; justify-content: center; color: #94a3b8; font-size: 8pt; letter-spacing: 1px;">...............................</div>
    </div>
    <div style="font-size: 8pt; color: #64748b;">التاريخ: ${dateStr} م</div>
  </div>

  <!-- Official School Stamp -->
  <div style="width: 150px; text-align: center; padding: 0 8px;">
    <div style="font-size: 9.5pt; font-weight: 800; color: #0f766e; margin-bottom: 4px;">الختم الرسمي للمدرسة</div>
    <div style="display: flex; align-items: center; justify-content: center; min-height: 110px;">
      ${stampElementHtml}
    </div>
  </div>

  <!-- School Principal -->
  <div style="flex: 1; padding: 0 8px;">
    <div style="font-size: 9.5pt; font-weight: 800; color: #0f766e; margin-bottom: 3px;">${secondaryTitle}</div>
    <div style="font-size: 9.5pt; font-weight: 800; color: #0f172a;">${secondaryName}</div>
    <div style="min-height: 48px; margin: 4px 0; display: flex; align-items: center; justify-content: center;">
      ${signatureElementHtml}
    </div>
    <div style="font-size: 8pt; color: #64748b;">اعتماد المنشأة: ${schoolName}</div>
  </div>
</div>`;
}
