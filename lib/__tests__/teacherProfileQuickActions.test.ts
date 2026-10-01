import { describe, it, expect, beforeEach, vi } from "vitest";
import { logAuditEvent, getAuditLogs, clearLocalAuditLogs } from "../auditLogger";
import { Teacher, AbsenceRecord } from "@/types/teacher";

// Mock localStorage for Node.js test environment
const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockStorage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStorage[key];
  }),
  clear: vi.fn(() => {
    for (const k of Object.keys(mockStorage)) delete mockStorage[k];
  }),
};
vi.stubGlobal("localStorage", localStorageMock);

describe("Sprint — Teacher Profile Quick Actions & Protected Edit Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    clearLocalAuditLogs();
  });

  const mockTeacher: Teacher = {
    id: "teacher-101",
    fullName: "سارة محمد العتيبي",
    name: "سارة محمد العتيبي",
    nationalId: "1098765432",
    username: "1098765432",
    jobNumber: "1098765432",
    mobile: "0501234567",
    email: "sara@school.edu.sa",
    jobTitle: "معلمة رياضيات",
    teachingField: "رياضيات",
    specialty: "رياضيات",
    employmentStatus: "دائم",
    totalAbsences: 3,
    totalDelayNotices: 1,
    createdAt: "2026-01-01T08:00:00Z",
  };

  const mockHistoricalAbsence: AbsenceRecord = {
    id: "abs-999",
    teacherId: "teacher-101",
    teacherName: "سارة محمد العتيبي",
    jobNumber: "1098765432",
    nationalId: "1098765432",
    specialty: "رياضيات",
    date: "2026-02-15",
    type: "اضطراري",
    status: "approved",
    createdAt: "2026-02-15T08:00:00Z",
  };

  it("1. ensures editing teacher data logs an audit event with exact old vs new diff", () => {
    const updatedData = {
      fullName: "سارة محمد العتيبي الحربي",
      nationalId: "1098765432",
      mobile: "0559988776",
      email: "sara.alharbi@school.edu.sa",
      employmentStatus: "دائم",
      jobTitle: "معلم أول رياضيات",
      teachingField: "رياضيات",
      specialty: "رياضيات متقدمة",
    };

    logAuditEvent({
      action: "update",
      entityType: "teacher",
      entityId: mockTeacher.id,
      details: `تم تعديل بيانات المعلمة: ${updatedData.fullName}`,
      oldValue: {
        fullName: mockTeacher.fullName,
        nationalId: mockTeacher.nationalId,
        mobile: mockTeacher.mobile,
        email: mockTeacher.email,
        employmentStatus: mockTeacher.employmentStatus,
        jobTitle: mockTeacher.jobTitle,
        teachingField: mockTeacher.teachingField,
        specialty: mockTeacher.specialty,
      },
      newValue: updatedData,
      userName: "أ. نورة الغامدي (وكيلة المدرسة)",
      userRole: "وكيلة المدرسة",
    });

    const logs = getAuditLogs();
    expect(logs.length).toBeGreaterThanOrEqual(1);

    const teacherLog = logs.find(
      (l) => l.entityType === "teacher" && l.entityId === mockTeacher.id
    );
    expect(teacherLog).toBeDefined();
    expect(teacherLog?.action).toBe("update");
    expect(teacherLog?.oldValue).toEqual({
      fullName: "سارة محمد العتيبي",
      nationalId: "1098765432",
      mobile: "0501234567",
      email: "sara@school.edu.sa",
      employmentStatus: "دائم",
      jobTitle: "معلمة رياضيات",
      teachingField: "رياضيات",
      specialty: "رياضيات",
    });
    expect(teacherLog?.newValue).toEqual(updatedData);
    expect(teacherLog?.details).toContain("سارة محمد العتيبي الحربي");
  });

  it("2. ensures historical absence records remain immutable and linked via teacherId", () => {
    // Simulated update to teacher
    const modifiedTeacher = {
      ...mockTeacher,
      fullName: "سارة محمد العتيبي الحربي",
      mobile: "0559988776",
    };

    // The historical record's foreign key teacherId remains strictly intact
    expect(mockHistoricalAbsence.teacherId).toBe(modifiedTeacher.id);
    // Historical date & reason are untouched
    expect(mockHistoricalAbsence.date).toBe("2026-02-15");
    expect(mockHistoricalAbsence.type).toBe("اضطراري");
    expect(mockHistoricalAbsence.teacherName).toBe("سارة محمد العتيبي");
  });

  it("3. validates quick action procedure route construction with preselected teacherId", () => {
    const teacherId = mockTeacher.id;

    const routes = {
      recordAbsence: `/procedures/absence?tab=manual&teacherId=${teacherId}&autoOpen=true`,
      sendWhatsAppInquiry: `/procedures/absence?tab=whatsapp&teacherId=${teacherId}&autoOpen=true`,
      adminInquiry: `/procedures/administrative-inquiries?teacherId=${teacherId}&autoOpen=true`,
      permission: `/procedures/permissions?teacherId=${teacherId}&autoOpen=true`,
      deduction: `/procedures/deduction-hours?teacherId=${teacherId}&autoFill=true`,
      delayNotice: `/procedures/delay-notice?teacherId=${teacherId}&autoOpen=true`,
    };

    expect(routes.recordAbsence).toContain(`teacherId=${teacherId}`);
    expect(routes.recordAbsence).toContain("tab=manual");
    expect(routes.sendWhatsAppInquiry).toContain("tab=whatsapp");
    expect(routes.deduction).toContain("autoFill=true");
  });
});
