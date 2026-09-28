FROM python:3.12-slim AS build
WORKDIR /opt/agent
RUN pip install --no-cache-dir uv==0.11.30
COPY python/pyproject.toml python/uv.lock ./
COPY python/src ./src
RUN uv sync --frozen --no-dev --no-editable

FROM python:3.12-slim AS runtime
ENV PATH="/opt/agent/.venv/bin:$PATH" PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 APP_ENV=production AGENT_ALLOW_FAKE=false
WORKDIR /app
RUN groupadd --gid 10001 app && useradd --uid 10001 --gid app --no-create-home app
COPY --from=build /opt/agent/.venv /opt/agent/.venv
COPY templates/project/agent/main.py ./main.py
USER app
EXPOSE 8001
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8001/ready', timeout=2)"
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]
