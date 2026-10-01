import { test, expect } from "@playwright/test";

test.describe("سجل المعلمات - مركز الإجراءات السريعة والتقارير وحماية التعديل", () => {
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

  test("1. فتح ملف المعلمة والتحقق من وجود مركز الإجراءات السريعة والتقارير", async ({ page }) => {
    await page.goto("/teachers");

    // Click on the first teacher's name button in the table
    const teacherNameBtn = page.locator("table tbody tr button").first();
    await expect(teacherNameBtn).toBeVisible({ timeout: 15000 });
    await teacherNameBtn.click();

    // Verify Profile Modal is open
    const profileModal = page.locator("[role='dialog']").first();
    await expect(profileModal).toBeVisible({ timeout: 10000 });

    // Verify Quick Actions Section
    await expect(page.getByText("الإجراءات السريعة").first()).toBeVisible();
    await expect(page.getByText("تنفيذ العمليات الإدارية المباشرة للمعلمة").first()).toBeVisible();

    // Verify all 6 Quick Action buttons exist
    await expect(page.getByRole("link", { name: /تسجيل غياب/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /مساءلة إدارية/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /مساءلة واتساب/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /إضافة استئذان/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /قرار حسم/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /تنبيه تأخر/ }).first()).toBeVisible();

    // Verify Quick Reports Section
    await expect(page.getByText("التقارير السريعة").first()).toBeVisible();
    await expect(page.getByText("سجل المعلمة PDF").first()).toBeVisible();
    await expect(page.getByText("تقرير الغياب").first()).toBeVisible();
    await expect(page.getByText("سجل الاستئذان الرسمي").first()).toBeVisible();
    await expect(page.getByText("طباعة الملف").first()).toBeVisible();
  });

  test("2. التحقق من حماية تعديل بيانات المعلمة وظهور نافذة التأكيد", async ({ page }) => {
    await page.goto("/teachers");

    // Click on the first teacher's name button in the table
    const teacherNameBtn = page.locator("table tbody tr button").first();
    await expect(teacherNameBtn).toBeVisible({ timeout: 15000 });
    await teacherNameBtn.click();

    // Verify Profile Modal is open
    const profileModal = page.locator("[role='dialog']").first();
    await expect(profileModal).toBeVisible({ timeout: 10000 });

    // Find and click the edit data button
    const editBtn = page.getByRole("button", { name: /تعديل البيانات/ }).first();
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();

    // Check Confirmation Dialog pops up
    const confirmDialog = page.locator("[role='alertdialog']");
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });
    await expect(confirmDialog.getByText("تعديل بيانات المعلمة")).toBeVisible();
    await expect(confirmDialog.getByText(/أنتِ على وشك تعديل البيانات الأساسية للمعلمة/)).toBeVisible();

    // Click confirm
    const proceedBtn = confirmDialog.getByRole("button", { name: /متابعة التعديل/ });
    await expect(proceedBtn).toBeVisible();
    await proceedBtn.click();

    // Check that AddTeacherModal opens in edit mode
    await expect(page.getByText(/تعديل بيانات المعلمة:/)).toBeVisible({ timeout: 5000 });
  });
});
