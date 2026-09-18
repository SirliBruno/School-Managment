"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  ShieldCheck,
  Building2,
  KeyRound,
  Info,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(true);

  // إذا كانت الوكيلة مسجلة الدخول مسبقاً، التوجيه مباشرة للوحة التحكم
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim()) {
      setErrorMsg("يرجى إدخال اسم المستخدم");
      return;
    }

    if (!password) {
      setErrorMsg("يرجى إدخال كلمة المرور");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(username, password);
      if (res.success) {
        router.push("/");
      } else {
        setErrorMsg(res.error || "اسم المستخدم أو كلمة المرور غير صحيحة");
      }
    } catch {
      setErrorMsg("حدث خطأ غير متوقع أثناء تسجيل الدخول");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDefaults = () => {
    setUsername("wakila");
    setPassword("123456");
    setErrorMsg(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#0b3b42] to-slate-950 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden select-none">
      {/* عناصر خلفية تزيينية متحركة */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* ترويسة الشعار والمنصة */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl shadow-xl shadow-teal-900/40 text-white mb-4 ring-4 ring-teal-500/20">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide">
            منصة الغياب الإدارية
          </h1>
          <p className="text-sm font-medium text-teal-200/80 mt-1">
            بوابة الدخول الموحدة • وكيلة الشؤون التعليمية
          </p>
        </div>

        {/* بطاقة تسجيل الدخول */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-7 sm:p-8 shadow-2xl border border-white/20">
          <div className="mb-6 text-right">
            <h2 className="text-lg font-bold text-slate-800">
              تسجيل الدخول للنظام
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              يرجى إدخال بيانات حساب الوكيلة للمتابعة
            </p>
          </div>

          {/* تنبيه الخطأ إن وجد */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 leading-relaxed"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-medium">{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* حقل اسم المستخدم */}
            <div className="space-y-1.5 text-right">
              <label className="block text-xs font-bold text-slate-700">
                اسم المستخدم
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  dir="ltr"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="wakila"
                  autoComplete="username"
                  required
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all text-left font-medium"
                />
              </div>
            </div>

            {/* حقل كلمة المرور */}
            <div className="space-y-1.5 text-right">
              <label className="block text-xs font-bold text-slate-700">
                كلمة المرور
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  dir="ltr"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full pr-10 pl-11 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all text-left font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  tabIndex={-1}
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* زر تسجيل الدخول */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 hover:from-teal-800 hover:to-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-teal-900/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>جاري التحقق والدخول...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>دخول لوحة التحكم</span>
                </>
              )}
            </motion.button>
          </form>

          {/* صندوق مساعدة البيانات الافتراضية الأولية */}
          {showHint && (
            <div className="mt-6 pt-5 border-t border-slate-100 text-right">
              <div className="bg-teal-50/80 border border-teal-100 rounded-2xl p-3.5 text-xs text-teal-900 flex items-start gap-2.5">
                <KeyRound className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-teal-800">
                      بيانات الحساب الأولية:
                    </span>
                    <button
                      type="button"
                      onClick={handleFillDefaults}
                      className="text-[11px] text-teal-700 hover:text-teal-900 underline font-semibold cursor-pointer"
                    >
                      تعبئة تلقائية
                    </button>
                  </div>
                  <div className="text-[11px] text-teal-700 space-y-0.5 font-mono">
                    <div>المستخدم: <strong className="font-bold">wakila</strong></div>
                    <div>كلمة المرور: <strong className="font-bold">123456</strong></div>
                  </div>
                  <p className="text-[10px] text-teal-600/90 pt-0.5 font-sans">
                    * يمكنك تغيير اسم المستخدم وكلمة المرور في أي وقت من شريط القائمة الجانبية بعد الدخول.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* تذييل الصفحة */}
        <div className="text-center mt-6 text-teal-200/50 text-xs flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>منظومة إدارية مدرسية آمنة • المملكة العربية السعودية</span>
        </div>
      </motion.div>
    </div>
  );
}
