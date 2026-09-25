"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: string;
}

interface AuthContextType {
  user: AdminUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    identifier: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateCredentials: (
    newUsername?: string,
    newPassword?: string,
    newFullName?: string
  ) => Promise<{ success: boolean; error?: string }>;
}

/**
 * معالجة وتنسيق رسائل أخطاء Supabase Auth مع الحفاظ على نص الخطأ الأصلي
 */
export const formatAuthErrorMessage = (err: unknown): string => {
  if (!err) return "حدث خطأ غير متوقع أثناء تسجيل الدخول";

  const errorObj = err as {
    message?: string;
    error_description?: string;
    code?: string;
    status?: number;
  };
  const rawMsg = errorObj.message || errorObj.error_description || String(err);
  const lower = rawMsg.toLowerCase();
  const code = (errorObj.code || "").toLowerCase();

  let arabicExplanation = "";

  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid_credentials") ||
    code === "invalid_credentials"
  ) {
    arabicExplanation =
      "بيانات الدخول غير صحيحة: يرجى التأكد من كتابة البريد الإلكتروني وكلمة المرور المطابقة لحسابك في Supabase بدقة";
  } else if (
    lower.includes("email not confirmed") ||
    code === "email_not_confirmed" ||
    lower.includes("email address not confirmed")
  ) {
    arabicExplanation =
      "البريد الإلكتروني لم يتم تأكيده بعد: يجب تفعيل الحساب من رابط البريد، أو تفعيل (Auto Confirm User) في لوحة تحكم Supabase Auth";
  } else if (
    lower.includes("invalid email") ||
    lower.includes("unable to validate email") ||
    code === "validation_failed"
  ) {
    arabicExplanation =
      "صيغة البريد الإلكتروني غير صالحة. يرجى إدخال بريد إلكتروني صحيح (مثال: admin@school.com)";
  } else if (lower.includes("user not found") || code === "user_not_found") {
    arabicExplanation =
      "المستخدم غير مسجل: لم يتم العثور على حساب مسجل بهذا البريد في Supabase Auth";
  } else if (
    lower.includes("password should be at least") ||
    lower.includes("weak_password") ||
    lower.includes("password is too short")
  ) {
    arabicExplanation =
      "كلمة المرور قصيرة (يجب أن تتكون من 6 خانات على الأقل وفقاً لسياسات أمان Supabase)";
  } else if (
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit"
  ) {
    arabicExplanation =
      "تم تجاوز عدد المحاولات المسموح بها مؤقتاً، يرجى الانتظار دقيقة ثم إعادة المحاولة";
  } else if (
    lower.includes("network") ||
    lower.includes("failed to fetch") ||
    lower.includes("fetch failed") ||
    lower.includes("connection refused")
  ) {
    arabicExplanation =
      "تعذر الاتصال بخادم Supabase: يرجى التحقق من اتصال الإنترنت وصحة إعدادات NEXT_PUBLIC_SUPABASE_URL في .env";
  } else if (lower.includes("auth session missing")) {
    arabicExplanation = "انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول";
  }

  // إرجاع التفسير العربي مدعوماً بنص الخطأ التقني الأصلي للشفافية
  if (arabicExplanation) {
    return `${arabicExplanation} [${rawMsg}]`;
  }

  return rawMsg;
};

/**
 * استخراج بيانات المستخدم الإدارية من كائن مستخدم Supabase
 */
