import type { Request } from "express";

export type IpSource = "x-forwarded-for" | "x-real-ip" | "cf-connecting-ip" | "socket" | "unknown";

export interface NormalizedIp {
  ip: string;
  source: IpSource;
  isPrivate: boolean;
  isLoopback: boolean;
}

function stripPort(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("[") && trimmed.includes("]")) {
    return trimmed.slice(1, trimmed.indexOf("]"));
  }
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(trimmed)) {
    return trimmed.slice(0, trimmed.lastIndexOf(":"));
  }
  return trimmed;
}

export function normalizeIp(value: string | undefined | null): string {
  const raw = stripPort(value || "").replace(/^::ffff:/i, "").trim();
  if (!raw) return "unknown";
  return raw.toLowerCase();
}

function isIpv4(ip: string): boolean {
  const parts = ip.split(".");
  return parts.length === 4 && parts.every((part) => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
}

function isPrivateIpv4(ip: string): boolean {
  if (!isIpv4(ip)) return false;
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

function isPrivateIpv6(ip: string): boolean {
  return ip === "::1" || ip === "0:0:0:0:0:0:0:1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80:");
}

export function isPrivateOrReservedIp(ip: string): boolean {
  const normalized = normalizeIp(ip);
  return normalized === "unknown" || isPrivateIpv4(normalized) || isPrivateIpv6(normalized);
}

export function parseRequestIp(req: Request): NormalizedIp {
  const headers = req.headers;
  const forwarded = headers["x-forwarded-for"];
  const real = headers["x-real-ip"];
  const cloudflare = headers["cf-connecting-ip"];
  const socketIp = normalizeIp(req.socket.remoteAddress);
  const trustedProxyIps = (process.env.TRUSTED_PROXY_IPS || "")
    .split(",")
    .map((value) => normalizeIp(value))
    .filter((value) => value !== "unknown");
  const proxyIsTrusted = trustedProxyIps.includes(socketIp) || isPrivateOrReservedIp(socketIp);

  const candidates: Array<{ value: string | undefined; source: IpSource }> = [];
  if (proxyIsTrusted && typeof forwarded === "string") {
    forwarded.split(",").forEach((value) => candidates.push({ value, source: "x-forwarded-for" }));
  }
  if (proxyIsTrusted && typeof real === "string") candidates.push({ value: real, source: "x-real-ip" });
  if (proxyIsTrusted && typeof cloudflare === "string") candidates.push({ value: cloudflare, source: "cf-connecting-ip" });
  candidates.push({ value: socketIp, source: "socket" });

  const firstValid = candidates.find(({ value }) => normalizeIp(value) !== "unknown");
  const ip = normalizeIp(firstValid?.value);
  return {
    ip,
    source: firstValid?.source || "unknown",
    isPrivate: isPrivateOrReservedIp(ip),
    isLoopback: ip === "127.0.0.1" || ip === "::1",
  };
}
