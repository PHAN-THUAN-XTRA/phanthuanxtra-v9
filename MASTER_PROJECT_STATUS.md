# PHAN THUẦN XTRA — MASTER PROJECT STATUS

> **DUY NHẤT — CANONICAL PROJECT STATUS / HANDOFF**
> Date: 2026-09-18 (UTC+7)
> Repository: `PHAN-THUAN-XTRA/phanthuanxtra-v9`
> Current main lineage: `987368c27ccb3ddf349173a52d4cc87dd2ce0f47` (PR #254 merged; current-lineage Stage 3 reconciliation run #13 completed successfully; deployed Worker remains the verified `f1b61fb` lineage).

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
