export type SseMessage = { event?: string; data: string };

/** Parses a text/event-stream body into messages. */
export async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator<SseMessage> {
  const decoder = new TextDecoder();
  let buffer = '';
  let event: string | undefined;
  let data: string[] = [];

  function* flushLine(rawLine: string): Generator<SseMessage> {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
    if (line === '') {
      if (data.length) yield { event, data: data.join('\n') };
      event = undefined;
      data = [];
      return;
    }
    if (line.startsWith(':')) return;
    const colon = line.indexOf(':');
    const field = colon < 0 ? line : line.slice(0, colon);
    let value = colon < 0 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'data') data.push(value);
    else if (field === 'event') event = value;
  }

  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true });
    let index: number;
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 1);
      yield* flushLine(line);
    }
  }
  buffer += decoder.decode();
  if (buffer) yield* flushLine(buffer);
  if (data.length) yield { event, data: data.join('\n') };
}
