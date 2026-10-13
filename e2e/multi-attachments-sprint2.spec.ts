import { test, expect } from "@playwright/test";

test.describe("Sprint 2 — Multiple Optional Attachments for Direct Absence Entry", () => {
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

  test("1. End-to-End: Create absence with multiple attachments, remove, re-add, and verify", async ({ page }) => {
    await page.goto("/procedures/absence?tab=manual");
    await page.waitForLoadState("networkidle");

    // Step 1: Select a teacher via Combobox
    const comboboxTrigger = page.locator("div[role='combobox']").first();
    await comboboxTrigger.click();
    await page.locator("div[role='option']").first().click();

    // Click Next to Step 2
    const nextBtn = page.getByRole("button", { name: /متابعة للخطوة التالية|الخطوة التالية/i });
    await nextBtn.click();

    // Step 2: Fill Reason
    const reasonTextarea = page.locator("textarea[placeholder*='سبب الغياب']");
    await reasonTextarea.fill("عذر مرضي معتمد مع تقارير طبية متعددة");

    // Click Next to Step 3 (Attachments)
    await nextBtn.click();

    // Verify Step 3 Header: communicates optional attachments
    await expect(page.getByText("الخطوة 3: المرفقات والتوثيق الطبي (اختياري)")).toBeVisible();

    // Prepare mock files (one image, one PDF)
    const fileInput = page.locator("input[type='file'][multiple]");
    await expect(fileInput).toBeAttached();

    await fileInput.setInputFiles([
      {
        name: "medical_report_1.png",
        mimeType: "image/png",
        buffer: Buffer.from("fake-png-binary-content-1"),
      },
      {
        name: "sahti_report_2.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4 fake pdf content 2"),
      },
    ]);

    // Verify both files are rendered in the list
    await expect(page.getByText("medical_report_1.png")).toBeVisible();
    await expect(page.getByText("sahti_report_2.pdf")).toBeVisible();
    await expect(page.getByText("المرفقات المحددة (2):")).toBeVisible();

    // Remove one attachment
    const removeBtn = page.locator("button[aria-label*='حذف المرفق medical_report_1.png']");
    await removeBtn.click();

    // Verify count updated to 1
    await expect(page.getByText("المرفقات المحددة (1):")).toBeVisible();
    await expect(page.getByText("medical_report_1.png")).not.toBeVisible();

    // Re-add the file
    await fileInput.setInputFiles([
      {
        name: "medical_report_readded.png",
        mimeType: "image/png",
        buffer: Buffer.from("fake-png-binary-content-readded"),
      },
    ]);

    // Verify both files are present
    await expect(page.getByText("sahti_report_2.pdf")).toBeVisible();
    await expect(page.getByText("medical_report_readded.png")).toBeVisible();

    // Step 4: Advance to Review
    await nextBtn.click();
    await expect(page.getByText("الخطوة 4: مراجعة واعتماد مساءلة الغياب")).toBeVisible();
    await expect(page.getByText(/2 مرفقات معتمدة/)).toBeVisible();

    // Submit absence
    const saveBtn = page.getByRole("button", { name: /اعتماد وحفظ المساءلة/i });
    await saveBtn.click();

    // Verify success feedback
    await expect(page.getByText(/تم حفظ الإجراء بنجاح!/)).toBeVisible({ timeout: 10000 });
  });

  test("2. Zero attachments (optional) saves successfully", async ({ page }) => {
    await page.goto("/procedures/absence?tab=manual");
    await page.waitForLoadState("networkidle");

    // Step 1: Select teacher (second teacher in list to prevent date collision)
    const comboboxTrigger = page.locator("div[role='combobox']").first();
    await comboboxTrigger.click();
    const options = page.locator("div[role='option']");
    if (await options.count() > 1) {
      await options.nth(1).click();
    } else {
      await options.first().click();
    }

    // Next to Step 2
    const nextBtn = page.getByRole("button", { name: /متابعة للخطوة التالية|الخطوة التالية/i });
    await nextBtn.click();

    // Step 2: Fill Reason
    await page.locator("textarea[placeholder*='سبب الغياب']").fill("ظرف طارئ بدون مرفقات إلكترونية");

    // Next to Step 3
    await nextBtn.click();

    // In Step 3, do not select any files. Next to Step 4
    await nextBtn.click();

    // Verify review shows without attachments
    await expect(page.getByText("بدون مرفقات (اختياري)")).toBeVisible();

    // Submit
    const saveBtn = page.getByRole("button", { name: /اعتماد وحفظ المساءلة/i });
    await saveBtn.click();

    // Verify success
    await expect(page.getByText(/تم حفظ الإجراء بنجاح!/)).toBeVisible({ timeout: 10000 });
  });

  test("3. Unsupported file is rejected with clear Arabic message", async ({ page }) => {
    await page.goto("/procedures/absence?tab=manual");
    await page.waitForLoadState("networkidle");

    // Select teacher and go to Step 3
    const comboboxTrigger = page.locator("div[role='combobox']").first();
    await comboboxTrigger.click();
    await page.locator("div[role='option']").first().click();

    const nextBtn = page.getByRole("button", { name: /متابعة للخطوة التالية|الخطوة التالية/i });
    await nextBtn.click();

    await page.locator("textarea[placeholder*='سبب الغياب']").fill("اختبار ملف غير مدعوم");
    await nextBtn.click();

    // Upload an unsupported .exe file
    const fileInput = page.locator("input[type='file'][multiple]");
    await fileInput.setInputFiles([
      {
        name: "unsupported_executable.exe",
        mimeType: "application/x-msdownload",
        buffer: Buffer.from("MZ mock executable binary"),
      },
    ]);

    // Verify rejection message
    await expect(page.getByText(/غير مدعوم/)).toBeVisible();
  });

  test("4. Mobile responsive layout maintains accessibility and visibility", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/procedures/absence?tab=manual");
    await page.waitForLoadState("networkidle");

    // Verify page renders cleanly without horizontal scroll
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Verify wizard is visible and touch targets are interactive
    const headerText = page.getByText("تسجيل إجراء مساءلة غياب جديد");
    await expect(headerText).toBeVisible();
  });
});
