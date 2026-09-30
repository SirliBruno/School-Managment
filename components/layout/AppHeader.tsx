"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  ChevronDown,
  Calendar,
  Cloud,
  CloudOff,
  Search,
  Plus,
  LogOut,
  KeyRound,
  ShieldCheck,
  Clock,
  FileText,
  UserPlus,
  Scale,
  PanelRightClose,
  PanelRightOpen,
  Building2,
  Bell,
  DoorOpen,
  Award,
  Database,
  GraduationCap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useAuth,
  DEFAULT_ADMIN_NAME,
  DEFAULT_ADMIN_ROLE_LABEL,
} from "@/context/AuthContext";
import { useTeachers } from "@/context/TeacherContext";
import { useSidebar } from "@/context/SidebarContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { AdminProfileModal } from "@/components/auth/AdminProfileModal";
import { ApprovalAssetsModal } from "@/components/settings/ApprovalAssetsModal";
import { BackupRecoveryModal } from "@/components/settings/BackupRecoveryModal";
import {
  getActiveSchoolSettings,
  onSchoolSettingsChanged,
} from "@/lib/schoolSettingsService";
import { PLATFORM_LOGO_BASE64 } from "@/lib/platformLogo";
import { cn } from "@/lib/utils";

export const AppHeader: React.FC = () => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const {
    isCloudConnected,
    pendingSyncCount,
    flushSyncQueue,
    delayNotices,
    inquiries,
    administrativeInquiries,
  } = useTeachers();
  const {
    isCollapsed,
    toggleCollapsed,
    toggleMobileOpen,
  } = useSidebar();

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [schoolSettings, setSchoolSettings] = useState(getActiveSchoolSettings());

  useEffect(() => {
    const unsub = onSchoolSettingsChanged((latest) => {
      setSchoolSettings(latest);
    });
    return unsub;
  }, []);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const quickActionsRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
      if (
        quickActionsRef.current &&
        !quickActionsRef.current.contains(event.target as Node)
      ) {
        setIsQuickActionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Formatted Dates (Hijri & Gregorian)
  const [dates, setDates] = useState<{ hijri: string; gregorian: string }>({
    hijri: "",
    gregorian: "",
  });

  useEffect(() => {
    try {
      const now = new Date();
      const hijriFormatter = new Intl.DateTimeFormat(
        "ar-SA-u-ca-islamic-umalqura",
        {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        }
      );
      const gregorianFormatter = new Intl.DateTimeFormat("ar-SA", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      setDates({
        hijri: hijriFormatter.format(now),
        gregorian: gregorianFormatter.format(now),
      });
    } catch {
      setDates({
        hijri: "التقويم الهجري",
        gregorian: new Date().toLocaleDateString("ar-SA"),
      });
    }
  }, []);

  // Calculate pending tasks for Task Center
  const pendingDelayCount = (delayNotices || []).filter(
    (d) => !d.isArchived && d.status === "pending_director"
  ).length;
  const pendingInqCount = (inquiries || []).filter(
    (i) => !i.isArchived && i.status === "pending"
  ).length;
  const pendingAdminInqCount = (administrativeInquiries || []).filter(
    (i) => !i.isArchived && (i.status === "pending_teacher" || i.status === "pending_director")
  ).length;
  const totalActionTasks = pendingDelayCount + pendingInqCount + pendingAdminInqCount;

  // Global search submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    router.push(`/teachers?q=${encodeURIComponent(query)}`);
  };

  return (
    <>
      <header
        className="sticky top-0 z-30 w-full h-[72px] bg-[#137a85] dark:bg-[#0c535b] text-white border-b border-[#0f6770] dark:border-teal-900/80 shadow-xs px-3 sm:px-6 flex items-center justify-between transition-all select-none"
        dir="rtl"
      >
        {/* Right Section (Start in RTL): Controls, Platform & School Branding */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 shrink-0 z-10">
          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={toggleMobileOpen}
            className="lg:hidden p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer"
            aria-label="فتح القائمة الرئيسية"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop Sidebar Collapse Toggle */}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden lg:flex p-2 rounded-xl text-teal-100 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer"
            title={isCollapsed ? "توسيع القائمة الجانبية" : "طي القائمة الجانبية"}
            aria-label={isCollapsed ? "توسيع القائمة الجانبية" : "طي القائمة الجانبية"}
          >
            {isCollapsed ? (
              <PanelRightOpen className="w-5 h-5 text-white" />
            ) : (
              <PanelRightClose className="w-5 h-5 text-teal-100" />
            )}
          </button>

          {/* Platform Logo & School Title */}
          <Link
            href="/"
            className="flex items-center gap-3 min-w-0 group hover:opacity-95 transition-opacity"
            aria-label="الرئيسية - مركز القيادة"
          >
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 backdrop-blur-xs flex items-center justify-center text-white shrink-0 shadow-2xs overflow-hidden p-1">
              {schoolSettings.schoolLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={schoolSettings.schoolLogo}
                  alt="شعار المدرسة"
                  className="w-full h-full object-contain"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={PLATFORM_LOGO_BASE64}
                  alt="شعار منصة إدارتي المدرسية"
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-[15px] text-white tracking-tight truncate">
                  {schoolSettings.schoolName || "الثانوية الخامسة مسارات"}
                </span>
                <span className="hidden md:inline-block px-2 py-0.5 rounded-md bg-white/15 text-white text-[10px] font-semibold border border-white/20">
                  الإدارة المدرسية
                </span>
              </div>
              <p className="text-[11px] text-teal-100/90 truncate hidden sm:block">
                منظومة الإدارة والمتابعة المدرسية • الإدارة العامة للتعليم بمكة المكرمة
              </p>
            </div>
          </Link>
        </div>

        {/* Center Section: Task Center (مركز المهام) & Quick Search (Large Screens) */}
        <div className="hidden lg:flex items-center justify-center gap-3 flex-1 max-w-xl mx-4">
          {/* Interactive Task Center Pill */}
          <button
            type="button"
            onClick={() => {
              if (pendingDelayCount > 0) router.push("/procedures/delay-notice");
              else if (pendingAdminInqCount > 0) router.push("/procedures/administrative-inquiries");
              else if (pendingInqCount > 0) router.push("/procedures/absence");
              else router.push("/");
            }}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer whitespace-nowrap shadow-2xs hover:scale-[1.02] active:scale-[0.98]",
              totalActionTasks > 0
                ? "bg-amber-400/20 hover:bg-amber-400/30 text-amber-100 border-amber-300/40"
                : "bg-white/10 hover:bg-white/15 text-teal-100 border-white/20"
            )}
            title="انقري للانتقال المباشر للإجراءات التي تحتاج متابعة"
            aria-label="مركز المهام"
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                totalActionTasks > 0 ? "bg-amber-300 animate-pulse ring-2 ring-amber-400/50" : "bg-emerald-400"
              )}
            />
            <span>
              {totalActionTasks > 0
                ? `لديكِ: ${totalActionTasks} إجراءات تحتاج متابعة`
                : "✨ مركز المهام: جميع الإجراءات مكتملة"}
            </span>
          </button>

          {/* Quick Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative w-44 lg:w-56">
            <Search className="w-3.5 h-3.5 text-teal-200/80 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث سريع... (Enter)"
              className="w-full bg-white/15 hover:bg-white/20 focus:bg-white/25 text-white placeholder-teal-100/70 text-xs font-medium rounded-xl py-1.5 pr-8 pl-3 border border-white/20 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
            />
          </form>
        </div>

        {/* Left Section (End in RTL): Connection Status, Notifications, Quick Action, Theme, Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Cloud Sync Status Pill */}
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 shadow-2xs select-none"
            title={
              isCloudConnected
                ? "متصل بقاعدة البيانات السحابية لحظياً (Supabase)"
                : "حفظ محلي (انقطاع مؤقت)"
            }
          >
            <span className="relative flex h-2 w-2">
              {isCloudConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
              )}
              <span
                className={cn(
                  "relative inline-flex rounded-full h-2 w-2",
                  isCloudConnected ? "bg-emerald-400" : "bg-amber-400"
                )}
              />
            </span>
            <span className="text-[11px] font-medium text-teal-50">
              {isCloudConnected ? "سحابي ولحظي" : "حفظ محلي"}
            </span>
          </div>

          {/* Theme Toggle Button */}
          <ThemeToggle
            variant="button"
            className="bg-white/10 hover:bg-white/20 border-white/20 text-white"
          />

          {/* Notification Bell with Badge */}
          <button
            type="button"
            onClick={() => {
              if (pendingSyncCount > 0) {
                flushSyncQueue();
              }
            }}
            className={cn(
              "relative p-2 rounded-xl text-teal-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/40",
              pendingSyncCount > 0 && "text-white"
            )}
            title={
              pendingSyncCount > 0
                ? `${pendingSyncCount} إجراءات معلقة قيد المزامنة (انقري للمزامنة الفورية)`
                : "لا توجد تنبيهات معلقة"
            }
            aria-label="تنبيهات المزامنة السحابية"
          >
            <Bell className="w-5 h-5" />
            {pendingSyncCount > 0 && (
              <span className="absolute top-1 left-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-2xs animate-pulse ring-2 ring-[#137a85]">
                {pendingSyncCount}
              </span>
            )}
          </button>

          {/* Quick Actions Primary CTA */}
          <div className="relative" ref={quickActionsRef}>
            <button
              type="button"
              onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-white text-[#137a85] hover:bg-teal-50 shadow-2xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              aria-expanded={isQuickActionsOpen}
              aria-label="إجراء إداري جديد"
            >
              <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">إجراء جديد</span>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 shrink-0 transition-transform duration-200 opacity-80",
                  isQuickActionsOpen && "rotate-180"
                )}
              />
            </button>

            <AnimatePresence>
              {isQuickActionsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsQuickActionsOpen(false)}
                    aria-hidden="true"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 text-right text-slate-800 dark:text-slate-100"
                  >
                    <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 mb-1">
                      إجراءات إدارية سريعة
                    </div>

                    <Link
                      href="/procedures/absence"
                      onClick={() => setIsQuickActionsOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50/80 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-teal-100/60 dark:bg-teal-950/80 text-[#137a85] dark:text-teal-400 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate">مساءلة غياب</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                          تسجيل غياب وإرسال رابط
                        </p>
                      </div>
                    </Link>

                    <Link
                      href="/procedures/delay-notice"
                      onClick={() => setIsQuickActionsOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50/80 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-100/60 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate">تنبيه على تأخر</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                          تسجيل تأخر صباحي أو انصراف
                        </p>
                      </div>
                    </Link>

                    <Link
                      href="/procedures/permissions"
                      onClick={() => setIsQuickActionsOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50/80 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-teal-100/60 dark:bg-teal-950/80 text-[#137a85] dark:text-teal-400 flex items-center justify-center shrink-0">
                        <DoorOpen className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate">استئذان موظفة</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                          توثيق خروج وعودة أثناء الدوام
                        </p>
                      </div>
                    </Link>

                    <Link
                      href="/procedures/deduction-hours"
                      onClick={() => setIsQuickActionsOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50/80 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-rose-100/60 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 flex items-center justify-center shrink-0">
                        <Scale className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate">قرار حسم ساعات</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                          احتساب وإصدار قرار نظامي
                        </p>
                      </div>
                    </Link>

                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                    <Link
                      href="/teachers"
                      onClick={() => setIsQuickActionsOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50/80 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                        <UserPlus className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate">إضافة معلمة جديدة</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                          تحديث سجل الهيئة التعليمية
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* User Profile Avatar & Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer"
              aria-label="قائمة الملف الشخصي"
              aria-expanded={isUserMenuOpen}
            >
              <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                {user?.fullName?.trim().charAt(0) || DEFAULT_ADMIN_NAME.charAt(0)}
              </div>
              <div className="hidden md:block text-right">
                <span className="font-bold text-xs text-white block truncate max-w-[140px]">
                  {user?.fullName || DEFAULT_ADMIN_NAME}
                </span>
                <span className="text-[10px] text-teal-100 font-medium block">
                  {user?.role === "principal" ? "مديرة المدرسة" : DEFAULT_ADMIN_ROLE_LABEL}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-teal-100 hidden sm:block" />
            </button>

            <AnimatePresence>
              {isUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsUserMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 text-right text-slate-800 dark:text-slate-100"
                  >
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {user?.fullName || DEFAULT_ADMIN_NAME}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-teal-700 dark:text-teal-300 font-semibold bg-teal-50 dark:bg-teal-950/80 px-1.5 py-0.5 rounded border border-teal-100 dark:border-teal-800">
                          {user?.role === "principal" ? "مديرة المدرسة" : DEFAULT_ADMIN_ROLE_LABEL}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          @{user?.username || "wakila"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsProfileModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium whitespace-nowrap text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50/80 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                      <span className="whitespace-nowrap">تعديل كلمة المرور والبيانات</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsApprovalModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium whitespace-nowrap text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50/80 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    >
                      <Award className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                      <span className="whitespace-nowrap">بيانات الاعتماد والختم</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsBackupModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium whitespace-nowrap text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50/80 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    >
                      <Database className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                      <span className="whitespace-nowrap">النسخ الاحتياطي والاستعادة</span>
                    </button>

                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium whitespace-nowrap text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      <span className="whitespace-nowrap">تسجيل الخروج</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Admin Profile Modal */}
      <AdminProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* School Stamp & Signature Modal */}
      <ApprovalAssetsModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
      />

      {/* Backup & Disaster Recovery Modal */}
      <BackupRecoveryModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />
    </>
  );
};
