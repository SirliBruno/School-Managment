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
} from "./defaultApprovalAssets";
import { DEFAULT_ADMIN_NAME } from "@/context/AuthContext";

export interface SchoolSettingsData {
  id: string;
  schoolName: string;
  schoolLogo: string;
  principalName: string;
  vicePrincipalName: string;
  stampUrl: string;
  signatureUrl: string;
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
  signatureUrl: DEFAULT_SIGNATURE_BASE64,
  stampEnabled: true,
  signatureEnabled: true,
  updatedAt: new Date().toISOString(),
};

// الذاكرة المؤقتة أثناء التشغيل السريع
let inMemorySettings: SchoolSettingsData = { ...DEFAULT_SCHOOL_SETTINGS };

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
        schoolLogo: row.school_logo || inMemorySettings.schoolLogo,
        principalName: row.principal_name || inMemorySettings.principalName,
        vicePrincipalName: row.vice_principal_name || inMemorySettings.vicePrincipalName,
        stampUrl: row.stamp_url || inMemorySettings.stampUrl,
        signatureUrl: row.signature_url || inMemorySettings.signatureUrl,
        stampEnabled: row.stamp_url !== "" && row.stamp_url !== null,
        signatureEnabled: row.signature_url !== "" && row.signature_url !== null,
        updatedAt: row.updated_at || new Date().toISOString(),
      };
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
  broadcastSettingsChange(updated);

  if (isSupabaseConfigured() && supabase) {
    try {
      const payload: Partial<DbSchoolSettingsRow> = {
        id: "current",
        school_name: updated.schoolName,
        school_logo: updated.schoolLogo || null,
        principal_name: updated.principalName || null,
        vice_principal_name: updated.vicePrincipalName || null,
        stamp_url: updated.stampEnabled ? updated.stampUrl : "",
        signature_url: updated.signatureEnabled ? updated.signatureUrl : "",
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
 * رفع الأصول الإدارية (ختم / توقيع / شعار) إلى Supabase Storage bucket: school-assets
 */
export async function uploadSchoolAsset(
  file: File,
  type: "stamp" | "signature" | "logo"
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const fileExt = file.name.split(".").pop() || "png";
      const fileName = `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${fileExt}`;
      const filePath = `${type}s/${fileName}`;

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
