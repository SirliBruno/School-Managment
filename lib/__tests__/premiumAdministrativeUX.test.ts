import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Sprint: Premium Administrative UX & Navigation Redesign (إعادة تصميم تجربة التنقل والواجهة الرئيسية للوكيلة)", () => {
  const appHeaderPath = path.join(process.cwd(), "components/layout/AppHeader.tsx");
  const authGuardPath = path.join(process.cwd(), "components/auth/AuthGuard.tsx");
  const sidebarPath = path.join(process.cwd(), "components/Sidebar.tsx");
  const dashboardPath = path.join(process.cwd(), "app/page.tsx");
  const pageTransitionPath = path.join(process.cwd(), "components/layout/PageTransition.tsx");

  const appHeaderCode = fs.readFileSync(appHeaderPath, "utf-8");
  const authGuardCode = fs.readFileSync(authGuardPath, "utf-8");
  const sidebarCode = fs.readFileSync(sidebarPath, "utf-8");
  const dashboardCode = fs.readFileSync(dashboardPath, "utf-8");
  const pageTransitionCode = fs.readFileSync(pageTransitionPath, "utf-8");

  describe("1. Navbar Redesign (إعادة تصميم شريط الـ Navbar)", () => {
    it("1.1 Navbar has fixed height of 72px", () => {
      expect(appHeaderCode).toContain("h-[72px]");
    });

    it("1.2 Navbar is styled completely in Primary Brand Teal color", () => {
      expect(appHeaderCode).toMatch(/bg-\[#137a85\]/);
      expect(appHeaderCode).toContain("text-white");
    });

    it("1.3 Navbar right section contains platform/school identity and brief description", () => {
      expect(appHeaderCode).toMatch(/schoolSettings\.schoolName|الثانوية الخامسة مسارات/);
      expect(appHeaderCode).toMatch(/منظومة الإدارة والمتابعة المدرسية|الإدارة المدرسية/);
    });

    it("1.4 Navbar center section contains Task Center (مركز المهام) and quick search", () => {
      expect(appHeaderCode).toContain("مركز المهام");
      expect(appHeaderCode).toContain("Search");
    });

    it("1.5 Navbar left section contains cloud status, notifications, theme toggle, and user profile", () => {
      expect(appHeaderCode).toContain("isCloudConnected");
      expect(appHeaderCode).toContain("Bell");
      expect(appHeaderCode).toContain("ThemeToggle");
      expect(appHeaderCode).toContain("DEFAULT_ADMIN_ROLE_LABEL");
      expect(appHeaderCode).toContain("isUserMenuOpen");
    });
  });

  describe("2. Layout & Shell Alignment (هيكلية الشاشة والتكامل)", () => {
    it("2.1 AuthGuard places Navbar full-width at the top above Sidebar and main content", () => {
      const headerIndex = authGuardCode.indexOf("<AppHeader />");
      const sidebarIndex = authGuardCode.indexOf("<Sidebar />");
      const mainIndex = authGuardCode.indexOf('<main className="flex-1 min-w-0" id="main-content">');

      expect(headerIndex).toBeGreaterThan(-1);
      expect(sidebarIndex).toBeGreaterThan(headerIndex);
      expect(mainIndex).toBeGreaterThan(sidebarIndex);
    });

    it("2.2 Main content container has accessible id='main-content' and PageTransition", () => {
      expect(authGuardCode).toContain('id="main-content"');
      expect(authGuardCode).toContain("<PageTransition>");
      expect(pageTransitionCode).toContain("motion.div");
    });
  });

  describe("3. Clean Sidebar Architecture (تصميم الـ Sidebar المرجعي وهدوء الواجهة)", () => {
    it("3.1 Sidebar uses clean navigation cards matching reference image", () => {
      expect(sidebarCode).toMatch(/bg-\[#f8fafc\]|bg-white/);
      expect(sidebarCode).toContain("منصة إدارتي المدرسية");
      expect(sidebarCode).toContain("PLATFORM_LOGO_BASE64");
    });

    it("3.2 Sidebar contains all 5 required administrative workflow groups", () => {
      // 1. مركز القيادة
      expect(sidebarCode).toContain("مركز القيادة");
      // 2. العمل اليومي
      expect(sidebarCode).toContain("العمل اليومي");
      // 3. الإجراءات والقرارات
      expect(sidebarCode).toContain("الإجراءات والقرارات");
      // 4. التقارير والأرشيف
      expect(sidebarCode).toContain("التقارير والأرشيف");
      // 5. الإدارة
      expect(sidebarCode).toContain("الإدارة");
    });

    it("3.3 Daily Work (العمل اليومي) contains all 4 essential operational routes", () => {
      expect(sidebarCode).toContain("/teachers");
      expect(sidebarCode).toContain("/procedures/absence");
      expect(sidebarCode).toContain("/procedures/delay-notice");
      expect(sidebarCode).toContain("/procedures/permissions");
    });

    it("3.4 Procedures & Decisions (الإجراءات والقرارات) contains inquiries, deductions, and list", () => {
      expect(sidebarCode).toContain("/procedures/administrative-inquiries");
      expect(sidebarCode).toContain("/procedures/deduction-hours");
      expect(sidebarCode).toContain("/procedures/list");
    });

    it("3.5 Reports & Archive (التقارير والأرشيف) contains reports, cumulative teacher record, and archive", () => {
      expect(sidebarCode).toContain("/reports");
      expect(sidebarCode).toContain("/archive");
    });

    it("3.6 Administration (الإدارة) connects to school assets, backup recovery, and admin profile modals", () => {
      expect(sidebarCode).toContain("ApprovalAssetsModal");
      expect(sidebarCode).toContain("BackupRecoveryModal");
      expect(sidebarCode).toContain("AdminProfileModal");
    });

    it("3.7 Active state uses calm light mint/teal background and rounded indicator", () => {
      expect(sidebarCode).toMatch(/bg-\[#eefcf9\]|bg-teal-50/);
      expect(sidebarCode).toMatch(/text-\[#0e6f7a\]|text-\[#137a85\]/);
      expect(sidebarCode).not.toContain("border-r-4 border-r-[#137a85]");
    });

    it("3.8 Sidebar implements timeline tree branch line for subitems", () => {
      expect(sidebarCode).toMatch(/before:w-\[1\.5px\]/);
    });

    it("3.9 Sidebar provides floating collapse toggle button on edge", () => {
      expect(sidebarCode).toContain("toggleCollapsed");
      expect(sidebarCode).toMatch(/ChevronLeft|ChevronRight/);
    });

    it("3.10 Sidebar provides docked Bottom Profile Card for Vice Principal", () => {
      expect(sidebarCode).toMatch(/وكيلة المدرسة|DEFAULT_ADMIN_ROLE_LABEL/);
      expect(sidebarCode).toContain("setIsProfileModalOpen");
    });

    it("3.11 Mobile drawer provides real-time search and RTL swipe-to-close", () => {
      expect(sidebarCode).toContain("drawerSearchQuery");
      expect(sidebarCode).toContain("useSwipe");
      expect(sidebarCode).toContain("isMobileOpen");
    });
  });

  describe("4. Vice Principal Focus Mode (وضع التركيز للوكيلة)", () => {
    it("4.1 Dashboard top header displays 'ما يحتاج انتباهك اليوم'", () => {
      expect(dashboardCode).toContain("ما يحتاج انتباهك اليوم");
      expect(dashboardCode).toContain("وضع التركيز الإداري");
    });

    it("4.2 Focus mode displays consolidated action summary message ('لديكِ X إجراءات تحتاج متابعة')", () => {
      expect(dashboardCode).toMatch(/لديكِ .* إجراءات تحتاج متابعة/);
    });

    it("4.3 Focus mode provides 4 calm direct action cards", () => {
      expect(dashboardCode).toContain("إجراءات بانتظار المراجعة");
      expect(dashboardCode).toContain("غيابات جديدة اليوم");
      expect(dashboardCode).toContain("مساءلات تحتاج اعتماد");
      expect(dashboardCode).toContain("حالات استحقاق الحسم");
    });

    it("4.4 Focus cards link directly to procedure pages", () => {
      expect(dashboardCode).toContain('href="/procedures/delay-notice"');
      expect(dashboardCode).toContain('href="/procedures/absence"');
      expect(dashboardCode).toContain('href="/procedures/administrative-inquiries"');
      expect(dashboardCode).toContain('href="/procedures/deduction-hours"');
    });
  });
});
