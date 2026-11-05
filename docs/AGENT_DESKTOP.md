# agent-desktop — optional local developer integration

Project: **Website Phan Thuần Xtra**  
Upstream: https://github.com/vercel-labs/agent-desktop (Apache-2.0; CLI + MCP over local stdio)

**Current scope:** repository skill + configuration EXAMPLE only. No upstream code fork, runtime dependency, Windows installation, active MCP server, production rollout or successful desktop QA is claimed. The template does not grant remote-control access.

## Authorized scope

Chỉ GUI kiểm thử trên ứng dụng DEV/STAGING cục bộ với dữ liệu giả. Không thao tác website production, Cloudflare, Admin/Telegram, khách hàng, kho xe, giá, ảnh hoặc deploy.

Không gửi snapshot, clipboard, URL quản trị, dữ liệu khách hàng, token hay log nhạy cảm vào kho PUBLIC.

## Windows 11 opt-in setup (developer workstation only)

1. Review the official upstream README, SECURITY.md and chosen released package/version. Confirm trust, permissions and that a test Windows session is isolated from production.
2. On the authorized LOCAL Windows workstation with Node/npm, the operator can manually install the reviewed version (upstream default is `npm install -g agent-desktop`; pin an approved version in managed environments). This repository never auto-installs it.
3. In an interactive PowerShell session, run:

```powershell
Get-Command agent-desktop -ErrorAction SilentlyContinue
agent-desktop status
agent-desktop skills get desktop
agent-desktop skills get platform
# Use ONLY an explicitly approved test app:
agent-desktop snapshot --app Notepad -i
```

4. For an MCP-compatible LOCAL agent, copy the contents of `docs/agent-desktop.mcp.example.json` to the agent's own opt-in configuration; the JSON is NOT auto-loaded by this repository. MCP uses stdio to run `agent-desktop mcp` on the same authorized desktop. Never expose an unauthenticated network endpoint.
5. Keep actions manual/consented and test-scoped. Read the UI again to verify; no repeat click/type if delivery was uncertain. Inspect error `disposition.retry`, retry only when `safe`.
6. Revoke by removing the MCP config, stopping the session and (if desired) uninstalling the local CLI; no repository production changes are needed.

## Security and acceptance gates

- Do not write desktop snapshots, screenshots, traces, stdout dumps, clipboard contents, credentials, customer data, account info or private paths to repository files, CI logs, Issues/PRs or external telemetry.
- Do not run in GitHub Actions, Cloudflare Workers, public servers or unattended sessions; do not auto-approve popups, UAC, installs, deploys, payment flows or destructive changes.
- For any meaningful UI mutation, record app, scope, approval, local test result and rollback in a private review channel. No successful host GUI test has been performed by merely merging these instructions.
- The root `AGENTS.md` and higher-priority repository constraints always apply.

## Acceptance checklist

- [ ] Skill file and JSON example exist and match upstream CLI/MCP syntax.
- [ ] No package, lockfile, workflow, production source or deployment configuration changed.
- [ ] Repository-specific safety restrictions unchanged.
- [ ] Human-authorized Windows host smoke test performed separately, with evidence kept private (NOT EXECUTED here).
