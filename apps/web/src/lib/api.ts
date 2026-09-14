import type {
  ChatRequest,
  ChatStreamEvent,
  Connection,
  ConnectorManifest,
  CreateConnectionInput,
  LogEntry,
  Meta,
  ProxyRequest,
  ProxyResponse,
  Stats,
  TestResult,
  UpdateConnectionInput,
} from '@enlazia/shared';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const UNAUTHORIZED_EVENT = 'enlazia:unauthorized';

async function toError(res: Response): Promise<ApiError> {
  const data = (await res.json().catch(() => null)) as { error?: string; details?: unknown } | null;
  if (res.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  return new ApiError(res.status, data?.error ?? res.statusText, data?.details);
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  meta: () => request<Meta>('GET', '/meta'),
  login: (password: string) => request<{ ok: true }>('POST', '/auth/login', { password }),
  logout: () => request<{ ok: true }>('POST', '/auth/logout'),
  connectors: () => request<ConnectorManifest[]>('GET', '/connectors'),
  connectorErrors: () => request<Array<{ file: string; message: string }>>('GET', '/connectors/errors'),
  connections: () => request<Connection[]>('GET', '/connections'),
  createConnection: (input: CreateConnectionInput) => request<Connection>('POST', '/connections', input),
  updateConnection: (id: string, input: UpdateConnectionInput) => request<Connection>('PATCH', `/connections/${id}`, input),
  deleteConnection: (id: string) => request<void>('DELETE', `/connections/${id}`),
  testConnection: (id: string) => request<TestResult>('POST', `/connections/${id}/test`),
  models: (id: string) => request<string[]>('GET', `/connections/${id}/models`),
  proxy: (id: string, input: ProxyRequest) => request<ProxyResponse>('POST', `/connections/${id}/request`, input),
  logs: (limit = 100) => request<LogEntry[]>('GET', `/logs?limit=${limit}`),
  stats: () => request<Stats>('GET', '/stats'),
};

/** Sends a chat request and calls `onEvent` for every streamed event. */
export async function streamChat(
  input: ChatRequest,
  onEvent: (event: ChatStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  });
  if (!res.ok) throw await toError(res);
  if (!res.body) throw new ApiError(res.status, 'Empty response');

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let index: number;
    while ((index = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      const data = block
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');
      if (data) onEvent(JSON.parse(data) as ChatStreamEvent);
    }
  }
}
