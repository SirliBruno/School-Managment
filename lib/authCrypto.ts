/**
 * مساعد تشفير ومطابقة كلمات المرور لمنصة الإدارة المدرسية
 * يستخدم Web Crypto API القياسية المتوافقة مع المتصفحات وبيئات Next.js
 */

const AUTH_SALT = "school_admin_salt_v1";

/**
 * تحويل مصفوفة بايت إلى نص ست عشري (Hex string)
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * تشفير كلمة المرور بنظام SHA-256 مع Salt ثابت
 */
export async function hashPassword(password: string): Promise<string> {
  const salted = AUTH_SALT + password;

  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(salted);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    return bufferToHex(hashBuffer);
  }

  // fallback بسيط عند عدم توفر window.crypto
  let hash = 0;
  for (let i = 0; i < salted.length; i++) {
    const char = salted.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(32, "0");
}

/**
 * التحقق من صحة كلمة المرور المدخلة ومطابقتها مع التجزئة المحفوظة
 */
export async function verifyPassword(
  plainText: string,
  storedHash: string
): Promise<boolean> {
  const computed = await hashPassword(plainText);
  return computed.toLowerCase() === storedHash.toLowerCase();
}
