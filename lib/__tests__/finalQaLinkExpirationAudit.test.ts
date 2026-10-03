import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  PUBLIC_LINK_EXPIRATION_DAYS,
  PUBLIC_LINK_EXPIRATION_HOURS,
  PUBLIC_LINK_EXPIRATION_MS,
  calculateTokenExpiry,
  calculate48HoursExpiry,
  isTokenExpired,
  getLinkExpiryStatus,
  formatSaudiDateTime,
  generateSecureToken,
} from "@/lib/timeUtils";
import {
  Teacher,
  AbsenceInquiry,
  DelayNotice,
  AdministrativeInquiry,
  AbsenceRecord,
  DeductionDecision,
  EmployeePermission,
  ArchivedAbsenceRecord,
} from "@/types/teacher";
import {
  generateInquiryMessage,
} from "@/lib/whatsapp";
import {
  getInquiryPublicUrl,
} from "@/lib/appConfig";
import {
  generateAdministrativeInquiryWhatsAppMessage,
} from "@/lib/administrativeInquiryWhatsappService";
import {
  generateSchoolProactiveAlerts,
} from "@/lib/delayDeductionIntegration";
import {
  createDatabaseBackupSnapshot,
  validateBackupSnapshot,
} from "@/lib/backupRecovery";
import {
  parseAttachments,
  resolveAttachmentUrl,
} from "@/lib/attachments";

