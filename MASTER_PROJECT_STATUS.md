# PHAN THUẦN XTRA — MASTER PROJECT STATUS

> **DUY NHẤT — CANONICAL PROJECT STATUS / HANDOFF**  
> Date: 2026-09-14 (UTC+7)  
> Repository: `phanthuanxtra-v9/phanthuanxtra-v9`  
> Main source: `e948ca4d54b116882ade3983783d3ac6dddf4f40e`  
> Production deployment is tracked separately and is not implied by the current main source SHA.

## 1. SOURCE OF TRUTH / OPERATING RULES
- `MASTER_PROJECT_STATUS.md` is the sole canonical project-status file.
- All AI / Work AI must read this file before project work.
- One execution queue only; no conflicting parallel mutations.
- After a completed status checkpoint, update only this file; Do not create competing checkpoint/status Markdown files.
- Production remains **RED** until every required runtime/E2E release gate is evidenced.
- No secret guessing, force-push, unreviewed destructive production change, or false GREEN claim.

### 1.1. GITHUB SINGLE-QUEUE ENFORCEMENT — USER CONFIRMED
- At GitHub level, maintain **one ACTIVE PR for the current chain of changes**.
- That ACTIVE PR has **one head branch only**; all commits for the current queue go through that branch and PR.
- iPhone 16 / S21 Ultra / Win10 are only control terminals for the same GitHub queue; they are not independent work queues.
- Before any machine continues work: sync `main`, inspect the ACTIVE PR, and continue only when that machine is allowed to act on the current queue.
- Do not create parallel PRs for the same task or chain of changes.
- Do not use `.md` lock files, checkpoint `.md` files, or other file-based locks.
- Git is the practical synchronization lock: one branch → one commit chain → one PR → merge → queue closes.
- Never use `git reset --hard` or force-push as a queue mechanism.
- If two machines attempt to push the same branch concurrently, the later push must first synchronize/reconcile with GitHub; no silent overwrite is allowed.
- GitHub Actions runtime execution must also use the canonical serialized queue; the canonical Gate-15 workflow uses concurrency group `xtra-production-e2e-single-queue` with `cancel-in-progress: false`.
- Closing stale/non-active PRs does not delete their branches or commits; it removes them from the ACTIVE queue so work can be explicitly reconciled into the current queue later.

## 2. CURRENT ARCHITECTURE
- Website: `https://phanthuanxtra.com`
- Admin: `https://phanthuanxtra.com/admin`
- Production Worker: `phanthuanxtra-v2`
- Entry: `src/entry.js`
- D1: `phanthuanxtra-db`
- R2: `phanthuanxtra-media`
- Workers AI: website `/api/ai-chat`, Developer Gateway `/v1/ai/unified`
- APK: `com.phanthuanxtra.app`, source version 1.2.0 / versionCode 3
- Current main: `e948ca4d54b116882ade3983783d3ac6dddf4f40e`
- Proven production deployment: SHA `d9ee29ede4a9592e8b988c2bad8f6b5738f7604e`, Cloudflare Version `2abd60b3-5301-4d01-9d59-716fdbb77cc3`, Wrangler `4.121.0`.

### 2.1. CANONICAL TELEGRAM BOT MAP — USER CONFIRMED
- `@phanthuanxtra2026_bot` — **backup dữ liệu**; lịch backup **07:00 sáng mỗi ngày theo giờ Việt Nam (UTC+7)**.
- `@phanthuanxtra_auto_bot` — **Auto nhập xe lên website**; trước khi upload ảnh xe, AI tự động **che biển số** và thay vùng biển số bằng chữ **“PT Xtra”**.
- `@phanthuanxtra_bot` — **Chat AI ở góc phải phía dưới website**; **form đăng ký lái thử xe** cũng gửi thông báo về bot này.
- `@phanthuanxtra_vip_bot` — **VIP vehicle information check**; nhận/kiểm tra hình ảnh xe để hỗ trợ xác định thông tin xe, bao gồm phân biệt xe nguyên bản/sản xuất với xe **độ hoặc facelift**; chức năng này **hiện trên APK**.
- Đây là bản đồ 4 bot do chủ dự án xác nhận để làm chuẩn đối chiếu khi audit GitHub/Cloudflare. Không tự suy đoán, đổi tên hoặc gộp 4 bot thành một bot nếu runtime/config không chứng minh điều đó.

## 3. VERIFIED PRODUCTION BASELINE
- Website HTTP 200 — GREEN
- `/api/health` HTTP 200 — GREEN
- `/api/cars` HTTP 200 — GREEN
- `/admin.html` HTTP 200 — GREEN
- Production Worker HTTP 200 — GREEN
- Invalid Admin login HTTP 401 — GREEN
- Unauthenticated dashboard HTTP 401 — GREEN
- Valid Admin login HTTP 200 + signed session — GREEN
- Authenticated dashboard — GREEN
- D1 create/read/delete + read-after-delete 404 — GREEN
- R2 write/read/delete + read-after-delete 404 — GREEN
- Gateway `/health` 200 + authenticated `/v1/ai/unified` — GREEN

