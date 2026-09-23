import { Metadata } from "next";
import { UnderDevelopment } from "@/components/common/UnderDevelopment";

export const metadata: Metadata = {
  title: "قائمة الإجراءات - قيد التطوير | منصة الغياب الإدارية",
  description: "قائمة الإجراءات الإدارية قيد التطوير",
};

export default function ProceduresListPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">قائمة الإجراءات</h2>
        <p className="text-xs text-slate-500 mt-1">
          أرشيف وسجل شامل لكافة الإجراءات والقرارات الإدارية المتخذة
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <UnderDevelopment
          title="قائمة الإجراءات"
          subtitle="قيد التطوير والتجهيز"
          description="يجري العمل على برمجة وتجهيز الأرشيف العام الموحد لجميع الإجراءات الصادرة والمعتمدة بالمدرسة."
        />
      </div>
    </div>
  );
}
