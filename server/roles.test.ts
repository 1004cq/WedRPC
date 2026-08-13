import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listUsers: vi.fn().mockResolvedValue([{ id: 2, openId: "user-2", name: "User Two", email: "two@example.com", role: "viewer", createdAt: new Date(), lastSignedIn: new Date() }]),
  updateUserRole: vi.fn().mockResolvedValue(undefined),
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./db", async (importOriginal) => ({ ...(await importOriginal<typeof import("./db")>()), listUsers: mocks.listUsers, updateUserRole: mocks.updateUserRole }));
vi.mock("./audit", () => ({ logAudit: mocks.logAudit }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  return {
    user: { id: 1, openId: "admin", email: "admin@example.com", name: "Admin", loginMethod: "test", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { headers: { "user-agent": "Vitest Role Test" }, socket: { remoteAddress: "127.0.0.1" } } as any,
    res: {} as any,
  };
}

describe("administrator role management", () => {
  it("lists users for administrators", async () => {
    const result = await appRouter.createCaller(createContext()).status.users.list();
    expect(result[0].role).toBe("viewer");
    expect(mocks.listUsers).toHaveBeenCalledTimes(1);
  });

  it("updates another user's role and protects self-demotion", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.status.users.updateRole({ userId: 2, role: "operator" })).resolves.toEqual({ success: true });
    expect(mocks.updateUserRole).toHaveBeenCalledWith(2, "operator");
    await expect(caller.status.users.updateRole({ userId: 1, role: "viewer" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
