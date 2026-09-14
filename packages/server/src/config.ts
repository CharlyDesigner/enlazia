import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

declare const __ENLAZIA_VERSION__: string | undefined;

export type Config = {
  version: string;
  port: number;
  host: string;
  rootDir: string;
  dataDir: string;
  webDir: string;
  connectorDirs: string[];
  password: string | null;
  demo: boolean;
  masterKey: Buffer;
  sessionSecret: Buffer;
  behindPassenger: boolean;
};

/** Walks up from `start` until a folder containing `connectors/` is found. */
export function findRoot(start: string): string {
  let dir = path.resolve(start);
  for (;;) {
    if (existsSync(path.join(dir, 'connectors'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(start);
    dir = parent;
  }
}

function loadMasterKey(env: NodeJS.ProcessEnv, dataDir: string): Buffer {
  const fromEnv = env.ENLAZIA_MASTER_KEY?.trim();
  if (fromEnv) {
    const key = Buffer.from(fromEnv, 'base64');
    if (key.length !== 32) throw new Error('ENLAZIA_MASTER_KEY must be 32 bytes encoded in base64');
    return key;
  }
  const file = path.join(dataDir, '.master-key');
  if (existsSync(file)) {
    const key = Buffer.from(readFileSync(file, 'utf8').trim(), 'base64');
    if (key.length !== 32) throw new Error(`Invalid master key in ${file}`);
    return key;
  }
  const key = randomBytes(32);
  writeFileSync(file, key.toString('base64'), { mode: 0o600 });
  return key;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const rootDir = env.ENLAZIA_ROOT ? path.resolve(env.ENLAZIA_ROOT) : findRoot(process.cwd());
  const dataDir = path.resolve(rootDir, env.ENLAZIA_DATA_DIR || 'data');
  mkdirSync(path.join(dataDir, 'connectors'), { recursive: true });

  const password = env.ENLAZIA_PASSWORD?.trim() || null;
  const masterKey = loadMasterKey(env, dataDir);
  // Sessions are invalidated when the password changes.
  const sessionSecret = createHash('sha256')
    .update(masterKey)
    .update(`session:${password ?? ''}`)
    .digest();

  return {
    version: typeof __ENLAZIA_VERSION__ === 'string' ? __ENLAZIA_VERSION__ : '0.0.0-dev',
    port: Number(env.PORT) || 8787,
    host: env.HOST || '127.0.0.1',
    rootDir,
    dataDir,
    webDir: path.resolve(rootDir, env.ENLAZIA_WEB_DIR || 'apps/web/dist'),
    connectorDirs: [path.join(rootDir, 'connectors'), path.join(dataDir, 'connectors')],
    password,
    demo: ['1', 'true', 'yes'].includes((env.ENLAZIA_DEMO ?? '').toLowerCase()),
    masterKey,
    sessionSecret,
    behindPassenger: Boolean(env.PASSENGER_APP_ENV) || 'PhusionPassenger' in globalThis,
  };
}
