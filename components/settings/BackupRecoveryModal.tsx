"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  Database,
  Cloud,
  X,
  FileText,
  Clock,
  Layers,
  History,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import {
  createDatabaseBackupSnapshot,
  exportBackupToFile,
  validateBackupSnapshot,
  SystemBackupSnapshot,
} from "@/lib/backupRecovery";

interface BackupRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupRecoveryModal: React.FC<BackupRecoveryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    teachers,
    absenceRecords,
    delayNotices,
    inquiries,
    deductionDecisions,
    permissions,
    archivedTeachers,
    archivedAbsences,
    archivedDelayNotices,
    archivedDeductionDecisions,
    archivedPermissions,
    isCloudConnected,
    restoreFullSystemSnapshot,
  } = useTeachers();

  const [activeTab, setActiveTab] = useState<"export" | "restore">("export");
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  // Restore states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validatedSnapshot, setValidatedSnapshot] = useState<SystemBackupSnapshot | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle Exporting Backup Snapshot
  const handleExportBackup = () => {
    setIsExporting(true);
    setExportSuccessMessage(null);
    try {
      const snapshot = createDatabaseBackupSnapshot({
        teachers,
        absenceRecords,
        delayNotices,
        inquiries,
        deductionDecisions,
        permissions,
        archivedTeachers,
        archivedAbsences,
        archivedDelayNotices,
        archivedDeductionDecisions,
        archivedPermissions,
      });

      exportBackupToFile(snapshot);
      setExportSuccessMessage(
        `تم تصدير النسخة الاحتياطية الموقعة بنجاح! التوقيع الرقمي: [${snapshot.metadata.checksum.slice(0, 16)}...]`
      );
    } catch (err) {
      console.error("فشل تصدير النسخة الاحتياطية:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle File Selection for Restore
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setValidatedSnapshot(null);
    setValidationError(null);
    setRestoreResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const result = validateBackupSnapshot(parsed);

        if (!result.valid || !result.snapshot) {
          setValidationError(
            result.error || "الملف لا يطابق البنية البرمجية الصارمة للنسخ الاحتياطية."
          );
        } else {
          setValidatedSnapshot(result.snapshot);
        }
      } catch (err) {
        setValidationError(
          "تعذر قراءة أو فك تشفير الملف. تأكد من تحديد ملف JSON سليم."
        );
      }
    };
    reader.onerror = () => {
      setValidationError("فشل قراءة الملف من الجهاز.");
    };
    reader.readAsText(file);
  };

  // Handle Executing Restoration
  const handleExecuteRestore = async () => {
    if (!validatedSnapshot) return;
    setIsRestoring(true);
    setRestoreResult(null);

    try {
      const res = await restoreFullSystemSnapshot(validatedSnapshot.data);
      setRestoreResult(res);
      if (res.success) {
        setSelectedFile(null);
        setValidatedSnapshot(null);
      }
    } catch (err) {
      setRestoreResult({
        success: false,
        message: err instanceof Error ? err.message : "فشلت عملية الاستعادة.",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-[#137a85] dark:text-teal-400 flex items-center justify-center border border-teal-200/60 dark:border-teal-800/60">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                النسخ الاحتياطي والاستعادة بعد الكوارث
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                تصدير لقطات النظام الموقعة رقمياً والتحقق من الاستعادة السحابية
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 pt-3 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("export")}
            className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === "export"
                ? "border-teal-600 text-teal-700 dark:text-teal-400"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Download className="w-4 h-4" />
            <span>تصدير نسخة احتياطية (Export)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("restore")}
            className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === "restore"
                ? "border-teal-600 text-teal-700 dark:text-teal-400"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>استعادة وتحقق سحابي (Disaster Recovery)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Cloud Status Card */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
            <div className="flex items-center gap-2.5">
              <Cloud
                className={`w-4 h-4 ${
                  isCloudConnected ? "text-emerald-600" : "text-amber-500"
                }`}
              />
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                حالة الاتصال السحابي:
              </span>
              <span
                className={`font-bold ${
                  isCloudConnected ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                {isCloudConnected ? "متصل بسحابة Supabase ✓" : "وضع التخزين المحلي الآمن"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>تشفير FNV-1a التكاملي مفعّل</span>
            </div>
          </div>

          {activeTab === "export" ? (
            /* EXPORT TAB */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40 text-xs text-teal-900 dark:text-teal-200 leading-relaxed space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-teal-800 dark:text-teal-300">
                  <FileCheck className="w-4 h-4" />
                  <span>تصدير لقطة متكاملة للنظام:</span>
                </div>
                <p>
                  يتم إنشاء ملف JSON موقّع رقمياً يشمل سجلات المعلمات، الغياب،
                  المساءلات، إشعارات التأخر، قرارات الحسم، الاستئذان، والأرشيف
                  الإداري الكامل.
                </p>
              </div>

              {/* Data Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 block">المعلمات</span>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-100">
                    {teachers.length}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 block">سجلات الغياب</span>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-100">
                    {absenceRecords.length}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 block">إشعارات التأخر</span>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-100">
                    {delayNotices.length}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 block">قرارات الحسم</span>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-100">
                    {deductionDecisions.length}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 block">أذونات الاستئذان</span>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-100">
                    {permissions.length}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 block">عناصر الأرشيف</span>
                  <span className="text-base font-bold text-slate-800 dark:text-slate-100">
                    {archivedTeachers.length +
                      archivedAbsences.length +
                      archivedDelayNotices.length}
                  </span>
                </div>
              </div>

              {exportSuccessMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{exportSuccessMessage}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleExportBackup}
                disabled={isExporting}
                className="w-full py-3 px-4 rounded-xl bg-[#137a85] hover:bg-[#0f626a] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري تجميع وحساب التوقيع الرقمي...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>تنزيل ملف النسخة الاحتياطية (.JSON)</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* RESTORE TAB */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 leading-relaxed space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4" />
                  <span>تحذير الاستعادة بعد الكوارث:</span>
                </div>
                <p>
                  استعادة النسخة الاحتياطية ستقوم باستبدال البيانات الحالية في النظام
                  بالبيانات المحفوظة في ملف النسخة والتحقق من التزامن السحابي.
                </p>
              </div>

              {/* File Uploader */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileSelect}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-teal-500 rounded-2xl p-6 text-center cursor-pointer transition-colors space-y-2 bg-slate-50/50 dark:bg-slate-800/30"
              >
                <Upload className="w-8 h-8 mx-auto text-slate-400 hover:text-teal-600" />
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {selectedFile ? selectedFile.name : "اضغط لاختيار ملف النسخة الاحتياطية (.json)"}
                </div>
                <div className="text-[11px] text-slate-400">
                  يجب أن يكون الملف موقّعاً رقمياً بنظام SHA/Checksum المعتمد
                </div>
              </div>

              {/* Validation Error */}
              {validationError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">فشل التحقق من أمان الملف:</span>
                    <span>{validationError}</span>
                  </div>
                </div>
              )}

              {/* Validated Snapshot Details */}
              {validatedSnapshot && (
                <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-teal-800 dark:text-teal-300">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>تم التحقق من سلامة التوقيع الرقمي بنجاح ✓</span>
                    </span>
                    <span className="font-mono text-[11px] bg-teal-100 dark:bg-teal-900/60 px-2 py-0.5 rounded">
                      {validatedSnapshot.metadata.checksum.slice(0, 16)}...
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                    <div className="bg-white/80 dark:bg-slate-800 p-2 rounded-lg">
                      <span className="text-slate-500 block text-[11px]">تاريخ التصدير:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {validatedSnapshot.metadata.exportedAt}
                      </span>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-800 p-2 rounded-lg">
                      <span className="text-slate-500 block text-[11px]">المعلمات:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {validatedSnapshot.metadata.counts.teachers}
                      </span>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-800 p-2 rounded-lg">
                      <span className="text-slate-500 block text-[11px]">الغياب:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {validatedSnapshot.metadata.counts.absenceRecords}
                      </span>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-800 p-2 rounded-lg">
                      <span className="text-slate-500 block text-[11px]">إشعارات التأخر:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {validatedSnapshot.metadata.counts.delayNotices}
                      </span>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-800 p-2 rounded-lg">
                      <span className="text-slate-500 block text-[11px]">الاستئذان:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {validatedSnapshot.metadata.counts.permissions}
                      </span>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-800 p-2 rounded-lg">
                      <span className="text-slate-500 block text-[11px]">قرارات الحسم:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {validatedSnapshot.metadata.counts.deductionDecisions}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteRestore}
                    disabled={isRestoring}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isRestoring ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري استعادة البيانات والمزامنة السحابية...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>بدء الاستعادة واعتماد البيانات السحابية</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Restore Result Message */}
              {restoreResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    restoreResult.success
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300"
                      : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-800 dark:text-rose-300"
                  }`}
                >
                  {restoreResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{restoreResult.message}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </motion.div>
    </div>
  );
};
