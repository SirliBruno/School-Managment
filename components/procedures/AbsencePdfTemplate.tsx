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

export const AbsencePdfTemplate = forwardRef<
  HTMLDivElement,
  AbsencePdfTemplateProps
>(({ record, teacher }, ref) => {
  if (!record || !teacher) return null;

  // Determine Arabic day name safely
  const dateObj = new Date(record.date);
  const dayIndex = dateObj.getDay();
  const arabicDayName =
    !isNaN(dayIndex) && dayIndex >= 0 && dayIndex < 7
      ? ARABIC_DAYS[dayIndex]
      : "................";

  const teacherFullName = teacher.fullName || teacher.name || "معلمة";
  const teacherUsername = teacher.username || teacher.jobNumber || "—";
  const teacherSpecialty = teacher.specialty || teacher.teachingField || "عام";
  const teacherJobTitle = teacher.jobTitle || "معلم";
  const teacherEmploymentStatus = teacher.employmentStatus || "دائم";
  const absenceCount = teacher.totalAbsences ?? 0;
  const absenceReason = record.reason?.trim() || "—";

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
          minHeight: "297mm",
          boxSizing: "border-box",
          backgroundColor: "#ffffff",
          color: "#0f172a",
          fontFamily: "var(--font-cairo), 'Segoe UI', Tahoma, sans-serif",
          padding: "10mm 12mm",
          lineHeight: "1.4",
          fontSize: "11pt",
          textAlign: "right",
          direction: "rtl",
        }}
      >
        {/* Outer Frame with Dashed Teal Border */}
        <div
          style={{
            border: "2px dashed #0f766e",
            padding: "8mm 9mm",
            minHeight: "277mm",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* TOP SECTION: Header & Details */}
          <div>
            {/* 3-Column Header Table */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                borderBottom: "2px solid #0f766e",
                paddingBottom: "8px",
                marginBottom: "8px",
              }}
            >
              <tbody>
                <tr>
                  {/* Right Column: Ministry & School Info */}
                  <td
                    style={{
                      width: "36%",
                      verticalAlign: "top",
                      textAlign: "right",
                      fontSize: "10pt",
                      fontWeight: "bold",
                      lineHeight: "1.35",
                      color: "#0f172a",
                    }}
                  >
                    <div>المملكة العربية السعودية</div>
                    <div>وزارة التعليم</div>
                    <div>إدارة تعليم البنات بمنطقة مكة المكرمة</div>
                    <div style={{ color: "#0f766e", fontWeight: "800" }}>
                      الثانوية الخامسة مسارات
                    </div>
                  </td>

                  {/* Center Column: Logo & Form Model Box */}
                  <td
                    style={{
                      width: "28%",
                      verticalAlign: "middle",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                      }}
                    >
                      <svg
                        width="85"
                        height="38"
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
                          padding: "2px 10px",
                          borderRadius: "4px",
                          fontWeight: "800",
                          fontSize: "10.5pt",
                          backgroundColor: "#f0fdfa",
                          color: "#115e59",
                          display: "inline-block",
                        }}
                      >
                        نموذج رقم ( ٢٠ )
                      </div>
                    </div>
                  </td>

                  {/* Left Column: Form Info */}
                  <td
                    style={{
                      width: "36%",
                      verticalAlign: "top",
                      textAlign: "left",
                      fontSize: "9.5pt",
                      fontWeight: "bold",
                      lineHeight: "1.4",
                      color: "#334155",
                    }}
                  >
                    <div>
                      <span style={{ color: "#64748b" }}>اسم النموذج: </span>
                      <span style={{ color: "#0f766e", fontWeight: "800" }}>مساءلة غياب</span>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>رمز النموذج: </span>
                      <span style={{ fontFamily: "monospace", color: "#1e293b" }}>
                        ( و.م.ع.ن - ٠٢ - ٠٤ )
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>العام الدراسي: </span>
                      <span style={{ color: "#1e293b" }}>١٤٤٨ هـ</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Table 1: School Info & Civil Registry */}
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "1px solid #0f766e",
                marginBottom: "8px",
                fontSize: "10pt",
              }}
            >
              <tbody>
                <tr style={{ borderBottom: "1px solid #0f766e" }}>
                  <td
                    style={{
                      width: "25%",
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
                      width: "75%",
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
                      width: "25%",
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
                      width: "75%",
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

            {/* Table 2: Teacher Comprehensive Details (Fixed Width, No Overflow) */}
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
                      width: "30%",
                      padding: "5px 6px",
                      borderLeft: "1px solid #0f766e",
                    }}
                  >
                    اسم الموظفة
                  </th>
                  <th
                    style={{
                      width: "18%",
                      padding: "5px 6px",
                      borderLeft: "1px solid #0f766e",
                    }}
                  >
                    التخصص
                  </th>
                  <th
                    style={{
                      width: "14%",
                      padding: "5px 4px",
                      borderLeft: "1px solid #0f766e",
                    }}
                  >
                    المستوى / الرتبة
                  </th>
                  <th
                    style={{
                      width: "14%",
                      padding: "5px 4px",
                      borderLeft: "1px solid #0f766e",
                    }}
                  >
                    رقم الوظيفة
                  </th>
                  <th
                    style={{
                      width: "12%",
                      padding: "5px 4px",
                      borderLeft: "1px solid #0f766e",
                    }}
                  >
                    حالة التوظيف
                  </th>
                  <th
                    style={{
                      width: "12%",
                      padding: "5px 4px",
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
                      padding: "6px 8px",
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
                      padding: "6px 8px",
                      borderLeft: "1px solid #0f766e",
                      textAlign: "right",
                      wordBreak: "break-word",
                    }}
                  >
                    {teacherSpecialty}
                  </td>
                  <td
                    style={{
                      padding: "6px 4px",
                      borderLeft: "1px solid #0f766e",
                    }}
                  >
                    {teacherJobTitle}
                  </td>
                  <td
                    style={{
                      padding: "6px 4px",
                      borderLeft: "1px solid #0f766e",
                      fontFamily: "monospace",
                    }}
                  >
                    {teacherUsername}
                  </td>
                  <td
                    style={{
                      padding: "6px 4px",
                      borderLeft: "1px solid #0f766e",
                    }}
                  >
                    {teacherEmploymentStatus}
                  </td>
                  <td
                    style={{
                      padding: "6px 4px",
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

            {/* Absence Statement & Phrasing Box */}
            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                padding: "6px 10px",
                marginBottom: "8px",
                fontSize: "10pt",
                lineHeight: "1.4",
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
                  {record.date} م
                </strong>{" "}
                ، تغيبت الموظفة عن العمل.
              </div>
              <div style={{ marginTop: "3px" }}>
                <span>نوع الغياب المسجل: </span>
                <strong
                  style={{
                    color: "#0f766e",
                    fontWeight: "800",
                    border: "1px solid #99f6e4",
                    backgroundColor: "#f0fdfa",
                    padding: "1px 8px",
                    borderRadius: "4px",
                    display: "inline-block",
                  }}
                >
                  {record.type}
                </strong>
              </div>
            </div>

            {/* SECTION 1: طلب الإفادة */}
            <div
              style={{
                borderTop: "1px solid #cbd5e1",
                paddingTop: "6px",
                marginBottom: "8px",
                fontSize: "9.5pt",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: "bold",
                  color: "#0f766e",
                  marginBottom: "2px",
                }}
              >
                <span>( ١ ) طلب الإفادة : المكرمة / {teacherFullName}</span>
                <span>وفقكِ الله</span>
              </div>
              <div style={{ fontWeight: "bold", color: "#334155", marginBottom: "2px" }}>
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
                من خلال متابعة سجل الدوام والعمل تبين غيابكم خلال اليوم الموضح بعاليه،
                آمل الإفادة عن أسباب ذلك وعليكم تقديم ما يؤيد عذركم خلال أسبوع من
                تاريخه علماً بأنه في حالة عدم الالتزام سيتم اتخاذ اللازم حسب الأنظمة
                والتعليمات.
              </div>
              <table
                style={{
                  width: "100%",
                  marginTop: "6px",
                  fontSize: "9pt",
                  fontWeight: "bold",
                }}
              >
                <tbody>
                  <tr>
                    <td style={{ width: "40%", textAlign: "right" }}>
                      اسم الرئيسة المباشرة : فاطمة فلاتة
                    </td>
                    <td style={{ width: "35%", textAlign: "center" }}>
                      التوقيع : ........................
                    </td>
                    <td style={{ width: "25%", textAlign: "left" }}>
                      التاريخ : {record.date} م
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* SECTION 2: الإفادة */}
            <div
              style={{
                borderTop: "1.5px dashed #0f766e",
                paddingTop: "6px",
                marginBottom: "8px",
                fontSize: "9.5pt",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: "bold",
                  color: "#0f766e",
                  marginBottom: "2px",
                }}
              >
                <span>( ٢ ) الإفادة : المكرمة / قائدة المدرسة . فاطمة فلاتة</span>
                <span>وفقكِ الله</span>
              </div>
              <div style={{ fontWeight: "bold", color: "#334155", marginBottom: "2px" }}>
                السلام عليكم ورحمة الله وبركاته ،، وبعد :
              </div>
              <div style={{ fontSize: "9pt", marginBottom: "3px" }}>
                أفيدكم أن غيابي كان للأسباب التالية :
              </div>
              {/* Reason Box */}
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  padding: "5px 10px",
                  minHeight: "36px",
                  fontWeight: "bold",
                  color: "#0f172a",
                  fontSize: "9pt",
                  wordBreak: "break-word",
                  lineHeight: "1.35",
                }}
              >
                {absenceReason}
              </div>
              <div style={{ fontSize: "8pt", color: "#64748b", marginTop: "2px" }}>
                وسأقوم بتقديم ما يثبت ذلك خلال أسبوع من تاريخه .
              </div>
              <table
                style={{
                  width: "100%",
                  marginTop: "4px",
                  fontSize: "9pt",
                  fontWeight: "bold",
                }}
              >
                <tbody>
                  <tr>
                    <td style={{ width: "40%", textAlign: "right" }}>
                      اسم الموظفة : {teacherFullName}
                    </td>
                    <td style={{ width: "35%", textAlign: "center" }}>
                      التوقيع : ........................
                    </td>
                    <td style={{ width: "25%", textAlign: "left" }}>
                      التاريخ : {record.date} م
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* SECTION 3: قرار مديرة المدرسة */}
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
                }}
              >
                ( ٣ ) قرار مديرة المدرسة :
              </div>
              <div
                style={{
                  paddingRight: "6px",
                  fontSize: "8.5pt",
                  color: "#1e293b",
                  lineHeight: "1.45",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: "11px",
                      height: "11px",
                      border: "1px solid #475569",
                      borderRadius: "2px",
                    }}
                  />
                  <span>
                    تحتسب لها إجازة مرضية بعد التأكد من نظامية التقرير الطبي المعتمد .
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: "11px",
                      height: "11px",
                      border: "1px solid #475569",
                      borderRadius: "2px",
                    }}
                  />
                  <span>
                    يحتسب غيابها من رصيدها للإجازات الاضطرارية لقبول عذرها إذا كان
                    رصيدها يسمح وإلا يحسم عليها .
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: "11px",
                      height: "11px",
                      border: "1px solid #475569",
                      borderRadius: "2px",
                    }}
                  />
                  <span>يعتمد الحسم لعدم قبول عذرها .</span>
                </div>
              </div>

              <table
                style={{
                  width: "100%",
                  marginTop: "6px",
                  fontSize: "9pt",
                  fontWeight: "bold",
                }}
              >
                <tbody>
                  <tr>
                    <td style={{ width: "40%", textAlign: "right" }}>
                      اسم الرئيسة المباشرة : فاطمة فلاتة
                    </td>
                    <td style={{ width: "35%", textAlign: "center" }}>
                      التوقيع : ........................
                    </td>
                    <td style={{ width: "25%", textAlign: "left" }}>
                      التاريخ : ..... / ..... / ١٤٤٨ هـ
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* BOTTOM SECTION: Footer Notes */}
          <div
            style={{
              borderTop: "2px solid #0f766e",
              backgroundColor: "#f8fafc",
              padding: "5px 8px",
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
                paddingRight: "16px",
                listStyleType: "disc",
              }}
            >
              <li>تستكمل الاستمارة من المديرة المباشرة وإصدار القرار الإداري بموجبه .</li>
              <li>إذا سبق إجازة نهاية الأسبوع غياب وألحقها غياب تحتسب مدة الغياب كاملة .</li>
              <li>يجب أن توضح المتغيبة أسباب غيابها فور تسلمها الاستمارة وتعيدها لمديرتها المباشرة .</li>
              <li>تعطى المتغيبة مدة أسبوع لتقديم ما يؤيد عذرها فإذا انقضت المدة الزمنية تستكمل الاستمارة ويتم الحسم .</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
});

AbsencePdfTemplate.displayName = "AbsencePdfTemplate";

