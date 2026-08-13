import { z } from "zod";
import { notifyOwner } from "./notification";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { ENV } from "./env";
import { adminProcedure, publicProcedure, router } from "./trpc";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(async () => {
      let database = false;
      let forgeReachable = false;
      try {
        const db = await getDb();
        if (db) {
          await db.execute(sql`SELECT 1`);
          database = true;
        }
      } catch (error) {
        console.warn(JSON.stringify({ event: "health.database_failed", error: error instanceof Error ? error.message : String(error) }));
      }
      if (ENV.forgeApiUrl && ENV.forgeApiKey) {
        try {
          const response = await fetch(ENV.forgeApiUrl, { method: "HEAD", headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }, signal: AbortSignal.timeout(2000) });
          forgeReachable = response.status < 500;
        } catch (error) {
          console.warn(JSON.stringify({ event: "health.forge_failed", error: error instanceof Error ? error.message : String(error) }));
        }
      }
      return {
        ok: database && forgeReachable,
        dependencies: { database, storage: forgeReachable, notifications: forgeReachable, forgeReachable },
        timestamp: new Date().toISOString(),
      };
    }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
