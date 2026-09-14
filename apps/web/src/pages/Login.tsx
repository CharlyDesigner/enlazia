import { useState, type FormEvent } from 'react';
import { Button, Card, ErrorNote, Field, Input } from '../components/ui';
import { useI18n } from '../i18n';
import { api } from '../lib/api';

export function Login({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.login(password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        <img src="/favicon.svg" alt="" className="mb-4 size-12 rounded-xl" />
        <h1 className="text-xl font-semibold">{t('login.title')}</h1>
        <p className="mt-1 mb-5 text-sm text-muted">{t('login.subtitle')}</p>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <ErrorNote error={error} />
          <Field label={t('login.password')} htmlFor="login-password">
            <Input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
          </Field>
          <Button type="submit" loading={busy} disabled={!password}>
            {t('login.submit')}
          </Button>
        </form>
      </Card>
    </main>
  );
}
