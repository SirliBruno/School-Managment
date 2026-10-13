import { describe, it, expect } from "vitest";
import { calculateNoticeDurationMinutes } from "@/lib/delayDeductionIntegration";
import { buildDelayNoticePdfHtml } from "@/lib/printDelayNoticePdfService";
import { DelayNotice, Teacher } from "@/types/teacher";

describe("SPRINT 1: Delay Notice PDF & 'أخرى' Reason Improvements", () => {
  const dummyTeacher: Teacher = {
    id: "tch-1",
    fullName: "أحلام صالح",
    nationalId: "1029384756",
    jobNumber: "1029384756",
    specialty: "رياضيات",
    teachingField: "رياضيات",
    jobTitle: "معلمة متميزة",
    totalAbsences: 0,
    totalDelayNotices: 1,
    createdAt: "2026-10-01T08:00:00Z",
    updatedAt: "2026-10-01T08:00:00Z",
  };

  describe("1 & 2. Unified Delay Minutes Source of Truth", () => {
    it("uses calculatedMinutes if provided directly on notice", () => {
      const notice: Partial<DelayNotice> = {
        calculatedMinutes: 25,
        violationDelayStart: true,
        delayStartFromTime: "07:00",
        delayStartTime: "07:25",
      };
      expect(calculateNoticeDurationMinutes(notice as DelayNotice)).toBe(25);
    });

    it("calculates fallback duration accurately from time strings for delay start", () => {
      const notice: Partial<DelayNotice> = {
        violationDelayStart: true,
        delayStartFromTime: "07:00",
        delayStartTime: "07:35",
      };
      expect(calculateNoticeDurationMinutes(notice as DelayNotice)).toBe(35);
    });

    it("calculates fallback duration accurately for absent during work hours", () => {
      const notice: Partial<DelayNotice> = {
        violationAbsentDuring: true,
        absentFromTime: "08:15",
        absentToTime: "09:45",
      };
      expect(calculateNoticeDurationMinutes(notice as DelayNotice)).toBe(90);
    });

    it("calculates fallback duration accurately for early departure", () => {
      const notice: Partial<DelayNotice> = {
        violationEarlyDeparture: true,
        earlyDepartureFromTime: "11:30",
        earlyDepartureTime: "12:30",
      };
      expect(calculateNoticeDurationMinutes(notice as DelayNotice)).toBe(60);
    });

    it("returns 0 when notice has no time range or delay duration", () => {
      const notice: Partial<DelayNotice> = {
        violationDelayStart: false,
        violationAbsentDuring: false,
        violationEarlyDeparture: false,
        violationLeftSchool: false,
      };
      expect(calculateNoticeDurationMinutes(notice as DelayNotice)).toBe(0);
    });
  });

  describe("3 & 4. PDF Output: Delay Minutes Rendering & Typography", () => {
    it("renders delay minutes prominently in PDF when minutes > 0", () => {
      const notice: DelayNotice = {
        id: "dln-101",
        noticeNumber: "ت-2026-001",
        teacherId: dummyTeacher.id,
        teacherName: dummyTeacher.fullName,
        noticeDate: "2026-10-12",
        violationDelayStart: true,
        delayStartFromTime: "07:00",
        delayStartTime: "07:25",
        calculatedMinutes: 25,
        calculatedDuration: "25 دقيقة",
        status: "pending_teacher",
        hijriYear: "١٤٤٨",
        shareToken: "token123",
        tokenExpiresAt: "2026-10-20T00:00:00Z",
        createdAt: "2026-10-12T07:30:00Z",
      };

      const html = buildDelayNoticePdfHtml({ notice, teacher: dummyTeacher });

      // Must clearly display delay minutes
      expect(html).toContain("دقائق التأخير :");
      expect(html).toContain("25 دقيقة");
      expect(html).toContain("Cairo");
      expect(html).toContain("dir=\"rtl\"");
    });

    it("omits dummy/artificial delay minutes container when duration is 0", () => {
      const notice: DelayNotice = {
        id: "dln-102",
        noticeNumber: "ت-2026-002",
        teacherId: dummyTeacher.id,
        teacherName: dummyTeacher.fullName,
        noticeDate: "2026-10-12",
        violationDelayStart: false,
        violationAbsentDuring: false,
        violationEarlyDeparture: false,
        violationLeftSchool: false,
        calculatedMinutes: 0,
        status: "pending_teacher",
        hijriYear: "١٤٤٨",
        shareToken: "token123",
        tokenExpiresAt: "2026-10-20T00:00:00Z",
        createdAt: "2026-10-12T07:30:00Z",
      };

      const html = buildDelayNoticePdfHtml({ notice, teacher: dummyTeacher });

      // Should not contain the minutes highlight box
      expect(html).not.toContain("دقائق التأخير :");
    });
  });

  describe("5, 10 & 11. PDF Output: 'أخرى' Custom Delay Reason", () => {
    it("renders 'أخرى — [السبب]' in PDF when violationOther is true", () => {
      const notice: DelayNotice = {
        id: "dln-103",
        noticeNumber: "ت-2026-003",
        teacherId: dummyTeacher.id,
        teacherName: dummyTeacher.fullName,
        noticeDate: "2026-10-12",
        violationDelayStart: false,
        violationAbsentDuring: false,
        violationEarlyDeparture: false,
        violationLeftSchool: false,
        violationOther: true,
        otherReasonDetails: "تعذر الوصول بسبب تعطل المركبة في الطريق",
        additionalNotes: "أخرى — تعذر الوصول بسبب تعطل المركبة في الطريق",
        calculatedMinutes: 30,
        status: "pending_teacher",
        hijriYear: "١٤٤٨",
        shareToken: "token123",
        tokenExpiresAt: "2026-10-20T00:00:00Z",
        createdAt: "2026-10-12T07:30:00Z",
      };

      const html = buildDelayNoticePdfHtml({ notice, teacher: dummyTeacher });

      expect(html).toContain("سبب التأخير: أخرى — تعذر الوصول بسبب تعطل المركبة في الطريق");
    });

    it("correctly extracts 'أخرى — [السبب]' from legacy additionalNotes when violationOther is missing (Backward Compatibility)", () => {
      const legacyNotice: DelayNotice = {
        id: "dln-104",
        noticeNumber: "ت-2026-004",
        teacherId: dummyTeacher.id,
        teacherName: dummyTeacher.fullName,
        noticeDate: "2026-10-12",
        violationDelayStart: false,
        violationAbsentDuring: false,
        violationEarlyDeparture: false,
        violationLeftSchool: false,
        additionalNotes: "أخرى — مراجعة رسمية طارئة",
        calculatedMinutes: 45,
        status: "pending_teacher",
        hijriYear: "١٤٤٨",
        shareToken: "token123",
        tokenExpiresAt: "2026-10-20T00:00:00Z",
        createdAt: "2026-10-12T07:30:00Z",
      };

      const html = buildDelayNoticePdfHtml({ notice: legacyNotice, teacher: dummyTeacher });

      expect(html).toContain("سبب التأخير: أخرى — مراجعة رسمية طارئة");
    });

    it("preserves standard violations without corrupting standard reasons", () => {
      const standardNotice: DelayNotice = {
        id: "dln-105",
        noticeNumber: "ت-2026-005",
        teacherId: dummyTeacher.id,
        teacherName: dummyTeacher.fullName,
        noticeDate: "2026-10-12",
        violationDelayStart: true,
        delayStartTime: "07:40",
        violationEarlyDeparture: false,
        violationAbsentDuring: false,
        violationLeftSchool: false,
        calculatedMinutes: 40,
        status: "pending_teacher",
        hijriYear: "١٤٤٨",
        shareToken: "token123",
        tokenExpiresAt: "2026-10-20T00:00:00Z",
        createdAt: "2026-10-12T07:30:00Z",
      };

      const html = buildDelayNoticePdfHtml({ notice: standardNotice, teacher: dummyTeacher });

      expect(html).toContain("تأخركم من بداية الدوام وحضوركم الساعة (07:40)");
      expect(html).not.toContain("سبب التأخير: أخرى");
    });

    it("renders delay minutes and correct header date for real-world historical notice without stored start time (e.g. 06:51)", () => {
      const realNotice: DelayNotice = {
        id: "b0fd5614-df74-422d-a223-36aa8e3e0372",
        noticeNumber: "ت-2026-009",
        teacherId: dummyTeacher.id,
        teacherName: "هناء بنت صالح زيني الامير",
        noticeDate: "2026-10-13",
        violationDelayStart: true,
        delayStartTime: "06:51",
        status: "pending_director",
        teacherReason: "ظرف طارئ",
        teacherSignatureDate: "2026-10-13",
        hijriYear: "١٤٤٨",
        shareToken: "token-hanaa",
        tokenExpiresAt: "2026-10-20T00:00:00Z",
        createdAt: "2026-10-13T06:21:10Z",
      };

      const minutes = calculateNoticeDurationMinutes(realNotice);
      expect(minutes).toBe(6); // 06:45 to 06:51 = 6 minutes

      const html = buildDelayNoticePdfHtml({ notice: realNotice, teacher: dummyTeacher });

      // Minutes in box
      expect(html).toContain("دقائق التأخير :");
      expect(html).toContain("6 دقيقة");

      // Duration in bullet point
      expect(html).toContain("تأخركم من بداية الدوام وحضوركم الساعة (06:51) [المدة: 6 دقائق]");

      // Correct official header date (1448/05/02 هـ) and NO 1919 year
      expect(html).toContain("1448/05/02");
      expect(html).toContain("2026/10/13");
      expect(html).not.toContain("1919");
      expect(html).not.toContain("1337/07/17");
    });
  });
});
