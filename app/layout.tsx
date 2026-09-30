import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { TeacherProvider } from "@/context/TeacherContext";
import { ToastProvider } from "@/context/ToastContext";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "منصة إدارتي المدرسية | نظام الإدارة المدرسية",
  description: "منظومة إدارية متكاملة لمتابعة غياب المعلمات والإجراءات الإدارية المدرسية",
  icons: {
    icon: "/platform-logo.png",
    shortcut: "/platform-logo.png",
    apple: "/platform-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem('school_platform_theme');
                const isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) document.documentElement.classList.add('dark');
                else document.documentElement.classList.remove('dark');
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="font-cairo bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 antialiased min-h-screen transition-colors duration-200">
        {/* Skip Navigation — للوصولية (WCAG 2.4.1) */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[#137a85] focus:text-white focus:rounded-lg focus:font-bold focus:text-sm focus:shadow-lg"
        >
          تخطى إلى المحتوى الرئيسي
        </a>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <TeacherProvider>
                <AuthGuard>{children}</AuthGuard>
              </TeacherProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
