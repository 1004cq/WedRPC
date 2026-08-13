import { getDb } from "./db";
import { auditLogs } from "../drizzle/schema";

export async function logAudit(userId: number | null | undefined, action: string, details?: string, ip?: string) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(auditLogs).values({
      userId: userId || null,
      action,
      details: details || null,
      ip: ip || null,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("[Audit] Failed to write audit log:", err);
  }
}
