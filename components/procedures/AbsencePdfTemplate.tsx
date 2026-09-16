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

  // Determine Arabic day safely
  const dateObj = new Date(record.date);
  const dayIndex = dateObj.getDay();
  const arabicDayName =
    !isNaN(dayIndex) && dayIndex >= 0 && dayIndex < 7
      ? ARABIC_DAYS[dayIndex]
      : "................";

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
          padding: "12mm 15mm",
          lineHeight: "1.4",
        }}
        className="text-[12px]"
      >
        {/* Outer Frame with Dashed Teal Border */}
        <div
          style={{
            border: "3px dashed #0f766e",
            padding: "10mm",
            minHeight: "273mm",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Top Header Section */}
          <div>
            <div className="flex items-center justify-between border-b-2 border-teal-800 pb-3">
              {/* Right: State & Ministry Details */}
              <div className="text-right text-[11px] font-bold leading-relaxed space-y-0.5">
                <p>المملكة العربية السعودية</p>
                <p>وزارة التعليم</p>
                <p>إدارة تعليم البنات بمنطقة مكة المكرمة</p>
                <p className="text-teal-800">الثانوية الخامسة مسارات</p>
              </div>

              {/* Center: Model Number Box */}
              <div className="text-center">
                <div className="border-2 border-teal-800 px-6 py-1.5 rounded font-extrabold text-[13px] tracking-wide bg-teal-50/40">
                  نموذج رقم ( ٢٠ )
                </div>
              </div>

              {/* Left: Ministry Emblem SVG */}
              <div className="flex flex-col items-center justify-center pl-2">
                <svg
                  width="110"
                  height="45"
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
              </div>
            </div>

            {/* Model Title & Code Bar */}
            <div className="flex items-center justify-between font-extrabold text-[12.5px] py-2 px-1 text-slate-900 border-b border-teal-700/40">
              <div>
                <span>اسم النموذج: </span>
                <span className="text-teal-900 font-black">مساءلة غياب</span>
              </div>
              <div className="text-slate-700 font-mono text-[11px]">
                رمز النموذج ( و.م.ع.ن - ٠٢ - ٠٤ )
              </div>
            </div>

            {/* Table 1: School Info & Civil Registry */}
            <div className="mt-3 border border-teal-800 text-[11.5px]">
              <div className="grid grid-cols-12 border-b border-teal-800">
                <div className="col-span-3 bg-teal-50/70 p-1.5 font-bold text-teal-950 border-l border-teal-800 text-center">
                  المدرسة
                </div>
                <div className="col-span-9 p-1.5 font-extrabold text-center text-teal-900">
                  الثانوية الخامسة مسارات
                </div>
              </div>
              <div className="grid grid-cols-12">
                <div className="col-span-3 bg-teal-50/70 p-1.5 font-bold text-teal-950 border-l border-teal-800 text-center">
                  رقم السجل المدني
                </div>
                <div className="col-span-9 p-1.5 font-mono font-bold text-center text-slate-800">
                  {teacher.jobNumber || "—"}
                </div>
              </div>
            </div>

            {/* Table 2: Teacher Comprehensive Details */}
            <div className="mt-3 border border-teal-800 text-[11px] text-center">
              <div className="grid grid-cols-12 bg-teal-50/80 font-bold text-teal-950 border-b border-teal-800">
                <div className="col-span-3 p-1.5 border-l border-teal-800">
                  اسم الموظفة
                </div>
                <div className="col-span-2 p-1.5 border-l border-teal-800">
                  التخصص
                </div>
                <div className="col-span-2 p-1.5 border-l border-teal-800">
                  المستوى / الرتبة
                </div>
                <div className="col-span-2 p-1.5 border-l border-teal-800">
                  رقم الوظيفة
                </div>
                <div className="col-span-2 p-1.5 border-l border-teal-800">
                  العمل الحالي
                </div>
                <div className="col-span-1 p-1.5">عدد الغياب</div>
              </div>

              <div className="grid grid-cols-12 font-bold text-slate-900 bg-white">
                <div className="col-span-3 p-1.5 border-l border-teal-800 truncate font-extrabold">
                  {teacher.name}
                </div>
                <div className="col-span-2 p-1.5 border-l border-teal-800 truncate">
                  {teacher.specialty}
                </div>
                <div className="col-span-2 p-1.5 border-l border-teal-800">
                  معلم ممارس
                </div>
                <div className="col-span-2 p-1.5 border-l border-teal-800 font-mono">
                  {teacher.jobNumber}
                </div>
                <div className="col-span-2 p-1.5 border-l border-teal-800">
                  معلمة
                </div>
                <div className="col-span-1 p-1.5 font-mono font-black text-rose-700">
                  {teacher.totalAbsences}
                </div>
              </div>
            </div>

            {/* Absence Period Text */}
            <div className="mt-3.5 p-2 bg-slate-50 border border-slate-300 rounded text-[11px] leading-relaxed">
              <p>
                إنه في يوم{" "}
                <strong className="text-teal-900 font-bold">
                  ({arabicDayName})
                </strong>{" "}
                الموافق :{" "}
                <strong className="font-mono font-bold text-teal-900">
                  {record.date}
                </strong>{" "}
                تغيبت عن العمل
              </p>
              <p className="mt-1">
                نوع الغياب المسجل :{" "}
                <strong className="text-teal-950 font-bold">
                  {record.type}
                </strong>
              </p>
            </div>

            {/* Section 1: طلب الإفادة */}
            <div className="mt-3 pt-2 border-t border-slate-300 space-y-1.5 text-[11px]">
              <div className="font-bold text-teal-950 flex items-center justify-between">
                <span>( ١ ) طلب الإفادة : المكرمة / {teacher.name}</span>
                <span>وفقكِ الله</span>
              </div>
              <p className="font-bold text-slate-700">
                السلام عليكم ورحمة الله وبركاته ،، وبعد :
              </p>
              <p className="text-justify leading-relaxed text-slate-800 text-[10.5px]">
                من خلال متابعة سجل العمل تبين غيابكم خلال الفترة الموضحة بعاليه
                ، آمل الإفادة عن أسباب ذلك وعليكم تقديم ما يؤيد عذركم خلال أسبوع
                من تاريخه علماً بأنه في حالة عدم الالتزام سيتم اتخاذ اللازم حسب
                الأنظمة والتعليمات.
              </p>
              <div className="flex items-center justify-between pt-1 font-bold text-[10.5px]">
                <div>اسم الرئيسة المباشرة : فاطمة فلاتة</div>
                <div>التوقيع : ........................</div>
                <div>التاريخ : {record.date} م</div>
              </div>
            </div>

            {/* Section 2: الإفادة */}
            <div className="mt-3 pt-2 border-t-2 border-dashed border-teal-800/60 space-y-1.5 text-[11px]">
              <div className="font-bold text-teal-950 flex items-center justify-between">
                <span>( ٢ ) الإفادة : المكرمة / قائدة المدرسة . فاطمة فلاتة</span>
                <span>وفقكِ الله</span>
              </div>
              <p className="font-bold text-slate-700">
                السلام عليكم ورحمة الله وبركاته ،، وبعد :
              </p>
              <p className="leading-relaxed text-[11px]">
                أفيدكم أن غيابي كان للأسباب التالية :
              </p>
              <div className="p-2 bg-slate-50 border border-slate-300 rounded min-h-[38px] font-bold text-teal-950 text-[10.5px]">
                {record.reason}
              </div>
              <p className="text-[10px] text-slate-600">
                وسأقوم بتقديم ما يثبت ذلك خلال أسبوع من تاريخه .
              </p>
              <div className="flex items-center justify-between pt-1 font-bold text-[10.5px]">
                <div>اسم الموظفة : {teacher.name}</div>
                <div>التوقيع : ........................</div>
                <div>التاريخ : {record.date} م</div>
              </div>
            </div>

            {/* Section 3: مديرة المدرسة */}
            <div className="mt-3 pt-2 border-t-2 border-dashed border-teal-800/60 space-y-1.5 text-[11px]">
              <div className="font-bold text-teal-950">
                ( ٣ ) قرار مديرة المدرسة :
              </div>
              <div className="space-y-1 pr-3 text-[10px] text-slate-800 font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 border border-slate-600 rounded-xs inline-block"></span>
                  <span>تحتسب لها إجازة مرضية بعد التأكد من نظامية التقرير الطبي المعتمد .</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 border border-slate-600 rounded-xs inline-block"></span>
                  <span>
                    يحتسب غيابها من رصيدها للإجازات الاضطرارية لقبول عذرها إذا
                    كان رصيدها يسمح وإلا يحسم عليها .
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 border border-slate-600 rounded-xs inline-block"></span>
                  <span>يعتمد الحسم لعدم قبول عذرها .</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 font-bold text-[10.5px]">
                <div>اسم الرئيسة المباشرة : فاطمة فلاتة</div>
                <div>التوقيع : ........................</div>
                <div>التاريخ : ..... / ..... / 144 هـ</div>
              </div>
            </div>
          </div>

          {/* Section 4: ملحوظات هامة (Footer Notes) */}
          <div className="pt-2 border-t-2 border-teal-800 text-[9.5px] leading-tight text-slate-700 bg-slate-50/50 p-2 rounded">
            <p className="font-bold text-teal-950 mb-1">ملحوظات هامة :</p>
            <div className="space-y-0.5 pr-2">
              <p>➢ تستكمل الاستمارة من المديرة المباشرة وإصدار القرار الإداري بموجبه .</p>
              <p>➢ إذا سبق إجازة نهاية الأسبوع غياب وألحقها غياب تحتسب مدة الغياب كاملة .</p>
              <p>➢ يجب أن توضح المتغيبة أسباب غيابها فور تسلمها الاستمارة وتعيدها لمديرتها المباشرة .</p>
              <p>➢ تعطى المتغيبة مدة أسبوع لتقديم ما يؤيد عذرها فإذا انقضت المدة الزمنية تستكمل الاستمارة ويتم الحسم .</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

AbsencePdfTemplate.displayName = "AbsencePdfTemplate";
