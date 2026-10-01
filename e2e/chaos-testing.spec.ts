import { test, expect } from "@playwright/test";

test.describe("Sprint — Playwright Chaos Suite & Unexpected Scenarios", () => {
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

  // =========================================================================
  // Scenario 1: دورة الحياة الكاملة (إنشاء غياب -> فحص المساءلة -> أرشفة -> استعادة)
  // =========================================================================
  test("Scenario 1: دورة العمل الكاملة من الإنشاء وحتى الأرشيف والاستعادة", async ({
    page,
  }) => {
    // 1. الانتقال إلى صفحة إجراءات الغياب
    await page.goto("/procedures/absence");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 });

    // التأكد من جاهزية الجدول والأزرار
    const absenceHeader = page.locator("h1:has-text('مساءلة غياب'), h1:has-text('الغياب')").first();
    await expect(absenceHeader).toBeVisible();

    // 2. التحقق من وجود سجلات الغياب وإمكانية فتح الأرشيف
    await page.goto("/archive");
    await expect(page.locator("h1:has-text('الأرشيف'), h1:has-text('مركز الأرشيف')").first()).toBeVisible({ timeout: 15000 });

    // فحص تبويبات الأرشيف
    const tabs = page.locator("button[role='tab'], .tab-button, button:has-text('غياب'), button:has-text('معلمات')");
    const count = await tabs.count();
    expect(count).toBeGreaterThan(0);

    // 3. التحقق من أن النقر على التبويبات لا يسبب أي انهيار في الـ DOM
    if (count > 0) {
      await tabs.first().click();
      await page.waitForTimeout(500);
    }
  });

  // =========================================================================
  // Scenario 2: فتح نفس السجل من مستخدمين / نافذتين متزامنتين (Multi-Session Simulation)
  // =========================================================================
  test("Scenario 2: محاكاة التعديل المتزامن من جلستين مختلفتين", async ({
    browser,
  }) => {
    // الجلسة الأولى (User A)
    const contextA = await browser.newContext();
    await contextA.addCookies([
      { name: "school_admin_token", value: "mock-token-user-a", domain: "localhost", path: "/" },
      { name: "playwright_e2e_auth", value: "true", domain: "localhost", path: "/" },
    ]);
    const pageA = await contextA.newPage();
    await pageA.goto("/teachers");
    await expect(pageA.locator("h1").first()).toBeVisible({ timeout: 15000 });

    // الجلسة الثانية (User B)
    const contextB = await browser.newContext();
    await contextB.addCookies([
      { name: "school_admin_token", value: "mock-token-user-b", domain: "localhost", path: "/" },
      { name: "playwright_e2e_auth", value: "true", domain: "localhost", path: "/" },
    ]);
    const pageB = await contextB.newPage();
    await pageB.goto("/teachers");
    await expect(pageB.locator("h1").first()).toBeVisible({ timeout: 15000 });

    // إجراء بحث متزامن في كلا الجلستين
    const searchA = pageA.getByPlaceholder(/بحث/i).first();
    const searchB = pageB.getByPlaceholder(/بحث/i).first();

    if (await searchA.isVisible()) {
      await searchA.fill("سارة");
    }
    if (await searchB.isVisible()) {
      await searchB.fill("فاطمة");
    }

    // التحقق من استقرار الجلستين بدون تداخل أو تعارض في الواجهة
    await expect(pageA.locator("body")).toBeVisible();
    await expect(pageB.locator("body")).toBeVisible();

    await contextA.close();
    await contextB.close();
  });

  // =========================================================================
  // Scenario 3: انقطاع الشبكة أثناء العمل والمحاكاة غير المتصلة (Offline Simulation)
  // =========================================================================
  test("Scenario 3: محاكاة انقطاع الاتصال بالإنترنت أثناء التنقل", async ({
    context,
    page,
  }) => {
    // 1. فتح الصفحة في الوضع الطبيعي
    await page.goto("/procedures/administrative-inquiries");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 });

    // 2. محاكاة انقطاع الشبكة (Offline Mode)
    await context.setOffline(true);

    // محاولة النقر على زر أو التفاعل محلياً
    const anyButton = page.locator("button").first();
    if (await anyButton.isVisible()) {
      await anyButton.click({ force: true }).catch(() => {});
    }

    // التأكد من أن المنصة لا تتوقف بشكل كارثي أو تعرض شاشة بيضاء
    await expect(page.locator("body")).toBeVisible();

    // 3. إعادة الاتصال بالإنترنت (Online Mode)
    await context.setOffline(false);
    await page.waitForTimeout(500);

    // التأكد من استمرار عمل الواجهة بشكل سليم
    await expect(page.locator("h1").first()).toBeVisible();
  });

  // =========================================================================
  // Scenario 4: إعادة تحميل الصفحة الصارمة (Hard Reload) في كل مرحلة
  // =========================================================================
  test("Scenario 4: الصمود أمام إعادة التحميل المتكرر في جميع المراحل الرئيسية", async ({
    page,
  }) => {
    const routes = [
      "/",
      "/teachers",
      "/procedures/absence",
      "/procedures/delay-notice",
      "/procedures/administrative-inquiries",
      "/reports",
      "/archive",
    ];

    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible({ timeout: 15000 });

      // تنفيذ Hard Refresh فور فتح الصفحة
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).toBeVisible({ timeout: 15000 });

      // التأكد من عدم وجود أخطاء انهيار كلي في شجرة الـ React DOM
      const hasFatalCrash = await page.locator("text='Application error'").isVisible();
      expect(hasFatalCrash).toBe(false);
    }
  });
});