const extractAdminUser = (sbUser: User): AdminUser => {
  const metadata = sbUser.user_metadata || {};
  const email = sbUser.email || "";
  const fallbackUsername = email ? email.split("@")[0] : "wakila";

  const username =
    (metadata.username as string) ||
    (metadata.user_name as string) ||
    fallbackUsername;

  const fullName =
    (metadata.full_name as string) ||
    (metadata.fullName as string) ||
    (metadata.name as string) ||
    "وكيلة الشؤون التعليمية";

  const role = (metadata.role as string) || "vice_principal";

  return {
    id: sbUser.id,
    email,
    username,
    fullName,
    role,
  };
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // إدارة الجلسة الحقيقية عبر Supabase Auth حصراً (بدون أي Mock أو LocalStorage للمصادقة)
  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured() || !supabase) {
      console.error("[Supabase Auth] العميل غير مهيأ، يرجى التحقق من مفاتيح .env");
      setIsLoading(false);
      return;
    }

    // 1. جلب الجلسة الحالية المخزنة في عميل Supabase
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          console.error("Supabase Auth Error (getSession):", error);
        }
        if (!error && data.session) {
          setSession(data.session);
          setUser(extractAdminUser(data.session.user));
          console.info("[Supabase Auth] تم استعادة الجلسة بنجاح للمستخدم:", data.session.user.email);
        } else {
          setSession(null);
          setUser(null);
        }
      })
      .catch((err) => {
        console.error("Supabase Auth Error (getSession Exception):", err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    // 2. الاستماع اللحظي لكافة أحداث المصادقة (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.info(`[Supabase Auth Event] حدث مصادقة: ${event}`, {
        userEmail: newSession?.user?.email || "لا يوجد",
      });
      if (!isMounted) return;
      if (newSession && newSession.user) {
        setSession(newSession);
        setUser(extractAdminUser(newSession.user));
      } else {
        setSession(null);
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * تسجيل الدخول الفعلي عبر supabase.auth.signInWithPassword
   */
  const login = useCallback(
    async (
      identifier: string,
      password: string
    ): Promise<{ success: boolean; error?: string }> => {
      const cleanIdentifier = identifier.trim();
      if (!cleanIdentifier || !password) {
        return {
          success: false,
          error: "يرجى إدخال البريد الإلكتروني أو اسم المستخدم وكلمة المرور",
        };
      }

      if (!isSupabaseConfigured() || !supabase) {
        console.error("Supabase Auth Error: Supabase client is not configured or missing keys in .env");
        return {
          success: false,
          error: "بيانات الاتصال بـ Supabase غير مهيأة بشكل صحيح في ملف .env",
        };
      }

      // تحديد البريد المستهدف:
      // إذا كان المدخل بريداً إلكترونياً (يحوي @) يستخدمه مباشرة بعد تحويله لأحرف صغيرة
      // إذا كان اسم مستخدم فقط، يتم تجهيزه بنطاق افتراضي
      const targetEmail = cleanIdentifier.includes("@")
        ? cleanIdentifier.toLowerCase()
        : `${cleanIdentifier.toLowerCase()}@school.edu.sa`;

      // طباعة البريد المدخل في وحدة التحكم (بدون كشف كلمة المرور)
      console.log("Supabase Auth: محاولة تسجيل الدخول للمستخدم:", targetEmail);

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password: password,
        });

        if (error) {
          // طباعة كائن الخطأ كاملاً للتشخيص الفوري
          console.error("Supabase Auth Error:", error);

          // إذا كان الإدخال اسم مستخدم فقط وفشل المحاولة الأولى، نجرب نطاقاً بديلاً (@school.com)
          if (
            !cleanIdentifier.includes("@") &&
            error.message.toLowerCase().includes("invalid login credentials")
          ) {
            console.log("Supabase Auth: جاري محاولة بديلة بالنطاق @school.com...");
            const secondAttempt = await supabase.auth.signInWithPassword({
              email: `${cleanIdentifier.toLowerCase()}@school.com`,
              password: password,
            });

            if (secondAttempt.error) {
              console.error("Supabase Auth Error (Attempt 2):", secondAttempt.error);
            } else if (secondAttempt.data.session) {
              console.log("Supabase Auth: تم تسجيل الدخول بنجاح عبر المحاولة الثانية!");
              setSession(secondAttempt.data.session);
              setUser(extractAdminUser(secondAttempt.data.session.user));
              return { success: true };
            }
          }

          return {
            success: false,
            error: formatAuthErrorMessage(error),
          };
        }

        if (data.session) {
          console.log("Supabase Auth: تم التحقق وتسجيل الدخول بنجاح للمستخدم:", data.session.user.email);
          setSession(data.session);
          setUser(extractAdminUser(data.session.user));
          return { success: true };
        }

        return {
          success: false,
          error: "لم يتم إنشاء جلسة دخول صالحة من Supabase، يرجى المحاولة لاحقاً",
        };
      } catch (err: unknown) {
        console.error("Supabase Auth Error (Catch):", err);
        return {
          success: false,
          error: formatAuthErrorMessage(err),
        };
      }
    },
    []
  );

  /**
   * تسجيل الخروج الفعلي عبر supabase.auth.signOut
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      if (supabase) {
        console.log("Supabase Auth: جاري تسجيل الخروج...");
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn("تنبيه أثناء تسجيل الخروج من Supabase:", e);
    } finally {
      setUser(null);
      setSession(null);
    }
  }, []);

  /**
   * تحديث بيانات المستخدم في Supabase Auth برمجياً
   */
  const updateCredentials = useCallback(
    async (
      newUsername?: string,
      newPassword?: string,
      newFullName?: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!isSupabaseConfigured() || !supabase) {
        return {
          success: false,
          error: "Supabase غير متصل، لا يمكن تحديث بيانات الحساب",
        };
      }

      const cleanUser = newUsername?.trim();
      if (cleanUser !== undefined && cleanUser.length > 0 && cleanUser.length < 3) {
        return {
          success: false,
          error: "اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل",
        };
      }

      if (newPassword && newPassword.length < 6) {
        return {
          success: false,
          error: "كلمة المرور في Supabase يجب أن تتكون من 6 خانات على الأقل",
        };
      }

      try {
        const updatePayload: {
          password?: string;
          data?: Record<string, unknown>;
        } = {};

        if (newPassword && newPassword.trim()) {
          updatePayload.password = newPassword.trim();
        }

        const currentMeta = user || ({} as Partial<AdminUser>);
        const updatedUsername = cleanUser || currentMeta.username || "wakila";
        const updatedFullName =
          newFullName?.trim() || currentMeta.fullName || "وكيلة الشؤون التعليمية";

        updatePayload.data = {
          username: updatedUsername,
          user_name: updatedUsername,
          full_name: updatedFullName,
          fullName: updatedFullName,
          role: currentMeta.role || "vice_principal",
        };

        console.log("Supabase Auth: جاري إرسال تحديث الحساب إلى Supabase...", {
          email: user?.email,
          newUsername: updatedUsername,
          newFullName: updatedFullName,
          hasNewPassword: Boolean(newPassword),
        });

        const { data, error } = await supabase.auth.updateUser(updatePayload);

        if (error) {
          console.error("Supabase Auth Error (updateUser):", error);
          return {
            success: false,
            error: formatAuthErrorMessage(error),
          };
        }

        if (data.user) {
          console.log("Supabase Auth: تم تحديث المستخدم بنجاح في auth.users ✓");
          const updated = extractAdminUser(data.user);
          setUser(updated);
        }

        // مزامنة تكميلية لجدول admin_credentials في قاعدة البيانات
        try {
          await supabase
            .from("admin_credentials")
            .update({
              username: updatedUsername,
              full_name: updatedFullName,
              updated_at: new Date().toISOString(),
            })
            .eq("id", "vice_principal");
        } catch (dbErr) {
          console.warn("تنبيه: تعذر تحديث جدول admin_credentials التكميلي:", dbErr);
        }

        return { success: true };
      } catch (err: unknown) {
        console.error("Supabase Auth Error (updateUser Catch):", err);
        return {
          success: false,
          error: formatAuthErrorMessage(err),
        };
      }
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: Boolean(session && user),
        isLoading,
        login,
        logout,
        updateCredentials,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
