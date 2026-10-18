import { test, expect } from "@playwright/test";

test.describe("Dashboard Operations Navigation Suite", () => {
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

  test("clicking 'عرض جميع العمليات' navigates to /procedures/list and supports browser back", async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (err) => {
      pageErrors.push(err);
    });

    const fatalConsoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (
          !text.includes("Failed to load resource") &&
          !text.includes("favicon") &&
          !text.includes("manifest")
        ) {
          fatalConsoleErrors.push(text);
        }
      }
    });

    // 1. OPEN DASHBOARD
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 2. LOCATE 'آخر العمليات' SECTION
    const operationsSection = page.locator("section[aria-label='آخر العمليات والأنشطة']");
    await expect(operationsSection).toBeVisible();
    await expect(operationsSection.locator("text=آخر العمليات")).toBeVisible();

    // 3. LOCATE AND CLICK 'عرض جميع العمليات' LINK
    const allOperationsLink = operationsSection.locator("a:has-text('عرض جميع العمليات')");
    await expect(allOperationsLink).toBeVisible();
    await expect(allOperationsLink).toHaveAttribute("href", "/procedures/list");

    await allOperationsLink.click();

    // 4. VERIFY NAVIGATION TO /procedures/list
    await page.waitForURL("**/procedures/list");
    await page.waitForLoadState("networkidle");

    // 5. VERIFY DESTINATION PAGE HEADER AND CONTENT
    await expect(page.locator("h1:has-text('قائمة الإجراءات الإدارية الموحدة')")).toBeVisible();
    await expect(page.locator("text=سجل شامل لجميع مساءلات الغياب")).toBeVisible();

    // 6. VERIFY NO 404
    await expect(page.locator("text=404")).not.toBeVisible();
    await expect(page.locator("text=الصفحة غير موجودة")).not.toBeVisible();

    // 7. BROWSER BACK NAVIGATION
    await page.goBack();
    await page.waitForURL((url) => url.pathname === "/" || url.pathname === "");
    await page.waitForLoadState("networkidle");

    // 8. VERIFY RETURN TO DASHBOARD
    await expect(page.locator("section[aria-label='آخر العمليات والأنشطة']")).toBeVisible();

    // 9. VERIFY NO FATAL RUNTIME OR CONSOLE ERRORS
    expect(pageErrors).toHaveLength(0);
    expect(fatalConsoleErrors).toHaveLength(0);
  });
});
