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

## 3. DEPLOYMENT OPERATING MODEL — CLOUDFLARE API/SDK
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

## 4. CURRENT QUEUE — R2 ROOT-CAUSE REMEDIATION + DEPLOYMENT PATH PREPARATION
- Current main source before this queue: `bd25669f07692a8faed1927e140dedcea8be2ad5`.
- Queue-01 reached Admin login 200, signed session PASS, dashboard PASS, D1 CRUD PASS, R2 upload HTTP 200, and direct R2 bucket read PASS.
- The same run failed at Worker media GET: `/media/$MEDIA_KEY` returned HTTP 404.
- `src/media.js` correctly handles `/media/*`; `src/entry.js` invokes `handleMediaApi()`; `wrangler.json` omitted `/media/*` from `assets.run_worker_first`.
- This queue adds `/media/*` to `assets.run_worker_first` so the Worker media handler receives the request before Static Assets fallback.
- The deployment-model migration is documented now, but the actual production deploy mechanism must not be switched until the R2 routing remediation is validated and the replacement API/SDK path is implemented and tested.

## 5. CHAIN AUDIT STATUS
- GitHub repository access: repository-level admin permission confirmed for the connected GitHub integration; this is not a claim of account/org-wide ownership.
- GitHub Actions: push-to-main workflows execute from the same main SHA; CI/static/admin/APK workflows were green on the previous main lineage; Queue-01 is red at the Worker media boundary.
- Cloudflare deploy: deployment workflow currently uses Cloudflare tooling and must be audited/migrated deliberately; workflow success alone is not deployment proof.
- Cloudflare Worker: source/config declares Worker `phanthuanxtra-v2`, D1, R2, Workers AI, AI Search, Images, and assets bindings.
- Workers AI: source has primary `@cf/zai-org/glm-4.7-flash`, fallback `@cf/meta/llama-3.2-3b-instruct`, and explicit AI binding guard; runtime verification remains a separate evidence gate.
- D1: production CRUD verified before the R2 boundary.
- R2: direct bucket write/read is verified; Worker route read is RED until the routing fix is deployed and retested.

## 6. RELEASE GATES
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

## 7. SINGLE QUEUE CONTINUITY
- Exactly one remediation PR for the current R2 root cause.
- Telegram/VIP diagnostic remains deferred until R2 is closed.
- Do not test Admin manually yet.
- No second competing PR for this R2 task.
- No force-push.

## 8. CHANGE LOG — 2026-09-16
- Read canonical MASTER before execution.
- Deep audit established the actual chain failure: direct R2 read succeeds, but Worker `/media/*` GET returns 404.
- Root-cause hypothesis is narrowed to Cloudflare Static Assets routing precedence because `run_worker_first` omitted `/media/*`.
- Immediate remediation: add `/media/*` to `assets.run_worker_first`, then deploy and rerun Queue-01.
- New operating direction recorded: GitHub Actions remains the sole CI/CD orchestrator; production deployment is to migrate from direct Wrangler CLI invocation to a controlled Cloudflare API/SDK deployment path, while Worker/D1/R2/Workers AI remain on Cloudflare.

## 9. NEXT CHECKPOINT
`Fix R2 asset routing → CI/Deploy → fresh Queue-01 → verify R2 direct + Worker GET/DELETE/404 → inventory Wrangler production uses → implement/test Cloudflare API/SDK deployment controller → compare runtime evidence → cut over only after equivalence → remove Wrangler from production path.`
