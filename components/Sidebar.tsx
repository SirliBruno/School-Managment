"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Scale,
  GraduationCap,
  X,
  MessageCircle,
  ChevronDown,
  Settings,
  Building2,
  Database,
  KeyRound,
  ShieldCheck,
  ClipboardList,
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
  badgeCount?: number;
  badgeLabel?: string;
  badgeVariant?: "rose" | "amber" | "teal" | "slate";
}

export interface NavAccordionGroup {
  id: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  items: NavSubItem[];
  groupBadgeCount?: number;
  groupBadgeText?: string;
  groupBadgeVariant?: "rose" | "amber" | "teal" | "slate";
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
    archivedAdministrativeInquiries,
    administrativeInquiries,
  } = useTeachers();
  const { isCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar();

  // Admin Modal triggers
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Active hover tooltip state for collapsed view
  const [activeTooltip, setActiveTooltip] = useState<{
    title: string;
    description: string;
    y: number;
  } | null>(null);

  // Calculate live badge counts
  const pendingDirectorDelayCount = stats.pendingDelayNotices;
  const pendingAbsencesCount = Math.max(0, stats.pendingProcedures - stats.pendingDelayNotices);
  const pendingAdminInquiriesCount = (administrativeInquiries || []).filter(
    (i) => i.status === "pending_teacher" || i.status === "pending_director"
  ).length;
  const totalArchivedCount =
    (archivedTeachers?.length || 0) +
    (archivedAbsences?.length || 0) +
    (archivedDelayNotices?.length || 0) +
    (archivedAdministrativeInquiries?.length || 0);

  // Total pending decisions across procedures
  const totalProceduresPendingCount = pendingDirectorDelayCount + pendingAdminInquiriesCount;

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

  // Define 5 Main Administrative Workflow Groups
  const accordionGroups: NavAccordionGroup[] = useMemo(
    () => [
      {
        id: "daily-records",
        title: "السجلات اليومية",
        subtitle: "توثيق العمليات والوقائع اليومية ومتابعتها",
        icon: ClipboardList,
        groupBadgeCount: pendingAbsencesCount > 0 ? pendingAbsencesCount : undefined,
        groupBadgeText: pendingAbsencesCount > 0 ? `${pendingAbsencesCount} نشط` : undefined,
        groupBadgeVariant: "amber",
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
            badgeCount: pendingAbsencesCount,
            badgeLabel: pendingAbsencesCount > 0 ? `${pendingAbsencesCount} بانتظار الإجراء` : undefined,
            badgeVariant: "amber",
          },
          {
            id: "delay-notice",
            label: "التأخر والانصراف",
            description: "توثيق دقائق التأخر والخروج المبكر وتنبيهات الحسم",
            icon: Clock,
            href: "/procedures/delay-notice",
            badgeCount: pendingDirectorDelayCount,
            badgeLabel: pendingDirectorDelayCount > 0 ? `${pendingDirectorDelayCount} بانتظار الاعتماد` : undefined,
            badgeVariant: "rose",
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
        groupBadgeCount: totalProceduresPendingCount > 0 ? totalProceduresPendingCount : undefined,
        groupBadgeText: totalProceduresPendingCount > 0 ? `${totalProceduresPendingCount} تحتاج اعتماد` : undefined,
        groupBadgeVariant: "rose",
        items: [
          {
            id: "administrative-inquiries",
            label: "المسائلات الإدارية",
            description: "المسائلات الخطية للمخالفات الإدارية وفق النموذج الرسمي",
            icon: Scale,
            href: "/procedures/administrative-inquiries",
            badgeCount: pendingAdminInquiriesCount,
            badgeLabel: pendingAdminInquiriesCount > 0 ? `${pendingAdminInquiriesCount} بانتظار المراجعة` : undefined,
            badgeVariant: "rose",
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
            label: "سجل الإجراءات الشامل",
            description: "استعراض والبحث في جميع الإجراءات والمعاملات الإدارية المعتمدة",
            icon: ListTodo,
            href: "/procedures/list",
          },
        ],
      },
      {
        id: "reports-documentation",
        title: "التقارير والتوثيق",
        subtitle: "التقارير الرسمية، السجل التراكمي، والأرشيف الإداري",
        icon: FileBarChart,
        groupBadgeCount: totalArchivedCount > 0 ? totalArchivedCount : undefined,
        groupBadgeText: totalArchivedCount > 0 ? `${totalArchivedCount} مؤرشف` : undefined,
        groupBadgeVariant: "slate",
        items: [
          {
            id: "reports",
            label: "مركز التقارير",
            description: "التقارير الإحصائية والتحليلية الشاملة ومسيرات الدوام",
            icon: FileBarChart,
            href: "/reports",
          },
          {
            id: "teachers-records",
            label: "السجل الإداري الشامل للمعلمة",
            description: "السجل التراكمي الشامل للإجراءات والغياب لكل معلمة",
            icon: GraduationCap,
            href: "/teachers",
          },
          {
            id: "archive",
            label: "الأرشيف الإداري",
            description: "سجلات العناصر المؤرشفة مع إمكانية الاستعادة الفورية",
            icon: Archive,
            href: "/archive",
            badgeCount: totalArchivedCount,
            badgeVariant: "slate",
          },
        ],
      },
      {
        id: "administration-settings",
        title: "الإدارة والتهيئة",
        subtitle: "تهيئة المدرسة، الأختام المعتمدة، والنسخ الاحتياطي",
        icon: Settings,
        items: [
          {
            id: "school-assets",
            label: "إعدادات المدرسة والأختام",
            description: "تهيئة بيانات المدرسة واسم المديرة والختم والتوقيع الرقمي",
            icon: Building2,
            onClick: () => setIsApprovalModalOpen(true),
          },
          {
            id: "backup-recovery",
            label: "النسخ الاحتياطي والاستعادة",
            description: "تصدير واستعادة نسخ احتياطية شاملة لقاعدة البيانات",
            icon: Database,
            onClick: () => setIsBackupModalOpen(true),
          },
          {
            id: "admin-profile",
            label: "صلاحيات وحساب الإدارة",
            description: "إدارة بيانات حساب وكيلة المدرسة وتغيير رمز الدخول",
            icon: KeyRound,
            onClick: () => setIsProfileModalOpen(true),
          },
        ],
      },
    ],
    [
      pendingAbsencesCount,
      pendingDirectorDelayCount,
      pendingAdminInquiriesCount,
      totalProceduresPendingCount,
      totalArchivedCount,
    ]
  );

  // Accordion open/close state:
  // Auto-expand group that contains active pathname, default expand Daily Records and Procedures
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {
      "daily-records": true,
      "procedures-decisions": true,
      "reports-documentation": false,
      "administration-settings": false,
    };
    return initialState;
  });

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

  const renderSidebarContent = (isDrawer: boolean = false) => {
    const collapsed = isCollapsed && !isDrawer;

    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 select-none border-l border-slate-200/80 dark:border-slate-800">
        {/* 1. Brand Header */}
        <div
          className={cn(
            "py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center transition-all bg-gradient-to-b from-slate-50/70 to-white dark:from-slate-900/90 dark:to-slate-900",
            collapsed ? "px-3 justify-center" : "px-4.5 justify-between"
          )}
        >
          <Link
            href="/"
            onClick={() => setIsMobileOpen(false)}
            className="flex items-center gap-3 hover:opacity-95 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85]/40 rounded-2xl p-1 group"
            aria-label="الانتقال إلى مركز القيادة الرئيسي"
            title={collapsed ? "منصة الإدارة المدرسية — مركز القيادة" : undefined}
          >
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-[#137a85] to-[#0d5961] text-white flex items-center justify-center shadow-xs shrink-0"
            >
              <GraduationCap className="w-5 h-5 stroke-[2.2]" aria-hidden="true" />
              <span
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse"
                aria-hidden="true"
              />
            </motion.div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="font-extrabold text-[15px] tracking-tight text-slate-900 dark:text-slate-100 block truncate">
                  منصة الإدارة المدرسية
                </span>
                <span className="text-[11px] text-teal-700 dark:text-teal-400 font-semibold block truncate">
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
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85] cursor-pointer"
              aria-label="إغلاق القائمة الجانبية"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* 2. Navigation Content */}
        <nav
          className="flex-1 px-2.5 py-3 space-y-2.5 overflow-y-auto custom-scrollbar"
          aria-label="قائمة التصفح الرئيسية"
        >
          {/* Main Root: 🏠 مركز القيادة (Dashboard) */}
          <div className="mb-2">
            <Link
              href="/"
              onClick={() => setIsMobileOpen(false)}
              aria-current={isDashboardActive ? "page" : undefined}
              title={collapsed ? "مركز القيادة — متابعة المهام اليومية والرادار" : undefined}
              className={cn(
                "relative flex items-center rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85]/40",
                collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
                isDashboardActive
                  ? "bg-teal-50/90 dark:bg-teal-950/60 text-[#0c5961] dark:text-teal-300 font-extrabold border-r-4 border-r-[#137a85] dark:border-r-teal-400 shadow-2xs"
                  : "text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60 font-bold"
              )}
            >
              <div className="relative shrink-0">
                <LayoutDashboard
                  className={cn(
                    "w-5 h-5 shrink-0 stroke-[2] transition-colors",
                    isDashboardActive
                      ? "text-[#137a85] dark:text-teal-400"
                      : "text-slate-400 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-200"
                  )}
                  aria-hidden="true"
                />
                {collapsed && stats.pendingProcedures > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse ring-2 ring-white dark:ring-slate-900" />
                )}
              </div>

              {!collapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="truncate">مركز القيادة</span>
                  {stats.pendingProcedures > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse">
                      {stats.pendingProcedures} تحتاج إجراء
                    </span>
                  )}
                </div>
              )}
            </Link>
          </div>

          {/* 3. Accordion Workflow Groups */}
          <div className="space-y-2">
            {accordionGroups.map((group) => {
              const GroupIcon = group.icon;
              const isExpanded = Boolean(expandedGroups[group.id]);
              const isGroupActive = group.items.some(
                (item) => item.href && pathname === item.href
              );

              return (
                <div
                  key={group.id}
                  className={cn(
                    "rounded-2xl transition-colors border",
                    isExpanded && !collapsed
                      ? "bg-slate-50/50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800"
                      : "border-transparent"
                  )}
                >
                  {/* Group Header Button (Accordion Toggle) */}
                  {!collapsed ? (
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85]/40 cursor-pointer",
                        isGroupActive
                          ? "text-[#137a85] dark:text-teal-400 font-extrabold"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
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
                        <span className="truncate">{group.title}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {group.groupBadgeText && !isExpanded && (
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded-md text-[10px] font-bold font-mono",
                              group.groupBadgeVariant === "rose" &&
                                "bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 animate-pulse border border-rose-200 dark:border-rose-800",
                              group.groupBadgeVariant === "amber" &&
                                "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
                              (!group.groupBadgeVariant || group.groupBadgeVariant === "slate") &&
                                "bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                            )}
                          >
                            {group.groupBadgeText}
                          </span>
                        )}
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 text-slate-400 transition-transform duration-200",
                            isExpanded ? "rotate-180 text-slate-700 dark:text-slate-300" : ""
                          )}
                          aria-hidden="true"
                        />
                      </div>
                    </button>
                  ) : (
                    /* Collapsed Group Header Icon */
                    <div
                      className="px-2 py-1 flex justify-center cursor-pointer"
                      title={group.title}
                      onClick={() => toggleGroup(group.id)}
                    >
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-[#137a85] dark:hover:text-teal-400 transition-colors">
                        <GroupIcon className="w-4 h-4" />
                      </div>
                    </div>
                  )}

                  {/* Accordion Subitems List */}
                  <AnimatePresence initial={false}>
                    {(isExpanded || collapsed) && (
                      <motion.div
                        id={`accordion-content-${group.id}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18, ease: "easeInOut" }}
                        className={cn("overflow-hidden", !collapsed ? "pt-1 pb-1 space-y-1" : "space-y-1")}
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
                                  "relative flex items-center rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85]/40 group",
                                  collapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2 pr-4",
                                  isCurrentRoute
                                    ? "bg-teal-50/90 dark:bg-teal-950/60 text-[#0c5961] dark:text-teal-300 font-extrabold border-r-3 border-r-[#137a85] dark:border-r-teal-400 shadow-2xs"
                                    : "text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60 font-bold"
                                )}
                              >
                                <div className="relative shrink-0">
                                  <SubIcon
                                    className={cn(
                                      "w-4 h-4 shrink-0 stroke-[2] transition-colors",
                                      isCurrentRoute
                                        ? "text-[#137a85] dark:text-teal-400"
                                        : "text-slate-400 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-200"
                                    )}
                                    aria-hidden="true"
                                  />
                                  {collapsed && subItem.badgeCount !== undefined && subItem.badgeCount > 0 && (
                                    <span
                                      className={cn(
                                        "absolute -top-1 -right-1 w-2 h-2 rounded-full ring-2 ring-white dark:ring-slate-900",
                                        subItem.badgeVariant === "rose" && "bg-rose-500 animate-pulse",
                                        subItem.badgeVariant === "amber" && "bg-amber-500",
                                        (!subItem.badgeVariant || subItem.badgeVariant === "slate") && "bg-slate-400"
                                      )}
                                    />
                                  )}
                                </div>

                                {!collapsed && (
                                  <div className="flex-1 flex items-center justify-between min-w-0">
                                    <span className="truncate">{subItem.label}</span>
                                    {subItem.badgeCount !== undefined && subItem.badgeCount > 0 && (
                                      <span
                                        className={cn(
                                          "px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0",
                                          subItem.badgeVariant === "rose" &&
                                            "bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse",
                                          subItem.badgeVariant === "amber" &&
                                            "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
                                          (!subItem.badgeVariant || subItem.badgeVariant === "slate") &&
                                            "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                        )}
                                      >
                                        {subItem.badgeLabel || subItem.badgeCount}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </Link>
                            );
                          }

                          // Action / Modal Trigger Button
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
                                "w-full relative flex items-center rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85]/40 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60 cursor-pointer group",
                                collapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2 pr-4"
                              )}
                            >
                              <SubIcon
                                className="w-4 h-4 shrink-0 stroke-[2] text-slate-400 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors"
                                aria-hidden="true"
                              />
                              {!collapsed && <span className="truncate">{subItem.label}</span>}
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

        {/* 4. Footer Admin User Identity Card & System State */}
        {!collapsed ? (
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 text-right space-y-2.5">
            {/* Identity Card */}
            <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200/80 dark:border-teal-800 text-[#137a85] dark:text-teal-400 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                {user?.fullName?.trim().charAt(0) || DEFAULT_ADMIN_NAME.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {user?.fullName || DEFAULT_ADMIN_NAME}
                </p>
                <p className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold truncate">
                  {user?.role === "principal" ? "مديرة المدرسة" : DEFAULT_ADMIN_ROLE_LABEL}
                </p>
              </div>
            </div>

            {/* System Status Pill */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-emerald-800 dark:text-emerald-400 font-bold">النظام متصل ومحدث</span>
              </div>
              <span className="font-mono text-[10px] bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300 font-bold">
                v2.5
              </span>
            </div>

            {/* Developer Card & WhatsApp Inquiries */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400 font-medium">تطوير المنصة:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">محمد هارون</span>
              </div>
              <a
                href="https://wa.me/966557013720"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100/90 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/70 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition-all border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center gap-2 group cursor-pointer shadow-2xs"
                title="للاستفسارات والملاحظات عبر الواتساب (0557013720)"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                <span>للاستفسارات والملاحظات (واتساب)</span>
              </a>
            </div>

            {/* Quick Support / Procedures Link */}
            <Link
              href="/procedures/list"
              className="w-full py-1.5 px-3 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#137a85] dark:hover:text-teal-300 text-[11px] font-semibold transition-all border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center gap-1.5 group whitespace-nowrap cursor-pointer"
              title="دليل العمليات والإجراءات الإدارية"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#137a85] dark:group-hover:text-teal-300 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="whitespace-nowrap">دليل العمليات الإدارية</span>
            </Link>
          </div>
        ) : (
          /* Collapsed Mode Footer */
          <div className="p-2 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-2">
            <a
              href="https://wa.me/966557013720"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800 transition-all group"
              title="تواصل مع المطور: محمد هارون (0557013720)"
            >
              <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </a>
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
          "hidden lg:block h-screen sticky top-0 shrink-0 shadow-xs border-l border-slate-200/80 dark:border-slate-800 z-30 bg-white dark:bg-slate-900 self-start transition-all duration-300",
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

      {/* Embedded Administrative Modals */}
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
