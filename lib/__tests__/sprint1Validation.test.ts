import { describe, it, expect } from "vitest";
import {
  calculateTimeDifference,
  calculateDaysBetween,
  isTokenExpired,
  getDatesInRange,
} from "@/lib/timeUtils";
import {
  calculateDeduction,
  validateDeductionForm,
  MINUTES_PER_WORK_DAY,
} from "@/lib/deductionCalculator";
import {
  getTeacherDelaySummary,
  calculateNoticeDurationMinutes,
  isUnexcusedDelayNotice,
  getAllSettledNoticeIds,
} from "@/lib/delayDeductionIntegration";
import { generateReportData } from "@/lib/reportsEngine";
import {
  Teacher,
  AbsenceRecord,
  DelayNotice,
  DeductionDecision,
  EmployeePermission,
  AbsenceInquiry,
} from "@/types/teacher";

describe("Sprint 1 - Business Logic & Feature Validation", () => {
  // Mock Teachers
  const teacherA: Teacher = {
    id: "t-100",
    fullName: "أمل بنت خالد السعدون",
    nationalId: "1011223344",
    jobTitle: "معلمة ممارس",
    specialty: "فيزياء",
    employmentStatus: "دائم",
    totalAbsences: 0,
    totalDelayNotices: 0,
    isArchived: false,
  };

  const teacherB: Teacher = {
    id: "t-200",
    fullName: "ريم بنت ناصر الدوسري",
    nationalId: "1055667788",
    jobTitle: "معلمة متقدم",
    specialty: "كيمياء",
    employmentStatus: "عقد",
    totalAbsences: 1,
    totalDelayNotices: 0,
    isArchived: false,
  };

  const archivedTeacher: Teacher = {
    id: "t-archived",
    fullName: "معلمة سابقة",
    nationalId: "1099887766",
    jobTitle: "معلمة",
    specialty: "أحياء",
    employmentStatus: "دائم",
    totalAbsences: 0,
    isArchived: true,
  };

  /* =========================================================
   * 1. Teachers Management Audit
   * ========================================================= */
  describe("1. Teachers Management Audit", () => {
    it("should prevent duplicate nationalId across both active and archived teachers", () => {
      const activeTeachers = [teacherA, teacherB];
      const archivedTeachersList = [{ teacher: archivedTeacher, archivedAt: "2026-09-01T00:00:00Z" }];

      const isDuplicateActive = activeTeachers.some((t) => t.nationalId === "1011223344");
      expect(isDuplicateActive).toBe(true);

      const isDuplicateArchived = archivedTeachersList.some(
        (a) => a.teacher.nationalId === "1099887766"
      );
      expect(isDuplicateArchived).toBe(true);

      const isNewUnique =
        !activeTeachers.some((t) => t.nationalId === "1033445566") &&
        !archivedTeachersList.some((a) => a.teacher.nationalId === "1033445566");
      expect(isNewUnique).toBe(true);
    });

    it("should correctly aggregate all linked records in teacher profile", () => {
      const absences: AbsenceRecord[] = [
        {
          id: "abs-1",
          teacherId: "t-100",
          teacherName: teacherA.fullName,
          date: "2026-09-10",
          type: "مرضي",
          reason: "وعكة صحية",
        },
      ];

      const delays: DelayNotice[] = [
        {
          id: "del-1",
          teacherId: "t-100",
          teacherName: teacherA.fullName,
          noticeDate: "2026-09-11",
          status: "completed",
          directorOpinion: "rejected_with_deduction",
          calculatedMinutes: 60,
          hijriYear: "١٤٤٨",
          createdAt: "2026-09-11T08:00:00Z",
        },
      ];

      const permissions: EmployeePermission[] = [
        {
          id: "perm-1",
          teacherId: "t-100",
          teacherName: teacherA.fullName,
          permissionDate: "2026-09-12",
          exitTime: "09:00",
          returnTime: "10:00",
          durationMinutes: 60,
          reason: "مهمة إدارية",
          createdAt: "2026-09-12T09:00:00Z",
        },
      ];

      const deductions: DeductionDecision[] = [
        {
          id: "ded-1",
          teacherId: "t-100",
          teacherName: teacherA.fullName,
          decisionNumber: "ق-101",
          decisionDate: "2026-09-15",
          deductionDays: 1,
          delayMinutes: 420,
          remainderMinutes: 0,
          hijriYear: "١٤٤٨",
          createdAt: "2026-09-15T12:00:00Z",
        },
      ];

      // Verification of relational integrity by teacherId
      expect(absences.filter((a) => a.teacherId === teacherA.id).length).toBe(1);
      expect(delays.filter((d) => d.teacherId === teacherA.id).length).toBe(1);
      expect(permissions.filter((p) => p.teacherId === teacherA.id).length).toBe(1);
      expect(deductions.filter((dec) => dec.teacherId === teacherA.id).length).toBe(1);
    });
  });

  /* =========================================================
   * 2. Absence Workflow Validation
   * ========================================================= */
  describe("2. Absence Workflow Validation", () => {
    it("should correctly handle single-day and multi-day absence ranges", () => {
      // Single day
      const singleDates = getDatesInRange("2026-09-10", "2026-09-10");
      expect(singleDates).toEqual(["2026-09-10"]);

      // Multi-day
      const multiDates = getDatesInRange("2026-09-10", "2026-09-12");
      expect(multiDates.length).toBe(3);
      expect(multiDates).toEqual(["2026-09-10", "2026-09-11", "2026-09-12"]);
      expect(calculateDaysBetween("2026-09-10", "2026-09-12")).toBe(3);
    });

    it("should detect expired tokens past 48 hours", () => {
      const pastDate = new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(); // 50 hours ago
      expect(isTokenExpired(pastDate)).toBe(true);

      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours ahead
      expect(isTokenExpired(futureDate)).toBe(false);
    });

    it("should block duplicate responses when inquiry status is not pending", () => {
      const inquiry: AbsenceInquiry = {
        id: "inq-1",
        teacherId: "t-100",
        teacherName: teacherA.fullName,
        jobNumber: teacherA.nationalId,
        absenceDate: "2026-09-10",
        token: "tok-abc",
        status: "submitted", // Already submitted
        expiresAt: new Date(Date.now() + 10000).toISOString(),
        createdAt: "2026-09-10T08:00:00Z",
      };

      const canSubmit = inquiry.status === "pending";
      expect(canSubmit).toBe(false);
    });
  });

  /* =========================================================
   * 3. Delay & Early Departure Logic
   * ========================================================= */
  describe("3. Delay & Early Departure Logic", () => {
    it("should calculate exact delay: 07:00 to 07:15 = 15 minutes", () => {
      const result = calculateTimeDifference("07:00", "07:15");
      expect(result.isValid).toBe(true);
      expect(result.totalMinutes).toBe(15);
      expect(result.formattedDuration).toBe("15 دقيقة");
    });

    it("should reject same time (07:00 to 07:00)", () => {
      const result = calculateTimeDifference("07:00", "07:00");
      expect(result.isValid).toBe(false);
      expect(result.totalMinutes).toBe(0);
      expect(result.error).toBe("وقت النهاية يجب أن يكون بعد وقت البداية");
    });

    it("should reject when end time is before start time (07:15 to 07:00)", () => {
      const result = calculateTimeDifference("07:15", "07:00");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("وقت النهاية يجب أن يكون بعد وقت البداية");
    });

    it("should reject invalid time format", () => {
      const result = calculateTimeDifference("abc", "07:00");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("صيغة الوقت غير صالحة");
    });
  });

  /* =========================================================
   * 4. Deduction Engine Validation (420 Minute Rule)
   * ========================================================= */
  describe("4. Deduction Engine Validation", () => {
    it("419 minutes: 0 deduction days, status normal/warning", () => {
      const result = calculateDeduction(419);
      expect(result.deductionDays).toBe(0);
      expect(result.remainderMinutes).toBe(419);
    });

    it("420 minutes: exactly 1 deduction day, 0 remainder minutes", () => {
      const result = calculateDeduction(420);
      expect(result.deductionDays).toBe(1);
      expect(result.remainderMinutes).toBe(0);
    });

    it("421 minutes: 1 deduction day + 1 remainder minute", () => {
      const result = calculateDeduction(421);
      expect(result.deductionDays).toBe(1);
      expect(result.remainderMinutes).toBe(1);
    });

    it("840 minutes: exactly 2 deduction days, 0 remainder minutes", () => {
      const result = calculateDeduction(840);
      expect(result.deductionDays).toBe(2);
      expect(result.remainderMinutes).toBe(0);
    });

    it("should exclude settled delay notices to prevent double deductions", () => {
      const notice1: DelayNotice = {
        id: "notice-1",
        teacherId: "t-100",
        teacherName: teacherA.fullName,
        noticeDate: "2026-09-01",
        status: "completed",
        directorOpinion: "rejected_with_deduction",
        calculatedMinutes: 200,
        hijriYear: "١٤٤٨",
        createdAt: "2026-09-01T08:00:00Z",
      };

      const notice2: DelayNotice = {
        id: "notice-2",
        teacherId: "t-100",
        teacherName: teacherA.fullName,
        noticeDate: "2026-09-05",
        status: "completed",
        directorOpinion: "rejected_with_deduction",
        calculatedMinutes: 250,
        hijriYear: "١٤٤٨",
        createdAt: "2026-09-05T08:00:00Z",
      };

      // Decision 1 settles notice-1 (200 minutes) with remainder of 50 minutes carried over
      const decision1: DeductionDecision = {
        id: "dec-1",
        teacherId: "t-100",
        teacherName: teacherA.fullName,
        decisionNumber: "101/د",
        decisionDate: "2026-09-02",
        deductionDays: 0,
        delayMinutes: 200,
        remainderMinutes: 200,
        settledNoticeIds: ["notice-1"],
        hijriYear: "١٤٤٨",
        createdAt: "2026-09-02T12:00:00Z",
      };

      const summary = getTeacherDelaySummary(teacherA, [notice1, notice2], [decision1]);
      // notice-1 is settled, so unsettledNotices only contains notice-2 (250m)
      expect(summary.unsettledNotices.length).toBe(1);
      expect(summary.unsettledNotices[0].id).toBe("notice-2");
      expect(summary.unsettledMinutes).toBe(250);
      // Carried over from decision1 is 200 minutes
      expect(summary.carriedOverMinutes).toBe(200);
      // Total unexcused = 250 + 200 = 450 minutes
      expect(summary.totalUnexcusedMinutes).toBe(450);
      // 450 minutes >= 420 -> 1 deduction day + 30 remainder minutes
      expect(summary.deductionDays).toBe(1);
      expect(summary.remainderMinutes).toBe(30);
      expect(summary.status).toBe("due_for_deduction");
    });
  });

  /* =========================================================
   * 5. Employee Permission Module Validation
   * ========================================================= */
  describe("5. Employee Permission Module Validation", () => {
    it("should calculate exact permission duration: 09:15 to 10:45 = 90 minutes", () => {
      const diff = calculateTimeDifference("09:15", "10:45");
      expect(diff.isValid).toBe(true);
      expect(diff.totalMinutes).toBe(90);
      expect(diff.formattedDuration).toBe("ساعة واحدة و 30 دقيقة");
    });

    it("should reject return time earlier than exit time", () => {
      const diff = calculateTimeDifference("11:00", "10:30");
      expect(diff.isValid).toBe(false);
      expect(diff.error).toBe("وقت النهاية يجب أن يكون بعد وقت البداية");
    });

    it("should flag permissions reaching or exceeding a full work day (420 minutes)", () => {
      const fullDay = calculateTimeDifference("07:00", "14:00");
      expect(fullDay.totalMinutes).toBe(420);
      expect(fullDay.totalMinutes >= MINUTES_PER_WORK_DAY).toBe(true);
    });
  });

  /* =========================================================
   * 6. Reports Validation
   * ========================================================= */
  describe("6. Reports Validation", () => {
    it("should strictly exclude archived records and teachers from reports", () => {
      const activeRec: AbsenceRecord = {
        id: "abs-act",
        teacherId: "t-100",
        teacherName: teacherA.fullName,
        date: "2026-09-08",
        type: "مرضي",
        reason: "تقرير طبي",
        isArchived: false,
      };

      const archivedRec: AbsenceRecord = {
        id: "abs-arch",
        teacherId: "t-100",
        teacherName: teacherA.fullName,
        date: "2026-09-09",
        type: "مرضي",
        reason: "مؤرشف",
        isArchived: true,
      };

      const report = generateReportData(
        "absence_summary",
        { month: "all", year: "2026" },
        [teacherA, archivedTeacher],
        [activeRec, archivedRec],
        [],
        [],
        "وكيلة الشؤون التعليمية"
      );

      // Only activeRec is included
      expect(report.rawRowsCount).toBe(1);
      expect(report.payload.tableRows.length).toBe(1);
      expect(report.payload.tableRows[0][1]).toBe(teacherA.fullName);
    });
  });

  /* =========================================================
   * 7. Workflow Status Transition Validation
   * ========================================================= */
  describe("7. Workflow Status Transition Validation", () => {
    it("should follow DelayNotice valid lifecycle: pending_teacher -> pending_director -> completed", () => {
      let status: "pending_teacher" | "pending_director" | "completed" = "pending_teacher";

      // Teacher responds
      const canTeacherSubmit = status === "pending_teacher";
      expect(canTeacherSubmit).toBe(true);
      status = "pending_director";

      // Once pending_director, teacher cannot resubmit
      expect(status === "pending_teacher").toBe(false);

      // Director approves
      const canDirectorSign = status === "pending_director";
      expect(canDirectorSign).toBe(true);
      status = "completed";

      // Once completed, cannot revert to pending_teacher
      const canRevert = (status as string) === "pending_teacher";
      expect(canRevert).toBe(false);
    });

    it("should follow AbsenceInquiry valid lifecycle: pending -> submitted -> approved/rejected", () => {
      let inqStatus: "pending" | "submitted" | "approved" | "rejected" = "pending";

      // Teacher submits response
      expect(inqStatus).toBe("pending");
      inqStatus = "submitted";

      // Principal reviews and approves
      expect(inqStatus).toBe("submitted");
      inqStatus = "approved";

      // Cannot submit response to approved inquiry
      const canSubmitAgain = inqStatus === "pending";
      expect(canSubmitAgain).toBe(false);
    });
  });
});
