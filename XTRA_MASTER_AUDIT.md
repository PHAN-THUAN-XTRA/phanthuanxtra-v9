# PHAN THUẦN XTRA — MASTER AUDIT & EXECUTION PLAN

> Single source of truth for ChatGPT reasoning, Ask AI execution, GitHub automation, Cloudflare audit, Publish Core, and UI V2.
>
> Rule: read this file first before any automated remediation. Update evidence here; do not create parallel planning MD files.

## Operating model

1. **ChatGPT = reasoning / audit / decision layer.** Inspect evidence first, determine root cause, propose the smallest safe change.
2. **Ask AI = execution accelerator.** It may implement an already-defined task, but must not bypass production safety gates or invent PASS evidence.
3. **This file = single durable plan and evidence ledger.** All P0–P4 progress is recorded here.
4. **GitHub automation = verifier.** Workflows may automatically audit after changes, but production-mutating tests must remain serialized and credentials must never be reset by routine smoke.
5. **Fix only from evidence.** A cancelled/skipped run is not a failed assertion. Never patch production merely to turn a status green.
6. **Cloudflare AI quota conservation.** Routine CI should test health/auth contracts without consuming live inference unless an explicit isolated AI E2E is approved.

## Current verified baseline

- Baseline commit: `5e642ef27d0ed6ce83a4098a2cd0813cb6d0860e`.
- Production Credential Safety: PASS on baseline.
- QUEUE-01 Production E2E Origin run `35703697398`: SUCCESS.
- Production Smoke Gate-15 run `35703616243`: CANCELLED before a job was created; this is not a test failure.
- Routine production smoke no longer changes production password/recovery credentials.
- Gate-15 supports `workflow_dispatch` and uses concurrency group `xtra-production-e2e-single-queue` with `cancel-in-progress: false`.

---

## P0 — Close Gate-15 with a fresh execution

### Objective
Obtain one complete Gate-15 execution on current production code. Do not change application code if it passes.

### Procedure
- Trigger `.github/workflows/production-smoke-gate15.yml` manually with a unique `execution_id`.
- Preserve the existing credential-safety policy.
- Required evidence: public website/Worker HTTP checks, Admin auth boundary, Gateway health/auth boundary, D1 create/read/delete, R2 write/read/delete/404, and final summary.
- If a step fails, capture exact job + step + assertion + HTTP status/log evidence before editing code.
- If failure is infrastructure/rate-limit/transient, classify it separately from product regression.
- Do not restore password-reset E2E to routine production smoke.

### Exit
A fresh run is SUCCESS and its run URL/commit are recorded in this file.

---

## P1 — GitHub workflow inventory and consolidation

### Objective
Reduce duplicate triggers, duplicate production E2E, Actions noise, and ambiguous CANCELLED states.

### Audit
Inventory every file under `.github/workflows/` and classify:
- CI/static/unit
- deploy
- production verification
- security/credential safety
- scheduled maintenance
- Android/release
- obsolete/duplicate

For every workflow record: triggers, concurrency group, secrets, whether it mutates D1/R2/credentials, AI inference usage, upstream/downstream workflow_run dependencies, and overlap with other workflows.

### Target architecture
`CI -> Deploy -> Production Verify -> Release Evidence`

Production Verify should expose clear jobs such as:
- `public-smoke`
- `auth-boundary`
- `d1-e2e`
- `r2-e2e`
- `ai-health`

Only one serialized workflow may perform production-mutating D1/R2 E2E. Other workflows consume evidence rather than repeating mutation.

Do not delete/merge workflows until dependency and trigger audit proves the change safe.

---

## P2 — Cloudflare binding and runtime inventory

### Current source configuration
`wrangler.json` currently declares:
- Assets / `ASSETS`
- Workers AI / `AI`
- Images / `IMAGES`
- AI Search / `AI_SEARCH`
- R2 / `MEDIA`
- D1 / `DB`
- observability
- cache
- cron `*/5 * * * *`

### Objective
Prove actual source/runtime usage before removing any binding.

### Procedure
Search all production source, tests, and workflows for every binding and scheduled handler. Record:
- call sites
- production route/features depending on it
- whether tests cover it
- whether it has current runtime evidence
- safe-to-remove / keep / uncertain

