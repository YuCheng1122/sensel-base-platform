# sensel-agent-core

Installable domain-independent Python runtime. Public API: `Settings`, `Limits`, `Tool`, `ToolContext`, `ToolResult`, `ToolRegistry`, `create_app`. It contains no database, Elasticsearch, SOC schema, customer prompt or customer tools.

From repository root:

```sh
uv sync --project python --frozen
uv run --project python ruff check python/src python/tests
uv run --project python pytest python/tests
uv build --project python
```

Install the resulting wheel in an independent Python 3.12+ environment. Template entry is `templates/project/agent/main.py`; set `AGENT_SHARED_SECRET` to a private 32+ character secret and run `uvicorn main:app --app-dir templates/project/agent --port 8001`. `BACKEND_URL` defaults to `http://127.0.0.1:3000`. `APP_ENV` defaults to production. Deterministic fake mode requires both `APP_ENV=development` and `AGENT_ALLOW_FAKE=true`; production refuses fake mode.

Register project tools with `ToolRegistry`, return a truthful `ToolResult`, and pass a project prompt to `create_app`. Write handlers must verify backend-issued confirmation tokens against exact operations; do not treat token presence as authorization. Only names present in the signed profile are available to the model.

See [HTTP contract](../contracts/runtime-v1.md) for signed profile, streaming, cancellation, and limits.

## Extraction and intentional changes

Source behavior reviewed in `sensel-agent/src/agent/model_profile.py`, `model_transport.py`, `model_factory.py`, `application/abort_registry.py`, and `AGENTS.md`. This is a selective reimplementation of domain-independent behavior, not byte-for-byte copying: short-lived signed model settings, per-request provider configuration, redirect rejection, tool registration, cancel cleanup, truthful failure states. Root extraction inventory records source baseline. Original files remain untouched.

Core excludes SOC graph, source-specific permission scope, investigation writes, domain tools/prompts/skills, conversation DB access, old API compatibility, LangChain/LangGraph/LiteLLM, asyncpg, Tavily, OpenCC and tiktoken. The new protocol is v1 for this platform, not wire-compatible with Digiwin's existing REST contract.

OpenAI-compatible, Anthropic and Gemini adapters support basic text plus function calls with mock HTTP tests (including Gemini thought signature forwarding). No real provider calls were used in validation. Real providers forward SSE text chunks and expose a synthetic function-call capability probe. Advanced provider features, SDK-specific retries, durable jobs and multi-worker cancellation are not implemented. These limits must be considered before migrating existing Digiwin consumers.

`trace.py` extracts the bounded redaction implementation from the source `agent/trace_payload.py`, excluding domain-specific event-reference collection. Streaming protocol and provider adapters are redesigned; existing SDK behavior is not assumed equivalent.

For browser smoke tests only, fake-model messages containing `[demo:slow]` delay two seconds per model turn; `[demo:error]` raises a synthetic failure. They have no special meaning for real providers. The runtime also bounds total tool calls (32 by default), marks provider truncation/incomplete streams partial, and emits conservative unknown status for interrupted writes.
