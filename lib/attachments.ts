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

export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB max upload
export const MAX_FALLBACK_DATA_URL_BYTES = 750 * 1024; // 750KB max for localStorage fallback

/**
 * Validates whether a file can be safely converted to a fallback DataURL
 * without risking exceeding the browser's 5MB LocalStorage quota.
 */
export function isSafeForLocalStorageFallback(fileSize: number): boolean {
  return fileSize <= MAX_FALLBACK_DATA_URL_BYTES;
}

/**
 * Safely opens or triggers download for any attachment URL (handles data URLs, blob URLs, and https URLs).
 */
export function openSafeAttachmentUrl(url: string, filename = "attachment"): void {
  if (!url || typeof window === "undefined") return;

  // 1. If HTTPS / standard web URL:
  if (url.startsWith("http://") || url.startsWith("https://")) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  // 2. If Data URL: Convert to Blob and Object URL to bypass browser top-level data URL blocking
  if (url.startsWith("data:")) {
    try {
      const parts = url.split(",");
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      const win = window.open(blobUrl, "_blank", "noopener,noreferrer");
      if (!win) {
        // Fallback: trigger download link
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      return;
    } catch (e) {
      console.error("Failed to open data URL safely:", e);
    }
  }

  // 3. Fallback
  window.open(url, "_blank", "noopener,noreferrer");
}

