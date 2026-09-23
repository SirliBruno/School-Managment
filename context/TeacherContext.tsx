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
} from "@/types/teacher";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

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
  isLoading: boolean;
  isCloudConnected: boolean;
  addTeachers: (newTeachers: Teacher[]) => AddTeachersResult;
  addTeacher: (
    teacherData: Omit<Teacher, "id" | "totalAbsences"> &
      Partial<Pick<Teacher, "id" | "totalAbsences">>
  ) => { success: boolean; error?: string; teacher?: Teacher };
  updateTeacher: (
    id: string,
    updatedData: Partial<Teacher>
  ) => { success: boolean; error?: string; teacher?: Teacher };
  deleteTeacher: (id: string) => { deletedTeacher?: Teacher; deletedRecords: AbsenceRecord[] };
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
  deleteAbsenceRecord: (id: string) => { deletedRecord?: AbsenceRecord };
  restoreAbsenceRecord: (record: AbsenceRecord) => void;
  createInquiry: (
    teacherId: string,
    absenceDate: string
  ) => Promise<{ success: boolean; inquiry?: AbsenceInquiry; error?: string }>;
  updateInquiryDecision: (
    inquiryId: string,
    status: "approved" | "rejected",
    adminNotes?: string
  ) => Promise<{ success: boolean; error?: string }>;
  deleteInquiry: (inquiryId: string) => Promise<void>;
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
  deleteDelayNotice: (id: string) => { deletedNotice?: DelayNotice };
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


