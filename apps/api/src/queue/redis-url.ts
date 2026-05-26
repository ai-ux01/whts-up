import type { RedisOptions } from 'ioredis';

/** Strip accidental CLI flags (e.g. Upstash `redis-cli --tls -u redis://...`). */
export function normalizeRedisUrl(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/rediss?:\/\/[^\s'"]+/i);
  let url = match ? match[0] : trimmed;

  try {
    const parsed = new URL(url);
    if (
      parsed.hostname.endsWith('upstash.io') &&
      parsed.protocol === 'redis:'
    ) {
      parsed.protocol = 'rediss:';
      url = parsed.toString();
    }
  } catch {
    /* keep url as-is */
  }

  return url;
}

export function buildRedisOptions(url: string): RedisOptions {
  const useTls = url.startsWith('rediss://');
  return {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 10_000,
    lazyConnect: true,
    ...(useTls ? { tls: {} } : {}),
  };
}

export function pingWithTimeout(
  ping: () => Promise<string>,
  ms: number,
): Promise<string> {
  return Promise.race([
    ping(),
    new Promise<string>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Redis ping timed out after ${ms}ms`)),
        ms,
      );
    }),
  ]);
}
