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
  Building2,
} from "lucide-react";
import {
  getSchoolApprovalSettings,
  updateSchoolApprovalSettings,
  resetSchoolApprovalSettings,
  deleteSchoolStamp,
  deletePrincipalSignature,
  SchoolApprovalSettings,
} from "@/lib/stampSignatureManager";
import { useAuth, DEFAULT_ADMIN_NAME } from "@/context/AuthContext";
import {
  uploadSchoolAsset,
  getActiveSchoolSettings,
  updateSchoolSettingsInCloud,
  DEFAULT_SCHOOL_SETTINGS,
} from "@/lib/schoolSettingsService";

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
  const [schoolName, setSchoolName] = useState<string>("");
  const [principalName, setPrincipalName] = useState<string>("");
  const [vicePrincipalName, setVicePrincipalName] = useState<string>("");
  const [previewLogo, setPreviewLogo] = useState<string>("");
  const [previewStamp, setPreviewStamp] = useState<string>("");
  const [previewPrincipalSig, setPreviewPrincipalSig] = useState<string>("");
  const [previewViceSig, setPreviewViceSig] = useState<string>("");
  const [stampEnabled, setStampEnabled] = useState<boolean>(true);
  const [signatureEnabled, setSignatureEnabled] = useState<boolean>(true);
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const stampInputRef = useRef<HTMLInputElement>(null);
  const principalSigInputRef = useRef<HTMLInputElement>(null);
  const viceSigInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const current = getSchoolApprovalSettings();
      const currentSchool = getActiveSchoolSettings();
      setSettings(current);
      setSchoolName(currentSchool.schoolName || DEFAULT_SCHOOL_SETTINGS.schoolName);
      setPrincipalName(currentSchool.principalName || DEFAULT_SCHOOL_SETTINGS.principalName);
      setVicePrincipalName(currentSchool.vicePrincipalName || DEFAULT_SCHOOL_SETTINGS.vicePrincipalName);
      setPreviewLogo(currentSchool.schoolLogo || DEFAULT_SCHOOL_SETTINGS.schoolLogo);
      setPreviewStamp(current.schoolStampUrl || currentSchool.stampUrl || DEFAULT_SCHOOL_SETTINGS.stampUrl);
      setPreviewPrincipalSig(
        current.principalSignatureUrl || currentSchool.signatureUrl || DEFAULT_SCHOOL_SETTINGS.signatureUrl
      );
      setPreviewViceSig(
        current.vicePrincipalSignatureUrl || currentSchool.vicePrincipalSignatureUrl || DEFAULT_SCHOOL_SETTINGS.vicePrincipalSignatureUrl || ""
      );
      setStampEnabled(current.stampEnabled);
      setSignatureEnabled(current.signatureEnabled);
      setSuccessMsg("");
      setErrorMsg("");
    }
  }, [isOpen]);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "stamp" | "principal_signature" | "vice_signature" | "logo"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("حجم الملف كبير جداً. الحد الأقصى المسموح به هو 5 ميجابايت.");
      return;
    }

    try {
      const res = await uploadSchoolAsset(file, type);
      if (res.success && res.url) {
        if (type === "stamp") {
          setPreviewStamp(res.url);
          setStampEnabled(true);
        } else if (type === "principal_signature") {
          setPreviewPrincipalSig(res.url);
          setSignatureEnabled(true);
        } else if (type === "vice_signature") {
          setPreviewViceSig(res.url);
          setSignatureEnabled(true);
        } else if (type === "logo") {
          setPreviewLogo(res.url);
        }
        setErrorMsg("");
      } else {
        setErrorMsg(res.error || "تعذر رفع الصورة إلى التخزين السحابي.");
      }
    } catch {
      setErrorMsg("حدث خطأ أثناء معالجة ملف الصورة.");
    }
  };

  const handleSave = () => {
    try {
      const adminName = user?.fullName || DEFAULT_ADMIN_NAME;
      const updated = updateSchoolApprovalSettings(
        {
          schoolStampUrl: previewStamp,
          principalSignatureUrl: previewPrincipalSig,
          vicePrincipalSignatureUrl: previewViceSig,
          stampEnabled,
          signatureEnabled,
        },
        adminName
      );
      updateSchoolSettingsInCloud({
        schoolName: schoolName.trim() || undefined,
        principalName: principalName.trim() || undefined,
        vicePrincipalName: vicePrincipalName.trim() || undefined,
        schoolLogo: previewLogo || undefined,
        stampUrl: previewStamp,
        signatureUrl: previewPrincipalSig,
        vicePrincipalSignatureUrl: previewViceSig,
        stampEnabled,
        signatureEnabled,
      }).catch(() => {});

      setSettings(updated);
      setSuccessMsg("تم حفظ وتحديث بيانات المدرسة وأصول الاعتماد سحابياً بنجاح.");
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
    if (window.confirm("هل ترغب في استعادة الإعدادات والأصول الرسمية الافتراضية للمدرسة؟")) {
      const adminName = user?.fullName || DEFAULT_ADMIN_NAME;
      const reset = resetSchoolApprovalSettings(adminName);
      setSettings(reset);
      setSchoolName(DEFAULT_SCHOOL_SETTINGS.schoolName);
      setPrincipalName(DEFAULT_SCHOOL_SETTINGS.principalName);
      setVicePrincipalName(DEFAULT_SCHOOL_SETTINGS.vicePrincipalName);
      setPreviewLogo(DEFAULT_SCHOOL_SETTINGS.schoolLogo);
      setPreviewStamp(reset.schoolStampUrl);
      setPreviewPrincipalSig(reset.principalSignatureUrl);
      setPreviewViceSig(reset.vicePrincipalSignatureUrl || "");
      setStampEnabled(true);
      setSignatureEnabled(true);

      updateSchoolSettingsInCloud({
        schoolName: DEFAULT_SCHOOL_SETTINGS.schoolName,
        principalName: DEFAULT_SCHOOL_SETTINGS.principalName,
        vicePrincipalName: DEFAULT_SCHOOL_SETTINGS.vicePrincipalName,
        schoolLogo: DEFAULT_SCHOOL_SETTINGS.schoolLogo,
        stampUrl: reset.schoolStampUrl,
        signatureUrl: reset.principalSignatureUrl,
        vicePrincipalSignatureUrl: reset.vicePrincipalSignatureUrl,
        stampEnabled: true,
        signatureEnabled: true,
      }).catch(() => {});

      setSuccessMsg("تمت استعادة الإعدادات والأصول الرسمية الافتراضية بنجاح.");
      if (onAssetsChanged) {
        onAssetsChanged();
      }
    }
  };

  const handleDeleteLogo = () => {
    setPreviewLogo("");
  };

  const handleDeleteStamp = () => {
    setPreviewStamp("");
    setStampEnabled(false);
  };

  const handleDeletePrincipalSig = () => {
    setPreviewPrincipalSig("");
  };

  const handleDeleteViceSig = () => {
    setPreviewViceSig("");
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
          className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 z-10 text-right my-8"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-teal-800 to-[#137a85] text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/10 text-white">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 id="approval-assets-title" className="font-bold text-base">
                  إعدادات المدرسة وأصول الاعتماد السحابية
                </h3>
                <p className="text-xs text-teal-100/80">
                  إدارة بيانات المنشأة، القيادة المدرسية، الشعار، وختم وتوقيع الاعتماد المعتمد
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-teal-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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
                className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{successMsg}</span>
              </motion.div>
            )}

            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {/* Information Banner */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-2xl flex items-start gap-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <Info className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-100 block mb-0.5">ضوابط الاعتماد والختم الآلي:</span>
                تُحفظ كافة البيانات والأصول سحابياً كـ Single Source of Truth وتُدرج تلقائياً في النماذج الرسمية (تقارير الغياب، قرارات الحسم، أذونات الاستئذان، وإشعارات التأخر)، وتنعكس على جميع الأجهزة دون الحاجة لإعادة الإدخال.
              </div>
            </div>

            {/* School Profile Information Section */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 bg-white dark:bg-slate-850 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    بيانات المنشأة والقيادة المدرسية
                  </span>
                </div>
                <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 rounded-md">
                  مزامنة سحابية مباشرة
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    اسم المدرسة
                  </label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="مثال: الثانوية الخامسة مسارات"
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    مديرة المدرسة
                  </label>
                  <input
                    type="text"
                    value={principalName}
                    onChange={(e) => setPrincipalName(e.target.value)}
                    placeholder="اسم مديرة المدرسة"
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    وكيلة المدرسة
                  </label>
                  <input
                    type="text"
                    value={vicePrincipalName}
                    onChange={(e) => setVicePrincipalName(e.target.value)}
                    placeholder="اسم وكيلة المدرسة"
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* School Logo Upload */}
              <div className="flex items-center gap-3 pt-1">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "logo")}
                />
                <div className="w-12 h-12 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-center overflow-hidden shrink-0">
                  {previewLogo ? (
                    <img src={previewLogo} alt="شعار المدرسة" className="w-full h-full object-contain p-1" />
                  ) : (
                    <Building2 className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                  )}
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded-xl transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{previewLogo ? "استبدال شعار المدرسة" : "رفع شعار المدرسة"}</span>
                  </button>
                  {previewLogo && (
                    <button
                      type="button"
                      onClick={handleDeleteLogo}
                      className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                      title="حذف الشعار"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Assets Grid: 3 Distinct Cards for Stamp, Principal Signature, and Vice Principal Signature */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5">
              {/* Card 1: School Stamp */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-850 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">ختم المدرسة الرسمي</span>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    <span className="text-[11px]">تفعيل</span>
                    <input
                      type="checkbox"
                      checked={stampEnabled}
                      onChange={(e) => setStampEnabled(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-600"
                    />
                  </label>
                </div>

                {/* Stamp Preview Box */}
                <div className="h-32 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col items-center justify-center p-2 relative group overflow-hidden">
                  {previewStamp ? (
                    <img
                      src={previewStamp}
                      alt="معاينة الختم"
                      className={`max-h-24 max-w-full object-contain filter drop-shadow-sm transition-opacity ${
                        stampEnabled ? "opacity-100" : "opacity-40 grayscale"
                      }`}
                    />
                  ) : (
                    <div className="text-center text-slate-400 dark:text-slate-500 text-xs flex flex-col items-center gap-1">
                      <FileImage className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                      <span className="text-[11px]">لا يوجد ختم مرفوع</span>
                    </div>
                  )}

                  {!stampEnabled && previewStamp && (
                    <span className="absolute bottom-1.5 px-2 py-0.5 rounded-full bg-slate-800/80 text-white text-[10px] font-bold">
                      معطل حالياً
                    </span>
                  )}
                </div>

                {/* Stamp Actions */}
                <div className="flex items-center gap-1.5 pt-1">
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
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded-xl transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{previewStamp ? "استبدال" : "رفع الختم"}</span>
                  </button>
                  {previewStamp && (
                    <button
                      type="button"
                      onClick={handleDeleteStamp}
                      className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                      title="حذف الختم"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Card 2: Principal Signature (فاطمة فلاتة) */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-850 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    <div>
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 block">
                        توقيع مديرة المدرسة
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {principalName || DEFAULT_SCHOOL_SETTINGS.principalName}
                      </span>
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    <span className="text-[11px]">تفعيل</span>
                    <input
                      type="checkbox"
                      checked={signatureEnabled}
                      onChange={(e) => setSignatureEnabled(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-600"
                    />
                  </label>
                </div>

                {/* Principal Signature Preview Box */}
                <div className="h-32 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col items-center justify-center p-2 relative group overflow-hidden">
                  {previewPrincipalSig ? (
                    <img
                      src={previewPrincipalSig}
                      alt="توقيع مديرة المدرسة"
                      className={`max-h-20 max-w-full object-contain transition-opacity ${
                        signatureEnabled ? "opacity-100" : "opacity-40 grayscale"
                      }`}
                    />
                  ) : (
                    <div className="text-center text-slate-400 dark:text-slate-500 text-xs flex flex-col items-center gap-1">
                      <FileImage className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                      <span className="text-[11px]">لا يوجد توقيع مديرة</span>
                    </div>
                  )}

                  {!signatureEnabled && previewPrincipalSig && (
                    <span className="absolute bottom-1.5 px-2 py-0.5 rounded-full bg-slate-800/80 text-white text-[10px] font-bold">
                      معطل حالياً
                    </span>
                  )}
                </div>

                {/* Principal Signature Actions */}
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    ref={principalSigInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, "principal_signature")}
                  />
                  <button
                    type="button"
                    onClick={() => principalSigInputRef.current?.click()}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{previewPrincipalSig ? "استبدال" : "رفع توقيع المديرة"}</span>
                  </button>
                  {previewPrincipalSig && (
                    <button
                      type="button"
                      onClick={handleDeletePrincipalSig}
                      className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                      title="حذف توقيع المديرة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Card 3: Vice Principal Signature (أحلام صالح الضبيبي) */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-850 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                    <div>
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 block">
                        توقيع وكيلة المدرسة
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {vicePrincipalName || DEFAULT_SCHOOL_SETTINGS.vicePrincipalName}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 px-1.5 py-0.5 rounded font-medium">
                    الإعداد الإداري
                  </span>
                </div>

                {/* Vice Principal Signature Preview Box */}
                <div className="h-32 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col items-center justify-center p-2 relative group overflow-hidden">
                  {previewViceSig ? (
                    <img
                      src={previewViceSig}
                      alt="توقيع وكيلة المدرسة"
                      className="max-h-20 max-w-full object-contain filter drop-shadow-xs"
                    />
                  ) : (
                    <div className="text-center text-slate-400 dark:text-slate-500 text-xs flex flex-col items-center gap-1">
                      <FileImage className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                      <span className="text-[11px]">لا يوجد توقيع وكيلة</span>
                    </div>
                  )}
                </div>

                {/* Vice Principal Signature Actions */}
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    ref={viceSigInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, "vice_signature")}
                  />
                  <button
                    type="button"
                    onClick={() => viceSigInputRef.current?.click()}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded-xl transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{previewViceSig ? "استبدال" : "رفع توقيع الوكيلة"}</span>
                  </button>
                  {previewViceSig && (
                    <button
                      type="button"
                      onClick={handleDeleteViceSig}
                      className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                      title="حذف توقيع الوكيلة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors font-medium cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة الأصول الرسمية المعتمدة</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-teal-700 to-[#137a85] hover:opacity-95 rounded-xl shadow-sm transition-opacity cursor-pointer"
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
