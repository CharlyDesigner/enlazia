import type {
  ChatRequest,
  Connection,
  ConnectorManifest,
  CreateConnectionInput,
  LogKind,
  ProxyRequest,
  ProxyResponse,
  TestResult,
  UpdateConnectionInput,
} from '@enlazia/shared';
import { getAiAdapter } from './adapters/index.js';
import type { Config } from './config.js';
import type { ConnectionRow, Store } from './db.js';
import { HttpError } from './errors.js';
import { send, UpstreamError, type RequestContext } from './http.js';
import type { Registry } from './registry.js';
import { decryptJson, encryptJson } from './vault.js';

const MAX_PROXY_BODY = 2 * 1024 * 1024;
const HIDDEN_RESPONSE_HEADERS = new Set(['set-cookie', 'set-cookie2']);

type SplitValues = { config: Record<string, string>; secrets: Record<string, string> };

export class ConnectionService {
  constructor(
    private readonly store: Store,
    private readonly registry: Registry,
    private readonly config: Config,
  ) {}

  list(): Connection[] {
    return this.store.listConnections().map((row) => this.toPublic(row));
  }

  get(id: string): Connection {
    return this.toPublic(this.requireRow(id));
  }

  create(input: CreateConnectionInput): Connection {
    const manifest = this.requireManifest(input.connectorId);
    const { config, secrets } = this.splitValues(manifest, input.values);
    const row = this.store.createConnection({
      connectorId: manifest.id,
      name: input.name,
      config,
      secretsEnc: Object.keys(secrets).length ? encryptJson(this.config.masterKey, secrets) : null,
      secretKeys: Object.keys(secrets),
    });
    return this.toPublic(row);
  }

  update(id: string, input: UpdateConnectionInput): Connection {
    const row = this.requireRow(id);
    const manifest = this.requireManifest(row.connectorId);
    const existing: SplitValues = { config: row.config, secrets: this.decryptSecrets(row) };
    const { config, secrets } = input.values ? this.splitValues(manifest, input.values, existing) : existing;
    const updated = this.store.updateConnection(id, {
      name: input.name ?? row.name,
      config,
      secretsEnc: Object.keys(secrets).length ? encryptJson(this.config.masterKey, secrets) : null,
      secretKeys: Object.keys(secrets),
    });
    return this.toPublic(updated!);
  }

  delete(id: string): void {
    if (!this.store.deleteConnection(id)) throw new HttpError(404, 'Connection not found');
  }

  async test(id: string): Promise<TestResult> {
    const row = this.requireRow(id);
    const manifest = this.requireManifest(row.connectorId);
    const started = performance.now();
    let result: TestResult;
    let status: number | undefined;

    try {
      const message = await this.track(row, manifest, 'test', async (ctx) => {
        const outcome = await this.runTest(id, manifest, ctx);
        status = ctx.trace.status ?? undefined;
        return outcome;
      });
      result = { ok: true, status, durationMs: Math.round(performance.now() - started), message };
    } catch (error) {
      result = {
        ok: false,
        status: error instanceof UpstreamError ? (error.status ?? undefined) : undefined,
        durationMs: Math.round(performance.now() - started),
        message: error instanceof Error ? error.message : String(error),
      };
    }

    this.store.setLastTest(id, result);
    return result;
  }

  private async runTest(id: string, manifest: ConnectorManifest, ctx: RequestContext): Promise<string> {
    if (manifest.test) {
      const res = await send(ctx, { method: manifest.test.method, path: manifest.test.path }, { allowErrorStatus: true });
      const expected = manifest.test.expectStatus;
      const ok = expected ? res.status === expected : res.ok;
      if (!ok) throw new UpstreamError(res.status, `Unexpected status ${res.status}`);
      return `HTTP ${res.status}`;
    }
    const adapter = getAiAdapter(manifest.kind);
    if (adapter && manifest.models?.listable !== false) {
      const models = await adapter.listModels(ctx);
      return `${models.length} models`;
    }
    if (adapter) {
      const model = manifest.models?.suggested[0];
      if (!model) throw new UpstreamError(null, 'No model available to test this connection');
      await adapter.chat(ctx, { connectionId: id, model, messages: [{ role: 'user', content: 'ping' }], maxTokens: 1 }, () => {});
      return model;
    }
    // Generic REST without a test request: any non-5xx answer means the API is reachable.
    const res = await send(ctx, { method: 'GET', path: '/' }, { allowErrorStatus: true });
    if (res.status >= 500) throw new UpstreamError(res.status, `Server error ${res.status}`);
    return `HTTP ${res.status}`;
  }

  async listModels(id: string): Promise<string[]> {
    const row = this.requireRow(id);
    const manifest = this.requireManifest(row.connectorId);
    const adapter = getAiAdapter(manifest.kind);
    if (!adapter) throw new HttpError(400, 'This connector is not an AI provider');
    if (manifest.models?.listable === false) return manifest.models.suggested;
    const models = await this.track(row, manifest, 'models', (ctx) => adapter.listModels(ctx));
    return models.length ? models : (manifest.models?.suggested ?? []);
  }

