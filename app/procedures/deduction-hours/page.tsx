import { Metadata } from "next";
import { UnderDevelopment } from "@/components/common/UnderDevelopment";

export const metadata: Metadata = {
  title: "قرار حسم مجموع ساعات - قيد التطوير | منصة الغياب الإدارية",
  description: "إجراء قرار حسم مجموع ساعات قيد التطوير",
};

export default function DeductionHoursPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">
          قرار حسم مجموع ساعات
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          إصدار وحساب قرارات حسم ساعات التأخر والخروج وفق نظام الخدمة المدنية
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <UnderDevelopment
          title="قرار حسم مجموع ساعات"
          subtitle="قيد التطوير والتجهيز"
          description="يجري العمل على برمجة وإعداد حاسبة ونماذج قرارات حسم الساعات التراكمية وتصديرها رسمياً."
        />
      </div>
    </div>
  );
}
