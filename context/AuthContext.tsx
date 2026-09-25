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
 * ترجمة رسائل أخطاء Supabase Auth إلى لغة عربية واضحة ومفهومة للمستخدم
 */
export const mapSupabaseAuthError = (err: unknown): string => {
  if (!err) return "حدث خطأ غير متوقع أثناء عملية المصادقة";

  const errorObj = err as { message?: string; error_description?: string; code?: string };
  const msg = (errorObj.message || errorObj.error_description || "").toLowerCase();
  const code = (errorObj.code || "").toLowerCase();

  if (
    msg.includes("invalid login credentials") ||
    msg.includes("invalid_credentials") ||
    code === "invalid_credentials" ||
    msg.includes("invalid username or password")
  ) {
    return "بيانات الاعتماد غير صحيحة، يرجى التأكد من البريد الإلكتروني / اسم المستخدم وكلمة المرور";
  }

  if (
    msg.includes("email not confirmed") ||
    code === "email_not_confirmed" ||
    msg.includes("email address not confirmed")
  ) {
    return "البريد الإلكتروني لم يتم تأكيده بعد. يرجى تفعيل الحساب من الرسالة المرسلة لبريدك، أو تعطيل خيار تأكيد البريد في إعدادات Supabase";
  }

  if (
    msg.includes("invalid email") ||
    msg.includes("unable to validate email") ||
    code === "validation_failed"
  ) {
    return "صيغة البريد الإلكتروني غير صالحة. يرجى كتابة بريد إلكتروني صحيح (مثال: admin@school.com)";
  }

  if (msg.includes("user not found") || code === "user_not_found") {
    return "لا يوجد حساب مسجل بهذه البيانات في Supabase";
  }

  if (
    msg.includes("password should be at least") ||
    msg.includes("weak_password") ||
    msg.includes("password is too short")
  ) {
    return "يجب ألا تقل كلمة المرور عن 6 خانات وفقاً لسياسات أمان Supabase";
  }

  if (
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit"
  ) {
    return "تم تجاوز الحد المسموح به من المحاولات، يرجى الانتظار قليلاً ثم إعادة المحاولة";
  }

  if (
    msg.includes("network") ||
    msg.includes("failed to fetch") ||
    msg.includes("fetch failed") ||
    msg.includes("connection refused")
  ) {
    return "تعذر الاتصال بخادم Supabase، يرجى التأكد من اتصال الإنترنت وصحة إعدادات .env";
  }

  if (msg.includes("auth session missing")) {
    return "انتهت جلسة تسجيل الدخول الحالية، يرجى تسجيل الدخول مجدداً";
  }

  return errorObj.message || "فشلت عملية المصادقة، يرجى المحاولة مرة أخرى";
};

/**
 * استخراج بيانات المستخدم الإدارية من مستخدم وجلسة Supabase
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

  // إدارة جلسة المستخدم الحقيقية بالكامل عبر Supabase Auth
  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured() || !supabase) {
      console.warn("Supabase غير مهيأ، يرجى التحقق من متغيرات البيئة في .env");
      setIsLoading(false);
      return;
    }

    // 1. جلب الجلسة الحالية المخزنة في Supabase Auth Client
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (!error && data.session) {
          setSession(data.session);
          setUser(extractAdminUser(data.session.user));
        } else {
          setSession(null);
          setUser(null);
        }
      })
      .catch((err) => {
        console.error("خطأ أثناء استرجاع جلسة Supabase:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    // 2. الاستماع الفوري واللحظي لتغيرات حالة المصادقة (onAuthStateChange)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
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
          error: "يرجى إدخال البريد الإلكتروني / اسم المستخدم وكلمة المرور",
        };
      }

      if (!isSupabaseConfigured() || !supabase) {
        return {
          success: false,
          error:
            "إعدادات الربط مع Supabase غير متوفرة في ملف .env (تأكد من NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY أو VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY)",
        };
      }

      // تحديد البريد الإلكتروني: إذا تم إدخال بريد إلكتروني صريح يحتوي على @، نستخدمه مباشرة
      // إذا كان اسم مستخدم بدون @، نجهزه بصيغة بريد افتراضية متوافقة
      const targetEmail = cleanIdentifier.includes("@")
        ? cleanIdentifier
        : `${cleanIdentifier}@school.edu.sa`;

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password: password,
        });

        if (error) {
          // إذا فشل بالبريد الافتراضي وكان الإدخال اسم مستخدم فقط، نجرب صيغة أخرى شائعة (@school.com)
          if (!cleanIdentifier.includes("@") && error.message.includes("Invalid login credentials")) {
            const secondAttempt = await supabase.auth.signInWithPassword({
              email: `${cleanIdentifier}@school.com`,
              password: password,
            });

            if (!secondAttempt.error && secondAttempt.data.session) {
              setSession(secondAttempt.data.session);
              setUser(extractAdminUser(secondAttempt.data.session.user));
              return { success: true };
            }
          }

          return {
            success: false,
            error: mapSupabaseAuthError(error),
          };
        }

        if (data.session) {
          setSession(data.session);
          setUser(extractAdminUser(data.session.user));
          return { success: true };
        }

        return {
          success: false,
          error: "لم يتم إنشاء جلسة الدخول بنجاح، يرجى المحاولة لاحقاً",
        };
      } catch (err) {
        return {
          success: false,
          error: mapSupabaseAuthError(err),
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
   * تحديث بيانات المستخدم (اسم المستخدم، الاسم الكامل، وكلمة المرور) في Supabase Auth برمجياً
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

        const { data, error } = await supabase.auth.updateUser(updatePayload);

        if (error) {
          return {
            success: false,
            error: mapSupabaseAuthError(error),
          };
        }

        if (data.user) {
          const updated = extractAdminUser(data.user);
          setUser(updated);
        }

        // مزامنة إضافية لجدول admin_credentials (إن وجد كجدول مكمل)
        try {
          await supabase.from("admin_credentials").upsert({
            id: "vice_principal",
            username: updatedUsername,
            full_name: updatedFullName,
            role: currentMeta.role || "vice_principal",
            updated_at: new Date().toISOString(),
          });
        } catch {
          // تجاوز إذا كان الجدول غير مستخدم
        }

        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: mapSupabaseAuthError(err),
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
