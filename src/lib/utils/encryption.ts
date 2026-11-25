import crypto from 'node:crypto';

import { env } from '@/env/server';

const ALGORITHM = 'aes-256-gcm';

// NIST SP 800-38D recommends a 96-bit (12-byte) IV for GCM; 16-byte IVs remain
// supported when decrypting legacy records created with the prior layout.
const GCM_IV_LENGTH = 12;
const LEGACY_IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100_000;

const deriveKey = (secret: string, salt: Buffer): Buffer =>
  crypto.pbkdf2Sync(secret, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');

const getSecret = (): string => {
  const secret =
    process.env.API_KEY_ENCRYPTION_KEY ?? env.API_KEY_ENCRYPTION_KEY;

  if (secret.trim().length < 32) {
    throw new Error(
      'API_KEY_ENCRYPTION_KEY must be set and at least 32 characters long',
    );
  }

  return secret;
};

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/u;

const decodeBase64Strict = (value: string, fieldName: string): Buffer => {
  if (value === '' || !BASE64_PATTERN.test(value) || value.length % 4 !== 0) {
    throw new Error(`Invalid base64 encoding in ${fieldName}`);
  }

  return Buffer.from(value, 'base64');
};

export const encryptApiKey = (plaintext: string): string => {
  if (plaintext.length === 0) {
    throw new Error('Cannot encrypt an empty API key');
  }

  const secret = getSecret();
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(GCM_IV_LENGTH);
  const key = deriveKey(secret, salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf-8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    salt.toString('base64'),
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
};

export const decryptApiKey = (encrypted: string): string => {
  if (encrypted.length === 0) {
    throw new Error('Encrypted payload must be a non-empty string');
  }

  const parts = encrypted.split(':');
  const [saltB64 = '', ivB64 = '', authTagB64 = '', cipherB64 = ''] = parts;

  if (
    parts.length !== 4 ||
    saltB64 === '' ||
    ivB64 === '' ||
    authTagB64 === '' ||
    cipherB64 === ''
  ) {
    throw new Error('Invalid encrypted API key format');
  }

  const salt = decodeBase64Strict(saltB64, 'salt');
  const iv = decodeBase64Strict(ivB64, 'iv');
  const authTag = decodeBase64Strict(authTagB64, 'authTag');
  const ciphertext = decodeBase64Strict(cipherB64, 'ciphertext');

  if (salt.length !== SALT_LENGTH) {
    throw new Error('Invalid encryption salt length');
  }

  if (iv.length !== GCM_IV_LENGTH && iv.length !== LEGACY_IV_LENGTH) {
    throw new Error('Invalid GCM IV length');
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Invalid GCM authentication tag length');
  }

  if (ciphertext.length === 0) {
    throw new Error('Encrypted ciphertext is empty');
  }

  const secret = getSecret();
  const key = deriveKey(secret, salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf-8');
};
