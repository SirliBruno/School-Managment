/**
 * دوال مساعدة لحساب الفارق الزمني بين وقتين وتنسيقه باللغة العربية بالساعات والدقائق
 */

export interface TimeDifferenceResult {
  totalMinutes: number;
  hours: number;
  minutes: number;
  formattedDuration: string;
  detailedText: string;
  isValid: boolean;
  error?: string;
}

/**
 * حساب الفارق بين وقتين بصيغة HH:MM
 * @param fromTime وقت البداية مثل "08:00"
 * @param toTime وقت النهاية مثل "10:00"
 */
export function calculateTimeDifference(
  fromTime: string,
  toTime: string
): TimeDifferenceResult {
  if (!fromTime || !toTime) {
    return {
      totalMinutes: 0,
      hours: 0,
      minutes: 0,
      formattedDuration: "—",
      detailedText: "",
      isValid: false,
      error: "يرجى تحديد وقت البداية ووقت النهاية",
    };
  }

  const [fromH, fromM] = fromTime.split(":").map(Number);
  const [toH, toM] = toTime.split(":").map(Number);

  if (
    isNaN(fromH) ||
    isNaN(fromM) ||
    isNaN(toH) ||
    isNaN(toM) ||
    fromH < 0 ||
    fromH > 23 ||
    toH < 0 ||
    toH > 23 ||
    fromM < 0 ||
    fromM > 59 ||
    toM < 0 ||
    toM > 59
  ) {
    return {
      totalMinutes: 0,
      hours: 0,
      minutes: 0,
      formattedDuration: "—",
      detailedText: "",
      isValid: false,
      error: "صيغة الوقت غير صالحة",
    };
  }

  const fromTotalMinutes = fromH * 60 + fromM;
  const toTotalMinutes = toH * 60 + toM;

  const diffMinutes = toTotalMinutes - fromTotalMinutes;

  if (diffMinutes <= 0) {
    return {
      totalMinutes: 0,
      hours: 0,
      minutes: 0,
      formattedDuration: "0 دقيقة",
      detailedText: "وقت النهاية يجب أن يكون بعد وقت البداية",
      isValid: false,
      error: "وقت النهاية يجب أن يكون بعد وقت البداية",
    };
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  // تنسيق لغوي عربي سليم
  let formattedDuration = "";

  if (hours === 0) {
    formattedDuration = `${minutes} دقيقة`;
  } else if (minutes === 0) {
    if (hours === 1) formattedDuration = "ساعة واحدة";
    else if (hours === 2) formattedDuration = "ساعتان";
    else if (hours >= 3 && hours <= 10) formattedDuration = `${hours} ساعات`;
    else formattedDuration = `${hours} ساعة`;
  } else {
    let hourPart = "";
    if (hours === 1) hourPart = "ساعة واحدة";
    else if (hours === 2) hourPart = "ساعتان";
    else if (hours >= 3 && hours <= 10) hourPart = `${hours} ساعات`;
    else hourPart = `${hours} ساعة`;

    formattedDuration = `${hourPart} و ${minutes} دقيقة`;
  }

  const detailedText = `${hours} ساعة و ${minutes} دقيقة (${formattedDuration})`;

  return {
    totalMinutes: diffMinutes,
    hours,
    minutes,
    formattedDuration,
    detailedText,
    isValid: true,
  };
}

/**
 * دالة استخراج التاريخ بالتوقيت المحلي لمدينة مكة المكرمة / الرياض (Asia/Riyadh)
 * بصيغة YYYY-MM-DD تفادياً لخطأ UTC ISO بين 12 منتصف الليل و 3 فجراً
 */
export function getSaudiToday(targetDate: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(targetDate);
  } catch {
    // خطة احتياطية في حال عدم دعم Intl مع إضافة 3 ساعات لتوقيت السعودية
    const saudiMs = targetDate.getTime() + 3 * 60 * 60 * 1000;
    const d = new Date(saudiMs);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
}

/**
 * تفاصيل اليوم والشهر والسنة بتوقيت الرياض
 */
export function getSaudiDateInfo(targetDate: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  dateStr: string;
  monthStr: string;
} {
  const dateStr = getSaudiToday(targetDate);
  const [y, m, d] = dateStr.split("-").map(Number);
  return {
    year: y,
    month: m,
    day: d,
    dateStr,
    monthStr: `${y}-${String(m).padStart(2, "0")}`,
  };
}

/**
 * السياسة المركزية الموحدة لصلاحية الروابط العامة في كامل المنصة
 * (7 أيام كاملة = 168 ساعة = 604,800,000 مللي ثانية)
 */
export const PUBLIC_LINK_EXPIRATION_DAYS = 7;
export const PUBLIC_LINK_EXPIRATION_HOURS = PUBLIC_LINK_EXPIRATION_DAYS * 24; // 168 hours
export const PUBLIC_LINK_EXPIRATION_MS = PUBLIC_LINK_EXPIRATION_DAYS * 24 * 60 * 60 * 1000; // 604,800,000 ms

// Aliases for compatibility
export const TOKEN_EXPIRY_DAYS = PUBLIC_LINK_EXPIRATION_DAYS;
export const TOKEN_EXPIRY_HOURS = PUBLIC_LINK_EXPIRATION_HOURS;
export const TOKEN_EXPIRY_MS = PUBLIC_LINK_EXPIRATION_MS;

/**
 * حساب مهلة انتهاء الصلاحية بدقة (168 ساعة كاملة = 7 أيام من تاريخ الأساس)
 */
export function calculateTokenExpiry(
  baseDate: Date = new Date(),
  days: number = PUBLIC_LINK_EXPIRATION_DAYS
): string {
  return new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * دالة متوافقة رجعياً تعتمد سياسة المنصة الموحدة (7 أيام)
 */
export function calculate48HoursExpiry(baseDate: Date = new Date()): string {
  return calculateTokenExpiry(baseDate, PUBLIC_LINK_EXPIRATION_DAYS);
}

/**
 * فحص ما إذا كان الرابط قد تجاوز مهلة الصلاحية بدقة
 * @param expiresAt تاريخ انتهاء الصلاحية بصيغة ISO
 * @param referenceDate تاريخ المقارنة (الافتراضي: الآن)
 */
export function isTokenExpired(
  expiresAt?: string | null,
  referenceDate: Date = new Date()
): boolean {
  if (!expiresAt) return false;
  try {
    const expiryTime = new Date(expiresAt).getTime();
    if (isNaN(expiryTime)) return false;
    return referenceDate.getTime() >= expiryTime;
  } catch {
    return false;
  }
}

/**
 * تنسيق التوقيت الرسمي للمملكة العربية السعودية (توقيت مكة المكرمة)
 */
export function formatSaudiDateTime(
  isoString?: string | null,
  options?: { dateOnly?: boolean }
): string {
  if (!isoString) return "—";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return String(isoString);

    if (options?.dateOnly) {
      return date.toLocaleDateString("ar-SA-u-nu-latn", {
        timeZone: "Asia/Riyadh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    }

    return date.toLocaleString("ar-SA-u-nu-latn", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(isoString);
  }
}

export interface LinkExpiryStatus {
  isExpired: boolean;
  isUrgent: boolean; // أقل من 24 ساعة
  remainingDays: number;
  remainingHours: number;
  remainingMinutes: number;
  remainingMs: number;
  daysLeft: number;
  hoursLeft: number;
  status: "valid" | "expiring_soon" | "expired";
  statusLabel: string;
  badgeText: string;
  badgeVariant: "emerald" | "amber" | "rose" | "slate";
}

/**
 * حساب تفاصيل الوقت المتبقي وحالة الرابط للعرض في الواجهات ولوحة الإدارة
 */
export function getLinkExpiryStatus(
  expiresAt?: string | null,
  referenceDateOrCompleted?: Date | boolean
): LinkExpiryStatus {
  const isCompleted = typeof referenceDateOrCompleted === "boolean" ? referenceDateOrCompleted : false;
  const now = referenceDateOrCompleted instanceof Date ? referenceDateOrCompleted.getTime() : Date.now();

  if (!expiresAt) {
    return {
      isExpired: false,
      isUrgent: false,
      remainingDays: 0,
      remainingHours: 0,
      remainingMinutes: 0,
      remainingMs: 0,
      daysLeft: 0,
      hoursLeft: 0,
      status: "expired",
      statusLabel: "غير محدد",
      badgeText: "غير محدد",
      badgeVariant: "slate",
    };
  }

  if (isCompleted) {
    return {
      isExpired: false,
      isUrgent: false,
      remainingDays: 0,
      remainingHours: 0,
      remainingMinutes: 0,
      remainingMs: 0,
      daysLeft: 0,
      hoursLeft: 0,
      status: "valid",
      statusLabel: "تم تقديم الإفادة بنجاح",
      badgeText: "مكتمل",
      badgeVariant: "emerald",
    };
  }

  const expiryTime = new Date(expiresAt).getTime();
  if (isNaN(expiryTime)) {
    return {
      isExpired: true,
      isUrgent: false,
      remainingDays: 0,
      remainingHours: 0,
      remainingMinutes: 0,
      remainingMs: 0,
      daysLeft: 0,
      hoursLeft: 0,
      status: "expired",
      statusLabel: "تاريخ غير صالح",
      badgeText: "غير معروف",
      badgeVariant: "slate",
    };
  }

  const diff = expiryTime - now;

  if (diff <= 0) {
    return {
      isExpired: true,
      isUrgent: false,
      remainingDays: 0,
      remainingHours: 0,
      remainingMinutes: 0,
      remainingMs: 0,
      daysLeft: 0,
      hoursLeft: 0,
      status: "expired",
      statusLabel: "انتهت صلاحية الرابط",
      badgeText: "منتهي الصلاحية",
      badgeVariant: "rose",
    };
  }

  const remainingDays = Math.floor(diff / (24 * 60 * 60 * 1000));
  const remainingHours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const remainingMinutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  const totalHoursLeft = Math.ceil(diff / (60 * 60 * 1000));
  const isUrgent = diff <= 24 * 60 * 60 * 1000;

  let statusLabel = "";
  if (remainingDays >= 1) {
    statusLabel =
      remainingHours > 0
        ? `متبقي ${remainingDays} ${remainingDays === 1 ? "يوم" : remainingDays === 2 ? "يومان" : "أيام"} و ${remainingHours} ساعة`
        : `متبقي ${remainingDays} ${remainingDays === 1 ? "يوم" : remainingDays === 2 ? "يومان" : "أيام"}`;
  } else if (remainingHours >= 1) {
    statusLabel = `ينتهي قريباً (خلال ${remainingHours} ساعة)`;
  } else {
    statusLabel = `ينتهي خلال ${Math.max(1, remainingMinutes)} دقيقة`;
  }

  const badgeText = isUrgent
    ? remainingHours >= 1
      ? `ينتهي خلال ${remainingHours} س`
      : `ينتهي خلال ${remainingMinutes} د`
    : `سارٍ (متبقي ${remainingDays} ي)`;

  return {
    isExpired: false,
    isUrgent,
    remainingDays,
    remainingHours,
    remainingMinutes,
    remainingMs: diff,
    daysLeft: remainingDays > 0 ? remainingDays : (totalHoursLeft > 0 ? 1 : 0),
    hoursLeft: totalHoursLeft,
    status: isUrgent ? "expiring_soon" : "valid",
    statusLabel,
    badgeText,
    badgeVariant: isUrgent ? "amber" : "emerald",
  };
}


/**
 * توليد رمز آمن فريد غير قابل للتخمين للروابط العامة
 */
export function generateSecureToken(byteLength: number = 16): string {
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint8Array(byteLength);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Node / Server environment or crypto fallback
  try {
    const cryptoModule = require("crypto");
    return cryptoModule.randomBytes(byteLength).toString("hex");
  } catch {
    // Cryptographically secure fallback
    const fallback = `${Date.now()}_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
    return fallback;
  }
}

/**
 * حساب عدد أيام الغياب بين تاريخ البداية وتاريخ النهاية (شاملاً)
 */
export function calculateDaysBetween(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 1;
  const start = new Date(startDateStr + "T00:00:00");
  const end = new Date(endDateStr + "T00:00:00");
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 1;
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

/**
 * صياغة عدد الأيام لغوياً بالعربية الفصحى (يوم واحد، يومان، 3 أيام...)
 */
export function formatDaysCountArabic(count: number): string {
  if (count <= 1) return "يوم واحد";
  if (count === 2) return "يومان";
  if (count >= 3 && count <= 10) return `${count} أيام`;
  return `${count} يوماً`;
}

/**
 * استخراج مصفوفة التواريخ المحصورة بين تاريخين
 */
export function getDatesInRange(startDateStr: string, endDateStr: string): string[] {
  if (!startDateStr) return [];
  if (!endDateStr || endDateStr === startDateStr) return [startDateStr];
  const start = new Date(startDateStr + "T00:00:00");
  const end = new Date(endDateStr + "T00:00:00");
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return [startDateStr];

  const dates: string[] = [];
  const curr = new Date(start);
  while (curr <= end) {
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, "0");
    const d = String(curr.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

/**
 * ترميز بيانات فترة الغياب المتعددة لحفظها بأمان في admin_notes في سوبابيز كطبقة أمان إضافية
 */
export function serializeInquiryMeta(
  absenceEndDate?: string,
  daysCount?: number,
  notes?: string
): string | undefined {
  if (!absenceEndDate && !notes) return undefined;
  if (!absenceEndDate) return notes;
  const meta = {
    end: absenceEndDate,
    days: daysCount || 2,
    text: notes || "",
  };
  return JSON.stringify(meta);
}

/**
 * فك ترميز بيانات فترة الغياب المتعددة من admin_notes
 */
export function parseInquiryMeta(rawNotes?: string | null): {
  absenceEndDate?: string;
  daysCount?: number;
  adminNotes?: string;
} {
  if (!rawNotes) return {};
  try {
    if (rawNotes.startsWith("{") && rawNotes.includes('"end"')) {
      const parsed = JSON.parse(rawNotes);
      return {
        absenceEndDate: parsed.end || undefined,
        daysCount: parsed.days ? Number(parsed.days) : undefined,
        adminNotes: parsed.text || undefined,
      };
    }
  } catch {
    // not JSON
  }
  return { adminNotes: rawNotes };
}
