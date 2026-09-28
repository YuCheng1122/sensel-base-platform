"""Bounded user-visible tool evidence; never emits arbitrary object repr or secrets."""

import json
import re
from typing import Any

MAX_TEXT = 32_000
MAX_ITEMS = 100
SECRET_KEY = re.compile(
    r"authorization|cookie|password|passwd|secret|token|api.?key|credential|private.?key|"
    r"raw.?payload|raw.?log|stack|traceback|reasoning|chain.?of.?thought",
    re.I,
)


def redact_text(value: str) -> str:
    value = re.sub(r"-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----", "[REDACTED]", value)
    value = re.sub(r"(?i)\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+", r"\1 [REDACTED]", value)
    value = re.sub(r"(https?://)[^\s/@:]+:[^\s/@]+@", r"\1[REDACTED]@", value)
    value = re.sub(
        r"""(?i)(["']?(?:api[_-]?key|access[_-]?token|password|secret|token)["']?\s*[=:]\s*)(?:"[^"]*"|'[^']*'|[^\s&,;}]+)""",
        r"\1[REDACTED]",
        value,
    )
    return value


def trace_payload(value: Any) -> dict[str, Any]:
    """Return a redacted, explicitly bounded rendering (not an evidence export)."""
    clipped = False
    budget = MAX_TEXT

    def visit(item: Any, depth: int = 0) -> Any:
        nonlocal clipped, budget
        if depth > 8 or budget <= 0:
            clipped = True
            return "[TRUNCATED]"
        if isinstance(item, dict):
            result = {}
            for key, child in list(item.items())[:MAX_ITEMS]:
                key = str(key)[:200]
                budget -= len(key)
                result[key] = "[REDACTED]" if SECRET_KEY.search(key) else visit(child, depth + 1)
            clipped |= len(item) > MAX_ITEMS
            return result
        if isinstance(item, (list, tuple)):
            clipped |= len(item) > MAX_ITEMS
            return [visit(child, depth + 1) for child in item[:MAX_ITEMS]]
        if isinstance(item, str):
            clean = redact_text(item)
            limit = min(4000, max(0, budget))
            clipped |= len(clean) > limit
            budget -= min(len(clean), limit)
            return clean[:limit] + ("[TRUNCATED]" if len(clean) > limit else "")
        if item is None or isinstance(item, (bool, int, float)):
            budget -= 20
            return item
        return "[UNSUPPORTED VALUE]"

    text = json.dumps(visit(value), ensure_ascii=False, default=lambda _: "[UNSUPPORTED VALUE]")
    if len(text) > MAX_TEXT:
        clipped = True
        text = text[:MAX_TEXT] + "\n[TRUNCATED]"
    return {"text": text, "truncated": clipped}
