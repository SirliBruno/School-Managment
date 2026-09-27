/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  Upload,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  X,
  FileImage,
  ShieldCheck,
  Eye,
  Info,
} from "lucide-react";
import {
  getSchoolApprovalSettings,
  updateSchoolApprovalSettings,
  resetSchoolApprovalSettings,
  deleteSchoolStamp,
  deletePrincipalSignature,
  SchoolApprovalSettings,
} from "@/lib/stampSignatureManager";
import { useAuth } from "@/context/AuthContext";

interface ApprovalAssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssetsChanged?: () => void;
}

export const ApprovalAssetsModal: React.FC<ApprovalAssetsModalProps> = ({
  isOpen,
  onClose,
  onAssetsChanged,
}) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SchoolApprovalSettings>(getSchoolApprovalSettings());
  const [previewStamp, setPreviewStamp] = useState<string>("");
  const [previewSig, setPreviewSig] = useState<string>("");
  const [stampEnabled, setStampEnabled] = useState<boolean>(true);
  const [signatureEnabled, setSignatureEnabled] = useState<boolean>(true);
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const stampInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const current = getSchoolApprovalSettings();
      setSettings(current);
      setPreviewStamp(current.schoolStampUrl);
      setPreviewSig(current.principalSignatureUrl);
      setStampEnabled(current.stampEnabled);
      setSignatureEnabled(current.signatureEnabled);
      setSuccessMsg("");
      setErrorMsg("");
    }
  }, [isOpen]);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "stamp" | "signature"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 3MB)
    if (file.size > 3 * 1024 * 1024) {
      setErrorMsg("حجم الملف كبير جداً. الحد الأقصى المسموح به هو 3 ميجابايت.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (type === "stamp") {
        setPreviewStamp(base64);
        setStampEnabled(true);
      } else {
        setPreviewSig(base64);
        setSignatureEnabled(true);
      }
      setErrorMsg("");
    };
    reader.onerror = () => {
      setErrorMsg("تعذر قراءة ملف الصورة، يرجى المحاولة بصيغة أخرى.");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    try {
      const adminName = user?.fullName || "أحلام صالح الضبيبي";
      const updated = updateSchoolApprovalSettings(
        {
          schoolStampUrl: previewStamp,
          principalSignatureUrl: previewSig,
          stampEnabled,
          signatureEnabled,
        },
        adminName
      );
      setSettings(updated);
      setSuccessMsg("تم حفظ وتحديث أصول الختم والتوقيع بنجاح.");
      if (onAssetsChanged) {
        onAssetsChanged();
      }
      setTimeout(() => {
        setSuccessMsg("");
        onClose();
      }, 1200);
    } catch {
      setErrorMsg("حدث خطأ أثناء حفظ الإعدادات.");
    }
  };

  const handleResetToDefaults = () => {
    if (window.confirm("هل ترغب في استعادة الختم والتوقيع الأصليين المعتمدين للمدرسة؟")) {
      const adminName = user?.fullName || "أحلام صالح الضبيبي";
      const reset = resetSchoolApprovalSettings(adminName);
      setSettings(reset);
      setPreviewStamp(reset.schoolStampUrl);
      setPreviewSig(reset.principalSignatureUrl);
      setStampEnabled(true);
      setSignatureEnabled(true);
      setSuccessMsg("تمت استعادة الأصول الرسمية الافتراضية بنجاح.");
      if (onAssetsChanged) {
        onAssetsChanged();
      }
    }
  };

  const handleDeleteStamp = () => {
    setPreviewStamp("");
    setStampEnabled(false);
  };

  const handleDeleteSig = () => {
    setPreviewSig("");
    setSignatureEnabled(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-assets-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10 text-right my-8"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-teal-800 to-[#137a85] text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/10 text-white">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 id="approval-assets-title" className="font-bold text-base">
                  بيانات الاعتماد والختم الرسمي
                </h3>
                <p className="text-xs text-teal-100/80">
                  إدارة ختم المدرسة وتوقيع وكيلة المدرسة للتقارير والنماذج المعتمدة
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-teal-100 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Success and Error Alerts */}
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </motion.div>
            )}

            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {/* Information Banner */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3 text-xs text-slate-600 leading-relaxed">
              <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block mb-0.5">ضوابط الاعتماد والختم الآلي:</span>
                تُدرج هذه الأصول تلقائياً في النماذج الرسمية (تقارير الغياب، قرارات الحسم، أذونات الاستئذان، وإشعارات التأخر)، وتُستثنى تماماً من التقارير الإحصائية والعروض الداخلية لحفظ الرسمية.
              </div>
            </div>

            {/* Assets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Section 1: School Stamp */}
              <div className="border border-slate-200 rounded-2xl p-4.5 bg-white shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-teal-700" />
                    <span className="font-bold text-sm text-slate-900">ختم المدرسة الرسمي</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <span>تفعيل</span>
                    <input
                      type="checkbox"
                      checked={stampEnabled}
                      onChange={(e) => setStampEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                    />
                  </label>
                </div>

                {/* Stamp Preview Box */}
                <div className="h-36 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center p-3 relative group overflow-hidden">
                  {previewStamp ? (
                    <img
                      src={previewStamp}
                      alt="معاينة الختم"
                      className={`max-h-28 max-w-full object-contain filter drop-shadow-sm transition-opacity ${
                        stampEnabled ? "opacity-100" : "opacity-40 grayscale"
                      }`}
                    />
                  ) : (
                    <div className="text-center text-slate-400 text-xs flex flex-col items-center gap-1.5">
                      <FileImage className="w-8 h-8 text-slate-300" />
                      <span>لا يوجد ختم مرفوع</span>
                    </div>
                  )}

                  {!stampEnabled && previewStamp && (
                    <span className="absolute bottom-2 px-2 py-0.5 rounded-full bg-slate-800/80 text-white text-[10px] font-bold">
                      معطل حالياً
                    </span>
                  )}
                </div>

                {/* Stamp Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    ref={stampInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, "stamp")}
                  />
                  <button
                    type="button"
                    onClick={() => stampInputRef.current?.click()}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{previewStamp ? "استبدال الختم" : "رفع الختم"}</span>
                  </button>
                  {previewStamp && (
                    <button
                      type="button"
                      onClick={handleDeleteStamp}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="حذف الختم"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Section 2: Vice Principal Signature */}
              <div className="border border-slate-200 rounded-2xl p-4.5 bg-white shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-teal-700" />
                    <span className="font-bold text-sm text-slate-900">توقيع وكيلة المدرسة</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <span>تفعيل</span>
                    <input
                      type="checkbox"
                      checked={signatureEnabled}
                      onChange={(e) => setSignatureEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                    />
                  </label>
                </div>

                {/* Signature Preview Box */}
                <div className="h-36 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center p-3 relative group overflow-hidden">
                  {previewSig ? (
                    <img
                      src={previewSig}
                      alt="معاينة التوقيع"
                      className={`max-h-24 max-w-full object-contain transition-opacity ${
                        signatureEnabled ? "opacity-100" : "opacity-40 grayscale"
                      }`}
                    />
                  ) : (
                    <div className="text-center text-slate-400 text-xs flex flex-col items-center gap-1.5">
                      <FileImage className="w-8 h-8 text-slate-300" />
                      <span>لا يوجد توقيع مرفوع</span>
                    </div>
                  )}

                  {!signatureEnabled && previewSig && (
                    <span className="absolute bottom-2 px-2 py-0.5 rounded-full bg-slate-800/80 text-white text-[10px] font-bold">
                      معطل حالياً
                    </span>
                  )}
                </div>

                {/* Signature Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    ref={sigInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, "signature")}
                  />
                  <button
                    type="button"
                    onClick={() => sigInputRef.current?.click()}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{previewSig ? "استبدال التوقيع" : "رفع التوقيع"}</span>
                  </button>
                  {previewSig && (
                    <button
                      type="button"
                      onClick={handleDeleteSig}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="حذف التوقيع"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 transition-colors font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة الأصول الرسمية المعتمدة</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-teal-700 to-[#137a85] hover:opacity-95 rounded-xl shadow-sm transition-opacity"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>حفظ التعديلات</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
