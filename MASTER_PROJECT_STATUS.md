# PHAN THUẦN XTRA — MASTER PROJECT STATUS

> **DUY NHẤT — CANONICAL PROJECT STATUS / HANDOFF**
> Date: 2026-09-16 (UTC+7)
> Repository: `PHAN-THUAN-XTRA/phanthuanxtra-v9`
> Main source before this queue: `bd25669f07692a8faed1927e140dedcea8be2ad5`

## 1. SOURCE OF TRUTH / OPERATING RULES
- This file is the sole canonical project-status file; all AI / Work AI must read it before work.
- One execution queue only; no conflicting parallel mutations.
- One ACTIVE PR, one head branch, one commit chain; merge closes the queue.
- Never force-push, never guess secrets, never use checkpoint `.md` files, never claim GREEN without runtime/E2E evidence.
- Production remains **RED** until all required release gates are actually evidenced.
- After a completed status checkpoint, update only this file; do not create competing checkpoint/status Markdown files.

## 2. MANDATORY OPERATING METHOD — DEEP CHAIN AUDIT
The project is now operated as a continuous evidence chain:
`GitHub source → GitHub Actions → Cloudflare deploy → Worker runtime → bindings/routes → Workers AI → D1/R2/Gateway → production E2E`.

- **Read-first:** every AI/Work AI reads this MASTER before touching the project.
- **Observe broadly, mutate narrowly:** audits may inspect independent layers in parallel, but production/source mutations remain serialized through the single queue.
- **Fail-fast and lock the fault:** when a failure appears, immediately isolate the smallest failing boundary, preserve evidence, and prevent unrelated changes from masking it.
- **Trace both directions:** from source/config forward to runtime and from runtime failure backward to the exact source/config boundary.
- **No false correlation:** a green CI job, a successful deploy workflow, or a successful direct R2 operation is not treated as proof of downstream runtime health until the next boundary is tested.
- **Act on verified new paths:** once evidence identifies a new root cause, the next queue action targets that root cause directly; do not repeat a disproven diagnostic.
- **Runtime-first closure:** every fix must be followed by deploy verification and a fresh runtime/E2E result on the same source lineage.
- **Security:** never print, guess, rotate, or expose secrets; only verify secret presence/authentication without revealing values.
- **Knowledge principle:** use established engineering practices such as fail-fast, least privilege, deterministic toolchains, single-writer state, boundary testing, and evidence-driven rollback/fix decisions. No unverifiable claim of expertise is used as evidence.

## 3. PERSISTENT PROJECT COMPLETION METHOD — REUSE THIS MASTER FOR FUTURE PROJECTS
This section is the durable operating procedure to be reused for subsequent PHAN THUẦN XTRA projects and major workstreams. Future work must start by reading this file and then follow the same evidence-driven method; do not invent a competing workflow document.

### 3.1 Start every project/workstream
1. Read `MASTER_PROJECT_STATUS.md` completely before making any change.
2. Identify the current source SHA, active queue, open PR, release gates, known failures, and next checkpoint.
3. Define one concrete queue objective and one source-of-truth success condition.
4. Keep exactly one active mutation queue; do not overlap changes that can affect the same boundary.

### 3.2 Execute with a single evidence chain
Use this order unless a documented dependency requires otherwise:
`Source → CI → Deploy → Runtime → Boundary dependencies → E2E → Release gate`.

At each boundary:
- collect direct evidence;
- record the exact source lineage;
- distinguish simulation/test evidence from production runtime evidence;
- stop and isolate the first failing boundary instead of masking it with unrelated changes.

### 3.3 Diagnose and fix
- Trace failures forward from source/config and backward from runtime symptoms until the smallest reproducible boundary is identified.
- Change only the verified root-cause boundary.
- Keep the fix narrow and reversible.
- Do not repeat a diagnostic that has already been disproven by fresh evidence.
- Never declare success because an upstream layer is green while a downstream layer remains unverified.

### 3.4 Validate every fix
Every fix follows the same closure loop:
`Fix → CI → deploy → runtime smoke → dependent E2E → audit → release-gate decision`.

