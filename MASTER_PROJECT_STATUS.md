# PHAN THUẦN XTRA — MASTER PROJECT STATUS

> **DUY NHẤT — CANONICAL PROJECT STATUS / HANDOFF**
> Date: 2026-09-18 (UTC+7)
> Repository: `PHAN-THUAN-XTRA/phanthuanxtra-v9`
> Current main lineage: `9ffeb796eb6347c63bc0ef142e246ba12bdd0b4e` (PR #251 merged; fresh Cloudflare runtime deployment evidence still required)

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
Stage 3 starts from the proven main/runtime lineage above. Do not assume historical green evidence remains valid after lineage changes.

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
- D1/Gateway/AI current-lineage runtime evidence remains OPEN until independently refreshed.
- APK physical-device evidence remains OPEN.
- Telegram Auto and VIP production E2E remains OPEN.

## 6. RELEASE GATES — CURRENT STATUS
1. Current main deployed lineage — **🟢 Stage 2 proven** (`a6c894ef...` → Worker `bb078a3a...`, 100% traffic).
2. Invalid Admin login 401 — **OPEN: refresh current lineage as required**.
3. Valid Admin login + signed session — **🟢 proven in Stage 2 login boundary; broader admin flow still open**.
4. Unauthenticated dashboard 401 — **OPEN: refresh current lineage as required**.
5. Authenticated dashboard — **OPEN: refresh current lineage as required**.
6. D1 CRUD — **🔴/OPEN: current-lineage runtime proof required**.
7. R2 write/read/delete — **🟢 PASS in Stage 2**.
8. Password reset — **OPEN: refresh current lineage as required**.
9. Gateway/AI — **🔴/OPEN: current-lineage runtime proof required**.
10. Dual Workers AI — **🔴/OPEN: primary + fallback runtime proof required**.
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
- Telegram HTTP 403 is isolated from backup integrity by removing `curl --fail` from notification delivery; backup artifact/checksum/restore evidence remains authoritative. This is source/CI evidence, not Telegram delivery PASS evidence.
- Android APK workflow run #814 completed successfully on the PR head; `phanthuanxtra-apk-debug` artifact exists with SHA-256 digest `65254e6239f8beceba3830418f4de61f32139fc6aa397d380d9d7a6f5a2c281e`. This is artifact evidence; S21 Ultra physical regression remains OPEN.
- GitHub connector can now read PR #251 CI evidence directly: run #138 `CI / Validate = success`. The previously requested APK run #813 is superseded by fresh run #814 for artifact evidence.
- PR #251 merge completed; fresh Cloudflare deployment/Worker lineage verification and affected backup/restore runtime evidence are still required before closing the corresponding gate.

## 8.1 CHANGE LOG — 2026-09-17
- Read canonical MASTER before Stage 3 work.
- Persisted the mandatory method: **Cloudflare audit → GitHub source/CI/deploy evidence → GPT deep root-cause challenge**.
- Recorded Stage 1 completion and confirmed R2 authentication root cause/fix.
- Recorded Stage 2 completion with fresh Cloudflare API/SDK deployment and real R2 GET/DELETE/404 runtime evidence.
- Started Stage 3 from the proven current main/runtime lineage.
- Stage 3 remains RED/OPEN until D1, Gateway/AI and the remaining gates are refreshed on the current lineage.

## 9. NEXT CHECKPOINT
`Current-lineage D1 CRUD → Gateway → Workers AI primary/fallback → Admin/Password Reset → Telegram Auto/VIP → backup/restore → APK artifact/hash + S21 Ultra → Gate-15 reconciliation → release-gate decision.`
