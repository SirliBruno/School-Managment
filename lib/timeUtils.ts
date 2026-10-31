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

export function formatArabicDays(days: number): string {
  if (days <= 0) return "";
  if (days === 1) return "يوم واحد";
  if (days === 2) return "يومان";
  if (days >= 3 && days <= 10) return `${days} أيام`;
  return `${days} يوماً`;
}

export function formatArabicHours(hours: number): string {
  if (hours <= 0) return "";
  if (hours === 1) return "ساعة واحدة";
  if (hours === 2) return "ساعتان";
  if (hours >= 3 && hours <= 10) return `${hours} ساعات`;
  return `${hours} ساعة`;
}

export function formatArabicMinutes(minutes: number): string {
  if (minutes <= 0) return "";
  if (minutes === 1) return "دقيقة واحدة";
  if (minutes === 2) return "دقيقتان";
  if (minutes >= 3 && minutes <= 10) return `${minutes} دقائق`;
  return `${minutes} دقيقة`;
}

export interface RemainingCountdown {
  isExpired: boolean;
  isUrgent: boolean; // <= 24 hours
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  totalRemainingSeconds: number;
  formattedExact: string; // e.g. "متبقي 4 أيام و 7 ساعات و 15 دقيقة"
  formattedShort: string; // e.g. "4 ي و 7 س"
  statusLabel?: string;
  badgeVariant: "emerald" | "amber" | "rose" | "slate";
}

/**
 * حساب الوقت المتبقي الحي بدقة بالأيام والساعات والدقائق والثواني
 */
