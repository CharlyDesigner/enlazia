import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { connectorManifestSchema, type ConnectorManifest } from '@enlazia/shared';
import { describe, expect, it } from 'vitest';
import { buildRequest, redactUrl, renderTemplate } from '../src/http.js';
import { checkReferences, loadRegistry } from '../src/registry.js';
import { readSse } from '../src/sse.js';
import { decryptJson, encryptJson } from '../src/vault.js';

const manifest = (overrides: Partial<ConnectorManifest>): ConnectorManifest =>
  connectorManifestSchema.parse({
    id: 'test',
    name: 'Test',
    category: 'ai',
    kind: 'ai-openai-compatible',
    description: { es: 'Prueba', en: 'Test' },
    baseUrl: 'https://api.example.com/v1',
    auth: { type: 'bearer', field: 'apiKey' },
    fields: [{ key: 'apiKey', label: { es: 'Clave', en: 'Key' }, type: 'secret' }],
    ...overrides,
  });

describe('vault', () => {
  it('round-trips and rejects a wrong key', () => {
    const key = randomBytes(32);
    const payload = encryptJson(key, { apiKey: 'sk-123' });
    expect(payload.startsWith('v1:')).toBe(true);
    expect(payload).not.toContain('sk-123');
    expect(decryptJson(key, payload)).toEqual({ apiKey: 'sk-123' });
    expect(() => decryptJson(randomBytes(32), payload)).toThrow();
  });
});

describe('http', () => {
  it('renders templates and fails on missing values', () => {
    expect(renderTemplate('https://{{host}}/v1', { host: 'x.com' })).toBe('https://x.com/v1');
    expect(() => renderTemplate('https://{{host}}', {})).toThrow(/host/);
  });

  it('injects bearer auth and default headers', () => {
    const m = manifest({ defaultHeaders: { 'x-extra': '1' } });
    const { url, init } = buildRequest(m, { apiKey: 'sk-1' }, { method: 'GET', path: '/models' });
    const headers = init.headers as Headers;
    expect(url.toString()).toBe('https://api.example.com/v1/models');
    expect(headers.get('authorization')).toBe('Bearer sk-1');
    expect(headers.get('x-extra')).toBe('1');
    expect(init.body).toBeUndefined();
  });

  it('supports header auth with a user-chosen header name', () => {
    const m = manifest({
      auth: { type: 'header', headerField: 'authHeader', field: 'apiKey' },
      fields: [
        { key: 'authHeader', label: { es: 'H', en: 'H' }, type: 'text', required: false },
        { key: 'apiKey', label: { es: 'K', en: 'K' }, type: 'secret', required: false },
      ],
    });
    const { init } = buildRequest(m, { authHeader: 'X-Token', apiKey: 'abc' }, { method: 'POST', path: '/', body: '{}' });
    const headers = init.headers as Headers;
    expect(headers.get('x-token')).toBe('abc');
    expect(headers.get('content-type')).toBe('application/json');
  });

  it('redacts query credentials', () => {
    const m = manifest({ auth: { type: 'query', param: 'key', field: 'apiKey' } });
    const { url } = buildRequest(m, { apiKey: 'secret' }, { method: 'GET', path: '/models', query: { page: '2' } });
    const redacted = redactUrl(url, m.auth);
    expect(redacted).not.toContain('secret');
    expect(redacted).toContain('page=2');
  });
});

describe('sse', () => {
  it('parses events split across chunks', async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('event: delta\ndata: {"a"'));
        controller.enqueue(encoder.encode(':1}\n\n: comment\ndata: [DONE]\n\n'));
        controller.close();
      },
    });
    const messages = [];
    for await (const message of readSse(body)) messages.push(message);
    expect(messages).toEqual([
      { event: 'delta', data: '{"a":1}' },
      { event: undefined, data: '[DONE]' },
    ]);
  });
});

describe('registry', () => {
  it('flags references to undeclared fields', () => {
    expect(checkReferences(manifest({ baseUrl: 'https://{{missing}}' }))).toMatch(/missing/);
  });

  it('loads every bundled connector without errors', () => {
    const registry = loadRegistry([path.resolve(import.meta.dirname, '../../../connectors')]);
    expect(registry.errors).toEqual([]);
    expect(registry.list().length).toBeGreaterThan(0);
  });
});
