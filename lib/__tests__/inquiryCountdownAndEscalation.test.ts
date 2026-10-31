import { describe, it, expect } from "vitest";
import {
  calculateRemainingCountdown,
  formatArabicDays,
  formatArabicHours,
  formatArabicMinutes,
  serializeInquiryMeta,
  parseInquiryMeta,
  isAbsenceEscalatedToMahdar,
} from "../timeUtils";
import { AbsenceInquiry, AdministrativeInquiry } from "@/types/teacher";

describe("Inquiry Countdown & Escalation Logic", () => {
  describe("Arabic Grammar Formatters", () => {
    it("formats Arabic days according to standard rules", () => {
      expect(formatArabicDays(0)).toBe("");
      expect(formatArabicDays(1)).toBe("يوم واحد");
      expect(formatArabicDays(2)).toBe("يومان");
      expect(formatArabicDays(3)).toBe("3 أيام");
      expect(formatArabicDays(7)).toBe("7 أيام");
      expect(formatArabicDays(10)).toBe("10 أيام");
      expect(formatArabicDays(11)).toBe("11 يوماً");
      expect(formatArabicDays(20)).toBe("20 يوماً");
    });

    it("formats Arabic hours according to standard rules", () => {
      expect(formatArabicHours(0)).toBe("");
      expect(formatArabicHours(1)).toBe("ساعة واحدة");
      expect(formatArabicHours(2)).toBe("ساعتان");
      expect(formatArabicHours(4)).toBe("4 ساعات");
      expect(formatArabicHours(10)).toBe("10 ساعات");
      expect(formatArabicHours(12)).toBe("12 ساعة");
      expect(formatArabicHours(23)).toBe("23 ساعة");
    });

    it("formats Arabic minutes according to standard rules", () => {
      expect(formatArabicMinutes(0)).toBe("");
      expect(formatArabicMinutes(1)).toBe("دقيقة واحدة");
      expect(formatArabicMinutes(2)).toBe("دقيقتان");
      expect(formatArabicMinutes(5)).toBe("5 دقائق");
      expect(formatArabicMinutes(10)).toBe("10 دقائق");
      expect(formatArabicMinutes(15)).toBe("15 دقيقة");
      expect(formatArabicMinutes(59)).toBe("59 دقيقة");
    });
  });

  describe("calculateRemainingCountdown", () => {
    it("calculates exact remaining days, hours, and minutes for a 7-day period", () => {
      const now = new Date("2026-10-01T10:00:00.000Z");
      // Exactly 6 days, 4 hours, 30 minutes, 15 seconds remaining
      const expiry = new Date("2026-10-07T14:30:15.000Z");

      const res = calculateRemainingCountdown(expiry, now);

      expect(res.isExpired).toBe(false);
      expect(res.days).toBe(6);
      expect(res.hours).toBe(4);
      expect(res.minutes).toBe(30);
      expect(res.seconds).toBe(15);
      expect(res.totalRemainingSeconds).toBe(6 * 86400 + 4 * 3600 + 30 * 60 + 15);
      expect(res.formattedExact).toBe("متبقي 6 أيام و 4 ساعات و 30 دقيقة");
      expect(res.formattedShort).toBe("6 ي و 4 س");
      expect(res.badgeVariant).toBe("emerald");
      expect(res.isUrgent).toBe(false);
    });

    it("flags urgent warning when remaining time is under 24 hours", () => {
      const now = new Date("2026-10-01T10:00:00.000Z");
      // 18 hours, 15 minutes remaining
      const expiry = new Date("2026-10-02T04:15:00.000Z");

      const res = calculateRemainingCountdown(expiry, now);

      expect(res.isExpired).toBe(false);
      expect(res.isUrgent).toBe(true);
      expect(res.days).toBe(0);
      expect(res.hours).toBe(18);
      expect(res.minutes).toBe(15);
      expect(res.formattedExact).toBe("متبقي 18 ساعة و 15 دقيقة");
      expect(res.formattedShort).toBe("18 س و 15 د");
      expect(res.badgeVariant).toBe("amber");
    });

    it("accurately handles remaining time when less than 1 hour is left", () => {
      const now = new Date("2026-10-01T10:00:00.000Z");
      // 45 minutes and 20 seconds remaining
      const expiry = new Date("2026-10-01T10:45:20.000Z");

      const res = calculateRemainingCountdown(expiry, now);

      expect(res.isExpired).toBe(false);
      expect(res.isUrgent).toBe(true);
      expect(res.days).toBe(0);
      expect(res.hours).toBe(0);
      expect(res.minutes).toBe(45);
      expect(res.seconds).toBe(20);
      expect(res.formattedExact).toBe("متبقي 45 دقيقة");
      expect(res.formattedShort).toBe("45 د");
      expect(res.badgeVariant).toBe("amber");
    });

    it("accurately handles sub-minute remaining time", () => {
      const now = new Date("2026-10-01T10:00:00.000Z");
      // 35 seconds remaining
      const expiry = new Date("2026-10-01T10:00:35.000Z");

      const res = calculateRemainingCountdown(expiry, now);

      expect(res.isExpired).toBe(false);
      expect(res.isUrgent).toBe(true);
      expect(res.days).toBe(0);
      expect(res.hours).toBe(0);
      expect(res.minutes).toBe(0);
      expect(res.seconds).toBe(35);
      expect(res.formattedExact).toBe("متبقي 35 ثانية");
      expect(res.formattedShort).toBe("أقل من دقيقة");
      expect(res.badgeVariant).toBe("amber");
    });

    it("marks status as expired when deadline has passed", () => {
      const now = new Date("2026-10-08T10:00:00.000Z");
      // Expiry was 5 minutes ago
      const expiry = new Date("2026-10-08T09:55:00.000Z");

      const res = calculateRemainingCountdown(expiry, now);

      expect(res.isExpired).toBe(true);
      expect(res.days).toBe(0);
      expect(res.hours).toBe(0);
      expect(res.minutes).toBe(0);
      expect(res.seconds).toBe(0);
      expect(res.totalRemainingSeconds).toBe(0);
      expect(res.formattedExact).toBe("انتهت المهلة");
      expect(res.formattedShort).toBe("انتهت المهلة");
      expect(res.statusLabel).toBe("انتهت المهلة المحددة");
      expect(res.badgeVariant).toBe("rose");
    });

    it("falls back to default 7 days from baseDate if targetDate is missing or invalid", () => {
      const base = new Date("2026-10-01T10:00:00.000Z");
      // Reference date is 2 days after base
      const ref = new Date("2026-10-03T10:00:00.000Z");

      const res = calculateRemainingCountdown(undefined, ref, 7, base);

      expect(res.isExpired).toBe(false);
      expect(res.days).toBe(5);
      expect(res.hours).toBe(0);
      expect(res.minutes).toBe(0);
      expect(res.formattedShort).toBe("5 ي");
    });
  });

  describe("Inquiry Metadata & Mahdar Link Serialization", () => {
    it("serializes and parses notes with escalatedMahdarId and mahdarDate", () => {
      const originalNotes = "ملاحظة الوكيلة: لم يتم التجاوب";
      const serialized = serializeInquiryMeta(undefined, undefined, originalNotes, {
        escalatedMahdarId: "admin-inq-7788",
        mahdarDate: "2026-10-31",
      });

      expect(serialized).toContain('"mahdarId":"admin-inq-7788"');
      expect(serialized).toContain('"mahdarDate":"2026-10-31"');
      expect(serialized).toContain(originalNotes);

      const parsed = parseInquiryMeta(serialized);
      expect(parsed.adminNotes).toBe(originalNotes);
      expect(parsed.text).toBe(originalNotes);
      expect(parsed.escalatedMahdarId).toBe("admin-inq-7788");
      expect(parsed.mahdarDate).toBe("2026-10-31");
    });

    it("preserves plain text without JSON gracefully without errors", () => {
      const plain = "ملاحظة عادية غير مهيكلة";
      const parsed = parseInquiryMeta(plain);

      expect(parsed.adminNotes).toBe(plain);
      expect(parsed.text).toBe(plain);
      expect(parsed.escalatedMahdarId).toBeUndefined();
      expect(parsed.mahdarDate).toBeUndefined();
    });
  });

  describe("Deduplication & Escalation Checking (isAbsenceEscalatedToMahdar)", () => {
    const mockInquiry: AbsenceInquiry = {
      id: "abs-inq-101",
      teacherId: "teacher-55",
      teacherName: "سارة فهد",
      absenceDate: "2026-10-20",
      reason: "",
      status: "pending",
      createdAt: "2026-10-20T08:00:00.000Z",
      expiresAt: "2026-10-27T08:00:00.000Z",
    };

    it("returns isEscalated: false when no mahdar is associated", () => {
      const res = isAbsenceEscalatedToMahdar(mockInquiry, []);
      expect(res.isEscalated).toBe(false);
      expect(res.mahdarId).toBeUndefined();
    });

    it("returns isEscalated: true if inquiry has explicit escalatedMahdarId property", () => {
      const inquiryWithMahdar: AbsenceInquiry = {
        ...mockInquiry,
        escalatedMahdarId: "admin-999",
      };

      const res = isAbsenceEscalatedToMahdar(inquiryWithMahdar, []);
      expect(res.isEscalated).toBe(true);
      expect(res.mahdarId).toBe("admin-999");
    });

    it("returns isEscalated: true if inquiry has escalatedMahdarId in serialized notes", () => {
      const inquiryWithSerializedNotes: AbsenceInquiry = {
        ...mockInquiry,
        adminNotes: serializeInquiryMeta(undefined, undefined, "ملاحظة سابقة", {
          escalatedMahdarId: "admin-888",
        }),
      };

      const res = isAbsenceEscalatedToMahdar(inquiryWithSerializedNotes, []);
      expect(res.isEscalated).toBe(true);
      expect(res.mahdarId).toBe("admin-888");
    });

    it("matches existing administrative inquiry by source absence ID in notes or description", () => {
      const matchingAdminInquiry: AdministrativeInquiry = {
        id: "admin-777",
        teacherId: "teacher-55",
        teacherName: "سارة فهد",
        inquiryNumber: "ADM-2026-001",
        inquiryType: "أخرى",
        token: "tok-1",
        tokenExpiresAt: "2026-11-03T08:30:00.000Z",
        incidentDate: "2026-10-20",
        violationType: "other",
        violationTypeArabic: "أخرى - تخلف عن تقديم إفادة غياب",
        incidentDescription: "تم الرفع آلياً لعدم تقديم إفادة الغياب عن يوم 2026-10-20 (مساءلة abs-inq-101)",
        status: "pending_teacher",
        createdAt: "2026-10-27T08:30:00.000Z",
      };

      const res = isAbsenceEscalatedToMahdar(mockInquiry, [matchingAdminInquiry]);
      expect(res.isEscalated).toBe(true);
      expect(res.mahdarId).toBe("admin-777");
      expect(res.mahdarItem?.inquiryNumber).toBe("ADM-2026-001");
    });

    it("matches by teacherId + incidentDate + failure-to-respond violation type", () => {
      const matchingAdminInquiry: AdministrativeInquiry = {
        id: "admin-666",
        teacherId: "teacher-55",
        teacherName: "سارة فهد",
        inquiryNumber: "ADM-2026-002",
        inquiryType: "أخرى",
        token: "tok-2",
        tokenExpiresAt: "2026-11-03T08:30:00.000Z",
        incidentDate: "2026-10-20",
        violationType: "other",
        violationTypeArabic: "تخلف عن تقديم إفادة غياب",
        incidentDescription: "تخلفت المعلمة عن الرد خلال 7 أيام",
        status: "pending_teacher",
        createdAt: "2026-10-27T08:30:00.000Z",
      };

      const res = isAbsenceEscalatedToMahdar(mockInquiry, [matchingAdminInquiry]);
      expect(res.isEscalated).toBe(true);
      expect(res.mahdarId).toBe("admin-666");
    });

    it("ignores archived administrative inquiries when looking up escalation by matching description", () => {
      const archivedAdminInquiry: AdministrativeInquiry = {
        id: "admin-555",
        teacherId: "teacher-55",
        teacherName: "سارة فهد",
        inquiryNumber: "ADM-2026-003",
        inquiryType: "أخرى",
        token: "tok-3",
        tokenExpiresAt: "2026-11-03T08:30:00.000Z",
        incidentDate: "2026-10-20",
        violationType: "other",
        violationTypeArabic: "تخلف عن تقديم إفادة غياب",
        incidentDescription: "مساءلة abs-inq-101",
        status: "pending_teacher",
        createdAt: "2026-10-27T08:30:00.000Z",
        isArchived: true,
      };

      const res = isAbsenceEscalatedToMahdar(mockInquiry, [archivedAdminInquiry]);
      expect(res.isEscalated).toBe(false);
      expect(res.mahdarId).toBeUndefined();
    });

    it("un-escalates when explicit escalatedMahdarId points to an archived mahdar", () => {
      const archivedAdminInquiry: AdministrativeInquiry = {
        id: "admin-archived-999",
        teacherId: "teacher-55",
        teacherName: "سارة فهد",
        token: "tok-archived",
        tokenExpiresAt: "2026-11-03T08:30:00.000Z",
        incidentDate: "2026-10-20",
        status: "pending_teacher",
        createdAt: "2026-10-27T08:30:00.000Z",
        isArchived: true,
      };

      const inquiryWithArchivedMahdar: AbsenceInquiry = {
        ...mockInquiry,
        escalatedMahdarId: "admin-archived-999",
      };

      const res = isAbsenceEscalatedToMahdar(inquiryWithArchivedMahdar, [archivedAdminInquiry]);
      expect(res.isEscalated).toBe(false);
    });

    it("preserves escalation when explicit escalatedMahdarId points to an active mahdar", () => {
      const activeAdminInquiry: AdministrativeInquiry = {
        id: "admin-active-999",
        teacherId: "teacher-55",
        teacherName: "سارة فهد",
        token: "tok-active",
        tokenExpiresAt: "2026-11-03T08:30:00.000Z",
        incidentDate: "2026-10-20",
        status: "pending_teacher",
        createdAt: "2026-10-27T08:30:00.000Z",
        isArchived: false,
      };

      const inquiryWithActiveMahdar: AbsenceInquiry = {
        ...mockInquiry,
        escalatedMahdarId: "admin-active-999",
      };

      const res = isAbsenceEscalatedToMahdar(inquiryWithActiveMahdar, [activeAdminInquiry]);
      expect(res.isEscalated).toBe(true);
      expect(res.mahdarId).toBe("admin-active-999");
      expect(res.mahdarItem?.id).toBe("admin-active-999");
    });
  });
});
