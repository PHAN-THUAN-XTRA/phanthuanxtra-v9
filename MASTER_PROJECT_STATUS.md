# PHAN THUẦN XTRA — MASTER PROJECT STATUS

> **DUY NHẤT — CANONICAL PROJECT STATUS / HANDOFF**
> Date: 2026-09-16 (UTC+7)
> Repository: `PHAN-THUAN-XTRA/phanthuanxtra-v9`
> Main source: `705434005cf777b7261e05d0632d71b9f8b616e8`

## 1. SOURCE OF TRUTH / OPERATING RULES
- This file is the sole canonical project-status file; all AI / Work AI must read it before work.
- One execution queue only; no conflicting parallel mutations.
- One ACTIVE PR, one head branch, one commit chain; merge closes the queue.
- Never force-push, never guess secrets, never use checkpoint `.md` files, never claim GREEN without runtime/E2E evidence.
- Production remains **RED** until all required release gates are actually evidenced.
- After a completed status checkpoint, update only this file; do not create competing checkpoint/status Markdown files.

## 2. CURRENT QUEUE — R2 ROOT-CAUSE REMEDIATION
- Current production source: `705434005cf777b7261e05d0632d71b9f8b616e8`.
- Queue-01 run `35068382874` failed at the R2 stage.
- Targeted rerun job `104704356849` also failed, but its logs prove the direct-R2 diagnostic itself never executed against R2.
- Exact failure: after `R2 write/upload HTTP 200`, `npx --no-install wrangler ...` aborted because `wrangler@4.132.0` was not installed on the GitHub runner and `--no-install` forbids fetching it.
- `package.json` declares Wrangler as a devDependency (`^4.121.0`), but the Queue-01 workflow previously did not checkout the repository or run `npm ci` before invoking Wrangler.
- Therefore the previous rerun proved a **diagnostic runner/tooling defect**, not yet an R2 bucket-vs-Worker root cause.
- Remediation branch: `queue/r2-diagnostic-wrangler-install`.
- Remediation commit: `ea61c9e8bbbb46ce609f420cc59bb0ac88197f63`.
- Remediation adds repository checkout, Node 20 setup, and `npm ci` before the existing direct R2 bucket read/byte comparison.
- No production application code, secrets, or R2 data were changed by this remediation.
- After PR validation/merge/deploy, Queue-01 must rerun. The resulting evidence will distinguish direct R2 storage/binding failure from Worker `/media/*` route failure.

## 3. ARCHITECTURE
- Website: `https://phanthuanxtra.com`
- Admin: `https://phanthuanxtra.com/admin`
- Worker: `phanthuanxtra-v2`
- Entry: `src/entry.js`
- D1: `phanthuanxtra-db`
- R2: `phanthuanxtra-media`
- Media route: `src/media.js` uses `env.MEDIA.put()` for upload and `env.MEDIA.get()` for `/media/*` reads.
- `src/entry.js` routes `/media/*` through `handleMediaApi()` before falling through to legacy handling.

## 4. RELEASE GATES
1. Current main deployed — VERIFIED on `705434005cf777b7261e05d0632d71b9f8b616e8`.
2. Invalid Admin login 401 — VERIFIED.
3. Valid Admin login + signed session — VERIFIED.
4. Unauthenticated dashboard 401 — VERIFIED.
5. Authenticated dashboard — VERIFIED.
6. D1 CRUD — VERIFIED in Queue-01 before R2 stage.
7. **R2 write/read/delete — RED / ACTIVE REMEDIATION.**
8. Password reset — GREEN historically by `35063840082`.
9. Gateway/AI — VERIFIED historically.
10. Dual Workers AI — GREEN.
11. APK artifact/hash + S21 Ultra regression — OPEN.
12. Telegram Auto Bot production E2E — OPEN / blocked by R2.
13. VIP webhook/idempotency E2E — OPEN / blocked by R2.
14. Backup/restore/readability — GREEN.
15. Gate-15 smoke/security boundary — GREEN historically.
16. **PRODUCTION GREEN — LOCKED** until all required gates are GREEN.

## 5. SINGLE QUEUE CONTINUITY
- Telegram/VIP diagnostic remains deferred until R2 is closed.
- Do not test Admin manually yet.
- No second PR for this R2 task.
- No secret rotation or secret exposure.
- No force-push.

## 6. CHANGE LOG — 2026-09-16 R2 ROOT-CAUSE
- Read the canonical MASTER status before execution.
- Confirmed the R2 failure was repeatable but discovered the existing direct-R2 diagnostic could not run because Wrangler was absent from the runner.
- Added deterministic repository checkout + Node 20 + `npm ci` before the existing direct-R2 probe.
- Production remains **RED** pending a genuine direct-R2 and Worker-route runtime result.
