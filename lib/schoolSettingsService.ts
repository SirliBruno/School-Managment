/**
 * خدمة إدارة إعدادات المدرسة السحابية (Cloud School Settings Service)
 * المصدر الموحد للحقيقة لبيانات المنشأة، الختم، والتوقيع عبر Supabase
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { DbSchoolSettingsRow } from "@/types/database";
import { SCHOOL_CONFIG } from "@/lib/appConfig";
import {
  DEFAULT_STAMP_BASE64,
  DEFAULT_SIGNATURE_BASE64,
  DEFAULT_PRINCIPAL_SIGNATURE_BASE64,
  DEFAULT_VICE_PRINCIPAL_SIGNATURE_BASE64,
} from "./defaultApprovalAssets";
import { DEFAULT_ADMIN_NAME } from "@/context/AuthContext";
import { validateSecureUpload } from "@/lib/fileValidation";

export interface SchoolSettingsData {
  id: string;
  schoolName: string;
  schoolLogo: string;
  principalName: string;
  vicePrincipalName: string;
  stampUrl: string;
  signatureUrl: string;
  vicePrincipalSignatureUrl?: string;
  stampEnabled: boolean;
  signatureEnabled: boolean;
  updatedAt?: string;
}

export const DEFAULT_SCHOOL_SETTINGS: SchoolSettingsData = {
  id: "current",
  schoolName: SCHOOL_CONFIG.schoolName || "الثانوية الخامسة مسارات",
  schoolLogo: SCHOOL_CONFIG.officialLogoBase64 || "",
  principalName: SCHOOL_CONFIG.principalName || "فاطمة فلاتة",
  vicePrincipalName: SCHOOL_CONFIG.vicePrincipalName || "أحلام صالح الضبيبي",
  stampUrl: DEFAULT_STAMP_BASE64,
  signatureUrl: DEFAULT_PRINCIPAL_SIGNATURE_BASE64,
  vicePrincipalSignatureUrl: DEFAULT_VICE_PRINCIPAL_SIGNATURE_BASE64,
  stampEnabled: true,
  signatureEnabled: true,
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_PRINCIPAL_NAME = DEFAULT_SCHOOL_SETTINGS.principalName;
export const DEFAULT_VICE_PRINCIPAL_NAME = DEFAULT_SCHOOL_SETTINGS.vicePrincipalName;

export const SCHOOL_SETTINGS_CACHE_KEY = "school_settings_cache_v2";

function loadInitialSchoolSettings(): SchoolSettingsData {
  if (typeof localStorage !== "undefined") {
    try {
      const cached = localStorage.getItem(SCHOOL_SETTINGS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          ...DEFAULT_SCHOOL_SETTINGS,
          ...parsed,
        };
      }
    } catch {}
  }
  return { ...DEFAULT_SCHOOL_SETTINGS };
}

// الذاكرة المؤقتة أثناء التشغيل السريع مع الكاش المحلي الفوري
let inMemorySettings: SchoolSettingsData = loadInitialSchoolSettings();

const SETTINGS_CHANGE_EVENT = "school_settings_changed";

/**
 * الحصول على نسخة متزامنة فورية من الإعدادات
 */
export function getActiveSchoolSettings(): SchoolSettingsData {
  return inMemorySettings;
}

/**
 * جلب إعدادات المدرسة من سوبابيز (Single Source of Truth)
 */
export async function fetchSchoolSettingsFromCloud(): Promise<SchoolSettingsData> {
  if (!isSupabaseConfigured() || !supabase) {
    return inMemorySettings;
  }

  try {
    const { data, error } = await supabase
      .from("school_settings")
      .select("*")
      .eq("id", "current")
      .maybeSingle();

    if (error) {
      // إذا كان الجدول غير منشأ بعد في قاعدة البيانات، لا نوقف التطبيق
      if (error.code !== "PGRST205" && error.code !== "42P01") {
        console.warn("[SchoolSettings] تعذر جلب الإعدادات من السحابة:", error.message);
      }
      return inMemorySettings;
    }

    if (data) {
      const row = data as DbSchoolSettingsRow;
      inMemorySettings = {
        id: row.id || "current",
        schoolName: row.school_name || inMemorySettings.schoolName,
        schoolLogo: row.school_logo !== undefined && row.school_logo !== null ? row.school_logo : "",
        principalName: row.principal_name || inMemorySettings.principalName,
        vicePrincipalName: row.vice_principal_name || inMemorySettings.vicePrincipalName,
        stampUrl: row.stamp_url || inMemorySettings.stampUrl,
        signatureUrl: row.signature_url || inMemorySettings.signatureUrl,
        vicePrincipalSignatureUrl:
          (row as DbSchoolSettingsRow & { vice_principal_signature_url?: string | null })
            .vice_principal_signature_url ?? inMemorySettings.vicePrincipalSignatureUrl,
        stampEnabled: row.stamp_url !== "" && row.stamp_url !== null,
        signatureEnabled: row.signature_url !== "" && row.signature_url !== null,
        updatedAt: row.updated_at || new Date().toISOString(),
      };
      if (typeof localStorage !== "undefined") {
        try {
          localStorage.setItem(SCHOOL_SETTINGS_CACHE_KEY, JSON.stringify(inMemorySettings));
        } catch {}
      }
      broadcastSettingsChange(inMemorySettings);
    }
  } catch (err) {
    console.warn("[SchoolSettings] خطأ أثناء الاتصال بالسحابة:", err);
  }

  return inMemorySettings;
}

