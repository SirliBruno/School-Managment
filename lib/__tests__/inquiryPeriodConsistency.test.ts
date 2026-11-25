import { describe, it, expect } from "vitest";
import { formatOfficialDateRange, getDualDate } from "../hijriDateService";
import {
  addDaysToDateStr,
  calculateDaysBetween,
  parseInquiryMeta,
  serializeInquiryMeta,
} from "../timeUtils";

describe("Inquiry Period Consistency & Multi-Day Safeguards", () => {
  describe("formatOfficialDateRange across Hijri years", () => {
    it("includes start Hijri year when start and end dates fall in different Hijri years", () => {
      // 2026-06-15 (Dhul-Hijjah 1447) to 2026-06-17 (Muharram 1448)
      const startDual = getDualDate("2026-06-15");
      const endDual = getDualDate("2026-06-17");
      expect(startDual.hijriParts.year).not.toBe(endDual.hijriParts.year);

      const range = formatOfficialDateRange("2026-06-15", "2026-06-17");
      expect(range.hijriRange).toContain(`${startDual.hijriParts.year}هـ`);
      expect(range.hijriRange).toContain(`${endDual.hijriParts.year}هـ`);
      expect(range.hijriRange).toBe(
        `من ${startDual.hijriParts.day} ${startDual.hijriParts.monthName} ${startDual.hijriParts.year}هـ إلى ${endDual.hijriParts.day} ${endDual.hijriParts.monthName} ${endDual.hijriParts.year}هـ`
      );
      expect(range.gregorianRange).toBe("من 2026-06-15 إلى 2026-06-17");
    });

    it("omits duplicate start Hijri year when start and end dates are in the same Hijri year", () => {
      const startDual = getDualDate("2026-10-12");
      const endDual = getDualDate("2026-10-14");
      expect(startDual.hijriParts.year).toBe(endDual.hijriParts.year);

      const range = formatOfficialDateRange("2026-10-12", "2026-10-14");
      expect(range.hijriRange).toBe(
        `من ${startDual.hijriParts.day} ${startDual.hijriParts.monthName} إلى ${endDual.hijriParts.day} ${endDual.hijriParts.monthName} ${endDual.hijriParts.year}هـ`
      );
    });
  });

  describe("calculateDaysBetween and addDaysToDateStr round-trip consistency", () => {
    it("round-trips N days across month and year boundaries", () => {
      const startDates = ["2026-01-30", "2026-02-27", "2026-06-15", "2026-12-30"];
      for (const start of startDates) {
        for (let days = 1; days <= 10; days++) {
          const end = addDaysToDateStr(start, days - 1);
          expect(calculateDaysBetween(start, end)).toBe(days);
        }
      }
    });

    it("returns 1 when endDate precedes startDate or is equal", () => {
      expect(calculateDaysBetween("2026-10-12", "2026-10-12")).toBe(1);
      expect(calculateDaysBetween("2026-10-12", "2026-10-10")).toBe(1);
    });
  });

  describe("parseInquiryMeta & serializeInquiryMeta multi-day preservation", () => {
    it("preserves absenceEndDate, daysCount, adminNotes, and extra metadata", () => {
      const serialized = serializeInquiryMeta("2026-10-15", 4, "ملاحظة إدارية", {
        cycleNumber: 2,
        previousInquiryId: "inq-prev-1",
      });
      expect(serialized).toBeDefined();

      const parsed = parseInquiryMeta(serialized);
      expect(parsed.absenceEndDate).toBe("2026-10-15");
      expect(parsed.daysCount).toBe(4);
      expect(parsed.adminNotes).toBe("ملاحظة إدارية");
      expect(parsed.cycleNumber).toBe(2);
      expect(parsed.previousInquiryId).toBe("inq-prev-1");
    });

    it("retains backward-compatible fallback when daysCount is omitted", () => {
      const serialized = serializeInquiryMeta("2026-10-15", undefined, "ملاحظة");
      const parsed = parseInquiryMeta(serialized);
      expect(parsed.absenceEndDate).toBe("2026-10-15");
      expect(parsed.daysCount).toBe(2);
      expect(parsed.adminNotes).toBe("ملاحظة");
    });
  });

  describe("DB-first priority and Math.max(5, daysCount) preservation logic", () => {
    function resolveInquiryPeriod(params: {
      absenceDate: string;
      dbEndDate?: string | null;
      dbDaysCount?: number | null;
      rawAdminNotes?: string | null;
      urlEndDate?: string | null;
      urlDays?: number | null;
    }) {
      const meta = parseInquiryMeta(params.rawAdminNotes);
      const resolvedEndDate =
        params.dbEndDate || meta.absenceEndDate || params.urlEndDate || undefined;
      const isMulti = Boolean(resolvedEndDate && resolvedEndDate !== params.absenceDate);
      const resolvedDays =
        params.dbDaysCount ||
        meta.daysCount ||
        params.urlDays ||
        (isMulti && resolvedEndDate
          ? calculateDaysBetween(params.absenceDate, resolvedEndDate)
          : 1);
      const maxAllowedDays = Math.max(5, resolvedDays || 1);
      return { resolvedEndDate, isMulti, resolvedDays, maxAllowedDays };
    }

    it("prioritizes stored DB values over meta and URL query params", () => {
      const metaNotes = serializeInquiryMeta("2026-10-14", 3);
      const result = resolveInquiryPeriod({
        absenceDate: "2026-10-12",
        dbEndDate: "2026-10-18",
        dbDaysCount: 7,
        rawAdminNotes: metaNotes,
        urlEndDate: "2026-10-13",
        urlDays: 2,
      });

      expect(result.resolvedEndDate).toBe("2026-10-18");
      expect(result.resolvedDays).toBe(7);
      expect(result.isMulti).toBe(true);
      expect(result.maxAllowedDays).toBe(7);
    });

    it("falls back to meta before URL query params when DB columns are absent", () => {
      const metaNotes = serializeInquiryMeta("2026-10-15", 4);
      const result = resolveInquiryPeriod({
        absenceDate: "2026-10-12",
        dbEndDate: null,
        dbDaysCount: null,
        rawAdminNotes: metaNotes,
        urlEndDate: "2026-10-13",
        urlDays: 2,
      });

      expect(result.resolvedEndDate).toBe("2026-10-15");
      expect(result.resolvedDays).toBe(4);
      expect(result.maxAllowedDays).toBe(5);
    });

    it("caps single-day teacher extension at 5 while preserving admin-issued > 5 days", () => {
      const singleDay = resolveInquiryPeriod({
        absenceDate: "2026-10-12",
        dbDaysCount: 1,
      });
      expect(singleDay.maxAllowedDays).toBe(5);

      const adminEightDays = resolveInquiryPeriod({
        absenceDate: "2026-10-12",
        dbEndDate: "2026-10-19",
        dbDaysCount: 8,
      });
      expect(adminEightDays.maxAllowedDays).toBe(8);
      expect(addDaysToDateStr("2026-10-12", adminEightDays.maxAllowedDays - 1)).toBe(
        "2026-10-19"
      );
    });
  });
});
