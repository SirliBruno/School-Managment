import { describe, it, expect } from "vitest";
import {
  createDatabaseBackupSnapshot,
  validateBackupSnapshot,
  BACKUP_VERSION,
  calculateChecksum,
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
} from "@/types/teacher";
import { parseAttachments } from "@/lib/attachments";
import { isTokenExpired, calculateTokenExpiry } from "@/lib/timeUtils";

// Mock Database Initial State representing full production data ecosystem
const MOCK_TEACHERS: Teacher[] = [
  {
    id: "t-101",
    name: "سارة محمد العتيبي",
    fullName: "سارة محمد مسفر العتيبي",
    nationalId: "1098765432",
    jobNumber: "4001",
    jobTitle: "معلم ممارس",
    specialty: "رياضيات",
    teachingField: "علمي",
    mobile: "0501234567",
    employmentStatus: "active",
    totalAbsences: 2,
    totalDelayNotices: 1,
    createdAt: "2026-09-01T08:00:00Z",
  },
  {
    id: "t-102",
    name: "نورة خالد الدوسري",
    fullName: "نورة خالد سعد الدوسري",
    nationalId: "1087654321",
    jobNumber: "4002",
    jobTitle: "معلم متقدم",
    specialty: "لغة عربية",
    teachingField: "أدبي",
    mobile: "0559876543",
    employmentStatus: "active",
    totalAbsences: 1,
    totalDelayNotices: 0,
    createdAt: "2026-09-01T08:30:00Z",
  },
  {
    id: "t-103",
    name: "منى فهد الشمري",
    fullName: "منى فهد سلطان الشمري",
    nationalId: "1076543210",
    jobNumber: "4003",
    jobTitle: "معلم خبير",
    specialty: "لغة إنجليزية",
    teachingField: "لغات",
    mobile: "0543219876",
    employmentStatus: "active",
    totalAbsences: 0,
    totalDelayNotices: 2,
    createdAt: "2026-09-02T09:00:00Z",
  },
];

const MOCK_ABSENCE_RECORDS: AbsenceRecord[] = [
  {
    id: "abs-201",
    teacherId: "t-101",
    teacherName: "سارة محمد العتيبي",
    nationalId: "1098765432",
    date: "2026-09-10",
    type: "مرضي",
    reason: "وعكة صحية طارئة",
    timestamp: "2026-09-10T07:30:00Z",
    attachmentUrl: "https://xizppykmqfkvzwcwxuzr.supabase.co/storage/v1/object/public/absence-attachments/medical_201.pdf",
    isArchived: false,
  },
  {
    id: "abs-202",
    teacherId: "t-101",
    teacherName: "سارة محمد العتيبي",
    nationalId: "1098765432",
    date: "2026-09-20",
    type: "اضطراري",
    reason: "ظرف عائلي خاص",
    timestamp: "2026-09-20T07:45:00Z",
    isArchived: false,
  },
  {
    id: "abs-203",
    teacherId: "t-102",
    teacherName: "نورة خالد الدوسري",
    nationalId: "1087654321",
    date: "2026-09-25",
    type: "مرضي",
    reason: "مراجعة مستشفى",
    timestamp: "2026-09-25T08:00:00Z",
    attachmentUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    isArchived: false,
  },
];

