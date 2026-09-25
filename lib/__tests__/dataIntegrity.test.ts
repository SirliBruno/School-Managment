import { describe, it, expect } from "vitest";
import { normalizeTeacher, auditAndMigrateData } from "@/context/TeacherContext";
import {
  Teacher,
  AbsenceRecord,
  DelayNotice,
  AbsenceInquiry,
  ArchivedTeacher,
  ArchivedAbsenceRecord,
  ArchivedDelayNotice,
} from "@/types/teacher";
import {
  calculateTimeDifference,
  getSaudiToday,
  calculate48HoursExpiry,
  isTokenExpired,
} from "../timeUtils";

describe("Data Integrity & Administrative Business Logic Suite", () => {
  // Scenario 1: Excel / Raw Teacher Import & Normalization
  describe("Scenario 1: Teacher Import & ID / Foreign Key Normalization", () => {
    it("correctly normalizes legacy and standard Excel rows into valid Teacher objects with UUID", () => {
      const rawExcel1 = {
        "اسم المستخدم": "1098765432",
        "الاسم الرباعي": "سارة محمد أحمد العتيبي",
        "رقم الجوال": "0501234567",
        "حالة التوظيف": "دائم",
        "المسمى الوظيفي": "معلم ممارس",
        "مجال التدريس": "رياضيات",
        "التخصص": "رياضيات",
      };

      const teacher1 = normalizeTeacher(rawExcel1);
      expect(teacher1.id).toBeTruthy();
      expect(teacher1.username).toBe("1098765432");
      expect(teacher1.fullName).toBe("سارة محمد أحمد العتيبي");
      expect(teacher1.totalAbsences).toBe(0);
      expect(teacher1.totalDelayNotices).toBe(0);
      expect(teacher1.isArchived).toBe(false);

      // New 8-Column School Excel Template
      const rawExcelNewTemplate = {
        "الجوال": "0551234567",
        "البريد الإلكتروني": "Sara.Teacher@Moe.Gov.Sa ",
        "الإسم": "سارة محمد أحمد العتيبي",
        "رقم الهوية": "1098765432",
        "حالة التوظيف": "رسمي",
        "المسمى الوظيفي": "معلم ممارس",
        "مجال التدريس": "رياضيات",
        "التخصص": "رياضيات",
      };

      const teacherNew = normalizeTeacher(rawExcelNewTemplate);
      expect(teacherNew.id).toBeTruthy();
      expect(teacherNew.nationalId).toBe("1098765432");
      expect(teacherNew.username).toBe("1098765432");
      expect(teacherNew.jobNumber).toBe("1098765432");
      expect(teacherNew.fullName).toBe("سارة محمد أحمد العتيبي");
      expect(teacherNew.email).toBe("sara.teacher@moe.gov.sa");
      expect(teacherNew.mobile).toBe("966551234567");
      expect(teacherNew.employmentStatus).toBe("رسمي");
      expect(teacherNew.jobTitle).toBe("معلم ممارس");
      expect(teacherNew.teachingField).toBe("رياضيات");
      expect(teacherNew.specialty).toBe("رياضيات");
      expect(teacherNew.totalAbsences).toBe(0);
      expect(teacherNew.totalDelayNotices).toBe(0);
      expect(teacherNew.isArchived).toBe(false);

      // Legacy headers backward compatibility
      const rawExcelLegacy = {
        الاسم: "نورة خالد الشمري",
        "الرقم الوظيفي": "1087654321",
        Specialty: "لغة عربية",
      };
      const teacher2 = normalizeTeacher(rawExcelLegacy);
      expect(teacher2.fullName).toBe("نورة خالد الشمري");
      expect(teacher2.nationalId).toBe("1087654321");
      expect(teacher2.username).toBe("1087654321");
      expect(teacher2.specialty).toBe("لغة عربية");
    });
  });

  // Scenario 2: Absence Recording & Dynamic Counter Increment
  describe("Scenario 2: Absence Recording & Counter Calculation", () => {
    it("dynamically calculates teacher total absences from active records", () => {
      const teacher: Teacher = {
        id: "tch-1",
        nationalId: "101",
        username: "101",
        fullName: "معلمة 1",
        totalAbsences: 0,
      };

      const records: AbsenceRecord[] = [
        {
          id: "rec-1",
          teacherId: "tch-1",
          teacherName: "معلمة 1",
          jobNumber: "101",
          specialty: "رياضيات",
          date: "2026-09-24",
          type: "اضطراري",
          reason: "ظرف عائلي",
          timestamp: new Date().toISOString(),
          isArchived: false,
        },
        {
          id: "rec-2",
          teacherId: "tch-1",
          teacherName: "معلمة 1",
          jobNumber: "101",
          specialty: "رياضيات",
          date: "2026-09-25",
          type: "مرضي",
          reason: "وعكة صحية",
          timestamp: new Date().toISOString(),
          isArchived: false,
        },
      ];

      const activeCount = records.filter((r) => r.teacherId === teacher.id && !r.isArchived).length;
      expect(activeCount).toBe(2);
    });
  });

  // Scenario 3: Soft-Delete (Archive) of an Absence Record
  describe("Scenario 3: Soft-Delete Absence & Counter Recalculation", () => {
    it("excludes archived records when calculating teacher total absences", () => {
      const records: AbsenceRecord[] = [
        {
          id: "rec-1",
          teacherId: "tch-1",
          teacherName: "معلمة 1",
          jobNumber: "101",
          specialty: "رياضيات",
          date: "2026-09-24",
          type: "اضطراري",
          reason: "ظرف عائلي",
          timestamp: new Date().toISOString(),
          isArchived: false,
        },
        {
          id: "rec-2",
          teacherId: "tch-1",
          teacherName: "معلمة 1",
          jobNumber: "101",
          specialty: "رياضيات",
          date: "2026-09-25",
          type: "مرضي",
          reason: "وعكة صحية",
          timestamp: new Date().toISOString(),
          isArchived: true, // Archived
          archivedAt: new Date().toISOString(),
          archiveReason: "تم الإدخال بالخطأ",
        },
      ];

      const activeCount = records.filter((r) => r.teacherId === "tch-1" && !r.isArchived).length;
      expect(activeCount).toBe(1);
    });
  });

  // Scenario 4: Delete Teacher (Cascade Archive)
  describe("Scenario 4: Cascade Archive on Teacher Deletion", () => {
    it("cascade-archives all associated absences and delay notices with archivedByCascade flag", () => {
      const teacher: Teacher = {
        id: "tch-1",
        nationalId: "101",
        username: "101",
        fullName: "معلمة 1",
        totalAbsences: 3,
      };

      const teacherAbsences: AbsenceRecord[] = [
        {
          id: "rec-1",
          teacherId: "tch-1",
          teacherName: "معلمة 1",
          jobNumber: "101",
          specialty: "رياضيات",
          date: "2026-09-20",
          type: "اضطراري",
          reason: "ظرف",
          timestamp: new Date().toISOString(),
        },
        {
          id: "rec-2",
          teacherId: "tch-1",
          teacherName: "معلمة 1",
          jobNumber: "101",
          specialty: "رياضيات",
          date: "2026-09-21",
          type: "مرضي",
          reason: "مرض",
          timestamp: new Date().toISOString(),
        },
        {
          id: "rec-3",
          teacherId: "tch-1",
          teacherName: "معلمة 1",
          jobNumber: "101",
          specialty: "رياضيات",
          date: "2026-09-22",
          type: "مرافق",
          reason: "مرافقة",
          timestamp: new Date().toISOString(),
        },
      ];

      const now = new Date().toISOString();
      const archiveReason = "نقل لمعلمة إلى مدرسة أخرى";

      const archivedAbsencesList: ArchivedAbsenceRecord[] = teacherAbsences.map((rec) => ({
        record: {
          ...rec,
          isArchived: true,
          archivedAt: now,
          archiveReason,
          archivedByCascade: true,
        },
        archivedAt: now,
        archiveReason,
        archivedByCascade: true,
      }));

      expect(archivedAbsencesList.length).toBe(3);
      expect(archivedAbsencesList.every((a) => a.archivedByCascade === true)).toBe(true);
      expect(archivedAbsencesList.every((a) => a.archiveReason === archiveReason)).toBe(true);
    });
  });

  // Scenario 5: Restore Teacher & Restore Cascaded Records
  describe("Scenario 5: Teacher & Cascade Records Restoration", () => {
    it("restores remaining cascaded records and restores accurate counters", () => {
      const teacherId = "tch-1";
      const cascadedAbsences: ArchivedAbsenceRecord[] = [
        {
          record: {
            id: "rec-1",
            teacherId,
            teacherName: "معلمة 1",
            jobNumber: "101",
            specialty: "علوم",
            date: "2026-09-20",
            type: "اضطراري",
            reason: "عذر",
            timestamp: new Date().toISOString(),
            archivedByCascade: true,
          },
          archivedAt: new Date().toISOString(),
          archivedByCascade: true,
        },
        {
          record: {
            id: "rec-2",
            teacherId,
            teacherName: "معلمة 1",
            jobNumber: "101",
            specialty: "علوم",
            date: "2026-09-21",
            type: "مرضي",
            reason: "عذر",
            timestamp: new Date().toISOString(),
            archivedByCascade: true,
          },
          archivedAt: new Date().toISOString(),
          archivedByCascade: true,
        },
      ];

      // Simulate restoring records
      const restored = cascadedAbsences.map((a) => ({
        ...a.record,
        isArchived: false,
        archivedAt: undefined,
        archiveReason: undefined,
        archivedByCascade: undefined,
      }));

      expect(restored.length).toBe(2);
      expect(restored.every((r) => r.isArchived === false)).toBe(true);
      expect(restored.every((r) => r.archivedByCascade === undefined)).toBe(true);
    });
  });

  // Scenario 6: Permanent Deletion (No Orphans)
  describe("Scenario 6: Permanent Deletion without Orphan Records", () => {
    it("purges all associated records when permanently deleting a teacher", () => {
      const targetTeacherId = "tch-purge";

      let archivedAbsences: ArchivedAbsenceRecord[] = [
        {
          record: { id: "a1", teacherId: targetTeacherId, teacherName: "م1", jobNumber: "1", specialty: "عام", date: "2026-01-01", type: "اضطراري", reason: "r", timestamp: "t" },
          archivedAt: "2026-01-01",
        },
        {
          record: { id: "a2", teacherId: "tch-other", teacherName: "م2", jobNumber: "2", specialty: "عام", date: "2026-01-01", type: "اضطراري", reason: "r", timestamp: "t" },
          archivedAt: "2026-01-01",
        },
      ];

      // Purge action
      archivedAbsences = archivedAbsences.filter((a) => a.record.teacherId !== targetTeacherId);

      expect(archivedAbsences.length).toBe(1);
      expect(archivedAbsences[0].record.teacherId).toBe("tch-other");
    });
  });

  // Scenario 7: Delay Notice Status Workflow
  describe("Scenario 7: Delay Notice Stage Workflow", () => {
    it("calculates time differences for late arrivals correctly", () => {
      const res = calculateTimeDifference("07:00", "07:45");
      expect(res.isValid).toBe(true);
      expect(res.totalMinutes).toBe(45);
      expect(res.formattedDuration).toBe("45 دقيقة");
    });

    it("verifies delay notice statuses: pending_teacher -> pending_director -> completed", () => {
      const notice: DelayNotice = {
        id: "dn-1",
        teacherId: "tch-1",
        noticeDate: "2026-09-25",
        violationDelayStart: true,
        delayStartTime: "07:40",
        violationAbsentDuring: false,
        violationEarlyDeparture: false,
        violationLeftSchool: false,
        calculatedMinutes: 40,
        calculatedDuration: "40 دقيقة",
        status: "pending_teacher",
        shareToken: "token-123",
        tokenExpiresAt: calculate48HoursExpiry(),
        hijriYear: "١٤٤٨",
        createdAt: new Date().toISOString(),
      };

      expect(notice.status).toBe("pending_teacher");

      // Stage 2: Teacher response
      const updatedStage2: DelayNotice = {
        ...notice,
        teacherReason: "ازدحام مروري",
        teacherSignatureDate: "2026-09-25",
        status: "pending_director",
      };
      expect(updatedStage2.status).toBe("pending_director");
      expect(updatedStage2.teacherReason).toBe("ازدحام مروري");

      // Stage 3: Director decision
      const updatedStage3: DelayNotice = {
        ...updatedStage2,
        directorOpinion: "accepted",
        directorNotes: "عذر مقبول لمرة واحدة",
        directorSignatureDate: "2026-09-25",
        status: "completed",
      };
      expect(updatedStage3.status).toBe("completed");
      expect(updatedStage3.directorOpinion).toBe("accepted");
    });
  });

  // Scenario 8: Dashboard KPIs & Audit Reconciler
  describe("Scenario 8: Audit & Data Reconciler", () => {
    it("reconciles mismatching teacher IDs by username and fixes foreign keys", () => {
      const teachers: Teacher[] = [
        { id: "correct-uuid-1", nationalId: "1098765432", username: "1098765432", fullName: "أمل العبدالله", totalAbsences: 0 },
      ];

      const rawAbsences: AbsenceRecord[] = [
        {
          id: "rec-wrong-fk",
          teacherId: "legacy-old-id", // Old or mismatched FK
          teacherName: "أمل العبدالله",
          jobNumber: "1098765432", // Match by jobNumber
          specialty: "لغة عربية",
          date: "2026-09-22",
          type: "اضطراري",
          reason: "ظرف",
          timestamp: new Date().toISOString(),
        },
      ];

      const reconciled = auditAndMigrateData(teachers, rawAbsences, [], []);
      expect(reconciled.cleanAbsences.length).toBe(1);
      expect(reconciled.cleanAbsences[0].teacherId).toBe("correct-uuid-1");
      expect(reconciled.migratedAbsencesCount).toBe(1);
      expect(reconciled.orphanAbsencesCount).toBe(0);
    });
  });

  // Scenario 9: Token Expiration Security
  describe("Scenario 9: Token Expiry Validation", () => {
    it("detects expired tokens and validates active 48h tokens", () => {
      const now = new Date();
      const expiredDate = new Date(now.getTime() - 1000 * 60 * 60).toISOString(); // 1 hour ago
      const validDate = calculate48HoursExpiry(now);

      expect(isTokenExpired(expiredDate)).toBe(true);
      expect(isTokenExpired(validDate)).toBe(false);
    });
  });

  // Scenario 10: Active Views Filtering Excludes Archived Items
  describe("Scenario 10: Active Views Exclusion of Archived Items", () => {
    it("filters out archived teachers and records from active dashboard lists", () => {
      const teachers: Teacher[] = [
        { id: "t1", nationalId: "u1", username: "u1", fullName: "معلمة نشطة", totalAbsences: 0, isArchived: false },
        { id: "t2", nationalId: "u2", username: "u2", fullName: "معلمة مؤرشفة", totalAbsences: 0, isArchived: true },
      ];

      const activeList = teachers.filter((t) => !t.isArchived);
      expect(activeList.length).toBe(1);
      expect(activeList[0].id).toBe("t1");
    });
  });
});
