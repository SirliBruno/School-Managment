import { test, expect } from "@playwright/test";

test.describe("قسم المسائلات الإدارية - دورة العمل الكاملة والمعاينة", () => {
  test.beforeEach(async ({ context }) => {
    // Set cookies for authentication and e2e mock session
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

  test("1. عرض صفحة المسائلات الإدارية والتحقق من الإحصائيات والأزرار", async ({ page }) => {
    await page.goto("/procedures/administrative-inquiries");

    // Header & Create Button
    const headerTitle = page.locator("h1:has-text('المسائلات الإدارية')");
    await expect(headerTitle).toBeVisible({ timeout: 15000 });

    const createBtn = page.getByRole("button", { name: /إنشاء مساءلة/ });
    await expect(createBtn).toBeVisible({ timeout: 10000 });

    // Stats cards check
    await expect(page.getByText("إجمالي المسائلات")).toBeVisible();
    await expect(page.getByText(/بانتظار إفادة المعلمة/)).toBeVisible();
    await expect(page.getByText(/بانتظار قرار المديرة/)).toBeVisible();
  });

  test("2. فتح نموذج إنشاء مساءلة جديدة وتعبئة البيانات", async ({ page }) => {
    await page.goto("/procedures/administrative-inquiries");

    await expect(page.locator("h1:has-text('المسائلات الإدارية')")).toBeVisible({ timeout: 15000 });

    const createBtn = page.getByRole("button", { name: /إنشاء مساءلة/ });
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();

    // Modal check
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("إنشاء مساءلة إدارية جديدة")).toBeVisible();

    // Select Teacher (Combobox)
    const teacherInput = page.getByPlaceholder("ابحث بالاسم أو السجل المدني...");
    if (await teacherInput.isVisible()) {
      await teacherInput.click();
      const firstOption = page.locator("div[role='option'], li, .cursor-pointer").first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
      }
    }

    // Select Violation Type
    const typeSelect = page.locator("select").first();
    if (await typeSelect.isVisible()) {
      await typeSelect.selectOption({ index: 1 });
    }

    // Enter description
    const descTextarea = page.getByPlaceholder("اكتبي تفاصيل أو ملابسات الواقعة...");
    if (await descTextarea.isVisible()) {
      await descTextarea.fill("التأخر عن حضور الحصة الأولى لمدة 15 دقيقة دون إشعار مسبق.");
    }
  });

  test("3. التحقق من بوابة المعلمة العامة ومعاينة المرفقات التفاعلية", async ({ page }) => {
    const testToken = "test-e2e-token-" + Date.now();

    // Mock an inquiry in local storage before navigation
    await page.addInitScript((tok) => {
      const mockInquiry = {
        id: "mock-inq-1",
        inquiryNumber: "ADM-999",
        teacherId: "teacher-1",
        teacherName: "سارة محمد العتيبي",
        nationalId: "1098765432",
        jobTitle: "معلم ممارس",
        specialty: "رياضيات",
        inquiryType: "التأخير عن دخول الحصص",
        incidentDate: "2026-09-29",
        description: "تأخر غير مبرر عن الحصة الأولى",
        status: "pending_teacher",
        token: tok,
        tokenExpiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        isArchived: false,
      };

      const existing = localStorage.getItem("school_admin_administrative_inquiries_v1");
      const list = existing ? JSON.parse(existing) : [];
      list.unshift(mockInquiry);
      localStorage.setItem("school_admin_administrative_inquiries_v1", JSON.stringify(list));
    }, testToken);

    // Navigate to public unauthenticated teacher portal
    await page.goto(`/administrative-inquiry/${testToken}`);

    // Verify unauthenticated portal loaded
    await expect(page.getByText("مساءلة خطية إلكترونية")).toBeVisible();
    await expect(page.locator("strong:has-text('سارة محمد العتيبي')").first()).toBeVisible();
    await expect(page.getByText("التأخير عن دخول الحصص")).toBeVisible();

    // Fill Statement
    const responseField = page.getByPlaceholder("اكتبي مبررات وأسباب الواقعة المذكورة أعلاه بدقة ووضوح...");
    await responseField.fill("أفيدكم بأنه طرأ ظرف صحي طارئ في الصباح الباكر مع مراجعة المركز الصحي المعتمد.");

    // Legal pledge check
    const pledgeCheckbox = page.locator("input[type='checkbox']");
    await pledgeCheckbox.check();

    // Submit Response
    const submitBtn = page.getByRole("button", { name: "إرسال الإفادة رسميًا إلى إدارة المدرسة" });
    await submitBtn.click();

    // Verify confirmation screen
    await expect(page.getByText("تم استلام إفادتكِ الخطية بنجاح")).toBeVisible();
  });

  test("4. التحقق من مراجعة الإدارة ومعاينة المرفق عبر Lightbox واعتماد القرار", async ({ page }) => {
    const reviewInquiryId = "review-inq-" + Date.now();
    const sampleAttachmentDataUrl =
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><rect width='200' height='200' fill='%234338ca'/><text x='50%25' y='50%25' fill='white' dominant-baseline='middle' text-anchor='middle' font-size='16'>تقرير طبي رسمي</text></svg>";

    // Inject inquiry that has a teacher response and attachment before navigation
    await page.addInitScript(
      ({ inqId, sampleAtt }) => {
        const mockInquiry = {
          id: inqId,
          inquiryNumber: "ADM-888",
          teacherId: "teacher-2",
          teacherName: "نورة خالد الدوسري",
          nationalId: "1087654321",
          jobTitle: "معلم متقدم",
          specialty: "لغة عربية",
          inquiryType: "الامتناع عن دخول حصص الانتظار",
          incidentDate: "2026-09-29",
          description: "الامتناع عن تغطية حصة انتظار مجدولة",
          status: "pending_director",
          token: "token-dir-review-" + inqId,
          tokenExpiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
          teacherResponse: "تم التكليف في وقت حصتي الأساسية بالمعمل وتم التنسيق مع الوكيلة.",
          responseDate: "2026-09-29",
          responseIp: "192.168.1.50",
          attachmentUrl: sampleAtt,
          createdAt: new Date().toISOString(),
          isArchived: false,
        };

        const existing = localStorage.getItem("school_admin_administrative_inquiries_v1");
        const list = existing ? JSON.parse(existing) : [];
        list.unshift(mockInquiry);
        localStorage.setItem("school_admin_administrative_inquiries_v1", JSON.stringify(list));
      },
      { inqId: reviewInquiryId, sampleAtt: sampleAttachmentDataUrl }
    );

    // Refresh page to load stored inquiry
    await page.goto("/procedures/administrative-inquiries");

    // Check table contains teacher
    await expect(page.getByText("نورة خالد الدوسري").first()).toBeVisible({ timeout: 15000 });

    // Click "مراجعة واعتماد" or table action button
    const reviewButton = page.locator(`button[title*="مراجعة"], button:has-text("مراجعة")`).first();
    await reviewButton.click();

    // Verify Review Modal opened
    await expect(page.getByText("مراجعة الإفادة واعتماد قرار الإدارة")).toBeVisible();
    await expect(page.getByText("تم التكليف في وقت حصتي الأساسية بالمعمل")).toBeVisible();

    // Verify Attachment Preview Section
    await expect(page.getByText("المرفق الداعم للإفادة")).toBeVisible();
    const previewBtn = page.getByRole("button", { name: "معاينة المرفق" }).first();
    await expect(previewBtn).toBeVisible();

    // Open Lightbox Viewer Modal
    await previewBtn.click();

    // Verify Lightbox Modal is open
    const lightboxModal = page.locator("div[role='dialog']").last();
    await expect(lightboxModal).toBeVisible();
    await expect(lightboxModal.getByText("مرفق مساءلة")).toBeVisible();

    // Close Lightbox Modal
    const closeLightboxBtn = lightboxModal.locator("button[aria-label='إغلاق المعاينة'], button:has-text('إغلاق المعاينة')").first();
    if (await closeLightboxBtn.isVisible()) {
      await closeLightboxBtn.click();
    }

    // Select "عذر مقبول"
    const acceptBtn = page.getByRole("button", { name: /عذر مقبول/i });
    await acceptBtn.click();

    // Fill notes
    const notesField = page.getByPlaceholder(/اكتبي توجيهات المديرة/);
    await notesField.fill("تم قبول العذر بعد التأكد من تكليف المعمل.");

    // Submit Director Decision
    const approveBtn = page.getByRole("button", { name: "اعتماد القرار رسميًا" });
    await approveBtn.click();

    // Verify modal closed
    await expect(page.getByText("مراجعة الإفادة واعتماد قرار الإدارة")).not.toBeVisible();
  });
});
