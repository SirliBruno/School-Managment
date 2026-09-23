"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { hashPassword, verifyPassword } from "@/lib/authCrypto";

export interface AdminUser {
  username: string;
  fullName: string;
  role: string;
}

interface StoredCredentials {
  username: string;
  passwordHash: string;
  fullName: string;
  role: string;
  updatedAt: string;
}

interface AuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    username: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateCredentials: (
    newUsername: string,
    newPassword?: string,
    newFullName?: string
  ) => Promise<{ success: boolean; error?: string }>;
}

const SESSION_KEY = "school_admin_session_v1";
const LOCAL_CREDS_KEY = "school_admin_credentials_v1";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours session validity

interface StoredSession {
  user: AdminUser;
  expiresAt: number;
}

// Helper to set secure cookie
const setSessionCookie = (user: AdminUser, maxAgeSeconds: number) => {
  if (typeof document !== "undefined") {
    const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
    document.cookie = `school_admin_auth=${encodeURIComponent(
      user.username
    )}; Path=/; max-age=${maxAgeSeconds}; SameSite=Strict${isHttps ? "; Secure" : ""}`;
  }
};

const clearSessionCookie = () => {
  if (typeof document !== "undefined") {
    document.cookie = "school_admin_auth=; Path=/; max-age=0; SameSite=Strict";
  }
};

