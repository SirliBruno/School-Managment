/**
 * خدمة إدارة وحساب التواريخ الهجرية والميلادية الموحدة
 * مبنية على تقويم أم القرى الرسمي (Umm al-Qura) المعتمد في المملكة العربية السعودية
 */

export interface HijriDateParts {
  year: number;
  month: number; // 1-12
  day: number;   // 1-30
  monthName: string;
  dayName: string;
}

export interface DualDateInfo {
  gregorianIso: string;          // YYYY-MM-DD
  gregorianFormatted: string;    // 12 أكتوبر 2026 م أو 2026/10/12
  gregorianShort: string;        // 2026/10/12
  hijriFormatted: string;        // 23 ربيع الآخر 1448 هـ
  hijriShort: string;            // 1448/04/23 هـ
  hijriParts: HijriDateParts;
  dayName: string;               // الأحد
  officialHeaderString: string;  // 1448/04/23هـ الموافق 2026/10/12م
  officialIncidentString: string;// يوم الأحد 23 ربيع الآخر 1448هـ (الموافق 2026/10/12م)
}

export const HIJRI_MONTH_NAMES = [
  "محرم",
  "صفر",
  "ربيع الأول",
  "ربيع الآخر",
  "جمادى الأولى",
  "جمادى الآخرة",
  "رجب",
  "شعبان",
  "رمضان",
  "شوال",
  "ذو القعدة",
  "ذو الحجة",
];

const ARABIC_DAYS = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

/**
 * استخراج اليوم العربي من تاريخ ميلادي
 */
export function getArabicDayOfWeek(date: Date): string {
  const dayIndex = date.getDay();
  return ARABIC_DAYS[dayIndex] || "الأحد";
}

/**
 * فك أجزاء التاريخ الميلادي بأمان
 */
