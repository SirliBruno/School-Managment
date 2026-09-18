"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  FileText,
  Settings,
  FileSpreadsheet,
  Megaphone,
  HeartPulse,
  HeartHandshake,
  ChevronDown,
  Menu,
  X,
  LayoutDashboard,
  LogOut,
  KeyRound,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { AdminProfileModal } from "@/components/auth/AdminProfileModal";


export interface SubNavItem {
  id: string;
  label: string;
  href: string;
  isActive?: boolean;
}

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  hasChildren?: boolean;
  children?: SubNavItem[];
}

export interface SidebarProps {
  activeSubItemHref?: string;
  className?: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "لوحة التحكم والإحصائيات",
    icon: LayoutDashboard,
    href: "/",
    hasChildren: false,
  },
  {
    id: "teachers",
    label: "المعلمين",
    icon: Users,
    href: "/teachers",
    hasChildren: false,
  },
  {
    id: "teacher-notes",
    label: "ملاحظات المعلمين",
    icon: FileText,
    href: "/teacher-notes",
    hasChildren: true,
    children: [
      { id: "notes-all", label: "جميع الملاحظات", href: "/teacher-notes/all" },
      { id: "notes-add", label: "إضافة ملاحظة جديدة", href: "/teacher-notes/add" },
    ],
  },
  {
    id: "admin-procedures",
    label: "الإجراءات الإدارية",
    icon: Settings,
    hasChildren: true,
    children: [
      {
        id: "delay-warning",
        label: "تنبيه على تأخر",
        href: "/procedures/delay-warning",
      },
      {
        id: "deduction-hours",
        label: "قرار حسم مجموع ساعات",
        href: "/procedures/deduction-hours",
      },
      {
        id: "absence-inquiry",
        label: "مساءلة غياب",
        href: "/procedures/absence",
      },
      {
        id: "procedures-list",
        label: "قائمة الإجراءات",
        href: "/procedures/list",
      },
    ],
  },
  {
    id: "admin-forms",
    label: "النماذج الإدارية",
    icon: FileSpreadsheet,
    href: "/admin-forms",
    hasChildren: true,
    children: [
      { id: "forms-templates", label: "نماذج التكليف والندب", href: "/admin-forms/templates" },
      { id: "forms-evaluations", label: "نماذج تقويم الأداء", href: "/admin-forms/evaluations" },
    ],
  },
  {
    id: "circulars-list",
    label: "قائمة التعاميم",
    icon: Megaphone,
    href: "/circulars",
    hasChildren: true,
    children: [
      { id: "circulars-ministerial", label: "تعاميم الوزارة", href: "/circulars/ministerial" },
      { id: "circulars-internal", label: "التعاميم الداخلية", href: "/circulars/internal" },
    ],
  },
  {
    id: "health-cases",
    label: "الحالات الصحية",
    icon: HeartPulse,
    href: "/health-cases",
    hasChildren: true,
    children: [
      { id: "health-reports", label: "التقارير الطبية المعتمدة", href: "/health-cases/reports" },
      { id: "health-leaves", label: "سجل الإجازات المرضية", href: "/health-cases/leaves" },
    ],
  },
  {
    id: "social-cases",
    label: "الحالات الاجتماعية",
    icon: HeartHandshake,
    href: "/social-cases",
    hasChildren: true,
    children: [
      { id: "social-urgent", label: "الظروف الطارئة والاستثنائية", href: "/social-cases/urgent" },
      { id: "social-support", label: "سجلات الرعاية والمواساة", href: "/social-cases/support" },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSubItemHref,
  className,
}) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // "الإجراءات الإدارية" is EXPANDED by default
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    "admin-procedures": true,
  });

  const [isMobileOpen, setIsMobileOpen] = useState(false);


  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileOpen]);

  const toggleMenu = (menuId: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#137a85] text-white select-none">
      {/* Top Header / Profile Section */}
      <div className="px-5 py-5 border-b border-teal-600/50 flex items-center justify-between">
        <Link
          href="/"
          onClick={() => setIsMobileOpen(false)}
          className="flex items-center gap-3 hover:opacity-95 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-xl p-1 group"
          aria-label="الانتقال إلى لوحة التحكم الرئيسية"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-2.5 rounded-xl bg-white/10 text-white flex items-center justify-center shadow-inner group-hover:bg-white/15 transition-colors"
          >
            <Users className="w-5 h-5" aria-hidden="true" />
            <span
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-[#137a85] animate-pulse"
              aria-hidden="true"
            />
          </motion.div>
          <div>
            <span className="font-bold text-base tracking-wide text-white block">
              نظام الإدارة المدرسية
            </span>
            <span className="text-[11px] text-teal-100 font-medium">
              بوابة وكيلة الشؤون التعليمية
            </span>
          </div>
        </Link>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden p-2 rounded-lg text-teal-100 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="إغلاق القائمة الجانبية"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      {/* Navigation Accordion List */}
      <nav
        className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto custom-scrollbar"
        aria-label="قائمة التصفح الرئيسية"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isAccordion = Boolean(item.hasChildren && item.children?.length);
          const isOpen = Boolean(openMenus[item.id]);
          const isCurrentRoute = pathname === item.href;

          if (isAccordion) {
            return (
              <div key={item.id} className="space-y-1">
                {/* Accordion Trigger Header */}
                <button
                  type="button"
                  onClick={() => toggleMenu(item.id)}
                  aria-expanded={isOpen}
                  aria-controls={`sub-menu-${item.id}`}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                    isOpen
                      ? "bg-black/15 text-white shadow-xs"
                      : "text-teal-50 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className="w-5 h-5 text-teal-100 group-hover:text-white transition-colors shrink-0"
                      aria-hidden="true"
                    />
                    <span>{item.label}</span>
                  </div>

                  {/* Animated Rotating Chevron */}
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0"
                  >
                    <ChevronDown
                      className="w-4 h-4 text-teal-200 group-hover:text-white"
                      aria-hidden="true"
                    />
                  </motion.div>
                </button>

                {/* Animated Accordion Submenu */}
                <AnimatePresence initial={false}>
                  {isOpen && item.children && (
                    <motion.div
                      id={`sub-menu-${item.id}`}
                      role="region"
                      aria-label={`عناصر فرعية لقسم ${item.label}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                      className="overflow-hidden pr-7 pl-2 py-1 space-y-1 border-r-2 border-teal-400/40 mr-3"
                    >
                      {item.children.map((subItem) => {
                        const isSubActive =
                          pathname === subItem.href ||
                          activeSubItemHref === subItem.href;

                        return (
                          <Link
                            key={subItem.id}
                            href={subItem.href}
                            onClick={() => setIsMobileOpen(false)}
                            aria-current={isSubActive ? "page" : undefined}
                            className={cn(
                              "relative block px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                              isSubActive
                                ? "bg-[#0b535b] text-white font-bold shadow-xs ring-1 ring-white/20"
                                : "text-teal-100 hover:text-white hover:bg-white/10"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span>{subItem.label}</span>
                              {isSubActive && (
                                <motion.span
                                  layoutId="active-sub-dot"
                                  className="w-1.5 h-1.5 rounded-full bg-teal-200"
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          // Standard Single Link Item (e.g. Dashboard, Teachers)
          return (
            <Link
              key={item.id}
              href={item.href || "#"}
              onClick={() => setIsMobileOpen(false)}
              aria-current={isCurrentRoute ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                isCurrentRoute
                  ? "bg-[#0b535b] text-white font-bold shadow-sm ring-1 ring-white/20"
                  : "text-teal-50 hover:text-white hover:bg-white/10"
              )}
            >
              {isCurrentRoute && (
                <motion.div
                  layoutId="active-nav-indicator"
                  className="absolute right-0 top-1.5 bottom-1.5 w-1 bg-teal-300 rounded-l-full"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon
                className="w-5 h-5 text-teal-100 shrink-0"
                aria-hidden="true"
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Vice Principal Account & Actions Card */}
      <div className="p-3 mx-2.5 mb-2 rounded-2xl bg-black/20 border border-white/10 backdrop-blur-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-300/30 flex items-center justify-center text-teal-200 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {user?.fullName || "وكيلة الشؤون التعليمية"}
              </p>
              <p className="text-[10px] text-teal-200/80 font-mono truncate" dir="ltr">
                @{user?.username || "wakila"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/10">
          <button
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-medium text-white transition-colors cursor-pointer"
            title="تعديل اسم المستخدم وكلمة المرور"
          >
            <KeyRound className="w-3.5 h-3.5 text-teal-200" />
            <span>إعدادات الحساب</span>
          </button>
          <button
            type="button"
            onClick={() => logout()}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-[11px] font-medium text-rose-200 hover:text-white transition-colors cursor-pointer"
            title="تسجيل الخروج من المنصة"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل خروج</span>
          </button>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="p-4 border-t border-teal-600/40 bg-black/10 text-center">
        <p className="text-[11px] text-teal-100 font-medium">
          نظام الإدارة المدرسية • الإصدار 1.0
        </p>
        <p className="text-[10px] text-teal-200/70 mt-0.5">
          المملكة العربية السعودية
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Floating Button */}
      <div className="lg:hidden fixed top-3 right-3 z-50">
        <motion.button
          whileTap={{ scale: 0.92 }}
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="p-2.5 rounded-xl bg-[#137a85] text-white shadow-lg hover:bg-teal-700 transition-all focus:outline-none focus:ring-2 focus:ring-teal-400"
          aria-label="فتح القائمة الجانبية"
          aria-expanded={isMobileOpen}
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </motion.button>
      </div>

      {/* Desktop Persistent Sidebar (Right side in RTL) */}
      <aside
        className={cn(
          "hidden lg:block w-64 h-screen sticky top-0 shrink-0 shadow-lg border-l border-teal-800/40 z-30",
          className
        )}
        aria-label="شريط القائمة الجانبية"
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (RTL Slide-in from right with Framer Motion) */}
      <AnimatePresence>
        {isMobileOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="القائمة الجانبية للجوال"
            className="fixed inset-0 z-50 lg:hidden flex justify-end"
          >
            {/* Animated Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
              onClick={() => setIsMobileOpen(false)}
              aria-hidden="true"
            />

            {/* Animated Drawer Window */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              className="relative w-72 max-w-full h-full shadow-2xl z-10"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* نافذة تعديل بيانات حساب الوكيلة */}
      <AdminProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};

