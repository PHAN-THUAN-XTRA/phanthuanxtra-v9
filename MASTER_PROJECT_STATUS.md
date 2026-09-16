# PHAN THUẦN XTRA — MASTER PROJECT STATUS

> **DUY NHẤT — CANONICAL PROJECT STATUS / HANDOFF**
> Date: 2026-09-16 (UTC+7)
> Repository: `PHAN-THUAN-XTRA/phanthuanxtra-v9`
> Current main lineage: `a21cf51809cc5ad2d83a6a5dab931c0eb5a1275a`

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
- **No false correlation:** green CI, successful deployment reporting, or direct infrastructure success is not proof of downstream runtime health.
- **Act on verified new paths:** once evidence identifies a new root cause, target that root cause directly; do not repeat disproven diagnostics.
- **Runtime-first closure:** every fix must be followed by deploy verification and fresh runtime/E2E evidence on the same source lineage.
- **Security:** never print, guess, rotate, or expose secrets; verify only presence/authentication without revealing values.

## 2.1 “GÓC NHÌN TRÍ TUỆ NGOÀI TRÁI ĐẤT” — AI-FIRST ROOT-CAUSE METHOD
This is an engineering metaphor for deliberately removing human assumptions and treating the system as an independent evidence network. It is **not** a claim of extraterrestrial knowledge.

### Core model
Treat every layer as an independent node with its own observable state:
`Source → Build/CI → Deploy transport → Cloudflare control plane → Worker runtime → Route/assets → AI → D1/R2/Gateway → E2E user behavior`.

When a failure appears:
1. Start from the observed failure, not from the previous hypothesis.
2. Walk backward until the smallest boundary that can explain the failure is isolated.
3. Walk forward again from that boundary to prove the causal chain.
4. Change only that boundary; keep unrelated code untouched.
5. Re-run the affected evidence chain on the new source lineage.

### AI priority: Workers AI + GPT
- **Workers AI is the first-line project-local AI auditor** whenever the production/runtime environment can execute it. Use the configured primary model `@cf/zai-org/glm-4.7-flash`, with the existing fallback `@cf/meta/llama-3.2-3b-instruct`.
- **GPT is the independent cross-check/reasoning layer:** challenge the Workers AI hypothesis, compare it against source, logs, configuration and runtime evidence, and reject unsupported causal claims.
- Workers AI supplies project/runtime-local analysis; GPT performs independent causal review and evidence reconciliation.
- **Evidence outranks AI:** an AI hypothesis is never itself a production PASS. Every AI-derived diagnosis must be tested against the actual GitHub/Cloudflare/runtime boundary.
- **Priority rule:** when a concrete error exists, AI effort goes first to the active error/root cause; do not start unrelated optimization, refactoring, UI work, or speculative features.
- **Simulation rule:** AI simulation/mock output is supporting evidence only. After simulation, perform the real runtime audit immediately when the required environment is available.
- **Single-queue rule:** AI may analyze multiple evidence sources, but it may not create competing mutation queues or status files.

### Root-cause evidence classes
For every suspected cause, classify it as:
- **Observed:** directly evidenced by runtime/log/source.
- **Strongly implied:** supported by multiple independent boundaries but not yet reproduced directly.
- **Hypothesis:** plausible but unverified.
- **Disproven:** contradicted by fresh evidence.

Only **Observed** or directly reproducible causes may authorize a code/config mutation. AI confidence never substitutes for evidence.

### Current application
Queue 8 applied this method to the Cloudflare asset-upload failure: the failing boundary was narrowed to completion-JWT handling. The SDK could expose a successful response without a usable completion JWT, while the documented REST response provides `result.jwt`. The merged remediation keeps SDK as primary transport and adds a narrow REST recovery path using the same short-lived upload JWT. Queue 8 merged as `a21cf51809cc5ad2d83a6a5dab931c0eb5a1275a`.

This remains **source-level remediation until real main deployment/runtime evidence proves it**. Production remains RED until that proof exists.

## 3. PERSISTENT PROJECT COMPLETION METHOD — REUSE THIS MASTER FOR FUTURE PROJECTS
Future PHAN THUẦN XTRA projects/workstreams must start by reading this file and reuse the same evidence-driven method.

