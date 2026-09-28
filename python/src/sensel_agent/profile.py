"""Short-lived server-authorized configuration, never process-global provider state."""
import base64
import hashlib
import hmac
import json
import time
from typing import Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, ValidationError


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid")
    provider: Literal["openai-compatible", "anthropic", "gemini", "fake"]
    model: str = Field(min_length=1, max_length=256)
    baseUrl: str | None = None
    apiKey: str = Field(default="", repr=False)
    timeoutSeconds: int = Field(default=60, ge=1, le=120)
    maxOutputTokens: int = Field(default=2048, ge=1, le=32768)


class Profile(BaseModel):
    model_config = ConfigDict(extra="forbid")
    v: Literal[1]
    sub: str = Field(min_length=1)
    executionId: str = Field(min_length=1)
    exp: int
    model: Model
    tools: list[str] = Field(default_factory=list)


def verify_profile(token: str, secret: str, execution_id: str, allow_fake: bool) -> Profile:
    try:
        if len(token) > 32768 or len(secret) < 32:
            raise ValueError()
        payload, signature = token.split(".")
        expected = base64.urlsafe_b64encode(hmac.digest(secret.encode(), payload.encode(), hashlib.sha256)).decode().rstrip("=")
        if not hmac.compare_digest(signature, expected):
            raise ValueError()
        profile = Profile.model_validate(json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4))))
        now = int(time.time())
        if profile.executionId != execution_id or not now < profile.exp <= now + 300:
            raise ValueError()
        if profile.model.provider == "fake":
            if not allow_fake:
                raise ValueError()
        else:
            url = urlsplit(profile.model.baseUrl or {"anthropic": "https://api.anthropic.com/v1", "gemini": "https://generativelanguage.googleapis.com/v1beta"}.get(profile.model.provider, ""))
            if url.scheme not in {"https", "http"} or not url.hostname or url.username or url.password or url.query or url.fragment:
                raise ValueError()
        return profile
    except (ValueError, TypeError, ValidationError, UnicodeError):
        raise ValueError("Invalid or expired model profile") from None
