import {
  Teacher,
  AbsenceRecord,
  DelayNotice,
  DeductionDecision,
  EmployeePermission,
} from "@/types/teacher";
import { ReportType, ReportFilterOptions } from "@/types/report";
import { PdfReportPayload } from "@/lib/reportPdfService";
import { getSaudiToday } from "@/lib/timeUtils";
import {
  getTeacherDelaySummary,
  calculateNoticeDurationMinutes,
  getAllSettledNoticeIds,
} from "@/lib/delayDeductionIntegration";
import { MINUTES_PER_WORK_DAY, MINUTES_PER_HOUR } from "@/lib/deductionCalculator";

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
  creatorName: string = "أحلام صالح الضبيبي",
  permissions: EmployeePermission[] = []
): ReportGeneratedData {
  const saudiToday = getSaudiToday();
  const schoolName = "الثانوية الخامسة مسارات";
  const principalName = "منى محمد الغامدي";

  // استبعاد المعلمات والسجلات المؤرشفة لضمان دقة البيانات 100%
  const activeTeachers = teachers.filter((t) => !t.isArchived);
  const activeAbsences = absenceRecords.filter((a) => !a.isArchived);
  const activeDelays = delayNotices.filter((d) => !d.isArchived);
  const activeDeductions = deductionDecisions.filter((dd) => !dd.isArchived);
  const activePermissions = permissions.filter((p) => !p.isArchived);

  // الخريطة المرجعية للمعلمات النشطات
  const teachersMap = new Map<string, Teacher>();
  activeTeachers.forEach((t) => teachersMap.set(t.id, t));

  // Determine period text
  let periodText = "كامل السجلات المتاحة";
  if (filters.startDate && filters.endDate) {
    periodText = `من ${filters.startDate} إلى ${filters.endDate}`;
  } else if (filters.month && filters.month !== "all") {
    periodText = `شهر ${filters.month} لسنة ${filters.year || "الحالية"}`;
  }

  // 1. تقرير حصر الغياب الشهري / خلال فترة
  if (reportType === "absence_summary" || reportType === "custom_period") {
    const filteredAbsences = activeAbsences.filter((rec) => {
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

    const totalAbsenceDays = filteredAbsences.length;
    const uniqueTeachersCount = new Set(filteredAbsences.map((a) => a.teacherId)).size;

    // الأكثر تكراراً
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
      { label: "إجمالي الغيابات", value: `${totalAbsenceDays} يوم` },
      { label: "عدد المعلمات", value: `${uniqueTeachersCount} معلمة` },
      { label: "أكثر أنواع الغياب", value: topType },
    ];

    const tableHeaders = [
      "#",
      "اسم المعلمة",
      "التخصص",
      "عدد أيام الغياب",
      "نوع الغياب",
      "التواريخ",
      "حالة العذر",
      "الملاحظات",
    ];

    const tableRows = filteredAbsences.map((rec, idx) => {
      const t = teachersMap.get(rec.teacherId);
      const excuseState = rec.reason ? "عذر مقدم" : "غياب غير مبرر";
      return [
        idx + 1,
        rec.teacherName || t?.fullName || "غير محدد",
        t?.specialty || rec.specialty || "عام",
        1,
        rec.type || "مرضي",
        rec.date,
        excuseState,
        rec.notes || rec.reason || "—",
      ];
    });

    return {
      payload: {
        reportTitle: "تقرير حصر غياب المعلمات خلال فترة",
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
        { label: "إجمالي الغيابات", value: totalAbsenceDays },
        { label: "عدد المعلمات", value: uniqueTeachersCount },
        { label: "النوع الشائع", value: topType },
      ],
    };
  }

  // 2. سجل المعلمة التفصيلي
  if (reportType === "teacher_detailed_record") {
    const selectedTeacherId = filters.teacherId;
    const teacher =
      activeTeachers.find((t) => t.id === selectedTeacherId) || activeTeachers[0];

    const teacherAbsences = activeAbsences.filter(
      (a) => a.teacherId === teacher?.id
    );
    const teacherDelays = activeDelays.filter(
      (d) => d.teacherId === teacher?.id
    );
    const teacherDeductions = activeDeductions.filter(
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
      { label: "إجمالي أيام الحسم", value: `${totalDeductionDays} يوم` },
    ];

    const tableHeaders = [
      "#",
      "القسم الإداري",
      "التاريخ",
      "البيان والتفاصيل",
      "المرفقات / المدة",
      "حالة الاعتماد / القرار",
    ];

    const combinedRows: (string | number)[][] = [];

    // قسم الغياب
    teacherAbsences.forEach((a, idx) => {
      combinedRows.push([
        idx + 1,
        "الغياب",
        a.date,
        `${a.type}: ${a.reason || "بدون عذر"}`,
        a.attachmentUrl ? "مرفق تقرير معتمد" : "لا يوجد مرفق",
        a.notes ? `معتمد (${a.notes})` : "مسجل في المنظومة",
      ]);
    });

    // قسم التأخر
    teacherDelays.forEach((d, idx) => {
      let violationDesc = [];
      if (d.violationDelayStart) violationDesc.push("تأخر صباحي");
      if (d.violationEarlyDeparture) violationDesc.push("خروج مبكر");
      if (d.violationAbsentDuring) violationDesc.push("خروج أثناء الدوام");
      if (d.violationLeftSchool) violationDesc.push("انصراف من غير المدرسة");

      const decisionStr =
        d.directorOpinion === "accepted"
          ? "عذر مقبول"
          : d.directorOpinion === "rejected_with_deduction"
          ? "مرفوض - يحسم"
          : "بانتظار قرار المديرة";

      combinedRows.push([
        teacherAbsences.length + idx + 1,
        "التأخر والانصراف",
        d.noticeDate || d.createdAt?.slice(0, 10) || "—",
        violationDesc.join(" + ") || "تأخر رسمي",
        `${d.calculatedMinutes || 0} دقيقة`,
        decisionStr,
      ]);
    });

    // قسم الحسم
    teacherDeductions.forEach((dd, idx) => {
      combinedRows.push([
        teacherAbsences.length + teacherDelays.length + idx + 1,
        "قرارات الحسم",
        dd.decisionDate,
        `قرار رقم #${dd.decisionNumber} (تأخر ${dd.delayHours} س)`,
        `مرحل: ${dd.remainderMinutes || 0} د`,
        `حسم ${dd.deductionDays} يوم معتمد`,
      ]);
    });

    return {
      payload: {
        reportTitle: `سجل معلمة تفصيلي: ${teacher?.fullName || ""}`,
        reportCode: "تق-معلمة-٠٤",
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
        { label: "إجمالي الغياب", value: teacherAbsences.length },
        { label: "دقائق التأخر", value: totalMinutes },
        { label: "أيام الحسم", value: totalDeductionDays },
      ],
    };
  }

  // 3. تقرير حصر التأخر والانصراف المبكر (Summary Report for Teachers)
  if (reportType === "delay_departure_summary") {
    // حساب ملخصات التأخر الدقيقة لكل معلمة بالاعتماد على محرك الحسم والتكامل
    const teachersSummaryList = activeTeachers
      .filter((t) => {
        if (filters.teacherId && filters.teacherId !== "all" && t.id !== filters.teacherId) {
          return false;
        }
        if (filters.specialty && filters.specialty !== "all" && t.specialty !== filters.specialty) {
          return false;
        }
        if (
          filters.employmentStatus &&
          filters.employmentStatus !== "all" &&
          t.employmentStatus !== filters.employmentStatus
        ) {
          return false;
        }
        return true;
      })
      .map((t) => {
        // فحص التنبيهات المرتبطة بالفترة الزمنية المحددة
        const tNotices = activeDelays.filter((n) => {
          if (n.teacherId !== t.id) return false;
          const noticeDate = n.noticeDate || n.createdAt?.slice(0, 10);
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
          if (filters.status && filters.status !== "all" && n.status !== filters.status) {
            return false;
          }
          return true;
        });

        // الحصول على الملخص المالي والحسم الرسمي المتوافق مع محرك 420 دقيقة
        const summary = getTeacherDelaySummary(t, tNotices, activeDeductions);

        const totalMins = tNotices.reduce(
          (acc, c) => acc + calculateNoticeDurationMinutes(c),
          0
        );
        const totalHours = Math.round((totalMins / MINUTES_PER_HOUR) * 10) / 10;
        const reachedDeduction = summary.status === "due_for_deduction";

        let colorGrade = "طبيعي (Normal)";
        if (summary.status === "due_for_deduction") {
          colorGrade = "حرج (Critical)";
        } else if (summary.status === "warning") {
          colorGrade = "تحذير (Warning)";
        }

        return {
          teacher: t,
          noticesCount: tNotices.length,
          totalMinutes: totalMins,
          totalHours,
          unsettledMinutes: summary.totalUnexcusedMinutes,
          reachedDeduction,
          statusLabel: colorGrade,
          statusCode: summary.status,
        };
      })
      .filter((row) => row.noticesCount > 0); // إظهار المعلمات اللاتي لديهن تأخر فقط

    const totalDelays = teachersSummaryList.reduce((acc, c) => acc + c.noticesCount, 0);
    const sumAllMinutes = teachersSummaryList.reduce((acc, c) => acc + c.totalMinutes, 0);
    const criticalCount = teachersSummaryList.filter((r) => r.statusCode === "due_for_deduction").length;
    const warningCount = teachersSummaryList.filter((r) => r.statusCode === "warning").length;

    const summaryCards = [
      { label: "المعلمات المتأخرات", value: `${teachersSummaryList.length} معلمة` },
      { label: "إجمالي التنبيهات", value: `${totalDelays} تنبيه` },
      {
        label: "إجمالي الساعات",
        value: `${(sumAllMinutes / 60).toFixed(1)} س (${sumAllMinutes} د)`,
      },
      { label: "حالات بلغت الحسم (حرجة)", value: `${criticalCount} حالة` },
    ];

    const tableHeaders = [
      "#",
      "اسم المعلمة",
      "عدد التنبيهات",
      "إجمالي الدقائق",
      "إجمالي الساعات",
      "حالة الرصيد والتسوية",
      "هل وصلت للحسم؟",
    ];

    const tableRows = teachersSummaryList.map((row, idx) => [
      idx + 1,
      row.teacher.fullName,
      row.noticesCount,
      `${row.totalMinutes} دقيقة`,
      `${row.totalHours} ساعة`,
      row.statusLabel,
      row.reachedDeduction ? "نعم (تجاوزت 420 دقيقة)" : "لا",
    ]);

    return {
      payload: {
        reportTitle: "تقرير التأخر والانصراف المبكر (ملخص الأرصدة والحسم)",
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
      rawRowsCount: teachersSummaryList.length,
      summaryHighlights: [
        { label: "المعلمات", value: teachersSummaryList.length },
        { label: "التنبيهات", value: totalDelays },
        { label: "حالات الحسم", value: criticalCount },
      ],
    };
  }

  // 4. تقرير قرارات الحسم (Deduction Decisions Report)
  if (reportType === "deduction_decisions_summary") {
    const filteredDecisions = activeDeductions.filter((dec) => {
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
      "التاريخ",
      "اسم المعلمة",
      "الهوية",
      "سبب القرار",
      "إجمالي دقائق التأخر",
      "أيام الحسم",
      "الدقائق المرحلة",
      "حالة القرار",
    ];

    const tableRows = filteredDecisions.map((dec, idx) => {
      const totalMins = (dec.delayHours || 0) * 60 + (dec.delayMinutes || 0);
      return [
        idx + 1,
        dec.decisionNumber || `ق-${idx + 1}`,
        dec.decisionDate,
        dec.teacherName,
        dec.civilId || "—",
        "بلوغ نصاب ساعات التأخر (المادة 21)",
        `${totalMins} د (${dec.delayHours} س)`,
        `${dec.deductionDays} يوم`,
        `${dec.remainderMinutes || 0} د`,
        "معتمد رسمياً",
      ];
    });

    return {
      payload: {
        reportTitle: "تقرير قرارات الحسم الرسمية (نموذج رقم 19)",
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
        { label: "إجمالي القرارات", value: filteredDecisions.length },
        { label: "أيام الحسم", value: totalDays },
      ],
    };
  }

  // 5. تقرير حصر سجل استئذان الموظفين (سجل استئذان الشهر / الفترة)
  if (reportType === "permissions_summary") {
    const filteredPermissions = activePermissions.filter((p) => {
      if (
        !filterByDateRange(
          p.permissionDate,
          filters.startDate,
          filters.endDate,
          filters.month,
          filters.year
        )
      ) {
        return false;
      }

      if (filters.teacherId && filters.teacherId !== "all" && p.teacherId !== filters.teacherId) {
        return false;
      }

      const teacher = teachersMap.get(p.teacherId);
      if (filters.specialty && filters.specialty !== "all" && teacher?.specialty !== filters.specialty) {
        return false;
      }

      if (
        filters.employmentStatus &&
        filters.employmentStatus !== "all" &&
        teacher?.employmentStatus !== filters.employmentStatus
      ) {
        return false;
      }

      return true;
    });

    const totalMinutes = filteredPermissions.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
    const uniqueTeachersCount = new Set(filteredPermissions.map((p) => p.teacherId)).size;
    const avgMinutes = filteredPermissions.length > 0 ? Math.round(totalMinutes / filteredPermissions.length) : 0;

    const summaryCards = [
      { label: "إجمالي الاستئذانات", value: `${filteredPermissions.length} حالة` },
      { label: "الموظفات المستأذنات", value: `${uniqueTeachersCount} موظفة` },
      { label: "إجمالي دقائق الاستئذان", value: `${totalMinutes} دقيقة` },
      { label: "متوسط مدة الاستئذان", value: `${avgMinutes} دقيقة` },
    ];

    const tableHeaders = [
      "م",
      "اسم الموظفة",
      "السجل المدني",
      "التخصص",
      "التاريخ",
      "وقت الخروج",
      "وقت العودة",
      "المدة",
      "مبررات الخروج",
      "ملاحظات",
    ];

    const tableRows = filteredPermissions.map((p, idx) => {
      const teacher = teachersMap.get(p.teacherId);
      return [
        idx + 1,
        teacher?.fullName || p.teacherName || "—",
        teacher?.nationalId || p.nationalId || "—",
        teacher?.specialty || p.specialty || "—",
        p.permissionDate,
        p.exitTime,
        p.returnTime,
        `${p.durationMinutes} دقيقة`,
        p.reason,
        p.notes || "—",
      ];
    });

    return {
      payload: {
        reportTitle: "سجل حصر استئذان الموظفين الرسمي",
        reportCode: "تق-استئذان-٠١",
        schoolName,
        principalName,
        creatorName,
        dateFormatted: saudiToday,
        periodText,
        summaryCards,
        tableHeaders,
        tableRows,
      },
      rawRowsCount: filteredPermissions.length,
      summaryHighlights: [
        { label: "إجمالي الاستئذانات", value: filteredPermissions.length },
        { label: "إجمالي الدقائق", value: totalMinutes },
        { label: "الموظفات المستأذنات", value: uniqueTeachersCount },
      ],
    };
  }

  // 6. سجل استئذان موظفة فردي مفصل (سجل استئذان معلمة محددة)
  if (reportType === "teacher_permissions_record") {
    const targetTeacherId = filters.teacherId && filters.teacherId !== "all"
      ? filters.teacherId
      : activeTeachers[0]?.id || "";

    const teacher = teachersMap.get(targetTeacherId);
    const teacherPerms = activePermissions
      .filter((p) => p.teacherId === targetTeacherId)
      .filter((p) =>
        filterByDateRange(
          p.permissionDate,
          filters.startDate,
          filters.endDate,
          filters.month,
          filters.year
        )
      );

    const totalMinutes = teacherPerms.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
    const avgMinutes = teacherPerms.length > 0 ? Math.round(totalMinutes / teacherPerms.length) : 0;

    const summaryCards = [
      { label: "عدد مرات الاستئذان", value: `${teacherPerms.length} مرة` },
      { label: "إجمالي الدقائق", value: `${totalMinutes} دقيقة` },
      { label: "ما يعادل بالساعات", value: `${(totalMinutes / 60).toFixed(1)} ساعة` },
      { label: "متوسط مدة الخروج", value: `${avgMinutes} دقيقة` },
    ];

    const tableHeaders = [
      "م",
      "التاريخ",
      "اليوم",
      "زمن الخروج",
      "زمن العودة",
      "مدة الاستئذان",
      "مبررات الخروج",
      "التوقيع",
      "ملاحظات",
    ];

    const tableRows = teacherPerms.map((p, idx) => {
      let dayName = "—";
      try {
        dayName = new Date(p.permissionDate).toLocaleDateString("ar-SA", { weekday: "long" });
      } catch {}
      return [
        idx + 1,
        p.permissionDate,
        dayName,
        p.exitTime,
        p.returnTime,
        `${p.durationMinutes} دقيقة`,
        p.reason,
        "معتمد إلكترونياً",
        p.notes || "—",
      ];
    });

    return {
      payload: {
        reportTitle: `سجل استئذان الموظفة: ${teacher?.fullName || "—"}`,
        reportCode: "تق-استئذان-فردي-٠٢",
        schoolName,
        principalName,
        creatorName,
        dateFormatted: saudiToday,
        periodText,
        teacherDetailsCard: teacher
          ? {
              name: teacher.fullName,
              nationalId: teacher.nationalId || "—",
              specialty: teacher.specialty || "—",
              jobTitle: teacher.jobTitle || "معلم",
            }
          : undefined,
        summaryCards,
        tableHeaders,
        tableRows,
      },
      rawRowsCount: teacherPerms.length,
      summaryHighlights: [
        { label: "مرات الاستئذان", value: teacherPerms.length },
        { label: "إجمالي الدقائق", value: totalMinutes },
      ],
    };
  }

  // 7. تقرير إحصائي تحليلي للاستئذان (أكثر الموظفات استئذاناً ومتوسط المدد)
  if (reportType === "permissions_statistics") {
    const filteredPermissions = activePermissions.filter((p) =>
      filterByDateRange(
        p.permissionDate,
        filters.startDate,
        filters.endDate,
        filters.month,
        filters.year
      )
    );

    const totalMinutes = filteredPermissions.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
    const totalCases = filteredPermissions.length;
    const avgMinutes = totalCases > 0 ? Math.round(totalMinutes / totalCases) : 0;

    // Group by teacher
    const teacherStatsMap = new Map<string, { count: number; minutes: number }>();
    filteredPermissions.forEach((p) => {
      const existing = teacherStatsMap.get(p.teacherId) || { count: 0, minutes: 0 };
      teacherStatsMap.set(p.teacherId, {
        count: existing.count + 1,
        minutes: existing.minutes + p.durationMinutes,
      });
    });

    const sortedStats = Array.from(teacherStatsMap.entries())
      .map(([teacherId, stat]) => ({
        teacher: teachersMap.get(teacherId),
        ...stat,
      }))
      .sort((a, b) => b.minutes - a.minutes);

    const summaryCards = [
      { label: "إجمالي الحالات", value: `${totalCases} استئذان` },
      { label: "إجمالي الدقائق", value: `${totalMinutes} دقيقة` },
      { label: "الموظفات المستفيدات", value: `${sortedStats.length} موظفة` },
      { label: "متوسط مدة الاستئذان", value: `${avgMinutes} دقيقة` },
    ];

    const tableHeaders = [
      "م",
      "اسم الموظفة",
      "السجل المدني",
      "التخصص",
      "عدد الاستئذانات",
      "إجمالي الدقائق",
      "ما يعادل بالساعات",
      "متوسط المدة لكل خروج",
      "مستوى المؤشر",
    ];

    const tableRows = sortedStats.map((item, idx) => {
      const avg = Math.round(item.minutes / item.count);
      let level = "طبيعي";
      if (item.minutes >= 300 || item.count >= 5) {
        level = "مرتفع جداً";
      } else if (item.minutes >= 180 || item.count >= 3) {
        level = "متوسط";
      }

      return [
        idx + 1,
        item.teacher?.fullName || "—",
        item.teacher?.nationalId || "—",
        item.teacher?.specialty || "—",
        `${item.count} مرات`,
        `${item.minutes} دقيقة`,
        `${(item.minutes / 60).toFixed(1)} س`,
        `${avg} دقيقة`,
        level,
      ];
    });

    return {
      payload: {
        reportTitle: "التقرير التحليلي والإحصائي لاستئذان الموظفين",
        reportCode: "تق-استئذان-تحليلي-٠٣",
        schoolName,
        principalName,
        creatorName,
        dateFormatted: saudiToday,
        periodText,
        summaryCards,
        tableHeaders,
        tableRows,
      },
      rawRowsCount: sortedStats.length,
      summaryHighlights: [
        { label: "الحالات الموثقة", value: totalCases },
        { label: "إجمالي الدقائق", value: totalMinutes },
        { label: "الموظفات المستأذنات", value: sortedStats.length },
      ],
    };
  }

  // 5. التقرير الشامل للمدرسة (School Administrative Summary)
  const totalAbsences = activeAbsences.length;
  const totalDelays = activeDelays.length;
  const totalDeductions = activeDeductions.length;
  const totalDeductionDays = activeDeductions.reduce(
    (acc, c) => acc + (c.deductionDays || 0),
    0
  );
  const totalDelayMinutes = activeDelays.reduce(
    (acc, c) => acc + (c.calculatedMinutes || 0),
    0
  );

  const summaryCards = [
    { label: "عدد المعلمات", value: `${activeTeachers.length} معلمة` },
    { label: "إجمالي الغياب", value: `${totalAbsences} يوم` },
    {
      label: "إجمالي التأخر",
      value: `${(totalDelayMinutes / 60).toFixed(1)} ساعة`,
    },
    {
      label: "إجمالي قرارات الحسم",
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
    "الحالة العامة ومستوى الانضباط",
  ];

  const tableRows = activeTeachers.map((teacher, idx) => {
    const tAbsences = activeAbsences.filter((a) => a.teacherId === teacher.id).length;
    const tDelays = activeDelays.filter((d) => d.teacherId === teacher.id);
    const tDelayMinutes = tDelays.reduce(
      (acc, c) => acc + (c.calculatedMinutes || 0),
      0
    );
    const tDeductions = activeDeductions.filter(
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
      reportTitle: "التقرير الإداري الشامل للمدرسة (School Summary)",
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
    rawRowsCount: activeTeachers.length,
    summaryHighlights: [
      { label: "المعلمات", value: activeTeachers.length },
      { label: "الغيابات", value: totalAbsences },
      { label: "قرارات الحسم", value: totalDeductions },
    ],
  };
}

export interface DashboardStats {
  totalTeachers: number;
  totalAbsences: number;
  totalDelayNotices: number;
  totalPermissions: number;
  absenceRate: number;
}

/**
 * حساب مؤشرات الأداء ولوحة القيادة الإدارية بسرعة فائقة مع استبعاد المؤرشفات
 */
export function getDashboardStats(
  teachers: Teacher[] = [],
  absenceRecords: AbsenceRecord[] = [],
  delayNotices: DelayNotice[] = [],
  permissions: EmployeePermission[] = []
): DashboardStats {
  const activeTeachers = teachers.filter((t) => !t.isArchived);
  const activeAbsences = absenceRecords.filter((a) => !a.isArchived);
  const activeDelays = delayNotices.filter((d) => !d.isArchived);
  const activePermissions = permissions.filter((p) => !p.isArchived);

  const totalTeachers = activeTeachers.length;
  const totalAbsences = activeAbsences.length;
  const totalDelayNotices = activeDelays.length;
  const totalPermissions = activePermissions.length;

  const absenceRate =
    totalTeachers > 0 ? Number(((totalAbsences / totalTeachers) * 100).toFixed(1)) : 0;

  return {
    totalTeachers,
    totalAbsences,
    totalDelayNotices,
    totalPermissions,
    absenceRate,
  };
}

