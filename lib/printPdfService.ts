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
  "\u0627\u0644\u0623\u062d\u062f",
  "\u0627\u0644\u0625\u062b\u0646\u064a\u0646",
  "\u0627\u0644\u062b\u0644\u0627\u062b\u0627\u0621",
  "\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621",
  "\u0627\u0644\u062e\u0645\u064a\u0633",
  "\u0627\u0644\u062c\u0645\u0639\u0629",
  "\u0627\u0644\u0633\u0628\u062a",
];

function getArabicDayName(dateStr: string): string {
  const parts = dateStr.split("-").map(Number);
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const idx = d.getDay();
    if (!isNaN(idx) && idx >= 0 && idx < 7) return ARABIC_DAYS[idx];
  }
  return "................";
}

function formatDMY(dateStr: string): string {
  if (!dateStr) return "";
  const p = dateStr.split("-");
  if (p.length === 3) return `${p[2]}-${p[1]}-${p[0]}`;
  return dateStr;
}

function esc(s: string): string {
  return s
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
  const spec = esc(data.specialty);
  const job = esc(data.jobTitle);
  const empStatus = esc(data.employmentStatus);
  const count = data.absenceCount;
  const aType = esc(data.absenceType);
  const rawReason = data.absenceReason?.trim() || "";
  const reasonHtml = rawReason
    ? `<span style="font-weight:bold">${esc(rawReason)}</span>`
    : `<span style="color:#94a3b8">......................................................................................................................................................</span>`;

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>\u0645\u0633\u0627\u0621\u0644\u0629 \u063a\u064a\u0627\u0628 - ${name}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
@page{size:A4;margin:0}
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
body{font-family:'Cairo',sans-serif;direction:rtl;text-align:right;color:#0f172a;background:#fff;font-size:9.5pt;line-height:1.35}
.page{width:210mm;height:297mm;padding:7mm 9mm;overflow:hidden}
.frame{border:2px dashed #0f766e;padding:6mm 7mm;height:283mm;display:flex;flex-direction:column}
.hdr{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0f766e;padding-bottom:12px;margin-bottom:16px}
.hdr-r{width:33%;text-align:right;font-size:9pt;font-weight:bold;line-height:1.5}
.hdr-c{width:34%;display:flex;flex-direction:column;align-items:center;gap:4px}
.hdr-l{width:33%;text-align:left;font-size:9pt;font-weight:bold;line-height:1.5;color:#334155}
.badge{border:1.5px solid #0f766e;padding:2px 10px;border-radius:4px;font-weight:800;font-size:9pt;background:#f0fdfa;color:#115e59;white-space:nowrap;display:inline-block}
.lbl{color:#64748b}
.vt{color:#0f766e;font-weight:800}
table{width:100%;table-layout:fixed;border-collapse:collapse;border:1px solid #0f766e;font-size:9pt}
.t1{margin-bottom:12px}
.t2{margin-bottom:14px;font-size:8.5pt}
th,td{vertical-align:middle;padding:8px}
.hc{background:#f0fdfa;color:#115e59;font-weight:bold;text-align:center;border-left:1px solid #0f766e}
.hc:last-child{border-left:none}
.vc{color:#0f172a;font-weight:bold;text-align:center;border-left:1px solid #0f766e}
.vc:last-child{border-left:none}
.body-txt{margin-bottom:14px;font-size:9.5pt;line-height:1.6}
.sec{padding-top:10px;margin-bottom:12px;font-size:9pt}
.sbl{border-top:1px solid #cbd5e1}
.sbd{border-top:1.5px dashed #0f766e}
.sh{display:flex;justify-content:space-between;align-items:center;font-weight:bold;color:#0f766e;margin-bottom:6px}
.st{font-size:9.5pt;font-weight:800}
.sg{font-weight:bold;color:#334155;margin-bottom:4px;font-size:9pt}
.sb{text-align:justify;color:#1e293b;line-height:1.45;font-size:8.5pt}
.sig{display:flex;justify-content:space-between;align-items:center;width:100%;margin-top:14px;font-size:8.5pt;font-weight:bold}
.rbox{background:#f8fafc;border:1px solid #cbd5e1;border-radius:3px;padding:10px 12px;min-height:80px;font-size:9pt;word-break:break-word;overflow-wrap:anywhere;line-height:1.5;margin-bottom:6px;white-space:pre-wrap}
.cr{display:flex;align-items:flex-start;gap:10px;margin-bottom:6px;font-size:8.5pt;color:#1e293b;line-height:1.5}
.cb{width:12px;height:12px;border:1.5px solid #475569;border-radius:2px;display:inline-block;flex-shrink:0;margin-top:2px}
.spacer{flex-grow:1;min-height:15px}
.ftr{border-top:2px solid #0f766e;background:#f8fafc;padding:8px 12px;border-radius:3px;font-size:8pt;line-height:1.45;color:#334155}
.ft{font-weight:bold;color:#0f766e;margin-bottom:6px;font-size:8.5pt}
.nr{display:flex;align-items:flex-start;gap:8px;margin-bottom:4px}
.nr:last-child{margin-bottom:0}
.bl{color:#0f766e;font-weight:bold;flex-shrink:0;font-size:9pt;line-height:1.45}
@media print{body{margin:0;padding:0}}
</style>
</head>
<body>
<div class="page">
<div class="frame">

<div class="hdr">
<div class="hdr-r">
<div>\u0627\u0644\u0645\u0645\u0644\u0643\u0629 \u0627\u0644\u0639\u0631\u0628\u064a\u0629 \u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629</div>
<div>\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062a\u0639\u0644\u064a\u0645</div>
<div>\u0625\u062f\u0627\u0631\u0629 \u062a\u0639\u0644\u064a\u0645 \u0627\u0644\u0628\u0646\u0627\u062a \u0628\u0645\u0646\u0637\u0642\u0629 \u0645\u0643\u0629 \u0627\u0644\u0645\u0643\u0631\u0645\u0629</div>
</div>
<div class="hdr-c">
<svg width="68" height="29" viewBox="0 0 110 45" fill="none" xmlns="http://www.w3.org/2000/svg">
<g fill="#0f766e"><circle cx="55" cy="8" r="3"/><circle cx="48" cy="13" r="2.5"/><circle cx="62" cy="13" r="2.5"/><circle cx="42" cy="19" r="2"/><circle cx="55" cy="17" r="2.5"/><circle cx="68" cy="19" r="2"/><circle cx="37" cy="26" r="1.8"/><circle cx="48" cy="24" r="2.2"/><circle cx="62" cy="24" r="2.2"/><circle cx="73" cy="26" r="1.8"/><circle cx="55" cy="26" r="2.5"/></g>
<text x="55" y="36" text-anchor="middle" fill="#0f766e" font-size="9" font-weight="bold" font-family="Cairo,sans-serif">\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062a\u0639\u0644\u064a\u0645</text>
<text x="55" y="43" text-anchor="middle" fill="#115e59" font-size="5" font-weight="600" font-family="sans-serif">Ministry of Education</text>
</svg>
<div class="badge">\u0646\u0645\u0648\u0630\u062c \u0631\u0642\u0645 ( \u0662\u0660 )</div>
</div>
<div class="hdr-l">
<div><span class="lbl">\u0627\u0633\u0645 \u0627\u0644\u0646\u0645\u0648\u0630\u062c: </span><span class="vt">\u0645\u0633\u0627\u0621\u0644\u0629 \u063a\u064a\u0627\u0628</span></div>
<div><span class="lbl">\u0631\u0645\u0632 \u0627\u0644\u0646\u0645\u0648\u0630\u062c: </span><span style="font-family:monospace;color:#0f172a">( \u0648.\u0645.\u0639.\u0646 - \u0660\u0662 - \u0660\u0664 )</span></div>
<div><span class="lbl">\u0627\u0644\u0639\u0627\u0645 \u0627\u0644\u062f\u0631\u0627\u0633\u064a: </span><span>\u0661\u0664\u0664\u0668 \u0647\u0640</span></div>
</div>
</div>

<table class="t1">
<tr style="border-bottom:1px solid #0f766e">
<td class="hc" style="width:28%">\u0627\u0644\u0645\u062f\u0631\u0633\u0629</td>
<td class="vc" style="width:72%;text-align:right;font-weight:800;border-left:none">\u0627\u0644\u062b\u0627\u0646\u0648\u064a\u0629 \u0627\u0644\u062e\u0627\u0645\u0633\u0629 \u0645\u0633\u0627\u0631\u0627\u062a</td>
</tr>
<tr>
<td class="hc" style="width:28%;font-size:8pt">\u0631\u0642\u0645 \u0627\u0644\u0633\u062c\u0644 \u0627\u0644\u0645\u062f\u0646\u064a / \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645</td>
<td class="vc" style="width:72%;text-align:right;font-family:monospace;border-left:none">${uname}</td>
</tr>
</table>

<table class="t2">
<thead><tr style="border-bottom:1px solid #0f766e">
<th class="hc" style="width:25%">\u0627\u0633\u0645 \u0627\u0644\u0645\u0648\u0638\u0641\u0629</th>
<th class="hc" style="width:15%">\u0627\u0644\u062a\u062e\u0635\u0635</th>
<th class="hc" style="width:15%">\u0627\u0644\u0645\u0633\u062a\u0648\u0649 / \u0627\u0644\u0631\u062a\u0628\u0629</th>
<th class="hc" style="width:15%">\u0631\u0642\u0645 \u0627\u0644\u0648\u0638\u064a\u0641\u0629</th>
<th class="hc" style="width:15%">\u062d\u0627\u0644\u0629 \u0627\u0644\u062a\u0648\u0638\u064a\u0641</th>
<th class="hc" style="width:15%;border-left:none">\u0639\u062f\u062f \u0627\u0644\u063a\u064a\u0627\u0628</th>
</tr></thead>
<tbody><tr>
<td class="vc" style="text-align:right;font-weight:800;word-break:break-word">${name}</td>
<td class="vc">${spec}</td>
<td class="vc">${job}</td>
<td class="vc" style="font-family:monospace">${uname}</td>
<td class="vc">${empStatus}</td>
<td class="vc" style="font-family:monospace;font-weight:900;color:#be123c;border-left:none">${count}</td>
</tr></tbody>
</table>

<div class="body-txt">
<div>\u0625\u0646\u0647 \u0641\u064a \u064a\u0648\u0645 <strong class="vt">(${dayName})</strong> \u0627\u0644\u0645\u0648\u0627\u0641\u0642: <strong style="font-family:monospace;color:#0f766e;font-weight:800">${dateDMY} \u0645</strong>\u060c \u062a\u063a\u064a\u0628\u062a \u0627\u0644\u0645\u0648\u0638\u0641\u0629 \u0639\u0646 \u0627\u0644\u0639\u0645\u0644.</div>
<div style="margin-top:3px;font-weight:bold"><span style="color:#334155">\u0646\u0648\u0639 \u0627\u0644\u063a\u064a\u0627\u0628 \u0627\u0644\u0645\u0633\u062c\u0644: </span><span class="vt">${aType}</span></div>
</div>

<div class="sec sbl">
<div class="sh"><span class="st">( \u0661 ) \u0637\u0644\u0628 \u0627\u0644\u0625\u0641\u0627\u062f\u0629: ${name}</span><span style="font-size:8.5pt">\u0648\u0641\u0642\u0643\u0650 \u0627\u0644\u0644\u0647</span></div>
<div class="sg">\u0627\u0644\u0633\u0644\u0627\u0645 \u0639\u0644\u064a\u0643\u0645 \u0648\u0631\u062d\u0645\u0629 \u0627\u0644\u0644\u0647 \u0648\u0628\u0631\u0643\u0627\u062a\u0647 \u060c\u060c \u0648\u0628\u0639\u062f :</div>
<div class="sb">\u0645\u0646 \u062e\u0644\u0627\u0644 \u0645\u062a\u0627\u0628\u0639\u0629 \u0633\u062c\u0644 \u0627\u0644\u062f\u0648\u0627\u0645 \u0648\u0627\u0644\u0639\u0645\u0644 \u062a\u0628\u064a\u0646 \u063a\u064a\u0627\u0628\u0643\u0645 \u062e\u0644\u0627\u0644 \u0627\u0644\u064a\u0648\u0645 \u0627\u0644\u0645\u0648\u0636\u062d \u0628\u0639\u0627\u0644\u064a\u0647\u060c \u0622\u0645\u0644 \u0627\u0644\u0625\u0641\u0627\u062f\u0629 \u0639\u0646 \u0623\u0633\u0628\u0627\u0628 \u0630\u0644\u0643 \u0648\u0639\u0644\u064a\u0643\u0645 \u062a\u0642\u062f\u064a\u0645 \u0645\u0627 \u064a\u0624\u064a\u062f \u0639\u0630\u0631\u0643\u0645 \u062e\u0644\u0627\u0644 \u0623\u0633\u0628\u0648\u0639 \u0645\u0646 \u062a\u0627\u0631\u064a\u062e\u0647 \u0639\u0644\u0645\u0627\u064b \u0628\u0623\u0646\u0647 \u0641\u064a \u062d\u0627\u0644\u0629 \u0639\u062f\u0645 \u0627\u0644\u0627\u0644\u062a\u0632\u0627\u0645 \u0633\u064a\u062a\u0645 \u0627\u062a\u062e\u0627\u0630 \u0627\u0644\u0644\u0627\u0632\u0645 \u062d\u0633\u0628 \u0627\u0644\u0623\u0646\u0638\u0645\u0629 \u0648\u0627\u0644\u062a\u0639\u0644\u064a\u0645\u0627\u062a.</div>
<div class="sig">
<div style="width:40%;text-align:right">\u0627\u0633\u0645 \u0627\u0644\u0631\u0626\u064a\u0633\u0629 \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629 : \u0641\u0627\u0637\u0645\u0629 \u0641\u0644\u0627\u062a\u0629</div>
<div style="width:32%;text-align:center">\u0627\u0644\u062a\u0648\u0642\u064a\u0639 : ........................</div>
<div style="width:28%;text-align:left">\u0627\u0644\u062a\u0627\u0631\u064a\u062e : ${dateDMY} \u0645</div>
</div>
</div>

<div class="sec sbd">
<div class="sh"><span class="st">( \u0662 ) \u0627\u0644\u0625\u0641\u0627\u062f\u0629: \u0627\u0644\u0645\u0643\u0631\u0645\u0629 / \u0642\u0627\u0626\u062f\u0629 \u0627\u0644\u0645\u062f\u0631\u0633\u0629</span><span style="font-size:8.5pt">\u0648\u0641\u0642\u0643\u0650 \u0627\u0644\u0644\u0647</span></div>
<div class="sg">\u0627\u0644\u0633\u0644\u0627\u0645 \u0639\u0644\u064a\u0643\u0645 \u0648\u0631\u062d\u0645\u0629 \u0627\u0644\u0644\u0647 \u0648\u0628\u0631\u0643\u0627\u062a\u0647 \u060c\u060c \u0648\u0628\u0639\u062f :</div>
<div style="font-size:8.5pt;margin-bottom:3px;font-weight:bold">\u0623\u0641\u064a\u062f\u0643\u0645 \u0628\u0623\u0646 \u063a\u064a\u0627\u0628\u064a \u0643\u0627\u0646 \u0644\u0644\u0623\u0633\u0628\u0627\u0628 \u0627\u0644\u062a\u0627\u0644\u064a\u0629:</div>
<div class="rbox">${reasonHtml}</div>
<div style="font-size:8pt;color:#64748b;margin-bottom:3px">\u0648\u0633\u0623\u0642\u0648\u0645 \u0628\u062a\u0642\u062f\u064a\u0645 \u0645\u0627 \u064a\u062b\u0628\u062a \u0630\u0644\u0643 \u062e\u0644\u0627\u0644 \u0623\u0633\u0628\u0648\u0639 \u0645\u0646 \u062a\u0627\u0631\u064a\u062e\u0647 .</div>
<div class="sig">
<div style="width:40%;text-align:right">\u0627\u0633\u0645 \u0627\u0644\u0645\u0648\u0638\u0641\u0629 : ${name}</div>
<div style="width:32%;text-align:center">\u0627\u0644\u062a\u0648\u0642\u064a\u0639 : ........................</div>
<div style="width:28%;text-align:left">\u0627\u0644\u062a\u0627\u0631\u064a\u062e : ${dateDMY} \u0645</div>
</div>
</div>

<div class="sec sbd" style="margin-bottom:0">
<div style="font-weight:bold;color:#0f766e;margin-bottom:4px;font-size:9.5pt">( \u0663 ) \u0642\u0631\u0627\u0631 \u0645\u062f\u064a\u0631\u0629 \u0627\u0644\u0645\u062f\u0631\u0633\u0629 :</div>
<div style="padding-right:2px">
<div class="cr"><span class="cb"></span><span>\u062a\u062d\u062a\u0633\u0628 \u0644\u0647\u0627 \u0625\u062c\u0627\u0632\u0629 \u0645\u0631\u0636\u064a\u0629 \u0628\u0639\u062f \u0627\u0644\u062a\u0623\u0643\u062f \u0645\u0646 \u0646\u0638\u0627\u0645\u064a\u0629 \u0627\u0644\u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u0637\u0628\u064a \u0627\u0644\u0645\u0639\u062a\u0645\u062f .</span></div>
<div class="cr"><span class="cb"></span><span>\u064a\u062d\u062a\u0633\u0628 \u063a\u064a\u0627\u0628\u0647\u0627 \u0645\u0646 \u0631\u0635\u064a\u062f\u0647\u0627 \u0644\u0644\u0625\u062c\u0627\u0632\u0627\u062a \u0627\u0644\u0627\u0636\u0637\u0631\u0627\u0631\u064a\u0629 \u0644\u0642\u0628\u0648\u0644 \u0639\u0630\u0631\u0647\u0627 \u0625\u0630\u0627 \u0643\u0627\u0646 \u0631\u0635\u064a\u062f\u0647\u0627 \u064a\u0633\u0645\u062d \u0648\u0625\u0644\u0627 \u064a\u062d\u0633\u0645 \u0639\u0644\u064a\u0647\u0627 .</span></div>
<div class="cr"><span class="cb"></span><span>\u064a\u0639\u062a\u0645\u062f \u0627\u0644\u062d\u0633\u0645 \u0644\u0639\u062f\u0645 \u0642\u0628\u0648\u0644 \u0639\u0630\u0631\u0647\u0627 .</span></div>
</div>
<div class="sig">
<div style="width:40%;text-align:right">\u0627\u0633\u0645 \u0627\u0644\u0631\u0626\u064a\u0633\u0629 \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629 : \u0641\u0627\u0637\u0645\u0629 \u0641\u0644\u0627\u062a\u0629</div>
<div style="width:32%;text-align:center">\u0627\u0644\u062a\u0648\u0642\u064a\u0639 : ........................</div>
<div style="width:28%;text-align:left">\u0627\u0644\u062a\u0627\u0631\u064a\u062e : ..../ ..../ \u0661\u0664\u0664\u0668 \u0647\u0640</div>
</div>
</div>

<div class="spacer"></div>

<div class="ftr">
<div class="ft">\u0645\u0644\u062d\u0648\u0638\u0627\u062a \u0647\u0627\u0645\u0629 :</div>
<div class="nr"><span class="bl">\u2022</span><span>\u062a\u0633\u062a\u0643\u0645\u0644 \u0627\u0644\u0627\u0633\u062a\u0645\u0627\u0631\u0629 \u0645\u0646 \u0627\u0644\u0645\u062f\u064a\u0631\u0629 \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629 \u0648\u0625\u0635\u062f\u0627\u0631 \u0627\u0644\u0642\u0631\u0627\u0631 \u0627\u0644\u0625\u062f\u0627\u0631\u064a \u0628\u0645\u0648\u062c\u0628\u0647 .</span></div>
<div class="nr"><span class="bl">\u2022</span><span>\u0625\u0630\u0627 \u0633\u0628\u0642 \u0625\u062c\u0627\u0632\u0629 \u0646\u0647\u0627\u064a\u0629 \u0627\u0644\u0623\u0633\u0628\u0648\u0639 \u063a\u064a\u0627\u0628 \u0648\u0623\u0644\u062d\u0642\u0647\u0627 \u063a\u064a\u0627\u0628 \u062a\u062d\u062a\u0633\u0628 \u0645\u062f\u0629 \u0627\u0644\u063a\u064a\u0627\u0628 \u0643\u0627\u0645\u0644\u0629 .</span></div>
<div class="nr"><span class="bl">\u2022</span><span>\u064a\u062c\u0628 \u0623\u0646 \u062a\u0648\u0636\u062d \u0627\u0644\u0645\u062a\u063a\u064a\u0628\u0629 \u0623\u0633\u0628\u0627\u0628 \u063a\u064a\u0627\u0628\u0647\u0627 \u0641\u0648\u0631 \u062a\u0633\u0644\u0645\u0647\u0627 \u0627\u0644\u0627\u0633\u062a\u0645\u0627\u0631\u0629 \u0648\u062a\u0639\u064a\u062f\u0647\u0627 \u0644\u0645\u062f\u064a\u0631\u062a\u0647\u0627 \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0629 .</span></div>
<div class="nr" style="margin-bottom:0"><span class="bl">\u2022</span><span>\u062a\u0639\u0637\u0649 \u0627\u0644\u0645\u062a\u063a\u064a\u0628\u0629 \u0645\u062f\u0629 \u0623\u0633\u0628\u0648\u0639 \u0644\u062a\u0642\u062f\u064a\u0645 \u0645\u0627 \u064a\u0624\u064a\u062f \u0639\u0630\u0631\u0647\u0627 \u0641\u0625\u0630\u0627 \u0627\u0646\u0642\u0636\u062a \u0627\u0644\u0645\u062f\u0629 \u0627\u0644\u0632\u0645\u0646\u064a\u0629 \u062a\u0633\u062a\u0643\u0645\u0644 \u0627\u0644\u0627\u0633\u062a\u0645\u0627\u0631\u0629 \u0648\u064a\u062a\u0645 \u0627\u0644\u062d\u0633\u0645 .</span></div>
</div>

</div>
</div>
<script>
window.onafterprint=function(){window.close()};
if(document.fonts){document.fonts.ready.then(function(){setTimeout(function(){window.focus();window.print()},400)})}
else{window.onload=function(){setTimeout(function(){window.focus();window.print()},800)}}
</script>
</body>
</html>`;
}

export function printAbsencePdf(data: AbsencePdfData): void {
  const html = buildHtml(data);
  const w = window.open("", "_blank");
  if (!w) {
    alert("\u064a\u0631\u062c\u0649 \u0627\u0644\u0633\u0645\u0627\u062d \u0628\u0627\u0644\u0646\u0648\u0627\u0641\u0630 \u0627\u0644\u0645\u0646\u0628\u062b\u0642\u0629 \u0641\u064a \u0627\u0644\u0645\u062a\u0635\u0641\u062d \u0644\u062a\u0635\u062f\u064a\u0631 \u0645\u0644\u0641 PDF");
    return;
  }
  w.document.write(html);
  w.document.close();
}