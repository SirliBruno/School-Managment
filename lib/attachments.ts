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

const DEFAULT_SUPABASE_BASE_URL = "https://xizppykmqfkvzwcwxuzr.supabase.co";

/**
 * Resolves any raw attachment string (Storage path, signed/public URL, Base64 Data URL, or JSON array string)
 * into a safe, valid absolute URL or Data URL that can be directly rendered or opened.
 */
export function resolveAttachmentUrl(rawUrl?: string, defaultBucket = "absence-attachments"): string {
  if (!rawUrl) return "";
  const trimmed = rawUrl.trim();
  if (!trimmed) return "";

  // 1. If JSON array / object string, extract the first valid URL
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsedItems = parseAttachments(trimmed, defaultBucket);
    if (parsedItems.length > 0 && parsedItems[0].url) {
      return parsedItems[0].url;
    }
  }

  // 2. If already an absolute Web URL, Data URL, or Blob URL:
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  // 3. If it is a Supabase Storage path (e.g., "absence-attachments/inquiries/file.png" or "manual-records/file.pdf")
  const baseBucket = defaultBucket || "absence-attachments";
  let cleanPath = trimmed.replace(/^\/+/, "");
  if (cleanPath.startsWith(`${baseBucket}/`)) {
    cleanPath = cleanPath.substring(baseBucket.length + 1);
  }

  return `${DEFAULT_SUPABASE_BASE_URL}/storage/v1/object/public/${baseBucket}/${cleanPath}`;
}

/**
 * Parses attachment URL field whether stored as JSON array of attachments
 * or legacy single URL string, ensuring all URLs are safely resolved.
 */
export function parseAttachments(rawUrl?: string, defaultBucket = "absence-attachments"): InquiryAttachmentItem[] {
  if (!rawUrl) return [];
  const trimmed = rawUrl.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item, idx) => {
            if (typeof item === "string") {
              return {
                slotId: `att_${idx}`,
                label: `مرفق ${idx + 1}`,
                url: resolveAttachmentUrl(item, defaultBucket),
              };
            }
            const itemUrl = item.url || item.path || "";
            return {
              slotId: item.slotId || item.id || `att_${idx}`,
              label: item.label || `مرفق ${idx + 1}`,
              url: resolveAttachmentUrl(itemUrl, defaultBucket),
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
            url: resolveAttachmentUrl(String(val), defaultBucket),
          }))
          .filter((item) => !!item.url);
      }
    } catch {
      // Fallback to single string
    }
  }

  const resolved = resolveAttachmentUrl(rawUrl, defaultBucket);
  return resolved ? [{ slotId: "default", label: "المرفق", url: resolved }] : [];
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

  const resolvedUrl = resolveAttachmentUrl(url);
  if (!resolvedUrl) return;

  // 1. If HTTPS / standard web URL:
  if (resolvedUrl.startsWith("http://") || resolvedUrl.startsWith("https://")) {
    window.open(resolvedUrl, "_blank", "noopener,noreferrer");
    return;
  }

  // 2. If Data URL: Convert to Blob and Object URL to bypass browser top-level data URL blocking
  if (resolvedUrl.startsWith("data:")) {
    try {
      const parts = resolvedUrl.split(",");
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
  window.open(resolvedUrl, "_blank", "noopener,noreferrer");
}

/**
 * Converts a base64 Data URL to a native Blob URL for safe inline embedding or preview.
 * Returns null if not a data URL or if window is undefined.
 */
export function createSafeBlobUrl(rawUrl: string): string | null {
  if (!rawUrl || typeof window === "undefined") return null;
  const resolvedUrl = resolveAttachmentUrl(rawUrl);
  if (!resolvedUrl || !resolvedUrl.startsWith("data:")) return null;

  try {
    const parts = resolvedUrl.split(",");
    if (parts.length < 2) return null;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error("Failed to create blob URL:", e);
    return null;
  }
}



