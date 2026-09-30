"""Bounded execution with truthful terminal and tool states."""
import asyncio
import json
import time
from collections.abc import AsyncIterator
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import uuid4

from .profile import Profile
from .provider import complete
from .streaming import IncompleteResponse
from .tools import ToolContext, ToolRegistry
from .trace import trace_payload


@dataclass(frozen=True)
class Limits:
    max_steps: int = 8
    max_tool_calls: int = 32
    timeout_seconds: float = 120
    max_tool_result_chars: int = 32000


async def events(
    execution_id: str, message: str, history: list[dict], profile: Profile, profile_token: str,
    registry: ToolRegistry, cancel: asyncio.Event, *, prompt: str, limits: Limits,
    confirmation_token: str | None = None,
) -> AsyncIterator[dict]:
    def event(kind: str, **values):
        return {"v": 1, "executionId": execution_id, "type": kind, **values}

    yield event("run.started")
    status = "completed"
    failure = None
    clock_context = {"now": datetime.now(timezone.utc).isoformat(), "timezone": "UTC", "defaultRangeDays": 1}
    if profile.timeContext:
        clock_context.update(profile.timeContext.model_dump())
    prompt += "\nTrusted current request time context: " + json.dumps(clock_context) + "\nUse this clock for relative dates; never use training dates or dates from older conversations as now."
    messages = [{"role": "system", "content": prompt}, *history, {"role": "user", "content": message}]
    tools = registry.allowed(profile.tools)
    remaining = limits.timeout_seconds
    if profile.deadlineMs is not None:
        remaining = min(remaining, (profile.deadlineMs - time.time() * 1000) / 1000)
    context = ToolContext(execution_id, profile.sub, profile_token, confirmation_token, profile.deadlineMs)
    deadline = asyncio.get_running_loop().time() + remaining
    summarize_only = False

    async def bounded(awaitable):
        if cancel.is_set() or asyncio.get_running_loop().time() >= deadline:
            awaitable.close()
            if cancel.is_set():
                raise asyncio.CancelledError()
            raise TimeoutError()
        task = asyncio.create_task(awaitable)
        stopped = asyncio.create_task(cancel.wait())
        try:
            done, _ = await asyncio.wait(
                [task, stopped], timeout=max(0, deadline - asyncio.get_running_loop().time()),
                return_when=asyncio.FIRST_COMPLETED,
            )
            if stopped in done:
                raise asyncio.CancelledError()
            if task not in done:
                raise TimeoutError()
            return task.result()
        finally:
            for pending in (task, stopped):
                if not pending.done():
                    pending.cancel()
            await asyncio.gather(task, stopped, return_exceptions=True)

    active_tool = None
    active_write = False
    tool_count = 0
    try:
        for _ in range(limits.max_steps):
            if cancel.is_set():
                raise asyncio.CancelledError()
            chunks = asyncio.Queue()
            async def on_text(text):
                await chunks.put(text)
            model_task = asyncio.create_task(bounded(complete(profile.model, messages, {} if summarize_only else tools, on_text)))
            emitted_text = False
            try:
                while not model_task.done() or not chunks.empty():
                    if not chunks.empty():
                        emitted_text = True
                        yield event("text.delta", delta=chunks.get_nowait())
                    else:
                        try:
                            chunk = await asyncio.wait_for(chunks.get(), timeout=0.02)
                            emitted_text = True
                            yield event("text.delta", delta=chunk)
                        except TimeoutError:
                            continue
                reply = await model_task
            finally:
                if not model_task.done():
                    model_task.cancel()
                await asyncio.gather(model_task, return_exceptions=True)
            messages.append(reply)
            content = reply.get("content")
            if content and not emitted_text:
                yield event("text.delta", delta=content)
            calls = reply.get("tool_calls") or []
            if not calls:
                if not content:
                    raise ValueError("Empty model response")
                break
            if summarize_only:
                raise IncompleteResponse("Summary requested more tools")
            confirmation_required = False
            for call in calls:
                tool_count += 1
                if tool_count > limits.max_tool_calls:
                    raise IncompleteResponse("Tool call limit reached")
                name = call["function"]["name"]
                call_id = call.get("id") or str(uuid4())
                tool = tools.get(name)
                active_tool = {"toolCallId": call_id, "toolName": name}
                active_write = bool(tool and tool.writes)
                yield event("tool.started", **active_tool, status="running")
                if tool is None:
                    raise ValueError("Unavailable tool")
                if tool.writes and not confirmation_token:
                    yield event("tool.completed", **active_tool, status="confirmation_required")
                    active_tool = None
                    status = "partial"
                    confirmation_required = True
                    break
                arguments = json.loads(call["function"]["arguments"])
                if not isinstance(arguments, dict):
                    raise ValueError("Invalid tool arguments")
                result = await bounded(tool.handler(arguments, context))
                trace = trace_payload(result.data)
                serialized = trace["text"]
                if trace["truncated"] or len(serialized) > limits.max_tool_result_chars:
                    serialized = json.dumps({"message": "Tool result exceeds runtime limit"})
                    result_status = "partial"
                else:
                    result_status = result.status
                yield event("tool.completed", **active_tool, status=result_status, result=json.loads(serialized))
                active_tool = None
                messages.append({"role": "tool", "tool_call_id": call_id, "content": serialized})
                if result_status != "completed":
                    status = "partial"
            if confirmation_required:
                break
            if status == "partial":
                summarize_only = True
                messages.append({"role": "system", "content":
                    "Summarize only the available evidence now. Clearly disclose incomplete results, "
                    "failures and uncertainty. Do not request additional tools or claim complete coverage."})
        else:
            status = "partial"
            failure = {"code": "step_limit", "message": "Execution step limit reached"}
    except asyncio.CancelledError:
        status = "cancelled"
    except IncompleteResponse:
        status = "partial"
        failure = {"code": "incomplete_response", "message": "Execution did not produce a complete response"}
    except TimeoutError:
        status = "partial"
        failure = {"code": "timeout", "message": "Execution time limit reached"}
    except Exception:
        status = "error"
        failure = {"code": "execution_failed", "message": "Model or tool execution failed"}
    if active_tool:
        tool_status = "unknown" if active_write else ("cancelled" if status == "cancelled" else "error")
        yield event("tool.completed", **active_tool, status=tool_status)
        if active_write:
            status = "partial"
    yield event("run.completed", status=status, **({"error": failure} if failure else {}))
