import { AdministrativeInquiry, Teacher } from "@/types/teacher";
import {
  UNIFIED_PDF_CSS,
  UNIFIED_PRINT_SCRIPT,
  esc,
} from "@/lib/pdfTemplateBase";
import { MOE_LOGO_BASE64 } from "@/lib/moeLogo";
import { getSchoolApprovalSettings } from "@/lib/stampSignatureManager";
import { DEFAULT_ADMIN_NAME } from "@/context/AuthContext";
import { DEFAULT_PRINCIPAL_NAME, getActiveSchoolSettings } from "@/lib/schoolSettingsService";
import {
  DEFAULT_STAMP_BASE64,
  DEFAULT_PRINCIPAL_SIGNATURE_BASE64,
  DEFAULT_VICE_PRINCIPAL_SIGNATURE_BASE64,
} from "@/lib/defaultApprovalAssets";

export interface AdministrativeInquiryPdfData {
  inquiry: AdministrativeInquiry;
  teacher: Teacher;
}

const ARABIC_DAYS = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

function getArabicDayName(dateStr: string): string {
  if (!dateStr) return "................";
  const parts = dateStr.split("-").map(Number);
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const idx = d.getDay();
    if (!isNaN(idx) && idx >= 0 && idx < 7) return ARABIC_DAYS[idx];
  }
  return "................";
}

function formatDMY(dateStr?: string | null): string {
  if (!dateStr) return ".... / .... / ........";
  const p = dateStr.split("T")[0].split("-");
  if (p.length === 3) return `${p[2]} / ${p[1]} / ${p[0]} م`;
  return dateStr;
}

/**
 * بناء شفرة HTML لطباعة استمارة "مساءلة خطية" الرسمية
 * مطابقة للنموذج الورقي الرسمي للمملكة مع الحفاظ على هوية المنصة الأنيقة
 */
export function buildAdministrativeInquiryPdfHtml(
  data: AdministrativeInquiryPdfData
): string {
  const { inquiry, teacher } = data;
  const teacherName = esc(
    inquiry.teacherName || teacher.fullName || teacher.name || "المعلمة"
  );
  const nationalId = esc(
    inquiry.nationalId ||
      teacher.nationalId ||
      inquiry.jobNumber ||
      teacher.jobNumber ||
      "—"
  );
  const specialty = esc(
    inquiry.specialty || teacher.specialty || teacher.teachingField || "عام"
  );

  const incidentDay = getArabicDayName(inquiry.incidentDate);
  const incidentDateFormatted = formatDMY(inquiry.incidentDate);
  const createdDateFormatted = formatDMY(inquiry.createdAt);
  const responseDateFormatted = formatDMY(inquiry.responseDate);
  const decisionDateFormatted = formatDMY(inquiry.decisionDate);

  // إعدادات المدرسة والأختام والتواقيع
  const schoolSettings = getActiveSchoolSettings();
  const approval = getSchoolApprovalSettings();
  const schoolName = esc(schoolSettings.schoolName || "المدرسة");
  const principalName = esc(schoolSettings.principalName || DEFAULT_PRINCIPAL_NAME);
  const vicePrincipalName = esc(
    schoolSettings.vicePrincipalName || DEFAULT_ADMIN_NAME
  );

  const stampImg = approval.schoolStampUrl || DEFAULT_STAMP_BASE64;
  const principalSig =
    approval.principalSignatureUrl || DEFAULT_PRINCIPAL_SIGNATURE_BASE64;
  const viceSig =
    approval.vicePrincipalSignatureUrl ||
    DEFAULT_VICE_PRINCIPAL_SIGNATURE_BASE64;

  const showSignatures = approval.signatureEnabled;
  const showStamp = approval.stampEnabled;

  // تحديد خيار المخالفة
  const isDelayClass = inquiry.inquiryType === "التأخير عن دخول الحصص";
  const isEarlyClass =
    inquiry.inquiryType === "الخروج من الحصص قبل انتهاء الوقت";
  const isRefuseWait = inquiry.inquiryType === "الامتناع عن دخول حصص الانتظار";
  const isRefuseDuty = inquiry.inquiryType === "الامتناع عن المناوبة";
  const isOther = inquiry.inquiryType === "أخرى";

  const descriptionText = esc(inquiry.description || inquiry.vicePrincipalNotes || "");
  const customTypeText = esc(inquiry.customType || "");

  // رأي قائدة المدرسة
  const isAccepted = inquiry.directorDecision === "accepted";
  const isRejected = inquiry.directorDecision === "rejected";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>مساءلة خطية - ${teacherName}</title>
<style>
${UNIFIED_PDF_CSS}

/* تكييف خاص بنموذج المساءلة الخطية */
.official-paper-container {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}

.paper-title {
  text-align: center;
  font-size: 15pt;
  font-weight: 900;
  letter-spacing: 0.5px;
  color: #0f172a;
  margin: 6px 0 12px 0;
  text-decoration: underline;
  text-underline-offset: 6px;
}

.intro-salutation {
  font-size: 10pt;
  font-weight: bold;
  color: #334155;
  margin-bottom: 6px;
}

.recipient-line {
  font-size: 10.5pt;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 8px;
}

.incident-statement {
  font-size: 9.5pt;
  line-height: 1.6;
  margin-bottom: 8px;
  font-weight: 600;
}

.violation-options-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 8px 0 12px 0;
  padding-right: 12px;
}

