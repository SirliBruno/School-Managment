import { test, expect } from "@playwright/test";

const SEED_TEACHER = {
  id: "t-e2e-101",
  name: "سارة محمد سليمان الطلحي",
  fullName: "سارة محمد سليمان الطلحي",
  nationalId: "1092332483",
  jobNumber: "1092332483",
  mobile: "0501234567",
  jobTitle: "معلمة",
  specialty: "حاسب آلي",
  totalAbsences: 1,
};

const SEED_ACTIVE_INQUIRY = {
  id: "inq-e2e-active",
  teacherId: "t-e2e-101",
  teacherName: "سارة محمد سليمان الطلحي",
  jobNumber: "1092332483",
  specialty: "حاسب آلي",
  mobile: "0501234567",
  absenceDate: "2026-10-03",
  token: "tok-e2e-valid-7days",
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  status: "pending",
  createdAt: new Date().toISOString(),
};

const SEED_EXPIRED_INQUIRY = {
  id: "inq-e2e-expired",
  teacherId: "t-e2e-101",
  teacherName: "سارة محمد سليمان الطلحي",
  jobNumber: "1092332483",
  specialty: "حاسب آلي",
  mobile: "0501234567",
  absenceDate: "2026-09-20",
  token: "tok-e2e-expired-link",
  expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // expired
  status: "pending",
  createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
};

const SEED_ADMIN_INQUIRY = {
  id: "adm-e2e-inq",
  inquiryNumber: "ADM-2026-01",
  teacherId: "t-e2e-101",
  teacherName: "سارة محمد سليمان الطلحي",
  nationalId: "1092332483",
  jobTitle: "معلمة",
  specialty: "حاسب آلي",
  inquiryType: "التأخير عن دخول الحصص",
  incidentDate: "2026-10-03",
  description: "التأخر عن الحصة الثانية لمدة 10 دقائق",
  status: "pending_teacher",
  token: "tok-e2e-adm-7days",
  tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
};

const SEED_EXPIRED_DELAY_NOTICE = {
  id: "del-e2e-expired",
  noticeNumber: "DEL-2026-01",
  teacherId: "t-e2e-101",
  teacherName: "سارة محمد سليمان الطلحي",
  jobNumber: "1092332483",
  specialty: "حاسب آلي",
  noticeDate: "2026-09-20",
  date: "2026-09-20",
  violationDelayStart: true,
  delayStartTime: "07:45",
  status: "pending_teacher" as const,
  shareToken: "tok-e2e-expired-delay",
  tokenExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
};

