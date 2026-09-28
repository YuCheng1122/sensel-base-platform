# @sensel/chat

Reusable persisted chat UI with model selection, conversation history/deletion, streamed text, explicit incomplete/error states, cancellation and tool trace details. Consumes the platform `/api/core` REST/SSE contract and `@sensel/ui`; no domain schema or search engine is required.

```tsx
import { ChatWorkspace } from '@sensel/chat';
// Render inside an authenticated application shell.
<ChatWorkspace />
```

`readAgentStream` handles arbitrary UTF-8 chunks, CRLF, multiline data and final unterminated SSE frames. `ChatWorkspace` renders plain text deliberately: model output is not interpreted as HTML. Tool traces contain the server-approved event payload. Domain-specific rich citation renderers remain an extension for a later release; the base does not ship SOC cards.

Validation: root `npm run typecheck`, `npm run test:ui`. Browser coverage checks reload persistence, streaming failure and stopping a stream. Tool traces are restored from persisted message records when opening a conversation.
