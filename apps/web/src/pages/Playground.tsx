import type { Connection, ConnectorManifest, HttpMethod, ProxyResponse } from '@enlazia/shared';
import { Eraser, MessagesSquare, Send, Square } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useSearch } from 'wouter';
import { useApp } from '../app-context';
import { Badge, Button, Card, cx, EmptyState, ErrorNote, Field, Input, PageHeader, Select, Spinner, Textarea } from '../components/ui';
import { useI18n } from '../i18n';
import { api, streamChat } from '../lib/api';
import { formatDuration, prettyBody } from '../lib/format';
import { useAsync } from '../lib/useAsync';

type ChatItem = { role: 'user' | 'assistant'; content: string; error?: string };

function ChatPanel({ connection, connector }: { connection: Connection; connector: ConnectorManifest }) {
  const { t } = useI18n();
  const models = useAsync(() => api.models(connection.id), [connection.id]);
  const [model, setModel] = useState(connector.models?.suggested[0] ?? '');
  const [system, setSystem] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!model && models.data?.[0]) setModel(models.data[0]);
  }, [models.data, model]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const updateLast = (fn: (item: ChatItem) => ChatItem) =>
    setMessages((current) => current.map((item, index) => (index === current.length - 1 ? fn(item) : item)));

  async function send(event?: FormEvent) {
    event?.preventDefault();
    const content = input.trim();
    if (!content || !model || streaming) return;

    const history: ChatItem[] = [...messages.filter((m) => !m.error), { role: 'user', content }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat(
        {
          connectionId: connection.id,
          model,
          system: system.trim() || undefined,
          temperature,
          messages: history.map(({ role, content: text }) => ({ role, content: text })),
        },
        (streamEvent) => {
          if (streamEvent.type === 'delta') updateLast((item) => ({ ...item, content: item.content + streamEvent.text }));
          if (streamEvent.type === 'error') updateLast((item) => ({ ...item, error: streamEvent.message }));
        },
        controller.signal,
      );
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        updateLast((item) => ({ ...item, error: err instanceof Error ? err.message : String(err) }));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  }

  const modelListId = `models-${connection.id}`;

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <Card className="flex flex-col gap-4 p-4">
        <Field label={t('playground.model')} htmlFor="pg-model" help={models.loading ? t('playground.loadingModels') : undefined} required>
          <Input id="pg-model" list={modelListId} value={model} onChange={(e) => setModel(e.target.value)} placeholder={t('playground.modelPlaceholder')} className="font-mono" spellCheck={false} />
          <datalist id={modelListId}>
            {(models.data ?? connector.models?.suggested ?? []).map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </Field>
        {models.error ? <ErrorNote error={models.error} /> : null}
        <Field label={t('playground.system')} htmlFor="pg-system">
          <Textarea id="pg-system" rows={4} value={system} onChange={(e) => setSystem(e.target.value)} placeholder={t('playground.systemPlaceholder')} />
        </Field>
        <Field label={`${t('playground.temperature')}: ${temperature.toFixed(1)}`} htmlFor="pg-temp">
          <input id="pg-temp" type="range" min={0} max={2} step={0.1} value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} className="w-full cursor-pointer accent-[var(--accent)]" />
        </Field>
        <Button variant="secondary" onClick={() => setMessages([])} disabled={streaming || messages.length === 0}>
          <Eraser className="size-4" aria-hidden />
          {t('playground.chat.clear')}
        </Button>
      </Card>

      <Card className="flex h-[70vh] min-h-[420px] flex-col">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
          {messages.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted">{t('playground.chat.empty')}</p>
          ) : (
            messages.map((message, index) => (
              <div key={index} className={cx('flex flex-col gap-1', message.role === 'user' ? 'items-end' : 'items-start')}>
                <span className="text-xs text-muted">{message.role === 'user' ? t('playground.you') : `${t('playground.assistant')} · ${model}`}</span>
                <div
                  className={cx(
                    'max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-wrap break-words',
                    message.role === 'user' ? 'bg-accent-soft text-fg' : 'bg-surface-2 text-fg',
                  )}
                >
                  {message.content || (streaming && index === messages.length - 1 && !message.error ? <span className="inline-block h-4 w-2 animate-pulse bg-accent align-middle" /> : null)}
                  {message.error ? <p className="mt-1 text-danger">{message.error}</p> : null}
                </div>
              </div>
            ))
          )}
        </div>
        <form onSubmit={send} className="border-t border-border p-3">
          <label htmlFor="pg-input" className="sr-only">
            {t('playground.chat.placeholder')}
          </label>
          <Textarea id="pg-input" rows={2} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown} placeholder={t('playground.chat.placeholder')} className="resize-none" />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="hidden text-xs text-muted sm:inline">{t('playground.chat.hint')}</span>
            {streaming ? (
              <Button variant="secondary" onClick={() => abortRef.current?.abort()} className="ml-auto">
                <Square className="size-4" aria-hidden />
                {t('playground.chat.stop')}
              </Button>
            ) : (
              <Button type="submit" disabled={!input.trim() || !model} className="ml-auto">
                <Send className="size-4" aria-hidden />
                {t('playground.chat.send')}
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

function RestPanel({ connection, connector }: { connection: Connection; connector: ConnectorManifest }) {
  const { t, lt } = useI18n();
  const first = connector.actions[0];
  const [actionId, setActionId] = useState(first?.id ?? '');
  const [method, setMethod] = useState<HttpMethod>(first?.method ?? 'GET');
  const [path, setPath] = useState(first?.path ?? '/');
  const [body, setBody] = useState(first?.sampleBody ? JSON.stringify(first.sampleBody, null, 2) : '');
  const [response, setResponse] = useState<ProxyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  function pickAction(id: string) {
    setActionId(id);
    const action = connector.actions.find((a) => a.id === id);
    if (!action) return;
    setMethod(action.method);
    setPath(action.path);
    setBody(action.sampleBody ? JSON.stringify(action.sampleBody, null, 2) : '');
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      setResponse(await api.proxy(connection.id, { method, path: path.startsWith('/') ? path : `/${path}`, body: method === 'GET' || !body.trim() ? undefined : body }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  const statusTone = !response ? 'neutral' : response.status < 300 ? 'success' : response.status < 500 ? 'warning' : 'danger';

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-4">
        <form onSubmit={send} className="flex flex-col gap-4">
          {connector.actions.length ? (
            <Field label={t('playground.rest.action')} htmlFor="rest-action">
              <Select id="rest-action" value={actionId} onChange={(e) => pickAction(e.target.value)}>
                {connector.actions.map((action) => (
                  <option key={action.id} value={action.id}>
                    {lt(action.name)}
                  </option>
                ))}
                <option value="">{t('playground.rest.custom')}</option>
              </Select>
            </Field>
          ) : null}
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <Field label={t('playground.rest.method')} htmlFor="rest-method">
              <Select id="rest-method" value={method} onChange={(e) => setMethod(e.target.value as HttpMethod)} className="font-mono">
                {METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            </Field>
            <Field label={t('playground.rest.path')} htmlFor="rest-path">
              <Input id="rest-path" value={path} onChange={(e) => setPath(e.target.value)} className="font-mono" spellCheck={false} />
            </Field>
          </div>
          {method !== 'GET' ? (
            <Field label={t('playground.rest.body')} htmlFor="rest-body">
              <Textarea id="rest-body" rows={8} value={body} onChange={(e) => setBody(e.target.value)} className="font-mono text-xs" spellCheck={false} />
            </Field>
          ) : null}
          <ErrorNote error={error} />
          <Button type="submit" loading={sending} className="self-start">
            <Send className="size-4" aria-hidden />
            {t('playground.rest.send')}
          </Button>
        </form>
      </Card>

      <Card className="flex min-h-[320px] flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="font-semibold">{t('playground.rest.response')}</h2>
          {response ? (
            <div className="flex items-center gap-2">
              <Badge tone={statusTone} className="font-mono">
                {response.status}
              </Badge>
              <span className="font-mono text-xs text-muted">{formatDuration(response.durationMs)}</span>
            </div>
          ) : null}
        </div>
        {response ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <details className="border-b border-border px-4 py-2 text-sm">
              <summary className="cursor-pointer text-muted">{t('playground.rest.headers')}</summary>
              <pre className="mt-2 max-h-40 overflow-auto font-mono text-xs text-muted">
                {Object.entries(response.headers)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join('\n')}
              </pre>
            </details>
            <pre className="max-h-[60vh] flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">{prettyBody(response.body)}</pre>
          </div>
        ) : (
          <p className="flex flex-1 items-center justify-center p-6 text-sm text-muted">{t('playground.rest.empty')}</p>
        )}
      </Card>
    </div>
  );
}

export function Playground() {
  const { t } = useI18n();
  const { connectorById } = useApp();
  const search = useSearch();
  const connections = useAsync(api.connections);
  const [selectedId, setSelectedId] = useState(() => new URLSearchParams(search).get('c') ?? '');

  useEffect(() => {
    const list = connections.data;
    if (list?.length && !list.some((c) => c.id === selectedId)) setSelectedId(list[0]!.id);
  }, [connections.data, selectedId]);

  const connection = connections.data?.find((c) => c.id === selectedId);
  const connector = connection ? connectorById.get(connection.connectorId) : undefined;

  return (
    <>
      <PageHeader
        title={t('playground.title')}
        description={t('playground.subtitle')}
        actions={
          connections.data?.length ? (
            <div className="w-full sm:w-72">
              <label htmlFor="pg-connection" className="sr-only">
                {t('playground.connection')}
              </label>
              <Select id="pg-connection" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                {connections.data.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {connectorById.get(c.connectorId)?.name ?? c.connectorId}
                  </option>
                ))}
              </Select>
            </div>
          ) : null
        }
      />
      <ErrorNote error={connections.error} />
      {connections.loading && !connections.data ? (
        <Spinner label={t('common.loading')} />
      ) : !connections.data?.length ? (
        <EmptyState
          icon={<MessagesSquare className="size-6" aria-hidden />}
          title={t('playground.noConnections')}
          description={t('connections.empty.desc')}
          action={
            <Link href="/catalog" className="mt-2 inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-fg hover:brightness-110">
              {t('connections.empty.action')}
            </Link>
          }
        />
      ) : connection && connector ? (
        connector.category === 'ai' ? (
          <ChatPanel key={connection.id} connection={connection} connector={connector} />
        ) : (
          <RestPanel key={connection.id} connection={connection} connector={connector} />
        )
      ) : connection ? (
        <ErrorNote error={t('connections.missingConnector')} />
      ) : null}
    </>
  );
}
