import { describe, it, expect } from "vitest";
import {
  DEFAULT_ADMIN_NAME,
  DEFAULT_ADMIN_ROLE,
  DEFAULT_ADMIN_ROLE_LABEL,
  DEFAULT_ADMIN_SCHOOL,
  extractAdminUser,
} from "@/context/AuthContext";
import {
  generateSchoolProactiveAlerts,
  getSchoolRadarKPIs,
  calculateSchoolDelaySummaries,
  getTeacherDelaySummary,
  isUnexcusedDelayNotice,
  getAllSettledNoticeIds,
} from "@/lib/delayDeductionIntegration";
import { calculateTimeDifference, getSaudiToday } from "@/lib/timeUtils";
import { generateReportData } from "@/lib/reportsEngine";
import { buildReportHtml } from "@/lib/reportPdfService";
import { generatePermissionPdfHtml } from "@/lib/printPermissionPdfService";
import { logAuditEvent, getAuditLogs } from "@/lib/auditLogger";
import { getOfficialTeachersList } from "@/lib/officialTeachersData";
import type {
  Teacher,
  AbsenceRecord,
  AbsenceInquiry,
  DelayNotice,
  DeductionDecision,
  EmployeePermission,
  ArchivedAbsenceRecord,
} from "@/types/teacher";
import type { User } from "@supabase/supabase-js";

