import { Request, Response } from "express";
import { getDb } from "./db";
import { captures, trackingLinks } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { sdk } from "./_core/sdk";
import { logAudit } from "./audit";

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

    const rows = await db
      .select({ capture: captures, link: trackingLinks })
      .from(captures)
      .leftJoin(trackingLinks, eq(captures.linkId, trackingLinks.id));

    const now = Date.now();
    const candidates = rows.filter(({ capture, link }) => {
      const retentionDays = Math.max(1, link?.retentionDays || 30);
      return now - new Date(capture.createdAt).getTime() > retentionDays * 24 * 60 * 60 * 1000;
    }).slice(0, 5000);

    for (const { capture } of candidates) {
      await db.delete(captures).where(eq(captures.id, capture.id));
    }

    await logAudit(null, "TTL_CLEANUP", JSON.stringify({ deleted: candidates.length, mediaReferencesUnlinked: candidates.filter(({ capture }) => capture.filePath && capture.filePath !== "visit-only").length, taskUid: user.taskUid }), req.socket.remoteAddress, { targetType: "retention_cleanup", targetId: user.taskUid, userAgent: String(req.headers["user-agent"] || "heartbeat"), result: "success" });
    console.log(`[Scheduled Cleanup] Removed ${candidates.length} expired capture records.`);
    return res.json({ success: true, deleted: candidates.length, mediaReferencesUnlinked: candidates.length });
  } catch (error: any) {
    console.error("[Scheduled Cleanup] Error during cleanup:", error);
    return res.status(500).json({
      error: error.message || "Internal server error",
      stack: error.stack,
    });
  }
}
