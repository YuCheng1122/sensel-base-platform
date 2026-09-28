/** Parse SSE framing across arbitrary UTF-8 chunks, including a final unterminated frame. */
export async function* readAgentStream(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let data: string[] = [];
  function parse() {
    const payload = data.join("\n");
    data = [];
    if (!payload || payload === "[DONE]") return undefined;
    try {
      return JSON.parse(payload) as unknown;
    } catch {
      return undefined;
    }
  }
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done
        ? decoder.decode()
        : decoder.decode(value, { stream: true });
      if (done && buffer && !buffer.endsWith("\n")) buffer += "\n";
      let boundary: number;
      while ((boundary = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, boundary).replace(/\r$/, "");
        buffer = buffer.slice(boundary + 1);
        if (line === "") {
          const event = parse();
          if (event !== undefined) yield event;
        } else if (line.startsWith("data:")) {
          data.push(line.slice(5).replace(/^ /, ""));
        }
      }
      if (done) {
        const event = parse();
        if (event !== undefined) yield event;
        return;
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
