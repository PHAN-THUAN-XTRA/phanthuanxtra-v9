# PHAN THUẦN XTRA — MASTER PROJECT STATUS

> **DUY NHẤT — CANONICAL PROJECT STATUS / HANDOFF**
> Date: 2026-09-23 (UTC+7)
> Repository: `PHAN-THUAN-XTRA/phanthuanxtra-v9`
> Latest verified main/deploy lineage: `f87f637d66ec4b5a4dbc1ac3e4f19b88fa2e28e3` (PR #435). Exact-SHA production deploy, Gate-15, QUEUE-01 App API runtime, CI, Android APK MVP and Stage 3 evidence are green; the signed Android 1.6.0 release remains verified on predecessor SHA `29d84899c65683aacfccb84946afcf175bcfba92`.

## 1. SOURCE OF TRUTH / OPERATING RULES
- This file is the sole canonical project-status file; all AI / Work AI must read it before work.
- One execution queue only; no conflicting parallel mutations.
- One ACTIVE PR, one head branch, one commit chain; merge closes the queue.
- Never force-push, never guess/expose/rotate secrets, never create competing checkpoint `.md` files.
- Production remains **RED** until all required release gates have fresh runtime/E2E evidence.
- After a completed status checkpoint, update only this file.

## 2. MANDATORY METHOD — CLOUDFLARE AUDIT → GITHUB EVIDENCE → GPT DEEP ROOT-CAUSE
This is now the mandatory method for every remaining stage and every new failure:

`Read MASTER → observe failure → Cloudflare audit → GitHub source/CI/deploy evidence → GPT deep root-cause challenge → isolate smallest boundary → narrow fix → CI → Cloudflare API/SDK deploy → verify Worker lineage/version/traffic → fresh runtime/E2E → record evidence here.`

Rules:
- **Read-first:** every AI/Work AI reads this MASTER before touching the project.
- **Observe broadly, mutate narrowly:** audit all relevant layers, but source/runtime mutations remain serialized through one queue.
- **Evidence outranks hypotheses:** AI analysis is never production PASS evidence.
- **Bidirectional trace:** source/config forward to runtime and runtime failure backward to exact source/config boundary.
- **No false correlation:** green CI/deployment does not prove downstream runtime health.
- **Runtime-first closure:** a fix is incomplete until the same lineage is deployed and the affected E2E boundary passes.
- **Security:** secrets are checked only for presence/authentication; values are never printed or guessed.
- **Cloudflare:** preserve existing Worker, D1, R2, Workers AI, routes and bindings unless evidence requires a change. Production deployment remains GitHub Actions → Cloudflare API/SDK; Wrangler is not the production path.

## 2.1 AI-FIRST ROOT-CAUSE CHALLENGE
- When project-local Workers AI can execute, use primary `@cf/zai-org/glm-4.7-flash` and existing fallback `@cf/meta/llama-3.2-3b-instruct` as analysis/audit inputs.
- GPT independently challenges the hypothesis against source, configuration, CI logs, Cloudflare deployment evidence and real runtime behavior.
- Current tooling does **not** expose a direct Cloudflare Workers AI runtime invocation to this assistant; do not claim one occurred unless direct runtime evidence exists.
- Mock/simulation evidence is supporting evidence only; production runtime/E2E evidence closes a gate.

## 3. STAGE 1 — DEEP ROOT-CAUSE AUDIT: COMPLETE
Observed production R2 E2E failed at authenticated DELETE after login/upload/GET.

Evidence chain:
1. GitHub source audit traced `/api/admin/login` → `issueAdminToken()` and `/media/*` DELETE.
2. Cloudflare R2 API audit confirmed `R2Bucket.delete(key)` is the correct Worker operation and R2 is strongly consistent.
3. GPT deep challenge rejected R2 consistency/binding hypotheses because authorization failed before the delete boundary.
4. Smallest failing boundary: signed Admin session token was compared directly with `ADMIN_TOKEN`.
5. PR #241 changed DELETE authorization to accept existing `verifyAdminToken()` session validation while retaining direct-token compatibility.
6. PR #241 merged as `5bd7510e005e37496b87a02fe9e5195456f9d917`; required `CI / Validate` passed.

**Stage 1 result: 🟢 COMPLETE.**

## 4. STAGE 2 — POST-MERGE CLOUDFLARE DEPLOYMENT + R2 RUNTIME E2E: COMPLETE
Fresh production deployment proved the corrected lineage:
- GitHub main SHA: `a6c894ef45906931919bac214efa37d991e46c6d`
- Cloudflare API/SDK upload: **PASS**, 22 modules
- Worker version: `bb078a3a-a466-419c-a34d-d4ac41684a36`
- Cloudflare deployment: `b666139b-f0b7-4e06-bb67-1a8fcafd34a2`
- Traffic: **100%** to that Worker version
- `/`, `/api/health`, `/admin.html`: **HTTP 200**
- Admin login: **PASS**
- R2 upload: **PASS**
- R2 GET: **200**
- R2 DELETE: **200**
- R2 GET after delete: **404**
- Production deployment path: **GitHub Actions → Cloudflare API/SDK**; Wrangler not used.

The deployment job emitted: `R2 Worker E2E: upload -> GET 200 -> DELETE 200 -> GET 404.`

**Stage 2 result: 🟢 COMPLETE.**

## 5. STAGE 3 — CURRENT QUEUE: CURRENT-LINEAGE GATE RECONCILIATION + DEEP AUDIT
Stage 3 starts from the current main/runtime lineage above. Do not assume historical green evidence remains valid after lineage changes.

### Current-lineage R2 incident and closure
- Deploy Cloudflare Worker #740 attempt 1 deployed successfully but failed only at the R2 post-delete verification boundary.
- The rerun (attempt 2) completed successfully on main SHA `f1b61fb7883ccc81c9363b2e4652951d267a2327`.
- Cloudflare API/SDK upload: **PASS**, 22 modules.
- Current Worker version: `014b85bd-8c50-4eec-a273-f244644652ae`.
- Current Cloudflare deployment: `72534bab-bf58-41e0-8bd9-c9cce44255df`.
- Traffic: **100%** to the current Worker version.
- Public `/`, `/api/health`, `/admin.html`: **HTTP 200**.
- Fresh authenticated R2 E2E: upload **PASS** → GET **200** → DELETE **200** → cache-busted GET **404**.
- Therefore the R2 runtime boundary is now **🟢 PASS for the current `f1b61fb` lineage**. This closes the specific #740 failure; no Termux/browser action is required for this boundary.

### Stage 3 execution order
1. Read this MASTER and freeze the single queue.
2. Reconcile current main SHA → deployed Worker version → 100% traffic.
3. Audit current production gates in this order: **D1 CRUD → Gateway → Workers AI primary/fallback → Admin/Password Reset → Telegram Auto/VIP → backup/restore → APK artifact/hash + S21 Ultra regression**.
4. For each gate, first inspect existing source/tests/workflow and historical evidence, then perform the smallest real runtime check available.
5. If a boundary fails: stop expansion, apply `Cloudflare audit → GitHub evidence → GPT deep root-cause`, isolate the smallest failing boundary, make one narrow fix, and redeploy on the same queue.
6. If a boundary passes: record fresh current-lineage evidence before moving to the next gate.
7. Only after all required gates are refreshed may Gate-15 / Production GREEN be reconsidered.

### Stage 3 initial audit findings
- Deployment workflow currently contains real R2 Worker E2E after Cloudflare deployment and therefore Stage 2 is directly reproducible in CI/runtime. `.github/workflows/deploy-cloudflare.yml` preserves the API/SDK production path.
- `tests/production-gates.test.mjs` contains unit/contract guards for Telegram auto-publish confidence, AI unknown-question handoff, malformed API/media boundaries, and hidden vehicles, but these are **not substitutes for current production E2E**.
- `src/ai-chat.js` currently declares primary Workers AI `@cf/zai-org/glm-4.7-flash` and fallback `@cf/meta/llama-3.2-3b-instruct`; runtime verification of both paths remains OPEN until fresh production evidence exists.
- D1/Gateway/AI current-lineage runtime evidence: **🟢 refreshed by Stage 3 run #13** on main `987368c`; job `Current-lineage D1 Gateway AI Admin R2` completed successfully in 59s.
- Admin authentication boundaries and Password Reset were also exercised successfully by Stage 3 run #13.
- APK physical-device evidence remains OPEN.
- Telegram Auto and VIP production E2E remains OPEN.

## 6. RELEASE GATES — CURRENT STATUS
1. Current main deployed lineage — **🟢 PASS** (`f1b61fb...` → Worker `014b85bd-8c50-4eec-a273-f244644652ae`, deployment `72534bab-bf58-41e0-8bd9-c9cce44255df`, 100% traffic).
2. Invalid Admin login 401 — **🟢 PASS current-lineage**, Stage 3 run #13.
3. Valid Admin login + signed session — **🟢 PASS current-lineage**, Stage 3 run #13.
4. Unauthenticated dashboard 401 — **🟢 PASS current-lineage**, Stage 3 run #13.
5. Authenticated dashboard — **🟢 PASS within Password Reset E2E current-lineage**, Stage 3 run #13; full dashboard regression remains separately open if required.
6. D1 CRUD — **🟢 PASS current-lineage**, Stage 3 run #13.
7. R2 write/read/delete — **🟢 PASS current-lineage**, fresh runtime evidence on Worker `014b85bd-8c50-4eec-a273-f244644652ae` and Stage 3 run #13.
8. Password reset — **🟢 PASS current-lineage**, Stage 3 run #13.
9. Gateway/AI — **🟢 PASS current-lineage**, Stage 3 run #13.
10. Dual Workers AI — **🟢 PASS for Stage 3 primary/fallback models current-lineage**, Stage 3 run #13; Gate-10 serialized dual-role contract remains separately open until its own workflow evidence is refreshed.
11. APK artifact/hash + S21 Ultra regression — **OPEN**.
12. Telegram Auto Bot production E2E — **OPEN**.
13. VIP webhook/idempotency E2E — **OPEN**.
14. Backup/restore/readability — **OPEN: current-lineage reconciliation required**.
15. Gate-15 smoke/security boundary — **OPEN: current-lineage reconciliation required**.
16. **PRODUCTION GREEN — LOCKED** until all required gates are freshly evidenced.

## 7. SINGLE QUEUE CONTINUITY
- Stage 1 and Stage 2 are complete.
- No parallel remediation queue is allowed.
- Stage 3 is the only active queue.
- No new checkpoint Markdown may be created.
- Any mutation must occur on the active Stage 3 branch/PR, then merge before the next mutation.
- Never force-push.

## 8. CHANGE LOG — 2026-09-18
- PR #251 (`fix(backup): make Telegram notification HTTP errors nonfatal`) merged as `9ffeb796eb6347c63bc0ef142e246ba12bdd0b4e` after GitHub `CI / Validate` passed on head SHA `91dfdfc3bb09089d2be4e233cfce4c811feb27e6` (run #138).
- PR #253 (`test(r2): make delete verification cache-independent`) merged as `f1b61fb7883ccc81c9363b2e4652951d267a2327`. Deploy Cloudflare Worker #740 attempt 2 then completed successfully with fresh current-lineage R2 GET 200 → DELETE 200 → cache-busted GET 404 evidence.
- Telegram HTTP 403 is isolated from backup integrity by removing `curl --fail` from notification delivery; backup artifact/checksum/restore evidence remains authoritative. This is source/CI evidence, not Telegram delivery PASS evidence.
- Android APK workflow run #814 completed successfully on the PR head; `phanthuanxtra-apk-debug` artifact exists with SHA-256 digest `65254e6239f8beceba3830418f4de61f32139fc6aa397d380d9d7a6f5a2c281e`. This is artifact evidence; S21 Ultra physical regression remains OPEN.
- GitHub connector can now read PR #251 CI evidence directly: run #138 `CI / Validate = success`. The previously requested APK run #813 is superseded by fresh run #814 for artifact evidence.
- PR #251 merge completed; fresh Cloudflare deployment/Worker lineage verification and affected backup/restore runtime evidence are still required before closing the corresponding gate.

- Stage 3 run #13 (manual, main `987368c`) completed successfully in 59s for `Current-lineage D1 Gateway AI Admin R2`. Its workflow enforces and passed public smoke, Admin 401 boundaries, D1 CRUD, Gateway health/auth + AI, Workers AI primary/fallback, Password Reset, and R2 lifecycle checks.
- This Stage 3 run closes the corresponding current-lineage runtime evidence gaps without changing production code or secrets.

## 8.1 CHANGE LOG — 2026-09-17
- Read canonical MASTER before Stage 3 work.
- Persisted the mandatory method: **Cloudflare audit → GitHub source/CI/deploy evidence → GPT deep root-cause challenge**.
- Recorded Stage 1 completion and confirmed R2 authentication root cause/fix.
- Recorded Stage 2 completion with fresh Cloudflare API/SDK deployment and real R2 GET/DELETE/404 runtime evidence.
- Started Stage 3 from the proven current main/runtime lineage.
- Stage 3 remains RED/OPEN until D1, Gateway/AI and the remaining gates are refreshed on the current lineage.

## 9. NEXT CHECKPOINT
`Current-lineage D1 CRUD → Gateway → Workers AI primary/fallback → Admin/Password Reset → Telegram Auto/VIP → backup/restore → APK artifact/hash + S21 Ultra → Gate-15 reconciliation → release-gate decision.`

## 9.2 STAGE 3 CURRENT-LINEAGE RUNTIME RECONCILIATION — 2026-09-18
- Run: **Stage 3 Production Reconciliation #13**.
- Source: main commit `987368c27ccb3ddf349173a52d4cc87dd2ce0f47`.
- Job: `Current-lineage D1 Gateway AI Admin R2`.
- Result: **Success**, duration 59s, manually triggered.
- Evidence enforced by the workflow: public smoke; invalid Admin login 401; unauthenticated dashboard 401; D1 create/read/delete; Developer Gateway health + unauthenticated 401 + authenticated AI response; Cloudflare Workers AI primary `@cf/zai-org/glm-4.7-flash` and fallback `@cf/meta/llama-3.2-3b-instruct`; Password Reset rotate → reset → login → restore; R2 upload → GET 200 → DELETE 200 → GET 404.
- No artifact was produced and the only annotation was the Ubuntu runner migration notice; no test failure was reported.
- Production remains **RED/LOCKED** because Telegram Auto/VIP E2E, backup/restore current-lineage evidence, APK physical S21 Ultra regression, Gate-15 reconciliation, and any separately required Gate-10 dual-role runtime evidence remain open.

## 9.1 CURRENT-LINEAGE R2 CLOSURE — 2026-09-18
- Deploy Cloudflare Worker #740 attempt 2 completed **successfully** after the first attempt failed only at R2 post-delete verification.
- Verified lineage: main `f1b61fb7883ccc81c9363b2e4652951d267a2327` → Worker `014b85bd-8c50-4eec-a273-f244644652ae` → deployment `72534bab-bf58-41e0-8bd9-c9cce44255df` → 100% traffic.
- Fresh production evidence: public smoke HTTP 200; authenticated R2 upload/GET 200/DELETE 200/cache-busted GET 404.
- R2 gate is closed for this lineage; Production GREEN remains locked by the other open gates.

## 9.3 ADMIN RECOVERY DELIVERY ROOT-CAUSE + RUNTIME CLOSURE — 2026-09-19
- PR #279 had already corrected /admin.html Worker-first delivery, but /admin-recovery remained served as a raw static asset.
- PR #280 added exact /admin-recovery to run_worker_first; production deployment #809 completed successfully, but fresh runtime still returned HTTP 200 with cache-control: public, max-age=0, must-revalidate and no content-type.
- PR #281 broadened the Worker-first pattern to /admin-recovery*; production deployment completed successfully, but the same runtime header failure remained.
- Deep source/runtime reconciliation isolated the smallest boundary: src/entry.js only normalized / and paths ending in .html; the extensionless /admin-recovery route fell through to the generic asset response even after Worker-first routing.
- PR #282 (fix(admin): normalize recovery page HTML delivery) added an explicit /admin-recovery Worker branch that fetches /admin-recovery.html and applies UTF-8 HTML, no-store cache policy, and removes content-encoding/content-length normalization.
- PR #282 merged to main as c508ad4915f9325105933ad4479fed0abb7c18ec.
- Fresh production runtime evidence after the merged deployment: https://phanthuanxtra.com/admin-recovery returned HTTP 200, content-type: text/html; charset=utf-8, and cache-control: no-store, no-cache, must-revalidate, max-age=0; no content-encoding header was present.
- **Admin Recovery HTML delivery boundary: 🟢 PASS.**
- This closes the specific Admin Recovery delivery/header failure only. It does not close the recovery API functional boundary, Gate-15, or Production GREEN by itself.


## 10. APK AUTOMATION — CONSOLIDATED CANONICAL CHECKPOINT
The former `docs/APK_AUTOMATION_CHECKPOINT.md` has been consolidated into this MASTER. No separate APK checkpoint Markdown is canonical or required.

### Canonical CI path
- Canonical Android workflow: `.github/workflows/android-apk.yml`.
- Duplicate Gate 11 workflows were removed from the automation path.
- CI gates: production App API health → AI contract regression → Gradle 8.9 / Java 17 build → APK existence → SHA-256 → artifact upload.
- Direct GitHub Release publication remains available from the canonical workflow under its existing Gate 11 publish condition.
- Production Worker deployment remains GitHub Actions → Cloudflare API/SDK; Wrangler is not used.

### Physical-device gate
- CI cannot prove behavior on the Samsung Galaxy S21 Ultra.
- The S21 Ultra physical-device regression remains an explicit final evidence gate and must be run after a verified APK artifact is available.

### Operating protocol
- After every APK PR: verify CI → merge only when green → re-audit main across APK/API/Worker/automation → record evidence in this MASTER → continue to the next smallest verified change.

### Preserved historical evidence
- APK checkpoint dated 2026-09-18 recorded branch `chore/apk-canonical-ci-2026-09-18` and main commit `f7f7e42ef2572ed1b617cd89ab1757419a9e93e5` (PR #271 merge).
- Later MASTER evidence supersedes that historical SHA for current project status; retain it only as historical traceability.

## 11. CLOUDFLARE ASK AI / WORKERS AI CONTROL + SYNCHRONIZATION PROTOCOL
- This MASTER is the **sole Markdown source of truth** for ChatGPT ↔ owner ↔ GitHub ↔ Cloudflare Ask AI / Workers AI coordination. Do not create a second checkpoint/control Markdown file.
- The owner is the relay between ChatGPT and the active Ask AI session on `dash.cloudflare.com`; ChatGPT does not claim direct control of that browser session.
- **Every Ask AI instruction that changes or proposes changing Cloudflare state must be recorded in this MASTER.**
- **Every Ask AI execution result must be returned to ChatGPT and reconciled into this MASTER before the action is treated as complete.**
- A Cloudflare action is not considered synchronized or closed merely because Ask AI says it succeeded. Closure requires the corresponding GitHub MASTER update to pass branch → PR → required checks → merge.
- Before destructive or hard-to-reverse Cloudflare actions, record: resource, resource type/ID or exact name, current state, dependencies, proposed action, expected result, risk, rollback and approval state. If dependency evidence is incomplete, classify as REVIEW and do not delete.
- Never paste, store or commit secret values, tokens, passwords, recovery codes or private credentials. Record only secret/binding names and presence/status where needed.
- Production-critical resources remain protected unless an explicit, evidenced change is approved: `phanthuanxtra.com`, the production Worker, Admin, website Chat AI, vehicle catalog, D1, R2, CRM/Telegram and Developer Gateway where dependency still exists.
- Workers AI optimization must prioritize real customer Chat AI traffic. CI, health checks and smoke tests should avoid paid/quota-consuming inference when deterministic validation can prove the same boundary.
- Ask AI / Workers AI may audit broadly, but mutations must remain narrow, reversible where possible and serialized through the single execution queue.

### 11.1 Mandatory Ask AI execution ledger
For every instruction sent to Cloudflare Ask AI that can mutate state, append or update one record in this MASTER with:
- `ASK_AI_ID`: sequential local identifier, e.g. `CF-AI-001`.
- `UTC+7 timestamp`.
- `Objective`.
- `Instruction sent`: concise exact operational intent; do not include secret values.
- `Target resources`.
- `Pre-change evidence`.
- `Risk / rollback`.
- `Ask AI result`: COMPLETE / PARTIAL / FAILED / REVIEW.
- `Cloudflare evidence`: resource state, route/domain/binding/deployment identifiers or dashboard/API evidence available from the Ask AI response.
- `GitHub reconciliation`: branch, PR, checks and merge SHA that record the result.
- `Post-change verification`: affected production/runtime checks.
- `Final sync state`: `SYNCED` only when Cloudflare evidence and the merged MASTER agree.

### 11.2 Required handoff loop
`ChatGPT reads MASTER → ChatGPT prepares instruction → owner sends it to Cloudflare Ask AI → Ask AI executes/audits → owner returns the full relevant result to ChatGPT → ChatGPT challenges dependencies/results → GitHub MASTER update via branch/PR/checks/merge → runtime verification where applicable → mark ASK_AI_ID SYNCED.`

Rules:
- Do not issue the next conflicting mutation while the current `ASK_AI_ID` is unsynchronized.
- Read-only audits may continue in parallel only when they cannot alter production state.
- If Ask AI reports a change but the result cannot be independently evidenced, record it as PARTIAL/REVIEW, not PASS.
- If Cloudflare and GitHub disagree, Cloudflare runtime evidence describes current runtime while this MASTER must be updated immediately through the normal PR path; never silently choose one side.
- If an Ask AI action changes Worker routes, domains, bindings, D1/R2/KV/Queues, Cron, AI Gateway/Search, Workers AI configuration or any production dependency, post-change runtime verification is mandatory before `SYNCED`.

### 11.3 Current coordination state
- Canonical coordination file: `MASTER_PROJECT_STATUS.md`.
- Separate Cloudflare/Ask-AI checkpoint Markdown files: **FORBIDDEN**.
- Current policy: **no Ask AI mutation is considered complete until recorded and merged here with evidence.**


### 11.4 Ask AI execution ledger

#### CF-AI-001 — 2026-09-22 UTC+7
- Objective: high-speed Cloudflare audit/optimization while protecting production and prioritizing Workers AI quota for real website Chat AI traffic.
- Instruction sent: audit and execute the largest safe Cloudflare optimization batch; hard-stop destructive production actions; return Cloudflare/runtime evidence.
- Target resources: Workers/Pages, routes/custom domains, Workers AI, AI Gateway/Search, D1, R2, KV, Queues, Cron, bindings and production verification endpoints.
- Pre-change evidence: not obtained by Ask AI because its Cloudflare API connection was unavailable.
- Risk / rollback: no mutation occurred, therefore no rollback required.
- Ask AI result: **FAILED**.
- Cloudflare evidence reported by Ask AI: API token invalid/expired; all calls returned connection error; actions executed = 0; resources changed/removed = none; all resources preserved; production verification unavailable.
- GitHub reconciliation: this ledger entry records the failed attempt only. It does **not** assert that the repository's independent GitHub Actions Cloudflare credentials are expired or invalid.
- Post-change verification: not required for this attempt because Ask AI reported no Cloudflare mutation.
- Final sync state: **SYNCED-FAILED / BLOCKED ON ASK AI CLOUDFLARE RECONNECTION**.
- Required next action: reconnect/re-authorize the Cloudflare account used by Dashboard Ask AI without sharing token/secret values in chat, then rerun the same audit as the next execution attempt.


#### CF-AI-002 — 2026-09-22 UTC+7
- Objective: verify reconnected Dashboard Ask AI access and resume the Cloudflare audit/optimization batch.
- Ask AI result: **PARTIAL**.
- Access verification: Dashboard navigation is available, but the active Ask AI session reports no direct Cloudflare REST API execution/inventory tool. Account entitlements and Workers AI capability were not confirmed; Workers/Pages, D1/R2/KV/Queues, DNS/routes/custom domains, AI Gateway/Search and Cron/bindings could not be inventoried automatically from that session.
- Actions executed: 0.
- Resources changed/removed: none.
- Workers AI optimization: not executed because resource inventory was unavailable to Ask AI.
- Cloudflare evidence: Dashboard pages resolved, but Ask AI reported no API execution capability. Treat this as a **session capability boundary**, not as evidence that Cloudflare resources or GitHub Actions Cloudflare credentials are unavailable.
- Production verification: not executed by Ask AI.
- Hard-stop items: none; no mutation was attempted.
- Security decision: do **not** provide Cloudflare API token values to Ask AI or paste them into chat.
- Execution-plane decision: use existing authorized GitHub Actions → Cloudflare API/SDK automation for machine-readable Cloudflare audit/execution evidence; use Dashboard Ask AI for dashboard-local analysis/documentation where useful; reconcile both through this MASTER.
- Final sync state: **SYNCED-PARTIAL** after this ledger update is merged; no Cloudflare mutation occurred.


## 12. DAILY TELEGRAM BACKUP CONTRACT — 2026-09-22
- Required schedule: **07:00 Asia/Ho_Chi_Minh every day**, implemented as GitHub Actions cron `0 0 * * *` (UTC).
- Manual `workflow_dispatch` remains available for recovery/testing; routine push-triggered full backups are removed to prevent duplicate Telegram deliveries unrelated to the 07:00 schedule.
- A scheduled backup is PASS only when collection, checksums, archive integrity, GitHub artifact upload **and Telegram delivery** all succeed.
- Telegram backup credentials must be present; missing credentials are a failure, not a silent skip.
- Telegram Bot API responses must return `.ok == true` for the status message, archive, manifest and SHA-256 file. HTTP/API errors fail the workflow.
- The archive must fit the configured Telegram delivery ceiling (49,000,000 bytes); oversize archives fail visibly rather than reporting a false-green backup.
- Secret values remain excluded from the backup and must never be printed in logs.


#### CF-AI-003 — 2026-09-22 UTC+7
- Objective: dashboard-side Cloudflare intelligence audit without API token disclosure or destructive action.
- Ask AI result: **COMPLETE (dashboard-side intelligence only; no API execution)**.
- Dashboard capabilities: product/dashboard pages were discoverable, but account entitlements/capabilities remained unresolved and the session could not enumerate Worker names, D1/R2/KV resources, DNS/routes, bindings, cron schedules or deployment versions.
- Workers AI usage: actual Neuron consumption and account tier were unavailable in the Ask AI session. Treat plan/quota conclusions as conditional until machine evidence confirms them.
- Dashboard findings reported by Ask AI: queue names `verify-email` and `purchase` appeared in dashboard search. This is discovery evidence only; existence, ownership, consumers and dependency on PHAN THUẦN XTRA are **not yet machine-verified**, so no queue mutation is authorized.
- AI Gateway / AI Search: dashboard pages were discoverable, but the existence of a credits page or tokens page alone does **not** prove an active gateway/index or production dependency. Machine verification is required before cleanup decisions.
- God's Eye View: no dashboard search match was reported. The authoritative retirement evidence remains the earlier GitHub/API decommission verification; dashboard absence is supporting evidence only.
- GitHub reconciliation: production website Chat AI source uses `@cf/zai-org/glm-4.7-flash` primary with `@cf/meta/llama-3.2-3b-instruct` fallback and a short response cache. Current Stage 3 reconciliation explicitly avoids Workers AI inference in routine CI and reserves allocation for website customers. The Developer Gateway still has Workers AI models configured, but its production dependency/traffic must be audited before any removal.
- Machine-audit policy: this repository intentionally uses GitHub Actions → Cloudflare API/SDK rather than Wrangler for production automation. Do not adopt Ask AI's Wrangler commands as the canonical execution path.
- Security: no Cloudflare token/API key/secret value is to be supplied to Dashboard Ask AI or committed to GitHub.
- Mutations executed: **0**.
- Post-change verification: not required because CF-AI-003 made no Cloudflare mutation.
- Final sync state: **SYNCED** once this ledger entry is merged.
- Next machine checks: use existing authorized GitHub Actions/API-SDK evidence to inventory relevant Worker/routes/bindings and verify whether the reported queues, AI Gateway or AI Search have any PHAN THUẦN XTRA dependency; classify KEEP / REVIEW / REMOVE only after dependency evidence.


### 12.1 CF-MACHINE-001 — automated Cloudflare read-only inventory
- Purpose: machine-verify Cloudflare resources that Dashboard Ask AI CF-AI-003 could not enumerate.
- Execution plane: GitHub Actions → Cloudflare REST API using existing production-scoped GitHub secrets. No Wrangler and no user-supplied credential values.
- Scope: Workers, D1, R2, KV, Queues, AI Gateway, AI Search, production zone/routes, production Worker settings/bindings and deployments, plus source-level Workers AI call evidence.
- Safety: GET/read-only requests only; `mutations: 0`; secret-like fields are redacted from the generated report.
- Evidence: `cloudflare-audit/report.json` is an ephemeral GitHub Actions artifact retained 30 days, not a second committed Markdown source of truth.
- Trigger: automatically on main when the audit workflow/script changes; manual dispatch remains available.
- Decision rule: resources are not classified REMOVE until machine evidence proves no production dependency. Unsupported API permissions are recorded as UNAVAILABLE rather than guessed.


### 12.2 CF-MACHINE-001 invalidated; CF-MACHINE-002 supersedes it
- CF-MACHINE-001 workflow execution itself succeeded with zero mutations, but its report parser had an off-by-one HTTP-status bug: Cloudflare `200` was recorded as `0` and `403` as `3`.
- Therefore CF-MACHINE-001 resource availability fields are **INVALID FOR CLASSIFICATION**. No KEEP/REMOVE decision may rely on that artifact.
- CF-MACHINE-002 fixes status parsing by slicing with the exact marker length and re-runs the same read-only inventory automatically on main.
- Queue-01 production E2E race also identified: the push-triggered E2E attempted Admin login before the concurrent production deployment completed. Queue-01 is changed to `workflow_run` and executes only after a successful `Deploy Cloudflare Worker` run for `main`, checking out the exact deployed SHA.
- Both changes are CI/audit control-plane fixes only; no Cloudflare resource mutation is performed.


### 12.3 CF-MACHINE-002 evidence and CF-MACHINE-003 dependency mapping
- CF-MACHINE-002 corrected the parser and completed successfully with `mutations: 0`.
- Verified production facts from Cloudflare API: Worker `phanthuanxtra-v2`; active zone `phanthuanxtra.com`; routes for apex, `www`, and `chat`; production D1 binding to `phanthuanxtra-db` (`8b6c0fc8-c278-4797-9cfa-3ec93d0c1b7d`); R2 binding `phanthuanxtra-media`; Workers AI binding `AI`; AI Search namespace binding `AI_SEARCH`.
- Cloudflare Queues API returned an empty queue list with HTTP 200. Dashboard Ask AI names `verify-email` and `purchase` are therefore treated as **NOT PRESENT in current account API inventory**, not cleanup targets.
- AI Gateway list remained permission-blocked (HTTP 403), so it stays REVIEW and no mutation is authorized.
- The initial AI Search list path was corrected to the current namespace-scoped endpoint. Regardless of inventory permission, the production Worker binding proves AI Search is a live dependency and therefore KEEP.
- Queue-01 rerun after the production deploy completed successfully, confirming the earlier Admin 401 was a deployment-order race.
- CF-MACHINE-003 extends the read-only audit across every Worker: settings/bindings, route metadata and Cron schedules, using the same existing GitHub Actions Cloudflare credentials.
- Automated classification is conservative: verified production dependencies = KEEP; non-production Workers = REVIEW; REMOVE remains empty until dependency evidence and explicit destructive approval exist.


### 12.4 CF-MACHINE-003 classification + audit artifact security fix
- CF-MACHINE-003 completed read-only with `mutations: 0`.
- Machine evidence: Cloudflare Queues API returned HTTP 200 with `total_count: 0`. Dashboard-only names `verify-email` and `purchase` are classified **NOT PRESENT**, not REMOVE targets.
- **KEEP**: production Worker `phanthuanxtra-v2`; production D1 binding; R2 bucket `phanthuanxtra-media`; Workers AI binding `AI`; AI Search binding `AI_SEARCH`; Developer Gateway `phanthuanxtra-developer-gateway`.
- **REVIEW**: non-production Workers `ask-ai-agent`, `ask-ai-api`, `luxury-ui-analyzer`, `phanthuanxtra`, `phanthuanxtra-backup`, `phanthuanxtra-chatbot`, `phanthuanxtra-dashboard`, `phanthuanxtra-v2-backup`. No REMOVE classification yet.
- **AI Gateway: REVIEW/BLOCKED** because both existing audit credentials receive HTTP 403 from the list endpoint; absence must not be inferred.
- **AI Search inventory: permission-blocked**, but the verified production `AI_SEARCH` binding and website source usage prove it is a live dependency, therefore KEEP.
- Security finding: pre-fix machine-audit artifacts could include a sensitive value from a `plain_text` binding because the original redactor inspected field names but not sensitive binding names. No credential value is copied into this MASTER.
- Remediation: redaction now treats `secret_text` and sensitive binding names as secret objects and redacts `text/value`; CI validates that no sensitive binding value escapes. Known pre-fix audit artifacts are deleted by a one-time GitHub Actions cleanup workflow after merge.
- Credential rotation remains a separate production mutation and requires explicit approval; artifact deletion and redaction do not rotate Cloudflare credentials.


### 12.5 Canonical audit handoff — 2026-09-22 UTC+7
- Owner reaffirmed: use **only this existing Markdown file on GitHub** for project status/handoff. Do not create competing audit/checkpoint Markdown files. This entry supersedes older current-status claims above where lineage differs; historical evidence is retained.
- PR #377 merged as `8a8324e7bd46148a1129cd99fbf702959fe69a9f`: https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/pull/377
- Production deploy #1013: actual production deploy, public boundary, Admin UTF-8 and R2 GET → DELETE → 404 steps all SUCCESS: https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/35700708497
- Cleanup #1 confirmed DELETE HTTP 204 for all three pre-fix artifacts: `10680328206`, `10680711498`, `10680792704`: https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/35700708468
- Machine audit #8: redaction contract PASS; 10 Workers mapped; mutations=0; KEEP/REVIEW/NOT PRESENT classifications in 12.4 retained; REMOVE empty. Both AI Gateway and AI Search inventory reported UNAVAILABLE; never infer absence: https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/35700708486
- Production Gate-15 #233 including D1/R2 succeeded: https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/35700708459
- APK #1074 build succeeded (not physical-device verification): https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/35700708641
- At the recorded check, 12 workflows succeeded and Production Smoke #703 was CANCELLED with no jobs returned: https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/35700708474 . Shared concurrency is a hypothesis, not a proven cancellation cause. Do not label every workflow green.

#### Active PR #378 — production credential safety
- PR: https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/pull/378 ; branch `fix/smoke-production-credential-safety`. OPEN, not merged at this checkpoint.
- Removes live password-reset/recovery rotation from both routine production smoke workflows, removes unused recovery rotation secret binding, and explicitly reports password-reset E2E NOT RUN. Retains existing login/auth, website/Gateway health, D1/R2 and concurrency settings.
- New Production Credential Safety check rejects known reset/rotate endpoint references, rotation secret, misleading reset PASS output and missing retained-check markers in these two workflows. This bounded static check is not proof against every possible indirect credential mutation.
- Local validation: YAML parse, all shell steps bash -n, guard Python syntax PASS; guard accepts edited workflows and rejects each unsafe original workflow.
- All 7 PR workflows succeeded on **code head** `790820a905d2edf7ba8bc1bf951868df22901fc0`. This documentation commit changes the head; recheck the resulting head before merge rather than carrying old green evidence forward.
- Credential guard: https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/35701644080
- Runtime harness: https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/35701643580
- APK: https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/35701643418
- Static audit: https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/35701643417
- Deploy workflow validation succeeded, but actual production deploy job was **SKIPPED** on the PR: https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/35701643481
- CI: https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/35701643454
- Admin pipeline: https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/35701643711
- PR green does not mean production has this fix. Remaining D1/R2 steps still write/delete test data; this change does not make the entire smoke read-only. Password-reset E2E requires isolated testing or a separately approved production procedure.

#### Pending authorization and next steps
1. Recheck new PR #378 head and checks after this MASTER update. Merge remains pending explicit approval; writing this entry is not merge authorization. Do not open another competing checkpoint PR.
2. After authorized merge, obtain actual merge SHA and fresh push/deploy/UTF-8/R2 evidence. Shared-concurrency cancellation remains a separate unresolved boundary; PR #378 does not claim to fix it.
3. AI Gateway/AI Search inventory remains blocked; Dashboard Ask AI in the cloud browser requires user verification. No direct Ask AI runtime success is claimed.
4. Credential suspected of artifact exposure has no verified remediation rotation. Redaction/artifact deletion is not credential rotation. Rotation and Cloudflare resource deletion require separate approval.
5. Owner uses Windows 10 PowerShell. Request specific PowerShell/Ask AI help only when needed; never request secret values in chat.
6. No background monitoring automation has been created. Production GREEN remains locked until all required current-lineage release evidence is reconciled, including physical-device and other open gates.


## 13. P0–P4 MASTER AUDIT & EXECUTION PLAN — CONSOLIDATED 2026-09-22

This section consolidates the temporary `XTRA_MASTER_AUDIT.md` into this canonical MASTER. After this consolidation, `MASTER_PROJECT_STATUS.md` is the only project-status / audit-plan Markdown source of truth.

### Operating model
1. **ChatGPT = reasoning / audit / decision layer.** Inspect evidence first and choose the smallest safe change.
2. **Cloudflare Ask AI / Workers AI = execution accelerator.** It may execute defined tasks with its authorized capabilities, but its conclusions do not replace GitHub/runtime evidence.
3. **GitHub automation = verifier and evidence plane.** Prefer direct automated audit and focused branch/PR changes; serialize production-mutating E2E and never reset production credentials in routine smoke.
4. **This MASTER = durable plan + evidence ledger.** Do not create a parallel checkpoint/control Markdown.
5. **Fix only from evidence.** Cancelled/skipped is not a failed assertion; never patch merely to make status green.
6. **Conserve AI quota.** Routine CI should use deterministic health/auth checks when live inference is unnecessary.

### P0 — Gate-15 closure: COMPLETE
- Fresh manual Gate-15 run: **35705461544**.
- Event: `workflow_dispatch`; branch: `main`; tested SHA: `fc093e3a9b79b30b24c299bec78fb74516f2907c`.
- Result: **SUCCESS**.
- Verified workflow steps include website + production Worker checks, Admin authentication boundary, Developer Gateway health/auth, D1 create/read/delete, production credential-safety policy, R2 media write/read/delete with post-delete verification, detail-page smoke, and final production summary.
- No application fix was required to close P0.
- Historical cancelled run `35703616243` remains historical evidence only and is superseded for P0 closure by the fresh successful run above.

### Ask AI / Workers AI audit execution
- AI Unified Executor run: **35705678250** on SHA `fc093e3a9b79b30b24c299bec78fb74516f2907c`.
- Result: **SUCCESS**.
- Checkout, environment preparation, canonical checkpoint read, Cloudflare Workers AI executor, safety/regression gate and executor summary all completed successfully.
- Task objective: audit P1 GitHub workflow overlap and P2 Cloudflare binding/runtime usage without production mutation or resource deletion.
- GitHub/source/runtime evidence remains authoritative for resulting KEEP/REVIEW/fix decisions.

### P1 — GitHub workflow inventory and consolidation: IN PROGRESS
Objective: reduce duplicate triggers, duplicate production E2E, Actions noise and ambiguous cancellation states.

Audit every `.github/workflows/*.yml` and classify CI/static/unit, deploy, production verification, credential/security, scheduled maintenance, Android/release, AI automation and obsolete/duplicate. Record triggers/path filters, concurrency, secrets, D1/R2/credential mutation, AI inference, workflow dependencies and overlap.

Target architecture: `CI -> Deploy -> Production Verify -> Release Evidence`. Only one serialized workflow should perform production-mutating D1/R2 E2E; other workflows should consume evidence where practical. Do not delete or merge workflows until dependency/trigger evidence proves the change safe.

Current evidence: repository inventory contains **36 workflow YAML files**. A documentation-only master-plan PR triggered multiple unrelated checks including Android/runtime/deploy-class workflows, so trigger/path-filter consolidation is a concrete P1 target. Audit/fix through GitHub directly where possible.

### P2 — Cloudflare binding/runtime inventory: IN PROGRESS
Current `wrangler.json` declares Assets/`ASSETS`, Workers AI/`AI`, Images/`IMAGES`, AI Search/`AI_SEARCH`, R2/`MEDIA`, D1/`DB`, observability, cache and cron `*/5 * * * *`.

Rules: prove source/runtime usage before removal. Existing source audit confirms `AI_SEARCH` is used by website AI logic and the scheduled handler is live for Telegram webhook/reconciliation maintenance; therefore neither is a cleanup candidate. `ASSETS`, `AI`, `MEDIA` and `DB` also have established runtime dependencies. Complete exact `IMAGES` call-site/runtime evidence before classifying it. Never remove a binding from configuration alone.

### P3 — Unified Publish Core: PLANNED
Desired flow: `Telegram | Admin | ChatGPT | future API clients -> Publish Core -> validation -> D1/R2 -> website -> outbound channels`.

Existing verified capabilities include Telegram vehicle photo/text ingestion, R2 media storage, vehicle AI + publication gates, promotion to website data, Admin inventory management and Admin car-to-Telegram publishing. Channel adapters should handle ingestion/auth only; canonical schema, deterministic validation, idempotency, draft/review/publish state and audit trail belong in one Publish Core. ChatGPT should call the authenticated API rather than duplicate business logic.

### P4 — UI V2 conversion simplification: PLANNED
Proposed hierarchy: `Hero -> Automotive inventory -> Private Concierge -> Ecosystem -> AI Assistant -> Contact`. Keep primary CTAs small and consistent: inventory plus private contact/appointment. Perform desktop/mobile production visual review, CTA/inventory/contact friction, performance/Core Web Vitals, accessibility and SEO/schema audit before implementation. Do not perform wholesale redesign before P1/P2 are stable.

### Automatic audit protocol
Read this MASTER first; read current main SHA and recent Actions; compare evidence with P0–P4; audit non-destructively first; use existing safe verifiers; make focused branch/PR changes; never mutate production credentials in routine automation; never delete Cloudflare bindings/workflows without dependency proof; record durable evidence back into this MASTER. Ask the owner only for external permission, Cloudflare account-only settings, secret/billing decisions, destructive production actions or external-channel authorization.

### Current P0–P4 ledger
| Priority | State | Evidence / next action |
|---|---|---|
| P0 | **COMPLETE** | Gate-15 run `35705461544` SUCCESS on `fc093e3`. |
| P1 | **COMPLETE** | Trigger/consolidation remediation completed; production deploy, canonical Gate-15 and post-deploy QUEUE-01 all SUCCESS on `df18d130`. |
| P2 | **SOURCE CLASSIFICATION COMPLETE** | ASSETS/AI/IMAGES/AI_SEARCH/MEDIA/DB/cron all KEEP from direct source usage; account/runtime telemetry remains a separate optional evidence layer. |
| P3 | **COMPLETE** | Vehicle Publish Core canonicalized: Telegram AI, Admin/CMS, App API and Publish API share validation/persistence; website/D1/R2 and idempotent Telegram output are verified. |
| P4 | **PLANNED** | Production visual/performance audit before UI implementation. |


## 14. Tooling constraint — Wrangler CLI

- **ABSOLUTE PROJECT RULE: DO NOT use, request, recommend, or provide Wrangler CLI commands as an execution path for this project. This applies to ChatGPT, GitHub automation instructions, Cloudflare Ask AI instructions, Windows/PowerShell, Android/Termux, and any other operator environment.**
- The owner may operate from Windows before 16:00 VN and from a Samsung S21 Ultra with Termux after 16:00 VN; the rule remains unchanged: **no Wrangler CLI**. Cloudflare account/runtime operations requiring full authority should use **Ask AI in the Cloudflare Dashboard** when needed.
- ChatGPT prepares the exact instruction/prompt; the owner pastes it into Cloudflare Ask AI; GitHub remains the durable audit/evidence plane and records results in this `MASTER_PROJECT_STATUS.md`.
- Reading `wrangler.json` as a repository configuration file for dependency/audit evidence is allowed. Never translate that audit into a `wrangler ...` command.


### 13.1 P1/P2 audit update — Android trigger + production E2E overlap
- P1 evidence: `android-apk.yml` previously ran on every push to `main` and every pull request targeting `main` with no path filter. PR #380/#381 demonstrated documentation-only changes unnecessarily launching the APK build/runtime smoke. The focused remediation adds `paths-ignore` for `docs/**` and `**/*.md` to Android push and pull_request triggers; `workflow_dispatch` remains available.
- P1 overlap evidence: `QUEUE-01 Production E2E Origin` and `Production Smoke Gate-15` both mutate production test data through Admin D1 CRUD and R2 write/read/delete. QUEUE-01 additionally contains a direct bucket verification implemented through a Wrangler CLI command. Because section 14 now absolutely forbids Wrangler execution, that step/path is non-compliant and must not be used as the future canonical verifier. No destructive workflow removal is authorized in this change; consolidation will be a separate focused change after replacement evidence is defined.
- P2 source classification: `ASSETS` KEEP; `AI` KEEP; `IMAGES` KEEP; `AI_SEARCH` KEEP; `MEDIA` KEEP; `DB` KEEP; scheduled cron KEEP. Exact new evidence for `IMAGES`: `src/media.js` calls `env.IMAGES.input(...).draw(...).output(...)` for the PT Xtra branded vehicle-media response and reads the overlay through `env.ASSETS`. Workers AI is directly invoked by `src/vehicle-ai.js` through `env.AI.run(...)`; R2 `MEDIA` is directly used by `src/media.js` for put/get/delete. No declared production binding is classified REMOVE from source evidence.
- Tooling rule remains absolute: repository configuration may be inspected, but no Wrangler CLI execution may be requested, recommended, or used.


### 13.2 P1 remediation — QUEUE-01 no-Wrangler compliance
- PR #382 merged as `475c289b75f38fb1dd1c72edcdc9da54e52003a9` after a clean/mergeable head with successful CI, credential-safety, runtime, static-audit, isolated-audit and Android checks; the deploy job on the PR was correctly skipped. The Android workflow now ignores Markdown/docs-only changes on push and pull_request.
- Follow-up remediation removes the prohibited Wrangler-based direct R2 read from `QUEUE-01 Production E2E Origin`, together with Node/npm setup and Cloudflare account/API-token requirements that existed only for that command.
- QUEUE-01 retains Worker-origin Admin signed-session verification, authenticated dashboard, D1 create/read/delete, and R2 upload/read/delete/404 through the production Worker API. This preserves post-deploy origin verification without Wrangler CLI.
- Gate-15 remains the broader canonical public production smoke/E2E gate. QUEUE-01 remains a post-deploy origin verifier for now; workflow deletion/merging is deferred until trigger lineage proves that removing it would not reduce post-deploy evidence.
- No production credential rotation, Cloudflare resource deletion, or binding removal is part of this remediation.


### 13.3 P1 remediation — stop PR-triggered production mutation
- PR #383 merged as `78bf48401e3c315aeeccaa274d794eeb2a0a65b6` after all required observed checks completed successfully; production deploy on the PR remained skipped. QUEUE-01 no longer contains or depends on Wrangler CLI.
- Trigger audit found `gate15-runtime-evidence.yml` ran on every pull request targeting `main` while performing production D1 create/read/delete and R2 upload/read/delete/404. This violates the target separation between PR validation and serialized production-mutating verification and explains production runtime activity on otherwise non-production PRs.
- Focused remediation removes the `pull_request -> main` trigger from Gate 15 Runtime Evidence Harness. Its dedicated audit-branch push trigger and manual `workflow_dispatch` remain available, so the harness is retained for intentional runtime evidence collection without mutating production for ordinary PRs.
- Canonical production Gate-15 remains `production-smoke-gate15.yml`; post-deploy origin verification remains QUEUE-01. `production-smoke.yml` remains a duplicate candidate requiring final dependency/history evidence before disable/delete.
- No Cloudflare resource, production credential, D1 schema, R2 bucket, or binding is changed by this remediation.


### 13.4 P1 consolidation — retire duplicate Production Smoke automatic trigger
- PR #384 merged as `8a347786845664e4893b889a6c90f2d9ad9273ec` after all observed checks succeeded; deploy on the PR was skipped. Ordinary PRs no longer trigger the Gate 15 Runtime Evidence Harness production D1/R2 mutation.
- Final duplicate audit compared `production-smoke.yml` and `production-smoke-gate15.yml`: both automatically triggered on main pushes, used the same production E2E concurrency group, and covered website/Worker health, Admin auth, Developer Gateway, D1 mutation and R2 mutation. Gate-15 additionally checks out the exact triggering commit and is the established canonical P0 verifier.
- Consolidation keeps `Production Smoke Gate-15` as the automatic canonical production gate. The legacy `Production Smoke Test` is changed to manual-only `workflow_dispatch` and moved to a separate legacy-manual concurrency group. This stops duplicate production mutation on every main push while preserving an explicit fallback/manual diagnostic path.
- P1 core remediation state after this change: Android docs-only automatic build noise removed; PR-triggered Gate-15 runtime production mutation removed; QUEUE-01 Wrangler dependency removed; duplicate Production Smoke automatic push mutation retired. QUEUE-01 remains post-deploy origin verification and canonical Gate-15 remains public production verification.
- P2 source binding classification remains complete: all declared production bindings/cron are KEEP; no source-supported REMOVE candidate exists.


### 13.5 P1 completion evidence — production verification on canonical main
- PR #385 merged to `main` as `df18d130e0cd1472a31448525e49f62f09e319e7` after its PR checks passed.
- The post-merge production chain on that exact SHA completed SUCCESS: Deploy Cloudflare Worker run `35721081413`; Production Smoke Gate-15 run `35721081444`; QUEUE-01 Production E2E Origin run `35721166160`; Production Credential Safety `35721081368`; CI `35721081369`; Android APK MVP `35721081381`; Release Gate Static Audit `35721081385`; Admin PT Xtra Pipeline `35721081394`; Homepage Canonical Verify `35721081393`; Admin Redirect Verify `35721081370`; Stage 3 Production Reconciliation `35721081375`.
- P1 is therefore COMPLETE for the scoped trigger/consolidation work: canonical deploy succeeded, canonical Gate-15 succeeded, and the post-deploy origin verifier succeeded on the same main SHA after the no-Wrangler remediation.
- No final evidence in this chain requires Wrangler CLI. No production credential rotation or destructive Cloudflare resource mutation was performed by the P1 remediation.


## 15. P3 Publish Core — canonicalization started
- Audit result: current publishing is vehicle/listing publishing, not a generic article CMS. Existing inputs are fragmented across Telegram AI ingestion (`telegram-ingest.js` / `telegram-router.js`), Admin vehicle creation (`/api/admin/cars`), CMS/API vehicle CRUD (`/api/cms/v1/cars`), App API vehicle CRUD, and Telegram output (`publishCar`).
- Existing Telegram ingestion already performs R2 source storage, Workers AI vehicle analysis, confidence gating, optional PT Xtra plate branding, D1 draft state, website car promotion and Telegram publishing with duplicate protection.
- Existing Admin path has an AI/branding preprocessor before `handleAdminCars`. CMS and App API write cars separately, so validation/storage semantics are duplicated.
- P3 introduces `POST /api/publish/v1/cars` as the first canonical Publish Core entry point. It accepts trusted Admin/CMS/App bearer identities, delegates car validation/D1 persistence to the existing CMS car handler, and optionally fans out to Telegram through the existing idempotent `publishCar` implementation.
- This first slice deliberately does not claim Facebook/Zalo/article publishing and does not replace Telegram AI ingestion yet. Next P3 slice should extract a shared service function so Telegram/Admin/CMS/App all call the same validation/persistence core without internal HTTP-shaped adapters, then add contract tests and migrate callers incrementally.
- Security scope: no new secret is introduced; existing Admin/CMS/App credentials are reused. No Cloudflare resource/binding mutation is required.


### 15.1 P3 completion evidence — canonical vehicle publishing
- PR #387 introduced the authenticated canonical `POST /api/publish/v1/cars` entry point and optional idempotent Telegram fan-out.
- PR #388 extracted `src/vehicle-persistence.js`; Admin/CMS, Publish Core and Telegram AI promotion now share the same vehicle validation/D1/image persistence service instead of separate write implementations.
- PR #389 migrated App API POST/PUT vehicle writes to the same shared service and added contract tests for vehicle IDs, canonical payload normalization, status validation and update preservation.
- Canonical flow is now: Telegram AI / Admin / CMS / App API / Publish API → shared vehicle persistence → D1 + persisted media URLs/R2-backed media → website inventory → optional Telegram `publishCar` output with `telegram_posts.car_id` duplicate protection.
- Production verification on PR #389 merge SHA `b802f1081122650b1a9b5051e87acdb945b6f2ce` completed SUCCESS: Deploy Cloudflare Worker `35727206036`; Production Smoke Gate-15 `35727206126`; QUEUE-01 Production E2E Origin `35727303745`; CI `35727206140`; Production Credential Safety `35727206011`; Admin PT Xtra Pipeline `35727206017`; Release Gate Static Audit `35727206175`; Android APK MVP `35727206061`; Stage 3 Production Reconciliation `35727206067`; Homepage Canonical Verify `35727206026`; Admin Redirect Verify `35727206021`.
- P3 is COMPLETE for the scoped vehicle/listing publishing architecture. Generic article CMS and Facebook/Zalo publishing remain out of scope because the audited repository does not contain verified implementations for those outputs; no unsupported capability is claimed.
- No P3 completion evidence requires Wrangler CLI, and no Cloudflare resource/binding or production credential mutation was introduced by these refactors.


## 16. P4 UI/UX V2 — IN PROGRESS
- Pre-V2 homepage source was backed up in-repository at `public/backup/p4-pre-v2-index.html` before homepage mutation.
- Source audit preserved every current homepage capability/link target: Automotive inventory/search/filter/favorites/compare, test-drive lead form, Green Energy, European Yachts, Business Jets, AI Assistant, Services, Private Contact/phone/Zalo, and existing detail/runtime scripts.
- V2 information hierarchy starts with Hero → Automotive/Inventory → Private Concierge → Ecosystem, while retaining the existing Energy/Marine/Aviation detail sections, test-drive conversion flow, AI, Services and Contact.
- Primary navigation now exposes Automotive, Concierge, Ecosystem, AI and Contact directly. Hero CTAs prioritize Automotive and Private Concierge without removing the existing test-drive flow.
- Mobile hardening adds single-column hero/feature/forms/cards, compact actions and contact controls for <=760px and <=420px breakpoints.
- Admin authentication/control behavior is preserved unchanged in this first visual slice; Admin UX redesign requires a separate audited slice so authentication/recovery boundaries are not coupled to homepage presentation changes.
- P4 remains IN PROGRESS until PR checks, merged production asset verification, inventory/detail flow and Admin UX follow-up are evidenced.


### 16.1 P4 slice 2 — Admin/mobile and vehicle-detail regression
- Post-#391 production chain on merge SHA `148f48c8560e9cb3107480610c1a8bd10fc693e5` is fully green: Deploy `35728809048`, Gate-15 `35728808949`, QUEUE-01 `35728905449`, Production Asset Delivery `35728809148`, Homepage Canonical `35728809029`, Admin Redirect `35728808986`, CI `35728809035`, Credential Safety `35728808951`, Admin Pipeline `35728809002`, Static Audit `35728809037`, Android `35728809075`, Stage 3 `35728809030`.
- Regression audit found legacy static vehicle detail pages still linked to removed `#inventory`; corrected both detail navigation/back links to canonical `#cars-section`.
- Admin Control keeps existing authentication/session/recovery/API behavior unchanged. UX changes are presentation-only: sticky mobile tabs, full-width touch controls, 44px minimum targets, horizontal table containment, single-column vehicle form, mobile-safe modal, clearer “Đăng xe” CTA and direct Website preview.
- P4 remains IN PROGRESS until this slice merges and its production asset/flow checks are green.


### 16.2 P4 homepage document-boundary verification
- Re-audit after the visible repetition report confirms the corrective branch has one HTML document boundary and one instance of each primary section/widget: Ecosystem, Test Drive, AI, Services, Contact, compare modal and AI widget.
- Intended hierarchy is Hero → Automotive → Private Concierge → Ecosystem → Energy → Yachts → Business Jets → Test Drive → AI → Services → Contact.
- No auth/API/Worker binding behavior changed.


### 16.3 P4 closure — production UI/UX flow
- PR #394 removed the duplicated homepage document shell; production source now has one main/document boundary, one compare modal and one AI widget.
- PR #395 connected Admin Inventory to the existing authenticated/idempotent Telegram publish endpoint without adding secrets or changing auth boundaries.
- PR #396 fixed dynamic D1 inventory detail routing by using `/car.html?id=<id>` when no explicit page exists; existing explicit/static detail pages remain supported.
- PR #396 merged as `1939cef20d9bba78f8113e7b568843acb8a9160f`; exact-SHA production evidence is fully green: Deploy `35734178644`, Gate-15 `35734178634`, QUEUE-01 `35734283839`, Production Asset Delivery `35734178625`, Homepage Canonical `35734178623`, Admin Redirect `35734178727`, CI `35734178666`, Credential Safety `35734178841`, Admin Pipeline `35734178761`, Static Audit `35734178868`, Android `35734178750`, Stage 3 `35734178665`.
- Final closure gate extends Production Asset Delivery with public homepage structural invariants and generic vehicle-detail asset verification so the duplicate-shell/detail-link regressions are checked on production after future relevant changes.
- P4 status: COMPLETE once this closure PR merges and its exact-SHA production chain is green.


## 17. P5 Product / Android APK — IN PROGRESS
- P0–P4 are closed production foundations; P5 starts after P4 closure merge `4841ce0878880a6c28d25c8679627a5dcac871ff` and its green exact-SHA production chain.
- Android source audit confirms a native operator application already covers App API health, dashboard, inventory search/detail/edit/delete, gallery/media upload, AI-assisted vehicle intake, status/featured controls, CRM leads, secure on-device APP API token storage, and the Operator Hub.
- P5 slice 1 bumps Android to version `1.3.0` / versionCode `4` and hardens build evidence: APK size validation, SHA-256, source SHA, and version + source-SHA artifact naming.
- No production credentials are added/exposed and Wrangler is not an execution path.
- P5 remains IN PROGRESS until merge, exact merge-SHA Android build success, and downloadable APK artifact evidence. Physical-device regression remains a separate acceptance layer and is not claimed without device evidence.


### 17.1 P5 GitHub / Cloudflare simplification audit
- Exact P5 slice-1 merge SHA: `15cee054859ab3f9cc104bb9e3ae756b8436ac95`; exact-SHA Deploy, Gate-15, QUEUE-01, Android APK, Static Audit, CI, Credential Safety, Admin Pipeline and Stage 3 are green.
- Android artifact evidence: `phanthuanxtra-apk-v1.3.0-15cee054859ab3f9cc104bb9e3ae756b8436ac95` from exact-SHA Android run 35806013581.
- Cloudflare binding decision remains KEEP for ASSETS, AI, IMAGES, AI_SEARCH, MEDIA/R2, DB/D1 and cron because production source dependencies exist for each; no binding deletion is justified.
- GitHub inventory contains 36 workflow YAML files. Core production safety/deploy workflows remain unchanged in this slice.
- Application Validation no longer executes Wrangler. It performs static JSON/config contract validation only; deployment remains owned by the GitHub Actions Cloudflare API/SDK deploy workflow.
- Consolidation candidates identified for a later deletion PR only after dependency/trigger proof: legacy manual smoke/runtime-evidence workflows, completed one-shot Cloudflare repair/cleanup workflows, and overlapping AI audit/executor workflows. No safety workflow is deleted by this audit slice.
- Cloudflare operational target: one read-only inventory/audit path, one deploy path, and one strict post-deploy E2E path; account-level mutation remains explicit/manual.


### 17.2 P5 workflow consolidation — round 2
- Retired completed one-shot cleanup: `remove-unsafe-cloudflare-audit-artifacts.yml`.
- Retired legacy manual production smoke and standalone Gate-15 runtime harness; canonical `production-smoke-gate15.yml` plus strict post-deploy `queue-01-e2e-origin.yml` remain the production runtime evidence paths.
- Retired one-purpose Cloudflare rate-limit audit/fix workflows. General read-only Cloudflare inventory remains `cloudflare-machine-audit.yml`; account-level WAF mutation is no longer kept as a routine repository workflow.
- Retired overlapping `ai-peer-continuity.yml`; `ai-peer-executor.yml` remains the single read-only Cloudflare Workers AI checkpoint/executor workflow.
- `gate10-runtime-evidence.yml` is retained because it is coupled to `Deploy Developer Gateway` completion and verifies the dedicated dual-Workers-AI gateway runtime contract.
- Core deploy/safety workflows and all production Cloudflare bindings remain unchanged.


### 17.3 P5 Android product hardening — slice 2
- Android operator app target advanced to versionCode 5 / versionName 1.4.0.
- Android APK CI now performs source-level credential/safety checks before building: no hard-coded bearer/API token pattern, application backup remains disabled, non-launcher MainActivity remains non-exported, and encrypted SecureTokenStore remains required.
- APK artifact identity is updated to `phanthuanxtra-apk-v1.4.0-<source-sha>` while retaining SHA-256 output verification.
- Historical slice note superseded on 2026-09-23: production signing is now **PASS** on Android Production Release run `35836171648` for exact main SHA `29d84899c65683aacfccb84946afcf175bcfba92`. Physical Samsung S21 Ultra regression remains required before final Gate 11 device certification.


## 17.4 Android 1.6.0 signed release + App API alignment — 2026-09-23
- Current main SHA before this alignment slice: `29d84899c65683aacfccb84946afcf175bcfba92` (PR #434).
- Exact-SHA production chain is green on the current main: Deploy Cloudflare Worker `35836090738`, Production Smoke Gate-15 `35836090724`, QUEUE-01 Production E2E Origin `35836172466`, CI `35836090902`, Android APK MVP `35836090767`, Stage 3 Production Reconciliation `35836090712`.
- Android version is `1.6.0` / versionCode `7`; debug APK artifact `phanthuanxtra-apk-v1.6.0-29d84899c65683aacfccb84946afcf175bcfba92` was produced successfully.
- **Production signing PASS:** Android Production Release run `35836171648` completed successfully on exact SHA `29d84899c65683aacfccb84946afcf175bcfba92`. The workflow validated all four signing inputs, built `app-release.apk`, verified the APK signature with Android build-tools `apksigner`, generated SHA-256, uploaded artifact `phanthuanxtra-signed-release-1.6.0-29d84899c65683aacfccb84946afcf175bcfba92`, and removed the temporary keystore.
- Verified signer certificate subject: `CN=PHAN THUAN XTRA, O=PHAN THUAN XTRA, C=VN`; APK Signature Scheme v2 verification passed.
- Gate 11 is **not yet final device-certified**: Samsung Galaxy S21 Ultra physical-device regression remains OPEN. AAB / Google Play publication is a later distribution layer and is not claimed complete by APK signing evidence.
- Architecture cleanup in this slice aligns the native Android operator app with the canonical `/api/app/v1` namespace while preserving the existing Admin-password UX. `POST /api/app/v1/login` validates the same Admin credential source and issues the existing signed `ptx1` HMAC session; App API authorization accepts either that signed Admin session or the legacy dedicated `APP_API_TOKEN` for backward compatibility.
- Android `MainActivity` no longer points directly at `/api/admin`; its base URL is `https://phanthuanxtra.com/api/app/v1`. Post-deploy QUEUE-01 is extended to verify App API login, signed-session dashboard access and the App API vehicle-vision route before Gate closure.
- No new credential or secret is introduced, no production password is rotated, and existing Admin/CMS/App API clients remain backward compatible.


### 17.5 App API alignment production closure — 2026-09-23
- PR #435 merged as exact main SHA `f87f637d66ec4b5a4dbc1ac3e4f19b88fa2e28e3`.
- Exact-SHA production evidence is green: Deploy Cloudflare Worker `35842558391`, Production Smoke Gate-15 `35842558473`, QUEUE-01 Production E2E Origin `35842646659`, CI `35842558495`, Android APK MVP `35842558440`, Release Gate Static Audit `35842558400`, Production Credential Safety `35842558222`, Admin PT Xtra Pipeline `35842558467`, Homepage Canonical Verify `35842558444`, Admin Redirect Verify `35842558509`, and Stage 3 Production Reconciliation `35842558459`.
- QUEUE-01 proved the new Android/App API production path after deployment: `POST /api/app/v1/login` returned HTTP 200 and a signed `ptx1` session; authenticated `GET /api/app/v1/dashboard` passed; authenticated `POST /api/app/v1/vehicle/analyze` returned HTTP 200 with production model `@cf/qwen/qwen3.8-27b`.
- The same run retained D1 CRUD and R2 write/read/delete/post-delete-404 PASS, proving the namespace cleanup did not regress the production persistence/media boundaries.
- Android APK MVP on the exact alignment SHA completed successfully; the native operator app now uses `https://phanthuanxtra.com/api/app/v1` as its API base.
- Production signing status remains **PASS** from Android Production Release run `35836171648` on predecessor exact SHA `29d84899c65683aacfccb84946afcf175bcfba92`. No signing material changed in PR #435.
- Remaining Android release acceptance: Samsung Galaxy S21 Ultra physical-device regression is still OPEN. AAB / Google Play distribution remains a separate future release layer.


## 18. P6 SHARED BLOG / NEWS CMS — IN PROGRESS (2026-09-23)
- Deep repository audit found D1 already has canonical `posts` schema from `migrations/0002_posts.sql`, but no shared runtime CRUD/publishing path existed for Admin + Telegram + Android.
- Active branch: `feat/shared-blog-cms`. No production mutation is claimed until PR merge and exact-SHA deploy/E2E gates pass.
- New shared `src/post-persistence.js` owns post validation, Vietnamese slug normalization, D1 persistence, status lifecycle (`draft/published/archived`) and CMS audit logging.
- Admin gains authenticated `/api/admin/posts` CRUD and a Blog/Tin tức workspace in Production Control.
- Android canonical App API gains authenticated `/api/app/v1/posts` CRUD; native operator UI gains Blog/Tin tức list/create/edit.
- Telegram Auto Bot gains explicit `/blog` or `/news` command publishing. A Telegram photo may be stored in existing MEDIA/R2 as the cover; ordinary vehicle messages keep their existing vehicle pipeline.
- Public website gains `/blog`, `/blog/<slug>`, and read-only `/api/blog/posts` routes backed by published D1 posts.
- AI design decision: do not hard-code or assume the quoted rate limits/model availability. Existing Workers AI binding remains the integration boundary. AI-assisted editorial generation/vision is a follow-up slice only after model/runtime audit proves availability; deterministic CMS CRUD does not consume AI quota.
- Security: no new secrets, no Cloudflare binding deletion, no credential rotation. Admin/App authentication reuses the existing signed Admin session/App token boundary; Telegram reuses the existing verified Auto Bot webhook.
- Acceptance remains OPEN until CI, Android build, exact-SHA deploy, D1 migration/schema availability, public Blog UTF-8, Admin/App CRUD, Telegram command E2E and rollback-safe delete/update evidence pass.


### 18.1 Blog production E2E + Workers AI editorial follow-up — 2026-09-23
- PR #438 merged as `9c2c72dce15eed1caf98d553c0aa74f83d208461`; exact-SHA deploy, CI, Android and Gate-15 passed.
- First Blog CMS Production E2E run `35846470891` failed before runtime CRUD because its Telegram source grep did not match the actual `blogCommand` regex. Runtime Blog lifecycle was skipped, so P6 remains OPEN until the corrected gate passes after deployment.
- Follow-up branch adds a free-tier-first editorial AI router. Current Cloudflare documentation (2026-09) says Workers AI has a shared 10,000-Neuron/day free allocation; it does not provide unlimited per-model free inference. The router therefore uses fallbacks rather than calling every model per request.
- Text/editorial order: `@cf/zai-org/glm-4.7-flash` -> `@cf/google/gemma-4-26b-a4b-it` -> `@cf/nvidia/nemotron-3-120b-a12b` -> lightweight Llama fallback. Vision/editorial order: existing proven `@cf/qwen/qwen3.8-27b` -> Gemma 4 vision -> Llama 3.2 Vision.
- Explicitly excluded from the free-first route: Kimi K2.6 and GLM 5.2 because current Cloudflare docs require Workers Paid/prepaid credits for them.
- New authenticated Admin endpoints: `POST /api/admin/posts/ai-draft` for title/excerpt/content/category/tags/SEO drafting and `POST /api/admin/posts/ai-image` for image description/alt/caption/object hints. AI output is editorial assistance; deterministic CMS persistence remains separate.
- P6 may be marked COMPLETE only after corrected exact-SHA production Blog lifecycle gate passes CREATE -> READ -> public UTF-8 -> UPDATE -> DELETE -> 404.

## 19. GPT / CHATGPT AI PRE-DEPLOY AUDIT GATE — CANONICAL POLICY (2026-09-23)
- Objective: every production-bound change is reviewed from its GitHub PR diff before Cloudflare Worker deployment. GPT/ChatGPT is an audit and test-generation layer; it is not production PASS evidence by itself.
- This policy is recorded only in this canonical `MASTER_PROJECT_STATUS.md`. Do not create a second audit/checkpoint Markdown file.
- Mandatory flow: `push branch -> open PR -> audit changed diff -> generate/update targeted tests -> CI/test execution -> security/performance/Cloudflare checks -> merge only when eligible -> exact-SHA Worker deploy -> production smoke/E2E -> record evidence here`.
- Audit scope for each PR: authentication/authorization, secret exposure, injection/XSS/CORS/input validation, unsafe logging, D1 query/write correctness, R2 lifecycle/media behavior, Worker bindings/routes/cache semantics, timeout/retry/idempotency/concurrency, unnecessary network/AI/DB work, Telegram/CRM duplicate delivery, backward compatibility, and regression risk.
- Findings use four severities: `BLOCKER`, `HIGH`, `MEDIUM`, `LOW`. Any unresolved BLOCKER/HIGH finding keeps merge/deploy locked. MEDIUM/LOW must be documented and either fixed or explicitly accepted with evidence.
- Test-generation rule: every behavior-changing diff must receive the smallest relevant regression coverage. Prefer deterministic unit/contract tests first; add integration/E2E only for boundaries that require runtime proof. Generated tests must run in CI and their real result, not the generated text, determines the gate.
- Cloudflare-specific gate: preserve existing Worker/D1/R2/Workers-AI/routes/bindings unless evidence requires change; verify UTF-8/HTML delivery where relevant; production deployment remains GitHub Actions -> Cloudflare API/SDK; no Wrangler production path.
- AI/Telegram gate: verify model routing/fallback behavior without wasting inference quota; verify human-handoff and CRM routing; prevent duplicate Telegram notifications; never print bot tokens, API credentials or secret values.
- Performance gate: reject avoidable serial network calls, unbounded retries/loops, unnecessary Workers AI inference, repeated D1 queries/writes, missing request limits/timeouts, and cache behavior that can make production verification stale.
- Production closure remains runtime-first. A PR that passes audit/CI is only eligible for deployment. Final release evidence still requires the applicable exact-SHA production gates, including Admin/auth boundaries, D1, R2 GET -> DELETE -> 404, HTML/UTF-8, App/API, Telegram/AI and other affected E2E checks.
- PR review should report: changed surface, findings by severity with file/line evidence, proposed minimal remediation, generated/updated tests, CI results, residual risks, and `DEPLOY ELIGIBLE` or `DEPLOY LOCKED`. It must never report GREEN solely from model judgment.
- Current rollout mode: policy-first. Existing workflows remain unchanged by this Markdown-only slice. Automation of the GPT audit as a required GitHub check is the next implementation slice and must itself follow the single-queue PR method before becoming a merge/deploy requirement.
- Rollback: this slice changes documentation/control policy only and performs no production mutation, secret rotation, Cloudflare resource change, D1 migration, Worker deploy or application-code change.
