import {
  Teacher,
  AbsenceRecord,
  AbsenceInquiry,
  DelayNotice,
  ArchivedTeacher,
  ArchivedAbsenceRecord,
  ArchivedDelayNotice,
  ExcelTeacherRow,
} from "@/types/teacher";

/**
 * Normalizes Eastern Arabic-Indic digits (٠-٩) and Persian digits (۰-۹) to standard ASCII digits (0-9).
 */
export function normalizeArabicDigits(str: string | number | undefined | null): string {
  if (str === null || str === undefined) return "";
  const s = String(str);
  return s
    .replace(/[٠۰]/g, "0")
    .replace(/[١۱]/g, "1")
    .replace(/[٢۲]/g, "2")
    .replace(/[٣۳]/g, "3")
    .replace(/[٤۴]/g, "4")
    .replace(/[٥۵]/g, "5")
    .replace(/[٦۶]/g, "6")
    .replace(/[٧۷]/g, "7")
    .replace(/[٨۸]/g, "8")
    .replace(/[٩۹]/g, "9");
}

/**
 * Normalizes a National ID string:
 * - Converts Arabic numerals to standard digits
 * - Strips whitespace, hyphens, slashes, punctuation
 * - Returns clean digit string
 */
export function normalizeNationalId(raw: string | number | undefined | null): string {
  if (raw === null || raw === undefined) return "";
  const withAscii = normalizeArabicDigits(raw);
  return withAscii.replace(/[\s\-_/\\,.]/g, "").trim();
}

/**
 * Normalizes a Saudi mobile phone number to standard format 9665XXXXXXXX:
 * - Converts Arabic digits to standard ASCII
 * - Removes non-digits
 * - Handles prefixes: 00966, +966, 966, 05, 5
 */
export function normalizeSaudiMobile(raw: string | number | undefined | null): string {
  if (raw === null || raw === undefined) return "";
  const withAscii = normalizeArabicDigits(raw);
  let cleaned = withAscii.replace(/[^\d]/g, "");
  if (!cleaned) return "";

  // 00966...
  if (cleaned.startsWith("00966")) {
    cleaned = cleaned.slice(2);
  }

  // 05XXXXXXXX (10 digits) -> 9665XXXXXXXX
  if (cleaned.startsWith("05") && cleaned.length === 10) {
    return "966" + cleaned.slice(1);
  }

  // 5XXXXXXXX (9 digits) -> 9665XXXXXXXX
  if (cleaned.startsWith("5") && cleaned.length === 9) {
    return "966" + cleaned;
  }

  // 96605XXXXXXXX (13 digits) -> 9665XXXXXXXX
  if (cleaned.startsWith("96605") && cleaned.length === 13) {
    return "9665" + cleaned.slice(5);
  }

  // 9665XXXXXXXX (12 digits)
  if (cleaned.startsWith("9665") && cleaned.length === 12) {
    return cleaned;
  }

  // 966XXXXXXXXX (12 digits)
  if (cleaned.startsWith("966") && cleaned.length === 12) {
    return cleaned;
  }

  return cleaned;
}

/**
 * Validates whether a mobile number matches the official Saudi mobile format (9665XXXXXXXX).
 */
export function isValidSaudiMobile(mobile: string | undefined | null): boolean {
  if (!mobile) return false;
  const normalized = normalizeSaudiMobile(mobile);
  return /^9665\d{8}$/.test(normalized);
}

/**
 * Validates whether an email string is formatted properly.
 */
export function isValidEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const clean = String(email).trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
}

/**
 * Normalizes employment status to "دائم" or "عقد".
 */
export function normalizeEmploymentStatus(raw: string | undefined | null): {
  value: "دائم" | "عقد";
  isValid: boolean;
} {
  if (!raw || !String(raw).trim()) {
    return { value: "دائم", isValid: true }; // Default fallback
  }

  const s = String(raw).trim().toLowerCase();
  if (
    s === "دائم" ||
    s === "رسمي" ||
    s === "مثبت" ||
    s === "دائمه" ||
    s === "دائمة" ||
    s === "permanent"
  ) {
    return { value: "دائم", isValid: true };
  }

  if (
    s === "عقد" ||
    s === "تعاقد" ||
    s === "متعاقد" ||
    s === "متعاقدة" ||
    s === "contract"
  ) {
    return { value: "عقد", isValid: true };
  }

  return { value: "دائم", isValid: false };
}

/**
 * Normalizes header names for flexible header matching.
 */
