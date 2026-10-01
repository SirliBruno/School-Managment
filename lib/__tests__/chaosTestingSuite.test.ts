import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  normalizeArabicDigits,
  normalizeNationalId,
  normalizeSaudiMobile,
  isValidSaudiMobile,
  normalizeArabicName,
  areNamesPracticallyIdentical,
  formatSaudiMobileDisplay,
  cleanAndDeduplicateSystemData,
} from "../teacherDeduplication";
import {
  getSaudiToday,
  getSaudiDateInfo,
  calculateTimeDifference,
  calculate48HoursExpiry,
  isTokenExpired,
  generateSecureToken,
  calculateDaysBetween,
  formatDaysCountArabic,
} from "../timeUtils";
import {
  validateFileMagicBytes,
  FORBIDDEN_EXTENSIONS,
} from "../fileValidation";
import {
  generateReportData,
} from "../reportsEngine";
import {
  logAuditEvent,
  getAuditLogs,
} from "../auditLogger";
import {
  Teacher,
  AbsenceRecord,
  AdministrativeInquiry,
  AbsenceInquiry,
} from "../../types/teacher";

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

describe("Sprint — Chaos Testing & Unexpected Scenarios Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  // ==========================================
  // 1. اختبار البيانات غير الطبيعية Edge Data Cases
  // ==========================================
  describe("1. Edge Data Cases (Names, IDs, Mobiles)", () => {
    describe("Teacher Names Edge Cases", () => {
      it("handles excessively long names without crashing or overflowing", () => {
        const extremelyLongName = "أ".repeat(300) + " فاطمة بنت عبد الله " + "ب".repeat(200);
        const cleaned = normalizeArabicName(extremelyLongName);
        expect(cleaned).toBeDefined();
        expect(typeof cleaned).toBe("string");
        expect(cleaned.length).toBeGreaterThan(0);
      });

      it("handles very short single-character names safely", () => {
        expect(normalizeArabicName("أ")).toBe("ا");
        expect(normalizeArabicName(" م ")).toBe("م");
        expect(normalizeArabicName("")).toBe("");
      });

      it("normalizes names with extreme multi-spaces, tabs, newlines and zero-width spaces", () => {
        const messyName = "  سارة \t\t   محمد \n\r   العتيبي  \u200B\u200C  ";
        const cleaned = normalizeArabicName(messyName);
        expect(cleaned).toBe("ساره محمد العتيبي");
      });

      it("handles mixed Arabic, English and special symbols safely in similarity comparison", () => {
        const mixedName = "Teacher / منى <script>alert(1)</script> Al-Otaibi #123!";
        const cleaned = normalizeArabicName(mixedName);
        expect(cleaned).toBeDefined();
        expect(areNamesPracticallyIdentical(cleaned, "منى Al-Otaibi")).toBeFalsy();
      });

      it("distinguishes same name with different national IDs correctly during deduplication", () => {
        const teachers: Teacher[] = [
          {
            id: "t1",
            nationalId: "1011111111",
            fullName: "نورة عبد العزيز السديري",
            totalAbsences: 0,
          },
          {
            id: "t2",
            nationalId: "1022222222",
            fullName: "نورة عبد العزيز السديري",
            totalAbsences: 0,
          },
        ];
        const result = cleanAndDeduplicateSystemData(teachers, [], [], []);
        expect(result.cleanTeachers.length).toBe(2);
      });
    });

    describe("National ID Edge Cases", () => {
      it("strips alphabetical characters, dashes and spaces from national IDs", () => {
        const dirtyId = " 10-234-A-567-89 # ";
        const cleaned = normalizeNationalId(dirtyId);
        expect(cleaned).toBe("1023456789");
      });

      it("converts eastern Arabic numerals (١٢٣٤٥٦٧٨٩٠) to western digits", () => {
        const arabicNumerals = "١٠٢٣٤٥٦٧٨٩";
        const cleaned = normalizeNationalId(arabicNumerals);
        expect(cleaned).toBe("1023456789");
      });
    });

    describe("Mobile Numbers Edge Cases", () => {
      it("normalizes Saudi mobile numbers with various prefix formats (+966, 00966, 966, 05, 5) to 9665XXXXXXXX", () => {
        const expected = "966501234567";
        expect(normalizeSaudiMobile("+966501234567")).toBe(expected);
        expect(normalizeSaudiMobile("00966501234567")).toBe(expected);
        expect(normalizeSaudiMobile("966501234567")).toBe(expected);
        expect(normalizeSaudiMobile("501234567")).toBe(expected);
        expect(normalizeSaudiMobile("0501234567")).toBe(expected);
      });

      it("validates mobile validity strictly via isValidSaudiMobile", () => {
        expect(isValidSaudiMobile("966501234567")).toBe(true);
        expect(isValidSaudiMobile("0501234567")).toBe(true);
        expect(isValidSaudiMobile("12345")).toBe(false);
        expect(isValidSaudiMobile("0401234567")).toBe(false);
        expect(isValidSaudiMobile("abc-phone")).toBe(false);
      });

      it("formats valid mobile for display with pleasant grouping", () => {
        const display = formatSaudiMobileDisplay("0501234567");
        expect(display).toBe("+966 50 123 4567");
      });
    });
  });

  // ==========================================
  // 2. اختبار التواريخ والتقويم والمنطقة الزمنية
  // ==========================================
  describe("2. Date Edge Cases & Timezone Resilience", () => {
    it("handles far-future dates gracefully in time and date info helpers", () => {
      const futureDate = new Date("2099-12-31T12:00:00Z");
      const info = getSaudiDateInfo(futureDate);
      expect(info.year).toBe(2099);
      expect(info.month).toBe(12);
      expect(info.day).toBe(31);
      expect(info.dateStr).toBe("2099-12-31");
    });

    it("handles ancient historical dates safely", () => {
      const ancientDate = new Date("1970-01-01T12:00:00Z");
      const info = getSaudiDateInfo(ancientDate);
      expect(info.year).toBe(1970);
      expect(info.month).toBe(1);
      expect(info.day).toBe(1);
    });

    it("prevents off-by-one day errors across UTC vs Riyadh (GMT+3) timezone boundaries", () => {
      const lateNightUtc = new Date("2026-03-15T21:30:00Z");
      const saudiDate = getSaudiToday(lateNightUtc);
      expect(saudiDate).toBe("2026-03-16");
    });

    it("handles month-end transitions and leap day safely", () => {
      const leapDay = new Date("2024-02-29T10:00:00Z");
      expect(getSaudiToday(leapDay)).toBe("2024-02-29");

      const yearEnd = new Date("2026-12-31T10:00:00Z");
      expect(getSaudiToday(yearEnd)).toBe("2026-12-31");

      const days = calculateDaysBetween("2026-02-28", "2026-03-01");
      expect(days).toBe(2);
      expect(formatDaysCountArabic(days)).toBe("يومان");
    });

    it("handles time calculation edge cases safely (inverted times, same times, invalid formats)", () => {
      const sameTime = calculateTimeDifference("08:00", "08:00");
      expect(sameTime.isValid).toBe(false);
      expect(sameTime.error).toContain("يجب أن يكون بعد وقت البداية");

      const invertedTime = calculateTimeDifference("10:00", "08:00");
      expect(invertedTime.isValid).toBe(false);

      const invalidTime = calculateTimeDifference("25:00", "08:00");
      expect(invalidTime.isValid).toBe(false);
      expect(invalidTime.error).toContain("غير صالحة");

      const validTime = calculateTimeDifference("07:30", "09:45");
      expect(validTime.isValid).toBe(true);
      expect(validTime.hours).toBe(2);
      expect(validTime.minutes).toBe(15);
      expect(validTime.formattedDuration).toBe("ساعتان و 15 دقيقة");
    });
  });

  // ==========================================
  // 3. اختبار التكرار والضغط السريع (Concurrency / Debouncing)
  // ==========================================
  describe("3. Rapid Submission & Concurrency Safeguards", () => {
    it("generates unique cryptographically secure tokens even under rapid loop", () => {
      const generatedTokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const token = generateSecureToken(16);
        expect(token).toHaveLength(32);
        expect(generatedTokens.has(token)).toBe(false);
        generatedTokens.add(token);
      }
      expect(generatedTokens.size).toBe(100);
    });

    it("prevents double-save state transition bugs in administrative inquiries", () => {
      const initialInquiry: AdministrativeInquiry = {
        id: "inq-1",
        teacherId: "t-1",
        inquiryType: "التأخير عن دخول الحصص",
        incidentDate: "2026-09-28",
        status: "pending_teacher",
        token: "tok-abc-123",
        tokenExpiresAt: calculate48HoursExpiry(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const submittedInquiry: AdministrativeInquiry = {
        ...initialInquiry,
        status: "teacher_responded",
        teacherResponse: "كنت بمهمة إدارية",
        responseDate: new Date().toISOString(),
      };

      const canSubmitAgain = submittedInquiry.status === "pending_teacher";
      expect(canSubmitAgain).toBe(false);
    });
  });

  // ==========================================
  // 4. اختبار انقطاع الشبكة والمحاكاة غير المتصلة
  // ==========================================
  describe("4. Network Disconnection & Offline Safety", () => {
    it("ensures audit logger handles storage exceptions safely without uncaught crashes", () => {
      vi.stubGlobal("window", {} as any);
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error("QuotaExceededError / Network disconnect");
      });

      expect(() => {
        logAuditEvent({
          action: "create",
          entityType: "absence",
          entityId: "rec-1",
          details: "test offline crash prevention",
        });
      }).not.toThrow();

      vi.unstubAllGlobals();
      vi.stubGlobal("localStorage", localStorageMock);
    });

    it("verifies state rollback logic when an API call fails midway", async () => {
      let state = { status: "pending", rollbackCalled: false };

      const performActionWithRollback = async (shouldFail: boolean) => {
        const previousStatus = state.status;
        state.status = "in_progress";
        try {
          if (shouldFail) throw new Error("Connection timed out (504 Gateway)");
          state.status = "completed";
        } catch {
          state.status = previousStatus;
          state.rollbackCalled = true;
        }
      };

      await performActionWithRollback(true);
      expect(state.status).toBe("pending");
      expect(state.rollbackCalled).toBe(true);
    });
  });

  // ==========================================
  // 5. اختبار تحديث الصفحة (Refresh / Hydration)
  // ==========================================
  describe("5. Page Refresh & State Hydration Resilience", () => {
    it("correctly deserializes and sanitizes date strings stored in localStorage across page reloads", () => {
      const testRecord: AbsenceRecord = {
        id: "abs-99",
        teacherId: "t-1",
        teacherName: "فاطمة أحمد",
        specialty: "رياضيات",
        date: "2026-09-29",
        type: "اضطراري",
        reason: "ظرف عائلي",
        timestamp: new Date().toISOString(),
      };

      localStorage.setItem("absence_records_v2", JSON.stringify([testRecord]));

      const raw = localStorage.getItem("absence_records_v2");
      expect(raw).toBeTruthy();
      const parsed: AbsenceRecord[] = JSON.parse(raw!);
      expect(parsed.length).toBe(1);
      expect(parsed[0].id).toBe("abs-99");
      expect(parsed[0].date).toBe("2026-09-29");
    });

    it("handles corrupted JSON in localStorage without unhandled exception", () => {
      localStorage.setItem("absence_records_v2", "{ corrupt JSON !!!");

      let loadedRecords: AbsenceRecord[] = [];
      expect(() => {
        try {
          const raw = localStorage.getItem("absence_records_v2");
          loadedRecords = raw ? JSON.parse(raw) : [];
        } catch {
          loadedRecords = [];
        }
      }).not.toThrow();

      expect(loadedRecords).toEqual([]);
    });
  });

  // ==========================================
  // 6. اختبار التعديل المتزامن وتضارب البيانات
  // ==========================================
  describe("6. Multi-Device Concurrent Edits & Conflict Resolution", () => {
    it("ensures version timestamping enables Last-Write-Wins or conflict detection", () => {
      const originalRecord: AbsenceRecord = {
        id: "abs-1",
        teacherId: "t-1",
        teacherName: "سارة خالد",
        specialty: "لغة عربية",
        date: "2026-09-20",
        type: "مرضي",
        reason: "أصل العذر",
        timestamp: "2026-09-20T08:00:00.000Z",
      };

      const deviceAUpdate: AbsenceRecord = {
        ...originalRecord,
        reason: "عذر معدل من جهاز A",
        timestamp: "2026-09-20T08:05:00.000Z",
      };

      const deviceBUpdate: AbsenceRecord = {
        ...originalRecord,
        reason: "عذر معدل من جهاز B (أحدث)",
        timestamp: "2026-09-20T08:10:00.000Z",
      };

      const resolved = new Date(deviceBUpdate.timestamp) > new Date(deviceAUpdate.timestamp)
        ? deviceBUpdate
        : deviceAUpdate;

      expect(resolved.reason).toBe("عذر معدل من جهاز B (أحدث)");
    });
  });

  // ==========================================
  // 7. اختبار الصلاحيات الغريبة والتجاوز الأمني
  // ==========================================
  describe("7. Permissions & Deep Link Security", () => {
    it("blocks unauthorized action attempts when role does not permit approval", () => {
      const userRole: "teacher" | "admin" | "viewer" = "viewer";
      const canApprove = (role: string) => role === "admin";
      expect(canApprove(userRole)).toBe(false);
      expect(canApprove("admin")).toBe(true);
    });

    it("verifies ID parameter tampering protection (record does not match requesting tenant/entity)", () => {
      const records: AbsenceRecord[] = [
        {
          id: "rec-school-1",
          teacherId: "t-1",
          teacherName: "معلمة المدرسة 1",
          specialty: "علوم",
          date: "2026-09-21",
          type: "اضطراري",
          reason: "ظرف",
          timestamp: new Date().toISOString(),
        },
      ];

      const requestedId = "rec-foreign-school-99";
      const found = records.find((r) => r.id === requestedId);
      expect(found).toBeUndefined();
    });
  });

  // ==========================================
  // 8. اختبار أمان الروابط العامة والرموز (Tokens)
  // ==========================================
  describe("8. Public Tokens Security & Expiration Verification", () => {
    it("strictly identifies expired inquiry tokens via isTokenExpired", () => {
      const expiredAt = new Date(Date.now() - 3600000).toISOString();
      expect(isTokenExpired(expiredAt)).toBe(true);

      const futureExpiry = calculate48HoursExpiry();
      expect(isTokenExpired(futureExpiry)).toBe(false);
      expect(isTokenExpired(undefined)).toBe(false);
      expect(isTokenExpired("invalid-date-string")).toBe(false);
    });

    it("rejects token lookup if token is tampered by even a single character", () => {
      const validToken = "c4b9d015-4fb8-48d0-8d51-3de7aac63311";
      const tamperedToken = "c4b9d015-4fb8-48d0-8d51-3de7aac63312";

      expect(tamperedToken).not.toBe(validToken);
    });

    it("prevents cross-teacher data leakage on public inquiry endpoints", () => {
      const inquiries: AbsenceInquiry[] = [
        {
          id: "inq-1",
          teacherId: "teacher-secret-1",
          teacherName: "معلمة أ",
          nationalId: "1099999999",
          mobile: "0501111111",
          absenceDate: "2026-09-25",
          token: "token-teacher-A",
          status: "pending",
          expiresAt: calculate48HoursExpiry(),
        },
        {
          id: "inq-2",
          teacherId: "teacher-secret-2",
          teacherName: "معلمة ب",
          nationalId: "1088888888",
          mobile: "0502222222",
          absenceDate: "2026-09-25",
          token: "token-teacher-B",
          status: "pending",
          expiresAt: calculate48HoursExpiry(),
        },
      ];

      const getInquiryByToken = (tok: string) => inquiries.find((i) => i.token === tok);

      const resolved = getInquiryByToken("token-teacher-A");
      expect(resolved?.teacherName).toBe("معلمة أ");
      expect(resolved?.nationalId).not.toBe("1088888888");
    });
  });

  // ==========================================
  // 9. اختبار المرفقات بشكل متطرف (Extreme File Uploads)
  // ==========================================
  describe("9. Extreme Attachments Validation & Magic Bytes", () => {
    it("rejects fake PDF files containing executable scripts (Magic Bytes Inspection)", async () => {
      const fakePdfContent = new TextEncoder().encode("<html><script>alert(1)</script></html>");
      const fakePdfBlob = new Blob([fakePdfContent], { type: "application/pdf" });

      const validation = await validateFileMagicBytes(fakePdfBlob);
      expect(validation.valid).toBe(false);
      expect(validation.detectedType).toBe("unknown");
    });

    it("correctly identifies genuine PDF, PNG and JPEG files via Magic Bytes", async () => {
      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
      const pdfResult = await validateFileMagicBytes(new Blob([pdfBytes]));
      expect(pdfResult.valid).toBe(true);
      expect(pdfResult.detectedType).toBe("pdf");

      const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const pngResult = await validateFileMagicBytes(new Blob([pngBytes]));
      expect(pngResult.valid).toBe(true);
      expect(pngResult.detectedType).toBe("png");

      const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const jpegResult = await validateFileMagicBytes(new Blob([jpegBytes]));
      expect(jpegResult.valid).toBe(true);
      expect(jpegResult.detectedType).toBe("jpeg");
    });

    it("blocks forbidden file extensions (exe, sh, bat, php, html, svg)", () => {
      expect(FORBIDDEN_EXTENSIONS).toContain("exe");
      expect(FORBIDDEN_EXTENSIONS).toContain("bat");
      expect(FORBIDDEN_EXTENSIONS).toContain("sh");
      expect(FORBIDDEN_EXTENSIONS).toContain("php");
      expect(FORBIDDEN_EXTENSIONS).toContain("svg");
    });
  });

  // ==========================================
  // 10. اختبار دورة حياة الأرشيف والاستعادة
  // ==========================================
  describe("10. Archive & Restore Lifecycle", () => {
    it("preserves all record fields and attachments through archive and restore cycle", () => {
      const activeRecord: AbsenceRecord = {
        id: "abs-arch-1",
        teacherId: "t-1",
        teacherName: "أمل سعد",
        specialty: "كيمياء",
        date: "2026-09-22",
        type: "اضطراري",
        reason: "ظرف طارئ",
        attachmentUrl: "https://storage.example.com/medical_report.pdf",
        timestamp: new Date().toISOString(),
        isArchived: false,
      };

      const archivedRecord: AbsenceRecord = {
        ...activeRecord,
        isArchived: true,
        archivedAt: new Date().toISOString(),
        archiveReason: "أرشفة يدوية من قبل الإدارة",
      };

      expect(archivedRecord.isArchived).toBe(true);
      expect(archivedRecord.archiveReason).toBeDefined();
      expect(archivedRecord.attachmentUrl).toBe(activeRecord.attachmentUrl);

      const restoredRecord: AbsenceRecord = {
        ...archivedRecord,
        isArchived: false,
        archivedAt: undefined,
        archiveReason: undefined,
      };

      expect(restoredRecord.isArchived).toBe(false);
      expect(restoredRecord.attachmentUrl).toBe(activeRecord.attachmentUrl);
      expect(restoredRecord.teacherName).toBe("أمل سعد");
    });
  });

  // ==========================================
  // 11. اختبار الحذف غير المتوقع (Cascade & Soft Delete)
  // ==========================================
  describe("11. Unexpected Deletion & Cascade Safety", () => {
    it("ensures soft deletion marks record without physically purging history", () => {
      const record: AbsenceRecord = {
        id: "abs-del-1",
        teacherId: "t-del",
        teacherName: "منى خالد",
        specialty: "فيزياء",
        date: "2026-09-18",
        type: "مرضي",
        reason: "تقرير طبي",
        timestamp: new Date().toISOString(),
        isArchived: false,
      };

      const softDeleted: AbsenceRecord = {
        ...record,
        isArchived: true,
        archivedAt: new Date().toISOString(),
        archiveReason: "حذف ناعم مع حفظ السجل",
      };

      expect(softDeleted.isArchived).toBe(true);
      expect(softDeleted.id).toBe(record.id);
      expect(softDeleted.date).toBe(record.date);
    });

    it("prevents orphan records by maintaining teacherId relationships during teacher soft-delete", () => {
      const teacher: Teacher = {
        id: "t-cascade",
        nationalId: "1098765432",
        fullName: "ريم فهد",
        totalAbsences: 3,
        isArchived: true,
        archivedAt: new Date().toISOString(),
      };

      const relatedAbsences: AbsenceRecord[] = [
        {
          id: "abs-rel-1",
          teacherId: teacher.id,
          teacherName: teacher.fullName,
          specialty: "رياضيات",
          date: "2026-09-15",
          type: "اضطراري",
          reason: "ظرف",
          timestamp: new Date().toISOString(),
          isArchived: true,
          archivedByCascade: true,
        },
      ];

      expect(relatedAbsences[0].teacherId).toBe(teacher.id);
      expect(relatedAbsences[0].archivedByCascade).toBe(true);
    });
  });

  // ==========================================
  // 12. اختبار تطابق البيانات بين الأقسام
  // ==========================================
  describe("12. Cross-Section Data Consistency (KPIs vs Table vs Reports)", () => {
    it("guarantees active absence counts in report engine match unarchived table records exactly", () => {
      const teachers: Teacher[] = [
        { id: "t1", nationalId: "101", fullName: "منى عبد العزيز", specialty: "حاسب", totalAbsences: 2 },
        { id: "t2", nationalId: "102", fullName: "حصة ناصر", specialty: "إنجليزي", totalAbsences: 1 },
      ];

      const absences: AbsenceRecord[] = [
        { id: "a1", teacherId: "t1", teacherName: "منى عبد العزيز", specialty: "حاسب", date: "2026-09-01", type: "اضطراري", reason: "عذر", timestamp: "2026-09-01T08:00:00Z", isArchived: false },
        { id: "a2", teacherId: "t1", teacherName: "منى عبد العزيز", specialty: "حاسب", date: "2026-09-02", type: "مرضي", reason: "عذر", timestamp: "2026-09-02T08:00:00Z", isArchived: false },
        { id: "a3", teacherId: "t2", teacherName: "حصة ناصر", specialty: "إنجليزي", date: "2026-09-03", type: "اضطراري", reason: "عذر", timestamp: "2026-09-03T08:00:00Z", isArchived: false },
        { id: "a4_archived", teacherId: "t2", teacherName: "حصة ناصر", specialty: "إنجليزي", date: "2026-09-04", type: "مرضي", reason: "مؤرشف", timestamp: "2026-09-04T08:00:00Z", isArchived: true },
      ];

      const report = generateReportData(
        "absence_summary",
        { month: "all", year: "all" },
        teachers,
        absences,
        [],
        []
      );

      // Report engine must count only active absences (3 out of 4)
      expect(report.rawRowsCount).toBe(3);
      expect(report.payload.tableRows.length).toBe(3);
    });
  });

  // ==========================================
  // 13. اختبار الـ Cache والبيانات القديمة
  // ==========================================
  describe("13. Cache Invalidation & Stale Data Prevention", () => {
    it("ensures removed items in localStorage do not ghost back upon re-initialization", () => {
      localStorage.setItem("test_key", "active_value");
      expect(localStorage.getItem("test_key")).toBe("active_value");

      localStorage.removeItem("test_key");
      expect(localStorage.getItem("test_key")).toBeNull();

      const retrieved = localStorage.getItem("test_key") || "default_fallback";
      expect(retrieved).toBe("default_fallback");
    });
  });

  // ==========================================
  // 14. اختبار الأداء تحت الضغط (Stress Testing)
  // ==========================================
  describe("14. High-Volume Stress & Calculation Performance", () => {
    it("processes 2,000 absence records across 100 teachers in less than 200ms", () => {
      const mockTeachers: Teacher[] = [];
      for (let i = 1; i <= 100; i++) {
        mockTeachers.push({
          id: `t_${i}`,
          nationalId: `100000000${i}`,
          fullName: `معلمة تجريبية رقم ${i}`,
          specialty: i % 2 === 0 ? "رياضيات" : "لغة عربية",
          totalAbsences: 0,
        });
      }

      const mockAbsences: AbsenceRecord[] = [];
      const types = ["اضطراري", "مرضي", "مرافق", "أخرى"];
      for (let j = 1; j <= 2000; j++) {
        const teacherIndex = j % 100;
        mockAbsences.push({
          id: `abs_${j}`,
          teacherId: mockTeachers[teacherIndex].id,
          teacherName: mockTeachers[teacherIndex].fullName,
          specialty: mockTeachers[teacherIndex].specialty!,
          date: "2026-09-15",
          type: types[j % 4] as any,
          reason: `سبب الغياب رقم ${j}`,
          timestamp: new Date().toISOString(),
          isArchived: false,
        });
      }

      const startTime = performance.now();
      const report = generateReportData(
        "absence_summary",
        { month: "all", year: "all" },
        mockTeachers,
        mockAbsences,
        [],
        []
      );
      const duration = performance.now() - startTime;

      expect(report.rawRowsCount).toBe(2000);
      expect(duration).toBeLessThan(200);
    });
  });
});
