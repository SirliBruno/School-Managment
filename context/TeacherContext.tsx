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

interface TeacherContextType {
  teachers: Teacher[];
  absenceRecords: AbsenceRecord[];
  isLoading: boolean;
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
  const isMountedRef = useRef(false);

  // Load teachers and absence records from localStorage on initial mount
  useEffect(() => {
    try {
      // 1. Load Teachers
      const storedTeachers = localStorage.getItem(TEACHERS_STORAGE_KEY);
      if (storedTeachers) {
        const parsedTeachers: Teacher[] = JSON.parse(storedTeachers);
        if (Array.isArray(parsedTeachers)) {
          setTeachers(parsedTeachers);
        }
      }

      // 2. Load Absences
      const storedAbsences = localStorage.getItem(ABSENCES_STORAGE_KEY);
      if (storedAbsences) {
        const parsedAbsences: AbsenceRecord[] = JSON.parse(storedAbsences);
        if (Array.isArray(parsedAbsences)) {
          setAbsenceRecords(parsedAbsences);
        }
      }
    } catch (error) {
      console.error("فشل قراءة البيانات من التخزين المحلي:", error);
    } finally {
      setIsLoading(false);
      isMountedRef.current = true;
    }
  }, []);

  // Persist teachers whenever teachers list changes
  useEffect(() => {
    if (!isMountedRef.current || isLoading) return;
    try {
      localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(teachers));
    } catch (error) {
      console.error("فشل حفظ بيانات المعلمات في التخزين المحلي:", error);
    }
  }, [teachers, isLoading]);

  // Persist absence records whenever absenceRecords list changes
  useEffect(() => {
    if (!isMountedRef.current || isLoading) return;
    try {
      localStorage.setItem(
        ABSENCES_STORAGE_KEY,
        JSON.stringify(absenceRecords)
      );
    } catch (error) {
      console.error("فشل حفظ سجلات الغياب في التخزين المحلي:", error);
    }
  }, [absenceRecords, isLoading]);

  // Add multiple teachers with duplicate detection
  const addTeachers = useCallback(
    (newTeachers: Teacher[]) => {
      let added = 0;
      let duplicates = 0;

      setTeachers((prev) => {
        const existingJobNumbers = new Set(
          prev.map((t) => t.jobNumber.trim().toLowerCase())
        );
        const toAppend: Teacher[] = [];

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

      return { addedCount: added, duplicateCount: duplicates };
    },
    []
  );

  // Delete a teacher
  const deleteTeacher = useCallback((id: string) => {
    setTeachers((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Clear all teachers
  const clearTeachers = useCallback(() => {
    setTeachers([]);
    setAbsenceRecords([]);
  }, []);

  // Update absences manually
  const updateAbsences = useCallback((id: string, count: number) => {
    setTeachers((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, totalAbsences: Math.max(0, count) } : t
      )
    );
  }, []);

  // Record a new absence and AUTOMATICALLY increment teacher's totalAbsences counter
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

      // 1. Prepend to absenceRecords (newest first)
      setAbsenceRecords((prev) => [newRecord, ...prev]);

      // 2. CRITICAL: Increment the teacher's totalAbsences in the Teacher database
      setTeachers((prev) =>
        prev.map((teacher) => {
          if (teacher.id === data.teacherId) {
            return {
              ...teacher,
              totalAbsences: (teacher.totalAbsences || 0) + 1,
            };
          }
          return teacher;
        })
      );

      return newRecord;
    },
    []
  );

  // Delete an absence record and decrement teacher counter
  const deleteAbsenceRecord = useCallback((id: string) => {
    setAbsenceRecords((prev) => {
      const recordToDelete = prev.find((r) => r.id === id);
      if (recordToDelete) {
        // Decrement teacher's totalAbsences
        setTeachers((currentTeachers) =>
          currentTeachers.map((t) =>
            t.id === recordToDelete.teacherId
              ? { ...t, totalAbsences: Math.max(0, (t.totalAbsences || 0) - 1) }
              : t
          )
        );
      }
      return prev.filter((r) => r.id !== id);
    });
  }, []);

  return (
    <TeacherContext.Provider
      value={{
        teachers,
        absenceRecords,
        isLoading,
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
