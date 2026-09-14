import { useEffect, useMemo } from 'react';
import { Link, Route, Switch } from 'wouter';
import { AppContext, type AppContextValue } from './app-context';
import { Layout } from './components/Layout';
import { Button, ErrorNote, Spinner } from './components/ui';
import { I18nProvider, useI18n } from './i18n';
import { api, UNAUTHORIZED_EVENT } from './lib/api';
import { useAsync } from './lib/useAsync';
import { Catalog } from './pages/Catalog';
import { Connections } from './pages/Connections';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Logs } from './pages/Logs';
import { Playground } from './pages/Playground';
import { Settings } from './pages/Settings';
import { ThemeProvider } from './theme';

function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="font-mono text-5xl font-semibold text-accent-text">404</p>
      <Link href="/" className="mt-4 inline-block text-sm font-medium hover:underline">
        ← Enlazia
      </Link>
    </div>
  );
}

function Root() {
  const { t } = useI18n();
  const meta = useAsync(api.meta);
  const connectors = useAsync(api.connectors);

  useEffect(() => {
    const onUnauthorized = () => void meta.reload();
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [meta.reload]);

  const value = useMemo<AppContextValue | null>(() => {
    if (!meta.data) return null;
    const list = connectors.data ?? [];
    return { meta: meta.data, connectors: list, connectorById: new Map(list.map((c) => [c.id, c])), refreshMeta: meta.reload };
  }, [meta.data, meta.reload, connectors.data]);

  if (!value) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        {meta.error ? (
          <>
            <ErrorNote error={meta.error} />
            <Button onClick={() => void meta.reload()}>{t('common.retry')}</Button>
          </>
        ) : (
          <Spinner label={t('common.loading')} />
        )}
      </main>
    );
  }

  if (value.meta.authRequired && !value.meta.authenticated) {
    return (
      <Login
        onSuccess={() => {
          void meta.reload();
          void connectors.reload();
        }}
      />
    );
  }

  return (
    <AppContext.Provider value={value}>
      <Layout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/catalog" component={Catalog} />
          <Route path="/connections" component={Connections} />
          <Route path="/playground" component={Playground} />
          <Route path="/logs" component={Logs} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </AppContext.Provider>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <Root />
      </I18nProvider>
    </ThemeProvider>
  );
}
