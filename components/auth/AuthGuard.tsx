"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/Sidebar";

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  // تحديد المسارات العامة التي لا تتطلب تسجيل دخول ولا تعرض القائمة الجانبية
  const isLoginPage = pathname === "/login";
  const isInquiryPublicPage = pathname?.startsWith("/inquiry/");
  const isTeacherResponsePublicPage = pathname?.startsWith("/teacher-response/");
  const isPublicRoute = isLoginPage || isInquiryPublicPage || isTeacherResponsePublicPage;

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublicRoute) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, isPublicRoute, router]);

  // في المسارات العامة (تسجيل الدخول أو استجابة المعلمة للمساءلة)
  if (isPublicRoute) {
    return <main className="min-h-screen w-full">{children}</main>;
  }

  // شاشة تحميل أثناء التحقق من الجلسة
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500">
            جاري التحقق من الصلاحيات الإدارية...
          </span>
        </div>
      </div>
    );
  }

  // إذا لم يكن مسجلاً الدخول وفي مسار محمي
  if (!isAuthenticated) {
    return null;
  }

  // التخطيط الكامل للمنصة الإدارية المحمية
  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* القائمة الجانبية على اليمين */}
      <Sidebar />

      {/* منطقة المحتوى الإداري على اليسار */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50">
        {children}
      </main>
    </div>
  );
};
