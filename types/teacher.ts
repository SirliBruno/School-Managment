export interface Teacher {
  id: string; // Internal UUID
  username: string; // اسم المستخدم (used as Job Number, must be UNIQUE)
  fullName: string; // الاسم الرباعي
  mobile?: string; // الجوال
  employmentStatus?: string; // حالة التوظيف (دائم / عقد)
  jobTitle?: string; // المسمى الوظيفي (افتراضي: معلم)
  teachingField?: string; // مجال التدريس
  specialty?: string; // التخصص
  totalAbsences: number; // Initialized to 0
  createdAt?: string; // Timestamp

  // Backward compatibility alias properties
  name?: string;
  jobNumber?: string;
}

export interface ExcelTeacherRow {
  "اسم المستخدم"?: string | number;
  "الاسم الرباعي"?: string;
  الجوال?: string | number;
  "رقم الجوال"?: string | number;
  "حالة التوظيف"?: string;
  "المسمى الوظيفي"?: string;
  "مجال التدريس"?: string;
  التخصص?: string;

  // Legacy headers support
  الاسم?: string;
  "اسم المعلمة"?: string;
  Name?: string;
  "رقم الوظيفة"?: string | number;
  "الرقم الوظيفي"?: string | number;
  "Job Number"?: string | number;
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

export type InquiryStatus = "pending" | "submitted" | "approved" | "rejected" | "expired";

export interface AbsenceInquiry {
  id: string;
  teacherId: string;
  teacherName: string;
  jobNumber: string;
  specialty?: string;
  mobile?: string;
  absenceDate: string;
  token: string;
  status: InquiryStatus;
  expiresAt: string;
  absenceType?: AbsenceType;
  teacherReason?: string;
  attachmentUrl?: string;
  adminNotes?: string;
  submittedAt?: string;
  createdAt: string;
}