export function normalizeHeaderKey(header: string): string {
  return header
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, "");
}

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

export interface ParsedRowResult {
  teacher?: Teacher;
  skippedReason?: string;
  rowNumber: number;
  rawRow: Record<string, unknown>;
}

/**
 * Validates and parses an individual Excel row into a Teacher entity.
 */
export function validateAndParseRow(
  row: ExcelTeacherRow,
  rowNumber: number
): ParsedRowResult {
  const rawRowObj = row as Record<string, unknown>;

  let rawMobile = "";
  let rawEmail = "";
  let rawFullName = "";
  let rawNationalId = "";
  let rawEmploymentStatus = "";
  let rawJobTitle = "";
  let rawTeachingField = "";
  let rawSpecialty = "";

  for (const [key, val] of Object.entries(row)) {
    const normKey = normalizeHeaderKey(key);
    const stringVal = String(val ?? "").trim();
    if (!stringVal) continue;

    // 1. رقم الهوية
    if (
      !rawNationalId &&
      (normKey.includes("الهوية") ||
        normKey.includes("السجل") ||
        normKey.includes("المستخدم") ||
        normKey.includes("الوظيفة") ||
        normKey.includes("الوظيفي") ||
        normKey.toLowerCase().includes("id") ||
        normKey.toLowerCase().includes("user") ||
        normKey.toLowerCase().includes("job"))
    ) {
      rawNationalId = stringVal;
    }
    // 2. الإسم
    else if (
      !rawFullName &&
      (normKey.includes("الإسم") ||
        normKey.includes("الاسم") ||
        normKey.includes("الرباعي") ||
        normKey.includes("اسم المعلمة") ||
        normKey.toLowerCase().includes("name"))
    ) {
      rawFullName = stringVal;
    }
    // 3. الجوال
    else if (
      !rawMobile &&
      (normKey.includes("الجوال") ||
        normKey.includes("هاتف") ||
        normKey.toLowerCase().includes("mobile") ||
        normKey.toLowerCase().includes("phone"))
    ) {
      rawMobile = stringVal;
    }
    // 4. البريد الإلكتروني
    else if (
      !rawEmail &&
      (normKey.includes("البريد") ||
        normKey.includes("الإلكتروني") ||
        normKey.includes("ايميل") ||
        normKey.toLowerCase().includes("mail"))
    ) {
      rawEmail = stringVal;
    }
    // 5. حالة التوظيف
    else if (
      !rawEmploymentStatus &&
      (normKey.includes("التوظيف") ||
        normKey.includes("التعاقد") ||
        normKey.toLowerCase().includes("status"))
    ) {
      rawEmploymentStatus = stringVal;
    }
    // 6. المسمى الوظيفي
    else if (
      !rawJobTitle &&
      (normKey.includes("المسمى") ||
        normKey.includes("وظيفة") ||
        normKey.toLowerCase().includes("title"))
    ) {
      rawJobTitle = stringVal;
    }
    // 7. مجال التدريس
    else if (
      !rawTeachingField &&
      (normKey.includes("مجال التدريس") ||
        normKey.includes("المجال") ||
        normKey.toLowerCase().includes("field"))
    ) {
      rawTeachingField = stringVal;
    }
    // 8. التخصص
    else if (
      !rawSpecialty &&
      (normKey.includes("التخصص") ||
        normKey.includes("تخصص") ||
        normKey.toLowerCase().includes("specialty"))
    ) {
      rawSpecialty = stringVal;
    }
  }

  // --- Strict Validation Checks ---

  // Check 1: Name is mandatory
  const cleanFullName = rawFullName.trim();
  if (!cleanFullName) {
    return {
      skippedReason: "حقل الإسم فارغ",
      rowNumber,
      rawRow: rawRowObj,
    };
  }

  // Check 2: National ID is mandatory
  const cleanNationalId = normalizeNationalId(rawNationalId);
  if (!cleanNationalId) {
    return {
      skippedReason: "رقم الهوية فارغ",
      rowNumber,
      rawRow: rawRowObj,
    };
  }

  // Check 3: National ID numeric digits
  if (!/^\d{3,15}$/.test(cleanNationalId)) {
    return {
      skippedReason: "رقم الهوية غير صالح (يجب أن يحتوي على أرقام فقط)",
      rowNumber,
      rawRow: rawRowObj,
    };
  }

  // Check 4: Specialty / Teaching field is mandatory
  const cleanSpecialty = rawSpecialty.trim();
  const cleanTeachingField = rawTeachingField.trim();
  if (!cleanSpecialty && !cleanTeachingField) {
    return {
      skippedReason: "حقل التخصص أو مجال التدريس فارغ",
      rowNumber,
      rawRow: rawRowObj,
    };
  }

  // Check 5: Email format validation (if provided)
  let cleanEmail: string | undefined = undefined;
  if (rawEmail.trim()) {
    const emailCandidate = rawEmail.trim().toLowerCase();
    if (!isValidEmail(emailCandidate)) {
      return {
        skippedReason: `صيغة البريد الإلكتروني غير صحيحة (${rawEmail})`,
        rowNumber,
        rawRow: rawRowObj,
      };
    }
    cleanEmail = emailCandidate;
  }

  // Check 6: Mobile phone format validation (if provided)
  let cleanMobile: string | undefined = undefined;
  if (rawMobile.trim()) {
    const normalizedMobile = normalizeSaudiMobile(rawMobile);
    if (!isValidSaudiMobile(normalizedMobile)) {
      return {
        skippedReason: `صيغة رقم الجوال غير صحيحة (${rawMobile}) — يجب أن يكون رقم سعودي بصيغة 05XXXXXXXX أو 9665XXXXXXXX`,
        rowNumber,
        rawRow: rawRowObj,
      };
    }
    cleanMobile = normalizedMobile;
  }

  // Check 7: Employment status validation
  const statusCheck = normalizeEmploymentStatus(rawEmploymentStatus);
  if (rawEmploymentStatus && !statusCheck.isValid) {
    return {
      skippedReason: `حالة التوظيف غير صالحة (${rawEmploymentStatus}) — يجب أن تكون إما "دائم" أو "عقد"`,
      rowNumber,
      rawRow: rawRowObj,
    };
  }

  const finalSpecialty = cleanSpecialty || cleanTeachingField;
  const finalTeachingField = cleanTeachingField || cleanSpecialty;
  const finalJobTitle = rawJobTitle.trim() || "معلم";
  const finalEmploymentStatus = statusCheck.value;

  const teacher: Teacher = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `tch-${Date.now()}-${rowNumber}-${Math.random().toString(36).slice(2, 7)}`,
    nationalId: cleanNationalId,
    fullName: cleanFullName,
    mobile: cleanMobile,
    email: cleanEmail,
    employmentStatus: finalEmploymentStatus,
    jobTitle: finalJobTitle,
    teachingField: finalTeachingField,
    specialty: finalSpecialty,
    totalAbsences: 0,
    totalDelayNotices: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Backward compatibility aliases
    name: cleanFullName,
    username: cleanNationalId,
    jobNumber: cleanNationalId,
  };

  return {
    teacher,
    rowNumber,
    rawRow: rawRowObj,
  };
}

