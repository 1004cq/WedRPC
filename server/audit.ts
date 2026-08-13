import { getDb } from "./db";
import { createHash } from "node:crypto";
import { auditLogs } from "../drizzle/schema";

export async function logAudit(
  userId: number | null | undefined,
  action: string,
  details?: string,
  ip?: string,
  meta?: { targetType?: string; targetId?: string; result?: "success" | "failure"; userAgent?: string },
) {
  try {
    const db = await getDb();
    if (!db) return;
    const createdAt = new Date();
    const result = meta?.result || "success";
    const integrityHash = createHash("sha256")
      .update(JSON.stringify({ userId: userId || null, action, details: details || null, ip: ip || null, createdAt: createdAt.toISOString(), result }))
      .digest("hex");
    await db.insert(auditLogs).values({
      userId: userId || null,
      action,
      details: details || null,
      targetType: meta?.targetType || null,
      targetId: meta?.targetId || null,
      result,
      ip: ip || null,
      userAgent: meta?.userAgent || null,
      integrityHash,
      createdAt,
    });
  } catch (err) {
    console.error("[Audit] Failed to write audit log:", err);
  }
}