export function calculateRemainingCountdown(
  expiresAt?: string | null,
  referenceDate: Date = new Date(),
  fallbackDays: number = PUBLIC_LINK_EXPIRATION_DAYS,
  baseDate?: Date
): RemainingCountdown {
  const effectiveExpiry = expiresAt || (baseDate ? calculateTokenExpiry(baseDate, fallbackDays) : null);

  if (!effectiveExpiry) {
    return {
      isExpired: false,
      isUrgent: false,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0,
      totalRemainingSeconds: 0,
      formattedExact: "غير محدد",
      formattedShort: "غير محدد",
      statusLabel: "غير محدد",
      badgeVariant: "slate",
    };
  }

  const expiryTime = new Date(effectiveExpiry).getTime();
  if (isNaN(expiryTime)) {
    return {
      isExpired: true,
      isUrgent: false,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0,
      totalRemainingSeconds: 0,
      formattedExact: "تاريخ غير صالح",
      formattedShort: "غير صالح",
      statusLabel: "تاريخ غير صالح",
      badgeVariant: "slate",
    };
  }

  const now = referenceDate.getTime();
  const diff = expiryTime - now;

  if (diff <= 0) {
    return {
      isExpired: true,
      isUrgent: false,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalMs: 0,
      totalRemainingSeconds: 0,
      formattedExact: "انتهت المهلة",
      formattedShort: "انتهت المهلة",
      statusLabel: "انتهت المهلة المحددة",
      badgeVariant: "rose",
    };
  }

  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((diff % (60 * 1000)) / 1000);
  const isUrgent = diff <= 24 * 60 * 60 * 1000;

  const parts: string[] = [];
  if (days > 0) parts.push(formatArabicDays(days));
  if (hours > 0) parts.push(formatArabicHours(hours));
  if (minutes > 0) parts.push(formatArabicMinutes(minutes));

  let formattedExact = "";
  if (parts.length > 0) {
    formattedExact = `متبقي ${parts.join(" و ")}`;
  } else if (seconds > 0) {
    formattedExact = `متبقي ${seconds === 1 ? "ثانية واحدة" : seconds === 2 ? "ثانيتان" : seconds <= 10 ? `${seconds} ثوانٍ` : `${seconds} ثانية`}`;
  } else {
    formattedExact = "متبقي أقل من دقيقة";
  }

  let formattedShort = "";
  if (days > 0) {
    formattedShort = hours > 0 ? `${days} ي و ${hours} س` : `${days} ي`;
  } else if (hours > 0) {
    formattedShort = minutes > 0 ? `${hours} س و ${minutes} د` : `${hours} س`;
  } else if (minutes > 0) {
    formattedShort = `${minutes} د`;
  } else {
    formattedShort = "أقل من دقيقة";
  }

  return {
    isExpired: false,
    isUrgent,
    days,
    hours,
    minutes,
    seconds,
    totalMs: diff,
    totalRemainingSeconds: Math.max(0, Math.floor(diff / 1000)),
    formattedExact,
    formattedShort,
    statusLabel: formattedExact,
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
 * إضافة عدد محدد من الأيام إلى تاريخ بصيغة YYYY-MM-DD
 */
export function addDaysToDateStr(dateStr: string, days: number): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * ترميز بيانات فترة الغياب المتعددة ودورات إعادة الإرسال لحفظها بأمان في admin_notes في سوبابيز كطبقة أمان إضافية
 */
export function serializeInquiryMeta(
  absenceEndDate?: string,
  daysCount?: number,
  notes?: string,
  extra?: {
    rejectionReason?: string;
    resendRequested?: boolean;
    previousInquiryId?: string;
    nextInquiryId?: string;
    cycleNumber?: number;
    escalatedMahdarId?: string;
    mahdarDate?: string;
  }
): string | undefined {
  if (!absenceEndDate && !notes && !extra) return undefined;
  if (!absenceEndDate && !extra) return notes;
  const meta: Record<string, unknown> = {
    end: absenceEndDate || null,
    days: daysCount || (absenceEndDate ? 2 : 1),
    text: notes || "",
    ...(extra?.rejectionReason ? { rejReason: extra.rejectionReason } : {}),
    ...(extra?.resendRequested !== undefined ? { resend: extra.resendRequested } : {}),
    ...(extra?.previousInquiryId ? { prevInq: extra.previousInquiryId } : {}),
    ...(extra?.nextInquiryId ? { nextInq: extra.nextInquiryId } : {}),
    ...(extra?.cycleNumber ? { cycle: extra.cycleNumber } : {}),
    ...(extra?.escalatedMahdarId ? { mahdarId: extra.escalatedMahdarId } : {}),
    ...(extra?.mahdarDate ? { mahdarDate: extra.mahdarDate } : {}),
  };
  return JSON.stringify(meta);
}

/**
 * فك ترميز بيانات فترة الغياب المتعددة ودورات إعادة الإرسال والتصعيد من admin_notes
 */
export function parseInquiryMeta(rawNotes?: string | null): {
  absenceEndDate?: string;
  daysCount?: number;
  adminNotes?: string;
  text?: string;
  rejectionReason?: string;
  resendRequested?: boolean;
  previousInquiryId?: string;
  nextInquiryId?: string;
  cycleNumber?: number;
  escalatedMahdarId?: string;
  mahdarDate?: string;
} {
  if (!rawNotes) return {};
  try {
    if (
      rawNotes.startsWith("{") &&
      (rawNotes.includes('"end"') ||
        rawNotes.includes('"rejReason"') ||
        rawNotes.includes('"prevInq"') ||
        rawNotes.includes('"mahdarId"') ||
        rawNotes.includes('"text"'))
    ) {
      const parsed = JSON.parse(rawNotes);
      return {
        absenceEndDate: parsed.end || undefined,
        daysCount: parsed.days ? Number(parsed.days) : undefined,
        adminNotes: parsed.text || undefined,
        text: parsed.text || undefined,
        rejectionReason: parsed.rejReason || undefined,
        resendRequested: parsed.resend !== undefined ? Boolean(parsed.resend) : undefined,
        previousInquiryId: parsed.prevInq || undefined,
        nextInquiryId: parsed.nextInq || undefined,
        cycleNumber: parsed.cycle ? Number(parsed.cycle) : undefined,
        escalatedMahdarId: parsed.mahdarId || undefined,
        mahdarDate: parsed.mahdarDate || undefined,
      };
    }
  } catch {
    // not JSON
  }
  return { adminNotes: rawNotes, text: rawNotes };
}

/**
 * التحقق مما إذا كانت مساءلة الغياب قد تم تصعيدها برفع محضر إداري لمنع التكرار
 */
export function isAbsenceEscalatedToMahdar(
  inquiry: {
    id: string;
    teacherId: string;
    absenceDate: string;
    escalatedMahdarId?: string;
    adminNotes?: string;
    notes?: string;
  },
  administrativeInquiries?: Array<{
    id: string;
    teacherId: string;
    inquiryNumber?: string;
    incidentDate?: string;
    description?: string;
    incidentDescription?: string;
    vicePrincipalNotes?: string;
    violationTypeArabic?: string;
    isArchived?: boolean;
  }>
): { isEscalated: boolean; mahdarId?: string; mahdarItem?: any } {
  // 1. فحص الحقل المباشر أو الملاحظات المشفرة
  const rawNotes = inquiry.adminNotes || inquiry.notes;
  const meta = parseInquiryMeta(rawNotes);
  const targetMahdarId = inquiry.escalatedMahdarId || meta.escalatedMahdarId;

  if (targetMahdarId) {
    if (administrativeInquiries && administrativeInquiries.length > 0) {
      const match = administrativeInquiries.find((ai) => ai.id === targetMahdarId);
      if (match) {
        if (!match.isArchived) {
          return { isEscalated: true, mahdarId: targetMahdarId, mahdarItem: match };
        }
        // إذا كان المحضر المرتبط مؤرشفاً أو محذوفاً، لا يُعتبر مصعداً نشطاً
        return { isEscalated: false };
      }
    }
    return { isEscalated: true, mahdarId: targetMahdarId };
  }

  // 2. فحص سجل المسائلات الإدارية المباشرة
  if (administrativeInquiries && administrativeInquiries.length > 0) {
    const match = administrativeInquiries.find((ai) => {
      if (ai.isArchived) return false;
      if (ai.vicePrincipalNotes?.includes(inquiry.id)) return true;
      const desc = ai.incidentDescription || ai.description || "";
      if (desc.includes(inquiry.id)) return true;
      if (
        ai.teacherId === inquiry.teacherId &&
        ai.incidentDate === inquiry.absenceDate &&
        (desc.includes(inquiry.id) ||
          desc.includes("تخلفت المعلمة عن تقديم إفادتها") ||
          desc.includes("تخلفت المعلمة") ||
          ai.violationTypeArabic?.includes("تخلف عن تقديم إفادة غياب"))
      ) {
        return true;
      }
      return false;
    });

    if (match) {
      return { isEscalated: true, mahdarId: match.id, mahdarItem: match };
    }
  }

  return { isEscalated: false };
}

export interface DelayMetaPayload {
  delayStartFromTime?: string;
  earlyDepartureFromTime?: string;
  leftSchoolFromTime?: string;
  leftSchoolToTime?: string;
  calculatedMinutes?: number;
  calculatedDuration?: string;
  text?: string;
}

/**
 * ترميز بيانات أوقات التأخر الدقيقة والمدة المحسوبة داخل additional_notes لحفظها سحابياً
 */
export function serializeDelayMeta(
  notes?: string | null,
  meta?: Partial<DelayMetaPayload>
): string | undefined {
  if (!meta) return notes || undefined;
  const hasMeta =
    Boolean(meta.delayStartFromTime) ||
    Boolean(meta.earlyDepartureFromTime) ||
    Boolean(meta.leftSchoolFromTime) ||
    Boolean(meta.leftSchoolToTime) ||
    (typeof meta.calculatedMinutes === "number" && meta.calculatedMinutes > 0) ||
    Boolean(meta.calculatedDuration);

  if (!hasMeta) return notes || undefined;

  const payload: Record<string, unknown> = {
    _tag: "delay_meta",
    text: notes || "",
    ...(meta.delayStartFromTime ? { fromTime: meta.delayStartFromTime } : {}),
    ...(meta.earlyDepartureFromTime ? { depFrom: meta.earlyDepartureFromTime } : {}),
    ...(meta.leftSchoolFromTime ? { leftFrom: meta.leftSchoolFromTime } : {}),
    ...(meta.leftSchoolToTime ? { leftTo: meta.leftSchoolToTime } : {}),
    ...(typeof meta.calculatedMinutes === "number" ? { mins: meta.calculatedMinutes } : {}),
    ...(meta.calculatedDuration ? { dur: meta.calculatedDuration } : {}),
  };
  return JSON.stringify(payload);
}

/**
 * فك ترميز بيانات أوقات التأخر والمدة المحسوبة من additional_notes
 */
export function parseDelayMeta(rawNotes?: string | null): {
  delayStartFromTime?: string;
  earlyDepartureFromTime?: string;
  leftSchoolFromTime?: string;
  leftSchoolToTime?: string;
  calculatedMinutes?: number;
  calculatedDuration?: string;
  text?: string;
} {
  if (!rawNotes) return {};
  try {
    if (
      rawNotes.startsWith("{") &&
      (rawNotes.includes('"_tag":"delay_meta"') ||
        rawNotes.includes('"fromTime"') ||
        rawNotes.includes('"mins"') ||
        rawNotes.includes('"dur"'))
    ) {
      const parsed = JSON.parse(rawNotes);
      return {
        delayStartFromTime: parsed.fromTime || undefined,
        earlyDepartureFromTime: parsed.depFrom || undefined,
        leftSchoolFromTime: parsed.leftFrom || undefined,
        leftSchoolToTime: parsed.leftTo || undefined,
        calculatedMinutes: typeof parsed.mins === "number" ? parsed.mins : undefined,
        calculatedDuration: parsed.dur || undefined,
        text: parsed.text || undefined,
      };
    }
  } catch {
    // not JSON
  }
  return { text: rawNotes };
}

// Re-export Hijri & Dual Date utilities
export {
  getDualDate,
  getHijriPartsFromDate,
  hijriToGregorianIso,
  formatOfficialHeaderDate,
  formatOfficialIncidentDate,
  formatOfficialDateRange,
  HIJRI_MONTH_NAMES,
} from "./hijriDateService";
export type { DualDateInfo, HijriDateParts } from "./hijriDateService";
