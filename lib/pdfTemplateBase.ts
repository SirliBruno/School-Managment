import { MOE_LOGO_BASE64 } from "@/lib/moeLogo";

/**
 * الأنماط القياسية الموحدة لجميع استمارات ونماذج الطباعة PDF في المنصة
 */
export const UNIFIED_PDF_CSS = `
@page { size: A4; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
body { font-family: 'Cairo', sans-serif; direction: rtl; text-align: right; color: #0f172a; background: #fff; font-size: 9pt; line-height: 1.35; }
.page { width: 210mm; height: 297mm; padding: 7mm 9mm; overflow: hidden; }
.frame { border: 2px dashed #0f766e; padding: 6mm 7mm; height: 283mm; display: flex; flex-direction: column; }
.hdr { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f766e; padding-bottom: 8px; margin-bottom: 10px; }
.hdr-r { width: 34%; text-align: right; font-size: 8.5pt; font-weight: bold; line-height: 1.45; }
.hdr-c { width: 32%; display: flex; flex-direction: column; align-items: center; gap: 3px; }
.hdr-l { width: 34%; text-align: left; font-size: 8.5pt; font-weight: bold; line-height: 1.45; color: #334155; }
.title-bar { display: flex; justify-content: space-between; align-items: center; background: #f0fdfa; border: 1.5px solid #0f766e; padding: 4px 12px; border-radius: 4px; margin-bottom: 10px; }
.title-bar-r { font-size: 10.5pt; font-weight: 900; color: #0f766e; }
.title-bar-l { font-size: 8.5pt; font-weight: 800; color: #115e59; direction: ltr; }
table { width: 100%; table-layout: fixed; border-collapse: collapse; border: 1px solid #0f766e; font-size: 8.5pt; }
.t1 { margin-bottom: 8px; }
.t2 { margin-bottom: 10px; }
th, td { vertical-align: middle; padding: 5px 7px; }
.hc { background: #f0fdfa; color: #115e59; font-weight: bold; text-align: center; border-left: 1px solid #0f766e; }
.hc:last-child { border-left: none; }
.vc { color: #0f172a; font-weight: bold; text-align: center; border-left: 1px solid #0f766e; }
.vc:last-child { border-left: none; }
.sec { padding-top: 8px; margin-bottom: 10px; font-size: 8.5pt; }
.sbl { border-top: 1px solid #cbd5e1; }
.sbd { border-top: 1.5px dashed #0f766e; }
.sh { display: flex; justify-content: space-between; align-items: center; font-weight: bold; color: #0f766e; margin-bottom: 4px; }
.st { font-size: 9pt; font-weight: 800; }
.sg { font-weight: bold; color: #334155; margin-bottom: 3px; font-size: 8.5pt; }
.sb { color: #1e293b; line-height: 1.45; font-size: 8.5pt; }
.bullets-box { background: #fafafa; border: 1px solid #e2e8f0; border-radius: 4px; padding: 6px 12px; margin: 6px 0; }
.bullet-item { display: flex; align-items: flex-start; gap: 6px; font-weight: 700; color: #0f172a; margin-bottom: 3px; }
.bullet-dot { color: #0f766e; font-size: 12pt; line-height: 1; }
.rbox { border: 1px solid #cbd5e1; background: #fafafa; border-radius: 4px; padding: 6px 10px; min-height: 38px; margin: 4px 0; }
.sig { display: flex; justify-content: space-between; align-items: center; width: 100%; margin-top: 8px; font-size: 8.5pt; font-weight: bold; }
.decision-box { border: 1px solid #0f766e; background: #f0fdfa; border-radius: 4px; padding: 6px 10px; margin-top: 6px; }
.cr { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: 8.5pt; font-weight: bold; color: #1e293b; }
.cb { width: 14px; height: 14px; border: 1.5px solid #0f766e; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; font-size: 10pt; color: #0f766e; font-weight: 900; background: #fff; flex-shrink: 0; }
.spacer { flex: 1; }
.ftr { border-top: 1px solid #cbd5e1; padding-top: 6px; margin-top: auto; }
.ft { font-weight: bold; color: #b91c1c; margin-bottom: 2px; font-size: 8pt; }
.nr { font-size: 7.5pt; color: #64748b; line-height: 1.35; }
@media print { body { margin: 0; padding: 0; } }
`;

export interface OfficialHeaderProps {
  formTitle: string;
  formCode: string;
  dateFormatted: string;
  numberFormatted?: string;
  attachmentsFormatted?: string;
}

/**
 * بناء ترويسة النموذج وشريط العنوان الموحد
 */
export function renderOfficialHeader({
  formTitle,
  formCode,
  dateFormatted,
  numberFormatted = "....................",
  attachmentsFormatted = "....................",
}: OfficialHeaderProps): string {
  return `
<!-- Header -->
<div class="hdr">
  <div class="hdr-r">
    <div>المملكة العربية السعودية</div>
    <div>وزارة التعليم</div>
    <div>الإدارة العامة للتعليم بمنطقة مكة المكرمة</div>
  </div>
  <div class="hdr-c">
    <img src="${MOE_LOGO_BASE64}" alt="وزارة التعليم" style="height: 52px; width: auto; object-fit: contain; margin-bottom: 2px;" />
  </div>
  <div class="hdr-l">
    <div>التاريخ : ${dateFormatted} م</div>
    <div>الرقم : ${numberFormatted}</div>
    <div>المشفوعات : ${attachmentsFormatted}</div>
  </div>
</div>

<!-- Title Bar -->
<div class="title-bar">
  <div class="title-bar-r">اسم النموذج : ${formTitle}</div>
  <div class="title-bar-l">رمز النموذج ( ${formCode} )</div>
</div>
`;
}

/**
 * بناء جدول بيانات المدرسة الموحد (الجدول الأول)
 */
export function renderSchoolInfoTable(civilRegistry: string, schoolName = "الثانوية الخامسة مسارات"): string {
  return `
<!-- Table 1: School Info -->
<table class="t1">
  <thead>
    <tr>
      <th class="hc" style="width:50%">المدرسة</th>
      <th class="hc" style="width:50%;border-left:none">السجل المدني</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="vc" style="font-weight:800;color:#0f766e">${schoolName}</td>
      <td class="vc" style="font-family:monospace;font-weight:800;border-left:none">${civilRegistry || "—"}</td>
    </tr>
  </tbody>
</table>
`;
}

/**
 * كود الطباعة التلقائي الموحد للمتصفحات
 */
export const UNIFIED_PRINT_SCRIPT = `
<script>
var printed = false;
function doPrint() {
  if (printed) return;
  printed = true;
  try {
    window.focus();
    window.print();
  } catch(e) {}
}
window.onafterprint = function() {
  try {
    if (window.frameElement && window.frameElement.parentNode) {
      window.frameElement.parentNode.removeChild(window.frameElement);
    } else {
      window.close();
    }
  } catch(e) {}
};
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(function() {
    setTimeout(doPrint, 350);
  });
  setTimeout(doPrint, 1500);
} else {
  window.onload = function() {
    setTimeout(doPrint, 500);
  };
  setTimeout(doPrint, 1500);
}
</script>
`;
