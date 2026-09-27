"use client";

import React, { useState, useEffect, useId, useMemo } from "react";
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
import { getInquiryPublicUrl } from "@/lib/appConfig";
import { cn } from "@/lib/utils";
import {
  getSaudiToday,
  calculateDaysBetween,
  formatDaysCountArabic,
} from "@/lib/timeUtils";

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
  const [durationMode, setDurationMode] = useState<"single" | "multiple">("single");
  const [absenceDate, setAbsenceDate] = useState(() => {
    return getSaudiToday();
  });
  const [absenceEndDate, setAbsenceEndDate] = useState(() => {
    return getSaudiToday();
  });
  const [manualMobile, setManualMobile] = useState("");
  const [saveMobileToProfile, setSaveMobileToProfile] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Computed days for multi-day range
  const calculatedDays = useMemo(() => {
    if (durationMode === "single") return 1;
    return calculateDaysBetween(absenceDate, absenceEndDate);
  }, [durationMode, absenceDate, absenceEndDate]);

  const daysLabel = useMemo(() => {
    return formatDaysCountArabic(calculatedDays);
  }, [calculatedDays]);

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

    if (durationMode === "multiple") {
      if (!absenceEndDate) {
        setErrorMsg("يرجى تحديد تاريخ نهاية الغياب.");
        return false;
      }
      if (absenceEndDate < absenceDate) {
        setErrorMsg("تاريخ نهاية الغياب يجب ألا يسبق تاريخ البداية.");
        return false;
      }
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

      const isMulti = durationMode === "multiple" && absenceEndDate !== absenceDate;

      // Create inquiry
      const res = await createInquiry(
        selectedTeacher.id,
        absenceDate,
        isMulti ? absenceEndDate : undefined,
        isMulti ? calculatedDays : 1
      );
      if (!res.success || !res.inquiry) {
        setErrorMsg(res.error || "فشل إنشاء رابط المساءلة.");
        setIsProcessing(false);
        return;
      }

      const inquiryLink = getInquiryPublicUrl(res.inquiry.token, {
        endDate: isMulti ? absenceEndDate : undefined,
        daysCount: isMulti ? calculatedDays : 1,
      });
      const message = generateInquiryMessage(
        selectedTeacher.fullName || selectedTeacher.name || "معلمة",
        absenceDate,
        inquiryLink,
        isMulti ? absenceEndDate : undefined,
        isMulti ? calculatedDays : 1
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

      const isMulti = durationMode === "multiple" && absenceEndDate !== absenceDate;

      const res = await createInquiry(
        selectedTeacher.id,
        absenceDate,
        isMulti ? absenceEndDate : undefined,
        isMulti ? calculatedDays : 1
      );
      if (!res.success || !res.inquiry) {
        setErrorMsg(res.error || "فشل إنشاء رابط المساءلة.");
        setIsProcessing(false);
        return;
      }

      const inquiryLink = getInquiryPublicUrl(res.inquiry.token, {
        endDate: isMulti ? absenceEndDate : undefined,
        daysCount: isMulti ? calculatedDays : 1,
      });
      const message = generateInquiryMessage(
        selectedTeacher.fullName || selectedTeacher.name || "معلمة",
        absenceDate,
        inquiryLink,
        isMulti ? absenceEndDate : undefined,
        isMulti ? calculatedDays : 1
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

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isProcessing) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isProcessing, onClose]);

  if (!isOpen) return null;

  const currentMobile = getEffectiveMobile();
  const formattedMobile = formatSaudiMobile(currentMobile);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden text-right"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-850/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  إرسال مساءلة غياب عبر الواتساب
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  توليد رابط تفاعلي للمعلمة لتقديم إفادتها ورفع المرفق
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق النافذة"
              className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {copiedSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
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

            {/* Absence Duration Type Toggle */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                نوع ومدة الغياب <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDurationMode("single")}
                  className={cn(
                    "py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                    durationMode === "single"
                      ? "bg-white dark:bg-slate-700 text-[#137a85] dark:text-teal-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  )}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>يوم واحد</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDurationMode("multiple");
                    if (absenceEndDate <= absenceDate) {
                      const next = new Date(absenceDate);
                      next.setDate(next.getDate() + 1);
                      setAbsenceEndDate(next.toISOString().split("T")[0]);
                    }
                  }}
                  className={cn(
                    "py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                    durationMode === "multiple"
                      ? "bg-white dark:bg-slate-700 text-[#137a85] dark:text-teal-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  )}
                >
                  <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>عدة أيام (فترة غياب)</span>
                </button>
              </div>
            </div>

            {/* Date Pickers */}
            {durationMode === "single" ? (
              <div className="space-y-1.5">
                <label
                  htmlFor={`${formId}-date`}
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  تاريخ الغياب المعني بالمساءلة <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar
                    className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id={`${formId}-date`}
                    type="date"
                    value={absenceDate}
                    onChange={(e) => setAbsenceDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs md:text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#137a85]/20 focus:border-[#137a85] transition-all shadow-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 p-3.5 rounded-2xl bg-teal-50/40 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`${formId}-start-date`}
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      من تاريخ (بداية الغياب) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar
                        className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        id={`${formId}-start-date`}
                        type="date"
                        value={absenceDate}
                        onChange={(e) => {
                          setAbsenceDate(e.target.value);
                          if (absenceEndDate < e.target.value) {
                            setAbsenceEndDate(e.target.value);
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs md:text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#137a85]/20 focus:border-[#137a85] transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor={`${formId}-end-date`}
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      إلى تاريخ (نهاية الغياب) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar
                        className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        id={`${formId}-end-date`}
                        type="date"
                        min={absenceDate}
                        value={absenceEndDate}
                        onChange={(e) => setAbsenceEndDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs md:text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#137a85]/20 focus:border-[#137a85] transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Days Count Badge */}
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-800/60 text-xs">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">إجمالي مدة الغياب المحسوبة:</span>
                  <span className="font-bold text-[#137a85] dark:text-teal-400 flex items-center gap-1.5 font-mono">
                    <span>{daysLabel}</span>
                    <span className="text-[11px] text-teal-700 dark:text-teal-400 font-sans">({calculatedDays} يوم)</span>
                  </span>
                </div>
              </div>
            )}

            {/* Teacher Mobile Number Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={`${formId}-mobile`}
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  رقم جوال المعلمة (واتساب) <span className="text-rose-500">*</span>
                </label>
                {formattedMobile && (
                  <span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60 px-2 py-0.5 rounded-md border">
                    +{formattedMobile}
                  </span>
                )}
              </div>
              <div className="relative">
                <Phone
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id={`${formId}-mobile`}
                  type="tel"
                  dir="ltr"
                  placeholder="9665XXXXXXXX"
                  value={manualMobile}
                  onChange={(e) => setManualMobile(normalizeSaudiMobileInput(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs md:text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#137a85]/20 focus:border-[#137a85] transition-all shadow-sm font-mono font-medium"
                />
              </div>
              {selectedTeacher && (
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={saveMobileToProfile}
                    onChange={(e) => setSaveMobileToProfile(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 text-[#137a85] focus:ring-[#137a85]"
                  />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    تحديث هذا الرقم في الملف الدائم للمعلمة
                  </span>
                </label>
              )}
            </div>

            {/* Live Message Preview Box */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                <span>معاينة نص الرسالة المرسلة:</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">صلاحية الرابط: 7 أيام</span>
              </div>
              <div className="bg-white dark:bg-slate-850 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                <p>
                  المكرمة الأستاذة /{" "}
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {selectedTeacher?.fullName || selectedTeacher?.name || "..."}
                  </span>
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  السلام عليكم ورحمة الله وبركاته،، نأمل منكِ التكرم بتقديم الإفادة عن سبب الغياب{" "}
                  {durationMode === "multiple" && absenceEndDate !== absenceDate ? (
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      للفترة من ({absenceDate}) إلى ({absenceEndDate}) ولمدة ({daysLabel})
                    </span>
                  ) : (
                    <span>
                      ليوم (<strong className="font-bold text-slate-900 dark:text-slate-100">{absenceDate}</strong>)
                    </span>
                  )}{" "}
                  مع إرفاق التقرير الطبي أو ما يعادله عبر الرابط:
                </p>
                <p className="mt-1 text-[#137a85] dark:text-teal-400 font-mono text-[11px] underline">
                  [رابط الاستمارة الآمن الخاص بالمعلمة]
                </p>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50/70 dark:bg-slate-850/70 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              disabled={isProcessing}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
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
