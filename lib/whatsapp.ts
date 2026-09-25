import { normalizeArabicDigits, normalizeSaudiMobile } from "./teacherDeduplication";

/**
 * تحويل رقم الجوال إلى الصيغة الدولية المعتمدة للواتساب (السعودية +966)
 * يقبل: 05XXXXXXXX أو 5XXXXXXXX أو 9665XXXXXXXX والأرقام العربية
 */
export function formatSaudiMobile(rawMobile: string | undefined | null): string {
  if (!rawMobile) return "";
  return normalizeSaudiMobile(rawMobile);
}

/**
 * معالجة وتنسيق رقم الجوال أثناء الكتابة واللصق
 * يحول أي رقم محلي أو دولي تلقائياً إلى صيغة 966XXXXXXXX
 */
export function normalizeSaudiMobileInput(raw: string): string {
  if (!raw) return "";
  const withAscii = normalizeArabicDigits(raw);
  let digits = withAscii.replace(/[^\d]/g, "");
  if (!digits) return "";

  if (digits.startsWith("00966")) {
    digits = digits.slice(2);
  }
  if (digits.startsWith("05")) {
    digits = "9665" + digits.slice(2);
  } else if (digits.startsWith("5") && !digits.startsWith("966")) {
    digits = "9665" + digits.slice(1);
  } else if (digits.startsWith("0") && digits.length === 1) {
    return "0";
  }

  if (digits.startsWith("966") && digits.length > 12) {
    digits = digits.slice(0, 12);
  }

  return digits;
}

/**
 * توليد نص الرسالة الرسمية الموجهة للمعلمة
 */
export function generateInquiryMessage(
  teacherName: string,
  absenceDate: string,
  inquiryUrl: string,
  absenceEndDate?: string,
  daysCount?: number
): string {
  let periodText = `ليوم (${absenceDate})`;
  if (absenceEndDate && absenceEndDate !== absenceDate) {
    const count = daysCount || 2;
    const daysLabel = count === 2 ? "يومين" : count <= 10 ? `${count} أيام` : `${count} يوماً`;
    periodText = `للفترة من (${absenceDate}) إلى (${absenceEndDate}) ولمدة (${daysLabel})`;
  }

  return (
    `المكرمة الأستاذة / ${teacherName.trim()} المحترمة\n` +
    `السلام عليكم ورحمة الله وبركاته،،\n\n` +
    `نأمل منكِ التكرم بتقديم الإفادة عن سبب الغياب ${periodText} مع إرفاق التقرير الطبي أو ما يعادله عبر الرابط الإلكتروني التالي:\n` +
    `${inquiryUrl}\n\n` +
    `*ملاحظة: الرابط صالح لمدة أسبوع من تاريخه.*\n` +
    `شاكرين ومقدرين حسن تعاونك.\n` +
    `— إدارة المدرسة`
  );
}

/**
 * توليد نص رسالة تنبيه التأخر / الانصراف الرسمية عبر الواتساب
 */
export function generateDelayNoticeWhatsAppMessage(
  teacherName: string,
  noticeDate: string,
  responseUrl: string
): string {
  return (
    `السلام عليكم ورحمة الله وبركاته\n` +
    `الأستاذة / ${teacherName.trim()}\n` +
    `تم إصدار تنبيه تأخر/انصراف بحقكم بتاريخ ${noticeDate}.\n` +
    `يرجى الدخول على الرابط التالي وإدخال الأسباب المطلوبة:\n` +
    `${responseUrl}\n\n` +
    `مع تحيات إدارة المدرسة`
  );
}

/**
 * توليد رابط فتح محادثة الواتساب المباشرة
 */
export function getWhatsAppDirectUrl(mobile: string, message: string): string {
  const formattedPhone = formatSaudiMobile(mobile);
  const encodedText = encodeURIComponent(message);
  
  if (!formattedPhone) {
    // في حال عدم وجود رقم يتم فتح الواتساب بنص الرسالة فقط ليتم اختيار جهة الاتصال
    return `https://wa.me/?text=${encodedText}`;
  }

  return `https://wa.me/${formattedPhone}?text=${encodedText}`;
}


