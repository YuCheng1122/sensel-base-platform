# Project Agent

`main.py` is the customer composition root. Add project tools and prompt here; reusable runtime remains in the versioned `sensel-agent-core` dependency. The example `project_info` calls this project's backend, which owns persistence and authorization. Replace it for other domains such as file/PCAP analysis; no Elasticsearch is required.

Install the platform wheel, configure variables from `.env.example` in your process environment, then run `uvicorn main:app --host 127.0.0.1 --port 8001`. The template does not implicitly load `.env`. Local fake mode requires `APP_ENV=development` plus `AGENT_ALLOW_FAKE=true`; do not deploy fake mode.
