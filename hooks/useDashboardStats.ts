"use client";

import { useMemo } from "react";
import { useTeachers } from "@/context/TeacherContext";
import { AbsenceRecord, AbsenceType, DelayNotice, Teacher } from "@/types/teacher";

export interface DashboardStats {
  totalTeachers: number;
  todayAbsences: number;
  monthAbsences: number;
  pendingProcedures: number;
  absenceTypeBreakdown: {
    اضطراري: number;
    مرضي: number;
    مرافق: number;
    أخرى: number;
  };
  absencesLast7Days: {
    date: string;
    dayName: string;
    count: number;
  }[];
  delayNoticeBreakdown: {
    type: string;
    count: number;
  }[];
  totalDelayNotices: number;
  pendingDelayNotices: number;
}

const ARABIC_DAYS_MAP = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

/**
 * دالة مساعدة لاستخراج التاريخ بالتوقيت المحلي لمدينة مكة / الرياض (Asia/Riyadh)
 */
export function getRiyadhDateInfo(targetDate: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  dateStr: string;
  monthStr: string;
} {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(targetDate);
    let year = "";
    let month = "";
    let day = "";
    for (const p of parts) {
      if (p.type === "year") year = p.value;
      if (p.type === "month") month = p.value;
      if (p.type === "day") day = p.value;
    }
    return {
      year: parseInt(year, 10),
      month: parseInt(month, 10),
      day: parseInt(day, 10),
      dateStr: `${year}-${month}-${day}`,
      monthStr: `${year}-${month}`,
    };
  } catch {
    // خطة احتياطية في حال تعذر Intl
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, "0");
    const d = String(targetDate.getDate()).padStart(2, "0");
    return {
      year: y,
      month: targetDate.getMonth() + 1,
      day: targetDate.getDate(),
      dateStr: `${y}-${m}-${d}`,
      monthStr: `${y}-${m}`,
    };
  }
}

/**
 * توحيد صيغة التاريخ من أي صيغة واردة (YYYY-MM-DD أو DD-MM-YYYY أو ISO)
 */
export function normalizeDateString(rawDate?: string | null): string {
  if (!rawDate) return "";
  const trimmed = rawDate.trim().split("T")[0];
  const parts = trimmed.split(/[-/]/);

  if (parts.length === 3) {
    // صيغة YYYY-MM-DD
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    }
    // صيغة DD-MM-YYYY
    if (parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }

  return trimmed;
}

/**
 * Hook لحساب وتجهيز كافة مؤشرات لوحة التحكم بشكل تفاعلي ولحظي
 */
export function useDashboardStats(): DashboardStats {
  const { teachers, absenceRecords, delayNotices, inquiries } = useTeachers();

  return useMemo(() => {
    const safeTeachers: Teacher[] = Array.isArray(teachers) ? teachers : [];
    const safeAbsences: AbsenceRecord[] = Array.isArray(absenceRecords) ? absenceRecords : [];
    const safeDelayNotices: DelayNotice[] = Array.isArray(delayNotices) ? delayNotices : [];
    const safeInquiries = Array.isArray(inquiries) ? inquiries : [];

    // 1. التاريخ الحالي بتوقيت الرياض
    const riyadhNow = getRiyadhDateInfo(new Date());
    const todayStr = riyadhNow.dateStr;
    const currentMonthPrefix = riyadhNow.monthStr;

    // 2. إجمالي المعلمات
    const totalTeachers = safeTeachers.length;

    // 3. غياب اليوم
    const todayAbsences = safeAbsences.filter((record) => {
      const normalized = normalizeDateString(record.date);
      return normalized === todayStr;
    }).length;

    // 4. إجمالي الغياب (هذا الشهر)
    const monthAbsences = safeAbsences.filter((record) => {
      const normalized = normalizeDateString(record.date);
      return normalized.startsWith(currentMonthPrefix);
    }).length;

    // 5. الإجراءات المعلقة
    // المساءلات المعلقة + التنبيهات بانتظار قرار المديرة
    const pendingInquiriesCount = safeInquiries.filter(
      (inq) => inq.status === "pending" || inq.status === "submitted"
    ).length;

    // سجلات غياب تستلزم متابعة أو لم يُتخذ فيها قرار
    const pendingAbsenceRecordsCount = safeAbsences.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r: any) => r.status === "pending" || (!r.notes || r.notes.trim() === "")
    ).length;

    const pendingAbsenceItems =
      pendingInquiriesCount > 0 ? pendingInquiriesCount : pendingAbsenceRecordsCount;

    const pendingDelayNotices = safeDelayNotices.filter(
      (d) => d.status === "pending_director"
    ).length;

    const pendingProcedures = pendingAbsenceItems + pendingDelayNotices;

    // 6. تصنيف حالات الغياب حسب النوع
    const typeBreakdown: { اضطراري: number; مرضي: number; مرافق: number; أخرى: number } = {
      اضطراري: 0,
      مرضي: 0,
      مرافق: 0,
      أخرى: 0,
    };

    safeAbsences.forEach((record) => {
      const rawType = (record.type || "").trim() as AbsenceType;
      if (rawType in typeBreakdown) {
        typeBreakdown[rawType as keyof typeof typeBreakdown]++;
      } else {
        typeBreakdown["أخرى"]++;
      }
    });

    // 7. معدل الغياب خلال آخر 7 أيام (شاملاً اليوم)
    const absencesLast7Days: { date: string; dayName: string; count: number }[] = [];
    const baseDate = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const info = getRiyadhDateInfo(d);
      const dayArabic = ARABIC_DAYS_MAP[d.getDay()] || "";
      const displayLabel = `${dayArabic} ${info.day}`;

      const count = safeAbsences.filter((r) => {
        return normalizeDateString(r.date) === info.dateStr;
      }).length;

      absencesLast7Days.push({
        date: info.dateStr,
        dayName: displayLabel,
        count,
      });
    }

    // 8. تصنيف مخالفات تنبيهات التأخر
    const delayNoticeBreakdown = [
      {
        type: "تأخر بداية الدوام",
        count: safeDelayNotices.filter((d) => d.violationDelayStart).length,
      },
      {
        type: "عدم تواجد أثناء الدوام",
        count: safeDelayNotices.filter((d) => d.violationAbsentDuring).length,
      },
      {
        type: "انصراف مبكر",
        count: safeDelayNotices.filter((d) => d.violationEarlyDeparture).length,
      },
      {
        type: "انصراف من غير المدرسة",
        count: safeDelayNotices.filter((d) => d.violationLeftSchool).length,
      },
    ];

    const totalDelayNotices = safeDelayNotices.length;

    return {
      totalTeachers,
      todayAbsences,
      monthAbsences,
      pendingProcedures,
      absenceTypeBreakdown: typeBreakdown,
      absencesLast7Days,
      delayNoticeBreakdown,
      totalDelayNotices,
      pendingDelayNotices,
    };
  }, [teachers, absenceRecords, delayNotices, inquiries]);
}