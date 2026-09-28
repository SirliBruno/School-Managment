import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Health Check API Endpoint (Sanitized for Production Security)
 * Confirms system liveness and service availability without leaking internal
 * server memory statistics, heap allocations, or infrastructure paths.
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  const dbConnected = isSupabaseConfigured();

  const healthPayload = {
    status: dbConnected ? "healthy" : "degraded",
    version: "1.0.0",
    release: "Sprint-10-Production",
    timestamp,
    services: {
      frontend: "operational",
      database: dbConnected ? "connected" : "offline_local_storage_mode",
      storage: dbConnected ? "ready" : "local_fallback",
      securityAuth: "enforced",
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
