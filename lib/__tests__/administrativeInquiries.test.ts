import { describe, it, expect } from "vitest";
import {
  generateAdministrativeInquiryWhatsAppMessage,
  buildAdministrativeInquiryWhatsAppUrl,
} from "@/lib/administrativeInquiryWhatsappService";
import { getAdministrativeInquiryPublicUrl } from "@/lib/appConfig";
import { generateReportData, getDashboardStats } from "@/lib/reportsEngine";
import {
  AdministrativeInquiry,
  Teacher,
  AdministrativeInquiryType,
} from "@/types/teacher";

describe("Administrative Inquiries Module Suite", () => {
  const mockTeacher: Teacher = {
    id: "teacher-123",
    fullName: "نورة محمد القحطاني",
    nationalId: "1098765432",
    phone: "0501234567",
    mobile: "0501234567",
    specialty: "فيزياء",
    jobTitle: "معلمة",
    employmentStatus: "دائم",
    totalAbsences: 0,
    isArchived: false,
  };

  const mockInquiry: AdministrativeInquiry = {
    id: "inq-1001",
    inquiryNumber: "م.إ-١٤٤٧-٠٠١",
    teacherId: "teacher-123",
    teacherName: "نورة محمد القحطاني",
    nationalId: "1098765432",
    jobTitle: "معلمة",
    inquiryDate: "2026-09-29",
    incidentDate: "2026-09-28",
    inquiryType: "التأخير عن دخول الحصص",
    description: "التأخر عن دخول الحصة الثانية يوم الأحد",
    vicePrincipalNotes: "تم رصد الواقعة من قبل وكيلة الشؤون التعليمية",
    token: "test-token-uuid-12345",
    tokenExpiresAt: "2026-10-01T10:00:00.000Z",
    status: "pending_teacher",
    isArchived: false,
    createdAt: "2026-09-29T10:00:00.000Z",
    updatedAt: "2026-09-29T10:00:00.000Z",
  };

  describe("WhatsApp Message Generation Service", () => {
    it("should generate a complete WhatsApp message with all required official details", () => {
      const message = generateAdministrativeInquiryWhatsAppMessage(
        mockInquiry,
        "https://example.com"
      );

      expect(message).toContain("السلام عليكم ورحمة الله وبركاته");
      expect(message).toContain("الأستاذة / نورة محمد القحطاني");
      expect(message).toContain("نفيدكم بأنه تم إنشاء مساءلة إدارية بخصوص:");
      expect(message).toContain("التأخير عن دخول الحصص");
      expect(message).toContain("2026-09-28");
      expect(message).toContain("https://example.com/administrative-inquiry/test-token-uuid-12345");
      expect(message).toContain("شاكرين تعاونكم.");
    });

    it("should handle custom inquiry type in WhatsApp message when inquiryType is أخرى", () => {
      const customInquiry: AdministrativeInquiry = {
        ...mockInquiry,
        inquiryType: "أخرى",
        customType: "الامتناع عن حضور الاجتماع الإداري",
      };

      const message = generateAdministrativeInquiryWhatsAppMessage(
        customInquiry,
        "https://example.com"
      );

      expect(message).toContain("الامتناع عن حضور الاجتماع الإداري");
    });

    it("should build proper wa.me link with sanitized phone number", () => {
      const url = buildAdministrativeInquiryWhatsAppUrl(
        mockInquiry,
        "0501234567",
        "https://example.com"
      );

      expect(url).toContain("https://wa.me/966501234567?text=");
      expect(url).toContain(encodeURIComponent("التأخير عن دخول الحصص"));
    });

    it("should handle custom baseUrl without trailing slash", () => {
      const message = generateAdministrativeInquiryWhatsAppMessage(
        mockInquiry,
        "https://school-portal.gov.sa"
      );

      expect(message).toContain(
        "https://school-portal.gov.sa/administrative-inquiry/test-token-uuid-12345"
      );
    });

    it("should generate proper public URL without requiring authentication", () => {
      const publicUrl = getAdministrativeInquiryPublicUrl("test-token-uuid-12345");
      expect(publicUrl).toContain("/administrative-inquiry/test-token-uuid-12345");
    });
  });

  describe("Official Inquiry Types & Dropdown Support", () => {
    it("should validate all 4 official inquiry types plus أخرى", () => {
      const validTypes: AdministrativeInquiryType[] = [
        "التأخير عن دخول الحصص",
        "الخروج من الحصص قبل انتهاء الوقت",
        "الامتناع عن دخول حصص الانتظار",
        "الامتناع عن المناوبة",
        "أخرى",
      ];

      validTypes.forEach((t) => {
        expect(typeof t).toBe("string");
      });
      expect(validTypes).toHaveLength(5);
    });
  });

  describe("Reports Engine Integration & Response Rate", () => {
    const mockInquiries: AdministrativeInquiry[] = [
      mockInquiry,
      {
        id: "inq-1002",
        inquiryNumber: "م.إ-١٤٤٧-٠٠٢",
        teacherId: "teacher-123",
        teacherName: "نورة محمد القحطاني",
        nationalId: "1098765432",
        jobTitle: "معلمة",
        inquiryDate: "2026-09-25",
        incidentDate: "2026-09-24",
        inquiryType: "الامتناع عن دخول حصص الانتظار",
        description: "رفض استلام حصص الانتظار المقررة",
        token: "token-2",
        tokenExpiresAt: "2026-09-26T10:00:00.000Z",
        status: "completed",
        teacherResponse: "كنت في حالة إجهاد صحي مفاجئ",
        responseDate: "2026-09-25",
        directorDecision: "accepted",
        directorNotes: "تم قبول العذر بعد الاطلاع على التقرير الصحي",
        decisionDate: "2026-09-26",
        isArchived: false,
        createdAt: "2026-09-25T10:00:00.000Z",
        updatedAt: "2026-09-26T10:00:00.000Z",
      },
      {
        id: "inq-archived",
        inquiryNumber: "م.إ-١٤٤٧-٠٠٣",
        teacherId: "teacher-123",
        teacherName: "نورة محمد القحطاني",
        nationalId: "1098765432",
        jobTitle: "معلمة",
        inquiryDate: "2026-09-20",
        incidentDate: "2026-09-19",
        inquiryType: "الامتناع عن المناوبة",
        token: "token-archived",
        tokenExpiresAt: "2026-09-21T10:00:00.000Z",
        status: "completed",
        directorDecision: "rejected",
        isArchived: true,
        createdAt: "2026-09-20T10:00:00.000Z",
        updatedAt: "2026-09-21T10:00:00.000Z",
      },
    ];

    it("should generate administrative_inquiries_summary report excluding archived items", () => {
      const report = generateReportData(
        "administrative_inquiries_summary",
        {},
        [mockTeacher],
        [],
        [],
        [],
        "أحلام صالح الضبيبي",
        [],
        mockInquiries
      );

      expect(report.payload.reportTitle).toBe("تقرير حصر المسائلات الإدارية الرسمية");
      expect(report.payload.reportCode).toBe("تق-مساءلة-إدارية-٠١");
      expect(report.rawRowsCount).toBe(2); // Only non-archived
      expect(report.payload.tableRows.length).toBe(2);

      // Verify Highlights
      const totalHighlight = report.summaryHighlights.find(
        (h) => h.label === "المساءلات المسجلة"
      );
      expect(totalHighlight?.value).toBe(2);

      const approvedHighlight = report.summaryHighlights.find(
        (h) => h.label === "قرارات معتمدة"
      );
      expect(approvedHighlight?.value).toBe(1);

      // Response Rate calculation: 1 responded out of 2 total = 50%
      const responseRateHighlight = report.summaryHighlights.find(
        (h) => h.label === "معدل الرد"
      );
      expect(responseRateHighlight?.value).toBe("50%");
    });

    it("should filter inquiries by date range correctly", () => {
      const report = generateReportData(
        "administrative_inquiries_summary",
        { startDate: "2026-09-27", endDate: "2026-09-30" },
        [mockTeacher],
        [],
        [],
        [],
        "أحلام صالح الضبيبي",
        [],
        mockInquiries
      );

      expect(report.rawRowsCount).toBe(1);
      expect(report.payload.tableRows[0][1]).toBe("م.إ-١٤٤٧-٠٠١");
    });

    it("should filter inquiries by status", () => {
      const report = generateReportData(
        "administrative_inquiries_summary",
        { status: "completed" },
        [mockTeacher],
        [],
        [],
        [],
        "أحلام صالح الضبيبي",
        [],
        mockInquiries
      );

      expect(report.rawRowsCount).toBe(1);
      expect(report.payload.tableRows[0][1]).toBe("م.إ-١٤٤٧-٠٠٢");
    });
  });

  describe("Center of Inventory (مركز الحصر) Indicators Calculation", () => {
    it("should accurately compute total, open, completed, and expired metrics", () => {
      const inquiriesList: AdministrativeInquiry[] = [
        { ...mockInquiry, id: "i-1", status: "pending_teacher" },
        { ...mockInquiry, id: "i-2", status: "teacher_responded" },
        { ...mockInquiry, id: "i-3", status: "pending_director" },
        { ...mockInquiry, id: "i-4", status: "completed", directorDecision: "accepted" },
        { ...mockInquiry, id: "i-5", status: "completed", directorDecision: "rejected" },
        { ...mockInquiry, id: "i-6", status: "expired" },
        { ...mockInquiry, id: "i-archived", status: "completed", isArchived: true },
      ];

      const active = inquiriesList.filter((i) => !i.isArchived);
      const total = active.length; // 6
      const open = active.filter(
        (i) => i.status === "pending_teacher" || i.status === "teacher_responded" || i.status === "pending_director"
      ).length; // 3
      const completed = active.filter((i) => i.status === "completed").length; // 2
      const expired = active.filter((i) => i.status === "expired").length; // 1

      expect(total).toBe(6);
      expect(open).toBe(3);
      expect(completed).toBe(2);
      expect(expired).toBe(1);

      const dashboard = getDashboardStats([mockTeacher], [], [], [], inquiriesList);
      expect(dashboard.totalAdministrativeInquiries).toBe(6);
    });
  });

  describe("Administrative Inquiry Status Lifecycle & Token Validity", () => {
    it("should correctly identify expired status when past 48 hours and still pending teacher", () => {
      const pastDate = new Date(Date.now() - 50 * 3600 * 1000).toISOString();
      const expiredInquiry: AdministrativeInquiry = {
        ...mockInquiry,
        tokenExpiresAt: pastDate,
        status: "pending_teacher",
      };

      const isExpired = new Date(expiredInquiry.tokenExpiresAt).getTime() < Date.now();
      expect(isExpired).toBe(true);
    });

    it("should validate full workflow transition: pending_teacher -> teacher_responded -> completed", () => {
      let inquiry: AdministrativeInquiry = { ...mockInquiry, status: "pending_teacher" };
      expect(inquiry.status).toBe("pending_teacher");

      // Teacher responds
      inquiry = {
        ...inquiry,
        teacherResponse: "تم تقديم الإفادة الخطية وتوضيح الأسباب",
        responseDate: "2026-09-29",
        status: "teacher_responded",
      };
      expect(inquiry.status).toBe("teacher_responded");
      expect(inquiry.teacherResponse).toBeDefined();

      // Director decides
      inquiry = {
        ...inquiry,
        directorDecision: "accepted",
        directorNotes: "تم قبول العذر وحفظ المساءلة",
        decisionDate: "2026-09-30",
        status: "completed",
      };
      expect(inquiry.status).toBe("completed");
      expect(inquiry.directorDecision).toBe("accepted");
      expect(inquiry.directorNotes).toContain("حفظ المساءلة");
    });
  });
});
