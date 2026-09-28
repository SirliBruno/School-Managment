import { describe, it, expect, beforeEach } from "vitest";
import {
  getSchoolApprovalSettings,
  updateSchoolApprovalSettings,
  resetSchoolApprovalSettings,
  deleteSchoolStamp,
  deletePrincipalSignature,
  renderOfficialApprovalFooterHtml,
  DEFAULT_APPROVAL_SETTINGS,
} from "@/lib/stampSignatureManager";
import {
  DEFAULT_STAMP_BASE64,
  DEFAULT_SIGNATURE_BASE64,
  DEFAULT_PRINCIPAL_SIGNATURE_BASE64,
  DEFAULT_VICE_PRINCIPAL_SIGNATURE_BASE64,
} from "@/lib/defaultApprovalAssets";
import { buildReportHtml, PdfReportPayload } from "@/lib/reportPdfService";
import { generatePermissionPdfHtml } from "@/lib/printPermissionPdfService";
import { buildDeductionDecisionHtml } from "@/lib/printDeductionDecisionPdfService";
import { buildAbsencePdfHtml } from "@/lib/printPdfService";
import { buildDelayNoticePdfHtml } from "@/lib/printDelayNoticePdfService";
import { getAuditLogs } from "@/lib/auditLogger";
import type { EmployeePermission, Teacher, DelayNotice } from "@/types/teacher";

