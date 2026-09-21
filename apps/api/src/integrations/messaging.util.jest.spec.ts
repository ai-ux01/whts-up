import {
  normalizePhone,
  extractIgsid,
  resolveSmsProvider,
  resolveEmailProvider,
  toEmailHtml,
} from './messaging.util';

describe('messaging.util', () => {
  describe('normalizePhone', () => {
    it('adds +91 to a 10-digit Indian number', () => {
      expect(normalizePhone('9876543210')).toBe('+919876543210');
    });
    it('passes through E.164 numbers', () => {
      expect(normalizePhone('+14155550123')).toBe('+14155550123');
    });
    it('strips spaces before normalizing', () => {
      expect(normalizePhone(' 98765 43210 ')).toBe('+919876543210');
    });
    it('prefixes + for non-10-digit numbers', () => {
      expect(normalizePhone('442071838750')).toBe('+442071838750');
    });
  });

  describe('extractIgsid', () => {
    it('accepts a long numeric IGSID', () => {
      expect(extractIgsid('17841400000000000')).toBe('17841400000000000');
    });
    it.each(['@user', '+919876543210', '12345'])('rejects %s', (v) => {
      expect(extractIgsid(v)).toBeNull();
    });
  });

  describe('resolveSmsProvider', () => {
    it('defaults to mock with no creds', () => {
      expect(resolveSmsProvider({})).toBe('mock');
    });
    it('detects twilio', () => {
      expect(
        resolveSmsProvider({ TWILIO_ACCOUNT_SID: 'AC', TWILIO_AUTH_TOKEN: 'tok' }),
      ).toBe('twilio');
    });
    it('detects msg91', () => {
      expect(resolveSmsProvider({ MSG91_AUTH_KEY: 'k' })).toBe('msg91');
    });
    it('honours explicit override', () => {
      expect(resolveSmsProvider({ SMS_PROVIDER: 'mock', MSG91_AUTH_KEY: 'k' })).toBe('mock');
    });
  });

  describe('resolveEmailProvider', () => {
    it('defaults to mock', () => {
      expect(resolveEmailProvider({})).toBe('mock');
    });
    it('detects resend and sendgrid', () => {
      expect(resolveEmailProvider({ RESEND_API_KEY: 're' })).toBe('resend');
      expect(resolveEmailProvider({ SENDGRID_API_KEY: 'sg' })).toBe('sendgrid');
    });
  });

  describe('toEmailHtml', () => {
    it('passes through existing HTML', () => {
      expect(toEmailHtml('<p>hi</p>')).toBe('<p>hi</p>');
    });
    it('escapes and wraps plain text', () => {
      expect(toEmailHtml('a & b\nc')).toContain('a &amp; b<br/>c');
    });
  });
});