## 4. GATE 10 — DUAL WORKERS AI — GREEN
- Deploy Developer Gateway run `34745169480` — SUCCESS.
- Gate 10 Runtime Evidence run `34745194944` — SUCCESS.
- Live evidence proved `dual_workers_ai=true`, `isolated=true`, `execution=serialized`, `runtime_order=['wide','deep']`, `production_mutation=false`.
- Wide: `@cf/zai-org/glm-4.7-flash`.
- Deep: `@cf/nvidia/nemotron-3-120b-a12b`.
- Both peer results non-empty.

## 5. GATE 14 — FULL BACKUP + RESTORE/READABILITY — GREEN
Runtime evidence is now complete through GitHub Actions:
- Full System Backup run `34752032531` — **SUCCESS**.
- Worker/R2 capability preflight — HTTP 200.
- D1 Query capability preflight (`SELECT 1`) — HTTP 200 with backup token.
- D1 collector completed successfully after excluding Cloudflare-reserved `_cf_*` system tables from the schema walk.
- Backup checksum verification — **PASS**.
- Compressed archive creation — **PASS**.
- Archive integrity/extraction verification — **PASS**.
- Artifact uploaded: `phanthuanxtra-full-system-backup-34752032531`.
- Gate 14 restore/readability run `34752146646` — **SUCCESS**.
- Artifact checksum + internal SHA-256 manifest — **PASS**.
- D1 SQL restore into clean SQLite — **PASS**.
- SQLite `PRAGMA integrity_check` — **PASS**.
- R2 manifest/readability — **PASS**; production R2 was genuinely empty (`object_count=0`) and the restored object set was also zero. No artificial production object was created.
- Restore path caused no production infrastructure mutation.
- PR #168 merged as `223a0ff05a16f8d39fadba71f5c0247dd7532e24`.

### Gate 14 diagnosis/fixes
1. Initial preflight tested D1 metadata GET instead of the collector's real D1 Query capability.
2. Capability probe was reduced to minimal read-only `SELECT 1`.
3. Backup workflow now checks out the exact triggering commit, not stale `main`.
4. Collector excludes Cloudflare-reserved `_cf_*` system tables.
5. SHA-256 manifest uses artifact-relative paths.
6. Empty R2 is accepted only when manifest and restored object count are both exactly zero.
7. No gate was bypassed and no fake runtime evidence was created.

## 6. SINGLE EXECUTION QUEUE
### QUEUE-01 — Admin production E2E
**GREEN / COMPLETED.** Admin + dashboard + D1 CRUD + R2 E2E proven after production deployment.

### QUEUE-02 — Gateway/AI production E2E
**BASELINE VERIFIED.**

### QUEUE-03 — PR #66 VIP hardening
**OPEN / STAGED.** Reconcile against current main only through the ACTIVE queue; do not execute as a parallel PR.

### QUEUE-04 — APK production readiness
**OPEN / STAGED.** Fresh artifact/hash + S21 Ultra regression required; execute only through the ACTIVE queue.

### QUEUE-05 — Telegram/VIP production E2E
**OPEN / STAGED.** Execute only through the ACTIVE queue.

### QUEUE-06 — Backup/restore
**GREEN / COMPLETED.** Gate 14 runtime evidence proven by runs `34752032531` and `34752146646`.

### QUEUE-07 — Final cleanup + GREEN gate
**OPEN / ACTIVE.** Current ACTIVE PR is **#185**, head branch `fix/gate15-single-queue`.

## 7. RELEASE GATES
1. Current main deployed to production — **VERIFIED** (production deployment tracked separately at SHA `d9ee29ede4a9592e8b988c2bad8f6b5738f7604e`).
2. Invalid Admin login 401 — **VERIFIED**.
3. Valid Admin login 200 + signed session — **VERIFIED**.
4. Unauthenticated dashboard 401 — **VERIFIED**.
5. Authenticated dashboard — **VERIFIED**.
6. D1 CRUD E2E — **VERIFIED**.
7. R2 write/read/delete E2E — **VERIFIED**.
8. Password reset production E2E — **OPEN / NOT COMPLETE**.
9. Gateway/AI production gate — **VERIFIED**.
10. Dual Workers AI isolation/non-interference runtime evidence — **GREEN**.
11. Fresh APK artifact/hash + S21 Ultra regression — **OPEN**.
12. Telegram Auto Bot production E2E — **OPEN**.
13. VIP webhook/idempotency production E2E — **OPEN**.
14. Backup + restore/readability — **GREEN** (`34752032531` + `34752146646`).
15. Final security/UX/maintainability/testability audit — **OPEN**.
16. Final `PRODUCTION GREEN / COMPLETE` — **LOCKED until all required gates are GREEN**.

