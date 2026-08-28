<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AI collaboration protocol — Claude ↔ ChatGPT

This repository is developed with both Claude and ChatGPT/Codex. `AI_HANDOFF.md` is the shared handoff log between agents.

## Mandatory rule

Before starting any meaningful task, read `AI_HANDOFF.md` to understand what the other agent changed, decided, left pending, or warned about.

After completing any meaningful task, update `AI_HANDOFF.md` with a short handoff note for the other agent. Never rely only on chat history.

- Claude must leave notes for ChatGPT/Codex.
- ChatGPT/Codex must leave notes for Claude.
- Include: date, agent, task, files changed, decisions made, pending items, risks/warnings, and the recommended next step.
- Do not place passwords, API keys, tokens, service-role keys, or other secrets in the handoff file.
- Keep newest notes at the top.
- If no code was changed but an important architectural/business-rule decision was made, record it as well.
- When taking over a task from the other agent, preserve its intent unless the user explicitly asks for a change.

## Handoff reminder

**STOP BEFORE FINISHING:** Did you update `AI_HANDOFF.md` for the other agent? If not, do it before considering the task complete.