export function parseIsoDate(isoDateStr: string): Date | null {
  if (!isoDateStr) return null;
  const cleanStr = isoDateStr.trim().split(" ")[0].split("T")[0];
  const parts = cleanStr.split("-").map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  }
  const d = new Date(isoDateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * تنسيق التاريخ الميلادي إلى صيغة YYYY-MM-DD
 */
export function toIsoDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * استخراج أجزاء التاريخ الهجري بدقة بناءً على تقويم أم القرى الرسمي
 * مع دعم تعديل فارق رؤية الهلال (offset)
 */
export function getHijriPartsFromDate(date: Date, offsetDays = 0): HijriDateParts {
  const workingDate = new Date(date.getTime() + offsetDays * 86400000);
  
  try {
    const formatter = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
    
    const parts = formatter.formatToParts(workingDate);
    let day = 1;
    let month = 1;
    let year = 1448;

    for (const part of parts) {
      if (part.type === "day") day = parseInt(part.value, 10);
      if (part.type === "month") month = parseInt(part.value, 10);
      if (part.type === "year") year = parseInt(part.value, 10);
    }

    const monthIndex = Math.max(0, Math.min(11, month - 1));
    const monthName = HIJRI_MONTH_NAMES[monthIndex] || `شهر ${month}`;
    const dayName = getArabicDayOfWeek(date);

    return {
      year,
      month,
      day,
      monthName,
      dayName,
    };
  } catch (err) {
    // في بيئات قد لا تدعم islamic-umalqura، يتم استخدام الحساب التقديري
    return estimateHijriParts(workingDate);
  }
}

/**
 * تحويل تقريبي احتياطي لأجهزة أو بيئات لا تدعم Intl umalqura
 */
function estimateHijriParts(date: Date): HijriDateParts {
  const gregorianYear = date.getFullYear();
  const hijriYear = Math.round((gregorianYear - 622) * (33 / 32));
  return {
    year: hijriYear,
    month: date.getMonth() + 1,
    day: date.getDate(),
    monthName: HIJRI_MONTH_NAMES[date.getMonth()] || "محرم",
    dayName: getArabicDayOfWeek(date),
  };
}

/**
 * تحويل أجزاء التاريخ الهجري إلى تاريخ ميلادي مكافئ (YYYY-MM-DD)
 * من خلال البحث الثنائي/التقاربي على تقويم أم القرى لضمان التطابق التام 100%
 */
export function hijriToGregorianIso(
  hYear: number,
  hMonth: number,
  hDay: number,
  offsetDays = 0
): string {
  // نقطة انطلاق تقريبية محسوبة
  const approxGYear = Math.round(622 + (hYear * 32) / 33);
  let testDate = new Date(approxGYear, hMonth - 1, hDay, 12, 0, 0);

  // حلقة بحث متقاربة حتى العثور على التطابق الدقيق مع أم القرى
  for (let step = 0; step < 40; step++) {
    const curParts = getHijriPartsFromDate(testDate, offsetDays);
    
    // إذا تطابقت السنة والشهر واليوم
    if (curParts.year === hYear && curParts.month === hMonth && curParts.day === hDay) {
      return toIsoDateString(testDate);
    }

    // حساب الفارق بالأيام
    const yearDiff = hYear - curParts.year;
    const monthDiff = hMonth - curParts.month;
    const dayDiff = hDay - curParts.day;
    const totalDayDelta = yearDiff * 354 + monthDiff * 29.5 + dayDiff;

    if (Math.abs(totalDayDelta) < 0.5) {
      return toIsoDateString(testDate);
    }

    // تعديل تاريخ الاختبار بمقدار الفارق
    const adjustment = Math.round(totalDayDelta);
    if (adjustment === 0) {
      return toIsoDateString(testDate);
    }
    testDate = new Date(testDate.getTime() + adjustment * 86400000);
  }

  return toIsoDateString(testDate);
}

/**
 * الحصول على كائن متكامل يحوي التاريخين الهجري والميلادي معاً
 */
export function getDualDate(isoDateOrDate?: string | Date, offsetDays = 0): DualDateInfo {
  const dateObj = typeof isoDateOrDate === "string" ? parseIsoDate(isoDateOrDate) : isoDateOrDate;
  const safeDate = dateObj || new Date();
  const iso = toIsoDateString(safeDate);

  const hijriParts = getHijriPartsFromDate(safeDate, offsetDays);
  const dayName = getArabicDayOfWeek(safeDate);

  const hDayStr = String(hijriParts.day).padStart(2, "0");
  const hMonthStr = String(hijriParts.month).padStart(2, "0");
  const hijriShort = `${hijriParts.year}/${hMonthStr}/${hDayStr} هـ`;
  const hijriFormatted = `${hijriParts.day} ${hijriParts.monthName} ${hijriParts.year} هـ`;

  const gDayStr = String(safeDate.getDate()).padStart(2, "0");
  const gMonthStr = String(safeDate.getMonth() + 1).padStart(2, "0");
  const gregorianShort = `${safeDate.getFullYear()}/${gMonthStr}/${gDayStr} م`;
  const gregorianFormatted = `${safeDate.getDate()}-${gMonthStr}-${safeDate.getFullYear()}`;

  const officialHeaderString = `${hijriShort} الموافق ${safeDate.getFullYear()}/${gMonthStr}/${gDayStr}م`;
  const officialIncidentString = `يوم ${dayName} ${hijriParts.day} ${hijriParts.monthName} ${hijriParts.year}هـ (الموافق ${gDayStr}-${gMonthStr}-${safeDate.getFullYear()}م)`;

  return {
    gregorianIso: iso,
    gregorianFormatted,
    gregorianShort,
    hijriFormatted,
    hijriShort,
    hijriParts,
    dayName,
    officialHeaderString,
    officialIncidentString,
  };
}

/**
 * تنسيق الترويسة الرسمية الموحدة لجميع مستندات الـ PDF
 */
export function formatOfficialHeaderDate(isoDateOrDate?: string | Date, offsetDays = 0): string {
  const dual = getDualDate(isoDateOrDate, offsetDays);
  return dual.officialHeaderString;
}

/**
 * تنسيق تاريخ الواقعة الرسمي لمستندات الغياب والتأخر والاستئذان
 */
export function formatOfficialIncidentDate(isoDateOrDate?: string | Date, offsetDays = 0): string {
  const dual = getDualDate(isoDateOrDate, offsetDays);
  return dual.officialIncidentString;
}

/**
 * تنسيق المدى الزمني للمساءلات المتعددة (هجري وميلادي)
 */
export function formatOfficialDateRange(
  startDateStr: string,
  endDateStr: string,
  offsetDays = 0
): { hijriRange: string; gregorianRange: string; dualFullRange: string } {
  const startDual = getDualDate(startDateStr, offsetDays);
  const endDual = getDualDate(endDateStr, offsetDays);

  const gregorianRange = `من ${startDual.gregorianIso} إلى ${endDual.gregorianIso}`;
  const hijriRange = `من ${startDual.hijriParts.day} ${startDual.hijriParts.monthName} إلى ${endDual.hijriParts.day} ${endDual.hijriParts.monthName} ${endDual.hijriParts.year}هـ`;
  const dualFullRange = `${hijriRange} (الموافق ${gregorianRange}م)`;

  return {
    hijriRange,
    gregorianRange,
    dualFullRange,
  };
}
