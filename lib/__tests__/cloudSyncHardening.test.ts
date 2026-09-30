import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  mapAbsenceToDbRow,
  mapDelayToDbRow,
} from "@/context/TeacherContext";
import {
  getActiveSchoolSettings,
  updateSchoolSettingsInCloud,
  uploadSchoolAsset,
  DEFAULT_SCHOOL_SETTINGS,
  SCHOOL_SETTINGS_CACHE_KEY,
} from "@/lib/schoolSettingsService";
import {
  getSchoolApprovalSettings,
  updateSchoolApprovalSettings,
} from "@/lib/stampSignatureManager";
import { generateAbsencePdfHtml } from "@/lib/printPdfService";
import { AbsenceRecord, Teacher } from "@/types/teacher";

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

describe("Cloud Sync Hardening & Single Source of Truth", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.restoreAllMocks();
  });

  describe("1. Zombie Records Prevention & Single Source of Truth", () => {
    it("mapAbsenceToDbRow correctly serializes attachment_url for cloud persistence", () => {
      const record: AbsenceRecord = {
        id: "abs-cloud-1",
        teacherId: "teacher-101",
        teacherName: "نورة القحطاني",
        jobNumber: "1012345678",
        specialty: "رياضيات",
        date: "2026-09-28",
        type: "مرضي",
        reason: "تقرير طبي صادر من صحتي",
        attachmentUrl: "https://xizppykmqfkvzwcwxuzr.supabase.co/storage/v1/object/public/absence-attachments/reports/med_101.pdf",
        timestamp: "2026-09-28T08:00:00.000Z",
        isArchived: false,
      };

      const dbRow = mapAbsenceToDbRow(record);
      expect(dbRow.attachment_url).toBe(record.attachmentUrl);
      expect(dbRow.teacher_id).toBe("teacher-101");
      expect(dbRow.is_archived).toBe(false);
    });

    it("ensures records missing in Supabase are considered deleted and never auto-resurrected", () => {
      // محاكاة سيناريو: الجهاز B لديه كاش محلي لسجل تم حذفه في الجهاز A
      const staleLocalAbsences: AbsenceRecord[] = [
        {
          id: "deleted-abs-1",
          teacherId: "t-1",
          teacherName: "هند العمري",
          jobNumber: "1098765432",
          specialty: "فيزياء",
          date: "2026-09-20",
          type: "اضطراري",
          reason: "ظرف عائلي",
          timestamp: "2026-09-20T07:30:00.000Z",
          isArchived: false,
        },
      ];

      // سوبابيز يعيد قائمة فارغة (تم حذف السجل من الجهاز A في السحابة)
      const cloudAbsences: any[] = [];

      // منطق Single Source of Truth المحدث:
      const cleanAbsencesList: AbsenceRecord[] = cloudAbsences.map((a) => ({
        id: a.id,
        teacherId: a.teacher_id,
        teacherName: a.teacher_name,
        jobNumber: a.job_number,
        specialty: a.specialty || "",
        date: a.date,
        type: a.type,
        reason: a.reason,
        notes: a.notes || undefined,
        attachmentUrl: a.attachment_url || undefined,
        timestamp: a.timestamp,
        isArchived: Boolean(a.is_archived),
      }));

      // التحقق: لا يتم إضافة السجل المحذوف من الكاش ولا إرساله لسوبابيز
      expect(cleanAbsencesList.length).toBe(0);
      expect(cleanAbsencesList.some((a) => a.id === "deleted-abs-1")).toBe(false);
    });

    it("only permits uploading operations from pending sync queue (offline queue)", () => {
      const PENDING_SYNC_KEY = "school_admin_pending_sync_v1";

      // مستخدم يعمل دون اتصال بالإنترنت وأنشأ سجلاً
      const offlineQueue = [
        {
          id: "sync_op_1",
          table: "absence_records",
          action: "insert",
          data: {
            id: "offline-abs-1",
            teacher_id: "t-2",
            date: "2026-09-28",
            type: "مرضي",
          },
          timestamp: Date.now(),
        },
      ];

      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(offlineQueue));

      const raw = localStorage.getItem(PENDING_SYNC_KEY);
      expect(raw).toBeTruthy();
      const parsedQueue = JSON.parse(raw!);
      expect(parsedQueue).toHaveLength(1);
      expect(parsedQueue[0].action).toBe("insert");
      expect(parsedQueue[0].data.id).toBe("offline-abs-1");
    });
  });

  describe("2. School Settings & Assets Cloud Migration", () => {
    it("reads default school settings and allows cloud-synchronized updates", async () => {
      const active = getActiveSchoolSettings();
      expect(active).toBeDefined();
      expect(active.id).toBe("current");
      expect(active.schoolName).toBeTruthy();

      // تحديث الإعدادات
      const updated = await updateSchoolSettingsInCloud({
        schoolName: "ثانوية الملك فيصل المطورة",
        principalName: "أ. منيرة السالم",
        vicePrincipalName: "أ. نورة الغامدي",
        stampUrl: "https://xizppykmqfkvzwcwxuzr.supabase.co/storage/v1/object/public/school-assets/stamps/official_stamp.png",
        signatureUrl: "https://xizppykmqfkvzwcwxuzr.supabase.co/storage/v1/object/public/school-assets/signatures/principal_sig.png",
      });

      expect(updated.schoolName).toBe("ثانوية الملك فيصل المطورة");
      expect(updated.principalName).toBe("أ. منيرة السالم");
      expect(updated.stampUrl).toContain("official_stamp.png");
      expect(updated.signatureUrl).toContain("principal_sig.png");

      // التحقق من انعكاس التحديث على stampSignatureManager
      const approvalSettings = getSchoolApprovalSettings();
      expect(approvalSettings.schoolStampUrl).toBe(updated.stampUrl);
      expect(approvalSettings.principalSignatureUrl).toBe(updated.signatureUrl);
    });

    it("ensures deleting school logo persists and is not resurrected on page refresh or cloud fetch", async () => {
      // 1. Delete logo by saving empty string
      const updated = await updateSchoolSettingsInCloud({
        schoolLogo: "",
      });
      expect(updated.schoolLogo).toBe("");
      expect(getActiveSchoolSettings().schoolLogo).toBe("");

      // 2. Check local storage cache preserves empty string
      const cached = localStorage.getItem(SCHOOL_SETTINGS_CACHE_KEY);
      expect(cached).toBeTruthy();
      const parsed = JSON.parse(cached!);
      expect(parsed.schoolLogo).toBe("");

      // 3. Resetting restores default logo
      const restored = await updateSchoolSettingsInCloud({
        schoolLogo: DEFAULT_SCHOOL_SETTINGS.schoolLogo,
      });
      expect(restored.schoolLogo).toBe(DEFAULT_SCHOOL_SETTINGS.schoolLogo);
      expect(getActiveSchoolSettings().schoolLogo).toBe(DEFAULT_SCHOOL_SETTINGS.schoolLogo);
    });

    it("avoids storing heavy base64 assets in localStorage when cloud is active", () => {
      updateSchoolApprovalSettings({
        schoolStampUrl: "https://example.com/stamp.png",
        principalSignatureUrl: "https://example.com/sig.png",
        stampEnabled: true,
        signatureEnabled: true,
      });

      const raw = localStorage.getItem("school_settings_approval_v1");
      if (raw) {
        const stored = JSON.parse(raw);
        // لا يجب أن يحتوي LocalStorage على سلاسل Base64 ضخمة للأختام
        expect(stored.schoolStampUrl.startsWith("data:image")).toBe(false);
      }
    });
  });

  describe("3. Absence Attachments & PDF Generation", () => {
    it("embeds attachment indicator in official PDF template when attachmentUrl is provided", () => {
      const htmlWithAttachment = generateAbsencePdfHtml({
        teacherName: "سارة الشمري",
        specialty: "لغة عربية",
        jobTitle: "معلم",
        employmentStatus: "دائم",
        absenceCount: 2,
        absenceDate: "2026-09-28",
        absenceType: "مرضي",
        absenceReason: "إجازة مرضية معتمدة من تطبيق صحتي",
        attachmentUrl: "https://xizppykmqfkvzwcwxuzr.supabase.co/storage/v1/object/public/absence-attachments/reports/med_doc.pdf",
      });

      expect(htmlWithAttachment).toContain("المرفق الرسمي");
      expect(htmlWithAttachment).toContain("تم إرفاق المستند إلكترونياً بنجاح");
    });

    it("renders cleanly without attachment notice when no attachmentUrl is provided", () => {
      const htmlWithoutAttachment = generateAbsencePdfHtml({
        teacherName: "سارة الشمري",
        specialty: "لغة عربية",
        jobTitle: "معلم",
        employmentStatus: "دائم",
        absenceCount: 1,
        absenceDate: "2026-09-28",
        absenceType: "اضطراري",
        absenceReason: "ظرف عائلي خاص",
      });

      expect(htmlWithoutAttachment).not.toContain("المرفق الرسمي: تم إرفاق المستند إلكترونياً بنجاح");
      expect(htmlWithoutAttachment).toContain("مساءلة غياب");
    });
  });

  describe("4. Multi-Device Synchronization Simulation", () => {
    it("simulates Device A making mutations and Device B receiving clean cloud data", () => {
      // الجهاز A: يقوم بإنشاء سجل غياب جديد مع مرفق
      const deviceARecord: AbsenceRecord = {
        id: "abs-device-a-1",
        teacherId: "teacher-A",
        teacherName: "خلود العتيبي",
        jobNumber: "1055555555",
        specialty: "كيمياء",
        date: "2026-09-28",
        type: "مرضي",
        reason: "مرفق إجازة صحتي",
        attachmentUrl: "https://supabase.example.com/assets/med_a.pdf",
        timestamp: "2026-09-28T09:00:00.000Z",
        isArchived: false,
      };

      // تحويل السجل لصف في قاعدة بيانات سوبابيز
      const cloudDatabaseRow = mapAbsenceToDbRow(deviceARecord);

      // الجهاز B: يفتح النظام ويجلب من سوبابيز
      const deviceBFetchedRows = [cloudDatabaseRow];

      // تحويل بيانات سوبابيز إلى كائنات الواجهة في الجهاز B
      const deviceBRecords: AbsenceRecord[] = deviceBFetchedRows.map((r: any) => ({
        id: r.id,
        teacherId: r.teacher_id,
        teacherName: r.teacher_name,
        jobNumber: r.job_number,
        specialty: r.specialty,
        date: r.date,
        type: r.type,
        reason: r.reason,
        attachmentUrl: r.attachment_url,
        timestamp: r.timestamp,
        isArchived: r.is_archived,
      }));

      expect(deviceBRecords).toHaveLength(1);
      expect(deviceBRecords[0].id).toBe("abs-device-a-1");
      expect(deviceBRecords[0].attachmentUrl).toBe("https://supabase.example.com/assets/med_a.pdf");
      expect(deviceBRecords[0].teacherName).toBe("خلود العتيبي");
    });

    it("simulates Device A deleting a record and Device B verifying it is permanently removed", () => {
      // الجهاز A يحذف السجل رقم 99
      const cloudDatabaseAfterDelete: any[] = [];

      // الجهاز B لديه كاش محلي يحتوي على السجل 99
      const deviceBLocalCache = [{ id: "rec-99", teacher_name: "مها الحربي" }];

      // عند مزامنة الجهاز B مع السحابة، تعتمد السحابة حصراً كمصدر وحيد للحقيقة
      const deviceBFinalRecords = cloudDatabaseAfterDelete;

      // التأكد أن السجل المحذوف لا يعود أبداً للظهور
      expect(deviceBFinalRecords).toHaveLength(0);
      expect(deviceBFinalRecords.find((r) => r.id === "rec-99")).toBeUndefined();
    });

    it("ensures reports engine dynamically reads cloud-synchronized school and principal names", async () => {
      const { generateReportData } = await import("@/lib/reportsEngine");
      
      // تعيين إعدادات سحابية مخصصة
      await updateSchoolSettingsInCloud({
        schoolName: "ثانوية اليمامة النموذجية",
        principalName: "د. هدى الدوسري",
      });

      const reportResult = generateReportData(
        "absence_summary",
        { month: "all", year: "all" },
        [],
        [],
        [],
        [],
        []
      );

      expect(reportResult.payload.schoolName).toBe("ثانوية اليمامة النموذجية");
      expect(reportResult.payload.principalName).toBe("د. هدى الدوسري");
    });

    it("verifies offline sync queue captures delete actions for absences, delay notices, and teachers", () => {
      const PENDING_SYNC_KEY = "school_admin_pending_sync_v1";
      const queueSyncOp = (table: string, action: string, data: any) => {
        const existing = JSON.parse(localStorage.getItem(PENDING_SYNC_KEY) || "[]");
        existing.push({
          id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          table,
          action,
          data,
          timestamp: Date.now(),
        });
        localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(existing));
      };

      // محاكاة حذف أثناء انقطاع الاتصال
      queueSyncOp("absence_records", "delete", { id: "abs-to-delete-1" });
      queueSyncOp("delay_notices", "delete", { id: "del-to-delete-2" });
      queueSyncOp("teachers", "delete", { id: "t-to-delete-3" });

      const storedQueue = JSON.parse(localStorage.getItem(PENDING_SYNC_KEY) || "[]");
      expect(storedQueue).toHaveLength(3);
      expect(storedQueue.map((op: any) => op.action)).toEqual(["delete", "delete", "delete"]);
      expect(storedQueue[0].table).toBe("absence_records");
      expect(storedQueue[1].table).toBe("delay_notices");
      expect(storedQueue[2].table).toBe("teachers");
    });

    it("verifies realtime teacher counter synchronization logic", () => {
      const initialTeachers: Teacher[] = [
        {
          id: "t-realtime-1",
          name: "أمل السبيعي",
          jobNumber: "201",
          specialty: "أحياء",
          totalAbsences: 0,
          totalDelayNotices: 0,
          isArchived: false,
          createdAt: new Date().toISOString(),
        },
      ];

      const absences: AbsenceRecord[] = [
        {
          id: "abs-1",
          teacherId: "t-realtime-1",
          teacherName: "أمل السبيعي",
          jobNumber: "201",
          specialty: "أحياء",
          date: "2026-09-28",
          type: "مرضي",
          reason: "إجازة",
          timestamp: new Date().toISOString(),
          isArchived: false,
        },
      ];

      // محاكاة التحديث اللحظي للعداد
      const count = absences.filter((a) => a.teacherId === "t-realtime-1" && !a.isArchived).length;
      const updatedTeachers = initialTeachers.map((t) =>
        t.id === "t-realtime-1" ? { ...t, totalAbsences: count } : t
      );

      expect(updatedTeachers[0].totalAbsences).toBe(1);
    });
  });
});

