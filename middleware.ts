import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js Middleware لحماية المسارات الإدارية الحساسة
 * يمنع الوصول المباشر غير المصادق للمسارات (/teachers, /procedures, /reports, /archive)
 * مع السماح الكامل بالمسارات العامة (تسجيل الدخول، مساءلات المعلمات عبر الروابط المباشرة)
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. المسارات العامة المستثناة من حظر الوصول
  if (
    pathname === "/login" ||
    pathname.startsWith("/inquiry/") ||
    pathname.startsWith("/teacher-response/") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. التحقق من وجود توكن الجلسة الإدارية
  // نقرأ كوكي الجلسة school_admin_token أو كوكيز Supabase الرسمية
  const authToken =
    request.cookies.get("school_admin_token")?.value ||
    request.cookies.get("sb-access-token")?.value ||
    request.cookies.get("sb-refresh-token")?.value;

  // فحص الكوكيز التلقائية التي يبدأ اسمها بـ sb-
  const hasSbCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && Boolean(c.value));

  const isAuthenticated = Boolean(authToken || hasSbCookie);

  // 3. إذا كان المسار إدارياً والمستخدم غير مسجل الدخول، إعادة التوجيه إلى صفحة تسجيل الدخول
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

/**
 * مطابقة المسارات الإدارية الحساسة
 */
export const config = {
  matcher: [
    "/",
    "/teachers/:path*",
    "/procedures/:path*",
    "/reports/:path*",
    "/archive/:path*",
  ],
};
