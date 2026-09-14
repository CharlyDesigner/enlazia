import type { ConnectorAuth, ConnectorManifest, HttpMethod } from '@enlazia/shared';

/** Error returned by (or while reaching) a third-party API. */
export class UpstreamError extends Error {
  constructor(
    readonly status: number | null,
    message: string,
  ) {
    super(message);
    this.name = 'UpstreamError';
  }
}

export type OutgoingRequest = {
  method: HttpMethod;
  path: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: string;
};

/** Filled in by `send` so callers can log what was actually requested. */
export type Trace = { method: string; url: string; status: number | null };

export type RequestContext = {
  manifest: ConnectorManifest;
  values: Record<string, string>;
  trace: Trace;
  signal?: AbortSignal;
  timeoutMs?: number;
};

const SENSITIVE_QUERY = /^(key|api[-_]?key|token|access[-_]?token|secret)$/i;

export function renderTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = values[key];
    if (!value) throw new UpstreamError(null, `Missing value for "${key}"`);
    return value;
  });
}

export function resolveBaseUrl(manifest: ConnectorManifest, values: Record<string, string>): string {
  const raw = renderTemplate(manifest.baseUrl, values).trim().replace(/\/+$/, '');
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UpstreamError(null, `Invalid base URL: ${raw}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UpstreamError(null, 'Base URL must use http or https');
  }
  return raw;
}

function applyAuth(auth: ConnectorAuth, values: Record<string, string>, headers: Headers, url: URL): void {
  switch (auth.type) {
    case 'none':
      return;
    case 'bearer': {
      const token = values[auth.field];
      if (token) headers.set('authorization', `Bearer ${token}`);
      return;
    }
    case 'header': {
      const name = auth.header ?? (auth.headerField ? values[auth.headerField] : undefined);
      const value = values[auth.field];
      if (name && value) headers.set(name, `${auth.prefix ?? ''}${value}`);
      return;
    }
    case 'query': {
      const value = values[auth.field];
      if (value) url.searchParams.set(auth.param, value);
      return;
    }
    case 'basic': {
      const user = values[auth.usernameField] ?? '';
      const pass = values[auth.passwordField] ?? '';
      if (user || pass) headers.set('authorization', `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`);
      return;
    }
  }
}

export function buildRequest(
  manifest: ConnectorManifest,
  values: Record<string, string>,
  req: OutgoingRequest,
): { url: URL; init: RequestInit } {
  const url = new URL(resolveBaseUrl(manifest, values) + req.path);
  for (const [key, value] of Object.entries(req.query ?? {})) url.searchParams.set(key, value);

  const headers = new Headers(manifest.defaultHeaders);
  for (const [key, value] of Object.entries(req.headers ?? {})) headers.set(key, value);
  applyAuth(manifest.auth, values, headers, url);

  const hasBody = req.body !== undefined && req.method !== 'GET';
  if (hasBody && !headers.has('content-type')) headers.set('content-type', 'application/json');
  return { url, init: { method: req.method, headers, body: hasBody ? req.body : undefined } };
}

/** Removes credentials from a URL before it is logged or shown. */
export function redactUrl(url: URL, auth: ConnectorAuth): string {
  const copy = new URL(url);
  for (const key of [...copy.searchParams.keys()]) {
    if (SENSITIVE_QUERY.test(key) || (auth.type === 'query' && key === auth.param)) copy.searchParams.set(key, '***');
  }
  copy.username = '';
  copy.password = '';
  return copy.toString();
}

async function errorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  try {
    const json = JSON.parse(text) as { error?: { message?: string } | string; message?: string };
    const message = typeof json.error === 'string' ? json.error : (json.error?.message ?? json.message);
    if (message) return message.slice(0, 500);
  } catch {
    // not JSON
  }
  return (text || res.statusText || `HTTP ${res.status}`).slice(0, 500);
}

/**
 * Sends a request for a connection, injecting credentials.
 * Throws `UpstreamError` on network failures and, unless `allowErrorStatus`, on non-2xx responses.
 */
export async function send(
  ctx: RequestContext,
  req: OutgoingRequest,
  options: { allowErrorStatus?: boolean } = {},
): Promise<Response> {
  const { url, init } = buildRequest(ctx.manifest, ctx.values, req);
  ctx.trace.method = req.method;
  ctx.trace.url = redactUrl(url, ctx.manifest.auth);

  const signals = [AbortSignal.timeout(ctx.timeoutMs ?? 60_000)];
  if (ctx.signal) signals.push(ctx.signal);

  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.any(signals) });
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    if (name === 'TimeoutError') throw new UpstreamError(null, 'The request timed out');
    if (name === 'AbortError') throw new UpstreamError(null, 'The request was cancelled');
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : String(error);
    throw new UpstreamError(null, `Network error: ${cause}`);
  }

  ctx.trace.status = res.status;
  if (!res.ok && !options.allowErrorStatus) throw new UpstreamError(res.status, await errorMessage(res));
  return res;
}
