import { describe, it, expect } from "vitest";
import {
  Teacher,
  EmployeePermission,
  ArchivedEmployeePermission,
  ArchivedTeacher,
} from "@/types/teacher";

describe("Administrative Archive - Employee Permissions Soft Delete & Cascade Lifecycle", () => {
  const initialTeacher: Teacher = {
    id: "teacher-101",
    fullName: "سارة عبدالله المنصور",
    nationalId: "1098765432",
    specialty: "رياضيات",
    jobTitle: "معلمة متقدم",
    employmentStatus: "دائم",
    totalAbsences: 0,
    totalDelayNotices: 0,
    isArchived: false,
  };

  const initialPermissions: EmployeePermission[] = [
    {
      id: "perm-001",
      teacherId: "teacher-101",
      teacherName: "سارة عبدالله المنصور",
      nationalId: "1098765432",
      specialty: "رياضيات",
      permissionDate: "2026-09-25",
      exitTime: "09:30",
      returnTime: "10:45",
      durationMinutes: 75,
      reason: "موعد طبي مستعجل",
      createdAt: "2026-09-25T09:30:00Z",
      isArchived: false,
    },
    {
      id: "perm-002",
      teacherId: "teacher-101",
      teacherName: "سارة عبدالله المنصور",
      nationalId: "1098765432",
      specialty: "رياضيات",
      permissionDate: "2026-09-26",
      exitTime: "11:00",
      returnTime: "12:00",
      durationMinutes: 60,
      reason: "مهمة إدارية رسمية",
      createdAt: "2026-09-26T11:00:00Z",
      isArchived: false,
    },
  ];

  describe("1. Soft Delete Lifecycle (No Direct Hard Delete)", () => {
    it("should soft-delete permission record and record archive audit metadata", () => {
      const activePermissions = [...initialPermissions];
      const archivedPermissions: ArchivedEmployeePermission[] = [];

      // Simulate soft-delete action: deletePermission("perm-001", "طلب الموظفة", "وكيلة المدرسة")
      const targetId = "perm-001";
      const now = new Date().toISOString();
      const reason = "طلب الموظفة";
      const actor = "وكيلة المدرسة";

      const target = activePermissions.find((p) => p.id === targetId);
      expect(target).toBeDefined();

      const deletedPermission: EmployeePermission = {
        ...target!,
        isArchived: true,
        archivedAt: now,
        archivedBy: actor,
        archiveReason: reason,
        archivedByCascade: false,
      };

      const updatedActive = activePermissions.filter((p) => p.id !== targetId);
      const updatedArchived = [
        {
          permission: deletedPermission,
          archivedAt: now,
          archivedBy: actor,
          archiveReason: reason,
          archivedByCascade: false,
        },
        ...archivedPermissions,
      ];

      // Verifications
      expect(updatedActive.length).toBe(1);
      expect(updatedActive.some((p) => p.id === targetId)).toBe(false);

      expect(updatedArchived.length).toBe(1);
      const archivedItem = updatedArchived[0];
      expect(archivedItem.permission.id).toBe(targetId);
      expect(archivedItem.permission.isArchived).toBe(true);
      expect(archivedItem.permission.archivedBy).toBe(actor);
      expect(archivedItem.permission.archiveReason).toBe(reason);
      expect(archivedItem.permission.archivedByCascade).toBe(false);
      expect(archivedItem.archivedAt).toBe(now);
    });

    it("should restore permission record cleanly from archive", () => {
      const now = new Date().toISOString();
      const actor = "مديرة المدرسة";
      const reason = "إلغاء الحذف";

      const archivedItem: ArchivedEmployeePermission = {
        permission: {
          ...initialPermissions[0],
          isArchived: true,
          archivedAt: now,
          archivedBy: actor,
          archiveReason: reason,
          archivedByCascade: false,
        },
        archivedAt: now,
        archivedBy: actor,
        archiveReason: reason,
        archivedByCascade: false,
      };

      let archivedPermissions = [archivedItem];
      let activePermissions = [initialPermissions[1]];

      // Simulate restorePermission("perm-001")
      const targetId = "perm-001";
      const found = archivedPermissions.find((a) => a.permission.id === targetId);
      expect(found).toBeDefined();

      const restoredPermission: EmployeePermission = {
        ...found!.permission,
        isArchived: false,
        archivedAt: undefined,
        archivedBy: undefined,
        archiveReason: undefined,
        archivedByCascade: undefined,
      };

      activePermissions = [restoredPermission, ...activePermissions];
      archivedPermissions = archivedPermissions.filter((a) => a.permission.id !== targetId);

      // Verifications
      expect(activePermissions.length).toBe(2);
      const restored = activePermissions.find((p) => p.id === targetId);
      expect(restored?.isArchived).toBe(false);
      expect(restored?.archivedAt).toBeUndefined();
      expect(restored?.archivedBy).toBeUndefined();
      expect(restored?.archiveReason).toBeUndefined();
      expect(archivedPermissions.length).toBe(0);
    });
  });

  describe("2. Cascade Lifecycle on Teacher Archive & Restore", () => {
    it("should cascade-archive all associated permissions when a teacher is archived", () => {
      let activeTeachers = [initialTeacher];
      let archivedTeachers: ArchivedTeacher[] = [];
      let activePermissions = [...initialPermissions];
      let archivedPermissions: ArchivedEmployeePermission[] = [];

      const teacherId = initialTeacher.id;
      const now = new Date().toISOString();
      const reason = "نقل لمعلمة إلى مدرسة أخرى";

      // Cascading permissions
      const cascadedPermissions = activePermissions
        .filter((p) => p.teacherId === teacherId)
        .map((p) => ({
          ...p,
          isArchived: true,
          archivedAt: now,
          archivedBy: "الإدارة المدرسية",
          archiveReason: `أرشفة تلقائية لتعطيل ملف المعلمة: ${initialTeacher.fullName}`,
          archivedByCascade: true,
        }));

      const newArchivedPermissions: ArchivedEmployeePermission[] = cascadedPermissions.map((p) => ({
        permission: p,
        archivedAt: now,
        archivedBy: "الإدارة المدرسية",
        archiveReason: p.archiveReason,
        archivedByCascade: true,
      }));

      const archivedTeacherObj: ArchivedTeacher = {
        teacher: { ...initialTeacher, isArchived: true, archivedAt: now, archiveReason: reason },
        archivedAt: now,
        archiveReason: reason,
        associatedRecords: [],
        associatedInquiries: [],
        associatedDelayNotices: [],
        associatedPermissions: cascadedPermissions,
      };

      archivedTeachers = [archivedTeacherObj, ...archivedTeachers];
      activeTeachers = activeTeachers.filter((t) => t.id !== teacherId);
      activePermissions = activePermissions.filter((p) => p.teacherId !== teacherId);
      archivedPermissions = [...newArchivedPermissions, ...archivedPermissions];

      // Verifications
      expect(activeTeachers.length).toBe(0);
      expect(activePermissions.length).toBe(0);
      expect(archivedTeachers.length).toBe(1);
      expect(archivedTeachers[0].associatedPermissions?.length).toBe(2);
      expect(archivedPermissions.length).toBe(2);
      expect(archivedPermissions.every((p) => p.archivedByCascade === true)).toBe(true);
      expect(archivedPermissions.every((p) => p.permission.isArchived === true)).toBe(true);
    });

    it("should cascade-restore permissions when teacher is restored from archive", () => {
      const now = new Date().toISOString();
      const cascadedPerms: EmployeePermission[] = initialPermissions.map((p) => ({
        ...p,
        isArchived: true,
        archivedAt: now,
        archivedByCascade: true,
      }));

      const archivedTeacherObj: ArchivedTeacher = {
        teacher: { ...initialTeacher, isArchived: true, archivedAt: now },
        archivedAt: now,
        associatedRecords: [],
        associatedInquiries: [],
        associatedDelayNotices: [],
        associatedPermissions: cascadedPerms,
      };

      let archivedTeachers = [archivedTeacherObj];
      let activeTeachers: Teacher[] = [];
      let activePermissions: EmployeePermission[] = [];
      let archivedPermissions: ArchivedEmployeePermission[] = cascadedPerms.map((p) => ({
        permission: p,
        archivedAt: now,
        archivedByCascade: true,
      }));

      // Simulate restoreTeacher
      const foundTeacher = archivedTeachers.find((a) => a.teacher.id === initialTeacher.id);
      expect(foundTeacher).toBeDefined();

      const remainingCascadedPermissions = archivedPermissions
        .filter(
          (p) =>
            p.permission.teacherId === initialTeacher.id &&
            (p.archivedByCascade || p.permission.archivedByCascade)
        )
        .map((p) => ({
          ...p.permission,
          isArchived: false,
          archivedAt: undefined,
          archivedBy: undefined,
          archiveReason: undefined,
          archivedByCascade: undefined,
        }));

      activePermissions = [...remainingCascadedPermissions, ...activePermissions];
      activeTeachers = [{ ...foundTeacher!.teacher, isArchived: false }, ...activeTeachers];

      const restoredPermIds = new Set(remainingCascadedPermissions.map((p) => p.id));
      archivedPermissions = archivedPermissions.filter(
        (p) => !(p.permission.teacherId === initialTeacher.id && restoredPermIds.has(p.permission.id))
      );
      archivedTeachers = archivedTeachers.filter((a) => a.teacher.id !== initialTeacher.id);

      // Verifications
      expect(activeTeachers.length).toBe(1);
      expect(activePermissions.length).toBe(2);
      expect(activePermissions.every((p) => !p.isArchived)).toBe(true);
      expect(archivedPermissions.length).toBe(0);
      expect(archivedTeachers.length).toBe(0);
    });

    it("should NOT automatically restore permissions that were manually deleted prior to teacher archive", () => {
      const now = new Date().toISOString();
      // One permission was manually archived before
      const manuallyArchivedPerm: EmployeePermission = {
        ...initialPermissions[0],
        isArchived: true,
        archivedAt: "2026-09-20T10:00:00Z",
        archiveReason: "حذف فردي مسبق",
        archivedByCascade: false, // NOT cascaded!
      };
      // One was cascaded with teacher
      const cascadedPerm: EmployeePermission = {
        ...initialPermissions[1],
        isArchived: true,
        archivedAt: now,
        archivedByCascade: true,
      };

      const archivedPermissions: ArchivedEmployeePermission[] = [
        {
          permission: manuallyArchivedPerm,
          archivedAt: manuallyArchivedPerm.archivedAt!,
          archivedByCascade: false,
        },
        {
          permission: cascadedPerm,
          archivedAt: cascadedPerm.archivedAt!,
          archivedByCascade: true,
        },
      ];

      // Filtering for cascade restore
      const restoreEligible = archivedPermissions.filter(
        (p) =>
          p.permission.teacherId === initialTeacher.id &&
          (p.archivedByCascade === true || p.permission.archivedByCascade === true)
      );

      expect(restoreEligible.length).toBe(1);
      expect(restoreEligible[0].permission.id).toBe("perm-002");

      const remainingArchived = archivedPermissions.filter(
        (p) => !restoreEligible.some((r) => r.permission.id === p.permission.id)
      );
      expect(remainingArchived.length).toBe(1);
      expect(remainingArchived[0].permission.id).toBe("perm-001");
      expect(remainingArchived[0].permission.archiveReason).toBe("حذف فردي مسبق");
    });
  });

  describe("3. Permanent Delete Isolation", () => {
    it("should remove permission from archive upon permanent deletion", () => {
      let archivedPermissions: ArchivedEmployeePermission[] = [
        {
          permission: { ...initialPermissions[0], isArchived: true },
          archivedAt: new Date().toISOString(),
        },
      ];

      // Permanent delete "perm-001"
      archivedPermissions = archivedPermissions.filter((p) => p.permission.id !== "perm-001");
      expect(archivedPermissions.length).toBe(0);
    });

    it("should delete all associated permissions when a teacher is permanently deleted", () => {
      let archivedPermissions: ArchivedEmployeePermission[] = [
        {
          permission: { ...initialPermissions[0], teacherId: "teacher-101", isArchived: true },
          archivedAt: new Date().toISOString(),
        },
        {
          permission: { ...initialPermissions[1], teacherId: "teacher-999", isArchived: true },
          archivedAt: new Date().toISOString(),
        },
      ];

      const teacherToDelete = "teacher-101";
      archivedPermissions = archivedPermissions.filter(
        (p) => p.permission.teacherId !== teacherToDelete
      );

      expect(archivedPermissions.length).toBe(1);
      expect(archivedPermissions[0].permission.teacherId).toBe("teacher-999");
    });
  });
});
