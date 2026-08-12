import axios from "axios";

export async function getIpLocation(ip: string): Promise<string> {
  if (!ip || ip === "unknown" || ip.startsWith("127.") || ip === "::1" || ip.startsWith("192.168.")) {
    return "内网 / 本地测试";
  }

  try {
    // 使用公开的 ip-api.com 查询地理位置 (免费且无需Key)
    const res = await axios.get(`http://ip-api.com/json/${ip}?lang=zh-CN`, { timeout: 3000 });
    if (res.data && res.data.status === "success") {
      const country = res.data.country || "";
      const region = res.data.regionName || "";
      const city = res.data.city || "";
      return `${country} ${region} ${city}`.trim() || "未知位置";
    }
  } catch (err) {
    // 降级处理
  }

  return "未知位置";
}
