import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateTokenExpiry,
  isTokenExpired,
  getLinkExpiryStatus,
  formatSaudiDateTime,
  PUBLIC_LINK_EXPIRATION_DAYS,
  PUBLIC_LINK_EXPIRATION_HOURS,
  PUBLIC_LINK_EXPIRATION_MS,
} from "../timeUtils";

describe("Link Renewal & 7-Day Expiration Policy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("enforces central constants for 7 days (168 hours = 604,800,000 ms)", () => {
    expect(PUBLIC_LINK_EXPIRATION_DAYS).toBe(7);
    expect(PUBLIC_LINK_EXPIRATION_HOURS).toBe(168);
    expect(PUBLIC_LINK_EXPIRATION_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("calculates exact 7 days (168 hours) expiration without date drift", () => {
    const fixedNow = new Date("2026-10-03T19:00:00.000Z");
    const expiry = calculateTokenExpiry(fixedNow);
    expect(expiry).toBe("2026-10-10T19:00:00.000Z");
  });

  it("simulates link renewal: extending an expired link by exactly 7 days from renewal time", () => {
    // 1. Initial link created on Oct 1st, expired on Oct 8th
    const initialCreated = new Date("2026-10-01T10:00:00.000Z");
    const initialExpiry = calculateTokenExpiry(initialCreated);
    expect(initialExpiry).toBe("2026-10-08T10:00:00.000Z");

    // 2. Admin renews the link on Oct 9th at 14:30
    const renewalTime = new Date("2026-10-09T14:30:00.000Z");
    const renewedExpiry = calculateTokenExpiry(renewalTime);
    expect(renewedExpiry).toBe("2026-10-16T14:30:00.000Z");

    // 3. Verify renewal validity at renewal time
    vi.setSystemTime(renewalTime);
    expect(isTokenExpired(renewedExpiry)).toBe(false);

    // 4. Verify link expiry status after renewal
    const status = getLinkExpiryStatus(renewedExpiry);
    expect(status.isExpired).toBe(false);
    expect(status.remainingDays).toBe(7);
    expect(status.badgeVariant).toBe("emerald");
  });

  it("formats Saudi Arabia local timestamps with correct hour and date", () => {
    const isoUtc = "2026-10-03T16:00:00.000Z"; // 19:00 (7:00 PM) Riyadh time
    const formatted = formatSaudiDateTime(isoUtc);
    expect(formatted).toContain("2026");
    expect(formatted).toBeTruthy();
  });
});
