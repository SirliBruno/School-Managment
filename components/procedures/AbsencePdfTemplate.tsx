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
          lineHeight: "1.35",
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
            padding: "7mm 8mm",
            height: "281mm",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* TOP SECTION */}
          <div>
            {/* 1. HEADER SECTION (Row 1: 3 Columns & Row 2: Centered Title Bar) */}
            <div
              style={{
                borderBottom: "2px solid #0f766e",
                paddingBottom: "8px",
                marginBottom: "8px",
              }}
            >
              {/* Row 1: 3 Balanced Columns with Flexbox */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                }}
              >
                {/* Right Column: Ministry text (right-aligned) */}
                <div
                  style={{
                    width: "33%",
                    textAlign: "right",
                    fontSize: "9.5pt",
                    fontWeight: "bold",
                    lineHeight: "1.35",
                    color: "#0f172a",
                  }}
                >
                  <div>المملكة العربية السعودية</div>
                  <div>وزارة التعليم</div>
                  <div>الإدارة العامة للتعليم بمنطقة مكة المكرمة</div>
                </div>

                {/* Center Column: Logo + Box "نموذج رقم (٢٠)" */}
                <div
                  style={{
                    width: "34%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "3px",
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
                      padding: "1.5px 10px",
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

                {/* Left Column: Form code and school name */}
                <div
                  style={{
                    width: "33%",
                    textAlign: "left",
                    fontSize: "9.5pt",
                    fontWeight: "bold",
                    lineHeight: "1.35",
                    color: "#334155",
                  }}
                >
                  <div>
                    <span style={{ color: "#64748b" }}>رمز النموذج: </span>
                    <span style={{ fontFamily: "monospace", color: "#0f172a" }}>
                      ( و.م.ع.ن - ٠٢ - ٠٤ )
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>المدرسة: </span>
                    <span style={{ color: "#0f766e", fontWeight: "800" }}>
                      الثانوية الخامسة مسارات
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 2: Centered Title Bar */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "#f0fdfa",
                  border: "1px solid #0f766e",
                  borderRadius: "4px",
                  padding: "4px 12px",
                  marginTop: "8px",
                }}
              >
                <div
                  style={{
                    fontWeight: "800",
                    fontSize: "11pt",
                    color: "#0f766e",
                  }}
                >
                  اسم النموذج: مساءلة غياب
                </div>
                <div
                  style={{
                    fontWeight: "bold",
                    fontSize: "9.5pt",
                    color: "#115e59",
                  }}
                >
                  العام الدراسي: ١٤٤٨ هـ
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
                marginBottom: "8px",
                fontSize: "9.5pt",
              }}
            >
              <tbody>
                <tr style={{ borderBottom: "1px solid #0f766e" }}>
                  <td
                    style={{
                      width: "30%",
                      backgroundColor: "#f0fdfa",
                      color: "#115e59",
                      fontWeight: "bold",
                      padding: "5px 8px",
                      borderLeft: "1px solid #0f766e",
                      textAlign: "center",
                    }}
                  >
                    المدرسة
                  </td>
                  <td
                    style={{
                      width: "70%",
                      fontWeight: "800",
                      padding: "5px 12px",
                      textAlign: "right",
                      color: "#0f172a",
                    }}
                  >
                    الثانوية الخامسة مسارات
                  </td>
                </tr>
                <tr>
                  <td
                    style={{
                      width: "30%",
                      backgroundColor: "#f0fdfa",
                      color: "#115e59",
                      fontWeight: "bold",
                      padding: "5px 8px",
                      borderLeft: "1px solid #0f766e",
                      textAlign: "center",
                    }}
                  >
                    رقم السجل المدني / اسم المستخدم
                  </td>
                  <td
                    style={{
                      width: "70%",
                      fontFamily: "monospace",
                      fontWeight: "bold",
                      padding: "5px 12px",
                      textAlign: "right",
                      color: "#0f172a",
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
                marginBottom: "8px",
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
                      padding: "8px 6px",
                      borderLeft: "1px solid #0f766e",
                    }}
                  >
                    اسم الموظفة
                  </th>
                  <th
                    style={{
                      width: "15%",
                      padding: "8px 4px",
                      borderLeft: "1px solid #0f766e",
                    }}
                  >
                    التخصص
                  </th>
                  <th
                    style={{
                      width: "15%",
                      padding: "8px 4px",
                      borderLeft: "1px solid #0f766e",
                    }}
                  >
                    المستوى / الرتبة
                  </th>
                  <th
                    style={{
                      width: "15%",
                      padding: "8px 4px",
                      borderLeft: "1px solid #0f766e",
                    }}
                  >
                    رقم الوظيفة
                  </th>
                  <th
                    style={{
                      width: "15%",
                      padding: "8px 4px",
                      borderLeft: "1px solid #0f766e",
                    }}
                  >
                    حالة التوظيف
                  </th>
                  <th
                    style={{
                      width: "15%",
                      padding: "8px 4px",
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
                      padding: "8px 6px",
                      borderLeft: "1px solid #0f766e",
                      textAlign: "right",
                      fontWeight: "800",
                      wordBreak: "break-word",
                    }}
                  >
                    {teacherFullName}
                  </td>
                  <td
                    style={{
                      padding: "8px 4px",
                      borderLeft: "1px solid #0f766e",
                      textAlign: "right",
                      wordBreak: "break-word",
                    }}
                  >
                    {teacherSpecialty}
                  </td>
                  <td
                    style={{
                      padding: "8px 4px",
                      borderLeft: "1px solid #0f766e",
                    }}
                  >
                    {teacherJobTitle}
                  </td>
                  <td
                    style={{
                      padding: "8px 4px",
                      borderLeft: "1px solid #0f766e",
                      fontFamily: "monospace",
                    }}
                  >
                    {teacherUsername}
                  </td>
                  <td
                    style={{
                      padding: "8px 4px",
                      borderLeft: "1px solid #0f766e",
                    }}
                  >
                    {teacherEmploymentStatus}
                  </td>
                  <td
                    style={{
                      padding: "8px 4px",
                      fontFamily: "monospace",
                      fontWeight: "900",
                      color: "#be123c",
                    }}
                  >
                    {absenceCount}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 4. BODY TEXT (Form 20 Statement & Formatted Date) */}
            <div
              style={{
                marginBottom: "8px",
                fontSize: "9.5pt",
                lineHeight: "1.5",
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
              <div style={{ marginTop: "4px" }}>
                <span style={{ fontWeight: "bold", color: "#334155" }}>
                  نوع الغياب المسجل:{" "}
                </span>
                <strong
                  style={{
                    color: "#0f766e",
                    fontWeight: "800",
                    fontSize: "10pt",
                  }}
                >
                  {record.type}
                </strong>
              </div>
            </div>

            {/* 5. SECTION 1: طلب الإفادة */}
            <div
              style={{
                borderTop: "1px solid #cbd5e1",
                paddingTop: "5px",
                marginBottom: "6px",
                fontSize: "9pt",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontWeight: "bold",
                  color: "#0f766e",
                  marginBottom: "2px",
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
                }}
              >
                السلام عليكم ورحمة الله وبركاته ،، وبعد :
              </div>
              <div
                style={{
                  textAlign: "justify",
                  color: "#1e293b",
                  lineHeight: "1.35",
                  fontSize: "8.5pt",
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
                  marginTop: "6px",
                  fontSize: "8.5pt",
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
                paddingTop: "5px",
                marginBottom: "6px",
                fontSize: "9pt",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontWeight: "bold",
                  color: "#0f766e",
                  marginBottom: "2px",
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
                }}
              >
                السلام عليكم ورحمة الله وبركاته ،، وبعد :
              </div>
              <div
                style={{
                  fontSize: "8.5pt",
                  marginBottom: "3px",
                  color: "#0f172a",
                }}
              >
                أفيدكم أن غيابي كان للأسباب التالية :
              </div>

              {/* Reason Box (min-height: 80px, proper borders and padding) */}
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  padding: "10px",
                  minHeight: "80px",
                  fontWeight: "bold",
                  color: "#0f172a",
                  fontSize: "9pt",
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                  lineHeight: "1.5",
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
                  fontSize: "8pt",
                  color: "#64748b",
                  marginTop: "3px",
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
                  marginTop: "4px",
                  fontSize: "8.5pt",
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
                paddingTop: "5px",
                fontSize: "9pt",
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  color: "#0f766e",
                  marginBottom: "3px",
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
                  lineHeight: "1.4",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: "12px",
                      height: "12px",
                      border: "1.5px solid #475569",
                      borderRadius: "2px",
                      flexShrink: 0,
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
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: "12px",
                      height: "12px",
                      border: "1.5px solid #475569",
                      borderRadius: "2px",
                      flexShrink: 0,
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
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: "12px",
                      height: "12px",
                      border: "1.5px solid #475569",
                      borderRadius: "2px",
                      flexShrink: 0,
                    }}
                  />
                  <span>يعتمد الحسم لعدم قبول عذرها .</span>
                </div>
              </div>

              {/* Flexbox 3-Column Signature Line */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  marginTop: "6px",
                  fontSize: "8.5pt",
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
                  التاريخ : ..... / ..... / ١٤٤٨ هـ
                </div>
              </div>
            </div>
          </div>

          {/* 8. BOTTOM SECTION: Footer Notes (ملاحظات هامة) */}
          <div
            style={{
              borderTop: "2px solid #0f766e",
              backgroundColor: "#f8fafc",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "8pt",
              lineHeight: "1.3",
              color: "#334155",
              marginTop: "4px",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                color: "#0f766e",
                marginBottom: "2px",
              }}
            >
              ملحوظات هامة :
            </div>
            <ul
              dir="rtl"
              style={{
                margin: "0",
                paddingRight: "18px",
                listStyleType: "disc",
              }}
            >
              <li>
                تستكمل الاستمارة من المديرة المباشرة وإصدار القرار الإداري بموجبه .
              </li>
              <li>
                إذا سبق إجازة نهاية الأسبوع غياب وألحقها غياب تحتسب مدة الغياب كاملة .
              </li>
              <li>
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