A successful simulation/mock/unit test is supporting evidence only. Production GREEN requires fresh runtime/E2E evidence on the same deployed source lineage.

### 3.5 AI / Workers AI operating rule
- Workers AI may be used for controlled simulation, audit assistance, or validation where useful.
- Simulation must never be presented as production evidence.
- After an AI-assisted simulation/audit, perform the corresponding real runtime audit as soon as the required environment is available.
- AI must follow this MASTER and the single-queue rule; it must not create competing workstreams or status files.

### 3.6 Deployment rule
Target production path:
`GitHub Actions → Cloudflare API/SDK → Cloudflare Worker runtime`.

- Do not use Wrangler as the production deployment path.
- Preserve the existing Cloudflare Worker, D1, R2, Workers AI, routes, and bindings unless a project-specific migration explicitly changes them with evidence.
- Use API/SDK equivalents for production deployment and infrastructure operations.
- Never expose or print credentials.
- Never rotate secrets merely to solve a tooling problem.
- Keep the last known-good deployment/version reference available until the replacement is proven.

### 3.7 Completion rule
A project/workstream is **not complete** merely because code is merged, CI is green, or deployment reports success.

Completion requires:
1. source lineage verified;
2. CI verified;
3. production deployment verified;
4. runtime smoke verified;
5. all required dependency boundaries verified;
6. required E2E tests verified;
7. security/error boundaries verified;
8. release gates reconciled;
9. no unresolved blocker remains for the declared scope;
10. only then report completion.

Until all required evidence exists, keep the relevant production status **RED/OPEN** and continue the active queue.

### 3.8 Status/documentation rule
- `MASTER_PROJECT_STATUS.md` is the only canonical project status and handoff document.
- Do not create checkpoint/status `.md` alternatives.
- After a completed checkpoint, update only this MASTER with the new source lineage, evidence, gate state, and next checkpoint.
- Keep historical claims explicitly marked as historical; do not silently treat them as fresh runtime evidence.
- Future projects/workstreams must reuse this method through this MASTER rather than creating a second operating manual.

## 4. DEPLOYMENT OPERATING MODEL — CLOUDFLARE API/SDK
The target deployment model is explicitly:
`GitHub Actions (single CI/CD orchestrator) → Cloudflare API/SDK → Cloudflare Worker runtime`.

- **Runtime remains Cloudflare:** Worker `phanthuanxtra-v2`, D1 `phanthuanxtra-db`, R2 `phanthuanxtra-media`, Workers AI and existing production routes remain in place.
- **CI/CD remains GitHub Actions:** GitHub Actions is the sole deployment orchestrator and release gate coordinator.
- **Deploy path:** migrate production deployment away from direct Wrangler CLI invocation toward a Cloudflare API/SDK based deployment controller, with Terraform/IaC considered only where it materially improves deterministic infrastructure reconciliation.
- **Wrangler migration:** do not remove Wrangler blindly. First inventory every production/CI use, establish an API/SDK equivalent, run both paths only as a controlled migration comparison, then remove Wrangler from the production path after runtime evidence proves equivalence.
- **Migration boundary:** this is a deployment-tooling migration, not a Cloudflare platform migration. Do not move the Worker, D1, R2, or Workers AI off Cloudflare.
- **Safety:** no secret rotation, no secret exposure, no destructive infrastructure recreation, and no production cutover without CI + deployment + runtime/E2E evidence.
- **Least privilege:** the Cloudflare credential used by GitHub Actions must be scoped only to the required account/resources and operations; never substitute a global credential merely to obtain broader access.
- **Rollback:** retain the last known-good deployment/version reference until the replacement path has passed the complete required runtime gate.

## 5. CURRENT QUEUE — R2 ROOT-CAUSE REMEDIATION + DEPLOYMENT PATH PREPARATION
- Current main source before this queue: `bd25669f07692a8faed1927e140dedcea8be2ad5`.
- Queue-01 reached Admin login 200, signed session PASS, dashboard PASS, D1 CRUD PASS, R2 upload HTTP 200, and direct R2 bucket read PASS.
- The same run failed at Worker media GET: `/media/$MEDIA_KEY` returned HTTP 404.
- `src/media.js` correctly handles `/media/*`; `src/entry.js` invokes `handleMediaApi()`; `wrangler.json` omitted `/media/*` from `assets.run_worker_first`.
- This queue adds `/media/*` to `assets.run_worker_first` so the Worker media handler receives the request before Static Assets fallback.
- The deployment-model migration is documented now, but the actual production deploy mechanism must not be switched until the R2 routing remediation is validated and the replacement API/SDK path is implemented and tested.

