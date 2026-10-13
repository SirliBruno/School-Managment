import { describe, it, expect } from "vitest";
import {
  getDualDate,
  getHijriPartsFromDate,
  hijriToGregorianIso,
  formatOfficialHeaderDate,
  formatOfficialIncidentDate,
  formatOfficialDateRange,
  parseIsoDate,
  toIsoDateString,
  getArabicDayOfWeek,
} from "../hijriDateService";

describe("hijriDateService (Saudi Umm al-Qura Dual Calendar Engine)", () => {
  describe("parseIsoDate & toIsoDateString", () => {
    it("correctly parses YYYY-MM-DD string without timezone skew", () => {
      const parsed = parseIsoDate("2026-10-12");
      expect(parsed).not.toBeNull();
      expect(toIsoDateString(parsed!)).toBe("2026-10-12");
    });

    it("handles ISO strings with time portion", () => {
      const parsed = parseIsoDate("2026-10-12T08:30:00.000Z");
      expect(parsed).not.toBeNull();
      expect(toIsoDateString(parsed!)).toBe("2026-10-12");
    });

    it("returns null for empty or invalid input", () => {
      expect(parseIsoDate("")).toBeNull();
      expect(parseIsoDate("invalid-date")).toBeNull();
    });
  });

  describe("getArabicDayOfWeek", () => {
    it("returns correct Arabic day name", () => {
      // 2026-10-12 is Monday (الإثنين)
      const d = parseIsoDate("2026-10-12")!;
      expect(getArabicDayOfWeek(d)).toBe("الإثنين");

      // 2026-10-11 is Sunday (الأحد)
      const sun = parseIsoDate("2026-10-11")!;
      expect(getArabicDayOfWeek(sun)).toBe("الأحد");
    });
  });

  describe("getHijriPartsFromDate (Umm al-Qura)", () => {
    it("extracts valid Hijri parts for a modern Saudi date", () => {
      const d = parseIsoDate("2026-10-12")!;
      const parts = getHijriPartsFromDate(d);

      expect(parts.year).toBeGreaterThanOrEqual(1447);
      expect(parts.month).toBeGreaterThanOrEqual(1);
      expect(parts.month).toBeLessThanOrEqual(12);
      expect(parts.day).toBeGreaterThanOrEqual(1);
      expect(parts.day).toBeLessThanOrEqual(30);
      expect(typeof parts.monthName).toBe("string");
      expect(parts.monthName.length).toBeGreaterThan(1);
      expect(parts.dayName).toBe("الإثنين");
    });

    it("adjusts correctly when offsetDays is applied", () => {
      const d = parseIsoDate("2026-10-12")!;
      const baseParts = getHijriPartsFromDate(d, 0);
      const plusOneParts = getHijriPartsFromDate(d, 1);
      const minusOneParts = getHijriPartsFromDate(d, -1);

      // Either day changes or month wraps
      expect(plusOneParts.day !== baseParts.day || plusOneParts.month !== baseParts.month).toBe(true);
      expect(minusOneParts.day !== baseParts.day || minusOneParts.month !== baseParts.month).toBe(true);
    });
  });

  describe("hijriToGregorianIso (Bidirectional Solver)", () => {
    it("accurately converts Hijri parts back to the exact Gregorian date", () => {
      const testDates = ["2026-01-15", "2026-05-20", "2026-10-12", "2026-12-31"];

      for (const iso of testDates) {
        const d = parseIsoDate(iso)!;
        const parts = getHijriPartsFromDate(d);
        const resolvedIso = hijriToGregorianIso(parts.year, parts.month, parts.day);

        expect(resolvedIso).toBe(iso);
      }
    });
  });

  describe("getDualDate", () => {
    it("produces full dual calendar information", () => {
      const dual = getDualDate("2026-10-12");

      expect(dual.gregorianIso).toBe("2026-10-12");
      expect(dual.gregorianShort).toContain("2026/10/12");
      expect(dual.hijriShort).toMatch(/^14\d{2}\/\d{2}\/\d{2}\s*هـ$/);
      expect(dual.hijriFormatted).toContain("هـ");
      expect(dual.dayName).toBe("الإثنين");
      expect(dual.officialHeaderString).toContain("الموافق");
      expect(dual.officialIncidentString).toContain("يوم الإثنين");
    });
  });

  describe("formatOfficialHeaderDate & formatOfficialIncidentDate", () => {
    it("formats official header date to Ministry of Education specifications", () => {
      const headerStr = formatOfficialHeaderDate("2026-10-12");
      expect(headerStr).toContain("هـ");
      expect(headerStr).toContain("الموافق");
      expect(headerStr).toContain("2026/10/12م");
    });

    it("formats official incident statement date correctly", () => {
      const incidentStr = formatOfficialIncidentDate("2026-10-12");
      expect(incidentStr).toContain("يوم الإثنين");
      expect(incidentStr).toContain("هـ");
      expect(incidentStr).toContain("(الموافق");
      expect(incidentStr).toContain("2026م)");
    });
  });

  describe("formatOfficialDateRange", () => {
    it("formats dual date ranges for multi-day procedures", () => {
      const range = formatOfficialDateRange("2026-10-12", "2026-10-14");

      expect(range.gregorianRange).toBe("من 2026-10-12 إلى 2026-10-14");
      expect(range.hijriRange).toContain("من");
      expect(range.hijriRange).toContain("إلى");
      expect(range.hijriRange).toContain("هـ");
      expect(range.dualFullRange).toContain(range.hijriRange);
      expect(range.dualFullRange).toContain(range.gregorianRange);
    });
  });
});
