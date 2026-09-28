"""Customer composition root: register tools and prompt here, never inside the platform."""
import os

import httpx
from sensel_agent import Settings, Tool, ToolContext, ToolRegistry, ToolResult, create_app


async def project_info(arguments: dict, context: ToolContext) -> ToolResult:
    async with httpx.AsyncClient(timeout=30, follow_redirects=False, trust_env=False) as client:
        response = await client.post(
            os.environ.get("BACKEND_URL", "http://127.0.0.1:3000") + "/api/agent/tools/project-info",
            headers={"Authorization": "Bearer " + os.environ["AGENT_SHARED_SECRET"]},
            json={"executionId": context.execution_id, "profileToken": context.profile_token, "arguments": arguments},
        )
        response.raise_for_status()
        return ToolResult("completed", response.json())


app = create_app(
    Settings(
        shared_secret=os.environ["AGENT_SHARED_SECRET"],
        environment=os.environ.get("APP_ENV", "production"),
        allow_fake=os.environ.get("AGENT_ALLOW_FAKE", "false").lower() == "true",
    ),
    ToolRegistry([Tool(
        name="project_info", description="Read this project's name and enabled capabilities.",
        parameters={"type": "object", "properties": {}, "additionalProperties": False},
        handler=project_info,
    )]),
)