// الحساب الافتراضي للوكيلة: wakila / 123456
const DEFAULT_STORED_CREDS: StoredCredentials = {
  username: "wakila",
  passwordHash:
    "b70712d928b2a236fb29eaed2cd9d9720885bb65609b4063e15df5d4ca28019c", // hash for '123456'
  fullName: "وكيلة الشؤون التعليمية",
  role: "vice_principal",
  updatedAt: new Date().toISOString(),
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // استرجاع والتحقق من صلاحية الجلسة الحالية عند الإقلاع
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const savedSession = localStorage.getItem(SESSION_KEY);
        if (savedSession) {
          const parsed = JSON.parse(savedSession);
          // Check expiration
          const expiresAt = parsed.expiresAt as number | undefined;
          if (expiresAt && Date.now() > expiresAt) {
            console.info("انتهت صلاحية جلسة تسجيل الدخول الإدارية (تجاوزت 12 ساعة).");
            localStorage.removeItem(SESSION_KEY);
            clearSessionCookie();
            setUser(null);
          } else {
            const activeUser: AdminUser = parsed.user || {
              username: parsed.username,
              fullName: parsed.fullName || "وكيلة الشؤون التعليمية",
              role: parsed.role || "vice_principal",
            };
            setUser(activeUser);
            // Refresh cookie
            setSessionCookie(activeUser, 12 * 60 * 60);
          }
        }
      }
    } catch (e) {
      console.error("خطأ في قراءة الجلسة المحفوظة:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Periodic session expiration check (every 5 minutes)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      try {
        const saved = localStorage.getItem(SESSION_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
            localStorage.removeItem(SESSION_KEY);
            clearSessionCookie();
            setUser(null);
          }
        }
      } catch {}
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  /**
   * جلب بيانات الاعتماد المخزنة (من سوبابيز أولاً مع استخدام التخزين المحلي كاحتياطي)
   */
  const getStoredCredentials = useCallback(async (): Promise<StoredCredentials> => {
    // 1. محاولة الجلب من سوبابيز إذا كانت متصلة
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from("admin_credentials")
          .select("*")
          .eq("id", "vice_principal")
          .maybeSingle();

        if (!error && data && data.username && data.password_hash) {
          const creds: StoredCredentials = {
            username: data.username,
            passwordHash: data.password_hash,
            fullName: data.full_name || "وكيلة الشؤون التعليمية",
            role: data.role || "vice_principal",
            updatedAt: data.updated_at || new Date().toISOString(),
          };
          // تحديث النسخة المحلية
          if (typeof window !== "undefined") {
            localStorage.setItem(LOCAL_CREDS_KEY, JSON.stringify(creds));
          }
          return creds;
        }
      } catch (e) {
        console.warn("تعذر الاستعلام من سوبابيز لبيانات الحساب، الانتقال للنسخة المحلية:", e);
      }
    }

    // 2. القراءة من التخزين المحلي
    if (typeof window !== "undefined") {
      try {
        const local = localStorage.getItem(LOCAL_CREDS_KEY);
        if (local) {
          return JSON.parse(local) as StoredCredentials;
        }
      } catch (e) {
        console.error("خطأ في قراءة بيانات الحساب المحلية:", e);
      }
    }

    // 3. القيمة الافتراضية
    return DEFAULT_STORED_CREDS;
  }, []);

  /**
   * تسجيل الدخول
   */
  const login = useCallback(
    async (
      username: string,
      password: string
    ): Promise<{ success: boolean; error?: string }> => {
      const cleanUser = username.trim();
      if (!cleanUser || !password) {
        return { success: false, error: "يرجى كتابة اسم المستخدم وكلمة المرور" };
      }

      const creds = await getStoredCredentials();

      // مطابقة اسم المستخدم
      if (cleanUser.toLowerCase() !== creds.username.toLowerCase()) {
        return {
          success: false,
          error: "اسم المستخدم أو كلمة المرور غير صحيحة",
        };
      }

      // مطابقة كلمة المرور
      const isMatch = await verifyPassword(password, creds.passwordHash);
      if (!isMatch) {
        return {
          success: false,
          error: "اسم المستخدم أو كلمة المرور غير صحيحة",
        };
      }

      // نجاح الدخول - حفظ الجلسة الآمنة بمهلة 12 ساعة
      const activeUser: AdminUser = {
        username: creds.username,
        fullName: creds.fullName,
        role: creds.role,
      };

      const expiresAt = Date.now() + SESSION_TTL_MS;
      const sessionData: StoredSession = {
        user: activeUser,
        expiresAt,
      };

      setUser(activeUser);
      if (typeof window !== "undefined") {
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        setSessionCookie(activeUser, 12 * 60 * 60);
      }

      return { success: true };
    },
    [getStoredCredentials]
  );

  /**
   * تسجيل الخروج
   */
  const logout = useCallback(() => {
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(SESSION_KEY);
      clearSessionCookie();
    }
  }, []);

  /**
   * تحديث اسم المستخدم أو كلمة المرور
   */
  const updateCredentials = useCallback(
    async (
      newUsername: string,
      newPassword?: string,
      newFullName?: string
    ): Promise<{ success: boolean; error?: string }> => {
      const cleanUser = newUsername.trim();
      if (!cleanUser) {
        return { success: false, error: "اسم المستخدم لا يمكن أن يكون فارغاً" };
      }

      if (cleanUser.length < 3) {
        return {
          success: false,
          error: "اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل",
        };
      }

      if (newPassword && newPassword.length < 4) {
        return {
          success: false,
          error: "كلمة المرور يجب أن تتكون من 4 خانات على الأقل",
        };
      }

      const currentCreds = await getStoredCredentials();
      const updatedHash = newPassword
        ? await hashPassword(newPassword)
        : currentCreds.passwordHash;
      const updatedFullName = newFullName?.trim() || currentCreds.fullName;

      const newCreds: StoredCredentials = {
        username: cleanUser,
        passwordHash: updatedHash,
        fullName: updatedFullName,
        role: currentCreds.role,
        updatedAt: new Date().toISOString(),
      };

      // 1. التحديث المحلي
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_CREDS_KEY, JSON.stringify(newCreds));
      }

      // 2. التحديث في سوبابيز
      if (isSupabaseConfigured() && supabase) {
        try {
          const { error } = await supabase.from("admin_credentials").upsert({
            id: "vice_principal",
            username: newCreds.username,
            password_hash: newCreds.passwordHash,
            full_name: newCreds.fullName,
            role: newCreds.role,
            updated_at: newCreds.updatedAt,
          });
          if (error) {
            console.warn("تنبيه مزامنة سوبابيز عند تحديث الحساب:", error.message);
          }
        } catch (err) {
          console.warn("تعذر رفع تحديث الحساب لسوبابيز:", err);
        }
      }

      // 3. تحديث الجلسة النشطة
      const updatedUser: AdminUser = {
        username: newCreds.username,
        fullName: newCreds.fullName,
        role: newCreds.role,
      };

      const expiresAt = Date.now() + SESSION_TTL_MS;
      const updatedSession: StoredSession = {
        user: updatedUser,
        expiresAt,
      };

      setUser(updatedUser);
      if (typeof window !== "undefined") {
        localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
        setSessionCookie(updatedUser, 12 * 60 * 60);
      }

      return { success: true };
    },
    [getStoredCredentials]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
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
