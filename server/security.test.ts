import { describe, expect, it } from "vitest";
import { isPrivateOrReservedIp, normalizeIp, parseRequestIp } from "./ip";
import { evaluateRisk, isHighRisk } from "./risk";

describe("request IP normalization", () => {
  it("normalizes IPv4-mapped IPv6 addresses", () => {
    expect(normalizeIp("::ffff:192.168.1.10")).toBe("192.168.1.10");
  });

  it("detects common private ranges", () => {
    expect(isPrivateOrReservedIp("10.2.3.4")).toBe(true);
    expect(isPrivateOrReservedIp("172.20.1.4")).toBe(true);
    expect(isPrivateOrReservedIp("192.168.1.4")).toBe(true);
    expect(isPrivateOrReservedIp("8.8.8.8")).toBe(false);
  });

  it("prefers the first forwarded address when the proxy socket is private", () => {
    const request = {
      headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
      socket: { remoteAddress: "10.0.0.2" },
    } as any;
    const result = parseRequestIp(request);
    expect(result.ip).toBe("203.0.113.10");
    expect(result.source).toBe("x-forwarded-for");
  });

  it("ignores forwarded headers from an untrusted public socket", () => {
    const request = {
      headers: { "x-forwarded-for": "203.0.113.10" },
      socket: { remoteAddress: "198.51.100.8" },
    } as any;
    const result = parseRequestIp(request);
    expect(result.ip).toBe("198.51.100.8");
    expect(result.source).toBe("socket");
  });
});

describe("risk rules", () => {
  it("marks proxy and missing GPS/fingerprint as high risk", () => {
    const flags = evaluateRisk({
      isPrivateIp: false,
      ipSource: "x-forwarded-for",
      durationSec: 5,
      gps: "Permission Denied / Unavailable",
      fingerprint: "unknown",
      collectionMode: "media",
    });
    expect(flags).toContain("proxy_ip");
    expect(isHighRisk(flags)).toBe(true);
  });

  it("does not treat an ordinary complete visit as high risk", () => {
    const flags = evaluateRisk({
      isPrivateIp: false,
      ipSource: "socket",
      durationSec: 10,
      gps: "31.2, 121.4",
      fingerprint: "canvas-hash",
      collectionMode: "visit",
    });
    expect(isHighRisk(flags)).toBe(false);
  });
});
