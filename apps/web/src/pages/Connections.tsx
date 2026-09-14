import type { Connection } from '@enlazia/shared';
import { MessagesSquare, Pencil, Plug, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useApp } from '../app-context';
import { ConnectDialog } from '../components/ConnectDialog';
import { ConnectorAvatar } from '../components/ConnectorAvatar';
import { Badge, Button, Card, Dialog, EmptyState, ErrorNote, PageHeader, Spinner } from '../components/ui';
import { useI18n } from '../i18n';
import { api } from '../lib/api';
import { formatRelative } from '../lib/format';
import { useAsync } from '../lib/useAsync';

export function Connections() {
  const { t, locale } = useI18n();
  const { connectorById, meta } = useApp();
  const [, navigate] = useLocation();
  const connections = useAsync(api.connections);
  const [testing, setTesting] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Connection | null>(null);
  const [deleting, setDeleting] = useState<Connection | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const replace = (updated: Connection) =>
    connections.setData((connections.data ?? []).map((c) => (c.id === updated.id ? updated : c)));

  async function runTest(connection: Connection) {
    setTesting((s) => new Set(s).add(connection.id));
    setActionError(null);
    try {
      const result = await api.testConnection(connection.id);
      replace({ ...connection, lastTest: { ...result, at: new Date().toISOString() } });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setTesting((s) => {
        const next = new Set(s);
        next.delete(connection.id);
        return next;
      });
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.deleteConnection(deleting.id);
      connections.setData((connections.data ?? []).filter((c) => c.id !== deleting.id));
      setDeleting(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleteBusy(false);
    }
  }

  const editingConnector = editing ? connectorById.get(editing.connectorId) : undefined;

  return (
    <>
      <PageHeader
        title={t('connections.title')}
        description={t('connections.subtitle')}
        actions={
          <Button onClick={() => navigate('/catalog')} disabled={meta.demo}>
            <Plus className="size-4" aria-hidden />
            {t('connections.add')}
          </Button>
        }
      />
      <div className="mb-4">
        <ErrorNote error={actionError ?? connections.error} />
      </div>

      {connections.loading && !connections.data ? (
        <Spinner label={t('common.loading')} />
      ) : !connections.data?.length ? (
        <EmptyState
          icon={<Plug className="size-6" aria-hidden />}
          title={t('connections.empty.title')}
          description={t('connections.empty.desc')}
          action={
            <Link href="/catalog" className="mt-2 inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-fg hover:brightness-110">
              {t('connections.empty.action')}
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {connections.data.map((connection) => {
            const connector = connectorById.get(connection.connectorId);
            const test = connection.lastTest;
            return (
              <li key={connection.id}>
                <Card className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <ConnectorAvatar connector={connector ?? { name: connection.connectorId }} />
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold">{connection.name}</h2>
                      <p className="truncate text-sm text-muted">{connector?.name ?? t('connections.missingConnector')}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-0.5 md:w-56 md:items-end">
                    <Badge tone={!test ? 'neutral' : test.ok ? 'success' : 'danger'} className="self-start md:self-end">
                      {!test ? t('connections.status.untested') : test.ok ? t('connections.status.ok') : t('connections.status.fail')}
                    </Badge>
                    {test ? (
                      <p className="truncate text-xs text-muted" title={test.message}>
                        {t('connections.testedAt', { time: formatRelative(test.at, locale) })}
                        {!test.ok && test.message ? ` · ${test.message}` : ''}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <Button variant="secondary" size="sm" loading={testing.has(connection.id)} onClick={() => void runTest(connection)} disabled={meta.demo}>
                      {testing.has(connection.id) ? null : <RefreshCw className="size-3.5" aria-hidden />}
                      {t('common.test')}
                    </Button>
                    <Link
                      href={`/playground?c=${connection.id}`}
                      className="inline-flex h-8 items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 text-sm font-medium hover:border-border-strong"
                    >
                      <MessagesSquare className="size-3.5" aria-hidden />
                      {t('connections.use')}
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => setEditing(connection)} disabled={!connector || meta.demo} aria-label={`${t('common.edit')}: ${connection.name}`}>
                      <Pencil className="size-3.5" aria-hidden />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(connection)} disabled={meta.demo} aria-label={`${t('common.delete')}: ${connection.name}`}>
                      <Trash2 className="size-3.5" aria-hidden />
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {editing && editingConnector ? (
        <ConnectDialog connector={editingConnector} connection={editing} onClose={() => setEditing(null)} onSaved={replace} />
      ) : null}

      <Dialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        closeLabel={t('common.close')}
        title={t('connections.deleteTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" loading={deleteBusy} onClick={() => void confirmDelete()}>
              {t('common.delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{t('connections.deleteConfirm', { name: deleting?.name ?? '' })}</p>
      </Dialog>
    </>
  );
}
