import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import type { LogEntry, LogKind, Stats, TestResult } from '@enlazia/shared';

export type ConnectionRow = {
  id: string;
  connectorId: string;
  name: string;
  config: Record<string, string>;
  secretsEnc: string | null;
  secretKeys: string[];
  lastTest: (TestResult & { at: string }) | null;
  createdAt: string;
  updatedAt: string;
};

type RawConnection = {
  id: string;
  connector_id: string;
  name: string;
  config_json: string;
  secrets_enc: string | null;
  secret_keys: string;
  last_test_json: string | null;
  created_at: string;
  updated_at: string;
};

const MAX_LOGS = 5000;

const SCHEMA = `
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY,
  connector_id TEXT NOT NULL,
  name TEXT NOT NULL,
  config_json TEXT NOT NULL DEFAULT '{}',
  secrets_enc TEXT,
  secret_keys TEXT NOT NULL DEFAULT '[]',
  last_test_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS request_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  connection_id TEXT,
  kind TEXT NOT NULL,
  method TEXT NOT NULL,
  url TEXT NOT NULL,
  status INTEGER,
  duration_ms INTEGER NOT NULL,
  error TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS request_logs_created ON request_logs(created_at);
`;

function toRow(raw: RawConnection): ConnectionRow {
  return {
    id: raw.id,
    connectorId: raw.connector_id,
    name: raw.name,
    config: JSON.parse(raw.config_json) as Record<string, string>,
    secretsEnc: raw.secrets_enc,
    secretKeys: JSON.parse(raw.secret_keys) as string[],
    lastTest: raw.last_test_json ? (JSON.parse(raw.last_test_json) as ConnectionRow['lastTest']) : null,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export class Store {
  private readonly db: DatabaseSync;

  constructor(file: string) {
    this.db = new DatabaseSync(file);
    this.db.exec(SCHEMA);
  }

  close(): void {
    this.db.close();
  }

  listConnections(): ConnectionRow[] {
    const rows = this.db.prepare('SELECT * FROM connections ORDER BY created_at DESC').all() as RawConnection[];
    return rows.map(toRow);
  }

  getConnection(id: string): ConnectionRow | null {
    const raw = this.db.prepare('SELECT * FROM connections WHERE id = ?').get(id) as RawConnection | undefined;
    return raw ? toRow(raw) : null;
  }

  createConnection(input: {
    connectorId: string;
    name: string;
    config: Record<string, string>;
    secretsEnc: string | null;
    secretKeys: string[];
  }): ConnectionRow {
    const now = new Date().toISOString();
    const id = randomUUID();
    this.db
      .prepare(
        `INSERT INTO connections (id, connector_id, name, config_json, secrets_enc, secret_keys, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, input.connectorId, input.name, JSON.stringify(input.config), input.secretsEnc, JSON.stringify(input.secretKeys), now, now);
    return this.getConnection(id)!;
  }

  updateConnection(
    id: string,
    input: { name: string; config: Record<string, string>; secretsEnc: string | null; secretKeys: string[] },
  ): ConnectionRow | null {
    this.db
      .prepare(
        `UPDATE connections SET name = ?, config_json = ?, secrets_enc = ?, secret_keys = ?, updated_at = ? WHERE id = ?`,
      )
      .run(input.name, JSON.stringify(input.config), input.secretsEnc, JSON.stringify(input.secretKeys), new Date().toISOString(), id);
    return this.getConnection(id);
  }

  setLastTest(id: string, result: TestResult): void {
    const value = JSON.stringify({ ...result, at: new Date().toISOString() });
    this.db.prepare('UPDATE connections SET last_test_json = ? WHERE id = ?').run(value, id);
  }

  deleteConnection(id: string): boolean {
    return Number(this.db.prepare('DELETE FROM connections WHERE id = ?').run(id).changes) > 0;
  }

  addLog(entry: {
    connectionId: string | null;
    kind: LogKind;
    method: string;
    url: string;
    status: number | null;
    durationMs: number;
    error: string | null;
  }): void {
    this.db
      .prepare(
        `INSERT INTO request_logs (connection_id, kind, method, url, status, duration_ms, error, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(entry.connectionId, entry.kind, entry.method, entry.url, entry.status, Math.round(entry.durationMs), entry.error, new Date().toISOString());
    this.db
      .prepare('DELETE FROM request_logs WHERE id <= (SELECT MAX(id) FROM request_logs) - ?')
      .run(MAX_LOGS);
  }

  listLogs(limit = 100): LogEntry[] {
    const rows = this.db
      .prepare(
        `SELECT l.id, l.connection_id, c.name AS connection_name, l.kind, l.method, l.url, l.status, l.duration_ms, l.error, l.created_at
         FROM request_logs l LEFT JOIN connections c ON c.id = l.connection_id
         ORDER BY l.id DESC LIMIT ?`,
      )
      .all(limit) as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      id: Number(r.id),
      connectionId: (r.connection_id as string | null) ?? null,
      connectionName: (r.connection_name as string | null) ?? null,
      kind: r.kind as LogKind,
      method: String(r.method),
      url: String(r.url),
      status: r.status === null ? null : Number(r.status),
      durationMs: Number(r.duration_ms),
      error: (r.error as string | null) ?? null,
      createdAt: String(r.created_at),
    }));
  }

  stats(): Stats {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const connections = this.db.prepare('SELECT COUNT(*) AS n FROM connections').get() as { n: number };
    const calls = this.db
      .prepare(
        `SELECT COUNT(*) AS n, SUM(CASE WHEN error IS NOT NULL OR status >= 400 THEN 1 ELSE 0 END) AS errors
         FROM request_logs WHERE created_at >= ?`,
      )
      .get(since) as { n: number; errors: number | null };
    return { connections: Number(connections.n), calls24h: Number(calls.n), errors24h: Number(calls.errors ?? 0) };
  }
}

export function openStore(file: string): Store {
  return new Store(file);
}
