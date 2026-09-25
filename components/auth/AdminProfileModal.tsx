"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Save,
  KeyRound,
  Shield,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface AdminProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminProfileModal: React.FC<AdminProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, updateCredentials } = useAuth();

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      setUsername(user.username);
      setFullName(user.fullName || "وكيلة الشؤون التعليمية");
      setNewPassword("");
      setConfirmPassword("");
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanUser = username.trim();
    if (!cleanUser) {
      setErrorMsg("اسم المستخدم لا يمكن أن يكون فارغاً");
      return;
    }

    if (cleanUser.length < 3) {
      setErrorMsg("اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل");
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        setErrorMsg("كلمة المرور يجب أن تتكون من 6 خانات على الأقل لضمان الأمان في Supabase");
        return;
      }

      if (newPassword !== confirmPassword) {
        setErrorMsg("كلمة المرور الجديدة وتأكيدها غير متطابقين");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await updateCredentials(
        cleanUser,
        newPassword || undefined,
        fullName.trim() || undefined
      );

      if (res.success) {
        setSuccessMsg("تم حفظ وتحديث بيانات حساب الوكيلة في Supabase بنجاح!");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.error || "تعذر حفظ التعديلات");
      }
    } catch {
      setErrorMsg("حدث خطأ غير متوقع أثناء حفظ البيانات");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-profile-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
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
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10 select-none text-right"
        >
          {/* Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-teal-800 to-[#137a85] text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/10 text-white">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 id="admin-profile-title" className="font-bold text-base">
                  إعدادات حساب الوكيلة
                </h3>
                <p className="text-xs text-teal-100/80">
                  تعديل اسم المستخدم وكلمة المرور الخاصة بالدخول
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
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* رسائل التنبيه والنجاح */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}

              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span className="font-bold">{successMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* تنبيه البريد الإلكتروني المرتبط في Supabase */}
            {user?.email && (
              <div className="p-3 rounded-xl bg-teal-50/80 border border-teal-200/80 flex items-center justify-between text-xs">
                <span className="text-teal-900 font-bold">
                  البريد الإلكتروني في Supabase:
                </span>
                <span className="font-mono text-teal-800 font-semibold" dir="ltr">
                  {user.email}
                </span>
              </div>
            )}

            {/* الاسم الكامل المعروض */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                اللقب / الاسم المعروض
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="وكيلة الشؤون التعليمية"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all font-medium"
              />
            </div>

            {/* اسم المستخدم */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  اسم المستخدم للدخول (Username)
                </label>
                <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-md">
                  مطلوب للدخول
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  dir="ltr"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="wakila"
                  required
                  className="w-full pr-10 pl-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all text-left font-mono font-bold"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 block mb-2">
                تغيير كلمة المرور (اختياري)
              </span>
              <p className="text-[11px] text-slate-400 mb-3">
                اترك الحقول أدناه فارغة إذا كنت ترغب في الاحتفاظ بكلمة المرور الحالية.
              </p>

              <div className="space-y-3">
                {/* كلمة المرور الجديدة */}
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    dir="ltr"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="كلمة مرور جديدة (6 خانات فأكثر)"
                    className="w-full pr-10 pl-11 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all text-left font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* تأكيد كلمة المرور */}
                {newPassword && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="relative"
                  >
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      dir="ltr"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="تأكيد كلمة المرور الجديدة"
                      className="w-full pr-10 pl-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all text-left font-mono"
                    />
                  </motion.div>
                )}
              </div>
            </div>

            {/* أزرار الإجراء */}
            <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-[#137a85] hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-md shadow-teal-900/10 flex items-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>حفظ التعديلات</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
