import { describe, expect, it } from "vitest";
import { sendCaptureNotification } from "./email";

describe("Email SMTP Notification", () => {
  it("should handle missing SMTP config gracefully without throwing", async () => {
    // Wenn keine SMTP-Variablen gesetzt sind, bricht die Funktion sicher ab
    const originalHost = process.env.SMTP_HOST;
    delete process.env.SMTP_HOST;

    await expect(
      sendCaptureNotification({
        linkId: "test-id",
        ip: "127.0.0.1",
        gps: "Test GPS",
        resolution: "1920x1080",
        filePath: "https://example.com/test.png",
        createdAt: new Date(),
      })
    ).resolves.not.toThrow();

    process.env.SMTP_HOST = originalHost;
  });
});