### 3.1 Start every project/workstream
1. Read `MASTER_PROJECT_STATUS.md` completely.
2. Identify current source SHA, active queue, open PR, release gates, known failures, and next checkpoint.
3. Define one concrete queue objective and one source-of-truth success condition.
4. Keep exactly one active mutation queue.

### 3.2 Execute with a single evidence chain
Use:
`Source → CI → Deploy → Runtime → Boundary dependencies → E2E → Release gate`.

At each boundary:
- collect direct evidence;
- record exact source lineage;
- distinguish simulation/test evidence from production runtime evidence;
- stop at the first failing boundary instead of masking it.

### 3.3 Diagnose and fix
- Trace forward and backward until the smallest reproducible boundary is identified.
- Change only the verified root-cause boundary.
- Keep the fix narrow and reversible.
- Never repeat a disproven diagnostic.
- Never declare success while a downstream boundary is unverified.

### 3.4 Validate every fix
`Fix → CI → deploy → runtime smoke → dependent E2E → audit → release-gate decision`.

A successful unit test, mock, simulation, or AI analysis is supporting evidence only. Production GREEN requires fresh runtime/E2E evidence on the same deployed source lineage.

### 3.5 AI / Workers AI operating rule
- Workers AI may be used for controlled simulation, audit assistance, runtime analysis, and validation.
- GPT independently challenges and reconciles the AI analysis against evidence.
- Simulation must never be presented as production evidence.
- After an AI-assisted simulation/audit, perform the corresponding real runtime audit as soon as the environment is available.
- AI follows this MASTER and the single-queue rule; it must not create competing workstreams or status files.

### 3.6 Deployment rule
Target production path:
`GitHub Actions → Cloudflare API/SDK → Cloudflare Worker runtime`.

- Do not use Wrangler as the production deployment path.
- Preserve the existing Cloudflare Worker, D1, R2, Workers AI, routes, and bindings unless an evidence-backed migration requires otherwise.
- Use API/SDK equivalents for production deployment and infrastructure operations.
- Never expose credentials or rotate secrets merely to solve a tooling problem.
- Keep the last known-good deployment/version reference until the replacement is proven.

### 3.7 Completion rule
A project/workstream is not complete merely because code is merged, CI is green, or deployment reports success.

Completion requires:
1. source lineage verified;
2. CI verified;
3. production deployment verified;
4. runtime smoke verified;
5. required dependency boundaries verified;
6. required E2E tests verified;
7. security/error boundaries verified;
8. release gates reconciled;
9. no unresolved blocker remains;
10. only then report completion.

Until all required evidence exists, keep production **RED/OPEN**.

### 3.8 Status/documentation rule
- `MASTER_PROJECT_STATUS.md` is the only canonical status/handoff document.
- Do not create checkpoint/status `.md` alternatives.
- After a completed checkpoint, update only this MASTER with source lineage, evidence, gate state, and next checkpoint.
- Keep historical claims explicitly marked as historical.

## 4. DEPLOYMENT OPERATING MODEL — CLOUDFLARE API/SDK
Target:
`GitHub Actions (single CI/CD orchestrator) → Cloudflare API/SDK → Cloudflare Worker runtime`.

- Runtime remains Cloudflare: Worker `phanthuanxtra-v2`, D1 `phanthuanxtra-db`, R2 `phanthuanxtra-media`, Workers AI and existing routes.
- GitHub Actions is the sole CI/CD orchestrator and release-gate coordinator.
- Production deployment uses Cloudflare API/SDK; Wrangler is not the production deployment path.
- This is a deployment-tooling migration, not a Cloudflare platform migration.
- No secret rotation, exposure, destructive infrastructure recreation, or unverified production cutover.
- Credentials must remain least-privilege.
- Keep the last known-good deployment/version reference until replacement passes runtime gates.

