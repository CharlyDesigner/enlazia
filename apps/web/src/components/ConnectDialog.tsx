import type { Connection, ConnectorManifest, TestResult } from '@enlazia/shared';
import { CheckCircle2, ExternalLink, Eye, EyeOff, Lock, XCircle } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useI18n } from '../i18n';
import { api, ApiError } from '../lib/api';
import { ConnectorAvatar } from './ConnectorAvatar';
import { Button, Dialog, ErrorNote, Field, Input, Select, Spinner } from './ui';

type Props = {
  connector: ConnectorManifest;
  connection?: Connection;
  onClose: () => void;
  onSaved: (connection: Connection) => void;
};

export function ConnectDialog({ connector, connection, onClose, onSaved }: Props) {
  const { t, lt } = useI18n();
  const [name, setName] = useState(connection?.name ?? connector.name);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      connector.fields.filter((f) => f.type !== 'secret').map((f) => [f.key, connection?.config[f.key] ?? f.default ?? '']),
    ),
  );
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ key: string; message: string } | null>(null);
  const [saved, setSaved] = useState<Connection | null>(null);
  const [test, setTest] = useState<TestResult | null>(null);

  const formId = `connect-${connector.id}`;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldError(null);
    try {
      const result = connection
        ? await api.updateConnection(connection.id, { name, values })
        : await api.createConnection({ connectorId: connector.id, name, values });
      setSaved(result);
      onSaved(result);
      const outcome = await api.testConnection(result.id);
      setTest(outcome);
      onSaved({ ...result, lastTest: { ...outcome, at: new Date().toISOString() } });
    } catch (err) {
      const details = err instanceof ApiError ? (err.details as { field?: string } | undefined) : undefined;
      if (details?.field && err instanceof Error) setFieldError({ key: details.field, message: err.message });
      else setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const toggleReveal = (key: string) =>
    setRevealed((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const footer = saved ? (
    <Button onClick={onClose} disabled={saving}>
      {t('connect.done')}
    </Button>
  ) : (
    <>
      <Button variant="secondary" onClick={onClose}>
        {t('common.cancel')}
      </Button>
      <Button type="submit" form={formId} loading={saving}>
        {t('connect.saveAndTest')}
      </Button>
    </>
  );

  return (
    <Dialog
      open
      onClose={onClose}
      closeLabel={t('common.close')}
      title={t(connection ? 'connect.titleEdit' : 'connect.titleNew', { name: connector.name })}
      description={lt(connector.description)}
      footer={footer}
    >
      {saved ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <ConnectorAvatar connector={connector} />
          {saving || !test ? (
            <Spinner label={t('connect.testing')} />
          ) : test.ok ? (
            <p className="flex items-center gap-2 text-accent-text">
              <CheckCircle2 className="size-5" aria-hidden />
              {t('connect.testOk', { message: test.message ?? 'OK' })}
            </p>
          ) : (
            <p className="flex items-start gap-2 text-left text-danger">
              <XCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
              {t('connect.testFail', { message: test.message ?? `HTTP ${test.status ?? '?'}` })}
            </p>
          )}
        </div>
      ) : (
        <form id={formId} onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <ErrorNote error={error} />
          <Field label={t('connect.name')} htmlFor={`${formId}-name`} help={t('connect.nameHelp')} required>
            <Input id={`${formId}-name`} value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
          </Field>

          {connector.fields.map((field) => {
            const id = `${formId}-${field.key}`;
            const kept = field.type === 'secret' && connection?.secretsSet.includes(field.key);
            const errorMessage = fieldError?.key === field.key ? fieldError.message : null;
            const help = kept ? t('connect.secretKept') : field.help ? lt(field.help) : undefined;

            return (
              <Field key={field.key} label={lt(field.label)} htmlFor={id} help={help} error={errorMessage} required={field.required && !kept}>
                {field.type === 'select' ? (
                  <Select id={id} value={values[field.key] ?? ''} onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                ) : field.type === 'secret' ? (
                  <div className="relative">
                    <Input
                      id={id}
                      type={revealed.has(field.key) ? 'text' : 'password'}
                      autoComplete="off"
                      spellCheck={false}
                      className="pr-11 font-mono"
                      placeholder={kept ? '••••••••••••' : field.placeholder}
                      value={values[field.key] ?? ''}
                      onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => toggleReveal(field.key)}
                      aria-label={revealed.has(field.key) ? t('connect.hideSecret') : t('connect.showSecret')}
                      className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center text-muted hover:text-fg"
                    >
                      {revealed.has(field.key) ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                    </button>
                  </div>
                ) : (
                  <Input
                    id={id}
                    type={field.type === 'url' ? 'url' : 'text'}
                    spellCheck={false}
                    placeholder={field.placeholder}
                    value={values[field.key] ?? ''}
                    onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                  />
                )}
              </Field>
            );
          })}

          <div className="flex flex-col gap-2 rounded-lg bg-surface-2 px-3 py-2.5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-1.5">
              <Lock className="size-3.5" aria-hidden />
              {t('connect.encrypted')}
            </span>
            {connector.docs ? (
              <a href={connector.docs} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-medium text-accent-text hover:underline">
                {t('connect.getKey')}
                <ExternalLink className="size-3" aria-hidden />
              </a>
            ) : null}
          </div>
        </form>
      )}
    </Dialog>
  );
}
