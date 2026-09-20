/**
 * مساعد معالجة أرقام الواتساب وتوليد رسائل المساءلة الرسمية
 */

/**
 * تحويل رقم الجوال إلى الصيغة الدولية المعتمدة للواتساب (السعودية +966)
 * يقبل: 05XXXXXXXX أو 5XXXXXXXX أو 9665XXXXXXXX
 */
export function formatSaudiMobile(rawMobile: string | undefined | null): string {
  if (!rawMobile) return "";
  
  // تنظيف الرقم من أي مسافات أو رموز غير رقمية
  let cleaned = String(rawMobile).replace(/[^\d]/g, "");

  // إذا كان يبدأ بصفرين دوليين 00966
  if (cleaned.startsWith("00966")) {
    cleaned = cleaned.slice(2);
  }

  // إذا كان يبدأ بـ 05 (الرقم المحلي الشائع)
  if (cleaned.startsWith("05") && cleaned.length === 10) {
    return "966" + cleaned.slice(1);
  }

  // إذا كان يبدأ بـ 5 (9 أرقام بدون الصفر)
  if (cleaned.startsWith("5") && cleaned.length === 9) {
    return "966" + cleaned;
  }

  // إذا كان يبدأ بـ 966
  if (cleaned.startsWith("966")) {
    return cleaned;
  }

  return cleaned;
}

/**
 * معالجة وتنسيق رقم الجوال أثناء الكتابة واللصق
 * يحول أي رقم محلي أو دولي تلقائياً إلى صيغة 966XXXXXXXX
 */
export function normalizeSaudiMobileInput(raw: string): string {
  if (!raw) return "";

  // تنظيف أي رموز أو مسافات
  let digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";

  // إزالة الصفرين الدوليين 00966
  if (digits.startsWith("00966")) {
    digits = digits.slice(2);
  }

  // عند كتابة أو لصق 05... يتم تحويلها تلقائياً إلى 9665...
  if (digits.startsWith("05")) {
    digits = "9665" + digits.slice(2);
  } else if (digits.startsWith("5") && !digits.startsWith("966")) {
    // عند كتابة أو لصق 5... يتم تحويلها إلى 9665...
    digits = "9665" + digits.slice(1);
  } else if (digits.startsWith("0") && digits.length === 1) {
    return "0";
  }

  // حد أقصى 12 رقماً (صيغة 9665XXXXXXXX)
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
  inquiryUrl: string
): string {
  return (
    `المكرمة الأستاذة / ${teacherName.trim()} المحترمة\n` +
    `السلام عليكم ورحمة الله وبركاته،،\n\n` +
    `نأمل منكِ التكرم بتقديم الإفادة عن سبب الغياب ليوم (${absenceDate}) مع إرفاق التقرير الطبي أو ما يعادله عبر الرابط الإلكتروني التالي:\n` +
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


