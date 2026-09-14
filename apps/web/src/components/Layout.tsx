import { Blocks, LayoutDashboard, Menu, MessagesSquare, Moon, Plug, ScrollText, Settings, Sun, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { LINKS, useApp } from '../app-context';
import { useI18n, type MessageKey } from '../i18n';
import { useTheme } from '../theme';
import { Button, cx } from './ui';

const NAV: Array<{ href: string; label: MessageKey; icon: typeof Plug }> = [
  { href: '/', label: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/catalog', label: 'nav.catalog', icon: Blocks },
  { href: '/connections', label: 'nav.connections', icon: Plug },
  { href: '/playground', label: 'nav.playground', icon: MessagesSquare },
  { href: '/logs', label: 'nav.logs', icon: ScrollText },
  { href: '/settings', label: 'nav.settings', icon: Settings },
];

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-lg">
      <img src="/favicon.svg" alt="" className="size-8 rounded-lg" />
      <span className="text-lg font-semibold tracking-tight">Enlazia</span>
    </Link>
  );
}

function Preferences() {
  const { locale, setLocale, t } = useI18n();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && document.documentElement.dataset.theme === 'dark');

  return (
    <div className="flex items-center justify-between gap-2">
      <div role="group" aria-label={t('lang.label')} className="flex rounded-lg border border-border p-0.5">
        {(['es', 'en'] as const).map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={locale === code}
            className={cx(
              'h-8 cursor-pointer rounded-md px-2.5 font-mono text-xs uppercase transition-colors',
              locale === code ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {code}
          </button>
        ))}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        aria-label={`${t('theme.label')}: ${isDark ? t('theme.light') : t('theme.dark')}`}
      >
        {isDark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
      </Button>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const { meta } = useApp();

  useEffect(() => setOpen(false), [location]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-surface transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <Brand />
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(false)} aria-label={t('common.close')}>
            <X className="size-5" aria-hidden />
          </Button>
        </div>

        <nav aria-label={t('nav.main')} className="flex-1 overflow-y-auto px-3 py-2">
          <ul className="flex flex-col gap-0.5">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = href === '/' ? location === '/' : location.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cx(
                      'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                      active ? 'bg-accent-soft text-accent-text' : 'text-muted hover:bg-surface-2 hover:text-fg',
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                    {t(label)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex flex-col gap-3 border-t border-border p-4">
          <Preferences />
          <p className="text-xs text-muted">
            {t('nav.madeBy')}{' '}
            <a href={LINKS.author} target="_blank" rel="noreferrer" className="font-medium text-fg underline-offset-2 hover:underline">
              Charly Designer
            </a>
            <span className="font-mono"> · v{meta.version}</span>
          </p>
        </div>
      </aside>

      {open ? (
        <button type="button" aria-label={t('common.close')} className="fixed inset-0 z-30 bg-bg/70 lg:hidden" onClick={() => setOpen(false)} />
      ) : null}

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-bg/90 px-2 backdrop-blur lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label={t('nav.menu')} aria-expanded={open}>
            <Menu className="size-5" aria-hidden />
          </Button>
          <Brand />
        </header>
        {meta.demo ? (
          <div className="border-b border-warning/30 bg-warning-soft px-4 py-2 text-center text-sm text-warning">{t('demo.banner')}</div>
        ) : null}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