Special attention: `AI_SEARCH`, `IMAGES`, and 5-minute cron. Do not remove solely because usage is not obvious in `wrangler.json`.

Workers AI policy: centralize model invocation/routing, quota, timeout, logging, and fallback where practical. Telegram vehicle AI and website Chat AI should not grow independent policy stacks.

---

## P3 — Unified Publish Core

### Objective
One authenticated publishing core for multiple entry channels.

### Desired flow
`Telegram | Admin | ChatGPT | future API clients -> Publish Core -> validation -> D1/R2 -> website -> outbound channels`

### Existing verified capabilities
- Telegram webhook ingests vehicle photo/text bundles.
- Telegram pipeline stores media in R2, invokes vehicle AI, applies publication gates, and can promote to website data.
- Admin API can publish a car to Telegram.
- Admin UI manages website inventory.

### Design requirements
- Channel adapters do ingestion/auth only.
- Canonical payload/schema and validation live in one Publish Core.
- Idempotency key/source identity prevents duplicate publication.
- Draft/review/publish states are explicit.
- AI output never bypasses deterministic publication validation.
- ChatGPT integration must call the authenticated API; do not create a second business-logic pipeline.
- Preserve audit trail: source channel, actor/service, timestamp, resulting car/post/media IDs.
- Never expose Admin/Telegram/Cloudflare secrets to chat content.

### Future adapters
Zalo, Facebook/Instagram, CRM, Android or other clients may be added only as adapters after Publish Core exists.

---

## P4 — UI V2 conversion simplification

### Objective
Preserve PHAN THUẦN XTRA luxury identity while shortening the path from arrival to inventory/contact.

### Proposed hierarchy
`Hero -> Automotive inventory -> Private Concierge -> Ecosystem -> AI Assistant -> Contact`

Primary CTA set should remain small and consistent:
- View inventory
- Contact / private appointment

Keep Energy, Yachts, Business Jets and AI as ecosystem strengths, but do not let five equal-weight narratives obscure the primary conversion path.

### Audit before implementation
- desktop + mobile visual review
- above-the-fold CTA clarity
- inventory discoverability
- contact/test-drive friction
- performance/Core Web Vitals
- accessibility/keyboard/focus
- SEO/schema
- real production screenshots before visual regression changes

Do not perform a wholesale redesign before P0/P1/P2 evidence is stable.

---

## Automatic audit protocol

After reading this file, automation/Ask AI should:

1. Read current `main` SHA and recent relevant Actions runs.
2. Compare evidence against the P0–P4 exit criteria.
3. Run non-destructive audits first.
4. Trigger an existing safe verifier when appropriate.
5. For code/config changes: create a focused branch/PR, run CI, inspect exact failures, then merge only with evidence.
6. Never mutate production credentials in routine automation.
7. Never delete Cloudflare bindings/workflows merely for cleanup without proven dependency analysis.
8. Record run/PR/commit evidence back into this file in the same or follow-up PR.
9. Stop and request owner assistance only when an external permission, Cloudflare account-only setting, secret, billing/quota decision, or destructive production action is required.

## Owner assistance triggers

Ask Phan Thuần immediately and precisely if any of these are required:
- Cloudflare dashboard/account permission unavailable to automation
- creating/rotating a secret or API token
- billing/quota/paid-service change
- DNS/domain destructive change
- production data migration/deletion
- credential rotation/reset
- external social-channel authorization

Routine GitHub audit, code search, tests, branch/PR preparation, and non-destructive verification should proceed without asking for manual PowerShell.

## Evidence ledger

| Priority | State | Evidence / next action |
|---|---|---|
| P0 | IN PROGRESS | Fresh Gate-15 execution required; old run 35703616243 was cancelled before jobs. |
| P1 | IN PROGRESS | Inventory all workflows and overlap before consolidation. |
| P2 | IN PROGRESS | Audit binding usage; AI_SEARCH / IMAGES / cron are priority checks. |
| P3 | PLANNED | Define canonical Publish Core API from existing Telegram/Admin flows. |
| P4 | PLANNED | Perform production visual/performance audit before implementation. |
