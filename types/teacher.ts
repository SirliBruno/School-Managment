export interface Teacher {
  id: string;
  name: string;
  jobNumber: string;
  specialty: string;
  totalAbsences: number;
}

export interface ExcelTeacherRow {
  الاسم?: string;
  "اسم المعلمة"?: string;
  Name?: string;
  "رقم الوظيفة"?: string | number;
  "الرقم الوظيفي"?: string | number;
  "Job Number"?: string | number;
  التخصص?: string;
  "تخصص المعلمة"?: string;
  Specialty?: string;
  [key: string]: unknown;
}

export type AbsenceType = "اضطراري" | "مرضي" | "مرافق" | "أخرى";

export interface AbsenceRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  jobNumber: string;
  specialty: string;
  date: string;
  type: AbsenceType;
  reason: string;
  notes?: string;
  timestamp: string;
}
