"""Request-isolated providers, with redirects and proxy inheritance disabled."""
import asyncio
import json
from urllib.parse import quote

import httpx

from .profile import Model
from .streaming import consume_stream
from .tools import Tool


def anthropic_request(messages: list[dict], tools: dict[str, Tool], model: Model) -> dict:
    converted = []
    for message in messages:
        if message["role"] == "system":
            continue
        if message["role"] == "tool":
            converted.append({"role": "user", "content": [{"type": "tool_result",
                "tool_use_id": message["tool_call_id"], "content": message["content"]}]})
            continue
        content = [{"type": "text", "text": message["content"]}] if message.get("content") else []
        for call in message.get("tool_calls", []):
            content.append({"type": "tool_use", "id": call["id"], "name": call["function"]["name"],
                            "input": json.loads(call["function"]["arguments"])})
        converted.append({"role": message["role"], "content": content})
    body = {"model": model.model, "messages": converted, "max_tokens": model.maxOutputTokens,
            "system": "\n".join(m["content"] for m in messages if m["role"] == "system")}
    if tools:
        body["tools"] = [{"name": t.name, "description": t.description, "input_schema": t.parameters}
                         for t in tools.values()]
    return body


def gemini_request(messages: list[dict], tools: dict[str, Tool], model: Model) -> dict:
    contents = []
    names = {}
    for message in messages:
        if message["role"] == "system":
            continue
        parts = []
        if message["role"] == "tool":
            parts.append({"functionResponse": {"name": names[message["tool_call_id"]],
                                               "response": {"result": json.loads(message["content"])}}})
        else:
            if message.get("content"):
                parts.append({"text": message["content"]})
            for call in message.get("tool_calls", []):
                names[call["id"]] = call["function"]["name"]
                part = {"functionCall": {"name": call["function"]["name"],
                                         "args": json.loads(call["function"]["arguments"])}}
                if call.get("thoughtSignature"):
                    part["thoughtSignature"] = call["thoughtSignature"]
                parts.append(part)
        contents.append({"role": "model" if message["role"] == "assistant" else "user", "parts": parts})
    body = {"contents": contents, "generationConfig": {"maxOutputTokens": model.maxOutputTokens},
            "systemInstruction": {"parts": [{"text": m["content"]} for m in messages if m["role"] == "system"]}}
    if tools:
        body["tools"] = [{"functionDeclarations": [{"name": t.name, "description": t.description,
                                                    "parameters": t.parameters} for t in tools.values()]}]
    return body


async def complete(model: Model, messages: list[dict], tools: dict[str, Tool], on_text=None) -> dict:
    if model.provider == "fake":
        user_text = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
        if "[demo:error]" in user_text:
            raise ValueError("Synthetic model failure")
        if "[demo:slow]" in user_text:
            await asyncio.sleep(2)
        if tools and not any(message["role"] == "tool" for message in messages):
            name = next(iter(tools))
            return {"role": "assistant", "content": None, "tool_calls": [{
                "id": "fake-call-1", "type": "function",
                "function": {"name": name, "arguments": "{}"},
            }]}
        result = next((m["content"] for m in reversed(messages) if m["role"] == "tool"), None)
        return {"role": "assistant", "content": "Demo response: " + (result or messages[-1]["content"])}
    if model.provider == "anthropic":
        url = (model.baseUrl or "https://api.anthropic.com/v1").rstrip("/") + "/messages"
        headers = {"x-api-key": model.apiKey, "anthropic-version": "2023-06-01"}
        body = anthropic_request(messages, tools, model)
    elif model.provider == "gemini":
        url = (model.baseUrl or "https://generativelanguage.googleapis.com/v1beta").rstrip("/")
        url += "/models/" + quote(model.model, safe="") + ":generateContent"
        headers = {"x-goog-api-key": model.apiKey}
        body = gemini_request(messages, tools, model)
    else:
        url = model.baseUrl.rstrip("/") + "/chat/completions"
        headers = {"Authorization": "Bearer " + model.apiKey}
        body = {"model": model.model, "messages": messages, "max_tokens": model.maxOutputTokens}
        if tools:
            body["tools"] = [tool.schema() for tool in tools.values()]
    async with httpx.AsyncClient(timeout=model.timeoutSeconds, follow_redirects=False, trust_env=False) as client:
        if on_text is not None:
            if model.provider == "gemini":
                url = url.replace(":generateContent", ":streamGenerateContent?alt=sse")
            else:
                body["stream"] = True
            async with client.stream("POST", url, json=body, headers=headers) as response:
                response.raise_for_status()
                return await consume_stream(response, model.provider, on_text)
        response = await client.post(url, json=body, headers=headers)
        response.raise_for_status()
        data = response.json()
    if model.provider == "openai-compatible":
        return data["choices"][0]["message"]
    parts = data["content"] if model.provider == "anthropic" else data["candidates"][0]["content"]["parts"]
    reply = {"role": "assistant", "content": "".join(p.get("text", "") for p in parts), "tool_calls": []}
    for index, part in enumerate(parts):
        if part.get("type") == "tool_use":
            call_id, name, arguments = part["id"], part["name"], part["input"]
        elif "functionCall" in part:
            call_id, name, arguments = f"gemini-{len(messages)}-{index}", part["functionCall"]["name"], part["functionCall"].get("args", {})
        else:
            continue
        call = {"id": call_id, "type": "function", "function": {"name": name, "arguments": json.dumps(arguments)}}
        if "thoughtSignature" in part:
            call["thoughtSignature"] = part["thoughtSignature"]
        reply["tool_calls"].append(call)
    return reply
