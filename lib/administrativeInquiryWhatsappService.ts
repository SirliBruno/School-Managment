import { formatSaudiMobile } from "./whatsapp";
import { AdministrativeInquiry } from "@/types/teacher";

export interface AdministrativeInquiryWhatsAppParams {
  teacherName?: string;
  inquiryType: string;
  customType?: string;
  incidentDate: string;
  portalUrl?: string;
  token?: string;
  mobile?: string;
}

/**
 * توليد نص رسالة المساءلة الإدارية الرسمية الموجهة للمعلمة عبر الواتساب
 * طبقاً لنص النموذج الإداري المعتمد:
 * السلام عليكم ورحمة الله وبركاته
 *
 * الأستاذة / {اسم المعلمة}
 *
 * نفيدكم بأنه تم إنشاء مساءلة إدارية بخصوص:
 * {نوع المساءلة}
 *
 * بتاريخ:
 * {التاريخ}
 *
 * نأمل الدخول على الرابط التالي لإضافة الإفادة:
 * {الرابط}
 *
 * شاكرين تعاونكم.
 */
export function generateAdministrativeInquiryWhatsAppMessage(
  paramsOrInquiry: AdministrativeInquiryWhatsAppParams | AdministrativeInquiry,
  fallbackBaseUrl?: string
): string {
  // Check if passed AdministrativeInquiry entity
  if ("id" in paramsOrInquiry) {
    const inquiry = paramsOrInquiry;
    const baseUrl =
      fallbackBaseUrl ||
      (typeof window !== "undefined" ? window.location.origin : "");
    const portalUrl = `${baseUrl.replace(/\/+$/, "")}/administrative-inquiry/${inquiry.token}`;
    const displayType =
      inquiry.inquiryType === "أخرى" && (inquiry.customType || inquiry.customViolationType)
        ? (inquiry.customType || inquiry.customViolationType)
        : inquiry.inquiryType ||
          inquiry.violationTypeArabic ||
          inquiry.customViolationType ||
          inquiry.customType ||
          inquiry.violationType ||
          "مساءلة إدارية";

    return (
      `السلام عليكم ورحمة الله وبركاته\n\n` +
      `الأستاذة / ${(inquiry.teacherName || "").trim()}\n\n` +
      `نفيدكم بأنه تم إنشاء مساءلة إدارية بخصوص:\n` +
      `${displayType}\n\n` +
      `بتاريخ:\n` +
      `${inquiry.incidentDate}\n\n` +
      `نأمل الدخول على الرابط التالي لإضافة الإفادة:\n` +
      `${portalUrl}\n\n` +
      `شاكرين تعاونكم.`
    );
  }

  // Passed AdministrativeInquiryWhatsAppParams
  const params = paramsOrInquiry;
  const { teacherName, inquiryType, customType, incidentDate } = params;
  const baseUrl =
    fallbackBaseUrl ||
    (typeof window !== "undefined" ? window.location.origin : "");
  const portalUrl =
    params.portalUrl ||
    `${baseUrl.replace(/\/+$/, "")}/administrative-inquiry/${params.token || "TOKEN"}`;

  const displayType =
    inquiryType === "أخرى" && customType?.trim()
      ? `أخرى (${customType.trim()})`
      : inquiryType;

  return (
    `السلام عليكم ورحمة الله وبركاته\n\n` +
    `الأستاذة / ${(teacherName || "").trim()}\n\n` +
    `نفيدكم بأنه تم إنشاء مساءلة إدارية بخصوص:\n` +
    `${displayType}\n\n` +
    `بتاريخ:\n` +
    `${incidentDate}\n\n` +
    `نأمل الدخول على الرابط التالي لإضافة الإفادة:\n` +
    `${portalUrl}\n\n` +
    `شاكرين تعاونكم.`
  );
}

/**
 * توليد رابط محادثة واتساب المباشرة لإرسال المساءلة الإدارية للمعلمة
 */
export function getAdministrativeInquiryWhatsAppUrl(
  params: AdministrativeInquiryWhatsAppParams
): string {
  const message = generateAdministrativeInquiryWhatsAppMessage(params);
  const formattedMobile = formatSaudiMobile(params.mobile);
  const encodedText = encodeURIComponent(message);

  if (!formattedMobile) {
    return `https://wa.me/?text=${encodedText}`;
  }

  return `https://wa.me/${formattedMobile}?text=${encodedText}`;
}

/**
 * بناء رابط واتساب المباشر من كائن المساءلة الإدارية ورقم الجوال
 */
export function buildAdministrativeInquiryWhatsAppUrl(
  inquiry: AdministrativeInquiry,
  mobile?: string,
  baseUrl?: string
): string {
  const message = generateAdministrativeInquiryWhatsAppMessage(inquiry, baseUrl);
  const targetMobile = mobile || inquiry.teacherPhone;
  const formattedMobile = formatSaudiMobile(targetMobile);
  const encodedText = encodeURIComponent(message);

  if (!formattedMobile) {
    return `https://wa.me/?text=${encodedText}`;
  }

  return `https://wa.me/${formattedMobile}?text=${encodedText}`;
}

/**
 * فتح محادثة واتساب مباشرة في نافذة جديدة
 */
export function openAdministrativeInquiryWhatsApp(
  inquiry: AdministrativeInquiry,
  mobile?: string,
  baseUrl?: string
): void {
  const url = buildAdministrativeInquiryWhatsAppUrl(inquiry, mobile, baseUrl);
  if (typeof window !== "undefined") {
    window.open(url, "_blank");
  }
}
