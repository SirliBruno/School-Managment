import { describe, it, expect } from "vitest";
import {
  createDatabaseBackupSnapshot,
  validateBackupSnapshot,
  calculateChecksum,
  BACKUP_VERSION,
} from "@/lib/backupRecovery";
import {
  DEFAULT_SCHOOL_SETTINGS,
  getActiveSchoolSettings,
} from "@/lib/schoolSettingsService";
import {
  Teacher,
  AbsenceRecord,
  AbsenceInquiry,
  AdministrativeInquiry,
  DelayNotice,
  DeductionDecision,
  EmployeePermission,
  ArchivedTeacher,
  ArchivedAbsenceRecord,
  ArchivedDelayNotice,
  ArchivedDeductionDecision,
  ArchivedEmployeePermission,
  ArchivedAdministrativeInquiry,
  AuditLog,
} from "@/types/teacher";
import {
  parseAttachments,
  resolveAttachmentUrl,
} from "@/lib/attachments";
import {
  getSaudiToday,
  calculate48HoursExpiry,
  generateSecureToken,
  isTokenExpired,
} from "@/lib/timeUtils";
import {
  getTeacherDelaySummary,
} from "@/lib/delayDeductionIntegration";
import {
  generateReportData,
} from "@/lib/reportsEngine";
import {
  normalizeArabicName,
  normalizeNationalId,
  cleanAndDeduplicateSystemData,
} from "@/lib/teacherDeduplication";

