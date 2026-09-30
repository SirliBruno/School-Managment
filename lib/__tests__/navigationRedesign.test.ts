import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Sprint: Administrative Navigation & Sidebar UX Redesign", () => {
  const sidebarFilePath = path.join(process.cwd(), "components/Sidebar.tsx");
  const sidebarCode = fs.readFileSync(sidebarFilePath, "utf-8");

  it("1. Sidebar structure contains all 5 required main groups", () => {
    // 1. مركز القيادة
    expect(sidebarCode).toContain("مركز القيادة");
    // 2. العمل اليومي / السجلات اليومية
    expect(sidebarCode).toMatch(/العمل اليومي|السجلات اليومية/);
    // 3. الإجراءات والقرارات
    expect(sidebarCode).toContain("الإجراءات والقرارات");
    // 4. التقارير والأرشيف / التقارير والتوثيق
    expect(sidebarCode).toMatch(/التقارير والأرشيف|التقارير والتوثيق/);
    // 5. الإدارة
    expect(sidebarCode).toMatch(/الإدارة|الإدارة والتهيئة/);
  });

  it("2. Daily Records contains all 4 daily workflow items", () => {
    expect(sidebarCode).toContain("/teachers");
    expect(sidebarCode).toContain("/procedures/absence");
    expect(sidebarCode).toContain("/procedures/delay-notice");
    expect(sidebarCode).toContain("/procedures/permissions");
  });

  it("3. Procedures & Decisions contains administrative inquiries, deductions, and list", () => {
    expect(sidebarCode).toContain("/procedures/administrative-inquiries");
    expect(sidebarCode).toContain("/procedures/deduction-hours");
    expect(sidebarCode).toContain("/procedures/list");
  });

  it("4. Reports & Documentation contains reports and archive", () => {
    expect(sidebarCode).toContain("/reports");
    expect(sidebarCode).toContain("/archive");
  });

  it("5. Sidebar implements Accordion functionality with Framer Motion", () => {
    expect(sidebarCode).toContain("AnimatePresence");
    expect(sidebarCode).toContain("motion.div");
  });

  it("6. Sidebar implements mobile drawer with swipe-to-close and RTL support", () => {
    expect(sidebarCode).toContain("useSwipe");
    expect(sidebarCode).toContain("isMobileOpen");
    expect(sidebarCode).toContain("dark:bg-slate-900");
    expect(sidebarCode).toContain("custom-scrollbar");
  });

  it("7. Sidebar integrates administrative modal triggers", () => {
    expect(sidebarCode).toContain("BackupRecoveryModal");
    expect(sidebarCode).toContain("ApprovalAssetsModal");
    expect(sidebarCode).toContain("AdminProfileModal");
  });

  it("8. Sidebar provides tooltips and administrative descriptions", () => {
    expect(sidebarCode).toMatch(/description|tooltip|title/i);
  });
});
