"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { Teacher, AbsenceRecord } from "@/types/teacher";
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
  isLoading: boolean;
  isCloudConnected: boolean;
  addTeachers: (newTeachers: Teacher[]) => AddTeachersResult;
  addTeacher: (
    teacherData: Omit<Teacher, "id" | "totalAbsences"> &
      Partial<Pick<Teacher, "id" | "totalAbsences">>
  ) => { success: boolean; error?: string; teacher?: Teacher };
  updateTeacher: (id: string, updatedData: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;
  clearTeachers: () => void;
  updateAbsences: (id: string, count: number) => void;
  recordAbsence: (
    data: Omit<AbsenceRecord, "id" | "timestamp">
  ) => AbsenceRecord;
  deleteAbsenceRecord: (id: string) => void;
}

const TEACHERS_STORAGE_KEY = "school_admin_teachers_v1";
const ABSENCES_STORAGE_KEY = "school_admin_absences_v1";

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
  const [isLoading, setIsLoading] = useState(true);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const isMountedRef = useRef(false);

  // 1. Initial Load: Load fast from localStorage with auto-migration, then hydrate from Supabase if configured
  useEffect(() => {
    const loadInitialData = async () => {
      let localTeachers: Teacher[] = [];
      let localAbsences: AbsenceRecord[] = [];

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
              timestamp: String(a.timestamp || new Date().toISOString()),
            }));
          }
        }
      } catch (err) {
        console.warn("تعذر استرجاع التخزين المحلي:", err);
      }

      setTeachers(localTeachers);
      setAbsenceRecords(localAbsences);

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
                  timestamp: a.timestamp,
                }));
                await supabase.from("absence_records").upsert(toInsertAbsences);
              }
            }
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
    (id: string, updatedData: Partial<Teacher>) => {
      setTeachers((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            const updated = normalizeTeacher({
              ...t,
              ...updatedData,
              id: t.id,
              totalAbsences: t.totalAbsences,
            });
            return updated;
          }
          return t;
        })
      );

      if (isSupabaseConfigured() && supabase) {
        supabase
          .from("teachers")
          .update({
            name: updatedData.fullName || updatedData.name,
            full_name: updatedData.fullName || updatedData.name,
            job_number: updatedData.username || updatedData.jobNumber,
            username: updatedData.username || updatedData.jobNumber,
            mobile: updatedData.mobile || null,
            employment_status: updatedData.employmentStatus,
            job_title: updatedData.jobTitle,
            teaching_field: updatedData.teachingField,
            specialty: updatedData.specialty,
          })
          .eq("id", id)
          .then(({ error }) => {
            if (error) console.error("فشل تحديث المعلمة في سوبابيز:", error);
          });
      }
    },
    []
  );

  // 6. Delete Teacher
  const deleteTeacher = useCallback((id: string) => {
    setTeachers((prev) => prev.filter((t) => t.id !== id));
    setAbsenceRecords((prev) => prev.filter((a) => a.teacherId !== id));

    if (isSupabaseConfigured() && supabase) {
      supabase
        .from("teachers")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("فشل حذف المعلمة من سوبابيز:", error);
        });
    }
  }, []);

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

      setAbsenceRecords((prev) => [newRecord, ...prev]);

      let newCount = 1;
      setTeachers((prev) =>
        prev.map((teacher) => {
          if (teacher.id === data.teacherId) {
            newCount = (teacher.totalAbsences || 0) + 1;
            return {
              ...teacher,
              totalAbsences: newCount,
            };
          }
          return teacher;
        })
      );

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

  // 10. Delete Absence Record
  const deleteAbsenceRecord = useCallback((id: string) => {
    let affectedTeacherId: string | null = null;
    let newCount = 0;

    setAbsenceRecords((prev) => {
      const recordToDelete = prev.find((r) => r.id === id);
      if (recordToDelete) {
        affectedTeacherId = recordToDelete.teacherId;
        setTeachers((currentTeachers) =>
          currentTeachers.map((t) => {
            if (t.id === recordToDelete.teacherId) {
              newCount = Math.max(0, (t.totalAbsences || 0) - 1);
              return { ...t, totalAbsences: newCount };
            }
            return t;
          })
        );
      }
      return prev.filter((r) => r.id !== id);
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
  }, []);

  return (
    <TeacherContext.Provider
      value={{
        teachers,
        absenceRecords,
        isLoading,
        isCloudConnected,
        addTeachers,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        clearTeachers,
        updateAbsences,
        recordAbsence,
        deleteAbsenceRecord,
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
