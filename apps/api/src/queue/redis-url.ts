/** Strip accidental CLI flags (e.g. Upstash `redis-cli --tls -u redis://...`). */
export function normalizeRedisUrl(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/rediss?:\/\/[^\s'"]+/i);
  return match ? match[0] : trimmed;
}