/**
 * Plans an Excel import by verifying every row, detecting in-file duplicates,
 * checking against active and archived teachers, and computing exact statistics.
 */
export function planTeacherImport(
  rawRows: ExcelTeacherRow[],
  currentTeachers: Teacher[],
  archivedTeachers: ArchivedTeacher[] = []
): TeacherImportPlan {
  const plan: TeacherImportPlan = {
    newTeachers: [],
    updatedTeachers: [],
    restoredTeachers: [],
    skippedRows: [],
    totalRows: rawRows.length,
  };

  // Map active teachers by normalized national ID
  const activeMap = new Map<string, Teacher>();
  for (const t of currentTeachers) {
    const key = normalizeNationalId(t.nationalId || t.username || t.jobNumber);
    if (key) activeMap.set(key, t);
  }

  // Map archived teachers by normalized national ID
  const archivedMap = new Map<string, ArchivedTeacher>();
  for (const a of archivedTeachers) {
    const key = normalizeNationalId(
      a.teacher.nationalId || a.teacher.username || a.teacher.jobNumber
    );
    if (key) archivedMap.set(key, a);
  }

  // Track national IDs encountered within the file to reject in-file duplicates
  const seenInFile = new Set<string>();

  for (let i = 0; i < rawRows.length; i++) {
    const rowNumber = i + 1;
    const row = rawRows[i];

    const parseResult = validateAndParseRow(row, rowNumber);

    if (parseResult.skippedReason || !parseResult.teacher) {
      plan.skippedRows.push({
        rowNumber,
        nationalId: normalizeNationalId(
          (row["رقم الهوية"] || row["الهوية"] || row["السجل المدني"] || "") as string
        ) || undefined,
        fullName:
          ((row["الإسم"] || row["الاسم"] || row["اسم المعلمة"] || "") as string) ||
          undefined,
        reason: parseResult.skippedReason || "صف غير صالح",
        rawRow: parseResult.rawRow,
      });
      continue;
    }

    const importedTeacher = parseResult.teacher;
    const natIdKey = importedTeacher.nationalId;

    // Check in-file duplicate (Stage 2 rule 2: keep first, ignore subsequent)
    if (seenInFile.has(natIdKey)) {
      plan.skippedRows.push({
        rowNumber,
        nationalId: natIdKey,
        fullName: importedTeacher.fullName,
        reason: "رقم الهوية مكرر داخل نفس ملف Excel (تم الاحتفاظ بالصف الأول وتجاهل هذا الصف)",
        rawRow: parseResult.rawRow,
      });
      continue;
    }

    seenInFile.add(natIdKey);

    // Check if teacher exists in active system
    if (activeMap.has(natIdKey)) {
      const existing = activeMap.get(natIdKey)!;
      const filledFields: string[] = [];

      // Update blanks only — do NOT overwrite existing non-empty values
      const mergedTeacher: Teacher = {
        ...existing,
        updatedAt: new Date().toISOString(),
      };

      if (!existing.mobile && importedTeacher.mobile) {
        mergedTeacher.mobile = importedTeacher.mobile;
        filledFields.push("الجوال");
      }
      if (!existing.email && importedTeacher.email) {
        mergedTeacher.email = importedTeacher.email;
        filledFields.push("البريد الإلكتروني");
      }
      if (!existing.jobTitle && importedTeacher.jobTitle) {
        mergedTeacher.jobTitle = importedTeacher.jobTitle;
        filledFields.push("المسمى الوظيفي");
      }
      if (!existing.teachingField && importedTeacher.teachingField) {
        mergedTeacher.teachingField = importedTeacher.teachingField;
        filledFields.push("مجال التدريس");
      }
      if (!existing.specialty && importedTeacher.specialty) {
        mergedTeacher.specialty = importedTeacher.specialty;
        filledFields.push("التخصص");
      }
      if (
        (!existing.employmentStatus || existing.employmentStatus === "") &&
        importedTeacher.employmentStatus
      ) {
        mergedTeacher.employmentStatus = importedTeacher.employmentStatus;
        filledFields.push("حالة التوظيف");
      }

      // If any blank field was filled, record as updated teacher
      if (filledFields.length > 0) {
        plan.updatedTeachers.push({
          teacher: mergedTeacher,
          filledFields,
          originalTeacher: existing,
        });
        activeMap.set(natIdKey, mergedTeacher);
      }
      // If nothing needed filling, it is an identical existing teacher: 0 added, 0 updated!
      continue;
    }

    // Check if teacher exists in archive
    if (archivedMap.has(natIdKey)) {
      const archivedItem = archivedMap.get(natIdKey)!;
      const existingArchivedTeacher = archivedItem.teacher;
      const filledFields: string[] = [];

      const restoredTeacher: Teacher = {
        ...existingArchivedTeacher,
        isArchived: false,
        archivedAt: undefined,
        archiveReason: undefined,
        updatedAt: new Date().toISOString(),
      };

      if (!existingArchivedTeacher.mobile && importedTeacher.mobile) {
        restoredTeacher.mobile = importedTeacher.mobile;
        filledFields.push("الجوال");
      }
      if (!existingArchivedTeacher.email && importedTeacher.email) {
        restoredTeacher.email = importedTeacher.email;
        filledFields.push("البريد الإلكتروني");
      }
      if (!existingArchivedTeacher.jobTitle && importedTeacher.jobTitle) {
        restoredTeacher.jobTitle = importedTeacher.jobTitle;
        filledFields.push("المسمى الوظيفي");
      }
      if (!existingArchivedTeacher.teachingField && importedTeacher.teachingField) {
        restoredTeacher.teachingField = importedTeacher.teachingField;
        filledFields.push("مجال التدريس");
      }
      if (!existingArchivedTeacher.specialty && importedTeacher.specialty) {
        restoredTeacher.specialty = importedTeacher.specialty;
        filledFields.push("التخصص");
      }

      plan.restoredTeachers.push({
        teacher: restoredTeacher,
        archivedItem,
        filledFields,
      });

      activeMap.set(natIdKey, restoredTeacher);
      archivedMap.delete(natIdKey);
      continue;
    }

    // Brand new teacher
    plan.newTeachers.push(importedTeacher);
    activeMap.set(natIdKey, importedTeacher);
  }

  return plan;
}

