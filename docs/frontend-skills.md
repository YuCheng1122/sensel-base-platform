# Frontend Design and Agent Skills

[Documentation](README.md) · [Project home](../README.md)

SenseL keeps design decisions in [DESIGN.md](../DESIGN.md) and task instructions in two project skills. The same files are usable in the base repository and in generated customer projects; there is no dependency on an original customer repository or a developer's home directory.

## What belongs where

| File | Responsibility |
| --- | --- |
| `DESIGN.md` | Shared page width, spacing, typography, filters and concise UI copy preferences |
| `skills/sensel-frontend/SKILL.md` | How to implement pages using that contract |
| `skills/sensel-ui-review/SKILL.md` | How to review cross-page alignment, responsiveness and truthful states |
| `AGENTS.md` | Project boundaries and required validation |
| `CLAUDE.md` | Entry point directing Claude Code to the same project instructions |

Keep concrete numeric design values in DESIGN.md and their implementation tokens. Skills refer to this contract rather than duplicating another specification. Change customer-specific preferences in the customer project's copy and document why they differ.

## Discovery and use

The canonical skill folders live in `skills/`. Relative directory links expose them at `.agents/skills/` for Codex and `.claude/skills/` for Claude Code. Both tools document project skills and support linked folders; see the official [Codex skill documentation](https://developers.openai.com/codex/skills/) and [Claude Code skill documentation](https://code.claude.com/docs/en/skills).

Examples:

- Codex: `$sensel-frontend Add a customer analysis page using the shared design contract.`
- Codex: `$sensel-ui-review Check overview, reports and all settings pages at desktop and mobile widths.`
- Claude Code: `/sensel-frontend Add a customer analysis page using the shared design contract.`
- Claude Code: `/sensel-ui-review Check the changed pages against DESIGN.md.`

Open the tool from the repository or one of its subdirectories, and reload its session if newly added skills are not listed. Tool policies and versions can affect discovery. These files have been validated for structure and paths; this repository does not claim automated end-to-end execution inside both coding agents.

## New customer projects

`npm run create:project` copies DESIGN.md, CLAUDE.md and the canonical skills, then creates relative discovery links for both tools. The generated AGENTS.md points to the design contract. The generated project remains independent of the base checkout after it is moved.

The generator's existing empty-directory requirement still applies; it will not update an existing customer's instructions. A later npm package upgrade does not overwrite customer design preferences. Review and copy instruction updates deliberately.

Use a filesystem and Git checkout that preserve symbolic links. If a platform cannot create them, keep the canonical files and explicitly provide their paths to the agent, or arrange supported local discovery for that environment. Do not maintain independently edited copies of the same skill.

## Verification

Validate skill frontmatter and referenced paths after editing. Generate a project in a temporary directory and confirm both discovery paths resolve to that project's own skills. Read the skill with realistic implementation and review requests; check that it preserves necessary synthetic, partial and unknown states while removing redundant UI prose.

For a design change, use the shared UI regression checks and capture desktop/mobile screenshots with synthetic data. See [testing](testing.md) and [self-review](self-review.md). A valid SKILL.md does not by itself prove correct rendering or agent behavior.
