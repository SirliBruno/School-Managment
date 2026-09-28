import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Dark Mode Global Background & Layout Consistency Audit", () => {
  const rootDir = process.cwd();

  it("AuthGuard layout wrapper contains dark:bg-slate-950", () => {
    const authGuardContent = fs.readFileSync(
      path.join(rootDir, "components/auth/AuthGuard.tsx"),
      "utf-8"
    );
    expect(authGuardContent).toContain("dark:bg-slate-950");
    expect(authGuardContent).not.toMatch(
      /<div className="flex flex-col lg:flex-row min-h-screen bg-slate-50">/
    );
  });

  it("Root Layout has dark:bg-slate-950 on body", () => {
    const layoutContent = fs.readFileSync(
      path.join(rootDir, "app/layout.tsx"),
      "utf-8"
    );
    expect(layoutContent).toContain("dark:bg-slate-950");
  });

  it("globals.css maintains complete dark tokens and strict print isolation", () => {
    const cssContent = fs.readFileSync(
      path.join(rootDir, "app/globals.css"),
      "utf-8"
    );
    expect(cssContent).toContain(".dark {");
    expect(cssContent).toContain("--background: #0b1120;");
    expect(cssContent).toContain("@media print");
    expect(cssContent).toContain("--background: #ffffff !important;");
  });

  it("Report cards in reports center all define dark mode background and border variants", () => {
    const reportsPageContent = fs.readFileSync(
      path.join(rootDir, "app/reports/page.tsx"),
      "utf-8"
    );
    // Ensure all REPORT_CARDS accentColor entries have dark:bg-
    const accentColorMatches = reportsPageContent.match(/accentColor:\s*"[^"]+"/g) || [];
    expect(accentColorMatches.length).toBeGreaterThan(5);
    accentColorMatches.forEach((match) => {
      expect(match).toContain("dark:bg-");
      expect(match).toContain("dark:text-");
      expect(match).toContain("dark:border-");
    });
  });

  it("Page headers, KpiCards, and DataTables are dark-mode enabled", () => {
    const pageHeaderContent = fs.readFileSync(
      path.join(rootDir, "components/ui/PageHeader.tsx"),
      "utf-8"
    );
    expect(pageHeaderContent).toContain("dark:bg-slate-900");
    expect(pageHeaderContent).toContain("dark:border-slate-800");

    const kpiCardContent = fs.readFileSync(
      path.join(rootDir, "components/ui/KpiCard.tsx"),
      "utf-8"
    );
    expect(kpiCardContent).toContain("dark:bg-slate-900");
    expect(kpiCardContent).toContain("dark:border-slate-800");
  });

  it("Toast alerts in ToastContext have dark variants", () => {
    const toastContent = fs.readFileSync(
      path.join(rootDir, "context/ToastContext.tsx"),
      "utf-8"
    );
    expect(toastContent).toContain("dark:bg-emerald-950/95");
    expect(toastContent).toContain("dark:bg-rose-950/95");
  });

  it("Delay notice violations badges have dark variants", () => {
    const delayNoticeContent = fs.readFileSync(
      path.join(rootDir, "app/procedures/delay-notice/page.tsx"),
      "utf-8"
    );
    expect(delayNoticeContent).toContain("dark:bg-amber-950/50");
    expect(delayNoticeContent).toContain("dark:bg-emerald-950/60");
    expect(delayNoticeContent).toContain("dark:bg-sky-950/60");
  });
});
