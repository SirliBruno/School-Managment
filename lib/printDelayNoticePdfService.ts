import { DelayNotice, Teacher } from "@/types/teacher";
import { MOE_LOGO_BASE64 } from "@/lib/moeLogo";

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
  const employmentStatus = esc(teacher.employmentStatus || "دائم");

  const dayName = getArabicDayName(notice.noticeDate);
  const dateFormatted = formatDMY(notice.noticeDate);
  const hijriYear = esc(notice.hijriYear || "١٤٤٨");

  // Construct bullet points for checked violations ONLY
  const violationBullets: string[] = [];

  if (notice.violationDelayStart) {
    const from = notice.delayStartFromTime ? esc(notice.delayStartFromTime) : "";
    const to = notice.delayStartTime ? esc(notice.delayStartTime) : "................";
    const duration = notice.calculatedDuration ? ` [المدة: ${esc(notice.calculatedDuration)}]` : "";
    if (from) {
      violationBullets.push(
        `تأخركِ عن بداية الدوام من الساعة (${from}) وحضوركِ الساعة (${to})${duration}.`
      );
    } else {
      violationBullets.push(
        `تأخركِ من بداية الدوام وحضوركِ الساعة (${to})${duration}.`
      );
    }
  }

  if (notice.violationAbsentDuring) {
    const from = notice.absentFromTime ? esc(notice.absentFromTime) : "........";
    const to = notice.absentToTime ? esc(notice.absentToTime) : "........";
    const duration = notice.calculatedDuration ? ` [المدة: ${esc(notice.calculatedDuration)}]` : "";
    violationBullets.push(
      `عدم تواجدكِ أثناء الدوام من الساعة (${from}) إلى الساعة (${to})${duration}.`
    );
  }

  if (notice.violationEarlyDeparture) {
    const from = notice.earlyDepartureFromTime ? esc(notice.earlyDepartureFromTime) : "";
    const to = notice.earlyDepartureTime ? esc(notice.earlyDepartureTime) : "................";
    const duration = notice.calculatedDuration ? ` [المدة: ${esc(notice.calculatedDuration)}]` : "";
    if (from) {
      violationBullets.push(
        `انصرافكِ مبكراً قبل نهاية الدوام من الساعة (${from}) حتى (${to})${duration}.`
      );
    } else {
      violationBullets.push(
        `انصرافكِ مبكراً قبل نهاية الدوام من الساعة (${to})${duration}.`
      );
    }
  }

  if (notice.violationLeftSchool) {
    const details = notice.leftSchoolDetails ? esc(notice.leftSchoolDetails) : "................";
    const duration = notice.calculatedDuration ? ` [المدة: ${esc(notice.calculatedDuration)}]` : "";
    violationBullets.push(
      `انصرافكِ من غير المدرسة (${details})${duration}.`
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

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>تنبيه عن تأخر / انصراف - ${teacherName}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
@page{size:A4;margin:0}
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
body{font-family:'Cairo',sans-serif;direction:rtl;text-align:right;color:#0f172a;background:#fff;font-size:9pt;line-height:1.35}
.page{width:210mm;height:297mm;padding:7mm 9mm;overflow:hidden}
.frame{border:2px dashed #0f766e;padding:6mm 7mm;height:283mm;display:flex;flex-direction:column}
.hdr{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0f766e;padding-bottom:8px;margin-bottom:12px}
.hdr-r{width:34%;text-align:right;font-size:8.5pt;font-weight:bold;line-height:1.45}
.hdr-c{width:32%;display:flex;flex-direction:column;align-items:center;gap:3px}
.hdr-l{width:34%;text-align:left;font-size:8.5pt;font-weight:bold;line-height:1.45;color:#334155}
.title-bar{display:flex;justify-content:space-between;align-items:center;background:#f0fdfa;border:1.5px solid #0f766e;padding:4px 12px;border-radius:4px;margin-bottom:10px}
.title-bar-r{font-size:10.5pt;font-weight:900;color:#0f766e}
.title-bar-l{font-size:8.5pt;font-weight:800;color:#115e59;direction:ltr}
table{width:100%;table-layout:fixed;border-collapse:collapse;border:1px solid #0f766e;font-size:8.5pt}
.t1{margin-bottom:8px}
.t2{margin-bottom:10px}
th,td{vertical-align:middle;padding:5px 7px}
.hc{background:#f0fdfa;color:#115e59;font-weight:bold;text-align:center;border-left:1px solid #0f766e}
.hc:last-child{border-left:none}
.vc{color:#0f172a;font-weight:bold;text-align:center;border-left:1px solid #0f766e}
.vc:last-child{border-left:none}
.sec{padding-top:8px;margin-bottom:10px;font-size:8.5pt}
.sbl{border-top:1px solid #cbd5e1}
.sbd{border-top:1.5px dashed #0f766e}
.sh{display:flex;justify-content:space-between;align-items:center;font-weight:bold;color:#0f766e;margin-bottom:4px}
.st{font-size:9pt;font-weight:800}
.sg{font-weight:bold;color:#334155;margin-bottom:3px;font-size:8.5pt}
.sb{color:#1e293b;line-height:1.45;font-size:8.5pt}
.bullets-box{background:#fafafa;border:1px solid #e2e8f0;border-radius:4px;padding:6px 12px;margin:6px 0}
.bullet-item{display:flex;align-items:flex-start;gap:6px;font-weight:700;color:#0f172a;margin-bottom:3px}
.bullet-dot{color:#0f766e;font-size:12pt;line-height:1}
.rbox{border:1px solid #cbd5e1;background:#fafafa;border-radius:4px;padding:6px 10px;min-height:36px;margin:4px 0}
.sig{display:flex;justify-content:space-between;align-items:center;width:100%;margin-top:10px;font-size:8.5pt;font-weight:bold}
.decision-box{border:1px solid #0f766e;background:#f0fdfa;border-radius:4px;padding:6px 10px;margin-top:6px}
.cr{display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:8.5pt;font-weight:bold;color:#1e293b}
.cb{width:14px;height:14px;border:1.5px solid #0f766e;border-radius:3px;display:inline-flex;align-items:center;justify-content:center;font-size:10pt;color:#0f766e;font-weight:900;background:#fff;flex-shrink:0}
.spacer{flex:1}
.ftr{border-top:1px solid #cbd5e1;padding-top:6px;margin-top:auto}
.ft{font-weight:bold;color:#b91c1c;margin-bottom:2px;font-size:8pt}
.nr{font-size:7.5pt;color:#64748b;line-height:1.35}
</style>
</head>
<body>
<div class="page">
<div class="frame">

<!-- Header -->
<div class="hdr">
  <div class="hdr-r">
    <div>المملكة العربية السعودية</div>
    <div>وزارة التعليم</div>
    <div>الإدارة العامة للتعليم بمنطقة مكة المكرمة</div>
    <div>مكتب التعليم شمال مكة (بنات)</div>
  </div>
  <div class="hdr-c">
    <img src="${MOE_LOGO_BASE64}" alt="وزارة التعليم" style="height: 52px; width: auto; object-fit: contain; margin-bottom: 2px;" />
  </div>
  <div class="hdr-l">
    <div>التاريخ : ${dateFormatted} م</div>
    <div>الرقم : ....................</div>
    <div>المشفوعات : ....................</div>
  </div>
</div>

<!-- Title Bar -->
<div class="title-bar">
  <div class="title-bar-r">اسم النموذج : تنبيه عن تأخر / انصراف</div>
  <div class="title-bar-l">رمز النموذج ( و.م.ع.ن - ٠٢ - ٠٢ )</div>
</div>

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
      <td class="vc" style="font-weight:800;color:#0f766e">الثانوية الخامسة مسارات</td>
      <td class="vc" style="font-family:monospace;font-weight:800;border-left:none">${jobNumber || "—"}</td>
    </tr>
  </tbody>
</table>

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
      <td class="vc">${employmentStatus}</td>
      <td class="vc" style="font-family:monospace">${jobNumber || "—"}</td>
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