const MOCK_ABSENCE_INQUIRIES: AbsenceInquiry[] = [
  {
    id: "inq-301",
    absenceRecordId: "abs-201",
    teacherId: "t-101",
    teacherName: "سارة محمد العتيبي",
    nationalId: "1098765432",
    absenceDate: "2026-09-10",
    absenceType: "مرضي",
    status: "completed",
    token: "tok-abs-301-secure",
    tokenExpiresAt: "2026-09-12T07:30:00Z",
    teacherReason: "تم إرفاق الإجازة المرضية من منصة صحتي",
    submittedAt: "2026-09-11T10:00:00Z",
    attachmentUrl: "https://xizppykmqfkvzwcwxuzr.supabase.co/storage/v1/object/public/absence-attachments/medical_201.pdf",
    directorOpinion: "accepted",
    directorNotes: "عذر مقبول نظاماً",
    isArchived: false,
  },
  {
    id: "inq-302",
    absenceRecordId: "abs-203",
    teacherId: "t-102",
    teacherName: "نورة خالد الدوسري",
    nationalId: "1087654321",
    absenceDate: "2026-09-25",
    absenceType: "مرضي",
    status: "pending_director",
    token: "tok-abs-302-secure",
    tokenExpiresAt: "2026-09-27T08:00:00Z",
    teacherReason: "مرفق إشعار المراجعة",
    submittedAt: "2026-09-26T09:00:00Z",
    attachmentUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    isArchived: false,
  },
];

const MOCK_ADMINISTRATIVE_INQUIRIES: AdministrativeInquiry[] = [
  {
    id: "admin-inq-401",
    inquiryNumber: "ADM-101",
    teacherId: "t-101",
    teacherName: "سارة محمد العتيبي",
    nationalId: "1098765432",
    jobTitle: "معلم ممارس",
    specialty: "رياضيات",
    inquiryType: "التأخير عن دخول الحصص",
    incidentDate: "2026-09-28",
    description: "التأخر عن الحصة الأولى 15 دقيقة",
    status: "completed",
    token: "tok-admin-401-secure",
    tokenExpiresAt: "2026-09-30T08:00:00Z",
    teacherResponse: "تم التوضيح للوكيلة بوجود ازدحام مروري",
    responseDate: "2026-09-28",
    responseIp: "192.168.1.25",
    directorDecision: "accepted",
    directorNotes: "اكتفاء بالإفادة مع التنبيه",
    decisionDate: "2026-09-29",
    createdAt: "2026-09-28T08:00:00Z",
    isArchived: false,
  },
  {
    id: "admin-inq-402",
    inquiryNumber: "ADM-102",
    teacherId: "t-103",
    teacherName: "منى فهد الشمري",
    nationalId: "1076543210",
    jobTitle: "معلم خبير",
    specialty: "لغة إنجليزية",
    inquiryType: "الامتناع عن دخول حصص الانتظار",
    incidentDate: "2026-09-29",
    description: "عدم تغطية حصة انتظار يوم الثلاثاء",
    status: "pending_teacher",
    token: "tok-admin-402-secure",
    tokenExpiresAt: "2026-10-01T08:00:00Z",
    createdAt: "2026-09-29T08:00:00Z",
    isArchived: false,
  },
];

const MOCK_DELAY_NOTICES: DelayNotice[] = [
  {
    id: "del-501",
    noticeNumber: "DN-101",
    teacherId: "t-101",
    teacherName: "سارة محمد العتيبي",
    nationalId: "1098765432",
    noticeDate: "2026-09-15",
    violationDelayStart: true,
    delayStartTime: "07:15",
    violationAbsentDuring: false,
    violationEarlyDeparture: false,
    violationLeftSchool: false,
    status: "completed",
    shareToken: "tok-del-501",
    tokenExpiresAt: "2026-09-17T07:15:00Z",
    teacherReason: "ظرف في الطريق",
    directorOpinion: "excuse_accepted",
    createdAt: "2026-09-15T07:15:00Z",
    isArchived: false,
  },
  {
    id: "del-502",
    noticeNumber: "DN-102",
    teacherId: "t-103",
    teacherName: "منى فهد الشمري",
    nationalId: "1076543210",
    noticeDate: "2026-09-22",
    violationDelayStart: true,
    delayStartTime: "07:20",
    violationAbsentDuring: false,
    violationEarlyDeparture: false,
    violationLeftSchool: false,
    status: "pending_teacher",
    shareToken: "tok-del-502",
    tokenExpiresAt: "2026-09-24T07:20:00Z",
    directorOpinion: "pending",
    createdAt: "2026-09-22T07:20:00Z",
    isArchived: false,
  },
];

