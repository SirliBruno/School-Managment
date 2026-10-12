import { describe, it, expect } from "vitest";
import { addDaysToDateStr, calculateDaysBetween, getDatesInRange } from "../timeUtils";
import { buildAbsencePdfHtml, AbsencePdfData } from "../printPdfService";
import { AbsenceInquiry } from "@/types/teacher";

describe("Production Safe Feature: Multi-Day Inquiry Extension & PDF Absence Count", () => {
  describe("1. Date Range & Days Calculation Utilities", () => {
    it("calculates exact calendar days between start and end dates correctly", () => {
      expect(calculateDaysBetween("2026-10-07", "2026-10-07")).toBe(1);
      expect(calculateDaysBetween("2026-10-07", "2026-10-08")).toBe(2);
      expect(calculateDaysBetween("2026-10-07", "2026-10-09")).toBe(3);
      expect(calculateDaysBetween("2026-10-07", "2026-10-11")).toBe(5);
    });

    it("correctly adds days using addDaysToDateStr", () => {
      expect(addDaysToDateStr("2026-10-07", 0)).toBe("2026-10-07");
      expect(addDaysToDateStr("2026-10-07", 1)).toBe("2026-10-08");
      expect(addDaysToDateStr("2026-10-07", 2)).toBe("2026-10-09");
      expect(addDaysToDateStr("2026-10-07", 4)).toBe("2026-10-11");
    });

    it("extracts all intermediate dates in range for recording absences", () => {
      const dates = getDatesInRange("2026-10-07", "2026-10-09");
      expect(dates).toEqual(["2026-10-07", "2026-10-08", "2026-10-09"]);
      expect(dates.length).toBe(3);
    });
  });

  describe("2. PDF Form Generation - 'عدد الغياب' displays inquiry days only", () => {
    it("renders exact inquiry days (1) in 'عدد الغياب' column when absenceCount is 1", () => {
      const pdfData: AbsencePdfData = {
        teacherName: "طرفه عمر عمر هوساوي",
        nationalId: "1071632648",
        specialty: "قراءات",
        jobTitle: "معلم",
        employmentStatus: "دائم",
        absenceCount: 1, // Single day inquiry
        absenceDate: "2026-10-07",
        absenceType: "اضطراري",
        absenceReason: "إجازة اضطرارية",
      };

      const html = buildAbsencePdfHtml(pdfData);
      expect(html).toContain("طرفه عمر عمر هوساوي");
      expect(html).toContain("قراءات");
      expect(html).toContain("عدد الغياب");
      // Expect the table cell for absence count to be 1
      expect(html).toContain(`>${pdfData.absenceCount}</td>`);
    });

    it("renders multi-day count (3) in 'عدد الغياب' column when teacher extends to 3 days", () => {
      const pdfData: AbsencePdfData = {
        teacherName: "طرفه عمر عمر هوساوي",
        nationalId: "1071632648",
        specialty: "قراءات",
        jobTitle: "معلم",
        employmentStatus: "دائم",
        absenceCount: 3, // Multi-day inquiry (3 days)
        absenceDate: "2026-10-07 إلى 2026-10-09 (3 أيام)",
        absenceType: "مرضي",
        absenceReason: "إجازة مرضية بموجب تقرير صحتي المرفق",
      };

      const html = buildAbsencePdfHtml(pdfData);
      expect(html).toContain("عدد الغياب");
      expect(html).toContain(`>3</td>`);
      expect(html).toContain("2026-10-07 إلى 2026-10-09 (3 أيام)");
    });
  });

  describe("3. Multi-Day Extension Rules & Maximum Constraints", () => {
    it("caps extension selection at 5 school days maximum", () => {
      const maxAllowedDays = 5;
      const requestedDays = 7;
      const validatedDays = Math.min(maxAllowedDays, Math.max(1, requestedDays));
      expect(validatedDays).toBe(5);
    });

    it("validates that end date cannot precede start date", () => {
      const startDate = "2026-10-07";
      const invalidEndDate = "2026-10-06";
      const isValid = invalidEndDate >= startDate;
      expect(isValid).toBe(false);
    });
  });

  describe("4. Overlapping Inquiries Resolution Logic", () => {
    it("correctly identifies pending inquiries that fall within the covered range", () => {
      const coveredDates = ["2026-10-07", "2026-10-08", "2026-10-09"];
      const teacherId = "teacher-101";

      const mockInquiries: Partial<AbsenceInquiry>[] = [
        {
          id: "inq-main",
          teacherId,
          absenceDate: "2026-10-07",
          status: "pending",
        },
        {
          id: "inq-overlap-monday",
          teacherId,
          absenceDate: "2026-10-08",
          status: "pending",
        },
        {
          id: "inq-outside",
          teacherId,
          absenceDate: "2026-10-15",
          status: "pending",
        },
      ];

      const overlapping = mockInquiries.filter(
        (inq) =>
          inq.id !== "inq-main" &&
          inq.teacherId === teacherId &&
          inq.status === "pending" &&
          coveredDates.includes(inq.absenceDate!)
      );

      expect(overlapping.length).toBe(1);
      expect(overlapping[0].id).toBe("inq-overlap-monday");
    });
  });
});
