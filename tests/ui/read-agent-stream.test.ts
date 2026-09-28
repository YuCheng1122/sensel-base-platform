import assert from "node:assert/strict";
import test from "node:test";
import { readAgentStream } from "../../packages/chat/src/read-agent-stream";

test("SSE parser preserves split UTF-8, CRLF, multiline data and final unterminated frame", async () => {
  const source =
    ': heartbeat\r\ndata: {"type":"text.delta",\r\ndata: "delta":"封包分析"}\r\n\r\ndata: {"type":"run.completed","status":"completed"}';
  const bytes = new TextEncoder().encode(source);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
      controller.close();
    },
  });
  const events = [];
  for await (const event of readAgentStream(stream)) events.push(event);
  assert.deepEqual(events, [
    { type: "text.delta", delta: "封包分析" },
    { type: "run.completed", status: "completed" },
  ]);
});

test("closing the stream consumer cancels the underlying reader", async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        new TextEncoder().encode(
          'data: {"type":"text.delta","delta":"partial"}\n\n',
        ),
      );
    },
    cancel() {
      cancelled = true;
    },
  });
  for await (const event of readAgentStream(stream)) {
    assert.deepEqual(event, { type: "text.delta", delta: "partial" });
    break;
  }
  assert.equal(cancelled, true);
});
