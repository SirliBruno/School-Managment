/**
 * محرك التكامل الإداري لاحتساب ساعات التأخر وقرارات الحسم والرادارات الاستباقية
 * استناداً للائحة الخدمة المدنية المادة (21) والقرار الوزاري رقم 1/1139
 */

import {
  Teacher,
  DelayNotice,
  DeductionDecision,
  AbsenceInquiry,
} from "@/types/teacher";
import {
  MINUTES_PER_WORK_DAY,
  MINUTES_PER_HOUR,
} from "@/lib/deductionCalculator";
import { calculateTimeDifference } from "@/lib/timeUtils";

export const WARNING_THRESHOLD_MINUTES = 240; // 4 hours

export interface TeacherDelaySummary {
  teacherId: string;
  teacherName: string;
  nationalId?: string;
  jobNumber?: string;
  specialty?: string;
  unsettledNotices: DelayNotice[];
  unsettledMinutes: number;
  carriedOverMinutes: number;
  totalUnexcusedMinutes: number;
  totalUnexcusedHours: number;
  deductionDays: number;
  remainderMinutes: number;
  status: "normal" | "warning" | "due_for_deduction";
}

export type ProactiveAlertType =
  | "due_for_deduction"
  | "approaching_threshold"
  | "pending_director"
  | "expired_inquiry";

export interface ProactiveAlert {
  id: string;
  type: ProactiveAlertType;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  teacherId: string;
  teacherName: string;
  date?: string;
  actionLabel: string;
  actionUrl: string;
  meta?: {
    totalMinutes?: number;
    totalHours?: number;
    deductionDays?: number;
    noticeId?: string;
    inquiryId?: string;
  };
}

export interface SchoolRadarKPIs {
  totalUnexcusedHours: number;
  totalUnexcusedMinutes: number;
  teachersDueCount: number;
  teachersWarningCount: number;
  decisionsIssuedCount: number;
  totalDeductionDaysIssued: number;
  pendingDirectorCount: number;
  expiredInquiriesCount: number;
}

/**
 * استخراج أو احتساب مدة التنبيه بالدقائق
 */
export function calculateNoticeDurationMinutes(notice: DelayNotice): number {
  if (
    typeof notice.calculatedMinutes === "number" &&
    !isNaN(notice.calculatedMinutes) &&
    notice.calculatedMinutes > 0
  ) {
    return notice.calculatedMinutes;
  }

  // الاحتساب البديل من حقول الوقت في حال عدم حفظ الدقائق مسبقاً (تراكم المخالفات)
  let fallbackTotal = 0;

  if (notice.violationDelayStart && notice.delayStartFromTime && notice.delayStartTime) {
    const diff = calculateTimeDifference(notice.delayStartFromTime, notice.delayStartTime);
    if (diff.isValid && diff.totalMinutes > 0) fallbackTotal += diff.totalMinutes;
  }

  if (notice.violationAbsentDuring && notice.absentFromTime && notice.absentToTime) {
    const diff = calculateTimeDifference(notice.absentFromTime, notice.absentToTime);
    if (diff.isValid && diff.totalMinutes > 0) fallbackTotal += diff.totalMinutes;
  }

  if (notice.violationEarlyDeparture && notice.earlyDepartureFromTime && notice.earlyDepartureTime) {
    const diff = calculateTimeDifference(notice.earlyDepartureFromTime, notice.earlyDepartureTime);
    if (diff.isValid && diff.totalMinutes > 0) fallbackTotal += diff.totalMinutes;
  }

  if (notice.violationLeftSchool && notice.leftSchoolFromTime && notice.leftSchoolToTime) {
    const diff = calculateTimeDifference(notice.leftSchoolFromTime, notice.leftSchoolToTime);
    if (diff.isValid && diff.totalMinutes > 0) fallbackTotal += diff.totalMinutes;
  }

  return fallbackTotal;
}

/**
 * دالة مساعدة لتحويل التاريخ إلى طابع زمني رقمي آمن للترتيب
 * تدعم التواريخ بصيغة ISO، والتواريخ بالأرقام العربية (١٢٣)، وتمنع أخطاء NaN
 */
