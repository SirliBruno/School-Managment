"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Settings,
  ChevronDown,
  Menu,
  X,
  LayoutDashboard,
  LogOut,
  KeyRound,
  ShieldCheck,
  MessageCircle,
  Building2,
  Archive,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useTeachers } from "@/context/TeacherContext";
import { useDashboardStats } from "@/hooks/useDashboardStats";
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
    id: "admin-procedures",
    label: "الإجراءات الإدارية",
    icon: Settings,
    hasChildren: true,
    children: [
      {
        id: "delay-warning",
        label: "تنبيه على تأخر",
        href: "/procedures/delay-notice",
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
    id: "archive",
    label: "الأرشيف الإداري",
    icon: Archive,
    href: "/archive",
    hasChildren: false,
  },
];



export const Sidebar: React.FC<SidebarProps> = ({
  activeSubItemHref,
  className,
}) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const stats = useDashboardStats();
  const {
    archivedTeachers,
    archivedAbsences,
    archivedDelayNotices,
    isCloudConnected,
    pendingSyncCount,
    flushSyncQueue,
  } = useTeachers();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const pendingDirectorDelayCount = stats.pendingDelayNotices;
  const pendingAbsencesCount = Math.max(0, stats.pendingProcedures - stats.pendingDelayNotices);
  const totalArchivedCount =
    (archivedTeachers?.length || 0) +
    (archivedAbsences?.length || 0) +
    (archivedDelayNotices?.length || 0);

  // "الإجراءات الإدارية" is EXPANDED by default
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    "admin-procedures": true,
  });

  const [isMobileOpen, setIsMobileOpen] = useState(false);


  // Auto-close mobile drawer on route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isMobileOpen]);

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
                    <div className="flex items-center gap-2">
                      <span>{item.label}</span>
                      {item.id === "admin-procedures" &&
                        (pendingDirectorDelayCount > 0 || pendingAbsencesCount > 0) && (
                          <span className="w-2 h-2 rounded-full bg-rose-400 ring-2 ring-[#137a85] animate-pulse shrink-0" />
                        )}
                    </div>
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
                      className="overflow-hidden pe-7 ps-2 py-1 space-y-1 border-s-2 border-teal-400/40 ms-3"
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
                              <div className="flex items-center gap-1.5">
                                <span>{subItem.label}</span>
                                {subItem.id === "delay-warning" && pendingDirectorDelayCount > 0 && (
                                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold ring-1 ring-white/30 animate-pulse">
                                    {pendingDirectorDelayCount}
                                  </span>
                                )}
                                {subItem.id === "absence-inquiry" && pendingAbsencesCount > 0 && (
                                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold ring-1 ring-white/30">
                                    {pendingAbsencesCount}
                                  </span>
                                )}
                              </div>
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
              <span className="flex-1">{item.label}</span>
              {item.id === "archive" && totalArchivedCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-200 text-[11px] font-bold ring-1 ring-teal-300/30">
                  {totalArchivedCount}
                </span>
              )}
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

      {/* Cloud Connectivity & Realtime Sync Status */}
      <div className="mx-3.5 mb-2.5 p-2 rounded-xl bg-black/20 border border-teal-500/30 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              isCloudConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
            )}
          />
          <span className="font-medium text-teal-100 text-[10px]">
            {isCloudConnected ? "سحابي ولحظي (Supabase)" : "حفظ محلي (انقطاع مؤقت)"}
          </span>
        </div>
        {pendingSyncCount > 0 ? (
          <button
            type="button"
            onClick={() => flushSyncQueue()}
            className="text-[10px] bg-amber-400/20 text-amber-200 hover:text-white px-2 py-0.5 rounded border border-amber-400/40 flex items-center gap-1 cursor-pointer"
            title="مزامنة التغييرات المعلقة مع السحابة"
          >
            <span>{pendingSyncCount} معلق</span>
            <RotateCcw className="w-2.5 h-2.5" />
          </button>
        ) : (
          <span className="text-[10px] text-teal-200/80">متزامن ✓</span>
        )}
      </div>

      {/* Footer Branding & Developer Credit */}
      <div className="p-3.5 border-t border-teal-600/40 bg-black/15 text-center">
        <p className="text-[11px] text-teal-100 font-medium">
          نظام الإدارة المدرسية • الإصدار 1.0
        </p>
        <div className="mt-2 pt-2 border-t border-teal-600/30 flex flex-col items-center gap-1">
          <span className="text-[10px] text-teal-200/80 font-medium flex items-center justify-center gap-1">
            <span>تطوير:</span>
            <span className="font-bold text-white">محمد هارون</span>
          </span>
          <a
            href="https://wa.me/966557013720"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-800/60 hover:bg-teal-700/80 text-teal-100 hover:text-white text-[10px] font-semibold transition-colors border border-teal-500/30 group mt-0.5"
            title="تواصل مع المطور عبر الواتساب"
          >
            <MessageCircle className="w-3 h-3 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span dir="ltr" className="font-mono">0557013720</span>
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Sticky Top Header Bar */}
      <header className="lg:hidden sticky top-0 z-40 bg-[#137a85] text-white px-4 py-3 shadow-md flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-lg p-0.5"
          aria-label="الانتقال إلى لوحة التحكم الرئيسية"
        >
          <div className="p-2 rounded-xl bg-white/10 text-white flex items-center justify-center">
            <Users className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-wide flex items-center gap-1.5 leading-tight">
              <span>نظام الإدارة المدرسية</span>
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  isCloudConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                )}
                title={isCloudConnected ? "متصل سحابياً" : "حفظ محلي"}
              />
            </span>
            <span className="text-[10px] text-teal-100 font-medium">
              بوابة وكيلة الشؤون التعليمية
            </span>
          </div>
        </Link>

        <motion.button
          whileTap={{ scale: 0.92 }}
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
          aria-label="فتح القائمة الجانبية"
          aria-expanded={isMobileOpen}
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </motion.button>
      </header>

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

