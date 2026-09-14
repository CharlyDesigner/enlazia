import { z } from 'zod';
import { httpMethod } from './manifest.js';

export type Meta = {
  name: 'Enlazia';
  version: string;
  demo: boolean;
  authRequired: boolean;
  authenticated: boolean;
  connectorsLoaded: number;
};

export type TestResult = {
  ok: boolean;
  status?: number;
  durationMs: number;
  message?: string;
};

/** A saved connection as returned to the browser. Secrets never leave the server. */
export type Connection = {
  id: string;
  connectorId: string;
  name: string;
  /** Non-secret field values. */
  config: Record<string, string>;
  /** Keys of secret fields that have a stored value. */
  secretsSet: string[];
  lastTest: (TestResult & { at: string }) | null;
  createdAt: string;
  updatedAt: string;
};

export const createConnectionInput = z.object({
  connectorId: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  values: z.record(z.string(), z.string()),
});
export type CreateConnectionInput = z.infer<typeof createConnectionInput>;

/** Empty secret values keep the stored secret. */
export const updateConnectionInput = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  values: z.record(z.string(), z.string()).optional(),
});
export type UpdateConnectionInput = z.infer<typeof updateConnectionInput>;

export const chatMessage = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});
export type ChatMessage = z.infer<typeof chatMessage>;

export const chatRequest = z.object({
  connectionId: z.string().min(1),
  model: z.string().min(1),
  messages: z.array(chatMessage).min(1),
  system: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().max(200_000).optional(),
});
export type ChatRequest = z.infer<typeof chatRequest>;

export type ChatStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; durationMs: number }
  | { type: 'error'; message: string };

export const proxyRequest = z.object({
  method: httpMethod,
  path: z.string().startsWith('/'),
  query: z.record(z.string(), z.string()).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
});
export type ProxyRequest = z.infer<typeof proxyRequest>;

export type ProxyResponse = {
  status: number;
  headers: Record<string, string>;
  body: string;
  durationMs: number;
};

export type LogKind = 'test' | 'models' | 'chat' | 'request';

export type LogEntry = {
  id: number;
  connectionId: string | null;
  connectionName: string | null;
  kind: LogKind;
  method: string;
  url: string;
  status: number | null;
  durationMs: number;
  error: string | null;
  createdAt: string;
};

export type Stats = {
  connections: number;
  calls24h: number;
  errors24h: number;
};

export type ApiError = { error: string; details?: unknown };
