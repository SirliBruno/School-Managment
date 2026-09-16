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

      // Auto dismiss success messages after 6 seconds
      if (type === "success") {
        timeoutRef.current = setTimeout(() => {
          setAlertInfo(null);
        }, 6000);
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

  // Helper to normalize header names
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

      // Parse JSON
      const rawRows: ExcelTeacherRow[] = XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
        raw: false, // Ensure strings for formatted numbers like job IDs
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

      const hasName = normalizedKeys.some(
        (k) =>
          k.includes("الاسم") ||
          k.includes("اسم المعلمة") ||
          k.toLowerCase().includes("name")
      );
      const hasJob = normalizedKeys.some(
        (k) =>
          k.includes("الوظيفة") ||
          k.includes("الوظيفي") ||
          k.includes("السجل") ||
          k.includes("الهوية") ||
          k.toLowerCase().includes("job")
      );
      const hasSpecialty = normalizedKeys.some(
        (k) =>
          k.includes("التخصص") ||
          k.includes("تخصص") ||
          k.toLowerCase().includes("specialty")
      );

      // Report missing headers specifically
      const missingHeaders: string[] = [];
      if (!hasName) missingHeaders.push("الاسم");
      if (!hasJob) missingHeaders.push("رقم الوظيفة");
      if (!hasSpecialty) missingHeaders.push("التخصص");

      if (missingHeaders.length > 0) {
        showAlert(
          "error",
          "أعمدة مفقودة في ملف الإكسل!",
          `الأعمدة التالية غير متوفرة في الصف الأول: (${missingHeaders.join(
            " ، "
          )}). يرجى مطابقة النموذج التجريبي المعتمد.`
        );
        setIsLoading(false);
        return;
      }

      // Parse records safely
      const parsedTeachers: Teacher[] = [];

      for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];

        let nameVal = "";
        let jobVal = "";
        let specialtyVal = "";

        for (const [key, val] of Object.entries(row)) {
          const normKey = normalizeHeader(key);
          const stringVal = String(val ?? "").trim();

          if (
            !nameVal &&
            (normKey.includes("الاسم") ||
              normKey.includes("اسم المعلمة") ||
              normKey.toLowerCase().includes("name"))
          ) {
            nameVal = stringVal;
          } else if (
            !jobVal &&
            (normKey.includes("الوظيفة") ||
              normKey.includes("الوظيفي") ||
              normKey.includes("السجل") ||
              normKey.includes("الهوية") ||
              normKey.toLowerCase().includes("job"))
          ) {
            jobVal = stringVal;
          } else if (
            !specialtyVal &&
            (normKey.includes("التخصص") ||
              normKey.includes("تخصص") ||
              normKey.toLowerCase().includes("specialty"))
          ) {
            specialtyVal = stringVal;
          }
        }

        // Skip completely empty rows
        if (!nameVal && !jobVal) continue;

        parsedTeachers.push({
          id:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `tch-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
          name: nameVal || "معلمة بدون اسم",
          jobNumber: jobVal || `T-${1000 + i}`,
          specialty: specialtyVal || "عام",
          totalAbsences: 0,
        });
      }

      if (parsedTeachers.length === 0) {
        showAlert(
          "warning",
          "لا توجد بيانات صالحة للاستيراد",
          "تأكدي من إدخال أسماء المعلمات وأرقامهن الوظيفية تحت الأعمدة المحددة."
        );
        setIsLoading(false);
        return;
      }

      // Append to global state
      const { addedCount, duplicateCount } = addTeachers(parsedTeachers);

      let msg = `تم استيراد ${addedCount} معلمة بنجاح وحفظ السجلات في النظام.`;
      if (duplicateCount > 0) {
        msg += ` (تم استبعاد ${duplicateCount} سجل لتكرار رقم الوظيفة المسجل مسبقاً)`;
      }

      showAlert("success", "اكتمل الاستيراد بنجاح!", msg);
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

  // Generate and download sample template
  const handleDownloadSampleTemplate = () => {
    const sampleData = [
      {
        الاسم: "سارة عبد الله العتيبي",
        "رقم الوظيفة": "1048291",
        التخصص: "اللغة العربية",
      },
      {
        الاسم: "ريم خالد القحطاني",
        "رقم الوظيفة": "1048292",
        التخصص: "الرياضيات",
      },
      {
        الاسم: "فاطمة محمد الغامدي",
        "رقم الوظيفة": "1048293",
        التخصص: "العلوم العامة",
      },
      {
        الاسم: "نورة مسفر الدوسري",
        "رقم الوظيفة": "1048294",
        التخصص: "الدراسات الإسلامية",
      },
      {
        الاسم: "هند عبد الرحمن الشهري",
        "رقم الوظيفة": "1048295",
        التخصص: "اللغة الإنجليزية",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "المعلمات");
    worksheet["!cols"] = [{ wch: 26 }, { wch: 18 }, { wch: 22 }];

    XLSX.writeFile(workbook, "نموذج_استيراد_المعلمات.xlsx");
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
        aria-label="اختيار ملف إكسل لاستيراد بيانات المعلمات"
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
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-[#137a85] text-white hover:bg-teal-700 active:scale-[0.98] shadow-sm hover:shadow transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85] focus-visible:ring-offset-2"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <UploadCloud className="w-5 h-5 text-teal-100" aria-hidden="true" />
          )}
          <span>{isLoading ? "جاري معالجة الملف..." : "استيراد المعلمات من Excel"}</span>
        </button>

        {/* Download Sample Template Helper Button */}
        <button
          type="button"
          onClick={handleDownloadSampleTemplate}
          className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-xs bg-white text-slate-700 hover:bg-slate-50 active:scale-[0.98] border border-slate-200 transition-all shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
          title="تحميل ملف إكسل تجريبي بالأعمدة المطلوبة لتجربة الاستيراد فوراً"
        >
          <Download className="w-4 h-4 text-slate-500" aria-hidden="true" />
          <span>تحميل نموذج إكسل تجريبي</span>
        </button>

        {isDragging && (
          <span className="text-xs font-bold text-[#137a85] animate-pulse">
            أفلتي ملف الإكسل هنا للبدء بالاستيراد
          </span>
        )}
      </div>

      {/* Accessible Toast Notification Feedback */}
      {alertInfo && (
        <div
          role="alert"
          aria-live="polite"
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-sm animate-in fade-in slide-in-from-top-2 duration-200 shadow-xs ${
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
              <p className="font-bold text-sm leading-tight">{alertInfo.message}</p>
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