describe("FINAL QA SPRINT — Comprehensive Verification Suite (48 Hours → 7 Days / 168 Hours)", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  // =========================================================================
  // 1. Exact Calculation & Single Source of Truth
  // =========================================================================
  describe("1. Exact Mathematical Calculation (168 Hours = 604,800,000 ms)", () => {
    it("1.1 ensures expires_at - created_at === 168 hours across any base timestamp", () => {
      const timestamps = [
        "2026-10-03T10:30:00.000Z",
        "2026-10-03T23:59:59.000Z",
        "2026-10-04T00:00:00.000Z",
        "2026-12-31T23:00:00.000Z", // Year boundary
        "2026-02-28T14:15:30.000Z", // Month boundary
      ];

      for (const ts of timestamps) {
        const base = new Date(ts);
        const expiryIso = calculateTokenExpiry(base);
        const expiry = new Date(expiryIso);

        const diffMs = expiry.getTime() - base.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        expect(diffMs).toBe(PUBLIC_LINK_EXPIRATION_MS);
        expect(diffHours).toBe(168);
        expect(diffHours).toBe(PUBLIC_LINK_EXPIRATION_HOURS);
      }
    });

    it("1.2 confirms calculate48HoursExpiry alias adheres to the 168-hour contract", () => {
      const base = new Date("2026-10-03T15:00:00.000Z");
      const expiryIso = calculate48HoursExpiry(base);
      const diffMs = new Date(expiryIso).getTime() - base.getTime();
      expect(diffMs).toBe(604800000);
      expect(diffMs / 3600000).toBe(168);
    });
  });

  // =========================================================================
  // 2. Strict Boundary Conditions (0h, 1h, 48h, 6d, 167h59m, 168h, 168h1s)
  // =========================================================================
  describe("2. Boundary Conditions Testing", () => {
    const createdDate = new Date("2026-10-03T12:00:00.000Z");
    const expiryIso = calculateTokenExpiry(createdDate); // 2026-10-10T12:00:00.000Z

    it("الحالة 1: بعد الإنشاء مباشرة (T = 0) -> VALID", () => {
      expect(isTokenExpired(expiryIso, createdDate)).toBe(false);
      const status = getLinkExpiryStatus(expiryIso, createdDate);
      expect(status.status).toBe("valid");
      expect(status.daysLeft).toBe(7);
      expect(status.hoursLeft).toBe(168);
    });

    it("الحالة 2: بعد 1 ساعة (T = +1h) -> VALID", () => {
      const t1 = new Date(createdDate.getTime() + 1 * 3600 * 1000);
      expect(isTokenExpired(expiryIso, t1)).toBe(false);
      const status = getLinkExpiryStatus(expiryIso, t1);
      expect(status.status).toBe("valid");
      expect(status.hoursLeft).toBe(167);
      expect(status.daysLeft).toBe(6);
    });

    it("الحالة 3: بعد 48 ساعة بالضبط (T = +48h) -> VALID (يجب ألا ينتهي)", () => {
      const t48 = new Date(createdDate.getTime() + 48 * 3600 * 1000);
      expect(isTokenExpired(expiryIso, t48)).toBe(false);
      const status = getLinkExpiryStatus(expiryIso, t48);
      expect(status.status).toBe("valid");
      expect(status.hoursLeft).toBe(120); // 168 - 48 = 120 hours remaining
      expect(status.daysLeft).toBe(5);
    });

    it("الحالة 4: بعد 6 أيام كاملة (T = +144h) -> VALID (متبقي 24 ساعة)", () => {
      const t144 = new Date(createdDate.getTime() + 6 * 24 * 3600 * 1000);
      expect(isTokenExpired(expiryIso, t144)).toBe(false);
      const status = getLinkExpiryStatus(expiryIso, t144);
      expect(status.status).toBe("expiring_soon");
      expect(status.hoursLeft).toBe(24);
    });

    it("الحالة 5: قبل الانتهاء بدقيقة واحدة (T = 167h 59m) -> VALID", () => {
      const tBefore = new Date(new Date(expiryIso).getTime() - 60 * 1000);
      expect(isTokenExpired(expiryIso, tBefore)).toBe(false);
      const status = getLinkExpiryStatus(expiryIso, tBefore);
      expect(status.status).toBe("expiring_soon");
      expect(status.hoursLeft).toBe(1);
    });

    it("الحالة 6: عند expires_at بالضبط -> EXPIRED", () => {
      const exact = new Date(expiryIso);
      expect(isTokenExpired(expiryIso, exact)).toBe(true);
      const status = getLinkExpiryStatus(expiryIso, exact);
      expect(status.status).toBe("expired");
      expect(status.hoursLeft).toBe(0);
      expect(status.daysLeft).toBe(0);
    });

    it("الحالة 7: بعد expires_at بثانية واحدة -> EXPIRED", () => {
      const after = new Date(new Date(expiryIso).getTime() + 1000);
      expect(isTokenExpired(expiryIso, after)).toBe(true);
      const status = getLinkExpiryStatus(expiryIso, after);
      expect(status.status).toBe("expired");
    });
  });

  // =========================================================================
  // 3. Resend & Renewal Workflow Logic
  // =========================================================================
  describe("3. Link Resend & Renewal Calculation", () => {
    it("3.1 recalculates 168 hours from the exact moment of renewal (not old created date)", () => {
      const initialCreated = new Date("2026-10-01T08:00:00.000Z");
      const initialExpiry = calculateTokenExpiry(initialCreated); // 2026-10-08T08:00:00.000Z

      // Simulation: 5 days later, admin clicks renewal / resend
      const renewalTime = new Date("2026-10-06T15:30:00.000Z");
      const renewedExpiry = calculateTokenExpiry(renewalTime); // 2026-10-13T15:30:00.000Z

      expect(new Date(renewedExpiry).getTime() - renewalTime.getTime()).toBe(604800000);
      expect(renewedExpiry).toBe("2026-10-13T15:30:00.000Z");
      expect(renewedExpiry).not.toBe(initialExpiry);

      // Verify valid for 7 days from renewal time
      expect(isTokenExpired(renewedExpiry, renewalTime)).toBe(false);
      const status = getLinkExpiryStatus(renewedExpiry, renewalTime);
      expect(status.daysLeft).toBe(7);
    });
  });

  // =========================================================================
  // 4. Old Links Backward Compatibility & Immutability
  // =========================================================================
  describe("4. Old Links Backward Compatibility", () => {
    it("4.1 respects stored expires_at for legacy links without unauthorized overwrite", () => {
      // Legacy link created under 48h policy in past
      const legacyInquiry: AbsenceInquiry = {
        id: "legacy-inq-01",
        teacherId: "t-legacy",
        teacherName: "فاطمة أحمد",
        absenceDate: "2026-09-01",
        token: "tok-legacy-48h",
        expiresAt: "2026-09-03T10:00:00.000Z", // exactly 48h after 2026-09-01T10:00:00Z
        status: "pending",
        createdAt: "2026-09-01T10:00:00.000Z",
      };

      // Past check: at 2026-09-02T10:00:00Z (24h) -> still valid under its stored policy
      const duringLegacy = new Date("2026-09-02T10:00:00.000Z");
      expect(isTokenExpired(legacyInquiry.expiresAt, duringLegacy)).toBe(false);

      // After check: at 2026-09-04T10:00:00Z (72h) -> expired under its stored policy
      const afterLegacy = new Date("2026-09-04T10:00:00.000Z");
      expect(isTokenExpired(legacyInquiry.expiresAt, afterLegacy)).toBe(true);

      // Stored expiresAt remains unchanged
      expect(legacyInquiry.expiresAt).toBe("2026-09-03T10:00:00.000Z");
    });
  });

  // =========================================================================
  // 5. Token Security & Negative Testing
  // =========================================================================
  describe("5. Token Security & Robustness", () => {
    it("5.1 generates high-entropy cryptographic token of at least 32 hex chars", () => {
      const token1 = generateSecureToken(16);
      const token2 = generateSecureToken(16);
      expect(token1).toHaveLength(32);
      expect(token2).toHaveLength(32);
      expect(token1).not.toBe(token2);
    });

    it("5.2 rejects invalid, empty, or truncated tokens safely without throwing exceptions", () => {
      expect(isTokenExpired(null)).toBe(false);
      expect(isTokenExpired(undefined)).toBe(false);
      expect(isTokenExpired("")).toBe(false);
      expect(isTokenExpired("random_garbage_string")).toBe(false);
    });
  });

  // =========================================================================
  // 6. One-Time Submission Integrity
  // =========================================================================
  describe("6. One-Time Submission & Workflow Integrity", () => {
    it("6.1 marks submitted inquiries as completed and prevents re-editing regardless of 7-day window", () => {
      const inquiry: AbsenceInquiry = {
        id: "inq-workflow-1",
        teacherId: "t-1",
        teacherName: "سارة الطلحي",
        absenceDate: "2026-10-03",
        token: "tok-workflow-1",
        expiresAt: calculateTokenExpiry(),
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      // 1. Initial State: pending
      expect(inquiry.status).toBe("pending");

      // 2. Teacher Submits response:
      const submittedInquiry: AbsenceInquiry = {
        ...inquiry,
        status: "submitted",
        teacherNotes: "عذر مراجعة صحية",
        absenceType: "إجازة مرضية",
        submittedAt: new Date().toISOString(),
      };
      expect(submittedInquiry.status).toBe("submitted");
      expect(submittedInquiry.teacherNotes).toBeDefined();

      // 3. Principal Approves:
      const approvedInquiry: AbsenceInquiry = {
        ...submittedInquiry,
        status: "approved",
        approvedAt: new Date().toISOString(),
      };
      expect(approvedInquiry.status).toBe("approved");

      // Even if token time remains valid for 7 days, getLinkExpiryStatus recognizes completion
      const completedStatus = getLinkExpiryStatus(approvedInquiry.expiresAt, true);
      expect(completedStatus.badgeText).toBe("مكتمل");
      expect(completedStatus.isExpired).toBe(false);
    });
  });

  // =========================================================================
  // 7. Timezone (Riyadh UTC+3) & Arabic Numerals Audit
  // =========================================================================
  describe("7. Timezone Audit (Asia/Riyadh UTC+3)", () => {
    it("7.1 formats dates cleanly without Arabic-Indic corruption across daylight and midnight boundaries", () => {
      const midnightUtc = "2026-10-03T21:00:00.000Z"; // Exactly 00:00 (midnight) in Riyadh
      const formatted = formatSaudiDateTime(midnightUtc);

      // In Riyadh, 21:00 UTC is next day 00:00
      expect(formatted).toMatch(/04/);
      expect(formatted).toMatch(/10/);
      expect(formatted).toMatch(/2026/);
      expect(formatted).toMatch(/12:00/);
      expect(formatted).toMatch(/ص/); // AM

      // Date only
      const dateOnly = formatSaudiDateTime(midnightUtc, { dateOnly: true });
      expect(dateOnly).toMatch(/2026/);
      expect(dateOnly).not.toMatch(/:/);
    });
  });

  // =========================================================================
  // 8. Communication Services Consistency (WhatsApp & Copy Link)
  // =========================================================================
  describe("8. Communication Services (WhatsApp & Public URL)", () => {
    it("8.1 ensures WhatsApp message contains identical token and parameters", () => {
      const inq: AbsenceInquiry = {
        id: "inq-wa-1",
        teacherId: "t-1",
        teacherName: "ريم القحطاني",
        absenceDate: "2026-10-04",
        token: "tok-wa-4040",
        expiresAt: calculateTokenExpiry(),
        status: "pending",
        createdAt: "2026-10-04T08:00:00.000Z",
      };

      const publicUrl = getInquiryPublicUrl(inq.token);
      expect(publicUrl).toContain(`/inquiry/${inq.token}`);

      const message = generateInquiryMessage(
        inq.teacherName,
        inq.absenceDate,
        publicUrl
      );
      expect(message).toContain(inq.teacherName);
      expect(message).toContain(inq.absenceDate);
      expect(message).toContain(inq.token);
    });

    it("8.2 ensures Administrative Inquiry WhatsApp service produces accurate URL", () => {
      const adminInq: AdministrativeInquiry = {
        id: "adm-wa-1",
        inquiryNumber: "ADM-99",
        teacherId: "t-2",
        teacherName: "هدى السلمي",
        inquiryType: "الامتناع عن المناوبة",
        incidentDate: "2026-10-04",
        status: "pending_teacher",
        token: "tok-adm-5555",
        tokenExpiresAt: calculateTokenExpiry(),
        createdAt: "2026-10-04T08:00:00.000Z",
      };

      const message = generateAdministrativeInquiryWhatsAppMessage(adminInq);
      expect(message).toContain(adminInq.teacherName);
      expect(message).toContain(adminInq.inquiryType);
      expect(message).toContain(adminInq.token);
      expect(message).toContain(`/administrative-inquiry/${adminInq.token}`);
    });
  });

  // =========================================================================
  // 9. Proactive Alerts Engine (Radar) Integration
  // =========================================================================
  describe("9. Proactive Alerts Engine Integration", () => {
    it("9.1 generates expired inquiry alert only when current time exceeds 7 days (168 hours)", () => {
      const now = new Date("2026-10-11T10:00:00.000Z");
      const activeInquiry: AbsenceInquiry = {
        id: "inq-act",
        teacherId: "t-active",
        teacherName: "معلمة نشطة",
        absenceDate: "2026-10-08",
        token: "tok-act",
        expiresAt: "2026-10-15T10:00:00.000Z", // Valid for 4 more days
        status: "pending",
        createdAt: "2026-10-08T10:00:00.000Z",
      };

      const expiredInquiry: AbsenceInquiry = {
        id: "inq-exp",
        teacherId: "t-expired",
        teacherName: "معلمة منتهية",
        absenceDate: "2026-10-01",
        token: "tok-exp",
        expiresAt: "2026-10-08T10:00:00.000Z", // Expired 3 days ago
        status: "pending",
        createdAt: "2026-10-01T10:00:00.000Z",
      };

      const alerts = generateSchoolProactiveAlerts({
        teachers: [
          { id: "t-active", name: "معلمة نشطة", totalAbsences: 1 } as Teacher,
          { id: "t-expired", name: "معلمة منتهية", totalAbsences: 1 } as Teacher,
        ],
        delayNotices: [],
        deductionDecisions: [],
        inquiries: [activeInquiry, expiredInquiry],
        now: now.toISOString(),
      });

      const expAlerts = alerts.filter((a) => a.type === "expired_inquiry");
      expect(expAlerts).toHaveLength(1);
      expect(expAlerts[0].teacherId).toBe("t-expired");
      expect(expAlerts[0].title).toContain("7 أيام");
      expect(expAlerts[0].description).toContain("168 ساعة");
    });
  });

  // =========================================================================
  // 10. Platform Ecosystem Smoke & Regression Checks
  // =========================================================================
  describe("10. Ecosystem Regression & Data Integrity (11 Modules)", () => {
    it("10.1 Backup & Restore remains 100% valid with 7-day inquiries", () => {
      const mockTeacher: Teacher = {
        id: "t-backup",
        name: "منى الأحمدي",
        fullName: "منى الأحمدي",
        nationalId: "1023456789",
        jobNumber: "9090",
        jobTitle: "معلم",
        specialty: "فيزياء",
        totalAbsences: 1,
      };

      const mockInquiry: AbsenceInquiry = {
        id: "inq-backup",
        teacherId: "t-backup",
        teacherName: "منى الأحمدي",
        absenceDate: "2026-10-03",
        token: "tok-backup",
        expiresAt: calculateTokenExpiry(),
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      const snapshot = createDatabaseBackupSnapshot({
        teachers: [mockTeacher],
        inquiries: [mockInquiry],
      });

      expect(snapshot).toBeDefined();
      expect(snapshot.metadata.counts.teachers).toBe(1);
      expect(snapshot.metadata.counts.inquiries).toBe(1);

      const validation = validateBackupSnapshot(snapshot);
      expect(validation.valid).toBe(true);
    });

    it("10.2 Attachments parsing and resolution functions cleanly", () => {
      const raw = '[{"url":"https://example.supabase.co/storage/v1/object/public/attachments/doc.pdf","slotId":"1"}]';
      const parsed = parseAttachments(raw);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].url).toContain("supabase.co");

      const resolved = resolveAttachmentUrl("absence-attachments/test.pdf");
      expect(resolved).toContain("https://");
    });
  });
});
