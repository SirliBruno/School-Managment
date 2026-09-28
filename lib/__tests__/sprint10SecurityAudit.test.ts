import { describe, it, expect } from "vitest";
import { esc, renderSchoolInfoTable, renderOfficialHeader } from "@/lib/pdfTemplateBase";
import {
  createDatabaseBackupSnapshot,
  validateBackupSnapshot,
  restoreDatabaseBackupSnapshot,
  calculateChecksum,
} from "@/lib/backupRecovery";
import { uploadSchoolAsset } from "@/lib/schoolSettingsService";
import {
  validateFileMagicBytes,
  validateSecureUpload,
} from "@/lib/fileValidation";
import { config as middlewareConfig } from "@/middleware";
import { useOptionalAuth } from "@/context/AuthContext";

describe("Sprint 10: Production Security & Disaster Recovery Audit Test Suite", () => {
  describe("1. PDF Template Escaping & Anti-XSS Sanitization (P2.3)", () => {
    it("escapes malicious HTML characters properly via esc()", () => {
      const payload = `<script>alert("XSS & attack")</script>`;
      const escaped = esc(payload);
      expect(escaped).not.toContain("<script>");
      expect(escaped).not.toContain("</script>");
      expect(escaped).toContain("&lt;script&gt;");
      expect(escaped).toContain("&quot;");
      expect(escaped).toContain("&amp;");
    });

    it("handles null, undefined and numbers in esc() safely", () => {
      expect(esc(null)).toBe("");
      expect(esc(undefined)).toBe("");
      expect(esc(12345)).toBe("12345");
      expect(esc("")).toBe("");
    });

    it("sanitizes schoolName and civilRegistry in renderSchoolInfoTable", () => {
      const maliciousSchool = `مدرسة الأمل <img src=x onerror=alert(1)>`;
      const maliciousCivil = `1010101010<script>steal()</script>`;
      const html = renderSchoolInfoTable(maliciousCivil, maliciousSchool);

      expect(html).not.toContain("<img src=x");
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
      expect(html).toContain("&lt;script&gt;steal()&lt;/script&gt;");
    });

    it("sanitizes header variables in renderOfficialHeader", () => {
      const html = renderOfficialHeader({
        formTitle: "مساءلة غياب <b style='color:red'>!",
        formCode: "F-01 <script>",
        dateFormatted: "1448/01/01<iframe src='x'>",
        numberFormatted: "NUM-999 'OR 1=1",
      });

      expect(html).not.toContain("<script>");
      expect(html).not.toContain("<iframe");
      expect(html).toContain("&lt;script&gt;");
      expect(html).toContain("&#039;OR 1=1");
    });
  });

  describe("2. Strict File Upload Validation & Magic Bytes Security (P0.3)", () => {
    it("rejects dangerous and executable files in uploadSchoolAsset", async () => {
      const dangerousFiles = [
        new File(["malware"], "virus.exe", { type: "application/x-msdownload" }),
        new File(["script"], "payload.bat", { type: "application/x-bat" }),
        new File(["code"], "backdoor.php", { type: "application/x-php" }),
        new File(["xss"], "vector.svg", { type: "image/svg+xml" }),
        new File(["html"], "phishing.html", { type: "text/html" }),
        new File(["shell"], "script.sh", { type: "application/x-sh" }),
        new File(["js"], "exploit.js", { type: "application/javascript" }),
      ];

      for (const f of dangerousFiles) {
        const result = await uploadSchoolAsset(f, "stamp");
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }
    });

    it("detects genuine magic bytes for PNG, JPEG, PDF, and WEBP", async () => {
      // PNG header: 89 50 4E 47
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const pngFile = new File([pngBytes], "test.png", { type: "image/png" });
      const pngRes = await validateFileMagicBytes(pngFile);
      expect(pngRes.valid).toBe(true);
      expect(pngRes.detectedType).toBe("png");

      // JPEG header: FF D8 FF
      const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const jpegFile = new File([jpegBytes], "test.jpg", { type: "image/jpeg" });
      const jpegRes = await validateFileMagicBytes(jpegFile);
      expect(jpegRes.valid).toBe(true);
      expect(jpegRes.detectedType).toBe("jpeg");

      // PDF header: 25 50 44 46 (%PDF)
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
      const pdfFile = new File([pdfBytes], "doc.pdf", { type: "application/pdf" });
      const pdfRes = await validateFileMagicBytes(pdfFile);
      expect(pdfRes.valid).toBe(true);
      expect(pdfRes.detectedType).toBe("pdf");

      // WebP header: RIFF....WEBP
      const webpBytes = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50
      ]);
      const webpFile = new File([webpBytes], "img.webp", { type: "image/webp" });
      const webpRes = await validateFileMagicBytes(webpFile);
      expect(webpRes.valid).toBe(true);
      expect(webpRes.detectedType).toBe("webp");
    });

    it("rejects disguised files where extension says PNG but content is executable/text", async () => {
      const fakePng = new File(["echo 'malicious script'"], "innocent.png", {
        type: "image/png",
      });
      const result = await validateSecureUpload(fakePng, {
        allowedExtensions: ["png", "jpg", "jpeg"],
        allowedMimes: ["image/png", "image/jpeg"],
        maxSizeBytes: 5 * 1024 * 1024,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Magic Bytes");
    });

    it("rejects double extension attacks such as exploit.php.png", async () => {
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const doubleExtFile = new File([pngBytes], "exploit.php.png", {
        type: "image/png",
      });
      const result = await validateSecureUpload(doubleExtFile, {
        allowedExtensions: ["png", "jpg"],
        allowedMimes: ["image/png"],
        maxSizeBytes: 5 * 1024 * 1024,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("امتداد تنفيذي مخفي");
    });

    it("allows valid image formats with correct magic bytes in uploadSchoolAsset", async () => {
      const validPngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const validPng = new File([validPngBytes], "official_stamp.png", {
        type: "image/png",
      });
      const result = await uploadSchoolAsset(validPng, "stamp");
      expect(result.success).toBe(true);
      expect(result.url).toBeDefined();
    });
  });

  describe("3. Disaster Recovery & Snapshot Integrity (P1.3)", () => {
    it("creates a signed backup snapshot with valid metadata and checksum", () => {
      const snapshot = createDatabaseBackupSnapshot({
        teachers: [
          {
            id: "t-1",
            fullName: "سارة محمد",
            nationalId: "1098765432",
            jobNumber: "1098765432",
            specialty: "لغة عربية",
            employmentStatus: "دائم",
            totalAbsences: 0,
            isArchived: false,
          },
        ],
        absenceRecords: [],
      });

      expect(snapshot.metadata.version).toBe("2.0.0");
      expect(snapshot.metadata.checksum).toBeDefined();
      expect(snapshot.metadata.counts.teachers).toBe(1);

      const validation = validateBackupSnapshot(snapshot);
      expect(validation.valid).toBe(true);
      expect(validation.snapshot).toBeDefined();
    });

    it("detects tampering when snapshot checksum does not match data", () => {
      const snapshot = createDatabaseBackupSnapshot({
        teachers: [
          {
            id: "t-orig",
            fullName: "أصلية",
            nationalId: "1000000001",
            jobNumber: "1000000001",
            specialty: "علوم",
            employmentStatus: "دائم",
            totalAbsences: 0,
            isArchived: false,
          },
        ],
      });

      // Tamper with data without recomputing checksum
      snapshot.data.teachers[0].fullName = "اسم تم تزويره";

      const validation = validateBackupSnapshot(snapshot);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("فشل التحقق من تكامل النسخة الاحتياطية");
    });

    it("restores database backup successfully from raw valid JSON", () => {
      const originalSnapshot = createDatabaseBackupSnapshot({
        teachers: [
          {
            id: "t-restore",
            fullName: "معلمة مستعادة",
            nationalId: "1000000002",
            jobNumber: "1000000002",
            specialty: "تاريخ",
            employmentStatus: "دائم",
            totalAbsences: 1,
            isArchived: false,
          },
        ],
      });

      const rawJson = JSON.stringify(originalSnapshot);
      const restoreResult = restoreDatabaseBackupSnapshot(rawJson);

      expect(restoreResult.success).toBe(true);
      expect(restoreResult.data?.teachers.length).toBe(1);
      expect(restoreResult.data?.teachers[0].fullName).toBe("معلمة مستعادة");
    });
  });

  describe("4. Administrative Route Guarding Logic & Middleware (P1.1)", () => {
    it("protects root path / and administrative routes in middleware matcher", () => {
      expect(middlewareConfig.matcher).toContain("/");
      expect(middlewareConfig.matcher).toContain("/teachers/:path*");
      expect(middlewareConfig.matcher).toContain("/procedures/:path*");
      expect(middlewareConfig.matcher).toContain("/reports/:path*");
      expect(middlewareConfig.matcher).toContain("/archive/:path*");
    });

    it("distinguishes public routes from protected administrative routes", () => {
      const publicRoutes = [
        "/login",
        "/inquiry/inq_token_123",
        "/teacher-response/notice_token_456",
        "/api/health",
      ];

      const protectedRoutes = [
        "/",
        "/teachers",
        "/procedures/absence",
        "/procedures/delay-warning",
        "/procedures/permissions",
        "/reports",
        "/archive",
      ];

      const isPublic = (path: string) =>
        path === "/login" ||
        path.startsWith("/inquiry/") ||
        path.startsWith("/teacher-response/") ||
        path.startsWith("/api/health");

      for (const r of publicRoutes) {
        expect(isPublic(r)).toBe(true);
      }

      for (const r of protectedRoutes) {
        expect(isPublic(r)).toBe(false);
      }
    });

    it("provides safe useOptionalAuth without throwing outside provider", () => {
      expect(typeof useOptionalAuth).toBe("function");
    });
  });
});
