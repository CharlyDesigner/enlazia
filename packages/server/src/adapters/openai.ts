import { send, UpstreamError } from '../http.js';
import { readSse } from '../sse.js';
import type { AiAdapter } from './types.js';

type ChunkPayload = {
  error?: { message?: string };
  choices?: Array<{ delta?: { content?: string | null } }>;
};

/** Works with any provider exposing the OpenAI `/chat/completions` API. */
export const openaiAdapter: AiAdapter = {
  async listModels(ctx) {
    const res = await send(ctx, { method: 'GET', path: '/models' });
    const json = (await res.json()) as { data?: Array<{ id: string }> };
    return (json.data ?? []).map((m) => m.id).sort();
  },

  async chat(ctx, req, onDelta) {
    const messages = [...(req.system ? [{ role: 'system', content: req.system }] : []), ...req.messages];
    const res = await send(ctx, {
      method: 'POST',
      path: '/chat/completions',
      body: JSON.stringify({
        model: req.model,
        messages,
        stream: true,
        temperature: req.temperature,
        max_tokens: req.maxTokens,
      }),
    });
    if (!res.body) throw new UpstreamError(res.status, 'Empty response body');

    for await (const { data } of readSse(res.body)) {
      if (data === '[DONE]') break;
      const chunk = JSON.parse(data) as ChunkPayload;
      if (chunk.error) throw new UpstreamError(res.status, chunk.error.message ?? 'Stream error');
      const text = chunk.choices?.[0]?.delta?.content;
      if (text) onDelta(text);
    }
  },
};
