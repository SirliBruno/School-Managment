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
  totalDelayNotices?: number; // Total delay/departure notices, default 0
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

export type AbsenceType = "اضطراري" | "مرضي" | "مرافق" | "أخرى" | (string & {});

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
  attachmentUrl?: string;
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

// === Stage Statuses & Opinions for Delay Notice (تنبيه عن تأخر / انصراف) ===
export type DelayNoticeStatus = "pending_teacher" | "pending_director" | "completed";
export type DirectorOpinion = "accepted" | "rejected_with_deduction" | null;

export interface DelayNotice {
  id: string;
  noticeNumber?: string;
  teacherId: string;
  teacherName?: string;
  jobNumber?: string;
  specialty?: string;
  createdAt: string;
  hijriYear: string;

  // === Stage 1: Vice-Principal Input (الوكيلة) ===
  noticeDate: string;
  date?: string;                      // توافق وتسهيل مع شاشات العرض
  violationDelayStart: boolean;       // تأخرك من بداية الدوام وحضورك الساعة
  delayStartTime?: string;            // الساعة عند التأخر

  violationAbsentDuring: boolean;     // عدم تواجدك أثناء الدوام من الساعة إلى الساعة
  absentFromTime?: string;            // من الساعة
  absentToTime?: string;              // إلى الساعة

  violationEarlyDeparture: boolean;   // انصرافك مبكراً قبل نهاية الدوام
  earlyDepartureTime?: string;        // الساعة عند الانصراف المبكر

  violationLeftSchool: boolean;       // انصرافك من غير المدرسة
  leftSchoolDetails?: string;         // تفاصيل الانصراف

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
}

