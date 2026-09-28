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
  RotateCcw,
  Plus,
  User,
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useAuth,
  DEFAULT_ADMIN_NAME,
  DEFAULT_ADMIN_ROLE_LABEL,
} from "@/context/AuthContext";
import { useTeachers } from "@/context/TeacherContext";
import { useSidebar } from "@/context/SidebarContext";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { AdminProfileModal } from "@/components/auth/AdminProfileModal";
import { ApprovalAssetsModal } from "@/components/settings/ApprovalAssetsModal";
import {
  getActiveSchoolSettings,
  onSchoolSettingsChanged,
} from "@/lib/schoolSettingsService";
import { cn } from "@/lib/utils";

export const AppHeader: React.FC = () => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const {
    isCloudConnected,
    pendingSyncCount,
    flushSyncQueue,
  } = useTeachers();
  const {
    isCollapsed,
    toggleCollapsed,
    toggleMobileOpen,
  } = useSidebar();

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
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
      // Hijri formatter
      const hijriFormatter = new Intl.DateTimeFormat(
        "ar-SA-u-ca-islamic-umalqura",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      );
      // Gregorian formatter
      const gregorianFormatter = new Intl.DateTimeFormat("ar-SA", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      setDates({
        hijri: hijriFormatter.format(now),
        gregorian: gregorianFormatter.format(now),
      });
    } catch {
      // Fallback
      setDates({
        hijri: "التقويم الهجري",
        gregorian: new Date().toLocaleDateString("ar-SA"),
      });
    }
  }, []);

  return (
    <>
      <header
        className="sticky top-0 z-30 w-full h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-2xs px-3 sm:px-6 flex items-center justify-between transition-all"
        dir="rtl"
      >
        {/* Right Section (Start in RTL): Sidebar toggle, School title, Date */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={toggleMobileOpen}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[#137a85]"
            aria-label="فتح القائمة الرئيسية"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop Sidebar Collapse Toggle */}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden lg:flex p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[#137a85]"
            title={isCollapsed ? "توسيع القائمة الجانبية" : "طي القائمة الجانبية"}
            aria-label={isCollapsed ? "توسيع القائمة الجانبية" : "طي القائمة الجانبية"}
          >
            {isCollapsed ? (
              <PanelRightOpen className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            ) : (
              <PanelRightClose className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            )}
          </button>

          {/* School Badge & Platform Identity */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-[#137a85] dark:text-teal-400 shrink-0 shadow-2xs overflow-hidden">
              {schoolSettings.schoolLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={schoolSettings.schoolLogo}
                  alt="شعار المدرسة"
                  className="w-full h-full object-contain p-0.5"
                />
              ) : (
                <Building2 className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                  {schoolSettings.schoolName || "الإدارة المدرسية"}
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/70 text-[#137a85] dark:text-teal-300 text-[10px] font-bold border border-teal-200/60 dark:border-teal-800/80">
                  الإدارة المدرسية
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden md:block">
                الإدارة العامة للتعليم بمنطقة مكة المكرمة
              </p>
            </div>
          </div>

          {/* Live Date Pill (Hijri + Gregorian) */}
          {dates.hijri && (
            <div className="hidden xl:flex items-center gap-2 ps-3 border-s border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>{dates.hijri}</span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">{dates.gregorian} م</span>
            </div>
          )}
        </div>

        {/* Left Section (End in RTL): Status Badge, Notification Bell, ThemeToggle, Quick Actions, Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Cloud Sync Status Badge with Glowing Dot */}
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 shadow-2xs select-none"
            title={
              isCloudConnected
                ? "متصل بقاعدة البيانات السحابية لحظياً (Supabase)"
                : "حفظ محلي (انقطاع مؤقت)"
            }
          >
            <span className="relative flex h-2 w-2">
              {isCloudConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={cn(
                  "relative inline-flex rounded-full h-2 w-2",
                  isCloudConnected ? "bg-emerald-500" : "bg-amber-500"
                )}
              />
            </span>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
              {isCloudConnected ? "سحابي ولحظي" : "حفظ محلي"}
            </span>
          </div>

          {/* Theme Toggle Button */}
          <ThemeToggle variant="button" />

          {/* Notification Bell with Badge */}
          <button
            type="button"
            onClick={() => {
              if (pendingSyncCount > 0) {
                flushSyncQueue();
              }
            }}
            className={cn(
              "relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#137a85]",
              pendingSyncCount > 0 && "text-slate-700 dark:text-slate-200"
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
              <span className="absolute top-1 left-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-2xs animate-pulse ring-2 ring-white dark:ring-slate-900">
                {pendingSyncCount}
              </span>
            )}
          </button>

          {/* Quick Actions Primary CTA */}
          <div className="relative" ref={quickActionsRef}>
            <button
              type="button"
              onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-[#137a85] text-white hover:bg-teal-700 shadow-2xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85]/40"
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
                    className="absolute left-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 text-right"
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
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[#137a85]"
              aria-label="قائمة الملف الشخصي"
              aria-expanded={isUserMenuOpen}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#137a85] to-[#15828e] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                {user?.fullName?.trim().charAt(0) || DEFAULT_ADMIN_NAME.charAt(0)}
              </div>
              <div className="hidden md:block text-right">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block truncate max-w-[140px]">
                  {user?.fullName || DEFAULT_ADMIN_NAME}
                </span>
                <span className="text-[10px] text-teal-700 dark:text-teal-400 font-medium block">
                  {user?.role === "principal" ? "مديرة المدرسة" : DEFAULT_ADMIN_ROLE_LABEL}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
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
                    className="absolute left-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 text-right"
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
    </>
  );
};
