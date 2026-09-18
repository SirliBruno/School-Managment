export interface AttachmentSlotConfig {
  id: string;
  label: string;
  hint: string;
  required: boolean;
}

export interface InquiryAttachmentItem {
  slotId: string;
  label: string;
  url: string;
}

/**
 * Returns the exact attachment slot configuration based on absence type:
 * - مرضي: مرفق فارس + مرفق التقرير الطبي
 * - اضطراري: مرفق فارس
 * - مرافق: مرفق فارس + مرفق التقرير الطبي
 * - أخرى: مرفق فارس + مرفقات أخرى
 */
export function getAttachmentSlotsForType(absenceType: string): AttachmentSlotConfig[] {
  if (absenceType.startsWith("مرضي")) {
    return [
      {
        id: "faris",
        label: "مرفق فارس",
        hint: "إشعار طلب الإجازة المرضية من نظام فارس",
        required: true,
      },
      {
        id: "medical",
        label: "مرفق التقرير الطبي",
        hint: "التقرير الطبي المعتمد الصادر من منصة صحتي (PDF أو صورة)",
        required: true,
      },
    ];
  }

  if (absenceType.startsWith("اضطراري")) {
    return [
      {
        id: "faris",
        label: "مرفق فارس",
        hint: "إشعار طلب الإجازة الاضطرارية من نظام فارس",
        required: true,
      },
    ];
  }

  if (absenceType.startsWith("مرافق")) {
    return [
      {
        id: "faris",
        label: "مرفق فارس",
        hint: "إشعار طلب إجازة مرافقة مريض من نظام فارس",
        required: true,
      },
      {
        id: "medical",
        label: "مرفق التقرير الطبي",
        hint: "التقرير الطبي المعتمد للمريض المرافق له (PDF أو صورة)",
        required: true,
      },
    ];
  }

  // أخرى (أو أي نوع مخصص)
  return [
    {
      id: "faris",
      label: "مرفق فارس",
      hint: "إشعار الطلب المرفوع في نظام فارس",
      required: true,
    },
    {
      id: "other",
      label: "مرفقات أخرى",
      hint: "أي مستندات أو خطابات مؤيدة للظرف الاستثنائي (PDF أو صورة)",
      required: true,
    },
  ];
}

/**
 * Parses attachment URL field whether stored as JSON array of attachments
 * or legacy single URL string.
 */
export function parseAttachments(rawUrl?: string): InquiryAttachmentItem[] {
  if (!rawUrl) return [];
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item, idx) => {
            if (typeof item === "string") {
              return { slotId: `att_${idx}`, label: `مرفق ${idx + 1}`, url: item };
            }
            return {
              slotId: item.slotId || item.id || `att_${idx}`,
              label: item.label || `مرفق ${idx + 1}`,
              url: item.url || "",
            };
          })
          .filter((item) => !!item.url);
      } else if (typeof parsed === "object" && parsed !== null) {
        return Object.entries(parsed)
          .map(([key, val]) => ({
            slotId: key,
            label:
              key === "faris"
                ? "مرفق فارس"
                : key === "medical"
                ? "مرفق التقرير الطبي"
                : key === "other"
                ? "مرفقات أخرى"
                : "مرفق",
            url: String(val),
          }))
          .filter((item) => !!item.url);
      }
    } catch {
      // Fallback to single string
    }
  }
  return [{ slotId: "default", label: "المرفق", url: rawUrl }];
}
