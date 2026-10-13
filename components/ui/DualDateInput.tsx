"use client";

import React, { useId, useMemo, useEffect, useState } from "react";
import { Calendar, RefreshCw } from "lucide-react";
import {
  getDualDate,
  getHijriPartsFromDate,
  hijriToGregorianIso,
  HIJRI_MONTH_NAMES,
  parseIsoDate,
  toIsoDateString,
} from "@/lib/hijriDateService";
import { cn } from "@/lib/utils";

export interface DualDateInputProps {
  value: string; // ISO date YYYY-MM-DD
  onChange: (dateIso: string) => void;
  label?: string;
  required?: boolean;
  error?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const DualDateInput: React.FC<DualDateInputProps> = ({
  value,
  onChange,
  label = "التاريخ",
  required = false,
  error,
  minDate,
  maxDate,
  disabled = false,
  className,
  id,
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  // Resolve safe current date
  const dualInfo = useMemo(() => {
    return getDualDate(value || toIsoDateString(new Date()));
  }, [value]);

  const [hijriDay, setHijriDay] = useState<number>(dualInfo.hijriParts.day);
  const [hijriMonth, setHijriMonth] = useState<number>(dualInfo.hijriParts.month);
  const [hijriYear, setHijriYear] = useState<number>(dualInfo.hijriParts.year);

  // Sync internal Hijri state whenever the external value changes
  useEffect(() => {
    setHijriDay(dualInfo.hijriParts.day);
    setHijriMonth(dualInfo.hijriParts.month);
    setHijriYear(dualInfo.hijriParts.year);
  }, [dualInfo]);

  // Handle Gregorian change
  const handleGregorianChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newGregorian = e.target.value;
    onChange(newGregorian);
  };

  // Handle Hijri day, month, year changes
  const handleHijriChange = (newDay: number, newMonth: number, newYear: number) => {
    setHijriDay(newDay);
    setHijriMonth(newMonth);
    setHijriYear(newYear);

    const calculatedGregorian = hijriToGregorianIso(newYear, newMonth, newDay);
    if (calculatedGregorian && calculatedGregorian !== value) {
      onChange(calculatedGregorian);
    }
  };

  // Hijri years list (e.g. 1445 - 1450)
  const hijriYears = useMemo(() => {
    const currentHYear = dualInfo.hijriParts.year;
    const years: number[] = [];
    for (let y = currentHYear - 3; y <= currentHYear + 3; y++) {
      years.push(y);
    }
    return years;
  }, [dualInfo.hijriParts.year]);

  return (
    <div className={cn("space-y-2 text-right", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={inputId}
            className="block text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200/60 dark:border-teal-800/60">
            هجري وميلادي متزامنان
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* 1. Gregorian Native Date Picker */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 font-medium">
            <span>التاريخ الميلادي</span>
            <span className="font-mono text-[10px]">{dualInfo.gregorianShort}</span>
          </div>
          <div className="relative">
            <input
              id={inputId}
              type="date"
              value={value || ""}
              onChange={handleGregorianChange}
              min={minDate}
              max={maxDate}
              disabled={disabled}
              className={cn(
                "w-full h-10 px-3 rounded-xl border text-xs sm:text-sm font-mono bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 transition-all shadow-2xs",
                error
                  ? "border-rose-400 focus:ring-rose-200"
                  : "border-slate-200 dark:border-slate-700 focus:border-[#137a85] dark:focus:border-teal-500 focus:ring-[#137a85]/20",
                disabled && "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800"
              )}
            />
          </div>
        </div>

        {/* 2. Synchronized Hijri Controls */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 font-medium">
            <span>التاريخ الهجري (أم القرى)</span>
            <span className="font-bold text-[#137a85] dark:text-teal-300 text-[10px]">
              {dualInfo.hijriShort}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 h-10">
            {/* Day */}
            <select
              value={hijriDay}
              disabled={disabled}
              onChange={(e) => handleHijriChange(Number(e.target.value), hijriMonth, hijriYear)}
              className="h-10 px-1 rounded-xl border text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 focus:border-[#137a85] focus:outline-none text-center font-bold"
              aria-label="اليوم الهجري"
            >
              {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Month */}
            <select
              value={hijriMonth}
              disabled={disabled}
              onChange={(e) => handleHijriChange(hijriDay, Number(e.target.value), hijriYear)}
              className="h-10 px-1 rounded-xl border text-[11px] sm:text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 focus:border-[#137a85] focus:outline-none text-center font-semibold"
              aria-label="الشهر الهجري"
            >
              {HIJRI_MONTH_NAMES.map((mName, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {mName}
                </option>
              ))}
            </select>

            {/* Year */}
            <select
              value={hijriYear}
              disabled={disabled}
              onChange={(e) => handleHijriChange(hijriDay, hijriMonth, Number(e.target.value))}
              className="h-10 px-1 rounded-xl border text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 focus:border-[#137a85] focus:outline-none text-center font-bold"
              aria-label="السنة الهجرية"
            >
              {hijriYears.map((y) => (
                <option key={y} value={y}>
                  {y} هـ
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Live Dual Synchronization Banner */}
      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/80 text-[11px] flex items-center justify-between text-slate-600 dark:text-slate-300">
        <span className="font-bold text-[#137a85] dark:text-teal-400">
          يوم {dualInfo.dayName}، {dualInfo.hijriParts.day} {dualInfo.hijriParts.monthName} {dualInfo.hijriParts.year} هـ
        </span>
        <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px]">
          الموافق: {dualInfo.gregorianIso} م
        </span>
      </div>

      {error && <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
};