export const normalizeTeacher = (t: Record<string, unknown>): Teacher => {
  const rawFullName =
    (t.fullName as string) ||
    (t.name as string) ||
    (t.full_name as string) ||
    "معلمة";
  const rawUsername = String(
    t.username ?? t.jobNumber ?? t.job_number ?? ""
  ).trim();

  const fullName = String(rawFullName).trim();
  const username = rawUsername;
  const mobile = String(t.mobile ?? t.phone ?? t.phoneNumber ?? "").trim();
  const employmentStatus = String(
    t.employmentStatus ?? t.employment_status ?? "دائم"
  ).trim();
  const jobTitle = String(
    t.jobTitle ?? t.job_title ?? "معلم"
  ).trim();
  const specialty = String(t.specialty ?? "").trim();
  const teachingField = String(
    t.teachingField ?? t.teaching_field ?? specialty ?? ""
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

  return {
    id,
    username,
    fullName,
    mobile: mobile || undefined,
    employmentStatus: employmentStatus || "دائم",
    jobTitle: jobTitle || "معلم",
    teachingField: teachingField || specialty || undefined,
    specialty: specialty || undefined,
    totalAbsences: Math.max(0, totalAbsences),
    totalDelayNotices: Math.max(0, totalDelayNotices),
    createdAt: (t.createdAt as string) || (t.created_at as string) || new Date().toISOString(),
    // Backward compatibility aliases
    name: fullName,
    jobNumber: username,
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
  const teacherUsernameMap = new Map<string, Teacher>();
  const teacherNameMap = new Map<string, Teacher>();

  for (const t of rawTeachers) {
    if (t.id) teacherIdMap.set(t.id, t);
    const u = (t.username || t.jobNumber || "").trim().toLowerCase();
    if (u) teacherUsernameMap.set(u, t);
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

    // 2. Match by username / jobNumber
    if (!matchedTeacher) {
      const u1 = (record.jobNumber || "").trim().toLowerCase();
      const u2 = (record.teacherId || "").trim().toLowerCase();
      if (u1 && teacherUsernameMap.has(u1)) {
        matchedTeacher = teacherUsernameMap.get(u1);
      } else if (u2 && teacherUsernameMap.has(u2)) {
        matchedTeacher = teacherUsernameMap.get(u2);
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
        jobNumber: matchedTeacher.username || matchedTeacher.jobNumber || record.jobNumber,
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
      const u1 = (notice.jobNumber || "").trim().toLowerCase();
      const u2 = (notice.teacherId || "").trim().toLowerCase();
      if (u1 && teacherUsernameMap.has(u1)) {
        matchedTeacher = teacherUsernameMap.get(u1);
      } else if (u2 && teacherUsernameMap.has(u2)) {
        matchedTeacher = teacherUsernameMap.get(u2);
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
        jobNumber: matchedTeacher.username || matchedTeacher.jobNumber || notice.jobNumber,
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
      const u1 = (inq.jobNumber || "").trim().toLowerCase();
      const u2 = (inq.teacherId || "").trim().toLowerCase();
      if (u1 && teacherUsernameMap.has(u1)) {
        matchedTeacher = teacherUsernameMap.get(u1);
      } else if (u2 && teacherUsernameMap.has(u2)) {
        matchedTeacher = teacherUsernameMap.get(u2);
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
        jobNumber: matchedTeacher.username || inq.jobNumber,
      });
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
  const [isLoading, setIsLoading] = useState(true);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const isMountedRef = useRef(false);

  // 1. Initial Load: Load fast from localStorage with auto-migration, then hydrate from Supabase if configured
  useEffect(() => {
    const loadInitialData = async () => {
      let localTeachers: Teacher[] = [];
      let localAbsences: AbsenceRecord[] = [];
      let localInquiries: AbsenceInquiry[] = [];
      let localDelayNotices: DelayNotice[] = [];

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
                  : `dltok-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
              tokenExpiresAt:
                (dn.tokenExpiresAt as string) ||
                new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            })) as DelayNotice[];
          }
        }
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
                job_number: t.username,
                username: t.username,
                mobile: t.mobile || null,
                employment_status: t.employmentStatus || "دائم",
                job_title: t.jobTitle || "معلم",
                teaching_field: t.teachingField || t.specialty || null,
                specialty: t.specialty || null,
                total_absences: t.totalAbsences || 0,
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
            const mappedInquiries: AbsenceInquiry[] = dbInquiries.map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (inq: any) => ({
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
              })
            );
            setInquiries(mappedInquiries);
          }
        } catch (cloudErr) {
          console.warn(
            "المزامنة السحابية غير متاحة حالياً، تم استخدام التخزين المحلي:",
            cloudErr
          );
        }
      }

      setIsLoading(false);
      isMountedRef.current = true;
    };

    loadInitialData();
  }, []);

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


  // 3. Add multiple teachers (Excel or Batch Import) with Upsert on username
  const addTeachers = useCallback(
    (newTeachers: Teacher[]): AddTeachersResult => {
      let added = 0;
      let updated = 0;
      const duplicates = 0;

      let nextTeachers: Teacher[] = [];

      setTeachers((prev) => {
        const teacherMap = new Map<string, Teacher>();
        // Index existing teachers by username (case-insensitive)
        for (const t of prev) {
          const key = t.username.trim().toLowerCase();
          if (key) teacherMap.set(key, t);
        }

        const updatedList: Teacher[] = [...prev];

        for (const item of newTeachers) {
          const normalized = normalizeTeacher(item as unknown as Record<string, unknown>);
          const cleanKey = normalized.username.trim().toLowerCase();

          if (!cleanKey || !normalized.fullName) {
            continue;
          }

          if (teacherMap.has(cleanKey)) {
            // Update existing teacher in-place preserving ID & absence history
            const existing = teacherMap.get(cleanKey)!;
            const updatedTeacher: Teacher = {
              ...existing,
              fullName: normalized.fullName,
              name: normalized.fullName,
              mobile: normalized.mobile || existing.mobile,
              employmentStatus: normalized.employmentStatus || existing.employmentStatus,
              jobTitle: normalized.jobTitle || existing.jobTitle,
              teachingField: normalized.teachingField || existing.teachingField,
              specialty: normalized.specialty || existing.specialty,
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
          job_number: t.username,
          username: t.username,
          mobile: t.mobile || null,
          employment_status: t.employmentStatus || "دائم",
          job_title: t.jobTitle || "معلم",
          teaching_field: t.teachingField || t.specialty || null,
          specialty: t.specialty || null,
          total_absences: t.totalAbsences || 0,
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
      const cleanUsername = String(
        teacherData.username || teacherData.jobNumber || ""
      ).trim();
      const cleanFullName = String(
        teacherData.fullName || teacherData.name || ""
      ).trim();

      if (!cleanFullName) {
        return { success: false, error: "الاسم الرباعي للمعلمة مطلوب." };
      }

      if (!cleanUsername) {
        return {
          success: false,
          error: "اسم المستخدم / الرقم الوظيفي مطلوب وفريد.",
        };
      }

      // Check for uniqueness
      const isExisting = teachers.some(
        (t) => t.username.trim().toLowerCase() === cleanUsername.toLowerCase()
      );

      if (isExisting) {
        return {
          success: false,
          error: `اسم المستخدم / الرقم الوظيفي (${cleanUsername}) مسجل بالفعل لمعلمة أخرى.`,
        };
      }

      const newTeacher = normalizeTeacher({
        ...teacherData,
        fullName: cleanFullName,
        username: cleanUsername,
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
            job_number: newTeacher.username,
            username: newTeacher.username,
            mobile: newTeacher.mobile || null,
            employment_status: newTeacher.employmentStatus || "دائم",
            job_title: newTeacher.jobTitle || "معلم",
            teaching_field: newTeacher.teachingField || newTeacher.specialty || null,
            specialty: newTeacher.specialty || null,
            total_absences: newTeacher.totalAbsences || 0,
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

      const cleanUsername = updatedData.username
        ? String(updatedData.username).trim()
        : updatedData.jobNumber
        ? String(updatedData.jobNumber).trim()
        : undefined;

      // Validate unique username if changed
      if (cleanUsername) {
        const isDuplicate = teachers.some(
          (t) =>
            t.id !== id &&
            t.username.trim().toLowerCase() === cleanUsername.toLowerCase()
        );
        if (isDuplicate) {
          return {
            success: false,
            error: `اسم المستخدم / الرقم الوظيفي (${cleanUsername}) مسجل بالفعل لمعلمة أخرى.`,
          };
        }
      }

      setTeachers((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            updatedTeacher = normalizeTeacher({
              ...t,
              ...updatedData,
              id: t.id,
              totalAbsences: t.totalAbsences,
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
              jobNumber: finalTeacher.username,
              specialty:
                finalTeacher.specialty ||
                finalTeacher.teachingField ||
                rec.specialty,
            };
          }
          return rec;
        })
      );

      if (isSupabaseConfigured() && supabase) {
        supabase
          .from("teachers")
          .update({
            name: finalTeacher.fullName,
            full_name: finalTeacher.fullName,
            job_number: finalTeacher.username,
            username: finalTeacher.username,
            mobile: finalTeacher.mobile || null,
            employment_status: finalTeacher.employmentStatus,
            job_title: finalTeacher.jobTitle,
            teaching_field: finalTeacher.teachingField,
            specialty: finalTeacher.specialty,
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

  // 6. Delete Teacher with Cascade Deletion
  const deleteTeacher = useCallback((id: string) => {
    let deletedTeacher: Teacher | undefined;
    let deletedRecords: AbsenceRecord[] = [];

    setTeachers((prev) => {
      deletedTeacher = prev.find((t) => t.id === id);
      return prev.filter((t) => t.id !== id);
    });

    setAbsenceRecords((prev) => {
      deletedRecords = prev.filter((a) => a.teacherId === id);
      return prev.filter((a) => a.teacherId !== id);
    });

    // Remove associated inquiries and delay notices
    setInquiries((prev) => prev.filter((inq) => inq.teacherId !== id));
    setDelayNotices((prev) => prev.filter((dn) => dn.teacherId !== id));

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
  }, []);

  // 6.b Restore Teacher (Undo Support)
  const restoreTeacher = useCallback(
    (teacher: Teacher, associatedRecords: AbsenceRecord[] = []) => {
      setTeachers((prev) => {
        if (prev.some((t) => t.id === teacher.id)) return prev;
        return [teacher, ...prev];
      });

      if (associatedRecords.length > 0) {
        setAbsenceRecords((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const toAdd = associatedRecords.filter((r) => !existingIds.has(r.id));
          return [...toAdd, ...prev];
        });
      }

      if (isSupabaseConfigured() && supabase) {
        supabase
          .from("teachers")
          .insert({
            id: teacher.id,
            name: teacher.fullName,
            full_name: teacher.fullName,
            job_number: teacher.username,
            username: teacher.username,
            mobile: teacher.mobile || null,
            employment_status: teacher.employmentStatus || "دائم",
            job_title: teacher.jobTitle || "معلم",
            teaching_field: teacher.teachingField || teacher.specialty || null,
            specialty: teacher.specialty || null,
            total_absences: teacher.totalAbsences || 0,
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
        if (record.teacherId) {
          countMap[record.teacherId] = (countMap[record.teacherId] || 0) + 1;
        }
      }
      const delayCountMap: Record<string, number> = {};
      for (const dn of delayNotices) {
        if (dn.teacherId) {
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
      };

      let newCount = 1;

      setAbsenceRecords((prev) => {
        const nextRecords = [newRecord, ...prev];
        // Recalculate teacher total absences
        const countMap: Record<string, number> = {};
        for (const r of nextRecords) {
          countMap[r.teacherId] = (countMap[r.teacherId] || 0) + 1;
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

      // Background sync to Supabase
      if (isSupabaseConfigured() && supabase) {
        supabase
          .from("absence_records")
          .insert({
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
          })
          .then(({ error }) => {
            if (error) console.error("فشل إدراج المساءلة في سوبابيز:", error);
          });

        supabase
          .from("teachers")
          .update({ total_absences: newCount })
          .eq("id", data.teacherId)
          .then(() => {});
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

  // 10.b Delete Absence Record
  const deleteAbsenceRecord = useCallback((id: string) => {
    let deletedRecord: AbsenceRecord | undefined;
    let affectedTeacherId: string | null = null;
    let newCount = 0;

    setAbsenceRecords((prev) => {
      deletedRecord = prev.find((r) => r.id === id);
      const nextRecords = prev.filter((r) => r.id !== id);

      if (deletedRecord) {
        affectedTeacherId = deletedRecord.teacherId;
        const countMap: Record<string, number> = {};
        for (const r of nextRecords) {
          countMap[r.teacherId] = (countMap[r.teacherId] || 0) + 1;
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

    if (isSupabaseConfigured() && supabase) {
      supabase
        .from("absence_records")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("فشل حذف المساءلة من سوبابيز:", error);
        });

      if (affectedTeacherId) {
        supabase
          .from("teachers")
          .update({ total_absences: newCount })
          .eq("id", affectedTeacherId)
          .then(() => {});
      }
    }

    return { deletedRecord };
  }, []);

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
      absenceDate: string
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
          : `${Date.now()}${Math.random().toString(36).substring(2, 10)}`;

      // 7 days validity
      const expiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString();
      const createdAt = new Date().toISOString();

      const newInquiry: AbsenceInquiry = {
        id,
        teacherId: teacher.id,
        teacherName: teacher.fullName || teacher.name || "معلمة",
        jobNumber: teacher.username || teacher.jobNumber || "—",
        specialty: teacher.specialty || teacher.teachingField,
        mobile: teacher.mobile,
        absenceDate,
        token,
        status: "pending",
        expiresAt,
        createdAt,
      };

      setInquiries((prev) => [newInquiry, ...prev]);

      if (isSupabaseConfigured() && supabase) {
        try {
          const { error } = await supabase.from("absence_inquiries").insert({
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
            created_at: newInquiry.createdAt,
          });

          if (error) {
            console.warn("تنبيه حفظ المساءلة في سوبابيز:", error.message);
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
      let targetInquiry: AbsenceInquiry | null = null;

      setInquiries((prev) =>
        prev.map((inq) => {
          if (inq.id === inquiryId) {
            targetInquiry = {
              ...inq,
              status,
              adminNotes: adminNotes ?? inq.adminNotes,
            };
            return targetInquiry;
          }
          return inq;
        })
      );

      if (!targetInquiry) {
        return { success: false, error: "لم يتم العثور على المساءلة." };
      }

      const resolvedInq = targetInquiry as AbsenceInquiry;

      // If approved, document it in absenceRecords if not recorded already
      if (status === "approved" && resolvedInq.absenceType) {
        const alreadyRecorded = absenceRecords.some(
          (a) =>
            a.teacherId === resolvedInq.teacherId &&
            a.date === resolvedInq.absenceDate
        );

        if (!alreadyRecorded) {
          recordAbsence({
            teacherId: resolvedInq.teacherId,
            teacherName: resolvedInq.teacherName,
            jobNumber: resolvedInq.jobNumber,
            specialty: resolvedInq.specialty || "عام",
            date: resolvedInq.absenceDate,
            type: resolvedInq.absenceType,
            reason: resolvedInq.teacherReason || "عذر مقبول ومعتمد من الإدارة",
            notes: adminNotes || resolvedInq.adminNotes || "تم الاعتماد عبر المساءلة الإلكترونية",
            attachmentUrl: resolvedInq.attachmentUrl || undefined,
          });
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
    [absenceRecords, recordAbsence]
  );

  // 13. Delete Inquiry
  const deleteInquiry = useCallback(async (inquiryId: string) => {
    setInquiries((prev) => prev.filter((inq) => inq.id !== inquiryId));

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from("absence_inquiries")
          .delete()
          .eq("id", inquiryId);
      } catch (err) {
        console.warn("فشل حذف المساءلة من سوبابيز:", err);
      }
    }
  }, []);

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
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID().replace(/-/g, "")
          : `${Date.now()}${Math.random().toString(36).substring(2, 12)}`;

      const tokenExpiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString();

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
          jobNumber: teacher.username || teacher.jobNumber,
          specialty: teacher.specialty || teacher.teachingField,
          hijriYear,
          status: "pending_teacher",
          createdAt: new Date().toISOString(),
          date: data.noticeDate || data.date,
          noticeDate:
            data.noticeDate ||
            data.date ||
            new Date().toISOString().split("T")[0],
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

      if (isSupabaseConfigured() && supabase && createdNotice) {
        const n: DelayNotice = createdNotice;
        supabase
          .from("delay_notices")
          .insert({
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
          })
          .then(() => {});
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
      const sigDate =
        teacherSignatureDate || new Date().toISOString().split("T")[0];

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
      const sigDate =
        directorSignatureDate || new Date().toISOString().split("T")[0];

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

  // 19. Delete Delay Notice
  const deleteDelayNotice = useCallback((id: string): { deletedNotice?: DelayNotice } => {
    let deletedNotice: DelayNotice | undefined;

    setDelayNotices((prev) => {
      deletedNotice = prev.find((dn) => dn.id === id);
      return prev.filter((dn) => dn.id !== id);
    });

    if (deletedNotice) {
      const teacherId = (deletedNotice as DelayNotice).teacherId;
      setTeachers((prev) =>
        prev.map((t) =>
          t.id === teacherId
            ? { ...t, totalDelayNotices: Math.max(0, (t.totalDelayNotices || 0) - 1) }
            : t
        )
      );

      if (isSupabaseConfigured() && supabase) {
        supabase
          .from("delay_notices")
          .delete()
          .eq("id", id)
          .then(() => {});
      }
    }

    return { deletedNotice };
  }, []);

  // 20. Restore Delay Notice (Undo)
  const restoreDelayNotice = useCallback((notice: DelayNotice) => {
    setDelayNotices((prev) => {
      if (prev.some((dn) => dn.id === notice.id)) return prev;
      return [notice, ...prev];
    });

    setTeachers((prev) =>
      prev.map((t) =>
        t.id === notice.teacherId
          ? { ...t, totalDelayNotices: (t.totalDelayNotices || 0) + 1 }
          : t
      )
    );

    if (isSupabaseConfigured() && supabase) {
      supabase
        .from("delay_notices")
        .insert({
          id: notice.id,
          teacher_id: notice.teacherId,
          teacher_name: notice.teacherName,
          job_number: notice.jobNumber,
          specialty: notice.specialty,
          notice_date: notice.noticeDate,
          violation_delay_start: notice.violationDelayStart,
          delay_start_time: notice.delayStartTime || null,
          violation_absent_during: notice.violationAbsentDuring,
          absent_from_time: notice.absentFromTime || null,
          absent_to_time: notice.absentToTime || null,
          violation_early_departure: notice.violationEarlyDeparture,
          early_departure_time: notice.earlyDepartureTime || null,
          violation_left_school: notice.violationLeftSchool,
          left_school_details: notice.leftSchoolDetails || null,
          additional_notes: notice.additionalNotes || null,
          status: notice.status,
          teacher_reason: notice.teacherReason || null,
          teacher_signature_date: notice.teacherSignatureDate || null,
          director_opinion: notice.directorOpinion || null,
          director_signature_date: notice.directorSignatureDate || null,
          hijri_year: notice.hijriYear,
          created_at: notice.createdAt,
          share_token: notice.shareToken,
          token_expires_at: notice.tokenExpiresAt,
          teacher_response_submitted_at: notice.teacherResponseSubmittedAt || null,
          link_shared_at: notice.linkSharedAt || null,
        })
        .then(() => {});
    }
  }, []);

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
      const sigDate =
        teacherSignatureDate || new Date().toISOString().split("T")[0];
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
    }),
    [
      teachers,
      absenceRecords,
      inquiries,
      delayNotices,
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
