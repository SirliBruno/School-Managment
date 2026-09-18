"use client";

import React from "react";
import Link from "next/link";
import { Construction, ArrowRight, Home, FileText } from "lucide-react";

interface UnderDevelopmentProps {
  title?: string;
  subtitle?: string;
  description?: string;
}

export const UnderDevelopment: React.FC<UnderDevelopmentProps> = ({
  title = "الصفحة قيد التطوير",
  subtitle = "الإجراء الإداري قيد التجهيز",
  description = "يعمل الفريق التقني والإداري حالياً على إعداد وتجهيز هذه الصفحة لتكون متاحة قريباً وفق اللوائح الإدارية المعتمدة.",
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 text-center min-h-[70vh]">
      <div className="relative mb-6">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shadow-sm shadow-amber-100">
          <Construction className="w-12 h-12 sm:w-14 sm:h-14 animate-pulse" />
        </div>
        <span className="absolute -bottom-2 -right-2 px-2.5 py-1 bg-amber-600 text-white text-[11px] font-bold rounded-full shadow-sm">
          قيد التطوير
        </span>
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold mb-3">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
        <span>{subtitle}</span>
      </div>

      <h1 className="text-xl sm:text-2xl font-black text-slate-800 mb-2">
        {title}
      </h1>

      <p className="text-sm text-slate-500 max-w-md leading-relaxed mb-8">
        {description}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/procedures/absence"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-all shadow-sm shadow-teal-700/20 active:scale-95"
        >
          <FileText className="w-4 h-4" />
          <span>الذهاب لمساءلة الغياب</span>
          <ArrowRight className="w-4 h-4 rotate-180" />
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-2xs active:scale-95"
        >
          <Home className="w-4 h-4 text-slate-500" />
          <span>لوحة التحكم الرئيسية</span>
        </Link>
      </div>
    </div>
  );
};
