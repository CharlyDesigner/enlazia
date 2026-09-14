import { RefreshCw } from 'lucide-react';
import { Badge, Button, Card, ErrorNote, PageHeader, Spinner } from '../components/ui';
import { useI18n } from '../i18n';
import { api } from '../lib/api';
import { formatDateTime, formatDuration } from '../lib/format';
import { useAsync } from '../lib/useAsync';

export function Logs() {
  const { t, locale } = useI18n();
  const logs = useAsync(() => api.logs(200));

  return (
    <>
      <PageHeader
        title={t('logs.title')}
        description={t('logs.subtitle')}
        actions={
          <Button variant="secondary" onClick={() => void logs.reload()} loading={logs.loading}>
            {logs.loading ? null : <RefreshCw className="size-4" aria-hidden />}
            {t('common.refresh')}
          </Button>
        }
      />
      <ErrorNote error={logs.error} />
      {logs.loading && !logs.data ? (
        <Spinner label={t('common.loading')} />
      ) : !logs.data?.length ? (
        <Card className="p-10 text-center text-muted">{t('logs.empty')}</Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-border text-xs text-muted uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">{t('logs.col.time')}</th>
                <th scope="col" className="px-4 py-3 font-medium">{t('logs.col.connection')}</th>
                <th scope="col" className="px-4 py-3 font-medium">{t('logs.col.kind')}</th>
                <th scope="col" className="px-4 py-3 font-medium">{t('logs.col.request')}</th>
                <th scope="col" className="px-4 py-3 font-medium">{t('logs.col.status')}</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">{t('logs.col.duration')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.data.map((log) => {
                const failed = Boolean(log.error) || (log.status ?? 0) >= 400;
                return (
                  <tr key={log.id} className="align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDateTime(log.createdAt, locale)}</td>
                    <td className="px-4 py-3">{log.connectionName ?? <span className="text-muted">{t('logs.deleted')}</span>}</td>
                    <td className="px-4 py-3">{t(`logs.kind.${log.kind}`)}</td>
                    <td className="max-w-[320px] px-4 py-3">
                      <p className="truncate font-mono text-xs" title={log.url}>
                        <span className="text-muted">{log.method}</span> {log.url}
                      </p>
                      {log.error ? <p className="mt-1 text-xs text-danger">{log.error}</p> : null}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={failed ? 'danger' : 'success'} className="font-mono">
                        {log.status ?? 'ERR'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs whitespace-nowrap text-muted">{formatDuration(log.durationMs)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
