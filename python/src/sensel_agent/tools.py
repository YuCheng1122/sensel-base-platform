"""Project-owned tool contracts; writes require backend-enforced confirmation."""
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any, Literal


@dataclass(frozen=True)
class ToolContext:
    execution_id: str
    user_id: str
    profile_token: str
    confirmation_token: str | None = None


@dataclass(frozen=True)
class ToolResult:
    status: Literal["completed", "partial", "error", "unknown"]
    data: Any


@dataclass(frozen=True)
class Tool:
    name: str
    description: str
    parameters: dict
    handler: Callable[[dict, ToolContext], Awaitable[ToolResult]]
    writes: bool = False

    def schema(self) -> dict:
        return {"type": "function", "function": {
            "name": self.name, "description": self.description, "parameters": self.parameters,
        }}


class ToolRegistry:
    def __init__(self, tools: list[Tool] | None = None):
        self.tools: dict[str, Tool] = {}
        for tool in tools or []:
            if tool.name in self.tools:
                raise ValueError(f"Duplicate tool: {tool.name}")
            self.tools[tool.name] = tool

    def allowed(self, names: list[str]) -> dict[str, Tool]:
        return {name: tool for name, tool in self.tools.items() if name in names}
