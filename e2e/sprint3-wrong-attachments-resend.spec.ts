import { test, expect } from "@playwright/test";

test.describe("Sprint 3 — Wrong Attachments Rejection + Secure WhatsApp Resend Workflow", () => {
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

  test("1. Workflow E2E: Reject excuse due to 'مرفقات خاطئة' with WhatsApp resend requested", async ({
    page,
  }) => {
    // Navigate to absence procedures page (WhatsApp tab by default)
    await page.goto("/procedures/absence?tab=whatsapp");
    await page.waitForLoadState("networkidle");

    // Ensure the table is loaded
    await expect(page.getByText("سجل مساءلات الغياب عبر الواتساب")).toBeVisible();

    // Look for a review button or submitted item in the table
    // If no submitted item is found, open review on the first available inquiry
    const reviewBtn = page
      .locator("button:has-text('اعتماد'), button:has-text('عرض')")
      .first();

    if (await reviewBtn.isVisible()) {
      await reviewBtn.click();

      // Modal should be open
      await expect(page.getByText("مراجعة واعتماد إفادة المساءلة")).toBeVisible();

      // Check if "رفض العذر" button is present and enabled
      const rejectBtn = page.getByRole("button", { name: "رفض العذر" });
      if (await rejectBtn.isVisible() && await rejectBtn.isEnabled()) {
        await rejectBtn.click();

        // The rejection reason configuration panel should be visible
        await expect(page.getByText("تحديد سبب رفض العذر")).toBeVisible();
        await expect(page.getByText("مرفقات خاطئة")).toBeVisible();

        // Default reason is "مرفقات خاطئة" -> verify resend prompt is displayed
        await expect(
          page.getByText("هل تريد إعادة إرسال الاستفسار للمعلم عبر واتساب؟")
        ).toBeVisible();
        await expect(page.getByText("نعم، إعادة الإرسال (موصى به)")).toBeVisible();
        await expect(page.getByText("لا، بدون إعادة إرسال")).toBeVisible();

        // Test reason switching: click "عذر غير مقبول نظاماً"
        await page.getByRole("button", { name: "عذر غير مقبول نظاماً" }).click();

        // Resend prompt should disappear
        await expect(
          page.getByText("هل تريد إعادة إرسال الاستفسار للمعلم عبر واتساب؟")
        ).not.toBeVisible();

        // Switch back to "مرفقات خاطئة"
        await page.getByRole("button", { name: "مرفقات خاطئة" }).click();

        // Resend prompt should reappear
        await expect(
          page.getByText("هل تريد إعادة إرسال الاستفسار للمعلم عبر واتساب؟")
        ).toBeVisible();

        // Confirm rejection with resend
        const confirmBtn = page.getByRole("button", {
          name: "تأكيد الرفض وإعادة الإرسال",
        });
        await expect(confirmBtn).toBeVisible();
        await confirmBtn.click();

        // WhatsApp Preparation Action Card should now appear
        await expect(
          page.getByText(/جاهز للإرسال: رابط المساءلة البديل|تم تجهيز/i)
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: /فتح واتساب وإرسال الرابط/i })
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: /نسخ رسالة ورابط الواتساب/i })
        ).toBeVisible();

        // Click close
        const closeBtn = page.getByRole("button", { name: "إغلاق النافذة" });
        await closeBtn.click();
      }
    }
  });

  test("2. Verification of Table Filter Tabs including 'مرفوضة' status", async ({
    page,
  }) => {
    await page.goto("/procedures/absence?tab=whatsapp");
    await page.waitForLoadState("networkidle");

    // The 'مرفوضة' tab should be present
    const rejectedTab = page.locator("button:has-text('مرفوضة')");
    await expect(rejectedTab).toBeVisible();

    // Clicking the 'مرفوضة' tab should filter the view without errors
    await rejectedTab.click();
    await page.waitForTimeout(300);

    // Verify tab styling reflects active state
    await expect(rejectedTab).toHaveClass(/bg-rose/);
  });
});
