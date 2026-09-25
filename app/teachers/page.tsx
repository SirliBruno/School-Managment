"use client";

import React, { useMemo } from "react";
import { Users, UserCheck, Calendar, GraduationCap } from "lucide-react";
import { PageHeader, KpiCard, Card } from "@/components/ui";
import { ExcelImporter } from "@/components/teachers/ExcelImporter";
import { TeacherTable } from "@/components/teachers/TeacherTable";
import { useTeachers } from "@/context/TeacherContext";

export default function TeachersPage() {
  const { teachers } = useTeachers();

  const totalTeachers = teachers.length;
  const teachersWithAbsence = teachers.filter((t) => t.totalAbsences > 0).length;
  const teachersRegular = totalTeachers - teachersWithAbsence;

  // الحساب الديناميكي للعام الهجري التقريبي
  const currentHijriYear = useMemo(() => {
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
    <div className="flex-1 flex flex-col min-h-screen">
      <PageHeader
        title="إدارة بيانات المعلمات"
        breadcrumbs={[
          { label: "نظام الإدارة المدرسية", href: "/" },
          { label: "سجل المعلمات" },
        ]}
        description="استعراض وإدارة بيانات الكادر التعليمي، التخصصات، واستيراد ملفات الإكسل المعتمدة"
        actionButtons={
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200/70 text-xs text-[#137a85] font-bold shadow-2xs">
            <GraduationCap className="w-4 h-4" />
            <span>الكادر التعليمي للعام الدراسي {currentHijriYear} هـ</span>
          </div>
        }
      />

      {/* Main Container */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Quick Top Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-5">
          <KpiCard
            title="إجمالي المعلمات المسجلات"
            value={totalTeachers}
            subtitle={<span className="text-xs text-slate-400 font-medium">كادر المدرسة المعتمد</span>}
            icon={<Users className="w-5 h-5" />}
            iconBgColor="bg-teal-50"
            iconColor="text-[#137a85]"
          />

          <KpiCard
            title="معلمات بدون غياب"
            value={teachersRegular}
            subtitle={<span className="text-xs text-emerald-600 font-bold">سجل انضباط تام</span>}
            valueColor="text-emerald-600"
            icon={<UserCheck className="w-5 h-5" />}
            iconBgColor="bg-emerald-50"
            iconColor="text-emerald-600"
          />

          <KpiCard
            title="معلمات لديهن سجل غياب"
            value={teachersWithAbsence}
            subtitle={<span className="text-xs text-amber-600 font-bold">مساءلات أو إجازات مسجلة</span>}
            valueColor="text-amber-600"
            icon={<Calendar className="w-5 h-5" />}
            iconBgColor="bg-amber-50"
            iconColor="text-amber-600"
          />
        </div>

        {/* Section: Import & Tools Banner */}
        <Card className="p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm md:text-base font-bold text-slate-900">
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
        </Card>

        {/* Section: Data Table */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm md:text-base font-bold text-slate-800">
                قائمة وسجلات المعلمات
              </h2>
              <p className="text-xs text-slate-500">
                استعراض البيانات الوظيفية والتخصص وعدد أيام الغياب المسجلة
              </p>
            </div>
          </div>

          {/* Teachers Table Component */}
          <TeacherTable />
        </section>
      </main>
    </div>
  );
}
