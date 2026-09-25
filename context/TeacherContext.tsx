"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  Teacher,
  AbsenceRecord,
  AbsenceInquiry,
  DelayNotice,
  DelayNoticeStatus,
  DirectorOpinion,
  ArchivedTeacher,
  ArchivedAbsenceRecord,
  ArchivedDelayNotice,
} from "@/types/teacher";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import {
  DbAbsenceRecordRow,
  DbDelayNoticeRow,
  DbAbsenceInquiryRow,
} from "@/types/database";
import {
  getSaudiToday,
  calculate48HoursExpiry,
  generateSecureToken,
  getDatesInRange,
  calculateDaysBetween,
  parseInquiryMeta,
  serializeInquiryMeta,
} from "@/lib/timeUtils";

export interface AddTeachersResult {
  addedCount: number;
  updatedCount: number;
  duplicateCount: number;
  totalProcessed: number;
}

interface TeacherContextType {
  teachers: Teacher[];
  absenceRecords: AbsenceRecord[];
  inquiries: AbsenceInquiry[];
  delayNotices: DelayNotice[];
  // === Archive System (نظام الأرشيف) ===
  archivedTeachers: ArchivedTeacher[];
  archivedAbsences: ArchivedAbsenceRecord[];
  archivedDelayNotices: ArchivedDelayNotice[];
  restoreFromArchive: (
    type: "teacher" | "absence" | "delay",
    id: string
  ) => { success: boolean; error?: string; message?: string };
  permanentDeleteFromArchive: (
    type: "teacher" | "absence" | "delay",
    id: string
  ) => boolean;
  clearArchive: (type?: "teacher" | "absence" | "delay") => void;
  isLoading: boolean;
  isCloudConnected: boolean;
  pendingSyncCount: number;
  flushSyncQueue: () => Promise<void>;
  addTeachers: (newTeachers: Teacher[]) => AddTeachersResult;
  addTeacher: (
    teacherData: Omit<Teacher, "id" | "totalAbsences"> &
      Partial<Pick<Teacher, "id" | "totalAbsences">>
  ) => { success: boolean; error?: string; teacher?: Teacher };
  updateTeacher: (
    id: string,
    updatedData: Partial<Teacher>
  ) => { success: boolean; error?: string; teacher?: Teacher };
  deleteTeacher: (
    id: string,
    archiveReason?: string
  ) => { deletedTeacher?: Teacher; deletedRecords: AbsenceRecord[] };
  restoreTeacher: (teacher: Teacher, associatedRecords?: AbsenceRecord[]) => void;
  clearTeachers: () => void;
  updateAbsences: (id: string, count: number) => void;
  recalculateAbsences: () => void;
  recalculateTeacherAbsences: () => void;
  recordAbsence: (
    data: Omit<AbsenceRecord, "id" | "timestamp">
  ) => AbsenceRecord;
  updateAbsenceRecord: (
    id: string,
    updatedData: Partial<AbsenceRecord>
  ) => { success: boolean; error?: string; record?: AbsenceRecord };
  deleteAbsenceRecord: (
    id: string,
    archiveReason?: string
  ) => { deletedRecord?: AbsenceRecord };
  restoreAbsenceRecord: (record: AbsenceRecord) => void;
  createInquiry: (
    teacherId: string,
    absenceDate: string,
    absenceEndDate?: string,
    daysCount?: number
  ) => Promise<{ success: boolean; inquiry?: AbsenceInquiry; error?: string }>;
  updateInquiryDecision: (
    inquiryId: string,
    status: "approved" | "rejected",
    adminNotes?: string
  ) => Promise<{ success: boolean; error?: string }>;
  deleteInquiry: (inquiryId: string, archiveReason?: string) => Promise<void>;
  refreshInquiries: () => Promise<void>;
  // === Delay Notices (تنبيه عن تأخر / انصراف) ===
  createDelayNotice: (
    data: Omit<
      DelayNotice,
      "id" | "createdAt" | "status" | "hijriYear" | "shareToken" | "tokenExpiresAt"
    > & {
      hijriYear?: string;
      shareToken?: string;
      tokenExpiresAt?: string;
    }
  ) => { success: boolean; notice?: DelayNotice; error?: string };
  updateDelayNotice: (
    id: string,
    updates: Partial<DelayNotice>
  ) => { success: boolean; notice?: DelayNotice; error?: string };
  submitTeacherResponse: (
    id: string,
    teacherReason: string,
    teacherSignatureDate?: string
  ) => { success: boolean; notice?: DelayNotice; error?: string };
  submitDirectorDecision: (
    id: string,
    directorOpinion: "accepted" | "rejected_with_deduction",
    directorNotes?: string,
    directorSignatureDate?: string
  ) => { success: boolean; notice?: DelayNotice; error?: string };
  deleteDelayNotice: (
    id: string,
    archiveReason?: string
  ) => { deletedNotice?: DelayNotice };
  restoreDelayNotice: (notice: DelayNotice) => void;
  markDelayNoticeLinkShared: (id: string) => void;
  submitTeacherResponseByToken: (
    token: string,
    teacherReason: string,
    teacherSignatureDate?: string,
    teacherIpAddress?: string
  ) => Promise<{ success: boolean; notice?: DelayNotice; error?: string }>;
}

const TEACHERS_STORAGE_KEY = "school_admin_teachers_v1";
const ABSENCES_STORAGE_KEY = "school_admin_absences_v1";
const INQUIRIES_STORAGE_KEY = "school_admin_inquiries_v1";
const DELAY_NOTICES_STORAGE_KEY = "school_admin_delay_notices_v1";
const ARCHIVED_TEACHERS_STORAGE_KEY = "school_admin_archived_teachers_v1";
const ARCHIVED_ABSENCES_STORAGE_KEY = "school_admin_archived_absences_v1";
const ARCHIVED_DELAYS_STORAGE_KEY = "school_admin_archived_delays_v1";
const PENDING_SYNC_STORAGE_KEY = "school_admin_pending_sync_v1";

export interface PendingSyncOperation {
  id: string;
  table: "teachers" | "absence_records" | "delay_notices" | "absence_inquiries";
  action: "insert" | "update" | "delete";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
  timestamp: number;
}

