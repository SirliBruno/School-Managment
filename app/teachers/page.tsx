"use client";

import React from "react";
import { Users, UserCheck, Calendar, ChevronLeft, GraduationCap } from "lucide-react";
import { ExcelImporter } from "@/components/teachers/ExcelImporter";
import { TeacherTable } from "@/components/teachers/TeacherTable";
import { useTeachers } from "@/context/TeacherContext";

export default function TeachersPage() {
  const { teachers } = useTeachers();

  const totalTeachers = teachers.length;
  const teachersWithAbsence = teachers.filter((t) => t.totalAbsences > 0).length;
  const teachersRegular = totalTeachers - teachersWithAbsence;

  // الحساب الديناميكي للعام الهجري التقريبي
  const currentHijriYear = React.useMemo(() => {
    try {
      const today = new Date();
      const formatter = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
        year: "numeric",
      });
      const parts = formatter.format(today);
      return parts.replace(/[^\d٠-٩]/g, "") || "1448";
    } catch {
      return "1448";
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Bar Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span>نظام الإدارة المدرسية</span>
              <ChevronLeft className="w-3.5 h-3.5 rotate-180" aria-hidden="true" />
              <span className="text-[#137a85] font-semibold">المعلمات</span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900">
              إدارة بيانات المعلمات
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200/60 text-xs text-[#137a85] font-bold shadow-sm">
              <GraduationCap className="w-4 h-4" />
              <span>الكادر التعليمي للعام الدراسي {currentHijriYear} هـ</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Quick Top Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Stat 1: Total */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between group">
            <div className="space-y-1">
              <p className="text-xs md:text-sm font-semibold text-slate-500">
                إجمالي المعلمات المسجلات
              </p>
              <p className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight font-mono">
                {totalTeachers}
              </p>
              <p className="text-xs text-slate-400">كادر المدرسة المعتمد</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-[#137a85] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-200">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Stat 2: Regular */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between group">
            <div className="space-y-1">
              <p className="text-xs md:text-sm font-semibold text-slate-500">
                معلمات بدون غياب
              </p>
              <p className="text-3xl lg:text-4xl font-extrabold text-emerald-600 tracking-tight font-mono">
                {teachersRegular}
              </p>
              <p className="text-xs text-emerald-600/80 font-medium">سجل انضباط تام</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-200">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>

          {/* Stat 3: With Absences */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between group">
            <div className="space-y-1">
              <p className="text-xs md:text-sm font-semibold text-slate-500">
                معلمات لديهن سجل غياب
              </p>
              <p className="text-3xl lg:text-4xl font-extrabold text-amber-600 tracking-tight font-mono">
                {teachersWithAbsence}
              </p>
              <p className="text-xs text-amber-600/80 font-medium">مساءلات أو إجازات مسجلة</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-200">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Section: Import & Tools Banner */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                استيراد وتحديث كادر المدرسة
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                يمكنك رفع ملف إكسل يحتوي على بيانات المعلمات وسيتم مطابقتها
                وحفظها فورياً دون فقدان السجلات السابقة.
              </p>
            </div>

            {/* Importer Component */}
            <ExcelImporter />
          </div>
        </section>

        {/* Section: Data Table */}
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              قائمة وسجلات المعلمات
            </h2>
            <p className="text-xs text-slate-500">
              استعراض البيانات الوظيفية والتخصص وعدد أيام الغياب المسجلة
            </p>
          </div>

          {/* Teachers Table Component */}
          <TeacherTable />
        </section>
      </main>
    </div>
  );
}
