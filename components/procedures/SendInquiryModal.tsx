"use client";

import React, { useState, useEffect, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  MessageCircle,
  Copy,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Phone,
  UserCheck,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useTeachers } from "@/context/TeacherContext";
import { Teacher } from "@/types/teacher";
import { TeacherCombobox } from "@/components/procedures/TeacherCombobox";
import {
  formatSaudiMobile,
  generateInquiryMessage,
  getWhatsAppDirectUrl,
  normalizeSaudiMobileInput,
} from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { getSaudiToday } from "@/lib/timeUtils";

interface SendInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedTeacherId?: string;
}

export const SendInquiryModal: React.FC<SendInquiryModalProps> = ({
  isOpen,
  onClose,
  preselectedTeacherId,
}) => {
  const { teachers, createInquiry, updateTeacher } = useTeachers();
  const formId = useId();

  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [absenceDate, setAbsenceDate] = useState(() => {
    return getSaudiToday();
  });
  const [manualMobile, setManualMobile] = useState("");
  const [saveMobileToProfile, setSaveMobileToProfile] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync preselected teacher if provided
  useEffect(() => {
    if (preselectedTeacherId) {
      const found = teachers.find((t) => t.id === preselectedTeacherId);
      if (found) {
        setSelectedTeacherId(found.id);
        setSelectedTeacher(found);
        setManualMobile(found.mobile || "");
      }
    }
  }, [preselectedTeacherId, teachers]);

  const handleTeacherSelect = (teacher: Teacher | null) => {
    setSelectedTeacher(teacher);
    setSelectedTeacherId(teacher ? teacher.id : "");
    setManualMobile(teacher?.mobile || "");
    setErrorMsg(null);
  };

  const getEffectiveMobile = (): string => {
    return manualMobile.trim() || selectedTeacher?.mobile || "";
  };

  // Base URL for inquiry link
  const getBaseOrigin = (): string => {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "https://school-absence.gov.sa";
  };

  // Validation
  const validate = (): boolean => {
    if (!selectedTeacherId || !selectedTeacher) {
      setErrorMsg("يرجى اختيار المعلمة من القائمة أولاً.");
      return false;
    }

    if (!absenceDate) {
      setErrorMsg("يرجى تحديد تاريخ الغياب.");
      return false;
    }

    const phone = getEffectiveMobile();
    if (!phone) {
      setErrorMsg("رقم جوال المعلمة مطلوب لإرسال رسالة الواتساب.");
      return false;
    }

    const clean = formatSaudiMobile(phone);
    if (!clean || clean.length < 9) {
      setErrorMsg("صيغة رقم الجوال غير صحيحة. يرجى إدخال رقم هاتف سعودي صحيح (مثال: 05XXXXXXXX).");
      return false;
    }

    setErrorMsg(null);
    return true;
  };

  // 1. Send via WhatsApp directly
  const handleSendViaWhatsApp = async () => {
    if (!validate() || !selectedTeacher) return;

    setIsProcessing(true);
    try {
      // Save mobile if newly entered or updated
      const phone = getEffectiveMobile();
      if (saveMobileToProfile && phone && phone !== selectedTeacher.mobile) {
        updateTeacher(selectedTeacher.id, { mobile: phone });
      }

      // Create inquiry
      const res = await createInquiry(selectedTeacher.id, absenceDate);
      if (!res.success || !res.inquiry) {
        setErrorMsg(res.error || "فشل إنشاء رابط المساءلة.");
        setIsProcessing(false);
        return;
      }

      const inquiryLink = `${getBaseOrigin()}/inquiry/${res.inquiry.token}`;
      const message = generateInquiryMessage(
        selectedTeacher.fullName || selectedTeacher.name || "معلمة",
        absenceDate,
        inquiryLink
      );

      const waUrl = getWhatsAppDirectUrl(phone, message);

      // Open WhatsApp in new tab
      window.open(waUrl, "_blank", "noopener,noreferrer");

      onClose();
    } catch (err) {
      console.error("خطأ إرسال الواتساب:", err);
      setErrorMsg("حدث خطأ أثناء معالجة الإرسال.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Copy Link and Message
  const handleCopyLink = async () => {
    if (!validate() || !selectedTeacher) return;

    setIsProcessing(true);
    try {
      const phone = getEffectiveMobile();
      if (saveMobileToProfile && phone && phone !== selectedTeacher.mobile) {
        updateTeacher(selectedTeacher.id, { mobile: phone });
      }

      const res = await createInquiry(selectedTeacher.id, absenceDate);
      if (!res.success || !res.inquiry) {
        setErrorMsg(res.error || "فشل إنشاء رابط المساءلة.");
        setIsProcessing(false);
        return;
      }

      const inquiryLink = `${getBaseOrigin()}/inquiry/${res.inquiry.token}`;
      const message = generateInquiryMessage(
        selectedTeacher.fullName || selectedTeacher.name || "معلمة",
        absenceDate,
        inquiryLink
      );

      await navigator.clipboard.writeText(message);
      setCopiedSuccess(true);
      setTimeout(() => {
        setCopiedSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error("خطأ نسخ الرابط:", err);
      setErrorMsg("تعذر نسخ الرسالة إلى الحافظة.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const currentMobile = getEffectiveMobile();
  const formattedMobile = formatSaudiMobile(currentMobile);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden text-right"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  إرسال مساءلة غياب عبر الواتساب
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  توليد رابط تفاعلي للمعلمة لتقديم إفادتها ورفع المرفق
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {copiedSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>تم نسخ نص الرسالة ورابط المساءلة بنجاح!</span>
              </div>
            )}

            {/* Teacher Combobox */}
            <div>
              <TeacherCombobox
                teachers={teachers}
                selectedTeacherId={selectedTeacherId}
                onSelect={handleTeacherSelect}
                error={!selectedTeacherId && errorMsg ? errorMsg : undefined}
                disabled={isProcessing}
              />
            </div>

            {/* Absence Date */}
            <div className="space-y-1.5">
              <label
                htmlFor={`${formId}-date`}
                className="block text-xs font-bold text-slate-700"
              >
                تاريخ الغياب المعني بالمساءلة <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id={`${formId}-date`}
                  type="date"
                  value={absenceDate}
                  onChange={(e) => setAbsenceDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs md:text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#137a85]/20 focus:border-[#137a85] transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Teacher Mobile Number Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={`${formId}-mobile`}
                  className="block text-xs font-bold text-slate-700"
                >
                  رقم جوال المعلمة (واتساب) <span className="text-rose-500">*</span>
                </label>
                {formattedMobile && (
                  <span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    +{formattedMobile}
                  </span>
                )}
              </div>
              <div className="relative">
                <Phone
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id={`${formId}-mobile`}
                  type="tel"
                  dir="ltr"
                  placeholder="9665XXXXXXXX"
                  value={manualMobile}
                  onChange={(e) => setManualMobile(normalizeSaudiMobileInput(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs md:text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#137a85]/20 focus:border-[#137a85] transition-all shadow-2xs font-mono font-medium"
                />
              </div>
              {selectedTeacher && (
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={saveMobileToProfile}
                    onChange={(e) => setSaveMobileToProfile(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-[#137a85] focus:ring-[#137a85]"
                  />
                  <span className="text-[11px] text-slate-500">
                    تحديث هذا الرقم في الملف الدائم للمعلمة
                  </span>
                </label>
              )}
            </div>

            {/* Live Message Preview Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>معاينة نص الرسالة المرسلة:</span>
                <span className="text-[10px] text-slate-400">صلاحية الرابط: 7 أيام</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed font-sans">
                <p>
                  المكرمة الأستاذة /{" "}
                  <span className="font-bold text-slate-900">
                    {selectedTeacher?.fullName || selectedTeacher?.name || "..."}
                  </span>
                </p>
                <p className="mt-1 text-slate-600">
                  السلام عليكم ورحمة الله وبركاته،، نأمل منكِ التكرم بتقديم الإفادة عن سبب الغياب ليوم ({absenceDate}) وإرفاق التقرير الطبي أو ما يعادله عبر الرابط:
                </p>
                <p className="mt-1 text-[#137a85] font-mono text-[11px] underline">
                  [رابط الاستمارة الآمن الخاص بالمعلمة]
                </p>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              disabled={isProcessing}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>نسخ الرسالة والرابط</span>
            </button>

            <button
              type="button"
              onClick={handleSendViaWhatsApp}
              disabled={isProcessing}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow disabled:opacity-60"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Send className="w-3.5 h-3.5 text-emerald-100" />
              )}
              <span>إرسال عبر الواتساب</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
