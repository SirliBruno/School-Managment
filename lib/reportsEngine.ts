import {
  Teacher,
  AbsenceRecord,
  DelayNotice,
  DeductionDecision,
} from "@/types/teacher";
import { ReportType, ReportFilterOptions } from "@/types/report";
import { PdfReportPayload } from "@/lib/reportPdfService";
import { getSaudiToday } from "@/lib/timeUtils";

export interface ReportGeneratedData {
  payload: PdfReportPayload;
  rawRowsCount: number;
  summaryHighlights: { label: string; value: string | number }[];
}

export function filterByDateRange(
  dateStr: string | undefined,
  startDate?: string,
  endDate?: string,
  month?: string,
  year?: string
): boolean {
  if (!dateStr) return false;
  const d = dateStr.includes(" ") ? dateStr.split(" ")[0] : dateStr;

  if (startDate && d < startDate) return false;
  if (endDate && d > endDate) return false;

  if (month && month !== "all") {
    const parts = d.split("-");
    if (parts.length >= 2 && parts[1] !== month.padStart(2, "0")) {
      return false;
    }
  }

  if (year && year !== "all") {
    const parts = d.split("-");
    if (parts.length >= 1 && parts[0] !== year) {
      return false;
    }
  }

  return true;
}

export function generateReportData(
  reportType: ReportType,
  filters: ReportFilterOptions,
  teachers: Teacher[],
  absenceRecords: AbsenceRecord[],
  delayNotices: DelayNotice[],
  deductionDecisions: DeductionDecision[],
  creatorName: string = "وكيلة الشؤون التعليمية"
): ReportGeneratedData {
  const saudiToday = getSaudiToday();
  const schoolName = "الثانوية الخامسة مسارات";
  const principalName = "منى محمد الغامدي";

  // Filter teachers map
  const teachersMap = new Map<string, Teacher>();
  teachers.forEach((t) => teachersMap.set(t.id, t));

  // Determine period text
  let periodText = "كامل السجلات المتاحة";
  if (filters.startDate && filters.endDate) {
    periodText = `من ${filters.startDate} إلى ${filters.endDate}`;
  } else if (filters.month && filters.month !== "all") {
    periodText = `شهر ${filters.month} لسنة ${filters.year || "الحالية"}`;
  }

  // 1. تقرير حصر الغياب الشهري / خلال فترة
  if (reportType === "absence_summary" || reportType === "custom_period") {
    let filteredAbsences = absenceRecords.filter((rec) => {
      if (
        !filterByDateRange(
          rec.date,
          filters.startDate,
          filters.endDate,
          filters.month,
          filters.year
        )
      ) {
        return false;
      }

      if (filters.teacherId && filters.teacherId !== "all" && rec.teacherId !== filters.teacherId) {
        return false;
      }

      const t = teachersMap.get(rec.teacherId);
      if (filters.specialty && filters.specialty !== "all" && t?.specialty !== filters.specialty) {
        return false;
      }
      if (
        filters.employmentStatus &&
        filters.employmentStatus !== "all" &&
        t?.employmentStatus !== filters.employmentStatus
      ) {
        return false;
      }

      return true;
    });

    // Counts
    const totalAbsenceDays = filteredAbsences.length;
    const uniqueTeachersCount = new Set(filteredAbsences.map((a) => a.teacherId)).size;

    // Most common absence type
    const typeCounts: Record<string, number> = {};
    filteredAbsences.forEach((a) => {
      const type = a.type || "غير محدد";
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    let topType = "لا يوجد";
    let topCount = 0;
    Object.entries(typeCounts).forEach(([t, c]) => {
      if (c > topCount) {
        topCount = c;
        topType = `${t} (${c})`;
      }
    });

    const summaryCards = [
      { label: "إجمالي أيام الغياب", value: `${totalAbsenceDays} يوم` },
      { label: "عدد المعلمات المتغيبات", value: `${uniqueTeachersCount} معلمة` },
      { label: "أكثر أنواع الغياب", value: topType },
    ];

    const tableHeaders = [
      "#",
      "اسم المعلمة",
      "التخصص",
      "التاريخ",
      "نوع الغياب",
      "سبب الغياب",
      "ملاحظات الإدارة",
    ];

    const tableRows = filteredAbsences.map((rec, idx) => {
      const t = teachersMap.get(rec.teacherId);
      return [
        idx + 1,
        rec.teacherName || t?.fullName || "غير محدد",
        t?.specialty || rec.specialty || "عام",
        rec.date,
        rec.type || "مرضي",
        rec.reason || "—",
        rec.notes || "—",
      ];
    });

    return {
      payload: {
        reportTitle: "تقرير حصر غياب المعلمات الرسمي",
        reportCode: "تق-غ-٠١",
        schoolName,
        principalName,
        creatorName,
        dateFormatted: saudiToday,
        periodText,
        summaryCards,
        tableHeaders,
        tableRows,
      },
      rawRowsCount: filteredAbsences.length,
      summaryHighlights: [
        { label: "إجمالي الغياب", value: totalAbsenceDays },
        { label: "المعلمات", value: uniqueTeachersCount },
      ],
    };
  }

  // 2. تقرير سجل معلمة تفصيلي
  if (reportType === "teacher_detailed_record") {
    const selectedTeacherId = filters.teacherId;
    const teacher =
      teachers.find((t) => t.id === selectedTeacherId) || teachers[0];

    const teacherAbsences = absenceRecords.filter(
      (a) => a.teacherId === teacher?.id
    );
    const teacherDelays = delayNotices.filter(
      (d) => d.teacherId === teacher?.id
    );
    const teacherDeductions = deductionDecisions.filter(
      (dd) => dd.teacherId === teacher?.id
    );

    const totalMinutes = teacherDelays.reduce(
      (acc, curr) => acc + (curr.calculatedMinutes || 0),
      0
    );
    const totalDeductionDays = teacherDeductions.reduce(
      (acc, curr) => acc + (curr.deductionDays || 0),
      0
    );

    const summaryCards = [
      { label: "إجمالي الغياب", value: `${teacherAbsences.length} يوم` },
      {
        label: "إجمالي دقائق التأخر",
        value: `${totalMinutes} دقيقة (${(totalMinutes / 60).toFixed(1)} س)`,
      },
      { label: "قرارات الحسم", value: `${teacherDeductions.length} قرار` },
      { label: "أيام الحسم المعتمدة", value: `${totalDeductionDays} يوم` },
    ];

    const tableHeaders = ["#", "البيان / الإجراء", "التاريخ", "التفاصيل والنوع", "الحالة / القرار"];

    const combinedRows: (string | number)[][] = [];

    teacherAbsences.forEach((a, idx) => {
      combinedRows.push([
        idx + 1,
        "غياب",
        a.date,
        `${a.type}: ${a.reason || "بدون عذر"}`,
        a.notes || "مسجل",
      ]);
    });

    teacherDelays.forEach((d, idx) => {
      const decisionStr =
        d.directorOpinion === "accepted"
          ? "عذر مقبول"
          : d.directorOpinion === "rejected_with_deduction"
          ? "مرفوض - يحسم"
          : "قيد المتابعة";

      combinedRows.push([
        teacherAbsences.length + idx + 1,
        "تأخر / انصراف",
        d.noticeDate || d.createdAt?.slice(0, 10) || "—",
        `${d.calculatedMinutes || 0} دقيقة (${d.calculatedDuration || "—"})`,
        decisionStr,
      ]);
    });

    teacherDeductions.forEach((dd, idx) => {
      combinedRows.push([
        teacherAbsences.length + teacherDelays.length + idx + 1,
        `قرار حسم (#${dd.decisionNumber})`,
        dd.decisionDate,
        `حسم ${dd.deductionDays} يوم مقابل تأخر ${dd.delayHours} س`,
        "معتمد إدارياً",
      ]);
    });

    return {
      payload: {
        reportTitle: `سجل الحصر الإداري للمعلمة: ${teacher?.fullName || ""}`,
        reportCode: "تق-معلم-٠٤",
        schoolName,
        principalName,
        creatorName,
        dateFormatted: saudiToday,
        periodText: "السجل التراكمي الشامل",
        teacherDetailsCard: {
          name: teacher?.fullName || "—",
          nationalId: teacher?.nationalId || "—",
          specialty: teacher?.specialty || "—",
          jobTitle: teacher?.jobTitle || "معلمة",
        },
        summaryCards,
        tableHeaders,
        tableRows: combinedRows,
      },
      rawRowsCount: combinedRows.length,
      summaryHighlights: [
        { label: "الغيابات", value: teacherAbsences.length },
        { label: "الدقائق", value: totalMinutes },
        { label: "أيام الحسم", value: totalDeductionDays },
      ],
    };
  }

  // 3. تقرير حصر التأخر والانصراف المبكر
  if (reportType === "delay_departure_summary") {
    const filteredDelays = delayNotices.filter((notice) => {
      const noticeDate = notice.noticeDate || notice.createdAt?.slice(0, 10);
      if (
        !filterByDateRange(
          noticeDate,
          filters.startDate,
          filters.endDate,
          filters.month,
          filters.year
        )
      ) {
        return false;
      }

      if (filters.teacherId && filters.teacherId !== "all" && notice.teacherId !== filters.teacherId) {
        return false;
      }

      if (filters.status && filters.status !== "all" && notice.status !== filters.status) {
        return false;
      }

      return true;
    });

    const totalMinutes = filteredDelays.reduce(
      (acc, curr) => acc + (curr.calculatedMinutes || 0),
      0
    );
    const uniqueTeachers = new Set(filteredDelays.map((d) => d.teacherId)).size;
    const completedCount = filteredDelays.filter(
      (d) => d.status === "completed"
    ).length;

    const summaryCards = [
      { label: "إجمالي التنبيهات", value: `${filteredDelays.length} تنبيه` },
      {
        label: "إجمالي الدقائق",
        value: `${totalMinutes} د (${(totalMinutes / 60).toFixed(1)} ساعة)`,
      },
      { label: "المعلمات المسجلات", value: `${uniqueTeachers} معلمة` },
      { label: "تنبيهات مكتملة", value: `${completedCount} تنبيه` },
    ];

    const tableHeaders = [
      "#",
      "اسم المعلمة",
      "التاريخ",
      "نوع المخالفة",
      "المدة المحتسبة",
      "حالة الإجراء",
      "قرار المديرة",
    ];

    const tableRows = filteredDelays.map((notice, idx) => {
      const t = teachersMap.get(notice.teacherId);
      let violationDesc = [];
      if (notice.violationDelayStart) violationDesc.push("تأخر صباحي");
      if (notice.violationEarlyDeparture) violationDesc.push("خروج مبكر");
      if (notice.violationAbsentDuring) violationDesc.push("خروج أثناء الدوام");
      if (notice.violationLeftSchool) violationDesc.push("انصراف من غير المدرسة");

      const decisionStr =
        notice.directorOpinion === "accepted"
          ? "عذر مقبول"
          : notice.directorOpinion === "rejected_with_deduction"
          ? "مرفوض - يحسم"
          : "بانتظار القرار";

      const statusMap: Record<string, string> = {
        pending_teacher: "بانتظار رد المعلمة",
        pending_director: "بانتظار قرار المديرة",
        completed: "مكتمل وموثق",
      };

      return [
        idx + 1,
        notice.teacherName || t?.fullName || "—",
        notice.noticeDate || notice.createdAt?.slice(0, 10) || "—",
        violationDesc.join(" + ") || "تأخر رسمي",
        `${notice.calculatedMinutes || 0} دقيقة`,
        statusMap[notice.status] || notice.status,
        decisionStr,
      ];
    });

    return {
      payload: {
        reportTitle: "تقرير حصر التأخر والانصراف المبكر",
        reportCode: "تق-تأخر-٠٢",
        schoolName,
        principalName,
        creatorName,
        dateFormatted: saudiToday,
        periodText,
        summaryCards,
        tableHeaders,
        tableRows,
      },
      rawRowsCount: filteredDelays.length,
      summaryHighlights: [
        { label: "التنبيهات", value: filteredDelays.length },
        { label: "إجمالي الساعات", value: (totalMinutes / 60).toFixed(1) },
      ],
    };
  }

  // 4. تقرير قرارات الحسم
  if (reportType === "deduction_decisions_summary") {
    const filteredDecisions = deductionDecisions.filter((dec) => {
      if (
        !filterByDateRange(
          dec.decisionDate,
          filters.startDate,
          filters.endDate,
          filters.month,
          filters.year
        )
      ) {
        return false;
      }

      if (filters.teacherId && filters.teacherId !== "all" && dec.teacherId !== filters.teacherId) {
        return false;
      }

      return true;
    });

    const totalDays = filteredDecisions.reduce(
      (acc, curr) => acc + (curr.deductionDays || 0),
      0
    );
    const totalHours = filteredDecisions.reduce(
      (acc, curr) => acc + (curr.delayHours || 0),
      0
    );

    const summaryCards = [
      { label: "إجمالي القرارات", value: `${filteredDecisions.length} قرار` },
      { label: "إجمالي أيام الحسم", value: `${totalDays} يوم` },
      { label: "إجمالي ساعات التأخر المحسومة", value: `${totalHours} ساعة` },
    ];

    const tableHeaders = [
      "#",
      "رقم القرار",
      "تاريخ القرار",
      "اسم المعلمة",
      "رقم السجل المدني",
      "ساعات التأخر",
      "أيام الحسم",
      "الدقائق المتبقية",
    ];

    const tableRows = filteredDecisions.map((dec, idx) => [
      idx + 1,
      dec.decisionNumber || `ق-${idx + 1}`,
      dec.decisionDate,
      dec.teacherName,
      dec.civilId || "—",
      `${dec.delayHours} س`,
      `${dec.deductionDays} يوم`,
      `${dec.remainderMinutes || 0} د`,
    ]);

    return {
      payload: {
        reportTitle: "سجل حصر قرارات حسم ساعات التأخر",
        reportCode: "تق-حسم-٠٣",
        schoolName,
        principalName,
        creatorName,
        dateFormatted: saudiToday,
        periodText,
        summaryCards,
        tableHeaders,
        tableRows,
      },
      rawRowsCount: filteredDecisions.length,
      summaryHighlights: [
        { label: "القرارات", value: filteredDecisions.length },
        { label: "أيام الحسم", value: totalDays },
      ],
    };
  }

  // 5. التقرير الشامل للمدرسة (School Administrative Summary)
  const totalAbsences = absenceRecords.length;
  const totalDelays = delayNotices.length;
  const totalDeductions = deductionDecisions.length;
  const totalDeductionDays = deductionDecisions.reduce(
    (acc, c) => acc + (c.deductionDays || 0),
    0
  );
  const totalDelayMinutes = delayNotices.reduce(
    (acc, c) => acc + (c.calculatedMinutes || 0),
    0
  );

  const summaryCards = [
    { label: "هيئة التدريس", value: `${teachers.length} معلمة` },
    { label: "إجمالي الغيابات", value: `${totalAbsences} حالة` },
    {
      label: "إجمالي التأخر",
      value: `${(totalDelayMinutes / 60).toFixed(1)} ساعة`,
    },
    {
      label: "قرارات الحسم",
      value: `${totalDeductions} قرار (${totalDeductionDays} يوم)`,
    },
  ];

  const tableHeaders = [
    "#",
    "اسم المعلمة",
    "التخصص",
    "أيام الغياب",
    "تنبيهات التأخر",
    "دقائق التأخر",
    "قرارات الحسم",
    "الحالة العامة",
  ];

  const tableRows = teachers.map((teacher, idx) => {
    const tAbsences = absenceRecords.filter((a) => a.teacherId === teacher.id).length;
    const tDelays = delayNotices.filter((d) => d.teacherId === teacher.id);
    const tDelayMinutes = tDelays.reduce(
      (acc, c) => acc + (c.calculatedMinutes || 0),
      0
    );
    const tDeductions = deductionDecisions.filter(
      (dd) => dd.teacherId === teacher.id
    ).length;

    let healthStatus = "منتظم ومثالي";
    if (tDeductions > 0 || tAbsences >= 5 || tDelayMinutes >= 420) {
      healthStatus = "حرج - تجاوز النصاب";
    } else if (tAbsences >= 2 || tDelayMinutes >= 180) {
      healthStatus = "تنبيه إداري";
    }

    return [
      idx + 1,
      teacher.fullName,
      teacher.specialty || "عام",
      tAbsences,
      tDelays.length,
      `${tDelayMinutes} د`,
      tDeductions,
      healthStatus,
    ];
  });

  return {
    payload: {
      reportTitle: "التقرير الإداري الشامل لسجلات المدرسة",
      reportCode: "تق-شامل-٠٥",
      schoolName,
      principalName,
      creatorName,
      dateFormatted: saudiToday,
      periodText: "العام الدراسي الحالي 1447 / 1448 هـ",
      summaryCards,
      tableHeaders,
      tableRows,
    },
    rawRowsCount: teachers.length,
    summaryHighlights: [
      { label: "المعلمات", value: teachers.length },
      { label: "الغيابات", value: totalAbsences },
      { label: "قرارات الحسم", value: totalDeductions },
    ],
  };
}
