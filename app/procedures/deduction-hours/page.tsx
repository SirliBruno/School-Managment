import { Metadata } from "next";
import { UnderDevelopment } from "@/components/common/UnderDevelopment";
import { PageHeader, Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "قرار حسم مجموع ساعات - قيد التطوير | منصة الغياب الإدارية",
  description: "إجراء قرار حسم مجموع ساعات قيد التطوير",
};

export default function DeductionHoursPage() {
  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        breadcrumbs={[
          { label: "الإجراءات الإدارية", href: "/procedures/list" },
          { label: "قرار حسم مجموع ساعات" },
        ]}
        title="قرار حسم مجموع ساعات"
        subtitle="إصدار وحساب قرارات حسم ساعات التأخر والخروج وفق نظام الخدمة المدنية"
        badge="قيد التطوير"
      />

      <main className="flex-1 p-6 lg:p-8 max-w-6xl w-full mx-auto">
        <Card variant="default">
          <UnderDevelopment
            title="قرار حسم مجموع ساعات"
            subtitle="قيد التطوير والتجهيز"
            description="يجري العمل على برمجة وإعداد حاسبة ونماذج قرارات حسم الساعات التراكمية وتصديرها رسمياً."
          />
        </Card>
      </main>
    </div>
  );
}
