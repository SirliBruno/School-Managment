import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getAppBaseUrl,
  getInquiryPublicUrl,
  getDelayNoticePublicUrl,
} from "../appConfig";
import {
  generateInquiryMessage,
  generateDelayNoticeWhatsAppMessage,
} from "../whatsapp";

describe("Domain Migration Readiness & Dynamic URL Resolution Suite", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env before each test
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.APP_URL;
    delete process.env.NEXT_PUBLIC_VERCEL_URL;
    delete process.env.VERCEL_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe("1. Dynamic Base URL Resolution (getAppBaseUrl)", () => {
    it("1.1 يستخدم الدومين الرسمي المخصص من NEXT_PUBLIC_APP_URL مع حذف الشرطات المائلة الزائدة", () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://absence-system.school.edu.sa///";
      expect(getAppBaseUrl()).toBe("https://absence-system.school.edu.sa");
    });

    it("1.2 يستخدم الدومين من APP_URL إذا لم يتوفر NEXT_PUBLIC_APP_URL", () => {
      process.env.APP_URL = "https://custom-portal.gov.sa";
      expect(getAppBaseUrl()).toBe("https://custom-portal.gov.sa");
    });

    it("1.3 يستخدم نطاق Vercel السحابي تلقائياً عند غياب الدومين المخصص", () => {
      process.env.NEXT_PUBLIC_VERCEL_URL = "school-management-staging.vercel.app";
      expect(getAppBaseUrl()).toBe("https://school-management-staging.vercel.app");
    });

    it("1.4 يرجع إلى النطاق المحلي الافتراضي في بيئة الاختبار والتطوير", () => {
      expect(getAppBaseUrl()).toBe("http://localhost:3000");
    });
  });

  describe("2. Teacher Inquiry Links Migration Simulation", () => {
    it("2.1 ينشئ رابط مساءلة المعلمة بالدومين الرسمي المخصص بدون أي تعديل برمجي", () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://absence.my-school.sa";

      const token = "inq-token-998877";
      const singleDayUrl = getInquiryPublicUrl(token);

      expect(singleDayUrl).toBe("https://absence.my-school.sa/inquiry/inq-token-998877");
    });

    it("2.2 يدعم معلمات الفترات المتعددة (الغياب لعدة أيام) مع الدومين الجديد", () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://absence.my-school.sa";

      const token = "inq-multi-12345";
      const multiDayUrl = getInquiryPublicUrl(token, {
        endDate: "2026-09-30",
        daysCount: 3,
      });

      expect(multiDayUrl).toBe(
        "https://absence.my-school.sa/inquiry/inq-multi-12345?end=2026-09-30&days=3"
      );
    });

    it("2.3 محاكاة انتقال فوري بين نطاق Vercel ونطاق حكومي رسمي", () => {
      // المرحلة الأولى: على Vercel
      process.env.NEXT_PUBLIC_APP_URL = "https://school-staging.vercel.app";
      const vercelUrl = getInquiryPublicUrl("tok-sample-1");
      expect(vercelUrl).toContain("https://school-staging.vercel.app/inquiry/tok-sample-1");

      // المرحلة الثانية: الانتقال إلى الدومين الرسمي المخصص دون تعديل كود
      process.env.NEXT_PUBLIC_APP_URL = "https://attendance.moe.gov.sa";
      const officialUrl = getInquiryPublicUrl("tok-sample-1");
      expect(officialUrl).toBe("https://attendance.moe.gov.sa/inquiry/tok-sample-1");
    });
  });

  describe("3. WhatsApp Integration Domain Independence", () => {
    it("3.1 رسالة واتساب لمساءلة الغياب تعكس الدومين الرسمي المخصص فورياً", () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://school-system.edu.sa";

      const inquiryUrl = getInquiryPublicUrl("tok-wa-4455");
      const message = generateInquiryMessage("سارة العتيبي", "2026-09-25", inquiryUrl);

      expect(message).toContain("https://school-system.edu.sa/inquiry/tok-wa-4455");
      expect(message).not.toContain("vercel.app");
      expect(message).toContain("سارة العتيبي");
    });

    it("3.2 رسالة واتساب لتنبيه التأخر تعكس الدومين الرسمي المخصص فورياً", () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://school-system.edu.sa";

      const responseUrl = getDelayNoticePublicUrl("share-tok-7788");
      const message = generateDelayNoticeWhatsAppMessage(
        "نورة القحطاني",
        "2026-09-25",
        responseUrl
      );

      expect(message).toContain("https://school-system.edu.sa/teacher-response/share-tok-7788");
      expect(message).not.toContain("vercel.app");
      expect(message).toContain("نورة القحطاني");
    });
  });

  describe("4. Teacher Delay Response Links Migration", () => {
    it("4.1 رابط رد المعلمة على التنبيه يتوافق مع الدومين الجديد فور تغييره", () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://portal.riyadh-school.sa";

      const url = getDelayNoticePublicUrl("delay-sec-112233");
      expect(url).toBe("https://portal.riyadh-school.sa/teacher-response/delay-sec-112233");
    });
  });
});
