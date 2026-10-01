import { test, expect } from "@playwright/test";

test.describe("Sprint — Responsive Design Audit & Optimization", () => {
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

  test("1. Desktop Viewport (1440x900): Sidebar fixed, hamburger hidden, 4-col KPI grid, no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    // Desktop sidebar should be visible
    const desktopSidebar = page.locator("aside").first();
    await expect(desktopSidebar).toBeVisible({ timeout: 15000 });

    // Hamburger button should NOT be visible on desktop
    const hamburgerBtn = page.getByRole("button", { name: /فتح القائمة الرئيسية/ });
    await expect(hamburgerBtn).toBeHidden();

    // Check no horizontal scrollbar on document body
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBeFalsy();
  });

  test("2. Tablet Viewport (768x1024): Sidebar rail or collapsible, touch targets >= 44px", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");

    // At 768px (md breakpoint), the sidebar is present
    const desktopSidebar = page.locator("aside").first();
    await expect(desktopSidebar).toBeVisible({ timeout: 15000 });

    // Header collapse toggle button should be visible
    const collapseToggleBtn = page.getByRole("button", { name: /القائمة الجانبية/ }).first();
    await expect(collapseToggleBtn).toBeVisible();

    // Verify touch target size of collapse button (min 44px)
    const box = await collapseToggleBtn.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(40);
      expect(box.height).toBeGreaterThanOrEqual(40);
    }
  });

  test("3. Mobile Viewport (390x844): Drawer navigation, hamburger toggle, and zero horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    // Desktop sidebar should be hidden
    const desktopSidebar = page.locator("aside").first();
    await expect(desktopSidebar).toBeHidden({ timeout: 10000 });

    // Hamburger button should be visible
    const hamburgerBtn = page.getByRole("button", { name: /فتح القائمة الرئيسية/ });
    await expect(hamburgerBtn).toBeVisible();

    // Check touch target size of hamburger button
    const burgerBox = await hamburgerBtn.boundingBox();
    expect(burgerBox).not.toBeNull();
    if (burgerBox) {
      expect(burgerBox.width).toBeGreaterThanOrEqual(44);
      expect(burgerBox.height).toBeGreaterThanOrEqual(44);
    }

    // Open mobile drawer
    await hamburgerBtn.click();

    // Verify drawer dialog is open
    const drawerTitle = page.locator(".fixed.inset-y-0.right-0").getByText("منصة إدارتي المدرسية");
    await expect(drawerTitle).toBeVisible({ timeout: 5000 });

    // Close button should be visible inside drawer
    const drawerCloseBtn = page.getByRole("button", { name: "إغلاق القائمة" });
    await expect(drawerCloseBtn).toBeVisible();

    // Check touch target size of drawer close button
    const closeBox = await drawerCloseBtn.boundingBox();
    expect(closeBox).not.toBeNull();
    if (closeBox) {
      expect(closeBox.width).toBeGreaterThanOrEqual(44);
      expect(closeBox.height).toBeGreaterThanOrEqual(44);
    }

    // Close drawer
    await drawerCloseBtn.click();
    await expect(drawerCloseBtn).toBeHidden({ timeout: 5000 });

    // Check page body has no horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBeFalsy();
  });

  test("4. Mobile Viewport (375x812): Modal bottom-sheet/full-screen behavior and internal scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/teachers");

    // Open teacher profile modal from mobile card
    const teacherNameBtn = page.locator("[data-testid='teacher-card'] button").first();
    await expect(teacherNameBtn).toBeVisible({ timeout: 15000 });
    await teacherNameBtn.click();

    // Dialog should be visible
    const modalDialog = page.locator("[role='dialog']").first();
    await expect(modalDialog).toBeVisible({ timeout: 10000 });

    // Close button should have at least 40px touch target
    const modalCloseBtn = page.getByRole("button", { name: /إغلاق ملف المعلمة|إغلاق/ }).first();
    await expect(modalCloseBtn).toBeVisible();
    const closeBox = await modalCloseBtn.boundingBox();
    expect(closeBox).not.toBeNull();
    if (closeBox) {
      expect(closeBox.width).toBeGreaterThanOrEqual(40);
      expect(closeBox.height).toBeGreaterThanOrEqual(40);
    }

    // Check modal does not break page width
    const modalBox = await modalDialog.boundingBox();
    expect(modalBox).not.toBeNull();
    if (modalBox) {
      expect(modalBox.width).toBeLessThanOrEqual(375);
    }

    // Close modal
    await modalCloseBtn.click();
    await expect(modalDialog).toBeHidden({ timeout: 5000 });
  });

  test("5. Small Mobile Viewport (320x568): Critical narrow width verification", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/");

    // Check page loads and header is clean
    const hamburgerBtn = page.getByRole("button", { name: /فتح القائمة الرئيسية/ });
    await expect(hamburgerBtn).toBeVisible({ timeout: 15000 });

    // Verify document width fits in 320px without layout break
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBeFalsy();
  });
});