/**
 * Phase 1: One-time cleanup and deduplication of existing system data.
 * Merges duplicate teachers by normalized national ID, preserves the oldest record,
 * fills missing blanks in the retained record, repoints all absences/delays/inquiries,
 * and removes duplicate teacher rows.
 */
export function cleanAndDeduplicateSystemData(
  teachers: Teacher[],
  absenceRecords: AbsenceRecord[],
  delayNotices: DelayNotice[],
  inquiries: AbsenceInquiry[],
  archivedTeachers: ArchivedTeacher[] = [],
  archivedAbsences: ArchivedAbsenceRecord[] = [],
  archivedDelayNotices: ArchivedDelayNotice[] = []
): {
  cleanTeachers: Teacher[];
  cleanAbsences: AbsenceRecord[];
  cleanDelayNotices: DelayNotice[];
  cleanInquiries: AbsenceInquiry[];
  cleanArchivedTeachers: ArchivedTeacher[];
  cleanArchivedAbsences: ArchivedAbsenceRecord[];
  cleanArchivedDelayNotices: ArchivedDelayNotice[];
  removedDuplicatesCount: number;
  migratedRecordsCount: number;
  mergedGroupsCount: number;
} {
  // 1. Group active teachers by normalized nationalId
  const groups = new Map<string, Teacher[]>();

  for (const t of teachers) {
    const cleanId = normalizeNationalId(t.nationalId || t.username || t.jobNumber);
    if (!cleanId) continue;
    const list = groups.get(cleanId) || [];
    list.push(t);
    groups.set(cleanId, list);
  }

  const idMapping = new Map<string, Teacher>(); // duplicateId -> retainedTeacher
  const retainedTeachers: Teacher[] = [];
  let removedDuplicatesCount = 0;
  let mergedGroupsCount = 0;
  for (const group of Array.from(groups.values())) {
    if (group.length === 1) {
      const single = group[0];
      const normalizedSingle: Teacher = {
        ...single,
        nationalId: normalizeNationalId(single.nationalId || single.username || single.jobNumber),
        mobile: normalizeSaudiMobile(single.mobile) || undefined,
        email: single.email ? single.email.trim().toLowerCase() : undefined,
      };
      retainedTeachers.push(normalizedSingle);
      continue;
    }

    // Multiple records with the same National ID!
    mergedGroupsCount++;

    // Sort by createdAt ascending (oldest first)
    const sorted = [...group].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });

    const primary = { ...sorted[0] };
    primary.nationalId = normalizeNationalId(
      primary.nationalId || primary.username || primary.jobNumber
    );
    primary.mobile = normalizeSaudiMobile(primary.mobile) || undefined;
    primary.email = primary.email ? primary.email.trim().toLowerCase() : undefined;

    const duplicates = sorted.slice(1);
    removedDuplicatesCount += duplicates.length;

    // Fill missing blanks in primary from duplicates (never overwrite existing)
    for (const dup of duplicates) {
      idMapping.set(dup.id, primary);

      if (!primary.fullName && dup.fullName) primary.fullName = dup.fullName;
      if (!primary.mobile && dup.mobile) {
        primary.mobile = normalizeSaudiMobile(dup.mobile) || undefined;
      }
      if (!primary.email && dup.email) {
        primary.email = dup.email.trim().toLowerCase();
      }
      if (!primary.jobTitle && dup.jobTitle) primary.jobTitle = dup.jobTitle;
      if (!primary.teachingField && dup.teachingField) {
        primary.teachingField = dup.teachingField;
      }
      if (!primary.specialty && dup.specialty) primary.specialty = dup.specialty;
      if (
        (!primary.employmentStatus || primary.employmentStatus === "") &&
        dup.employmentStatus
      ) {
        primary.employmentStatus = dup.employmentStatus;
      }
    }

    primary.updatedAt = new Date().toISOString();
    primary.name = primary.fullName;
    primary.username = primary.nationalId;
    primary.jobNumber = primary.nationalId;

    retainedTeachers.push(primary);
  }

  // Handle any teachers without nationalId (if any)
  for (const t of teachers) {
    const cleanId = normalizeNationalId(t.nationalId || t.username || t.jobNumber);
    if (!cleanId) {
      retainedTeachers.push(t);
    }
  }

  let migratedRecordsCount = 0;

  // 2. Repoint Absence Records
  const cleanAbsences: AbsenceRecord[] = absenceRecords.map((rec) => {
    if (idMapping.has(rec.teacherId)) {
      const targetTeacher = idMapping.get(rec.teacherId)!;
      migratedRecordsCount++;
      return {
        ...rec,
        teacherId: targetTeacher.id,
        teacherName: targetTeacher.fullName || rec.teacherName,
        nationalId: targetTeacher.nationalId || rec.nationalId,
        jobNumber: targetTeacher.nationalId || rec.jobNumber,
        specialty: targetTeacher.specialty || targetTeacher.teachingField || rec.specialty,
      };
    }
    return rec;
  });

  // 3. Repoint Delay Notices
  const cleanDelayNotices: DelayNotice[] = delayNotices.map((dn) => {
    if (idMapping.has(dn.teacherId)) {
      const targetTeacher = idMapping.get(dn.teacherId)!;
      migratedRecordsCount++;
      return {
        ...dn,
        teacherId: targetTeacher.id,
        teacherName: targetTeacher.fullName || dn.teacherName,
        nationalId: targetTeacher.nationalId || dn.nationalId,
        jobNumber: targetTeacher.nationalId || dn.jobNumber,
        specialty: targetTeacher.specialty || targetTeacher.teachingField || dn.specialty,
      };
    }
    return dn;
  });

  // 4. Repoint Inquiries
  const cleanInquiries: AbsenceInquiry[] = inquiries.map((inq) => {
    if (idMapping.has(inq.teacherId)) {
      const targetTeacher = idMapping.get(inq.teacherId)!;
      migratedRecordsCount++;
      return {
        ...inq,
        teacherId: targetTeacher.id,
        teacherName: targetTeacher.fullName || inq.teacherName,
        nationalId: targetTeacher.nationalId || inq.nationalId,
        jobNumber: targetTeacher.nationalId || inq.jobNumber,
        specialty: targetTeacher.specialty || targetTeacher.teachingField || inq.specialty,
        mobile: targetTeacher.mobile || inq.mobile,
      };
    }
    return inq;
  });

  // 5. Repoint Archived Records
  const cleanArchivedAbsences: ArchivedAbsenceRecord[] = archivedAbsences.map((item) => {
    if (idMapping.has(item.record.teacherId)) {
      const targetTeacher = idMapping.get(item.record.teacherId)!;
      return {
        ...item,
        record: {
          ...item.record,
          teacherId: targetTeacher.id,
          teacherName: targetTeacher.fullName || item.record.teacherName,
          nationalId: targetTeacher.nationalId || item.record.nationalId,
          jobNumber: targetTeacher.nationalId || item.record.jobNumber,
        },
      };
    }
    return item;
  });

  const cleanArchivedDelayNotices: ArchivedDelayNotice[] = archivedDelayNotices.map((item) => {
    if (idMapping.has(item.notice.teacherId)) {
      const targetTeacher = idMapping.get(item.notice.teacherId)!;
      return {
        ...item,
        notice: {
          ...item.notice,
          teacherId: targetTeacher.id,
          teacherName: targetTeacher.fullName || item.notice.teacherName,
          nationalId: targetTeacher.nationalId || item.notice.nationalId,
          jobNumber: targetTeacher.nationalId || item.notice.jobNumber,
        },
      };
    }
    return item;
  });

  const cleanArchivedTeachers: ArchivedTeacher[] = archivedTeachers.filter(
    (a) => !idMapping.has(a.teacher.id)
  );

  // 6. Recalculate absence and delay counters for all retained teachers
  const absCountMap = new Map<string, number>();
  for (const a of cleanAbsences) {
    if (!a.isArchived) {
      absCountMap.set(a.teacherId, (absCountMap.get(a.teacherId) || 0) + 1);
    }
  }

  const delayCountMap = new Map<string, number>();
  for (const d of cleanDelayNotices) {
    if (!d.isArchived) {
      delayCountMap.set(d.teacherId, (delayCountMap.get(d.teacherId) || 0) + 1);
    }
  }

  const cleanTeachers = retainedTeachers.map((t) => ({
    ...t,
    totalAbsences: absCountMap.get(t.id) || 0,
    totalDelayNotices: delayCountMap.get(t.id) || 0,
  }));

  return {
    cleanTeachers,
    cleanAbsences,
    cleanDelayNotices,
    cleanInquiries,
    cleanArchivedTeachers,
    cleanArchivedAbsences,
    cleanArchivedDelayNotices,
    removedDuplicatesCount,
    migratedRecordsCount,
    mergedGroupsCount,
  };
}
