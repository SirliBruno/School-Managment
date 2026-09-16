"use client";

import React, { forwardRef } from "react";
import { AbsenceRecord, Teacher } from "@/types/teacher";

interface AbsencePdfTemplateProps {
  record: AbsenceRecord | null;
  teacher: Teacher | null;
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

function formatDateToDMY(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

export const AbsencePdfTemplate = forwardRef<
  HTMLDivElement,
  AbsencePdfTemplateProps
>(({ record, teacher }, ref) => {
  if (!record || !teacher) return null;

  let arabicDayName = "................";
  if (record.date) {
    const parts = record.date.split("-").map(Number);
    if (parts.length === 3) {
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
      const dayIndex = dateObj.getDay();
      if (!isNaN(dayIndex) && dayIndex >= 0 && dayIndex < 7) {
        arabicDayName = ARABIC_DAYS[dayIndex];
      }
    }
  }

  const formattedDate = formatDateToDMY(record.date);
  const teacherFullName = teacher.fullName || teacher.name || "معلمة";
  const teacherUsername = teacher.username || teacher.jobNumber || "—";
  const teacherSpecialty = teacher.specialty || teacher.teachingField || "عام";
  const teacherJobTitle = teacher.jobTitle || "معلم";
  const teacherEmploymentStatus = teacher.employmentStatus || "دائم";
  const absenceCount = teacher.totalAbsences ?? 0;
  const absenceReason = record.reason?.trim() || "";

  const headerCellStyle: React.CSSProperties = {
    backgroundColor: "#f0fdfa",
    color: "#115e59",
    fontWeight: "bold",
    padding: "6px 8px",
    textAlign: "center",
    verticalAlign: "middle",
  };

  const sigRow: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginTop: "8px",
    fontSize: "8.5pt",
    fontWeight: "bold",
    color: "#0f172a",
  };

  const checkboxRows = [
    "تحتسب لها إجازة مرضية بعد التأكد من نظامية التقرير الطبي المعتمد .",
    "يحتسب غيابها من رصيدها للإجازات الاضطرارية لقبول عذرها إذا كان رصيدها يسمح وإلا يحسم عليها .",
    "يعتمد الحسم لعدم قبول عذرها .",
  ];

  const footerNotes = [
    "تستكمل الاستمارة من المديرة المباشرة وإصدار القرار الإداري بموجبه .",
    "إذا سبق إجازة نهاية الأسبوع غياب وألحقها غياب تحتسب مدة الغياب كاملة .",
    "يجب أن توضح المتغيبة أسباب غيابها فور تسلمها الاستمارة وتعيدها لمديرتها المباشرة .",
    "تعطى المتغيبة مدة أسبوع لتقديم ما يؤيد عذرها فإذا انقضت المدة الزمنية تستكمل الاستمارة ويتم الحسم .",
  ];

  return (
    <div
      style={{
        position: "fixed",
        top: "-10000px",
        left: "-10000px",
        zIndex: -100,
        visibility: "visible",
      }}
    >
      <div
        ref={ref}
        id="absence-a4-pdf-document"
        dir="rtl"
        style={{
          width: "210mm",
          height: "297mm",
          maxHeight: "297mm",
          boxSizing: "border-box",
          backgroundColor: "#ffffff",
          color: "#0f172a",
          fontFamily: "var(--font-cairo), 'Segoe UI', Tahoma, sans-serif",
          padding: "7mm 9mm",
          lineHeight: "1.35",
          fontSize: "9.5pt",
          textAlign: "right",
          direction: "rtl",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            border: "2px dashed #0f766e",
            padding: "6mm 7mm",
            height: "283mm",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* 1. HEADER */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              borderBottom: "2px solid #0f766e",
              paddingBottom: "8px",
              marginBottom: "10px",
            }}
          >
            <div style={{ width: "33%", textAlign: "right", fontSize: "9pt", fontWeight: "bold", lineHeight: "1.5", color: "#0f172a" }}>
              <div>المملكة العربية السعودية</div>
              <div>وزارة التعليم</div>
              <div>إدارة تعليم البنات بمنطقة مكة المكرمة</div>
            </div>
            <div style={{ width: "34%", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <svg width="68" height="29" viewBox="0 0 110 45" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g fill="#0f766e">
                  <circle cx="55" cy="8" r="3" /><circle cx="48" cy="13" r="2.5" /><circle cx="62" cy="13" r="2.5" />
                  <circle cx="42" cy="19" r="2" /><circle cx="55" cy="17" r="2.5" /><circle cx="68" cy="19" r="2" />
                  <circle cx="37" cy="26" r="1.8" /><circle cx="48" cy="24" r="2.2" /><circle cx="62" cy="24" r="2.2" />
                  <circle cx="73" cy="26" r="1.8" /><circle cx="55" cy="26" r="2.5" />
                </g>
                <text x="55" y="36" textAnchor="middle" fill="#0f766e" fontSize="9" fontWeight="bold" fontFamily="var(--font-cairo), sans-serif">وزارة التعليم</text>
                <text x="55" y="43" textAnchor="middle" fill="#115e59" fontSize="5" fontWeight="600" fontFamily="sans-serif">Ministry of Education</text>
              </svg>
              <div style={{ border: "1.5px solid #0f766e", padding: "2px 10px", borderRadius: "4px", fontWeight: "800", fontSize: "9pt", backgroundColor: "#f0fdfa", color: "#115e59", whiteSpace: "nowrap" }}>
                نموذج رقم ( ٢٠ )
              </div>
            </div>
            <div style={{ width: "33%", textAlign: "left", fontSize: "9pt", fontWeight: "bold", lineHeight: "1.5", color: "#334155" }}>
              <div><span style={{ color: "#64748b" }}>اسم النموذج: </span><span style={{ color: "#0f766e", fontWeight: "800" }}>مساءلة غياب</span></div>
              <div><span style={{ color: "#64748b" }}>رمز النموذج: </span><span style={{ fontFamily: "monospace", color: "#0f172a" }}>( و.م.ع.ن - ٠٢ - ٠٤ )</span></div>
              <div><span style={{ color: "#64748b" }}>العام الدراسي: </span><span style={{ color: "#0f172a" }}>١٤٤٨ هـ</span></div>
            </div>
          </div>

          {/* 2. TABLE 1 */}
          <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", border: "1px solid #0f766e", marginBottom: "7px", fontSize: "9pt" }}>
            <tbody>
              <tr style={{ borderBottom: "1px solid #0f766e" }}>
                <td style={{ ...headerCellStyle, width: "28%", borderLeft: "1px solid #0f766e" }}>المدرسة</td>
                <td style={{ width: "72%", fontWeight: "800", padding: "6px 10px", textAlign: "right", verticalAlign: "middle", color: "#0f172a" }}>الثانوية الخامسة مسارات</td>
              </tr>
              <tr>
                <td style={{ ...headerCellStyle, width: "28%", borderLeft: "1px solid #0f766e", fontSize: "8pt" }}>رقم السجل المدني / اسم المستخدم</td>
                <td style={{ width: "72%", fontFamily: "monospace", fontWeight: "bold", padding: "6px 10px", textAlign: "right", verticalAlign: "middle", color: "#0f172a" }}>{teacherUsername}</td>
              </tr>
            </tbody>
          </table>

          {/* 3. TABLE 2 */}
          <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", border: "1px solid #0f766e", marginBottom: "8px", fontSize: "8.5pt" }}>
            <thead>
              <tr style={{ backgroundColor: "#f0fdfa", color: "#115e59", fontWeight: "bold", borderBottom: "1px solid #0f766e", textAlign: "center" }}>
                <th style={{ width: "25%", padding: "6px 5px", borderLeft: "1px solid #0f766e", verticalAlign: "middle" }}>اسم الموظفة</th>
                <th style={{ width: "15%", padding: "6px 4px", borderLeft: "1px solid #0f766e", verticalAlign: "middle" }}>التخصص</th>
                <th style={{ width: "15%", padding: "6px 4px", borderLeft: "1px solid #0f766e", verticalAlign: "middle" }}>المستوى / الرتبة</th>
                <th style={{ width: "15%", padding: "6px 4px", borderLeft: "1px solid #0f766e", verticalAlign: "middle" }}>رقم الوظيفة</th>
                <th style={{ width: "15%", padding: "6px 4px", borderLeft: "1px solid #0f766e", verticalAlign: "middle" }}>حالة التوظيف</th>
                <th style={{ width: "15%", padding: "6px 4px", verticalAlign: "middle" }}>عدد الغياب</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ fontWeight: "bold", color: "#0f172a", textAlign: "center", backgroundColor: "#ffffff" }}>
                <td style={{ padding: "6px 5px", borderLeft: "1px solid #0f766e", textAlign: "right", fontWeight: "800", wordBreak: "break-word", verticalAlign: "middle" }}>{teacherFullName}</td>
                <td style={{ padding: "6px 4px", borderLeft: "1px solid #0f766e", textAlign: "center", verticalAlign: "middle" }}>{teacherSpecialty}</td>
                <td style={{ padding: "6px 4px", borderLeft: "1px solid #0f766e", verticalAlign: "middle", textAlign: "center" }}>{teacherJobTitle}</td>
                <td style={{ padding: "6px 4px", borderLeft: "1px solid #0f766e", fontFamily: "monospace", verticalAlign: "middle", textAlign: "center" }}>{teacherUsername}</td>
                <td style={{ padding: "6px 4px", borderLeft: "1px solid #0f766e", verticalAlign: "middle", textAlign: "center" }}>{teacherEmploymentStatus}</td>
                <td style={{ padding: "6px 4px", fontFamily: "monospace", fontWeight: "900", color: "#be123c", verticalAlign: "middle", textAlign: "center" }}>{absenceCount}</td>
              </tr>
            </tbody>
          </table>

          {/* 4. BODY TEXT */}
          <div style={{ marginBottom: "8px", fontSize: "9.5pt", lineHeight: "1.5", color: "#0f172a" }}>
            <div>
              إنه في يوم{" "}
              <strong style={{ color: "#0f766e", fontWeight: "800" }}>({arabicDayName})</strong>{" "}
              الموافق:{" "}
              <strong style={{ fontFamily: "monospace", color: "#0f766e", fontWeight: "800" }}>{formattedDate} م</strong>
              ، تغيبت الموظفة عن العمل.
            </div>
            <div style={{ marginTop: "3px", fontWeight: "bold" }}>
              <span style={{ color: "#334155" }}>نوع الغياب المسجل: </span>
              <span style={{ color: "#0f766e", fontWeight: "800" }}>{record.type}</span>
            </div>
          </div>

          {/* 5. SECTION 1 */}
          <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "5px", marginBottom: "7px", fontSize: "9pt" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: "bold", color: "#0f766e", marginBottom: "2px" }}>
              <span style={{ fontSize: "9.5pt", fontWeight: "800" }}>( ١ ) طلب الإفادة: {teacherFullName}</span>
              <span style={{ fontSize: "8.5pt" }}>وفقكِ الله</span>
            </div>
            <div style={{ fontWeight: "bold", color: "#334155", marginBottom: "1px", fontSize: "9pt" }}>السلام عليكم ورحمة الله وبركاته ،، وبعد :</div>
            <div style={{ textAlign: "justify", color: "#1e293b", lineHeight: "1.35", fontSize: "8.5pt" }}>
              من خلال متابعة سجل الدوام والعمل تبين غيابكم خلال اليوم الموضح بعاليه، آمل الإفادة عن أسباب ذلك وعليكم تقديم ما يؤيد عذركم خلال أسبوع من تاريخه علماً بأنه في حالة عدم الالتزام سيتم اتخاذ اللازم حسب الأنظمة والتعليمات.
            </div>
            <div style={sigRow}>
              <div style={{ width: "40%", textAlign: "right" }}>اسم الرئيسة المباشرة : فاطمة فلاتة</div>
              <div style={{ width: "32%", textAlign: "center" }}>التوقيع : ........................</div>
              <div style={{ width: "28%", textAlign: "left" }}>التاريخ : {formattedDate} م</div>
            </div>
          </div>

          {/* 6. SECTION 2 */}
          <div style={{ borderTop: "1.5px dashed #0f766e", paddingTop: "5px", marginBottom: "7px", fontSize: "9pt" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: "bold", color: "#0f766e", marginBottom: "2px" }}>
              <span style={{ fontSize: "9.5pt", fontWeight: "800" }}>( ٢ ) الإفادة: المكرمة / قائدة المدرسة</span>
              <span style={{ fontSize: "8.5pt" }}>وفقكِ الله</span>
            </div>
            <div style={{ fontWeight: "bold", color: "#334155", marginBottom: "2px", fontSize: "9pt" }}>السلام عليكم ورحمة الله وبركاته ،، وبعد :</div>
            <div style={{ fontSize: "8.5pt", marginBottom: "3px", color: "#0f172a", fontWeight: "bold" }}>أفيدكم بأن غيابي كان للأسباب التالية:</div>
            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "3px",
                padding: "8px 10px",
                minHeight: "68px",
                fontWeight: "bold",
                color: "#0f172a",
                fontSize: "9pt",
                wordBreak: "break-word",
                overflowWrap: "anywhere",
                lineHeight: "1.5",
                marginBottom: "3px",
                boxSizing: "border-box",
              }}
            >
              {absenceReason || (
                <span style={{ color: "#94a3b8", fontWeight: "normal" }}>
                  ......................................................................................................................................................
                </span>
              )}
            </div>
            <div style={{ fontSize: "8pt", color: "#64748b", marginBottom: "3px" }}>وسأقوم بتقديم ما يثبت ذلك خلال أسبوع من تاريخه .</div>
            <div style={sigRow}>
              <div style={{ width: "40%", textAlign: "right" }}>اسم الموظفة : {teacherFullName}</div>
              <div style={{ width: "32%", textAlign: "center" }}>التوقيع : ........................</div>
              <div style={{ width: "28%", textAlign: "left" }}>التاريخ : {formattedDate} م</div>
            </div>
          </div>

          {/* 7. SECTION 3 */}
          <div style={{ borderTop: "1.5px dashed #0f766e", paddingTop: "5px", fontSize: "9pt" }}>
            <div style={{ fontWeight: "bold", color: "#0f766e", marginBottom: "4px", fontSize: "9.5pt" }}>( ٣ ) قرار مديرة المدرسة :</div>
            <div style={{ paddingRight: "2px", fontSize: "8.5pt", color: "#1e293b", lineHeight: "1.45" }}>
              {checkboxRows.map((text, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "5px" }}>
                  <span style={{ width: "12px", height: "12px", border: "1.5px solid #475569", borderRadius: "2px", display: "inline-block", flexShrink: 0, marginTop: "1px" }} />
                  <span>{text}</span>
                </div>
              ))}
            </div>
            <div style={sigRow}>
              <div style={{ width: "40%", textAlign: "right" }}>اسم الرئيسة المباشرة : فاطمة فلاتة</div>
              <div style={{ width: "32%", textAlign: "center" }}>التوقيع : ........................</div>
              <div style={{ width: "28%", textAlign: "left" }}>التاريخ : ..../ ..../ ١٤٤٨ هـ</div>
            </div>
          </div>

          {/* Flex spacer */}
          <div style={{ flexGrow: 1 }} />

          {/* 8. FOOTER */}
          <div style={{ borderTop: "2px solid #0f766e", backgroundColor: "#f8fafc", padding: "5px 9px", borderRadius: "3px", fontSize: "7.5pt", lineHeight: "1.35", color: "#334155" }}>
            <div style={{ fontWeight: "bold", color: "#0f766e", marginBottom: "3px", fontSize: "8pt" }}>ملحوظات هامة :</div>
            {footerNotes.map((note, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "6px", marginBottom: i < footerNotes.length - 1 ? "2px" : "0" }}>
                <span style={{ color: "#0f766e", fontWeight: "bold", flexShrink: 0, fontSize: "8pt", lineHeight: "1.35" }}>•</span>
                <span>{note}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
});

AbsencePdfTemplate.displayName = "AbsencePdfTemplate";