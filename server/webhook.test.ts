import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  post: vi.fn().mockResolvedValue({ status: 200 }),
  get: vi.fn().mockResolvedValue({ status: 200 }),
  getSmtpSetting: vi.fn(),
}));

vi.mock("axios", () => ({ default: { post: mocks.post, get: mocks.get } }));
vi.mock("./db", () => ({ getSmtpSetting: mocks.getSmtpSetting }));

import { sendWebhookNotification } from "./webhook";

describe("Webhook notifications", () => {
  beforeEach(() => {
    mocks.post.mockClear();
    mocks.get.mockClear();
    mocks.getSmtpSetting.mockReset();
  });

  it("does not send low-risk events in high alert mode", async () => {
    mocks.getSmtpSetting.mockResolvedValue({ webhookUrl: "https://example.com/hook?token=secret", webhookType: "dingtalk", webhookAlertLevel: "high" });
    await sendWebhookNotification({ linkId: "demo", ip: "8.8.8.8", gps: "none", resolution: "1x1", filePath: "visit-only", createdAt: new Date(), userId: 1, riskFlags: "authorization_complete" });
    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it("sends all-mode events with risk variables expanded", async () => {
    mocks.getSmtpSetting.mockResolvedValue({ webhookUrl: "https://example.com/hook?token=secret", webhookType: "dingtalk", webhookAlertLevel: "all", webhookTemplate: "{linkId}|{collectionMode}|{riskFlags}" });
    await sendWebhookNotification({ linkId: "demo", ip: "8.8.8.8", gps: "none", resolution: "1x1", filePath: "visit-only", createdAt: new Date(), userId: 1, collectionMode: "visit", riskFlags: "frequency_anomaly" });
    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(mocks.post.mock.calls[0][1].text.content).toContain("demo|visit|frequency_anomaly");
  });
});
