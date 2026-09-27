import { MOE_LOGO_BASE64 } from "@/lib/moeLogo";
import { UNIFIED_PRINT_SCRIPT } from "@/lib/pdfTemplateBase";
import { EmployeePermission, Teacher } from "@/types/teacher";
import { getSchoolApprovalSettings } from "@/lib/stampSignatureManager";

export interface PrintPermissionPdfOptions {
  permission: EmployeePermission;
  teacher?: Teacher;
  schoolName?: string;
  principalName?: string;
  vicePrincipalName?: string;
}

function esc(s: string | number | undefined | null): string {
  if (s === undefined || s === null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function generatePermissionPdfHtml({
  permission,
  teacher,
  schoolName = "الثانوية الخامسة مسارات",
  principalName = "منى محمد الغامدي",
  vicePrincipalName = "أحلام صالح الضبيبي",
}: PrintPermissionPdfOptions): string {
  const teacherName = esc(teacher?.fullName || permission.teacherName || "الموظفة");
  const nationalId = esc(teacher?.nationalId || permission.nationalId || "—");
  const jobNumber = esc(teacher?.jobNumber || permission.jobNumber || "—");
  const specialty = esc(teacher?.specialty || permission.specialty || "—");
  const jobTitle = esc(teacher?.jobTitle || "معلم");
  const employmentStatus = esc(teacher?.employmentStatus || "دائم");

  const durationHours = Math.floor(permission.durationMinutes / 60);
  const remainingMins = permission.durationMinutes % 60;
  let durationText = `${permission.durationMinutes} دقيقة`;
  if (durationHours > 0) {
    durationText = `${durationHours} ساعة و ${remainingMins} دقيقة (${permission.durationMinutes} دقيقة)`;
  }

  // Format Day of week from permissionDate
  let dayName = "—";
  try {
    const d = new Date(permission.permissionDate);
    dayName = d.toLocaleDateString("ar-SA", { weekday: "long" });
  } catch {}

  const settings = getSchoolApprovalSettings();
  const showStamp = settings.stampEnabled && !!settings.schoolStampUrl;
  const showSig = settings.signatureEnabled && !!settings.principalSignatureUrl;

  const stampHtml = showStamp
    ? `<img src="${settings.schoolStampUrl}" alt="ختم المدرسة" style="max-height: 70px; max-width: 70px; object-fit: contain; margin: 0 auto; display: block;" />`
    : `<div style="font-size: 7pt; color: #94a3b8; border: 1px dashed #cbd5e1; border-radius: 50%; width: 55px; height: 55px; margin: 0 auto; display: flex; align-items: center; justify-content: center;">ختم المنشأة</div>`;

  const sigHtml = showSig
    ? `<img src="${settings.principalSignatureUrl}" alt="التوقيع" style="max-height: 42px; max-width: 120px; object-fit: contain; margin: 2px auto 0 auto; display: block;" />`
    : `<div style="height: 35px; display: flex; align-items: flex-end; justify-content: center; color: #94a3b8; font-size: 8pt;">....................</div>`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>استمارة استئذان موظفة - ${teacherName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
      direction: rtl;
      text-align: right;
      color: #0f172a;
      background: #ffffff;
      font-size: 10pt;
      line-height: 1.6;
    }
    .page-container {
      width: 100%;
      min-height: 260mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 2px solid #0f766e;
      border-radius: 8px;
      padding: 12mm 14mm;
    }
    /* Header */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2px solid #0f766e;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .header-table td {
      vertical-align: middle;
    }
    .hdr-right {
      width: 38%;
      font-size: 9.5pt;
      font-weight: 700;
      line-height: 1.5;
      color: #1e293b;
    }
    .hdr-center {
      width: 24%;
      text-align: center;
    }
    .hdr-center img {
      max-height: 70px;
      width: auto;
    }
    .hdr-left {
      width: 38%;
      text-align: left;
      font-size: 9.5pt;
      font-weight: 700;
      line-height: 1.5;
      color: #334155;
    }
    /* Title Banner */
    .title-banner {
      background: #f0fdfa;
      border: 1.5px solid #0f766e;
      border-radius: 6px;
      padding: 8px 16px;
      text-align: center;
      margin-bottom: 20px;
    }
    .title-main {
      font-size: 13pt;
      font-weight: 900;
      color: #0f766e;
    }
    .title-sub {
      font-size: 9pt;
      font-weight: 700;
      color: #0d9488;
      margin-top: 2px;
    }
    /* Section Boxes */
    .section-title {
      font-size: 10.5pt;
      font-weight: 800;
      color: #0f766e;
      border-bottom: 1.5px solid #ccfbf1;
      padding-bottom: 4px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .grid-info {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px 16px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 18px;
    }
    .info-item {
      display: flex;
      align-items: baseline;
      gap: 8px;
      font-size: 9.5pt;
    }
    .info-label {
      font-weight: 700;
      color: #475569;
      min-width: 90px;
    }
    .info-val {
      font-weight: 800;
      color: #0f172a;
    }
    /* Permission Specific Details Card */
    .permission-card {
      background: #fff;
      border: 1.5px solid #0d9488;
      border-radius: 6px;
      padding: 14px 18px;
      margin-bottom: 18px;
    }
    .time-badge-row {
      display: flex;
      justify-content: space-around;
      align-items: center;
      background: #f0fdfa;
      border: 1px solid #99f6e4;
      border-radius: 6px;
      padding: 10px;
      margin: 10px 0 14px 0;
      text-align: center;
    }
    .time-badge {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .time-badge-lbl {
      font-size: 8pt;
      font-weight: 700;
      color: #0f766e;
    }
    .time-badge-val {
      font-size: 13pt;
      font-weight: 900;
      color: #115e59;
      font-family: monospace;
      direction: ltr;
    }
    .reason-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-top: 10px;
    }
    .reason-title {
      font-size: 9pt;
      font-weight: 700;
      color: #475569;
      margin-bottom: 4px;
    }
    .reason-content {
      font-size: 10pt;
      font-weight: 600;
      color: #1e293b;
      line-height: 1.5;
    }
    /* Administrative Undertaking */
    .undertaking-text {
      font-size: 8.5pt;
      color: #475569;
      background: #fdf2f8;
      border: 1px solid #fbcfe8;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 20px;
      line-height: 1.5;
    }
    /* Signatures Section */
    .sig-section {
      display: flex;
      justify-content: space-between;
      margin-top: auto;
      padding-top: 15px;
      border-top: 1.5px solid #cbd5e1;
    }
    .sig-block {
      width: 30%;
      text-align: center;
    }
    .sig-role {
      font-size: 9.5pt;
      font-weight: 800;
      color: #0f766e;
      margin-bottom: 40px;
    }
    .sig-name {
      font-size: 9.5pt;
      font-weight: 700;
      color: #1e293b;
      border-top: 1px dotted #94a3b8;
      padding-top: 4px;
    }
    /* Footer */
    .page-footer {
      font-size: 8pt;
      color: #64748b;
      border-top: 1px dashed #cbd5e1;
      padding-top: 8px;
      margin-top: 14px;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div>
      <!-- Official Header -->
      <table class="header-table">
        <tr>
          <td class="hdr-right">
            <div>المملكة العربية السعودية</div>
            <div>وزارة التعليم</div>
            <div>الإدارة العامة للتعليم بمنطقة مكة المكرمة</div>
            <div>${schoolName}</div>
          </td>
          <td class="hdr-center">
            ${MOE_LOGO_BASE64 ? `<img src="${MOE_LOGO_BASE64}" alt="شعار وزارة التعليم">` : `<div style="font-weight:900;color:#0f766e;">وزارة التعليم</div>`}
          </td>
          <td class="hdr-left" dir="ltr">
            <div>الرقم المرجعي: ${esc(permission.id.slice(0, 10))}</div>
            <div>التاريخ: ${esc(permission.permissionDate)}</div>
            <div>سجل استئذان رسمي</div>
          </td>
        </tr>
      </table>

      <!-- Title Banner -->
      <div class="title-banner">
        <div class="title-main">استمارة استئذان موظفة أثناء الدوام الرسمي</div>
        <div class="title-sub">سجل توثيق خروج وعودة الموظفات للإجراءات المدرسية المعتمدة</div>
      </div>

      <!-- Employee Information -->
      <div class="section-title">بيانات الموظفة المستأذنة</div>
      <div class="grid-info">
        <div class="info-item">
          <span class="info-label">اسم الموظفة:</span>
          <span class="info-val">${teacherName}</span>
        </div>
        <div class="info-item">
          <span class="info-label">السجل المدني:</span>
          <span class="info-val" style="font-family: monospace;">${nationalId}</span>
        </div>
        <div class="info-item">
          <span class="info-label">المسمى الوظيفي:</span>
          <span class="info-val">${jobTitle}</span>
        </div>
        <div class="info-item">
          <span class="info-label">التخصص الدراسي:</span>
          <span class="info-val">${specialty}</span>
        </div>
        <div class="info-item">
          <span class="info-label">الرقم الوظيفي:</span>
          <span class="info-val">${jobNumber}</span>
        </div>
        <div class="info-item">
          <span class="info-label">حالة التوظيف:</span>
          <span class="info-val">${employmentStatus}</span>
        </div>
      </div>

      <!-- Permission Details -->
      <div class="section-title">تفاصيل الاستئذان والتوقيت</div>
      <div class="permission-card">
        <div style="display: flex; justify-content: space-between; font-size: 9.5pt; font-weight: 700; margin-bottom: 6px;">
          <span>تاريخ الاستئذان: <strong>${esc(permission.permissionDate)}</strong> (${dayName})</span>
          <span>الحالة: <strong style="color: #0f766e;">موثق ومعتمد رسمياً</strong></span>
        </div>

        <div class="time-badge-row">
          <div class="time-badge">
            <span class="time-badge-lbl">وقت الخروج الفعلي</span>
            <span class="time-badge-val">${esc(permission.exitTime)}</span>
          </div>
          <div style="font-size: 16pt; color: #0d9488; font-weight: bold;">←</div>
          <div class="time-badge">
            <span class="time-badge-lbl">وقت العودة للمدرسة</span>
            <span class="time-badge-val">${esc(permission.returnTime)}</span>
          </div>
          <div style="font-size: 16pt; color: #0d9488; font-weight: bold;">=</div>
          <div class="time-badge">
            <span class="time-badge-lbl">إجمالي مدة الاستئذان</span>
            <span class="time-badge-val" style="color: #0f766e; font-size: 12pt;">${durationText}</span>
          </div>
        </div>

        <div class="reason-box">
          <div class="reason-title">مبررات وسبب الخروج:</div>
          <div class="reason-content">${esc(permission.reason)}</div>
        </div>

        ${permission.notes ? `
        <div class="reason-box" style="margin-top: 8px; background: #fff;">
          <div class="reason-title">ملاحظات إضافية:</div>
          <div class="reason-content" style="color: #64748b; font-size: 9pt;">${esc(permission.notes)}</div>
        </div>` : ""}
      </div>

      <!-- Undertaking -->
      <div class="undertaking-text">
        <strong>إقرار نظامي:</strong> يُعتبر هذا الاستئذان وثيقة رسمية لحفظ حقوق العمل والانضباط المدرسي. تتعهد الموظفة المستأذنة بتسليم جدول حصص الانتظار ومتابعة المهام المكلفة بها أثناء فترة خروجها المعتمدة من الإدارة.
      </div>
    </div>

    <!-- Signatures & Stamp -->
    <div>
      <div class="sig-section" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
        <div class="sig-block" style="flex: 1; text-align: center;">
          <div class="sig-role" style="margin-bottom: 4px;">الموظفة المستأذنة</div>
          <div class="sig-name">${teacherName}</div>
          <div style="height: 38px; display: flex; align-items: flex-end; justify-content: center; color: #94a3b8; font-size: 8pt;">....................</div>
        </div>
        <div class="sig-block" style="flex: 1; text-align: center;">
          <div class="sig-role" style="margin-bottom: 4px;">وكيلة المدرسة</div>
          <div class="sig-name">${vicePrincipalName}</div>
          <div style="min-height: 42px; display: flex; align-items: center; justify-content: center;">${sigHtml}</div>
        </div>
        <div class="sig-block" style="width: 110px; text-align: center;">
          <div class="sig-role" style="margin-bottom: 4px;">الختم الرسمي</div>
          <div style="min-height: 70px; display: flex; align-items: center; justify-content: center;">${stampHtml}</div>
        </div>
        <div class="sig-block" style="flex: 1; text-align: center;">
          <div class="sig-role" style="margin-bottom: 4px;">مديرة المدرسة</div>
          <div class="sig-name">${principalName}</div>
          <div style="height: 38px; display: flex; align-items: flex-end; justify-content: center; color: #94a3b8; font-size: 8pt;">....................</div>
        </div>
      </div>

      <!-- Footer -->
      <div class="page-footer">
        <span>نظام الإدارة المدرسية الموحد • منصة الغياب والمساءلات الإدارية</span>
        <span>تاريخ الطباعة: ${new Date().toLocaleDateString("ar-SA")} م</span>
        <span>صفحة 1 من 1</span>
      </div>
    </div>
  </div>
  ${UNIFIED_PRINT_SCRIPT}
</body>
</html>`;
}

export function printPermissionPdf(options: PrintPermissionPdfOptions) {
  const html = generatePermissionPdfHtml(options);
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة.");
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
