import { Request, Response } from "express";
import { getDb } from "./db";
import { captures } from "../drizzle/schema";
import { lt } from "drizzle-orm";
import { sdk } from "./_core/sdk";

export async function cleanupOldCapturesHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "Cron-only endpoint" });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }

    // 默认清理 30 天前的采集记录
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const deleted = await db.delete(captures).where(lt(captures.createdAt, thirtyDaysAgo));

    console.log(`[Scheduled Cleanup] Successfully cleaned up old captures older than 30 days.`);
    return res.json({ success: true, message: "Cleanup completed successfully" });
  } catch (error: any) {
    console.error("[Scheduled Cleanup] Error during cleanup:", error);
    return res.status(500).json({
      error: error.message || "Internal server error",
      stack: error.stack,
    });
  }
}