.violation-row {
  display: flex;
  align-items: center;
  font-size: 9.5pt;
  font-weight: 700;
  color: #1e293b;
}

.option-circle {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1.8px solid #0f766e;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  flex-shrink: 0;
  font-size: 10pt;
  font-weight: 900;
  color: #0f766e;
  background-color: #fff;
}

.option-circle.active {
  background-color: #0f766e;
  color: #ffffff;
}

.divider-stars {
  text-align: center;
  letter-spacing: 4px;
  color: #0f766e;
  font-weight: 900;
  font-size: 11pt;
  margin: 10px 0;
}

.response-box-area {
  border: 1px solid #cbd5e1;
  background-color: #fafbfc;
  border-radius: 6px;
  padding: 8px 12px;
  min-height: 60px;
  font-size: 9.5pt;
  line-height: 1.5;
  color: #0f172a;
  margin: 6px 0;
}

.decision-section {
  background-color: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px 12px;
  margin-top: 6px;
}

.sig-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 9pt;
  font-weight: bold;
}

.footer-roles-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  text-align: center;
  padding-top: 10px;
  margin-top: auto;
  border-top: 1px solid #e2e8f0;
}

.sig-stamp-box {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.sig-img {
  max-height: 48px;
  max-width: 140px;
  object-fit: contain;
}

.stamp-overlay {
  position: absolute;
  max-height: 60px;
  max-width: 60px;
  opacity: 0.85;
  left: 20px;
  top: -5px;
  pointer-events: none;
}
</style>
</head>
<body>
<div class="page">
<div class="frame">
<div class="official-paper-container">

  <!-- Header -->
  <div class="hdr">
    <div class="hdr-r">
      <div>المملكة العربية السعودية</div>
      <div>وزارة التعليم</div>
      <div>الإدارة العامة للتعليم</div>
      <div>مدرسة: ${schoolName}</div>
    </div>
    <div class="hdr-c">
      <img src="${MOE_LOGO_BASE64}" alt="وزارة التعليم" style="height: 52px; width: auto; object-fit: contain; margin-bottom: 2px;" />
    </div>
    <div class="hdr-l">
      <div>رقم المساءلة : ${esc(inquiry.inquiryNumber || inquiry.id.slice(0, 8))}</div>
      <div>التاريخ : ${createdDateFormatted}</div>
      <div>المشفوعات : ${inquiry.attachmentUrl ? "يوجد مرفق إلكتروني" : "لا يوجد"}</div>
    </div>
  </div>

  <!-- Form Title -->
  <div class="paper-title">مساءلة خطية</div>

  <!-- القسم الأول: توجيه المساءلة -->
  <div class="intro-salutation">السلام عليكم ورحمة الله وبركاته ... وبعد</div>
  <div class="recipient-line">
    المكرمة المعلمة : <span style="color:#0f766e">${teacherName}</span> (السجل المدني: ${nationalId}) — التخصص: (${specialty})
  </div>

  <div class="incident-statement">
    إنه في يوم <strong>${incidentDay}</strong> الموافق <strong>${incidentDateFormatted}</strong> اتضح ما يلي :
  </div>

  <!-- قائمة الخيارات الأربعة مع الدوائر -->
  <div class="violation-options-list">
    <div class="violation-row">
      <span class="option-circle ${isDelayClass ? "active" : ""}">
        ${isDelayClass ? "✓" : "○"}
      </span>
      <span>التأخير عن دخول الحصص ${isDelayClass && descriptionText ? `(${descriptionText})` : "(....................)"}</span>
    </div>

    <div class="violation-row">
      <span class="option-circle ${isEarlyClass ? "active" : ""}">
        ${isEarlyClass ? "✓" : "○"}
      </span>
      <span>الخروج من الحصة قبل انتهاء الوقت ${isEarlyClass && descriptionText ? `(${descriptionText})` : "(....................)"}</span>
    </div>

    <div class="violation-row">
      <span class="option-circle ${isRefuseWait ? "active" : ""}">
        ${isRefuseWait ? "✓" : "○"}
      </span>
      <span>الامتناع عن دخول حصص الانتظار ${isRefuseWait && descriptionText ? `(${descriptionText})` : "(....................)"}</span>
    </div>

    <div class="violation-row">
      <span class="option-circle ${isRefuseDuty ? "active" : ""}">
        ${isRefuseDuty ? "✓" : "○"}
      </span>
      <span>الامتناع عن فترات المناوبة ${isRefuseDuty && descriptionText ? `(${descriptionText})` : "(....................)"}</span>
    </div>

    ${
      isOther
        ? `<div class="violation-row">
             <span class="option-circle active">✓</span>
             <span>أخرى: ${customTypeText || "مساءلة إدارية"} ${descriptionText ? `(${descriptionText})` : ""}</span>
           </div>`
        : ""
    }
  </div>

  <div style="font-size: 9.5pt; font-weight: 800; color: #0f172a; margin: 4px 0 10px 0;">
    عليه نأمل توضيح أسباب ذلك مع إرفاق ما يؤيد عذركم .... ولكم تحياتي
  </div>

  <!-- توقيع القسم الأول -->
  <div class="sig-row" style="margin-bottom: 6px;">
    <div>قائدة المدرسة : <span style="font-weight:700">${principalName}</span></div>
    <div>التوقيع : <span>${showSignatures && principalSig ? `<img src="${principalSig}" class="sig-img" alt="توقيع" />` : "...................."}</span></div>
    <div>التاريخ : <span>${createdDateFormatted}</span></div>
  </div>

  <!-- خط النجوم الفاصل -->
  <div class="divider-stars">*********************************</div>

  <!-- القسم الثاني: إفادة المعلمة -->
  <div class="recipient-line" style="font-size: 10pt; margin-bottom: 4px;">
    المكرمة قائدة المدرسة / <span style="color:#0f766e">${principalName}</span> .. وفقها الله
  </div>
  <div class="intro-salutation" style="margin-bottom: 4px;">
    السلام عليكم ورحمة الله وبركاته ...... وبعد :
  </div>
  <div style="font-size: 9.5pt; font-weight: 700; margin-bottom: 4px;">
    أفيدكم أن أسباب ذلك ما يلي :
  </div>

  <div class="response-box-area">
    ${
      inquiry.teacherResponse
        ? esc(inquiry.teacherResponse)
        : "<span style='color:#94a3b8; font-style:italic;'>لم تقدم المعلمة الإفادة رسمياً حتى تاريخ طباعة هذا النموذج.</span>"
    }
  </div>

  <div class="sig-row" style="margin-bottom: 8px;">
    <div>اسم الموظفة : <span style="font-weight:700">${teacherName}</span></div>
    <div>التوقيع : <span>${inquiry.teacherResponse ? "تم التوقيع والمصادقة إلكترونياً" : "...................."}</span></div>
    <div>التاريخ : <span>${inquiry.responseDate ? responseDateFormatted : ".... / .... / ........"}</span></div>
  </div>

  <!-- القسم الثالث: رأي قائدة المدرسة -->
  <div class="decision-section">
    <div style="font-size: 10pt; font-weight: 800; color: #0f766e; margin-bottom: 6px;">
      رأي قائدة المدرسة :
    </div>
    <div style="display:flex; gap:24px; margin-bottom: 6px; font-size: 9.5pt; font-weight: bold;">
      <div style="display:flex; align-items:center;">
        <span class="option-circle ${isAccepted ? "active" : ""}">
          ${isAccepted ? "✓" : "○"}
        </span>
        <span style="color:${isAccepted ? "#059669" : "#334155"}">عذرها مقبول .</span>
      </div>
      <div style="display:flex; align-items:center;">
        <span class="option-circle ${isRejected ? "active" : ""}">
          ${isRejected ? "✓" : "○"}
        </span>
        <span style="color:${isRejected ? "#dc2626" : "#334155"}">عذرها غير مقبول .</span>
      </div>
    </div>

    ${
      inquiry.directorNotes
        ? `<div style="font-size: 9pt; color: #475569; margin-bottom: 6px;">
             <strong>توجيه وملاحظات المديرة :</strong> ${esc(inquiry.directorNotes)}
           </div>`
        : ""
    }

    <div class="sig-row">
      <div>مديرة المدرسة : <span style="font-weight:700">${principalName}</span></div>
      <div>التوقيع : <span>${showSignatures && isAccepted || isRejected ? `<img src="${principalSig}" class="sig-img" alt="توقيع" />` : "...................."}</span></div>
      <div>التاريخ : <span>${inquiry.decisionDate ? decisionDateFormatted : ".... / .... / ........"}</span></div>
    </div>
  </div>

  <!-- التوقيع والاعتماد النهائي بالأسفل -->
  <div class="footer-roles-grid">
    <div>
      <div style="font-weight: 800; font-size: 9pt; margin-bottom: 4px;">
        إعداد وكيلة الشؤون المدرسية والتعليمية والطلابية
      </div>
      <div style="font-size: 9pt; color: #334155; font-weight: 700;">
        ${vicePrincipalName}
      </div>
      <div class="sig-stamp-box">
        ${
          showSignatures && viceSig
            ? `<img src="${viceSig}" class="sig-img" alt="توقيع الوكيلة" />`
            : ""
        }
      </div>
    </div>

    <div>
      <div style="font-weight: 800; font-size: 9pt; margin-bottom: 4px;">
        قائدة المدرسة
      </div>
      <div style="font-size: 9pt; color: #334155; font-weight: 700;">
        ${principalName}
      </div>
      <div class="sig-stamp-box">
        ${
          showSignatures && principalSig
            ? `<img src="${principalSig}" class="sig-img" alt="توقيع المديرة" />`
            : ""
        }
        ${
          showStamp && stampImg
            ? `<img src="${stampImg}" class="stamp-overlay" alt="ختم المدرسة" />`
            : ""
        }
      </div>
    </div>
  </div>

</div>
</div>
</div>

${UNIFIED_PRINT_SCRIPT}
</body>
</html>`;
}

/**
 * تنفيذ أمر الطباعة المباشر للمساءلة الإدارية
 */
export function printAdministrativeInquiryPdf(
  inquiry: AdministrativeInquiry,
  teacher?: Teacher
): void {
  if (typeof window === "undefined") return;

  const resolvedTeacher: Teacher = teacher || {
    id: inquiry.teacherId,
    fullName: inquiry.teacherName || "معلمة",
    name: inquiry.teacherName || "معلمة",
    nationalId: inquiry.nationalId || inquiry.jobNumber || "—",
    username: inquiry.nationalId || inquiry.jobNumber || "—",
    jobNumber: inquiry.nationalId || inquiry.jobNumber || "—",
    specialty: inquiry.specialty || "عام",
    totalAbsences: 0,
    employmentStatus: "دائم",
    jobTitle: inquiry.jobTitle || "معلم",
  };

  const html = buildAdministrativeInquiryPdfHtml({
    inquiry,
    teacher: resolvedTeacher,
  });

  // استراتيجية 1: Hidden iframe للطباعة بدون حظر النوافذ المنبثقة
  try {
    const frameId = "__admin_inquiry_print_iframe__";
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
    console.warn(
      "فشلت الطباعة عبر الإطار المخفي، جاري المحاولة عبر نافذة جديدة:",
      err
    );
  }

  // استراتيجية 2: البديل عبر window.open
  try {
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      return;
    }
  } catch (openErr) {
    console.error("فشل فتح نافذة جديدة للطباعة:", openErr);
  }

  alert("تعذر فتح أمر الطباعة تلقائياً. يرجى مراجعة إعدادات الأمان في المتصفح.");
}
