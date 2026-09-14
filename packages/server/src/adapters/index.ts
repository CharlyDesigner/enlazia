import type { ConnectorKind } from '@enlazia/shared';
import { anthropicAdapter } from './anthropic.js';
import { geminiAdapter } from './gemini.js';
import { openaiAdapter } from './openai.js';
import type { AiAdapter } from './types.js';

const ADAPTERS: Partial<Record<ConnectorKind, AiAdapter>> = {
  'ai-openai-compatible': openaiAdapter,
  'ai-anthropic': anthropicAdapter,
  'ai-gemini': geminiAdapter,
};

export function getAiAdapter(kind: ConnectorKind): AiAdapter | null {
  return ADAPTERS[kind] ?? null;
}

export type { AiAdapter } from './types.js';