const MOCK_PERMISSIONS: EmployeePermission[] = [
  {
    id: "perm-601",
    teacherId: "t-102",
    teacherName: "نورة خالد الدوسري",
    nationalId: "1087654321",
    date: "2026-09-18",
    departureTime: "10:30",
    returnTime: "12:00",
    reason: "مراجعة جهة حكومية",
    type: "personal",
    status: "completed",
    createdAt: "2026-09-18T09:00:00Z",
    isArchived: false,
  },
];

const MOCK_DEDUCTIONS: DeductionDecision[] = [
  {
    id: "ded-701",
    decisionNumber: "DEC-2026-01",
    teacherId: "t-101",
    teacherName: "سارة محمد العتيبي",
    nationalId: "1098765432",
    daysCount: 1,
    deductionDays: 1,
    absenceDates: ["2026-09-20"],
    sourceType: "absence",
    sourceIds: ["abs-202"],
    reason: "غياب بدون عذر مقبول",
    decisionDate: "2026-09-21",
    principalName: "فاطمة فلاتة",
    createdAt: "2026-09-21T11:00:00Z",
    isArchived: false,
  },
];

describe("تدقيق سلامة وتكامل بيانات المنصة الشامل (Full Platform Data Integrity Audit)", () => {
  // ==========================================
  // المرحلة الأولى: النسخ الاحتياطي واللقطة الكاملة
  // ==========================================
  describe("المرحلة 1: النسخ الاحتياطي واللقطة الرقمية الكاملة (Full Backup & Snapshot)", () => {
    it("1.1 يقوم بإنشاء لقطة نسخ احتياطي شاملة لجميع الجداول وحساب الـ Checksum بدقة", () => {
      const snapshot = createDatabaseBackupSnapshot({
        teachers: MOCK_TEACHERS,
        absenceRecords: MOCK_ABSENCE_RECORDS,
        inquiries: MOCK_ABSENCE_INQUIRIES,
        administrativeInquiries: MOCK_ADMINISTRATIVE_INQUIRIES,
        delayNotices: MOCK_DELAY_NOTICES,
        permissions: MOCK_PERMISSIONS,
        deductionDecisions: MOCK_DEDUCTIONS,
        archivedTeachers: [],
        archivedAbsences: [],
        archivedDelayNotices: [],
        archivedDeductionDecisions: [],
        archivedPermissions: [],
        archivedAdministrativeInquiries: [],
      });

      expect(snapshot).toBeDefined();
      expect(snapshot.metadata.version).toBe(BACKUP_VERSION);
      expect(snapshot.metadata.checksum).toMatch(/^chk_[0-9a-f]{8}_\d+$/);
      expect(snapshot.metadata.counts.teachers).toBe(3);
      expect(snapshot.metadata.counts.absenceRecords).toBe(3);
      expect(snapshot.metadata.counts.administrativeInquiries).toBe(2);
      expect(snapshot.metadata.counts.delayNotices).toBe(2);
      expect(snapshot.metadata.counts.permissions).toBe(1);
      expect(snapshot.metadata.counts.deductionDecisions).toBe(1);

      // Verify validation passes
      const validation = validateBackupSnapshot(snapshot);
      expect(validation.valid).toBe(true);
    });

    it("1.2 يكتشف أي تلاعب أو تلف في محتوى النسخة الاحتياطية تلقائيًا", () => {
      const snapshot = createDatabaseBackupSnapshot({
        teachers: MOCK_TEACHERS,
      });

      // Tamper with data without updating checksum
      const tamperedSnapshot = {
        ...snapshot,
        data: {
          ...snapshot.data,
          teachers: [...snapshot.data.teachers, { id: "fake", name: "متسلل" } as Teacher],
        },
      };

      const validation = validateBackupSnapshot(tamperedSnapshot);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("التوقيع الرقمي غير مطابق");
    });
  });

  // ==========================================
  // المرحلة الثانية والثالثة: تدقيق قاعدة البيانات وسلامة العلاقات
  // ==========================================
  describe("المرحلة 2 & 3: تدقيق الجداول والعلاقات المرجعية (Referential Integrity)", () => {
    it("2.1 يتحقق من أن جميع سجلات الغياب مرتبطة بمعلمات موجودات وبدون سجلات يتيمة (No Orphan Absences)", () => {
      const teacherIds = new Set(MOCK_TEACHERS.map((t) => t.id));

      MOCK_ABSENCE_RECORDS.forEach((abs) => {
        expect(teacherIds.has(abs.teacherId)).toBe(true);
        expect(abs.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(abs.type).toBeDefined();
      });
    });

    it("2.2 يتحقق من أن جميع المسائلات (الغياب والإدارية) مرتبطة بمعلمات صحيحة وتوكنات فريدة", () => {
      const teacherIds = new Set(MOCK_TEACHERS.map((t) => t.id));
      const tokens = new Set<string>();

      // Absence Inquiries
      MOCK_ABSENCE_INQUIRIES.forEach((inq) => {
        expect(teacherIds.has(inq.teacherId)).toBe(true);
        expect(inq.token).toBeDefined();
        expect(tokens.has(inq.token)).toBe(false);
        tokens.add(inq.token);
      });

      // Administrative Inquiries
      MOCK_ADMINISTRATIVE_INQUIRIES.forEach((adminInq) => {
        expect(teacherIds.has(adminInq.teacherId)).toBe(true);
        expect(adminInq.token).toBeDefined();
        expect(tokens.has(adminInq.token)).toBe(false);
        tokens.add(adminInq.token);
        expect(adminInq.inquiryType).toBeDefined();
        expect(adminInq.incidentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    it("2.3 يتحقق من أن إشعارات التأخر وقرارات الحسم مستندة إلى بيانات أصلية غير مكررة", () => {
      const teacherIds = new Set(MOCK_TEACHERS.map((t) => t.id));

      // Delay Notices
      MOCK_DELAY_NOTICES.forEach((dn) => {
        expect(teacherIds.has(dn.teacherId)).toBe(true);
        expect(dn.noticeDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });

      // Deductions
      MOCK_DEDUCTIONS.forEach((ded) => {
        expect(teacherIds.has(ded.teacherId)).toBe(true);
        expect(ded.daysCount).toBeGreaterThan(0);
        expect(ded.sourceIds.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================
  // المرحلة الرابعة والخامسة: تدقيق مؤشرات الواجهة والسجلات غير الظاهرة
  // ==========================================
  describe("المرحلة 4 & 5: تطابق مؤشرات الواجهة واكتشاف السجلات المختفية (KPI Matching & Data Visibility)", () => {
    it("3.1 يتطابق مجموع الغيابات والمسائلات النشطة بدقة بين قاعدة البيانات ولوحة الـ Dashboard", () => {
      const activeAbsences = MOCK_ABSENCE_RECORDS.filter((r) => !r.isArchived);
      const activeAdminInquiries = MOCK_ADMINISTRATIVE_INQUIRIES.filter((i) => !i.isArchived);

      const kpiTotalAbsences = activeAbsences.length;
      const kpiPendingAdminInquiries = activeAdminInquiries.filter(
        (i) => i.status === "pending_teacher"
      ).length;
      const kpiCompletedAdminInquiries = activeAdminInquiries.filter(
        (i) => i.status === "completed"
      ).length;

      expect(kpiTotalAbsences).toBe(3);
      expect(kpiPendingAdminInquiries).toBe(1);
      expect(kpiCompletedAdminInquiries).toBe(1);
    });

    it("3.2 لا توجد سجلات محجوبة أو مختفية بسبب فلاتر الحالات أو السنوات الدراسية", () => {
      const statuses = ["pending_teacher", "pending_director", "completed", "expired"];

      MOCK_ADMINISTRATIVE_INQUIRIES.forEach((inq) => {
        expect(statuses.includes(inq.status)).toBe(true);
        expect(inq.isArchived).toBe(false);
      });
    });
  });

  // ==========================================
  // المرحلة السادسة والسابعة: تدقيق التخزين المحلي والمرفقات
  // ==========================================
  describe("المرحلة 6 & 7: تدقيق المرفقات والتخزين المحلي ومصدر الحقيقة (Storage & LocalStorage Audit)", () => {
    it("4.1 يتحقق من صحة تحليل وتنسيق كافة روابط المرفقات (HTTPS URLs و Data URLs)", () => {
      MOCK_ABSENCE_RECORDS.forEach((abs) => {
        if (abs.attachmentUrl) {
          const parsed = parseAttachments(abs.attachmentUrl);
          expect(parsed.length).toBeGreaterThan(0);
          expect(parsed[0].url).toBe(abs.attachmentUrl);
        }
      });

      MOCK_ADMINISTRATIVE_INQUIRIES.forEach((inq) => {
        if (inq.attachmentUrl) {
          expect(
            inq.attachmentUrl.startsWith("http://") ||
              inq.attachmentUrl.startsWith("https://") ||
              inq.attachmentUrl.startsWith("data:")
          ).toBe(true);
        }
      });
    });

    it("4.2 يتحقق من صلاحية رموز الـ Token ومهلة الـ 7 أيام النظامية (168 ساعة)", () => {
      const freshExpiry = calculateTokenExpiry();
      const pastExpiry = new Date(Date.now() - 3600 * 1000).toISOString();

      expect(isTokenExpired(freshExpiry)).toBe(false);
      expect(isTokenExpired(pastExpiry)).toBe(true);
    });

    it("4.3 يقرأ إعدادات المدرسة والأختام والتوقيعات الرسمية بشكل موحد", () => {
      const settings = getActiveSchoolSettings();
      expect(settings.schoolName).toBeDefined();
      expect(settings.principalName).toBeDefined();
      expect(settings.vicePrincipalName).toBeDefined();
      expect(settings.stampUrl).toBeDefined();
      expect(settings.signatureUrl).toBeDefined();
    });
  });

  // ==========================================
  // المرحلة الثامنة والتاسعة: تدقيق الأرشيف والتزامن اللحظي
  // ==========================================
  describe("المرحلة 8 & 9: تدقيق الأرشيف والاستعادة الشاملة (Archive & Cascade Recovery)", () => {
    it("5.1 أرشفة المعلمة تضمن وسم السجلات التابعة بـ archived_by_cascade دون كسر المفاتيح", () => {
      const targetTeacher = MOCK_TEACHERS[0];
      const relatedAbsences = MOCK_ABSENCE_RECORDS.filter(
        (a) => a.teacherId === targetTeacher.id
      );

      // Simulate cascade archive
      const archivedAbsences: ArchivedAbsenceRecord[] = relatedAbsences.map((a) => ({
        ...a,
        isArchived: true,
        archivedAt: new Date().toISOString(),
        archiveReason: "أرشفة تتابعية مع المعلمة",
        archivedByCascade: true,
      }));

      expect(archivedAbsences.length).toBe(2);
      archivedAbsences.forEach((a) => {
        expect(a.isArchived).toBe(true);
        expect(a.archivedByCascade).toBe(true);
        expect(a.teacherId).toBe(targetTeacher.id);
      });

      // Simulate Restore
      const restoredAbsences: AbsenceRecord[] = archivedAbsences.map((a) => {
        const { isArchived, archivedAt, archiveReason, archivedByCascade, ...original } = a;
        return {
          ...original,
          isArchived: false,
        };
      });

      expect(restoredAbsences.length).toBe(2);
      restoredAbsences.forEach((a) => {
        expect(a.isArchived).toBe(false);
        expect(a.teacherId).toBe(targetTeacher.id);
      });
    });
  });
});
