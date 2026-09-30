"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/Sidebar";
import { SidebarProvider } from "@/context/SidebarContext";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageTransition } from "@/components/layout/PageTransition";

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
  const isAdministrativeInquiryPublicPage = pathname?.startsWith("/administrative-inquiry/");
  const isPublicRoute =
    isLoginPage ||
    isInquiryPublicPage ||
    isTeacherResponsePublicPage ||
    isAdministrativeInquiryPublicPage;

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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
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
    <SidebarProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-cairo">
        {/* شريط الـ Navbar الكامل بلون الهوية الأساسي */}
        <AppHeader />

        <div className="flex-1 flex flex-col lg:flex-row min-w-0">
          {/* القائمة الجانبية الإدارية النظيفة */}
          <Sidebar />

          {/* منطقة المحتوى الإداري */}
          <main className="flex-1 min-w-0" id="main-content">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
