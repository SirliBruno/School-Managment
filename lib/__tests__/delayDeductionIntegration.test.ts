import { describe, it, expect } from "vitest";
import {
  calculateNoticeDurationMinutes,
  isUnexcusedDelayNotice,
  getTeacherDelaySummary,
  calculateSchoolDelaySummaries,
  generateSchoolProactiveAlerts,
  getSchoolRadarKPIs,
} from "../delayDeductionIntegration";
import {
  Teacher,
  DelayNotice,
  DeductionDecision,
  AbsenceInquiry,
} from "@/types/teacher";

const mockTeacher1: Teacher = {
  id: "t-1",
  nationalId: "1011122233",
  fullName: "سارة خالد الشمري",
  specialty: "رياضيات",
  totalAbsences: 0,
};

const mockTeacher2: Teacher = {
  id: "t-2",
  nationalId: "1022233344",
  fullName: "نورة فهد القحطاني",
  specialty: "لغة عربية",
  totalAbsences: 2,
};

const mockTeacher3: Teacher = {
  id: "t-3",
  nationalId: "1033344455",
  fullName: "ريم عبد الله المطيري",
  specialty: "علوم",
  totalAbsences: 0,
};

describe("delayDeductionIntegration", () => {
  describe("calculateNoticeDurationMinutes", () => {
    it("should return calculatedMinutes when present and valid", () => {
      const notice: DelayNotice = {
        id: "n-1",
        teacherId: "t-1",
        noticeDate: "2026-09-01",
        violationDelayStart: true,
        calculatedMinutes: 90,
        status: "completed",
        hijriYear: "1448",
        shareToken: "token-1",
        tokenExpiresAt: "2026-09-03",
        createdAt: "2026-09-01T07:00:00Z",
        violationAbsentDuring: false,
        violationEarlyDeparture: false,
        violationLeftSchool: false,
      };

      expect(calculateNoticeDurationMinutes(notice)).toBe(90);
    });

    it("should fallback to calculating time difference from start and end times", () => {
      const notice: DelayNotice = {
        id: "n-2",
        teacherId: "t-1",
        noticeDate: "2026-09-01",
        violationDelayStart: true,
        delayStartFromTime: "07:00",
        delayStartTime: "08:30",
        status: "completed",
        hijriYear: "1448",
        shareToken: "token-2",
        tokenExpiresAt: "2026-09-03",
        createdAt: "2026-09-01T07:00:00Z",
        violationAbsentDuring: false,
        violationEarlyDeparture: false,
        violationLeftSchool: false,
      };

      // 07:00 to 08:30 = 90 minutes
      expect(calculateNoticeDurationMinutes(notice)).toBe(90);
    });

    it("should return 0 when time difference is invalid or missing", () => {
      const notice: DelayNotice = {
        id: "n-3",
        teacherId: "t-1",
        noticeDate: "2026-09-01",
        violationDelayStart: false,
        status: "completed",
        hijriYear: "1448",
        shareToken: "token-3",
        tokenExpiresAt: "2026-09-03",
        createdAt: "2026-09-01T07:00:00Z",
        violationAbsentDuring: false,
        violationEarlyDeparture: false,
        violationLeftSchool: false,
      };

      expect(calculateNoticeDurationMinutes(notice)).toBe(0);
    });
  });

  describe("isUnexcusedDelayNotice", () => {
    it("should return true only for completed notices with director rejection with deduction", () => {
      const unexcused: DelayNotice = {
        id: "n-1",
        teacherId: "t-1",
        noticeDate: "2026-09-01",
        status: "completed",
        directorOpinion: "rejected_with_deduction",
        violationDelayStart: true,
        calculatedMinutes: 60,
        hijriYear: "1448",
        shareToken: "t1",
        tokenExpiresAt: "2026-09-03",
        createdAt: "2026-09-01",
        violationAbsentDuring: false,
        violationEarlyDeparture: false,
        violationLeftSchool: false,
      };

      expect(isUnexcusedDelayNotice(unexcused)).toBe(true);
    });

    it("should return false if director accepted the excuse", () => {
      const excused: DelayNotice = {
        id: "n-2",
        teacherId: "t-1",
        noticeDate: "2026-09-01",
        status: "completed",
        directorOpinion: "accepted",
        violationDelayStart: true,
        calculatedMinutes: 60,
        hijriYear: "1448",
        shareToken: "t2",
        tokenExpiresAt: "2026-09-03",
        createdAt: "2026-09-01",
        violationAbsentDuring: false,
        violationEarlyDeparture: false,
        violationLeftSchool: false,
      };

      expect(isUnexcusedDelayNotice(excused)).toBe(false);
    });

    it("should return false for pending stages or archived notices", () => {
      const pendingTeacher: DelayNotice = {
        id: "n-3",
        teacherId: "t-1",
        noticeDate: "2026-09-01",
        status: "pending_teacher",
        violationDelayStart: true,
        hijriYear: "1448",
        shareToken: "t3",
        tokenExpiresAt: "2026-09-03",
        createdAt: "2026-09-01",
        violationAbsentDuring: false,
        violationEarlyDeparture: false,
        violationLeftSchool: false,
      };
      expect(isUnexcusedDelayNotice(pendingTeacher)).toBe(false);

      const archived: DelayNotice = {
        id: "n-4",
        teacherId: "t-1",
        noticeDate: "2026-09-01",
        status: "completed",
        directorOpinion: "rejected_with_deduction",
        isArchived: true,
        violationDelayStart: true,
        hijriYear: "1448",
        shareToken: "t4",
        tokenExpiresAt: "2026-09-03",
        createdAt: "2026-09-01",
        violationAbsentDuring: false,
        violationEarlyDeparture: false,
        violationLeftSchool: false,
      };
      expect(isUnexcusedDelayNotice(archived)).toBe(false);
    });
  });

  describe("getTeacherDelaySummary & Thresholds", () => {
    it("should correctly classify teacher status: normal (< 4 hours / 240 mins)", () => {
      const notices: DelayNotice[] = [
        {
          id: "n-1",
          teacherId: "t-1",
          noticeDate: "2026-09-01",
          status: "completed",
          directorOpinion: "rejected_with_deduction",
          calculatedMinutes: 180, // 3 hours
          violationDelayStart: true,
          hijriYear: "1448",
          shareToken: "t1",
          tokenExpiresAt: "2026-09-03",
          createdAt: "2026-09-01",
          violationAbsentDuring: false,
          violationEarlyDeparture: false,
          violationLeftSchool: false,
        },
      ];

      const summary = getTeacherDelaySummary(mockTeacher1, notices, []);
      expect(summary.totalUnexcusedMinutes).toBe(180);
      expect(summary.totalUnexcusedHours).toBe(3);
      expect(summary.deductionDays).toBe(0);
      expect(summary.remainderMinutes).toBe(180);
      expect(summary.status).toBe("normal");
    });

    it("should correctly classify warning threshold (4 hours to 6.9 hours / 240 to 419 mins)", () => {
      const notices: DelayNotice[] = [
        {
          id: "n-1",
          teacherId: "t-1",
          noticeDate: "2026-09-01",
          status: "completed",
          directorOpinion: "rejected_with_deduction",
          calculatedMinutes: 240, // exactly 4 hours
          violationDelayStart: true,
          hijriYear: "1448",
          shareToken: "t1",
          tokenExpiresAt: "2026-09-03",
          createdAt: "2026-09-01",
          violationAbsentDuring: false,
          violationEarlyDeparture: false,
          violationLeftSchool: false,
        },
      ];

      const summary = getTeacherDelaySummary(mockTeacher1, notices, []);
      expect(summary.totalUnexcusedMinutes).toBe(240);
      expect(summary.totalUnexcusedHours).toBe(4);
      expect(summary.deductionDays).toBe(0);
      expect(summary.remainderMinutes).toBe(240);
      expect(summary.status).toBe("warning");
    });

    it("should correctly classify due for deduction at >= 7 hours (420 mins)", () => {
      const notices: DelayNotice[] = [
        {
          id: "n-1",
          teacherId: "t-1",
          noticeDate: "2026-09-01",
          status: "completed",
          directorOpinion: "rejected_with_deduction",
          calculatedMinutes: 420, // exactly 7 hours
          violationDelayStart: true,
          hijriYear: "1448",
          shareToken: "t1",
          tokenExpiresAt: "2026-09-03",
          createdAt: "2026-09-01",
          violationAbsentDuring: false,
          violationEarlyDeparture: false,
          violationLeftSchool: false,
        },
      ];

      const summary = getTeacherDelaySummary(mockTeacher1, notices, []);
      expect(summary.totalUnexcusedMinutes).toBe(420);
      expect(summary.totalUnexcusedHours).toBe(7);
      expect(summary.deductionDays).toBe(1);
      expect(summary.remainderMinutes).toBe(0);
      expect(summary.status).toBe("due_for_deduction");
    });

    it("should handle multiple days deduction (e.g. 14 hours = 840 mins)", () => {
      const notices: DelayNotice[] = [
        {
          id: "n-1",
          teacherId: "t-1",
          noticeDate: "2026-09-01",
          status: "completed",
          directorOpinion: "rejected_with_deduction",
          calculatedMinutes: 500,
          violationDelayStart: true,
          hijriYear: "1448",
          shareToken: "t1",
          tokenExpiresAt: "2026-09-03",
          createdAt: "2026-09-01",
          violationAbsentDuring: false,
          violationEarlyDeparture: false,
          violationLeftSchool: false,
        },
        {
          id: "n-2",
          teacherId: "t-1",
          noticeDate: "2026-09-02",
          status: "completed",
          directorOpinion: "rejected_with_deduction",
          calculatedMinutes: 400, // total = 900 minutes (15 hours)
          violationDelayStart: true,
          hijriYear: "1448",
          shareToken: "t2",
          tokenExpiresAt: "2026-09-04",
          createdAt: "2026-09-02",
          violationAbsentDuring: false,
          violationEarlyDeparture: false,
          violationLeftSchool: false,
        },
      ];

      const summary = getTeacherDelaySummary(mockTeacher1, notices, []);
      expect(summary.totalUnexcusedMinutes).toBe(900);
      expect(summary.totalUnexcusedHours).toBe(15);
      expect(summary.deductionDays).toBe(2); // 900 / 420 = 2 days
      expect(summary.remainderMinutes).toBe(60); // 900 % 420 = 60 remainder
      expect(summary.status).toBe("due_for_deduction");
    });

    it("should exclude notices already settled by previous deduction decisions", () => {
      const notices: DelayNotice[] = [
        {
          id: "n-settled-1",
          teacherId: "t-1",
          noticeDate: "2026-09-01",
          status: "completed",
          directorOpinion: "rejected_with_deduction",
          calculatedMinutes: 200,
          violationDelayStart: true,
          hijriYear: "1448",
          shareToken: "t1",
          tokenExpiresAt: "2026-09-03",
          createdAt: "2026-09-01",
          violationAbsentDuring: false,
          violationEarlyDeparture: false,
          violationLeftSchool: false,
        },
        {
          id: "n-settled-2",
          teacherId: "t-1",
          noticeDate: "2026-09-02",
          status: "completed",
          directorOpinion: "rejected_with_deduction",
          calculatedMinutes: 220,
          violationDelayStart: true,
          hijriYear: "1448",
          shareToken: "t2",
          tokenExpiresAt: "2026-09-04",
          createdAt: "2026-09-02",
          violationAbsentDuring: false,
          violationEarlyDeparture: false,
          violationLeftSchool: false,
        },
        {
          id: "n-new-1",
          teacherId: "t-1",
          noticeDate: "2026-09-10",
          status: "completed",
          directorOpinion: "rejected_with_deduction",
          calculatedMinutes: 120, // 2 hours
          violationDelayStart: true,
          hijriYear: "1448",
          shareToken: "t3",
          tokenExpiresAt: "2026-09-12",
          createdAt: "2026-09-10",
          violationAbsentDuring: false,
          violationEarlyDeparture: false,
          violationLeftSchool: false,
        },
      ];

      const previousDecision: DeductionDecision = {
        id: "dec-1",
        decisionNumber: "19/48/101",
        decisionDate: "2026-09-03",
        teacherId: "t-1",
        teacherName: "سارة خالد الشمري",
        civilId: "1011122233",
        specialization: "رياضيات",
        schoolName: "الثانوية الخامسة",
        principalName: "أ. فاطمة الحربي",
        delayHours: 7,
        delayMinutes: 420,
        deductionDays: 1,
        settledNoticeIds: ["n-settled-1", "n-settled-2"],
        remainderMinutes: 0,
        createdAt: "2026-09-03T10:00:00Z",
      };

      const summary = getTeacherDelaySummary(mockTeacher1, notices, [previousDecision]);
      // n-settled-1 and n-settled-2 are settled, only n-new-1 (120m) remains
      expect(summary.unsettledNotices.length).toBe(1);
      expect(summary.unsettledNotices[0].id).toBe("n-new-1");
      expect(summary.totalUnexcusedMinutes).toBe(120);
      expect(summary.status).toBe("normal");
    });

    it("should carry over remainder minutes from previous deduction decisions", () => {
      const notices: DelayNotice[] = [
        {
          id: "n-settled",
          teacherId: "t-1",
          noticeDate: "2026-09-01",
          status: "completed",
          directorOpinion: "rejected_with_deduction",
          calculatedMinutes: 500, // 500 mins, decision deducted 420, leaving 80 remainder
          violationDelayStart: true,
          hijriYear: "1448",
          shareToken: "t1",
          tokenExpiresAt: "2026-09-03",
          createdAt: "2026-09-01",
          violationAbsentDuring: false,
          violationEarlyDeparture: false,
          violationLeftSchool: false,
        },
        {
          id: "n-new-1",
          teacherId: "t-1",
          noticeDate: "2026-09-10",
          status: "completed",
          directorOpinion: "rejected_with_deduction",
          calculatedMinutes: 340, // 340 mins new
          violationDelayStart: true,
          hijriYear: "1448",
          shareToken: "t2",
          tokenExpiresAt: "2026-09-12",
          createdAt: "2026-09-10",
          violationAbsentDuring: false,
          violationEarlyDeparture: false,
          violationLeftSchool: false,
        },
      ];

      const previousDecision: DeductionDecision = {
        id: "dec-1",
        decisionNumber: "19/48/101",
        decisionDate: "2026-09-03",
        teacherId: "t-1",
        teacherName: "سارة خالد الشمري",
        civilId: "1011122233",
        specialization: "رياضيات",
        schoolName: "الثانوية الخامسة",
        principalName: "أ. فاطمة الحربي",
        delayHours: 8.3,
        delayMinutes: 500,
        deductionDays: 1,
        settledNoticeIds: ["n-settled"],
        remainderMinutes: 80,
        createdAt: "2026-09-03T10:00:00Z",
      };

      const summary = getTeacherDelaySummary(mockTeacher1, notices, [previousDecision]);
      // unsettled = 340m, carriedOver = 80m => total = 420m (7 hours exactly!)
      expect(summary.unsettledMinutes).toBe(340);
      expect(summary.carriedOverMinutes).toBe(80);
      expect(summary.totalUnexcusedMinutes).toBe(420);
      expect(summary.totalUnexcusedHours).toBe(7);
      expect(summary.deductionDays).toBe(1);
      expect(summary.remainderMinutes).toBe(0);
      expect(summary.status).toBe("due_for_deduction");
    });
  });

  describe("generateSchoolProactiveAlerts", () => {
    it("should generate due_for_deduction, warning, pending_director, and expired_inquiry alerts", () => {
      const fixedNow = new Date("2026-09-15T12:00:00Z").getTime();

      const delayNotices: DelayNotice[] = [
        // Teacher 1: 450 minutes (due for deduction)
        {
          id: "n-t1",
          teacherId: "t-1",
          noticeDate: "2026-09-10",
          status: "completed",
          directorOpinion: "rejected_with_deduction",
          calculatedMinutes: 450,
          violationDelayStart: true,
          hijriYear: "1448",
          shareToken: "t1",
          tokenExpiresAt: "2026-09-12",
          createdAt: "2026-09-10",
          violationAbsentDuring: false,
          violationEarlyDeparture: false,
          violationLeftSchool: false,
        },
        // Teacher 2: 300 minutes (warning 4-6.9h)
        {
          id: "n-t2",
          teacherId: "t-2",
          noticeDate: "2026-09-11",
          status: "completed",
          directorOpinion: "rejected_with_deduction",
          calculatedMinutes: 300,
          violationDelayStart: true,
          hijriYear: "1448",
          shareToken: "t2",
          tokenExpiresAt: "2026-09-13",
          createdAt: "2026-09-11",
          violationAbsentDuring: false,
          violationEarlyDeparture: false,
          violationLeftSchool: false,
        },
        // Teacher 3: pending director opinion
        {
          id: "n-t3-dir",
          teacherId: "t-3",
          teacherName: "ريم عبد الله المطيري",
          noticeDate: "2026-09-14",
          status: "pending_director",
          violationDelayStart: true,
          hijriYear: "1448",
          shareToken: "t3",
          tokenExpiresAt: "2026-09-16",
          createdAt: "2026-09-14",
          violationAbsentDuring: false,
          violationEarlyDeparture: false,
          violationLeftSchool: false,
        },
      ];

      const inquiries: AbsenceInquiry[] = [
        // Expired inquiry (> 48 hours passed)
        {
          id: "inq-exp",
          teacherId: "t-2",
          teacherName: "نورة فهد القحطاني",
          absenceDate: "2026-09-10",
          status: "pending",
          token: "tok-exp",
          expiresAt: "2026-09-12T12:00:00Z", // expired relative to fixedNow
          createdAt: "2026-09-10T12:00:00Z",
        },
      ];

      const alerts = generateSchoolProactiveAlerts({
        teachers: [mockTeacher1, mockTeacher2, mockTeacher3],
        delayNotices,
        deductionDecisions: [],
        inquiries,
        now: fixedNow,
      });

      expect(alerts.length).toBe(4);

      // Priority 1: due_for_deduction
      expect(alerts[0].type).toBe("due_for_deduction");
      expect(alerts[0].teacherId).toBe("t-1");
      expect(alerts[0].actionUrl).toContain("/procedures/deduction-hours?teacherId=t-1");

      // Priority 2: expired_inquiry
      expect(alerts[1].type).toBe("expired_inquiry");
      expect(alerts[1].teacherName).toBe("نورة فهد القحطاني");

      // Priority 3: pending_director
      expect(alerts[2].type).toBe("pending_director");
      expect(alerts[2].meta?.noticeId).toBe("n-t3-dir");

      // Priority 4: approaching_threshold
      expect(alerts[3].type).toBe("approaching_threshold");
      expect(alerts[3].teacherId).toBe("t-2");
    });
  });

  describe("getSchoolRadarKPIs", () => {
    it("should compute school-wide delay hours, due counts, and decision totals", () => {
      const fixedNow = new Date("2026-09-15T12:00:00Z").getTime();

      const delayNotices: DelayNotice[] = [
        {
          id: "n-1",
          teacherId: "t-1",
          noticeDate: "2026-09-10",
          status: "completed",
          directorOpinion: "rejected_with_deduction",
          calculatedMinutes: 420, // 7h
          violationDelayStart: true,
          hijriYear: "1448",
          shareToken: "t1",
          tokenExpiresAt: "2026-09-12",
          createdAt: "2026-09-10",
          violationAbsentDuring: false,
          violationEarlyDeparture: false,
          violationLeftSchool: false,
        },
        {
          id: "n-2",
          teacherId: "t-2",
          noticeDate: "2026-09-11",
          status: "completed",
          directorOpinion: "rejected_with_deduction",
          calculatedMinutes: 300, // 5h
          violationDelayStart: true,
          hijriYear: "1448",
          shareToken: "t2",
          tokenExpiresAt: "2026-09-13",
          createdAt: "2026-09-11",
          violationAbsentDuring: false,
          violationEarlyDeparture: false,
          violationLeftSchool: false,
        },
        {
          id: "n-3",
          teacherId: "t-3",
          noticeDate: "2026-09-14",
          status: "pending_director",
          violationDelayStart: true,
          hijriYear: "1448",
          shareToken: "t3",
          tokenExpiresAt: "2026-09-16",
          createdAt: "2026-09-14",
          violationAbsentDuring: false,
          violationEarlyDeparture: false,
          violationLeftSchool: false,
        },
      ];

      const decisions: DeductionDecision[] = [
        {
          id: "dec-old",
          decisionNumber: "19/48/1",
          decisionDate: "2026-09-01",
          teacherId: "t-3",
          teacherName: "ريم عبد الله المطيري",
          civilId: "1033344455",
          specialization: "علوم",
          schoolName: "الثانوية الخامسة",
          principalName: "أ. فاطمة الحربي",
          delayHours: 7,
          delayMinutes: 420,
          deductionDays: 1,
          createdAt: "2026-09-01T08:00:00Z",
        },
      ];

      const kpis = getSchoolRadarKPIs({
        teachers: [mockTeacher1, mockTeacher2, mockTeacher3],
        delayNotices,
        deductionDecisions: decisions,
        inquiries: [],
        now: fixedNow,
      });

      // total minutes = 420 + 300 = 720 minutes = 12 hours
      expect(kpis.totalUnexcusedMinutes).toBe(720);
      expect(kpis.totalUnexcusedHours).toBe(12);
      expect(kpis.teachersDueCount).toBe(1);
      expect(kpis.teachersWarningCount).toBe(1);
      expect(kpis.decisionsIssuedCount).toBe(1);
      expect(kpis.totalDeductionDaysIssued).toBe(1);
      expect(kpis.pendingDirectorCount).toBe(1);
    });
  });
});
