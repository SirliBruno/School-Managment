import { Metadata } from "next";
import { UnderDevelopment } from "@/components/common/UnderDevelopment";

export const metadata: Metadata = {
  title: "الصفحة قيد التطوير | منصة الغياب الإدارية",
  description: "هذه الصفحة قيد التطوير أو غير متوفرة حالياً",
};

export default function NotFound() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs mt-4">
        <UnderDevelopment
          title="الصفحة قيد التطوير"
          subtitle="غير متوفرة حالياً"
          description="الصفحة أو الرابط المطلوب قيد البرمجة والتطوير حالياً، أو قد تم نقله. يمكنك الرجوع للوحة التحكم أو صفحة مساءلة الغياب."
        />
      </div>
    </div>
  );
}
