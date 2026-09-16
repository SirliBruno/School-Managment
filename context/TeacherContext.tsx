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

interface TeacherContextType {
  teachers: Teacher[];
  absenceRecords: AbsenceRecord[];
  isLoading: boolean;
  isCloudConnected: boolean;
  addTeachers: (newTeachers: Teacher[]) => {
    addedCount: number;
    duplicateCount: number;
  };
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

const TeacherContext = createContext<TeacherContextType | undefined>(undefined);

export const TeacherProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [absenceRecords, setAbsenceRecords] = useState<AbsenceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const isMountedRef = useRef(false);

  // 1. Initial Load: Load fast from localStorage, then hydrate from Supabase if configured
  useEffect(() => {
    const loadInitialData = async () => {
      // Step A: Instant Local Storage Retrieval
      let localTeachers: Teacher[] = [];
      let localAbsences: AbsenceRecord[] = [];

      try {
        const storedTeachers = localStorage.getItem(TEACHERS_STORAGE_KEY);
        if (storedTeachers) {
          const parsed = JSON.parse(storedTeachers);
          if (Array.isArray(parsed)) localTeachers = parsed;
        }

        const storedAbsences = localStorage.getItem(ABSENCES_STORAGE_KEY);
        if (storedAbsences) {
          const parsed = JSON.parse(storedAbsences);
          if (Array.isArray(parsed)) localAbsences = parsed;
        }
      } catch (err) {
        console.warn("تعذر استرجاع التخزين المحلي:", err);
      }

      setTeachers(localTeachers);
      setAbsenceRecords(localAbsences);

      // Step B: Cloud Sync if Supabase is Configured
      if (isSupabaseConfigured() && supabase) {
        try {
          // Fetch teachers from Supabase
          const { data: dbTeachers, error: tErr } = await supabase
            .from("teachers")
            .select("*")
            .order("created_at", { ascending: true });

          // Fetch absences from Supabase
          const { data: dbAbsences, error: aErr } = await supabase
            .from("absence_records")
            .select("*")
            .order("timestamp", { ascending: false });

          if (!tErr && !aErr && dbTeachers) {
            setIsCloudConnected(true);

            if (dbTeachers.length > 0) {
              const mappedTeachers: Teacher[] = dbTeachers.map((t) => ({
                id: t.id,
                name: t.name,
                jobNumber: t.job_number,
                specialty: t.specialty,
                totalAbsences: t.total_absences ?? 0,
              }));

              const mappedAbsences: AbsenceRecord[] = (dbAbsences || []).map(
                (a) => ({
                  id: a.id,
                  teacherId: a.teacher_id,
                  teacherName: a.teacher_name,
                  jobNumber: a.job_number,
                  specialty: a.specialty,
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
              // Auto-seed Supabase from local data if database is fresh/empty
              const toInsertTeachers = localTeachers.map((t) => ({
                id: t.id,
                name: t.name,
                job_number: t.jobNumber,
                specialty: t.specialty,
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
          console.warn("المزامنة السحابية غير متاحة حالياً، تم استخدام التخزين المحلي:", cloudErr);
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

  // 3. Add multiple teachers (Excel or Manual)
  const addTeachers = useCallback(
    (newTeachers: Teacher[]) => {
      let added = 0;
      let duplicates = 0;
      const toAppend: Teacher[] = [];

      setTeachers((prev) => {
        const existingJobNumbers = new Set(
          prev.map((t) => t.jobNumber.trim().toLowerCase())
        );

        for (const item of newTeachers) {
          const cleanJob = item.jobNumber.trim().toLowerCase();
          if (cleanJob && existingJobNumbers.has(cleanJob)) {
            duplicates++;
          } else {
            if (cleanJob) existingJobNumbers.add(cleanJob);
            toAppend.push(item);
            added++;
          }
        }

        return [...prev, ...toAppend];
      });

      // Background sync to Supabase
      if (isSupabaseConfigured() && supabase && toAppend.length > 0) {
        const dbPayload = toAppend.map((t) => ({
          id: t.id,
          name: t.name,
          job_number: t.jobNumber,
          specialty: t.specialty,
          total_absences: t.totalAbsences || 0,
        }));
        supabase
          .from("teachers")
          .upsert(dbPayload)
          .then(({ error }) => {
            if (error) console.error("فشل مزامنة المعلمات مع سوبابيز:", error);
          });
      }

      return { addedCount: added, duplicateCount: duplicates };
    },
    []
  );

  // 4. Delete Teacher
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

  // 5. Clear all teachers
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

  // 6. Update absences manually
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

  // 7. Record Absence
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

  // 8. Delete Absence Record
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
