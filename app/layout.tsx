import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { TeacherProvider } from "@/context/TeacherContext";

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
        <TeacherProvider>
          <div className="flex min-h-screen">
            {/* Sidebar on Right side in RTL */}
            <Sidebar />

            {/* Main Content Area on Left side in RTL */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
              {children}
            </div>
          </div>
        </TeacherProvider>
      </body>
    </html>
  );
}
