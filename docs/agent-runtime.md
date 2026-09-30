# Product Agent Runtime and Extensions

The root AGENTS.md guides coding agents. This document describes the Python Agent that runs in the product.

Public API: `Settings`, `Limits`, `Tool`, `ToolContext`, `ToolResult`, `ToolRegistry`, `create_app`. Customers register tools and prompts in their own `agent/main.py`. Core contains no SOC, Nginx, PCAP or direct database access.

After authorizing the user, model and conversation ownership, Web signs a profile valid for at most five minutes, bound to the user, execution, model settings and permitted tools. Agent calls backend tools over HTTP; the backend checks current account state and business authorization again. Tools should not receive database credentials.

OpenAI-compatible, Anthropic and Gemini adapters support basic streaming text and function calls, tested with mock HTTP. These lightweight transports replace rather than copy LangGraph/LiteLLM and are not equivalent to all legacy API/SDK features. See the [Python README](../python/README.md).

Executions have time, step and tool-call budgets. Cancellation stops pending I/O. Tool/final states distinguish errors, partial results, cancellation and unknown outcomes. Traces redact secrets, raw payloads and internal reasoning. The backend saves the assistant result before emitting completion; persistence failure is not reported as success.

Write tools require a confirmation token, but the customer handler must verify its binding to the exact operation. This version contains only a read-only sample tool, not a general approval UI. A timed-out tool that may already have written data must return unknown rather than be retried blindly.

The execution registry is in memory; multi-worker cancellation and durable pause/resume are not supported. Deploy one instance initially. Long PCAP analysis needs separate persistent job management.

Web sends only the latest 40 completed messages as model history; stored content is not truncated. If any selected entry exceeds 32000 JavaScript string units (UTF-16), Web returns `HISTORY_TOO_LARGE` before inserting the new user message or calling Agent, with guidance to start a new conversation. Existing full replies remain readable. This is a request limit, not history deletion or automatic summarization.


## Shared deadline, clock and partial explanation

Web signs an absolute 120-second `deadlineMs` and a `timeContext` from server time/platform timezone/default range. Python bounds execution by the smaller remaining signed deadline and its own limit; tool context forwards the deadline and backend tool authorization rejects expired work. Web allows five seconds for final persistence/status. Timeout is distinct from cancellation. Optional claims preserve older signed profiles.

A partial tool result may be followed by one tools-disabled evidence summary within the remaining budget. The terminal status stays partial. Confirmation-required writes stop without this summary; cancellation and exhausted deadlines do not launch more work. The default product prompt now requires observed evidence, uncertainty and treating tool content as data. Customer prompts still own domain semantics.

Provider quota display is independent of execution token accounting; see the reuse guide. Per-run token/cost reporting is not implemented.
