import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { CAIRO_ARABIC_WOFF2_BASE64, CAIRO_EMBEDDED_FONT_FACE_CSS } from "@/lib/cairoFontBase64";
import { UNIFIED_PDF_CSS, UNIFIED_PRINT_SCRIPT } from "@/lib/pdfTemplateBase";
import { generatePermissionPdfHtml } from "@/lib/printPermissionPdfService";

describe("Global Typography & Cairo Font Standardization", () => {
  it("verifies local Cairo woff2 font files exist in public/fonts", () => {
    const fontsDir = path.join(process.cwd(), "public", "fonts");
    expect(fs.existsSync(fontsDir)).toBe(true);

    const arabicFont = path.join(fontsDir, "cairo-arabic.woff2");
    expect(fs.existsSync(arabicFont)).toBe(true);
    expect(fs.statSync(arabicFont).size).toBeGreaterThan(10000);

    const latinFont = path.join(fontsDir, "cairo-latin.woff2");
    expect(fs.existsSync(latinFont)).toBe(true);
    expect(fs.statSync(latinFont).size).toBeGreaterThan(10000);
  });

  it("verifies Cairo embedded base64 constant and font-face CSS", () => {
    expect(CAIRO_ARABIC_WOFF2_BASE64.length).toBeGreaterThan(10000);
    expect(CAIRO_EMBEDDED_FONT_FACE_CSS).toContain("@font-face");
    expect(CAIRO_EMBEDDED_FONT_FACE_CSS).toContain("font-family: 'Cairo'");
    expect(CAIRO_EMBEDDED_FONT_FACE_CSS).toContain("data:font/woff2;charset=utf-8;base64,");
    expect(CAIRO_EMBEDDED_FONT_FACE_CSS).toContain(CAIRO_ARABIC_WOFF2_BASE64);
  });

  it("verifies UNIFIED_PDF_CSS strictly enforces Cairo font across all elements and print", () => {
    expect(UNIFIED_PDF_CSS).toContain(CAIRO_EMBEDDED_FONT_FACE_CSS);
    expect(UNIFIED_PDF_CSS).toContain("font-family: 'Cairo', sans-serif !important;");
    expect(UNIFIED_PDF_CSS).toContain("@media print");
    expect(UNIFIED_PDF_CSS).not.toContain("font-family: 'Cairo', 'Segoe UI', Tahoma");
  });

  it("verifies UNIFIED_PRINT_SCRIPT waits for Cairo fonts before triggering window.print()", () => {
    expect(UNIFIED_PRINT_SCRIPT).toContain('document.fonts.load("400 12px Cairo")');
    expect(UNIFIED_PRINT_SCRIPT).toContain('document.fonts.load("700 12px Cairo")');
    expect(UNIFIED_PRINT_SCRIPT).toContain("document.fonts.ready");
  });

  it("verifies Permission PDF HTML template contains embedded Cairo font and no rogue monospace", () => {
    const html = generatePermissionPdfHtml({
      permission: {
        id: "perm-test-1",
        teacherId: "teacher-1",
        teacherName: "أمل الغامدي",
        nationalId: "1098765432",
        jobNumber: "554433",
        specialty: "رياضيات",
        permissionDate: "2026-10-01",
        startTime: "08:00",
        endTime: "09:30",
        durationMinutes: 90,
        permissionType: "خروج وعودة",
        permissionReason: "موعد مستشفى",
        notes: "تم التأكيد",
        status: "approved",
        createdAt: "2026-10-01T08:00:00Z",
        updatedAt: "2026-10-01T08:00:00Z",
      },
    });

    expect(html).toContain("data:font/woff2;charset=utf-8;base64,");
    expect(html).toContain("font-family: 'Cairo', sans-serif !important;");
    expect(html).not.toContain("font-family: monospace;");
    expect(html).toContain("font-variant-numeric: tabular-nums;");
  });

  it("verifies globals.css includes Cairo font-face, universal inheritance, and typography tokens", () => {
    const globalsCss = fs.readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf-8");
    expect(globalsCss).toContain("url('/fonts/cairo-arabic.woff2')");
    expect(globalsCss).toContain("font-family: var(--font-cairo), 'Cairo'");
    expect(globalsCss).toContain(".font-display");
    expect(globalsCss).toContain(".font-heading-1");
    expect(globalsCss).toContain(".font-heading-2");
    expect(globalsCss).toContain(".font-heading-3");
    expect(globalsCss).toContain(".font-body");
    expect(globalsCss).toContain(".font-caption");
    expect(globalsCss).toContain(".font-label");
    expect(globalsCss).toContain(".font-btn");
    expect(globalsCss).toContain("font-family: 'Cairo', sans-serif !important;");
  });
});
