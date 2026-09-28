/**
 * فحص وتدقيق أمان الملفات المرفوعة (Magic Bytes & File Signature Validation)
 * يضمن منع رفع البرمجيات التنفيذية والملفات الخبيثة المتنكرة بامتدادات صور
 */

export interface FileValidationResult {
  valid: boolean;
  detectedType?: "png" | "jpeg" | "pdf" | "webp" | "unknown";
  error?: string;
}

// التواقيع الرقمية القياسية للملفات (Magic Bytes)
const MAGIC_NUMBERS = {
  PNG: [0x89, 0x50, 0x4e, 0x47], // \x89PNG
  JPEG: [0xff, 0xd8, 0xff], // \xFF\xD8\xFF
  PDF: [0x25, 0x50, 0x44, 0x46], // %PDF
  RIFF: [0x52, 0x49, 0x46, 0x46], // RIFF (WebP container)
  WEBP: [0x57, 0x45, 0x42, 0x50], // WEBP
};

export const FORBIDDEN_EXTENSIONS = [
  "exe", "bat", "sh", "php", "js", "html", "htm", "svg", "cmd", "vbs",
  "ps1", "py", "jar", "msi", "dll", "scr", "pif", "hta", "cpl", "com",
  "jsp", "asp", "aspx", "cgi", "pl", "bin", "wsf"
];

/**
 * فحص تواقيع البايتات السحرية لمحتوى الملف
 */
export async function validateFileMagicBytes(
  file: File | Blob
): Promise<{ valid: boolean; detectedType: "png" | "jpeg" | "pdf" | "webp" | "unknown" }> {
  try {
    const buffer = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    if (bytes.length < 4) {
      return { valid: false, detectedType: "unknown" };
    }

    // فحص PNG
    if (
      bytes[0] === MAGIC_NUMBERS.PNG[0] &&
      bytes[1] === MAGIC_NUMBERS.PNG[1] &&
      bytes[2] === MAGIC_NUMBERS.PNG[2] &&
      bytes[3] === MAGIC_NUMBERS.PNG[3]
    ) {
      return { valid: true, detectedType: "png" };
    }

    // فحص JPEG
    if (
      bytes[0] === MAGIC_NUMBERS.JPEG[0] &&
      bytes[1] === MAGIC_NUMBERS.JPEG[1] &&
      bytes[2] === MAGIC_NUMBERS.JPEG[2]
    ) {
      return { valid: true, detectedType: "jpeg" };
    }

    // فحص PDF
    if (
      bytes[0] === MAGIC_NUMBERS.PDF[0] &&
      bytes[1] === MAGIC_NUMBERS.PDF[1] &&
      bytes[2] === MAGIC_NUMBERS.PDF[2] &&
      bytes[3] === MAGIC_NUMBERS.PDF[3]
    ) {
      return { valid: true, detectedType: "pdf" };
    }

    // فحص WEBP (يبدأ بـ RIFF ثم WEBP في البايت 8)
    if (
      bytes.length >= 12 &&
      bytes[0] === MAGIC_NUMBERS.RIFF[0] &&
      bytes[1] === MAGIC_NUMBERS.RIFF[1] &&
      bytes[2] === MAGIC_NUMBERS.RIFF[2] &&
      bytes[3] === MAGIC_NUMBERS.RIFF[3] &&
      bytes[8] === MAGIC_NUMBERS.WEBP[0] &&
      bytes[9] === MAGIC_NUMBERS.WEBP[1] &&
      bytes[10] === MAGIC_NUMBERS.WEBP[2] &&
      bytes[11] === MAGIC_NUMBERS.WEBP[3]
    ) {
      return { valid: true, detectedType: "webp" };
    }

    return { valid: false, detectedType: "unknown" };
  } catch {
    return { valid: false, detectedType: "unknown" };
  }
}

/**
 * التحقق الأمني الشامل من الملف المرفوع (الامتداد، نوع MIME، الامتدادات المزدوجة، والتوقيع الرقمي)
 */
export async function validateSecureUpload(
  file: File,
  options: {
    allowedExtensions: string[];
    allowedMimes: string[];
    maxSizeBytes: number;
    allowPdf?: boolean;
  }
): Promise<FileValidationResult> {
  const fileName = (file.name || "").toLowerCase().trim();
  const fileExt = fileName.split(".").pop() || "";
  const mimeType = (file.type || "").toLowerCase().trim();

  // 1. حظر الملفات ذات الامتدادات الخبيثة والتنفيذية
  if (FORBIDDEN_EXTENSIONS.includes(fileExt)) {
    return {
      valid: false,
      error: `نوع الملف (${fileExt}) غير مسموح به ومحظور أمنياً.`,
    };
  }

  // 2. كشف هجمات الامتدادات المزدوجة (e.g. evil.php.png, script.exe.jpg)
  const nameParts = fileName.split(".");
  if (nameParts.length > 2) {
    for (let i = 1; i < nameParts.length - 1; i++) {
      if (FORBIDDEN_EXTENSIONS.includes(nameParts[i])) {
        return {
          valid: false,
          error: `تم رصد امتداد تنفيذي مخفي (${nameParts[i]}) داخل اسم الملف. تم رفض الملف لأسباب أمنية.`,
        };
      }
    }
  }

  // 3. حظر أنواع MIME الخطيرة صراحة
  if (
    mimeType === "image/svg+xml" ||
    mimeType.includes("html") ||
    mimeType.includes("javascript") ||
    mimeType.includes("x-msdownload") ||
    mimeType.includes("x-sh") ||
    mimeType.includes("x-bat")
  ) {
    return {
      valid: false,
      error: "نوع محتوى الملف (MIME Type) محظور أمنياً.",
    };
  }

  // 4. مطابقة القائمة البيضاء للامتدادات
  const normalizedAllowedExts = options.allowedExtensions.map((e) =>
    e.replace(/^\./, "").toLowerCase()
  );
  if (!normalizedAllowedExts.includes(fileExt)) {
    return {
      valid: false,
      error: `صيغة الملف غير مدعومة. الصيغ المسموح بها حصراً هي: ${normalizedAllowedExts.join(", ").toUpperCase()}.`,
    };
  }

  // 5. التحقق من حجم الملف
  if (file.size > options.maxSizeBytes) {
    const maxMb = (options.maxSizeBytes / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `حجم الملف يتجاوز الحد الأقصى المسموح به (${maxMb} ميغابايت).`,
    };
  }

  // 6. التحقق من البايتات السحرية (Magic Bytes Inspection)
  const magicCheck = await validateFileMagicBytes(file);
  if (!magicCheck.valid) {
    return {
      valid: false,
      error: "فشل التحقق من التوقيع الرقمي للملف (Magic Bytes). محتوى الملف الفعلي لا يطابق الصيغ المصرح بها.",
    };
  }

  // التأكد من تطابق التوقيع الرقمي مع الامتداد المزعوم
  const detected = magicCheck.detectedType;
  if (
    (fileExt === "png" && detected !== "png") ||
    ((fileExt === "jpg" || fileExt === "jpeg") && detected !== "jpeg") ||
    (fileExt === "pdf" && detected !== "pdf") ||
    (fileExt === "webp" && detected !== "webp")
  ) {
    return {
      valid: false,
      detectedType: detected,
      error: `تضارب أمني: امتداد الملف (.${fileExt}) لا يطابق البنية الرقمية الحقيقية للملف (${detected.toUpperCase()}).`,
    };
  }

  return {
    valid: true,
    detectedType: detected,
  };
}
