"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Download,
  X,
  Loader2,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { Teacher, ExcelTeacherRow } from "@/types/teacher";

export const ExcelImporter: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { addTeachers } = useTeachers();

  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{
    type: "success" | "error" | "warning";
    message: string;
    subMessage?: string;
  } | null>(null);

  // Clear toast timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Display alert with auto-dismiss
  const showAlert = useCallback(
    (
      type: "success" | "error" | "warning",
      message: string,
      subMessage?: string
    ) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setAlertInfo({ type, message, subMessage });

      // Auto dismiss success messages after 7 seconds
      if (type === "success") {
        timeoutRef.current = setTimeout(() => {
          setAlertInfo(null);
        }, 7000);
      }
    },
    []
  );

  // Trigger hidden input
  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  // Helper to normalize header names for resilient comparison
  const normalizeHeader = (header: string): string => {
    return header
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, "");
  };

  // Core file parsing logic
  const processFile = async (file: File) => {
    setIsLoading(true);
    setAlertInfo(null);

    // Validate file extension
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "xlsx" && extension !== "xls") {
      showAlert(
        "error",
        "صيغة الملف غير مدعومة!",
        `الملف المرفوع (${file.name}) ليس ملف Excel. يرجى اختيار ملف بصيغة .xlsx أو .xls`
      );
      setIsLoading(false);
      return;
    }

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error("ملف الإكسل فارغ ولا يحتوي على أي ورقة عمل صالحة.");
      }

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Parse JSON from active worksheet
      const rawRows: ExcelTeacherRow[] = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
        raw: false, // Ensure strings for numerical username/job IDs/mobiles
      });

      if (rawRows.length === 0) {
        showAlert(
          "warning",
          "ورقة العمل المحددة فارغة!",
          "لم يتم العثور على أي بيانات داخل ورقة العمل الأولى في الملف."
        );
        setIsLoading(false);
        return;
      }

      // Check column headers in the first row
      const firstRow = rawRows[0];
      const rawKeys = Object.keys(firstRow);
      const normalizedKeys = rawKeys.map(normalizeHeader);

      const hasUsername = normalizedKeys.some(
        (k) =>
          k.includes("المستخدم") ||
          k.includes("الوظيفة") ||
          k.includes("الوظيفي") ||
          k.includes("السجل") ||
          k.includes("الهوية") ||
          k.toLowerCase().includes("user") ||
          k.toLowerCase().includes("job")
      );

      const hasName = normalizedKeys.some(
        (k) =>
          k.includes("الرباعي") ||
          k.includes("الاسم") ||
          k.includes("اسم المعلمة") ||
          k.toLowerCase().includes("name")
      );

      // Report missing critical headers
      const missingHeaders: string[] = [];
      if (!hasUsername) missingHeaders.push("اسم المستخدم");
      if (!hasName) missingHeaders.push("الاسم الرباعي");

      if (missingHeaders.length > 0) {
        showAlert(
          "error",
          "أعمدة مفقودة في ملف الإكسل!",
          `الأعمدة الإلزامية التالية غير متوفرة في الصف الأول: (${missingHeaders.join(
            " ، "
          )}). يرجى مطابقة أعمدة ملف (منسوبات ث5) أو تحميل النموذج المعتمد.`
        );
        setIsLoading(false);
        return;
      }

      // Parse 7-column records safely
      const parsedTeachers: Teacher[] = [];
      let skippedCount = 0;

      for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];

        let usernameVal = "";
        let fullNameVal = "";
        let mobileVal = "";
        let employmentStatusVal = "دائم";
        let jobTitleVal = "معلم";
        let teachingFieldVal = "";
        let specialtyVal = "";

        for (const [key, val] of Object.entries(row)) {
          const normKey = normalizeHeader(key);
          const stringVal = String(val ?? "").trim();

          // 1. اسم المستخدم (Username / Job ID)
          if (
            !usernameVal &&
            (normKey.includes("المستخدم") ||
              normKey.includes("الوظيفة") ||
              normKey.includes("الوظيفي") ||
              normKey.includes("السجل") ||
              normKey.includes("الهوية") ||
              normKey.toLowerCase().includes("user") ||
              normKey.toLowerCase().includes("job"))
          ) {
            usernameVal = stringVal;
          }
          // 2. الاسم الرباعي (Full Name)
          else if (
            !fullNameVal &&
            (normKey.includes("الرباعي") ||
              normKey.includes("الاسم") ||
              normKey.includes("اسم المعلمة") ||
              normKey.toLowerCase().includes("name"))
          ) {
            fullNameVal = stringVal;
          }
          // 3. الجوال (Mobile)
          else if (
            !mobileVal &&
            (normKey.includes("الجوال") ||
              normKey.includes("هاتف") ||
              normKey.toLowerCase().includes("mobile") ||
              normKey.toLowerCase().includes("phone"))
          ) {
            mobileVal = stringVal;
          }
          // 4. حالة التوظيف (Employment Status: دائم / عقد)
          else if (
            normKey.includes("التوظيف") ||
            normKey.includes("التعاقد") ||
            normKey.toLowerCase().includes("status")
          ) {
            if (stringVal) employmentStatusVal = stringVal;
          }
          // 5. المسمى الوظيفي (Job Title)
          else if (
            normKey.includes("المسمى") ||
            normKey.includes("وظيفة") ||
            normKey.toLowerCase().includes("title")
          ) {
            if (stringVal) jobTitleVal = stringVal;
          }
          // 6. مجال التدريس (Teaching Field)
          else if (
            !teachingFieldVal &&
            (normKey.includes("مجال التدريس") ||
              normKey.includes("المجال") ||
              normKey.toLowerCase().includes("field"))
          ) {
            teachingFieldVal = stringVal;
          }
          // 7. التخصص (Specialty)
          else if (
            !specialtyVal &&
            (normKey.includes("التخصص") ||
              normKey.includes("تخصص") ||
              normKey.toLowerCase().includes("specialty"))
          ) {
            specialtyVal = stringVal;
          }
        }

        // Strict validation: Skip rows missing username or fullName
        if (!usernameVal || !fullNameVal) {
          skippedCount++;
          continue;
        }

        parsedTeachers.push({
          id:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `tch-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
          username: usernameVal,
          fullName: fullNameVal,
          mobile: mobileVal || undefined,
          employmentStatus: employmentStatusVal || "دائم",
          jobTitle: jobTitleVal || "معلم",
          teachingField: teachingFieldVal || specialtyVal || undefined,
          specialty: specialtyVal || undefined,
          totalAbsences: 0,
          name: fullNameVal,
          jobNumber: usernameVal,
        });
      }

      if (parsedTeachers.length === 0) {
        showAlert(
          "warning",
          "لا توجد بيانات صالحة للاستيراد",
          "تأكدي من توفر قيم صحيحة لكل من (اسم المستخدم) و (الاسم الرباعي) في صفوف البيانات."
        );
        setIsLoading(false);
        return;
      }

      // Append/Upsert to global state
      const { addedCount, updatedCount } = addTeachers(parsedTeachers);

      let msg = `تمت معالجة ${parsedTeachers.length} سجل بنجاح: (إضافة ${addedCount} معلمة جديدة، وتحديث بيانات ${updatedCount} معلمة مسجلة مسبقاً).`;
      if (skippedCount > 0) {
        msg += ` [تم تخطي ${skippedCount} صفوف غير مكتملة البيانات]`;
      }

      showAlert("success", "اكتمل استيراد بيانات الكادر بنجاح!", msg);
    } catch (err: unknown) {
      console.error("خطأ أثناء معالجة ملف الإكسل:", err);
      showAlert(
        "error",
        "تعذر قراءة ملف الإكسل!",
        err instanceof Error
          ? err.message
          : "الملف قد يكون تالفاً أو محمياً بكلمة مرور. يرجى التحقق وإعادة المحاولة."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Generate and download 7-column real school sample template
  const handleDownloadSampleTemplate = () => {
    const sampleData = [
      {
        "اسم المستخدم": "1048291",
        "الاسم الرباعي": "سارة عبد الله سالم العتيبي",
        الجوال: "0501234567",
        "حالة التوظيف": "دائم",
        "المسمى الوظيفي": "معلم",
        "مجال التدريس": "لغة عربية",
        التخصص: "اللغة العربية وآدابها",
      },
      {
        "اسم المستخدم": "1048292",
        "الاسم الرباعي": "ريم خالد فهد القحطاني",
        الجوال: "0559876543",
        "حالة التوظيف": "عقد",
        "المسمى الوظيفي": "معلم",
        "مجال التدريس": "رياضيات",
        التخصص: "رياضيات بحتة",
      },
      {
        "اسم المستخدم": "1048293",
        "الاسم الرباعي": "فاطمة محمد علي الغامدي",
        الجوال: "0543210987",
        "حالة التوظيف": "دائم",
        "المسمى الوظيفي": "معلم ممارس",
        "مجال التدريس": "علوم طبيعية",
        التخصص: "فيزياء",
      },
      {
        "اسم المستخدم": "1048294",
        "الاسم الرباعي": "نورة مسفر حمد الدوسري",
        الجوال: "0567890123",
        "حالة التوظيف": "دائم",
        "المسمى الوظيفي": "معلم",
        "مجال التدريس": "علوم شرعية",
        التخصص: "دراسات إسلامية",
      },
      {
        "اسم المستخدم": "1048295",
        "الاسم الرباعي": "هند عبد الرحمن ظافر الشهري",
        الجوال: "0534567890",
        "حالة التوظيف": "عقد",
        "المسمى الوظيفي": "معلم",
        "مجال التدريس": "لغة إنجليزية",
        التخصص: "لغويات إنجليزية",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "منسوبات ث5");

    // Set practical column widths
    worksheet["!cols"] = [
      { wch: 16 }, // اسم المستخدم
      { wch: 30 }, // الاسم الرباعي
      { wch: 16 }, // الجوال
      { wch: 14 }, // حالة التوظيف
      { wch: 16 }, // المسمى الوظيفي
      { wch: 18 }, // مجال التدريس
      { wch: 24 }, // التخصص
    ];

    XLSX.writeFile(workbook, "نموذج_استيراد_منسوبات_ث5.xlsx");
  };

  return (
    <div className="space-y-3">
      {/* Hidden File Input with Accessible Label */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".xlsx, .xls"
        className="hidden"
        aria-label="اختيار ملف إكسل منسوبات ث5 لاستيراد بيانات المعلمات"
      />

      {/* Action Buttons & Drag Drop Target */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-wrap items-center gap-3 p-2 rounded-2xl transition-all duration-200 ${
          isDragging
            ? "bg-teal-50/80 border-2 border-dashed border-[#137a85] scale-[1.01]"
            : "border border-transparent"
        }`}
      >
        {/* Main Import Button */}
        <button
          type="button"
          onClick={handleButtonClick}
          disabled={isLoading}
          aria-busy={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm bg-[#137a85] text-white hover:bg-teal-700 active:scale-[0.98] shadow-sm hover:shadow transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85] focus-visible:ring-offset-2"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <UploadCloud className="w-4 h-4 md:w-5 md:h-5 text-teal-100" aria-hidden="true" />
          )}
          <span>{isLoading ? "جاري استيراد وتحديث البيانات..." : "استيراد Excel (منسوبات ث5)"}</span>
        </button>

        {/* Download Sample Template Helper Button */}
        <button
          type="button"
          onClick={handleDownloadSampleTemplate}
          className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-xs bg-white text-slate-700 hover:bg-slate-50 active:scale-[0.98] border border-slate-200 transition-all shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
          title="تحميل نموذج إكسل ث5 بـ 7 أعمدة معتمدة"
        >
          <Download className="w-4 h-4 text-slate-500" aria-hidden="true" />
          <span>تحميل نموذج إكسل المعتمد (7 أعمدة)</span>
        </button>

        {isDragging && (
          <span className="text-xs font-bold text-[#137a85] animate-pulse">
            أفلتي ملف الإكسل هنا للبدء بالاستيراد والمطابقة
          </span>
        )}
      </div>

      {/* Accessible Toast Notification Feedback */}
      {alertInfo && (
        <div
          role="alert"
          aria-live="polite"
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs md:text-sm animate-in fade-in slide-in-from-top-2 duration-200 shadow-xs ${
            alertInfo.type === "success"
              ? "bg-emerald-50/95 border-emerald-300 text-emerald-950"
              : alertInfo.type === "error"
              ? "bg-rose-50/95 border-rose-300 text-rose-950"
              : "bg-amber-50/95 border-amber-300 text-amber-950"
          }`}
        >
          <div className="flex items-start gap-3">
            {alertInfo.type === "success" && (
              <CheckCircle2
                className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5"
                aria-hidden="true"
              />
            )}
            {alertInfo.type === "error" && (
              <AlertCircle
                className="w-5 h-5 text-rose-600 shrink-0 mt-0.5"
                aria-hidden="true"
              />
            )}
            {alertInfo.type === "warning" && (
              <FileSpreadsheet
                className="w-5 h-5 text-amber-600 shrink-0 mt-0.5"
                aria-hidden="true"
              />
            )}
            <div className="space-y-0.5">
              <p className="font-bold leading-tight">{alertInfo.message}</p>
              {alertInfo.subMessage && (
                <p className="text-xs opacity-90 leading-relaxed">
                  {alertInfo.subMessage}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAlertInfo(null)}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
            aria-label="إغلاق التنبيه"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
};
