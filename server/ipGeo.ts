import axios from "axios";

const geoCache = new Map<string, string>();

export async function getIpLocation(ip: string): Promise<string> {
  const cleanIp = ip.replace(/^::ffff:/, "").trim();
  if (
    !cleanIp ||
    cleanIp === "unknown" ||
    cleanIp === "127.0.0.1" ||
    cleanIp === "localhost" ||
    cleanIp === "::1" ||
    cleanIp.startsWith("192.168.") ||
    cleanIp.startsWith("10.") ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanIp)
  ) {
    return "本地内网 (Local Network)";
  }

  if (geoCache.has(cleanIp)) {
    return geoCache.get(cleanIp)!;
  }

  try {
    const response = await axios.get(`http://ip-api.com/json/${cleanIp}?lang=zh-CN`, { timeout: 3000 });
    const data = response.data;
    if (data && data.status === "success") {
      const country = data.country || "";
      const region = data.regionName || "";
      const city = data.city || "";
      const isp = data.isp || "";
      const result = `${country} ${region} ${city} (${isp})`.trim();
      geoCache.set(cleanIp, result);
      return result;
    }
  } catch (err) {
    try {
      const res2 = await axios.get(`https://ipapi.co/${cleanIp}/json/`, { timeout: 3000 });
      const d2 = res2.data;
      if (d2 && d2.country_name) {
        const result = `${d2.country_name} ${d2.region || ""} ${d2.city || ""} (${d2.org || ""})`.trim();
        geoCache.set(cleanIp, result);
        return result;
      }
    } catch (e2) {
      // ignore
    }
  }

  return "未知属地 (Unknown Location)";
}