test.describe("E2E Test Suite — 7-Day Link Expiration & Public Portals Verification", () => {
  test.beforeEach(async ({ context, page }) => {
    // Intercept Supabase REST requests with explicit responses
    await page.route("**/rest/v1/**", async (route) => {
      const url = route.request().url();

      if (url.includes("delay_notices") && url.includes(SEED_EXPIRED_DELAY_NOTICE.shareToken)) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: SEED_EXPIRED_DELAY_NOTICE.id,
            notice_number: SEED_EXPIRED_DELAY_NOTICE.noticeNumber,
            teacher_id: SEED_EXPIRED_DELAY_NOTICE.teacherId,
            teacher_name: SEED_EXPIRED_DELAY_NOTICE.teacherName,
            job_number: SEED_EXPIRED_DELAY_NOTICE.jobNumber,
            specialty: SEED_EXPIRED_DELAY_NOTICE.specialty,
            notice_date: SEED_EXPIRED_DELAY_NOTICE.noticeDate,
            violation_delay_start: true,
            status: "pending_teacher",
            share_token: SEED_EXPIRED_DELAY_NOTICE.shareToken,
            token_expires_at: SEED_EXPIRED_DELAY_NOTICE.tokenExpiresAt,
            created_at: SEED_EXPIRED_DELAY_NOTICE.createdAt,
          }),
        });
      }

      if (url.includes("absence_inquiries") && url.includes(SEED_ACTIVE_INQUIRY.token)) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: SEED_ACTIVE_INQUIRY.id,
            teacher_id: SEED_ACTIVE_INQUIRY.teacherId,
            teacher_name: SEED_ACTIVE_INQUIRY.teacherName,
            job_number: SEED_ACTIVE_INQUIRY.jobNumber,
            specialty: SEED_ACTIVE_INQUIRY.specialty,
            absence_date: SEED_ACTIVE_INQUIRY.absenceDate,
            status: "pending",
            token: SEED_ACTIVE_INQUIRY.token,
            expires_at: SEED_ACTIVE_INQUIRY.expiresAt,
            created_at: SEED_ACTIVE_INQUIRY.createdAt,
          }),
        });
      }

      if (url.includes("absence_inquiries") && url.includes(SEED_EXPIRED_INQUIRY.token)) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: SEED_EXPIRED_INQUIRY.id,
            teacher_id: SEED_EXPIRED_INQUIRY.teacherId,
            teacher_name: SEED_EXPIRED_INQUIRY.teacherName,
            job_number: SEED_EXPIRED_INQUIRY.jobNumber,
            specialty: SEED_EXPIRED_INQUIRY.specialty,
            absence_date: SEED_EXPIRED_INQUIRY.absenceDate,
            status: "pending",
            token: SEED_EXPIRED_INQUIRY.token,
            expires_at: SEED_EXPIRED_INQUIRY.expiresAt,
            created_at: SEED_EXPIRED_INQUIRY.createdAt,
          }),
        });
      }

      if (url.includes("administrative_inquiries") && url.includes(SEED_ADMIN_INQUIRY.token)) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: SEED_ADMIN_INQUIRY.id,
            inquiry_number: SEED_ADMIN_INQUIRY.inquiryNumber,
            teacher_id: SEED_ADMIN_INQUIRY.teacherId,
            teacher_name: SEED_ADMIN_INQUIRY.teacherName,
            national_id: SEED_ADMIN_INQUIRY.nationalId,
            job_title: SEED_ADMIN_INQUIRY.jobTitle,
            specialty: SEED_ADMIN_INQUIRY.specialty,
            inquiry_type: SEED_ADMIN_INQUIRY.inquiryType,
            incident_date: SEED_ADMIN_INQUIRY.incidentDate,
            description: SEED_ADMIN_INQUIRY.description,
            status: "pending_teacher",
            token: SEED_ADMIN_INQUIRY.token,
            token_expires_at: SEED_ADMIN_INQUIRY.tokenExpiresAt,
            created_at: SEED_ADMIN_INQUIRY.createdAt,
          }),
        });
      }

      // Default empty list
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

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

    await context.addInitScript(
      ({ teacher, activeInq, expiredInq, adminInq, delayNotice }) => {
        window.localStorage.setItem(
          "school_admin_teachers_v1",
          JSON.stringify([teacher])
        );
        window.localStorage.setItem(
          "school_admin_inquiries_v1",
          JSON.stringify([activeInq, expiredInq])
        );
        window.localStorage.setItem(
          "school_admin_administrative_inquiries_v1",
          JSON.stringify([adminInq])
        );
        window.localStorage.setItem(
          "school_admin_delay_notices_v1",
          JSON.stringify([delayNotice])
        );
      },
      {
        teacher: SEED_TEACHER,
        activeInq: SEED_ACTIVE_INQUIRY,
        expiredInq: SEED_EXPIRED_INQUIRY,
        adminInq: SEED_ADMIN_INQUIRY,
        delayNotice: SEED_EXPIRED_DELAY_NOTICE,
      }
    );
  });

  test("1. Absence Inquiry Portal: Valid 7-day token opens form with active expiration badge", async ({
    page,
  }) => {
    await page.goto(`/inquiry/${SEED_ACTIVE_INQUIRY.token}`);

    // Verify teacher details & form visible
    await expect(page.getByText(/سار[ةه] محمد سليمان الطلحي/).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("نموذج إفادة ومساءلة غياب")).toBeVisible();

    // Verify 7-day countdown badge presence
    const validityBadge = page.locator("text=/مهلة تقديم الإفادة \\(7 أيام\\)/");
    await expect(validityBadge.first()).toBeVisible();

    // Verify submission button is ready and enabled
    const submitBtn = page.getByRole("button", {
      name: "إرسال الإفادة الإدارية",
    });
    await expect(submitBtn).toBeVisible();
  });

  test("2. Absence Inquiry Portal: Expired token displays 7-day expired screen and blocks submission", async ({
    page,
  }) => {
    await page.goto(`/inquiry/${SEED_EXPIRED_INQUIRY.token}`);

    // Verify expired screen heading and explanation
    await expect(page.getByText("انتهت صلاحية الرابط")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/7 أيام كاملة من تاريخ الإرسال/)).toBeVisible();

    // Verify timestamps are rendered
    await expect(page.getByText("تاريخ ووقت الإرسال:")).toBeVisible();
    await expect(page.getByText("تاريخ ووقت الانتهاء:")).toBeVisible();

    // Verify form input is NOT present
    await expect(
      page.locator("textarea[placeholder*='اكتبي تفاصيل ومبررات']")
    ).toHaveCount(0);
  });

  test("3. Teacher Response Portal: Expired delay notice displays clean expired notice", async ({
    page,
  }) => {
    await page.goto(`/teacher-response/${SEED_EXPIRED_DELAY_NOTICE.shareToken}`);

    await expect(page.getByText("انتهت صلاحية هذا الرابط")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/7 أيام كاملة/)).toBeVisible();
  });

  test("4. Administrative Inquiry Portal: Displays 7-day (168 hours) official deadline banner", async ({
    page,
  }) => {
    await page.goto(`/administrative-inquiry/${SEED_ADMIN_INQUIRY.token}`);

    await expect(page.getByText(/سار[ةه] محمد سليمان الطلحي/).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("التأخير عن دخول الحصص")).toBeVisible();
    await expect(page.getByText(/7 أيام \(168 ساعة\)/)).toBeVisible();
  });

  test("5. Administrative Inquiries Dashboard: Shows 7-day KPI card and badges", async ({
    page,
  }) => {
    await page.goto("/procedures/administrative-inquiries");

    await expect(page.getByText("إجمالي المسائلات")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("تجاوزت مهلة 7 أيام")).toBeVisible();
    await expect(page.getByText("48 ساعة")).toHaveCount(0);
  });

  test("6. Mobile Responsive Viewport (390x844): Public Inquiry portal renders flawlessly", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/inquiry/${SEED_ACTIVE_INQUIRY.token}`);

    await expect(page.getByText("نموذج إفادة ومساءلة غياب")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/سار[ةه] محمد سليمان الطلحي/).first()).toBeVisible();
  });

  test("7. Mobile Responsive Viewport (375x812): Expired screen renders cleanly on smaller phones", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/inquiry/${SEED_EXPIRED_INQUIRY.token}`);

    await expect(page.getByText("انتهت صلاحية الرابط")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("تاريخ ووقت الانتهاء:")).toBeVisible();
  });
});
