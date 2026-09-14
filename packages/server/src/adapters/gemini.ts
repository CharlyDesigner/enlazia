import { send, UpstreamError } from '../http.js';
import { readSse } from '../sse.js';
import type { AiAdapter } from './types.js';

type GeminiChunk = {
  error?: { message?: string };
  promptFeedback?: { blockReason?: string };
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

export const geminiAdapter: AiAdapter = {
  async listModels(ctx) {
    const res = await send(ctx, { method: 'GET', path: '/v1beta/models', query: { pageSize: '1000' } });
    const json = (await res.json()) as {
      models?: Array<{ name: string; supportedGenerationMethods?: string[] }>;
    };
    return (json.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''))
      .sort();
  },

  async chat(ctx, req, onDelta) {
    const res = await send(ctx, {
      method: 'POST',
      path: `/v1beta/models/${encodeURIComponent(req.model)}:streamGenerateContent`,
      query: { alt: 'sse' },
      body: JSON.stringify({
        contents: req.messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        systemInstruction: req.system ? { parts: [{ text: req.system }] } : undefined,
        generationConfig: { temperature: req.temperature, maxOutputTokens: req.maxTokens },
      }),
    });
    if (!res.body) throw new UpstreamError(res.status, 'Empty response body');

    for await (const { data } of readSse(res.body)) {
      const chunk = JSON.parse(data) as GeminiChunk;
      if (chunk.error) throw new UpstreamError(res.status, chunk.error.message ?? 'Stream error');
      if (chunk.promptFeedback?.blockReason) {
        throw new UpstreamError(res.status, `Blocked by provider: ${chunk.promptFeedback.blockReason}`);
      }
      const text = chunk.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('');
      if (text) onDelta(text);
    }
  },
};
