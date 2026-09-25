import { Metadata } from "next";
import { UnderDevelopment } from "@/components/common/UnderDevelopment";
import { PageHeader, Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "قائمة الإجراءات - قيد التطوير | منصة الغياب الإدارية",
  description: "قائمة الإجراءات الإدارية قيد التطوير",
};

export default function ProceduresListPage() {
  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        breadcrumbs={[
          { label: "لوحة التحكم", href: "/" },
          { label: "قائمة الإجراءات" },
        ]}
        title="قائمة الإجراءات الإدارية"
        subtitle="أرشيف وسجل شامل لكافة الإجراءات والقرارات الإدارية المتخذة"
        badge="قيد التطوير"
      />

      <main className="flex-1 p-6 lg:p-8 max-w-6xl w-full mx-auto">
        <Card variant="default">
          <UnderDevelopment
            title="قائمة الإجراءات"
            subtitle="قيد التطوير والتجهيز"
            description="يجري العمل على برمجة وتجهيز الأرشيف العام الموحد لجميع الإجراءات الصادرة والمعتمدة بالمدرسة."
          />
        </Card>
      </main>
    </div>
  );
}
