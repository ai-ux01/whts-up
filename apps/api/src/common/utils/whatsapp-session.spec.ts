import {
  isSessionOpen,
  sessionExpiresAt,
  WHATSAPP_SESSION_MS,
} from './whatsapp-session';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const now = Date.now();
assert(
  isSessionOpen(new Date(now - WHATSAPP_SESSION_MS + 60_000)),
  'session should be open within 24h',
);
assert(!isSessionOpen(new Date(now - WHATSAPP_SESSION_MS - 1)), 'session closed after 24h');
assert(!isSessionOpen(null), 'no inbound means closed');
const expires = sessionExpiresAt(new Date(now));
assert(expires !== null && expires.getTime() > now, 'expiry in future');
console.log('whatsapp-session.spec.ts: ok');
