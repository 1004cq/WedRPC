import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "export-test-user",
      email: "export@example.com",
      name: "Export Tester",
      loginMethod: "test",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { headers: { "user-agent": "Vitest Export Test" }, socket: { remoteAddress: "127.0.0.1" } } as any,
    res: {} as any,
  };
}

describe("protected exports", () => {
  it("creates a masked XLSX workbook with metadata", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.captures.exportXlsx({
      includeSensitive: false,
      limit: 10,
      columns: ["ID", "IP 地址", "GPS 定位", "风险标记"],
    });
    const workbook = XLSX.read(result.base64, { type: "base64" });
    expect(workbook.SheetNames).toEqual(expect.arrayContaining(["Captures", "Metadata"]));
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets.Captures, { header: 1 }) as unknown[][];
    expect(rows[0]).toEqual(["ID", "IP 地址", "GPS 定位", "风险标记"]);
    const metadata = XLSX.utils.sheet_to_json(workbook.Sheets.Metadata, { header: 1 }) as unknown[][];
    expect(metadata.some((row) => row[0] === "敏感字段" && row[1] === "已脱敏")).toBe(true);
  });
});
