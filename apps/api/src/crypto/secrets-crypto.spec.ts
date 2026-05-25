import { SecretsCryptoService } from './secrets-crypto.service';
import { ConfigService } from '@nestjs/config';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const key = Buffer.alloc(32, 7).toString('base64');
const config = {
  get: (k: string) => (k === 'ENCRYPTION_KEY' ? key : undefined),
} as ConfigService;

const crypto = new SecretsCryptoService(config);
const plain = 'EAAtest-token-12345';
const enc = crypto.encrypt(plain);
assert(enc.startsWith('enc:v1:'), 'encrypted prefix');
assert(crypto.decrypt(enc) === plain, 'roundtrip');
assert(crypto.decryptIfNeeded(enc) === plain, 'decryptIfNeeded encrypted');
assert(crypto.decryptIfNeeded(plain) === plain, 'legacy plain passthrough');
console.log('secrets-crypto.spec.ts: ok');
