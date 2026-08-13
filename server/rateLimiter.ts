const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function getRateLimitInfo(ip: string, linkId: string, maxRequests = 10, windowMs = 60000) {
  const key = `${ip}_${linkId}`;
  const now = Date.now();
  const record = rateLimitMap.get(key);
  if (!record || now > record.resetTime) return { count: 0, maxRequests, resetTime: now + windowMs };
  return { count: record.count, maxRequests, resetTime: record.resetTime };
}

export function checkRateLimit(ip: string, linkId: string, maxRequests = 10, windowMs = 60000): boolean {
  const key = `${ip}_${linkId}`;
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false; // 超出频率限制
  }

  record.count += 1;
  return true;
}
