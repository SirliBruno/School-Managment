"use client";

import React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  FileText,
  Users,
  AlertTriangle,
  CheckCircle,
  CalendarCheck,
} from "lucide-react";
import { AbsenceForm } from "@/components/procedures/AbsenceForm";
import { RecentAbsencesTable } from "@/components/procedures/RecentAbsencesTable";
import { useTeachers } from "@/context/TeacherContext";

export default function AbsenceProcedurePage() {
  const { teachers, absenceRecords } = useTeachers();

  const totalAbsences = absenceRecords.length;
  const teachersWithAbsences = teachers.filter((t) => t.totalAbsences > 0).length;

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Bar Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
        <div className="px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span>نظام الإدارة المدرسية</span>
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>الإجراءات الإدارية</span>
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="text-[#137a85] font-semibold">مساءلة غياب</span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900">
              مساءلة غياب (تسجيل وتوثيق)
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/teachers"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors shadow-2xs"
            >
              <Users className="w-4 h-4 text-[#137a85]" />
              <span>سجل المعلمات ({teachers.length})</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 lg:p-8 space-y-6 max-w-5xl w-full mx-auto">
        {/* Quick KPI Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">
                إجمالي المساءلات المسجلة
              </p>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                {totalAbsences}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-[#137a85] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">
                معلمات شملتهن المساءلة
              </p>
              <p className="text-xl font-extrabold text-amber-600 mt-0.5">
                {teachersWithAbsences}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">
                الكادر التعليمي المتاح
              </p>
              <p className="text-xl font-extrabold text-emerald-600 mt-0.5">
                {teachers.length}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* The Main Absence Recording Form */}
        <section>
          <AbsenceForm />
        </section>

        {/* Recent 5 Records List */}
        <section className="pt-2">
          <RecentAbsencesTable />
        </section>
      </main>
    </div>
  );
}
