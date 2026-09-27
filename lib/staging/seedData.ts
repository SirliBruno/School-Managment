/**
 * مولد بيانات بيئة المحاكاة والاختبار للإنتاج (Staging Dataset Generator)
 * ينشئ قاعدة بيانات واقعية تتضمن أكثر من 300 معلمة مع سجلات تشغيلية متنوعة
 */

import {
  Teacher,
  AbsenceRecord,
  AbsenceInquiry,
  DelayNotice,
  DeductionDecision,
  EmployeePermission,
  AbsenceType,
  InquiryStatus,
  DelayNoticeStatus,
  DirectorOpinion,
} from "@/types/teacher";

export interface StagingDataset {
  teachers: Teacher[];
  absences: AbsenceRecord[];
  inquiries: AbsenceInquiry[];
  delayNotices: DelayNotice[];
  deductions: DeductionDecision[];
  permissions: EmployeePermission[];
}

const FIRST_NAMES = [
  "نورة", "سارة", "فاطمة", "مها", "منى", "ريم", "هند", "أمل", "لطيفة", "عبير",
  "هدى", "شهد", "خلود", "عائشة", "مريم", "أسماء", "حنان", "نجلاء", "العنود", "بدور",
  "منيرة", "الجوهرة", "هيا", "وفاء", "ابتسام", "رنا", "روان", "دلال", "سميرة", "إيمان"
];

const FAMILY_NAMES = [
  "العتيبي", "القحطاني", "الدوسري", "الشهري", "الحربي", "المطيري", "الغامدي", "الزهراني",
  "السبيعي", "الشمري", "الرويلي", "القرني", "الخالدي", "المالكي", "العنزي", "الرشيدي",
  "السهلي", "البقمي", "العسيري", "الصالح", "التميمي", "العمري", "الأحمد", "السعيد"
];

const SPECIALTIES = [
  "التربية الإسلامية", "اللغة العربية", "الرياضيات", "العلوم", "اللغة الإنجليزية",
  "الفيزياء", "الكيمياء", "الأحياء", "التربية الفنية", "التربية الأسرية",
  "الاجتماعيات", "الحاسب الآلي", "التاريخ", "الجغرافيا"
];

