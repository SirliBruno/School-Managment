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

  // Determine Arabic day name safely without timezone shift
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
          padding: "8mm 10mm",
          lineHeight: "1.4",
          fontSize: "10pt",
          textAlign: "right",
          direction: "rtl",
          overflow: "hidden",
        }}
      >
        {/* Outer Frame with Dashed Teal Border */}
        <div
          style={{
            border: "2px dashed #0f766e",
            padding: "8mm 9mm",
            height: "281mm",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* TOP & MAIN BODY CONTAINER */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {/* 1. HEADER SECTION: 3-Column CSS Grid (No Absolute Positioning) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                alignItems: "start",
                width: "100%",
                borderBottom: "2px solid #0f766e",
                paddingBottom: "10px",
                marginBottom: "14px",
              }}
            >
              {/* Right Column: Ministry Text (Right Aligned) */}
              <div
                style={{
                  textAlign: "right",
                  fontSize: "9.5pt",
                  fontWeight: "bold",
                  lineHeight: "1.4",
                  color: "#0f172a",
                }}
              >
                <div>المملكة العربية السعودية</div>
                <div>وزارة التعليم</div>
                <div>إدارة تعليم البنات بمنطقة مكة المكرمة</div>
              </div>

              {/* Center Column: Official Logo + Model Box */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  padding: "0 10px",
                }}
              >
                <svg
                  width="75"
                  height="32"
                  viewBox="0 0 110 45"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g fill="#0f766e">
                    <circle cx="55" cy="8" r="3" />
                    <circle cx="48" cy="13" r="2.5" />
                    <circle cx="62" cy="13" r="2.5" />
                    <circle cx="42" cy="19" r="2" />
                    <circle cx="55" cy="17" r="2.5" />
                    <circle cx="68" cy="19" r="2" />
                    <circle cx="37" cy="26" r="1.8" />
                    <circle cx="48" cy="24" r="2.2" />
                    <circle cx="62" cy="24" r="2.2" />
                    <circle cx="73" cy="26" r="1.8" />
                    <circle cx="55" cy="26" r="2.5" />
                  </g>
                  <text
                    x="55"
                    y="36"
                    textAnchor="middle"
                    fill="#0f766e"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="var(--font-cairo), sans-serif"
                  >
                    وزارة التعليم
                  </text>
                  <text
                    x="55"
                    y="43"
                    textAnchor="middle"
                    fill="#115e59"
                    fontSize="5"
                    fontWeight="600"
                    fontFamily="sans-serif"
                  >
                    Ministry of Education
                  </text>
                </svg>
                <div
                  style={{
                    border: "1.5px solid #0f766e",
                    padding: "2px 12px",
                    borderRadius: "4px",
                    fontWeight: "800",
                    fontSize: "9.5pt",
                    backgroundColor: "#f0fdfa",
                    color: "#115e59",
                    display: "inline-block",
                  }}
                >
                  نموذج رقم ( ٢٠ )
                </div>
              </div>

              {/* Left Column: Form Details (Left Aligned) */}
              <div
                style={{
                  textAlign: "left",
                  fontSize: "9.5pt",
                  fontWeight: "bold",
                  lineHeight: "1.4",
                  color: "#334155",
                }}
              >
                <div>
                  <span style={{ color: "#64748b" }}>اسم النموذج: </span>
                  <span style={{ color: "#0f766e", fontWeight: "800" }}>
                    مساءلة غياب
                  </span>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>رمز النموذج: </span>
                  <span style={{ fontFamily: "monospace", color: "#0f172a" }}>
                    ( و.م.ع.ن - ٠٢ - ٠٤ )
                  </span>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>العام الدراسي: </span>
                  <span style={{ color: "#0f172a" }}>١٤٤٨ هـ</span>
                </div>
              </div>
            </div>

            {/* 2. TABLE 1: School Info & Civil Registry */}
            <table
              style={{
                width: "100%",
                tableLayout: "fixed",
                borderCollapse: "collapse",
                border: "1px solid #0f766e",
                marginBottom: "10px",
                fontSize: "9.5pt",
              }}
            >
              <tbody>
                <tr style={{ borderBottom: "1px solid #0f766e" }}>
                  <td
                    style={{
                      width: "28%",
                      backgroundColor: "#f0fdfa",
                      color: "#115e59",
                      fontWeight: "bold",
                      padding: "10px 8px",
                      borderLeft: "1px solid #0f766e",
                      textAlign: "center",
                      verticalAlign: "middle",
                    }}
                  >
                    المدرسة
                  </td>
                  <td
                    style={{
                      width: "72%",
                      fontWeight: "800",
                      padding: "10px 12px",
                      textAlign: "right",
                      color: "#0f172a",
                      verticalAlign: "middle",
                    }}
                  >
                    الثانوية الخامسة مسارات
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      width: "28%",
                      backgroundColor: "#f0fdfa",
                      color: "#115e59",
                      fontWeight: "bold",
                      padding: "10px 8px",
                      borderLeft: "1px solid #0f766e",
                      textAlign: "center",
                      verticalAlign: "middle",
                    }}
                  >
                    رقم السجل المدني / اسم المستخدم
                  </td>
                  <td
                    style={{
                      width: "72%",
                      fontFamily: "monospace",
                      fontWeight: "bold",
                      padding: "10px 12px",
                      textAlign: "right",
                      color: "#0f172a",
                      verticalAlign: "middle",
                    }}
                  >
                    {teacherUsername}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 3. TABLE 2: Teacher Info (Explicit 25%, 15%, 15%, 15%, 15%, 15%) */}
            <table
              style={{
                width: "100%",
                tableLayout: "fixed",
                borderCollapse: "collapse",
                border: "1px solid #0f766e",
                marginBottom: "12px",
                fontSize: "9pt",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f0fdfa",
                    color: "#115e59",
                    fontWeight: "bold",
                    borderBottom: "1px solid #0f766e",
                    textAlign: "center",
                  }}
                >
                  <th
                    style={{
                      width: "25%",
                      padding: "10px 8px",
                      borderLeft: "1px solid #0f766e",
                      verticalAlign: "middle",
                    }}
                  >
                    اسم الموظفة
                  </th>
                  <th
                    style={{
                      width: "15%",
                      padding: "10px 6px",
                      borderLeft: "1px solid #0f766e",
                      verticalAlign: "middle",
                    }}
                  >
                    التخصص
                  </th>
                  <th
                    style={{
                      width: "15%",
                      padding: "10px 6px",
                      borderLeft: "1px solid #0f766e",
                      verticalAlign: "middle",
                    }}
                  >
                    المستوى / الرتبة
                  </th>
                  <th
                    style={{
                      width: "15%",
                      padding: "10px 6px",
                      borderLeft: "1px solid #0f766e",
                      verticalAlign: "middle",
                    }}
                  >
                    رقم الوظيفة
                  </th>
                  <th
                    style={{
                      width: "15%",
                      padding: "10px 6px",
                      borderLeft: "1px solid #0f766e",
                      verticalAlign: "middle",
                    }}
                  >
                    حالة التوظيف
                  </th>
                  <th
                    style={{
                      width: "15%",
                      padding: "10px 6px",
                      verticalAlign: "middle",
                    }}
                  >
                    عدد الغياب
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  style={{
                    fontWeight: "bold",
                    color: "#0f172a",
                    textAlign: "center",
                    backgroundColor: "#ffffff",
                  }}
                >
                  <td
                    style={{
                      padding: "10px 8px",
                      borderLeft: "1px solid #0f766e",
                      textAlign: "right",
                      fontWeight: "800",
                      wordWrap: "break-word",
                      verticalAlign: "middle",
                    }}
                  >
                    {teacherFullName}
                  </td>
                  <td
                    style={{
                      padding: "10px 6px",
                      borderLeft: "1px solid #0f766e",
                      textAlign: "center",
                      wordWrap: "break-word",
                      verticalAlign: "middle",
                    }}
                  >
                    {teacherSpecialty}
                  </td>
                  <td
                    style={{
                      padding: "10px 6px",
                      borderLeft: "1px solid #0f766e",
                      verticalAlign: "middle",
                    }}
                  >
                    {teacherJobTitle}
                  </td>
                  <td
                    style={{
                      padding: "10px 6px",
                      borderLeft: "1px solid #0f766e",
                      fontFamily: "monospace",
                      verticalAlign: "middle",
                    }}
                  >
                    {teacherUsername}
                  </td>
                  <td
                    style={{
                      padding: "10px 6px",
                      borderLeft: "1px solid #0f766e",
                      verticalAlign: "middle",
                    }}
                  >
                    {teacherEmploymentStatus}
                  </td>
                  <td
                    style={{
                      padding: "10px 6px",
                      fontFamily: "monospace",
                      fontWeight: "900",
                      color: "#be123c",
                      verticalAlign: "middle",
                    }}
                  >
                    {absenceCount}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 4. BODY TEXT: Clean Form 20 Statement & Type without Box */}
            <div
              style={{
                marginTop: "4px",
                marginBottom: "14px",
                fontSize: "10pt",
                lineHeight: "1.6",
                color: "#0f172a",
              }}
            >
              <div>
                إنه في يوم{" "}
                <strong style={{ color: "#0f766e", fontWeight: "800" }}>
                  ({arabicDayName})
                </strong>{" "}
                الموافق:{" "}
                <strong
                  style={{
                    fontFamily: "monospace",
                    color: "#0f766e",
                    fontWeight: "800",
                  }}
                >
                  {formattedDate} م
                </strong>
                ، تغيبت الموظفة عن العمل.
              </div>
              <div style={{ marginTop: "4px", fontWeight: "bold" }}>
                <span style={{ color: "#334155" }}>نوع الغياب المسجل: </span>
                <span
                  style={{
                    color: "#0f766e",
                    fontWeight: "800",
                    fontSize: "10.5pt",
                  }}
                >
                  {record.type}
                </span>
              </div>
            </div>

            {/* 5. SECTION 1: طلب الإفادة */}
            <div
              style={{
                borderTop: "1px solid #cbd5e1",
                paddingTop: "6px",
                marginBottom: "10px",
                fontSize: "9.5pt",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontWeight: "bold",
                  color: "#0f766e",
                  marginBottom: "3px",
                }}
              >
                <span style={{ fontSize: "10pt", fontWeight: "800" }}>
                  ( ١ ) طلب الإفادة: {teacherFullName}
                </span>
                <span style={{ fontSize: "9pt" }}>وفقكِ الله</span>
              </div>
              <div
                style={{
                  fontWeight: "bold",
                  color: "#334155",
                  marginBottom: "2px",
                  fontSize: "9.5pt",
                }}
              >
                السلام عليكم ورحمة الله وبركاته ،، وبعد :
              </div>
              <div
                style={{
                  textAlign: "justify",
                  color: "#1e293b",
                  lineHeight: "1.4",
                  fontSize: "9pt",
                }}
              >
                من خلال متابعة سجل الدوام والعمل تبين غيابكم خلال اليوم الموضح
                بعاليه، آمل الإفادة عن أسباب ذلك وعليكم تقديم ما يؤيد عذركم خلال
                أسبوع من تاريخه علماً بأنه في حالة عدم الالتزام سيتم اتخاذ
                اللازم حسب الأنظمة والتعليمات.
              </div>

              {/* Flexbox 3-Column Signature Line */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  marginTop: "10px",
                  fontSize: "9pt",
                  fontWeight: "bold",
                  color: "#0f172a",
                }}
              >
                <div style={{ width: "38%", textAlign: "right" }}>
                  اسم الرئيسة المباشرة : فاطمة فلاتة
                </div>
                <div style={{ width: "34%", textAlign: "center" }}>
                  التوقيع : ........................
                </div>
                <div style={{ width: "28%", textAlign: "left" }}>
                  التاريخ : {formattedDate} م
                </div>
              </div>
            </div>

            {/* 6. SECTION 2: الإفادة */}
            <div
              style={{
                borderTop: "1.5px dashed #0f766e",
                paddingTop: "6px",
                marginBottom: "10px",
                fontSize: "9.5pt",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontWeight: "bold",
                  color: "#0f766e",
                  marginBottom: "3px",
                }}
              >
                <span style={{ fontSize: "10pt", fontWeight: "800" }}>
                  ( ٢ ) الإفادة: المكرمة / قائدة المدرسة
                </span>
                <span style={{ fontSize: "9pt" }}>وفقكِ الله</span>
              </div>
              <div
                style={{
                  fontWeight: "bold",
                  color: "#334155",
                  marginBottom: "2px",
                  fontSize: "9.5pt",
                }}
              >
                السلام عليكم ورحمة الله وبركاته ،، وبعد :
              </div>
              <div
                style={{
                  fontSize: "9pt",
                  marginBottom: "4px",
                  color: "#0f172a",
                  fontWeight: "bold",
                }}
              >
                أفيدكم بأن غيابي كان للأسباب التالية:
              </div>

              {/* Reason Box (min-height: 80px, padding: 10px, border: 1px solid #ccc) */}
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  padding: "10px 12px",
                  minHeight: "80px",
                  fontWeight: "bold",
                  color: "#0f172a",
                  fontSize: "9.5pt",
                  wordWrap: "break-word",
                  overflowWrap: "anywhere",
                  lineHeight: "1.6",
                  marginBottom: "4px",
                  boxSizing: "border-box",
                }}
              >
                {absenceReason ? (
                  absenceReason
                ) : (
                  <div
                    style={{
                      color: "#94a3b8",
                      fontWeight: "normal",
                      paddingTop: "6px",
                    }}
                  >
                    ...................................................................................................................................................................................................................................................................................................................................................
                  </div>
                )}
              </div>

              <div
                style={{
                  fontSize: "8.5pt",
                  color: "#64748b",
                  marginBottom: "4px",
                }}
              >
                وسأقوم بتقديم ما يثبت ذلك خلال أسبوع من تاريخه .
              </div>

              {/* Flexbox 3-Column Signature Line */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  marginTop: "6px",
                  fontSize: "9pt",
                  fontWeight: "bold",
                  color: "#0f172a",
                }}
              >
                <div style={{ width: "38%", textAlign: "right" }}>
                  اسم الموظفة : {teacherFullName}
                </div>
                <div style={{ width: "34%", textAlign: "center" }}>
                  التوقيع : ........................
                </div>
                <div style={{ width: "28%", textAlign: "left" }}>
                  التاريخ : {formattedDate} م
                </div>
              </div>
            </div>

            {/* 7. SECTION 3: قرار مديرة المدرسة */}
            <div
              style={{
                borderTop: "1.5px dashed #0f766e",
                paddingTop: "6px",
                fontSize: "9.5pt",
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  color: "#0f766e",
                  marginBottom: "4px",
                  fontSize: "9.5pt",
                }}
              >
                ( ٣ ) قرار مديرة المدرسة :
              </div>
              <div
                style={{
                  paddingRight: "4px",
                  fontSize: "8.5pt",
                  color: "#1e293b",
                  lineHeight: "1.45",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                  }}
                >
                  <span
                    style={{
                      width: "13px",
                      height: "13px",
                      border: "1.5px solid #475569",
                      borderRadius: "2px",
                      display: "inline-block",
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  />
                  <span>
                    تحتسب لها إجازة مرضية بعد التأكد من نظامية التقرير الطبي
                    المعتمد .
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                  }}
                >
                  <span
                    style={{
                      width: "13px",
                      height: "13px",
                      border: "1.5px solid #475569",
                      borderRadius: "2px",
                      display: "inline-block",
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  />
                  <span>
                    يحتسب غيابها من رصيدها للإجازات الاضطرارية لقبول عذرها إذا
                    كان رصيدها يسمح وإلا يحسم عليها .
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                  }}
                >
                  <span
                    style={{
                      width: "13px",
                      height: "13px",
                      border: "1.5px solid #475569",
                      borderRadius: "2px",
                      display: "inline-block",
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  />
                  <span>يعتمد الحسم لعدم قبول عذرها .</span>
                </div>
              </div>

              {/* Flexbox 3-Column Signature Line with Hijri Date */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  marginTop: "10px",
                  fontSize: "9pt",
                  fontWeight: "bold",
                  color: "#0f172a",
                }}
              >
                <div style={{ width: "38%", textAlign: "right" }}>
                  اسم الرئيسة المباشرة : فاطمة فلاتة
                </div>
                <div style={{ width: "34%", textAlign: "center" }}>
                  التوقيع : ........................
                </div>
                <div style={{ width: "28%", textAlign: "left" }}>
                  التاريخ : ..../..../١٤٤.. هـ
                </div>
              </div>
            </div>
          </div>

          {/* 8. FOOTER NOTES (ملاحظات هامة): Stick to bottom naturally */}
          <div
            style={{
              borderTop: "2px solid #0f766e",
              backgroundColor: "#f8fafc",
              padding: "6px 10px",
              borderRadius: "4px",
              fontSize: "8pt",
              lineHeight: "1.35",
              color: "#334155",
              marginTop: "auto",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                color: "#0f766e",
                marginBottom: "3px",
              }}
            >
              ملحوظات هامة :
            </div>
            <ul
              dir="rtl"
              style={{
                margin: "0",
                paddingRight: "20px",
                listStyleType: "disc",
              }}
            >
              <li style={{ marginBottom: "3px" }}>
                تستكمل الاستمارة من المديرة المباشرة وإصدار القرار الإداري بموجبه .
              </li>
              <li style={{ marginBottom: "3px" }}>
                إذا سبق إجازة نهاية الأسبوع غياب وألحقها غياب تحتسب مدة الغياب كاملة .
              </li>
              <li style={{ marginBottom: "3px" }}>
                يجب أن توضح المتغيبة أسباب غيابها فور تسلمها الاستمارة وتعيدها لمديرتها المباشرة .
              </li>
              <li>
                تعطى المتغيبة مدة أسبوع لتقديم ما يؤيد عذرها فإذا انقضت المدة الزمنية تستكمل الاستمارة ويتم الحسم .
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
});

AbsencePdfTemplate.displayName = "AbsencePdfTemplate";



