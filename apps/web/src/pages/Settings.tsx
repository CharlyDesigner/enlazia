import { ExternalLink, LogOut } from 'lucide-react';
import type { ReactNode } from 'react';
import { LINKS, useApp } from '../app-context';
import { Badge, Button, Card, Field, PageHeader, Select } from '../components/ui';
import { useI18n } from '../i18n';
import { api } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { useTheme, type ThemePreference } from '../theme';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-semibold tracking-wide text-muted uppercase">{title}</h2>
      {children}
    </Card>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

function ExternalAnchor({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-accent-text hover:underline">
      {children}
      <ExternalLink className="size-3" aria-hidden />
    </a>
  );
}

export function Settings() {
  const { t, locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const { meta, refreshMeta } = useApp();
  const errors = useAsync(api.connectorErrors);

  async function logout() {
    await api.logout();
    await refreshMeta();
  }

  return (
    <>
      <PageHeader title={t('settings.title')} description={t('settings.subtitle')} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={t('settings.appearance')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('lang.label')} htmlFor="set-lang">
              <Select id="set-lang" value={locale} onChange={(e) => setLocale(e.target.value as 'es' | 'en')}>
                <option value="es">Español</option>
                <option value="en">English</option>
              </Select>
            </Field>
            <Field label={t('theme.label')} htmlFor="set-theme">
              <Select id="set-theme" value={theme} onChange={(e) => setTheme(e.target.value as ThemePreference)}>
                <option value="dark">{t('theme.dark')}</option>
                <option value="light">{t('theme.light')}</option>
                <option value="system">{t('theme.system')}</option>
              </Select>
            </Field>
          </div>
        </Section>

        <Section title={t('settings.instance')}>
          <dl className="divide-y divide-border">
            <Row label={t('settings.version')}>
              <span className="font-mono">v{meta.version}</span>
            </Row>
            <Row label={t('settings.mode')}>
              <Badge tone={meta.demo ? 'warning' : 'accent'}>{meta.demo ? t('settings.mode.demo') : t('settings.mode.normal')}</Badge>
            </Row>
            <Row label={t('settings.auth')}>{meta.authRequired ? t('settings.auth.on') : t('settings.auth.off')}</Row>
          </dl>
          {meta.authRequired ? (
            <Button variant="secondary" className="mt-4" onClick={() => void logout()}>
              <LogOut className="size-4" aria-hidden />
              {t('settings.logout')}
            </Button>
          ) : null}
        </Section>

        <Section title={t('settings.connectorErrors')}>
          {errors.data?.length ? (
            <ul className="flex flex-col gap-2">
              {errors.data.map((error) => (
                <li key={error.file} className="rounded-lg bg-danger-soft px-3 py-2 text-sm">
                  <p className="font-mono text-xs text-fg">{error.file}</p>
                  <p className="text-danger">{error.message}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{t('settings.connectorErrorsNone')}</p>
          )}
        </Section>

        <Section title={t('settings.about')}>
          <div className="mb-4 flex items-center gap-3">
            <img src="/favicon.svg" alt="" className="size-12 rounded-xl" />
            <div>
              <p className="text-lg font-semibold">Enlazia</p>
              <p className="text-sm text-muted">{t('app.tagline')}</p>
            </div>
          </div>
          <p className="mb-2 text-sm text-muted">{t('settings.aboutText')}</p>
          <dl className="divide-y divide-border">
            <Row label={t('settings.author')}>
              <ExternalAnchor href={LINKS.author}>Charly Designer</ExternalAnchor>
            </Row>
            <Row label={t('settings.repo')}>
              <ExternalAnchor href={LINKS.repo}>CharlyDesigner/enlazia</ExternalAnchor>
            </Row>
            <Row label={t('settings.license')}>
              <span className="font-mono">Apache-2.0</span>
            </Row>
            <Row label={t('settings.contribute')}>
              <ExternalAnchor href={LINKS.contributing}>CONTRIBUTING.md</ExternalAnchor>
            </Row>
          </dl>
        </Section>
      </div>
    </>
  );
}
