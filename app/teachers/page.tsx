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

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Bar Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
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
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200/60 text-xs text-[#137a85] font-semibold">
              <GraduationCap className="w-4 h-4" />
              <span>الكادر التعليمي للعام الدراسي 1448 هـ</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Quick Top Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Stat 1: Total */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">
                إجمالي المعلمات المسجلات
              </p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">
                {totalTeachers}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#137a85] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Stat 2: Regular */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">
                معلمات بدون غياب
              </p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                {teachersRegular}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          {/* Stat 3: With Absences */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">
                معلمات لديهن سجل غياب
              </p>
              <p className="text-2xl font-extrabold text-amber-600 mt-1">
                {teachersWithAbsence}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Section: Import & Tools Banner */}
        <section className="bg-white p-5 lg:p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
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
