"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Settings,
  ChevronDown,
  X,
  LayoutDashboard,
  Archive,
  HelpCircle,
  FileBarChart,
  FileText,
  Clock,
  DoorOpen,
  ShieldAlert,
  ListTodo,
  CheckCircle2,
  GraduationCap,
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

export interface SubNavItem {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  badgeCount?: number;
  badgeVariant?: "rose" | "amber" | "teal" | "slate";
}

export interface NavGroup {
  id: string;
  title?: string;
  items: NavItem[];
}

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  hasChildren?: boolean;
  children?: SubNavItem[];
  badgeCount?: number;
}

export interface SidebarProps {
  activeSubItemHref?: string;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSubItemHref,
  className,
}) => {
  const pathname = usePathname();
  const { user } = useAuth();
  const stats = useDashboardStats();
  const {
    archivedTeachers,
    archivedAbsences,
    archivedDelayNotices,
    inquiries,
  } = useTeachers();
  const { isCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar();

  const pendingDirectorDelayCount = stats.pendingDelayNotices;
  const pendingAbsencesCount = Math.max(0, stats.pendingProcedures - stats.pendingDelayNotices);
  const totalArchivedCount =
    (archivedTeachers?.length || 0) +
    (archivedAbsences?.length || 0) +
    (archivedDelayNotices?.length || 0);

  // Accordion state - "admin-procedures" expanded by default
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    "admin-procedures": true,
  });

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

  const toggleMenu = (menuId: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  const navGroups: NavGroup[] = [
    {
      id: "general",
      title: "الرئيسية والكادر",
      items: [
        {
          id: "dashboard",
          label: "مركز القيادة والتحكم",
          icon: LayoutDashboard,
          href: "/",
          hasChildren: false,
        },
        {
          id: "teachers",
          label: "سجل المعلمات",
          icon: Users,
          href: "/teachers",
          hasChildren: false,
        },
      ],
    },
    {
      id: "procedures",
      title: "الإجراءات والعمليات",
      items: [
        {
          id: "admin-procedures",
          label: "الإجراءات الإدارية",
          icon: Settings,
          hasChildren: true,
          children: [
            {
              id: "absence-inquiry",
              label: "مساءلة غياب",
              href: "/procedures/absence",
              icon: FileText,
              badgeCount: pendingAbsencesCount,
              badgeVariant: "amber",
            },
            {
              id: "delay-warning",
              label: "تنبيه على تأخر",
              href: "/procedures/delay-notice",
              icon: Clock,
              badgeCount: pendingDirectorDelayCount,
              badgeVariant: "rose",
            },
            {
              id: "permissions",
              label: "استئذان الموظفين",
              href: "/procedures/permissions",
              icon: DoorOpen,
            },
            {
              id: "deduction-hours",
              label: "قرار حسم مجموع ساعات",
              href: "/procedures/deduction-hours",
              icon: ShieldAlert,
            },
            {
              id: "procedures-list",
              label: "سجل الإجراءات الشامل",
              href: "/procedures/list",
              icon: ListTodo,
            },
          ],
        },
      ],
    },
    {
      id: "records",
      title: "التقارير والأرشيف",
      items: [
        {
          id: "reports",
          label: "مركز التقارير والحصر",
          icon: FileBarChart,
          href: "/reports",
          hasChildren: false,
        },
        {
          id: "archive",
          label: "الأرشيف الإداري",
          icon: Archive,
          href: "/archive",
          hasChildren: false,
          badgeCount: totalArchivedCount,
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
              className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-[#137a85] to-[#0d5961] text-white flex items-center justify-center shadow-sm shadow-[#137a85]/20 shrink-0"
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
          className="flex-1 px-3 py-3 space-y-4 overflow-y-auto custom-scrollbar"
          aria-label="قائمة التصفح الرئيسية"
        >
          {navGroups.map((group) => (
            <div key={group.id} className="space-y-1">
              {!collapsed && group.title && (
                <div className="px-3 pt-1 pb-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  {group.title}
                </div>
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                const isAccordion = Boolean(item.hasChildren && item.children?.length);
                const isOpen = Boolean(openMenus[item.id]);
                const isCurrentRoute = pathname === item.href;

                if (isAccordion) {
                  const hasPendingInAccordion =
                    pendingDirectorDelayCount > 0 || pendingAbsencesCount > 0;

                  return (
                    <div key={item.id} className="space-y-1">
                      {/* Accordion Trigger */}
                      <button
                        type="button"
                        onClick={() => toggleMenu(item.id)}
                        aria-expanded={isOpen}
                        aria-controls={`sub-menu-${item.id}`}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "w-full flex items-center rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85]/40 select-none",
                          collapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5",
                          isOpen
                            ? "bg-slate-100/80 text-slate-900"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                        )}
                      >
                        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
                          <Icon
                            className={cn(
                              "w-5 h-5 transition-colors shrink-0 stroke-[2]",
                              isOpen ? "text-[#137a85]" : "text-slate-400 group-hover:text-slate-700"
                            )}
                            aria-hidden="true"
                          />
                          {!collapsed && (
                            <div className="flex items-center gap-2">
                              <span>{item.label}</span>
                              {hasPendingInAccordion && (
                                <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse shrink-0" />
                              )}
                            </div>
                          )}
                        </div>

                        {!collapsed && (
                          <motion.div
                            animate={{ rotate: isOpen ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="shrink-0"
                          >
                            <ChevronDown
                              className="w-4 h-4 text-slate-400 group-hover:text-slate-600"
                              aria-hidden="true"
                            />
                          </motion.div>
                        )}
                      </button>

                      {/* Accordion Submenu Items */}
                      <AnimatePresence initial={false}>
                        {isOpen && !collapsed && (
                          <motion.div
                            id={`sub-menu-${item.id}`}
                            role="region"
                            aria-label={`عناصر فرعية لقسم ${item.label}`}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="overflow-hidden pe-3 ps-2 py-1 space-y-1 border-r-2 border-slate-200 ms-3 mr-3"
                          >
                            {item.children?.map((subItem) => {
                              const isSubActive =
                                pathname === subItem.href ||
                                activeSubItemHref === subItem.href;
                              const SubIcon = subItem.icon;

                              return (
                                <Link
                                  key={subItem.id}
                                  href={subItem.href}
                                  onClick={() => setIsMobileOpen(false)}
                                  aria-current={isSubActive ? "page" : undefined}
                                  className={cn(
                                    "group/sub relative flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85]/40",
                                    isSubActive
                                      ? "bg-teal-50 text-[#0c5961] font-extrabold border-r-3 border-r-[#137a85] shadow-2xs"
                                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-semibold"
                                  )}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {SubIcon && (
                                      <SubIcon
                                        className={cn(
                                          "w-3.5 h-3.5 shrink-0 stroke-[2.2] transition-colors",
                                          isSubActive ? "text-[#137a85]" : "text-slate-400 group-hover/sub:text-slate-700"
                                        )}
                                      />
                                    )}
                                    <span className="truncate">{subItem.label}</span>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {subItem.badgeCount !== undefined && subItem.badgeCount > 0 && (
                                      <span
                                        className={cn(
                                          "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold shadow-2xs",
                                          subItem.badgeVariant === "rose" && "bg-rose-500 text-white animate-pulse",
                                          subItem.badgeVariant === "amber" && "bg-amber-500 text-white",
                                          (!subItem.badgeVariant || subItem.badgeVariant === "teal") && "bg-teal-600 text-white"
                                        )}
                                      >
                                        {subItem.badgeCount}
                                      </span>
                                    )}
                                    {isSubActive && (
                                      <motion.span
                                        layoutId="active-sub-indicator"
                                        className="w-1.5 h-1.5 rounded-full bg-[#137a85]"
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

                // Standard Single Link Item (Dashboard, Teachers, Reports, Archive)
                return (
                  <Link
                    key={item.id}
                    href={item.href || "#"}
                    onClick={() => setIsMobileOpen(false)}
                    aria-current={isCurrentRoute ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "relative flex items-center rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85]/40",
                      collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
                      isCurrentRoute
                        ? "bg-teal-50 text-[#0c5961] font-extrabold border-r-3 border-r-[#137a85] shadow-2xs"
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
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-teal-600 rounded-full ring-2 ring-white" />
                      )}
                    </div>

                    {!collapsed && (
                      <span className="flex-1 whitespace-nowrap truncate">{item.label}</span>
                    )}

                    {!collapsed && item.badgeCount !== undefined && item.badgeCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-mono font-bold border border-slate-200 shrink-0">
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
