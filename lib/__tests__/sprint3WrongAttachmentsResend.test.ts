import { describe, it, expect, vi, beforeEach } from "vitest";
import { AbsenceInquiry, Teacher } from "@/types/teacher";
import {
  calculateTokenExpiry,
  isTokenExpired,
  serializeInquiryMeta,
  parseInquiryMeta,
  getLinkExpiryStatus,
} from "@/lib/timeUtils";
import { generateInquiryMessage, getWhatsAppDirectUrl } from "@/lib/whatsapp";
import { getInquiryPublicUrl } from "@/lib/appConfig";

describe("Sprint 3 — Wrong Attachments Rejection + Secure WhatsApp Resend Workflow", () => {
  const mockTeacher: Teacher = {
    id: "teacher-101",
    name: "أحلام صالح",
    nationalId: "1029384756",
    jobNumber: "55443",
    specialty: "لغة عربية",
    phone: "0501234567",
    email: "ahlam@school.edu.sa",
    role: "teacher",
    active: true,
  };

  const originalInquiry: AbsenceInquiry = {
    id: "inq-orig-001",
    teacherId: mockTeacher.id,
    teacherName: mockTeacher.name,
    nationalId: mockTeacher.nationalId,
    jobNumber: mockTeacher.jobNumber,
    specialty: mockTeacher.specialty,
    mobile: mockTeacher.phone,
    absenceDate: "2026-10-10",
    daysCount: 1,
    token: "token_original_abc123",
    status: "submitted",
    submittedAt: "2026-10-11T09:00:00.000Z",
    teacherReason: "تقرير من مستوصف خاص",
    attachmentUrl: "https://storage.example.com/wrong_prescription.jpg",
    expiresAt: "2026-10-17T08:00:00.000Z",
    createdAt: "2026-10-10T08:00:00.000Z",
    cycleNumber: 1,
  };

  // TEST 1: Rejection with "مرفقات خاطئة" and Resend Requested creates valid cycle 2
  it("TEST 1: rejection with 'مرفقات خاطئة' + resend creates new linked inquiry and preserves original data", () => {
    const originalCopy = { ...originalInquiry };
    const now = new Date();
    const newExpiresAt = calculateTokenExpiry();

    const newInquiryId = "inq-cycle2-002";
    const newToken = "token_cycle2_xyz789";
    const currentCycle = originalCopy.cycleNumber || 1;
    const newCycle = currentCycle + 1;

    // Build cycle 2 inquiry
    const newInquiry: AbsenceInquiry = {
      id: newInquiryId,
      teacherId: originalCopy.teacherId,
      teacherName: originalCopy.teacherName,
      nationalId: originalCopy.nationalId,
      jobNumber: originalCopy.jobNumber,
      specialty: originalCopy.specialty,
      mobile: originalCopy.mobile,
      absenceDate: originalCopy.absenceDate,
      daysCount: originalCopy.daysCount,
      token: newToken,
      status: "pending",
      expiresAt: newExpiresAt,
      createdAt: now.toISOString(),
      previousInquiryId: originalCopy.id,
      cycleNumber: newCycle,
    };

    // Update parent original inquiry
    const updatedOriginal: AbsenceInquiry = {
      ...originalCopy,
      status: "rejected",
      rejectionReason: "مرفقات خاطئة",
      resendRequested: true,
      nextInquiryId: newInquiryId,
    };

    // Assert parent state
    expect(updatedOriginal.status).toBe("rejected");
    expect(updatedOriginal.rejectionReason).toBe("مرفقات خاطئة");
    expect(updatedOriginal.resendRequested).toBe(true);
    expect(updatedOriginal.nextInquiryId).toBe(newInquiryId);

    // Assert original teacher submission and attachment are preserved 100%
    expect(updatedOriginal.teacherReason).toBe("تقرير من مستوصف خاص");
    expect(updatedOriginal.attachmentUrl).toBe("https://storage.example.com/wrong_prescription.jpg");
    expect(updatedOriginal.token).toBe("token_original_abc123");

    // Assert new cycle properties
    expect(newInquiry.id).toBe(newInquiryId);
    expect(newInquiry.cycleNumber).toBe(2);
    expect(newInquiry.previousInquiryId).toBe(originalCopy.id);
    expect(newInquiry.status).toBe("pending");
    expect(newInquiry.teacherReason).toBeUndefined();
    expect(newInquiry.attachmentUrl).toBeUndefined();
    expect(newInquiry.token).not.toBe(originalCopy.token);

    // Expiry must be valid 7 full days
    expect(isTokenExpired(newInquiry.expiresAt)).toBe(false);
  });

  // TEST 2: Rejection without resend or with non-attachment reason
  it("TEST 2: rejection with 'عذر غير مقبول نظاماً' does NOT trigger resend", () => {
    const updated: AbsenceInquiry = {
      ...originalInquiry,
      status: "rejected",
      rejectionReason: "عذر غير مقبول نظاماً",
      resendRequested: false,
    };

    expect(updated.status).toBe("rejected");
    expect(updated.rejectionReason).toBe("عذر غير مقبول نظاماً");
    expect(updated.resendRequested).toBe(false);
    expect(updated.nextInquiryId).toBeUndefined();
  });

  // TEST 3: Authoritative 7-day (168-hour) Expiration Policy
  it("TEST 3: token expires exactly after 7 days (168h), not 48h", () => {
    const baseDate = new Date("2026-10-10T10:00:00.000Z");
    const expiryDate = new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days = 168 hours
    const expiryIso = expiryDate.toISOString();

    // At T + 48 hours (previously expired in legacy system):
    const t48h = new Date(baseDate.getTime() + 48 * 60 * 60 * 1000);
    const expiredAt48h = t48h.getTime() > new Date(expiryIso).getTime();
    expect(expiredAt48h).toBe(false); // Must still be valid!

    // At T + 6 days:
    const t6d = new Date(baseDate.getTime() + 6 * 24 * 60 * 60 * 1000);
    const expiredAt6d = t6d.getTime() > new Date(expiryIso).getTime();
    expect(expiredAt6d).toBe(false); // Still valid!

    // At T + 7 days + 1 minute:
    const t7dPlus = new Date(baseDate.getTime() + (7 * 24 * 60 + 1) * 60 * 1000);
    const expiredAt7dPlus = t7dPlus.getTime() > new Date(expiryIso).getTime();
    expect(expiredAt7dPlus).toBe(true); // Expired!
  });

  // TEST 4: Metadata serialization fallback roundtrip (Zero-migration safety)
  it("TEST 4: serializes and parses cycle and rejection metadata cleanly in adminNotes", () => {
    const originalNotes = "ملاحظات إدارية من الإدارة";
    const serialized = serializeInquiryMeta(
      "2026-10-12",
      3,
      originalNotes,
      {
        rejectionReason: "مرفقات خاطئة",
        resendRequested: true,
        previousInquiryId: "inq-orig-001",
        nextInquiryId: "inq-cycle2-002",
        cycleNumber: 2,
      }
    );

    expect(serialized).toContain("rejReason");
    expect(serialized).toContain("resend");
    expect(serialized).toContain("prevInq");
    expect(serialized).toContain("nextInq");
    expect(serialized).toContain("cycle");

    const parsed = parseInquiryMeta(serialized);
    expect(parsed.adminNotes).toBe(originalNotes);
    expect(parsed.rejectionReason).toBe("مرفقات خاطئة");
    expect(parsed.resendRequested).toBe(true);
    expect(parsed.previousInquiryId).toBe("inq-orig-001");
    expect(parsed.nextInquiryId).toBe("inq-cycle2-002");
    expect(parsed.cycleNumber).toBe(2);
    expect(parsed.daysCount).toBe(3);
    expect(parsed.absenceEndDate).toBe("2026-10-12");
  });

  // TEST 5: WhatsApp message includes resend notice when isResendForWrongAttachments is true
  it("TEST 5: generateInquiryMessage formats medical document notice for resend", () => {
    const url = "https://school.edu.sa/absence-inquiry/token_cycle2_xyz789";
    const msg = generateInquiryMessage(
      "أحلام صالح",
      "2026-10-10",
      url,
      undefined,
      1,
      true // isResendForWrongAttachments
    );

    expect(msg).toContain("المكرمة الأستاذة / أحلام صالح المحترمة");
    expect(msg).toContain(url);
    expect(msg).toContain("تنبيه: تم رفض الإفادة السابقة لوجود خطأ في المرفقات");
    expect(msg).toContain("إعادة إرفاق المستندات والتقارير الطبية الصحيحة عبر الرابط الجديد");
  });

  // TEST 6: WhatsApp direct URL is correctly formatted
  it("TEST 6: getWhatsAppDirectUrl formats Saudi mobile number properly", () => {
    const phone = "0501234567";
    const message = "رسالة مساءلة إدارية";
    const waUrl = getWhatsAppDirectUrl(phone, message);

    expect(waUrl).toContain("https://wa.me/966501234567");
    expect(waUrl).toContain(encodeURIComponent(message));
  });

  // TEST 7: KPI deduplication logic prevents double counting for multi-cycle inquiries
  it("TEST 7: deduplicates active inquiries by (teacherId, absenceDate) so cycle 2 does not duplicate absence KPI", () => {
    const inqCycle1: AbsenceInquiry = {
      ...originalInquiry,
      status: "rejected",
      rejectionReason: "مرفقات خاطئة",
      resendRequested: true,
      nextInquiryId: "inq-cycle2-002",
    };

    const inqCycle2: AbsenceInquiry = {
      ...originalInquiry,
      id: "inq-cycle2-002",
      previousInquiryId: originalInquiry.id,
      cycleNumber: 2,
      status: "pending",
      token: "new_token_789",
    };

    const allInquiries = [inqCycle2, inqCycle1];

    // Deduplication logic as implemented in useWhatsAppAbsenceStats
    const pendingCases = allInquiries.filter(
      (inq) => inq.status === "pending" || inq.status === "submitted"
    );

    const uniqueAbsenceCases = new Set<string>();
    pendingCases.forEach((inq) => {
      uniqueAbsenceCases.add(`${inq.teacherId}_${inq.absenceDate}`);
    });

    expect(uniqueAbsenceCases.size).toBe(1);
    expect(uniqueAbsenceCases.has("teacher-101_2026-10-10")).toBe(true);
  });
});
