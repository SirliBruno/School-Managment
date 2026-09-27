"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  LayoutDashboard,
  Archive,
  HelpCircle,
  FileBarChart,
  FileText,
  Clock,
  DoorOpen,
  ShieldAlert,
  ListTodo,
  GraduationCap,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeachers } from "@/context/TeacherContext";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useSwipe } from "@/hooks/useSwipe";
import { useSidebar } from "@/context/SidebarContext";
import {
  useAuth,
  DEFAULT_ADMIN_NAME,
  DEFAULT_ADMIN_ROLE_LABEL,
} from "@/context/AuthContext";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badgeCount?: number;
  badgeVariant?: "rose" | "amber" | "teal" | "slate";
}

export interface NavGroup {
  id: string;
  title?: string;
  items: NavItem[];
}

export interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const pathname = usePathname();
  const { user } = useAuth();
  const stats = useDashboardStats();
  const {
    archivedTeachers,
    archivedAbsences,
    archivedDelayNotices,
  } = useTeachers();
  const { isCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar();

  const pendingDirectorDelayCount = stats.pendingDelayNotices;
  const pendingAbsencesCount = Math.max(0, stats.pendingProcedures - stats.pendingDelayNotices);
  const totalArchivedCount =
    (archivedTeachers?.length || 0) +
    (archivedAbsences?.length || 0) +
    (archivedDelayNotices?.length || 0);

  // Swipe-to-close for RTL (swiping to the right edge closes drawer)
  const swipeHandlers = useSwipe(
    () => setIsMobileOpen(false),
    undefined,
    45
  );

  // Auto-close mobile drawer on route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname, setIsMobileOpen]);

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
  }, [isMobileOpen, setIsMobileOpen]);

  // Clean, modern 4-tier navigation layout as requested
  const navGroups: NavGroup[] = [
    {
      id: "main",
      items: [
        {
          id: "dashboard",
          label: "الرئيسية (مركز القيادة)",
          icon: LayoutDashboard,
          href: "/",
        },
      ],
    },
    {
      id: "records",
      title: "السجلات اليومية",
      items: [
        {
          id: "teachers",
          label: "سجل المعلمات",
          icon: Users,
          href: "/teachers",
        },
        {
          id: "absence-inquiry",
          label: "الغياب والمساءلات",
          icon: FileText,
          href: "/procedures/absence",
          badgeCount: pendingAbsencesCount,
          badgeVariant: "amber",
        },
        {
          id: "permissions",
          label: "استئذان الموظفين",
          icon: DoorOpen,
          href: "/procedures/permissions",
        },
      ],
    },
    {
      id: "procedures",
      title: "الإجراءات والقرارات",
      items: [
        {
          id: "delay-warning",
          label: "التأخر والانصراف",
          icon: Clock,
          href: "/procedures/delay-notice",
          badgeCount: pendingDirectorDelayCount,
          badgeVariant: "rose",
        },
        {
          id: "deduction-hours",
          label: "قرارات الحسم المالي",
          icon: ShieldAlert,
          href: "/procedures/deduction-hours",
        },
        {
          id: "procedures-list",
          label: "سجل الإجراءات الشامل",
          icon: ListTodo,
          href: "/procedures/list",
        },
      ],
    },
    {
      id: "management",
      title: "الإدارة والتوثيق",
      items: [
        {
          id: "reports",
          label: "التقارير والحصر",
          icon: FileBarChart,
          href: "/reports",
        },
        {
          id: "archive",
          label: "الأرشيف الإداري",
          icon: Archive,
          href: "/archive",
          badgeCount: totalArchivedCount,
          badgeVariant: "slate",
        },
      ],
    },
  ];

  const renderSidebarContent = (isDrawer: boolean = false) => {
    const collapsed = isCollapsed && !isDrawer;

    return (
      <div className="flex flex-col h-full bg-white text-slate-800 select-none border-l border-slate-200/80">
        {/* Brand Header */}
        <div
          className={cn(
            "py-4.5 border-b border-slate-100 flex items-center transition-all bg-gradient-to-b from-slate-50/50 to-white",
            collapsed ? "px-3 justify-center" : "px-5 justify-between"
          )}
        >
          <Link
            href="/"
            onClick={() => setIsMobileOpen(false)}
            className="flex items-center gap-3 hover:opacity-95 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85]/40 rounded-2xl p-1 group"
            aria-label="الانتقال إلى لوحة التحكم الرئيسية"
            title={collapsed ? "منصة الإدارة المدرسية - الثانوية الخامسة مسارات" : undefined}
          >
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-[#137a85] to-[#0d5961] text-white flex items-center justify-center shadow-xs shrink-0"
            >
              <GraduationCap className="w-5 h-5 stroke-[2.2]" aria-hidden="true" />
              <span
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-white animate-pulse"
                aria-hidden="true"
              />
            </motion.div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="font-extrabold text-[15px] tracking-tight text-slate-900 block truncate">
                  منصة الإدارة المدرسية
                </span>
                <span className="text-[11px] text-teal-700 font-semibold block truncate">
                  الثانوية الخامسة مسارات
                </span>
              </div>
            )}
          </Link>

          {/* Mobile close button (Drawer only) */}
          {isDrawer && (
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85] cursor-pointer"
              aria-label="إغلاق القائمة الجانبية"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Navigation Groups List */}
        <nav
          className="flex-1 px-3 py-3 space-y-3.5 overflow-y-auto custom-scrollbar"
          aria-label="قائمة التصفح الرئيسية"
        >
          {navGroups.map((group) => (
            <div key={group.id} className="space-y-1">
              {!collapsed && group.title && (
                <div className="px-3 pt-2 pb-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  {group.title}
                </div>
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                const isCurrentRoute = pathname === item.href;

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    aria-current={isCurrentRoute ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "relative flex items-center rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85]/40",
                      collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
                      isCurrentRoute
                        ? "bg-teal-50/90 text-[#0c5961] font-extrabold border-r-3 border-r-[#137a85] shadow-2xs"
                        : "text-slate-700 hover:text-slate-950 hover:bg-slate-50 font-bold"
                    )}
                  >
                    <div className="relative shrink-0">
                      <Icon
                        className={cn(
                          "w-5 h-5 shrink-0 stroke-[2] transition-colors",
                          isCurrentRoute ? "text-[#137a85]" : "text-slate-400 group-hover:text-slate-800"
                        )}
                        aria-hidden="true"
                      />
                      {collapsed && item.badgeCount !== undefined && item.badgeCount > 0 && (
                        <span
                          className={cn(
                            "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ring-2 ring-white",
                            item.badgeVariant === "rose" && "bg-rose-500 animate-pulse",
                            item.badgeVariant === "amber" && "bg-amber-500",
                            (!item.badgeVariant || item.badgeVariant === "slate") && "bg-slate-400"
                          )}
                        />
                      )}
                    </div>

                    {!collapsed && (
                      <span className="flex-1 whitespace-nowrap truncate">{item.label}</span>
                    )}

                    {!collapsed && item.badgeCount !== undefined && item.badgeCount > 0 && (
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[11px] font-mono font-bold shrink-0",
                          item.badgeVariant === "rose" && "bg-rose-100 text-rose-800 border border-rose-200 animate-pulse",
                          item.badgeVariant === "amber" && "bg-amber-100 text-amber-800 border border-amber-200",
                          (!item.badgeVariant || item.badgeVariant === "slate") && "bg-slate-100 text-slate-600 border border-slate-200"
                        )}
                      >
                        {item.badgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer Admin User Identity Card & System State */}
        {!collapsed && (
          <div className="p-3 border-t border-slate-100 bg-slate-50/70 text-right space-y-2.5">
            {/* Identity Card */}
            <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200/80 text-[#137a85] flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                {user?.fullName?.trim().charAt(0) || DEFAULT_ADMIN_NAME.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {user?.fullName || DEFAULT_ADMIN_NAME}
                </p>
                <p className="text-[10px] text-teal-700 font-semibold truncate">
                  {user?.role === "principal" ? "مديرة المدرسة" : DEFAULT_ADMIN_ROLE_LABEL}
                </p>
              </div>
            </div>

            {/* System Status Pill */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-emerald-800 font-bold">النظام متصل ومحدث</span>
              </div>
              <span className="font-mono text-[10px] bg-slate-200/60 px-1.5 py-0.5 rounded text-slate-700 font-bold">
                v2.5
              </span>
            </div>

            {/* Quick Support / Procedures Link */}
            <Link
              href="/procedures/list"
              className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100/90 text-slate-700 hover:text-[#137a85] text-xs font-bold transition-all border border-slate-200 shadow-2xs flex items-center justify-center gap-2 group whitespace-nowrap cursor-pointer"
              title="دليل الإجراءات والدعم الفني"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#137a85] shrink-0 group-hover:scale-110 transition-transform" />
              <span className="whitespace-nowrap">دليل العمليات الإدارية</span>
            </Link>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop Persistent Sidebar (Right side in RTL) */}
      <aside
        className={cn(
          "hidden lg:block h-screen sticky top-0 shrink-0 shadow-xs border-l border-slate-200/80 z-30 bg-white self-start transition-all duration-300",
          isCollapsed ? "w-20" : "w-64",
          className
        )}
        aria-label="شريط القائمة الجانبية"
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer (RTL Slide-in from right with Framer Motion and Swipe-to-close) */}
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
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsMobileOpen(false)}
              aria-hidden="true"
            />

            {/* Animated Drawer Window (min(85vw, 320px) width) */}
            <motion.div
              {...swipeHandlers}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              className="relative w-[min(85vw,320px)] max-w-full h-full shadow-2xl z-10 overflow-hidden flex flex-col"
            >
              {renderSidebarContent(true)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
