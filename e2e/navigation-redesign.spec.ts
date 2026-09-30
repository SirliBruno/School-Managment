import { test, expect } from "@playwright/test";

test.describe("اختبارات إعادة تصميم تجربة التنقل والـ Sidebar (Accordion Navigation & Workflow)", () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ context, page }) => {
    // Authenticate via cookies for middleware
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

    // Authenticate in localStorage for AuthContext & TeacherContext
    await page.addInitScript(() => {
      localStorage.setItem("playwright_e2e_auth", "true");
      localStorage.setItem(
        "school_admin_auth_user",
        JSON.stringify({
          id: "admin-vice-principal",
          username: "ahlam",
          fullName: "أحلام صالح الضبيبي",
          role: "vice_principal",
          permissions: ["all"],
        })
      );
    });
  });

  test("1. التحقق من هيكل الأقسام الـ 5 ونظام الـ Accordion على الشاشات الكبيرة", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const sidebar = page.locator("aside[aria-label='شريط القائمة الجانبية']");
    await expect(sidebar).toBeVisible({ timeout: 15000 });

    // 1. مركز القيادة
    await expect(sidebar.locator("a:has-text('مركز القيادة')").first()).toBeVisible();

    // 2. السجلات اليومية
    const recordsHeader = sidebar.locator("button:has-text('السجلات اليومية')");
    await expect(recordsHeader).toBeVisible();

    // 3. الإجراءات والقرارات
    const proceduresHeader = sidebar.locator("button:has-text('الإجراءات والقرارات')");
    await expect(proceduresHeader).toBeVisible();

    // 4. التقارير والتوثيق
    const reportsHeader = sidebar.locator("button:has-text('التقارير والتوثيق')");
    await expect(reportsHeader).toBeVisible();

    // 5. الإدارة
    const adminHeader = sidebar.locator("button:has-text('الإدارة والتهيئة'), button:has-text('الإدارة')");
    await expect(adminHeader.first()).toBeVisible();
  });

  test("2. التحقق من فتح وغلق أقسام الـ Accordion والتنقل السلس بين الصفحات", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const sidebar = page.locator("aside[aria-label='شريط القائمة الجانبية']");
    await expect(sidebar).toBeVisible({ timeout: 15000 });

    // Ensure Daily Records is open
    const recordsHeader = sidebar.locator("button:has-text('السجلات اليومية')");
    const isExpanded = await recordsHeader.getAttribute("aria-expanded");
    if (isExpanded !== "true") {
      await recordsHeader.click();
      await page.waitForTimeout(300);
    }

    // Check items in Daily Records
    const teachersLink = sidebar.locator("a[href='/teachers']").first();
    await expect(teachersLink).toBeVisible();

    const absenceLink = sidebar.locator("a[href='/procedures/absence']").first();
    await expect(absenceLink).toBeVisible();

    const delayLink = sidebar.locator("a[href='/procedures/delay-notice']").first();
    await expect(delayLink).toBeVisible();

    const permLink = sidebar.locator("a[href='/procedures/permissions']").first();
    await expect(permLink).toBeVisible();

    // Click on Teachers page
    await teachersLink.click();
    await page.waitForURL("**/teachers", { timeout: 10000 });
    await expect(page).toHaveURL(/.*teachers/);

    // Open Procedures & Decisions
    const proceduresHeader = sidebar.locator("button:has-text('الإجراءات والقرارات')");
    const isProcExpanded = await proceduresHeader.getAttribute("aria-expanded");
    if (isProcExpanded !== "true") {
      await proceduresHeader.click();
      await page.waitForTimeout(300);
    }

    const adminInqLink = sidebar.locator("a[href='/procedures/administrative-inquiries']").first();
    await expect(adminInqLink).toBeVisible();
    await adminInqLink.click();
    await page.waitForURL("**/procedures/administrative-inquiries", { timeout: 10000 });
    await expect(page).toHaveURL(/.*administrative-inquiries/);

    // Open Reports & Documentation
    const reportsHeader = sidebar.locator("button:has-text('التقارير والتوثيق')");
    const isRepExpanded = await reportsHeader.getAttribute("aria-expanded");
    if (isRepExpanded !== "true") {
      await reportsHeader.click();
      await page.waitForTimeout(300);
    }

    const reportsLink = sidebar.locator("a[href='/reports']").first();
    await expect(reportsLink).toBeVisible();
    await reportsLink.click();
    await page.waitForURL("**/reports", { timeout: 10000 });
    await expect(page).toHaveURL(/.*reports/);

    const archiveLink = sidebar.locator("a[href='/archive']").first();
    await expect(archiveLink).toBeVisible();
    await archiveLink.click();
    await page.waitForURL("**/archive", { timeout: 10000 });
    await expect(page).toHaveURL(/.*archive/);
  });

  test("3. التحقق من القائمة الجانبية في وضع الجوال (Drawer Menu & Auto-close on Navigate)", async ({ page }) => {
    // Set Mobile Viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Open Mobile Drawer via hamburger
    const hamburgerBtn = page.locator("button[aria-label='فتح القائمة الرئيسية']").first();
    await expect(hamburgerBtn).toBeVisible({ timeout: 15000 });
    await hamburgerBtn.click();

    const mobileDrawer = page.locator("div[role='dialog'][aria-label='القائمة الجانبية للجوال']");
    await expect(mobileDrawer).toBeVisible({ timeout: 5000 });

    // Ensure Daily Records is expanded
    const recordsHeader = mobileDrawer.locator("button:has-text('السجلات اليومية')");
    const isExpanded = await recordsHeader.getAttribute("aria-expanded");
    if (isExpanded !== "true") {
      await recordsHeader.click();
      await page.waitForTimeout(300);
    }

    // Click on Absence page and verify drawer closes automatically
    const absenceLink = mobileDrawer.locator("a[href='/procedures/absence']").first();
    await absenceLink.click();
    await page.waitForURL("**/procedures/absence", { timeout: 10000 });

    await expect(page).toHaveURL(/.*procedures\/absence/);
    await expect(mobileDrawer).not.toBeVisible({ timeout: 5000 });
  });
});
