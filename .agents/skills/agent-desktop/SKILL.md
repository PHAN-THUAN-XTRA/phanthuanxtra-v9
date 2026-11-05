---
name: agent-desktop
description: Optional, explicitly authorized LOCAL desktop UI observation and automation through the Vercel Labs agent-desktop CLI; use for scoped development GUI QA only, never unattended or on production.
---

# agent-desktop — Website Phan Thuần Xtra

Source: https://github.com/vercel-labs/agent-desktop (Apache-2.0). This is a local project instruction, NOT vendored upstream code or an active runtime integration.

## Before use
1. Read root `AGENTS.md` and `docs/AGENT_DESKTOP.md`. For Vertu, read live V95 at `vertu/main` first.
2. Run only on a LOCAL development workstation after the human enables the tool and authorizes the specific app, purpose, and allowed UI actions. Never auto-install, enable MCP, or run in CI/cloud.
3. Check `agent-desktop status`; then read the version-coupled `agent-desktop skills get desktop` and `agent-desktop skills get platform`. On Windows PowerShell, single-quote refs like `'@s123:e1'`.
4. Observe an approved app with `agent-desktop snapshot --app Notepad -i`, then verify any permitted action with a fresh snapshot. Do not act on ambiguous/stale refs; retry only when `error.disposition.retry` is `safe`.
5. Do not use `--headed`, clipboard, screenshots, keystroke injection, destructive actions, privilege escalation or credential entry without fresh explicit scope/consent.

## Project guard
Chỉ GUI kiểm thử trên ứng dụng DEV/STAGING cục bộ với dữ liệu giả. Không thao tác website production, Cloudflare, Admin/Telegram, khách hàng, kho xe, giá, ảnh hoặc deploy.
Không gửi snapshot, clipboard, URL quản trị, dữ liệu khách hàng, token hay log nhạy cảm vào kho PUBLIC.

Never commit GUI trees, clipboard data, window titles with personal data, screenshots, traces, or tool logs. Report `NOT_EXECUTED` unless a real local session and evidence are available. MCP example is opt-in and inert: `docs/agent-desktop.mcp.example.json`.