## 5. CURRENT QUEUE — POST-QUEUE-8 PRODUCTION VERIFICATION
- Queue 8 PR #231 is merged.
- Merge commit: `a21cf51809cc5ad2d83a6a5dab931c0eb5a1275a`.
- Queue 8 changed `scripts/cloudflare-assets-upload.mjs` and its regression test only.
- The remediation accepts both SDK completion-JWT response shapes and recovers through the documented REST asset-upload protocol when the SDK response has no usable completion JWT.
- Queue 8 CI/PR validation passed; the PR deployment job was correctly skipped because it was a PR event. This is not production deployment evidence.
- **Active work is production verification on the merged main lineage.**

## 6. CHAIN AUDIT STATUS
- Source: main lineage is `a21cf51809cc5ad2d83a6a5dab931c0eb5a1275a` after Queue 8 merge.
- Workers AI source contract: primary `@cf/zai-org/glm-4.7-flash`, fallback `@cf/meta/llama-3.2-3b-instruct`; runtime verification remains required.
- R2 direct bucket operations were previously verified, but Worker `/media/*` GET had returned 404 on an earlier lineage; fresh runtime evidence is required after the routing/deployment remediation.
- D1 CRUD, Admin boundaries, Password Reset, Gateway/AI and other historical gates must be treated as historical until refreshed on the current production lineage where required.
- APK build/hash CI evidence is not equivalent to physical S21 Ultra runtime evidence.
- Telegram Auto/VIP are not PASS without real production message E2E evidence.

## 7. RELEASE GATES
1. Current main deployed — **OPEN: must prove deployed source lineage**.
2. Invalid Admin login 401 — VERIFIED historically.
3. Valid Admin login + signed session — VERIFIED historically on earlier lineage; refresh as required.
4. Unauthenticated dashboard 401 — VERIFIED historically.
5. Authenticated dashboard — VERIFIED historically on earlier lineage; refresh as required.
6. D1 CRUD — VERIFIED historically; refresh as required.
7. **R2 write/read/delete — OPEN/RED until Worker media GET/DELETE/404 is freshly verified.**
8. Password reset — GREEN historically by `35063840082`; refresh as required.
9. Gateway/AI — historical evidence; fresh runtime evidence required.
10. Dual Workers AI — GREEN historically; fresh runtime evidence required.
11. APK artifact/hash + S21 Ultra regression — OPEN.
12. Telegram Auto Bot production E2E — OPEN.
13. VIP webhook/idempotency E2E — OPEN.
14. Backup/restore/readability — GREEN historically; current lineage reconciliation required.
15. Gate-15 smoke/security boundary — GREEN historically; current lineage reconciliation required.
16. **PRODUCTION GREEN — LOCKED** until all required gates are actually green.

## 8. SINGLE QUEUE CONTINUITY
- Queue 8 is closed by merge.
- Queue 9 is the single active documentation/method checkpoint for the AI-first root-cause operating method.
- No competing remediation PR is active at this checkpoint.
- Next mutation, if required, must be a new single queue after the production verification boundary identifies a concrete failure.
- Do not force-push.

## 9. CHANGE LOG — 2026-09-16
- Read canonical MASTER before execution.
- Added the “góc nhìn trí tuệ ngoài Trái Đất” method as a formal evidence-first root-cause discipline.
- Defined Workers AI as first-line project-local AI analysis and GPT as independent cross-check/reasoning; evidence remains authoritative.
- Applied the method to Queue 8: isolate the Cloudflare asset completion-JWT boundary, avoid credential rotation, keep SDK primary, and recover through the documented REST protocol only when the SDK response lacks a usable completion JWT.
- Queue 8 merged as `a21cf51809cc5ad2d83a6a5dab931c0eb5a1275a`.
- Queue 9 records this operating method as the canonical method in the only status file.
- Production remains RED pending fresh main deployment, runtime, dependency, E2E, security and release-gate evidence.

## 10. NEXT CHECKPOINT
`Main deploy via GitHub Actions → Cloudflare API/SDK → verify deployed SHA → runtime smoke → R2 direct + Worker GET/DELETE/404 → Workers AI runtime audit → D1/Gateway/AI → Admin/Password Reset boundaries → APK artifact + S21 Ultra → Telegram Auto/VIP real E2E → backup/restore + Gate-15 reconciliation → release-gate decision → only then Production GREEN.`
