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
  ChevronLeft,
  ChevronRight,
  Settings,
  Building2,
  Database,
  KeyRound,
  Search,
  ListTodo,
  ShieldAlert,
  ClipboardList,
  Calendar,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSwipe } from "@/hooks/useSwipe";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth, DEFAULT_ADMIN_NAME, DEFAULT_ADMIN_ROLE_LABEL } from "@/context/AuthContext";
import { useTeachers } from "@/context/TeacherContext";
import { ApprovalAssetsModal } from "@/components/settings/ApprovalAssetsModal";
import { BackupRecoveryModal } from "@/components/settings/BackupRecoveryModal";
import { AdminProfileModal } from "@/components/auth/AdminProfileModal";
import {
  getActiveSchoolSettings,
  onSchoolSettingsChanged,
} from "@/lib/schoolSettingsService";
import { PLATFORM_LOGO_BASE64 } from "@/lib/platformLogo";

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
  subtitle: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  items: NavSubItem[];
}

export interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isCollapsed, toggleCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar();
  const [schoolSettings, setSchoolSettings] = useState(getActiveSchoolSettings());

  useEffect(() => {
    const unsub = onSchoolSettingsChanged((latest) => {
      setSchoolSettings(latest);
    });
    return unsub;
  }, []);

  // Admin Modals
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Mobile drawer search filter
  const [drawerSearchQuery, setDrawerSearchQuery] = useState("");

  // Swipe-to-close RTL
  const swipeHandlers = useSwipe(() => setIsMobileOpen(false), undefined, 45);

  // Auto close mobile drawer on route changes and unlock body scroll safely
  useEffect(() => {
    setIsMobileOpen(false);
    document.body.style.overflow = "";
  }, [pathname, setIsMobileOpen]);

  // Lock scroll on mobile open safely
  useEffect(() => {
    if (isMobileOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig === "hidden" ? "" : orig;
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [isMobileOpen]);

  // Escape key handler
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isMobileOpen, setIsMobileOpen]);

  // 4 Groups matching Reference Image perfectly
  const accordionGroups: NavAccordionGroup[] = useMemo(
    () => [
      {
        id: "daily-records",
        title: "العمل اليومي",
        subtitle: "إدارة السجلات اليومية للمعلمات",
        icon: Calendar,
        iconBg: "bg-blue-50 dark:bg-blue-950/60",
        iconColor: "text-blue-600 dark:text-blue-400",
        items: [
          {
            id: "teachers",
            label: "سجل المعلمات",
            description: "قائمة الكادر التعليمي وسجلاتهم",
            icon: Users,
            href: "/teachers",
          },
          {
            id: "absence-inquiry",
            label: "الغياب والمساءلات",
            description: "توثيق الغياب وإصدار مساءلات",
            icon: FileText,
            href: "/procedures/absence",
          },
          {
            id: "delay-notice",
            label: "التأخر والانصراف",
            description: "توثيق دقائق التأخر والخروج المبكر",
            icon: Clock,
            href: "/procedures/delay-notice",
          },
          {
            id: "permissions",
            label: "استئذان الموظفين",
            description: "إصدار وتوثيق تصاريح الخروج",
            icon: DoorOpen,
            href: "/procedures/permissions",
          },
        ],
      },
      {
        id: "procedures-decisions",
        title: "الإجراءات والقرارات",
        subtitle: "متابعة الإجراءات الإدارية",
        icon: Scale,
        iconBg: "bg-amber-50 dark:bg-amber-950/60",
        iconColor: "text-amber-600 dark:text-amber-400",
        items: [
          {
            id: "administrative-inquiries",
            label: "المساءلات الإدارية",
            description: "المساءلات الخطية للمخالفات",
            icon: Scale,
            href: "/procedures/administrative-inquiries",
          },
          {
            id: "deduction-hours",
            label: "قرارات الحسم",
            description: "احتساب وتطبيق قرارات الحسم",
            icon: ShieldAlert,
            href: "/procedures/deduction-hours",
          },
          {
            id: "procedures-list",
            label: "سجل الإجراءات",
            description: "استعراض والبحث في جميع الإجراءات",
            icon: ListTodo,
            href: "/procedures/list",
          },
        ],
      },
      {
        id: "reports-documentation",
        title: "التقارير والأرشيف",
        subtitle: "التقارير الرسمية والسجلات",
        icon: FileBarChart,
        iconBg: "bg-purple-50 dark:bg-purple-950/60",
        iconColor: "text-purple-600 dark:text-purple-400",
        items: [
          {
            id: "reports",
            label: "مركز التقارير",
            description: "التقارير الإحصائية والتحليلية ومسيرات الدوام",
            icon: FileBarChart,
            href: "/reports",
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
        subtitle: "إعدادات النظام والصلاحيات",
        icon: Settings,
        iconBg: "bg-slate-100 dark:bg-slate-800",
        iconColor: "text-slate-600 dark:text-slate-300",
        items: [
          {
            id: "school-assets",
            label: "إعدادات المدرسة",
            description: "تهيئة بيانات المدرسة واسم المديرة والختم",
            icon: Building2,
            onClick: () => setIsApprovalModalOpen(true),
          },
          {
            id: "backup-recovery",
            label: "النسخ الاحتياطي والاستعادة",
            description: "تصدير واستعادة نسخ احتياطية شاملة",
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

  // Accordion state
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => ({
    "daily-records": true,
    "procedures-decisions": true,
    "reports-documentation": false,
    "administration-settings": false,
  }));

  // Auto-expand group of active route
  useEffect(() => {
    for (const group of accordionGroups) {
      const containsActive = group.items.some(
        (item) => item.href && (pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)))
      );
      if (containsActive) {
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

  // Filter groups for mobile drawer
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
      <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-100 select-none p-3 sm:p-3.5 overflow-hidden">
        {/* Top Header Card (Teal Gradient with Floating Toggle Button) */}
        <div className="relative rounded-2xl bg-gradient-to-l from-[#0e6f7a] to-[#12828f] p-3.5 sm:p-4 text-white shadow-sm mb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-800 shrink-0 shadow-xs overflow-hidden p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={PLATFORM_LOGO_BASE64}
                alt="شعار منصة إدارتي المدرسية"
                className="w-full h-full object-contain"
              />
            </div>

            {!collapsed && (
              <div className="min-w-0 flex-1">
                <h1 className="font-bold text-sm sm:text-[15px] text-white tracking-tight truncate">
                  منصة إدارتي المدرسية
                </h1>
                <p className="text-[11px] text-teal-100 font-medium truncate">
                  {schoolSettings.schoolName || "الثانوية الخامسة مسارات"}
                </p>
              </div>
            )}
          </div>

          {/* Floating Collapse/Expand Button on Desktop Left Edge (in RTL) */}
          {!isDrawer && (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200/90 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 hover:scale-105 active:scale-95 transition-all z-30 cursor-pointer"
              title={collapsed ? "توسيع القائمة" : "طي القائمة"}
              aria-label={collapsed ? "توسيع القائمة" : "طي القائمة"}
            >
              {collapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronLeft className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Mobile Drawer Close Button */}
          {isDrawer && (
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="إغلاق القائمة"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Drawer Search on Mobile */}
        {isDrawer && (
          <div className="mb-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={drawerSearchQuery}
                onChange={(e) => setDrawerSearchQuery(e.target.value)}
                placeholder="تصفية الأقسام..."
                className="w-full bg-white dark:bg-slate-900 text-xs font-medium rounded-xl py-2 pr-9 pl-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 border border-slate-200/80 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0e6f7a]/30 shadow-2xs"
              />
            </div>
          </div>
        )}

        {/* Scrollable Navigation Area */}
        <nav
          className="flex-1 space-y-2.5 overflow-y-auto custom-scrollbar overscroll-contain pr-1 pl-1"
          aria-label="قائمة التصفح الرئيسية"
        >
          {/* 1. مركز القيادة Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs transition-all overflow-hidden">
            <Link
              href="/"
              onClick={() => setIsMobileOpen(false)}
              aria-current={isDashboardActive ? "page" : undefined}
              title={collapsed ? "مركز القيادة" : undefined}
              className={cn(
                "relative flex items-center transition-all duration-150 p-2.5 sm:p-3 group",
                collapsed ? "justify-center" : "gap-3",
                isDashboardActive
                  ? "bg-[#eefcf9] dark:bg-teal-950/40 text-[#0e6f7a] dark:text-teal-300"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              )}
            >
              {/* Right Accent Bar when Active */}
              {isDashboardActive && !collapsed && (
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-7 bg-[#0e6f7a] dark:bg-teal-400 rounded-full" />
              )}

              {/* Icon Container */}
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-colors",
                  isDashboardActive
                    ? "bg-[#ccfbf1] dark:bg-teal-900/60 text-[#0e6f7a] dark:text-teal-300"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200"
                )}
              >
                <LayoutDashboard className="w-5 h-5 stroke-[2]" />
              </div>

              {!collapsed && (
                <div className="flex-1 min-w-0 pr-1">
                  <span
                    className={cn(
                      "text-sm block truncate tracking-tight",
                      isDashboardActive
                        ? "font-bold text-[#0e6f7a] dark:text-teal-300"
                        : "font-semibold text-slate-800 dark:text-slate-100"
                    )}
                  >
                    مركز القيادة
                  </span>
                  <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500 block truncate">
                    متابعة المهام اليومية والرادار
                  </span>
                </div>
              )}
            </Link>
          </div>

          {/* 2. Accordion Groups (Clean White Cards) */}
          {filteredGroups.map((group) => {
            const GroupIcon = group.icon;
            const isExpanded = Boolean(expandedGroups[group.id]) || Boolean(drawerSearchQuery);
            const isGroupActive = group.items.some(
              (item) => item.href && pathname === item.href
            );

            return (
              <div
                key={group.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs p-2.5 transition-all"
              >
                {/* Group Header Button */}
                {!collapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center justify-between p-1 rounded-xl transition-colors cursor-pointer group"
                    aria-expanded={isExpanded}
                    aria-controls={`accordion-content-${group.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs",
                          group.iconBg,
                          group.iconColor
                        )}
                      >
                        <GroupIcon className="w-4.5 h-4.5 stroke-[2]" />
                      </div>

                      <div className="text-right min-w-0">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block truncate">
                          {group.title}
                        </span>
                        <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500 block truncate">
                          {group.subtitle}
                        </span>
                      </div>
                    </div>

                    <div className="w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors shrink-0">
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 transition-transform duration-250 ease-in-out",
                          isExpanded ? "rotate-180" : ""
                        )}
                      />
                    </div>
                  </button>
                ) : (
                  /* Collapsed View Group Button */
                  <div
                    className="p-1 flex justify-center cursor-pointer"
                    title={group.title}
                    onClick={() => toggleGroup(group.id)}
                  >
                    <div
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs",
                        group.iconBg,
                        group.iconColor
                      )}
                    >
                      <GroupIcon className="w-4.5 h-4.5" />
                    </div>
                  </div>
                )}

                {/* Sub-items List with Timeline Connecting Branch Line */}
                <AnimatePresence initial={false}>
                  {(isExpanded || collapsed) && (
                    <motion.div
                      id={`accordion-content-${group.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: "easeInOut" }}
                      className={cn(
                        "overflow-hidden pt-2",
                        !collapsed &&
                          "relative pr-2.5 space-y-1 before:absolute before:right-[26px] before:top-3 before:bottom-3 before:w-[1.5px] before:bg-slate-100 dark:before:bg-slate-800/80"
                      )}
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
                                "relative flex items-center transition-all duration-150 rounded-xl group",
                                collapsed ? "justify-center p-2" : "gap-3 px-2.5 py-2.5",
                                isCurrentRoute
                                  ? "bg-[#eefcf9] dark:bg-teal-950/40 text-[#0e6f7a] dark:text-teal-300"
                                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                              )}
                            >
                              {/* Right Accent Bar when Active */}
                              {isCurrentRoute && !collapsed && (
                                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#0e6f7a] dark:bg-teal-400 rounded-full" />
                              )}

                              {/* Timeline Node Dot */}
                              {!collapsed && (
                                <span
                                  className={cn(
                                    "w-2 h-2 rounded-full shrink-0 z-10 transition-colors",
                                    isCurrentRoute
                                      ? "bg-[#0e6f7a] ring-3 ring-[#ccfbf1] dark:ring-teal-950"
                                      : "bg-slate-300 dark:bg-slate-700 group-hover:bg-slate-400"
                                  )}
                                />
                              )}

                              <SubIcon
                                className={cn(
                                  "w-4 h-4 shrink-0 transition-colors",
                                  isCurrentRoute
                                    ? "text-[#0e6f7a] dark:text-teal-400"
                                    : "text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300"
                                )}
                              />

                              {!collapsed && (
                                <div className="flex-1 min-w-0 pr-0.5">
                                  <span
                                    className={cn(
                                      "text-xs sm:text-[13px] block truncate",
                                      isCurrentRoute
                                        ? "font-bold text-[#0e6f7a] dark:text-teal-300"
                                        : "font-semibold text-slate-800 dark:text-slate-200"
                                    )}
                                  >
                                    {subItem.label}
                                  </span>
                                  <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500 block truncate">
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
                              "w-full relative flex items-center transition-all duration-150 rounded-xl text-right cursor-pointer group",
                              collapsed ? "justify-center p-2" : "gap-3 px-2.5 py-2.5",
                              "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                            )}
                          >
                            {!collapsed && (
                              <span className="w-2 h-2 rounded-full shrink-0 z-10 bg-slate-300 dark:bg-slate-700 group-hover:bg-slate-400" />
                            )}

                            <SubIcon className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300" />

                            {!collapsed && (
                              <div className="flex-1 min-w-0 pr-0.5">
                                <span className="text-xs sm:text-[13px] font-semibold text-slate-800 dark:text-slate-200 block truncate">
                                  {subItem.label}
                                </span>
                                <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500 block truncate">
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
        </nav>

        {/* Bottom Profile Card (أحلام صالح الضبيبي - وكيلة المدرسة) */}
        <div className="pt-2 mt-auto shrink-0">
          <div
            onClick={() => setIsProfileModalOpen(true)}
            className={cn(
              "bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xs p-3 flex items-center justify-between cursor-pointer hover:border-teal-200 dark:hover:border-teal-800/80 transition-all group",
              collapsed ? "justify-center" : "gap-3"
            )}
            title="الملف الإداري والصلاحيات"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#ccfbf1] dark:bg-teal-950/80 text-[#0e6f7a] dark:text-teal-300 font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">
                {user?.fullName?.trim().charAt(0) || "أ"}
              </div>

              {!collapsed && (
                <div className="min-w-0 text-right">
                  <span className="font-bold text-xs sm:text-[13px] text-slate-900 dark:text-slate-100 block truncate">
                    {user?.fullName || DEFAULT_ADMIN_NAME}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium block truncate">
                    {user?.role === "principal" ? "مديرة المدرسة" : DEFAULT_ADMIN_ROLE_LABEL}
                  </span>
                </div>
              )}
            </div>

            {!collapsed && (
              <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors shrink-0" />
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside
        aria-label="شريط القائمة الجانبية"
        className={cn(
          "hidden lg:block shrink-0 transition-all duration-300 ease-in-out h-[calc(100vh-72px)] sticky top-[72px] z-20",
          isCollapsed ? "w-20" : "w-72 xl:w-80",
          className
        )}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" dir="rtl">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
              onClick={() => setIsMobileOpen(false)}
              aria-hidden="true"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed inset-y-0 right-0 w-84 max-w-[88vw] bg-[#f8fafc] dark:bg-slate-950 shadow-2xl z-50 flex flex-col"
              {...swipeHandlers}
            >
              {renderSidebarContent(true)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Modals */}
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
