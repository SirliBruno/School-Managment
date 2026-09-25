"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Download,
  X,
  Loader2,
  RotateCcw,
  Eye,
  Info,
  UserPlus,
  RefreshCw,
  ArchiveRestore,
  ShieldAlert,
  FileDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTeachers } from "@/context/TeacherContext";
import {
  TeacherImportPlan,
  TeacherImportResult,
  SkippedRowDetail,
  ExcelTeacherRow,
} from "@/types/teacher";
import {
  parseExcelData,
  downloadEmptyExcelTemplate,
  downloadSampleExcelTemplate,
} from "@/lib/excelParser";

export const ExcelImporter: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const undoCountdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { planImport, executeImportPlan, undoLastImport, canUndoImport } =
    useTeachers();

  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Preview Modal State (Stage 6)
  const [previewPlan, setPreviewPlan] = useState<TeacherImportPlan | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewActiveTab, setPreviewActiveTab] = useState<
    "new" | "updated" | "restored" | "skipped"
  >("new");

  // Summary Result Modal / Toast State (Stage 3 & 5)
  const [importResult, setImportResult] = useState<TeacherImportResult | null>(
    null
  );
  const [showResultModal, setShowResultModal] = useState(false);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(10);

  // General Notification Alert
  const [alertInfo, setAlertInfo] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
    subMessage?: string;
  } | null>(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (undoCountdownTimerRef.current)
        clearInterval(undoCountdownTimerRef.current);
    };
  }, []);

  // Manage 10-second countdown for Undo button
  useEffect(() => {
    if (canUndoImport && undoSecondsLeft > 0) {
      undoCountdownTimerRef.current = setInterval(() => {
        setUndoSecondsLeft((prev) => {
          if (prev <= 1) {
            if (undoCountdownTimerRef.current)
              clearInterval(undoCountdownTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (undoCountdownTimerRef.current)
        clearInterval(undoCountdownTimerRef.current);
    }

    return () => {
      if (undoCountdownTimerRef.current)
        clearInterval(undoCountdownTimerRef.current);
    };
  }, [canUndoImport, undoSecondsLeft]);

  const showAlert = useCallback(
    (
      type: "success" | "error" | "warning" | "info",
      message: string,
      subMessage?: string
    ) => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      setAlertInfo({ type, message, subMessage });

      if (type === "success") {
        toastTimeoutRef.current = setTimeout(() => {
          setAlertInfo(null);
        }, 8000);
      }
    },
    []
  );

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  // Step 1: Parse file and generate Preview Plan
  const processFile = async (file: File) => {
    setIsLoading(true);
    setAlertInfo(null);
    setImportResult(null);

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
      const buffer = await file.arrayBuffer();
      const rawRows = parseExcelData(buffer);

      if (rawRows.length === 0) {
        showAlert(
          "warning",
          "ورقة العمل المحددة فارغة!",
          "لم يتم العثور على أي صفوف أو بيانات داخل ملف الإكسل المرفوع."
        );
        setIsLoading(false);
        return;
      }

      // Compute dry-run plan
      const plan = planImport(rawRows);

      if (
        plan.newTeachers.length === 0 &&
        plan.updatedTeachers.length === 0 &&
        plan.restoredTeachers.length === 0 &&
        plan.skippedRows.length === plan.totalRows
      ) {
        // All rows were invalid or skipped
        setPreviewPlan(plan);
        setPreviewActiveTab("skipped");
        setIsPreviewOpen(true);
        showAlert(
          "warning",
          "جميع صفوف الملف تحتوي على أخطاء!",
          "تم فحص الصفوف وتبين وجود أخطاء تمنع استيرادها. يمكنك معاينة أسباب الاستبعاد أدناه."
        );
        return;
      }

      // Set default active tab
      if (plan.newTeachers.length > 0) {
        setPreviewActiveTab("new");
      } else if (plan.updatedTeachers.length > 0) {
        setPreviewActiveTab("updated");
      } else if (plan.restoredTeachers.length > 0) {
        setPreviewActiveTab("restored");
      } else {
        setPreviewActiveTab("skipped");
      }

      setPreviewPlan(plan);
      setIsPreviewOpen(true);
    } catch (err: unknown) {
      console.error("خطأ أثناء قراءة ملف الإكسل:", err);
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

  // Step 2: Confirm and execute import (Stage 3, 5, 6)
  const handleConfirmImport = () => {
    if (!previewPlan) return;

    setIsLoading(true);
    setIsPreviewOpen(false);

    try {
      const result = executeImportPlan(previewPlan);
      setImportResult(result);
      setUndoSecondsLeft(10);
      setShowResultModal(true);

      showAlert(
        "success",
        "اكتملت عملية الاستيراد بنجاح! 🚀",
        `تمت معالجة ${result.totalProcessed} سجل (إضافة ${result.addedCount} جديدة، وتحديث ${result.updatedCount} سجل، واستعادة ${result.restoredCount} من الأرشيف).`
      );
    } catch (err: unknown) {
      console.error("خطأ أثناء تنفيذ الاستيراد:", err);
      showAlert(
        "error",
        "حدث خطأ أثناء حفظ البيانات!",
        err instanceof Error ? err.message : "يرجى المحاولة مرة أخرى."
      );
    } finally {
      setIsLoading(false);
      setPreviewPlan(null);
    }
  };

  // Step 3: Undo Last Import (Stage 5)
  const handleUndo = () => {
    const res = undoLastImport();
    if (res.success) {
      setShowResultModal(false);
      setImportResult(null);
      showAlert("info", "تم التراجع عن الاستيراد ↩️", res.message);
    } else {
      showAlert("warning", "تعذر التراجع!", res.message);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

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

  return (
    <div className="space-y-4">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".xlsx, .xls"
        className="hidden"
        aria-label="اختيار ملف Excel لاستيراد بيانات المعلمات"
      />

      {/* Main Buttons Toolbar & Drop Target */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-wrap items-center gap-3 p-2.5 rounded-2xl transition-all duration-200 ${
          isDragging
            ? "bg-teal-50/90 border-2 border-dashed border-[#137a85] scale-[1.01]"
            : "border border-transparent"
        }`}
      >
        {/* Main Import Button (Stage 2 & 5) */}
        <button
          type="button"
          onClick={handleButtonClick}
          disabled={isLoading}
          aria-busy={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm bg-[#137a85] text-white hover:bg-teal-700 active:scale-[0.98] shadow-sm hover:shadow transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#137a85] focus-visible:ring-offset-2"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <UploadCloud className="w-4 h-4 md:w-5 md:h-5 text-teal-100" aria-hidden="true" />
          )}
          <span>{isLoading ? "جاري قراءة الملف..." : "استيراد المعلمات من Excel"}</span>
        </button>

        {/* Download Empty Template Button (Stage 4 - Required) */}
        <button
          type="button"
          onClick={() => downloadEmptyExcelTemplate()}
          className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-xs bg-white text-slate-700 hover:bg-teal-50/50 hover:text-[#137a85] hover:border-teal-300 active:scale-[0.98] border border-slate-200 transition-all shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-1"
          title="تحميل قالب فارغ يحتوي على الأعمدة الثمانية المعتمدة"
        >
          <FileDown className="w-4 h-4 text-[#137a85]" aria-hidden="true" />
          <span>تحميل القالب الفارغ</span>
        </button>

        {/* Download Sample Template Helper Button */}
        <button
          type="button"
          onClick={() => downloadSampleExcelTemplate()}
          className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-xs bg-slate-50 text-slate-600 hover:bg-slate-100 active:scale-[0.98] border border-slate-200/80 transition-all shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
          title="تحميل نموذج معبأ ببيانات تجريبية للاسترشاد"
        >
          <Download className="w-4 h-4 text-slate-500" aria-hidden="true" />
          <span>تحميل نموذج معبأ بأمثلة</span>
        </button>

        {/* Quick Undo Indicator Banner (Stage 5) */}
        {canUndoImport && undoSecondsLeft > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold shadow-2xs animate-pulse"
          >
            <span>التراجع متاح ({undoSecondsLeft} ث):</span>
            <button
              type="button"
              onClick={handleUndo}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
            >
              تراجع الآن ↩
            </button>
          </motion.div>
        )}

        {isDragging && (
          <span className="text-xs font-bold text-[#137a85] animate-pulse">
            أفلتي ملف الإكسل هنا لبدء الفحص والمطابقة
          </span>
        )}
      </div>

      {/* Alert Feedback Toast */}
      {alertInfo && (
        <div
          role="alert"
          aria-live="polite"
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs md:text-sm animate-in fade-in slide-in-from-top-2 duration-200 shadow-xs ${
            alertInfo.type === "success"
              ? "bg-emerald-50/95 border-emerald-300 text-emerald-950"
              : alertInfo.type === "error"
              ? "bg-rose-50/95 border-rose-300 text-rose-950"
              : alertInfo.type === "warning"
              ? "bg-amber-50/95 border-amber-300 text-amber-950"
              : "bg-blue-50/95 border-blue-300 text-blue-950"
          }`}
        >
          <div className="flex items-start gap-3">
            {alertInfo.type === "success" && (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            {alertInfo.type === "error" && (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            {alertInfo.type === "warning" && (
              <FileSpreadsheet className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            {alertInfo.type === "info" && (
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <div className="space-y-0.5">
              <p className="font-bold leading-tight">{alertInfo.message}</p>
              {alertInfo.subMessage && (
                <p className="text-xs opacity-90 leading-relaxed">{alertInfo.subMessage}</p>
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

      {/* ========================================================================= */}
      {/* STAGE 6: PREVIEW MODAL BEFORE IMPORT                                      */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isPreviewOpen && previewPlan && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
              onClick={() => setIsPreviewOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden z-10"
            >
              {/* Modal Header */}
              <div className="p-5 md:p-6 border-b border-slate-100 bg-slate-50 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#137a85] flex items-center justify-center font-bold shadow-2xs">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 id="preview-modal-title" className="text-base md:text-lg font-bold text-slate-900">
                      معاينة وتدقيق ملف الاستيراد قبل التطبيق
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      تم فحص {previewPlan.totalRows} صف في الملف وتصنيفها وفقاً لقواعد البيانات
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                  aria-label="إغلاق المعاينة"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* KPI Summary Cards */}
              <div className="p-5 md:p-6 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 1. New Teachers */}
                <button
                  type="button"
                  onClick={() => setPreviewActiveTab("new")}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                    previewActiveTab === "new"
                      ? "bg-teal-50/80 border-[#137a85] ring-2 ring-[#137a85]/20 shadow-xs"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                    <span>معلمات جديدات</span>
                    <UserPlus className="w-4 h-4 text-[#137a85]" />
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900 font-mono">
                    {previewPlan.newTeachers.length} 🆕
                  </p>
                </button>

                {/* 2. Updated Teachers */}
                <button
                  type="button"
                  onClick={() => setPreviewActiveTab("updated")}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                    previewActiveTab === "updated"
                      ? "bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                    <span>تحديث بيانات</span>
                    <RefreshCw className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-blue-700 font-mono">
                    {previewPlan.updatedTeachers.length} 🔄
                  </p>
                </button>

                {/* 3. Restored from Archive */}
                <button
                  type="button"
                  onClick={() => setPreviewActiveTab("restored")}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                    previewActiveTab === "restored"
                      ? "bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20 shadow-xs"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                    <span>استعادة من الأرشيف</span>
                    <ArchiveRestore className="w-4 h-4 text-purple-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-purple-700 font-mono">
                    {previewPlan.restoredTeachers.length} ♻️
                  </p>
                </button>

                {/* 4. Skipped / Rejected */}
                <button
                  type="button"
                  onClick={() => setPreviewActiveTab("skipped")}
                  className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                    previewActiveTab === "skipped"
                      ? "bg-rose-50/80 border-rose-500 ring-2 ring-rose-500/20 shadow-xs"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                    <span>صفوف مستبعدة</span>
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                  </div>
                  <p className="text-2xl font-extrabold text-rose-700 font-mono">
                    {previewPlan.skippedRows.length} ⚠️
                  </p>
                </button>
              </div>

              {/* Preview Rows Table (Shows First 5 rows of selected category) */}
              <div className="p-5 md:p-6 overflow-y-auto max-h-[350px] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs md:text-sm text-slate-800">
                    {previewActiveTab === "new" &&
                      `قائمة المعلمات الجديدات (عرض أول 5 من ${previewPlan.newTeachers.length})`}
                    {previewActiveTab === "updated" &&
                      `قائمة السجلات التي سيتم استكمال بياناتها (عرض أول 5 من ${previewPlan.updatedTeachers.length})`}
                    {previewActiveTab === "restored" &&
                      `قائمة المعلمات المستعادة من الأرشيف (عرض أول 5 من ${previewPlan.restoredTeachers.length})`}
                    {previewActiveTab === "skipped" &&
                      `قائمة الصفوف المستبعدة وأسباب الرفض (${previewPlan.skippedRows.length} صف)`}
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    {previewActiveTab === "updated" && "تحديث الفراغات فقط دون استبدال البيانات الحالية"}
                  </span>
                </div>

                {/* TAB 1: NEW TEACHERS */}
                {previewActiveTab === "new" && (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">اسم المعلمة</th>
                          <th className="py-2.5 px-3">رقم الهوية</th>
                          <th className="py-2.5 px-3">التخصص</th>
                          <th className="py-2.5 px-3">الجوال</th>
                          <th className="py-2.5 px-3">حالة التوظيف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewPlan.newTeachers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-slate-400">
                              لا توجد معلمات جديدات في هذا الملف
                            </td>
                          </tr>
                        ) : (
                          previewPlan.newTeachers.slice(0, 5).map((t, idx) => (
                            <tr key={t.id || idx} className="hover:bg-slate-50/60">
                              <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-2 px-3 font-bold text-slate-900">{t.fullName}</td>
                              <td className="py-2 px-3 font-mono text-slate-600">{t.nationalId}</td>
                              <td className="py-2 px-3 text-slate-700">{t.specialty || "—"}</td>
                              <td className="py-2 px-3 font-mono text-slate-600 dir-ltr text-right">
                                {t.mobile || "—"}
                              </td>
                              <td className="py-2 px-3">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {t.employmentStatus || "دائم"}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* TAB 2: UPDATED TEACHERS */}
                {previewActiveTab === "updated" && (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">اسم المعلمة</th>
                          <th className="py-2.5 px-3">رقم الهوية</th>
                          <th className="py-2.5 px-3">الحقول التي سيتم ملؤها 🔄</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewPlan.updatedTeachers.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-400">
                              لا توجد سجلات تحتاج لتحديث الفراغات
                            </td>
                          </tr>
                        ) : (
                          previewPlan.updatedTeachers.slice(0, 5).map((u, idx) => (
                            <tr key={u.teacher.id || idx} className="hover:bg-slate-50/60">
                              <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-2 px-3 font-bold text-slate-900">{u.teacher.fullName}</td>
                              <td className="py-2 px-3 font-mono text-slate-600">{u.teacher.nationalId}</td>
                              <td className="py-2 px-3">
                                <div className="flex flex-wrap gap-1">
                                  {u.filledFields.map((f) => (
                                    <span
                                      key={f}
                                      className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200"
                                    >
                                      + {f}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* TAB 3: RESTORED TEACHERS */}
                {previewActiveTab === "restored" && (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">اسم المعلمة</th>
                          <th className="py-2.5 px-3">رقم الهوية</th>
                          <th className="py-2.5 px-3">الإجراء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewPlan.restoredTeachers.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-400">
                              لا توجد معلمات مسترجعة من الأرشيف
                            </td>
                          </tr>
                        ) : (
                          previewPlan.restoredTeachers.slice(0, 5).map((r, idx) => (
                            <tr key={r.teacher.id || idx} className="hover:bg-slate-50/60">
                              <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                              <td className="py-2 px-3 font-bold text-slate-900">{r.teacher.fullName}</td>
                              <td className="py-2 px-3 font-mono text-slate-600">{r.teacher.nationalId}</td>
                              <td className="py-2 px-3">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  استعادة من الأرشيف وتفعيل السجل
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* TAB 4: SKIPPED ROWS WITH EXACT REASONS (Stage 3 & 6) */}
                {previewActiveTab === "skipped" && (
                  <div className="overflow-x-auto border border-rose-200 rounded-xl bg-rose-50/20">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-rose-50 text-rose-900 font-bold border-b border-rose-200">
                        <tr>
                          <th className="py-2.5 px-3">رقم الصف</th>
                          <th className="py-2.5 px-3">الاسم (إن وجد)</th>
                          <th className="py-2.5 px-3">رقم الهوية</th>
                          <th className="py-2.5 px-3">سبب الاستبعاد ⚠️</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100">
                        {previewPlan.skippedRows.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-emerald-600 font-bold">
                              ✓ ملف سليم تماماً! لم يتم استبعاد أي صف.
                            </td>
                          </tr>
                        ) : (
                          previewPlan.skippedRows.map((s, idx) => (
                            <tr key={idx} className="hover:bg-rose-50/50">
                              <td className="py-2 px-3 font-mono font-bold text-rose-700">
                                صف {s.rowNumber}
                              </td>
                              <td className="py-2 px-3 text-slate-800">{s.fullName || "—"}</td>
                              <td className="py-2 px-3 font-mono text-slate-600">{s.nationalId || "—"}</td>
                              <td className="py-2 px-3 font-bold text-rose-700">{s.reason}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Preview Footer Actions */}
              <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  إلغاء العملية
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={
                      previewPlan.newTeachers.length === 0 &&
                      previewPlan.updatedTeachers.length === 0 &&
                      previewPlan.restoredTeachers.length === 0
                    }
                    className="px-6 py-2.5 rounded-xl font-bold text-xs md:text-sm bg-[#137a85] text-white hover:bg-teal-700 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    تأكيد وحفظ الاستيراد ✓
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* STAGE 3: POST-IMPORT RESULT SUMMARY MODAL                                */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showResultModal && importResult && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="summary-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
              onClick={() => setShowResultModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden z-10"
            >
              <div className="p-5 md:p-6 border-b border-slate-100 bg-emerald-50 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-2xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 id="summary-modal-title" className="text-base md:text-lg font-bold text-emerald-950">
                      ملخص نتيجة استيراد المعلمات
                    </h3>
                    <p className="text-xs text-emerald-800/80 mt-0.5">
                      تم تحديث قاعدة بيانات المدرسة بنجاح دون أي تكرار
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowResultModal(false)}
                  className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Statistics Grid */}
              <div className="p-5 md:p-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-center">
                  <p className="text-[11px] font-bold text-teal-800">معلمات جديدات</p>
                  <p className="text-2xl font-black text-teal-900 font-mono mt-1">
                    {importResult.addedCount} 🆕
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-center">
                  <p className="text-[11px] font-bold text-blue-800">سجلات تم تحديثها</p>
                  <p className="text-2xl font-black text-blue-900 font-mono mt-1">
                    {importResult.updatedCount} 🔄
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-center">
                  <p className="text-[11px] font-bold text-purple-800">استعادة من الأرشيف</p>
                  <p className="text-2xl font-black text-purple-900 font-mono mt-1">
                    {importResult.restoredCount} ♻️
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-center">
                  <p className="text-[11px] font-bold text-rose-800">صفوف تم تجاهلها</p>
                  <p className="text-2xl font-black text-rose-900 font-mono mt-1">
                    {importResult.skippedCount} ⚠️
                  </p>
                </div>
              </div>

              {/* Skipped Rows List (If any exist) */}
              {importResult.skippedRows.length > 0 && (
                <div className="px-5 md:px-6 pb-4 space-y-2 overflow-y-auto max-h-[200px]">
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>الصفوف التي تم تجاهلها وسبب التجاهل:</span>
                  </p>
                  <div className="space-y-1.5">
                    {importResult.skippedRows.map((s, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-500">صف {s.rowNumber}:</span>
                          <span className="font-semibold text-slate-800">
                            {s.fullName || s.nationalId || "صف ناقص"}
                          </span>
                        </div>
                        <span className="text-rose-700 font-medium">{s.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Footer with Undo Button (Stage 5) */}
              <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                {canUndoImport && undoSecondsLeft > 0 ? (
                  <button
                    type="button"
                    onClick={handleUndo}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-all shadow-2xs cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>تراجع عن الاستيراد ({undoSecondsLeft} ث)</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400">انتهت مهلة التراجع التلقائي</span>
                )}

                <button
                  type="button"
                  onClick={() => setShowResultModal(false)}
                  className="px-6 py-2.5 rounded-xl bg-slate-800 text-white text-xs md:text-sm font-bold hover:bg-slate-900 transition-all cursor-pointer"
                >
                  إغلاق الملخص
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
