import { test, expect } from "@playwright/test";

test.describe("Premium Administrative UX & Reference Navigation Quality Suite", () => {
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

  test("1. فحص الهيكل المرجعي للقائمة الجانبية (Header, Cards, Timeline & Profile)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const sidebar = page.locator("aside[aria-label='شريط القائمة الجانبية']");
    await expect(sidebar).toBeVisible({ timeout: 15000 });

    // 1. Header Card with School Name
    await expect(sidebar.locator("text=منصة إدارتي المدرسية").first()).toBeVisible();
    await expect(sidebar.locator("text=الثانوية الخامسة مسارات").first()).toBeVisible();

    // 2. Floating Collapse/Expand Button
    const floatingToggle = sidebar.locator("button[aria-label*='طي القائمة'], button[aria-label*='توسيع القائمة']").first();
    await expect(floatingToggle).toBeVisible();

    // 3. مركز القيادة Card
    await expect(sidebar.locator("a:has-text('مركز القيادة')").first()).toBeVisible();

    // 4. العمل اليومي Card
    const dailyHeader = sidebar.locator("button:has-text('العمل اليومي')");
    await expect(dailyHeader).toBeVisible();

    // 5. الإجراءات والقرارات Card
    const proceduresHeader = sidebar.locator("button:has-text('الإجراءات والقرارات')");
    await expect(proceduresHeader).toBeVisible();

    // 6. التقارير والأرشيف Card
    const reportsHeader = sidebar.locator("button:has-text('التقارير والأرشيف')");
    await expect(reportsHeader).toBeVisible();

    // 7. الإدارة Card
    const adminHeader = sidebar.locator("button:has-text('الإدارة')");
    await expect(adminHeader).toBeVisible();

    // 8. Bottom Profile Card
    await expect(sidebar.locator("text=أحلام صالح الضبيبي").first()).toBeVisible();
    await expect(sidebar.locator("text=وكيلة المدرسة").first()).toBeVisible();

    // 9. Navbar Task Center (مركز المهام)
    const taskCenter = page.locator("button[aria-label='مركز المهام']");
    await expect(taskCenter).toBeVisible();
  });

  test("2. فحص سلاسة فتح وطي الـ Accordion والتنقل لجميع الصفحات بدون 404", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const sidebar = page.locator("aside[aria-label='شريط القائمة الجانبية']");
    await expect(sidebar).toBeVisible({ timeout: 15000 });

    // Ensure Daily Work is open
    const dailyHeader = sidebar.locator("button:has-text('العمل اليومي')");
    const isDailyExpanded = await dailyHeader.getAttribute("aria-expanded");
    if (isDailyExpanded !== "true") {
      await dailyHeader.click();
      await page.waitForTimeout(300);
    }

    // 1. Navigate to Teachers page
    const teachersLink = sidebar.locator("a[href='/teachers']").first();
    await expect(teachersLink).toBeVisible();
    await teachersLink.click();
    await page.waitForURL("**/teachers", { timeout: 10000 });
    await expect(page).toHaveURL(/.*teachers/);
    await expect(page.locator("text=404")).not.toBeVisible();

    // 2. Navigate to Absence page
    const absenceLink = sidebar.locator("a[href='/procedures/absence']").first();
    await expect(absenceLink).toBeVisible();
    await absenceLink.click();
    await page.waitForURL("**/procedures/absence", { timeout: 10000 });
    await expect(page).toHaveURL(/.*absence/);
    await expect(page.locator("text=404")).not.toBeVisible();

    // 3. Open Procedures & Decisions and navigate to Administrative Inquiries
    const procHeader = sidebar.locator("button:has-text('الإجراءات والقرارات')");
    const isProcExp = await procHeader.getAttribute("aria-expanded");
    if (isProcExp !== "true") {
      await procHeader.click();
      await page.waitForTimeout(300);
    }

    const adminInqLink = sidebar.locator("a[href='/procedures/administrative-inquiries']").first();
    await expect(adminInqLink).toBeVisible();
    await adminInqLink.click();
    await page.waitForURL("**/procedures/administrative-inquiries", { timeout: 10000 });
    await expect(page).toHaveURL(/.*administrative-inquiries/);
    await expect(page.locator("text=404")).not.toBeVisible();

    // 4. Open Reports & Archive and navigate to Reports
    const repHeader = sidebar.locator("button:has-text('التقارير والأرشيف')");
    const isRepExp = await repHeader.getAttribute("aria-expanded");
    if (isRepExp !== "true") {
      await repHeader.click();
      await page.waitForTimeout(300);
    }

    const reportsLink = sidebar.locator("a[href='/reports']").first();
    await expect(reportsLink).toBeVisible();
    await reportsLink.click();
    await page.waitForURL("**/reports", { timeout: 10000 });
    await expect(page).toHaveURL(/.*reports/);
    await expect(page.locator("text=404")).not.toBeVisible();

    // 5. Navigate to Archive
    const archiveLink = sidebar.locator("a[href='/archive']").first();
    await expect(archiveLink).toBeVisible();
    await archiveLink.click();
    await page.waitForURL("**/archive", { timeout: 10000 });
    await expect(page).toHaveURL(/.*archive/);
    await expect(page.locator("text=404")).not.toBeVisible();
  });

  test("3. فحص التوافقية والتجاوبية (Tablet & Mobile Drawer)", async ({ page }) => {
    // 1. Tablet Viewport (820x1180)
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Hamburger button should be visible on tablet
    const hamburgerBtn = page.locator("button[aria-label='فتح القائمة الرئيسية']").first();
    await expect(hamburgerBtn).toBeVisible({ timeout: 10000 });
    await hamburgerBtn.click();

    // Drawer should open smoothly
    const drawer = page.locator("div.fixed.inset-y-0.right-0").first();
    await expect(drawer).toBeVisible({ timeout: 5000 });

    // Drawer search input should be functional
    const drawerSearch = drawer.locator("input[placeholder*='تصفية الأقسام']");
    await expect(drawerSearch).toBeVisible();

    // 2. Mobile Viewport (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const mobileHamburger = page.locator("button[aria-label='فتح القائمة الرئيسية']").first();
    await expect(mobileHamburger).toBeVisible({ timeout: 10000 });
    await mobileHamburger.click();

    const mobileDrawer = page.locator("div.fixed.inset-y-0.right-0").first();
    await expect(mobileDrawer).toBeVisible({ timeout: 5000 });

    // Navigate to permissions from drawer and ensure auto-close
    const dailyBtn = mobileDrawer.locator("button:has-text('العمل اليومي')");
    const isDailyExp = await dailyBtn.getAttribute("aria-expanded");
    if (isDailyExp !== "true") {
      await dailyBtn.click();
      await page.waitForTimeout(250);
    }

    const permissionsLink = mobileDrawer.locator("a[href='/procedures/permissions']").first();
    await permissionsLink.click();
    await page.waitForURL("**/procedures/permissions", { timeout: 10000 });
    await expect(page).toHaveURL(/.*permissions/);
    await expect(page.locator("text=404")).not.toBeVisible();
  });
});
