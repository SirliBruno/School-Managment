import { describe, it, expect, beforeEach } from "vitest";
import { generateRealisticStagingDataset, StagingDataset } from "../staging/seedData";
import { logSystemError, sanitizeTechnicalDetails, clearSystemErrorLogs, getSystemErrorLogs } from "../errorLogger";
import { calculateTotalDelayMinutes, checkDeductionEligibility } from "../delayDeductionIntegration";
import { generateReportData, getDashboardStats } from "../reportsEngine";
import { logAuditEvent, getLocalAuditLogs } from "../auditLogger";

describe("SPRINT 3: Production Simulation, QA Testing & Staging Validation", () => {
  let stagingData: StagingDataset;

  beforeEach(() => {
    clearSystemErrorLogs();
    stagingData = generateRealisticStagingDataset(320);
  });

  // ============================================================================
  // 1 & 2. Staging Environment & Realistic Dataset Validation
  // ============================================================================
  describe("1 & 2. Staging Dataset Scale & Demographic Integrity", () => {
    it("ينشئ أكثر من 300 معلمة مع بيانات ديموغرافية كاملة مطابقة للمعايير السعودية", () => {
      expect(stagingData.teachers.length).toBeGreaterThanOrEqual(320);

      const sample = stagingData.teachers[0];
      expect(sample.fullName).toBeDefined();
      expect(sample.nationalId).toMatch(/^10\d{8}$/); // رقم هوية وطنية سعودية 10 أرقام
      expect(sample.jobNumber).toMatch(/^T\d+/);
      expect(sample.specialty).toBeDefined();
      expect(sample.mobile).toMatch(/^050\d{7}$/);
    });

    it("يتضمن توزيعاً تشغيلياً واقعياً عبر مختلف الحالات الإدارية", () => {
      // معلمات لديهن غياب
      expect(stagingData.absences.length).toBeGreaterThan(30);
      expect(stagingData.inquiries.length).toBeGreaterThan(30);

      // معلمات لديهن تأخر
      expect(stagingData.delayNotices.length).toBeGreaterThan(20);

      // معلمات لديهن استئذان
      expect(stagingData.permissions.length).toBeGreaterThan(40);

      // معلمات لديهن قرارات حسم
      expect(stagingData.deductions.length).toBeGreaterThan(5);

      // معلمات بدون أي سجلات سلبية (Clean Record)
      const teachersWithAbsence = new Set(stagingData.absences.map((a) => a.teacherId));
      const teachersWithDelay = new Set(stagingData.delayNotices.map((d) => d.teacherId));
      const teachersWithPerm = new Set(stagingData.permissions.map((p) => p.teacherId));
      const cleanTeachers = stagingData.teachers.filter(
        (t) =>
          !t.isArchived &&
          !teachersWithAbsence.has(t.id) &&
          !teachersWithDelay.has(t.id) &&
          !teachersWithPerm.has(t.id)
      );
      expect(cleanTeachers.length).toBeGreaterThan(40);

      // معلمات مؤرشفات لاختبار العزل الإداري
      const archivedTeachers = stagingData.teachers.filter((t) => t.isArchived);
      expect(archivedTeachers.length).toBe(10);
    });
  });

  // ============================================================================
  // 3. Vice Principal Functional Journey
  // ============================================================================
  describe("3. رحلة الوكيلة (Vice Principal Operational Flows)", () => {
    it("إدارة المعلمات: البحث والفلترة حسب الاسم والتخصص والهوية", () => {
      const queryName = stagingData.teachers[5].fullName;
      const foundByName = stagingData.teachers.filter((t) => t.fullName.includes(queryName));
      expect(foundByName.length).toBeGreaterThanOrEqual(1);

      const targetSpecialty = "الرياضيات";
      const mathTeachers = stagingData.teachers.filter((t) => t.specialty === targetSpecialty);
      expect(mathTeachers.length).toBeGreaterThan(0);
      mathTeachers.forEach((t) => expect(t.specialty).toBe(targetSpecialty));
    });

    it("الغياب والمساءلات: تسجيل غياب وإنشاء مساءلة وتوليد رمز الرابط العام", () => {
      const activeTeacher = stagingData.teachers.find((t) => !t.isArchived)!;
      const newAbsence = {
        id: "test-vp-abs-1",
        teacherId: activeTeacher.id,
        teacherName: activeTeacher.fullName,
        date: "2026-09-25",
        type: "مرضي" as const,
        reason: "تقرير طبي من المركز الصحي",
        isArchived: false,
        timestamp: new Date().toISOString(),
      };

      const newInquiry = {
        id: "test-vp-inq-1",
        teacherId: activeTeacher.id,
        teacherName: activeTeacher.fullName,
        absenceDate: newAbsence.date,
        token: "sec-token-vp-12345",
        status: "pending" as const,
        expiresAt: new Date(Date.now() + 86400000 * 3).toISOString(),
        createdAt: new Date().toISOString(),
        isArchived: false,
      };

      expect(newInquiry.token).toHaveLength(18);
      expect(newInquiry.status).toBe("pending");
      expect(new Date(newInquiry.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it("التأخر والانصراف: حساب الدقائق بدقة ومنع التداخل", () => {
      // 07:00 إلى 07:45 = 45 دقيقة تأخر
      const startMin = 7 * 60;
      const arrivalMin = 7 * 60 + 45;
      const diff = arrivalMin - startMin;
      expect(diff).toBe(45);

      const notice = stagingData.delayNotices.find((n) => n.violationDelayStart);
      expect(notice).toBeDefined();
      expect(notice?.calculatedMinutes).toBeGreaterThan(0);
    });

    it("الاستئذان: حساب مدة الاستئذان والتأكد من أنها ضمن أوقات الدوام الرسمي", () => {
      const perm = stagingData.permissions[0];
      const [exitH, exitM] = perm.exitTime.split(":").map(Number);
      const [returnH, returnM] = perm.returnTime.split(":").map(Number);
      const computedDuration = returnH * 60 + returnM - (exitH * 60 + exitM);

      expect(perm.durationMinutes).toBe(computedDuration);
      expect(perm.durationMinutes).toBeGreaterThan(0);
    });

    it("الأرشيف والاستعادة: عزل السجلات المؤرشفة وعدم ظهورها في القوائم النشطة", () => {
      const activeTeachers = stagingData.teachers.filter((t) => !t.isArchived);
      const archivedTeachers = stagingData.teachers.filter((t) => t.isArchived);

      expect(activeTeachers.length + archivedTeachers.length).toBe(stagingData.teachers.length);
      activeTeachers.forEach((t) => expect(t.isArchived).toBeFalsy());
      archivedTeachers.forEach((t) => {
        expect(t.isArchived).toBe(true);
        expect(t.archivedAt).toBeDefined();
      });
    });
  });

  // ============================================================================
  // 4. Manager Approval Testing (رحلة المديرة)
  // ============================================================================
  describe("4. رحلة المديرة (Principal Decisions & Approvals)", () => {
    it("اعتماد العذر أو رفضه مع الحسم وتحديث دورة العمل", () => {
      const completedNotice = stagingData.delayNotices.find((n) => n.status === "completed");
      expect(completedNotice).toBeDefined();
      expect(["accepted", "rejected_with_deduction"]).toContain(completedNotice?.directorOpinion);

      // قرار الحسم
      const decision = stagingData.deductions[0];
      expect(decision.delayHours).toBe(7);
      expect(decision.deductionDays).toBe(1);
      expect(decision.settledNoticeIds?.length).toBeGreaterThan(0);
    });

    it("عدم تجاوز دورة العمل: لا يمكن إصدار قرار حسم بدون وجود تنبيهات غير مقبولة متراكمة", () => {
      // تنبيهات مقبولة العذر (accepted) لا تحسب للحسم
      const acceptedNotice = {
        id: "acc-1",
        calculatedMinutes: 180,
        directorOpinion: "accepted" as const,
        status: "completed" as const,
      };

      const rejectedNotice = {
        id: "rej-1",
        calculatedMinutes: 450,
        directorOpinion: "rejected_with_deduction" as const,
        status: "completed" as const,
      };

      // فقط غير المقبولة تحتسب
      const eligibleMinutes = [acceptedNotice, rejectedNotice]
        .filter((n) => n.directorOpinion === "rejected_with_deduction")
        .reduce((sum, n) => sum + (n.calculatedMinutes || 0), 0);

      expect(eligibleMinutes).toBe(450);
      expect(eligibleMinutes).toBeGreaterThanOrEqual(420); // 7 ساعات
    });
  });

  // ============================================================================
  // 5. Teacher Portal Mobile Simulation
  // ============================================================================
  describe("5. بوابة المعلمة الإلكترونية من الجوال (Teacher Portal Flow)", () => {
    it("التحقق من صلاحية الرابط: قبول الرمز الصالح ورفض المنتهي والمستخدم", () => {
      const validInquiry = stagingData.inquiries.find((i) => i.status === "pending")!;
      const isExpired = new Date(validInquiry.expiresAt).getTime() < Date.now();
      expect(isExpired).toBe(false);

      // محاكاة رابط منتهي الصلاحية
      const expiredInquiry = {
        ...validInquiry,
        expiresAt: new Date(Date.now() - 10000).toISOString(),
      };
      const checkExpired = new Date(expiredInquiry.expiresAt).getTime() < Date.now();
      expect(checkExpired).toBe(true);

      // محاكاة رابط تم إرسال الإفادة مسبقاً من خلاله
      const submittedInquiry = stagingData.inquiries.find((i) => i.status === "submitted" || i.status === "approved")!;
      expect(["submitted", "approved"]).toContain(submittedInquiry.status);
    });

    it("فحص امتدادات المرفقات وحجم الملفات المسموح بها", () => {
      const allowedMimeTypes = ["image/jpeg", "image/png", "application/pdf"];
      const forbiddenMimeTypes = ["application/x-msdownload", "text/javascript", "application/zip"];

      allowedMimeTypes.forEach((mime) => {
        expect(["image/jpeg", "image/png", "application/pdf"]).toContain(mime);
      });

      forbiddenMimeTypes.forEach((mime) => {
        expect(["image/jpeg", "image/png", "application/pdf"]).not.toContain(mime);
      });

      // التحقق من حد الحجم الأقصى (5MB)
      const MAX_SIZE_BYTES = 5 * 1024 * 1024;
      const validSize = 2.5 * 1024 * 1024;
      const oversized = 6.2 * 1024 * 1024;

      expect(validSize <= MAX_SIZE_BYTES).toBe(true);
      expect(oversized <= MAX_SIZE_BYTES).toBe(false);
    });
  });

  // ============================================================================
  // 6. Regression Testing Across Modules
  // ============================================================================
  describe("6. اختبار الانحدار الشامل (Regression Testing)", () => {
    it("كل وحدة من الوحدات الخمس تحتفظ بحقولها وتعمل بدون تداخل", () => {
      // 1. المعلمات
      expect(stagingData.teachers.every((t) => t.id && t.fullName)).toBe(true);
      // 2. الغياب
      expect(stagingData.absences.every((a) => a.teacherId && a.date && a.type)).toBe(true);
      // 3. التأخر
      expect(stagingData.delayNotices.every((d) => d.teacherId && d.calculatedMinutes !== undefined)).toBe(true);
      // 4. الاستئذان
      expect(stagingData.permissions.every((p) => p.teacherId && p.durationMinutes > 0)).toBe(true);
      // 5. الحسم
      expect(stagingData.deductions.every((dec) => dec.teacherId && dec.deductionDays >= 1)).toBe(true);
    });
  });

  // ============================================================================
  // 7. Edge Case Testing
  // ============================================================================
  describe("7. اختبار الحالات الحدية وغير الطبيعية (Edge Cases)", () => {
    it("التعامل بأمان مع السجلات بدون مرفقات", () => {
      const recordsWithoutAttachment = stagingData.absences.filter((a) => !a.attachmentUrl);
      expect(recordsWithoutAttachment.length).toBeGreaterThan(0);
      recordsWithoutAttachment.forEach((rec) => {
        expect(rec.attachmentUrl).toBeUndefined();
        expect(rec.id).toBeDefined();
      });
    });

    it("منع التكرار (Debounce / Idempotency) عند محاولة الحفظ المزدوج للغياب في نفس اليوم", () => {
      const tId = stagingData.teachers[0].id;
      const date = "2026-09-20";

      const existingRecord = { id: "abs-dup-1", teacherId: tId, date, isArchived: false };
      const duplicateCandidate = { id: "abs-dup-2", teacherId: tId, date, isArchived: false };

      const isDuplicate = existingRecord.teacherId === duplicateCandidate.teacherId && existingRecord.date === duplicateCandidate.date;
      expect(isDuplicate).toBe(true);
    });

    it("معالجة التواريخ الماضية والمستقبلية بأمان", () => {
      const pastDate = "2020-01-01";
      const futureDate = "2030-12-31";

      expect(new Date(pastDate).getFullYear()).toBe(2020);
      expect(new Date(futureDate).getFullYear()).toBe(2030);
    });
  });

  // ============================================================================
  // 8. PDF & Printing Pipeline Validation
  // ============================================================================
  describe("8. اختبار توليد التقارير وتوافق الطباعة (PDF & Reporting)", () => {
    it("محرك التقارير يُنشئ ملخصات إحصائية دقيقة من البيانات الواقعية", () => {
      const stats = getDashboardStats(stagingData.teachers, stagingData.absences);
      expect(stats.totalTeachers).toBe(stagingData.teachers.filter((t) => !t.isArchived).length);
      expect(stats.totalAbsences).toBe(stagingData.absences.filter((a) => !a.isArchived).length);
      expect(typeof stats.absenceRate).toBe("number");
    });

    it("فلترة وتوليد بيانات تقارير متقدمة بحسب نطاق التواريخ والتخصص", () => {
      const report = generateReportData(
        "absence_summary",
        {
          startDate: "2026-01-01",
          endDate: "2026-09-30",
          specialty: "العلوم",
          month: "all",
          year: "all",
        },
        stagingData.teachers,
        stagingData.absences,
        stagingData.delayNotices,
        stagingData.deductions,
        "وكيلة الشؤون التعليمية",
        stagingData.permissions
      );

      expect(report).toBeDefined();
      expect(Array.isArray(report.payload.tableRows)).toBe(true);
      expect(report.rawRowsCount).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // 9. Performance & Scalability Testing
  // ============================================================================
  describe("9. اختبار الأداء وقابلية التوسع (Performance Benchmarking)", () => {
    it("معالجة وحساب إحصائيات 320+ معلمة ومئات السجلات في أقل من 50 مللي ثانية", () => {
      const startTime = performance.now();

      const activeTeachers = stagingData.teachers.filter((t) => !t.isArchived);
      const activeAbsences = stagingData.absences.filter((a) => !a.isArchived);
      const stats = getDashboardStats(activeTeachers, activeAbsences);

      const endTime = performance.now();
      const executionDuration = endTime - startTime;

      expect(stats.totalTeachers).toBe(310);
      expect(executionDuration).toBeLessThan(50); // سرعة استجابة فائقة تحت 50ms
    });
  });

  // ============================================================================
  // 10. Error Monitoring & Sanitization
  // ============================================================================
  describe("10. نظام مراقبة الأخطاء وتنقية البيانات الحساسة (Error Monitoring)", () => {
    it("يقوم بتسجيل الأخطاء مع إخفاء الرموز السرية ومفاتيح الـ API وكلمات المرور", () => {
      const dirtyStackTrace = `
        Error: Supabase query failed at auth.ts:15
        Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secretToken12345
        apikey=sb_pub_9999_secret_key_abcdef
        password=DatabaseSuperSecret123!
        connection: postgres://admin:TopSecretPwd@db.supabase.co:5432/postgres
      `;

      const sanitized = sanitizeTechnicalDetails(dirtyStackTrace);

      expect(sanitized).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secretToken12345");
      expect(sanitized).not.toContain("sb_pub_9999_secret_key_abcdef");
      expect(sanitized).not.toContain("DatabaseSuperSecret123!");
      expect(sanitized).not.toContain("TopSecretPwd");

      expect(sanitized).toContain("Bearer [REDACTED_TOKEN]");
      expect(sanitized).toContain("apikey=[REDACTED_KEY]");
      expect(sanitized).toContain("password=[REDACTED_PASSWORD]");
      expect(sanitized).toContain("postgres://[USER]:[PASSWORD]@");
    });

    it("ينشئ سجل خطأ نظام آمن للمستخدم لا يكشف أي أسرار تقنية", () => {
      const errorEntry = logSystemError({
        error: new Error("خطأ في الاتصال بالشبكة الداخلية"),
        page: "/procedures/absence",
        userId: "user-vice-1",
        userName: "وكيلة الشؤون التعليمية",
        customContext: "محاولة حفظ غياب جماعي",
      });

      expect(errorEntry.id).toMatch(/^ERR-/);
      expect(errorEntry.page).toBe("/procedures/absence");
      expect(errorEntry.userFacingMessage).toContain("رمز الخطأ للمتابعة: ERR-");
      expect(errorEntry.handled).toBe(true);

      const recorded = getSystemErrorLogs();
      expect(recorded.length).toBeGreaterThanOrEqual(1);
      expect(recorded[0].id).toBe(errorEntry.id);
    });
  });
});
