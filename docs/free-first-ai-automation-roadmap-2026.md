# PHAN THUẦN XTRA — Free-first AI & Automation Roadmap (2026-10-08)

**Document status: MERGED TO `main` via PR #816; Brevo transactional provider-to-Gmail delivery: PRODUCTION PASS (2026-10-08); additional lead reliability and automation: PROPOSED / OPEN.**
**Owner preference:** prioritize genuinely usable Free tiers, native Cloudflare/D1/R2/Telegram, explicit permission for paid upgrades and external account connections.
**Source of truth:** `MASTER_PROJECT_STATUS.md`; repository `main` and production evidence supersede assumptions.
**Scope:** propose/track integrations and safety gates. This document makes **no** runtime, database, billing, secret, customer-contact or service-activation change.

## Documentation closure and remaining gates — verified 2026-10-08

- PR [#816](https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/pull/816) squash-merged at `d17978d64922005b78fb49ec6f277b6352d7c56e`; merge changed only three Markdown files.
- On that exact main SHA, [CI](https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/37738824606), [MASTER Integrity](https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/37738824597), and [SonarQube Cloud](https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/37738824614) returned PASS. The PR head previously passed its 9 applicable checks, with only pull-request production deployment skipped by design.
- No Worker deployment occurred for this docs-only merge (deployment workflow ignores Markdown-only main pushes); no independent production HTTP smoke was observed as part of this documentation closure.
- Weekly ChatGPT advisory task **XTRA Free Tool Radar** remains enabled for Monday mornings (~08:00 ICT), recommendations only.
- Brevo real inbox/provider/Telegram E2E and fail-closed lead receipt, durable outbox, S21 physical acceptance and Content Runner live approval remain OPEN. The roadmap below describes proposed follow-up work, **not completed production features**.

## Brevo transactional delivery — production PASS (2026-10-08, 14:01 ICT)

- [Brevo Transactional Diagnostic #13](https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/37740884826) completed SUCCESS for production main `5c111f4e1c4268baef3dac190ebb4d9a1aac4371`. Owner inspected sanitized output and confirmed Worker `/v3/account` HTTP 200, provider send HTTP 201 and `messageId`. The workflow itself asserts `accepted_by_provider=true` and a 2xx provider send.
- Verified independently in the authorized Gmail account: diagnostic `a4c461b2` reached **INBOX** at **14:01:16 ICT**; CI Test Drive lead **#227** reached **SPAM**, while CI Business Jets lead **#228** reached **INBOX** at about 13:59 ICT. These were synthetic CI leads, never customer requests. Do not record recipient address, synthetic phone fields, or full email bodies in public documents.
- **Close only** the previous transactional-email connectivity/provider acceptance/actual receiving-inbox gate. Open: inconsistent Gmail Inbox placement, D1 lead fail-closed receipt, durable outbox + replay-safe retries, Telegram receipt reconciliation for the same lead, and all unrelated owner production acceptance. No more diagnostic sends or key changes are required.
- Follow-up: review SPF/DKIM/DMARC configuration and sender reputation, preferably read-only first. Sender-domain DNS changes or marketing campaigns require explicit separate authorization. Earlier historical “Brevo inbox OPEN” statements below reflect a checkpoint **before** this successful production evidence.

## 1. Existing foundation — do not duplicate

- Production Worker is `phanthuanxtra-v2` via `src/entry.js`/`wrangler.json`, D1 for CRM, R2 for media, Telegram for owner workflow, CMS and existing XTRA AI chat.
- `src/index.js` contains lead intake and replay/idempotency handling; `src/customer-memory.js` plus D1 migrations already support customer memory/care. `public/admin-control.html` has a Marketing Operations tab with a *Weekly Tool Radar* discovery link.
- `src/business-integrations.js` has the optional Brevo lead notification adapter, optional tawk.to public config and bearer-protected aggregate `/api/analytics/summary`. `integrations/data-studio/Code.gs` is a report connector template.
- `src/content-runner*.js` exists, but `wrangler.json` sets `CONTENT_RUNNER_LIVE_ENABLED=0`. Treat live Content Runner as deferred until existing quota/security/owner gates pass.
- Code presence is **not** proof of external activation. Brevo real delivery E2E, S21 physical UI acceptance and live Content Runner were explicitly open in the MASTER checkpoint dated 2026-10-08.

## 2. Ranked proposals (Free tier first)

| Priority | Initiative | Reuse before adding | Minimal acceptance |
| --- | --- | --- | --- |
| **P0** | **Brevo V2: actual email delivery, retry, lead receipt correctness** | Existing Brevo adapter, D1 lead store, Telegram CRM and deployment gates | One synthetic lead stored exactly once; Telegram evidence; Brevo provider event and real inbox receipt; bounded retry without duplicate customer notifications; UI never claims stored when `stored:false` |
| **P1** | **Cloudflare Turnstile for public intake and AI abuse boundary** | Existing Workers and Cloudflare security controls | Server-side token validation, expiry/replay tests, accessibility and legitimate-lead smoke, graceful provider outage path |
| **P1** | **CRM follow-up + Google Calendar (or individual Free Cal.com)** | Existing D1 `xtra_customer_care` state, installed Calendar connector and Telegram | Staff confirms availability/consent; events linked to customer/lead id; no duplicate appointments; no automatic promise of booking before calendar confirmation |
| **P2** | **Data Studio / Looker Studio dashboard** | Existing `/api/analytics/summary` aggregate endpoint and connector template | Token-protected, no PII; totals reconcile against authorized D1 aggregates; documented refresh budget |
| **P2** | **Search Console and Cloudflare Web Analytics** | Existing SEO pages/metadata and Cloudflare runtime | Domain ownership and appropriate read access confirmed; no client-side secrets; useful search/traffic/funnel baseline |
| **P3** | **Content Runner + human-reviewed creative tooling** | Existing Content Runner, editorial approval, vehicle gallery and R2 media pipeline | Draft-only default, owner approval, no fabricated vehicle images/specifications, quotas respected, regression/production gates all PASS |
| **Optional** | **tawk.to human chat** | Existing button + click-to-load adapter | Enable only when showroom staff can monitor it; do not add a second paid AI chatbot |

Free availability is **subject to current vendor quotas and permitted use**; verify official pricing, commercial usage, anti-abuse limits, regional availability and API fees immediately before enabling anything. Do not infer that an app's free UI plan includes free production APIs.

## 3. P0 Brevo V2 — concrete engineering proposal

Observed at documentation review:

1. `src/index.js` stores the lead in D1, calls Telegram CRM, then invokes `sendBrevoLeadNotification()` inside `ctx.waitUntil()` via `Promise.all()`. This is not yet a dedicated durable Brevo outbox with auditable provider-delivery reconciliation.
2. For an unavailable D1 binding, `/api/leads` has a response `{ ok:true, stored:false }`; `public/script.js` checks `ok` only and can display **"Đã nhận yêu cầu. Chúng tôi sẽ liên hệ sớm."** without a stored lead. **Proposed fix:** client must require `stored===true` and backend must fail closed for mandatory lead persistence, with targeted regression tests.
3. Brevo `BREVO_API_KEY` is a **Cloudflare-only `secret_text` binding** by current MASTER owner policy; never copy it to GitHub secrets, repo, report, browser or logs. Sender/recipient addresses are not API credentials; verify the sender domain/account with the provider.
4. The `scripts/verify-business-integrations.mjs` deploy smoke proves boundary/configuration, **not** real Brevo delivery. Do not mark this gate PASS based only on a green CI/deploy.

Proposed design and safeguards:

- Atomic/idempotent D1 lead acceptance plus outbox intent (or a recoverable two-phase equivalent); store a distinct notification idempotency key, attempt count, last error category, timestamps and provider message identifier; never store Brevo API key in D1.
- An authenticated bounded worker/cron sender consumes pending work. Rate limit, exponential backoff, terminal failure classification, observability and a dead-letter/manual reconciliation path. Do **not** blindly resend when the upstream outcome is uncertain; reconcile provider state first.
- Where provider supports them, use signed/verified delivery webhooks and dedupe provider events. Keep only operational metadata needed for audit; redact customer PII. Delivery events are not proof of a human reading the email.
- Verify synthetic end-to-end path: exactly one lead; exactly one intended alert; real Brevo event plus inbox receipt; failure/retry and duplicate-request tests; secret not exposed; independent Telegram behavior unchanged.
- Do **not** enroll customers into marketing campaigns or send unsolicited customer mail without an appropriate consent/legal basis. Lead notifications to the authorized business mailbox are a distinct transactional workflow.

## 4. Automation: Weekly Free Tool Radar

- **Schedule:** each Monday morning, approximately 08:00 Vietnam time; the ChatGPT scheduled task is an **advisory report**, not a GitHub Actions deployment workflow.
- **Input:** official vendor pages for current Free quotas/pricing; recent relevant AI/security/CRM tools; available repository state and MASTER status.
- **Filter:** prefer no additional vendor when native Cloudflare/D1/Telegram suffices; reject trials masquerading as sustainable Free, unreviewed payment plans, unclear data handling, duplicate capabilities, or expensive maintenance.
- **Output:** at most **three** genuinely useful proposals with source links, purpose, Free restrictions, integration effort, risks, exact validation gates and recommendation priority. If no useful new proposal exists, state that.
- **Decision flow:** radar `suggested` → human `approved` → separate PR with targeted tests → exact-head CI/AI audit/MASTER gates → merge authorization and verified production rollout. Radar never changes production, installs plugins, grants permission, edits customer data, triggers billing, or creates customer-facing content automatically.
- **Privacy:** proposals contain no customer identities, phone numbers, API keys or real prospect messages; avoid pasting secrets into AI tools.

## 5. Staged implementation checklist

- [x] P0-0 — Brevo transactional production send and real Gmail receipt proven 2026-10-08 ([diagnostic #13](https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/37740884826)); one synthetic CI lead was classified Spam, so inbox placement still needs improvement.
- [ ] P0-a — Resolve form false-success when D1 is unavailable; regression tests.
- [ ] P0-b — Brevo configured sender/recipient/Cloudflare-only secret binding verified without exposing values.
- [ ] P0-c — Durable email outbox, safe retry + provider webhook reconciliation; tests.
- [ ] P0-d — Synthetic real-inbox/provider/Telegram E2E evidence linked in MASTER.
- [ ] P1-a — Turnstile protection after UX/accessibility and server-verification review.
- [ ] P1-b — Calendar appointment confirmation with manual review and duplicate prevention.
- [ ] P2-a — Activate aggregate dashboard safely; report source-of-truth parity.
- [ ] P2-b — Verify Search Console ownership and basic analytics.
- [ ] P3-a — Review Content Runner quota and owner-approved publish gate before live use.
- [x] Weekly advisory radar task requested/created 2026-10-08; **not** an automatic deployment or code-writing agent.

## 6. Mandatory release gates and boundaries

Follow the existing MASTER contract: targeted regression tests, `CI / Validate`, `AI Pre-Deploy Audit / Validate`, `MASTER Integrity Gate / Validate` and applicable SonarQube/review checks; use exact-head SHA for merge decision, then exact-main-sha Cloudflare deploy, production smoke and independent external delivery receipts. A docs-only PR requires checks appropriate to the changed files; it does **not** close Brevo/Calendar/AI runtime gates.

No autonomous paid-plan upgrade, extra secret exposure, D1/R2 delete, vehicle-image mutation, lead-status mutation, public content publication, or customer contact is authorized by this proposal.

## Reference paths

- `MASTER_PROJECT_STATUS.md`
- `docs/free-business-integrations.md`
- `src/index.js`, `src/business-integrations.js`, `src/customer-memory.js`
- `public/script.js`, `public/admin-control.html`
- `integrations/data-studio/README.md`, `integrations/data-studio/Code.gs`
- `scripts/verify-business-integrations.mjs`, `wrangler.json`
