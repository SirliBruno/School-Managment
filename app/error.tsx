"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, RotateCcw } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log unexpected runtime errors for diagnostic audit
    console.error("Critical Application Error caught by Error Boundary:", error);
  }, [error]);

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 flex flex-col items-center justify-center p-4 selection:bg-teal-500 selection:text-white"
    >
      <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-sm border border-rose-200 max-w-lg w-full text-center space-y-6">
        {/* Warning Icon Badge */}
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="w-8 h-8" />
        </div>

        {/* Headings */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
            حدث خطأ غير متوقع في النظام
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            واجهت المنصة مشكلة تقنية طارئة أثناء معالجة طلبك. لقد تم تسجيل تفاصيل المشكلة لحمايتك من فقدان أي بيانات مسجلة.
          </p>
        </div>

        {/* Diagnostic Digest */}
        {error.digest && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-right">
            <span className="text-[11px] text-slate-500 font-mono block">
              رمز المرجع التقني: <span className="text-slate-700 font-semibold">{error.digest}</span>
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            type="button"
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-[#137a85] hover:bg-teal-700 text-white font-semibold text-xs sm:text-sm transition-colors shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>إعادة المحاولة</span>
          </button>

          <button
            onClick={() => window.location.reload()}
            type="button"
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>تحديث الصفحة</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>الرئيسية</span>
          </Link>
        </div>

        {/* School System Branding */}
        <div className="pt-4 text-xs text-slate-400 border-t border-slate-100">
          منصة الغياب والمتابعة الإدارية — الثانوية الخامسة مسارات
        </div>
      </div>
    </div>
  );
}
