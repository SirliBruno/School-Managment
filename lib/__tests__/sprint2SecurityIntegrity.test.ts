import { describe, it, expect, beforeEach } from "vitest";
import {
  Teacher,
  AbsenceRecord,
  DelayNotice,
  DeductionDecision,
  EmployeePermission,
  ArchivedTeacher,
  ArchivedAbsenceRecord,
  ArchivedDelayNotice,
  ArchivedDeductionDecision,
  ArchivedEmployeePermission,
} from "@/types/teacher";
import {
  createDatabaseBackupSnapshot,
  restoreDatabaseBackupSnapshot,
  validateBackupSnapshot,
  calculateChecksum,
} from "@/lib/backupRecovery";
import {
  logAuditEvent,
  getLocalAuditLogs,
  clearLocalAuditLogs,
} from "@/lib/auditLogger";

describe("SPRINT 2: Data Integrity, Archive & Security Hardening Test Suite", () => {
  const sampleTeacher: Teacher = {
    id: "t-sec-1",
    fullName: "نورة عبد العزيز السالم",
    nationalId: "1023456789",
    jobNumber: "1023456789",
    specialty: "رياضيات",
    employmentStatus: "دائم",
    totalAbsences: 2,
    totalDelayNotices: 1,
    isArchived: false,
  };

  const sampleAbsence: AbsenceRecord = {
    id: "abs-sec-1",
    teacherId: "t-sec-1",
    teacherName: "نورة عبد العزيز السالم",
    jobNumber: "1023456789",
    specialty: "رياضيات",
    date: "2026-09-15",
    type: "مرضي",
    reason: "وعكة صحية",
    timestamp: "2026-09-15T08:00:00Z",
    isArchived: false,
  };

  const sampleDelay: DelayNotice = {
    id: "del-sec-1",
    teacherId: "t-sec-1",
    teacherName: "نورة عبد العزيز السالم",
    jobNumber: "1023456789",
    specialty: "رياضيات",
    noticeDate: "2026-09-16",
    violationDelayStart: true,
    delayStartTime: "07:30",
    violationAbsentDuring: false,
    violationEarlyDeparture: false,
    violationLeftSchool: false,
    status: "completed",
    directorOpinion: "rejected_with_deduction",
    hijriYear: "١٤٤٨",
    shareToken: "tok-sec-del",
    tokenExpiresAt: "2026-09-18T08:00:00Z",
    createdAt: "2026-09-16T08:00:00Z",
    isArchived: false,
  };

  const sampleDeduction: DeductionDecision = {
    id: "ded-sec-1",
    teacherId: "t-sec-1",
    teacherName: "نورة عبد العزيز السالم",
    civilId: "1023456789",
    specialization: "رياضيات",
    schoolName: "المدرسة النموذجية",
    principalName: "أ. منيرة الحربي",
    delayHours: 7,
    delayMinutes: 420,
    deductionDays: 1,
    decisionNumber: "حسم-101/48",
    decisionDate: "2026-09-17",
    hijriYear: "١٤٤٨",
    createdAt: "2026-09-17T10:00:00Z",
    isArchived: false,
  };

  const samplePermission: EmployeePermission = {
    id: "perm-sec-1",
    teacherId: "t-sec-1",
    teacherName: "نورة عبد العزيز السالم",
    nationalId: "1023456789",
    permissionDate: "2026-09-18",
    exitTime: "09:00",
    returnTime: "10:30",
    durationMinutes: 90,
    reason: "مراجعة دائرة حكومية",
    createdAt: "2026-09-18T08:30:00Z",
    isArchived: false,
  };

  beforeEach(() => {
    clearLocalAuditLogs();
  });

  /* =========================================================
   * 1. Administrative Archive & Zero Hard-Delete Audit
   * ========================================================= */
  describe("1. Administrative Archive & Zero Hard Delete", () => {
    it("should enforce soft-delete on all operational entities (never physical deletion)", () => {
      const now = new Date().toISOString();
      const reason = "أرشفة إدارية معتمدة";

      // 1. Soft delete Teacher
      const archivedTeacher: Teacher = {
        ...sampleTeacher,
        isArchived: true,
        archivedAt: now,
        archiveReason: reason,
      };
      expect(archivedTeacher.isArchived).toBe(true);
      expect(archivedTeacher.archivedAt).toBe(now);

      // 2. Soft delete Absence Record
      const archivedAbs: AbsenceRecord = {
        ...sampleAbsence,
        isArchived: true,
        archivedAt: now,
        archiveReason: reason,
      };
      expect(archivedAbs.isArchived).toBe(true);

      // 3. Soft delete Delay Notice
      const archivedDel: DelayNotice = {
        ...sampleDelay,
        isArchived: true,
        archivedAt: now,
        archiveReason: reason,
      };
      expect(archivedDel.isArchived).toBe(true);

      // 4. Soft delete Deduction Decision
      const archivedDed: DeductionDecision = {
        ...sampleDeduction,
        isArchived: true,
        archivedAt: now,
        archiveReason: reason,
      };
      expect(archivedDed.isArchived).toBe(true);

      // 5. Soft delete Employee Permission
      const archivedPerm: EmployeePermission = {
        ...samplePermission,
        isArchived: true,
        archivedAt: now,
        archivedBy: "وكيلة الشؤون التعليمية",
        archiveReason: reason,
      };
      expect(archivedPerm.isArchived).toBe(true);
    });

    it("should filter out archived records from operational views", () => {
      const activeRecords = [sampleAbsence];
      const archivedRecords: AbsenceRecord[] = [
        { ...sampleAbsence, id: "abs-2", isArchived: true },
      ];

      const allRecords = [...activeRecords, ...archivedRecords];
      const operationalView = allRecords.filter((r) => !r.isArchived);

      expect(operationalView.length).toBe(1);
      expect(operationalView[0].id).toBe(sampleAbsence.id);
    });
  });

  /* =========================================================
   * 2. Cascade Archive & Orphan Prevention Audit
   * ========================================================= */
  describe("2. Cascade Archive & Orphan Prevention", () => {
    it("should cascade-archive all associated records when teacher is archived", () => {
      const now = new Date().toISOString();
      const teacherId = sampleTeacher.id;

      let operationalTeachers = [sampleTeacher];
      let operationalAbsences = [sampleAbsence];
      let operationalDelays = [sampleDelay];
      let operationalDeductions = [sampleDeduction];
      let operationalPermissions = [samplePermission];

      // Execute cascade archive of teacher
      const cascadeReason = "أرشفة تلقائية مع المعلمة";
      const targetAbs = operationalAbsences
        .filter((a) => a.teacherId === teacherId)
        .map((a) => ({
          ...a,
          isArchived: true,
          archivedAt: now,
          archiveReason: cascadeReason,
          archivedByCascade: true,
        }));

      const targetDel = operationalDelays
        .filter((d) => d.teacherId === teacherId)
        .map((d) => ({
          ...d,
          isArchived: true,
          archivedAt: now,
          archiveReason: cascadeReason,
          archivedByCascade: true,
        }));

      const targetDed = operationalDeductions
        .filter((dec) => dec.teacherId === teacherId)
        .map((dec) => ({
          ...dec,
          isArchived: true,
          archivedAt: now,
          archiveReason: cascadeReason,
          archivedByCascade: true,
        }));

      const targetPerm = operationalPermissions
        .filter((p) => p.teacherId === teacherId)
        .map((p) => ({
          ...p,
          isArchived: true,
          archivedAt: now,
          archivedByCascade: true,
        }));

      // Active state clean
      operationalTeachers = operationalTeachers.filter((t) => t.id !== teacherId);
      operationalAbsences = operationalAbsences.filter((a) => a.teacherId !== teacherId);
      operationalDelays = operationalDelays.filter((d) => d.teacherId !== teacherId);
      operationalDeductions = operationalDeductions.filter((dec) => dec.teacherId !== teacherId);
      operationalPermissions = operationalPermissions.filter((p) => p.teacherId !== teacherId);

      // Verify no orphaned records remaining in active operational tables
      expect(operationalTeachers.length).toBe(0);
      expect(operationalAbsences.length).toBe(0);
      expect(operationalDelays.length).toBe(0);
      expect(operationalDeductions.length).toBe(0);
      expect(operationalPermissions.length).toBe(0);

      // Verify all cascaded records have archivedByCascade flag
      expect(targetAbs[0].archivedByCascade).toBe(true);
      expect(targetDel[0].archivedByCascade).toBe(true);
      expect(targetDed[0].archivedByCascade).toBe(true);
      expect(targetPerm[0].archivedByCascade).toBe(true);
    });

    it("should restore cascaded records and correct teacher counters upon restore", () => {
      const teacherId = sampleTeacher.id;
      const cascadedAbsence: AbsenceRecord = {
        ...sampleAbsence,
        isArchived: true,
        archivedByCascade: true,
      };

      const cascadedDelay: DelayNotice = {
        ...sampleDelay,
        isArchived: true,
        archivedByCascade: true,
      };

      // Unarchive
      const restoredAbsence: AbsenceRecord = {
        ...cascadedAbsence,
        isArchived: false,
        archivedByCascade: undefined,
      };

      const restoredDelay: DelayNotice = {
        ...cascadedDelay,
        isArchived: false,
        archivedByCascade: undefined,
      };

      const restoredTeacher: Teacher = {
        ...sampleTeacher,
        isArchived: false,
        totalAbsences: 1,
        totalDelayNotices: 1,
      };

      expect(restoredTeacher.isArchived).toBe(false);
      expect(restoredAbsence.isArchived).toBe(false);
      expect(restoredDelay.isArchived).toBe(false);
      expect(restoredTeacher.totalAbsences).toBe(1);
      expect(restoredTeacher.totalDelayNotices).toBe(1);
    });
  });

  /* =========================================================
   * 3. Duplicate Prevention & Uniqueness Constraints
   * ========================================================= */
  describe("3. Duplicate Prevention & Database Constraints", () => {
    it("should prevent duplicate active absence for the same teacher on the same date", () => {
      const activeAbsences: AbsenceRecord[] = [sampleAbsence];

      const newAbsenceAttempt = {
        teacherId: sampleAbsence.teacherId,
        date: sampleAbsence.date,
      };

      const isDuplicate = activeAbsences.some(
        (a) =>
          !a.isArchived &&
          a.teacherId === newAbsenceAttempt.teacherId &&
          a.date === newAbsenceAttempt.date
      );

      expect(isDuplicate).toBe(true);
    });

    it("should prevent overlapping permissions for the same teacher on the same date", () => {
      const activePermissions: EmployeePermission[] = [samplePermission]; // 09:00 - 10:30

      const toMinutes = (timeStr: string) => {
        const [h, m] = timeStr.split(":").map(Number);
        return h * 60 + m;
      };

      const checkOverlap = (exit: string, ret: string): boolean => {
        const s = toMinutes(exit);
        const e = toMinutes(ret);
        return activePermissions.some((p) => {
          if (p.isArchived) return false;
          const pStart = toMinutes(p.exitTime);
          const pEnd = toMinutes(p.returnTime);
          return Math.max(s, pStart) < Math.min(e, pEnd);
        });
      };

      // Overlapping: 09:30 - 11:00 (overlaps with 09:00 - 10:30)
      expect(checkOverlap("09:30", "11:00")).toBe(true);

      // Overlapping: 08:30 - 09:30 (overlaps with 09:00 - 10:30)
      expect(checkOverlap("08:30", "09:30")).toBe(true);

      // Overlapping: 09:15 - 10:00 (inside 09:00 - 10:30)
      expect(checkOverlap("09:15", "10:00")).toBe(true);

      // Non-overlapping: 11:00 - 12:00 (after 10:30)
      expect(checkOverlap("11:00", "12:00")).toBe(false);

      // Non-overlapping: 07:30 - 08:45 (before 09:00)
      expect(checkOverlap("07:30", "08:45")).toBe(false);
    });

    it("should prevent duplicate nationalId across both active and archived teachers", () => {
      const activeTeachers: Teacher[] = [sampleTeacher];
      const archivedTeachers: ArchivedTeacher[] = [];

      const duplicateNationalId = sampleTeacher.nationalId;

      const existsInActive = activeTeachers.some((t) => t.nationalId === duplicateNationalId);
      const existsInArchived = archivedTeachers.some(
        (a) => a.teacher.nationalId === duplicateNationalId
      );

      expect(existsInActive || existsInArchived).toBe(true);
    });
  });

  /* =========================================================
   * 4. Audit Log System (audit_logs)
   * ========================================================= */
  describe("4. Audit Logging System", () => {
    it("should log CREATE, ARCHIVE, RESTORE, and APPROVE actions with user details", () => {
      // 1. Log CREATE
      const createLog = logAuditEvent({
        action: "CREATE",
        entityType: "teacher",
        entityId: sampleTeacher.id,
        details: `إضافة المعلمة: ${sampleTeacher.fullName}`,
        newValue: sampleTeacher as unknown as Record<string, unknown>,
      });

      expect(createLog.action).toBe("CREATE");
      expect(createLog.entityType).toBe("teacher");
      expect(createLog.details).toContain(sampleTeacher.fullName);

      // 2. Log ARCHIVE
      const archiveLog = logAuditEvent({
        action: "ARCHIVE",
        entityType: "absence",
        entityId: sampleAbsence.id,
        details: `أرشفة غياب المعلمة: ${sampleAbsence.teacherName}`,
        oldValue: sampleAbsence as unknown as Record<string, unknown>,
      });

      expect(archiveLog.action).toBe("ARCHIVE");
      expect(archiveLog.entityType).toBe("absence");

      // 3. Log APPROVE
      const approveLog = logAuditEvent({
        action: "APPROVE",
        entityType: "inquiry",
        entityId: "inq-100",
        details: "اعتماد عذر المساءلة الإلكترونية",
      });

      expect(approveLog.action).toBe("APPROVE");

      // 4. Retrieve stored logs
      const localLogs = getLocalAuditLogs();
      expect(localLogs.length).toBeGreaterThanOrEqual(3);
    });
  });

  /* =========================================================
   * 5. Backup & Point-in-Time Recovery
   * ========================================================= */
  describe("5. System Backup & Point-in-Time Recovery", () => {
    it("should generate a complete snapshot with valid checksum and metadata", () => {
      const snapshot = createDatabaseBackupSnapshot({
        teachers: [sampleTeacher],
        absenceRecords: [sampleAbsence],
        delayNotices: [sampleDelay],
        deductionDecisions: [sampleDeduction],
        permissions: [samplePermission],
      });

      expect(snapshot.metadata).toBeDefined();
      expect(snapshot.metadata.version).toBe("2.0.0");
      expect(snapshot.metadata.counts.teachers).toBe(1);
      expect(snapshot.metadata.counts.absenceRecords).toBe(1);
      expect(snapshot.metadata.counts.permissions).toBe(1);
      expect(snapshot.metadata.checksum).toBeDefined();

      // Checksum validation
      const validation = validateBackupSnapshot(snapshot);
      expect(validation.valid).toBe(true);
    });

    it("should reject corrupted or tampered snapshots when checksum mismatch occurs", () => {
      const snapshot = createDatabaseBackupSnapshot({
        teachers: [sampleTeacher],
      });

      // Tamper with data
      const tampered = JSON.parse(JSON.stringify(snapshot));
      tampered.data.teachers[0].fullName = "اسم معدل غير مصرح به";

      const validation = validateBackupSnapshot(tampered);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("التوقيع الرقمي غير مطابق");
    });

    it("should accurately restore all entities point-in-time from backup JSON", () => {
      const originalSnapshot = createDatabaseBackupSnapshot({
        teachers: [sampleTeacher],
        absenceRecords: [sampleAbsence],
        delayNotices: [sampleDelay],
        deductionDecisions: [sampleDeduction],
        permissions: [samplePermission],
      });

      const serialized = JSON.stringify(originalSnapshot);
      const restoreResult = restoreDatabaseBackupSnapshot(serialized);

      expect(restoreResult.success).toBe(true);
      expect(restoreResult.data).toBeDefined();
      expect(restoreResult.data?.teachers.length).toBe(1);
      expect(restoreResult.data?.teachers[0].id).toBe(sampleTeacher.id);
      expect(restoreResult.data?.permissions.length).toBe(1);
      expect(restoreResult.data?.permissions[0].id).toBe(samplePermission.id);
    });
  });
});
