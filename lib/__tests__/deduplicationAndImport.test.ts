import { describe, it, expect } from "vitest";
import {
  normalizeArabicDigits,
  normalizeNationalId,
  normalizeSaudiMobile,
  isValidSaudiMobile,
  isValidEmail,
  normalizeEmploymentStatus,
  validateAndParseRow,
  planTeacherImport,
  cleanAndDeduplicateSystemData,
} from "../teacherDeduplication";
import {
  STANDARD_EXCEL_HEADERS,
  parseExcelData,
} from "../excelParser";
import {
  Teacher,
  AbsenceRecord,
  DelayNotice,
  AbsenceInquiry,
  ArchivedTeacher,
  ExcelTeacherRow,
} from "@/types/teacher";
import {
  OFFICIAL_TEACHERS,
  reconcileWithOfficialTeachers,
} from "../officialTeachersData";
import * as XLSX from "xlsx";

describe("Teacher Deduplication and Import System", () => {
  // =========================================================================
  // Scenario 6: Arabic Numerals Conversion (الأرقام العربية)
  // =========================================================================
  describe("Scenario 6: Arabic Numerals Conversion (الأرقام العربية)", () => {
    it("converts Eastern Arabic-Indic numerals (٠-٩) to ASCII digits (0-9)", () => {
      expect(normalizeArabicDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
      expect(normalizeArabicDigits("١٠٤٨٢٩١٠٢٣")).toBe("1048291023");
      expect(normalizeArabicDigits("٠٥٠١٢٣٤٥٦٧")).toBe("0501234567");
    });

    it("converts Persian/Urdu digits (۰-۹) to ASCII digits (0-9)", () => {
      expect(normalizeArabicDigits("۰۱۲۳۴۵۶۷۸۹")).toBe("0123456789");
    });

    it("normalizes national IDs containing Arabic digits, spaces, and hyphens", () => {
      expect(normalizeNationalId(" ١٠٤٨-٢٩١-٠٢٣ ")).toBe("1048291023");
      expect(normalizeNationalId("1048-291-023")).toBe("1048291023");
      expect(normalizeNationalId(" 1048291023 ")).toBe("1048291023");
    });
  });

  // =========================================================================
  // Scenario 7: Mobile Number Formats Normalization (صيغ الجوال المختلفة)
  // =========================================================================
  describe("Scenario 7: Mobile Number Formats Normalization (صيغ الجوال المختلفة)", () => {
    it("normalizes all variations of Saudi mobile numbers to 9665XXXXXXXX", () => {
      const expected = "966501234567";

      expect(normalizeSaudiMobile("0501234567")).toBe(expected);
      expect(normalizeSaudiMobile("+966501234567")).toBe(expected);
      expect(normalizeSaudiMobile("966501234567")).toBe(expected);
      expect(normalizeSaudiMobile("00966501234567")).toBe(expected);
      expect(normalizeSaudiMobile("501234567")).toBe(expected);
      expect(normalizeSaudiMobile("050-123-4567")).toBe(expected);
      expect(normalizeSaudiMobile(" 050 123 4567 ")).toBe(expected);
      expect(normalizeSaudiMobile("٠٥٠١٢٣٤٥٦٧")).toBe(expected);
      expect(normalizeSaudiMobile("+٩٦٦٥٠١٢٣٤٥٦٧")).toBe(expected);
    });

    it("correctly validates valid and invalid Saudi mobile formats", () => {
      expect(isValidSaudiMobile("0501234567")).toBe(true);
      expect(isValidSaudiMobile("966501234567")).toBe(true);
      expect(isValidSaudiMobile("+966501234567")).toBe(true);
      expect(isValidSaudiMobile("0559876543")).toBe(true);

      expect(isValidSaudiMobile("0112345678")).toBe(false); // Landline
      expect(isValidSaudiMobile("12345")).toBe(false); // Too short
      expect(isValidSaudiMobile("")).toBe(false); // Empty
      expect(isValidSaudiMobile(undefined)).toBe(false);
    });
  });

  // =========================================================================
  // Scenario 5: Missing and Invalid Fields Validation (صفوف ناقصة)
  // =========================================================================
  describe("Scenario 5: Missing and Invalid Fields Validation (صفوف ناقصة)", () => {
    it("rejects row when Name is missing with reason", () => {
      const row: ExcelTeacherRow = {
        "رقم الهوية": "1048291023",
        التخصص: "رياضيات",
        الجوال: "0501234567",
      };
      const result = validateAndParseRow(row, 1);
      expect(result.teacher).toBeUndefined();
      expect(result.skippedReason).toContain("الإسم فارغ");
    });

    it("rejects row when National ID is missing with reason", () => {
      const row: ExcelTeacherRow = {
        الإسم: "سارة عبد الله العتيبي",
        التخصص: "رياضيات",
      };
      const result = validateAndParseRow(row, 2);
      expect(result.teacher).toBeUndefined();
      expect(result.skippedReason).toContain("رقم الهوية فارغ");
    });

    it("rejects row when Specialty / Teaching Field is missing with reason", () => {
      const row: ExcelTeacherRow = {
        الإسم: "سارة عبد الله العتيبي",
        "رقم الهوية": "1048291023",
      };
      const result = validateAndParseRow(row, 3);
      expect(result.teacher).toBeUndefined();
      expect(result.skippedReason).toContain("التخصص");
    });

    it("rejects row when Email format is invalid", () => {
      const row: ExcelTeacherRow = {
        الإسم: "سارة عبد الله العتيبي",
        "رقم الهوية": "1048291023",
        التخصص: "رياضيات",
        "البريد الإلكتروني": "invalid-email-address",
      };
      const result = validateAndParseRow(row, 4);
      expect(result.teacher).toBeUndefined();
      expect(result.skippedReason).toContain("البريد الإلكتروني غير صحيحة");
    });

    it("rejects row when Mobile format is invalid", () => {
      const row: ExcelTeacherRow = {
        الإسم: "سارة عبد الله العتيبي",
        "رقم الهوية": "1048291023",
        التخصص: "رياضيات",
        الجوال: "12345",
      };
      const result = validateAndParseRow(row, 5);
      expect(result.teacher).toBeUndefined();
      expect(result.skippedReason).toContain("رقم الجوال غير صحيحة");
    });

    it("rejects row when Employment Status is not 'دائم' or 'عقد'", () => {
      const row: ExcelTeacherRow = {
        الإسم: "سارة عبد الله العتيبي",
        "رقم الهوية": "1048291023",
        التخصص: "رياضيات",
        "حالة التوظيف": "مؤقت غير معتمد",
      };
      const result = validateAndParseRow(row, 6);
      expect(result.teacher).toBeUndefined();
      expect(result.skippedReason).toContain("حالة التوظيف غير صالحة");
    });
  });

  // =========================================================================
  // Scenario 1: First Time Import (استيراد أول مرة)
  // =========================================================================
  describe("Scenario 1: First Time Import (استيراد أول مرة)", () => {
    it("imports 3 new teachers successfully with 0 updated, 0 restored, 0 skipped", () => {
      const rawRows: ExcelTeacherRow[] = [
        {
          الإسم: "سارة عبد الله العتيبي",
          "رقم الهوية": "1048291023",
          التخصص: "لغة عربية",
          الجوال: "0501234567",
          "البريد الإلكتروني": "sara@moe.gov.sa",
          "حالة التوظيف": "دائم",
        },
        {
          الإسم: "ريم خالد القحطاني",
          "رقم الهوية": "1059283741",
          التخصص: "رياضيات",
          الجوال: "0559876543",
          "حالة التوظيف": "عقد",
        },
        {
          الإسم: "فاطمة محمد الغامدي",
          "رقم الهوية": "1038472910",
          التخصص: "علوم",
          الجوال: "0543210987",
        },
      ];

      const currentTeachers: Teacher[] = [];
      const plan = planTeacherImport(rawRows, currentTeachers);

      expect(plan.newTeachers.length).toBe(3);
      expect(plan.updatedTeachers.length).toBe(0);
      expect(plan.restoredTeachers.length).toBe(0);
      expect(plan.skippedRows.length).toBe(0);
      expect(plan.totalRows).toBe(3);

      expect(plan.newTeachers[0].nationalId).toBe("1048291023");
      expect(plan.newTeachers[0].mobile).toBe("966501234567");
      expect(plan.newTeachers[1].employmentStatus).toBe("عقد");
    });
  });

  // =========================================================================
  // Scenario 2: Re-importing Same File (استيراد نفس الملف مرة ثانية)
  // =========================================================================
  describe("Scenario 2: Re-importing Same File (استيراد نفس الملف مرة ثانية)", () => {
    it("results in 0 added and 0 updated when data is identical", () => {
      const existingTeachers: Teacher[] = [
        {
          id: "tch-1",
          fullName: "سارة عبد الله العتيبي",
          nationalId: "1048291023",
          specialty: "لغة عربية",
          teachingField: "لغة عربية",
          mobile: "966501234567",
          email: "sara@moe.gov.sa",
          employmentStatus: "دائم",
          jobTitle: "معلم",
          totalAbsences: 0,
        },
        {
          id: "tch-2",
          fullName: "ريم خالد القحطاني",
          nationalId: "1059283741",
          specialty: "رياضيات",
          teachingField: "رياضيات",
          mobile: "966559876543",
          email: undefined,
          employmentStatus: "عقد",
          jobTitle: "معلم",
          totalAbsences: 0,
        },
      ];

      const rawRows: ExcelTeacherRow[] = [
        {
          الإسم: "سارة عبد الله العتيبي",
          "رقم الهوية": "1048291023",
          التخصص: "لغة عربية",
          الجوال: "0501234567",
          "البريد الإلكتروني": "sara@moe.gov.sa",
          "حالة التوظيف": "دائم",
        },
        {
          الإسم: "ريم خالد القحطاني",
          "رقم الهوية": "1059283741",
          التخصص: "رياضيات",
          الجوال: "0559876543",
          "حالة التوظيف": "عقد",
        },
      ];

      const plan = planTeacherImport(rawRows, existingTeachers);

      expect(plan.newTeachers.length).toBe(0);
      expect(plan.updatedTeachers.length).toBe(0);
      expect(plan.restoredTeachers.length).toBe(0);
      expect(plan.skippedRows.length).toBe(0);
    });
  });

  // =========================================================================
  // Scenario 3: Import with Modified / Blank Filling Data (تعديل واستكمال البيانات)
  // =========================================================================
  describe("Scenario 3: Import with Modified / Blank Filling Data (تعديل واستكمال البيانات)", () => {
    it("fills blank email on existing teacher without overwriting existing data", () => {
      const existingTeachers: Teacher[] = [
        {
          id: "tch-1",
          fullName: "سارة عبد الله العتيبي",
          nationalId: "1048291023",
          specialty: "لغة عربية",
          teachingField: "لغة عربية",
          mobile: "966501234567",
          email: undefined, // Blank email
          employmentStatus: "دائم",
          jobTitle: "معلم",
          totalAbsences: 2,
        },
      ];

      const rawRows: ExcelTeacherRow[] = [
        {
          الإسم: "سارة عبد الله العتيبي المعدل",
          "رقم الهوية": "1048291023",
          التخصص: "لغة عربية",
          الجوال: "0501234567",
          "البريد الإلكتروني": "sara.new@moe.gov.sa",
        },
      ];

      const plan = planTeacherImport(rawRows, existingTeachers);

      expect(plan.newTeachers.length).toBe(0);
      expect(plan.updatedTeachers.length).toBe(1);
      expect(plan.updatedTeachers[0].filledFields).toContain("البريد الإلكتروني");
      // Ensures existing ID and absence history remain intact
      expect(plan.updatedTeachers[0].teacher.id).toBe("tch-1");
      expect(plan.updatedTeachers[0].teacher.totalAbsences).toBe(2);
      expect(plan.updatedTeachers[0].teacher.email).toBe("sara.new@moe.gov.sa");
      // Retained existing non-empty fullName per Stage 1 & 2 rule
      expect(plan.updatedTeachers[0].teacher.fullName).toBe("سارة عبد الله العتيبي");
    });
  });

  // =========================================================================
  // Scenario 4: In-File Duplicates (تكرار داخلي في نفس الملف)
  // =========================================================================
  describe("Scenario 4: In-File Duplicates (تكرار داخلي في نفس الملف)", () => {
    it("keeps the first row and ignores the second duplicate row with logged reason", () => {
      const rawRows: ExcelTeacherRow[] = [
        {
          الإسم: "نورة مسفر الدوسري",
          "رقم الهوية": "1074829104",
          التخصص: "دراسات إسلامية",
          الجوال: "0567890123",
        },
        {
          الإسم: "نورة مسفر الدوسري (الصف الثاني المكرر)",
          "رقم الهوية": "1074829104",
          التخصص: "دراسات إسلامية",
          الجوال: "0567890123",
        },
      ];

      const plan = planTeacherImport(rawRows, []);

      expect(plan.newTeachers.length).toBe(1);
      expect(plan.newTeachers[0].fullName).toBe("نورة مسفر الدوسري");
      expect(plan.skippedRows.length).toBe(1);
      expect(plan.skippedRows[0].rowNumber).toBe(2);
      expect(plan.skippedRows[0].reason).toContain("مكرر داخل نفس ملف Excel");
    });
  });

  // =========================================================================
  // Stage 1: System-Wide Deduplication and Cascade Record Repointing
  // =========================================================================
  describe("Stage 1: System-Wide Deduplication and Cascade Record Repointing", () => {
    it("merges multiple duplicate teachers with same nationalId into oldest record and repoints all absences and delay notices", () => {
      const rawTeachers: Teacher[] = [
        {
          id: "dup-oldest",
          nationalId: "1048291023",
          fullName: "سارة عبد الله العتيبي",
          specialty: "لغة عربية",
          teachingField: "لغة عربية",
          mobile: undefined, // missing mobile
          email: "sara@moe.gov.sa",
          totalAbsences: 1,
          createdAt: "2024-01-01T10:00:00.000Z",
        },
        {
          id: "dup-newer",
          nationalId: "1048291023",
          fullName: "سارة العتيبي",
          specialty: "لغة عربية",
          teachingField: "لغة عربية",
          mobile: "0501234567", // has mobile!
          email: "sara.newer@moe.gov.sa",
          totalAbsences: 2,
          createdAt: "2024-06-01T10:00:00.000Z",
        },
        {
          id: "teacher-distinct",
          nationalId: "1059283741",
          fullName: "ريم خالد القحطاني",
          specialty: "رياضيات",
          totalAbsences: 0,
          createdAt: "2024-02-01T10:00:00.000Z",
        },
      ];

      const rawAbsences: AbsenceRecord[] = [
        {
          id: "abs-1",
          teacherId: "dup-oldest",
          teacherName: "سارة عبد الله العتيبي",
          specialty: "لغة عربية",
          date: "2024-03-01",
          type: "اضطراري",
          reason: "ظرف عائلي",
          timestamp: "2024-03-01T08:00:00.000Z",
        },
        {
          id: "abs-2",
          teacherId: "dup-newer", // linked to duplicate!
          teacherName: "سارة العتيبي",
          specialty: "لغة عربية",
          date: "2024-07-01",
          type: "مرضي",
          reason: "تقرير طبي",
          timestamp: "2024-07-01T08:00:00.000Z",
        },
      ];

      const rawDelayNotices: DelayNotice[] = [
        {
          id: "dn-1",
          teacherId: "dup-newer", // linked to duplicate!
          teacherName: "سارة العتيبي",
          noticeDate: "2024-08-01",
          violationDelayStart: true,
          delayStartTime: "07:45",
          violationAbsentDuring: false,
          violationEarlyDeparture: false,
          violationLeftSchool: false,
          status: "pending_teacher",
          hijriYear: "١٤٤٨",
          shareToken: "token-xyz",
          tokenExpiresAt: "2026-01-01T00:00:00.000Z",
          createdAt: "2024-08-01T08:00:00.000Z",
        },
      ];

      const result = cleanAndDeduplicateSystemData(
        rawTeachers,
        rawAbsences,
        rawDelayNotices,
        []
      );

      // Clean teachers count: dup-oldest and teacher-distinct (2 teachers total)
      expect(result.cleanTeachers.length).toBe(2);
      expect(result.removedDuplicatesCount).toBe(1);
      expect(result.mergedGroupsCount).toBe(1);

      const retained = result.cleanTeachers.find((t) => t.id === "dup-oldest")!;
      expect(retained).toBeDefined();
      // Retained oldest name
      expect(retained.fullName).toBe("سارة عبد الله العتيبي");
      // Filled missing mobile from dup-newer
      expect(retained.mobile).toBe("966501234567");
      // Retained existing email (not overwritten by newer)
      expect(retained.email).toBe("sara@moe.gov.sa");

      // Both absence records now point to "dup-oldest"
      expect(result.cleanAbsences.length).toBe(2);
      expect(result.cleanAbsences[0].teacherId).toBe("dup-oldest");
      expect(result.cleanAbsences[1].teacherId).toBe("dup-oldest");
      expect(result.cleanAbsences[1].teacherName).toBe("سارة عبد الله العتيبي");

      // Delay notice now points to "dup-oldest"
      expect(result.cleanDelayNotices.length).toBe(1);
      expect(result.cleanDelayNotices[0].teacherId).toBe("dup-oldest");
      expect(result.cleanDelayNotices[0].teacherName).toBe("سارة عبد الله العتيبي");

      // Total absences and delay notices counter accurately recalculated
      expect(retained.totalAbsences).toBe(2);
      expect(retained.totalDelayNotices).toBe(1);
    });
  });

  // =========================================================================
  // Stage 4: Standard Headers and Excel Template Verification
  // =========================================================================
  describe("Stage 4: Standard Headers and Excel Template Verification", () => {
    it("defines the exact required 8 column headers", () => {
      expect(STANDARD_EXCEL_HEADERS).toEqual([
        "الجوال",
        "البريد الإلكتروني",
        "الإسم",
        "رقم الهوية",
        "حالة التوظيف",
        "المسمى الوظيفي",
        "مجال التدريس",
        "التخصص",
      ]);
    });
  });

  // =========================================================================
  // Archived Teacher Restoration upon Import (استعادة المؤرشف عند الاستيراد)
  // =========================================================================
  describe("Archived Teacher Restoration upon Import", () => {
    it("restores archived teacher and fills missing blanks instead of creating duplicate", () => {
      const archivedTeachers: ArchivedTeacher[] = [
        {
          teacher: {
            id: "arch-1",
            nationalId: "1083729105",
            fullName: "هند عبد الرحمن الشهري",
            specialty: "لغة إنجليزية",
            teachingField: "لغة إنجليزية",
            mobile: undefined,
            isArchived: true,
            archivedAt: "2024-01-01T00:00:00.000Z",
            totalAbsences: 0,
          },
          associatedRecords: [],
          associatedInquiries: [],
          associatedDelayNotices: [],
          archivedAt: "2024-01-01T00:00:00.000Z",
        },
      ];

      const rawRows: ExcelTeacherRow[] = [
        {
          الإسم: "هند عبد الرحمن الشهري",
          "رقم الهوية": "1083729105",
          التخصص: "لغة إنجليزية",
          الجوال: "0534567890",
        },
      ];

      const plan = planTeacherImport(rawRows, [], archivedTeachers);

      expect(plan.newTeachers.length).toBe(0);
      expect(plan.restoredTeachers.length).toBe(1);
      expect(plan.restoredTeachers[0].teacher.id).toBe("arch-1");
      expect(plan.restoredTeachers[0].teacher.isArchived).toBe(false);
      expect(plan.restoredTeachers[0].teacher.mobile).toBe("966534567890");
    });
  });

  // =========================================================================
  // Advanced Robustness & Edge Cases
  // =========================================================================
  describe("Advanced Robustness & Edge Cases", () => {
    it("handles column reordering when 'المسمى الوظيفي' comes before 'رقم الهوية' without mistaking job title for national ID", () => {
      // Reordered row object: Job Title first, then ID
      const row: ExcelTeacherRow = {
        "المسمى الوظيفي": "معلم ممارس",
        "حالة التوظيف": "دائم",
        الإسم: "نوف فهد العتيبي",
        "رقم الهوية": "1098765432",
        التخصص: "لغة عربية",
        "مجال التدريس": "لغة عربية",
      };

      const result = validateAndParseRow(row, 1);
      expect(result.skippedReason).toBeUndefined();
      expect(result.teacher).toBeDefined();
      expect(result.teacher?.nationalId).toBe("1098765432");
      expect(result.teacher?.jobTitle).toBe("معلم ممارس");
      expect(result.teacher?.fullName).toBe("نوف فهد العتيبي");
    });

    it("strips alphanumeric prefixes like unn, tea, user from national IDs", () => {
      expect(normalizeNationalId("unn1089953663")).toBe("1089953663");
      expect(normalizeNationalId("tea_1089953663")).toBe("1089953663");
      expect(normalizeNationalId("user-1089953663")).toBe("1089953663");
      expect(normalizeNationalId("T1089953663")).toBe("1089953663");
    });

    it("merges duplicate teachers with 'unn' prefix and raw numeric national ID into one single record", () => {
      const teachers: Teacher[] = [
        {
          id: "tch-1",
          fullName: "امل حمود سعود السبيعي",
          name: "امل حمود سعود السبيعي",
          nationalId: "unn1089953663",
          username: "unn1089953663",
          jobNumber: "unn1089953663",
          mobile: "966502563997",
          specialty: "رياضيات",
          teachingField: "رياضيات",
          jobTitle: "معلم",
          employmentStatus: "دائم",
          totalAbsences: 0,
          totalDelayNotices: 0,
          createdAt: "2026-09-01T08:00:00.000Z",
          updatedAt: "2026-09-01T08:00:00.000Z",
        },
        {
          id: "tch-2",
          fullName: "امل حمود سعود السبيعي",
          name: "امل حمود سعود السبيعي",
          nationalId: "1089953663",
          username: "1089953663",
          jobNumber: "1089953663",
          mobile: "966502563997",
          specialty: "رياضيات",
          teachingField: "رياضيات",
          jobTitle: "معلم",
          employmentStatus: "دائم",
          totalAbsences: 0,
          totalDelayNotices: 0,
          createdAt: "2026-09-10T08:00:00.000Z",
          updatedAt: "2026-09-10T08:00:00.000Z",
        },
      ];

      const absences: AbsenceRecord[] = [
        {
          id: "abs-1",
          teacherId: "tch-1",
          teacherName: "امل حمود سعود السبيعي",
          jobNumber: "unn1089953663",
          specialty: "رياضيات",
          date: "2026-09-15",
          type: "اضطراري",
          reason: "ظرف عائلي",
          timestamp: "2026-09-15T08:00:00.000Z",
        },
        {
          id: "abs-2",
          teacherId: "tch-2",
          teacherName: "امل حمود سعود السبيعي",
          jobNumber: "1089953663",
          specialty: "رياضيات",
          date: "2026-09-20",
          type: "مرضي",
          reason: "تقرير طبي",
          timestamp: "2026-09-20T08:00:00.000Z",
        },
      ];

      const result = cleanAndDeduplicateSystemData(teachers, absences, [], []);
      expect(result.cleanTeachers.length).toBe(1);
      expect(result.removedDuplicatesCount).toBe(1);
      expect(result.cleanTeachers[0].nationalId).toBe("1089953663");
      expect(result.cleanTeachers[0].fullName).toBe("امل حمود سعود السبيعي");
      expect(result.cleanTeachers[0].totalAbsences).toBe(2);
      expect(result.removedTeacherIds).toContain("tch-2");
      // All absences repointed to the single primary teacher ID
      expect(result.cleanAbsences.every((a) => a.teacherId === result.cleanTeachers[0].id)).toBe(true);
    });
  });

  // =========================================================================
  // Official Authentic Teachers Roster & Incomplete ID Auto-Correction
  // =========================================================================
  describe("Official Authentic Teachers Roster & Incomplete ID Auto-Correction", () => {
    it("contains exactly 37 official real teachers with 0 duplicates and valid 10-digit IDs", () => {
      expect(OFFICIAL_TEACHERS.length).toBe(37);

      const idSet = new Set<string>();
      const mobileSet = new Set<string>();
      const nameSet = new Set<string>();

      for (const t of OFFICIAL_TEACHERS) {
        expect(t.nationalId).toMatch(/^\d{10}$/);
        expect(t.nationalId.startsWith("1")).toBe(true);
        expect(idSet.has(t.nationalId)).toBe(false);
        idSet.add(t.nationalId);

        expect(t.mobile).toMatch(/^9665\d{8}$/);
        expect(mobileSet.has(t.mobile)).toBe(false);
        mobileSet.add(t.mobile);

        expect(nameSet.has(t.fullName)).toBe(false);
        nameSet.add(t.fullName);

        expect(["دائم", "عقد"]).toContain(t.employmentStatus);
        expect(t.specialty.length).toBeGreaterThan(0);
      }
    });

    it("corrects incomplete national IDs (e.g. 2309 and 6468) automatically", () => {
      const faultyTeachers: Teacher[] = [
        {
          id: "tea-kholood",
          nationalId: "2309",
          fullName: "خلود خالد محمد الجيزاني",
          name: "خلود خالد محمد الجيزاني",
          username: "kholood2309",
          jobNumber: "2309",
          totalAbsences: 0,
          totalDelayNotices: 0,
        },
        {
          id: "tea-maryam",
          nationalId: "6468",
          fullName: "مريم مساعد فايز الرحيلي",
          name: "مريم مساعد فايز الرحيلي",
          username: "mm6468",
          jobNumber: "6468",
          totalAbsences: 0,
          totalDelayNotices: 0,
        },
      ];

      const { teachers, changed, updatedNationalIdByTeacherId } =
        reconcileWithOfficialTeachers(faultyTeachers);

      expect(changed).toBe(true);
      expect(teachers.length).toBe(37); // All 37 teachers populated without duplicates

      const kholood = teachers.find((t) => t.fullName === "خلود خالد محمد الجيزاني");
      expect(kholood).toBeDefined();
      expect(kholood?.nationalId).toBe("1010262309"); // Fixed 10-digit ID!
      expect(updatedNationalIdByTeacherId.get("tea-kholood")).toBe("1010262309");

      const maryam = teachers.find((t) => t.fullName === "مريم مساعد فايز الرحيلي");
      expect(maryam).toBeDefined();
      expect(maryam?.nationalId).toBe("1110566468"); // Fixed 10-digit ID!
      expect(updatedNationalIdByTeacherId.get("tea-maryam")).toBe("1110566468");
    });
  });
});
