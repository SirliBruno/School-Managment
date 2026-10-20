"use client";

import React from "react";
import Link from "next/link";
import {
  FileText,
  Clock,
  DoorOpen,
  Scale,
  ArrowLeft,
  Info,
} from "lucide-react";
import { CalendarEvent } from "@/types/calendar";
import { formatHijriDate } from "@/services/calendarService";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface EventDetailsModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  event,
  isOpen,
  onClose,
}) => {
  if (!event) return null;

  const hijriDate = formatHijriDate(event.date, { format: "text" });

  const getEventIcon = () => {
    switch (event.type) {
      case "absence":
        return <FileText className="w-5 h-5 text-rose-600 dark:text-rose-400" />;
      case "delay":
        return <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case "permission":
        return <DoorOpen className="w-5 h-5 text-sky-600 dark:text-sky-400" />;
      case "deduction":
        return <Scale className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
    }
  };

  const getBadgeClasses = (color: CalendarEvent["badgeColor"]) => {
    switch (color) {
      case "rose":
        return "bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800";
      case "amber":
        return "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "blue":
        return "bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800";
      case "purple":
        return "bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تفاصيل الإجراء الإداري"
      maxWidth="md"
    >
      <div className="space-y-4 text-right">
        {/* Top Header Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
              {getEventIcon()}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {event.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {event.statusText || "إجراء معتمد"}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-bold border shrink-0",
              getBadgeClasses(event.badgeColor)
            )}
          >
            {event.badgeLabel}
          </span>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block">
              اسم المعلمة / الموظفة
            </span>
            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm block">
              {event.teacherName}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block">
              التخصص / السجل المدني
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200 block">
              {event.specialty || "—"} {event.nationalId ? `(${event.nationalId})` : ""}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block">
              التاريخ الميلادي
            </span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block" dir="ltr">
              {event.date}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block">
              التاريخ الهجري
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200 block">
              {hijriDate}
            </span>
          </div>
        </div>

        {/* Core Details Box */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <Info className="w-3.5 h-3.5 text-[#137a85] dark:text-teal-400" />
            <span>بيانات وتفاصيل الإجراء</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {event.details}
          </p>
          {event.subtitle && event.subtitle !== event.details && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {event.subtitle}
            </p>
          )}
        </div>

        {/* Action Link Footer */}
        <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            إغلاق
          </Button>

          {event.originalPageUrl ? (
            <Link
              href={event.originalPageUrl}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#137a85] hover:bg-[#0f626b] text-white shadow-2xs transition-colors cursor-pointer"
            >
              <span>عرض السجل في صفحته الأصلية</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <span className="text-xs text-slate-400">سجل غير قابل للتعديل</span>
          )}
        </div>
      </div>
    </Modal>
  );
};
