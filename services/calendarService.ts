import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { CalendarEvent } from "@/types/calendar";
import { getDualDate, parseIsoDate } from "@/lib/hijriDateService";

export interface FetchCalendarParams {
  schoolId?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  fallbackData?: {
    absenceRecords?: any[];
    delayNotices?: any[];
    permissions?: any[];
    deductionDecisions?: any[];
  };
}

export const ARABIC_WEEKDAYS = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

export const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

/**
 * دالة مساعدة لتنسيق التاريخ الهجري بناء على تقويم أم القرى
 */
export function formatHijriDate(
  dateInput: Date | string,
  options?: { format?: "text" | "numeric" | "header" }
): string {
  try {
    const dual = getDualDate(dateInput);
    if (options?.format === "numeric") {
      return dual.hijriShort;
    }
    if (options?.format === "header") {
      return `${dual.hijriParts.monthName} ${dual.hijriParts.year} هـ`;
    }
    return dual.hijriFormatted;
  } catch {
    return "";
  }
}

export function getMonthDateRange(year: number, monthZeroIndexed: number) {
  const firstDay = new Date(year, monthZeroIndexed, 1);
  const lastDay = new Date(year, monthZeroIndexed + 1, 0);

  const startYear = firstDay.getFullYear();
  const startMonth = String(firstDay.getMonth() + 1).padStart(2, "0");
  const startDay = String(firstDay.getDate()).padStart(2, "0");

  const endYear = lastDay.getFullYear();
  const endMonth = String(lastDay.getMonth() + 1).padStart(2, "0");
  const endDay = String(lastDay.getDate()).padStart(2, "0");

  return {
    startDate: `${startYear}-${startMonth}-${startDay}`,
    endDate: `${endYear}-${endMonth}-${endDay}`,
    daysInMonth: lastDay.getDate(),
    firstDayOfWeek: firstDay.getDay(),
  };
}

export function getWeekDateRange(currentDate: Date) {
  const d = new Date(currentDate);
  const day = d.getDay(); // 0 = Sunday
  const diffToSunday = d.getDate() - day;

  const start = new Date(d.setDate(diffToSunday));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const format = (date: Date) => {
    const yr = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, "0");
    const dy = String(date.getDate()).padStart(2, "0");
    return `${yr}-${mo}-${dy}`;
  };

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(start);
    cur.setDate(start.getDate() + i);
    dates.push(format(cur));
  }

  return {
    startDate: format(start),
    endDate: format(end),
    dates,
  };
}

export function formatToISODate(date: Date): string {
  const yr = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const dy = String(date.getDate()).padStart(2, "0");
  return `${yr}-${mo}-${dy}`;
}