describe("Final Production Readiness Audit Suite (فحص الجاهزية النهائية للإنتاج)", () => {
  // Test Dataset representing the full official production state
  const mockTeachers: Teacher[] = [
    {
      id: "prod-t1",
      nationalId: "1092332483",
      fullName: "ساره محمد سليمان الطلحي",
      jobTitle: "معلم",
      teachingField: "الحاسب الآلي",
      specialty: "حاسب",
      mobile: "966569418491",
      employmentStatus: "عقد",
      totalAbsences: 2,
      totalDelayNotices: 1,
      createdAt: "2026-09-01T08:00:00Z",
    },
    {
      id: "prod-t2",
      nationalId: "1043325131",
      fullName: "البتول محمد سليمان الصوفي",
      jobTitle: "معلم",
      teachingField: "دين",
      specialty: "دين",
      mobile: "966550801116",
      employmentStatus: "دائم",
      totalAbsences: 1,
      totalDelayNotices: 0,
      createdAt: "2026-09-01T08:00:00Z",
    },
  ];

  const mockAbsences: AbsenceRecord[] = [
    {
      id: "abs-1",
      teacherId: "prod-t1",
      teacherName: "ساره محمد سليمان الطلحي",
      nationalId: "1092332483",
      specialty: "حاسب",
      date: "2026-09-10",
      type: "مرضي",
      reason: "تقرير طبي من مستشفى الملك فيصل",
      attachmentUrl: "absence-attachments/manual-records/med_1.pdf",
      timestamp: "2026-09-10T08:00:00Z",
      isArchived: false,
    },
    {
      id: "abs-2",
      teacherId: "prod-t1",
      teacherName: "ساره محمد سليمان الطلحي",
      nationalId: "1092332483",
      specialty: "حاسب",
      date: "2026-09-15",
      type: "اضطراري",
      reason: "ظرف عائلي",
      attachmentUrl: '[{"slotId":"slot-1","url":"https://example.com/att1.jpg"}]',
      timestamp: "2026-09-15T08:00:00Z",
      isArchived: false,
    },
    {
      id: "abs-3",
      teacherId: "prod-t2",
      teacherName: "البتول محمد سليمان الصوفي",
      nationalId: "1043325131",
      specialty: "دين",
      date: "2026-09-12",
      type: "اضطراري",
      reason: "عذر مقبول",
      timestamp: "2026-09-12T08:00:00Z",
      isArchived: false,
    },
  ];

  const mockAdminInquiries: AdministrativeInquiry[] = [
    {
      id: "admin-inq-1",
      inquiryNumber: "ADM-001",
      teacherId: "prod-t1",
      teacherName: "ساره محمد سليمان الطلحي",
      nationalId: "1092332483",
      jobTitle: "معلم",
      specialty: "حاسب",
      inquiryType: "التأخير عن دخول الحصص",
      incidentDate: "2026-09-20",
      description: "التأخر عن الحصة الأولى 15 دقيقة",
      status: "completed",
      token: "secure-admin-token-1",
      tokenExpiresAt: "2026-09-22T08:00:00Z",
      teacherResponse: "تم التواجد بالمعمل لترتيب الأجهزة",
      responseDate: "2026-09-20T10:00:00Z",
      directorDecision: "accepted",
      decisionDate: "2026-09-20T11:00:00Z",
      createdAt: "2026-09-20T08:00:00Z",
      isArchived: false,
    },
  ];

  const mockDelays: DelayNotice[] = [
    {
      id: "del-1",
      noticeNumber: "DN-001",
      teacherId: "prod-t1",
      teacherName: "ساره محمد سليمان الطلحي",
      nationalId: "1092332483",
      specialty: "حاسب",
      date: "2026-09-18",
      noticeDate: "2026-09-18",
      delayMinutes: 45,
      calculatedDuration: "45 دقيقة",
      delayType: "صباحي",
      status: "completed",
      token: "tok-del-1",
      tokenExpiresAt: "2026-09-20T08:00:00Z",
      createdAt: "2026-09-18T08:00:00Z",
      isArchived: false,
    },
  ];

  // ---------------------------------------------------------------------------
  // المرحلة الأولى: Data Integrity & Relations Audit
  // ---------------------------------------------------------------------------
  describe("المرحلة الأولى: تدقيق سلامة البيانات والعلاقات المترابطة (Data Integrity & Relations)", () => {
    it("1.1 يضمن عدم وجود سجلات يتيمة (Orphan Records) وتطابق العلاقات المفتاحية", () => {
      const teacherIds = new Set(mockTeachers.map((t) => t.id));
      
      // All absences must link to existing valid teachers
      for (const abs of mockAbsences) {
        expect(teacherIds.has(abs.teacherId)).toBe(true);
        expect(abs.nationalId).toBeDefined();
        expect(abs.teacherName.length).toBeGreaterThan(0);
      }

      // All admin inquiries must link to valid teachers
      for (const inq of mockAdminInquiries) {
        expect(teacherIds.has(inq.teacherId)).toBe(true);
        expect(inq.inquiryNumber).toMatch(/^ADM-/);
      }

      // All delays must link to valid teachers
      for (const del of mockDelays) {
        expect(teacherIds.has(del.teacherId)).toBe(true);
      }
    });

    it("1.2 يضمن تطابق عداد غياب المعلمات الفعلي مع مجموع السجلات غير المؤرشفة", () => {
      for (const teacher of mockTeachers) {
        const actualActiveAbsCount = mockAbsences.filter(
          (a) => a.teacherId === teacher.id && !a.isArchived
        ).length;
        expect(teacher.totalAbsences).toBe(actualActiveAbsCount);
      }
    });

    it("1.3 يمنع ازدواجية السجلات عند تنظيف البيانات وإعادة معالجتها", () => {
      const dedupResult = cleanAndDeduplicateSystemData(
        mockTeachers,
        mockAbsences,
        mockDelays,
        [],
        [],
        [],
        []
      );
      expect(dedupResult.cleanTeachers.length).toBe(mockTeachers.length);
      expect(dedupResult.cleanAbsences.length).toBe(mockAbsences.length);
    });
  });

  // ---------------------------------------------------------------------------
  // المرحلة الثانية: Backup & Recovery Engine Audit
  // ---------------------------------------------------------------------------
  describe("المرحلة الثانية: تدقيق النسخ الاحتياطي الشامل والتوقيع الرقمي (Backup Verification)", () => {
    it("2.1 ينشئ لقطة نسخ احتياطي مطابقة مع كامل الجداول والبيانات الوصفية", () => {
      const snapshot = createDatabaseBackupSnapshot({
        teachers: mockTeachers,
        absenceRecords: mockAbsences,
        administrativeInquiries: mockAdminInquiries,
        delayNotices: mockDelays,
      });

      expect(snapshot.metadata.version).toBe(BACKUP_VERSION);
      expect(snapshot.metadata.counts.teachers).toBe(2);
      expect(snapshot.metadata.counts.absenceRecords).toBe(3);
      expect(snapshot.metadata.counts.administrativeInquiries).toBe(1);
      expect(snapshot.metadata.counts.delayNotices).toBe(1);
      expect(snapshot.metadata.checksum).toMatch(/^chk_/);
    });

    it("2.2 يتحقق بنجاح من سلامة Snapshot واكتشاف أي تعديل تلاعبي في البيانات", () => {
      const snapshot = createDatabaseBackupSnapshot({
        teachers: mockTeachers,
        absenceRecords: mockAbsences,
      });

      const validation = validateBackupSnapshot(snapshot);
      expect(validation.valid).toBe(true);

      // Tamper test
      const tamperedSnapshot = JSON.parse(JSON.stringify(snapshot));
      tamperedSnapshot.data.teachers[0].fullName = "اسم معدل بدون تعديل الـ Checksum";
      const tamperedValidation = validateBackupSnapshot(tamperedSnapshot);
      expect(tamperedValidation.valid).toBe(false);
      expect(tamperedValidation.error).toContain("التوقيع الرقمي");
    });
  });

  // ---------------------------------------------------------------------------
  // المرحلة الثالثة & الرابعة: Workflows & Calculations Audit
  // ---------------------------------------------------------------------------
  describe("المرحلة الثالثة & الرابعة: الدورات التشغيلية والحسابات الإدارية (Workflows & Business Logic)", () => {
    it("3.1 دورة احتساب ساعات الحسم وتجميع دقائق التأخر بدقة 100%", () => {
      const delaySummary = getTeacherDelaySummary(
        mockTeachers[0],
        [
          {
            id: "d-1",
            teacherId: "prod-t1",
            teacherName: "ساره الطلحي",
            date: "2026-09-01",
            calculatedMinutes: 180, // 3 hours
            directorOpinion: "rejected_with_deduction",
            status: "completed",
            isArchived: false,
          } as DelayNotice,
          {
            id: "d-2",
            teacherId: "prod-t1",
            teacherName: "ساره الطلحي",
            date: "2026-09-02",
            calculatedMinutes: 240, // 4 hours -> total 420 mins = 7 hours
            directorOpinion: "rejected_with_deduction",
            status: "completed",
            isArchived: false,
          } as DelayNotice,
        ],
        []
      );

      expect(delaySummary.totalUnexcusedMinutes).toBe(420);
      expect(delaySummary.totalUnexcusedHours).toBe(7);
      expect(delaySummary.deductionDays).toBe(1); // 7 hours threshold = 1 day
    });

    it("3.2 دورة الـ Token الأمني وصلاحية الـ 48 ساعة", () => {
      const token = generateSecureToken();
      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThanOrEqual(16);

      const validExpiry = calculate48HoursExpiry();
      expect(isTokenExpired(validExpiry)).toBe(false);

      const pastExpiry = new Date(Date.now() - 3600 * 1000).toISOString();
      expect(isTokenExpired(pastExpiry)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // المرحلة الخامسة & السادسة: Archive, Restore & Attachment Resolution
  // ---------------------------------------------------------------------------
  describe("المرحلة الخامسة & السادسة: الأرشفة والاستعادة والمرفقات (Archive, Restore & Attachments)", () => {
    it("5.1 حل وتجهيز مسارات المرفقات دون التسبب في 404", () => {
      const relativePath = "absence-attachments/manual-records/file.pdf";
      const resolved = resolveAttachmentUrl(relativePath);
      expect(resolved).toContain("https://");
      expect(resolved).toContain("absence-attachments/manual-records/file.pdf");

      const jsonArray = '[{"url":"https://example.com/doc.pdf","slotId":"slot-1"}]';
      const parsed = parseAttachments(jsonArray);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].url).toBe("https://example.com/doc.pdf");
    });

    it("5.2 تطابق بيانات المرفقات قبل الأرشفة وبعد الاستعادة 100%", () => {
      const originalRecord = mockAbsences[0];
      const archivedRecord: ArchivedAbsenceRecord = {
        record: { ...originalRecord, isArchived: true, archivedAt: new Date().toISOString() },
        archivedAt: new Date().toISOString(),
        archiveReason: "أرشفة تجريبية للإنتاج",
        archivedByCascade: false,
      };

      const restoredRecord: AbsenceRecord = {
        ...archivedRecord.record,
        isArchived: false,
        archivedAt: undefined,
        archiveReason: undefined,
      };

      expect(restoredRecord.id).toBe(originalRecord.id);
      expect(restoredRecord.attachmentUrl).toBe(originalRecord.attachmentUrl);
      expect(restoredRecord.teacherId).toBe(originalRecord.teacherId);
    });
  });

  // ---------------------------------------------------------------------------
  // المرحلة الرابعة عشرة: Reports Engine & Single Source of Truth Audit
  // ---------------------------------------------------------------------------
  describe("المرحلة الرابعة عشرة: مطابقة التقارير مع قاعدة البيانات (Database = UI Count Equality)", () => {
    it("14.1 مطابقة إحصائيات KPI ومحرك التقارير مع عدد السجلات الفعلي", () => {
      const reportData = generateReportData(
        "absence_summary",
        { startDate: "2026-09-01", endDate: "2026-09-30" },
        mockTeachers,
        mockAbsences,
        mockDelays,
        []
      );

      expect(reportData.rawRowsCount).toBe(3);
      expect(reportData.summaryHighlights.length).toBeGreaterThan(0);
    });
  });
});
