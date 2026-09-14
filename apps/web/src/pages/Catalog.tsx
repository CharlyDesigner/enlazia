import type { ConnectorManifest } from '@enlazia/shared';
import { BookOpen, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { LINKS, useApp } from '../app-context';
import { ConnectDialog } from '../components/ConnectDialog';
import { ConnectorAvatar } from '../components/ConnectorAvatar';
import { Badge, Button, Card, cx, Input, PageHeader } from '../components/ui';
import { useI18n } from '../i18n';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';

type Filter = 'all' | 'ai' | 'api';

export function Catalog() {
  const { t, lt } = useI18n();
  const { connectors, meta } = useApp();
  const connections = useAsync(api.connections);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState<ConnectorManifest | null>(null);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of connections.data ?? []) map.set(c.connectorId, (map.get(c.connectorId) ?? 0) + 1);
    return map;
  }, [connections.data]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return connectors.filter((c) => {
      if (filter !== 'all' && c.category !== filter) return false;
      if (!q) return true;
      return [c.name, c.id, lt(c.description), ...c.tags].some((text) => text.toLowerCase().includes(q));
    });
  }, [connectors, filter, query, lt]);

  const filters: Array<{ value: Filter; label: string }> = [
    { value: 'all', label: t('common.all') },
    { value: 'ai', label: t('catalog.filter.ai') },
    { value: 'api', label: t('catalog.filter.api') },
  ];

  return (
    <>
      <PageHeader
        title={t('catalog.title')}
        description={t('catalog.subtitle')}
        actions={
          <a
            href={LINKS.connectorGuide}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface-2 px-4 text-sm font-medium hover:border-border-strong"
          >
            <BookOpen className="size-4" aria-hidden />
            {t('catalog.contribute')}
          </a>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('catalog.search')}
            aria-label={t('catalog.search')}
            className="pl-9"
          />
        </div>
        <div role="group" className="flex rounded-lg border border-border p-0.5">
          {filters.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={cx(
                'h-9 flex-1 cursor-pointer rounded-md px-4 text-sm font-medium transition-colors sm:flex-none',
                filter === value ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="py-12 text-center text-muted">{t('catalog.empty')}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((connector) => {
            const count = counts.get(connector.id) ?? 0;
            return (
              <li key={connector.id}>
                <Card className="flex h-full flex-col p-4 transition-colors hover:border-border-strong">
                  <div className="flex items-start gap-3">
                    <ConnectorAvatar connector={connector} />
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-semibold">{connector.name}</h2>
                      <p className="text-xs text-muted">{t(`catalog.kind.${connector.kind}`)}</p>
                    </div>
                    {count > 0 ? <Badge tone="success">{t('catalog.connected', { count })}</Badge> : null}
                  </div>
                  <p className="mt-3 line-clamp-2 flex-1 text-sm text-muted">{lt(connector.description)}</p>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap gap-1">
                      {connector.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} className="font-mono">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {connector.docs ? (
                        <a
                          href={connector.docs}
                          target="_blank"
                          rel="noreferrer"
                          className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg"
                          aria-label={`${t('common.docs')}: ${connector.name}`}
                        >
                          <BookOpen className="size-4" aria-hidden />
                        </a>
                      ) : null}
                      <Button size="sm" onClick={() => setTarget(connector)} disabled={meta.demo}>
                        <Plus className="size-4" aria-hidden />
                        {t('catalog.connect')}
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {target ? <ConnectDialog connector={target} onClose={() => setTarget(null)} onSaved={() => void connections.reload()} /> : null}
    </>
  );
}