export async function fetchCalendarEvents(params: FetchCalendarParams): Promise<CalendarEvent[]> {
  const { startDate, endDate, fallbackData } = params;

  // 1. استخدام البيانات المحلية المتاحة من السياق فورياً
  if (fallbackData) {
    const events: CalendarEvent[] = [];

    // الغياب
    if (fallbackData.absenceRecords) {
      fallbackData.absenceRecords
        .filter((r) => !r.isArchived && r.date >= startDate && r.date <= endDate)
        .forEach((r) => {
          events.push({
            id: `cal-abs-${r.id}`,
            type: "absence",
            date: r.date,
            teacherId: r.teacherId,
            teacherName: r.teacherName || "معلمة",
            nationalId: r.nationalId || undefined,
            specialty: r.specialty || undefined,
            title: `غياب (${r.type || "غير محدد"})`,
            subtitle: r.reason || "تم توثيق الغياب رسمياً",
            badgeLabel: r.type || "غياب",
            badgeColor: "rose",
            details: r.notes || r.reason || "لا توجد تفاصيل إضافية",
            statusText: "غياب موثق",
            originalPageUrl: "/procedures/absence",
            rawItem: r,
          });
        });
    }

    // التأخر
    if (fallbackData.delayNotices) {
      fallbackData.delayNotices
        .filter((d) => {
          const date = d.noticeDate || d.date;
          return !d.isArchived && date && date >= startDate && date <= endDate;
        })
        .forEach((d) => {
          const durationStr =
            d.calculatedDuration ||
            (d.calculatedMinutes ? `${d.calculatedMinutes} دقيقة` : "تأخر");
          events.push({
            id: `cal-del-${d.id}`,
            type: "delay",
            date: d.noticeDate || d.date,
            teacherId: d.teacherId,
            teacherName: d.teacherName || "معلمة",
            nationalId: d.nationalId || undefined,
            specialty: d.specialty || undefined,
            title: `إشعار تأخر (${durationStr})`,
            subtitle: d.customReason || d.teacherReason || "إشعار تأخر مسجل",
            badgeLabel: d.status === "completed" ? "معتمد" : "بانتظار الإفادة",
            badgeColor: "amber",
            details: d.customReason || d.teacherReason || `مدة التأخر: ${durationStr}`,
            statusText: d.status === "completed" ? "معتمد" : "قيد الإجراء",
            originalPageUrl: "/procedures/delay-notice",
            rawItem: d,
          });
        });
    }

    // الاستئذان
    if (fallbackData.permissions) {
      fallbackData.permissions
        .filter((p) => !p.isArchived && p.permissionDate >= startDate && p.permissionDate <= endDate)
        .forEach((p) => {
          events.push({
            id: `cal-perm-${p.id}`,
            type: "permission",
            date: p.permissionDate,
            teacherId: p.teacherId,
            teacherName: p.teacherName || "معلمة",
            nationalId: p.nationalId || undefined,
            specialty: p.specialty || undefined,
            title: `استئذان (${p.durationMinutes || 0} دقيقة)`,
            subtitle: p.reason || "تصريح استئذان رسمي",
            badgeLabel: "استئذان",
            badgeColor: "blue",
            details: `الخروج: ${p.exitTime || "—"} • العودة: ${p.returnTime || "—"} • السبب: ${p.reason || "—"}`,
            statusText: "تصريح معتمد",
            originalPageUrl: "/procedures/permissions",
            rawItem: p,
          });
        });
    }

    // قرارات الحسم
    if (fallbackData.deductionDecisions) {
      fallbackData.deductionDecisions
        .filter((dec) => !dec.isArchived && dec.decisionDate >= startDate && dec.decisionDate <= endDate)
        .forEach((dec) => {
          events.push({
            id: `cal-dec-${dec.id}`,
            type: "deduction",
            date: dec.decisionDate,
            teacherId: dec.teacherId,
            teacherName: dec.teacherName || "معلمة",
            nationalId: dec.civilId,
            specialty: dec.specialization,
            title: `قرار حسم (${dec.deductionDays || 1} يوم)`,
            subtitle: `رقم القرار: ${dec.decisionNumber || "—"}`,
            badgeLabel: "قرار حسم",
            badgeColor: "purple",
            details: dec.delayHours
              ? `إجمالي التأخر: ${dec.delayHours} ساعة و${dec.delayMinutes || 0} دقيقة`
              : `قرار حسم (${dec.deductionDays || 1} يوم)`,
            statusText: "صادر ومعتمد",
            originalPageUrl: "/procedures/deduction-hours",
            rawItem: dec,
          });
        });
    }

    events.sort((a, b) => a.date.localeCompare(b.date));
    return events;
  }

  // 2. الجلب الاحتياطي من Supabase إذا كانت متصلة ولم تتوفر بيانات محلية
  if (isSupabaseConfigured()) {
    try {
      const [absencesRes, delaysRes, permsRes, deductionsRes] = await Promise.all([
        supabase
          .from("absence_records")
          .select("id, teacher_id, teacher_name, national_id, specialty, date, type, reason, notes, is_archived")
          .gte("date", startDate)
          .lte("date", endDate)
          .eq("is_archived", false),
        supabase
          .from("delay_notices")
          .select("id, teacher_id, teacher_name, specialty, notice_date, status, calculated_minutes, calculated_duration, custom_reason, teacher_reason, is_archived")
          .gte("notice_date", startDate)
          .lte("notice_date", endDate)
          .eq("is_archived", false),
        supabase
          .from("employee_permissions")
          .select("id, teacher_id, teacher_name, national_id, specialty, permission_date, duration_minutes, exit_time, return_time, reason, notes, is_archived")
          .gte("permission_date", startDate)
          .lte("permission_date", endDate)
          .eq("is_archived", false),
        supabase
          .from("deduction_decisions")
          .select("id, teacher_id, teacher_name, civil_id, specialization, decision_date, decision_number, deduction_days, delay_hours, delay_minutes, notes, is_archived")
          .gte("decision_date", startDate)
          .lte("decision_date", endDate)
          .eq("is_archived", false),
      ]);

      const events: CalendarEvent[] = [];

      if (absencesRes.data) {
        absencesRes.data.forEach((r: any) => {
          events.push({
            id: `cal-abs-${r.id}`,
            type: "absence",
            date: r.date,
            teacherId: r.teacher_id,
            teacherName: r.teacher_name || "معلمة",
            nationalId: r.national_id || undefined,
            specialty: r.specialty || undefined,
            title: `غياب (${r.type || "غير محدد"})`,
            subtitle: r.reason || "تم توثيق الغياب رسمياً",
            badgeLabel: r.type || "غياب",
            badgeColor: "rose",
            details: r.notes || r.reason || "لا توجد تفاصيل إضافية",
            statusText: "غياب موثق",
            originalPageUrl: "/procedures/absence",
            rawItem: r,
          });
        });
      }

      if (delaysRes.data) {
        delaysRes.data.forEach((d: any) => {
          const durationStr =
            d.calculated_duration ||
            (d.calculated_minutes ? `${d.calculated_minutes} دقيقة` : "تأخر");
          events.push({
            id: `cal-del-${d.id}`,
            type: "delay",
            date: d.notice_date,
            teacherId: d.teacher_id,
            teacherName: d.teacher_name || "معلمة",
            nationalId: d.national_id || undefined,
            specialty: d.specialty || undefined,
            title: `إشعار تأخر (${durationStr})`,
            subtitle: d.custom_reason || d.teacher_reason || "إشعار تأخر مسجل",
            badgeLabel: d.status === "completed" ? "معتمد" : "بانتظار الإفادة",
            badgeColor: "amber",
            details: d.custom_reason || d.teacher_reason || `مدة التأخر: ${durationStr}`,
            statusText: d.status === "completed" ? "معتمد" : "قيد الإجراء",
            originalPageUrl: "/procedures/delay-notice",
            rawItem: d,
          });
        });
      }

      if (permsRes.data) {
        permsRes.data.forEach((p: any) => {
          events.push({
            id: `cal-perm-${p.id}`,
            type: "permission",
            date: p.permission_date,
            teacherId: p.teacher_id,
            teacherName: p.teacher_name || "معلمة",
            nationalId: p.national_id || undefined,
            specialty: p.specialty || undefined,
            title: `استئذان (${p.duration_minutes || 0} دقيقة)`,
            subtitle: p.reason || "تصريح استئذان رسمي",
            badgeLabel: "استئذان",
            badgeColor: "blue",
            details: `الخروج: ${p.exit_time || "—"} • العودة: ${p.return_time || "—"} • السبب: ${p.reason || "—"}`,
            statusText: "تصريح معتمد",
            originalPageUrl: "/procedures/permissions",
            rawItem: p,
          });
        });
      }

      if (deductionsRes.data) {
        deductionsRes.data.forEach((dec: any) => {
          events.push({
            id: `cal-dec-${dec.id}`,
            type: "deduction",
            date: dec.decision_date,
            teacherId: dec.teacher_id,
            teacherName: dec.teacher_name || "معلمة",
            nationalId: dec.civil_id,
            specialty: dec.specialization,
            title: `قرار حسم (${dec.deduction_days || 1} يوم)`,
            subtitle: `رقم القرار: ${dec.decision_number || "—"}`,
            badgeLabel: "قرار حسم",
            badgeColor: "purple",
            details: dec.delay_hours
              ? `إجمالي التأخر: ${dec.delay_hours} ساعة و${dec.delay_minutes || 0} دقيقة`
              : `قرار حسم (${dec.deduction_days || 1} يوم)`,
            statusText: "صادر ومعتمد",
            originalPageUrl: "/procedures/deduction-hours",
            rawItem: dec,
          });
        });
      }

      events.sort((a, b) => a.date.localeCompare(b.date));
      return events;
    } catch (e) {
      console.warn("تعذر الجلب من سوبابيز للتقويم:", e);
    }
  }

  return [];
}
