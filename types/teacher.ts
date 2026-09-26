export interface Teacher {
  id: string; // Internal UUID
  nationalId: string; // رقم الهوية (Saudi National ID, unique identifier)
  fullName: string; // الإسم
  mobile?: string; // الجوال
  email?: string; // البريد الإلكتروني
  employmentStatus?: string; // حالة التوظيف (دائم / عقد)
  jobTitle?: string; // المسمى الوظيفي (افتراضي: معلم)
  teachingField?: string; // مجال التدريس
  specialty?: string; // التخصص
  totalAbsences: number; // Initialized to 0
  totalDelayNotices?: number; // Total delay/departure notices, default 0
  createdAt?: string; // Timestamp
  updatedAt?: string; // Timestamp

  // Archive (Soft Delete) metadata
  isArchived?: boolean;
  archivedAt?: string;
  archiveReason?: string;

  // Backward compatibility alias properties
  name?: string;
  username?: string;
  jobNumber?: string;
}

export interface ExcelTeacherRow {
  الجوال?: string | number;
  "البريد الإلكتروني"?: string;
  الإسم?: string;
  "رقم الهوية"?: string | number;
  "حالة التوظيف"?: string;
  "المسمى الوظيفي"?: string;
  "مجال التدريس"?: string;
  التخصص?: string;

  // Legacy & Alternate headers support
  الاسم?: string;
  "الاسم الرباعي"?: string;
  "اسم المعلمة"?: string;
  Name?: string;
  "اسم المستخدم"?: string | number;
  "رقم الجوال"?: string | number;
  "الهوية"?: string | number;
  "السجل المدني"?: string | number;
  "رقم السجل المدني"?: string | number;
  "رقم الوظيفة"?: string | number;
  "الرقم الوظيفي"?: string | number;
  "Job Number"?: string | number;
  "تخصص المعلمة"?: string;
  Specialty?: string;
  Email?: string;
  [key: string]: unknown;
}

export type AbsenceType = "اضطراري" | "مرضي" | "مرافق" | "أخرى" | (string & {});

export interface AbsenceRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  nationalId?: string;
  jobNumber?: string;
  specialty: string;
  date: string;
  type: AbsenceType;
  reason: string;
  notes?: string;
  attachmentUrl?: string;
  timestamp: string;

  // Archive (Soft Delete) metadata
  isArchived?: boolean;
  archivedAt?: string;
  archiveReason?: string;
  archivedByCascade?: boolean;
}

export type InquiryStatus = "pending" | "submitted" | "approved" | "rejected" | "expired";

export interface AbsenceInquiry {
  id: string;
  teacherId: string;
  teacherName: string;
  nationalId?: string;
  jobNumber?: string;
  specialty?: string;
  mobile?: string;
  absenceDate: string;
  absenceEndDate?: string;
  daysCount?: number;
  isMultiDay?: boolean;
  token: string;
  status: InquiryStatus;
  expiresAt: string;
  absenceType?: AbsenceType;
  teacherReason?: string;
  attachmentUrl?: string;
  adminNotes?: string;
  submittedAt?: string;
  createdAt: string;

  // Archive (Soft Delete) metadata
  isArchived?: boolean;
  archivedAt?: string;
  archiveReason?: string;
  archivedByCascade?: boolean;
}

// === Stage Statuses & Opinions for Delay Notice (تنبيه عن تأخر / انصراف) ===
export type DelayNoticeStatus = "pending_teacher" | "pending_director" | "completed";
export type DirectorOpinion = "accepted" | "rejected_with_deduction" | null;

export interface DelayNotice {
  id: string;
  noticeNumber?: string;
  teacherId: string;
  teacherName?: string;
  nationalId?: string;
  jobNumber?: string;
  specialty?: string;
  createdAt: string;
  hijriYear: string;

  // === Stage 1: Vice-Principal Input (الوكيلة) ===
  noticeDate: string;
  date?: string;                      // توافق وتسهيل مع شاشات العرض
  violationDelayStart: boolean;       // تأخرك من بداية الدوام وحضورك الساعة
  delayStartFromTime?: string;        // وقت بداية الدوام الرسمي
  delayStartTime?: string;            // الساعة عند التأخر / الحضور الفعلي

  violationAbsentDuring: boolean;     // عدم تواجدك أثناء الدوام من الساعة إلى الساعة
  absentFromTime?: string;            // من الساعة
  absentToTime?: string;              // إلى الساعة

  violationEarlyDeparture: boolean;   // انصرافك مبكراً قبل نهاية الدوام
  earlyDepartureFromTime?: string;    // وقت الانصراف الفعلي
  earlyDepartureTime?: string;        // الساعة عند الانصراف المبكر / نهاية الدوام

  violationLeftSchool: boolean;       // انصرافك من غير المدرسة
  leftSchoolFromTime?: string;        // وقت الخروج
  leftSchoolToTime?: string;          // وقت العودة
  leftSchoolDetails?: string;         // تفاصيل الانصراف

