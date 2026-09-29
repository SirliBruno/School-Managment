import { test, expect } from "@playwright/test";

test.describe("تدقيق وتكامل سلامة البيانات الشامل (E2E Full Data Lifecycle & Persistence)", () => {
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

  test("1. سيناريو دورة البيانات الكاملة وتكامل الصفحات الإدارية", async ({
    page,
  }) => {
    // 1. Visit Teachers List
    await page.goto("/teachers");
    await expect(page.locator("h1:has-text('المعلمات'), h1:has-text('سجل المعلمات')").first()).toBeVisible({ timeout: 15000 });

    // 2. Visit Administrative Inquiries
    await page.goto("/procedures/administrative-inquiries");
    await expect(page.locator("h1:has-text('المسائلات'), h1:has-text('المساءلات'), h1:has-text('سجل المسائلات')").first()).toBeVisible({ timeout: 15000 });

    // 3. Visit Absence Procedures
    await page.goto("/procedures/absence");
    await expect(page.locator("h1:has-text('مساءلة غياب'), h1:has-text('الغياب')").first()).toBeVisible({ timeout: 15000 });

    // 4. Visit Delay Notices
    await page.goto("/procedures/delay-notice");
    await expect(page.locator("h1:has-text('تأخر'), h1:has-text('التأخر')").first()).toBeVisible({ timeout: 15000 });

    // 5. Visit Deduction Procedures
    await page.goto("/procedures/deduction-hours");
    await expect(page.locator("h1:has-text('حسم'), h1:has-text('قرار حسم')").first()).toBeVisible({ timeout: 15000 });

    // 6. Visit Reports Engine
    await page.goto("/reports");
    await expect(page.locator("h1:has-text('التقارير'), h1:has-text('مركز التقارير')").first()).toBeVisible({ timeout: 15000 });

    // 7. Visit Archive Center
    await page.goto("/archive");
    await expect(page.locator("h1:has-text('الأرشيف'), h1:has-text('مركز الأرشيف')").first()).toBeVisible({ timeout: 15000 });
  });

  test("2. التحقق من ثبات البيانات بعد إعادة التحميل السريع (Hard Refresh Persistence)", async ({
    page,
  }) => {
    const mockToken = "persist-tok-" + Date.now();

    await page.addInitScript((tok) => {
      const sampleInquiry = {
        id: "persist-inq-1",
        inquiryNumber: "ADM-777",
        teacherId: "teacher-persisted",
        teacherName: "ريم عبدالله القحطاني",
        nationalId: "1099887766",
        jobTitle: "معلم ممارس",
        specialty: "علوم",
        inquiryType: "التأخير عن دخول الحصص",
        incidentDate: "2026-09-29",
        description: "اختبار ثبات البيانات عند تحديث الصفحة",
        status: "pending_director",
        token: tok,
        tokenExpiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        teacherResponse: "إفادة اختبارية لسلامة الذاكرة والتزامن",
        responseDate: "2026-09-29",
        createdAt: new Date().toISOString(),
        isArchived: false,
      };

      const existing = localStorage.getItem("school_admin_administrative_inquiries_v1");
      const list = existing ? JSON.parse(existing) : [];
      list.unshift(sampleInquiry);
      localStorage.setItem("school_admin_administrative_inquiries_v1", JSON.stringify(list));
    }, mockToken);

    await page.goto("/procedures/administrative-inquiries");
    await expect(page.locator("td:has-text('ريم عبدالله القحطاني'), div:has-text('ريم عبدالله القحطاني')").first()).toBeVisible({ timeout: 15000 });

    // Perform hard reload
    await page.reload();

    // Verify data remains perfectly intact
    await expect(page.locator("td:has-text('ريم عبدالله القحطاني'), div:has-text('ريم عبدالله القحطاني')").first()).toBeVisible({ timeout: 15000 });
  });

  test("3. سيناريو دورة حياة المرفقات بعد الأرشفة والاستعادة (Attachment Loss After Archive Restore Prevention)", async ({
    page,
  }) => {
    const testTeacherName = "ساره محمد سليمان الطلحي";
    const testDataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    // Attach sample absence record with dataUrl
    await page.addInitScript(
      ({ teacherName, dataUrl }) => {
        const sampleAbsence = {
          id: "abs-test-lifecycle-1",
          teacherId: "teacher-sara",
          teacherName: teacherName,
          nationalId: "1092332483",
          jobNumber: "1092332483",
          specialty: "لغة عربية",
          date: "2026-09-29",
          type: "اضطراري",
          reason: "ظرف عائلي طارئ",
          attachmentUrl: dataUrl,
          timestamp: new Date().toISOString(),
          isArchived: false,
        };

        const existingAbs = localStorage.getItem("school_admin_absences_v1");
        const list = existingAbs ? JSON.parse(existingAbs) : [];
        const filtered = list.filter((r: any) => r.teacherName !== teacherName);
        filtered.unshift(sampleAbsence);
        localStorage.setItem("school_admin_absences_v1", JSON.stringify(filtered));
      },
      { teacherName: testTeacherName, dataUrl: testDataUrl }
    );

    // 1. Visit Absence Procedures & Switch to Manual/Direct Tab
    await page.goto("/procedures/absence");
    await page.click("button:has-text('التسجيل والتوثيق المباشر')");

    // 2. Locate row for ساره محمد سليمان الطلحي
    const teacherRow = page.locator(`tr:has-text('${testTeacherName}')`).first();
    await expect(teacherRow).toBeVisible({ timeout: 15000 });

    const viewButton = teacherRow.locator("button:has-text('عرض')");
    await expect(viewButton).toBeVisible();
    await viewButton.click();

    // Verify Lightbox Modal opened
    await expect(page.locator("div[role='dialog']:has-text('مرفق غياب المعلمة')").first()).toBeVisible({ timeout: 10000 });
    await page.click("button[aria-label='إغلاق المعاينة']");

    // 3. Archive the record via ActionMenu
    const actionMenuButton = teacherRow.locator("button[aria-label='إجراءات الصف']");
    await actionMenuButton.click();
    await page.click("button:has-text('نقل للأرشيف الإداري')");
    await page.click("button:has-text('نقل إلى الأرشيف')");

    // 4. Visit Archive and Restore
    await page.goto("/archive");
    await page.click("button:has-text('سجلات الغياب')");
    const archivedRow = page.locator(`div:has-text('${testTeacherName}')`).first();
    await expect(archivedRow).toBeVisible({ timeout: 15000 });

    const restoreButton = page.locator(`button:has-text('استعادة')`).first();
    await restoreButton.click();

    // 5. Return to Absence Procedures & Check Restored Attachment
    await page.goto("/procedures/absence");
    await page.click("button:has-text('التسجيل والتوثيق المباشر')");

    const restoredTeacherRow = page.locator(`tr:has-text('${testTeacherName}')`).first();
    await expect(restoredTeacherRow).toBeVisible({ timeout: 15000 });

    const restoredViewButton = restoredTeacherRow.locator("button:has-text('عرض')");
    await expect(restoredViewButton).toBeVisible();
    await restoredViewButton.click();

    // Verify Lightbox opens without 404
    await expect(page.locator("div[role='dialog']:has-text('مرفق غياب المعلمة')").first()).toBeVisible({ timeout: 10000 });
    await page.click("button[aria-label='إغلاق المعاينة']");

    // 6. Hard refresh and verify it still works
    await page.reload();
    await page.click("button:has-text('التسجيل والتوثيق المباشر')");
    const persistedTeacherRow = page.locator(`tr:has-text('${testTeacherName}')`).first();
    await expect(persistedTeacherRow).toBeVisible({ timeout: 15000 });
    const persistedViewButton = persistedTeacherRow.locator("button:has-text('عرض')");
    await persistedViewButton.click();
    await expect(page.locator("div[role='dialog']:has-text('مرفق غياب المعلمة')").first()).toBeVisible({ timeout: 10000 });
    await page.click("button[aria-label='إغلاق المعاينة']");
  });
});