  async chat(req: ChatRequest, onDelta: (text: string) => void, signal?: AbortSignal): Promise<void> {
    const row = this.requireRow(req.connectionId);
    const manifest = this.requireManifest(row.connectorId);
    const adapter = getAiAdapter(manifest.kind);
    if (!adapter) throw new HttpError(400, 'This connector is not an AI provider');
    await this.track(row, manifest, 'chat', (ctx) => adapter.chat(ctx, req, onDelta), { signal, timeoutMs: 300_000 });
  }

  async proxy(id: string, req: ProxyRequest): Promise<ProxyResponse> {
    const row = this.requireRow(id);
    const manifest = this.requireManifest(row.connectorId);
    const started = performance.now();
    return this.track(row, manifest, 'request', async (ctx) => {
      const res = await send(ctx, req, { allowErrorStatus: true });
      const buffer = Buffer.from(await res.arrayBuffer());
      const headers: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        if (!HIDDEN_RESPONSE_HEADERS.has(key)) headers[key] = value;
      });
      const truncated = buffer.length > MAX_PROXY_BODY;
      const body = buffer.subarray(0, MAX_PROXY_BODY).toString('utf8') + (truncated ? '\n…[truncated]' : '');
      return { status: res.status, headers, body, durationMs: Math.round(performance.now() - started) };
    });
  }

  /** Runs `fn` with a request context and records the outcome in the log. */
  private async track<T>(
    row: ConnectionRow,
    manifest: ConnectorManifest,
    kind: LogKind,
    fn: (ctx: RequestContext) => Promise<T>,
    options: { signal?: AbortSignal; timeoutMs?: number } = {},
  ): Promise<T> {
    const ctx: RequestContext = {
      manifest,
      values: this.valuesFor(row, manifest),
      trace: { method: '', url: '', status: null },
      signal: options.signal,
      timeoutMs: options.timeoutMs,
    };
    const started = performance.now();
    try {
      const result = await fn(ctx);
      this.log(row, kind, ctx, started, null);
      return result;
    } catch (error) {
      this.log(row, kind, ctx, started, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private log(row: ConnectionRow, kind: LogKind, ctx: RequestContext, started: number, error: string | null): void {
    this.store.addLog({
      connectionId: row.id,
      kind,
      method: ctx.trace.method || '-',
      url: ctx.trace.url || ctx.manifest.baseUrl,
      status: ctx.trace.status,
      durationMs: performance.now() - started,
      error,
    });
  }

  private valuesFor(row: ConnectionRow, manifest: ConnectorManifest): Record<string, string> {
    const defaults = Object.fromEntries(manifest.fields.filter((f) => f.default).map((f) => [f.key, f.default!]));
    return { ...defaults, ...row.config, ...this.decryptSecrets(row) };
  }

  private decryptSecrets(row: ConnectionRow): Record<string, string> {
    if (!row.secretsEnc) return {};
    try {
      return decryptJson<Record<string, string>>(this.config.masterKey, row.secretsEnc);
    } catch {
      throw new HttpError(500, 'Stored credentials cannot be decrypted. Was the master key changed?');
    }
  }

  /** Validates submitted values against the manifest and separates secrets from plain config. */
  splitValues(manifest: ConnectorManifest, values: Record<string, string>, existing?: SplitValues): SplitValues {
    const config: Record<string, string> = {};
    const secrets: Record<string, string> = {};

    for (const field of manifest.fields) {
      const submitted = values[field.key]?.trim();
      let value: string | undefined;

      if (field.type === 'secret') {
        value = submitted || existing?.secrets[field.key];
        if (value) secrets[field.key] = value;
      } else {
        value = submitted ?? existing?.config[field.key] ?? field.default;
        if (value) config[field.key] = value;
      }

      if (!value) {
        if (field.required) throw new HttpError(400, `Field "${field.key}" is required`, { field: field.key });
        continue;
      }
      if (field.type === 'url') {
        let url: URL | null = null;
        try {
          url = new URL(value);
        } catch {
          // handled below
        }
        if (!url || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
          throw new HttpError(400, `Field "${field.key}" must be an http(s) URL`, { field: field.key });
        }
      }
      if (field.type === 'select' && field.options && !field.options.some((o) => o.value === value)) {
        throw new HttpError(400, `Field "${field.key}" has an invalid option`, { field: field.key });
      }
    }
    return { config, secrets };
  }

  private toPublic(row: ConnectionRow): Connection {
    return {
      id: row.id,
      connectorId: row.connectorId,
      name: row.name,
      config: row.config,
      secretsSet: row.secretKeys,
      lastTest: row.lastTest,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private requireRow(id: string): ConnectionRow {
    const row = this.store.getConnection(id);
    if (!row) throw new HttpError(404, 'Connection not found');
    return row;
  }

  private requireManifest(connectorId: string): ConnectorManifest {
    const manifest = this.registry.get(connectorId);
    if (!manifest) throw new HttpError(404, `Connector "${connectorId}" is not installed`);
    return manifest;
  }
}
