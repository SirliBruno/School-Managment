"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  FileText,
  Users,
  AlertTriangle,
  CalendarCheck,
  MessageCircle,
  Plus,
  Send,
  ClipboardList,
} from "lucide-react";
import { AbsenceForm } from "@/components/procedures/AbsenceForm";
import { RecentAbsencesTable } from "@/components/procedures/RecentAbsencesTable";
import { InquiriesTable } from "@/components/procedures/InquiriesTable";
import { SendInquiryModal } from "@/components/procedures/SendInquiryModal";
import { useTeachers } from "@/context/TeacherContext";
import { cn } from "@/lib/utils";

export default function AbsenceProcedurePage() {
  const { teachers, absenceRecords, inquiries } = useTeachers();

  const [activeTab, setActiveTab] = useState<"whatsapp" | "manual">("whatsapp");
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);

  const totalAbsences = absenceRecords.length;

  const teacherIdsWithActivity = new Set<string>();
  absenceRecords.forEach((a) => { if (a.teacherId) teacherIdsWithActivity.add(a.teacherId); });
  inquiries.forEach((i) => { if (i.teacherId) teacherIdsWithActivity.add(i.teacherId); });
  teachers.forEach((t) => { if (t.totalAbsences > 0) teacherIdsWithActivity.add(t.id); });
  const teachersWithAbsences = teacherIdsWithActivity.size;

  const pendingInquiriesCount = inquiries.filter((i) => i.status === "pending").length;
  const submittedInquiriesCount = inquiries.filter((i) => i.status === "submitted").length;

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
              مساءلة غياب (المسار الإلكتروني والمباشر)
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSendModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>إرسال مساءلة واتساب</span>
            </button>

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">
                إجمالي الغيابات المسجلة
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
                مساءلات الواتساب
              </p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl font-extrabold text-emerald-600">
                  {inquiries.length}
                </span>
                {(pendingInquiriesCount > 0 || submittedInquiriesCount > 0) && (
                  <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded-md">
                    {submittedInquiriesCount} رد جديد
                  </span>
                )}
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
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
              <p className="text-xl font-extrabold text-slate-700 mt-0.5">
                {teachers.length}
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* View Selection Tabs */}
        <div className="bg-slate-100/90 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200/80 max-w-md">
          <button
            type="button"
            onClick={() => setActiveTab("whatsapp")}
            className={cn(
              "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
              activeTab === "whatsapp"
                ? "bg-white text-emerald-700 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>مساءلات الواتساب والمرفقات</span>
            {inquiries.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
                {inquiries.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={cn(
              "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
              activeTab === "manual"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
            <span>التسجيل والتوثيق المباشر</span>
          </button>
        </div>

        {/* Active Tab View */}
        {activeTab === "whatsapp" ? (
          <section className="space-y-6">
            <InquiriesTable
              onOpenNewInquiryModal={() => setIsSendModalOpen(true)}
            />
          </section>
        ) : (
          <div className="space-y-6">
            <section>
              <AbsenceForm />
            </section>

            <section className="pt-2">
              <RecentAbsencesTable />
            </section>
          </div>
        )}
      </main>

      {/* Send Inquiry Modal */}
      <SendInquiryModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
      />
    </div>
  );
}