  calculatedDuration?: string;        // المدة المحتسبة نصياً (مثال: ساعتان)
  calculatedMinutes?: number;         // إجمالي المدة بالدقائق

  additionalNotes?: string;           // ملاحظات إضافية من الوكيلة
  notes?: string;                     // الاسم البديل للملاحظات
  status: DelayNoticeStatus;

  // === Stage 2: Teacher Response (المعلمة) ===
  teacherReason?: string;             // أسباب المعلمة / تبريرها
  teacherSignatureDate?: string;      // تاريخ توقيع/رد المعلمة
  teacherSignedAt?: string;           // الاسم البديل لتاريخ توقيع المعلمة

  // === Stage 3: Director Decision (المديرة) ===
  directorOpinion?: DirectorOpinion;  // رأي قائدة المدرسة (عذره مقبول / عذره غير مقبول ويحسم عليه)
  directorNotes?: string;             // ملاحظات وتوجيهات المديرة
  directorSignatureDate?: string;     // تاريخ قرار المديرة
  directorSignedAt?: string;          // الاسم البديل لتاريخ توقيع المديرة

  // === Public Sharing Link & Security (مشاركة الرابط العام) ===
  shareToken: string;                 // رمز آمن فريد للرابط العام
  tokenExpiresAt: string;             // تاريخ ووقت انتهاء صلاحية الرابط (ISO)
  teacherResponseSubmittedAt?: string;// وقت إرسال المعلمة للرد إلكترونياً
  teacherIpAddress?: string;          // عنوان IP للمعلمة عند الإرسال للتدقيق
  linkSharedAt?: string;              // وقت مشاركة الرابط أو إرساله للمعلمة

  // Archive (Soft Delete) metadata
  isArchived?: boolean;
  archivedAt?: string;
  archiveReason?: string;
  archivedByCascade?: boolean;
}

// === Deduction Decision Types (نموذج رقم 19 - قرار حسم مجموع ساعات تأخر وخروج مبكر) ===
export interface DeductionDecision {
  id: string;
  decisionNumber: string;
  decisionDate: string;
  teacherId: string;
  teacherName: string;
  civilId: string;
  specialization: string;
  rank?: string;
  jobNumber?: string;
  currentAction?: string;
  schoolName: string;
  principalName: string;
  delayHours: number;
  delayMinutes: number;
  deductionDays: number;
  settledNoticeIds?: string[]; // معرفات تنبيهات التأخر المشمولة بالقرار منعاً للازدواجية
  remainderMinutes?: number;  // الدقائق المتبقية المرحلة
  notes?: string;
  createdAt: string;
  updatedAt?: string;

  // Archive (Soft Delete) metadata
  isArchived?: boolean;
  archivedAt?: string;
  archiveReason?: string;
  archivedByCascade?: boolean;
}

// === Archive Types (نظام الأرشيف) ===
export interface ArchivedTeacher {
  teacher: Teacher;
  associatedRecords: AbsenceRecord[];
  associatedInquiries: AbsenceInquiry[];
  associatedDelayNotices: DelayNotice[];
  associatedDeductionDecisions?: DeductionDecision[];
  archivedAt: string;
  archiveReason?: string;
}

export interface ArchivedAbsenceRecord {
  record: AbsenceRecord;
  archivedAt: string;
  archiveReason?: string;
  archivedByCascade?: boolean;
  linkedInquiry?: AbsenceInquiry;
  isInquiryOnly?: boolean;
}

export interface ArchivedDelayNotice {
  notice: DelayNotice;
  archivedAt: string;
  archiveReason?: string;
  archivedByCascade?: boolean;
}

export interface ArchivedDeductionDecision {
  decision: DeductionDecision;
  archivedAt: string;
  archiveReason?: string;
  archivedByCascade?: boolean;
}

// === Import & Deduplication Types ===
export interface SkippedRowDetail {
  rowNumber: number;
  nationalId?: string;
  fullName?: string;
  reason: string;
  rawRow?: Record<string, unknown>;
}

export interface TeacherImportPlan {
  newTeachers: Teacher[];
  updatedTeachers: {
    teacher: Teacher;
    filledFields: string[];
    originalTeacher: Teacher;
  }[];
  restoredTeachers: {
    teacher: Teacher;
    archivedItem: ArchivedTeacher;
    filledFields: string[];
  }[];
  skippedRows: SkippedRowDetail[];
  totalRows: number;
}

export interface TeacherImportResult {
  addedCount: number;
  updatedCount: number;
  restoredCount: number;
  skippedCount: number;
  totalProcessed: number;
  skippedRows: SkippedRowDetail[];
  newTeachersList: Teacher[];
  updatedTeachersList: Teacher[];
  restoredTeachersList: Teacher[];
  backupAvailable: boolean;
}