## 6. CHAIN AUDIT STATUS
- GitHub repository access: repository-level admin permission confirmed for the connected GitHub integration; this is not a claim of account/org-wide ownership.
- GitHub Actions: push-to-main workflows execute from the same main SHA; CI/static/admin/APK workflows were green on the previous main lineage; Queue-01 is red at the Worker media boundary.
- Cloudflare deploy: deployment workflow currently uses Cloudflare tooling and must be audited/migrated deliberately; workflow success alone is not deployment proof.
- Cloudflare Worker: source/config declares Worker `phanthuanxtra-v2`, D1, R2, Workers AI, AI Search, Images, and assets bindings.
- Workers AI: source has primary `@cf/zai-org/glm-4.7-flash`, fallback `@cf/meta/llama-3.2-3b-instruct`, and explicit AI binding guard; runtime verification remains a separate evidence gate.
- D1: production CRUD verified before the R2 boundary.
- R2: direct bucket write/read is verified; Worker route read is RED until the routing fix is deployed and retested.

## 7. RELEASE GATES
1. Current main deployed — source lineage must be re-verified after this remediation.
2. Invalid Admin login 401 — VERIFIED historically.
3. Valid Admin login + signed session — VERIFIED in Queue-01 on the previous lineage.
4. Unauthenticated dashboard 401 — VERIFIED historically.
5. Authenticated dashboard — VERIFIED in Queue-01 on the previous lineage.
6. D1 CRUD — VERIFIED in Queue-01 on the previous lineage.
7. **R2 write/read/delete — RED / ACTIVE REMEDIATION: direct R2 PASS, Worker `/media/*` GET 404.**
8. Password reset — GREEN historically by `35063840082`.
9. Gateway/AI — VERIFIED historically; fresh runtime evidence still required where release gate demands it.
10. Dual Workers AI — GREEN historically.
11. APK artifact/hash + S21 Ultra regression — OPEN.
12. Telegram Auto Bot production E2E — OPEN / blocked by R2.
13. VIP webhook/idempotency E2E — OPEN / blocked by R2.
14. Backup/restore/readability — GREEN historically.
15. Gate-15 smoke/security boundary — GREEN historically.
16. **PRODUCTION GREEN — LOCKED** until all required gates are GREEN.

## 8. SINGLE QUEUE CONTINUITY
- Exactly one remediation PR for the current R2 root cause.
- Telegram/VIP diagnostic remains deferred until R2 is closed.
- Do not test Admin manually yet.
- No second competing PR for this R2 task.
- No force-push.

## 9. CHANGE LOG — 2026-09-16
- Read canonical MASTER before execution.
- Deep audit established the actual chain failure: direct R2 read succeeds, but Worker `/media/*` GET returns 404.
- Root-cause hypothesis is narrowed to Cloudflare Static Assets routing precedence because `run_worker_first` omitted `/media/*`.
- Immediate remediation: add `/media/*` to `assets.run_worker_first`, then deploy and rerun Queue-01.
- New operating direction recorded: GitHub Actions remains the sole CI/CD orchestrator; production deployment is to migrate from direct Wrangler CLI invocation to a controlled Cloudflare API/SDK deployment path, while Worker/D1/R2/Workers AI remain on Cloudflare.
- Persistent project-completion method recorded in this MASTER for reuse by subsequent project queues/workstreams.

## 10. NEXT CHECKPOINT
`Fix R2 asset routing → CI/Deploy → fresh Queue-01 → verify R2 direct + Worker GET/DELETE/404 → inventory Wrangler production uses → implement/test Cloudflare API/SDK deployment controller → compare runtime evidence → cut over only after equivalence → remove Wrangler from production path.`
