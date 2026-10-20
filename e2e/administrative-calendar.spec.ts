import { test, expect } from "@playwright/test";

test.describe("Sprint: Administrative Attendance Calendar (التقويم الإداري)", () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ context, page }) => {
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

  test("1. End-to-End Navigation from Sidebar to Calendar and Page Load", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const calendarLink = page.locator("a[href='/calendar']").first();
    await expect(calendarLink).toBeVisible({ timeout: 15000 });
    await expect(calendarLink).toContainText("التقويم الإداري");

    await calendarLink.click();
    await expect(page).toHaveURL(/\/calendar/, { timeout: 10000 });

    const heading = page.locator("h1:has-text('التقويم الإداري')");
    await expect(heading).toBeVisible({ timeout: 10000 });

    await expect(page.locator("button:has-text('إجمالي الأحداث')")).toBeVisible();
    await expect(page.locator("div[role='grid']")).toBeVisible();
  });

  test("2. View Switching: Month -> Week -> Day -> Agenda", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");

    // Week View
    await page.getByRole("button", { name: "أسبوع", exact: true }).click();
    await expect(page.locator("text=الأحد").first()).toBeVisible();

    // Day View
    await page.getByRole("button", { name: "يوم", exact: true }).click();
    await expect(page.locator("h3:has-text('سجل أحداث يوم')")).toBeVisible();

    // Agenda View
    await page.getByRole("button", { name: "أجندة", exact: true }).click();
    await expect(page.locator("text=لا توجد سجلات في هذه الفترة").or(page.locator("text=إجراء")).first()).toBeVisible();

    // Back to Month View
    await page.getByRole("button", { name: "شهر", exact: true }).click();
    await expect(page.locator("div[role='grid']")).toBeVisible();
  });

  test("3. Calendar Navigation: Prev, Next, and Today controls", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");

    const dateHeader = page.locator("h2").first();
    const initialTitle = await dateHeader.innerText();

    await page.locator("button[aria-label='الفترة التالية']").click();
    await page.waitForTimeout(300);
    expect(await dateHeader.innerText()).not.toBe(initialTitle);

    await page.getByRole("button", { name: "اليوم", exact: true }).click();
    await page.waitForTimeout(300);
    expect(await dateHeader.innerText()).toBe(initialTitle);
  });

  test("4. Filter Bar Interactions: Event type selection and Teacher search", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("button:has-text('جميع الأحداث')").first()).toBeVisible();
    await expect(page.locator("button:has-text('غياب')").first()).toBeVisible();
    await expect(page.locator("button:has-text('تأخر')").first()).toBeVisible();

    await page.locator("button:has-text('غياب')").first().click();

    const searchInput = page.locator("input[placeholder*='ابحث عن موظف']");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("اختبار");
    expect(await searchInput.inputValue()).toBe("اختبار");
  });

  test("5. Mobile Responsiveness on 375px Viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");

    const heading = page.locator("h1:has-text('التقويم الإداري')");
    await expect(heading).toBeVisible();

    const viewSelector = page.locator("button:has-text('أجندة')");
    await expect(viewSelector).toBeVisible();

    const pageText = await page.locator("body").innerText();
    expect(pageText).not.toContain("Application error");
  });
});
