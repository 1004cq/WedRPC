export type RiskFlag =
  | "private_ip"
  | "proxy_ip"
  | "long_duration"
  | "rapid_repeat"
  | "gps_denied"
  | "fingerprint_missing"
  | "frequency_anomaly"
  | "duplicate_device"
  | "geo_anomaly"
  | "authorization_incomplete"
  | "authorization_complete";

export interface RiskContext {
  isPrivateIp: boolean;
  ipSource: string;
  durationSec: number;
  gps: string;
  fingerprint: string;
  collectionMode: string;
  recentRequests?: number;
  duplicateDevice?: boolean;
  geoAnomaly?: boolean;
  authorizationIncomplete?: boolean;
}

export function evaluateRisk(context: RiskContext): RiskFlag[] {
  const flags: RiskFlag[] = [];
  if (context.isPrivateIp) flags.push("private_ip");
  if (context.ipSource !== "socket" && context.ipSource !== "unknown") flags.push("proxy_ip");
  if (context.durationSec >= 120) flags.push("long_duration");
  if (!context.gps || /denied|unavailable|not supported/i.test(context.gps)) flags.push("gps_denied");
  if (!context.fingerprint || context.fingerprint === "unknown") flags.push("fingerprint_missing");
  if ((context.recentRequests || 0) >= 5) flags.push("frequency_anomaly");
  if (context.duplicateDevice) flags.push("duplicate_device");
  if (context.geoAnomaly) flags.push("geo_anomaly");
  if (context.authorizationIncomplete) flags.push("authorization_incomplete");
  if (context.collectionMode === "media" && !context.authorizationIncomplete) flags.push("authorization_complete");
  return flags;
}

export function isHighRisk(flags: string[] | undefined): boolean {
  if (!flags || flags.length === 0) return false;
  return flags.some((flag) => ["proxy_ip", "long_duration", "gps_denied", "fingerprint_missing", "frequency_anomaly", "duplicate_device", "geo_anomaly", "authorization_incomplete"].includes(flag));
}

export function formatRiskFlags(flags: string[]): string {
  return flags.join(",");
}
