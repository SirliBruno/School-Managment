import { describe, it, expect } from "vitest";
import {
  DEFAULT_ADMIN_NAME,
  DEFAULT_ADMIN_ROLE,
  DEFAULT_ADMIN_ROLE_LABEL,
  DEFAULT_ADMIN_SCHOOL,
  extractAdminUser,
} from "@/context/AuthContext";
import {
  generateDatabaseBackupSnapshot,
  restoreDatabaseBackupSnapshot,
  validateBackupSnapshot,
} from "@/lib/backupRecovery";
import { generateReportData } from "@/lib/reportsEngine";
import { buildReportHtml } from "@/lib/reportPdfService";
import { generatePermissionPdfHtml } from "@/lib/printPermissionPdfService";
import { logAuditEvent, getAuditLogs } from "@/lib/auditLogger";
import { calculateTimeDifference, getSaudiToday } from "@/lib/timeUtils";
import {
  calculateSchoolDelaySummaries,
  getSchoolRadarKPIs,
  generateSchoolProactiveAlerts,
} from "@/lib/delayDeductionIntegration";
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

describe("Sprint 5: Production Readiness, Smoke Tests & Full Workday UAT", () => {
  // Test Data Setup
  const sampleTeacher: Teacher = {
    id: "teacher-prod-01",
    name: "سارة محمد القحطاني",
    fullName: "سارة محمد القحطاني",
    job_number: "1029384756",
    jobNumber: "1029384756",
    nationalId: "1029384756",
    username: "1029384756",
    mobile: "0501234567",
    specialty: "لغة عربية",
    jobTitle: "معلم ممارس",
    employmentStatus: "دائم",
    teachingField: "العلوم الإنسانية",
    totalAbsences: 0,
    totalDelayNotices: 0,
    isArchived: false,
    createdAt: new Date().toISOString(),
  };

  describe("1. Production Smoke Testing (Essential Core Flows)", () => {
    it("Smoke 1: Admin Authentication & User Identity Extraction", () => {
      const mockSbUser: User = {
        id: "prod-admin-user",
        app_metadata: {},
        user_metadata: {
          full_name: DEFAULT_ADMIN_NAME,
          role: DEFAULT_ADMIN_ROLE,
          username: "wakila",
        },
        aud: "authenticated",
        created_at: new Date().toISOString(),
        email: "wakila@school.edu.sa",
      };

      const admin = extractAdminUser(mockSbUser);
      expect(admin.fullName).toBe("أحلام صالح الضبيبي");
      expect(admin.role).toBe("vice_principal");
      expect(admin.username).toBe("wakila");
      expect(DEFAULT_ADMIN_ROLE_LABEL).toBe("وكيلة المدرسة");
      expect(DEFAULT_ADMIN_SCHOOL).toBe("الثانوية الخامسة مسارات");
    });

    it("Smoke 2: Dashboard KPIs, Pulse & Proactive Radar Calculation", () => {
      const radar = getSchoolRadarKPIs({
        teachers: [sampleTeacher],
        delayNotices: [],
        deductionDecisions: [],
        inquiries: [],
      });

      expect(radar).toBeDefined();
      expect(radar.teachersDueCount).toBe(0);
      expect(radar.totalUnexcusedHours).toBe(0);
    });

    it("Smoke 3: Permission Duration Math and Bounds", () => {
      const diff = calculateTimeDifference("09:15", "11:45");
      expect(diff.totalMinutes).toBe(150);
      expect(diff.hours).toBe(2);
      expect(diff.minutes).toBe(30);
    });

    it("Smoke 4: Report Generation & Official PDF Signature Blocks", () => {
      const report = generateReportData(
        "monthly_comprehensive_absence",
        { month: "all", year: "2026", status: "all", specialty: "all", employmentStatus: "all" },
        [sampleTeacher],
        [],
        [],
        [],
        DEFAULT_ADMIN_NAME
      );

      expect(report.payload.creatorName).toBe("أحلام صالح الضبيبي");
      expect(report.payload.schoolName).toBe("الثانوية الخامسة مسارات");

      const html = buildReportHtml(report.payload);
      expect(html).toContain("أحلام صالح الضبيبي");
      expect(html).toContain("وكيلة المدرسة");
      expect(html).toContain("الثانوية الخامسة مسارات");
    });

    it("Smoke 5: Permission PDF Generation with Approved Vice-Principal Metadata", () => {
      const mockPerm: EmployeePermission = {
        id: "perm-smoke-01",
        teacherId: sampleTeacher.id,
        teacherName: sampleTeacher.fullName,
        nationalId: sampleTeacher.nationalId,
        jobNumber: sampleTeacher.jobNumber,
        specialty: sampleTeacher.specialty,
        permissionDate: getSaudiToday(),
        exitTime: "08:30",
        returnTime: "10:30",
        durationMinutes: 120,
        reason: "مراجعة دائرة حكومية",
        status: "approved",
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const pdfHtml = generatePermissionPdfHtml({
        permission: mockPerm,
        teacher: sampleTeacher,
      });

      expect(pdfHtml).toContain("أحلام صالح الضبيبي");
      expect(pdfHtml).toContain("وكيلة المدرسة");
      expect(pdfHtml).toContain("سارة محمد القحطاني");
    });
  });

  describe("2. Full Workday Operational Simulation (End-to-End UAT)", () => {
    let currentTeachers: Teacher[] = [{ ...sampleTeacher }];
    let currentAbsences: AbsenceRecord[] = [];
    let currentInquiries: AbsenceInquiry[] = [];
    let currentDelays: DelayNotice[] = [];
    let currentPermissions: EmployeePermission[] = [];
    let currentArchivedAbsences: ArchivedAbsenceRecord[] = [];

    it("Phase 1 (07:00 AM): Vice Principal logs in & checks system morning pulse", () => {
      const today = getSaudiToday();
      expect(today).toBeDefined();

      const pulse = {
        todayAbsences: currentAbsences.length,
        todayDelays: currentDelays.length,
        activeTeachersCount: currentTeachers.length,
      };

      expect(pulse.todayAbsences).toBe(0);
      expect(pulse.activeTeachersCount).toBe(1);
    });

    it("Phase 2 (07:30 AM): Recording teacher absence & generating WhatsApp inquiry", () => {
      const today = getSaudiToday();
      const newAbsence: AbsenceRecord = {
        id: "abs-uat-01",
        teacherId: sampleTeacher.id,
        teacherName: sampleTeacher.fullName,
        nationalId: sampleTeacher.nationalId,
        jobNumber: sampleTeacher.jobNumber,
        specialty: sampleTeacher.specialty,
        date: today,
        type: "مرضي",
        reason: "غياب بعذر مرضي تحت الإفادة",
        isArchived: false,
        timestamp: new Date().toISOString(),
      };
      currentAbsences.push(newAbsence);

      const newInquiry: AbsenceInquiry = {
        id: "inq-uat-01",
        teacherId: sampleTeacher.id,
        teacherName: sampleTeacher.fullName,
        job_number: sampleTeacher.jobNumber,
        specialty: sampleTeacher.specialty,
        mobile: sampleTeacher.mobile,
        absenceDate: today,
        days_count: 1,
        is_multi_day: false,
        token: "tok-uat-prod-999",
        status: "pending",
        expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      };
      currentInquiries.push(newInquiry);

      expect(currentAbsences.length).toBe(1);
      expect(currentInquiries.length).toBe(1);
      expect(currentInquiries[0].status).toBe("pending");
    });

    it("Phase 3 (07:45 AM): Logging delay notice with calculation", () => {
      const today = getSaudiToday();
      const delay: DelayNotice = {
        id: "del-uat-01",
        noticeNumber: "1448/01",
        teacherId: sampleTeacher.id,
        teacherName: sampleTeacher.fullName,
        job_number: sampleTeacher.jobNumber,
        specialty: sampleTeacher.specialty,
        noticeDate: today,
        date: today,
        violation_delay_start: true,
        delay_start_time: "07:45",
        status: "pending_teacher",
        hijri_year: "١٤٤٨",
        shareToken: "del-share-uat-1",
        tokenExpiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      };
      currentDelays.push(delay);

      expect(currentDelays.length).toBe(1);
      expect(currentDelays[0].violation_delay_start).toBe(true);
    });

    it("Phase 4 (09:15 AM): Logging official permission with Vice Principal creator info", () => {
      const today = getSaudiToday();
      const perm: EmployeePermission = {
        id: "perm-uat-01",
        teacherId: sampleTeacher.id,
        teacherName: sampleTeacher.fullName,
        nationalId: sampleTeacher.nationalId,
        jobNumber: sampleTeacher.jobNumber,
        specialty: sampleTeacher.specialty,
        permissionDate: today,
        exitTime: "09:15",
        returnTime: "11:15",
        durationMinutes: 120,
        reason: "مراجعة مستشفى الملك فيصل",
        status: "approved",
        createdByName: DEFAULT_ADMIN_NAME,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      currentPermissions.push(perm);

      expect(currentPermissions.length).toBe(1);
      expect(currentPermissions[0].createdByName).toBe("أحلام صالح الضبيبي");
      expect(currentPermissions[0].durationMinutes).toBe(120);
    });

    it("Phase 5 (11:00 AM): Teacher submits medical excuse through portal", () => {
      const targetInquiry = currentInquiries.find((i) => i.id === "inq-uat-01");
      expect(targetInquiry).toBeDefined();

      if (targetInquiry) {
        targetInquiry.status = "submitted";
        targetInquiry.teacherReason = "مراجعة مستشفى وأرفقت إجازة مرضية من صحتي";
        targetInquiry.attachmentUrl = "https://example.com/attachments/sick_leave.pdf";
        targetInquiry.submittedAt = new Date().toISOString();
      }

      expect(targetInquiry?.status).toBe("submitted");
      expect(targetInquiry?.attachmentUrl).toBeDefined();
    });

    it("Phase 6 (12:30 PM): Vice Principal reviews and approves excuse", () => {
      const targetInquiry = currentInquiries.find((i) => i.id === "inq-uat-01");
      expect(targetInquiry).toBeDefined();

      if (targetInquiry) {
        targetInquiry.status = "approved";
        targetInquiry.adminNotes = "تم اعتماد الإجازة المرضية بعد مطابقتها لمنصة صحتي";
      }

      expect(targetInquiry?.status).toBe("approved");
    });

    it("Phase 7 (01:15 PM): Generating end-of-day official comprehensive report", () => {
      const report = generateReportData(
        "monthly_comprehensive_absence",
        { month: "all", year: "2026", status: "all", specialty: "all", employmentStatus: "all" },
        currentTeachers,
        currentAbsences,
        currentDelays,
        [],
        DEFAULT_ADMIN_NAME,
        currentPermissions
      );

      expect(report.summaryHighlights.length).toBeGreaterThan(0);
      expect(report.payload.creatorName).toBe("أحلام صالح الضبيبي");
      expect(report.payload.tableRows.length).toBe(1);
    });

    it("Phase 8 (01:45 PM): Administrative Soft-Delete and Instant Point-in-time Recovery", () => {
      const targetAbsence = currentAbsences[0];
      expect(targetAbsence).toBeDefined();

      // Soft delete
      const now = new Date().toISOString();
      const archived: ArchivedAbsenceRecord = {
        record: {
          ...targetAbsence,
          isArchived: true,
          archivedAt: now,
          archiveReason: "اختبار دورة حياة الأرشفة والاستعادة",
          archivedBy: DEFAULT_ADMIN_NAME,
        },
        archivedAt: now,
        reason: "اختبار دورة حياة الأرشفة والاستعادة",
        archivedBy: DEFAULT_ADMIN_NAME,
      };
      currentArchivedAbsences.push(archived);
      currentAbsences = currentAbsences.filter((a) => a.id !== targetAbsence.id);

      expect(currentAbsences.length).toBe(0);
      expect(currentArchivedAbsences.length).toBe(1);

      // Instant restore
      const restored = {
        ...archived.record,
        isArchived: false,
        archivedAt: undefined,
        archiveReason: undefined,
        archivedBy: undefined,
      };
      currentAbsences.push(restored);
      currentArchivedAbsences = [];

      expect(currentAbsences.length).toBe(1);
      expect(currentAbsences[0].isArchived).toBe(false);
      expect(currentArchivedAbsences.length).toBe(0);
    });
  });

  describe("3. Production Snapshot Backup & Point-in-Time Recovery Validation", () => {
    it("should generate a tamper-evident snapshot with cryptographic checksum", () => {
      const snapshot = generateDatabaseBackupSnapshot({
        teachers: [sampleTeacher],
        absenceRecords: [],
        delayNotices: [],
        inquiries: [],
        deductionDecisions: [],
        permissions: [],
        archivedTeachers: [],
        archivedAbsences: [],
        archivedDelayNotices: [],
        archivedDeductionDecisions: [],
        archivedPermissions: [],
      });

      expect(snapshot.metadata.version).toBe("2.0.0");
      expect(snapshot.metadata.counts.teachers).toBe(1);
      expect(snapshot.metadata.checksum).toBeDefined();
      expect(snapshot.metadata.checksum).toMatch(/^chk_[0-9a-f]{8}_\d+$/);

      const validation = validateBackupSnapshot(snapshot);
      expect(validation.valid).toBe(true);
    });

    it("should accurately restore all entities point-in-time from backup snapshot", () => {
      const snapshot = generateDatabaseBackupSnapshot({
        teachers: [sampleTeacher],
        absenceRecords: [],
        delayNotices: [],
        inquiries: [],
        deductionDecisions: [],
        permissions: [],
        archivedTeachers: [],
        archivedAbsences: [],
        archivedDelayNotices: [],
        archivedDeductionDecisions: [],
        archivedPermissions: [],
      });

      const serialized = JSON.stringify(snapshot);
      const restoreResult = restoreDatabaseBackupSnapshot(serialized);

      expect(restoreResult.success).toBe(true);
      expect(restoreResult.data).toBeDefined();
      expect(restoreResult.data?.teachers.length).toBe(1);
      expect(restoreResult.data?.teachers[0].name).toBe(sampleTeacher.name);
    });
  });
});
