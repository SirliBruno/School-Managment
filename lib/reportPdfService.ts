import { MOE_LOGO_BASE64 } from "@/lib/moeLogo";
import { UNIFIED_PRINT_SCRIPT } from "@/lib/pdfTemplateBase";
import { renderOfficialApprovalFooterHtml } from "@/lib/stampSignatureManager";

export interface PdfReportPayload {
  reportTitle: string;
  reportCode: string;
  schoolName?: string;
  principalName?: string;
  creatorName?: string;
  dateFormatted: string;
  periodText?: string;
  summaryCards: { label: string; value: string | number; subtext?: string }[];
  tableHeaders: string[];
  tableRows: (string | number)[][];
  teacherDetailsCard?: {
    name: string;
    nationalId: string;
    specialty: string;
    jobTitle: string;
  };
  additionalSectionsHtml?: string;
  notes?: string;
  isStatisticalOnly?: boolean;
  isInternalOnly?: boolean;
}

const REPORT_CSS = `
@page { size: A4 portrait; margin: 8mm 10mm; }
* { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
body { font-family: 'Cairo', 'Segoe UI', sans-serif; direction: rtl; text-align: right; color: #0f172a; background: #fff; font-size: 8.5pt; line-height: 1.4; }
.report-page { width: 100%; min-height: 280mm; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; }
.report-page:last-child { page-break-after: avoid; }
.report-frame { border: 1.5px solid #0f766e; border-radius: 6px; padding: 8mm 9mm; display: flex; flex-direction: column; height: 100%; }

/* Header */
.hdr { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f766e; padding-bottom: 8px; margin-bottom: 10px; }
.hdr-r { width: 34%; text-align: right; font-size: 8.5pt; font-weight: 700; line-height: 1.45; color: #1e293b; }
.hdr-c { width: 32%; display: flex; flex-direction: column; align-items: center; gap: 3px; }
.hdr-l { width: 34%; text-align: left; font-size: 8.5pt; font-weight: 700; line-height: 1.45; color: #334155; }

/* Title bar */
.title-bar { display: flex; justify-content: space-between; align-items: center; background: #f0fdfa; border: 1.5px solid #0f766e; padding: 6px 14px; border-radius: 4px; margin-bottom: 12px; }
.title-bar-r { font-size: 11pt; font-weight: 900; color: #0f766e; }
.title-bar-l { font-size: 8.5pt; font-weight: 800; color: #115e59; direction: ltr; font-family: monospace; }

/* Summary Cards */
.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; margin-bottom: 14px; }
.summary-card { background: #f8fafc; border: 1px solid #cbd5e1; border-top: 3px solid #0f766e; border-radius: 4px; padding: 6px 10px; text-align: center; }
.summary-card-val { font-size: 13pt; font-weight: 900; color: #0f766e; }
.summary-card-lbl { font-size: 7.5pt; font-weight: 700; color: #475569; margin-top: 2px; }

/* Teacher Card */
.teacher-profile-card { background: #f8fafc; border: 1px solid #94a3b8; border-radius: 4px; padding: 8px 12px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
.teacher-profile-item { display: flex; flex-direction: column; }
.teacher-profile-lbl { font-size: 7.5pt; color: #64748b; font-weight: bold; }
.teacher-profile-val { font-size: 9pt; color: #0f172a; font-weight: 800; }

/* Table */
table.report-table { width: 100%; border-collapse: collapse; border: 1px solid #0f766e; font-size: 8pt; margin-bottom: 14px; }
table.report-table th { background: #0f766e; color: #ffffff; font-weight: 800; padding: 5px 6px; text-align: center; border: 1px solid #0d9488; }
table.report-table td { padding: 5px 6px; text-align: center; border: 1px solid #cbd5e1; color: #1e293b; font-weight: 500; }
table.report-table tr:nth-child(even) td { background: #f8fafc; }

/* Section Header */
.section-hdr { font-size: 9.5pt; font-weight: 800; color: #0f766e; margin: 10px 0 6px 0; border-bottom: 1.5px solid #ccfbf1; padding-bottom: 3px; display: flex; justify-content: space-between; }

/* Signatures */
.sig-container { display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; padding-top: 15px; border-top: 1px solid #cbd5e1; }
.sig-box { text-align: center; width: 30%; font-size: 8.5pt; }
.sig-title { font-weight: 800; color: #0f766e; margin-bottom: 35px; }
.sig-name { font-weight: 700; color: #334155; }

/* Official Footer */
.official-footer { font-size: 7.5pt; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 6px; margin-top: 10px; display: flex; justify-content: space-between; }
@media print { body { margin: 0; padding: 0; } }
`;

