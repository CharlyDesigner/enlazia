import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { connectorManifestSchema, type ConnectorManifest } from '@enlazia/shared';

export type RegistryError = { file: string; message: string };

export type Registry = {
  list(): ConnectorManifest[];
  get(id: string): ConnectorManifest | undefined;
  errors: RegistryError[];
};

function jsonFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return jsonFiles(full);
    return name.endsWith('.json') ? [full] : [];
  });
}

/** Loads and validates connector manifests. Later directories override earlier ones by `id`. */
export function loadRegistry(dirs: string[]): Registry {
  const byId = new Map<string, ConnectorManifest>();
  const errors: RegistryError[] = [];

  for (const dir of dirs) {
    for (const file of jsonFiles(dir)) {
      try {
        const parsed = connectorManifestSchema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
        if (!parsed.success) {
          errors.push({ file, message: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
          continue;
        }
        const problem = checkReferences(parsed.data);
        if (problem) {
          errors.push({ file, message: problem });
          continue;
        }
        byId.set(parsed.data.id, parsed.data);
      } catch (error) {
        errors.push({ file, message: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  const sorted = [...byId.values()].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  return { list: () => sorted, get: (id) => byId.get(id), errors };
}

/** Ensures auth and template placeholders point at declared fields. */
export function checkReferences(manifest: ConnectorManifest): string | null {
  if ((manifest.category === 'ai') !== manifest.kind.startsWith('ai-')) {
    return `kind "${manifest.kind}" does not match category "${manifest.category}"`;
  }
  const keys = new Set(manifest.fields.map((f) => f.key));
  const refs: string[] = [];
  const { auth } = manifest;
  if (auth.type === 'bearer' || auth.type === 'query') refs.push(auth.field);
  if (auth.type === 'header') {
    refs.push(auth.field);
    if (auth.headerField) refs.push(auth.headerField);
    if (!auth.header && !auth.headerField) return 'auth.header or auth.headerField is required';
  }
  if (auth.type === 'basic') refs.push(auth.usernameField, auth.passwordField);
  for (const match of manifest.baseUrl.matchAll(/\{\{(\w+)\}\}/g)) refs.push(match[1]!);
  const missing = refs.filter((r) => !keys.has(r));
  return missing.length ? `Undeclared fields referenced: ${[...new Set(missing)].join(', ')}` : null;
}
