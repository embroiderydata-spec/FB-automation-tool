import { NextResponse } from "next/server";
import { validateEnvironment } from "@/lib/config/env-validator";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  const envReport = validateEnvironment();

  return NextResponse.json({
    status: envReport.isValid ? "healthy" : "degraded",
    environment: envReport.environment,
    version: "2.8.0",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - startTime,
    checks: {
      environment: envReport.isValid ? "ok" : "warning",
      blockersCount: envReport.blockers.length,
      warningsCount: envReport.warnings.length,
    },
  });
}
