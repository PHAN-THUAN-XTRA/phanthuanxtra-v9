# PHAN THUẦN XTRA — MASTER PROJECT STATUS

> **DUY NHẤT — CANONICAL PROJECT STATUS / HANDOFF**
> Date: 2026-09-17 (UTC+7)
> Repository: `PHAN-THUAN-XTRA/phanthuanxtra-v9`
> Current main lineage: `c5630188ab8a7021160b999b91d968fe836ae898`

## 1. SOURCE OF TRUTH / OPERATING RULES
- This file is the sole canonical project-status file; all AI / Work AI must read it before work.
- One execution queue only; no conflicting parallel mutations.
- One ACTIVE PR, one head branch, one commit chain; merge closes the queue.
- Never force-push, never guess secrets, never use checkpoint `.md` files, never claim GREEN without runtime/E2E evidence.
- Production remains **RED** until all required release gates are actually evidenced.
- After a completed status checkpoint, update only this file; do not create competing checkpoint/status Markdown files.

## 2. MANDATORY OPERATING METHOD — DEEP CHAIN AUDIT
The project is operated as a continuous evidence chain:
`GitHub source → GitHub Actions → Cloudflare deploy → Worker runtime → bindings/routes → Workers AI → D1/R2/Gateway → production E2E`.

- **Read-first:** every AI/Work AI reads this MASTER before touching the project.
- **Observe broadly, mutate narrowly:** audits may inspect independent layers, but production/source mutations remain serialized through the single queue.
- **Fail-fast and lock the fault:** isolate the smallest failing boundary, preserve evidence, and prevent unrelated changes from masking it.
- **Trace both directions:** trace source/config forward to runtime and runtime failure backward to the exact source/config boundary.
- **No false correlation:** green CI or deployment reporting is not proof of downstream runtime health.
- **Runtime-first closure:** every fix must be followed by deploy verification and fresh runtime/E2E evidence on the same source lineage.
- **Security:** never print, guess, rotate, or expose secrets; verify only presence/authentication without revealing values.

## 2.1 AI-FIRST ROOT-CAUSE METHOD
- Workers AI is first-line project-local AI analysis when the runtime can execute it, using primary `@cf/zai-org/glm-4.7-flash` and existing fallback `@cf/meta/llama-3.2-3b-instruct`.
- GPT independently challenges the AI hypothesis against source, logs, configuration and runtime evidence.
- Evidence outranks AI; AI hypotheses never constitute production PASS.
- Start from the observed failure, isolate the smallest reproducible boundary, mutate only that boundary, then re-run the complete affected evidence chain.
- Simulation/mock output is supporting evidence only; real runtime evidence is required.

## 3. DEPLOYMENT OPERATING MODEL
Target production path:
`GitHub Actions → Cloudflare API/SDK → Cloudflare Worker runtime`.

- Production Worker: `phanthuanxtra-v2`.
- Existing D1, R2, Workers AI, routes and bindings are preserved unless an evidence-backed migration requires otherwise.
- Wrangler is **not** the production deployment path.
- No secret exposure/rotation and no destructive infrastructure recreation.

## 4. CURRENT QUEUE — RELEASE CLOSURE RECONCILIATION
- Previous Queue 8 merged as `a21cf51809cc5ad2d83a6a5dab931c0eb5a1275a`.
- PR #238 subsequently merged as `c5630188ab8a7021160b999b91d968fe836ae898`, repairing malformed newline regex literals in `public/admin-control.html`.
- PR #238 changed only one file with 2 additions / 2 deletions; no auth, secret, API-contract or infrastructure change.
- CI validation for `c5630188...` passed in run `35219113670`.
- No open PR was present before this documentation reconciliation.
- **Current release-closure blocker:** production deployment of `c5630188...` and corresponding Worker runtime SHA/version have not yet been directly evidenced.

## 5. CHAIN AUDIT STATUS
- Source: **VERIFIED** — main lineage `c5630188ab8a7021160b999b91d968fe836ae898`.
- CI: **VERIFIED** — `CI / Validate` passed for the current SHA.
- Production deployment: **OPEN/RED** — deployed SHA not yet directly verified.
- Runtime smoke: **OPEN/RED** until verified against the current deployed lineage.
- R2 Worker GET/DELETE/404: **OPEN/RED** pending fresh runtime evidence.
- D1 CRUD: historical evidence only until refreshed on the current production lineage.
- Gateway/Workers AI: historical evidence only until refreshed on the current production lineage.
- Admin/Password Reset: historical evidence only until refreshed on the current production lineage where required.
- APK artifact/hash + physical S21 Ultra regression: **OPEN**.
- Telegram Auto Bot production E2E: **OPEN**.
- VIP webhook/idempotency E2E: **OPEN**.
- Backup/restore/readability: historical evidence only until current-lineage reconciliation.
- Gate-15: historical evidence only until current-lineage reconciliation.

## 6. RELEASE GATES
1. Current main deployed — **OPEN: prove deployed source lineage = `c5630188...`**.
2. Invalid Admin login 401 — VERIFIED historically; refresh as required.
3. Valid Admin login + signed session — VERIFIED historically; refresh as required.
4. Unauthenticated dashboard 401 — VERIFIED historically; refresh as required.
5. Authenticated dashboard — VERIFIED historically; refresh as required.
6. D1 CRUD — VERIFIED historically; refresh as required.
7. **R2 write/read/delete — OPEN/RED until Worker media GET/DELETE/404 is freshly verified.**
8. Password reset — GREEN historically by `35063840082`; refresh as required.
9. Gateway/AI — historical evidence; fresh runtime evidence required.
10. Dual Workers AI — GREEN historically; fresh runtime evidence required.
11. APK artifact/hash + S21 Ultra regression — OPEN.
12. Telegram Auto Bot production E2E — OPEN.
13. VIP webhook/idempotency E2E — OPEN.
14. Backup/restore/readability — GREEN historically; current-lineage reconciliation required.
15. Gate-15 smoke/security boundary — GREEN historically; current-lineage reconciliation required.
16. **PRODUCTION GREEN — LOCKED** until all required gates are actually green.

## 7. SINGLE QUEUE CONTINUITY
- Queue 8 is closed by merge.
- PR #238 is closed/merged.
- This checkpoint is the single release-closure reconciliation queue.
- No competing remediation queue or checkpoint file is permitted.
- Next mutation is authorized only after the first concrete failing production boundary is observed.
- Never force-push.

## 8. CHANGE LOG — 2026-09-17
- Read canonical MASTER before execution.
- Reconciled canonical source lineage from `a21cf518...` to current main `c5630188...`.
- Recorded PR #238 Admin Control JavaScript syntax repair and its successful CI validation.
- Kept production RED because deployment/runtime evidence for the current lineage is not yet proven.
- No unrelated feature/refactor/UI work introduced.

## 9. NEXT CHECKPOINT
`Deploy current main via GitHub Actions → Cloudflare API/SDK → verify deployed SHA/version → runtime smoke → R2 Worker GET/DELETE/404 → Workers AI runtime audit → D1/Gateway/AI → Admin/Password Reset → APK artifact + S21 Ultra → Telegram Auto/VIP E2E → backup/restore + Gate-15 reconciliation → release-gate decision → only then Production GREEN.`