export function safeParseDateTimestamp(val?: string | number): number {
  if (!val) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const normalized = String(val)
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .trim();
  const directParsed = new Date(normalized).getTime();
  if (!isNaN(directParsed) && directParsed > 0) return directParsed;

  const match = normalized.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);
    const fallbackParsed = new Date(y, m - 1, d).getTime();
    if (!isNaN(fallbackParsed)) return fallbackParsed;
  }
  return 0;
}

/**
 * التحقق مما إذا كان تنبيه التأخر غير معذور ويستوجب الحسم
 * الشرط النظامي: الحالة مكتملة + رأي المديرة هو الرفض مع الحسم + غير مؤرشف
 */
export function isUnexcusedDelayNotice(notice: DelayNotice): boolean {
  if (notice.isArchived) return false;
  return (
    notice.status === "completed" &&
    notice.directorOpinion === "rejected_with_deduction"
  );
}

/**
 * جمع كافة معرفات التنبيهات التي تمت تسويتها بقرارات حسم نشطة (غير مؤرشفة)
 */
export function getAllSettledNoticeIds(
  deductionDecisions: DeductionDecision[]
): Set<string> {
  const settled = new Set<string>();
  for (const dec of deductionDecisions) {
    if (!dec.isArchived && Array.isArray(dec.settledNoticeIds)) {
      for (const id of dec.settledNoticeIds) {
        if (id) settled.add(id);
      }
    }
  }
  return settled;
}

/**
 * احتساب رصيد التأخر التراكمي للمعلمة واستحقاق الحسم
 */
export function getTeacherDelaySummary(
  teacher: Teacher,
  delayNotices: DelayNotice[],
  deductionDecisions: DeductionDecision[]
): TeacherDelaySummary {
  // تنبيهات المعلمة
  const teacherNotices = delayNotices.filter(
    (n) => n.teacherId === teacher.id && !n.isArchived
  );

  // التنبيهات غير المعذورة
  const unexcusedNotices = teacherNotices.filter(isUnexcusedDelayNotice);

  // قرارات الحسم الصادرة بحق المعلمة وغير المؤرشفة
  const teacherDecisions = deductionDecisions.filter(
    (d) => d.teacherId === teacher.id && !d.isArchived
  );

  // التنبيهات التي سويت بقرارات سابقة
  const settledIds = new Set<string>();
  for (const dec of teacherDecisions) {
    if (Array.isArray(dec.settledNoticeIds)) {
      for (const id of dec.settledNoticeIds) {
        if (id) settledIds.add(id);
      }
    }
  }

  // التنبيهات غير المسواة
  const unsettledNotices = unexcusedNotices.filter(
    (n) => !settledIds.has(n.id)
  );

  const unsettledMinutes = unsettledNotices.reduce(
    (acc, curr) => acc + calculateNoticeDurationMinutes(curr),
    0
  );

  // احتساب الدقائق المرحلة من آخر قرار حسم
  let carriedOverMinutes = 0;
  if (teacherDecisions.length > 0) {
    // ترتيب القرارات زمنياً لمعرفة آخر قرار مرحل بأمان تام
    const sorted = [...teacherDecisions].sort((a, b) => {
      const timeA =
        safeParseDateTimestamp(a.createdAt) || safeParseDateTimestamp(a.decisionDate);
      const timeB =
        safeParseDateTimestamp(b.createdAt) || safeParseDateTimestamp(b.decisionDate);
      if (timeB !== timeA) return timeB - timeA;
      return (b.id || "").localeCompare(a.id || "");
    });

    const latestDecision = sorted[0];
    if (typeof latestDecision.remainderMinutes === "number") {
      carriedOverMinutes = Math.max(0, latestDecision.remainderMinutes);
    } else if (typeof latestDecision.delayMinutes === "number") {
      // احتساب الفائض من إجمالي دقائق القرار إذا لم يكن الحقل محدداً
      carriedOverMinutes = latestDecision.delayMinutes % MINUTES_PER_WORK_DAY;
    }
  }

  const totalUnexcusedMinutes = unsettledMinutes + carriedOverMinutes;
  const totalUnexcusedHours =
    Math.round((totalUnexcusedMinutes / MINUTES_PER_HOUR) * 10) / 10;
  const deductionDays = Math.floor(totalUnexcusedMinutes / MINUTES_PER_WORK_DAY);
  const remainderMinutes = totalUnexcusedMinutes % MINUTES_PER_WORK_DAY;

  let status: "normal" | "warning" | "due_for_deduction" = "normal";
  if (totalUnexcusedMinutes >= MINUTES_PER_WORK_DAY) {
    status = "due_for_deduction";
  } else if (totalUnexcusedMinutes >= WARNING_THRESHOLD_MINUTES) {
    status = "warning";
  }

  return {
    teacherId: teacher.id,
    teacherName: teacher.fullName || teacher.name || "معلمة",
    nationalId: teacher.nationalId || teacher.username || teacher.jobNumber,
    jobNumber: teacher.jobNumber || teacher.nationalId,
    specialty: teacher.specialty || teacher.teachingField || "عام",
    unsettledNotices,
    unsettledMinutes,
    carriedOverMinutes,
    totalUnexcusedMinutes,
    totalUnexcusedHours,
    deductionDays,
    remainderMinutes,
    status,
  };
}

