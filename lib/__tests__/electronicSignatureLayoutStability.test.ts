import { describe, it, expect } from "vitest";
import { buildAdministrativeInquiryPdfHtml } from "../printAdministrativeInquiryPdfService";
import { buildAbsencePdfHtml } from "../printPdfService";
import { buildDelayNoticePdfHtml } from "../printDelayNoticePdfService";
import { AdministrativeInquiry, Teacher } from "@/types/teacher";

describe("Electronic Signature & Date Row Layout Stability", () => {
  const dummyTeacher: Teacher = {
    id: "teacher-123",
    fullName: "مشاري مداري بن محمد العمري",
    name: "مشاري مداري بن محمد العمري",
    nationalId: "1080875642",
    jobNumber: "1080875642",
    specialty: "مكتبات",
    totalAbsences: 0,
    jobTitle: "معلم",
  };

  const respondedInquiry: AdministrativeInquiry = {
    id: "inq-101",
    inquiryNumber: "م-2026-018",
    teacherId: "teacher-123",
    teacherName: "مشاري مداري بن محمد العمري",
    nationalId: "1080875642",
    specialty: "مكتبات",
    incidentDate: "2026-10-27",
    inquiryType: "الامتناع عن دخول حصص الانتظار",
    status: "pending_director",
    createdAt: "2026-10-27T07:35:11.352Z",
    teacherResponse: "لم يصلني اشعار بإسناد الحصة سواء على تطبيق مدرسي او ورقيا",
    responseDate: "2026-10-27",
  };

  it("renders administrative inquiry with white-space: nowrap on signature rows and electronic badge", () => {
    const html = buildAdministrativeInquiryPdfHtml({
      inquiry: respondedInquiry,
      teacher: dummyTeacher,
    });

    expect(html).toContain(".sig-row > div {\n  white-space: nowrap;\n}");
    expect(html).toContain("sig-electronic-badge");
    expect(html).toContain("تم التوقيع والمصادقة إلكترونياً");
    expect(html).toContain("27 / 10 / 2026 م");
    // Ensure the container prevents wrapping
    expect(html).toContain("white-space: nowrap");
  });

  it("renders absence inquiry signature row with white-space: nowrap", () => {
    const html = buildAbsencePdfHtml({
      teacherName: dummyTeacher.fullName,
      nationalId: dummyTeacher.nationalId,
      specialty: dummyTeacher.specialty,
      absenceDate: "2026-10-27",
      absenceType: "غياب بدون عذر",
      isElectronicallySigned: true,
      formattedResponseDate: "27 / 10 / 2026",
      schoolName: "ابتدائية الإمام الترمذي",
    });

    expect(html).toContain(".sig > div { white-space: nowrap; }");
    expect(html).toContain("تم التوقيع والمصادقة إلكترونياً");
    expect(html).toContain("white-space:nowrap");
  });

  it("renders delay notice signature row with white-space: nowrap", () => {
    const html = buildDelayNoticePdfHtml({
      notice: {
        id: "delay-1",
        teacherId: dummyTeacher.id,
        teacherName: dummyTeacher.fullName,
        date: "2026-10-27",
        type: "morning_delay",
        minutes: 30,
        status: "pending_director",
        createdAt: "2026-10-27T07:00:00Z",
        teacherReason: "ظرف طارئ في الطريق",
        teacherResponseSubmittedAt: "2026-10-27T08:00:00Z",
      },
      teacher: dummyTeacher,
    });

    expect(html).toContain(".sig > div { white-space: nowrap; }");
    expect(html).toContain("تم التوقيع والمصادقة إلكترونياً");
    expect(html).toContain("white-space:nowrap");
  });
});
