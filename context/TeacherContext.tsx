"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { Teacher, AbsenceRecord, AbsenceInquiry } from "@/types/teacher";
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
}

const TEACHERS_STORAGE_KEY = "school_admin_teachers_v1";
const ABSENCES_STORAGE_KEY = "school_admin_absences_v1";
const INQUIRIES_STORAGE_KEY = "school_admin_inquiries_v1";


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
    createdAt: (t.createdAt as string) || (t.created_at as string) || new Date().toISOString(),
    // Backward compatibility aliases
    name: fullName,
    jobNumber: username,
  };
};

const TeacherContext = createContext<TeacherContextType | undefined>(undefined);

export const TeacherProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [absenceRecords, setAbsenceRecords] = useState<AbsenceRecord[]>([]);
  const [inquiries, setInquiries] = useState<AbsenceInquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const isMountedRef = useRef(false);

  // 1. Initial Load: Load fast from localStorage with auto-migration, then hydrate from Supabase if configured
  useEffect(() => {
    const loadInitialData = async () => {
      let localTeachers: Teacher[] = [];
      let localAbsences: AbsenceRecord[] = [];
      let localInquiries: AbsenceInquiry[] = [];

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
      } catch (err) {
        console.warn("تعذر استرجاع التخزين المحلي:", err);
      }

      setTeachers(localTeachers);
      setAbsenceRecords(localAbsences);
      setInquiries(localInquiries);


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

              setTeachers(mappedTeachers);
              setAbsenceRecords(mappedAbsences);
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

    // Remove associated inquiries
    setInquiries((prev) => prev.filter((inq) => inq.teacherId !== id));

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

  // 8.b Recalculate all absences to ensure 100% data consistency
  const recalculateAbsences = useCallback(() => {
    setTeachers((currentTeachers) => {
      const countMap: Record<string, number> = {};
      for (const record of absenceRecords) {
        if (record.teacherId) {
          countMap[record.teacherId] = (countMap[record.teacherId] || 0) + 1;
        }
      }

      return currentTeachers.map((teacher) => {
        const correctCount = countMap[teacher.id] || 0;
        return teacher.totalAbsences === correctCount
          ? teacher
          : { ...teacher, totalAbsences: correctCount };
      });
    });
  }, [absenceRecords]);

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

  return (
    <TeacherContext.Provider
      value={{
        teachers,
        absenceRecords,
        inquiries,
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
        recordAbsence,
        updateAbsenceRecord,
        deleteAbsenceRecord,
        restoreAbsenceRecord,
        createInquiry,
        updateInquiryDecision,
        deleteInquiry,
        refreshInquiries,
      }}
    >
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
