# AI Agent access boundaries — ChatGPT, GitHub, Cloudflare, and desktop Lyly

**Date:** 2026-10-12 (Asia/Ho_Chi_Minh)  
**Scope:** operational documentation only. No source/runtime/deployment changes.

## Existing, verified integration paths

- ChatGPT's connected GitHub account has repository write/admin capability for `PHAN-THUAN-XTRA/phanthuanxtra-v9`, but should use branch → pull request → mandatory checks. Do not bypass repository rules.
- GitHub Actions workflow `.github/workflows/deploy-cloudflare.yml` validates pull requests and restricts production deployment to the exact `main` commit after successful validation. Cloudflare credentials remain in GitHub Actions secrets. The deploy mechanism is Cloudflare API/SDK; do not introduce an independent Wrangler production deploy path.
- GitHub Actions workflow `.github/workflows/ai-peer-executor.yml` uses the canonical `MASTER_PROJECT_STATUS.md` checkpoint, a unified Cloudflare Workers AI gateway, and a `production_mutation=false` check. This does not grant any agent direct production write permission.
- **Direct ChatGPT ↔ Cloudflare management is not connected/verified** in this session. Do not claim to have read or mutated live D1/R2/Workers from ChatGPT. CI output and exact-deploy receipts are required for Cloudflare claims.

## Lyly desktop: separate trust boundary

- Lyly/JARVIS on the owner's Windows computer is **not** the same repository or deployment target as the phanthuanxtra.com Worker. The upstream reference `T0b0i7/J.A.R.V.I.S` is read-only for the connected GitHub account.
- ChatGPT does not currently have direct execution access to Windows. A previously provided `main2.py` snapshot can be reviewed, but it is not proof of current live machine state.
- Maintain Lyly's existing Vietnamese UI/voice and the owner's preferred full form of address in its **private** configuration. Do not commit machine paths, local IPs, credentials, recordings, images, biometrics, or mobile pairing tokens to this public repository.
- The local desktop service and LAN WebSocket require independent security review before exposing command execution to mobile/remote AI agents. Mobile pairing and biometric recognition must not bypass server-side authentication and authorization.
- Preserve current working Lyly; do not replace `main2.py`, run `install.bat`, update its Python environment in place, or start a second instance while testing. A historical snapshot contains a port-release routine that can terminate processes.

## AI agent operating procedure

1. **Read-only preflight:** identify owner request, affected repository/environment, baseline commit SHA, existing workflows and public/private data boundary. For Lyly, use only the owner-run read-only Windows diagnosis and sanitized output.
2. **Prepare isolated changes:** use a new branch for the website, or a separate **private** Lyly repository/staging copy. List changed files, tests, risk, and rollback. Never hardcode secrets.
3. **Gate:** run relevant tests and all required PR status checks on the exact head SHA. Failure is a stop condition, not permission to disable checks.
4. **Publish only through the authorized path:** website production changes merge to `main` under repository policy and deploy through the existing workflow. Docs-only changes do not constitute Worker deployment. Desktop Lyly deployment is a separate owner-controlled procedure.
5. **Verify:** report precise commit, PR, workflow run and production/API/D1/R2 evidence when applicable. Do not infer end-to-end success from a passing unit test, an AI response, or an HTTP shell.
6. **Rollback:** keep a reversible revision and pre-change evidence. If device tests, remote authentication or other acceptance gates are unverified, mark them OPEN.

## Immediate owner-facing Windows diagnostic

If PowerShell says `KiemTra-Lyly-ReadOnly.ps1` is “not recognized,” this normally means it is **not located in the current PowerShell directory**. Extract the trusted audit ZIP and use an absolute script path. A separate owner-held audit bundle auto-locates a downloaded ZIP, verifies its internal SHA-256 manifest, and runs a **read-only** diagnostic. It does not modify `C:\Program Files\JARVIS`, firewall rules, service state or API credentials.

Do not place that Windows audit ZIP or raw personal device logs in this public web repository.

## Evidence and outstanding actions

**Confirmed from source:** GitHub repository access; named workflow definitions; upstream read-only rights; historical Lyly source risk indicators.  
**Not confirmed:** Live Windows remediation; voice/face authentication; Android APK; direct Cloudflare account connector; a completed Lyly-to-cloud command bridge.

Any agent claiming these are complete must attach a fresh, independently verifiable acceptance receipt.

Related canonical checkpoint: [MASTER_PROJECT_STATUS.md](../MASTER_PROJECT_STATUS.md).
