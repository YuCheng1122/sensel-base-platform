import asyncio
import base64
import hashlib
import hmac
import json
import time

import httpx
import pytest

from sensel_agent import Limits, Settings, Tool, ToolRegistry, ToolResult, create_app
from sensel_agent.profile import verify_profile
from sensel_agent.runtime import events

SECRET = "synthetic-test-secret-32-characters-long"


def signed(**changes):
    claims = {"v": 1, "sub": "user-1", "executionId": "run-1", "exp": int(time.time()) + 60,
              "model": {"provider": "fake", "model": "fixture"}, "tools": ["count"]}
    claims.update(changes)
    payload = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip("=")
    signature = base64.urlsafe_b64encode(hmac.digest(SECRET.encode(), payload.encode(), hashlib.sha256)).decode().rstrip("=")
    return payload + "." + signature


async def test_http_auth_and_success():
    async def count(arguments, context):
        assert context.user_id == "user-1"
        return ToolResult("completed", {"count": 3})
    app = create_app(Settings(SECRET, "test", True), ToolRegistry([Tool("count", "Count", {}, count)]))
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        body = {"executionId": "run-1", "conversationId": "chat-1", "message": "count", "profileToken": signed()}
        assert (await client.post("/v1/runs", json=body)).status_code == 401
        response = await client.post("/v1/runs", json=body, headers={"Authorization": "Bearer " + SECRET})
        records = [json.loads(line) for line in response.text.splitlines()]
        assert records[-1]["status"] == "completed"
        assert next(e for e in records if e["type"] == "tool.completed")["result"] == {"count": 3}
        assert all(e["executionId"] == "run-1" for e in records)


@pytest.mark.parametrize("token,execution,allow", [(signed(exp=1), "run-1", True),
    (signed(), "other", True), (signed(), "run-1", False), (signed() + "x", "run-1", True)])
def test_profile_rejects_invalid(token, execution, allow):
    with pytest.raises(ValueError):
        verify_profile(token, SECRET, execution, allow)


def test_fake_prohibited_production():
    with pytest.raises(ValueError):
        Settings(SECRET, "production", True)


async def collect_tool(handler, *, writes=False, confirmation=None, limits=Limits(), cancel=None):
    token = signed()
    return [e async for e in events("run-1", "count", [], verify_profile(token, SECRET, "run-1", True),
        token, ToolRegistry([Tool("count", "Count", {}, handler, writes)]), cancel or asyncio.Event(),
        prompt="Test", limits=limits, confirmation_token=confirmation)]


async def test_write_needs_confirmation():
    async def forbidden(*args):
        pytest.fail("Unconfirmed write executed")
    records = await collect_tool(forbidden, writes=True)
    assert records[-1]["status"] == "partial"
    assert records[-2]["status"] == "confirmation_required"


async def test_timeout_write_is_unknown():
    async def pending(*args):
        await asyncio.sleep(10)
    records = await collect_tool(pending, writes=True, confirmation="backend-verified-token",
                                 limits=Limits(timeout_seconds=0.02))
    assert records[-1]["status"] == "partial"
    assert records[-2]["status"] == "unknown"


async def test_cancel_interrupts_pending_tool():
    cancel = asyncio.Event()
    cleanup = asyncio.Event()
    async def pending(*args):
        cancel.set()
        try:
            await asyncio.sleep(10)
        finally:
            cleanup.set()
    records = await collect_tool(pending, cancel=cancel)
    assert records[-1]["status"] == "cancelled"
    assert cleanup.is_set()


async def test_tool_error_is_not_success_or_secret_leak():
    async def failed(*args):
        raise ValueError("SENSITIVE-PAYLOAD")
    records = await collect_tool(failed)
    assert records[-1]["status"] == "error"
    assert "SENSITIVE" not in json.dumps(records)


async def test_partial_result_stays_partial():
    async def partial(*args):
        return ToolResult("partial", {"count": 3})
    assert (await collect_tool(partial))[-1]["status"] == "partial"


async def test_capability_probe():
    app = create_app(Settings(SECRET, "test", True))
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/v1/models/test", json={"executionId": "run-1", "profileToken": signed(),
                                                            "mode": "tools"},
                                     headers={"Authorization": "Bearer " + SECRET})
        assert response.json()["toolSupported"] is True


async def test_trace_redaction():
    async def secrets(*args):
        return ToolResult("completed", {"apiKey": "secret-value", "nested": {"rawLog": "private-event"},
                                        "message": "Bearer hidden-token"})
    records = await collect_tool(secrets)
    serialized = json.dumps(records)
    for secret in ["secret-value", "private-event", "hidden-token"]:
        assert secret not in serialized
    assert records[-1]["status"] == "completed"
