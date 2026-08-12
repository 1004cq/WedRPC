import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: { "user-agent": "Vitest Test Agent", "x-forwarded-for": "127.0.0.1" },
      socket: { remoteAddress: "127.0.0.1" },
    } as any,
    res: {} as any,
  };
}

describe("Comprehensive Tracking & Capture Tests", () => {
  const testLinkId = `test-link-${Date.now()}`;

  it("should create a tracking link successfully", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tracking.createLink({
      id: testLinkId,
      redirectUrl: "https://example.com/target",
    });

    expect(result).toEqual({ success: true, id: testLinkId });
  });

  it("should retrieve the created tracking link", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    const link = await caller.tracking.getLink({ id: testLinkId });
    expect(link).not.toBeNull();
    expect(link?.redirectUrl).toBe("https://example.com/target");
  });

  it("should list captures successfully", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    const captures = await caller.captures.list({});
    expect(Array.isArray(captures)).toBe(true);
  });

  it("should delete the tracking link and associated data", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);

    const res = await caller.tracking.deleteLink({ id: testLinkId });
    expect(res).toEqual({ success: true });

    const link = await caller.tracking.getLink({ id: testLinkId });
    expect(link).toBeNull();
  });
});
