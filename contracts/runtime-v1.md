# Runtime HTTP contract v1

Agent package `sensel-agent-core==0.1.0` supports this contract. Backend creates profiles; browsers never receive profile tokens/provider secrets. All non-health endpoints require `Authorization: Bearer <AGENT_SHARED_SECRET>`; use internal authenticated HTTPS across hosts. Secret must be at least 32 characters.

## Signed profile

Token is `base64url(JSON claims).base64url(HMAC-SHA256(secret, encodedClaims))`, without padding. Claims: `{v:1,sub:string,executionId:string,exp:unixSeconds,model:{provider,model,baseUrl?,apiKey?,timeoutSeconds?,maxOutputTokens?},tools:string[]}`. Expiry must be in the next 300 seconds and execution ID must match request. Provider values: `openai-compatible`, `anthropic`, `gemini`, `fake`. Default timeout 60 seconds/output limit 2048 tokens. Model base URL is required for OpenAI-compatible. Backend must validate model endpoint policy before signing. Profile tokens contain credentials and must never be logged. HMAC authenticates, not encrypts.

## Execution

`POST /v1/runs`: `{executionId,conversationId,message,profileToken,messages?:[{role:'user'|'assistant',content}],confirmationToken?:string}`. IDs 1–128 chars; execution ID uses letters, numbers, underscores and hyphens. Conversation ID is for backend ownership/persistence; backend must authorize and load history before calling Agent. Agent stores no conversations. Active execution IDs cannot repeat (409).

Response `application/x-ndjson`, one JSON event per line. Every event has `{v:1,executionId,type}`. Types:

- `run.started`
- `text.delta`: `{delta:string}`. Real providers forward SSE text chunks; fake mode emits deterministic turn text.
- `tool.started`: `{toolCallId,toolName,status:'running'}`
- `tool.completed`: `{toolCallId,toolName,status,result?}`. Status: `completed`, `partial`, `error`, `unknown`, `cancelled`, `confirmation_required`.
- `run.completed`: `{status,error?:{code,message}}`. Status: `completed`, `partial`, `error`, `cancelled`.

Tool partial/error/unknown cannot produce a completed run. Tools that mutate data require a confirmation token and MUST independently verify it in the backend against user, operation, arguments and expiry; runtime presence check is only a precondition. A write interrupted while in flight becomes `unknown` and run `partial`; do not blindly retry. Runtime max 8 model steps, 32 tool calls, 120 seconds total, 32000 characters per tool result. Limits are project-configurable via `Limits`.

`POST /v1/runs/{executionId}/cancel` returns `{executionId,status:'cancellation_requested'}` or 404. Cancellation is process-local: deploy one worker or add project-owned routing/registry before horizontal scale. Client disconnect cleanup cancels pending tasks. No durable resume/checkpoint support.

`POST /v1/models/test`: `{executionId,profileToken,mode?:'connection'|'tools'}`, invokes a minimal model request (can incur provider charge), returns `{executionId,status:'completed'}` or 502. Default mode tests connectivity. Tools mode asks for a synthetic function call and returns `toolSupported:boolean`; the function is not executed. This is a capability observation, not a model quality benchmark.

`GET /health`, `GET /ready`: `{status:'ok',contractVersion:1}`. Readiness confirms valid local configuration; it does not call billable providers.

## Customer tool example

Agent template registers `project_info`. Backend signs `tools:['project_info']` to allow it. Handler posts `{executionId,profileToken,arguments}` to backend `/api/agent/tools/project-info`, using service bearer authentication. Backend validates profile/identity and applies authorization/query bounds. No database credentials belong in Agent.

The template tool response includes `recentConversationCount` and `historyLimit:100`: it counts the current user’s bounded recent conversation list, not a total-history count.

Agent input limits are 32000 characters per current message/history content and at most 100 history messages. The Web bridge selects the latest 40 completed messages. If any selected saved message exceeds 32000 JavaScript string units (UTF-16), it returns HTTP 400 `HISTORY_TOO_LARGE` before inserting the new user message or contacting Agent, with guidance to start a new conversation. It does not truncate stored history.

Fake models require explicit `allow_fake` and an environment of `development` or `test`; unknown environment names are rejected when fake mode is requested. Production does not permit fake execution.
