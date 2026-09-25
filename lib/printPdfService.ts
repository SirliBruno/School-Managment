import {
  UNIFIED_PDF_CSS,
  UNIFIED_PRINT_SCRIPT,
  renderOfficialHeader,
  renderSchoolInfoTable,
} from "@/lib/pdfTemplateBase";

export interface AbsencePdfData {
  teacherName: string;
  username: string;
  specialty: string;
  jobTitle: string;
  employmentStatus: string;
  absenceCount: number;
  absenceDate: string;
  absenceType: string;
  absenceReason: string;
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
  // إذا كانت صيغة التاريخ تحوي مدى زمني (من ... إلى ...)
  const cleanDate = dateStr.includes(" ") ? dateStr.split(" ")[0] : dateStr;
  const parts = cleanDate.split("-").map(Number);
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const idx = d.getDay();
    if (!isNaN(idx) && idx >= 0 && idx < 7) return ARABIC_DAYS[idx];
  }
  return "................";
}

function formatDMY(dateStr: string): string {
  if (!dateStr) return "";
  if (dateStr.includes("إلى")) {
    return dateStr;
  }
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

function buildHtml(data: AbsencePdfData): string {
  const dayName = getArabicDayName(data.absenceDate);
  const dateDMY = formatDMY(data.absenceDate);
  const name = esc(data.teacherName);
  const uname = esc(data.username);
  const spec = esc(data.specialty || "عام");
  const job = esc(data.jobTitle || "معلم");
  const count = data.absenceCount;
  const aType = esc(data.absenceType || "مرضي");
  const rawReason = data.absenceReason?.trim() || "";

  const reasonHtml = rawReason
    ? `<span style="font-weight:bold">${esc(rawReason)}</span>`
    : `<span style="color:#94a3b8">......................................................................................................................................................................</span>`;

  const headerHtml = renderOfficialHeader({
    formTitle: "مساءلة غياب",
    formCode: "و.م.ع.ن - ٠٢ - ٠٤",
    dateFormatted: dateDMY,
  });

  const schoolTableHtml = renderSchoolInfoTable(uname);

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>مساءلة غياب - ${name}</title>
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

<!-- Table 2: Teacher Info (بيانات المعلمة الموحدة) -->
<table class="t2">
  <thead>
    <tr>
      <th class="hc" style="width:25%">الاسم</th>
      <th class="hc" style="width:15%">التخصص</th>
      <th class="hc" style="width:15%">المستوى / المرتبة</th>
      <th class="hc" style="width:15%">رقم الوظيفة</th>
      <th class="hc" style="width:15%">العمل الحالي</th>
      <th class="hc" style="width:15%;border-left:none">عدد الغياب</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="vc" style="text-align:right;font-weight:800">${name}</td>
      <td class="vc">${spec}</td>
      <td class="vc"></td>
      <td class="vc"></td>
      <td class="vc">${job}</td>
      <td class="vc" style="font-family:monospace;font-weight:900;color:#be123c;border-left:none">${count}</td>
    </tr>
  </tbody>
</table>

<!-- Stage 1 Body: طلب الإفادة عن الغياب -->
<div class="sec sbl">
  <div class="sh">
    <span class="st">( ١ ) طلب الإفادة عن الغياب</span>
    <span style="font-size:8.5pt">المكرمة المعلمة / <strong style="color:#0f766e">${name}</strong> وفقها الله</span>
  </div>
  <div class="sg">السلام عليكم ورحمة الله وبركاته ،،، وبعد :</div>
  <div class="sb">
    إنه في يوم <strong style="color:#0f766e">(${dayName})</strong> الموافق: <strong style="font-family:monospace;color:#0f766e">${dateDMY} م</strong> اتضح تغيبكم عن العمل <strong style="color:#0f766e">(نوع الغياب: ${aType})</strong>.
  </div>
  <div class="sb" style="margin-top:4px">
    من خلال متابعة سجل الدوام والعمل تبين غيابكم خلال اليوم الموضح بعاليه، آمل الإفادة عن أسباب ذلك مع إرفاق ما يؤيد عذركم ،،، ولكم تحياتي ..
  </div>
  <div class="sig">
    <div style="width:40%;text-align:right">اسم الرئيسة المباشرة : <strong>فاطمة فلاتة</strong></div>
    <div style="width:32%;text-align:center">التوقيع : ........................</div>
    <div style="width:28%;text-align:left">التاريخ : ${dateDMY} م</div>
  </div>
</div>

<!-- Stage 2 Body: رد وإفادة المعلمة -->
<div class="sec sbd">
  <div class="sh">
    <span class="st">( ٢ ) رد وإفادة المعلمة</span>
    <span style="font-size:8.5pt">المكرمة / قائدة المدرسة وفقها الله</span>
  </div>
  <div class="sg">السلام عليكم ورحمة الله وبركاته ،،، وبعد :</div>
  <div style="font-size:8.5pt;margin-bottom:2px;font-weight:bold;color:#334155">
    أفيدكم أن أسباب ذلك ما يلي :
  </div>
  <div class="rbox">${reasonHtml}</div>
  <div class="sig">
    <div style="width:40%;text-align:right">اسم الموظفة : <strong>${name}</strong></div>
    <div style="width:32%;text-align:center">التوقيع : ........................</div>
    <div style="width:28%;text-align:left">التاريخ : ${dateDMY} م</div>
  </div>
</div>

<!-- Stage 3 Body: قرار مديرة المدرسة -->
<div class="sec sbd" style="margin-bottom:0">
  <div style="text-align:center;font-weight:900;color:#0f766e;margin-bottom:4px;font-size:9.5pt">
    ( ٣ ) قرار مديرة المدرسة
  </div>
  <div class="decision-box">
    <div class="cr">
      <span class="cb"></span>
      <span>تحتسب لها إجازة مرضية بعد التأكد من نظامية التقرير الطبي المعتمد .</span>
    </div>
    <div class="cr">
      <span class="cb"></span>
      <span>يحتسب غيابها من رصيدها للإجازات الاضطرارية لقبول عذرها إذا كان رصيدها يسمح وإلا يحسم عليها .</span>
    </div>
    <div class="cr" style="margin-bottom:0">
      <span class="cb"></span>
      <span>يعتمد الحسم لعدم قبول عذرها .</span>
    </div>
  </div>
  <div class="sig">
    <div style="width:40%;text-align:right">اسم الرئيسة المباشرة : <strong>فاطمة فلاتة</strong></div>
    <div style="width:32%;text-align:center">التوقيع : ........................</div>
    <div style="width:28%;text-align:left">التاريخ : ..../ ..../ ١٤٤٨ هـ</div>
  </div>
</div>

<div class="spacer"></div>

<!-- Footer Note الملاحظة النظامية الموحدة -->
<div class="ftr">
  <div class="ft">ملاحظة نظامية هامة :</div>
  <div class="nr">
    تستكمل الاستمارة من المديرة المباشرة وإصدار القرار الإداري بموجبه، وترفق مع أصل القرار في حالة عدم قبول العذر لحفظها بملف الإدارة، وأصل لملفها بالمدرسة.
  </div>
</div>

</div>
</div>

${UNIFIED_PRINT_SCRIPT}
</body>
</html>`;
}

export function printAbsencePdf(data: AbsencePdfData): void {
  if (typeof window === "undefined") return;

  const html = buildHtml(data);

  // Strategy 1: Hidden iframe (Bypasses popup blocker completely on all desktop & mobile browsers)
  try {
    const frameId = "__absence_print_iframe__";
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

  // Strategy 2: Fallback to window.open if iframe is blocked by custom security policies
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