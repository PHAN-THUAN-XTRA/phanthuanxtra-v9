# Agent-Reach operations integration

Upstream: `Panniantong/Agent-Reach`

Pinned commit: `a19a171fa980a0785849596492e0af4db800c82f` (audited 2026-10-03)

## Purpose

Agent-Reach is an **operator/agent capability layer**, not part of the Cloudflare Worker runtime. It may be installed on the owner's Windows workstation in a dedicated venv to provide read-oriented internet research backends and health checks.

## Safety contract

- Do not vendor or execute moving `main`; installation is pinned to the audited commit above.
- Do not put Agent-Reach Python dependencies into the Worker bundle.
- Default project script mode is `Check`: no venv/package/config creation.
- `Install` creates only the dedicated user venv and then invokes Agent-Reach's own safe/default `install --env=local`; it does **not** pass `--system`.
- Do not import cookies/tokens into the repository, GitHub Actions, Cloudflare Worker, D1 or R2.
- Login-backed platforms require explicit owner action and should use dedicated accounts where appropriate.
- Existing native GitHub connector/web tooling remains preferred when already available; Agent-Reach is complementary, not a replacement.
- No social posting/write automation is enabled by this integration.

## Windows 10 PowerShell

Read-only check:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\agent-reach.ps1 -Mode Check
```

After explicit owner approval to create a user-local venv and install the pinned package:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\agent-reach.ps1 -Mode Install
```

The install ends with `agent-reach doctor --json`. Optional channels and any credentials remain separate follow-up decisions.
