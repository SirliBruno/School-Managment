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
  FileSpreadsheet,
  ClipboardList,
  BarChart3,
  FileDown,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const features = [
  {
    icon: FileSpreadsheet,
    text: "استيراد بيانات المعلمات من Excel بسهولة",
    subtext: "سحب وتوزيع السجلات بضغطة زر واحدة",
  },
  {
    icon: ClipboardList,
    text: "تسجيل الغياب والتأخر وإصدار المساءلات",
    subtext: "مسار إلكتروني فوري ومباشر عبر الواتساب",
  },
  {
    icon: BarChart3,
    text: "إحصائيات ورسوم بيانية دقيقة للغياب",
    subtext: "لوحة تحليلات يومية وشهرية تفاعلية للوكيلة",
  },
  {
    icon: FileDown,
    text: "تصدير النماذج الرسمية بصيغة PDF",
    subtext: "استمارات معتمدة وجاهزة للطباعة والأرشفة",
  },
];

const featureContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const featureItemVariants = {
  hidden: { opacity: 0, x: -20 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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


  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row select-none bg-slate-50">
      {/* 1. Right Side: Login Form (نموذج الدخول) */}
      <div className="w-full md:w-1/2 min-h-screen flex items-center justify-center p-6 sm:p-10 lg:p-16 bg-slate-50/70 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full max-w-md bg-white rounded-3xl p-7 sm:p-9 shadow-xl shadow-slate-200/60 border border-slate-200/90"
        >
          {/* ترويسة الشعار والمنصة */}
          <div className="flex items-center gap-3.5 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-700 to-cyan-800 text-white flex items-center justify-center shadow-md shadow-teal-900/20 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                منصة الغياب الإدارية
              </h1>
              <p className="text-xs font-bold text-teal-700 mt-0.5">
                بوابة الدخول الموحدة • وكيلة الشؤون التعليمية
              </p>
            </div>
          </div>

          <div className="mb-6 text-right">
            <h2 className="text-lg font-bold text-slate-800">
              تسجيل الدخول للنظام
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              يرجى إدخال بيانات الاعتماد الإدارية للمتابعة
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

          {/* نموذج الإدخال */}
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
                  className="w-full pr-10 pl-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all text-left font-medium"
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
                  className="w-full pr-10 pl-11 py-3 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all text-left font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  tabIndex={-1}
                  aria-label={
                    showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* زر تسجيل الدخول الرئيسي */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-sm shadow-md shadow-teal-900/15 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
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




        </motion.div>

      </div>

      {/* 2. Left Side: Platform Features & Value Proposition (المميزات) */}
      <div className="hidden md:flex md:w-1/2 min-h-screen flex-col justify-between p-10 lg:p-16 bg-gradient-to-br from-teal-900 via-teal-800 to-cyan-950 text-white relative overflow-hidden select-none">
        {/* خلفيات بصرية تزيينية هندسية فخمة */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
        />

        {/* الترويسة العلوية في الجانب التعريفي */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-teal-200 text-xs font-bold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-teal-300" />
            <span>نظام إداري مدرسي متكامل</span>
          </div>
        </div>

        {/* المحتوى الرئيسي والمميزات */}
        <div className="relative z-10 my-auto py-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
              منصة الغياب الإدارية
            </h2>
            <p className="text-lg font-bold text-teal-200 mt-2.5">
              الحل الشامل لوكيلة شؤون المعلمات
            </p>
            <p className="text-sm text-teal-100/90 leading-relaxed max-w-lg mt-3 font-normal">
              نظام ذكي يهدف إلى تسهيل حصر الغياب، إصدار المساءلات، وتوليد الإحصائيات بدقة متناهية.
            </p>
          </motion.div>

          {/* قائمة المميزات مع حركة متتابعة (Staggered Animations) */}
          <motion.div
            variants={featureContainerVariants}
            initial="hidden"
            animate="show"
            className="mt-8 space-y-3.5 max-w-lg"
          >
            {features.map((feat, idx) => (
              <motion.div
                key={idx}
                variants={featureItemVariants}
                className="flex items-center gap-4 p-3.5 rounded-2xl bg-white/[0.07] backdrop-blur-sm border border-white/10 hover:bg-white/[0.12] transition-all duration-200 group"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-400/30 text-teal-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                  <feat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-teal-100 transition-colors">
                    {feat.text}
                  </p>
                  <p className="text-xs text-teal-200/70 mt-0.5">
                    {feat.subtext}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* التذييل الأمني الرسمي وتوقيع المطور */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-teal-200/70 font-medium">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
            <span>نظام إدارة مدرسية آمن • المملكة العربية السعودية</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-teal-200/80 text-[11px]">
              تطوير: <strong className="text-white font-bold">محمد هارون</strong>
            </span>
            <a
              href="https://wa.me/966557013720"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-mono font-bold transition-all border border-white/15 group"
              title="تواصل مع المطور عبر الواتساب"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span dir="ltr">0557013720</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
