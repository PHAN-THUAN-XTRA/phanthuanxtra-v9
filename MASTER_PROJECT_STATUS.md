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
- After each completed status checkpoint, update **only this file**.

## 2. CURRENT ARCHITECTURE
- Website: `https://phanthuanxtra.com`
- Admin: `https://phanthuanxtra.com/admin`
- Worker: `phanthuanxtra-v2`
- Entry: `src/entry.js`
- D1: `phanthuanxtra-db`
- R2: `phanthuanxtra-media`
- Workers AI: `/api/ai-chat`; Developer Gateway `/v1/ai/unified`
- APK: `com.phanthuanxtra.app`, source version 1.2.0 / versionCode 3
- Wrangler: `4.121.0`

## 3. VERIFIED BASELINE / HISTORICAL EVIDENCE
- Website, `/api/health`, `/api/cars`, `/admin.html`, Production Worker — historically GREEN.
- Admin invalid-login 401, valid login + signed session, unauth dashboard 401, authenticated dashboard — historically GREEN.
- D1 CRUD — GREEN historically and passed the latest Queue-01 run before its R2 portion failed.
- Gateway/AI — GREEN historically.
- Dual Workers AI isolation — GREEN.
- Gate 14 backup/restore/readability — GREEN: runs `34752032531` and `34752146646`.
- Password Reset E2E #3 — GREEN: run `35063840082`.
- Gate-15 historical smoke — GREEN: run `34955049927`; historical evidence does not override newer current-source failures.

## 4. SINGLE EXECUTION QUEUE
### QUEUE-01 — Admin / D1 / R2 production E2E
**R2 CURRENTLY RED / ACTIVE DIAGNOSTIC.** Current main source `705434005cf777b7261e05d0632d71b9f8b616e8` produced Queue-01 run `35068382874`, job `104703835957`, with the combined D1/R2 step failing. Targeted rerun job `104704356849` (attempt 2) failed again. This confirms the current-source R2 failure is repeatable; do not claim GREEN.

### QUEUE-02 — Gateway/AI
**BASELINE VERIFIED.**

### QUEUE-03 — VIP hardening
**OPEN / STAGED.** Execute only through the single active queue.

### QUEUE-04 — APK production readiness
**OPEN / STAGED.** Fresh artifact/hash + S21 Ultra physical regression required.

### QUEUE-05 — Telegram/VIP production E2E
**OPEN / STAGED / BLOCKED BY R2.** Telegram diagnostic is manual-only via GitHub Actions → Run workflow. Execute after R2 closes.

### QUEUE-06 — Backup/restore
**GREEN / COMPLETED.**

### QUEUE-07 — Gate 15
**GREEN / COMPLETED HISTORICALLY.** Current-source evidence takes precedence.

### QUEUE-08 — Final cleanup / overall GREEN
**OPEN / ACTIVE NEXT.** PR #219 is merged. Current next task is R2 root-cause/diagnostic remediation; Telegram/VIP follows only after R2 is closed.

## 5. RELEASE GATES
1. Current main deployed — **VERIFIED** by Deploy Cloudflare Worker `35068382888`, source `705434005cf777b7261e05d0632d71b9f8b616e8`.
2. Invalid Admin login 401 — **VERIFIED**.
3. Valid Admin login + signed session — **VERIFIED**.
4. Unauthenticated dashboard 401 — **VERIFIED**.
5. Authenticated dashboard — **VERIFIED**.
6. D1 CRUD — **VERIFIED** by current Queue-01 run before R2 failure.
7. **R2 write/read/delete — RED / OPEN.** Latest run `35068382874` failed and targeted rerun `104704356849` failed again.
8. Password reset — **GREEN / VERIFIED** by `35063840082`; current-source regression remains subject to evidence.
9. Gateway/AI — **VERIFIED HISTORICALLY**.
10. Dual Workers AI — **GREEN**.
11. APK artifact/hash + S21 Ultra regression — **OPEN**.
12. Telegram Auto Bot production E2E — **OPEN**.
13. VIP webhook/idempotency E2E — **OPEN**.
14. Backup/restore/readability — **GREEN**.
15. Gate-15 smoke/security boundary — **GREEN HISTORICALLY**.
16. **PRODUCTION GREEN / COMPLETE — LOCKED** until every remaining required gate is GREEN.

## 6. PR #219 — COMPLETED
- PR `#219`: `fix(ci): repair legacy Android APK workflow YAML`.
- Merge commit: `705434005cf777b7261e05d0632d71b9f8b616e8`.
- Legacy APK `if` expression was fully quoted so embedded `ci(gate11): ...` cannot trigger YAML `: ` parsing.
- PR checks passed before merge.
- Post-merge Android APK MVP #732, Android APK Gate 11 #20, CI #56, Release Gate Static Audit #217, and Deploy Cloudflare Worker #653 completed **SUCCESS**.
- No production application code or secrets were changed; no force-push was used.

## 7. CURRENT PRODUCTION DEPLOYMENT
- Deploy Cloudflare Worker #653 / run `35068382888` — **SUCCESS**.
- Current production source: `705434005cf777b7261e05d0632d71b9f8b616e8`.
- Cloudflare Worker Version is not independently recorded in this checkpoint; do not infer it from deployment success.

## 8. TELEGRAM BOT MAP — OWNER CONFIRMED
- `@phanthuanxtra2026_bot` — backup/infrastructure, daily 07:00 VN.
- `@phanthuanxtra_auto_bot` — vehicle ingestion/data operations; AI masks plates and replaces them with `PT Xtra` before upload.
- `@phanthuanxtra_bot` — website AI/customer consultation and test-drive notifications.
- `@phanthuanxtra_vip_bot` — VIP vehicle/document/image checking; used in APK.
- These are four separate roles; runtime E2E proof is still required for production claims.

## 9. SAFETY / CONTINUITY
- Never expose secrets, recovery codes or passwords.
- Never force-push or `git reset --hard` as synchronization.
- Never create competing checkpoint Markdown files.
- Never treat historical evidence, skipped tests, missing secrets, or static checks as current runtime GREEN.
- Protect production; root-cause first; verify before claiming.

## 10. CHANGE LOG — 2026-09-16
- Read this MASTER file before execution and kept the single queue.
- Reconciled PR #219 with latest `main`, without force-push, then merged it successfully.
- Current main/production source is `705434005cf777b7261e05d0632d71b9f8b616e8`.
- Fresh Queue-01 #100 exposed a current-source R2 failure; targeted rerun attempt 2 also failed, confirming a repeatable defect.
- Telegram/VIP remains deferred until R2 is closed.
- **Production remains RED.**
