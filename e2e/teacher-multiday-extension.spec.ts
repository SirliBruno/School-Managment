import { test, expect } from "@playwright/test";

const SEED_TEACHER = {
  id: "t-e2e-multiday",
  name: "نورة علي القحطاني",
  fullName: "نورة علي القحطاني",
  nationalId: "1098765432",
  jobNumber: "1098765432",
  mobile: "0559988776",
  jobTitle: "معلمة",
  specialty: "رياضيات",
  totalAbsences: 1,
};

const SEED_INQUIRY = {
  id: "inq-e2e-multiday",
  teacherId: "t-e2e-multiday",
  teacherName: "نورة علي القحطاني",
  jobNumber: "1098765432",
  specialty: "رياضيات",
  mobile: "0559988776",
  absenceDate: "2026-10-11", // Sunday
  token: "tok-e2e-multiday-test",
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  status: "pending",
  createdAt: new Date().toISOString(),
};

test.describe("Teacher Multi-Day Absence Extension E2E Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Mock Supabase REST routes for deterministic testing
    await page.route("**/rest/v1/**", async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes("absence_inquiries") && url.includes(SEED_INQUIRY.token)) {
        if (method === "GET") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: SEED_INQUIRY.id,
              teacher_id: SEED_INQUIRY.teacherId,
              teacher_name: SEED_INQUIRY.teacherName,
              job_number: SEED_INQUIRY.jobNumber,
              specialty: SEED_INQUIRY.specialty,
              absence_date: SEED_INQUIRY.absenceDate,
              status: "pending",
              token: SEED_INQUIRY.token,
              expires_at: SEED_INQUIRY.expiresAt,
              created_at: SEED_INQUIRY.createdAt,
            }),
          });
        }
        if (method === "PATCH") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: SEED_INQUIRY.id,
              status: "pending_review",
            }),
          });
        }
      }

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    // Populate localStorage for platform context
    await page.addInitScript(
      ({ teacher, inq }) => {
        localStorage.setItem("school_teachers", JSON.stringify([teacher]));
        localStorage.setItem("school_admin_inquiries_v1", JSON.stringify([inq]));
      },
      { teacher: SEED_TEACHER, inq: SEED_INQUIRY }
    );
  });

  test("should render the multi-day switch and extend absence days correctly", async ({ page }) => {
    await page.goto(`/inquiry/${SEED_INQUIRY.token}`);

    // Verify teacher details rendered
    await expect(page.locator("body")).toContainText("نورة علي القحطاني");
    await expect(page.locator("body")).toContainText("2026-10-11");

    // Verify multi-day extension section exists
    const switchBtn = page.getByRole("switch");
    await expect(switchBtn).toBeVisible();

    // Toggle the switch
    await switchBtn.click();

    // Verify duration preset buttons appear
    const threeDaysBtn = page.getByRole("button", { name: "3 أيام" });
    await expect(threeDaysBtn).toBeVisible();

    // Click 3 days
    await threeDaysBtn.click();

    // Verify duration calculation and banner reflects 3 days from 2026-10-11 to 2026-10-13
    await expect(page.locator("body")).toContainText("ستوثق المساءلة لفترة (3 أيام) من 2026-10-11 إلى 2026-10-13");

    // Fill the required reason field
    const reasonInput = page.locator("textarea");
    await reasonInput.fill("إجازة مرضية موثقة عبر منصة صحتي تغطي 3 أيام متصلة.");

    // Verify end-date input reflects 2026-10-13
    const endDateInput = page.locator("input[type='date']");
    await expect(endDateInput).toHaveValue("2026-10-13");
  });
});
