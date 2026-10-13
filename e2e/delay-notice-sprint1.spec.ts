import { test, expect } from "@playwright/test";

test.describe("Delay Notice Sprint 1 - 'أخرى' and Minutes Verification", () => {
  test("creates delay notice with 'أخرى' option and validates required custom reason", async ({ page }) => {
    await page.goto("/procedures/delay-notice");
    await page.waitForLoadState("networkidle");

    // Click "إنشاء تنبيه تأخر جديد" button
    const createBtn = page.getByRole("button", { name: /إنشاء تنبيه عن تأخر|إنشاء تنبيه جديد/i });
    if (await createBtn.isVisible()) {
      await createBtn.click();
    } else {
      // Direct selector fallback
      await page.locator("button:has-text('إنشاء تنبيه')").first().click();
    }

    // Modal should be open
    await expect(page.locator("#delay-notice-form")).toBeVisible();

    // Select violation type "other"
    const violationSelect = page.locator("select[id$='violation-type']");
    await violationSelect.selectOption("other");

    // "اذكر السبب" field must appear
    const customReasonInput = page.locator("textarea[id$='custom-reason']");
    await expect(customReasonInput).toBeVisible();

    // Attempt to submit empty -> should show Arabic validation error
    const submitBtn = page.locator("#delay-notice-form button[type='submit']");
    await submitBtn.click();

    // Verification: required error message
    const errorBox = page.locator(".text-rose-700, .text-rose-300");
    await expect(errorBox).toBeVisible();
    await expect(page.getByText("يرجى كتابة سبب التأخير.")).toBeVisible();
  });
});
