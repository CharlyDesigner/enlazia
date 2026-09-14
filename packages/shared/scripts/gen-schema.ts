// Generates schemas/connector.schema.json from the zod manifest schema so editors
// can validate and autocomplete connector files.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { connectorManifestSchema } from '../src/manifest.js';

const out = path.resolve(import.meta.dirname, '../../../schemas/connector.schema.json');
const schema = z.toJSONSchema(connectorManifestSchema, { io: 'input' });

mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(
  out,
  `${JSON.stringify({ ...schema, $id: 'https://github.com/CharlyDesigner/enlazia/schemas/connector.schema.json', title: 'Enlazia connector manifest' }, null, 2)}\n`,
);
console.log(`Wrote ${path.relative(process.cwd(), out)}`);
