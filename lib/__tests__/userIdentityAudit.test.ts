import { describe, it, expect } from "vitest";
import {
  DEFAULT_ADMIN_NAME,
  DEFAULT_ADMIN_ROLE,
  DEFAULT_ADMIN_ROLE_LABEL,
  DEFAULT_ADMIN_SCHOOL,
  extractAdminUser,
} from "@/context/AuthContext";
import { logAuditEvent, getAuditLogs } from "@/lib/auditLogger";
import { generateReportData } from "@/lib/reportsEngine";
import { buildReportHtml } from "@/lib/reportPdfService";
import { generatePermissionPdfHtml } from "@/lib/printPermissionPdfService";
import type { User } from "@supabase/supabase-js";
import type { EmployeePermission } from "@/types/teacher";

describe("Administrative User Identity & Dynamic Admin Profile Audit", () => {
  describe("1. Identity Constants & Multi-User Architecture", () => {
    it("should export correct official administrative identity constants", () => {
      expect(DEFAULT_ADMIN_NAME).toBe("أحلام صالح الضبيبي");
      expect(DEFAULT_ADMIN_ROLE).toBe("vice_principal");
      expect(DEFAULT_ADMIN_ROLE_LABEL).toBe("وكيلة المدرسة");
      expect(DEFAULT_ADMIN_SCHOOL).toBe("الثانوية الخامسة مسارات");
    });

    it("should default to Ahlam Saleh Al-Dubaibi when Supabase user metadata is empty", () => {
      const mockSupabaseUser: User = {
        id: "usr-admin-1",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
        email: "wakila@school.edu.sa",
      };

      const extracted = extractAdminUser(mockSupabaseUser);
      expect(extracted.fullName).toBe("أحلام صالح الضبيبي");
      expect(extracted.role).toBe("vice_principal");
      expect(extracted.username).toBe("wakila");
    });

    it("should preserve custom profile metadata dynamically when user updates their profile (Multi-User Readiness)", () => {
      const futureAdminUser: User = {
        id: "usr-admin-2",
        app_metadata: {},
        user_metadata: {
          full_name: "سارة خالد الشمري",
          role: "principal",
          username: "skhalid",
        },
        aud: "authenticated",
        created_at: new Date().toISOString(),
        email: "skhalid@school.edu.sa",
      };

      const extracted = extractAdminUser(futureAdminUser);
      expect(extracted.fullName).toBe("سارة خالد الشمري");
      expect(extracted.role).toBe("principal");
      expect(extracted.username).toBe("skhalid");
    });
  });

  describe("2. Audit Logger Administrative Identity", () => {
    it("should record Ahlam Saleh Al-Dubaibi as default userName and وكيلة المدرسة as userRole", () => {
      const log = logAuditEvent({
        action: "create",
        entityType: "permission",
        entityId: "perm-test-1",
        details: "تسجيل استئذان رسمي جديد للمعلمة",
      });

      expect(log.userName).toBe("أحلام صالح الضبيبي");
      expect(log.userRole).toBe("وكيلة المدرسة");
      expect(log.action).toBe("create");
    });

    it("should respect explicit userName and userRole when provided", () => {
      const customLog = logAuditEvent({
        action: "update",
        entityType: "system_settings",
        entityId: "cfg-1",
        userName: "فاطمة فلاتة",
        userRole: "مديرة المدرسة",
        details: "تحديث الإعدادات العامة",
      });

      expect(customLog.userName).toBe("فاطمة فلاتة");
      expect(customLog.userRole).toBe("مديرة المدرسة");
    });
  });

  describe("3. Reports Engine & PDF Document Signatures", () => {
    it("should set creatorName default to Ahlam Saleh Al-Dubaibi in generateReportData", () => {
      const report = generateReportData(
        "monthly_comprehensive_absence",
        { month: "all", year: "2026", status: "all", specialty: "all", employmentStatus: "all" },
        [],
        [],
        [],
        []
      );

      expect(report.payload.creatorName).toBe("أحلام صالح الضبيبي");
      expect(report.payload.schoolName).toBe("الثانوية الخامسة مسارات");
    });

    it("should render signature section with وكيلة المدرسة and أحلام صالح الضبيبي in report HTML", () => {
      const html = buildReportHtml({
        reportTitle: "تقرير الغياب الشامل",
        reportCode: "REP-ABS-01",
        schoolName: "الثانوية الخامسة مسارات",
        principalName: "فاطمة فلاتة",
        creatorName: "أحلام صالح الضبيبي",
        dateFormatted: "2026-09-27",
        tableHeaders: ["م", "المعلمة", "التاريخ"],
        tableRows: [["1", "نورة العتيبي", "2026-09-27"]],
        summaryCards: [{ label: "إجمالي الحالات", value: 1 }],
      });

      expect(html).toContain("وكيلة المدرسة");
      expect(html).toContain("أحلام صالح الضبيبي");
      expect(html).toContain("مديرة المدرسة / القائدة");
      expect(html).toContain("الثانوية الخامسة مسارات");
    });

    it("should render permission PDF HTML with vice principal Ahlam Saleh Al-Dubaibi", () => {
      const mockPermission: EmployeePermission = {
        id: "perm-audit-1",
        teacherId: "t-1",
        teacherName: "ريم السبيعي",
        nationalId: "1098765432",
        jobNumber: "98765",
        specialty: "رياضيات",
        permissionDate: "2026-09-27",
        exitTime: "09:30",
        returnTime: "11:30",
        durationMinutes: 120,
        reason: "مراجعة طبية طارئة",
        status: "approved",
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const html = generatePermissionPdfHtml({
        permission: mockPermission,
      });

      expect(html).toContain("وكيلة المدرسة");
      expect(html).toContain("أحلام صالح الضبيبي");
      expect(html).toContain("ريم السبيعي");
      expect(html).toContain("الثانوية الخامسة مسارات");
    });
  });
});
