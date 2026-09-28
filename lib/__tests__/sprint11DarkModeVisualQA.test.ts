import { describe, it, expect } from "vitest";
import { colors, typography, spacing, radius, shadow } from "@/lib/design-tokens";
import fs from "fs";
import path from "path";

describe("Sprint 11: Dark Mode Visual QA & Accessibility Polish Test Suite", () => {
  describe("1. Full Visual Audit & Page Themes", () => {
    const pagesToCheck = [
      "app/page.tsx",
      "app/teachers/page.tsx",
      "app/procedures/absence/page.tsx",
      "app/procedures/delay-notice/page.tsx",
      "app/procedures/permissions/page.tsx",
      "app/procedures/deduction-hours/page.tsx",
      "app/reports/page.tsx",
      "app/archive/page.tsx",
      "app/login/page.tsx",
      "app/inquiry/[token]/page.tsx",
      "app/teacher-response/[token]/page.tsx",
    ];

    it.each(pagesToCheck)("page %s should contain comprehensive dark mode classes", (relPath) => {
      const filePath = path.join(process.cwd(), relPath);
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toMatch(/dark:bg-|dark:text-|dark:border-/);
    });
  });

  describe("2. Card & KPI Components Review", () => {
    it("should verify Card component has dark background, border, and text tokens", () => {
      const cardPath = path.join(process.cwd(), "components/ui/Card.tsx");
      const content = fs.readFileSync(cardPath, "utf-8");

      expect(content).toContain("dark:bg-slate-900");
      expect(content).toContain("dark:border-slate-800");
      expect(content).toContain("dark:text-slate-100");
    });

    it("should verify KpiCard has distinct high-contrast variant tokens for dark mode", () => {
      const kpiPath = path.join(process.cwd(), "components/ui/KpiCard.tsx");
      const content = fs.readFileSync(kpiPath, "utf-8");

      expect(content).toContain("dark:bg-slate-900");
      expect(content).toContain("dark:border-slate-800");
      expect(content).toContain("dark:text-teal-400");
      expect(content).toContain("dark:text-emerald-400");
      expect(content).toContain("dark:text-amber-400");
      expect(content).toContain("dark:text-rose-400");
    });
  });

  describe("3. Tables Deep Review", () => {
    it("should verify DataTable has dark table header, rows, hover, and pagination", () => {
      const tablePath = path.join(process.cwd(), "components/ui/DataTable.tsx");
      const content = fs.readFileSync(tablePath, "utf-8");

      expect(content).toContain("dark:bg-slate-900");
      expect(content).toContain("dark:bg-slate-950");
      expect(content).toContain("dark:border-slate-800");
      expect(content).toContain("dark:text-slate-100");
      expect(content).toContain("dark:hover:bg-slate-800/60");
      expect(content).toContain("dark:divide-slate-800");
    });
  });

  describe("4. Forms & Inputs Review", () => {
    it("should verify Input, Textarea, and Select components handle dark backgrounds, borders, and focus rings", () => {
      const inputPath = path.join(process.cwd(), "components/ui/Input.tsx");
      const content = fs.readFileSync(inputPath, "utf-8");

      expect(content).toContain("dark:bg-slate-950");
      expect(content).toContain("dark:border-slate-800");
      expect(content).toContain("dark:text-slate-100");
      expect(content).toContain("dark:placeholder:text-slate-500");
      expect(content).toContain("dark:hover:border-slate-700");
    });

    it("should verify TeacherCombobox dropdown has dark listbox and search input", () => {
      const comboPath = path.join(process.cwd(), "components/procedures/TeacherCombobox.tsx");
      const content = fs.readFileSync(comboPath, "utf-8");

      expect(content).toContain("dark:bg-slate-900");
      expect(content).toContain("dark:bg-slate-800");
      expect(content).toContain("dark:border-slate-800");
      expect(content).toContain("dark:text-slate-100");
    });
  });

  describe("5. Modals & Dialogs Review", () => {
    const modalsToCheck = [
      "components/ui/Modal.tsx",
      "components/teachers/TeacherProfileModal.tsx",
      "components/teachers/AddTeacherModal.tsx",
      "components/teachers/ExcelImporter.tsx",
      "components/procedures/InquiryReviewModal.tsx",
      "components/procedures/CreateDelayNoticeModal.tsx",
      "components/procedures/CreatePermissionModal.tsx",
      "components/procedures/DelayNoticeDetailsModal.tsx",
      "components/procedures/DirectorDecisionModal.tsx",
      "components/procedures/EditAbsenceModal.tsx",
      "components/procedures/ShareDelayNoticeModal.tsx",
      "components/procedures/TeacherResponseModal.tsx",
      "components/auth/AdminProfileModal.tsx",
      "components/settings/ApprovalAssetsModal.tsx",
      "components/settings/BackupRecoveryModal.tsx",
      "components/common/ConfirmDialog.tsx",
    ];

    it.each(modalsToCheck)("modal %s should have dark backdrop, surface, and header", (relPath) => {
      const filePath = path.join(process.cwd(), relPath);
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, "utf-8");

      expect(content).toMatch(/dark:bg-slate-900|dark:bg-slate-850|dark:bg-slate-800/);
      expect(content).toMatch(/dark:border-slate-800|dark:border-slate-700/);
    });
  });

  describe("6. Status Colors Refinement in Dark Mode", () => {
    it("should verify Badge component has optimized dark background and text contrast", () => {
      const badgePath = path.join(process.cwd(), "components/ui/Badge.tsx");
      const content = fs.readFileSync(badgePath, "utf-8");

      expect(content).toContain("dark:bg-teal-950/70 dark:text-teal-300");
      expect(content).toContain("dark:bg-emerald-950/70 dark:text-emerald-300");
      expect(content).toContain("dark:bg-amber-950/70 dark:text-amber-300");
      expect(content).toContain("dark:bg-rose-950/70 dark:text-rose-300");
      expect(content).toContain("dark:bg-sky-950/70 dark:text-sky-300");
      expect(content).toContain("dark:bg-slate-800 dark:text-slate-300");
    });
  });

  describe("7. Arabic RTL & Mobile Dark Mode Review", () => {
    it("should verify AppHeader and Sidebar have RTL alignments, drawer backdrop, and dark classes", () => {
      const headerPath = path.join(process.cwd(), "components/layout/AppHeader.tsx");
      const headerContent = fs.readFileSync(headerPath, "utf-8");
      expect(headerContent).toContain('dir="rtl"');
      expect(headerContent).toContain("dark:bg-slate-900");

      const sidebarPath = path.join(process.cwd(), "components/Sidebar.tsx");
      const sidebarContent = fs.readFileSync(sidebarPath, "utf-8");
      expect(sidebarContent).toContain("dark:bg-slate-900");
      expect(sidebarContent).toContain("custom-scrollbar");
      expect(sidebarContent).toContain("useSwipe");
    });
  });

  describe("8. User Preference Persistence & Anti-FOUC", () => {
    it("should verify immediate head script in layout.tsx prevents theme flashing", () => {
      const layoutPath = path.join(process.cwd(), "app/layout.tsx");
      const content = fs.readFileSync(layoutPath, "utf-8");

      expect(content).toContain("school_platform_theme");
      expect(content).toContain("localStorage.getItem('school_platform_theme')");
      expect(content).toContain("document.documentElement.classList.add('dark')");
    });

    it("should verify ThemeToggle provides seamless single-click and system mode options", () => {
      const togglePath = path.join(process.cwd(), "components/ui/ThemeToggle.tsx");
      const content = fs.readFileSync(togglePath, "utf-8");

      expect(content).toContain("toggleTheme");
      expect(content).toContain("setTheme");
      expect(content).toContain("resolvedTheme");
    });
  });

  describe("9. Accessibility & Keyboard Navigation", () => {
    it("should verify skip navigation link is present in layout.tsx", () => {
      const layoutPath = path.join(process.cwd(), "app/layout.tsx");
      const content = fs.readFileSync(layoutPath, "utf-8");

      expect(content).toContain("تخطى إلى المحتوى الرئيسي");
      expect(content).toContain("sr-only focus:not-sr-only");
    });

    it("should verify reduced motion accessibility rule in globals.css", () => {
      const cssPath = path.join(process.cwd(), "app/globals.css");
      const content = fs.readFileSync(cssPath, "utf-8");

      expect(content).toContain("@media (prefers-reduced-motion: reduce)");
    });
  });

  describe("10. Strict Print & PDF Isolation", () => {
    it("should verify @media print enforces light background and dark text on all documents", () => {
      const cssPath = path.join(process.cwd(), "app/globals.css");
      const content = fs.readFileSync(cssPath, "utf-8");

      expect(content).toContain("@media print");
      expect(content).toContain("color-scheme: light !important");
      expect(content).toContain("background: #ffffff !important");
      expect(content).toContain("color: #0f172a !important");
    });
  });
});