/**
 * تحديث إعدادات المدرسة في السحابة
 */
export async function updateSchoolSettingsInCloud(
  partial: Partial<SchoolSettingsData>
): Promise<SchoolSettingsData> {
  const updated: SchoolSettingsData = {
    ...inMemorySettings,
    ...partial,
    updatedAt: new Date().toISOString(),
  };

  inMemorySettings = updated;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(SCHOOL_SETTINGS_CACHE_KEY, JSON.stringify(updated));
    } catch {}
  }
  broadcastSettingsChange(updated);

  if (isSupabaseConfigured() && supabase) {
    try {
      const payload: Partial<DbSchoolSettingsRow> & { vice_principal_signature_url?: string | null } = {
        id: "current",
        school_name: updated.schoolName,
        school_logo: updated.schoolLogo !== undefined ? updated.schoolLogo : "",
        principal_name: updated.principalName || null,
        vice_principal_name: updated.vicePrincipalName || null,
        stamp_url: updated.stampEnabled ? updated.stampUrl : "",
        signature_url: updated.signatureEnabled ? updated.signatureUrl : "",
        vice_principal_signature_url: updated.signatureEnabled ? (updated.vicePrincipalSignatureUrl || "") : "",
        updated_at: updated.updatedAt,
      };

      const { error } = await supabase.from("school_settings").upsert(payload);
      if (error) {
        if (error.code !== "PGRST205" && error.code !== "42P01") {
          console.warn("[SchoolSettings] فشل تحديث الإعدادات في سوبابيز:", error.message);
        }
      }
    } catch (err) {
      console.warn("[SchoolSettings] خطأ اتصال أثناء تحديث الإعدادات:", err);
    }
  }

  return updated;
}

/**
 * رفع الأصول الإدارية (ختم / توقيع مديرة / توقيع وكيلة / شعار) إلى Supabase Storage bucket: school-assets
 */
export async function uploadSchoolAsset(
  file: File,
  type: "stamp" | "signature" | "principal_signature" | "vice_signature" | "vice_principal_signature" | "logo"
): Promise<{ success: boolean; url?: string; error?: string }> {
  const validation = await validateSecureUpload(file, {
    allowedExtensions: ["png", "jpg", "jpeg", "webp"],
    allowedMimes: ["image/png", "image/jpeg", "image/webp"],
    maxSizeBytes: 10 * 1024 * 1024,
  });

  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || "الملف المحدد غير صالح أمنياً.",
    };
  }

  const fileName = (file.name || "").toLowerCase();
  const fileExt = fileName.split(".").pop()?.toLowerCase() || "png";

  if (isSupabaseConfigured() && supabase) {
    try {
      const uniqueFileName = `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${fileExt}`;
      const filePath = `${type}s/${uniqueFileName}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("school-assets")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (!uploadErr && uploadData) {
        const { data: urlData } = supabase.storage
          .from("school-assets")
          .getPublicUrl(filePath);

        if (urlData?.publicUrl) {
          return { success: true, url: urlData.publicUrl };
        }
      } else if (uploadErr) {
        console.warn(`[Storage] تنبيه أثناء رفع ${type} إلى school-assets:`, uploadErr.message);
      }
    } catch (e) {
      console.warn(`[Storage] تعذر الرفع المباشر لـ ${type}:`, e);
    }
  }

  // في حال تعذر التخزين السحابي المؤقت، نقرأ كـ Data URL كحل بديل آمن
  if (typeof FileReader !== "undefined") {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        resolve({ success: true, url: base64 });
      };
      reader.onerror = () => {
        resolve({ success: false, error: "تعذر قراءة ملف الصورة" });
      };
      reader.readAsDataURL(file);
    });
  } else {
    try {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const mime = file.type || "image/png";
      return { success: true, url: `data:${mime};base64,${base64}` };
    } catch {
      return { success: false, error: "تعذر قراءة ملف الصورة" };
    }
  }
}

function broadcastSettingsChange(settings: SchoolSettingsData) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(SETTINGS_CHANGE_EVENT, { detail: settings })
    );
  }
}

/**
 * الاستماع لتغييرات إعدادات المدرسة في وقت التشغيل الحقيقي
 */
export function onSchoolSettingsChanged(
  handler: (settings: SchoolSettingsData) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const listener = (event: Event) => {
    const customEvt = event as CustomEvent<SchoolSettingsData>;
    if (customEvt.detail) {
      handler(customEvt.detail);
    }
  };

  window.addEventListener(SETTINGS_CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener(SETTINGS_CHANGE_EVENT, listener);
  };
}