export function generateRealisticStagingDataset(teacherCount: number = 320): StagingDataset {
  const teachers: Teacher[] = [];
  const absences: AbsenceRecord[] = [];
  const inquiries: AbsenceInquiry[] = [];
  const delayNotices: DelayNotice[] = [];
  const deductions: DeductionDecision[] = [];
  const permissions: EmployeePermission[] = [];

  for (let i = 1; i <= teacherCount; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const middleName = FIRST_NAMES[(i * 3) % FIRST_NAMES.length];
    const familyName = FAMILY_NAMES[i % FAMILY_NAMES.length];
    const fullName = `${firstName} ${middleName} ${familyName}`;
    const nationalId = `10${String(10000000 + i).padStart(8, "0")}`;
    const jobNumber = `T${String(1000 + i)}`;
    const specialty = SPECIALTIES[i % SPECIALTIES.length];
    const id = `staging-teacher-${i}`;

    const teacher: Teacher = {
      id,
      nationalId,
      fullName,
      name: fullName,
      jobNumber,
      username: jobNumber,
      specialty,
      jobTitle: "معلم",
      employmentStatus: i % 10 === 0 ? "عقد" : "دائم",
      teachingField: specialty,
      mobile: `050${String(1000000 + i).slice(-7)}`,
      email: `teacher${i}@school.edu.sa`,
      totalAbsences: 0,
      totalDelayNotices: 0,
      createdAt: new Date(2026, 0, 1 + (i % 30)).toISOString(),
      updatedAt: new Date(2026, 8, 1).toISOString(),
      isArchived: i > 310, // آخر 10 معلمات مؤرشفات لاختبار الأرشيف
      archivedAt: i > 310 ? new Date(2026, 7, 15).toISOString() : undefined,
      archiveReason: i > 310 ? "نقل داخلي إلى مدرسة أخرى" : undefined,
    };

    // تقسيم المعلمات حسب الأنماط التشغيلية:
    // المجموعة 1 (i % 5 === 0): معلمات لديهن غياب ومساءلات
    if (i % 5 === 0 && !teacher.isArchived) {
      const absenceCount = (i % 4) + 1;
      teacher.totalAbsences = absenceCount;

      for (let a = 1; a <= absenceCount; a++) {
        const absDate = `2026-0${Math.min(9, 1 + (a % 8))}-${String(10 + (a * 3)).padStart(2, "0")}`;
        const absType: AbsenceType = a % 3 === 0 ? "مرضي" : a % 3 === 1 ? "اضطراري" : "مرافق";
        const absId = `staging-abs-${i}-${a}`;

        absences.push({
          id: absId,
          teacherId: id,
          teacherName: fullName,
          nationalId,
          jobNumber,
          specialty,
          date: absDate,
          type: absType,
          reason: `ظرف ${absType} طارئ معتمد`,
          notes: `سجل الغياب رقم ${a} للفصل الدراسي الأول`,
          attachmentUrl: a % 2 === 0 ? `https://storage.school.edu.sa/attachments/med-${i}-${a}.pdf` : undefined,
          timestamp: new Date(absDate).toISOString(),
          isArchived: false,
        });

        // مساءلة غياب مطابقة
        const inqStatus: InquiryStatus = a === 1 ? "approved" : a === 2 ? "submitted" : "pending";
        inquiries.push({
          id: `staging-inq-${i}-${a}`,
          teacherId: id,
          teacherName: fullName,
          nationalId,
          jobNumber,
          specialty,
          mobile: teacher.mobile,
          absenceDate: absDate,
          token: `token-abs-${i}-${a}-${Math.random().toString(36).slice(2, 8)}`,
          status: inqStatus,
          expiresAt: new Date(Date.now() + 86400000 * 3).toISOString(),
          absenceType: absType,
          teacherReason: inqStatus !== "pending" ? "تم إرفاق التقرير الطبي عبر منصة صحتي" : undefined,
          attachmentUrl: inqStatus !== "pending" ? `https://storage.school.edu.sa/reports/cert-${i}.pdf` : undefined,
          adminNotes: inqStatus === "approved" ? "تم قبول العذر وتوثيق الإجازة المرضية" : undefined,
          submittedAt: inqStatus !== "pending" ? new Date().toISOString() : undefined,
          createdAt: new Date().toISOString(),
          isArchived: false,
        });
      }
    }

    // المجموعة 2 (i % 4 === 0): معلمات لديهن إشعارات تأخر
    if (i % 4 === 0 && !teacher.isArchived) {
      const delayMinutes = 30 + ((i * 7) % 60);
      const delayDate = `2026-0${Math.min(9, 1 + (i % 8))}-12`;
      const noticeStatus: DelayNoticeStatus = i % 8 === 0 ? "completed" : "pending_teacher";
      const opinion: DirectorOpinion = i % 8 === 0 ? (i % 16 === 0 ? "rejected_with_deduction" : "accepted") : null;
      const noticeId = `staging-delay-${i}`;

      teacher.totalDelayNotices = 1;
      delayNotices.push({
        id: noticeId,
        noticeNumber: `D-${2026}-${i}`,
        teacherId: id,
        teacherName: fullName,
        nationalId,
        jobNumber,
        specialty,
        createdAt: new Date().toISOString(),
        hijriYear: "١٤٤٨",
        noticeDate: delayDate,
        date: delayDate,
        violationDelayStart: true,
        delayStartFromTime: "07:00",
        delayStartTime: `07:${String(delayMinutes).padStart(2, "0")}`,
        violationAbsentDuring: false,
        violationEarlyDeparture: false,
        violationLeftSchool: false,
        calculatedDuration: `${delayMinutes} دقيقة`,
        calculatedMinutes: delayMinutes,
        status: noticeStatus,
        directorOpinion: opinion,
        teacherReason: noticeStatus === "completed" ? "ازدحام مروري غير متوقع عند مدخل الحي" : undefined,
        shareToken: `token-delay-${i}-${Math.random().toString(36).slice(2, 8)}`,
        tokenExpiresAt: new Date(Date.now() + 86400000 * 2).toISOString(),
        isArchived: false,
      });

      // إذا كانت هناك ساعات متراكمة تتجاوز 7 ساعات (420 دقيقة) للمعلمات في مضاعفات الـ 20، ننشئ قرار حسم
      if (i % 20 === 0) {
        deductions.push({
          id: `staging-deduct-${i}`,
          decisionNumber: `DEC-1448-${i}`,
          decisionDate: "2026-09-20",
          teacherId: id,
          teacherName: fullName,
          civilId: nationalId,
          specialization: specialty,
          schoolName: "المدرسة النموذجية",
          principalName: "أ. منيرة السعيد",
          delayHours: 7,
          delayMinutes: 0,
          deductionDays: 1,
          settledNoticeIds: [noticeId],
          remainderMinutes: 15,
          notes: "حسم يوم واحد لتجاوز النصاب النظامي لـ 7 ساعات تأخر",
          createdAt: new Date().toISOString(),
          isArchived: false,
        });
      }
    }

    // المجموعة 3 (i % 3 === 0): معلمات لديهن استئذان
    if (i % 3 === 0 && !teacher.isArchived) {
      const permDate = `2026-0${Math.min(9, 1 + (i % 8))}-18`;
      const permId = `staging-perm-${i}`;
      permissions.push({
        id: permId,
        teacherId: id,
        teacherName: fullName,
        nationalId,
        jobNumber,
        specialty,
        permissionDate: permDate,
        exitTime: "10:00",
        returnTime: "11:30",
        durationMinutes: 90,
        reason: "مراجعة جهة رسمية طارئة",
        notes: "تمت الموافقة من وكيلة الشؤون التعليمية",
        createdBy: "vice_principal_1",
        createdByName: "وكيلة المدرسة",
        createdAt: new Date().toISOString(),
        isArchived: false,
      });
    }

    // المجموعة 4 (البقية): معلمات بدون أي سجلات سلبية (Clean Record)
    teachers.push(teacher);
  }

  return {
    teachers,
    absences,
    inquiries,
    delayNotices,
    deductions,
    permissions,
  };
}
