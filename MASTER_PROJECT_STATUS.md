# PHAN THUẦN XTRA — MASTER PROJECT STATUS

> **DUY NHẤT — CANONICAL PROJECT STATUS / HANDOFF**
> Date: 2026-09-17 (UTC+7)
> Repository: `PHAN-THUAN-XTRA/phanthuanxtra-v9`
> Current main lineage: `5bd7510e005e37496b87a02fe9e5195456f9d917`

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

## 4. CURRENT QUEUE — STAGE 1 DEEP ROOT-CAUSE AUDIT
- PR #240 merged as `c14f3b929675ea86b6136039caf6a24315fea2ad` and introduced the production R2 Worker GET/DELETE/404 E2E boundary.
- Fresh production deployment of PR #240 passed deployment/public smoke but failed at R2 DELETE.
- **Stage 1 root cause established:** `/api/admin/login` issues a signed Admin session token, while `src/media.js` DELETE compared the bearer value directly with `ADMIN_TOKEN`. The valid login session therefore reached the DELETE boundary as 401; R2 storage/delete semantics were not the failing boundary.
- Cloudflare R2 API audit confirmed `R2Bucket.delete(key)` is the correct Worker binding operation and R2 provides strong consistency; no evidence supports an R2 storage consistency defect.
- GitHub source audit, CI evidence and GPT deep root-cause cross-check converged on the authentication boundary as the smallest failing boundary.
- PR #241 applied the narrow fix: `verifyAdminToken()` is accepted for `/media/*` DELETE while direct `ADMIN_TOKEN` compatibility is retained; unit tests cover signed-session delete, unauthenticated rejection, post-delete 404 and direct-token compatibility.
- PR #241 merged successfully as `5bd7510e005e37496b87a02fe9e5195456f9d917`.
- Required `CI / Validate` on the merge commit is **SUCCESS** (`35229775343`).

## 4.1 STAGE 1 PROGRESS REPORT — CLOUDFLARE AUDIT + GITHUB EVIDENCE + GPT DEEP ROOT-CAUSE
**Stage:** 1 — completed root-cause isolation and narrow remediation.

**Method executed after reading this MASTER:**
1. **Observed failure:** production R2 E2E failed after login/upload/GET when executing authenticated DELETE.
2. **GitHub source trace:** inspected `/api/admin/login`, `issueAdminToken()`, `verifyAdminToken()`, `src/media.js`, R2 E2E workflow and media tests.
3. **Cloudflare audit:** checked current R2 Worker API/binding semantics; `delete()` is the expected operation and R2 is strongly consistent.
4. **GPT deep challenge:** rejected hypotheses involving R2 eventual consistency, missing R2 binding, or destructive infrastructure changes because the failure occurred at the application authorization boundary before the delete operation could be accepted.
5. **Smallest boundary isolated:** authorization mismatch between signed Admin session token and direct `ADMIN_TOKEN` comparison.
6. **Narrow repair:** authorize DELETE through the existing `verifyAdminToken()` path; retain legacy direct-token compatibility; add regression tests.
7. **GitHub evidence:** PR #241 CI passed and merge commit `5bd7510e...` has `CI / Validate = success`.

**Evidence conclusion:**
- Source root cause: **CONFIRMED**.
- Fix scope: **NARROW / AUTH BOUNDARY ONLY**.
- Secrets/infrastructure: **UNCHANGED**.
- Production release status: **STILL RED** until the post-merge Cloudflare deployment and fresh real R2 E2E prove `login → upload → GET 200 → DELETE 200 → GET 404` on the same lineage.
- CI success is not treated as runtime proof.

## 5. CHAIN AUDIT STATUS
- Source: **VERIFIED** — main lineage `5bd7510e005e37496b87a02fe9e5195456f9d917`.
- CI: **VERIFIED** — `CI / Validate` success on merge commit (`35229775343`).
- Production deployment: **OPEN/RED** — post-merge deployed Worker version/source lineage must still be directly evidenced.
- Runtime smoke: **OPEN/RED** until verified against the post-merge deployed lineage.
- R2 Worker GET/DELETE/404: **OPEN/RED** — fix is merged, but fresh post-merge runtime E2E evidence is still required.
- D1 CRUD: historical evidence only until refreshed on the current production lineage.
- Gateway/Workers AI: historical evidence only until refreshed on the current production lineage.
- Admin/Password Reset: historical evidence only until refreshed on the current production lineage where required.
- APK artifact/hash + physical S21 Ultra regression: **OPEN**.
- Telegram Auto Bot production E2E: **OPEN**.
- VIP webhook/idempotency E2E: **OPEN**.
- Backup/restore/readability: historical evidence only until current-lineage reconciliation.
- Gate-15: historical evidence only until current-lineage reconciliation.

## 6. RELEASE GATES
1. Current main deployed — **OPEN: prove deployed source lineage = `5bd7510e...`**.
2. Invalid Admin login 401 — VERIFIED historically; refresh as required.
3. Valid Admin login + signed session — VERIFIED historically; refresh as required.
4. Unauthenticated dashboard 401 — VERIFIED historically; refresh as required.
5. Authenticated dashboard — VERIFIED historically; refresh as required.
6. D1 CRUD — VERIFIED historically; refresh as required.
7. **R2 write/read/delete — OPEN/RED until post-merge Worker media GET/DELETE/404 is freshly verified.**
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
- PR #240 is closed/merged.
- PR #241 is closed/merged; its narrow R2 authentication fix is now on `main`.
- Stage 1 root-cause checkpoint is recorded in this canonical file only.
- No competing remediation queue or checkpoint file is permitted.
- Next mutation is authorized only after the post-merge deployment/runtime boundary is observed and the next concrete failing boundary is isolated.
- Never force-push.

## 8. CHANGE LOG — 2026-09-17
- Read canonical MASTER before execution.
- Executed Stage 1 using Cloudflare audit + GitHub evidence + GPT deep root-cause cross-check.
- Confirmed R2 E2E failure was caused by the media DELETE authentication mismatch, not by R2 storage consistency.
- PR #241 merged as `5bd7510e005e37496b87a02fe9e5195456f9d917`.
- `CI / Validate` on the merge commit is successful.
- Updated this file only for the Stage 1 status checkpoint; no competing checkpoint Markdown was created.
- Production remains RED pending fresh post-merge Cloudflare deployment/runtime R2 E2E evidence.

## 9. NEXT CHECKPOINT
`Verify post-merge GitHub Actions deployment → Cloudflare API/SDK → verify deployed SHA/version → public smoke → R2 Worker GET/DELETE/404 → Workers AI runtime audit → D1/Gateway/AI → Admin/Password Reset → APK artifact + S21 Ultra → Telegram Auto/VIP E2E → backup/restore + Gate-15 reconciliation → release-gate decision → only then Production GREEN.`