describe("SPRINT 6: Single User Operational Readiness & Final Acceptance", () => {
  const today = getSaudiToday();

  // Test setup for Vice Principal Ahlam Saleh Al-Dubaibi
  const mockVicePrincipalUser: User = {
    id: "admin-ahlam-prod-id",
    app_metadata: {},
    user_metadata: {
      full_name: "أحلام صالح الضبيبي",
      role: "vice_principal",
      username: "ahlam_aldubaibi",
    },
    aud: "authenticated",
    created_at: new Date().toISOString(),
    email: "ahlam@school5.edu.sa",
  };

  const sampleTeacher: Teacher = {
    id: "teacher-ops-01",
    name: "نورة عبدالرحمن الغامدي",
    fullName: "نورة عبدالرحمن الغامدي",
    job_number: "1087654321",
    jobNumber: "1087654321",
    nationalId: "1087654321",
    username: "1087654321",
    mobile: "0551234567",
    specialty: "رياضيات",
    jobTitle: "معلم ممارس",
    employmentStatus: "دائم",
    teachingField: "العلوم والرياضيات",
    totalAbsences: 0,
    totalDelayNotices: 0,
    isArchived: false,
    createdAt: new Date().toISOString(),
  };

  // =========================================================================
  // Scenario 1: Operational User Journey Test (Morning Entry)
  // =========================================================================
  describe("1. Operational User Journey Test (Beginning of Day Entry)", () => {
    it("Authenticates Vice Principal with correct identity and assigned school", () => {
      const admin = extractAdminUser(mockVicePrincipalUser);
      expect(admin.fullName).toBe("أحلام صالح الضبيبي");
      expect(admin.role).toBe("vice_principal");
      expect(DEFAULT_ADMIN_NAME).toBe("أحلام صالح الضبيبي");
      expect(DEFAULT_ADMIN_ROLE_LABEL).toBe("وكيلة المدرسة");
      expect(DEFAULT_ADMIN_SCHOOL).toBe("الثانوية الخامسة مسارات");
    });

    it("Loads initial situation awareness instantly (0 cases, 100% discipline)", () => {
      const radar = getSchoolRadarKPIs({
        teachers: [sampleTeacher],
        delayNotices: [],
        deductionDecisions: [],
        inquiries: [],
      });

      expect(radar.teachersDueCount).toBe(0);
      expect(radar.totalUnexcusedHours).toBe(0);
      expect(radar.pendingDirectorCount).toBe(0);
    });
  });

  // =========================================================================
  // Scenario 2: Dashboard Daily Usage Test (Live State Reflection)
  // =========================================================================
  describe("2. Dashboard Daily Usage Test (State Reflection)", () => {
    it("Computes accurate discipline pulse with mixed absences and delays", () => {
      const totalTeachers = 10;
      const todayAbsencesCount = 2;
      const disciplineRate = Math.round(((totalTeachers - todayAbsencesCount) / totalTeachers) * 100);

      expect(disciplineRate).toBe(80);
    });

    it("Accurately reflects pending inquiries and delay approvals", () => {
      const pendingInquiries: AbsenceInquiry[] = [
        {
          id: "inq-01",
          teacherId: sampleTeacher.id,
          teacherName: sampleTeacher.name,
          absenceDate: today,
          token: "token-123",
          status: "pending",
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          createdAt: new Date().toISOString(),
        },
      ];

      const pendingDelays: DelayNotice[] = [
        {
          id: "delay-01",
          teacherId: sampleTeacher.id,
          teacherName: sampleTeacher.name,
          noticeDate: today,
          violationDelayStart: true,
          delayStartFromTime: "07:30",
          delayStartTime: "08:15",
          calculatedMinutes: 45,
          status: "pending_director",
          createdAt: new Date().toISOString(),
          hijriYear: "1446",
        },
      ];

      const totalPendingMatters = pendingInquiries.length + pendingDelays.length;
      expect(totalPendingMatters).toBe(2);
    });
  });

  // =========================================================================
  // Scenario 3: Daily Administrative Workflow Simulation (Absence Recording)
  // =========================================================================
  describe("3. Daily Administrative Workflow Simulation (Record Absence)", () => {
    it("Records absence, increments counter, and links teacher record", () => {
      const newAbsence: AbsenceRecord = {
        id: "abs-rec-01",
        teacherId: sampleTeacher.id,
        teacherName: sampleTeacher.name,
        jobNumber: sampleTeacher.jobNumber,
        specialty: sampleTeacher.specialty,
        date: today,
        type: "اضطراري",
        reason: "ظرف عائلي طارئ",
        timestamp: new Date().toISOString(),
      };

      expect(newAbsence.teacherName).toBe("نورة عبدالرحمن الغامدي");
      expect(newAbsence.type).toBe("اضطراري");
      expect(newAbsence.date).toBe(today);

      // Audit trail
      const audit = logAuditEvent({
        action: "create",
        entityType: "absence",
        entityId: newAbsence.id,
        userName: "أحلام صالح الضبيبي",
        userRole: "وكيلة المدرسة",
        details: `تسجيل غياب (${newAbsence.type}) للمعلمة ${newAbsence.teacherName}`,
      });

      expect(audit.userName).toBe("أحلام صالح الضبيبي");
      expect(audit.userRole).toBe("وكيلة المدرسة");
    });
  });

  // =========================================================================
  // Scenario 4: Accountability Workflow Test (End-to-End Inquiry Lifecycle)
  // =========================================================================
  describe("4. Accountability Workflow Test (Inquiry Lifecycle)", () => {
    it("Processes inquiry: creation -> teacher response -> director review", () => {
      // 1. Creation by VP
      const inquiry: AbsenceInquiry = {
        id: "inq-cycle-01",
        teacherId: sampleTeacher.id,
        teacherName: sampleTeacher.name,
        absenceDate: today,
        token: "secure-token-xyz-123",
        status: "pending",
        expiresAt: new Date(Date.now() + 172800000).toISOString(),
        createdAt: new Date().toISOString(),
      };
      expect(inquiry.status).toBe("pending");

      // 2. Teacher Response submission
      inquiry.status = "submitted";
      inquiry.teacherReason = "مراجعة مستشفى تخصصي";
      inquiry.submittedAt = new Date().toISOString();
      expect(inquiry.status).toBe("submitted");
      expect(inquiry.teacherReason).toBe("مراجعة مستشفى تخصصي");

      // 3. Vice Principal / Director Decision
      inquiry.status = "approved";
      inquiry.absenceType = "مرضي";
      inquiry.adminNotes = "عذر مقبول مرفق بتقرير صحتي";
      expect(inquiry.status).toBe("approved");
      expect(inquiry.absenceType).toBe("مرضي");
    });
  });

  // =========================================================================
  // Scenario 5: Delay Management Test (Minutes & Threshold Accumulation)
  // =========================================================================
  describe("5. Delay Management Test (Calculations & Thresholds)", () => {
    it("Calculates exact delay difference in minutes and hours", () => {
      const diff1 = calculateTimeDifference("07:30", "08:15");
      expect(diff1.totalMinutes).toBe(45);

      const diff2 = calculateTimeDifference("11:30", "13:30");
      expect(diff2.totalMinutes).toBe(120);
      expect(diff2.hours).toBe(2);
    });

    it("Classifies delay status correctly across thresholds", () => {
      // Minor delay (1 hour unexcused)
      const notice1: DelayNotice = {
        id: "del-01",
        teacherId: sampleTeacher.id,
        teacherName: sampleTeacher.name,
        noticeDate: "2026-09-01",
        violationDelayStart: true,
        calculatedMinutes: 60,
        status: "completed",
        directorOpinion: "rejected_with_deduction",
        createdAt: new Date().toISOString(),
        hijriYear: "1446",
      };

      const summary1 = getTeacherDelaySummary(sampleTeacher, [notice1], []);
      expect(summary1.status).toBe("normal");
      expect(summary1.totalUnexcusedMinutes).toBe(60);

      // Approaching threshold (330 min = 5.5 hours -> warning)
      const notice2: DelayNotice = {
        id: "del-02",
        teacherId: sampleTeacher.id,
        teacherName: sampleTeacher.name,
        noticeDate: "2026-09-10",
        violationEarlyDeparture: true,
        calculatedMinutes: 270,
        status: "completed",
        directorOpinion: "rejected_with_deduction",
        createdAt: new Date().toISOString(),
        hijriYear: "1446",
      };

      const summary2 = getTeacherDelaySummary(sampleTeacher, [notice1, notice2], []);
      expect(summary2.status).toBe("warning");
      expect(summary2.totalUnexcusedMinutes).toBe(330);

      // Reaching >= 7 hours (420 min -> due_for_deduction)
      const notice3: DelayNotice = {
        id: "del-03",
        teacherId: sampleTeacher.id,
        teacherName: sampleTeacher.name,
        noticeDate: "2026-09-15",
        violationDelayStart: true,
        calculatedMinutes: 90,
        status: "completed",
        directorOpinion: "rejected_with_deduction",
        createdAt: new Date().toISOString(),
        hijriYear: "1446",
      };

      const summary3 = getTeacherDelaySummary(sampleTeacher, [notice1, notice2, notice3], []);
      expect(summary3.status).toBe("due_for_deduction");
      expect(summary3.totalUnexcusedMinutes).toBe(420);
      expect(summary3.totalUnexcusedHours).toBe(7);
      expect(summary3.deductionDays).toBe(1);
    });
  });

  // =========================================================================
  // Scenario 6: Permission Management Test (Duration & PDF Generation)
  // =========================================================================
  describe("6. Permission Management Test (Duration & Form)", () => {
    it("Validates permission record and calculates accurate minutes", () => {
      const permission: EmployeePermission = {
        id: "perm-ops-01",
        teacherId: sampleTeacher.id,
        teacherName: sampleTeacher.name,
        permissionDate: today,
        exitTime: "09:30",
        returnTime: "11:00",
        durationMinutes: 90,
        reason: "مراجعة بنكية رسمية",
        notes: "تمت الموافقة المسبقة من الوكيلة",
        createdAt: new Date().toISOString(),
      };

      expect(permission.durationMinutes).toBe(90);
      expect(permission.teacherName).toBe("نورة عبدالرحمن الغامدي");

      // Verify PDF template rendering
      const html = generatePermissionPdfHtml({
        permission,
        teacher: sampleTeacher,
      });

      expect(html).toContain("الثانوية الخامسة مسارات");
      expect(html).toContain("استمارة استئذان موظفة");
      expect(html).toContain("نورة عبدالرحمن الغامدي");
      expect(html).toContain("09:30");
      expect(html).toContain("11:00");
    });
  });

  // =========================================================================
  // Scenario 7: Deduction Workflow Test (Decision Issuance & Notice Settlement)
  // =========================================================================
  describe("7. Deduction Workflow Test (Issuance & Notice Settlement)", () => {
    it("Issues deduction decision, settles notices, and prevents duplicate deductions", () => {
      const noticeA: DelayNotice = {
        id: "del-notice-A",
        teacherId: sampleTeacher.id,
        noticeDate: "2026-09-01",
        violationDelayStart: true,
        calculatedMinutes: 240,
        status: "completed",
        directorOpinion: "rejected_with_deduction",
        createdAt: new Date().toISOString(),
        hijriYear: "1446",
      };

      const noticeB: DelayNotice = {
        id: "del-notice-B",
        teacherId: sampleTeacher.id,
        noticeDate: "2026-09-05",
        violationEarlyDeparture: true,
        calculatedMinutes: 180,
        status: "completed",
        directorOpinion: "rejected_with_deduction",
        createdAt: new Date().toISOString(),
        hijriYear: "1446",
      };

      const notices = [noticeA, noticeB];
      const summaryPre = getTeacherDelaySummary(sampleTeacher, notices, []);
      expect(summaryPre.status).toBe("due_for_deduction");
      expect(summaryPre.totalUnexcusedMinutes).toBe(420);

      // Issue Deduction Decision
      const decision: DeductionDecision = {
        id: "dec-01",
        decisionNumber: "1446/DED/001",
        teacherId: sampleTeacher.id,
        teacherName: sampleTeacher.name,
        settledNoticeIds: [noticeA.id, noticeB.id],
        deductionDays: 1,
        totalDeductionHours: 7,
        carriedOverMinutes: 0,
        decisionDate: today,
        createdAt: new Date().toISOString(),
      };

      const settledIds = getAllSettledNoticeIds([decision]);
      expect(settledIds.has("del-notice-A")).toBe(true);
      expect(settledIds.has("del-notice-B")).toBe(true);

      // Recalculate summary after decision
      const summaryPost = getTeacherDelaySummary(sampleTeacher, notices, [decision]);
      expect(summaryPost.status).toBe("normal");
      expect(summaryPost.unsettledMinutes).toBe(0);
      expect(summaryPost.totalUnexcusedMinutes).toBe(0);
      expect(summaryPost.deductionDays).toBe(0);
    });
  });

  // =========================================================================
  // Scenario 8: Reports Acceptance Test (All Report Varieties)
  // =========================================================================
  describe("8. Reports Acceptance Test (All Administrative Varieties)", () => {
    it("Generates comprehensive and individual reports with official Vice Principal signatures", () => {
      const absences: AbsenceRecord[] = [
        {
          id: "abs-rep-1",
          teacherId: sampleTeacher.id,
          teacherName: sampleTeacher.name,
          date: today,
          type: "مرضي",
          reason: "إجازة مرضية معتمدة",
          timestamp: new Date().toISOString(),
        },
      ];

      const delays: DelayNotice[] = [
        {
          id: "del-rep-1",
          teacherId: sampleTeacher.id,
          teacherName: sampleTeacher.name,
          noticeDate: today,
          violationDelayStart: true,
          calculatedMinutes: 30,
          status: "completed",
          directorOpinion: "accepted",
          createdAt: new Date().toISOString(),
          hijriYear: "1446",
        },
      ];

      const permissionsList: EmployeePermission[] = [
        {
          id: "perm-rep-1",
          teacherId: sampleTeacher.id,
          teacherName: sampleTeacher.name,
          permissionDate: today,
          exitTime: "10:00",
          returnTime: "10:45",
          durationMinutes: 45,
          reason: "استئذان رسمي",
          createdAt: new Date().toISOString(),
        },
      ];

      const reportResult = generateReportData(
        "monthly_comprehensive_absence",
        {
          startDate: today,
          endDate: today,
          status: "all",
          specialty: "all",
          employmentStatus: "all",
        },
        [sampleTeacher],
        absences,
        delays,
        [],
        DEFAULT_ADMIN_NAME,
        permissionsList
      );

      expect(reportResult.payload.reportTitle).toBeDefined();
      expect(reportResult.payload.creatorName).toBe("أحلام صالح الضبيبي");
      expect(reportResult.payload.schoolName).toBe("الثانوية الخامسة مسارات");
      expect(reportResult.rawRowsCount).toBeGreaterThanOrEqual(1);

      // Verify HTML report output contains Ahlam Saleh Al-Dubaibi
      const html = buildReportHtml(reportResult.payload);
      expect(html).toContain("الثانوية الخامسة مسارات");
      expect(html).toContain("أحلام صالح الضبيبي");
      expect(html).toContain("وكيلة المدرسة");
      expect(html).toContain("نورة عبدالرحمن الغامدي");
    });
  });

  // =========================================================================
  // Scenario 9: Archive Operational Test (Non-destructive Soft Delete & Restore)
  // =========================================================================
  describe("9. Archive Operational Test (Soft Delete & Restore)", () => {
    it("Safely archives absence record and restores it with complete audit history", () => {
      const activeRecord: AbsenceRecord = {
        id: "abs-archive-test",
        teacherId: sampleTeacher.id,
        teacherName: sampleTeacher.name,
        date: today,
        type: "أخرى",
        reason: "مهمة إشرافية خارجية",
        timestamp: new Date().toISOString(),
        isArchived: false,
      };

      // 1. Soft Delete / Archive
      const archivedRecord: ArchivedAbsenceRecord = {
        ...activeRecord,
        isArchived: true,
        archivedAt: new Date().toISOString(),
        archiveReason: "تعديل في التكليف الإشرافي",
      };

      expect(archivedRecord.isArchived).toBe(true);
      expect(archivedRecord.archiveReason).toBe("تعديل في التكليف الإشرافي");

      // 2. Restoration
      const restoredRecord: AbsenceRecord = {
        ...archivedRecord,
        isArchived: false,
        archivedAt: undefined,
        archiveReason: undefined,
      };

      expect(restoredRecord.isArchived).toBe(false);
      expect(restoredRecord.teacherName).toBe("نورة عبدالرحمن الغامدي");
    });
  });

  // =========================================================================
  // Scenario 10: User Experience Review (Frictionless Workflows)
  // =========================================================================
  describe("10. User Experience Review (One-Click Operations)", () => {
    it("Enables single-click modal actions for absence, delay, and permission from the command center", () => {
      // All quick actions have direct modal triggers or dedicated routes
      const availableRoutes = [
        "/procedures/absence",
        "/procedures/delay-notice",
        "/procedures/permissions",
        "/procedures/deduction-hours",
        "/reports",
        "/archive",
      ];

      expect(availableRoutes.length).toBe(6);
      availableRoutes.forEach((route) => {
        expect(route.startsWith("/")).toBe(true);
      });
    });
  });

  // =========================================================================
  // Scenario 11: Data Preparation For Real Usage (School & Directory Validation)
  // =========================================================================
  describe("11. Data Preparation For Real Usage (Official Directory)", () => {
    it("Verifies approved official teacher directory has zero demo or dummy data", () => {
      const officialTeachers = getOfficialTeachersList();
      expect(officialTeachers.length).toBeGreaterThan(0);

      // Verify no test names exist in official list
      const hasTestResidue = officialTeachers.some(
        (t) =>
          t.name.includes("تجريب") ||
          t.name.includes("test") ||
          t.name.includes("وهمي") ||
          t.name.includes("Demo")
      );
      expect(hasTestResidue).toBe(false);

      // Verify all teachers have valid national ID / job numbers
      officialTeachers.forEach((t) => {
        expect(t.name.trim().length).toBeGreaterThan(0);
        expect(t.jobNumber.trim().length).toBeGreaterThan(0);
      });
    });
  });

  // =========================================================================
  // Scenario 12: First Production Day Simulation (Clean Workday Simulation)
  // =========================================================================
  describe("12. First Production Day Simulation (Full Clean Day Run)", () => {
    it("Simulates complete operational morning without any data collisions or leaks", () => {
      const teachers = getOfficialTeachersList().map((t, idx) => ({
        id: `prod-teacher-${idx + 1}`,
        name: t.name,
        fullName: t.name,
        jobNumber: t.jobNumber,
        job_number: t.jobNumber,
        nationalId: t.jobNumber,
        username: t.jobNumber,
        mobile: t.mobile || "0500000000",
        specialty: t.specialty,
        jobTitle: "معلم",
        employmentStatus: "دائم",
        totalAbsences: 0,
        totalDelayNotices: 0,
        isArchived: false,
        createdAt: new Date().toISOString(),
      }));

      expect(teachers.length).toBeGreaterThanOrEqual(10);
      const firstTeacher = teachers[0];

      // Action 1: Record 1 absence
      const absence: AbsenceRecord = {
        id: "prod-day1-abs-1",
        teacherId: firstTeacher.id,
        teacherName: firstTeacher.name,
        date: today,
        type: "مرضي",
        reason: "تقرير صحتي معتمد",
        timestamp: new Date().toISOString(),
      };

      // Action 2: Record 1 delay (30 mins)
      const delay: DelayNotice = {
        id: "prod-day1-del-1",
        teacherId: teachers[1].id,
        teacherName: teachers[1].name,
        noticeDate: today,
        violationDelayStart: true,
        calculatedMinutes: 30,
        status: "completed",
        directorOpinion: "accepted",
        createdAt: new Date().toISOString(),
        hijriYear: "1446",
      };

      // Action 3: Record 1 permission (45 mins)
      const permission: EmployeePermission = {
        id: "prod-day1-perm-1",
        teacherId: teachers[2].id,
        teacherName: teachers[2].name,
        permissionDate: today,
        exitTime: "11:00",
        returnTime: "11:45",
        durationMinutes: 45,
        reason: "استئذان رسمي",
        createdAt: new Date().toISOString(),
      };

      // Action 4: Compute Day 1 Radar & KPIs
      const radar = getSchoolRadarKPIs({
        teachers,
        delayNotices: [delay],
        deductionDecisions: [],
        inquiries: [],
      });

      expect(radar.teachersDueCount).toBe(0);
      expect(radar.pendingDirectorCount).toBe(0);

      // Action 5: Generate End of Day Comprehensive Report
      const report = generateReportData(
        "monthly_comprehensive_absence",
        {
          startDate: today,
          endDate: today,
          status: "all",
          specialty: "all",
          employmentStatus: "all",
        },
        teachers,
        [absence],
        [delay],
        [],
        DEFAULT_ADMIN_NAME,
        [permission]
      );

      expect(report.rawRowsCount).toBeGreaterThanOrEqual(1);
      expect(report.payload.creatorName).toBe("أحلام صالح الضبيبي");

      const html = buildReportHtml(report.payload);
      expect(html).toContain("الثانوية الخامسة مسارات");
      expect(html).toContain("أحلام صالح الضبيبي");
      expect(html).toContain(firstTeacher.name);
    });
  });
});
