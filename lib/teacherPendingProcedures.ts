import {
  AbsenceInquiry,
  AdministrativeInquiry,
  DelayNotice,
} from "@/types/teacher";

export type PendingProcedureType =
  | "absence_inquiry"
  | "administrative_inquiry"
  | "delay_notice";

export interface TeacherPendingProcedureItem {
  id: string;
  type: PendingProcedureType;
  typeNameArabic: string;
  title: string;
  incidentDate: string;
  sentAt: string; // ISO string of createdAt / linkSharedAt
  expiresAt?: string;
  status: string;
  statusLabel: string;
  statusBadgeVariant: "amber" | "sky" | "rose" | "emerald";
  waitingOn: "teacher" | "admin";
  details?: string;
  rawItem: AbsenceInquiry | AdministrativeInquiry | DelayNotice;
}

/**
 * استخراج وتصنيف كافة المعاملات غير المكتملة للمعلمة المحددة
 */
export function getTeacherPendingProcedures(
  teacherId: string,
  data: {
    inquiries?: AbsenceInquiry[];
    administrativeInquiries?: AdministrativeInquiry[];
    delayNotices?: DelayNotice[];
  }
): TeacherPendingProcedureItem[] {
  if (!teacherId) return [];

  const results: TeacherPendingProcedureItem[] = [];

  // 1. مساءلات الغياب
  if (data.inquiries && data.inquiries.length > 0) {
    for (const inq of data.inquiries) {
      if (inq.isArchived) continue;
      if (inq.teacherId !== teacherId) continue;

      if (inq.status === "pending") {
        results.push({
          id: inq.id,
          type: "absence_inquiry",
          typeNameArabic: "مساءلة غياب",
          title: `مساءلة غياب لتاريخ (${inq.absenceDate})`,
          incidentDate: inq.absenceDate,
          sentAt: inq.createdAt || inq.absenceDate,
          expiresAt: inq.expiresAt,
          status: inq.status,
          statusLabel: "بانتظار إفادة المعلمة",
          statusBadgeVariant: "amber",
          waitingOn: "teacher",
          details: inq.teacherReason || "بانتظار رد المعلمة عبر الرابط الإلكتروني",
          rawItem: inq,
        });
      } else if (inq.status === "submitted") {
        results.push({
          id: inq.id,
          type: "absence_inquiry",
          typeNameArabic: "مساءلة غياب",
          title: `رد وإفادة غياب (${inq.absenceDate})`,
          incidentDate: inq.absenceDate,
          sentAt: inq.createdAt || inq.absenceDate,
          expiresAt: inq.expiresAt,
          status: inq.status,
          statusLabel: "تم الرد (بانتظار اعتماد الإدارة)",
          statusBadgeVariant: "sky",
          waitingOn: "admin",
          details: inq.teacherReason || "تم تقديم الإفادة وبانتظار اعتماد العذر",
          rawItem: inq,
        });
      }
    }
  }

  // 2. المسائلات الإدارية
  if (data.administrativeInquiries && data.administrativeInquiries.length > 0) {
    for (const inq of data.administrativeInquiries) {
      if (inq.isArchived) continue;
      if (inq.teacherId !== teacherId) continue;

      const typeLabel =
        inq.inquiryType === "أخرى" && (inq.customType || inq.customViolationType)
          ? inq.customType || inq.customViolationType || "مساءلة مخصصة"
          : inq.inquiryType || inq.violationTypeArabic || "مساءلة إدارية";

      if (inq.status === "pending_teacher") {
        results.push({
          id: inq.id,
          type: "administrative_inquiry",
          typeNameArabic: "مساءلة إدارية",
          title: `مساءلة إدارية: ${typeLabel}`,
          incidentDate: inq.incidentDate,
          sentAt: inq.createdAt || inq.incidentDate,
          expiresAt: inq.tokenExpiresAt || inq.expiresAt,
          status: inq.status,
          statusLabel: "بانتظار إفادة المعلمة",
          statusBadgeVariant: "amber",
          waitingOn: "teacher",
          details: inq.description || inq.incidentDescription || "مساءلة خطية مرسلة",
          rawItem: inq,
        });
      } else if (
        inq.status === "pending_director" ||
        inq.status === "teacher_responded"
      ) {
        results.push({
          id: inq.id,
          type: "administrative_inquiry",
          typeNameArabic: "مساءلة إدارية",
          title: `إفادة مساءلة إدارية: ${typeLabel}`,
          incidentDate: inq.incidentDate,
          sentAt: inq.createdAt || inq.incidentDate,
          expiresAt: inq.tokenExpiresAt || inq.expiresAt,
          status: inq.status,
          statusLabel: "تم الرد (بانتظار قرار الإدارة)",
          statusBadgeVariant: "sky",
          waitingOn: "admin",
          details: inq.teacherResponse || "تم استلام الرد وبانتظار قرار المديرة",
          rawItem: inq,
        });
      }
    }
  }

  // 3. إشعارات التأخر
  if (data.delayNotices && data.delayNotices.length > 0) {
    for (const dn of data.delayNotices) {
      if (dn.isArchived) continue;
      if (dn.teacherId !== teacherId) continue;

      if (dn.status === "pending_teacher") {
        results.push({
          id: dn.id,
          type: "delay_notice",
          typeNameArabic: "إشعار تأخر",
          title: `إشعار تأخر لتاريخ (${dn.noticeDate || dn.date})`,
          incidentDate: dn.noticeDate || dn.date || "",
          sentAt: dn.createdAt || dn.noticeDate || "",
          expiresAt: dn.tokenExpiresAt || dn.expiresAt,
          status: dn.status,
          statusLabel: "بانتظار إفادة المعلمة",
          statusBadgeVariant: "amber",
          waitingOn: "teacher",
          details: dn.calculatedDuration
            ? `المدة المحتسبة: ${dn.calculatedDuration}`
            : "إشعار تأخر عن الدوام",
          rawItem: dn,
        });
      } else if (dn.status === "pending_director") {
        results.push({
          id: dn.id,
          type: "delay_notice",
          typeNameArabic: "إشعار تأخر",
          title: `إفادة تأخر (${dn.noticeDate || dn.date})`,
          incidentDate: dn.noticeDate || dn.date || "",
          sentAt: dn.createdAt || dn.noticeDate || "",
          expiresAt: dn.tokenExpiresAt || dn.expiresAt,
          status: dn.status,
          statusLabel: "تم الرد (بانتظار رأي الإدارة)",
          statusBadgeVariant: "sky",
          waitingOn: "admin",
          details: dn.teacherReason || "تم تسجيل إفادة التأخر وبانتظار اعتماد الرأي",
          rawItem: dn,
        });
      }
    }
  }

  // ترتيب المعاملات زمنياً من الأحدث إلى الأقدم
  return results.sort((a, b) => {
    const timeA = new Date(a.sentAt).getTime() || 0;
    const timeB = new Date(b.sentAt).getTime() || 0;
    return timeB - timeA;
  });
}
