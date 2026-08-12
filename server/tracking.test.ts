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

describe("Tracking & Capture Router", () => {
  it("allows listing tracking links", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);
    const links = await caller.tracking.listLinks();
    expect(Array.isArray(links)).toBe(true);
  });

  it("allows listing captures", async () => {
    const ctx = createContext();
    const caller = appRouter.createCaller(ctx);
    const captures = await caller.captures.list({});
    expect(Array.isArray(captures)).toBe(true);
  });
});
