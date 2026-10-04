process.env.TOKEN_ENCRYPTION_KEY = require('crypto').randomBytes(32).toString('hex');

import { encrypt, decrypt } from './crypto';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('PASS:', msg);
}

const secret = '1//09example-refresh-token-value';
const ciphertext = encrypt(secret);

assert(ciphertext !== secret, 'ciphertext does not equal plaintext');
assert(decrypt(ciphertext) === secret, 'decrypt reverses encrypt');

const ciphertext2 = encrypt(secret);
assert(ciphertext2 !== ciphertext, 'encrypting the same value twice gives different output (random IV)');
assert(decrypt(ciphertext2) === secret, 'second ciphertext still decrypts correctly');

let tamperedThrew = false;
try {
  const raw = Buffer.from(ciphertext, 'base64');
  raw[raw.length - 1] ^= 0xff; // flip a byte in the ciphertext
  decrypt(raw.toString('base64'));
} catch {
  tamperedThrew = true;
}
assert(tamperedThrew, 'tampered ciphertext fails auth tag check instead of decrypting silently');

console.log('\nAll crypto tests passed.');
