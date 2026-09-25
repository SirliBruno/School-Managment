"use client";

import { useMemo } from "react";
import { useTeachers } from "@/context/TeacherContext";

export function useWhatsAppAbsenceStats() {
  const { teachers, absenceRecords, inquiries } = useTeachers();

  const stats = useMemo(() => {
    const activeRecords = absenceRecords.filter((r) => !r.isArchived);
    const activeInquiries = inquiries.filter((i) => !i.isArchived);
    const activeTeachers = teachers.filter((t) => !t.isArchived);

    // Unapproved active inquiries that do not yet have a corresponding active AbsenceRecord
    const unapprovedActiveInquiries = activeInquiries.filter(
      (inq) =>
        !activeRecords.some(
          (r) =>
            r.id === `abs-inq-${inq.id}` ||
            (r.teacherId === inq.teacherId && r.date === inq.absenceDate)
        )
    );

    const totalAbsences = activeRecords.length + unapprovedActiveInquiries.length;

    // Count unique teachers who have at least 1 active absence record or active inquiry
    const uniqueTeachersWithAbsences = new Set<string>([
      ...activeRecords.map((r) => r.teacherId),
      ...activeInquiries.map((i) => i.teacherId),
    ]);

    // Count active WhatsApp inquiries / shared records
    const whatsappIds = new Set<string>([
      ...activeInquiries.map((i) => i.id),
      ...activeRecords
        .filter((r) => r.id.startsWith("abs-inq-"))
        .map((r) => r.id.replace(/^abs-inq-/, "")),
    ]);

    const pendingInquiriesCount = activeInquiries.filter(
      (i) => i.status === "pending"
    ).length;
    const submittedInquiriesCount = activeInquiries.filter(
      (i) => i.status === "submitted"
    ).length;

    return {
      totalAbsences,
      whatsappSent: whatsappIds.size,
      teachersWithAbsences: uniqueTeachersWithAbsences.size,
      availableTeachers: activeTeachers.length,
      pendingInquiriesCount,
      submittedInquiriesCount,
    };
  }, [absenceRecords, inquiries, teachers]);

  return stats;
}
