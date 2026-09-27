/**
 * إعدادات النطاق والروابط الديناميكية للمنصة (Domain & URL Configuration Engine)
 * تضمن عدم وجود أي Hardcoded Domain، وجاهزية النظام للانتقال لأي دومين رسمي مخصص
 */

import { MOE_LOGO_BASE64 } from "./moeLogo";

/**
 * استخراج النطاق الأساسي للنظام (Base URL) وفق الترتيب التالي:
 * 1. متغير البيئة NEXT_PUBLIC_APP_URL (الرسمي المخصص)
 * 2. متغير البيئة APP_URL
 * 3. المتصفح window.location.origin (ديناميكي في وقت التشغيل الحقيقي)
 * 4. متغير Vercel التلقائي NEXT_PUBLIC_VERCEL_URL
 * 5. النطاق المحلي الافتراضي أثناء التطوير http://localhost:3000
 */
export function getAppBaseUrl(): string {
  // 1. الدومين المخصص المعتمد في متغيرات البيئة
  const customEnvUrl =
    (typeof process !== "undefined" &&
      (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL)) ||
    "";

  if (customEnvUrl && customEnvUrl.trim() !== "") {
    return customEnvUrl.trim().replace(/\/+$/, "");
  }

  // 2. المتصفح المباشر (يكتشف الدومين الذي فتحه المستخدم آلياً)
  if (typeof window !== "undefined" && window.location && window.location.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }

  // 3. نطاق Vercel السحابي التلقائي
  const vercelUrl =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL
      : "";

  if (vercelUrl && vercelUrl.trim() !== "") {
    const cleanVercel = vercelUrl.trim().replace(/\/+$/, "");
    return cleanVercel.startsWith("http") ? cleanVercel : `https://${cleanVercel}`;
  }

  // 4. النطاق الافتراضي
  return "http://localhost:3000";
}

/**
 * توليد الرابط الإلكتروني لمساءلة الغياب الموجه للمعلمة
 */
export function getInquiryPublicUrl(
  token: string,
  options?: {
    endDate?: string;
    daysCount?: number;
  }
): string {
  const baseUrl = getAppBaseUrl();
  const cleanToken = encodeURIComponent(token.trim());

  let query = "";
  if (options?.endDate) {
    const days = options.daysCount || 2;
    query = `?end=${encodeURIComponent(options.endDate)}&days=${days}`;
  }

  return `${baseUrl}/inquiry/${cleanToken}${query}`;
}

/**
 * توليد الرابط العام لرد المعلمة على إشعار التأخر / الانصراف
 */
export function getDelayNoticePublicUrl(shareToken: string): string {
  const baseUrl = getAppBaseUrl();
  const cleanToken = encodeURIComponent(shareToken.trim());
  return `${baseUrl}/teacher-response/${cleanToken}`;
}

/**
 * الإعدادات الرسمية الموحدة للمدرسة (School Configuration Setup)
 * توفر المصدر الموحد للترويسات، النماذج، والتقارير الإدارية
 */
export interface SchoolConfiguration {
  schoolName: string;
  educationalAdministration: string;
  educationalStage: string;
  academicYear: string;
  semester: string;
  contact: {
    phone: string;
    email: string;
    city: string;
    region: string;
  };
  principalTitle: string;
  principalName?: string;
  vicePrincipalName: string;
  vicePrincipalRole: string;
  officialLogoBase64: string;
}

export const SCHOOL_CONFIG: SchoolConfiguration = {
  schoolName: "الثانوية الخامسة مسارات",
  educationalAdministration: "الإدارة العامة للتعليم بمنطقة مكة المكرمة",
  educationalStage: "المرحلة الثانوية (نظام المسارات)",
  academicYear: "1446-1447هـ",
  semester: "الفصل الدراسي الأول",
  contact: {
    phone: "011-4770000",
    email: "secondary5@moe.gov.sa",
    city: "مكة المكرمة",
    region: "منطقة مكة المكرمة",
  },
  principalTitle: "مديرة المدرسة",
  principalName: "فاطمة فلاتة",
  vicePrincipalName: "أحلام صالح الضبيبي",
  vicePrincipalRole: "وكيلة الشؤون التعليمية",
  officialLogoBase64: MOE_LOGO_BASE64,
};

