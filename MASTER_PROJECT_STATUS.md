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

## 3. CURRENT QUEUE — R2 ROOT-CAUSE REMEDIATION
- Current main source: `bd25669f07692a8faed1927e140dedcea8be2ad5`.
- Queue-01 run `35078505834` reached Admin login 200, signed session PASS, dashboard PASS, D1 CRUD PASS, R2 upload HTTP 200, and **direct R2 bucket read PASS**.
- The same run then failed at Worker media GET: `/media/$MEDIA_KEY` returned HTTP 404.
- This is a materially new root-cause boundary: **R2 storage/binding is working; the Worker media route is not receiving `/media/*` requests on the deployed asset routing path.**
- `src/media.js` correctly handles `/media/*` and calls `env.MEDIA.get(key)`; `src/entry.js` correctly invokes `handleMediaApi()`.
- `wrangler.json` had `assets.not_found_handling=404-page` but `run_worker_first` did not include `/media/*`. The evidence is consistent with Static Assets handling `/media/*` before the Worker, producing the observed 404.
- Remediation in this queue adds `/media/*` to `assets.run_worker_first` so the Worker media handler gets the request before Static Assets fallback.
- No secret rotation or secret exposure.
- No R2 data mutation beyond the existing disposable E2E object lifecycle.

## 4. CHAIN AUDIT STATUS
- GitHub repository access: repository-level admin permission confirmed for the connected GitHub integration; this is not a claim of account/org-wide ownership.
- GitHub Actions: push-to-main workflows execute from the same main SHA; CI/static/admin/APK workflows were green on `bd25669f...`; Queue-01 is red at the Worker media boundary.
- Cloudflare deploy: deployment workflow is configured to validate credentials without exposing values and to deploy only from merged `main`/manual main dispatch.
- Cloudflare Worker: source/config declares Worker `phanthuanxtra-v2`, D1, R2, Workers AI, AI Search, Images, and assets bindings.
- Workers AI: source has primary `@cf/zai-org/glm-4.7-flash`, fallback `@cf/meta/llama-3.2-3b-instruct`, and explicit AI binding guard; runtime verification remains a separate evidence gate.
- D1: production CRUD verified in Queue-01 before the R2 boundary.
- R2: direct bucket write/read is now verified; Worker route read is RED until the routing fix is deployed and retested.

## 5. RELEASE GATES
1. Current main deployed — source lineage must be re-verified after this remediation.
2. Invalid Admin login 401 — VERIFIED historically.
3. Valid Admin login + signed session — VERIFIED in Queue-01 on `bd25669f...`.
4. Unauthenticated dashboard 401 — VERIFIED historically.
5. Authenticated dashboard — VERIFIED in Queue-01 on `bd25669f...`.
6. D1 CRUD — VERIFIED in Queue-01 on `bd25669f...`.
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

## 6. SINGLE QUEUE CONTINUITY
- Exactly one remediation PR for the current R2 root cause.
- Telegram/VIP diagnostic remains deferred until R2 is closed.
- Do not test Admin manually yet.
- No second competing PR for this R2 task.
- No force-push.

## 7. CHANGE LOG — 2026-09-16
- Read canonical MASTER before execution.
- Deep audit established the actual chain failure: direct R2 read succeeds, but Worker `/media/*` GET returns 404.
- Root-cause hypothesis is now narrowed to Cloudflare Static Assets routing precedence because `run_worker_first` omitted `/media/*`, while the Worker source already contains the correct media handler.
- Immediate remediation: add `/media/*` to `assets.run_worker_first`, then deploy and rerun Queue-01 against the same main lineage.

## 8. NEXT CHECKPOINT
`Fix wrangler asset routing → CI/Deploy → fresh Queue-01 → verify R2 direct + Worker GET/DELETE/404 → then unblock Telegram/VIP → then remaining release gates.`
