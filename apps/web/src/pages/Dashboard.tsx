import { Activity, AlertTriangle, ArrowRight, Blocks, KeyRound, MessagesSquare, Plug } from 'lucide-react';
import { Link } from 'wouter';
import { useApp } from '../app-context';
import { Badge, Card, PageHeader, Spinner } from '../components/ui';
import { useI18n } from '../i18n';
import { api } from '../lib/api';
import { formatRelative } from '../lib/format';
import { useAsync } from '../lib/useAsync';

export function Dashboard() {
  const { t, locale } = useI18n();
  const { connectors } = useApp();
  const stats = useAsync(api.stats);
  const logs = useAsync(() => api.logs(8));

  const cards = [
    { label: t('dashboard.stats.connections'), value: stats.data?.connections, icon: Plug },
    { label: t('dashboard.stats.calls'), value: stats.data?.calls24h, icon: Activity },
    { label: t('dashboard.stats.errors'), value: stats.data?.errors24h, icon: AlertTriangle },
    { label: t('dashboard.stats.connectors'), value: connectors.length, icon: Blocks },
  ];

  const steps = [
    { href: '/catalog', icon: Blocks, title: t('dashboard.quick.step1.title'), desc: t('dashboard.quick.step1.desc') },
    { href: '/connections', icon: KeyRound, title: t('dashboard.quick.step2.title'), desc: t('dashboard.quick.step2.desc') },
    { href: '/playground', icon: MessagesSquare, title: t('dashboard.quick.step3.title'), desc: t('dashboard.quick.step3.desc') },
  ];

  return (
    <>
      <PageHeader title={t('dashboard.title')} description={t('dashboard.subtitle')} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-4">
            <div className="flex items-center justify-between text-muted">
              <span className="text-sm">{label}</span>
              <Icon className="size-4" aria-hidden />
            </div>
            <p className="mt-2 font-mono text-3xl font-semibold tabular-nums">{value ?? '—'}</p>
          </Card>
        ))}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">{t('dashboard.quick.title')}</h2>
        <ol className="grid gap-3 md:grid-cols-3">
          {steps.map(({ href, icon: Icon, title, desc }, index) => (
            <li key={href}>
              <Link href={href} className="group flex h-full gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/60">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft font-mono text-sm font-semibold text-accent-text">
                  {index + 1}
                </span>
                <span className="flex-1">
                  <span className="flex items-center gap-2 font-medium">
                    <Icon className="size-4 text-muted" aria-hidden />
                    {title}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">{desc}</span>
                </span>
                <ArrowRight className="size-4 self-center text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">{t('dashboard.activity.title')}</h2>
          <Link href="/logs" className="text-sm font-medium text-accent-text hover:underline">
            {t('dashboard.activity.viewAll')}
          </Link>
        </div>
        <Card>
          {logs.loading && !logs.data ? (
            <div className="p-4">
              <Spinner label={t('common.loading')} />
            </div>
          ) : !logs.data?.length ? (
            <p className="p-6 text-center text-sm text-muted">{t('dashboard.activity.empty')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {logs.data.map((log) => {
                const failed = Boolean(log.error) || (log.status ?? 0) >= 400;
                return (
                  <li key={log.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <Badge tone={failed ? 'danger' : 'success'} className="font-mono">
                      {log.status ?? 'ERR'}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium">{log.connectionName ?? t('logs.deleted')}</span>
                      <span className="text-muted"> · {t(`logs.kind.${log.kind}`)}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">{formatRelative(log.createdAt, locale)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>
    </>
  );
}
