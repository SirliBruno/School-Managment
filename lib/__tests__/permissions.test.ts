import { describe, it, expect } from "vitest";
import { calculateTimeDifference } from "@/lib/timeUtils";
import { generateReportData } from "@/lib/reportsEngine";
import { Teacher, EmployeePermission } from "@/types/teacher";

describe("Employee Permission Module - Unit & Integration Tests", () => {
  describe("Time Calculation & Business Rule Validation", () => {
    it("should calculate exact duration in minutes for valid time range", () => {
      const result = calculateTimeDifference("09:15", "10:00");
      expect(result.isValid).toBe(true);
      expect(result.totalMinutes).toBe(45);
      expect(result.hours).toBe(0);
      expect(result.minutes).toBe(45);
      expect(result.formattedDuration).toBe("45 دقيقة");
    });

    it("should correctly calculate hours and minutes for longer spans in Arabic dual", () => {
      const result = calculateTimeDifference("08:30", "11:15");
      expect(result.isValid).toBe(true);
      expect(result.totalMinutes).toBe(165);
      expect(result.hours).toBe(2);
      expect(result.minutes).toBe(45);
      expect(result.formattedDuration).toBe("ساعتان و 45 دقيقة");
    });

    it("should reject when return time is earlier than or equal to exit time", () => {
      const earlier = calculateTimeDifference("10:00", "09:15");
      expect(earlier.isValid).toBe(false);
      expect(earlier.error).toBe("وقت النهاية يجب أن يكون بعد وقت البداية");

      const same = calculateTimeDifference("10:00", "10:00");
      expect(same.isValid).toBe(false);
      expect(same.error).toBe("وقت النهاية يجب أن يكون بعد وقت البداية");
    });
  });

  describe("Administrative Reports - Permission Reports Engine", () => {
    const mockTeachers: Teacher[] = [
      {
        id: "t-1",
        fullName: "نورة القحطاني",
        nationalId: "1011111111",
        specialty: "فيزياء",
        jobTitle: "معلمة ممارس",
        employmentStatus: "دائم",
        totalAbsences: 0,
        isArchived: false,
      },
      {
        id: "t-2",
        fullName: "هدى الشمري",
        nationalId: "1022222222",
        specialty: "كيمياء",
        jobTitle: "معلمة متقدم",
        employmentStatus: "دائم",
        totalAbsences: 1,
        isArchived: false,
      },
      {
        id: "t-archived",
        fullName: "معلمة سابقة",
        nationalId: "1033333333",
        specialty: "رياضيات",
        jobTitle: "معلمة",
        employmentStatus: "عقد",
        totalAbsences: 2,
        isArchived: true,
      },
    ];

    const mockPermissions: EmployeePermission[] = [
      {
        id: "perm-1",
        teacherId: "t-1",
        teacherName: "نورة القحطاني",
        permissionDate: "2026-09-10",
        exitTime: "09:00",
        returnTime: "10:30",
        durationMinutes: 90,
        reason: "مراجعة مستشفى",
        notes: "تم تقديم الموعد",
        createdAt: "2026-09-10T09:00:00Z",
      },
      {
        id: "perm-2",
        teacherId: "t-1",
        teacherName: "نورة القحطاني",
        permissionDate: "2026-09-15",
        exitTime: "11:00",
        returnTime: "12:00",
        durationMinutes: 60,
        reason: "ظرف عائلي طارئ",
        createdAt: "2026-09-15T11:00:00Z",
      },
      {
        id: "perm-3",
        teacherId: "t-2",
        teacherName: "هدى الشمري",
        permissionDate: "2026-09-20",
        exitTime: "08:15",
        returnTime: "09:00",
        durationMinutes: 45,
        reason: "عمل رسمي خارجي",
        createdAt: "2026-09-20T08:15:00Z",
      },
      {
        id: "perm-archived",
        teacherId: "t-1",
        teacherName: "نورة القحطاني",
        permissionDate: "2026-09-22",
        exitTime: "10:00",
        returnTime: "11:00",
        durationMinutes: 60,
        reason: "مؤرشف",
        createdAt: "2026-09-22T10:00:00Z",
        isArchived: true,
      },
    ];

    it("should generate permissions_summary report correctly excluding archived", () => {
      const report = generateReportData(
        "permissions_summary",
        {
          startDate: "2026-09-01",
          endDate: "2026-09-30",
        },
        mockTeachers,
        [],
        [],
        [],
        "وكيلة الشؤون التعليمية",
        mockPermissions
      );

      expect(report.payload.reportTitle).toBe("سجل حصر استئذان الموظفين الرسمي");
      // 3 active permissions (perm-archived is filtered out)
      expect(report.rawRowsCount).toBe(3);
      expect(report.payload.tableRows.length).toBe(3);

      // Summary highlights
      const totalHighlight = report.summaryHighlights.find((c) => c.label === "إجمالي الاستئذانات");
      expect(totalHighlight?.value).toBe(3);

      const minutesHighlight = report.summaryHighlights.find((c) => c.label === "إجمالي الدقائق");
      expect(minutesHighlight?.value).toBe(195);

      const teachersHighlight = report.summaryHighlights.find((c) => c.label === "الموظفات المستأذنات");
      expect(teachersHighlight?.value).toBe(2);
    });

    it("should filter permissions_summary by specific date range", () => {
      const report = generateReportData(
        "permissions_summary",
        {
          startDate: "2026-09-12",
          endDate: "2026-09-25",
        },
        mockTeachers,
        [],
        [],
        [],
        "وكيلة الشؤون التعليمية",
        mockPermissions
      );

      expect(report.payload.tableRows.length).toBe(2);
      const names = report.payload.tableRows.map((r) => r[1]);
      expect(names).toContain("نورة القحطاني");
      expect(names).toContain("هدى الشمري");
    });

    it("should generate teacher_permissions_record for a specific teacher", () => {
      const report = generateReportData(
        "teacher_permissions_record",
        {
          teacherId: "t-1",
          startDate: "2026-09-01",
          endDate: "2026-09-30",
        },
        mockTeachers,
        [],
        [],
        [],
        "وكيلة الشؤون التعليمية",
        mockPermissions
      );

      expect(report.payload.reportTitle).toContain("نورة القحطاني");
      expect(report.payload.tableRows.length).toBe(2);
      const totalHighlight = report.summaryHighlights.find((c) => c.label === "مرات الاستئذان");
      expect(totalHighlight?.value).toBe(2);
      const totalMinutesHighlight = report.summaryHighlights.find((c) => c.label === "إجمالي الدقائق");
      expect(totalMinutesHighlight?.value).toBe(150);
    });

    it("should generate permissions_statistics ranking teachers by count and duration", () => {
      const report = generateReportData(
        "permissions_statistics",
        {
          startDate: "2026-09-01",
          endDate: "2026-09-30",
        },
        mockTeachers,
        [],
        [],
        [],
        "وكيلة الشؤون التعليمية",
        mockPermissions
      );

      expect(report.payload.reportTitle).toBe("التقرير التحليلي والإحصائي لاستئذان الموظفين");
      expect(report.payload.tableRows.length).toBe(2);
      // t-1 has 2 permissions (150 mins), should be rank 1
      expect(report.payload.tableRows[0][1]).toBe("نورة القحطاني");
      expect(report.payload.tableRows[0][4]).toBe("2 مرات");
      expect(report.payload.tableRows[0][5]).toBe("150 دقيقة");
      // t-2 has 1 permission (45 mins), rank 2
      expect(report.payload.tableRows[1][1]).toBe("هدى الشمري");
      expect(report.payload.tableRows[1][4]).toBe("1 مرات");
      expect(report.payload.tableRows[1][5]).toBe("45 دقيقة");
    });
  });

  describe("Arabic Permission Duration Phrasing & BiDi Formatting", () => {
    it("formats minutes and dual hours naturally in Arabic without trailing numbers", async () => {
      const { formatArabicPermissionDuration } = await import("@/lib/printPermissionPdfService");
      expect(formatArabicPermissionDuration(120)).toBe("ساعتان (120 دقيقة)");
      expect(formatArabicPermissionDuration(60)).toBe("ساعة واحدة (60 دقيقة)");
      expect(formatArabicPermissionDuration(90)).toBe("ساعة واحدة و 30 دقيقة (90 دقيقة)");
      expect(formatArabicPermissionDuration(45)).toBe("45 دقيقة");
      expect(formatArabicPermissionDuration(150)).toBe("ساعتان و 30 دقيقة (150 دقيقة)");
      expect(formatArabicPermissionDuration(180)).toBe("3 ساعات (180 دقيقة)");
      expect(formatArabicPermissionDuration(240)).toBe("4 ساعات (240 دقيقة)");
    });
  });
});
