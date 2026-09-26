import { describe, it, expect } from "vitest";
import { generateReportData, filterByDateRange } from "@/lib/reportsEngine";
import {
  Teacher,
  AbsenceRecord,
  DelayNotice,
  DeductionDecision,
} from "@/types/teacher";

describe("Administrative Reports Engine QA Suite", () => {
  const mockTeachers: Teacher[] = [
    {
      id: "t-1",
      fullName: "سارة أحمد",
      nationalId: "1011111111",
      specialty: "رياضيات",
      jobTitle: "معلمة ممارس",
      employmentStatus: "دائم",
      totalAbsences: 3,
      isArchived: false,
    },
    {
      id: "t-2",
      fullName: "فاطمة علي",
      nationalId: "1022222222",
      specialty: "علوم",
      jobTitle: "معلمة متقدم",
      employmentStatus: "عقد",
      totalAbsences: 0,
      isArchived: false,
    },
    {
      id: "t-archived",
      fullName: "معلمة مؤرشفة",
      nationalId: "1033333333",
      specialty: "لغة عربية",
      totalAbsences: 5,
      isArchived: true,
    },
  ];

  const mockAbsences: AbsenceRecord[] = [
    {
      id: "abs-1",
      teacherId: "t-1",
      teacherName: "سارة أحمد",
      date: "2026-09-10",
      type: "اضطراري",
      reason: "ظرف عائلي",
      specialty: "رياضيات",
      timestamp: "2026-09-10T08:00:00Z",
      isArchived: false,
    },
    {
      id: "abs-2",
      teacherId: "t-1",
      teacherName: "سارة أحمد",
      date: "2026-09-15",
      type: "مرضي",
      reason: "تقرير طبي",
      specialty: "رياضيات",
      timestamp: "2026-09-15T08:00:00Z",
      isArchived: false,
    },
    {
      id: "abs-archived",
      teacherId: "t-1",
      teacherName: "سارة أحمد",
      date: "2026-09-20",
      type: "مرضي",
      reason: "سجل قديم تم حذفه وأرشفته",
      specialty: "رياضيات",
      timestamp: "2026-09-20T08:00:00Z",
      isArchived: true,
    },
  ];

  const mockDelays: DelayNotice[] = [
    {
      id: "del-1",
      teacherId: "t-1",
      teacherName: "سارة أحمد",
      noticeDate: "2026-09-05",
      status: "completed",
      directorOpinion: "rejected_with_deduction",
      calculatedMinutes: 210,
      calculatedDuration: "3 ساعات ونصف",
      violationDelayStart: true,
      violationAbsentDuring: false,
      violationEarlyDeparture: false,
      violationLeftSchool: false,
      hijriYear: "1448",
      shareToken: "tok-1",
      tokenExpiresAt: "2026-09-07T00:00:00Z",
      createdAt: "2026-09-05T08:00:00Z",
      isArchived: false,
    },
    {
      id: "del-2",
      teacherId: "t-1",
      teacherName: "سارة أحمد",
      noticeDate: "2026-09-12",
      status: "completed",
      directorOpinion: "rejected_with_deduction",
      calculatedMinutes: 210, // 210 + 210 = 420 mins = 1 full deduction day
      calculatedDuration: "3 ساعات ونصف",
      violationDelayStart: false,
      violationAbsentDuring: false,
      violationEarlyDeparture: true,
      violationLeftSchool: false,
      hijriYear: "1448",
      shareToken: "tok-2",
      tokenExpiresAt: "2026-09-14T00:00:00Z",
      createdAt: "2026-09-12T08:00:00Z",
      isArchived: false,
    },
    {
      id: "del-archived",
      teacherId: "t-1",
      teacherName: "سارة أحمد",
      noticeDate: "2026-09-15",
      status: "completed",
      directorOpinion: "rejected_with_deduction",
      calculatedMinutes: 100,
      hijriYear: "1448",
      shareToken: "tok-arch",
      tokenExpiresAt: "2026-09-17T00:00:00Z",
      createdAt: "2026-09-15T08:00:00Z",
      isArchived: true,
    },
  ];

  const mockDeductions: DeductionDecision[] = [
    {
      id: "dec-1",
      decisionNumber: "101/48",
      decisionDate: "2026-09-01",
      teacherId: "t-1",
      teacherName: "سارة أحمد",
      civilId: "1011111111",
      specialization: "رياضيات",
      schoolName: "الثانوية الخامسة مسارات",
      principalName: "منى محمد الغامدي",
      delayHours: 7,
      delayMinutes: 0,
      deductionDays: 1,
      remainderMinutes: 0,
      settledNoticeIds: [],
      createdAt: "2026-09-01T10:00:00Z",
      isArchived: false,
    },
  ];

  it("1. filters archived records out of absence report", () => {
    const report = generateReportData(
      "absence_summary",
      { month: "all", year: "all" },
      mockTeachers,
      mockAbsences,
      mockDelays,
      mockDeductions
    );

    // Active absences for t-1 = 2 (abs-archived excluded)
    expect(report.rawRowsCount).toBe(2);
    expect(report.payload.tableRows.length).toBe(2);
    const teacherNames = report.payload.tableRows.map((r) => r[1]);
    expect(teacherNames).not.toContain("معلمة مؤرشفة");
  });

  it("2. computes 420 minutes exact threshold = reaches deduction (Critical) in delay summary", () => {
    const report = generateReportData(
      "delay_departure_summary",
      { month: "all", year: "all" },
      mockTeachers,
      mockAbsences,
      mockDelays,
      mockDeductions
    );

    expect(report.rawRowsCount).toBe(1);
    const row = report.payload.tableRows[0];
    expect(row[1]).toBe("سارة أحمد"); // Name
    expect(row[2]).toBe(2); // 2 active notices (210 + 210 = 420 mins)
    expect(row[3]).toBe("420 دقيقة");
    expect(row[5]).toContain("حرج");
    expect(row[6]).toContain("نعم");
  });

  it("3. excludes archived teachers in teacher detailed record", () => {
    const report = generateReportData(
      "teacher_detailed_record",
      { teacherId: "t-1" },
      mockTeachers,
      mockAbsences,
      mockDelays,
      mockDeductions
    );

    expect(report.payload.teacherDetailsCard?.name).toBe("سارة أحمد");
    expect(report.payload.summaryCards[0].value).toBe("2 يوم"); // only active absences
    expect(report.payload.summaryCards[1].value).toContain("420 دقيقة"); // only active delays
    expect(report.payload.summaryCards[2].value).toBe("1 يوم"); // 1 deduction day
  });

  it("4. handles date range filtering accurately", () => {
    expect(filterByDateRange("2026-09-15", "2026-09-01", "2026-09-30")).toBe(true);
    expect(filterByDateRange("2026-10-01", "2026-09-01", "2026-09-30")).toBe(false);
    expect(filterByDateRange("2026-09-15", undefined, undefined, "09", "2026")).toBe(true);
    expect(filterByDateRange("2026-09-15", undefined, undefined, "10", "2026")).toBe(false);
  });

  it("5. school comprehensive report aggregates only active teachers", () => {
    const report = generateReportData(
      "school_comprehensive",
      {},
      mockTeachers,
      mockAbsences,
      mockDelays,
      mockDeductions
    );

    expect(report.rawRowsCount).toBe(2); // t-1 and t-2 (t-archived excluded)
    expect(report.payload.summaryCards[0].value).toBe("2 معلمة");
    expect(report.payload.summaryCards[1].value).toBe("2 يوم");
  });
});