function esc(s: string | number | undefined | null): string {
  if (s === undefined || s === null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function buildReportHtml(payload: PdfReportPayload): string {
  const schoolName = esc(payload.schoolName || "الثانوية الخامسة مسارات");
  const principalName = esc(payload.principalName || "مديرة المدرسة");
  const creatorName = esc(payload.creatorName || "أحلام صالح الضبيبي");
  const reportTitle = esc(payload.reportTitle);
  const reportCode = esc(payload.reportCode);
  const dateFormatted = esc(payload.dateFormatted);
  const periodText = payload.periodText ? esc(payload.periodText) : "العام الدراسي الحالي";

  const summaryCardsHtml = payload.summaryCards
    .map(
      (c) => `
      <div class="summary-card">
        <div class="summary-card-val">${esc(c.value)}</div>
        <div class="summary-card-lbl">${esc(c.label)}</div>
      </div>
    `
    )
    .join("");

  const teacherCardHtml = payload.teacherDetailsCard
    ? `
    <div class="teacher-profile-card">
      <div class="teacher-profile-item">
        <span class="teacher-profile-lbl">اسم المعلمة:</span>
        <span class="teacher-profile-val">${esc(payload.teacherDetailsCard.name)}</span>
      </div>
      <div class="teacher-profile-item">
        <span class="teacher-profile-lbl">رقم الهوية:</span>
        <span class="teacher-profile-val">${esc(payload.teacherDetailsCard.nationalId)}</span>
      </div>
      <div class="teacher-profile-item">
        <span class="teacher-profile-lbl">التخصص:</span>
        <span class="teacher-profile-val">${esc(payload.teacherDetailsCard.specialty)}</span>
      </div>
      <div class="teacher-profile-item">
        <span class="teacher-profile-lbl">المسمى الوظيفي:</span>
        <span class="teacher-profile-val">${esc(payload.teacherDetailsCard.jobTitle)}</span>
      </div>
    </div>
  `
    : "";

  const thHtml = payload.tableHeaders
    .map((h) => `<th>${esc(h)}</th>`)
    .join("");

  const rowsHtml = payload.tableRows
    .map(
      (row) => `
      <tr>
        ${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}
      </tr>
    `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${reportTitle}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
${REPORT_CSS}
</style>
</head>
<body>
<div class="report-page">
  <div class="report-frame">
    <!-- Header -->
    <div class="hdr">
      <div class="hdr-r">
        <div>المملكة العربية السعودية</div>
        <div>وزارة التعليم</div>
        <div>الإدارة العامة للتعليم بمنطقة مكة المكرمة</div>
        <div>${schoolName}</div>
      </div>
      <div class="hdr-c">
        <img src="${MOE_LOGO_BASE64}" alt="وزارة التعليم" style="height: 52px; width: auto; object-fit: contain; margin-bottom: 2px;" />
      </div>
      <div class="hdr-l">
        <div>تاريخ الإصدار: ${dateFormatted}</div>
        <div>الفترة: ${periodText}</div>
        <div>المرجع الإداري: إلكتروني موثق</div>
      </div>
    </div>

    <!-- Title Bar -->
    <div class="title-bar">
      <div class="title-bar-r">${reportTitle}</div>
      <div class="title-bar-l">رمز النموذج: ${reportCode}</div>
    </div>

    ${teacherCardHtml}

    ${
      payload.summaryCards.length > 0
        ? `<div class="summary-grid">${summaryCardsHtml}</div>`
        : ""
    }

    <!-- Table -->
    <table class="report-table">
      <thead>
        <tr>${thHtml}</tr>
      </thead>
      <tbody>
        ${rowsHtml || `<tr><td colspan="${payload.tableHeaders.length}" style="padding:15px; color:#64748b;">لا توجد سجلات مطابقة للفترة المحددة</td></tr>`}
      </tbody>
    </table>

    ${payload.additionalSectionsHtml || ""}

    <!-- Official Approval Footer / Signatures -->
    ${
      payload.isStatisticalOnly || payload.isInternalOnly
        ? `
    <div style="margin-top: 14px; padding: 8px 12px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 4px; text-align: center; color: #64748b; font-size: 8pt;">
      تقرير إحصائي داخلي للأغراض الإدارية والتحليلية المدرسية — لا يتطلب اعتمادات أو أختام رسمية خارجية.
    </div>`
        : renderOfficialApprovalFooterHtml({
            schoolName,
            officialTitle: "وكيلة المدرسة",
            officialName: creatorName,
            secondaryTitle: "مديرة المدرسة",
            secondaryName: principalName,
            date: payload.dateFormatted,
          })
    }

    <!-- Official Footer -->
    <div class="official-footer">
      <span>تم توليد التقرير آلياً عبر منصة الغياب والإجراءات الإدارية المدرسية</span>
      <span>وثيقة معتمدة داخلياً - الثانوية الخامسة مسارات</span>
      <span>صفحة 1 من 1</span>
    </div>
  </div>
</div>

${UNIFIED_PRINT_SCRIPT}
</body>
</html>`;
}

export function printReportPdf(payload: PdfReportPayload): void {
  if (typeof window === "undefined") return;

  const html = buildReportHtml(payload);

  try {
    const frameId = "__report_print_iframe__";
    const oldFrame = document.getElementById(frameId);
    if (oldFrame && oldFrame.parentNode) {
      oldFrame.parentNode.removeChild(oldFrame);
    }

    const iframe = document.createElement("iframe");
    iframe.id = frameId;
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.opacity = "0.001";
    iframe.style.pointerEvents = "none";
    iframe.style.zIndex = "-9999";

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        const frame = document.getElementById(frameId);
        if (frame && frame.parentNode) {
          frame.parentNode.removeChild(frame);
        }
      }, 120000);
      return;
    }
  } catch (err) {
    console.warn("Hidden iframe print failed, falling back to window.open", err);
  }

  try {
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      return;
    }
  } catch (openErr) {
    console.error("Window open print failed:", openErr);
  }

  alert("تعذر فتح أمر الطباعة تلقائياً. يرجى السماح بالنوافذ المنبثقة.");
}
