import { z } from 'zod';

/** Text available in both supported languages. */
export const localizedText = z.object({
  es: z.string().min(1),
  en: z.string().min(1),
});
export type LocalizedText = z.infer<typeof localizedText>;

export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

const slug = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'lowercase letters, numbers and dashes');

/** A user-editable field rendered as a form input when creating a connection. */
export const fieldSchema = z.object({
  key: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/),
  label: localizedText,
  type: z.enum(['text', 'secret', 'url', 'select']),
  required: z.boolean().default(true),
  default: z.string().optional(),
  placeholder: z.string().optional(),
  help: localizedText.optional(),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
});
export type ConnectorField = z.infer<typeof fieldSchema>;

/** How credentials are injected into outgoing requests. `field` refers to a field key. */
export const authSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('none') }),
  z.object({ type: z.literal('bearer'), field: z.string() }),
  z.object({
    type: z.literal('header'),
    /** Fixed header name, or `headerField` to let the user choose it. */
    header: z.string().optional(),
    headerField: z.string().optional(),
    field: z.string(),
    prefix: z.string().optional(),
  }),
  z.object({ type: z.literal('query'), param: z.string(), field: z.string() }),
  z.object({ type: z.literal('basic'), usernameField: z.string(), passwordField: z.string() }),
]);
export type ConnectorAuth = z.infer<typeof authSchema>;

export const CONNECTOR_KINDS = ['ai-openai-compatible', 'ai-anthropic', 'ai-gemini', 'rest'] as const;
export type ConnectorKind = (typeof CONNECTOR_KINDS)[number];

export const httpMethod = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
export type HttpMethod = z.infer<typeof httpMethod>;

/** A predefined request users can run from the playground (REST connectors). */
export const actionSchema = z.object({
  id: slug,
  name: localizedText,
  method: httpMethod,
  path: z.string().startsWith('/'),
  description: localizedText.optional(),
  sampleBody: z.unknown().optional(),
});
export type ConnectorAction = z.infer<typeof actionSchema>;

/**
 * Connector manifest. Drop a JSON file matching this schema into `connectors/`
 * (or `<data>/connectors/`) and Enlazia picks it up on start.
 * `baseUrl` may reference field values with `{{fieldKey}}`.
 */
export const connectorManifestSchema = z.object({
  $schema: z.string().optional(),
  id: slug,
  name: z.string().min(1),
  category: z.enum(['ai', 'api']),
  kind: z.enum(CONNECTOR_KINDS),
  description: localizedText,
  website: z.url().optional(),
  docs: z.url().optional(),
  /** Brand color used for the generated avatar in the catalog. */
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  tags: z.array(z.string()).default([]),
  baseUrl: z.string().min(1),
  auth: authSchema,
  fields: z.array(fieldSchema).default([]),
  defaultHeaders: z.record(z.string(), z.string()).optional(),
  /** Request used by "Test connection". Defaults to listing models for AI kinds. */
  test: z
    .object({ method: httpMethod.default('GET'), path: z.string().startsWith('/'), expectStatus: z.number().int().optional() })
    .optional(),
  models: z
    .object({
      /** Whether the provider exposes a model listing endpoint. */
      listable: z.boolean().default(true),
      suggested: z.array(z.string()).default([]),
    })
    .optional(),
  actions: z.array(actionSchema).default([]),
});
export type ConnectorManifest = z.infer<typeof connectorManifestSchema>;