describe("SCHOOL STAMP & SIGNATURE MANAGEMENT SYSTEM", () => {
  beforeEach(() => {
    // Reset to defaults before each test
    resetSchoolApprovalSettings("أحلام صالح الضبيبي");
  });

  describe("1. Default Assets & Storage Initialization", () => {
    it("loads default official assets from project files", () => {
      expect(DEFAULT_STAMP_BASE64).toBeDefined();
      expect(DEFAULT_STAMP_BASE64).toContain("data:image/png;base64");
      expect(DEFAULT_STAMP_BASE64.length).toBeGreaterThan(1000);

      expect(DEFAULT_SIGNATURE_BASE64).toBeDefined();
      expect(DEFAULT_SIGNATURE_BASE64).toContain("data:image/png;base64");
      expect(DEFAULT_SIGNATURE_BASE64.length).toBeGreaterThan(1000);
    });

    it("initializes school approval settings with enabled stamp and signature", () => {
      const settings = getSchoolApprovalSettings();
      expect(settings.stampEnabled).toBe(true);
      expect(settings.signatureEnabled).toBe(true);
      expect(settings.schoolStampUrl).toBe(DEFAULT_STAMP_BASE64);
      expect(settings.principalSignatureUrl).toBe(DEFAULT_SIGNATURE_BASE64);
      expect(settings.updatedBy).toBe("أحلام صالح الضبيبي");
    });
  });

  describe("2. Settings Mutation: Upload, Replace, Toggle, and Reset", () => {
    it("updates stamp and signature with new custom assets and logs audit event", () => {
      const customStamp = "data:image/png;base64,CUSTOM_STAMP_TEST";
      const customSig = "data:image/png;base64,CUSTOM_SIG_TEST";

      const updated = updateSchoolApprovalSettings(
        {
          schoolStampUrl: customStamp,
          principalSignatureUrl: customSig,
        },
        "أحلام صالح الضبيبي"
      );

      expect(updated.schoolStampUrl).toBe(customStamp);
      expect(updated.principalSignatureUrl).toBe(customSig);

      const logs = getAuditLogs();
      const lastLog = logs[0];
      expect(lastLog.action).toBe("APPROVAL_ASSETS_UPDATED");
      expect(lastLog.userName).toBe("أحلام صالح الضبيبي");
    });

    it("supports disabling and deleting stamp", () => {
      const deleted = deleteSchoolStamp("أحلام صالح الضبيبي");
      expect(deleted.stampEnabled).toBe(false);
      expect(deleted.schoolStampUrl).toBe("");

      const current = getSchoolApprovalSettings();
      expect(current.stampEnabled).toBe(false);
    });

    it("supports disabling and deleting signature", () => {
      const deleted = deletePrincipalSignature("أحلام صالح الضبيبي");
      expect(deleted.signatureEnabled).toBe(false);
      expect(deleted.principalSignatureUrl).toBe("");

      const current = getSchoolApprovalSettings();
      expect(current.signatureEnabled).toBe(false);
    });

    it("resets back to official project assets reliably", () => {
      deleteSchoolStamp("أحلام صالح الضبيبي");
      deletePrincipalSignature("أحلام صالح الضبيبي");

      const reset = resetSchoolApprovalSettings("أحلام صالح الضبيبي");
      expect(reset.stampEnabled).toBe(true);
      expect(reset.signatureEnabled).toBe(true);
      expect(reset.schoolStampUrl).toBe(DEFAULT_STAMP_BASE64);
      expect(reset.principalSignatureUrl).toBe(DEFAULT_SIGNATURE_BASE64);
    });
  });

  describe("3. Official Approval Footer Component", () => {
    it("generates approval footer HTML with official school name and admin identity", () => {
      const html = renderOfficialApprovalFooterHtml({
        schoolName: "الثانوية الخامسة مسارات",
        officialTitle: "وكيلة المدرسة",
        officialName: "أحلام صالح الضبيبي",
      });

      expect(html).toContain("الثانوية الخامسة مسارات");
      expect(html).toContain("وكيلة المدرسة");
      expect(html).toContain("أحلام صالح الضبيبي");
      expect(html).toContain("ختم المدرسة الرسمي");
      expect(html).toContain("توقيع الاعتماد");
    });

    it("renders fallback placeholders when stamp or signature are disabled", () => {
      updateSchoolApprovalSettings({
        stampEnabled: false,
        signatureEnabled: false,
      });

      const html = renderOfficialApprovalFooterHtml();
      expect(html).toContain("الختم الرسمي للمنشأة");
      expect(html).not.toContain("alt=\"ختم المدرسة الرسمي\"");
      expect(html).not.toContain("alt=\"توقيع الاعتماد\"");
    });
  });

  describe("4. Document Generation Integration (PDF Services)", () => {
    const mockReportPayload: PdfReportPayload = {
      reportTitle: "تقرير الغياب الرسمي الشامل",
      reportCode: "REP-OFFICIAL-01",
      schoolName: "الثانوية الخامسة مسارات",
      creatorName: "أحلام صالح الضبيبي",
      principalName: "فاطمة فلاتة",
      dateFormatted: "1447/03/15 هـ",
      summaryCards: [{ label: "إجمالي السجلات", value: 10 }],
      tableHeaders: ["الاسم", "الغياب"],
      tableRows: [["نورة الغامدي", "1"]],
    };

    it("embeds stamp and signature into official administrative reports", () => {
      const html = buildReportHtml(mockReportPayload);
      expect(html).toContain("الثانوية الخامسة مسارات");
      expect(html).toContain("أحلام صالح الضبيبي");
      expect(html).toContain("ختم المدرسة الرسمي");
      expect(html).toContain("توقيع الاعتماد");
    });

    it("prevents stamp inclusion in statistical-only or internal-only reports", () => {
      const internalReport: PdfReportPayload = {
        ...mockReportPayload,
        isStatisticalOnly: true,
      };

      const html = buildReportHtml(internalReport);
      expect(html).not.toContain("alt=\"ختم المدرسة الرسمي\"");
      expect(html).toContain("تقرير إحصائي داخلي للأغراض الإدارية والتحليلية المدرسية");
    });

    it("embeds stamp and signature into official permission slips (نموذج الاستئذان)", () => {
      const mockPermission: EmployeePermission = {
        id: "perm-01",
        teacherId: "tch-01",
        teacherName: "سارة العتيبي",
        nationalId: "1023456789",
        jobNumber: "1023456789",
        specialty: "كيمياء",
        permissionDate: "2026-09-27",
        exitTime: "09:30",
        returnTime: "11:00",
        durationMinutes: 90,
        permissionType: "شخصي",
        reason: "مراجعة رسمية",
        status: "معتمد",
        approvedBy: "أحلام صالح الضبيبي",
      };

      const html = generatePermissionPdfHtml({
        permission: mockPermission,
        vicePrincipalName: "أحلام صالح الضبيبي",
        schoolName: "الثانوية الخامسة مسارات",
      });

      expect(html).toContain("الثانوية الخامسة مسارات");
      expect(html).toContain("أحلام صالح الضبيبي");
      expect(html).toContain("alt=\"ختم المدرسة\"");
      expect(html).toContain("alt=\"التوقيع\"");
    });

    it("embeds stamp and signature into official deduction decisions (نموذج 19)", () => {
      const html = buildDeductionDecisionHtml({
        teacherName: "أمل السبيعي",
        civilId: "1089953663",
        specialization: "رياضيات",
        schoolName: "الثانوية الخامسة مسارات",
        principalName: "أحلام صالح الضبيبي",
        delayHours: 7,
        deductionDays: 1,
        decisionNumber: "DEC-2026-001",
        decisionDate: "1447/03/15 هـ",
      });

      expect(html).toContain("الثانوية الخامسة مسارات");
      expect(html).toContain("أحلام صالح الضبيبي");
      expect(html).toContain("alt=\"الختم الرسمي\"");
      expect(html).toContain("alt=\"توقيع الاعتماد\"");
    });

    it("embeds principal signature in Stage 1, vice principal signature & stamp in Stage 3, and Cairo font in absence inquiries", () => {
      const html = buildAbsencePdfHtml({
        teacherName: "فاطمة أحمد",
        username: "1098765432",
        specialty: "لغة عربية",
        jobTitle: "معلم ممارس",
        employmentStatus: "على رأس العمل",
        absenceCount: 3,
        absenceDate: "2026-09-28",
        absenceType: "اضطراري",
        absenceReason: "ظرف عائلي طارئ",
      });

      // Stage 1: Principal Name & Principal Signature
      expect(html).toContain("مديرة المدرسة : <strong>فاطمة فلاتة</strong>");
      expect(html).toContain("alt=\"توقيع المديرة\"");

      // Stage 3: Vice Principal Name & Vice Principal Signature & Stamp
      expect(html).toContain("وكيلة الشؤون التعليمية : <strong>أحلام صالح الضبيبي</strong>");
      expect(html).toContain("alt=\"توقيع الوكيلة\"");
      expect(html).toContain("alt=\"الختم الرسمي\"");

      // Font & Encoding
      expect(html).toContain("fonts.googleapis.com/css2?family=Cairo");
      expect(html).toContain("font-family: 'Cairo'");
    });

    it("embeds principal and vice-principal signatures in delay notices (تنبيه عن تأخر / انصراف)", () => {
      const mockTeacher: Teacher = {
        id: "tch-10",
        name: "منى المحمدي",
        fullName: "منى المحمدي",
        nationalId: "1055544433",
        specialty: "دراسات إسلامية",
        jobTitle: "معلم ممارس",
      };

      const mockNotice: DelayNotice = {
        id: "dn-01",
        teacherId: "tch-10",
        teacherName: "منى المحمدي",
        date: "2026-09-28",
        violationLateMorning: true,
        minutesLate: 25,
        status: "pending",
        createdAt: "2026-09-28T07:30:00.000Z",
      };

      const html = buildDelayNoticePdfHtml({
        notice: mockNotice,
        teacher: mockTeacher,
      });

      // Stage 1: Principal signature
      expect(html).toContain("مديرة المدرسة : <strong>فاطمة فلاتة</strong>");
      expect(html).toContain("alt=\"توقيع المديرة\"");

      // Stage 3: Vice Principal signature & Stamp
      expect(html).toContain("وكيلة الشؤون التعليمية : <strong>أحلام صالح الضبيبي</strong>");
      expect(html).toContain("alt=\"توقيع الوكيلة\"");
      expect(html).toContain("alt=\"الختم الرسمي\"");

      // Font verification
      expect(html).toContain("fonts.googleapis.com/css2?family=Cairo");
    });
  });
});