export const normalizeTeacher = (t: Record<string, unknown>): Teacher => {
  const rawFullName =
    (t.fullName as string) ||
    (t.name as string) ||
    (t.full_name as string) ||
    (t["الإسم"] as string) ||
    (t["الاسم"] as string) ||
    (t["الاسم الرباعي"] as string) ||
    (t["اسم المعلمة"] as string) ||
    (t["Name"] as string) ||
    "معلمة";

  const rawNationalId = String(
    t.nationalId ??
      t.national_id ??
      t["رقم الهوية"] ??
      t["الهوية"] ??
      t["السجل المدني"] ??
      t["رقم السجل المدني"] ??
      t.username ??
      t.jobNumber ??
      t.job_number ??
      t["اسم المستخدم"] ??
      t["الرقم الوظيفي"] ??
      t["رقم الوظيفة"] ??
      t["Job Number"] ??
      ""
  ).trim();

  const fullName = String(rawFullName).trim();
  const nationalId = rawNationalId;
  const rawMobile = String(
    t.mobile ?? t.phone ?? t.phoneNumber ?? t["الجوال"] ?? t["رقم الجوال"] ?? ""
  ).trim();
  const mobile = rawMobile || undefined;

  const rawEmail = String(
    t.email ?? t.Email ?? t["البريد الإلكتروني"] ?? ""
  ).trim();
  const email = rawEmail ? rawEmail.toLowerCase() : undefined;

  const employmentStatus = String(
    t.employmentStatus ?? t.employment_status ?? t["حالة التوظيف"] ?? "دائم"
  ).trim();
  const jobTitle = String(
    t.jobTitle ?? t.job_title ?? t["المسمى الوظيفي"] ?? "معلم"
  ).trim();
  const specialty = String(
    t.specialty ?? t["التخصص"] ?? t["تخصص المعلمة"] ?? t["Specialty"] ?? ""
  ).trim();
  const teachingField = String(
    t.teachingField ?? t.teaching_field ?? t["مجال التدريس"] ?? specialty ?? ""
  ).trim();
  const totalAbsences = typeof t.totalAbsences === "number"
    ? t.totalAbsences
    : typeof t.total_absences === "number"
    ? t.total_absences
    : 0;
  const totalDelayNotices = typeof t.totalDelayNotices === "number"
    ? t.totalDelayNotices
    : typeof t.total_delay_notices === "number"
    ? t.total_delay_notices
    : 0;

  const id =
    (t.id as string) ||
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `tch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);

  const createdAt =
    (t.createdAt as string) || (t.created_at as string) || new Date().toISOString();
  const updatedAt =
    (t.updatedAt as string) || (t.updated_at as string) || new Date().toISOString();

  return {
    id,
    nationalId,
    fullName,
    mobile,
    email,
    employmentStatus: employmentStatus || "دائم",
    jobTitle: jobTitle || "معلم",
    teachingField: teachingField || specialty || undefined,
    specialty: specialty || undefined,
    totalAbsences: Math.max(0, totalAbsences),
    totalDelayNotices: Math.max(0, totalDelayNotices),
    createdAt,
    updatedAt,
    isArchived: Boolean(t.isArchived ?? t.is_archived ?? false),
    archivedAt: (t.archivedAt as string) || (t.archived_at as string) || undefined,
    archiveReason: (t.archiveReason as string) || (t.archive_reason as string) || undefined,
    // Backward compatibility aliases
    name: fullName,
    username: nationalId,
    jobNumber: nationalId,
  };
};

export const auditAndMigrateData = (
  rawTeachers: Teacher[],
  rawAbsences: AbsenceRecord[],
  rawDelayNotices: DelayNotice[],
  rawInquiries: AbsenceInquiry[]
): {
  cleanTeachers: Teacher[];
  cleanAbsences: AbsenceRecord[];
  cleanDelayNotices: DelayNotice[];
  cleanInquiries: AbsenceInquiry[];
  migratedAbsencesCount: number;
  orphanAbsencesCount: number;
  migratedDelayNoticesCount: number;
  orphanDelayNoticesCount: number;
} => {
  const teacherIdMap = new Map<string, Teacher>();
  const teacherNationalIdMap = new Map<string, Teacher>();
  const teacherNameMap = new Map<string, Teacher>();

  for (const t of rawTeachers) {
    if (t.id) teacherIdMap.set(t.id, t);
    const natId = (t.nationalId || t.username || t.jobNumber || "").trim().toLowerCase();
    if (natId) teacherNationalIdMap.set(natId, t);
    const n = (t.fullName || t.name || "").trim().toLowerCase();
    if (n) teacherNameMap.set(n, t);
  }

  let migratedAbsencesCount = 0;
  let orphanAbsencesCount = 0;
  const cleanAbsences: AbsenceRecord[] = [];

  for (const record of rawAbsences) {
    let matchedTeacher: Teacher | undefined = undefined;

    // 1. Direct ID match
    if (record.teacherId && teacherIdMap.has(record.teacherId)) {
      matchedTeacher = teacherIdMap.get(record.teacherId);
    }

    // 2. Match by nationalId / username / jobNumber
    if (!matchedTeacher) {
      const u1 = (record.nationalId || record.jobNumber || "").trim().toLowerCase();
      const u2 = (record.teacherId || "").trim().toLowerCase();
      if (u1 && teacherNationalIdMap.has(u1)) {
        matchedTeacher = teacherNationalIdMap.get(u1);
      } else if (u2 && teacherNationalIdMap.has(u2)) {
        matchedTeacher = teacherNationalIdMap.get(u2);
      }
    }

    // 3. Match by teacher name
    if (!matchedTeacher) {
      const n1 = (record.teacherName || "").trim().toLowerCase();
      if (n1 && teacherNameMap.has(n1)) {
        matchedTeacher = teacherNameMap.get(n1);
      }
    }

    if (matchedTeacher) {
      const wasMismatch = record.teacherId !== matchedTeacher.id;
      if (wasMismatch) {
        migratedAbsencesCount++;
      }
      cleanAbsences.push({
        ...record,
        teacherId: matchedTeacher.id,
        teacherName: matchedTeacher.fullName || matchedTeacher.name || record.teacherName,
        nationalId: matchedTeacher.nationalId || matchedTeacher.username || matchedTeacher.jobNumber || record.nationalId,
        jobNumber: matchedTeacher.nationalId || matchedTeacher.username || matchedTeacher.jobNumber || record.jobNumber,
        specialty: matchedTeacher.specialty || matchedTeacher.teachingField || record.specialty,
      });
    } else {
      orphanAbsencesCount++;
    }
  }

  // Delay Notices migration
  let migratedDelayNoticesCount = 0;
  let orphanDelayNoticesCount = 0;
  const cleanDelayNotices: DelayNotice[] = [];

  for (const notice of rawDelayNotices) {
    let matchedTeacher: Teacher | undefined = undefined;

    if (notice.teacherId && teacherIdMap.has(notice.teacherId)) {
      matchedTeacher = teacherIdMap.get(notice.teacherId);
    }
    if (!matchedTeacher) {
      const u1 = (notice.nationalId || notice.jobNumber || "").trim().toLowerCase();
      const u2 = (notice.teacherId || "").trim().toLowerCase();
      if (u1 && teacherNationalIdMap.has(u1)) {
        matchedTeacher = teacherNationalIdMap.get(u1);
      } else if (u2 && teacherNationalIdMap.has(u2)) {
        matchedTeacher = teacherNationalIdMap.get(u2);
      }
    }
    if (!matchedTeacher) {
      const n1 = (notice.teacherName || "").trim().toLowerCase();
      if (n1 && teacherNameMap.has(n1)) {
        matchedTeacher = teacherNameMap.get(n1);
      }
    }

    if (matchedTeacher) {
      const wasMismatch = notice.teacherId !== matchedTeacher.id;
      if (wasMismatch) migratedDelayNoticesCount++;
      cleanDelayNotices.push({
        ...notice,
        teacherId: matchedTeacher.id,
        teacherName: matchedTeacher.fullName || matchedTeacher.name || notice.teacherName,
        nationalId: matchedTeacher.nationalId || matchedTeacher.username || matchedTeacher.jobNumber || notice.nationalId,
        jobNumber: matchedTeacher.nationalId || matchedTeacher.username || matchedTeacher.jobNumber || notice.jobNumber,
        specialty: matchedTeacher.specialty || matchedTeacher.teachingField || notice.specialty,
      });
    } else {
      orphanDelayNoticesCount++;
    }
  }

  // Inquiries migration
  const cleanInquiries: AbsenceInquiry[] = [];
  for (const inq of rawInquiries) {
    let matchedTeacher: Teacher | undefined = undefined;
    if (inq.teacherId && teacherIdMap.has(inq.teacherId)) {
      matchedTeacher = teacherIdMap.get(inq.teacherId);
    }
    if (!matchedTeacher) {
      const u1 = (inq.nationalId || inq.jobNumber || "").trim().toLowerCase();
      const u2 = (inq.teacherId || "").trim().toLowerCase();
      if (u1 && teacherNationalIdMap.has(u1)) {
        matchedTeacher = teacherNationalIdMap.get(u1);
      } else if (u2 && teacherNationalIdMap.has(u2)) {
        matchedTeacher = teacherNationalIdMap.get(u2);
      }
    }
    if (!matchedTeacher) {
      const n1 = (inq.teacherName || "").trim().toLowerCase();
      if (n1 && teacherNameMap.has(n1)) {
        matchedTeacher = teacherNameMap.get(n1);
      }
    }

    if (matchedTeacher) {
      cleanInquiries.push({
        ...inq,
        teacherId: matchedTeacher.id,
        teacherName: matchedTeacher.fullName || inq.teacherName,
        nationalId: matchedTeacher.nationalId || matchedTeacher.username || inq.nationalId,
        jobNumber: matchedTeacher.nationalId || matchedTeacher.username || inq.jobNumber,
      });
    }
  }

  // Reconcile approved inquiries into cleanAbsences if missing
  for (const inq of cleanInquiries) {
    if (inq.status === "approved" && inq.absenceDate) {
      const alreadyHasRecord = cleanAbsences.some(
        (a) => a.teacherId === inq.teacherId && a.date === inq.absenceDate
      );
      if (!alreadyHasRecord) {
        cleanAbsences.push({
          id: `abs-inq-${inq.id}`,
          teacherId: inq.teacherId,
          teacherName: inq.teacherName,
          nationalId: inq.nationalId || inq.jobNumber,
          jobNumber: inq.nationalId || inq.jobNumber,
          specialty: inq.specialty || "عام",
          date: inq.absenceDate,
          type: inq.absenceType || "مرضي",
          reason: inq.teacherReason || "عذر مقبول ومعتمد من الإدارة",
          notes: inq.adminNotes || "تم الاعتماد عبر المساءلة الإلكترونية",
          attachmentUrl: inq.attachmentUrl || undefined,
          timestamp: inq.submittedAt || inq.createdAt || new Date().toISOString(),
        });
        migratedAbsencesCount++;
      }
    }
  }

  // Recalculate teacher KPI counters strictly based on clean linked records
  const absenceCountMap: Record<string, number> = {};
  for (const a of cleanAbsences) {
    absenceCountMap[a.teacherId] = (absenceCountMap[a.teacherId] || 0) + 1;
  }
  const delayCountMap: Record<string, number> = {};
  for (const d of cleanDelayNotices) {
    delayCountMap[d.teacherId] = (delayCountMap[d.teacherId] || 0) + 1;
  }

  const cleanTeachers = rawTeachers.map((t) => ({
    ...t,
    totalAbsences: absenceCountMap[t.id] || 0,
    totalDelayNotices: delayCountMap[t.id] || 0,
  }));

  // Browser Console Reporting
  if (typeof window !== "undefined") {
    console.group("=== [Audit & Data Migration] فحص وتدقيق ربط سجلات الغياب والتنبيهات ===");
    console.log(`إجمالي المعلمات في المنظومة: ${cleanTeachers.length}`);
    console.log(`إجمالي سجلات الغياب المرتبطة: ${cleanAbsences.length}`);
    console.log(`إجمالي تنبيهات التأخر المرتبطة: ${cleanDelayNotices.length}`);
    if (migratedAbsencesCount > 0) {
      console.log(`Migrated ${migratedAbsencesCount} absence records to correct teacherId.`);
    }
    if (orphanAbsencesCount > 0) {
      console.warn(`Cleaned up ${orphanAbsencesCount} orphan absence records.`);
    }
    if (migratedDelayNoticesCount > 0) {
      console.log(`Migrated ${migratedDelayNoticesCount} delay notices to correct teacherId.`);
    }
    if (orphanDelayNoticesCount > 0) {
      console.warn(`Cleaned up ${orphanDelayNoticesCount} orphan delay notices.`);
    }

    if (cleanAbsences.length > 0) {
      console.table(
        cleanAbsences.map((r) => {
          const teacher = teacherIdMap.get(r.teacherId);
          return {
            recordId: r.id,
            date: r.date,
            type: r.type,
            recordTeacherId: r.teacherId,
            matchedTeacherId: teacher?.id || "غير معروف",
            teacherFullName: teacher?.fullName || r.teacherName,
            status: "Linked ✓",
          };
        })
      );
    }
    console.groupEnd();
  }

  return {
    cleanTeachers,
    cleanAbsences,
    cleanDelayNotices,
    cleanInquiries,
    migratedAbsencesCount,
    orphanAbsencesCount,
    migratedDelayNoticesCount,
    orphanDelayNoticesCount,
  };
};

const TeacherContext = createContext<TeacherContextType | undefined>(undefined);

export const TeacherProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [absenceRecords, setAbsenceRecords] = useState<AbsenceRecord[]>([]);
  const [inquiries, setInquiries] = useState<AbsenceInquiry[]>([]);
  const [delayNotices, setDelayNotices] = useState<DelayNotice[]>([]);
  // Archive States
  const [archivedTeachers, setArchivedTeachers] = useState<ArchivedTeacher[]>([]);
  const [archivedAbsences, setArchivedAbsences] = useState<ArchivedAbsenceRecord[]>([]);
  const [archivedDelayNotices, setArchivedDelayNotices] = useState<ArchivedDelayNotice[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const isMountedRef = useRef(false);

  // Sync Queue Helpers
  const queueSyncOperation = useCallback(
    (op: Omit<PendingSyncOperation, "id" | "timestamp">) => {
      if (typeof window === "undefined") return;
      try {
        const raw = localStorage.getItem(PENDING_SYNC_STORAGE_KEY);
        const queue: PendingSyncOperation[] = raw ? JSON.parse(raw) : [];
        const newOp: PendingSyncOperation = {
          ...op,
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          timestamp: Date.now(),
        };
        queue.push(newOp);
        localStorage.setItem(PENDING_SYNC_STORAGE_KEY, JSON.stringify(queue));
        setPendingSyncCount(queue.length);
      } catch (e) {
        console.error("فشل إضافة العملية لطابور المزامنة:", e);
      }
    },
    []
  );

  const flushSyncQueue = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase || typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(PENDING_SYNC_STORAGE_KEY);
      if (!raw) return;
      const queue: PendingSyncOperation[] = JSON.parse(raw);
      if (!Array.isArray(queue) || queue.length === 0) return;

      console.info(`[Sync Queue] جاري مزامنة ${queue.length} عملية معلقة مع سوبابيز...`);
      const remaining: PendingSyncOperation[] = [];

      for (const op of queue) {
        try {
          if (op.action === "insert") {
            const { error } = await supabase.from(op.table).upsert(op.data);
            if (error) throw error;
          } else if (op.action === "update") {
            const { error } = await supabase
              .from(op.table)
              .update(op.data)
              .eq("id", op.data.id);
            if (error) throw error;
          } else if (op.action === "delete") {
            const { error } = await supabase
              .from(op.table)
              .delete()
              .eq("id", op.data.id);
            if (error) throw error;
          }
        } catch (itemErr) {
          console.warn(`تعذر مزامنة العملية ${op.id}:`, itemErr);
          remaining.push(op);
        }
      }

      if (remaining.length > 0) {
        localStorage.setItem(PENDING_SYNC_STORAGE_KEY, JSON.stringify(remaining));
        setPendingSyncCount(remaining.length);
      } else {
        localStorage.removeItem(PENDING_SYNC_STORAGE_KEY);
        setPendingSyncCount(0);
        setIsCloudConnected(true);
        console.info("[Sync Queue] اكتملت مزامنة كافة العمليات المعلقة بنجاح ✓");
      }
    } catch (e) {
      console.warn("خطأ أثناء تصفية طابور المزامنة:", e);
    }
  }, []);

  // 1. Initial Load: Load fast from localStorage with auto-migration, then hydrate from Supabase if configured
  useEffect(() => {
    const loadInitialData = async () => {
      let localTeachers: Teacher[] = [];
      let localAbsences: AbsenceRecord[] = [];
      let localInquiries: AbsenceInquiry[] = [];
      let localDelayNotices: DelayNotice[] = [];
      let parsedArchAbsences: ArchivedAbsenceRecord[] = [];

      try {
        const storedTeachers = localStorage.getItem(TEACHERS_STORAGE_KEY);
        if (storedTeachers) {
          const parsed = JSON.parse(storedTeachers);
          if (Array.isArray(parsed)) {
            localTeachers = parsed.map((item) =>
              normalizeTeacher(item as Record<string, unknown>)
            );
          }
        }

        const storedAbsences = localStorage.getItem(ABSENCES_STORAGE_KEY);
        if (storedAbsences) {
          const parsed = JSON.parse(storedAbsences);
          if (Array.isArray(parsed)) {
            localAbsences = parsed.map((a: Record<string, unknown>) => ({
              id: String(a.id || ""),
              teacherId: String(a.teacherId || a.teacher_id || ""),
              teacherName: String(a.teacherName || a.teacher_name || a.name || ""),
              jobNumber: String(a.jobNumber || a.job_number || a.username || ""),
              specialty: String(a.specialty || ""),
              date: String(a.date || ""),
              type: (a.type as AbsenceRecord["type"]) || "اضطراري",
              reason: String(a.reason || ""),
              notes: a.notes ? String(a.notes) : undefined,
              attachmentUrl: (a.attachmentUrl || a.attachment_url)
                ? String(a.attachmentUrl || a.attachment_url)
                : undefined,
              timestamp: String(a.timestamp || new Date().toISOString()),
            }));
          }
        }

        const storedInquiries = localStorage.getItem(INQUIRIES_STORAGE_KEY);
        if (storedInquiries) {
          const parsed = JSON.parse(storedInquiries);
          if (Array.isArray(parsed)) {
            localInquiries = parsed;
          }
        }

        const storedDelayNotices = localStorage.getItem(DELAY_NOTICES_STORAGE_KEY);
        if (storedDelayNotices) {
          const parsed = JSON.parse(storedDelayNotices);
          if (Array.isArray(parsed)) {
            localDelayNotices = parsed.map((dn: Record<string, unknown>) => ({
              ...dn,
              shareToken:
                (dn.shareToken as string) ||
                (typeof crypto !== "undefined" && crypto.randomUUID
                  ? crypto.randomUUID().replace(/-/g, "")
                  : generateSecureToken(16)),
              tokenExpiresAt:
                (dn.tokenExpiresAt as string) ||
                calculate48HoursExpiry(),
            })) as DelayNotice[];
          }
        }

        // Load Archives from LocalStorage with cascade auto-migration
        let parsedArchTeachers: ArchivedTeacher[] = [];
        let parsedArchDelays: ArchivedDelayNotice[] = [];

        const storedArchTeachers = localStorage.getItem(ARCHIVED_TEACHERS_STORAGE_KEY);
        if (storedArchTeachers) {
          try {
            const parsed = JSON.parse(storedArchTeachers);
            if (Array.isArray(parsed)) parsedArchTeachers = parsed;
          } catch {}
        }
        const storedArchAbsences = localStorage.getItem(ARCHIVED_ABSENCES_STORAGE_KEY);
        if (storedArchAbsences) {
          try {
            const parsed = JSON.parse(storedArchAbsences);
            if (Array.isArray(parsed)) parsedArchAbsences = parsed;
          } catch {}
        }
        const storedArchDelays = localStorage.getItem(ARCHIVED_DELAYS_STORAGE_KEY);
        if (storedArchDelays) {
          try {
            const parsed = JSON.parse(storedArchDelays);
            if (Array.isArray(parsed)) parsedArchDelays = parsed;
          } catch {}
        }

        // Migrate any associatedRecords / associatedDelayNotices from archivedTeachers into archivedAbsences / archivedDelayNotices if not already present
        const archAbsIds = new Set(parsedArchAbsences.map((a) => a.record.id));
        const archDelayIds = new Set(parsedArchDelays.map((d) => d.notice.id));
        for (const archTeacher of parsedArchTeachers) {
          if (Array.isArray(archTeacher.associatedRecords)) {
            for (const rec of archTeacher.associatedRecords) {
              if (rec && rec.id && !archAbsIds.has(rec.id)) {
                archAbsIds.add(rec.id);
                parsedArchAbsences.push({
                  record: {
                    ...rec,
                    isArchived: true,
                    archivedAt: archTeacher.archivedAt,
                    archiveReason: archTeacher.archiveReason || "أرشفة تلقائية مع المعلمة",
                    archivedByCascade: true,
                  },
                  archivedAt: archTeacher.archivedAt,
                  archiveReason: archTeacher.archiveReason || "أرشفة تلقائية مع المعلمة",
                  archivedByCascade: true,
                });
              }
            }
          }
          if (Array.isArray(archTeacher.associatedDelayNotices)) {
            for (const dn of archTeacher.associatedDelayNotices) {
              if (dn && dn.id && !archDelayIds.has(dn.id)) {
                archDelayIds.add(dn.id);
                parsedArchDelays.push({
                  notice: {
                    ...dn,
                    isArchived: true,
                    archivedAt: archTeacher.archivedAt,
                    archiveReason: archTeacher.archiveReason || "أرشفة تلقائية مع المعلمة",
                    archivedByCascade: true,
                  },
                  archivedAt: archTeacher.archivedAt,
                  archiveReason: archTeacher.archiveReason || "أرشفة تلقائية مع المعلمة",
                  archivedByCascade: true,
                });
              }
            }
          }
        }

        setArchivedTeachers(parsedArchTeachers);
        setArchivedAbsences(parsedArchAbsences);
        setArchivedDelayNotices(parsedArchDelays);
      } catch (err) {
        console.warn("تعذر استرجاع التخزين المحلي:", err);
      }

      // Reconcile and audit local data
      const reconciled = auditAndMigrateData(
        localTeachers,
        localAbsences,
        localDelayNotices,
        localInquiries
      );

      localTeachers = reconciled.cleanTeachers;
      localAbsences = reconciled.cleanAbsences;
      localDelayNotices = reconciled.cleanDelayNotices;
      localInquiries = reconciled.cleanInquiries;

      // Save back clean data to localStorage if migration/cleanup occurred
      if (
        reconciled.migratedAbsencesCount > 0 ||
        reconciled.orphanAbsencesCount > 0 ||
        reconciled.migratedDelayNoticesCount > 0 ||
        reconciled.orphanDelayNoticesCount > 0
      ) {
        try {
          localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(localTeachers));
          localStorage.setItem(ABSENCES_STORAGE_KEY, JSON.stringify(localAbsences));
          localStorage.setItem(DELAY_NOTICES_STORAGE_KEY, JSON.stringify(localDelayNotices));
          localStorage.setItem(INQUIRIES_STORAGE_KEY, JSON.stringify(localInquiries));
        } catch (e) {
          console.warn("فشل تحديث التخزين المحلي بعد الترحيل:", e);
        }
      }

      setTeachers(localTeachers);
      setAbsenceRecords(localAbsences);
      setInquiries(localInquiries);
      setDelayNotices(localDelayNotices);

      // Cloud Sync if Supabase is Configured
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data: dbTeachers, error: tErr } = await supabase
            .from("teachers")
            .select("*")
            .order("created_at", { ascending: true });

          const { data: dbAbsences, error: aErr } = await supabase
            .from("absence_records")
            .select("*")
            .order("timestamp", { ascending: false });

          if (!tErr && !aErr && dbTeachers) {
            setIsCloudConnected(true);

            if (dbTeachers.length > 0) {
              const mappedTeachers: Teacher[] = dbTeachers.map((t) =>
                normalizeTeacher(t as Record<string, unknown>)
              );

              const mappedAbsences: AbsenceRecord[] = (dbAbsences || []).map(
                (a) => ({
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
                })
              );

              // Merge local and cloud absences, then audit and migrate
              const absenceMap = new Map<string, AbsenceRecord>();
              for (const loc of localAbsences) {
                if (loc.id) absenceMap.set(loc.id, loc);
              }
              for (const cl of mappedAbsences) {
                if (cl.id) absenceMap.set(cl.id, cl);
              }
              const mergedAbsences = Array.from(absenceMap.values());

              const cloudReconciled = auditAndMigrateData(
                mappedTeachers,
                mergedAbsences,
                localDelayNotices,
                localInquiries
              );

              setTeachers(cloudReconciled.cleanTeachers);
              setAbsenceRecords(cloudReconciled.cleanAbsences);
            } else if (localTeachers.length > 0) {
              // Auto-seed Supabase from local data
              const toInsertTeachers = localTeachers.map((t) => ({
                id: t.id,
                name: t.fullName,
                full_name: t.fullName,
                national_id: t.nationalId,
                job_number: t.nationalId,
                username: t.nationalId,
                mobile: t.mobile || null,
                email: t.email || null,
                employment_status: t.employmentStatus || "دائم",
                job_title: t.jobTitle || "معلم",
                teaching_field: t.teachingField || t.specialty || null,
                specialty: t.specialty || null,
                total_absences: t.totalAbsences || 0,
                updated_at: t.updatedAt || new Date().toISOString(),
              }));
              await supabase.from("teachers").upsert(toInsertTeachers);

              if (localAbsences.length > 0) {
                const toInsertAbsences = localAbsences.map((a) => ({
                  id: a.id,
                  teacher_id: a.teacherId,
                  teacher_name: a.teacherName,
                  job_number: a.jobNumber,
                  specialty: a.specialty,
                  date: a.date,
                  type: a.type,
                  reason: a.reason,
                  notes: a.notes || null,
                  attachment_url: a.attachmentUrl || null,
                  timestamp: a.timestamp,
                }));
                await supabase.from("absence_records").upsert(toInsertAbsences);
              }
            }
          }

          // Hydrate absence inquiries
          const { data: dbInquiries, error: inqErr } = await supabase
            .from("absence_inquiries")
            .select("*")
            .order("created_at", { ascending: false });

          if (!inqErr && dbInquiries && dbInquiries.length > 0) {
            const mappedInquiries: AbsenceInquiry[] = (dbInquiries as unknown as DbAbsenceInquiryRow[]).map(
              (inq: DbAbsenceInquiryRow) => {
                const meta = parseInquiryMeta(inq.admin_notes);
                const endDate = inq.absence_end_date || meta.absenceEndDate || undefined;
                const isMulti = Boolean(endDate && endDate !== inq.absence_date);
                const days = inq.days_count || meta.daysCount || (isMulti ? calculateDaysBetween(inq.absence_date, endDate!) : 1);

                return {
                  id: inq.id,
                  teacherId: inq.teacher_id,
                  teacherName: inq.teacher_name,
                  jobNumber: inq.job_number,
                  specialty: inq.specialty || undefined,
                  mobile: inq.mobile || undefined,
                  absenceDate: inq.absence_date,
                  absenceEndDate: isMulti ? endDate : undefined,
                  daysCount: days,
                  isMultiDay: isMulti,
                  token: inq.token,
                  status: inq.status,
                  expiresAt: inq.expires_at,
                  absenceType: inq.absence_type || undefined,
                  teacherReason: inq.teacher_reason || undefined,
                  attachmentUrl: inq.attachment_url || undefined,
                  adminNotes: meta.adminNotes,
                  submittedAt: inq.submitted_at || undefined,
                  createdAt: inq.created_at,
                  isArchived: false,
                };
              }
            );

            // Exclude any inquiry that has been archived locally in parsedArchAbsences
            const archivedInquiryIds = new Set<string>();
            const archivedTeacherDatePairs = new Set<string>();
            for (const archItem of parsedArchAbsences) {
              if (archItem.record.id) archivedInquiryIds.add(archItem.record.id);
              if (archItem.linkedInquiry?.id) archivedInquiryIds.add(archItem.linkedInquiry.id);
              if (archItem.record.teacherId && archItem.record.date) {
                archivedTeacherDatePairs.add(`${archItem.record.teacherId}:${archItem.record.date}`);
              }
            }

            const activeMappedInquiries = mappedInquiries.filter(
              (inq) =>
                !archivedInquiryIds.has(inq.id) &&
                !archivedInquiryIds.has(`abs-inq-${inq.id}`) &&
                !archivedTeacherDatePairs.has(`${inq.teacherId}:${inq.absenceDate}`)
            );

            setInquiries(activeMappedInquiries);

            // Reconcile approved non-archived inquiries with absenceRecords
            setAbsenceRecords((prevAbsences) => {
              const toAdd: AbsenceRecord[] = [];
              for (const inq of activeMappedInquiries) {
                if (inq.status === "approved" && inq.absenceDate && !inq.isArchived) {
                  const exists = prevAbsences.some(
                    (a) => a.teacherId === inq.teacherId && a.date === inq.absenceDate
                  );
                  if (!exists) {
                    toAdd.push({
                      id: `abs-inq-${inq.id}`,
                      teacherId: inq.teacherId,
                      teacherName: inq.teacherName,
                      jobNumber: inq.jobNumber,
                      specialty: inq.specialty || "عام",
                      date: inq.absenceDate,
                      type: inq.absenceType || "مرضي",
                      reason: inq.teacherReason || "عذر مقبول ومعتمد من الإدارة",
                      notes: inq.adminNotes || "تم الاعتماد عبر المساءلة الإلكترونية",
                      attachmentUrl: inq.attachmentUrl || undefined,
                      timestamp: inq.submittedAt || inq.createdAt || new Date().toISOString(),
                      isArchived: false,
                    });
                  }
                }
              }

              if (toAdd.length === 0) return prevAbsences;
              const nextAbsences = [...toAdd, ...prevAbsences];

              // Update teachers count
              setTeachers((prevTeachers) =>
                prevTeachers.map((t) => {
                  const count = nextAbsences.filter(
                    (a) => a.teacherId === t.id && !a.isArchived
                  ).length;
                  return t.totalAbsences !== count ? { ...t, totalAbsences: count } : t;
                })
              );

              return nextAbsences;
            });
          }

          // Hydrate delay notices from Supabase
          const { data: dbDelays, error: delayErr } = await supabase
            .from("delay_notices")
            .select("*")
            .order("created_at", { ascending: false });

          if (!delayErr && dbDelays && dbDelays.length > 0) {
            const mappedDelays: DelayNotice[] = (dbDelays as unknown as DbDelayNoticeRow[]).map((dn: DbDelayNoticeRow) => ({
              id: dn.id,
              noticeNumber: dn.notice_number || undefined,
              teacherId: dn.teacher_id,
              teacherName: dn.teacher_name,
              jobNumber: dn.job_number,
              specialty: dn.specialty || undefined,
              noticeDate: dn.notice_date,
              date: dn.notice_date,
              violationDelayStart: dn.violation_delay_start,
              delayStartTime: dn.delay_start_time || undefined,
              violationAbsentDuring: dn.violation_absent_during,
              absentFromTime: dn.absent_from_time || undefined,
              absentToTime: dn.absent_to_time || undefined,
              violationEarlyDeparture: dn.violation_early_departure,
              earlyDepartureTime: dn.early_departure_time || undefined,
              violationLeftSchool: dn.violation_left_school,
              leftSchoolDetails: dn.left_school_details || undefined,
              additionalNotes: dn.additional_notes || undefined,
              notes: dn.additional_notes || undefined,
              status: dn.status,
              teacherReason: dn.teacher_reason || undefined,
              teacherSignatureDate: dn.teacher_signature_date || undefined,
              directorOpinion: dn.director_opinion || null,
              directorNotes: dn.director_notes || undefined,
              directorSignatureDate: dn.director_signature_date || undefined,
              hijriYear: dn.hijri_year || "١٤٤٨",
              shareToken: dn.share_token,
              tokenExpiresAt: dn.token_expires_at,
              teacherResponseSubmittedAt: dn.teacher_response_submitted_at || undefined,
              teacherIpAddress: dn.teacher_ip_address || undefined,
              linkSharedAt: dn.link_shared_at || undefined,
              createdAt: dn.created_at,
            }));

            // Merge local and cloud delay notices
            const delayMap = new Map<string, DelayNotice>();
            for (const loc of localDelayNotices) {
              if (loc.id) delayMap.set(loc.id, loc);
            }
            for (const cl of mappedDelays) {
              if (cl.id) delayMap.set(cl.id, cl);
            }
            const mergedDelays = Array.from(delayMap.values());
            setDelayNotices(mergedDelays);
          }
        } catch (cloudErr) {
          console.warn(
            "المزامنة السحابية غير متاحة حالياً، تم استخدام التخزين المحلي:",
            cloudErr
          );
        }
      }

      // Check initial pending sync count
      if (typeof window !== "undefined") {
        try {
          const rawQ = localStorage.getItem(PENDING_SYNC_STORAGE_KEY);
          if (rawQ) {
            const q = JSON.parse(rawQ);
            if (Array.isArray(q)) setPendingSyncCount(q.length);
          }
        } catch {}
      }

      setIsLoading(false);
      isMountedRef.current = true;
      flushSyncQueue();
    };

    loadInitialData();
  }, [flushSyncQueue]);

  // 2. Persist to localStorage whenever state changes
  useEffect(() => {
    if (!isMountedRef.current || isLoading) return;
    try {
      localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(teachers));
    } catch (error) {
      console.error("فشل حفظ بيانات المعلمات محلياً:", error);
    }
  }, [teachers, isLoading]);

  useEffect(() => {
    if (!isMountedRef.current || isLoading) return;
    try {
      localStorage.setItem(
        ABSENCES_STORAGE_KEY,
        JSON.stringify(absenceRecords)
      );
    } catch (error) {
      console.error("فشل حفظ سجلات الغياب محلياً:", error);
    }
  }, [absenceRecords, isLoading]);

  useEffect(() => {
    if (!isMountedRef.current || isLoading) return;
    try {
      localStorage.setItem(
        INQUIRIES_STORAGE_KEY,
        JSON.stringify(inquiries)
      );
    } catch (error) {
      console.error("فشل حفظ المساءلات محلياً:", error);
    }
  }, [inquiries, isLoading]);

  useEffect(() => {
    if (!isMountedRef.current || isLoading) return;
    try {
      localStorage.setItem(
        DELAY_NOTICES_STORAGE_KEY,
        JSON.stringify(delayNotices)
      );
    } catch (error) {
      console.error("فشل حفظ تنبيهات التأخر محلياً:", error);
    }
  }, [delayNotices, isLoading]);

  // Persist Archives to localStorage
  useEffect(() => {
    if (!isMountedRef.current || isLoading) return;
    try {
      localStorage.setItem(
        ARCHIVED_TEACHERS_STORAGE_KEY,
        JSON.stringify(archivedTeachers)
      );
      localStorage.setItem(
        ARCHIVED_ABSENCES_STORAGE_KEY,
        JSON.stringify(archivedAbsences)
      );
      localStorage.setItem(
        ARCHIVED_DELAYS_STORAGE_KEY,
        JSON.stringify(archivedDelayNotices)
      );
    } catch (error) {
      console.error("فشل حفظ بيانات الأرشيف محلياً:", error);
    }
  }, [archivedTeachers, archivedAbsences, archivedDelayNotices, isLoading]);

  // Handle Online / Offline network status changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsCloudConnected(true);
      flushSyncQueue();
    };

    const handleOffline = () => {
      setIsCloudConnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [flushSyncQueue]);

  // Realtime Subscriptions via Supabase Channels (Live Cross-Device Sync)
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    const channel = supabase
      .channel("school-platform-realtime-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "absence_records" },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (payload.eventType === "INSERT") {
            const r = payload.new as unknown as DbAbsenceRecordRow;
            if (!r || !r.id) return;
            const newRec: AbsenceRecord = {
              id: r.id,
              teacherId: r.teacher_id,
              teacherName: r.teacher_name,
              jobNumber: r.job_number,
              specialty: r.specialty || "",
              date: r.date,
              type: r.type,
              reason: r.reason,
              notes: r.notes || undefined,
              attachmentUrl: r.attachment_url || undefined,
              timestamp: r.timestamp || new Date().toISOString(),
            };
            setAbsenceRecords((prev) => {
              if (prev.some((item) => item.id === newRec.id)) return prev;
              return [newRec, ...prev];
            });
            setTeachers((prev) =>
              prev.map((t) =>
                t.id === newRec.teacherId
                  ? { ...t, totalAbsences: (t.totalAbsences || 0) + 1 }
                  : t
              )
            );
          } else if (payload.eventType === "DELETE") {
            const oldRow = payload.old as Partial<DbAbsenceRecordRow>;
            if (oldRow && oldRow.id) {
              setAbsenceRecords((prev) => prev.filter((r) => r.id !== oldRow.id));
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "delay_notices" },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const row = payload.new as unknown as DbDelayNoticeRow;
            if (!row || !row.id) return;
            const updatedNotice: DelayNotice = {
              id: row.id,
              noticeNumber: row.notice_number || undefined,
              teacherId: row.teacher_id,
              teacherName: row.teacher_name,
              jobNumber: row.job_number,
              specialty: row.specialty || undefined,
              noticeDate: row.notice_date,
              date: row.notice_date,
              violationDelayStart: row.violation_delay_start,
              delayStartTime: row.delay_start_time || undefined,
              violationAbsentDuring: row.violation_absent_during,
              absentFromTime: row.absent_from_time || undefined,
              absentToTime: row.absent_to_time || undefined,
              violationEarlyDeparture: row.violation_early_departure,
              earlyDepartureTime: row.early_departure_time || undefined,
              violationLeftSchool: row.violation_left_school,
              leftSchoolDetails: row.left_school_details || undefined,
              additionalNotes: row.additional_notes || undefined,
              notes: row.additional_notes || undefined,
              status: row.status,
              teacherReason: row.teacher_reason || undefined,
              teacherSignatureDate: row.teacher_signature_date || undefined,
              directorOpinion: row.director_opinion || null,
              directorNotes: row.director_notes || undefined,
              directorSignatureDate: row.director_signature_date || undefined,
              hijriYear: row.hijri_year || "١٤٤٨",
              shareToken: row.share_token,
              tokenExpiresAt: row.token_expires_at,
              teacherResponseSubmittedAt: row.teacher_response_submitted_at || undefined,
              teacherIpAddress: row.teacher_ip_address || undefined,
              linkSharedAt: row.link_shared_at || undefined,
              createdAt: row.created_at,
            };
            setDelayNotices((prev) => {
              const exists = prev.some((d) => d.id === updatedNotice.id);
              if (exists) {
                return prev.map((d) => (d.id === updatedNotice.id ? updatedNotice : d));
              }
              return [updatedNotice, ...prev];
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "absence_inquiries" },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const inq = payload.new as unknown as DbAbsenceInquiryRow;
            if (!inq || !inq.id) return;
            const meta = parseInquiryMeta(inq.admin_notes);
            const endDate = inq.absence_end_date || meta.absenceEndDate || undefined;
            const isMulti = Boolean(endDate && endDate !== inq.absence_date);
            const days = inq.days_count || meta.daysCount || (isMulti ? calculateDaysBetween(inq.absence_date, endDate!) : 1);

            const updatedInq: AbsenceInquiry = {
              id: inq.id,
              teacherId: inq.teacher_id,
              teacherName: inq.teacher_name,
              jobNumber: inq.job_number,
              specialty: inq.specialty || undefined,
              mobile: inq.mobile || undefined,
              absenceDate: inq.absence_date,
              absenceEndDate: isMulti ? endDate : undefined,
              daysCount: days,
              isMultiDay: isMulti,
              token: inq.token,
              status: inq.status,
              expiresAt: inq.expires_at,
              absenceType: inq.absence_type || undefined,
              teacherReason: inq.teacher_reason || undefined,
              attachmentUrl: inq.attachment_url || undefined,
              adminNotes: meta.adminNotes,
              submittedAt: inq.submitted_at || undefined,
              createdAt: inq.created_at,
            };
            setInquiries((prev) => {
              const exists = prev.some((i) => i.id === updatedInq.id);
              if (exists) {
                return prev.map((i) => (i.id === updatedInq.id ? updatedInq : i));
              }
              return [updatedInq, ...prev];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, []);

  // 3. Add multiple teachers (Excel or Batch Import) with Upsert on nationalId
  const addTeachers = useCallback(
    (newTeachers: Teacher[]): AddTeachersResult => {
      let added = 0;
      let updated = 0;
      const duplicates = 0;

      let nextTeachers: Teacher[] = [];

      setTeachers((prev) => {
        const teacherMap = new Map<string, Teacher>();
        // Index existing teachers by nationalId (or legacy username/jobNumber)
        for (const t of prev) {
          const key = (t.nationalId || t.username || t.jobNumber || "").trim().toLowerCase();
          if (key) teacherMap.set(key, t);
        }

        const updatedList: Teacher[] = [...prev];

        for (const item of newTeachers) {
          const normalized = normalizeTeacher(item as unknown as Record<string, unknown>);
          const cleanKey = normalized.nationalId.trim().toLowerCase();

          if (!cleanKey || !normalized.fullName) {
            continue;
          }

          if (teacherMap.has(cleanKey)) {
            // Update existing teacher in-place preserving ID, absence history & createdAt
            const existing = teacherMap.get(cleanKey)!;
            const updatedTeacher: Teacher = {
              ...existing,
              fullName: normalized.fullName,
              name: normalized.fullName,
              nationalId: normalized.nationalId,
              username: normalized.nationalId,
              jobNumber: normalized.nationalId,
              mobile: normalized.mobile || existing.mobile,
              email: normalized.email || existing.email,
              employmentStatus: normalized.employmentStatus || existing.employmentStatus,
              jobTitle: normalized.jobTitle || existing.jobTitle,
              teachingField: normalized.teachingField || existing.teachingField,
              specialty: normalized.specialty || existing.specialty,
              updatedAt: new Date().toISOString(),
            };

            const idx = updatedList.findIndex((t) => t.id === existing.id);
            if (idx !== -1) {
              updatedList[idx] = updatedTeacher;
            }
            teacherMap.set(cleanKey, updatedTeacher);
            updated++;
          } else {
            // Add new teacher
            updatedList.push(normalized);
            teacherMap.set(cleanKey, normalized);
            added++;
          }
        }

        nextTeachers = updatedList;
        return updatedList;
      });

      // Background sync to Supabase
      if (isSupabaseConfigured() && supabase && nextTeachers.length > 0) {
        const dbPayload = nextTeachers.map((t) => ({
          id: t.id,
          name: t.fullName,
          full_name: t.fullName,
          national_id: t.nationalId,
          job_number: t.nationalId,
          username: t.nationalId,
          mobile: t.mobile || null,
          email: t.email || null,
          employment_status: t.employmentStatus || "دائم",
          job_title: t.jobTitle || "معلم",
          teaching_field: t.teachingField || t.specialty || null,
          specialty: t.specialty || null,
          total_absences: t.totalAbsences || 0,
          updated_at: t.updatedAt || new Date().toISOString(),
        }));
        supabase
          .from("teachers")
          .upsert(dbPayload)
          .then(({ error }) => {
            if (error) console.error("فشل مزامنة المعلمات مع سوبابيز:", error);
          });
      }

      return {
        addedCount: added,
        updatedCount: updated,
        duplicateCount: duplicates,
        totalProcessed: added + updated,
      };
    },
    []
  );

  // 4. Add single teacher manually (Manual Add Modal)
  const addTeacher = useCallback(
    (
      teacherData: Omit<Teacher, "id" | "totalAbsences"> &
        Partial<Pick<Teacher, "id" | "totalAbsences">>
    ) => {
      const cleanNationalId = String(
        teacherData.nationalId || teacherData.username || teacherData.jobNumber || ""
      ).trim();
      const cleanFullName = String(
        teacherData.fullName || teacherData.name || ""
      ).trim();

      if (!cleanFullName) {
        return { success: false, error: "اسم المعلمة مطلوب." };
      }

      if (!cleanNationalId) {
        return {
          success: false,
          error: "رقم الهوية مطلوب وفريد.",
        };
      }

      // Check for uniqueness
      const isExisting = teachers.some(
        (t) =>
          (t.nationalId || t.username || t.jobNumber || "").trim().toLowerCase() ===
          cleanNationalId.toLowerCase()
      );

      if (isExisting) {
        return {
          success: false,
          error: `رقم الهوية (${cleanNationalId}) مسجل بالفعل لمعلمة أخرى.`,
        };
      }

      const newTeacher = normalizeTeacher({
        ...teacherData,
        fullName: cleanFullName,
        nationalId: cleanNationalId,
        totalAbsences: teacherData.totalAbsences ?? 0,
      });

      setTeachers((prev) => [newTeacher, ...prev]);

      // Supabase sync
      if (isSupabaseConfigured() && supabase) {
        supabase
          .from("teachers")
          .insert({
            id: newTeacher.id,
            name: newTeacher.fullName,
            full_name: newTeacher.fullName,
            national_id: newTeacher.nationalId,
            job_number: newTeacher.nationalId,
            username: newTeacher.nationalId,
            mobile: newTeacher.mobile || null,
            email: newTeacher.email || null,
            employment_status: newTeacher.employmentStatus || "دائم",
            job_title: newTeacher.jobTitle || "معلم",
            teaching_field: newTeacher.teachingField || newTeacher.specialty || null,
            specialty: newTeacher.specialty || null,
            total_absences: newTeacher.totalAbsences || 0,
            updated_at: newTeacher.updatedAt || new Date().toISOString(),
          })
          .then(({ error }) => {
            if (error) console.error("فشل إدراج المعلمة في سوبابيز:", error);
          });
      }

      return { success: true, teacher: newTeacher };
    },
    [teachers]
  );

  // 5. Update existing teacher details
  const updateTeacher = useCallback(
    (
      id: string,
      updatedData: Partial<Teacher>
    ): { success: boolean; error?: string; teacher?: Teacher } => {
      let updatedTeacher: Teacher | null = null;

      const cleanNationalId = updatedData.nationalId
        ? String(updatedData.nationalId).trim()
        : updatedData.username
        ? String(updatedData.username).trim()
        : updatedData.jobNumber
        ? String(updatedData.jobNumber).trim()
        : undefined;

      // Validate unique nationalId if changed
      if (cleanNationalId) {
        const isDuplicate = teachers.some(
          (t) =>
            t.id !== id &&
            (t.nationalId || t.username || t.jobNumber || "").trim().toLowerCase() ===
              cleanNationalId.toLowerCase()
        );
        if (isDuplicate) {
          return {
            success: false,
            error: `رقم الهوية (${cleanNationalId}) مسجل بالفعل لمعلمة أخرى.`,
          };
        }
      }

      const now = new Date().toISOString();

      setTeachers((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            updatedTeacher = normalizeTeacher({
              ...t,
              ...updatedData,
              id: t.id,
              totalAbsences: t.totalAbsences,
              updatedAt: now,
            });
            return updatedTeacher;
          }
          return t;
        })
      );

      if (!updatedTeacher) {
        return { success: false, error: "المعلمة المحددة غير موجودة." };
      }

      const finalTeacher = updatedTeacher as Teacher;

      // Cascade update teacher info on their absence records
      setAbsenceRecords((prev) =>
        prev.map((rec) => {
          if (rec.teacherId === id) {
            return {
              ...rec,
              teacherName: finalTeacher.fullName,
              nationalId: finalTeacher.nationalId,
              jobNumber: finalTeacher.nationalId,
              specialty:
                finalTeacher.specialty ||
                finalTeacher.teachingField ||
                rec.specialty,
            };
          }
          return rec;
        })
      );

      // Cascade update teacher info on their inquiries
      setInquiries((prev) =>
        prev.map((inq) => {
          if (inq.teacherId === id) {
            return {
              ...inq,
              teacherName: finalTeacher.fullName,
              nationalId: finalTeacher.nationalId,
              jobNumber: finalTeacher.nationalId,
              mobile: finalTeacher.mobile || inq.mobile,
              specialty: finalTeacher.specialty || finalTeacher.teachingField || inq.specialty,
            };
          }
          return inq;
        })
      );

      // Cascade update teacher info on their delay notices
      setDelayNotices((prev) =>
        prev.map((dn) => {
          if (dn.teacherId === id) {
            return {
              ...dn,
              teacherName: finalTeacher.fullName,
              nationalId: finalTeacher.nationalId,
              jobNumber: finalTeacher.nationalId,
              specialty: finalTeacher.specialty || finalTeacher.teachingField || dn.specialty,
            };
          }
          return dn;
        })
      );

      if (isSupabaseConfigured() && supabase) {
        supabase
          .from("teachers")
          .update({
            name: finalTeacher.fullName,
            full_name: finalTeacher.fullName,
            national_id: finalTeacher.nationalId,
            job_number: finalTeacher.nationalId,
            username: finalTeacher.nationalId,
            mobile: finalTeacher.mobile || null,
            email: finalTeacher.email || null,
            employment_status: finalTeacher.employmentStatus,
            job_title: finalTeacher.jobTitle,
            teaching_field: finalTeacher.teachingField,
            specialty: finalTeacher.specialty,
            updated_at: finalTeacher.updatedAt,
          })
          .eq("id", id)
          .then(({ error }) => {
            if (error) console.error("فشل تحديث المعلمة في سوبابيز:", error);
          });
      }

      return { success: true, teacher: finalTeacher };
    },
    [teachers]
  );

  // 6. Delete Teacher with Cascade Soft-Delete & Archive
  const deleteTeacher = useCallback((id: string, archiveReason?: string) => {
    const now = new Date().toISOString();
    const cleanReason = archiveReason?.trim() || undefined;
    const cascadeReason = cleanReason || "أرشفة تلقائية مع المعلمة";

    const targetTeacher = teachers.find((t) => t.id === id);
    const targetRecords = absenceRecords.filter((a) => a.teacherId === id);
    const targetInquiries = inquiries.filter((inq) => inq.teacherId === id);
    const targetDelayNotices = delayNotices.filter((dn) => dn.teacherId === id);

    const deletedTeacher: Teacher | undefined = targetTeacher
      ? {
          ...targetTeacher,
          isArchived: true,
          archivedAt: now,
          archiveReason: cleanReason,
        }
      : undefined;

    const deletedRecords: AbsenceRecord[] = targetRecords.map((r) => ({
      ...r,
      isArchived: true,
      archivedAt: now,
      archiveReason: cascadeReason,
      archivedByCascade: true,
    }));

    const deletedDelayNotices: DelayNotice[] = targetDelayNotices.map((dn) => ({
      ...dn,
      isArchived: true,
      archivedAt: now,
      archiveReason: cascadeReason,
      archivedByCascade: true,
    }));

    setTeachers((prev) => prev.filter((t) => t.id !== id));
    setAbsenceRecords((prev) => prev.filter((a) => a.teacherId !== id));
    setInquiries((prev) => prev.filter((inq) => inq.teacherId !== id));
    setDelayNotices((prev) => prev.filter((dn) => dn.teacherId !== id));

    if (deletedTeacher) {
      const archivedItem: ArchivedTeacher = {
        teacher: deletedTeacher,
        associatedRecords: deletedRecords,
        associatedInquiries: targetInquiries,
        associatedDelayNotices: deletedDelayNotices,
        archivedAt: now,
        archiveReason: cleanReason,
      };
      setArchivedTeachers((prev) => [
        archivedItem,
        ...prev.filter((a) => a.teacher.id !== id),
      ]);
    }

    // Cascade archive all associated absence records with archivedByCascade = true
    if (deletedRecords.length > 0) {
      setArchivedAbsences((prev) => {
        const deletedIds = new Set(deletedRecords.map((r) => r.id));
        const cascadedItems: ArchivedAbsenceRecord[] = deletedRecords.map((rec) => ({
          record: rec,
          archivedAt: now,
          archiveReason: cascadeReason,
          archivedByCascade: true,
        }));
        return [...cascadedItems, ...prev.filter((a) => !deletedIds.has(a.record.id))];
      });
    }

    // Cascade archive all associated delay notices with archivedByCascade = true
    if (deletedDelayNotices.length > 0) {
      setArchivedDelayNotices((prev) => {
        const deletedIds = new Set(deletedDelayNotices.map((dn) => dn.id));
        const cascadedItems: ArchivedDelayNotice[] = deletedDelayNotices.map((dn) => ({
          notice: dn,
          archivedAt: now,
          archiveReason: cascadeReason,
          archivedByCascade: true,
        }));
        return [...cascadedItems, ...prev.filter((a) => !deletedIds.has(a.notice.id))];
      });
    }

    if (isSupabaseConfigured() && supabase) {
      supabase
        .from("absence_records")
        .delete()
        .eq("teacher_id", id)
        .then(() => {});

      supabase
        .from("absence_inquiries")
        .delete()
        .eq("teacher_id", id)
        .then(() => {});

      supabase
        .from("delay_notices")
        .delete()
        .eq("teacher_id", id)
        .then(() => {});

      supabase
        .from("teachers")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("فشل حذف المعلمة من سوبابيز:", error);
        });
    }

    return { deletedTeacher, deletedRecords };
  }, [teachers, absenceRecords, inquiries, delayNotices]);

  // 6.b Restore Teacher (Undo Support)
  const restoreTeacher = useCallback(
    (teacher: Teacher, associatedRecords: AbsenceRecord[] = []) => {
      const cleanTeacher: Teacher = {
        ...teacher,
        isArchived: false,
        archivedAt: undefined,
        archiveReason: undefined,
      };
      setTeachers((prev) => {
        if (prev.some((t) => t.id === cleanTeacher.id)) return prev;
        return [cleanTeacher, ...prev];
      });

      if (associatedRecords.length > 0) {
        const cleanRecords = associatedRecords.map((r) => ({
          ...r,
          isArchived: false,
          archivedAt: undefined,
          archiveReason: undefined,
          archivedByCascade: undefined,
        }));
        setAbsenceRecords((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const toAdd = cleanRecords.filter((r) => !existingIds.has(r.id));
          return [...toAdd, ...prev];
        });
      }

      // Also remove from archive lists if Undo is pressed
      setArchivedTeachers((prev) => prev.filter((a) => a.teacher.id !== teacher.id));
      setArchivedAbsences((prev) => prev.filter((a) => a.record.teacherId !== teacher.id));
      setArchivedDelayNotices((prev) => prev.filter((a) => a.notice.teacherId !== teacher.id));

      if (isSupabaseConfigured() && supabase) {
        supabase
          .from("teachers")
          .insert({
            id: cleanTeacher.id,
            name: cleanTeacher.fullName,
            full_name: cleanTeacher.fullName,
            national_id: cleanTeacher.nationalId,
            job_number: cleanTeacher.nationalId,
            username: cleanTeacher.nationalId,
            mobile: cleanTeacher.mobile || null,
            email: cleanTeacher.email || null,
            employment_status: cleanTeacher.employmentStatus || "دائم",
            job_title: cleanTeacher.jobTitle || "معلم",
            teaching_field: cleanTeacher.teachingField || cleanTeacher.specialty || null,
            specialty: cleanTeacher.specialty || null,
            total_absences: cleanTeacher.totalAbsences || 0,
            updated_at: cleanTeacher.updatedAt || new Date().toISOString(),
          })
          .then(() => {});
      }
    },
    []
  );

  // 7. Clear all teachers
  const clearTeachers = useCallback(() => {
    setTeachers([]);
    setAbsenceRecords([]);

    if (isSupabaseConfigured() && supabase) {
      supabase
        .from("teachers")
        .delete()
        .neq("id", "")
        .then(() => {});
    }
  }, []);

  // 8. Update absences manually
  const updateAbsences = useCallback((id: string, count: number) => {
    const validCount = Math.max(0, count);
    setTeachers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, totalAbsences: validCount } : t))
    );

    if (isSupabaseConfigured() && supabase) {
      supabase
        .from("teachers")
        .update({ total_absences: validCount })
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("فشل تحديث رصيد الغياب في سوبابيز:", error);
        });
    }
  }, []);

  // 8.b Recalculate all absences and delay notices strictly from current records
  const recalculateTeacherAbsences = useCallback(() => {
    setTeachers((currentTeachers) => {
      const countMap: Record<string, number> = {};
      for (const record of absenceRecords) {
        if (record.teacherId && !record.isArchived) {
          countMap[record.teacherId] = (countMap[record.teacherId] || 0) + 1;
        }
      }
      const delayCountMap: Record<string, number> = {};
      for (const dn of delayNotices) {
        if (dn.teacherId && !dn.isArchived) {
          delayCountMap[dn.teacherId] = (delayCountMap[dn.teacherId] || 0) + 1;
        }
      }

      return currentTeachers.map((teacher) => {
        const correctAbsences = countMap[teacher.id] || 0;
        const correctDelays = delayCountMap[teacher.id] || 0;
        if (
          teacher.totalAbsences === correctAbsences &&
          teacher.totalDelayNotices === correctDelays
        ) {
          return teacher;
        }
        return {
          ...teacher,
          totalAbsences: correctAbsences,
          totalDelayNotices: correctDelays,
        };
      });
    });
  }, [absenceRecords, delayNotices]);

  const recalculateAbsences = recalculateTeacherAbsences;

  // 9. Record Absence
  const recordAbsence = useCallback(
    (data: Omit<AbsenceRecord, "id" | "timestamp">): AbsenceRecord => {
      const newRecord: AbsenceRecord = {
        ...data,
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `abs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        isArchived: false,
      };

      let newCount = 1;

      setAbsenceRecords((prev) => {
        const nextRecords = [newRecord, ...prev];
        // Recalculate teacher total absences
        const countMap: Record<string, number> = {};
        for (const r of nextRecords) {
          if (!r.isArchived) {
            countMap[r.teacherId] = (countMap[r.teacherId] || 0) + 1;
          }
        }

        setTeachers((currentTeachers) =>
          currentTeachers.map((t) => {
            if (t.id === data.teacherId) {
              newCount = countMap[t.id] || 1;
              return { ...t, totalAbsences: newCount };
            }
            return t;
          })
        );

        return nextRecords;
      });

      // Background sync to Supabase with Offline Queue fallback
      const absencePayload = {
        id: newRecord.id,
        teacher_id: newRecord.teacherId,
        teacher_name: newRecord.teacherName,
        job_number: newRecord.jobNumber,
        specialty: newRecord.specialty,
        date: newRecord.date,
        type: newRecord.type,
        reason: newRecord.reason,
        notes: newRecord.notes || null,
        attachment_url: newRecord.attachmentUrl || null,
        timestamp: newRecord.timestamp,
      };

      if (isSupabaseConfigured() && supabase) {
        const sb = supabase;
        sb
          .from("absence_records")
          .insert(absencePayload)
          .then(
            ({ error }) => {
              if (error) {
                if (error.code === "PGRST204" && "attachment_url" in absencePayload) {
                  const retryPayload = { ...absencePayload };
                  delete (retryPayload as Record<string, unknown>).attachment_url;
                  return sb
                    .from("absence_records")
                    .insert(retryPayload)
                    .then(({ error: retryErr }) => {
                      if (retryErr) {
                        queueSyncOperation({ table: "absence_records", action: "insert", data: retryPayload });
                      }
                    });
                }
                console.warn("فشل إدراج المساءلة في سوبابيز، تحويل للطابور:", error.message);
                queueSyncOperation({ table: "absence_records", action: "insert", data: absencePayload });
              }
            },
            (err) => {
              console.warn("خطأ اتصال أثناء حفظ المساءلة، تحويل للطابور:", err);
              queueSyncOperation({ table: "absence_records", action: "insert", data: absencePayload });
            }
          );

        sb
          .from("teachers")
          .update({ total_absences: newCount })
          .eq("id", data.teacherId)
          .then(() => {});
      } else {
        queueSyncOperation({ table: "absence_records", action: "insert", data: absencePayload });
      }

      return newRecord;
    },
    []
  );

  // 10. Update Absence Record
  const updateAbsenceRecord = useCallback(
    (
      id: string,
      updatedData: Partial<AbsenceRecord>
    ): { success: boolean; error?: string; record?: AbsenceRecord } => {
      let updatedRecord: AbsenceRecord | null = null;
      let targetTeacherId: string | null = null;

      setAbsenceRecords((prev) => {
        const nextRecords = prev.map((rec) => {
          if (rec.id === id) {
            targetTeacherId = rec.teacherId;
            updatedRecord = {
              ...rec,
              ...updatedData,
              id: rec.id, // Immutable ID
              teacherId: rec.teacherId, // Cannot change teacher
            };
            return updatedRecord;
          }
          return rec;
        });

        // Recalculate counts
        const countMap: Record<string, number> = {};
        for (const r of nextRecords) {
          if (!r.isArchived) {
            countMap[r.teacherId] = (countMap[r.teacherId] || 0) + 1;
          }
        }
        setTeachers((currentTeachers) =>
          currentTeachers.map((t) => ({
            ...t,
            totalAbsences: countMap[t.id] || 0,
          }))
        );

        return nextRecords;
      });

      if (!updatedRecord) {
        return { success: false, error: "سجل الغياب المطلوب غير موجود." };
      }

      const finalRecord = updatedRecord as AbsenceRecord;

      if (isSupabaseConfigured() && supabase) {
        supabase
          .from("absence_records")
          .update({
            date: finalRecord.date,
            type: finalRecord.type,
            reason: finalRecord.reason,
            notes: finalRecord.notes || null,
          })
          .eq("id", id)
          .then(({ error }) => {
            if (error) console.error("فشل تحديث سجل الغياب في سوبابيز:", error);
          });
      }

      return { success: true, record: finalRecord };
    },
    []
  );

  // 10.b Delete Absence Record (Soft Delete to Archive)
  const deleteAbsenceRecord = useCallback(
    (id: string, archiveReason?: string) => {
      const now = new Date().toISOString();
      const cleanReason = archiveReason?.trim() || undefined;
      const foundRecord = absenceRecords.find((r) => r.id === id);
      const deletedRecord: AbsenceRecord | undefined = foundRecord
        ? {
            ...foundRecord,
            isArchived: true,
            archivedAt: now,
            archiveReason: cleanReason,
            archivedByCascade: false,
          }
        : undefined;

      // Also check if there is a linked WhatsApp AbsenceInquiry for the same teacher and date
      const matchedInquiry = foundRecord
        ? inquiries.find(
            (inq) =>
              inq.id === id.replace(/^abs-inq-/, "") ||
              (inq.teacherId === foundRecord.teacherId &&
                inq.absenceDate === foundRecord.date)
          )
        : undefined;

      let affectedTeacherId: string | null = foundRecord?.teacherId || null;
      let newCount = 0;

      setAbsenceRecords((prev) => {
        const nextRecords = prev.filter((r) => r.id !== id);
        if (affectedTeacherId) {
          const countMap: Record<string, number> = {};
          for (const r of nextRecords) {
            if (!r.isArchived) {
              countMap[r.teacherId] = (countMap[r.teacherId] || 0) + 1;
            }
          }
          setTeachers((currentTeachers) =>
            currentTeachers.map((t) => {
              if (t.id === affectedTeacherId) {
                newCount = countMap[t.id] || 0;
                return { ...t, totalAbsences: newCount };
              }
              return t;
            })
          );
        }
        return nextRecords;
      });

      if (matchedInquiry) {
        setInquiries((prev) => prev.filter((inq) => inq.id !== matchedInquiry.id));
      }

      if (deletedRecord) {
        const archivedItem: ArchivedAbsenceRecord = {
          record: deletedRecord,
          archivedAt: now,
          archiveReason: cleanReason,
          archivedByCascade: false,
          linkedInquiry: matchedInquiry
            ? {
                ...matchedInquiry,
                isArchived: true,
                archivedAt: now,
                archiveReason: cleanReason,
              }
            : undefined,
          isInquiryOnly: false,
        };
        setArchivedAbsences((prev) => {
          const next = [
            archivedItem,
            ...prev.filter((a) => a.record.id !== id),
          ];
          try {
            localStorage.setItem(ARCHIVED_ABSENCES_STORAGE_KEY, JSON.stringify(next));
          } catch {}
          return next;
        });
      }

      if (isSupabaseConfigured() && supabase) {
        supabase
          .from("absence_records")
          .delete()
          .eq("id", id)
          .then(({ error }) => {
            if (error) console.error("فشل حذف المساءلة من سوبابيز:", error);
          });

        if (matchedInquiry) {
          supabase
            .from("absence_inquiries")
            .delete()
            .eq("id", matchedInquiry.id)
            .then(() => {});
        }

        if (affectedTeacherId) {
          supabase
            .from("teachers")
            .update({ total_absences: newCount })
            .eq("id", affectedTeacherId)
            .then(() => {});
        }
      }

      return { deletedRecord };
    },
    [absenceRecords, inquiries]
  );

  // 10.c Restore Absence Record (Undo Support)
  const restoreAbsenceRecord = useCallback((record: AbsenceRecord) => {
    setAbsenceRecords((prev) => {
      if (prev.some((r) => r.id === record.id)) return prev;
      const nextRecords = [record, ...prev];

      const countMap: Record<string, number> = {};
      for (const r of nextRecords) {
        countMap[r.teacherId] = (countMap[r.teacherId] || 0) + 1;
      }

      setTeachers((currentTeachers) =>
        currentTeachers.map((t) => ({
          ...t,
          totalAbsences: countMap[t.id] || 0,
        }))
      );

      return nextRecords;
    });

    if (isSupabaseConfigured() && supabase) {
      supabase
        .from("absence_records")
        .insert({
          id: record.id,
          teacher_id: record.teacherId,
          teacher_name: record.teacherName,
          job_number: record.jobNumber,
          specialty: record.specialty,
          date: record.date,
          type: record.type,
          reason: record.reason,
          notes: record.notes || null,
          attachment_url: record.attachmentUrl || null,
          timestamp: record.timestamp,
        })
        .then(() => {});
    }
  }, []);

  // 11. Create Absence Inquiry
  const createInquiry = useCallback(
    async (
      teacherId: string,
      absenceDate: string,
      absenceEndDate?: string,
      daysCount?: number
    ): Promise<{ success: boolean; inquiry?: AbsenceInquiry; error?: string }> => {
      const teacher = teachers.find((t) => t.id === teacherId);
      if (!teacher) {
        return { success: false, error: "المعلمة المحددة غير موجودة." };
      }

      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `inq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const token =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID().replace(/-/g, "")
          : generateSecureToken(16);

      // 48 hours validity as approved by school administration
      const expiresAt = calculate48HoursExpiry();
      const createdAt = new Date().toISOString();
      const isMulti = Boolean(absenceEndDate && absenceEndDate !== absenceDate);
      const calculatedDays = isMulti ? daysCount || 2 : 1;
      const serializedNotes = serializeInquiryMeta(
        isMulti ? absenceEndDate : undefined,
        calculatedDays,
        undefined
      );

      const newInquiry: AbsenceInquiry = {
        id,
        teacherId: teacher.id,
        teacherName: teacher.fullName || teacher.name || "معلمة",
        nationalId: teacher.nationalId || teacher.username || teacher.jobNumber,
        jobNumber: teacher.nationalId || teacher.username || teacher.jobNumber || "—",
        specialty: teacher.specialty || teacher.teachingField,
        mobile: teacher.mobile,
        absenceDate,
        absenceEndDate: isMulti ? absenceEndDate : undefined,
        daysCount: calculatedDays,
        isMultiDay: isMulti,
        token,
        status: "pending",
        expiresAt,
        adminNotes: serializedNotes,
        createdAt,
      };

      setInquiries((prev) => [newInquiry, ...prev]);

      if (isSupabaseConfigured() && supabase) {
        try {
          const insertPayload: Record<string, unknown> = {
            id: newInquiry.id,
            teacher_id: newInquiry.teacherId,
            teacher_name: newInquiry.teacherName,
            job_number: newInquiry.jobNumber,
            specialty: newInquiry.specialty || null,
            mobile: newInquiry.mobile || null,
            absence_date: newInquiry.absenceDate,
            token: newInquiry.token,
            status: newInquiry.status,
            expires_at: newInquiry.expiresAt,
            admin_notes: serializedNotes || null,
            created_at: newInquiry.createdAt,
          };
          if (newInquiry.absenceEndDate) {
            insertPayload.absence_end_date = newInquiry.absenceEndDate;
          }
          if (newInquiry.daysCount) {
            insertPayload.days_count = newInquiry.daysCount;
          }
          if (newInquiry.isMultiDay !== undefined) {
            insertPayload.is_multi_day = newInquiry.isMultiDay;
          }

          const { error } = await supabase.from("absence_inquiries").insert(insertPayload);

          if (error) {
            // If schema doesn't have absence_end_date column yet, fallback to base insert WITH admin_notes metadata
            if (error.code === "PGRST204" || error.message?.includes("column")) {
              await supabase.from("absence_inquiries").insert({
                id: newInquiry.id,
                teacher_id: newInquiry.teacherId,
                teacher_name: newInquiry.teacherName,
                job_number: newInquiry.jobNumber,
                specialty: newInquiry.specialty || null,
                mobile: newInquiry.mobile || null,
                absence_date: newInquiry.absenceDate,
                token: newInquiry.token,
                status: newInquiry.status,
                expires_at: newInquiry.expiresAt,
                admin_notes: serializedNotes || null,
                created_at: newInquiry.createdAt,
              });
            } else {
              console.warn("تنبيه حفظ المساءلة في سوبابيز:", error.message);
            }
          }
        } catch (err) {
          console.warn("خطأ أثناء الاتصال بسوبابيز للمساءلة:", err);
        }
      }

      return { success: true, inquiry: newInquiry };
    },
    [teachers]
  );

  // 12. Update Inquiry Decision
  const updateInquiryDecision = useCallback(
    async (
      inquiryId: string,
      status: "approved" | "rejected",
      adminNotes?: string
    ): Promise<{ success: boolean; error?: string }> => {
      const existingInquiry = inquiries.find((i) => i.id === inquiryId);
      if (!existingInquiry) {
        return { success: false, error: "لم يتم العثور على المساءلة." };
      }

      const updatedInquiry: AbsenceInquiry = {
        ...existingInquiry,
        status,
        adminNotes: adminNotes !== undefined ? adminNotes : existingInquiry.adminNotes,
      };

      setInquiries((prev) =>
        prev.map((inq) => (inq.id === inquiryId ? updatedInquiry : inq))
      );

      // If approved, document it in absenceRecords if not recorded already
      if (status === "approved") {
        if (updatedInquiry.isMultiDay && updatedInquiry.absenceEndDate) {
          const dates = getDatesInRange(updatedInquiry.absenceDate, updatedInquiry.absenceEndDate);
          dates.forEach((d, idx) => {
            const alreadyRecorded = absenceRecords.some(
              (a) => a.teacherId === updatedInquiry.teacherId && a.date === d
            );

            if (!alreadyRecorded) {
              recordAbsence({
                teacherId: updatedInquiry.teacherId,
                teacherName: updatedInquiry.teacherName,
                jobNumber: updatedInquiry.jobNumber,
                specialty: updatedInquiry.specialty || "عام",
                date: d,
                type: updatedInquiry.absenceType || "مرضي",
                reason: updatedInquiry.teacherReason || "عذر مقبول ومعتمد للفترة",
                notes: adminNotes || updatedInquiry.adminNotes || `مساءلة معتمدة للفترة من ${updatedInquiry.absenceDate} إلى ${updatedInquiry.absenceEndDate} (اليوم ${idx + 1} من ${dates.length})`,
                attachmentUrl: updatedInquiry.attachmentUrl || undefined,
              });
            }
          });
        } else {
          const alreadyRecorded = absenceRecords.some(
            (a) =>
              a.teacherId === updatedInquiry.teacherId &&
              a.date === updatedInquiry.absenceDate
          );

          if (!alreadyRecorded) {
            recordAbsence({
              teacherId: updatedInquiry.teacherId,
              teacherName: updatedInquiry.teacherName,
              jobNumber: updatedInquiry.jobNumber,
              specialty: updatedInquiry.specialty || "عام",
              date: updatedInquiry.absenceDate,
              type: updatedInquiry.absenceType || "مرضي",
              reason: updatedInquiry.teacherReason || "عذر مقبول ومعتمد من الإدارة",
              notes: adminNotes || updatedInquiry.adminNotes || "تم الاعتماد عبر المساءلة الإلكترونية",
              attachmentUrl: updatedInquiry.attachmentUrl || undefined,
            });
          }
        }
      }

      if (isSupabaseConfigured() && supabase) {
        try {
          await supabase
            .from("absence_inquiries")
            .update({
              status,
              admin_notes: adminNotes || null,
            })
            .eq("id", inquiryId);
        } catch (err) {
          console.warn("فشل تحديث قرار المساءلة في سوبابيز:", err);
        }
      }

      return { success: true };
    },
    [inquiries, absenceRecords, recordAbsence]
  );

  // 13. Delete Inquiry (Soft Delete to Archive & Sync Linked AbsenceRecord)
  const deleteInquiry = useCallback(
    async (inquiryId: string, archiveReason?: string) => {
      const now = new Date().toISOString();
      const cleanReason = archiveReason?.trim() || undefined;
      const targetInquiry = inquiries.find((inq) => inq.id === inquiryId);

      // Find any linked AbsenceRecord (either abs-inq-${inquiryId} or same teacherId + absenceDate)
      const matchedRecord = targetInquiry
        ? absenceRecords.find(
            (r) =>
              r.id === `abs-inq-${inquiryId}` ||
              (r.teacherId === targetInquiry.teacherId &&
                r.date === targetInquiry.absenceDate)
          )
        : undefined;

      setInquiries((prev) => prev.filter((inq) => inq.id !== inquiryId));

      let newCount = 0;
      const affectedTeacherId =
        targetInquiry?.teacherId || matchedRecord?.teacherId || null;

      setAbsenceRecords((prev) => {
        const nextRecords = matchedRecord
          ? prev.filter((r) => r.id !== matchedRecord.id)
          : prev;

        if (affectedTeacherId) {
          const countMap: Record<string, number> = {};
          for (const r of nextRecords) {
            if (!r.isArchived) {
              countMap[r.teacherId] = (countMap[r.teacherId] || 0) + 1;
            }
          }
          setTeachers((currentTeachers) =>
            currentTeachers.map((t) => {
              if (t.id === affectedTeacherId) {
                newCount = countMap[t.id] || 0;
                return { ...t, totalAbsences: newCount };
              }
              return t;
            })
          );
        }

        return nextRecords;
      });

      if (targetInquiry) {
        const synthesizedOrMatchedRecord: AbsenceRecord = matchedRecord
          ? {
              ...matchedRecord,
              isArchived: true,
              archivedAt: now,
              archiveReason: cleanReason,
              archivedByCascade: false,
            }
          : {
              id: targetInquiry.id,
              teacherId: targetInquiry.teacherId,
              teacherName: targetInquiry.teacherName,
              jobNumber: targetInquiry.jobNumber,
              specialty: targetInquiry.specialty || "عام",
              date: targetInquiry.absenceDate,
              type: targetInquiry.absenceType || "اضطراري",
              reason:
                targetInquiry.teacherReason ||
                "مساءلة غياب إلكترونية عبر الواتساب",
              notes: targetInquiry.adminNotes || undefined,
              attachmentUrl: targetInquiry.attachmentUrl || undefined,
              timestamp: targetInquiry.createdAt || now,
              isArchived: true,
              archivedAt: now,
              archiveReason: cleanReason,
              archivedByCascade: false,
            };

        const archivedItem: ArchivedAbsenceRecord = {
          record: synthesizedOrMatchedRecord,
          archivedAt: now,
          archiveReason: cleanReason,
          archivedByCascade: false,
          linkedInquiry: {
            ...targetInquiry,
            isArchived: true,
            archivedAt: now,
            archiveReason: cleanReason,
          },
          isInquiryOnly: !matchedRecord && targetInquiry.status !== "approved",
        };

        setArchivedAbsences((prev) => {
          const next = [
            archivedItem,
            ...prev.filter(
              (a) =>
                a.record.id !== synthesizedOrMatchedRecord.id &&
                a.linkedInquiry?.id !== inquiryId
            ),
          ];
          try {
            localStorage.setItem(
              ARCHIVED_ABSENCES_STORAGE_KEY,
              JSON.stringify(next)
            );
          } catch {}
          return next;
        });
      }

      if (isSupabaseConfigured() && supabase) {
        try {
          await supabase
            .from("absence_inquiries")
            .delete()
            .eq("id", inquiryId);

          if (matchedRecord) {
            await supabase
              .from("absence_records")
              .delete()
              .eq("id", matchedRecord.id);
          }

          if (affectedTeacherId) {
            await supabase
              .from("teachers")
              .update({ total_absences: newCount })
              .eq("id", affectedTeacherId);
          }
        } catch (err) {
          console.warn("فشل حذف المساءلة من سوبابيز:", err);
        }
      }
    },
    [inquiries, absenceRecords]
  );

  // 14. Refresh Inquiries
  const refreshInquiries = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      const { data, error } = await supabase
        .from("absence_inquiries")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        const mapped: AbsenceInquiry[] = data.map((inq: any) => ({
          id: inq.id,
          teacherId: inq.teacher_id,
          teacherName: inq.teacher_name,
          jobNumber: inq.job_number,
          specialty: inq.specialty || undefined,
          mobile: inq.mobile || undefined,
          absenceDate: inq.absence_date,
          token: inq.token,
          status: inq.status,
          expiresAt: inq.expires_at,
          absenceType: inq.absence_type || undefined,
          teacherReason: inq.teacher_reason || undefined,
          attachmentUrl: inq.attachment_url || undefined,
          adminNotes: inq.admin_notes || undefined,
          submittedAt: inq.submitted_at || undefined,
          createdAt: inq.created_at,
        }));
        setInquiries(mapped);
      }
    } catch (err) {
      console.warn("فشل تحديث قائمة المساءلات:", err);
    }
  }, []);

  // 15. Create Delay Notice (Stage 1)
  const createDelayNotice = useCallback(
    (
      data: Omit<
        DelayNotice,
        "id" | "createdAt" | "status" | "hijriYear" | "shareToken" | "tokenExpiresAt"
      > & {
        hijriYear?: string;
        shareToken?: string;
        tokenExpiresAt?: string;
      }
    ): { success: boolean; notice?: DelayNotice; error?: string } => {
      const teacher = teachers.find((t) => t.id === data.teacherId);
      if (!teacher) {
        return { success: false, error: "المعلمة المحددة غير موجودة." };
      }

      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `dln-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const shareToken =
        data.shareToken ||
        (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID().replace(/-/g, "")
          : generateSecureToken(16));

      // 48 hours validity as approved by school administration
      const tokenExpiresAt =
        data.tokenExpiresAt || calculate48HoursExpiry();

      const hijriYear = data.hijriYear || "١٤٤٨";
      let createdNotice: DelayNotice | null = null;

      setDelayNotices((prev) => {
        const noticeNum =
          data.noticeNumber ||
          `ت-${new Date().getFullYear()}-${String(
            prev.length + 1
          ).padStart(3, "0")}`;

        const newNotice: DelayNotice = {
          ...data,
          id,
          noticeNumber: noticeNum,
          teacherName: teacher.fullName || teacher.name,
          nationalId: teacher.nationalId || teacher.username || teacher.jobNumber,
          jobNumber: teacher.nationalId || teacher.username || teacher.jobNumber,
          specialty: teacher.specialty || teacher.teachingField,
          hijriYear,
          status: "pending_teacher",
          createdAt: new Date().toISOString(),
          date: data.noticeDate || data.date,
          noticeDate:
            data.noticeDate ||
            data.date ||
            getSaudiToday(),
          notes: data.additionalNotes || data.notes,
          additionalNotes: data.additionalNotes || data.notes,
          shareToken,
          tokenExpiresAt,
        };
        createdNotice = newNotice;
        return [newNotice, ...prev];
      });

      // Automatically increment totalDelayNotices on teacher
      setTeachers((prev) =>
        prev.map((t) =>
          t.id === teacher.id
            ? { ...t, totalDelayNotices: (t.totalDelayNotices || 0) + 1 }
            : t
        )
      );

      if (createdNotice) {
        const n: DelayNotice = createdNotice;
        const delayPayload = {
          id: n.id,
          teacher_id: n.teacherId,
          teacher_name: n.teacherName,
          job_number: n.jobNumber,
          specialty: n.specialty,
          notice_date: n.noticeDate,
          violation_delay_start: n.violationDelayStart,
          delay_start_time: n.delayStartTime || null,
          violation_absent_during: n.violationAbsentDuring,
          absent_from_time: n.absentFromTime || null,
          absent_to_time: n.absentToTime || null,
          violation_early_departure: n.violationEarlyDeparture,
          early_departure_time: n.earlyDepartureTime || null,
          violation_left_school: n.violationLeftSchool,
          left_school_details: n.leftSchoolDetails || null,
          additional_notes: n.additionalNotes || null,
          status: n.status,
          hijri_year: n.hijriYear,
          created_at: n.createdAt,
          share_token: n.shareToken,
          token_expires_at: n.tokenExpiresAt,
          notice_number: n.noticeNumber || null,
        };

        if (isSupabaseConfigured() && supabase) {
          supabase
            .from("delay_notices")
            .insert(delayPayload)
            .then(
              ({ error }) => {
                if (error) {
                  console.warn("فشل حفظ التنبيه في سوبابيز، تحويل للطابور:", error.message);
                  queueSyncOperation({ table: "delay_notices", action: "insert", data: delayPayload });
                }
              },
              () => {
                queueSyncOperation({ table: "delay_notices", action: "insert", data: delayPayload });
              }
            );
        } else {
          queueSyncOperation({ table: "delay_notices", action: "insert", data: delayPayload });
        }
      }

      return { success: true, notice: createdNotice || undefined };
    },
    [teachers]
  );

  // 16. Update Delay Notice (Stage 1 Edit while pending_teacher)
  const updateDelayNotice = useCallback(
    (
      id: string,
      updates: Partial<DelayNotice>
    ): { success: boolean; notice?: DelayNotice; error?: string } => {
      let updatedNotice: DelayNotice | undefined;

      setDelayNotices((prev) =>
        prev.map((dn) => {
          if (dn.id === id) {
            if (dn.status !== "pending_teacher") {
              updatedNotice = dn;
              return dn;
            }
            updatedNotice = { ...dn, ...updates };
            return updatedNotice;
          }
          return dn;
        })
      );

      if (!updatedNotice) {
        return { success: false, error: "التنبيه غير موجود." };
      }

      if (isSupabaseConfigured() && supabase) {
        supabase
          .from("delay_notices")
          .update({
            notice_date: updatedNotice.noticeDate,
            violation_delay_start: updatedNotice.violationDelayStart,
            delay_start_time: updatedNotice.delayStartTime || null,
            violation_absent_during: updatedNotice.violationAbsentDuring,
            absent_from_time: updatedNotice.absentFromTime || null,
            absent_to_time: updatedNotice.absentToTime || null,
            violation_early_departure: updatedNotice.violationEarlyDeparture,
            early_departure_time: updatedNotice.earlyDepartureTime || null,
            violation_left_school: updatedNotice.violationLeftSchool,
            left_school_details: updatedNotice.leftSchoolDetails || null,
            additional_notes: updatedNotice.additionalNotes || null,
          })
          .eq("id", id)
          .then(() => {});
      }

      return { success: true, notice: updatedNotice };
    },
    []
  );

  // 17. Submit Teacher Response (Stage 2)
  const submitTeacherResponse = useCallback(
    (
      id: string,
      teacherReason: string,
      teacherSignatureDate?: string
    ): { success: boolean; notice?: DelayNotice; error?: string } => {
      let updatedNotice: DelayNotice | undefined;
      const sigDate = teacherSignatureDate || getSaudiToday();

      setDelayNotices((prev) =>
        prev.map((dn) => {
          if (dn.id === id) {
            updatedNotice = {
              ...dn,
              teacherReason,
              teacherSignatureDate: sigDate,
              teacherSignedAt: sigDate,
              status: "pending_director",
            };
            return updatedNotice;
          }
          return dn;
        })
      );

      if (!updatedNotice) {
        return { success: false, error: "التنبيه غير موجود." };
      }

      if (isSupabaseConfigured() && supabase) {
        supabase
          .from("delay_notices")
          .update({
            teacher_reason: teacherReason,
            teacher_signature_date: sigDate,
            status: "pending_director",
          })
          .eq("id", id)
          .then(() => {});
      }

      return { success: true, notice: updatedNotice };
    },
    []
  );

  // 18. Submit Director Decision (Stage 3)
  const submitDirectorDecision = useCallback(
    (
      id: string,
      directorOpinion: "accepted" | "rejected_with_deduction",
      directorNotes?: string,
      directorSignatureDate?: string
    ): { success: boolean; notice?: DelayNotice; error?: string } => {
      let updatedNotice: DelayNotice | undefined;
      const sigDate = directorSignatureDate || getSaudiToday();

      setDelayNotices((prev) =>
        prev.map((dn) => {
          if (dn.id === id) {
            updatedNotice = {
              ...dn,
              directorOpinion,
              directorNotes: directorNotes || dn.directorNotes,
              directorSignatureDate: sigDate,
              directorSignedAt: sigDate,
              status: "completed",
            };
            return updatedNotice;
          }
          return dn;
        })
      );

      if (!updatedNotice) {
        return { success: false, error: "التنبيه غير موجود." };
      }

      if (isSupabaseConfigured() && supabase) {
        supabase
          .from("delay_notices")
          .update({
            director_opinion: directorOpinion,
            director_notes: directorNotes || null,
            director_signature_date: sigDate,
            status: "completed",
          })
          .eq("id", id)
          .then(() => {});
      }

      return { success: true, notice: updatedNotice };
    },
    []
  );

  // 19. Delete Delay Notice with Archive (Soft Delete)
  const deleteDelayNotice = useCallback(
    (id: string, archiveReason?: string): { deletedNotice?: DelayNotice } => {
      const now = new Date().toISOString();
      const cleanReason = archiveReason?.trim() || undefined;
      const foundNotice = delayNotices.find((dn) => dn.id === id);
      const deletedNotice: DelayNotice | undefined = foundNotice
        ? {
            ...foundNotice,
            isArchived: true,
            archivedAt: now,
            archiveReason: cleanReason,
            archivedByCascade: false,
          }
        : undefined;

      setDelayNotices((prev) => prev.filter((dn) => dn.id !== id));

      if (deletedNotice) {
        const teacherId = deletedNotice.teacherId;
        setTeachers((prev) =>
          prev.map((t) =>
            t.id === teacherId
              ? { ...t, totalDelayNotices: Math.max(0, (t.totalDelayNotices || 0) - 1) }
              : t
          )
        );

        const archivedItem: ArchivedDelayNotice = {
          notice: deletedNotice,
          archivedAt: now,
          archiveReason: cleanReason,
          archivedByCascade: false,
        };
        setArchivedDelayNotices((prev) => [
          archivedItem,
          ...prev.filter((a) => a.notice.id !== id),
        ]);

        if (isSupabaseConfigured() && supabase) {
          supabase
            .from("delay_notices")
            .delete()
            .eq("id", id)
            .then(() => {});
        }
      }

      return { deletedNotice };
    },
    [delayNotices]
  );

  // 20. Restore Delay Notice (Undo)
  const restoreDelayNotice = useCallback((notice: DelayNotice) => {
    const cleanNotice: DelayNotice = {
      ...notice,
      isArchived: false,
      archivedAt: undefined,
      archiveReason: undefined,
      archivedByCascade: undefined,
    };
    setDelayNotices((prev) => {
      if (prev.some((dn) => dn.id === cleanNotice.id)) return prev;
      return [cleanNotice, ...prev];
    });

    setTeachers((prev) =>
      prev.map((t) =>
        t.id === cleanNotice.teacherId
          ? { ...t, totalDelayNotices: (t.totalDelayNotices || 0) + 1 }
          : t
      )
    );

    setArchivedDelayNotices((prev) => prev.filter((a) => a.notice.id !== cleanNotice.id));

    if (isSupabaseConfigured() && supabase) {
      supabase
        .from("delay_notices")
        .insert({
          id: cleanNotice.id,
          teacher_id: cleanNotice.teacherId,
          teacher_name: cleanNotice.teacherName,
          job_number: cleanNotice.jobNumber,
          specialty: cleanNotice.specialty,
          notice_date: cleanNotice.noticeDate,
          violation_delay_start: cleanNotice.violationDelayStart,
          delay_start_time: cleanNotice.delayStartTime || null,
          violation_absent_during: cleanNotice.violationAbsentDuring,
          absent_from_time: cleanNotice.absentFromTime || null,
          absent_to_time: cleanNotice.absentToTime || null,
          violation_early_departure: cleanNotice.violationEarlyDeparture,
          early_departure_time: cleanNotice.earlyDepartureTime || null,
          violation_left_school: cleanNotice.violationLeftSchool,
          left_school_details: cleanNotice.leftSchoolDetails || null,
          additional_notes: cleanNotice.additionalNotes || null,
          status: cleanNotice.status,
          teacher_reason: cleanNotice.teacherReason || null,
          teacher_signature_date: cleanNotice.teacherSignatureDate || null,
          director_opinion: cleanNotice.directorOpinion || null,
          director_signature_date: cleanNotice.directorSignatureDate || null,
          hijri_year: cleanNotice.hijriYear,
          created_at: cleanNotice.createdAt,
          share_token: cleanNotice.shareToken,
          token_expires_at: cleanNotice.tokenExpiresAt,
          teacher_response_submitted_at: cleanNotice.teacherResponseSubmittedAt || null,
          link_shared_at: cleanNotice.linkSharedAt || null,
        })
        .then(() => {});
    }
  }, []);

  // === Archive Management Methods ===
  const restoreFromArchive = useCallback(
    (
      type: "teacher" | "absence" | "delay",
      id: string
    ): { success: boolean; error?: string; message?: string } => {
      if (type === "teacher") {
        const found = archivedTeachers.find((a) => a.teacher.id === id);
        if (!found) {
          return { success: false, error: "المعلمة غير موجودة في الأرشيف." };
        }

        // Edge Case 1 & 2: Find remaining cascaded records in archivedAbsences & archivedDelayNotices
        // (Any record that was permanently deleted from archivedAbsences will not be present here)
        const remainingCascadedAbsences = archivedAbsences
          .filter(
            (a) =>
              a.record.teacherId === id &&
              (a.archivedByCascade ||
                a.record.archivedByCascade ||
                Math.abs(
                  new Date(a.archivedAt).getTime() -
                    new Date(found.archivedAt).getTime()
                ) <= 2000)
          )
          .map((a) => ({
            ...a.record,
            isArchived: false,
            archivedAt: undefined,
            archiveReason: undefined,
            archivedByCascade: undefined,
          }));

        const remainingCascadedDelays = archivedDelayNotices
          .filter(
            (d) =>
              d.notice.teacherId === id &&
              (d.archivedByCascade ||
                d.notice.archivedByCascade ||
                Math.abs(
                  new Date(d.archivedAt).getTime() -
                    new Date(found.archivedAt).getTime()
                ) <= 2000)
          )
          .map((d) => ({
            ...d.notice,
            isArchived: false,
            archivedAt: undefined,
            archiveReason: undefined,
            archivedByCascade: undefined,
          }));

        const activeTeacherAbsencesCount =
          absenceRecords.filter((r) => r.teacherId === id && !r.isArchived).length +
          remainingCascadedAbsences.length;

        const activeTeacherDelaysCount =
          delayNotices.filter((d) => d.teacherId === id && !d.isArchived).length +
          remainingCascadedDelays.length;

        const restoredTeacher: Teacher = {
          ...found.teacher,
          isArchived: false,
          archivedAt: undefined,
          archiveReason: undefined,
          totalAbsences: activeTeacherAbsencesCount,
          totalDelayNotices: activeTeacherDelaysCount,
        };

        // Restore teacher
        setTeachers((prev) =>
          prev.some((t) => t.id === id)
            ? prev.map((t) => (t.id === id ? restoredTeacher : t))
            : [restoredTeacher, ...prev]
        );

        // Restore remaining cascaded absence records
        if (remainingCascadedAbsences.length > 0) {
          setAbsenceRecords((prev) => {
            const existingIds = new Set(prev.map((r) => r.id));
            const toAdd = remainingCascadedAbsences.filter((r) => !existingIds.has(r.id));
            return [...toAdd, ...prev];
          });
        }

        // Restore associated inquiries
        if (found.associatedInquiries && found.associatedInquiries.length > 0) {
          setInquiries((prev) => {
            const existingIds = new Set(prev.map((i) => i.id));
            const toAdd = found.associatedInquiries
              .filter((i) => !existingIds.has(i.id))
              .map((i) => ({
                ...i,
                isArchived: false,
                archivedAt: undefined,
                archiveReason: undefined,
                archivedByCascade: undefined,
              }));
            return [...toAdd, ...prev];
          });
        }

        // Restore remaining cascaded delay notices
        if (remainingCascadedDelays.length > 0) {
          setDelayNotices((prev) => {
            const existingIds = new Set(prev.map((d) => d.id));
            const toAdd = remainingCascadedDelays.filter((d) => !existingIds.has(d.id));
            return [...toAdd, ...prev];
          });
        }

        // Remove teacher and her cascaded records from Archive
        const restoredAbsIds = new Set(remainingCascadedAbsences.map((r) => r.id));
        const restoredDelayIds = new Set(remainingCascadedDelays.map((d) => d.id));
        setArchivedTeachers((prev) => prev.filter((a) => a.teacher.id !== id));
        setArchivedAbsences((prev) => prev.filter((a) => !restoredAbsIds.has(a.record.id)));
        setArchivedDelayNotices((prev) => prev.filter((d) => !restoredDelayIds.has(d.notice.id)));

        return {
          success: true,
          message: "تم استعادة المعلمة وجميع سجلاتها المرتبطة بنجاح",
        };
      } else if (type === "absence") {
        const found = archivedAbsences.find((a) => a.record.id === id);
        if (!found) {
          return { success: false, error: "سجل الغياب غير موجود في الأرشيف." };
        }

        const teacherId = found.record.teacherId;
        const activeTeacher = teachers.find((t) => t.id === teacherId);
        const archivedTeacher = archivedTeachers.find((a) => a.teacher.id === teacherId);

        // Edge Case 3: Teacher was permanently deleted
        if (!activeTeacher && !archivedTeacher) {
          return {
            success: false,
            error: "لا يمكن استعادة سجل الغياب لأن المعلمة المرتبطة به محذوفة نهائياً",
          };
        }

        const cleanRecord: AbsenceRecord = {
          ...found.record,
          isArchived: false,
          archivedAt: undefined,
          archiveReason: undefined,
          archivedByCascade: undefined,
        };

        // Restore linked inquiry if present
        if (found.linkedInquiry) {
          const cleanInquiry: AbsenceInquiry = {
            ...found.linkedInquiry,
            isArchived: false,
            archivedAt: undefined,
            archiveReason: undefined,
            archivedByCascade: undefined,
          };
          setInquiries((prev) =>
            prev.some((i) => i.id === cleanInquiry.id)
              ? prev.map((i) => (i.id === cleanInquiry.id ? cleanInquiry : i))
              : [cleanInquiry, ...prev]
          );
        }

        const shouldRestoreAbsenceRecord = !found.isInquiryOnly;

        // If teacher is currently in archivedTeachers, restore the teacher alongside the record so it's never orphaned
        if (!activeTeacher && archivedTeacher) {
          const restoredTeacher: Teacher = {
            ...archivedTeacher.teacher,
            isArchived: false,
            archivedAt: undefined,
            archiveReason: undefined,
            totalAbsences: shouldRestoreAbsenceRecord ? 1 : 0,
            totalDelayNotices: 0,
          };
          setTeachers((prev) =>
            prev.some((t) => t.id === teacherId) ? prev : [restoredTeacher, ...prev]
          );
          setArchivedTeachers((prev) => prev.filter((a) => a.teacher.id !== teacherId));
        } else if (shouldRestoreAbsenceRecord) {
          setTeachers((prev) =>
            prev.map((t) =>
              t.id === teacherId
                ? { ...t, totalAbsences: (t.totalAbsences || 0) + 1 }
                : t
            )
          );
        }

        if (shouldRestoreAbsenceRecord) {
          setAbsenceRecords((prev) =>
            prev.some((r) => r.id === id) ? prev : [cleanRecord, ...prev]
          );
        }

        setArchivedAbsences((prev) => prev.filter((a) => a.record.id !== id));
        return {
          success: true,
          message:
            !activeTeacher && archivedTeacher
              ? "تم استعادة سجل الغياب مع استعادة المعلمة المرتبطة به"
              : "تم استعادة سجل الغياب بنجاح",
        };
      } else if (type === "delay") {
        const found = archivedDelayNotices.find((a) => a.notice.id === id);
        if (!found) {
          return { success: false, error: "التنبيه غير موجود في الأرشيف." };
        }

        const teacherId = found.notice.teacherId;
        const activeTeacher = teachers.find((t) => t.id === teacherId);
        const archivedTeacher = archivedTeachers.find((a) => a.teacher.id === teacherId);

        // Edge Case 3: Teacher was permanently deleted
        if (!activeTeacher && !archivedTeacher) {
          return {
            success: false,
            error: "لا يمكن استعادة التنبيه لأن المعلمة المرتبطة به محذوفة نهائياً",
          };
        }

        const cleanNotice: DelayNotice = {
          ...found.notice,
          isArchived: false,
          archivedAt: undefined,
          archiveReason: undefined,
          archivedByCascade: undefined,
        };

        if (!activeTeacher && archivedTeacher) {
          const restoredTeacher: Teacher = {
            ...archivedTeacher.teacher,
            isArchived: false,
            archivedAt: undefined,
            archiveReason: undefined,
            totalAbsences: 0,
            totalDelayNotices: 1,
          };
          setTeachers((prev) =>
            prev.some((t) => t.id === teacherId) ? prev : [restoredTeacher, ...prev]
          );
          setArchivedTeachers((prev) => prev.filter((a) => a.teacher.id !== teacherId));
        } else {
          setTeachers((prev) =>
            prev.map((t) =>
              t.id === teacherId
                ? { ...t, totalDelayNotices: (t.totalDelayNotices || 0) + 1 }
                : t
            )
          );
        }

        setDelayNotices((prev) =>
          prev.some((d) => d.id === id) ? prev : [cleanNotice, ...prev]
        );

        setArchivedDelayNotices((prev) => prev.filter((a) => a.notice.id !== id));
        return {
          success: true,
          message:
            !activeTeacher && archivedTeacher
              ? "تم استعادة تنبيه التأخر مع استعادة المعلمة المرتبطة به"
              : "تم استعادة تنبيه التأخر بنجاح",
        };
      }

      return { success: false, error: "نوع العنصر غير معروف." };
    },
    [teachers, absenceRecords, delayNotices, archivedTeachers, archivedAbsences, archivedDelayNotices]
  );

  const permanentDeleteFromArchive = useCallback(
    (type: "teacher" | "absence" | "delay", id: string): boolean => {
      if (type === "teacher") {
        // Edge Case 4: Permanently deleting a teacher removes all her associated records (active or archived)
        setArchivedTeachers((prev) => prev.filter((a) => a.teacher.id !== id));
        setArchivedAbsences((prev) => prev.filter((a) => a.record.teacherId !== id));
        setArchivedDelayNotices((prev) => prev.filter((d) => d.notice.teacherId !== id));
        setAbsenceRecords((prev) => prev.filter((r) => r.teacherId !== id));
        setDelayNotices((prev) => prev.filter((d) => d.teacherId !== id));
        setInquiries((prev) => prev.filter((i) => i.teacherId !== id));
        return true;
      } else if (type === "absence") {
        // Remove from archivedAbsences AND from associatedRecords inside archivedTeachers (Edge Case 2)
        setArchivedAbsences((prev) => prev.filter((a) => a.record.id !== id));
        setArchivedTeachers((prev) =>
          prev.map((at) => ({
            ...at,
            associatedRecords: (at.associatedRecords || []).filter((r) => r.id !== id),
          }))
        );
        return true;
      } else if (type === "delay") {
        // Remove from archivedDelayNotices AND from associatedDelayNotices inside archivedTeachers (Edge Case 2)
        setArchivedDelayNotices((prev) => prev.filter((a) => a.notice.id !== id));
        setArchivedTeachers((prev) =>
          prev.map((at) => ({
            ...at,
            associatedDelayNotices: (at.associatedDelayNotices || []).filter(
              (d) => d.id !== id
            ),
          }))
        );
        return true;
      }
      return false;
    },
    []
  );

  const clearArchive = useCallback(
    (type?: "teacher" | "absence" | "delay") => {
      if (!type || type === "teacher") setArchivedTeachers([]);
      if (!type || type === "absence") setArchivedAbsences([]);
      if (!type || type === "delay") setArchivedDelayNotices([]);
    },
    []
  );

  // 21. Mark Delay Notice Link Shared
  const markDelayNoticeLinkShared = useCallback((id: string) => {
    const timestamp = new Date().toISOString();
    setDelayNotices((prev) =>
      prev.map((dn) => (dn.id === id ? { ...dn, linkSharedAt: timestamp } : dn))
    );

    if (isSupabaseConfigured() && supabase) {
      supabase
        .from("delay_notices")
        .update({ link_shared_at: timestamp })
        .eq("id", id)
        .then(() => {});
    }
  }, []);

  // 22. Submit Teacher Response by Public Token
  const submitTeacherResponseByToken = useCallback(
    async (
      token: string,
      teacherReason: string,
      teacherSignatureDate?: string,
      teacherIpAddress?: string
    ): Promise<{ success: boolean; notice?: DelayNotice; error?: string }> => {
      const sigDate = teacherSignatureDate || getSaudiToday();
      const submittedAt = new Date().toISOString();

      let targetNotice: DelayNotice | undefined;

      setDelayNotices((prev) =>
        prev.map((dn) => {
          if (dn.shareToken === token) {
            targetNotice = {
              ...dn,
              teacherReason,
              teacherSignatureDate: sigDate,
              teacherSignedAt: sigDate,
              teacherResponseSubmittedAt: submittedAt,
              teacherIpAddress: teacherIpAddress || dn.teacherIpAddress,
              status: "pending_director",
            };
            return targetNotice;
          }
          return dn;
        })
      );

      if (isSupabaseConfigured() && supabase) {
        try {
          const { error } = await supabase
            .from("delay_notices")
            .update({
              teacher_reason: teacherReason,
              teacher_signature_date: sigDate,
              teacher_response_submitted_at: submittedAt,
              teacher_ip_address: teacherIpAddress || null,
              status: "pending_director",
            })
            .eq("share_token", token);

          if (error) {
            console.warn("تنبيه تحديث الرد في سوبابيز:", error.message);
          }
        } catch (err) {
          console.warn("فشل الاتصال بسوبابيز لتسجيل الرد:", err);
        }
      }

      return { success: true, notice: targetNotice };
    },
    []
  );

  const contextValue = useMemo<TeacherContextType>(
    () => ({
      teachers,
      absenceRecords,
      inquiries,
      delayNotices,
      archivedTeachers,
      archivedAbsences,
      archivedDelayNotices,
      restoreFromArchive,
      permanentDeleteFromArchive,
      clearArchive,
      isLoading,
      isCloudConnected,
      addTeachers,
      addTeacher,
      updateTeacher,
      deleteTeacher,
      restoreTeacher,
      clearTeachers,
      updateAbsences,
      recalculateAbsences,
      recalculateTeacherAbsences,
      recordAbsence,
      updateAbsenceRecord,
      deleteAbsenceRecord,
      restoreAbsenceRecord,
      createInquiry,
      updateInquiryDecision,
      deleteInquiry,
      refreshInquiries,
      createDelayNotice,
      updateDelayNotice,
      submitTeacherResponse,
      submitDirectorDecision,
      deleteDelayNotice,
      restoreDelayNotice,
      markDelayNoticeLinkShared,
      submitTeacherResponseByToken,
      pendingSyncCount,
      flushSyncQueue,
    }),
    [
      teachers,
      absenceRecords,
      inquiries,
      delayNotices,
      archivedTeachers,
      archivedAbsences,
      archivedDelayNotices,
      restoreFromArchive,
      permanentDeleteFromArchive,
      clearArchive,
      isLoading,
      isCloudConnected,
      pendingSyncCount,
      flushSyncQueue,
      addTeachers,
      addTeacher,
      updateTeacher,
      deleteTeacher,
      restoreTeacher,
      clearTeachers,
      updateAbsences,
      recalculateAbsences,
      recalculateTeacherAbsences,
      recordAbsence,
      updateAbsenceRecord,
      deleteAbsenceRecord,
      restoreAbsenceRecord,
      createInquiry,
      updateInquiryDecision,
      deleteInquiry,
      refreshInquiries,
      createDelayNotice,
      updateDelayNotice,
      submitTeacherResponse,
      submitDirectorDecision,
      deleteDelayNotice,
      restoreDelayNotice,
      markDelayNoticeLinkShared,
      submitTeacherResponseByToken,
    ]
  );

  return (
    <TeacherContext.Provider value={contextValue}>
      {children}
    </TeacherContext.Provider>
  );
};

export const useTeachers = (): TeacherContextType => {
  const context = useContext(TeacherContext);
  if (!context) {
    throw new Error("useTeachers must be used within a TeacherProvider");
  }
  return context;
};
