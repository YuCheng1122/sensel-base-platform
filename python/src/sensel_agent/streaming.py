"""Provider SSE normalization; incomplete transport streams never imply completion."""
import json


class IncompleteResponse(ValueError):
    """Provider stopped before a complete answer could be produced."""


async def consume_stream(response, provider, on_text):
    reply = {"role": "assistant", "content": "", "tool_calls": []}
    calls = {}
    finished = False
    async for line in response.aiter_lines():
        if not line.startswith("data:"):
            continue
        payload = line[5:].strip()
        if payload == "[DONE]":
            finished = True
            break
        event = json.loads(payload)
        text = ""
        if provider == "openai-compatible":
            choices = event.get("choices", [])
            if not choices:
                continue
            delta = choices[0].get("delta", {})
            text = delta.get("content") or ""
            reason = choices[0].get("finish_reason")
            if reason in {"length", "content_filter"}:
                raise IncompleteResponse("Provider output was limited")
            finished |= reason is not None
            for item in delta.get("tool_calls", []):
                call = calls.setdefault(item["index"], {"id": "", "type": "function",
                    "function": {"name": "", "arguments": ""}})
                call["id"] += item.get("id", "")
                for key in ("name", "arguments"):
                    call["function"][key] += item.get("function", {}).get(key, "")
        elif provider == "anthropic":
            kind = event.get("type")
            if kind == "error":
                raise ValueError("Provider stream failed")
            if kind == "message_delta" and event.get("delta", {}).get("stop_reason") in {"max_tokens", "refusal"}:
                raise IncompleteResponse("Provider output was limited")
            if kind == "message_stop":
                finished = True
            if kind == "content_block_start" and event["content_block"]["type"] == "tool_use":
                block = event["content_block"]
                calls[event["index"]] = {"id": block["id"], "type": "function",
                    "function": {"name": block["name"], "arguments": ""}}
            if kind == "content_block_delta":
                delta = event["delta"]
                text = delta.get("text", "")
                if "partial_json" in delta:
                    calls[event["index"]]["function"]["arguments"] += delta["partial_json"]
        else:
            for candidate in event.get("candidates", []):
                reason = candidate.get("finishReason")
                if reason and reason != "STOP":
                    raise IncompleteResponse("Provider output was limited")
                finished |= bool(reason)
                for part in candidate.get("content", {}).get("parts", []):
                    if not part.get("thought"):
                        text += part.get("text", "")
                    if "functionCall" in part:
                        function = part["functionCall"]
                        index = len(calls)
                        call = {"id": f"gemini-{index}", "type": "function",
                            "function": {"name": function["name"], "arguments": json.dumps(function.get("args", {}))}}
                        if "thoughtSignature" in part:
                            call["thoughtSignature"] = part["thoughtSignature"]
                        calls[index] = call
        if text:
            reply["content"] += text
            await on_text(text)
    if not finished:
        raise IncompleteResponse("Provider stream ended without completion")
    reply["tool_calls"] = list(calls.values())
    for call in reply["tool_calls"]:
        call["function"]["arguments"] = call["function"]["arguments"] or "{}"
    return reply
