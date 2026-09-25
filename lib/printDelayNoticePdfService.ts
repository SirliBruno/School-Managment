import { DelayNotice, Teacher } from "@/types/teacher";
import {
  UNIFIED_PDF_CSS,
  UNIFIED_PRINT_SCRIPT,
  renderOfficialHeader,
  renderSchoolInfoTable,
} from "@/lib/pdfTemplateBase";

export interface DelayNoticePdfData {
  notice: DelayNotice;
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

function formatDMY(dateStr: string): string {
  if (!dateStr) return "..../..../١٤..";
  const p = dateStr.split("-");
  if (p.length === 3) return `${p[2]}-${p[1]}-${p[0]}`;
  return dateStr;
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

function buildHtml(data: DelayNoticePdfData): string {
  const { notice, teacher } = data;
  const teacherName = esc(notice.teacherName || teacher.fullName || teacher.name);
  const jobNumber = esc(notice.jobNumber || teacher.username || teacher.jobNumber);
  const specialty = esc(notice.specialty || teacher.specialty || teacher.teachingField || "عام");
  const jobTitle = esc(teacher.jobTitle || "معلم");

  const dayName = getArabicDayName(notice.noticeDate);
  const dateFormatted = formatDMY(notice.noticeDate);
  const hijriYear = esc(notice.hijriYear || "١٤٤٨");

  // Construct bullet points for checked violations ONLY
  const violationBullets: string[] = [];

  if (notice.violationDelayStart) {
    const to = notice.delayStartTime ? esc(notice.delayStartTime) : "................";
    const duration = notice.calculatedDuration ? ` [المدة: ${esc(notice.calculatedDuration)}]` : "";
    violationBullets.push(
      `تأخركم من بداية الدوام وحضوركم الساعة (${to})${duration}.`
    );
  }

  if (notice.violationAbsentDuring) {
    const from = notice.absentFromTime ? esc(notice.absentFromTime) : "........";
    const to = notice.absentToTime ? esc(notice.absentToTime) : "........";
    const duration = notice.calculatedDuration ? ` [المدة: ${esc(notice.calculatedDuration)}]` : "";
    violationBullets.push(
      `عدم تواجدكم أثناء الدوام من الساعة (${from}) إلى الساعة (${to})${duration}.`
    );
  }

  if (notice.violationEarlyDeparture) {
    const to = notice.earlyDepartureTime ? esc(notice.earlyDepartureTime) : "................";
    const duration = notice.calculatedDuration ? ` [المدة: ${esc(notice.calculatedDuration)}]` : "";
    violationBullets.push(
      `انصرافكم مبكراً قبل نهاية الدوام من الساعة (${to})${duration}.`
    );
  }

  if (notice.violationLeftSchool) {
    const details = notice.leftSchoolDetails ? esc(notice.leftSchoolDetails) : "................";
    const duration = notice.calculatedDuration ? ` [المدة: ${esc(notice.calculatedDuration)}]` : "";
    violationBullets.push(
      `انصرافكم من غير المدرسة (${details})${duration}.`
    );
  }

  const teacherReasonHtml = notice.teacherReason?.trim()
    ? `<span style="font-weight:bold">${esc(notice.teacherReason)}</span>`
    : `<span style="color:#94a3b8">......................................................................................................................................................................</span>`;

  const teacherSigDate = notice.teacherSignatureDate
    ? formatDMY(notice.teacherSignatureDate)
    : dateFormatted;

  const directorSigDate = notice.directorSignatureDate
    ? formatDMY(notice.directorSignatureDate)
    : `..../ ..../ ${hijriYear} هـ`;

  const isAccepted = notice.directorOpinion === "accepted";
  const isRejected = notice.directorOpinion === "rejected_with_deduction";

  const headerHtml = renderOfficialHeader({
    formTitle: "تنبيه عن تأخر / انصراف",
    formCode: "و.م.ع.ن - ٠٢ - ٠٢",
    dateFormatted: dateFormatted,
  });

  const schoolTableHtml = renderSchoolInfoTable(jobNumber);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>تنبيه عن تأخر / انصراف - ${teacherName}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
${UNIFIED_PDF_CSS}
</style>
</head>
<body>
<div class="page">
<div class="frame">

${headerHtml}

${schoolTableHtml}

<!-- Table 2: Teacher Info -->
<table class="t2">
  <thead>
    <tr>
      <th class="hc" style="width:28%">الاسم</th>
      <th class="hc" style="width:18%">التخصص</th>
      <th class="hc" style="width:18%">المستوى / المرتبة</th>
      <th class="hc" style="width:18%">رقم الوظيفة</th>
      <th class="hc" style="width:18%;border-left:none">العمل الحالي</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="vc" style="text-align:right;font-weight:800">${teacherName}</td>
      <td class="vc">${specialty}</td>
      <td class="vc"></td>
      <td class="vc"></td>
      <td class="vc" style="border-left:none">${jobTitle}</td>
    </tr>
  </tbody>
</table>

<!-- Stage 1 Body: Vice-Principal / Notice Body -->
<div class="sec sbl">
  <div class="sh">
    <span class="st">( ١ ) تنبيه عن مخالفة مواعيد الدوام الرسمي</span>
    <span style="font-size:8.5pt">المكرمة المعلمة / <strong style="color:#0f766e">${teacherName}</strong> وفقها الله</span>
  </div>
  <div class="sg">السلام عليكم ورحمة الله وبركاته ،،، وبعد :</div>
  <div class="sb">
    إنه في يوم <strong style="color:#0f766e">(${dayName})</strong> الموافق: <strong style="font-family:monospace;color:#0f766e">${dateFormatted} م</strong> اتضح ما يلي :
  </div>

  <!-- Only Checked Violations -->
  <div class="bullets-box">
    ${
      violationBullets.length > 0
        ? violationBullets
            .map(
              (b) => `
      <div class="bullet-item">
        <span class="bullet-dot">•</span>
        <span>${b}</span>
      </div>`
            )
            .join("")
        : `<div style="color:#64748b;font-style:italic">لم يتم تحديد أي بند مخالفة.</div>`
    }
  </div>

  <div class="sb" style="margin-top:4px">
    عليه نأمل توضيح أسباب ذلك مع إرفاق ما يؤيد عذركِ ،،، ولكم تحياتي ..
  </div>

  <div class="sig">
    <div style="width:40%;text-align:right">مديرة المدرسة : <strong>فاطمة فلاتة</strong></div>
    <div style="width:32%;text-align:center">التوقيع : ........................</div>
    <div style="width:28%;text-align:left">التاريخ : ${dateFormatted} م</div>
  </div>
</div>

<!-- Stage 2 Body: Teacher Response -->
<div class="sec sbd">
  <div class="sh">
    <span class="st">( ٢ ) رد وإفادة المعلمة</span>
    <span style="font-size:8.5pt">المكرمة / قائدة المدرسة وفقها الله</span>
  </div>
  <div class="sg">السلام عليكم ورحمة الله وبركاته ،،، وبعد :</div>
  <div style="font-size:8.5pt;margin-bottom:2px;font-weight:bold;color:#334155">
    أفيدكم أن أسباب ذلك ما يلي :
  </div>
  <div class="rbox">${teacherReasonHtml}</div>
  <div class="sig">
    <div style="width:40%;text-align:right">اسم الموظفة : <strong>${teacherName}</strong></div>
    <div style="width:32%;text-align:center">التوقيع : ........................</div>
    <div style="width:28%;text-align:left">التاريخ : ${teacherSigDate} م</div>
  </div>
  ${
    notice.teacherResponseSubmittedAt
      ? `<div style="margin-top:4px;font-size:7.5pt;color:#0f766e;font-weight:bold">✓ تم استلام هذا الرد إلكترونياً بتاريخ (${formatDMY(
          notice.teacherResponseSubmittedAt.split("T")[0]
        )} م)</div>`
      : ""
  }
</div>

<!-- Stage 3 Body: Director Decision -->
<div class="sec sbd" style="margin-bottom:0">
  <div style="text-align:center;font-weight:900;color:#0f766e;margin-bottom:4px;font-size:9.5pt">
    ( ٣ ) رأي قائدة المدرسة
  </div>
  <div class="decision-box">
    <div class="cr">
      <span class="cb">${isAccepted ? "✓" : ""}</span>
      <span>عذره مقبول .</span>
    </div>
    <div class="cr" style="margin-bottom:0">
      <span class="cb">${isRejected ? "✓" : ""}</span>
      <span>عذره غير مقبول ويحسم عليه .</span>
    </div>
  </div>
  <div class="sig">
    <div style="width:40%;text-align:right">قائدة المدرسة : <strong>فاطمة فلاتة</strong></div>
    <div style="width:32%;text-align:center">التوقيع : ........................</div>
    <div style="width:28%;text-align:left">التاريخ : ${directorSigDate}</div>
  </div>
</div>

<div class="spacer"></div>

<!-- Footer Note -->
<div class="ftr">
  <div class="ft">ملاحظة نظامية هامة :</div>
  <div class="nr">
    ترفق بطاقة المساءلة مع أصل القرار في حالة عدم قبول العذر لحفظها بملف الإدارة ، وأصل لملفها بالمدرسة .
  </div>
</div>

</div>
</div>

${UNIFIED_PRINT_SCRIPT}
</body>
</html>`;
}

export function printDelayNoticePdf(notice: DelayNotice, teacher?: Teacher): void {
  if (typeof window === "undefined") return;

  const resolvedTeacher: Teacher = teacher || {
    id: notice.teacherId,
    fullName: notice.teacherName || "معلمة",
    name: notice.teacherName || "معلمة",
    username: notice.jobNumber || "—",
    jobNumber: notice.jobNumber || "—",
    specialty: notice.specialty || "عام",
    totalAbsences: 0,
    employmentStatus: "دائم",
    jobTitle: "معلم",
  };

  const html = buildHtml({ notice, teacher: resolvedTeacher });

  // Strategy 1: Hidden iframe (bypasses popup blocker reliably)
  try {
    const frameId = "__delay_notice_print_iframe__";
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
    console.warn("فشلت الطباعة عبر الإطار المخفي، جاري المحاولة عبر نافذة جديدة:", err);
  }

  // Strategy 2: Fallback window.open
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
