import {
  UNIFIED_PDF_CSS,
  UNIFIED_PRINT_SCRIPT,
} from "@/lib/pdfTemplateBase";
import { MOE_LOGO_BASE64 } from "@/lib/moeLogo";

export interface DeductionDecisionPdfData {
  teacherName: string;
  civilId: string;
  specialization: string;
  rank?: string; // المستوى / المرتبة
  jobNumber?: string; // رقم الوظيفة
  currentAction?: string; // العمل الحالي
  schoolName?: string;
  principalName?: string;
  delayHours: number | string;
  deductionDays: number | string;
  decisionNumber?: string;
  decisionDate?: string;
}

function esc(s: string | undefined | null): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildDeductionDecisionHtml(data: DeductionDecisionPdfData): string {
  const teacherName = esc(data.teacherName);
  const civilId = esc(data.civilId || "—");
  const specialization = esc(data.specialization || "عام");
  const rank = esc(data.rank || "معلم ممارس");
  const jobNumber = esc(data.jobNumber || civilId || "—");
  const currentAction = esc(data.currentAction || "معلم");
  const schoolName = esc(data.schoolName || "مدرسة الثانوية الخامسة مسارات");
  const principalName = esc(data.principalName || "......................................................................");
  const delayHours = esc(String(data.delayHours));
  const deductionDays = esc(String(data.deductionDays));
  const decisionNumber = esc(data.decisionNumber || "....................");
  const decisionDate = esc(data.decisionDate || "..../..../١٤.. هـ");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>قرار حسم مجموع ساعات - ${teacherName}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
${UNIFIED_PDF_CSS}

/* Form 19 Specific Adjustments */
.form19-frame {
  border: 2px solid #0f766e;
  padding: 8mm 10mm;
  height: 283mm;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: #ffffff;
}

.form19-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #0f766e;
  padding-bottom: 6px;
  margin-bottom: 8px;
}

.form19-title-container {
  text-align: center;
  margin: 6px 0 10px 0;
}

.form19-main-title {
  font-size: 14pt;
  font-weight: 900;
  color: #0f766e;
  margin-bottom: 4px;
}

.form19-sub-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f0fdfa;
  border: 1px solid #0f766e;
  padding: 4px 14px;
  border-radius: 4px;
  font-size: 9.5pt;
  font-weight: 800;
  color: #115e59;
}

.top-boxes-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.box-row {
  display: flex;
  border: 1px solid #0f766e;
}

.box-label {
  background: #f0fdfa;
  color: #115e59;
  font-weight: 800;
  padding: 5px 12px;
  width: 140px;
  border-left: 1px solid #0f766e;
  text-align: center;
  font-size: 9pt;
}

.box-value {
  padding: 5px 12px;
  flex: 1;
  font-weight: 800;
  color: #0f172a;
  font-size: 9.5pt;
}

.legal-text-body {
  font-size: 10pt;
  line-height: 1.8;
  color: #0f172a;
  text-align: justify;
  margin: 12px 0;
  font-weight: 600;
}

.decision-items {
  margin: 10px 0 14px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.decision-item {
  font-size: 10.5pt;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.6;
}

.signatures-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 15px;
  padding-top: 10px;
}

.sig-box {
  width: 45%;
  font-size: 9.5pt;
  line-height: 1.7;
}

.stamp-box {
  width: 100px;
  height: 100px;
  border: 2px dashed #94a3b8;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-weight: bold;
  font-size: 10pt;
  margin: 0 auto;
}

