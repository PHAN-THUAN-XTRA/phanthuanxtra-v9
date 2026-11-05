# AGENTS.md — PhanThuầnXtra public website

Read .specify/memory/constitution.md before using Spec Kit. No production mutation, no vehicle record deletes and no secrets in this PUBLIC repo. Plan and review only by default.

- This repository is PUBLIC: never place customer information, credentials, Telegram bot secrets, API tokens, personal data, private project documents or internal URLs in specs.
- Preserve public vehicle listing identities, published content, image order, prices and live inventory semantics until a specifically approved spec permits a bounded change.
- Do not mutate Cloudflare production, Workers, the live Admin/Telegram database or vehicle records while creating specs or testing; require review and rollback for runtime changes.
- Use staged and isolated fixtures with exact expected behavior, especially for Admin/Telegram parity and vehicle-content workflows.
- Never copy code, confidential receipts or device data from any private repositories.

## Optional desktop developer tool — agent-desktop (2026-11-05)

Vercel Labs upstream: https://github.com/vercel-labs/agent-desktop (Apache-2.0). This is an **opt-in developer instruction**, not a runtime integration or an enabled remote-access service. The project uses only an allowed `AGENTS.md` entry and inert JSON example in this PUBLIC repo; do not copy binaries or private GUI data. Review the upstream README and versioned guides before use.

- On an individually authorized Windows 11 development workstation, a human may install reviewed `agent-desktop@1.2.0` using `npm install -g agent-desktop@1.2.0`, then run `agent-desktop status`, `agent-desktop skills get desktop` and `agent-desktop skills get platform`.
- Agents must observe, act and verify only an explicitly approved **local DEV/STAGING fixture**. For a basic observation check use `agent-desktop snapshot --app notepad.exe -i` or `agent-desktop snapshot --surface taskbar -i`, verify returned `ok`, and do not assume that MCP is running merely because CLI works.
- The example `docs/agent-desktop.mcp.example.json` is **not automatically loaded**. Only a human-approved local agent can opt in to its stdio `agent-desktop mcp` command. No public listener, no CI runner, no unattended session and no credential-entry, clipboard, headed input, arbitrary clicks or desktop screenshots by default.
- **Public website guard:** never access live Cloudflare/Workers/D1/R2, Admin, Telegram, customer records, inventory, images, price, deployments or production UI as a side effect. Never commit accessibility snapshots, private window names, screenshots, clipboard, credentials or logs.
- Qualified snapshot refs may become stale or ambiguous. A ref action must be scoped and independently verified; retry only when `error.disposition.retry == safe`. Human consent and rollback are required for any UI mutation.
- This repo does not vend a separate `.agents/skills/agent-desktop/SKILL.md` because the existing MASTER Integrity Gate only permits specifically allowlisted Markdown paths. This AGENTS.md instruction is the safe, documentation-only integration for the PUBLIC repo. A full vendored skill requires a separately approved gate change and production-safe rollout.
