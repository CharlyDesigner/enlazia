import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const VERSION = 'v1';

/** Encrypts a JSON-serializable value with AES-256-GCM. Output: `v1:<base64(iv|tag|ciphertext)>`. */
export function encryptJson(key: Buffer, value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${Buffer.concat([iv, tag, ciphertext]).toString('base64')}`;
}

export function decryptJson<T>(key: Buffer, payload: string): T {
  const [version, data] = payload.split(':', 2);
  if (version !== VERSION || !data) throw new Error('Unsupported secret format');
  const raw = Buffer.from(data, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  const plain = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]);
  return JSON.parse(plain.toString('utf8')) as T;
}
