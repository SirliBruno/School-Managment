import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { TeacherProvider } from "@/context/TeacherContext";
import { ToastProvider } from "@/context/ToastContext";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "منصة الغياب الإدارية | نظام الإدارة المدرسية",
  description: "منظومة إدارية متكاملة لمتابعة غياب المعلمات والإجراءات الإدارية المدرسية",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="font-cairo bg-slate-50 text-slate-800 antialiased min-h-screen">
        <ToastProvider>
          <AuthProvider>
            <TeacherProvider>
              <AuthGuard>{children}</AuthGuard>
            </TeacherProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

