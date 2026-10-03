import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  PUBLIC_LINK_EXPIRATION_DAYS,
  PUBLIC_LINK_EXPIRATION_HOURS,
  PUBLIC_LINK_EXPIRATION_MS,
  TOKEN_EXPIRY_DAYS,
  TOKEN_EXPIRY_HOURS,
  TOKEN_EXPIRY_MS,
  calculateTokenExpiry,
  calculate48HoursExpiry,
  isTokenExpired,
  getLinkExpiryStatus,
  formatSaudiDateTime,
} from "@/lib/timeUtils";
import {
  AbsenceInquiry,
  DelayNotice,
  AdministrativeInquiry,
} from "@/types/teacher";

describe("Global Public Link Expiration — 7 Full Days (168 Hours) Verification Suite", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  describe("1. Centralized Policy Engine & Constants Integrity", () => {
    it("1.1 defines single source of truth constants for 7 days (168 hours)", () => {
      expect(PUBLIC_LINK_EXPIRATION_DAYS).toBe(7);
      expect(PUBLIC_LINK_EXPIRATION_HOURS).toBe(168);
      expect(PUBLIC_LINK_EXPIRATION_MS).toBe(7 * 24 * 60 * 60 * 1000);
      expect(PUBLIC_LINK_EXPIRATION_MS).toBe(604800000);

      // Aliases integrity
      expect(TOKEN_EXPIRY_DAYS).toBe(7);
      expect(TOKEN_EXPIRY_HOURS).toBe(168);
      expect(TOKEN_EXPIRY_MS).toBe(604800000);
    });

    it("1.2 calculateTokenExpiry computes exactly 168 hours from base date", () => {
      const base = new Date("2026-10-03T12:00:00.000Z");
      const expiryIso = calculateTokenExpiry(base);
      const expiry = new Date(expiryIso);

      const diffMs = expiry.getTime() - base.getTime();
      expect(diffMs).toBe(604800000);
      expect(diffMs / (1000 * 60 * 60)).toBe(168);
      expect(expiryIso).toBe("2026-10-10T12:00:00.000Z");
    });

    it("1.3 calculate48HoursExpiry backward-compatible alias returns 7 full days", () => {
      const base = new Date("2026-10-03T09:30:00.000Z");
      const expiryIso = calculate48HoursExpiry(base);
      const expiry = new Date(expiryIso);

      const diffMs = expiry.getTime() - base.getTime();
      expect(diffMs).toBe(604800000);
      expect(diffMs / (1000 * 60 * 60)).toBe(168);
      expect(expiryIso).toBe("2026-10-10T09:30:00.000Z");
    });
  });

  describe("2. Expiration Verification Rules & Boundary Conditions", () => {
    it("2.1 current_time < expires_at is valid; current_time >= expires_at is expired", () => {
      const now = new Date("2026-10-03T12:00:00.000Z");
      const expiryDate = new Date("2026-10-10T12:00:00.000Z");
      const expiryIso = expiryDate.toISOString();

      // 1 millisecond before expiry -> valid
      const justBefore = new Date(expiryDate.getTime() - 1);
      expect(isTokenExpired(expiryIso, justBefore)).toBe(false);

      // Exactly at expiry -> expired
      const exact = new Date(expiryDate.getTime());
      expect(isTokenExpired(expiryIso, exact)).toBe(true);

      // 1 millisecond after expiry -> expired
      const justAfter = new Date(expiryDate.getTime() + 1);
      expect(isTokenExpired(expiryIso, justAfter)).toBe(true);
    });

    it("2.2 handles missing or invalid token expires_at safely without crashing", () => {
      expect(isTokenExpired(undefined)).toBe(false);
      expect(isTokenExpired("invalid-timestamp")).toBe(false);
      expect(isTokenExpired("")).toBe(false);
    });
  });

  describe("3. Expiry Status Granularity & Countdown Derivation", () => {
    it("3.1 returns valid with remaining days when remaining time > 24 hours", () => {
      const now = new Date("2026-10-03T10:00:00.000Z");
      const expiry = "2026-10-10T10:00:00.000Z"; // 7 full days remaining

      const status = getLinkExpiryStatus(expiry, now);
      expect(status.status).toBe("valid");
      expect(status.daysLeft).toBe(7);
      expect(status.hoursLeft).toBe(168);
    });

    it("3.2 returns expiring_soon with remaining hours when remaining time <= 24 hours", () => {
      const now = new Date("2026-10-09T18:00:00.000Z");
      const expiry = "2026-10-10T10:00:00.000Z"; // 16 hours remaining

      const status = getLinkExpiryStatus(expiry, now);
      expect(status.status).toBe("expiring_soon");
      expect(status.hoursLeft).toBe(16);
      expect(status.daysLeft).toBe(1);
    });

    it("3.3 returns expired with 0 days/hours when current time has passed expiry", () => {
      const now = new Date("2026-10-10T11:00:00.000Z");
      const expiry = "2026-10-10T10:00:00.000Z"; // 1 hour past

      const status = getLinkExpiryStatus(expiry, now);
      expect(status.status).toBe("expired");
      expect(status.daysLeft).toBe(0);
      expect(status.hoursLeft).toBe(0);
    });
  });

  describe("4. End-to-End Link Renewal Across All 3 Procedures", () => {
    it("4.1 Absence Inquiry: renews expired link to 7 full days from renewal time", () => {
      const mockInquiry: AbsenceInquiry = {
        id: "inq-101",
        teacherId: "t-1",
        teacherName: "سارة الطلحي",
        nationalId: "1092332483",
        mobile: "0501234567",
        absenceDate: "2026-09-20",
        token: "tok-absence-101",
        expiresAt: "2026-09-27T10:00:00.000Z", // expired
        status: "pending",
        createdAt: "2026-09-20T10:00:00.000Z",
      };

      // Confirm initially expired
      const testTime = new Date("2026-10-01T12:00:00.000Z");
      expect(isTokenExpired(mockInquiry.expiresAt, testTime)).toBe(true);

      // Simulate renewal action
      const renewedExpiresAt = calculateTokenExpiry(testTime);
      const renewedInquiry: AbsenceInquiry = {
        ...mockInquiry,
        expiresAt: renewedExpiresAt,
      };

      // Confirm now valid for 7 full days from renewal
      expect(isTokenExpired(renewedInquiry.expiresAt, testTime)).toBe(false);
      const expiryStatus = getLinkExpiryStatus(renewedInquiry.expiresAt, testTime);
      expect(expiryStatus.status).toBe("valid");
      expect(expiryStatus.daysLeft).toBe(7);
      expect(expiryStatus.hoursLeft).toBe(168);
    });

    it("4.2 Delay Notice: renews expired link to 7 full days from renewal time", () => {
      const mockDelayNotice: DelayNotice = {
        id: "del-201",
        noticeNumber: "DN-201",
        teacherId: "t-2",
        teacherName: "نورة الدوسري",
        nationalId: "1087654321",
        noticeDate: "2026-09-22",
        violationDelayStart: true,
        calculatedMinutes: 45,
        status: "pending_teacher",
        shareToken: "tok-delay-201",
        tokenExpiresAt: "2026-09-29T08:00:00.000Z", // expired
        createdAt: "2026-09-22T08:00:00.000Z",
      };

      const testTime = new Date("2026-10-01T09:00:00.000Z");
      expect(isTokenExpired(mockDelayNotice.tokenExpiresAt, testTime)).toBe(true);

      const renewedExpiresAt = calculateTokenExpiry(testTime);
      const renewedNotice: DelayNotice = {
        ...mockDelayNotice,
        tokenExpiresAt: renewedExpiresAt,
      };

      expect(isTokenExpired(renewedNotice.tokenExpiresAt, testTime)).toBe(false);
      const status = getLinkExpiryStatus(renewedNotice.tokenExpiresAt, testTime);
      expect(status.status).toBe("valid");
      expect(status.daysLeft).toBe(7);
    });

    it("4.3 Administrative Inquiry: renews expired link to 7 full days from renewal time", () => {
      const mockAdminInquiry: AdministrativeInquiry = {
        id: "admin-301",
        inquiryNumber: "ADM-301",
        teacherId: "t-3",
        teacherName: "منى الشمري",
        nationalId: "1076543210",
        inquiryType: "الامتناع عن دخول حصص الانتظار",
        incidentDate: "2026-09-24",
        status: "expired",
        token: "tok-admin-301",
        tokenExpiresAt: "2026-10-01T08:00:00.000Z", // expired
        createdAt: "2026-09-24T08:00:00.000Z",
      };

      const testTime = new Date("2026-10-03T10:00:00.000Z");
      expect(isTokenExpired(mockAdminInquiry.tokenExpiresAt, testTime)).toBe(true);

      const renewedExpiresAt = calculateTokenExpiry(testTime);
      const renewedAdminInquiry: AdministrativeInquiry = {
        ...mockAdminInquiry,
        status: "pending_teacher",
        tokenExpiresAt: renewedExpiresAt,
      };

      expect(isTokenExpired(renewedAdminInquiry.tokenExpiresAt, testTime)).toBe(false);
      expect(renewedAdminInquiry.status).toBe("pending_teacher");
      const status = getLinkExpiryStatus(renewedAdminInquiry.tokenExpiresAt, testTime);
      expect(status.status).toBe("valid");
      expect(status.daysLeft).toBe(7);
    });
  });

  describe("5. Saudi DateTime Presentation & User Experience", () => {
    it("5.1 formats dates and times cleanly using Riyadh timezone without Arabic-Indic numeral corruption", () => {
      const iso = "2026-10-03T12:00:00.000Z"; // 15:00 in Asia/Riyadh (UTC+3)
      const formatted = formatSaudiDateTime(iso);

      // Must contain year 2026, month 10, day 03
      expect(formatted).toMatch(/2026/);
      expect(formatted).toMatch(/10/);
      expect(formatted).toMatch(/03/);
      // Must contain time in Arabic with afternoon indicator (م)
      expect(formatted).toMatch(/03:00|3:00/);
      expect(formatted).toMatch(/م/);

      // Date only formatting
      const dateOnly = formatSaudiDateTime(iso, { dateOnly: true });
      expect(dateOnly).toMatch(/2026/);
      expect(dateOnly).not.toMatch(/:/);
    });
  });
});
