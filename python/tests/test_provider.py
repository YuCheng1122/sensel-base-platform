import httpx
import pytest

from sensel_agent.profile import Model
from sensel_agent.provider import anthropic_request, complete, gemini_request
from sensel_agent.tools import Tool


async def unused(*args):
    raise AssertionError()


def test_provider_tool_roundtrip():
    tools = {"count": Tool("count", "Count", {"type": "object"}, unused)}
    messages = [{"role": "system", "content": "Policy"}, {"role": "user", "content": "Count"},
        {"role": "assistant", "content": None, "tool_calls": [{"id": "call-1", "type": "function",
            "function": {"name": "count", "arguments": "{}"}, "thoughtSignature": "opaque"}]},
        {"role": "tool", "tool_call_id": "call-1", "content": '{"count":3}'}]
    model = Model(provider="anthropic", model="fixture")
    anthropic = anthropic_request(messages, tools, model)
    assert anthropic["messages"][-1]["content"][0]["tool_use_id"] == "call-1"
    gemini = gemini_request(messages, tools, model)
    assert gemini["contents"][-2]["parts"][0]["thoughtSignature"] == "opaque"
    assert gemini["contents"][-1]["parts"][0]["functionResponse"]["name"] == "count"


@pytest.mark.parametrize("provider,payload", [
    ("openai-compatible", {"choices": [{"message": {"role": "assistant", "content": "OK"}}]}),
    ("anthropic", {"content": [{"type": "text", "text": "OK"}]}),
    ("gemini", {"candidates": [{"content": {"parts": [{"text": "OK"}]}}]}),
])
async def test_real_adapters_without_external_calls(monkeypatch, provider, payload):
    real_client = httpx.AsyncClient
    def client(**kwargs):
        assert kwargs["follow_redirects"] is False
        assert kwargs["trust_env"] is False
        return real_client(**kwargs, transport=httpx.MockTransport(lambda request: httpx.Response(200, json=payload)))
    monkeypatch.setattr(httpx, "AsyncClient", client)
    result = await complete(Model(provider=provider, model="fixture", baseUrl="https://fixture.invalid/v1"),
                            [{"role": "user", "content": "Hello"}], {})
    assert result["content"] == "OK"


@pytest.mark.parametrize("provider,frames", [
    ("openai-compatible", [{"choices": [{"delta": {"content": "Hello"}, "finish_reason": None}]},
                           {"choices": [{"delta": {}, "finish_reason": "stop"}]}]),
    ("anthropic", [{"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": "Hello"}},
                    {"type": "message_stop"}]),
    ("gemini", [{"candidates": [{"content": {"parts": [{"text": "Hello"}]}, "finishReason": "STOP"}]}]),
])
async def test_streams_real_provider_text(monkeypatch, provider, frames):
    import json
    real_client = httpx.AsyncClient
    captured = []
    async def on_text(text):
        captured.append(text)
    def client(**kwargs):
        def respond(request):
            assert "stream" in request.url.path or json.loads(request.content)["stream"] is True
            content = "".join("data: " + json.dumps(frame) + "\n\n" for frame in frames)
            return httpx.Response(200, text=content)
        return real_client(**kwargs, transport=httpx.MockTransport(respond))
    monkeypatch.setattr(httpx, "AsyncClient", client)
    result = await complete(Model(provider=provider, model="fixture", baseUrl="https://fixture.invalid/v1"),
                            [{"role": "user", "content": "Hello"}], {}, on_text)
    assert captured == ["Hello"]
    assert result["content"] == "Hello"


async def test_incomplete_stream_fails():
    from sensel_agent.streaming import consume_stream
    async def on_text(text):
        pass
    response = httpx.Response(200, text='data: {"choices":[{"delta":{"content":"partial"}}]}\n\n')
    with pytest.raises(ValueError, match="without completion"):
        await consume_stream(response, "openai-compatible", on_text)
