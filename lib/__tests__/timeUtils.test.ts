import { describe, it, expect } from "vitest";
import {
  calculateTimeDifference,
  getSaudiToday,
  getSaudiDateInfo,
  calculate48HoursExpiry,
  calculateTokenExpiry,
  formatSaudiDateTime,
  getLinkExpiryStatus,
  isTokenExpired,
  generateSecureToken,
} from "../timeUtils";

describe("timeUtils", () => {
  describe("calculateTimeDifference", () => {
    it("returns correct duration for standard morning delay", () => {
      const res = calculateTimeDifference("07:30", "08:15");
      expect(res.isValid).toBe(true);
      expect(res.totalMinutes).toBe(45);
      expect(res.hours).toBe(0);
      expect(res.minutes).toBe(45);
      expect(res.formattedDuration).toBe("45 دقيقة");
    });

    it("returns correct duration for multi-hour absence", () => {
      const res = calculateTimeDifference("08:00", "11:30");
      expect(res.isValid).toBe(true);
      expect(res.totalMinutes).toBe(210);
      expect(res.hours).toBe(3);
      expect(res.minutes).toBe(30);
      expect(res.formattedDuration).toBe("3 ساعات و 30 دقيقة");
    });

    it("handles exact 1 hour difference with proper Arabic singular", () => {
      const res = calculateTimeDifference("09:00", "10:00");
      expect(res.isValid).toBe(true);
      expect(res.totalMinutes).toBe(60);
      expect(res.hours).toBe(1);
      expect(res.minutes).toBe(0);
      expect(res.formattedDuration).toBe("ساعة واحدة");
    });

    it("handles exact 2 hours difference with proper Arabic dual", () => {
      const res = calculateTimeDifference("08:00", "10:00");
      expect(res.isValid).toBe(true);
      expect(res.totalMinutes).toBe(120);
      expect(res.hours).toBe(2);
      expect(res.minutes).toBe(0);
      expect(res.formattedDuration).toBe("ساعتان");
    });

    it("handles negative or equal time differences gracefully", () => {
      const resEqual = calculateTimeDifference("09:00", "09:00");
      expect(resEqual.isValid).toBe(false);
      expect(resEqual.totalMinutes).toBe(0);

      const resNegative = calculateTimeDifference("10:00", "08:00");
      expect(resNegative.isValid).toBe(false);
      expect(resNegative.error).toBe("وقت النهاية يجب أن يكون بعد وقت البداية");
    });

    it("handles invalid time inputs safely", () => {
      const res = calculateTimeDifference("abc", "12:00");
      expect(res.isValid).toBe(false);
      expect(res.error).toBe("صيغة الوقت غير صالحة");
    });
  });

  describe("getSaudiToday & getSaudiDateInfo", () => {
    it("returns formatted date YYYY-MM-DD in Asia/Riyadh timezone", () => {
      // 2026-09-23 22:30:00 UTC is 2026-09-24 01:30:00 in Saudi Arabia (UTC+3)
      const dateUtcLate = new Date("2026-09-23T22:30:00Z");
      const saudiDate = getSaudiToday(dateUtcLate);
      expect(saudiDate).toBe("2026-09-24");

      const info = getSaudiDateInfo(dateUtcLate);
      expect(info.year).toBe(2026);
      expect(info.month).toBe(9);
      expect(info.day).toBe(24);
      expect(info.dateStr).toBe("2026-09-24");
      expect(info.monthStr).toBe("2026-09");
    });
  });

  describe("Token Expiration & 7 Days Window (168 Hours)", () => {
    it("calculates 7 days (168 hours) expiry accurately from base date", () => {
      const base = new Date("2026-10-01T10:00:00.000Z");
      const expiry = calculateTokenExpiry(base);
      expect(expiry).toBe("2026-10-08T10:00:00.000Z"); // Exactly 7 days (168 hours) later
    });

    it("ensures calculate48HoursExpiry alias returns 7-day expiry for full platform consistency", () => {
      const base = new Date("2026-10-01T10:00:00.000Z");
      const expiry = calculate48HoursExpiry(base);
      expect(expiry).toBe("2026-10-08T10:00:00.000Z");
    });

    it("evaluates expired and non-expired tokens accurately", () => {
      const pastExpiry = new Date(Date.now() - 1000 * 60).toISOString(); // 1 minute ago
      expect(isTokenExpired(pastExpiry)).toBe(true);

      const futureExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 6).toISOString(); // 6 days later
      expect(isTokenExpired(futureExpiry)).toBe(false);

      expect(isTokenExpired(undefined)).toBe(false);
      expect(isTokenExpired("invalid-date-string")).toBe(false);
    });

    it("formats Saudi date and time with Asia/Riyadh timezone correctly", () => {
      const iso = "2026-10-01T07:00:00.000Z"; // 10:00 AM Riyadh
      const formatted = formatSaudiDateTime(iso);
      expect(formatted).toContain("2026");
      expect(formatted).toBeTruthy();
    });

    it("calculates LinkExpiryStatus remaining time, urgent flags, and badges", () => {
      // 6 days remaining
      const sixDaysFuture = new Date(Date.now() + 6 * 24 * 3600 * 1000 + 3600 * 1000).toISOString();
      const statusActive = getLinkExpiryStatus(sixDaysFuture);
      expect(statusActive.isExpired).toBe(false);
      expect(statusActive.isUrgent).toBe(false);
      expect(statusActive.remainingDays).toBe(6);
      expect(statusActive.badgeVariant).toBe("emerald");

      // 12 hours remaining (Urgent)
      const twelveHoursFuture = new Date(Date.now() + 12 * 3600 * 1000).toISOString();
      const statusUrgent = getLinkExpiryStatus(twelveHoursFuture);
      expect(statusUrgent.isExpired).toBe(false);
      expect(statusUrgent.isUrgent).toBe(true);
      expect(statusUrgent.badgeVariant).toBe("amber");

      // Expired
      const past = new Date(Date.now() - 5000).toISOString();
      const statusExpired = getLinkExpiryStatus(past);
      expect(statusExpired.isExpired).toBe(true);
      expect(statusExpired.badgeVariant).toBe("rose");
      expect(statusExpired.statusLabel).toBe("انتهت صلاحية الرابط");
    });
  });

  describe("generateSecureToken", () => {
    it("generates a random hex token with expected length", () => {
      const token1 = generateSecureToken(16);
      const token2 = generateSecureToken(16);

      expect(token1).toBeTruthy();
      expect(token1.length).toBe(32); // 16 bytes = 32 hex chars
      expect(token1).not.toBe(token2);
    });
  });
});
