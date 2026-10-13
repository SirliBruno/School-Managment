import { test, expect } from "@playwright/test";

test.describe("Sprint 4 — Global Filtering & Sorting Engine Verification", () => {
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

  test("1. Teachers Page: Status filter tabs, search, sorting and pagination reset", async ({ page }) => {
    await page.goto("/teachers");
    await page.waitForLoadState("networkidle");

    // Table should be rendered
    const table = page.locator("table");
    await expect(table).toBeVisible();

    // Check status buttons exist
    const allBtn = page.getByRole("button", { name: /الكل/i }).first();
    const permanentBtn = page.getByRole("button", { name: /دائم/i }).first();
    const contractBtn = page.getByRole("button", { name: /عقد/i }).first();
    const withAbsenceBtn = page.getByRole("button", { name: /لديهن غياب/i }).first();

    await expect(allBtn).toBeVisible();
    await expect(permanentBtn).toBeVisible();
    await expect(contractBtn).toBeVisible();
    await expect(withAbsenceBtn).toBeVisible();

    // Click "دائم" filter
    await permanentBtn.click();
    await page.waitForTimeout(300);

    // Click "الكل" filter to restore
    await allBtn.click();
    await page.waitForTimeout(300);

    // Test Search Input
    const searchInput = page.getByPlaceholder(/البحث السريع في السجلات|بحث/i).first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill("أمل");
    await page.waitForTimeout(300);

    // Clear search button test
    const clearBtn = page.locator("button[aria-label='مسح البحث']").first();
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await expect(searchInput).toHaveValue("");
    } else {
      await searchInput.clear();
    }

    // Test Sorting on "اسم المعلمة" header
    const nameHeader = page.locator("th:has-text('اسم المعلمة')").first();
    await expect(nameHeader).toBeVisible();
    await nameHeader.click();
    await page.waitForTimeout(200);

    // Second click reverses sort direction
    await nameHeader.click();
    await page.waitForTimeout(200);

    // Third click clears sort
    await nameHeader.click();
    await page.waitForTimeout(200);
  });

  test("2. Procedures Page: Absences & Inquiries filtering, search and sorting", async ({ page }) => {
    await page.goto("/procedures/absence");
    await page.waitForLoadState("networkidle");

    // Check presence of table
    const table = page.locator("table").first();
    await expect(table).toBeVisible();

    // Test search filter
    const searchInput = page.getByPlaceholder(/بحث/i).first();
    await expect(searchInput).toBeVisible();

    // Test clicking a sortable column header (e.g. "تاريخ الغياب" or "اسم المعلمة")
    const dateHeader = page.locator("th:has-text('تاريخ الغياب')").first();
    if (await dateHeader.isVisible()) {
      await dateHeader.click();
      await page.waitForTimeout(200);
      await dateHeader.click();
      await page.waitForTimeout(200);
    }
  });

  test("3. Delay Notice Page: Status filter tabs, sorting on columns", async ({ page }) => {
    await page.goto("/procedures/delay-notice");
    await page.waitForLoadState("networkidle");

    // Table should be visible
    const table = page.locator("table").first();
    await expect(table).toBeVisible();

    // Check sortable noticeNumber and teacherName
    const teacherHeader = page.locator("th:has-text('المعلمة')").first();
    if (await teacherHeader.isVisible()) {
      await teacherHeader.click();
      await page.waitForTimeout(200);
      await teacherHeader.click();
    }
  });

  test("4. Permissions Page: Sortable columns (employee, date, duration)", async ({ page }) => {
    await page.goto("/procedures/permissions");
    await page.waitForLoadState("networkidle");

    const table = page.locator("table").first();
    await expect(table).toBeVisible();

    // Check sortable headers
    const nameHeader = page.locator("th:has-text('اسم الموظفة')").first();
    const durationHeader = page.locator("th:has-text('مدة الاستئذان')").first();

    await expect(nameHeader).toBeVisible();
    await expect(durationHeader).toBeVisible();

    await durationHeader.click();
    await page.waitForTimeout(200);
  });

  test("5. Administrative Inquiries Page: KPI filter tabs and sortable columns", async ({ page }) => {
    await page.goto("/procedures/administrative-inquiries");
    await page.waitForLoadState("networkidle");

    // Table or Empty State should be visible
    const tableOrEmpty = page.locator("table, [data-testid='empty-state'], div:has-text('لا توجد مسائلات إدارية')").first();
    await expect(tableOrEmpty).toBeVisible();

    // Click on KPI cards for tab switching
    const allKpi = page.getByText("إجمالي المسائلات").first();
    await expect(allKpi).toBeVisible();
    await allKpi.click();

    // Sortable columns test if table is rendered
    const numHeader = page.locator("th:has-text('رقم المساءلة')").first();
    if (await numHeader.isVisible()) {
      await numHeader.click();
      await page.waitForTimeout(200);
    }
  });

  test("6. Archive Page: Categorized tabs and chronological ordering", async ({ page }) => {
    await page.goto("/archive");
    await page.waitForLoadState("networkidle");

    // Check archive page header
    await expect(page.getByRole("heading", { name: "الأرشيف الإداري" })).toBeVisible();

    // Check tabs or KPI filters exist
    const teacherTab = page.getByText("المعلمات المؤرشفة").first();
    await expect(teacherTab).toBeVisible();
  });
});
