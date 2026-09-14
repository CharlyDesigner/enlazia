import { send, UpstreamError } from '../http.js';
import { readSse } from '../sse.js';
import type { AiAdapter } from './types.js';

type StreamEvent = {
  type: string;
  delta?: { type?: string; text?: string };
  error?: { message?: string };
};

export const anthropicAdapter: AiAdapter = {
  async listModels(ctx) {
    const res = await send(ctx, { method: 'GET', path: '/v1/models', query: { limit: '1000' } });
    const json = (await res.json()) as { data?: Array<{ id: string }> };
    return (json.data ?? []).map((m) => m.id);
  },

  async chat(ctx, req, onDelta) {
    const res = await send(ctx, {
      method: 'POST',
      path: '/v1/messages',
      body: JSON.stringify({
        model: req.model,
        max_tokens: req.maxTokens ?? 4096,
        system: req.system || undefined,
        messages: req.messages,
        temperature: req.temperature,
        stream: true,
      }),
    });
    if (!res.body) throw new UpstreamError(res.status, 'Empty response body');

    for await (const { data } of readSse(res.body)) {
      const event = JSON.parse(data) as StreamEvent;
      if (event.type === 'error') throw new UpstreamError(res.status, event.error?.message ?? 'Stream error');
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta' && event.delta.text) {
        onDelta(event.delta.text);
      }
      if (event.type === 'message_stop') break;
    }
  },
};
