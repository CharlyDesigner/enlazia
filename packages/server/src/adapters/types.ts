import type { ChatRequest } from '@enlazia/shared';
import type { RequestContext } from '../http.js';

export type AiAdapter = {
  listModels(ctx: RequestContext): Promise<string[]>;
  /** Streams the assistant reply, calling `onDelta` for every text chunk. */
  chat(ctx: RequestContext, req: ChatRequest, onDelta: (text: string) => void): Promise<void>;
};