## 8. CANONICAL AI REASONING MODEL
**RỘNG → SÂU → RỘNG** is mandatory before execution:
1. RỘNG: scan dependencies, regressions, evidence gaps and alternatives.
2. SÂU: root-cause/security/architecture/runtime-evidence analysis.
3. RỘNG: reconnect the fix across the system and re-check regressions before one execution plan.

Preferred roles:
- DEEP: `@cf/nvidia/nemotron-3-120b-a12b` — root cause, security, evidence validation.
- WIDE: `@cf/zai-org/glm-4.7-flash` — broad scan, alternatives, cross-component impact.
- Fallback: `@cf/google/gemma-4-26b-a4b-it`.

Deep/Wide are reasoning peers, not independent deployers. They never create a second execution queue and no AI reasoning output is itself production evidence.

## 9. SAFETY / CONTINUITY
- Never put secrets in chat, Markdown, GitHub issues, source or logs.
- Never force-push.
- Never use `git reset --hard` as a queue or synchronization shortcut.
- Never delete production infrastructure without current dependency evidence.
- Never convert skipped tests or missing runtime evidence into GREEN.
- The obsolete repository `phanthuanxtra-v9/phanthuanxtra` is excluded from audit/deploy/repair/CI/E2E workflows.

## 10. CHANGE LOG — 2026-09-13 GATE 14
- Read `MASTER_PROJECT_STATUS.md` before execution.
- Kept the single queue and RỘNG → SÂU → RỘNG reasoning pattern.
- Diagnosed the actual D1 Query failure rather than bypassing the gate.
- PR #168 fixed D1 capability probing, exact-commit checkout, `_cf_*` schema exclusion, checksum paths and empty-R2 readability handling.
- Backup run `34752032531` and Gate 14 run `34752146646` both passed.
- Updated only `MASTER_PROJECT_STATUS.md` for this canonical status checkpoint.
- No secret values were exposed or committed.

## 11. CHANGE LOG — 2026-09-13 S21 / WRANGLER LIMITATION
- User confirmed Wrangler cannot be executed on the S21 Ultra environment currently being used for the physical-device workflow.
- This is an **execution-environment limitation**, not evidence that Cloudflare bindings or production are broken.
- No Wrangler secret/token was requested or exposed.
- Live Cloudflare CLI deployment/status commands from the S21 remain **UNVERIFIED** until an available execution environment can run Wrangler or equivalent authenticated Cloudflare tooling.
- GitHub-side source/config audit continues immediately through repository bindings, workflows, tests and production evidence; this note does not create a second queue.
- Production remains **RED**; no GREEN claim is made from the S21 limitation.

## 12. CHANGE LOG — 2026-09-13 TELEGRAM BOT MAP CONFIRMED
- Recorded the four canonical Telegram bot identities/functions confirmed by the project owner:
  - `@phanthuanxtra2026_bot` — daily 07:00 VN data backup.
  - `@phanthuanxtra_auto_bot` — vehicle ingestion to website with AI license-plate masking/replacement by `PT Xtra` before upload.
  - `@phanthuanxtra_bot` — website bottom-right AI chat and test-drive registration notifications.
  - `@phanthuanxtra_vip_bot` — VIP vehicle image/info checking for stock/manufacturing versus modified/facelift assessment, surfaced in the APK.
- These four identities are now the canonical audit targets for GitHub/Cloudflare reconciliation.
- This update records project knowledge only; it does **not** claim that all four live runtime paths have already been E2E-proven.
- Production remains **RED** until the corresponding runtime/E2E gates are evidenced.

## 13. CHANGE LOG — 2026-09-14 GITHUB SINGLE-QUEUE RULE
- User explicitly confirmed the GitHub-level execution model: one ACTIVE PR for the current chain of changes, one head branch, and one queue across iPhone 16 / S21 Ultra / Win10.
- Machines must sync `main`, inspect the ACTIVE PR, and continue only through the authorized queue; no parallel PR for the same task.
- No `.md` lock/checkpoint files are permitted; Git branch/commit/PR sequencing is the practical lock.
- No `git reset --hard` or force-push is permitted as synchronization mechanisms.
- Current ACTIVE queue is PR #185, branch `fix/gate15-single-queue`.
- Stale/non-active PRs are to be closed from the ACTIVE queue without deleting their branches/commits; any needed work must later be reconciled sequentially into the ACTIVE queue.
- Canonical Gate-15 remains serialized by GitHub Actions concurrency group `xtra-production-e2e-single-queue`.
- Production remains **RED** until all required runtime/E2E gates are evidenced.

## 14. NEXT CHECKPOINT
**Current task:** continue Gate 15 final security/UX/maintainability/testability audit and reconcile GitHub source/config with production Cloudflare evidence using the canonical four-bot map above, without relying on the unavailable S21 Wrangler CLI.  
**Execution rule:** use the existing single GitHub queue; PR #185 is the only ACTIVE queue vehicle. Do not create additional PRs for this chain, do not create checkpoint Markdown files, and after the completed status checkpoint update only this file.  
**Final rule:** do not declare `PRODUCTION GREEN / COMPLETE` until every required runtime/E2E gate is evidenced.
