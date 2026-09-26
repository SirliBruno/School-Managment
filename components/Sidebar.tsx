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
  MessageCircle,
  Archive,
  HelpCircle,
  FileBarChart,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeachers } from "@/context/TeacherContext";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useSwipe } from "@/hooks/useSwipe";
import { useSidebar } from "@/context/SidebarContext";

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
    label: "المعلمات",
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
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSubItemHref,
  className,
}) => {
  const pathname = usePathname();
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

  // "الإجراءات الإدارية" is EXPANDED by default
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

  const renderSidebarContent = (isDrawer: boolean = false) => {
    const collapsed = isCollapsed && !isDrawer;

    return (
      <div className="flex flex-col h-full bg-white text-slate-800 select-none">
        {/* Top Header / Brand Section */}
        <div
          className={cn(
            "py-5 border-b border-slate-100 flex items-center transition-all",
            collapsed ? "px-3 justify-center" : "px-5 justify-between"
          )}
        >
          <Link
            href="/"
            onClick={() => setIsMobileOpen(false)}
            className="flex items-center gap-3 hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85]/40 rounded-xl p-1 group"
            aria-label="الانتقال إلى لوحة التحكم الرئيسية"
            title={collapsed ? "نظام الإدارة المدرسية" : undefined}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-2.5 rounded-xl bg-teal-50 text-[#137a85] border border-teal-100 flex items-center justify-center shadow-2xs group-hover:bg-teal-100/60 transition-colors shrink-0"
            >
              <Users className="w-5 h-5" aria-hidden="true" />
              <span
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse"
                aria-hidden="true"
              />
            </motion.div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="font-bold text-base tracking-tight text-slate-900 block truncate">
                  نظام الإدارة المدرسية
                </span>
                <span className="text-[11px] text-slate-500 font-medium block truncate">
                  بوابة وكيلة الشؤون التعليمية
                </span>
              </div>
            )}
          </Link>

          {/* Mobile close button (Drawer only) */}
          {isDrawer && (
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85] cursor-pointer"
              aria-label="إغلاق القائمة الجانبية"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
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
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "w-full flex items-center rounded-xl text-sm font-bold transition-all duration-200 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85]/40",
                      collapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5",
                      isOpen
                        ? "bg-slate-100/90 text-slate-950 font-bold"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                    )}
                  >
                    <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
                      <Icon
                        className={cn(
                          "w-5 h-5 transition-colors shrink-0",
                          isOpen ? "text-[#137a85]" : "text-slate-500 group-hover:text-slate-800"
                        )}
                        aria-hidden="true"
                      />
                      {!collapsed && (
                        <div className="flex items-center gap-2">
                          <span>{item.label}</span>
                          {item.id === "admin-procedures" &&
                            (pendingDirectorDelayCount > 0 || pendingAbsencesCount > 0) && (
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
                        transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                        className="overflow-hidden pe-7 ps-2 py-1 space-y-1 border-s-2 border-slate-300 ms-3"
                      >
                        {item.children?.map((subItem) => {
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
                                "relative block px-3 py-2 rounded-lg text-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85]/40",
                                isSubActive
                                  ? "bg-teal-50 text-[#0f666e] font-extrabold border-r-2 border-r-[#137a85] border-teal-200/90 shadow-2xs"
                                  : "text-slate-600 hover:text-slate-950 hover:bg-slate-100/80 font-medium"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span>{subItem.label}</span>
                                  {subItem.id === "delay-warning" && pendingDirectorDelayCount > 0 && (
                                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-2xs animate-pulse">
                                      {pendingDirectorDelayCount}
                                    </span>
                                  )}
                                  {subItem.id === "absence-inquiry" && pendingAbsencesCount > 0 && (
                                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold shadow-2xs">
                                      {pendingAbsencesCount}
                                    </span>
                                  )}
                                </div>
                                {isSubActive && (
                                  <motion.span
                                    layoutId="active-sub-dot"
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

            // Standard Single Link Item (e.g. Dashboard, Teachers)
            return (
              <Link
                key={item.id}
                href={item.href || "#"}
                onClick={() => setIsMobileOpen(false)}
                aria-current={isCurrentRoute ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "relative flex items-center rounded-xl text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85]/40",
                  collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
                  isCurrentRoute
                    ? "bg-teal-50 text-[#0f666e] font-extrabold border-r-2 border-r-[#137a85] border-teal-200/90 shadow-2xs"
                    : "text-slate-700 hover:text-slate-950 hover:bg-slate-50 font-bold"
                )}
              >
                {isCurrentRoute && (
                  <motion.div
                    layoutId="active-nav-indicator"
                    className="absolute end-0 top-1.5 bottom-1.5 w-1 bg-[#137a85] rounded-l-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <div className="relative">
                  <Icon
                    className={cn(
                      "w-5 h-5 shrink-0 transition-colors",
                      isCurrentRoute ? "text-[#137a85]" : "text-slate-500 group-hover:text-slate-800"
                    )}
                    aria-hidden="true"
                  />
                  {collapsed && item.id === "archive" && totalArchivedCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-slate-400 rounded-full ring-2 ring-white" />
                  )}
                </div>
                {!collapsed && <span className="flex-1">{item.label}</span>}
                {!collapsed && item.id === "archive" && totalArchivedCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold font-mono border border-slate-200">
                    {totalArchivedCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>



        {/* Footer Branding & Official Technical Support */}
        {!collapsed && (
          <div className="p-3 border-t border-slate-100 bg-slate-50/70 text-center space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
              <span>نظام الإدارة المدرسية</span>
              <span className="font-mono text-[10px] bg-slate-200/60 px-1.5 py-0.2 rounded text-slate-700">v2.4</span>
            </div>

            <Link
              href="/procedures/list"
              className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 hover:text-[#137a85] text-xs font-bold transition-all border border-slate-200/90 shadow-2xs flex items-center justify-center gap-2 group"
              title="الانتقال إلى قائمة الإجراءات والدعم الإداري"
            >
              <HelpCircle className="w-4 h-4 text-[#137a85] group-hover:scale-110 transition-transform" />
              <span>الدعم الفني والمساعدة</span>
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
