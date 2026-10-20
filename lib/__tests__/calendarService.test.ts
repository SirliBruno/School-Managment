import { describe, it, expect } from "vitest";
import {
  getMonthDateRange,
  getWeekDateRange,
  formatToISODate,
  formatHijriDate,
  fetchCalendarEvents,
} from "../../services/calendarService";

describe("Calendar Service - Date Math and Queries", () => {
  it("calculates correct month boundaries and leap years", () => {
    // February 2024 (Leap year)
    const feb2024 = getMonthDateRange(2024, 1);
    expect(feb2024.startDate).toBe("2024-02-01");
    expect(feb2024.endDate).toBe("2024-02-29");
    expect(feb2024.daysInMonth).toBe(29);

    // October 2026
    const oct2026 = getMonthDateRange(2026, 9);
    expect(oct2026.startDate).toBe("2026-10-01");
    expect(oct2026.endDate).toBe("2026-10-31");
    expect(oct2026.daysInMonth).toBe(31);
  });

  it("calculates Sunday-to-Saturday week ranges correctly", () => {
    const wednesday = new Date(2026, 9, 21); // Oct 21, 2026
    const week = getWeekDateRange(wednesday);
    expect(week.dates).toHaveLength(7);
    expect(week.startDate).toBe("2026-10-18"); // Sunday
    expect(week.endDate).toBe("2026-10-24");   // Saturday
  });

  it("formats dates to YYYY-MM-DD reliably without timezone shift", () => {
    const d = new Date(2026, 4, 9); // May 9, 2026
    expect(formatToISODate(d)).toBe("2026-05-09");
  });

  it("formats Hijri dates with Umm al-Qura standard correctly", () => {
    const d = new Date(2026, 9, 12); // Oct 12, 2026
    const numeric = formatHijriDate(d, { format: "numeric" });
    expect(numeric).toContain("1448");
    expect(numeric).toContain("هـ");

    const header = formatHijriDate(d, { format: "header" });
    expect(header).toContain("1448");
  });

  it("maps fallbackData correctly into sorted CalendarEvents", async () => {
    const events = await fetchCalendarEvents({
      startDate: "2026-10-01",
      endDate: "2026-10-31",
      fallbackData: {
        absenceRecords: [
          {
            id: "abs-1",
            teacherId: "t-1",
            teacherName: "سارة محمد",
            date: "2026-10-14",
            type: "اضطراري",
            reason: "ظرف عائلي",
            isArchived: false,
          },
          {
            id: "abs-archived",
            teacherId: "t-1",
            teacherName: "سارة محمد",
            date: "2026-10-15",
            type: "مرضي",
            isArchived: true,
          },
        ],
        delayNotices: [
          {
            id: "del-1",
            teacherId: "t-2",
            teacherName: "نورة علي",
            noticeDate: "2026-10-10",
            calculatedMinutes: 25,
            status: "completed",
            isArchived: false,
          },
        ],
        permissions: [
          {
            id: "perm-1",
            teacherId: "t-3",
            teacherName: "مها خالد",
            permissionDate: "2026-10-12",
            durationMinutes: 45,
            reason: "موعد مستشفى",
            isArchived: false,
          },
        ],
        deductionDecisions: [
          {
            id: "dec-1",
            teacherId: "t-4",
            teacherName: "هدى سالم",
            decisionDate: "2026-10-18",
            decisionNumber: "19/448",
            deductionDays: 1,
            isArchived: false,
          },
        ],
      },
    });

    // Archived record must be excluded
    expect(events).toHaveLength(4);
    // Must be sorted by date
    expect(events[0].id).toBe("cal-del-del-1"); // 2026-10-10
    expect(events[1].id).toBe("cal-perm-perm-1"); // 2026-10-12
    expect(events[2].id).toBe("cal-abs-abs-1"); // 2026-10-14
    expect(events[3].id).toBe("cal-dec-dec-1"); // 2026-10-18

    // Verification of fields
    expect(events[0].type).toBe("delay");
    expect(events[0].badgeColor).toBe("amber");
    expect(events[0].originalPageUrl).toBe("/procedures/delay-notice");

    expect(events[1].type).toBe("permission");
    expect(events[1].badgeColor).toBe("blue");
    expect(events[1].originalPageUrl).toBe("/procedures/permissions");

    expect(events[2].type).toBe("absence");
    expect(events[2].badgeColor).toBe("rose");
    expect(events[2].originalPageUrl).toBe("/procedures/absence");

    expect(events[3].type).toBe("deduction");
    expect(events[3].badgeColor).toBe("purple");
    expect(events[3].originalPageUrl).toBe("/procedures/deduction-hours");
  });
});
