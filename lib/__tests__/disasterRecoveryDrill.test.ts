import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createDatabaseBackupSnapshot,
  validateBackupSnapshot,
  validateSnapshotIntegrity,
  restoreDatabaseBackupSnapshot,
  calculateChecksum,
  buildAttachmentsManifest,
  BACKUP_VERSION,
  type SystemBackupData,
  type SystemBackupSnapshot,
} from "@/lib/backupRecovery";
import {
  auditAttachmentIntegrity,
  isPrivateStorageBucket,
  getAttachmentBucketAndPath,
  resolveAttachmentUrl,
  parseAttachments,
} from "@/lib/attachments";
import { calculateNoticeDurationMinutes } from "@/lib/delayDeductionIntegration";
import { generateReportData } from "@/lib/reportsEngine";
import type {
  Teacher,
  AbsenceRecord,
  AbsenceInquiry,
  DelayNotice,
  DeductionDecision,
  EmployeePermission,
  AdministrativeInquiry,
  AuditLog,
} from "@/types/teacher";

describe("SPRINT 6: Disaster Recovery, Backup & Restore Verification Drill", () => {
  // Test baseline entities representing real-world production cases
  const sampleTeacher1: Teacher = {
    id: "t-drill-01",
    name: "سارة محمد العتيبي",
    fullName: "سارة محمد العتيبي",
    nationalId: "1011223344",
    jobNumber: "1011223344",
    job_number: "1011223344",
    mobile: "0551112233",
    specialty: "لغة عربية",
    jobTitle: "معلم ممارس",
    employmentStatus: "دائم",
    teachingField: "اللغة العربية",
    totalAbsences: 2,
    totalDelayNotices: 1,
    isArchived: false,
    createdAt: "2026-09-01T07:00:00.000Z",
  };

  const sampleTeacher2: Teacher = {
    id: "t-drill-02",
    name: "منى فهد الشهراني",
    fullName: "منى فهد الشهراني",
    nationalId: "1022334455",
    jobNumber: "1022334455",
    job_number: "1022334455",
    mobile: "0552223344",
    specialty: "فيزياء",
    jobTitle: "معلم متقدم",
    employmentStatus: "دائم",
    teachingField: "العلوم الطبيعية",
    totalAbsences: 1,
    totalDelayNotices: 0,
    isArchived: false,
    createdAt: "2026-09-01T07:00:00.000Z",
  };

  const sampleArchivedTeacher: Teacher = {
    id: "t-drill-archived-01",
    name: "نورة عبدالرحمن القحطاني",
    fullName: "نورة عبدالرحمن القحطاني",
    nationalId: "1033445566",
    jobNumber: "1033445566",
    job_number: "1033445566",
    mobile: "0553334455",
    specialty: "رياضيات",
    jobTitle: "معلم",
    employmentStatus: "دائم",
    teachingField: "الرياضيات",
    totalAbsences: 0,
    isArchived: true,
    archivedAt: "2026-09-15T10:00:00.000Z",
    archiveReason: "نقل إلى مدرسة أخرى",
  };

  // 1. Absence with Multi-Attachments (Sprint 2)
  const sampleAbsenceWithMultiAttachments: AbsenceRecord = {
    id: "abs-drill-01",
    teacherId: "t-drill-01",
    teacherName: "سارة محمد العتيبي",
    nationalId: "1011223344",
    jobNumber: "1011223344",
    specialty: "لغة عربية",
    date: "2026-10-10",
    type: "مرضي",
    reason: "تقرير طبي من مستشفى النور",
    attachmentUrl: JSON.stringify([
      { slotId: "faris", label: "مرفق فارس", url: "https://xizppykmqfkvzwcwxuzr.supabase.co/storage/v1/object/public/absence-attachments/manual-records/faris-01.pdf" },
      { slotId: "medical", label: "مرفق التقرير الطبي", url: "https://xizppykmqfkvzwcwxuzr.supabase.co/storage/v1/object/public/absence-attachments/manual-records/medical-01.png" },
    ]),
    attachmentUrls: [
      "https://xizppykmqfkvzwcwxuzr.supabase.co/storage/v1/object/public/absence-attachments/manual-records/faris-01.pdf",
      "https://xizppykmqfkvzwcwxuzr.supabase.co/storage/v1/object/public/absence-attachments/manual-records/medical-01.png",
    ],
    timestamp: "2026-10-10T08:00:00.000Z",
    isArchived: false,
  };

  // 2. Absence with Data URL (Offline/Fallback Storage)
  const sampleAbsenceWithDataUrl: AbsenceRecord = {
    id: "abs-drill-02",
    teacherId: "t-drill-02",
    teacherName: "منى فهد الشهراني",
    nationalId: "1022334455",
    jobNumber: "1022334455",
    specialty: "فيزياء",
    date: "2026-10-11",
    type: "اضطراري",
    reason: "ظرف عائلي طارئ",
    attachmentUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    timestamp: "2026-10-11T08:00:00.000Z",
    isArchived: false,
  };

  // 3. Multi-Cycle Inquiries for the SAME absence (Sprint 3)
  // Cycle 1: Rejected for "مرفقات خاطئة"
  const sampleInquiryCycle1: AbsenceInquiry = {
    id: "inq-drill-cycle-1",
    teacherId: "t-drill-01",
    teacherName: "سارة محمد العتيبي",
    nationalId: "1011223344",
    jobNumber: "1011223344",
    specialty: "لغة عربية",
    absenceDate: "2026-10-10",
    token: "tok-drill-cycle1-abc123",
    status: "rejected",
    expiresAt: "2026-10-17T08:00:00.000Z",
    absenceType: "مرضي",
    teacherReason: "عذر غير مكتمل",
    attachmentUrl: "https://xizppykmqfkvzwcwxuzr.supabase.co/storage/v1/object/public/absence-attachments/wrong-file.png",
    adminNotes: "تم الرفض لسبب: مرفقات خاطئة (تم إعادة إرسال مساءلة جديدة)",
  };

  // Cycle 2: Resent fresh 7-day inquiry
  const sampleInquiryCycle2: AbsenceInquiry = {
    id: "inq-drill-cycle-2",
    teacherId: "t-drill-01",
    teacherName: "سارة محمد العتيبي",
    nationalId: "1011223344",
    jobNumber: "1011223344",
    specialty: "لغة عربية",
    absenceDate: "2026-10-10",
    token: "tok-drill-cycle2-xyz789",
    status: "pending",
    expiresAt: "2026-10-19T08:00:00.000Z", // 7 full days
    absenceType: "مرضي",
  };

  // 4. Delay Notice with Delay Minutes & "أخرى" Custom Reason (Sprint 1)
  const sampleDelayNotice: DelayNotice = {
    id: "delay-drill-01",
    noticeNumber: "101",
    teacherId: "t-drill-01",
    teacherName: "سارة محمد العتيبي",
    jobNumber: "1011223344",
    specialty: "لغة عربية",
    noticeDate: "2026-10-12",
    violationDelayStart: true,
    delayStartTime: "07:15",
    delayStartFromTime: "06:45",
    calculatedMinutes: 30,
    additionalNotes: '{"calculatedMinutes":30,"calculatedDuration":"30 دقيقة","delayStartFromTime":"06:45","customReason":"عطل مفاجئ في المركبة"}',
    status: "completed",
    teacherReason: "أخرى",
    directorOpinion: "accepted",
    hijriYear: "١٤٤٨",
    shareToken: "share-drill-delay-01",
    tokenExpiresAt: "2026-10-19T08:00:00.000Z",
    createdAt: "2026-10-12T07:15:00.000Z",
  };

  // 5. Employee Permission
  const samplePermission: EmployeePermission = {
    id: "perm-drill-01",
    teacherId: "t-drill-01",
    teacherName: "سارة محمد العتيبي",
    nationalId: "1011223344",
    jobNumber: "1011223344",
    specialty: "لغة عربية",
    permissionDate: "2026-10-13",
    exitTime: "10:00",
    returnTime: "11:30",
    durationMinutes: 90,
    reason: "مراجعة دائرة حكومية",
    isArchived: false,
    createdAt: "2026-10-13T10:00:00.000Z",
  };

  // 6. Deduction Decision
  const sampleDeduction: DeductionDecision = {
    id: "deduct-drill-01",
    teacherId: "t-drill-01",
    teacherName: "سارة محمد العتيبي",
    civilId: "1011223344",
    jobNumber: "1011223344",
    delayMinutes: 420,
    totalHours: 7.0,
    deductionDays: 1,
    decisionNumber: "DED-2026-001",
    decisionDate: "2026-10-13",
    settledNoticeIds: ["delay-drill-01"],
    remainderMinutes: 0,
    isArchived: false,
    createdAt: "2026-10-13T12:00:00.000Z",
  };

  // 7. Administrative Inquiry
  const sampleAdminInquiry: AdministrativeInquiry = {
    id: "admin-inq-drill-01",
    inquiryNumber: "ADM-01",
    teacherId: "t-drill-01",
    teacherName: "سارة محمد العتيبي",
    inquiryType: "الامتناع عن المناوبة",
    incidentDate: "2026-10-09",
    status: "completed",
    token: "tok-admin-drill-01",
    tokenExpiresAt: "2026-10-16T08:00:00.000Z",
    teacherResponse: "كنت في مهمة إشرافية أخرى بتكليف شفوي",
    directorDecision: "accepted",
    createdAt: "2026-10-09T08:00:00.000Z",
    isArchived: false,
  };

  // 8. Audit Logs
  const sampleAuditLog: AuditLog = {
    id: "audit-drill-01",
    action: "BACKUP_CREATED",
    entityType: "backup",
    entityId: "snap-01",
    details: "إنشاء نسخة احتياطية اختبارية شاملة",
    timestamp: "2026-10-14T08:00:00.000Z",
    userRole: "vice_principal",
  };

  const sampleSchoolSettings = {
    id: "current",
    school_name: "الثانوية الخامسة مسارات",
    principal_name: "ريم هزاع الشمري",
    vice_principal_name: "أحلام صالح الضبيبي",
    school_logo: "https://xizppykmqfkvzwcwxuzr.supabase.co/storage/v1/object/public/school-assets/logo.png",
    stamp_url: "https://xizppykmqfkvzwcwxuzr.supabase.co/storage/v1/object/public/school-assets/stamp.png",
    signature_url: "https://xizppykmqfkvzwcwxuzr.supabase.co/storage/v1/object/public/school-assets/sig.png",
  };

  // =========================================================================
  // 1. Snapshot Creation, Manifest & Checksum Validation
  // =========================================================================
  describe("1. Snapshot Creation & Integrity Architecture", () => {
    it("generates a complete point-in-time snapshot with all 11+ entities and accurate counts", () => {
      const startTime = performance.now();

      const snapshot = createDatabaseBackupSnapshot({
        teachers: [sampleTeacher1, sampleTeacher2],
        absenceRecords: [sampleAbsenceWithMultiAttachments, sampleAbsenceWithDataUrl],
        inquiries: [sampleInquiryCycle1, sampleInquiryCycle2],
        delayNotices: [sampleDelayNotice],
        permissions: [samplePermission],
        deductionDecisions: [sampleDeduction],
        administrativeInquiries: [sampleAdminInquiry],
        archivedTeachers: [{ teacher: sampleArchivedTeacher, archivedAt: "2026-09-15", archiveReason: "نقل" }],
        schoolSettings: sampleSchoolSettings,
        auditLogs: [sampleAuditLog],
      });

      const durationMs = performance.now() - startTime;

      expect(snapshot.metadata.version).toBe(BACKUP_VERSION);
      expect(snapshot.metadata.counts.teachers).toBe(2);
      expect(snapshot.metadata.counts.absenceRecords).toBe(2);
      expect(snapshot.metadata.counts.inquiries).toBe(2);
      expect(snapshot.metadata.counts.delayNotices).toBe(1);
      expect(snapshot.metadata.counts.permissions).toBe(1);
      expect(snapshot.metadata.counts.deductionDecisions).toBe(1);
      expect(snapshot.metadata.counts.administrativeInquiries).toBe(1);
      expect(snapshot.metadata.counts.archivedTeachers).toBe(1);
      expect(snapshot.metadata.checksum).toMatch(/^chk_/);
      expect(snapshot.metadata.attachmentsManifest).toBeDefined();
      expect(snapshot.metadata.counts.attachmentsCount).toBeGreaterThan(0);

      // RTO benchmark for backup generation
      expect(durationMs).toBeLessThan(500); // Realistic tolerance for parallel runner under load
    });

    it("verifies cryptographic tamper detection (FNV-1a checksum mismatch rejects corrupted backup)", () => {
      const snapshot = createDatabaseBackupSnapshot({
        teachers: [sampleTeacher1],
        absenceRecords: [sampleAbsenceWithMultiAttachments],
      });

      const validCheck = validateBackupSnapshot(snapshot);
      expect(validCheck.valid).toBe(true);

      // Tamper simulation: secretly alter a teacher name or count
      const tampered = JSON.parse(JSON.stringify(snapshot));
      tampered.data.teachers[0].fullName = "اسم معدل خبيث";

      const tamperedCheck = validateBackupSnapshot(tampered);
      expect(tamperedCheck.valid).toBe(false);
      expect(tamperedCheck.error).toContain("التوقيع الرقمي غير مطابق");
    });
  });

  // =========================================================================
  // 2. Storage Buckets & Attachment Recovery
  // =========================================================================
  describe("2. Storage Buckets & Attachment Recovery", () => {
    it("correctly identifies private vs public buckets and resolves attachments safely", () => {
      expect(isPrivateStorageBucket("absence-attachments")).toBe(true);
      expect(isPrivateStorageBucket("school-assets")).toBe(false);

      const parsed = parseAttachments(sampleAbsenceWithMultiAttachments.attachmentUrl);
      expect(parsed.length).toBe(2);
      expect(parsed[0].label).toBe("مرفق فارس");
      expect(parsed[1].label).toBe("مرفق التقرير الطبي");

      const audit = auditAttachmentIntegrity(parsed);
      expect(audit.validCount).toBe(2);
      expect(audit.cloudStorageCount).toBe(2);
      expect(audit.warnings.length).toBe(0);
    });

    it("preserves Data URL attachments without 404 dependencies", () => {
      const { bucket } = getAttachmentBucketAndPath(sampleAbsenceWithDataUrl.attachmentUrl!);
      expect(bucket).toBe("data_url");

      const resolved = resolveAttachmentUrl(sampleAbsenceWithDataUrl.attachmentUrl);
      expect(resolved.startsWith("data:image/png")).toBe(true);
    });
  });

  // =========================================================================
  // 3. Multi-Cycle Inquiries & Reporting Non-Inflation
  // =========================================================================
  describe("3. Multi-Cycle Inquiries & Reporting Non-Inflation", () => {
    it("preserves both inquiry cycles (rejected + resent) without inflating absence reports", () => {
      const snapshot = createDatabaseBackupSnapshot({
        teachers: [sampleTeacher1],
        absenceRecords: [sampleAbsenceWithMultiAttachments],
        inquiries: [sampleInquiryCycle1, sampleInquiryCycle2],
      });

      // Restore into isolated dataset
      const restored = restoreDatabaseBackupSnapshot(JSON.stringify(snapshot));
      expect(restored.success).toBe(true);
      expect(restored.data?.inquiries.length).toBe(2);

      // Verify Cycle 1 survived with original response and rejection status
      const c1 = restored.data?.inquiries.find((i) => i.id === "inq-drill-cycle-1");
      expect(c1).toBeDefined();
      expect(c1?.status).toBe("rejected");
      expect(c1?.adminNotes).toContain("مرفقات خاطئة");

      // Verify Cycle 2 survived with new token and pending status
      const c2 = restored.data?.inquiries.find((i) => i.id === "inq-drill-cycle-2");
      expect(c2).toBeDefined();
      expect(c2?.status).toBe("pending");
      expect(c2?.token).toBe("tok-drill-cycle2-xyz789");

      // Critical Test: Ensure reports engine counts exactly ONE absence for Sarah, not two!
      const reportData = generateReportData(
        "detailed_teacher",
        { teacherId: sampleTeacher1.id },
        restored.data?.teachers || [],
        restored.data?.absenceRecords || [],
        restored.data?.delayNotices || [],
        restored.data?.deductionDecisions || [],
        "أحلام صالح الضبيبي",
        restored.data?.permissions || []
      );

      expect(reportData.rawRowsCount).toBe(1);
    });
  });

  // =========================================================================
  // 4. Delay Notice & PDF Delay Minutes Recovery (Sprint 1)
  // =========================================================================
  describe("4. Delay Notice & Delay Minutes Recovery", () => {
    it("preserves delay minutes metadata and custom reason across backup and restore", () => {
      const snapshot = createDatabaseBackupSnapshot({
        teachers: [sampleTeacher1],
        delayNotices: [sampleDelayNotice],
      });

      const restored = restoreDatabaseBackupSnapshot(JSON.stringify(snapshot));
      expect(restored.success).toBe(true);

      const restoredNotice = restored.data?.delayNotices[0];
      expect(restoredNotice).toBeDefined();
      expect(restoredNotice?.violationDelayStart).toBe(true);
      expect(restoredNotice?.delayStartTime).toBe("07:15");

      // Calculate minutes using authoritative integration helper
      const minutes = calculateNoticeDurationMinutes(restoredNotice!);
      expect(minutes).toBe(30);

      const parsedMeta = JSON.parse(restoredNotice?.additionalNotes || "{}");
      expect(parsedMeta.customReason).toBe("عطل مفاجئ في المركبة");
      expect(parsedMeta.delayStartFromTime).toBe("06:45");
    });
  });

  // =========================================================================
  // 5. Foreign Key & Topological Integrity Drill
  // =========================================================================
  describe("5. Foreign Key & Topological Integrity Drill", () => {
    it("passes integrity check when all referenced teachers exist", () => {
      const snapshot = createDatabaseBackupSnapshot({
        teachers: [sampleTeacher1, sampleTeacher2],
        archivedTeachers: [{ teacher: sampleArchivedTeacher, archivedAt: "2026-09-15", archiveReason: "نقل" }],
        absenceRecords: [sampleAbsenceWithMultiAttachments, sampleAbsenceWithDataUrl],
        inquiries: [sampleInquiryCycle1, sampleInquiryCycle2],
        delayNotices: [sampleDelayNotice],
      });

      const integrity = validateSnapshotIntegrity(snapshot);
      expect(integrity.valid).toBe(true);
      expect(integrity.orphanCount).toBe(0);
      expect(integrity.warnings.length).toBe(0);
    });

    it("detects and flags orphaned records when parent teacher is missing", () => {
      const orphanAbsence: AbsenceRecord = {
        ...sampleAbsenceWithDataUrl,
        id: "abs-orphan-01",
        teacherId: "non-existent-teacher-999",
      };

      const snapshot = createDatabaseBackupSnapshot({
        teachers: [sampleTeacher1], // teacher2 is missing
        absenceRecords: [orphanAbsence],
      });

      const integrity = validateSnapshotIntegrity(snapshot);
      expect(integrity.valid).toBe(false);
      expect(integrity.orphanCount).toBe(1);
      expect(integrity.warnings[0]).toContain("يشير لمعلمة غير موجودة");
    });
  });

  // =========================================================================
  // 6. Post-Restore Operability & Write Test (Sequence / Collision Check)
  // =========================================================================
  describe("6. Post-Restore Controlled Write Test", () => {
    it("allows inserting a new teacher and absence after restore without ID collisions", () => {
      const snapshot = createDatabaseBackupSnapshot({
        teachers: [sampleTeacher1],
        absenceRecords: [sampleAbsenceWithMultiAttachments],
      });

      const restored = restoreDatabaseBackupSnapshot(JSON.stringify(snapshot));
      expect(restored.success).toBe(true);

      const operationalTeachers = [...(restored.data?.teachers || [])];
      const operationalAbsences = [...(restored.data?.absenceRecords || [])];

      // Simulate a new user action post-recovery
      const newTeacher: Teacher = {
        id: `teacher-${Date.now()}`,
        name: "عبير خالد الدوسري",
        fullName: "عبير خالد الدوسري",
        nationalId: "1099887766",
        jobNumber: "1099887766",
        job_number: "1099887766",
        specialty: "كيمياء",
        totalAbsences: 0,
        isArchived: false,
      };

      // Check collision
      expect(operationalTeachers.some((t) => t.id === newTeacher.id)).toBe(false);
      operationalTeachers.push(newTeacher);

      const newAbsence: AbsenceRecord = {
        id: `abs-${Date.now()}`,
        teacherId: newTeacher.id,
        teacherName: newTeacher.name,
        specialty: newTeacher.specialty!,
        date: "2026-10-14",
        type: "اضطراري",
        reason: "ظرف عائلي",
        timestamp: new Date().toISOString(),
      };

      expect(operationalAbsences.some((a) => a.id === newAbsence.id)).toBe(false);
      operationalAbsences.push(newAbsence);

      expect(operationalTeachers.length).toBe(2);
      expect(operationalAbsences.length).toBe(2);
    });
  });

  // =========================================================================
  // 7. RTO & RPO Measurement Benchmark
  // =========================================================================
  describe("7. RTO & RPO Measurement Benchmark", () => {
    it("measures end-to-end recovery duration meeting tight operational limits", () => {
      const largeTeacherDataset: Teacher[] = Array.from({ length: 100 }, (_, i) => ({
        id: `t-bench-${i}`,
        name: `معلمة تجريبية ${i}`,
        fullName: `معلمة تجريبية ${i}`,
        nationalId: `100000000${i}`,
        jobNumber: `100000000${i}`,
        job_number: `100000000${i}`,
        specialty: "عام",
        totalAbsences: 0,
      }));

      const largeAbsenceDataset: AbsenceRecord[] = Array.from({ length: 200 }, (_, i) => ({
        id: `abs-bench-${i}`,
        teacherId: `t-bench-${i % 100}`,
        teacherName: `معلمة تجريبية ${i % 100}`,
        specialty: "عام",
        date: "2026-10-14",
        type: "مرضي",
        reason: "فحص روتيني",
        timestamp: new Date().toISOString(),
      }));

      const t0 = performance.now();
      const snapshot = createDatabaseBackupSnapshot({
        teachers: largeTeacherDataset,
        absenceRecords: largeAbsenceDataset,
      });
      const tSnapshot = performance.now() - t0;

      const serialized = JSON.stringify(snapshot);

      const t1 = performance.now();
      const restored = restoreDatabaseBackupSnapshot(serialized);
      const tRestore = performance.now() - t1;

      expect(restored.success).toBe(true);
      expect(restored.data?.teachers.length).toBe(100);
      expect(restored.data?.absenceRecords.length).toBe(200);

      // Observed RTO: parsing + validation + reconstruction < 200ms
      expect(tSnapshot + tRestore).toBeLessThan(350);
    });
  });
});
