import { createClient, SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://xizppykmqfkvzwcwxuzr.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpenBweWttcWZrdnp3Y3d4dXpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2ODM2OTIsImV4cCI6MjEwNTI1OTY5Mn0._iroj7_9HI_UFDhCV_ybL9l-8oVCz9x8wVP3ys-LnyE";

export const supabaseUrl: string =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  DEFAULT_SUPABASE_URL;

export const supabaseAnonKey: string =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      supabaseAnonKey.trim() !== "" &&
      !supabaseAnonKey.includes("YOUR_SUPABASE_ANON_KEY")
  );
};

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// تصدير الاسم البديل supabaseClient لمطابقة أي استدعاءات خارجية
export const supabaseClient = supabase;

if (typeof window !== "undefined") {
  console.info("[Supabase Client] مهيأ بنجاح:", {
    url: supabaseUrl,
    hasAnonKey: Boolean(supabaseAnonKey),
  });
}


