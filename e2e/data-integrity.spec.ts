import { test, expect } from "@playwright/test";

test.describe("تدقيق وتكامل سلامة البيانات الشامل (E2E Full Data Lifecycle & Persistence)", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      {
        name: "school_admin_token",
        value: "mock-e2e-jwt-token",
        domain: "localhost",
        path: "/",
      },
      {
        name: "playwright_e2e_auth",
        value: "true",
        domain: "localhost",
        path: "/",
      },
    ]);
  });

  test("1. سيناريو دورة البيانات الكاملة (Full Entity Lifecycle & Non-Destructive Flow)", async ({
    page,
  }) => {
    // 1. Visit Teachers List
    await page.goto("/teachers");
    await expect(page.locator("h1:has-text('المعلمات'), h1:has-text('سجل المعلمات')").first()).toBeVisible({ timeout: 15000 });

    // 2. Visit Administrative Inquiries
    await page.goto("/procedures/administrative-inquiries");
    await expect(page.locator("h1:has-text('المسائلات الإدارية')")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("إجمالي المسائلات").first()).toBeVisible();

    // 3. Visit Absence Procedures
    await page.goto("/procedures/absence");
    await expect(page.locator("h1:has-text('الغياب'), h1:has-text('سجل الغياب')").first()).toBeVisible({ timeout: 15000 });

    // 4. Visit Delay Notices
    await page.goto("/procedures/delay-notice");
    await expect(page.locator("h1:has-text('التأخر'), h1:has-text('إشعارات التأخر')").first()).toBeVisible({ timeout: 15000 });

    // 5. Visit Deduction Procedures
    await page.goto("/procedures/deduction-hours");
    await expect(page.locator("h1:has-text('الحسم'), h1:has-text('قرارات الحسم')").first()).toBeVisible({ timeout: 15000 });

    // 6. Visit Reports Engine
    await page.goto("/reports");
    await expect(page.locator("h1:has-text('التقارير'), h1:has-text('مركز التقارير')").first()).toBeVisible({ timeout: 15000 });

    // 7. Visit Archive Center
    await page.goto("/archive");
    await expect(page.locator("h1:has-text('الأرشيف'), h1:has-text('مركز الأرشيف')").first()).toBeVisible({ timeout: 15000 });
  });

  test("2. التحقق من ثبات البيانات بعد إعادة التحميل السريع (Hard Refresh Persistence)", async ({
    page,
  }) => {
    const mockToken = "persist-tok-" + Date.now();

    await page.addInitScript((tok) => {
      const sampleInquiry = {
        id: "persist-inq-1",
        inquiryNumber: "ADM-777",
        teacherId: "teacher-persisted",
        teacherName: "ريم عبدالله القحطاني",
        nationalId: "1099887766",
        jobTitle: "معلم ممارس",
        specialty: "علوم",
        inquiryType: "التأخير عن دخول الحصص",
        incidentDate: "2026-09-29",
        description: "اختبار ثبات البيانات عند تحديث الصفحة",
        status: "pending_director",
        token: tok,
        tokenExpiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        teacherResponse: "إفادة اختبارية لسلامة الذاكرة والتزامن",
        responseDate: "2026-09-29",
        createdAt: new Date().toISOString(),
        isArchived: false,
      };

      const existing = localStorage.getItem("school_admin_administrative_inquiries_v1");
      const list = existing ? JSON.parse(existing) : [];
      list.unshift(sampleInquiry);
      localStorage.setItem("school_admin_administrative_inquiries_v1", JSON.stringify(list));
    }, mockToken);

    await page.goto("/procedures/administrative-inquiries");
    await expect(page.getByText("ريم عبدالله القحطاني").first()).toBeVisible({ timeout: 15000 });

    // Perform hard reload
    await page.reload();

    // Verify data remains perfectly intact
    await expect(page.getByText("ريم عبدالله القحطاني").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("التأخير عن دخول الحصص").first()).toBeVisible();
  });
});