.distribution-footer {
  border-top: 1px solid #cbd5e1;
  padding-top: 8px;
  margin-top: auto;
  font-size: 8pt;
  color: #475569;
  line-height: 1.5;
}
</style>
</head>
<body>
<div class="page">
  <div class="form19-frame">
    <div>
      <!-- Official Header -->
      <div class="form19-header">
        <div class="hdr-r">
          <div>المملكة العربية السعودية</div>
          <div>وزارة التعليم</div>
          <div>الإدارة العامة للتعليم بمكة المكرمة</div>
          <div style="color:#0f766e;font-weight:900;">${schoolName}</div>
        </div>
        <div class="hdr-c">
          <img src="${MOE_LOGO_BASE64}" alt="وزارة التعليم" style="height: 52px; width: auto; object-fit: contain;" />
        </div>
        <div class="hdr-l">
          <div>رقم القرار : ${decisionNumber}</div>
          <div>تاريخ القرار : ${decisionDate}</div>
          <div>المشفوعات : مسير دوام / بطاقة تأخر</div>
        </div>
      </div>

      <!-- Title Header -->
      <div class="form19-title-container">
        <div class="form19-main-title">نموذج رقم ( ١٩ )</div>
        <div class="form19-sub-title">
          <span>اسم النموذج : قرار حسم مجموع ساعات تأخر وخروج مبكر</span>
          <span>رمز النموذج : ( و.م.ع.ن - ٠٢ - ٠٣ )</span>
        </div>
      </div>

      <!-- Top Boxes: School & Civil ID -->
      <div class="top-boxes-grid">
        <div class="box-row">
          <div class="box-label">المدرسة</div>
          <div class="box-value">${schoolName}</div>
        </div>
        <div class="box-row">
          <div class="box-label">السجل المدني</div>
          <div class="box-value" style="font-family:monospace;letter-spacing:1px;">${civilId}</div>
        </div>
      </div>

      <!-- Teacher Details Table -->
      <table class="t2">
        <thead>
          <tr>
            <th class="hc" style="width:28%">الاســـــــــــــم</th>
            <th class="hc" style="width:18%">التخصص</th>
            <th class="hc" style="width:18%">المستوى / المرتبة</th>
            <th class="hc" style="width:18%">رقم الوظيفة</th>
            <th class="hc" style="width:18%;border-left:none">العمل الحالي</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="vc" style="font-weight:800;color:#0f766e">${teacherName}</td>
            <td class="vc">${specialization}</td>
            <td class="vc">${rank}</td>
            <td class="vc" style="font-family:monospace">${jobNumber}</td>
            <td class="vc" style="border-left:none">${currentAction}</td>
          </tr>
        </tbody>
      </table>

      <!-- Legal Preamble Text -->
      <div class="legal-text-body">
        <p style="margin-bottom:6px;">
          إن قائدة المدرسة : <span style="font-weight:800;color:#0f766e">${principalName}</span>
        </p>
        <p>
          بناءً على صلاحياتها ، وبناءً على المادة ( <strong>٢١</strong> ) من نظام الخدمة المدنية ، وبناءً على موافقة معالي الوزير على إعطاء بعض الصلاحيات للمدارس بالقرار رقم <strong>١/١١٣٩</strong> وتاريخ <strong>١٤٢١/٣/١٧هـ</strong> ، ولبلوغ ساعات التأخر عن الدوام والخروج المبكر من الدوام 
          (<span style="display:inline-block;padding:0 8px;font-weight:900;color:#b91c1c;font-size:11pt;border-bottom:1.5px solid #b91c1c;">${delayHours}</span>) ساعة.
        </p>
        <p style="margin-top:6px;">
          وحيث إن عذرها غير مقبول ، وبمقتضى النظام.
        </p>
      </div>

      <!-- Decisions Section -->
      <div style="font-size:11pt;font-weight:900;color:#0f766e;margin-top:4px;">يُقرر ما يلي :</div>
      <div class="decision-items">
        <div class="decision-item">
          [١] حسم مدة الغياب الموضحة بعاليه وعددها 
          (<span style="display:inline-block;padding:0 10px;font-weight:900;color:#b91c1c;font-size:12pt;border-bottom:2px solid #b91c1c;">${deductionDays}</span>) يوماً من راتبها .
        </div>
        <div class="decision-item">
          [٢] على إدارة شؤون الموظفات [ تنفيذ الأنظمة ] تنفيذ إجراء الحسم واستبعادها من خدماتها وأصل القرار لملفها بالإدارة مع الأساس لملفها ( <span style="font-weight:800">${decisionNumber}</span> ) .
        </div>
      </div>

      <div style="text-align:center;font-size:10.5pt;font-weight:800;color:#0f766e;margin:10px 0;">
        والله الموفق ،،،
      </div>

      <!-- Signatures & Stamp -->
      <div class="signatures-section">
        <div class="sig-box">
          <div style="font-weight:800;font-size:10pt;color:#0f766e;margin-bottom:6px;">الرئيس المباشر</div>
          <div>الاسم : ${principalName}</div>
          <div style="margin-top:4px;">التوقيع : ....................................................</div>
          <div style="margin-top:4px;">التاريخ : ${decisionDate}</div>
        </div>

        <div>
          <div class="stamp-box">الختم الرسمي</div>
        </div>
      </div>
    </div>

    <!-- Distribution List -->
    <div class="distribution-footer">
      <div>• صورة / للموظفات لمتابعة تنفيذ الحسم { تنفيذ الأنظمة } .</div>
      <div>• صورة / لمكتب التعليم .</div>
      <div>• صورة / لملفها بالمدرسة .</div>
    </div>
  </div>
</div>
${UNIFIED_PRINT_SCRIPT}
</body>
</html>`;
}

/**
 * دالة طباعة وتحميل قرار حسم مجموع ساعات التأخر (نموذج 19)
 */
export function printDeductionDecisionPdf(data: DeductionDecisionPdfData): void {
  const html = buildDeductionDecisionHtml(data);
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("يرجى السماح بالنوافذ المنبثقة لطباعة قرار الحسم.");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
