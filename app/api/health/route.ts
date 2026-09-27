import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getAppBaseUrl } from "@/lib/appConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();
  const dbConnected = isSupabaseConfigured();

  const healthPayload = {
    status: dbConnected ? "healthy" : "degraded",
    version: "1.0.0",
    release: "Sprint-5-Production",
    timestamp,
    environment: process.env.NODE_ENV || "production",
    services: {
      frontend: "operational",
      database: dbConnected ? "connected" : "offline_local_storage_mode",
      storage: dbConnected ? "ready" : "local_fallback",
      securityAuth: "enforced",
    },
    systemMetrics: {
      uptimeSeconds: process.uptime ? Math.floor(process.uptime()) : 0,
      memoryUsage: process.memoryUsage ? process.memoryUsage() : null,
      baseUrl: getAppBaseUrl(),
    },
    officialAdmin: {
      name: "أحلام صالح الضبيبي",
      role: "وكيلة المدرسة",
      school: "الثانوية الخامسة مسارات",
    },
  };

  return NextResponse.json(healthPayload, {
    status: 200,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Release-Version": "1.0.0",
      "X-Production-Status": "Ready",
    },
  });
}