/**
 * احتساب ملخص التأخر لكافة معلمات المدرسة
 */
export function calculateSchoolDelaySummaries(
  teachers: Teacher[],
  delayNotices: DelayNotice[],
  deductionDecisions: DeductionDecision[]
): TeacherDelaySummary[] {
  const activeTeachers = teachers.filter((t) => !t.isArchived);
  return activeTeachers.map((t) =>
    getTeacherDelaySummary(t, delayNotices, deductionDecisions)
  );
}

/**
 * توليد رادار التنبيهات الاستباقية للمدرسة
 */
export function generateSchoolProactiveAlerts(params: {
  teachers: Teacher[];
  delayNotices: DelayNotice[];
  deductionDecisions: DeductionDecision[];
  inquiries?: AbsenceInquiry[];
  now?: Date | number;
}): ProactiveAlert[] {
  const { teachers, delayNotices, deductionDecisions, inquiries = [], now } = params;
  const currentTime = now ? new Date(now).getTime() : Date.now();
  const alerts: ProactiveAlert[] = [];

  const summaries = calculateSchoolDelaySummaries(
    teachers,
    delayNotices,
    deductionDecisions
  );

  // 1. معلمات مستحقات للحسم الفوري (>= 7 ساعات / 420 دقيقة)
  for (const s of summaries) {
    if (s.status === "due_for_deduction") {
      alerts.push({
        id: `alert-due-${s.teacherId}`,
        type: "due_for_deduction",
        severity: "critical",
        title: "استحقاق حسم ساعات تأخر (المادة 21)",
        description: `المعلمة (${s.teacherName}) بلغت (${s.totalUnexcusedHours}) ساعة تأخر غير معذورة (${s.totalUnexcusedMinutes} دقيقة) — يستحق حسم (${s.deductionDays}) يوم عمل من راتبها.`,
        teacherId: s.teacherId,
        teacherName: s.teacherName,
        actionLabel: "إصدار قرار الحسم الآن ⚡",
        actionUrl: `/procedures/deduction-hours?teacherId=${s.teacherId}&autoFill=true`,
        meta: {
          totalMinutes: s.totalUnexcusedMinutes,
          totalHours: s.totalUnexcusedHours,
          deductionDays: s.deductionDays,
        },
      });
    }
  }

  // 2. معلمات في مرحلة الإنذار المبكر (4 إلى 6.9 ساعات)
  for (const s of summaries) {
    if (s.status === "warning") {
      alerts.push({
        id: `alert-warn-${s.teacherId}`,
        type: "approaching_threshold",
        severity: "warning",
        title: "إنذار اقتراب من نصاب الحسم الإداري",
        description: `المعلمة (${s.teacherName}) بلغت (${s.totalUnexcusedHours}) ساعة تأخر غير معذورة ومقتربة من عتبة الـ 7 ساعات الموجبة للحسم.`,
        teacherId: s.teacherId,
        teacherName: s.teacherName,
        actionLabel: "متابعة السجل",
        actionUrl: `/teachers?search=${encodeURIComponent(s.teacherName)}`,
        meta: {
          totalMinutes: s.totalUnexcusedMinutes,
          totalHours: s.totalUnexcusedHours,
        },
      });
    }
  }

  // 3. إفادات تأخر جديدة بانتظار قرار مديرة المدرسة
  const pendingDirectorNotices = delayNotices.filter(
    (n) => !n.isArchived && n.status === "pending_director"
  );
  for (const n of pendingDirectorNotices) {
    alerts.push({
      id: `alert-dir-${n.id}`,
      type: "pending_director",
      severity: "info",
      title: "إفادة تأخر بانتظار قرار المديرة",
      description: `تم استلام إفادة المعلمة (${n.teacherName || "معلمة"}) عن تنبيه تأخر يوم (${n.noticeDate || n.date || "—"}) وبانتظار اعتماد المديرة.`,
      teacherId: n.teacherId,
      teacherName: n.teacherName || "معلمة",
      date: n.noticeDate || n.date,
      actionLabel: "اتخاذ القرار الإداري",
      actionUrl: `/procedures/delay-notice`,
      meta: {
        noticeId: n.id,
      },
    });
  }

  // 4. مساءلات غياب تجاوزت مهلة الـ 48 ساعة دون رد من المعلمة
  const pendingInquiries = inquiries.filter(
    (inq) => !inq.isArchived && inq.status === "pending"
  );
  for (const inq of pendingInquiries) {
    if (inq.expiresAt && new Date(inq.expiresAt).getTime() < currentTime) {
      alerts.push({
        id: `alert-exp-inq-${inq.id}`,
        type: "expired_inquiry",
        severity: "warning",
        title: "مساءلة غياب تجاوزت المهلة المحددة (48 ساعة)",
        description: `المعلمة (${inq.teacherName}) لم تقدم إفادتها لمساءلة غياب تاريخ (${inq.absenceDate}) وانتهت مهلة الـ 48 ساعة النظامية.`,
        teacherId: inq.teacherId,
        teacherName: inq.teacherName,
        date: inq.absenceDate,
        actionLabel: "اعتماد كغياب بدون عذر",
        actionUrl: `/procedures/absence`,
        meta: {
          inquiryId: inq.id,
        },
      });
    }
  }

  // ترتيب التنبيهات حسب الأولوية: الحسم الفوري أولاً، ثم المهل المنتهية، ثم قرار المديرة، ثم الإنذارات
  const priorityOrder: Record<ProactiveAlertType, number> = {
    due_for_deduction: 1,
    expired_inquiry: 2,
    pending_director: 3,
    approaching_threshold: 4,
  };

  return alerts.sort((a, b) => priorityOrder[a.type] - priorityOrder[b.type]);
}

