import { Metadata } from "next";
import { UnderDevelopment } from "@/components/common/UnderDevelopment";

export const metadata: Metadata = {
  title: "تنبيه على تأخر - قيد التطوير | منصة الغياب الإدارية",
  description: "إجراء تنبيه على تأخر قيد التطوير",
};

export default function DelayWarningPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">تنبيه على تأخر</h2>
        <p className="text-xs text-slate-500 mt-1">
          إصدار وتوثيق خطابات وتنبيهات التأخر الصباحي لمنسوبات المدرسة
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <UnderDevelopment
          title="تنبيه على تأخر"
          subtitle="قيد التطوير والتجهيز"
          description="يجري العمل على برمجة وإعداد نموذج ونظام تنبيهات التأخر الصباحي وربطه ببيانات الدوام الرسمية."
        />
      </div>
    </div>
  );
}
