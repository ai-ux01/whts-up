export {};

import {
  normalizePhone,
  extractIgsid,
  resolveSmsProvider,
  resolveEmailProvider,
  toEmailHtml,
} from './messaging.util';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

console.log('--- Running messaging.util.spec.ts ---');

// normalizePhone
assert(normalizePhone('9876543210') === '+919876543210', 'IN 10-digit should get +91');
assert(normalizePhone('+14155550123') === '+14155550123', 'E.164 should pass through');
assert(normalizePhone(' 98765 43210 ') === '+919876543210', 'spaces stripped, +91 added');
assert(normalizePhone('442071838750') === '+442071838750', 'non-10-digit gets leading +');
console.log('✔ normalizePhone');

// extractIgsid
assert(extractIgsid('17841400000000000') === '17841400000000000', 'numeric IGSID accepted');
assert(extractIgsid('@some_user') === null, 'username rejected');
assert(extractIgsid('+919876543210') === null, 'phone rejected as IGSID');
assert(extractIgsid('12345') === null, 'too-short numeric rejected');
console.log('✔ extractIgsid');

// resolveSmsProvider
assert(resolveSmsProvider({}) === 'mock', 'no creds -> mock');
assert(
  resolveSmsProvider({ TWILIO_ACCOUNT_SID: 'AC', TWILIO_AUTH_TOKEN: 'tok' }) === 'twilio',
  'twilio creds -> twilio',
);
assert(resolveSmsProvider({ MSG91_AUTH_KEY: 'k' }) === 'msg91', 'msg91 creds -> msg91');
assert(
  resolveSmsProvider({ SMS_PROVIDER: 'mock', MSG91_AUTH_KEY: 'k' }) === 'mock',
  'explicit override wins',
);
console.log('✔ resolveSmsProvider');

// resolveEmailProvider
assert(resolveEmailProvider({}) === 'mock', 'no creds -> mock');
assert(resolveEmailProvider({ RESEND_API_KEY: 're' }) === 'resend', 'resend creds -> resend');
assert(
  resolveEmailProvider({ SENDGRID_API_KEY: 'sg' }) === 'sendgrid',
  'sendgrid creds -> sendgrid',
);
assert(
  resolveEmailProvider({ EMAIL_PROVIDER: 'sendgrid', RESEND_API_KEY: 're' }) === 'sendgrid',
  'explicit override wins',
);
console.log('✔ resolveEmailProvider');

// toEmailHtml
assert(toEmailHtml('<p>hi</p>') === '<p>hi</p>', 'existing HTML passes through');
assert(toEmailHtml('a & b\nc').includes('a &amp; b<br/>c'), 'plain text escaped + <br/>');
console.log('✔ toEmailHtml');

console.log('messaging.util.spec.ts: ok');
