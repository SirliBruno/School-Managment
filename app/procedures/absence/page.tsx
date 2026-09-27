"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Users,
  AlertTriangle,
  CalendarCheck,
  MessageCircle,
  ClipboardList,
} from "lucide-react";
import { PageHeader, KpiCard, Button } from "@/components/ui";
import { AbsenceForm } from "@/components/procedures/AbsenceForm";
import { RecentAbsencesTable } from "@/components/procedures/RecentAbsencesTable";
import { InquiriesTable } from "@/components/procedures/InquiriesTable";
import { SendInquiryModal } from "@/components/procedures/SendInquiryModal";
import { useWhatsAppAbsenceStats } from "@/hooks/useWhatsAppAbsenceStats";
import { cn } from "@/lib/utils";

export default function AbsenceProcedurePage() {
  const {
    totalAbsences,
    whatsappSent,
    teachersWithAbsences,
    availableTeachers,
    pendingInquiriesCount,
    submittedInquiriesCount,
  } = useWhatsAppAbsenceStats();

  const [activeTab, setActiveTab] = useState<"whatsapp" | "manual">("whatsapp");
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <PageHeader
        title="مساءلة غياب (المسار الإلكتروني والمباشر)"
        breadcrumbs={[
          { label: "نظام الإدارة المدرسية", href: "/" },
          { label: "الإجراءات الإدارية" },
          { label: "مساءلة غياب" },
        ]}
        description="توثيق غيابات المعلمات وإرسال المساءلات الرسمية واستلام الإفادات والمرفقات آلياً"
        actionButtons={
          <>
            <Button
              variant="emerald"
              size="sm"
              icon={<MessageCircle className="w-4 h-4" />}
              onClick={() => setIsSendModalOpen(true)}
            >
              إرسال مساءلة واتساب
            </Button>

            <Link href="/teachers">
              <Button
                variant="secondary"
                size="sm"
                icon={<Users className="w-4 h-4 text-[#137a85]" />}
              >
                سجل المعلمات ({availableTeachers})
              </Button>
            </Link>
          </>
        }
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Quick KPI Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="إجمالي الغيابات المسجلة"
            value={totalAbsences}
            icon={<FileText className="w-5 h-5" />}
            iconBgColor="bg-teal-50 dark:bg-teal-950/60"
            iconColor="text-[#137a85] dark:text-teal-400"
          />

          <KpiCard
            title="مساءلات الواتساب"
            value={whatsappSent}
            valueColor="text-emerald-600 dark:text-emerald-400"
            subtitle={
              (pendingInquiriesCount > 0 || submittedInquiriesCount > 0) && (
                <span className="text-[10px] text-amber-600 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded-md">
                  {submittedInquiriesCount} رد جديد
                </span>
              )
            }
            icon={<MessageCircle className="w-5 h-5" />}
            iconBgColor="bg-emerald-50 dark:bg-emerald-950/60"
            iconColor="text-emerald-600 dark:text-emerald-400"
          />

          <KpiCard
            title="معلمات شملتهن المساءلة"
            value={teachersWithAbsences}
            valueColor="text-amber-600 dark:text-amber-400"
            icon={<AlertTriangle className="w-5 h-5" />}
            iconBgColor="bg-amber-50 dark:bg-amber-950/60"
            iconColor="text-amber-600 dark:text-amber-400"
          />

          <KpiCard
            title="الكادر التعليمي المتاح"
            value={availableTeachers}
            icon={<CalendarCheck className="w-5 h-5" />}
            iconBgColor="bg-slate-100 dark:bg-slate-800"
            iconColor="text-slate-600 dark:text-slate-400"
          />
        </div>

        {/* View Selection Tabs */}
        <div className="bg-slate-100/90 dark:bg-slate-900 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200/80 dark:border-slate-800 max-w-md">
          <button
            type="button"
            onClick={() => setActiveTab("whatsapp")}
            className={cn(
              "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
              activeTab === "whatsapp"
                ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            )}
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>مساءلات الواتساب والمرفقات</span>
            {whatsappSent > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px]">
                {whatsappSent}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={cn(
              "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
              activeTab === "manual"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            )}
          >
            <ClipboardList className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
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

