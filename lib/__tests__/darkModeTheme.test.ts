import { describe, it, expect } from "vitest";
import { colors, typography, spacing, radius, shadow } from "@/lib/design-tokens";
import fs from "fs";
import path from "path";

describe("Dark Mode Design System & Theme Engine Test Suite", () => {
  describe("1. Design Tokens Consistency & Accessibility", () => {
    it("should export well-defined brand and semantic colors", () => {
      expect(colors.brand.primary).toBe("#0d9488");
      expect(colors.brand.accent).toBe("#137a85");
      expect(colors.semantic.success).toBe("#16a34a");
      expect(colors.semantic.error).toBe("#dc2626");
      expect(colors.semantic.warning).toBe("#f59e0b");
      expect(colors.semantic.info).toBe("#2563eb");
    });

    it("should include dark-mode responsive typography classes", () => {
      expect(typography.pageTitle).toContain("dark:text-slate-100");
      expect(typography.sectionTitle).toContain("dark:text-slate-100");
      expect(typography.cardTitle).toContain("dark:text-slate-100");
      expect(typography.kpiLabel).toContain("dark:text-slate-400");
      expect(typography.body).toContain("dark:text-slate-300");
    });

    it("should provide standardized layout radius and spacing tokens", () => {
      expect(radius.card).toBe("rounded-2xl");
      expect(radius.button).toBe("rounded-xl");
      expect(radius.modal).toBe("rounded-2xl");
      expect(spacing.pageContainer).toBeDefined();
    });
  });

  describe("2. Theme Engine & Context Verification", () => {
    it("should verify ThemeContext implementation and storage key", () => {
      const themeContextPath = path.join(process.cwd(), "context/ThemeContext.tsx");
      const content = fs.readFileSync(themeContextPath, "utf-8");

      expect(content).toContain('"school_platform_theme"');
      expect(content).toContain("ThemeProvider");
      expect(content).toContain("useTheme");
      expect(content).toContain("prefers-color-scheme: dark");
      expect(content).toContain('root.classList.add("dark")');
      expect(content).toContain('root.classList.remove("dark")');
    });

    it("should verify RootLayout hydration script initializes dark theme immediately", () => {
      const layoutPath = path.join(process.cwd(), "app/layout.tsx");
      const content = fs.readFileSync(layoutPath, "utf-8");

      expect(content).toContain("school_platform_theme");
      expect(content).toContain("document.documentElement.classList.add('dark')");
      expect(content).toContain("ThemeProvider");
      expect(content).toContain("dark:bg-slate-950");
      expect(content).toContain("dark:text-slate-100");
    });
  });

  describe("3. Theme Switcher & Header Controls", () => {
    it("should verify ThemeToggle component with button and dropdown variants", () => {
      const togglePath = path.join(process.cwd(), "components/ui/ThemeToggle.tsx");
      const content = fs.readFileSync(togglePath, "utf-8");

      expect(content).toContain("ThemeToggle");
      expect(content).toContain("toggleTheme");
      expect(content).toContain("setTheme");
      expect(content).toContain("Sun");
      expect(content).toContain("Moon");
      expect(content).toContain("الوضع الليلي");
      expect(content).toContain("الوضع النهاري");
    });

    it("should verify AppHeader integrates ThemeToggle in header bar", () => {
      const headerPath = path.join(process.cwd(), "components/layout/AppHeader.tsx");
      const content = fs.readFileSync(headerPath, "utf-8");

      expect(content).toContain("<ThemeToggle");
      expect(content).toContain("dark:bg-slate-900");
      expect(content).toContain("dark:border-slate-800");
    });
  });

  describe("4. Print & PDF Isolation", () => {
    it("should ensure globals.css strictly enforces light mode in @media print", () => {
      const cssPath = path.join(process.cwd(), "app/globals.css");
      const content = fs.readFileSync(cssPath, "utf-8");

      expect(content).toContain("@media print");
      expect(content).toContain("color-scheme: light !important");
      expect(content).toContain("background: #ffffff !important");
      expect(content).toContain("color: #0f172a !important");
    });
  });

  describe("5. Core UI Components Dark Mode Support", () => {
    it("should verify Card component has dark mode background and borders", () => {
      const cardPath = path.join(process.cwd(), "components/ui/Card.tsx");
      const content = fs.readFileSync(cardPath, "utf-8");

      expect(content).toContain("dark:bg-slate-900");
      expect(content).toContain("dark:border-slate-800");
      expect(content).toContain("dark:text-slate-100");
    });

    it("should verify DataTable component has dark mode support for table, inputs, and pagination", () => {
      const tablePath = path.join(process.cwd(), "components/ui/DataTable.tsx");
      const content = fs.readFileSync(tablePath, "utf-8");

      expect(content).toContain("dark:bg-slate-900");
      expect(content).toContain("dark:border-slate-800");
      expect(content).toContain("dark:text-slate-100");
      expect(content).toContain("dark:bg-slate-950");
    });

    it("should verify Modal component has dark mode backdrop and surface", () => {
      const modalPath = path.join(process.cwd(), "components/ui/Modal.tsx");
      const content = fs.readFileSync(modalPath, "utf-8");

      expect(content).toContain("dark:bg-slate-900");
      expect(content).toContain("dark:border-slate-800");
    });

    it("should verify Button component has dark mode styles for secondary, ghost, and outline variants", () => {
      const buttonPath = path.join(process.cwd(), "components/ui/Button.tsx");
      const content = fs.readFileSync(buttonPath, "utf-8");

      expect(content).toContain("dark:bg-slate-800");
      expect(content).toContain("dark:hover:bg-slate-700");
      expect(content).toContain("dark:text-slate-100");
      expect(content).toContain("dark:hover:bg-teal-950/40");
    });
  });
});