/**
 * حساب إحصائيات رادار المدرسة ومؤشرات الأداء لوكيلة المدرسة
 */
export function getSchoolRadarKPIs(params: {
  teachers: Teacher[];
  delayNotices: DelayNotice[];
  deductionDecisions: DeductionDecision[];
  inquiries?: AbsenceInquiry[];
  now?: Date | number;
}): SchoolRadarKPIs {
  const { teachers, delayNotices, deductionDecisions, inquiries = [], now } = params;
  const summaries = calculateSchoolDelaySummaries(
    teachers,
    delayNotices,
    deductionDecisions
  );

  const totalUnexcusedMinutes = summaries.reduce(
    (acc, curr) => acc + curr.totalUnexcusedMinutes,
    0
  );
  const totalUnexcusedHours =
    Math.round((totalUnexcusedMinutes / MINUTES_PER_HOUR) * 10) / 10;

  const teachersDueCount = summaries.filter(
    (s) => s.status === "due_for_deduction"
  ).length;

  const teachersWarningCount = summaries.filter(
    (s) => s.status === "warning"
  ).length;

  const activeDecisions = deductionDecisions.filter((d) => !d.isArchived);
  const decisionsIssuedCount = activeDecisions.length;
  const totalDeductionDaysIssued = activeDecisions.reduce(
    (acc, curr) => acc + (curr.deductionDays || 0),
    0
  );

  const pendingDirectorCount = delayNotices.filter(
    (n) => !n.isArchived && n.status === "pending_director"
  ).length;

  const currentTime = now ? new Date(now).getTime() : Date.now();
  const expiredInquiriesCount = inquiries.filter(
    (inq) =>
      !inq.isArchived &&
      inq.status === "pending" &&
      inq.expiresAt &&
      new Date(inq.expiresAt).getTime() < currentTime
  ).length;

  return {
    totalUnexcusedHours,
    totalUnexcusedMinutes,
    teachersDueCount,
    teachersWarningCount,
    decisionsIssuedCount,
    totalDeductionDaysIssued,
    pendingDirectorCount,
    expiredInquiriesCount,
  };
}
