"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  LayoutDashboard,
  Archive,
  FileBarChart,
  FileText,
  Clock,
  DoorOpen,
  Scale,
  GraduationCap,
  X,
  ChevronDown,
  Settings,
  Building2,
  Database,
  KeyRound,
  Search,
  ListTodo,
  ShieldAlert,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSwipe } from "@/hooks/useSwipe";
import { useSidebar } from "@/context/SidebarContext";
import { ApprovalAssetsModal } from "@/components/settings/ApprovalAssetsModal";
import { BackupRecoveryModal } from "@/components/settings/BackupRecoveryModal";
import { AdminProfileModal } from "@/components/auth/AdminProfileModal";

export interface NavSubItem {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
}

export interface NavAccordionGroup {
  id: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  items: NavSubItem[];
}

export interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const pathname = usePathname();
  const { isCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar();

  // Admin Quick Action Modal states
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Mobile drawer search filter query
  const [drawerSearchQuery, setDrawerSearchQuery] = useState("");

  // Swipe-to-close for RTL (swiping right closes drawer)
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

  // Define 4 Workflow Groups + Root Command Center
  const accordionGroups: NavAccordionGroup[] = useMemo(
    () => [
      {
        id: "daily-records",
        title: "العمل اليومي",
        subtitle: "توثيق العمليات والوقائع اليومية ومتابعتها",
        icon: ClipboardList,
        items: [
          {
            id: "teachers",
            label: "سجل المعلمات",
            description: "قائمة الكادر التعليمي وسجلات الغياب والبيانات الوظيفية",
            icon: Users,
            href: "/teachers",
          },
          {
            id: "absence-inquiry",
            label: "الغياب والمساءلات",
            description: "توثيق الغياب وإصدار مسائلات الواتساب واستلام الإفادات",
            icon: FileText,
            href: "/procedures/absence",
          },
          {
            id: "delay-notice",
            label: "التأخر والانصراف",
            description: "توثيق دقائق التأخر والخروج المبكر وتنبيهات الحسم",
            icon: Clock,
            href: "/procedures/delay-notice",
          },
          {
            id: "permissions",
            label: "استئذان الموظفين",
            description: "إصدار وتوثيق تصاريح الخروج والاستئذان الرسمي",
            icon: DoorOpen,
            href: "/procedures/permissions",
          },
        ],
      },
      {
        id: "procedures-decisions",
        title: "الإجراءات والقرارات",
        subtitle: "المسائلات الخطية، قرارات الحسم، والاعتمادات الإدارية",
        icon: Scale,
        items: [
          {
            id: "administrative-inquiries",
            label: "المسائلات الإدارية",
            description: "المسائلات الخطية للمخالفات الإدارية وفق النموذج الرسمي",
            icon: Scale,
            href: "/procedures/administrative-inquiries",
          },
          {
            id: "deduction-hours",
            label: "قرارات الحسم",
            description: "احتساب وتطبيق قرارات الحسم المالي للدقائق وساعات التأخر",
            icon: ShieldAlert,
            href: "/procedures/deduction-hours",
          },
          {
            id: "procedures-list",
            label: "سجل الإجراءات",
            description: "استعراض والبحث في جميع الإجراءات والمعاملات الإدارية",
            icon: ListTodo,
            href: "/procedures/list",
          },
        ],
      },
      {
        id: "reports-documentation",
        title: "التقارير والأرشيف",
        subtitle: "التقارير الرسمية، السجل التراكمي، والأرشيف الإداري",
        icon: FileBarChart,
        items: [
          {
            id: "reports",
            label: "مركز التقارير",
            description: "التقارير الإحصائية والتحليلية ومسيرات الدوام",
            icon: FileBarChart,
            href: "/reports",
          },
          {
            id: "teachers-records",
            label: "السجل الإداري للمعلمة",
            description: "السجل التراكمي الشامل للإجراءات والغياب لكل معلمة",
            icon: GraduationCap,
            href: "/teachers",
          },
          {
            id: "archive",
            label: "الأرشيف الإداري",
            description: "سجلات العناصر المؤرشفة مع إمكانية الاستعادة",
            icon: Archive,
            href: "/archive",
          },
        ],
      },
      {
        id: "administration-settings",
        title: "الإدارة",
        subtitle: "تهيئة المدرسة، الأختام المعتمدة، والنسخ الاحتياطي",
        icon: Settings,
        items: [
          {
            id: "school-assets",
            label: "إعدادات المدرسة",
            description: "تهيئة بيانات المدرسة واسم المديرة والختم والتوقيع",
            icon: Building2,
            onClick: () => setIsApprovalModalOpen(true),
          },
          {
            id: "backup-recovery",
            label: "النسخ الاحتياطي",
            description: "تصدير واستعادة نسخ احتياطية شاملة لقاعدة البيانات",
            icon: Database,
            onClick: () => setIsBackupModalOpen(true),
          },
          {
            id: "admin-profile",
            label: "الصلاحيات",
            description: "إدارة بيانات حساب وكيلة المدرسة وتغيير رمز الدخول",
            icon: KeyRound,
            onClick: () => setIsProfileModalOpen(true),
          },
        ],
      },
    ],
    []
  );

  // Accordion open/close state
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => ({
    "daily-records": true,
    "procedures-decisions": true,
    "reports-documentation": false,
    "administration-settings": false,
  }));

  // Auto-expand group when active route changes
  useEffect(() => {
    for (const group of accordionGroups) {
      const containsActiveRoute = group.items.some(
        (item) => item.href && (pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)))
      );
      if (containsActiveRoute) {
        setExpandedGroups((prev) => ({ ...prev, [group.id]: true }));
      }
    }
  }, [pathname, accordionGroups]);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  }, []);

  const isDashboardActive = pathname === "/";

  // Filter groups for mobile drawer search
  const filteredGroups = useMemo(() => {
    const q = drawerSearchQuery.trim().toLowerCase();
    if (!q) return accordionGroups;

    return accordionGroups
      .map((group) => {
        const matchesGroup = group.title.toLowerCase().includes(q);
        const matchedItems = group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q)
        );
        if (matchesGroup) return group;
        if (matchedItems.length > 0) return { ...group, items: matchedItems };
        return null;
      })
      .filter((g): g is NavAccordionGroup => g !== null);
  }, [accordionGroups, drawerSearchQuery]);

  const renderSidebarContent = (isDrawer: boolean = false) => {
    const collapsed = isCollapsed && !isDrawer;

    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 select-none border-l border-slate-200/80 dark:border-slate-800">
        {/* Drawer Header (Mobile Only) */}
        {isDrawer && (
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/90">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-[#137a85] dark:text-teal-400 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 stroke-[2.2]" />
              </div>
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                القائمة الإدارية
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="إغلاق القائمة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Mobile Search Input in Drawer */}
        {isDrawer && (
          <div className="p-3 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={drawerSearchQuery}
                onChange={(e) => setDrawerSearchQuery(e.target.value)}
                placeholder="تصفية الأقسام..."
                className="w-full bg-slate-50 dark:bg-slate-800/80 text-xs font-medium rounded-xl py-2 pr-9 pl-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 border border-slate-200/80 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#137a85]/30"
              />
            </div>
          </div>
        )}

        {/* Navigation Content: Clean Layout, Increased Padding, Cairo Typography */}
        <nav
          className="flex-1 px-3 py-4 space-y-3 overflow-y-auto custom-scrollbar"
          aria-label="قائمة التصفح الرئيسية"
        >
          {/* Main Root Item: 🏠 مركز القيادة (Dashboard) */}
          <div>
            <Link
              href="/"
              onClick={() => setIsMobileOpen(false)}
              aria-current={isDashboardActive ? "page" : undefined}
              title={collapsed ? "مركز القيادة" : undefined}
              className={cn(
                "relative flex items-center rounded-xl transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85]/40",
                collapsed ? "justify-center p-3" : "gap-3 px-3 py-3",
                isDashboardActive
                  ? "bg-teal-50/90 dark:bg-teal-950/40 text-[#137a85] dark:text-teal-300 font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium"
              )}
            >
              <LayoutDashboard
                className={cn(
                  "w-5 h-5 shrink-0 stroke-[2] transition-colors",
                  isDashboardActive
                    ? "text-[#137a85] dark:text-teal-400"
                    : "text-slate-400 dark:text-slate-500"
                )}
                aria-hidden="true"
              />

              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold block truncate">مركز القيادة</span>
                  <span className="text-xs font-normal text-slate-400 dark:text-slate-500 block truncate">
                    متابعة المهام اليومية والرادار
                  </span>
                </div>
              )}
            </Link>
          </div>

          {/* Clean Divider */}
          <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

          {/* Workflow Groups: Clean Accordion without Card Frames */}
          <div className="space-y-3">
            {filteredGroups.map((group) => {
              const GroupIcon = group.icon;
              const isExpanded = Boolean(expandedGroups[group.id]) || Boolean(drawerSearchQuery);
              const isGroupActive = group.items.some(
                (item) => item.href && pathname === item.href
              );

              return (
                <div key={group.id} className="space-y-1">
                  {/* Group Header Button */}
                  {!collapsed ? (
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85]/40 cursor-pointer",
                        isGroupActive
                          ? "text-[#137a85] dark:text-teal-400 font-semibold"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                      )}
                      aria-expanded={isExpanded}
                      aria-controls={`accordion-content-${group.id}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <GroupIcon
                          className={cn(
                            "w-4 h-4 shrink-0 transition-colors",
                            isGroupActive ? "text-[#137a85] dark:text-teal-400" : "text-slate-400 dark:text-slate-500"
                          )}
                          aria-hidden="true"
                        />
                        <span className="text-[13px] font-semibold tracking-wide truncate">
                          {group.title}
                        </span>
                      </div>

                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-slate-400 transition-transform duration-200",
                          isExpanded ? "rotate-180" : ""
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  ) : (
                    /* Collapsed Group Header Icon */
                    <div
                      className="px-2 py-1 flex justify-center cursor-pointer"
                      title={group.title}
                      onClick={() => toggleGroup(group.id)}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-[#137a85] dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <GroupIcon className="w-4 h-4" />
                      </div>
                    </div>
                  )}

                  {/* Clean Sub-items (No Busy Badges, Clean Active Teal) */}
                  <AnimatePresence initial={false}>
                    {(isExpanded || collapsed) && (
                      <motion.div
                        id={`accordion-content-${group.id}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15, ease: "easeInOut" }}
                        className={cn("overflow-hidden space-y-1", !collapsed && "ps-2")}
                      >
                        {group.items.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const isCurrentRoute = subItem.href ? pathname === subItem.href : false;

                          if (subItem.href) {
                            return (
                              <Link
                                key={subItem.id}
                                href={subItem.href}
                                onClick={() => setIsMobileOpen(false)}
                                aria-current={isCurrentRoute ? "page" : undefined}
                                title={collapsed ? `${subItem.label} — ${subItem.description}` : undefined}
                                className={cn(
                                  "relative flex items-center rounded-xl transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85]/40",
                                  collapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2.5",
                                  isCurrentRoute
                                    ? "bg-teal-50/90 dark:bg-teal-950/40 text-[#137a85] dark:text-teal-300 font-semibold"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium"
                                )}
                              >
                                <SubIcon
                                  className={cn(
                                    "w-4 h-4 shrink-0 transition-colors",
                                    isCurrentRoute
                                      ? "text-[#137a85] dark:text-teal-400"
                                      : "text-slate-400 dark:text-slate-500"
                                  )}
                                  aria-hidden="true"
                                />

                                {!collapsed && (
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium block truncate">
                                      {subItem.label}
                                    </span>
                                    <span className="text-xs font-normal text-slate-400 dark:text-slate-500 block truncate">
                                      {subItem.description}
                                    </span>
                                  </div>
                                )}
                              </Link>
                            );
                          }

                          return (
                            <button
                              key={subItem.id}
                              type="button"
                              onClick={() => {
                                setIsMobileOpen(false);
                                subItem.onClick?.();
                              }}
                              title={collapsed ? `${subItem.label} — ${subItem.description}` : undefined}
                              className={cn(
                                "w-full relative flex items-center rounded-xl transition-colors duration-150 text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85]/40 cursor-pointer",
                                collapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2.5",
                                "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium"
                              )}
                            >
                              <SubIcon
                                className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500"
                                aria-hidden="true"
                              />

                              {!collapsed && (
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium block truncate">
                                    {subItem.label}
                                  </span>
                                  <span className="text-xs font-normal text-slate-400 dark:text-slate-500 block truncate">
                                    {subItem.description}
                                  </span>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </nav>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Persistent Sidebar (Docked under 72px Navbar) */}
      <aside
        aria-label="شريط القائمة الجانبية"
        className={cn(
          "hidden lg:block shrink-0 transition-all duration-300 ease-in-out h-[calc(100vh-72px)] sticky top-[72px] z-20",
          isCollapsed ? "w-18" : "w-64 xl:w-70",
          className
        )}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile / Tablet Drawer Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" dir="rtl">
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
              onClick={() => setIsMobileOpen(false)}
              aria-hidden="true"
            />

            {/* Drawer Panel Sliding from Right */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col"
              {...swipeHandlers}
            >
              {renderSidebarContent(true)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive Admin Modals Triggerable directly from Sidebar */}
      <ApprovalAssetsModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
      />

      <BackupRecoveryModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />

      <AdminProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};
