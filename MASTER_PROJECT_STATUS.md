# PHAN THUẦN XTRA — MASTER PROJECT STATUS

## FREE-FIRST ROADMAP PR #816 — DOCS MERGE VERIFIED — 2026-10-08 (UTC+7)

- **Documentation closed / merged:** [PR #816](https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/pull/816) squash-merged into `main` at exact SHA `d17978d64922005b78fb49ec6f277b6352d7c56e`. Only `MASTER_PROJECT_STATUS.md`, `docs/free-business-integrations.md`, and `docs/free-first-ai-automation-roadmap-2026.md` changed in that merge; Brevo runtime work from PRs #815 and #817 was preserved.
- **Pre-merge gate:** final head `7b673056f635f18e381508a4ea0597bd4c31362e` passed 9 checks, including CI, AI Pre-Deploy Audit, MASTER Integrity, SonarQube, decision cascade, DeepSeek and Headroom. The pull-request production deploy job was SKIPPED by design.
- **Post-merge evidence on the exact merge SHA:** [CI / Validate](https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/37738824606) PASS; [MASTER Integrity](https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/37738824597) PASS; [SonarQube Cloud](https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/37738824614) PASS. [PR completion receipt](https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/pull/816#issuecomment-6054095707).
- **Runtime boundary:** `.github/workflows/deploy-cloudflare.yml` ignores `**/*.md` on pushes to main. A production Worker deploy was neither required nor triggered by this docs-only merge; no independent HTTP production smoke was verified in this documentation checkpoint. Do not claim a new runtime deployment.
- **Advisory task:** `XTRA Free Tool Radar` is enabled in ChatGPT for Monday morning (~08:00 Vietnam time), reporting a maximum of three evidence-backed Free-first recommendations. It cannot autonomously edit GitHub, deploy, activate paid services or contact customers.
- **Still OPEN:** Brevo actual provider event + receiving inbox / Telegram E2E, D1 `stored:false` response correctness, durable delivery/outbox safety, Samsung S21 physical UI acceptance and Content Runner quota/security approval. Subsequent independent Brevo PRs must be evaluated against their own verified deploy and delivery evidence; merging #816 did not close these tasks.
- The older `FREE-FIRST AI / AUTOMATION ROADMAP — PROPOSED` section immediately below documents the original authoring checkpoint; its phrase `not merged/deployed` is **superseded for documentation merge status only** by this verified record. Its runtime/acceptance cautions remain valid.

## FREE-FIRST AI / AUTOMATION ROADMAP — PROPOSED — 2026-10-08 (UTC+7)

- Owner asked to record a free-first integration proposal in Markdown and receive automatic proposals. Full scoped plan: [docs/free-first-ai-automation-roadmap-2026.md](docs/free-first-ai-automation-roadmap-2026.md). **Documentation proposal only**; not merged/deployed and no external vendor activation is claimed.
- A ChatGPT **XTRA Free Tool Radar** weekly advisory task was enabled for Monday morning (~08:00 UTC+7): at most three source-backed Free-first proposals; does not install apps, grant permissions, change this repository/Production, contact customers, or activate paid quotas.
- **P0 remains Brevo real provider/inbox/Telegram delivery E2E and D1 lead reliability.** Review `src/index.js` and `public/script.js`: `/api/leads` can return `ok:true,stored:false` without D1 while the frontend displays a generic receipt based on `ok` alone. This is a proposed fail-closed fix with regression tests, not yet a production fix. Add durable Brevo outbox/reconciliation with no blind resend after uncertain delivery.
- **Secret boundary:** `BREVO_API_KEY` must remain a Cloudflare-only `secret_text` binding, never synchronized to GitHub. Follow current owner secret policy over historical notes. Later phases: Turnstile, appointment Calendar/CRM, aggregate-only Data Studio, Search Console/Web Analytics, and gated Content Runner.
- Preserve MASTER PR/head-SHA/CI/security/deploy/smoke gates and existing open acceptance: real Brevo delivery, Samsung S21 physical UI, and Content Runner quota/safety approval. **Nothing here closes these gates.**

## GATE 14 BACKUP RESTORE — VERIFIED PASS — 2026-10-08 (UTC+7)

- Full System Backup [run 37723082449, attempt #5](https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/37723082449) **SUCCESS**. Collector, D1 export, R2 content, SHA256 manifests, compressed archive verification, encryption, GitHub artifact upload and Telegram delivery steps all passed. Artifacts: `phanthuanxtra-full-system-backup-37723082449` (57,984,295 bytes) and `backup-delivery-receipt-37723082449` (790 bytes).
- Independently triggered Gate 14 [run 37726826770](https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/37726826770) **SUCCESS** (`workflow_run` after successful backup). All restore-readability job steps passed: download/decrypt artifact, SHA256 archive and internal manifest verification, SQL import into clean local SQLite and `PRAGMA integrity_check`, required D1 table/row evidence, and R2 manifest versus extracted-object file count. No production database or bucket was restored into or modified by this gate.
- **Scope:** Verified non-destructive local backup readability/restore drill, not a full Cloudflare infrastructure disaster-recovery cutover. This meets the existing Gate 14 workflow's acceptance contract. Historical OPEN backup checkpoint below is superseded by this evidence; issue #806 may be closed after this documentation PR passes required checks and merges.

## SECURITY ANALYTICS RECOVERY / BACKUP ACCEPTANCE CHECKPOINT — 2026-10-08 (UTC+7)

- **Security telemetry RECOVERED (verified):** PR #809 merged as `329390e16dfd278016be417cf032b0ec32337fba`. Production deploy run [37726129025](https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/37726129025) completed SUCCESS. Free Security Operator run [37726226647](https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/37726226647) completed SUCCESS on the same SHA; its job log reports `ok=true`, `findings=[]`, `recoveries=1`, `analytics_ok=true`, `waf_telemetry_ok=true`, `baseline_ready=true`, and `state_store_ok=true`. GitHub uploaded the `security-operator-37726226647` evidence artifact. Dedicated production environment secret `CLOUDFLARE_SECURITY_ANALYTICS_API_TOKEN` is owner-confirmed; do not record or expose its value. No WAF mutation or paid-plan change was needed.
- **Backup OPEN — issue #806:** Full System Backup [run 37723082449](https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/37723082449) was re-run as attempt #5 after owner updated backup token permissions to D1:Edit and refreshed the production backup secret. Latest observed state at this checkpoint: **IN PROGRESS**, collector step running; **not PASS**. This is a retry of an earlier commit, not a fresh `main` dispatch. PR #808 merged as `17b0aebdf8959b9e49f04195326e219cc7804b51` to improve D1 export permission diagnostics, not to prove export success.
- **Backup completion gates (all mandatory):** (1) D1 native export succeeds and its SQL dump is present; (2) Worker metadata and R2 object contents are collected; (3) `SHA256SUMS` and compressed archive integrity checks pass; (4) encrypted backup artifact is uploaded and a verifiable artifact/delivery receipt exists; (5) Gate 14 restore/readability verification succeeds using the resulting backup. Keep issue #806 OPEN until all evidence is linked. A successful deploy or D1 `SELECT 1` preflight is not equivalent to a restorable backup.
- **PR/merge gate contract:** targeted regression tests + `CI / Validate` + `AI Pre-Deploy Audit / Validate` + `MASTER Integrity Gate / Validate` must PASS; review SonarQube and decision-cascade as applicable; merge only the exact verified PR head SHA. After merge, verify exact-main-SHA Cloudflare deploy and applicable independent post-deploy security/production gates. Do not infer post-deploy acceptance from PR CI alone.
- **Separate OPEN acceptance:** Brevo real external delivery, Samsung S21 physical UI and AI Content Runner quota/safety approval remain deferred. Telegram vehicle archive/delete notifications for CI IDs 483, 486, 489, 492 (twice), 495 and 498 require audit reconciliation before treating them as destructive loss; the archive contract is non-destructive by default.
- **Historical note:** older checkpoint text below is retained as an audit timeline; the verified security recovery and still-open backup status above supersede earlier contradictory claims.

## VEHICLE ARCHIVE — PRODUCTION GATE CHECKPOINT — 2026-10-08 (UTC+7)

- PR #798 established non-destructive vehicle archive: DELETE compatibility changes status to hidden, preserving canonical D1 vehicle/gallery rows and R2 media. Restore uses the existing reversible visibility path; no physical deletion is authorized by this workflow.
- Follow-up fixes #800, #801 and #803 were merged; current observed main is f8c82f1070f24cd02917b5fd8a7aeeb2e9508eb8 (PR #803). Owner-provided evidence reports Cloudflare deployment, Production Smoke Gate-15 #591 (run 37717348440), and QUEUE-01 production E2E PASS. This closes the previously stale archive-smoke assertion at the reported production gate boundary, not unrelated acceptance.
- PR #802 was reviewed against main and closed unmerged as superseded by #803; no duplicate smoke fix should be merged.
- Brevo actual external email delivery E2E, Samsung S21 physical UI acceptance, and live AI Content Runner remain OPEN. AI Content Runner stays disabled pending quota and safety approval. Do not infer these from CI/deploy success.
- Historical PENDING entries below are retained for audit chronology; this checkpoint supersedes earlier archive-gate pending claims only.

## VEHICLE ARCHIVE / HIDE DEFAULT — MERGED — 2026-10-07 (UTC+7)

- PR #798 `fix(cars): make archive/hide the default delete behavior` merged to `main` as `2ae6041117da4cfbb23a4e02a73fa0f17aaefe02`.
- Vehicle DELETE compatibility is now intentionally non-destructive: it delegates to `setCarVisibility(..., false)` and changes the vehicle to `hidden` instead of deleting the canonical record.
- Admin wording is `Lưu trữ`; the confirmation states that vehicle data and images are retained and the vehicle can be shown again.
- Safety invariant: the vehicle archive path must not execute `DELETE FROM cars` or `DELETE FROM car_images`; R2 media is retained. Restore remains the existing reversible `hidden -> available` visibility path.
- Regression coverage in `tests/app-admin-contract.test.mjs` locks the non-destructive behavior. The Admin vehicle renderer was also moved away from `innerHTML` sinks to DOM APIs so the security audit remains fail-closed.
- PR head `52f37dab2a8a43007c6982b067d7523576cc4c3f` passed CI, AI Pre-Deploy Audit, Jev + LLM Decision Cascade, SonarQube Cloud and deploy validation before merge.
- Exact-merge production deployment for `2ae6041117da4cfbb23a4e02a73fa0f17aaefe02` was not yet observed at this documentation checkpoint. Do not label this change **PRODUCTION PASS** until the exact-merge deployment and post-deploy gates succeed.
- This policy supersedes destructive vehicle-delete behavior as the default. Permanent deletion, if ever reintroduced, must be a separate explicitly authorized workflow and must not silently delete R2 media.


## BREVO CLOUDFLARE-ONLY SECRET HARDENING — 2026-10-07 (UTC+7)

- Owner confirmed production BREVO_API_KEY is a Cloudflare Secret and requires it to remain Cloudflare-only, not duplicated into GitHub Actions.
- Deployment hardening removes the Brevo API key from GitHub workflow inputs and environment synchronization.
- Production deploy now fails closed unless the existing Worker binding BREVO_API_KEY has Cloudflare type secret_text; the existing binding is preserved during upload/deploy.
- Sender and recipient addresses remain ordinary runtime configuration. No API key value is committed or logged.
- PR gates, merge, production deployment and end-to-end Brevo delivery remain PENDING.


## TELEGRAM VISIBILITY RUNTIME — PRODUCTION PASS — 2026-10-07 (UTC+7)

- PR #794 `fix(telegram): fail closed webhook auth and harden registration` merged to `main` as `dde4fe41ba04a6c5ce64b108e24994dda0ca4266`; production deploy and webhook security gates passed.
- Runtime audit of vehicle `tg-652` found `/show tg-652` was initially claimed by the active Telegram router before the ingest visibility handler. PR #795 (`f90139cf844a1a0568e3b48b6c2b9a4e0d398d02`) added recognition but its early return inside `processTelegramUpdate` did not transfer HTTP ownership to ingest; the first production smoke therefore still returned only the generic receipt. This intermediate patch is superseded by #796.
- PR #796 `fix(telegram): execute show and hide in active webhook router` executes the existing reversible `setCarVisibility` operation directly in the active router, retains `canPublishAutoBlog` chat authorization, writes the existing visibility audit record, and sends explicit Telegram confirmation. No D1/R2 delete is part of the visibility operation.
- PR #796 head `7188927966a54fe5a7d219a390e107ab2ee86022` passed CI, AI Pre-Deploy Audit, SonarQube Cloud, Jev + LLM Decision Cascade and PR deploy validation. It merged as `202a4b1c932dc1971f562e9f5e3b2ec2148609db`.
- Exact merge production run **Deploy Cloudflare Worker #2146 / 37591981552** completed SUCCESS. Exact-merge CI and SonarQube also passed.
- Owner runtime acceptance after deploy: Telegram command `/show tg-652` returned `✅ ĐÃ HIỆN XE tg-652\nTrạng thái: available`. This is the production proof that the command reached the active router and the reversible D1 status mutation succeeded.
- `tg-652` is the AUDI Q7 3.0 TFSI (Model 2017). Visibility testing must not be interpreted as gallery editing or media deletion; the command changes vehicle status only.
- Final status: **CLOSED / PRODUCTION PASS** for the `/show` runtime defect. Future `/hide <car-id>` / `/show <car-id>` changes must preserve authorization, audit logging, reversible status-only mutation, explicit Telegram confirmation, and no D1/R2 destructive operation.
- Remaining unrelated vehicle work is tracked separately; do not reopen this incident for gallery/cover curation.

## TOOL / APP POLICY — FREE-FIRST — 2026-10-04 (UTC+7)

- Owner decision: prioritize free applications, plugins, connectors, open-source tools and existing free quotas whenever they can satisfy the project requirement safely and reliably.
- Do not treat a paid app, paid subscription, paid quota activation or plan upgrade as a required project action when a suitable free path exists. Any paid activation requires separate owner approval.
- Codex Security is currently unavailable under the owner's ChatGPT Free access and is therefore DEFERRED / OPTIONAL, not a blocking remaining action. Do not keep asking the owner to install/connect or upgrade solely for Codex Security.
- Security/review work should first use available free paths such as existing GitHub checks, repository tests/audits, free/open-source tooling and currently available ChatGPT/GitHub capabilities. Record limitations explicitly; do not claim a Codex Security scan unless one actually runs.
- This policy supersedes earlier MASTER lines that describe Codex Security installation/connection as the remaining required user action.

## DEPLOYMENT OWNER ALERTS — PRODUCTION VERIFIED — 2026-10-04 13:10 (UTC+7)

- Owner-authorized integration PR #760 merged as `26491e8a147c44ac1d243b6d78974a43f03166a5` after exact-head CI 37181862489 and AI Pre-Deploy Audit 37181862439 PASS. Local suites: 323 canonical, 250 predeploy, including 8 new alert behavior tests, all PASS.
- Exact-merge CI 37181899282 and Cloudflare deployment 37181899292 PASS. Deployment log confirms API-created version `f6017816-5ea5-49d3-b068-8d9ea8f80ec9`, deployment `0d630150-71f1-4c3d-8b76-9494f8f8e033`, 100% traffic. Existing GitHub → Cloudflare API/SDK path verified; no additional hosting/app or credential connection required for this work.
- Activation workflow 37181899289 PASS: receipt artifact 11295312452 matches source SHA and verified private owner, Telegram message **217**. Public health artifact 11295765843 records homepage, health and D1 catalog checks PASS.
- Real deployment-result workflow 37181963400 PASS: receipt artifact 11296035004 `owner-alert-workflow-37181899292-1`, verified owner and Telegram message **218**. Both acknowledgment ZIPs were downloaded and inspected; this is actual delivery evidence, not a simulated send.
- Exact-code smoke 37181963391, asset 37181963413, reconciliation 37181963405, queue 37181963432, blog CMS 37181963480, Cloudflare inventory 37181963483, homepage 37181963388, admin redirect 37181963471, app assistant 37181963401, app sentiment 37181963469 and business-jets CRM 37181963474 PASS. Gate-success alert runs remain silent.
- Hourly checks at minute 17 are configured on main, with silent healthy checks and at most one site-failure notice per Vietnam day. Future scheduled execution is not yet claimed. Failure paths verified with synthetic tests; production was not deliberately broken. Receipt/crash limitations and no-blind-resend policy remain as documented below.
- Remaining user action: install/connect Codex Security in ChatGPT. Catalog confirmed uninstalled; no scan has run and no paid plan was activated. This checkpoint supersedes feature implementation/deploy/delivery PENDING below.

## DEPLOYMENT OWNER ALERTS — IMPLEMENTED / ACCEPTANCE PENDING — 2026-10-04 (UTC+7)

- Owner authorized immediate GitHub → Cloudflare verification and private Telegram deploy/failure alerts. Read current MASTER and confirmed open PR queue empty before editing. Baseline main `56253d8` CI 37167251986 PASS; latest runtime `91f5e44` deployment 37167067604, smoke 37167125597, asset 37167125595 and reconciliation 37167125588 PASS. Fresh public health returned `ok:true`.
- Reuse existing backup bot secrets and the documented verified private owner, with getChat and returned message chat checks. No new service, paid subscription, Cloudflare credential, customer recipient or production content publication.
- New Production Owner Alerts workflow reports main production deploy success/failure and failed smoke/asset/reconciliation gates. PR/fork triggers excluded; notification code checked out only from protected main. Success text explicitly distinguishes deployment from separate post-deploy gates.
- Hourly at minute 17: bounded read-only checks of homepage UTF-8 brand, health ok, and D1 catalog JSON; two attempts per endpoint. Healthy scheduled runs are quiet; website failure alerts are capped at one per Vietnam local day. GitHub schedules can be delayed and this is not real-time monitoring. Failures remain visible in Actions even when an alert is deduplicated.
- Receipt inventory checked before send; serialized delivery, verified Telegram acknowledgment retained 30 days. Blind reruns/resends disabled; unknown send outcome requires manual reconciliation. A crash after Telegram accepts but before artifact retention is not claimed exactly-once. Activation check sends one initial receipt when this feature lands.
- Targeted behavior tests 8/8 PASS: event/recipient boundaries, D1/HTTP checks, retry bounds, timezone/dedup, receipt checks and uncertain send handling. Required PR CI/audit, merge, production deploy and real Telegram receipt are PENDING.
- Codex Security plugin available but not installed/connected in ChatGPT; user account installation remains OPEN. No Codex Security scan or security certification claimed.

## AI SEARCH / GEO — PRODUCTION ACCEPTANCE PASS — 2026-10-04 (UTC+7)

- Owner-requested bounded integration COMPLETE for website discoverability and offline evaluation. PRs #756 (HTML/catalog/schema), #757 (404 gate/purge), #758 (verified sitemap route repair) merged through the single queue with required exact-head checks. No automatic content generation/publication or paid plan/quota activation.
- Final runtime PR #758 head 23830188... passed CI / Validate 37167015684 and AI Pre-Deploy Audit / Validate 37167015712. Merge 91f5e4469bba6b3e93c1bafcbd40c0c3da54073d passed CI 37167067599 and Deploy Cloudflare Worker 37167067604. Deployment log confirms 100% traffic to version 8966f5c0-fd0c-44e4-982c-3fdbf473f456 and in-place update of phanthuanxtra.com/sitemap.xml to phanthuanxtra-v2. Backup Worker/robots route and unrelated resources preserved.
- Strengthened Production Asset Delivery Gate 37167125595 PASS: bare sitemap no-store/current catalog loc, real missing-car 404/noindex, homepage/Admin/editorial UTF-8 and AVIF/WebP delivery. Fresh bare sitemap acceptance PASS: six current canonical D1 vehicle URLs, three published blog URLs, tg-652 excluded, legacy fabricated /about and category URLs absent. Root cause was route ownership, not cache; this supersedes all PENDING sitemap/route lines below.
- Live checks PASS on tg-714/694/677/605/444/527: initial UTF-8 HTML contains actual owner facts, canonical and JSON-LD price equals public API display price; gallery counts 15/19/17/16/18/24 retained. Hidden tg-652 returns 404; /car alias and homepage /cars link PASS. Unknown facts omitted; no D1 writes or private record exposure by discovery handlers.
- Free tool integration: Promptfoo 0.123.1 MIT is development-only, five actual offline CLI cases PASS with synthetic fixtures, telemetry/update disabled, no model/network provider, zero inference tokens/cost. Route recorder regressions 3/3 PASS, proving unrelated routes preserved/idempotency/error propagation. Baseline full suites 312/312 canonical and 247/247 predeploy PASS before three route tests; required CI/audit reran after final tests. No new production dependency or hosting service. Existing Workers/D1 hosting quotas and marginal request/CPU costs still apply.
- Public entry points: https://phanthuanxtra.com/cars ; https://phanthuanxtra.com/sitemap.xml ; https://phanthuanxtra.com/car.html?id=tg-714 . Existing AI_SEARCH-backed chat preserved. MCP/LangGraph, Langfuse, n8n and Ollama were evaluated/deferred for reasons below; image marketing claim of 62 agents is not adopted as architecture.
- OPEN: Search Console ownership/access, recrawl/indexing and real external AI citation/conversion measurement. HTML/schema readiness is not proof of search ranking or AI citation. Google official AI-features guidance supports ordinary indexable helpful text/internal links, with no special GEO file/schema requirement. Daily research JSON/Telegram receipt unchanged; no duplicate owner send or customer contact.
- Durable checkpoint is this MASTER only; synchronize the same existing document identity after the documentation PR merges.

## GEO SITEMAP ROUTE — ROOT CAUSE VERIFIED / REPAIR PENDING — 2026-10-04 (UTC+7)

- PR #757 merged as 4f79fb61dfbecc0c527ff773ba8ecbe0fd3a58c2 after required CI 37166579638 and AI audit 37166579660 PASS. Exact-merge CI 37166628215, deployment 37166628176, asset gate 37166700290 and all eleven post-deploy reconciliation/smoke/identity/CMS/queue/CRM checks PASS. Six-car live HTML/canonical/price/gallery checks and hidden tg-652 404 PASS.
- Earlier cache diagnosis is superseded by machine evidence: read-only Cloudflare audit run 37166700319, artifact 11289638692, confirms exact route phanthuanxtra.com/sitemap.xml belongs to phanthuanxtra-backup, overriding primary wildcard. Bare URL therefore served legacy invented/category URLs with max-age=3600 while query URL reached primary current public-only sitemap. Cache purge alone could not fix route ownership.
- Bounded repair: add only that known public sitemap exact route to existing primary deployment reconciliation; no route deletion, Worker removal, backup cron/binding change, robots policy change or unrelated route takeover. Read-only audit's managed-route list follows the controller. Production gate now requires the bare sitemap's no-store header and canonical catalog loc, preventing another legacy-route false pass.
- Targeted route recorder tests 3/3 PASS: in-place legacy sitemap PUT, unrelated/robots preservation, idempotency/missing creation, and propagated API failure. Initial PR audit correctly required regression coverage; tests now exercise the actual deployment function without production credentials or side effects.
- Status: exact-head required checks, deployment route-update evidence and plain-URL live acceptance PENDING. Do not claim sitemap/GEO fully complete until this boundary passes. No paid AI activation or duplicate daily Telegram delivery.

## AI SEARCH / GEO — DEPLOYED / ASSET-GATE FOLLOW-UP — 2026-10-04 (UTC+7)

- PR #756 merged as e3de40b457a47f3ede5152d5f9f3a625e7794c6d. Exact head bdf9bab... passed CI / Validate 37166270898 and AI Pre-Deploy Audit / Validate 37166270813. Exact-merge CI 37166322690 and Deploy Cloudflare Worker 37166322704 PASS, including public/UTF-8/R2/publishing lifecycle.
- Live /cars renders six current D1 cars; cache-busted /sitemap.xml includes the same six canonical vehicle URLs plus three published blog URLs. Origin response is no-store. Plain URL retrieval showed an older sitemap, so existing targeted deployment cache purge now also includes /cars and /sitemap.xml; no resource/budget changes.
- Production Asset Delivery Gate 37166385544 failed because its old missing-car assertion demanded HTTP 200 and a loading shell. New intended missing-car response is 404/noindex. Follow-up replaces that stale expectation with explicit 404/noindex/Vietnamese missing message and keeps all Admin, homepage and media checks; adds catalog/sitemap smoke checks. This is not a weakened gate or a runtime rollback.
- Status: GEO runtime deployed; follow-up exact-head required checks, updated production asset gate and full live price/schema acceptance PENDING. External search indexing/citation metrics remain OPEN. Existing AI_SEARCH-backed chat is retained without model, retriever, billing or quota changes.

## AI SEARCH / GEO — IMPLEMENTATION READY — 2026-10-04 (UTC+7)

- Owner requested AI Search/GEO and suitable free tools from the attached ecosystem diagrams. Current main MASTER was read first; single PR queue was empty. Scope is website discoverability and deterministic offline testing, not autonomous marketing publication or paid AI activation.
- Baseline: public vehicle detail was a JavaScript loading shell; static sitemap omitted current D1 vehicles/published blogs. New Worker renders the same escaped vehicle HTML for people and crawlers, canonical links and Car/Offer JSON-LD derived from existing normalized owner data. Unknown prices/mileage are omitted from structured facts. Existing gallery order, price reconciliation and responsive layout are retained.
- New /cars catalog and dynamic /sitemap.xml list only available/reserved/sold cars and published blog slugs; homepage links to /cars. Hidden/draft/missing vehicles return 404; DB failure returns 503 rather than resurrecting static records. Bound queries, primary session, no-store, XSS/URL escaping and no private/customer fields. No migration, model call, billing, quota, credential, robots training-policy or customer-content change.
- FREE-first tools review: Promptfoo MIT integrated as a bounded offline custom provider/config using synthetic SQLite fixtures and pinned 0.123.1 CLI; telemetry/update disabled, installation scripts ignored, no sharing or model/API cost. Actual CLI 5/5 PASS, zero tokens. Reproduce: PROMPTFOO_DISABLE_TELEMETRY=1 PROMPTFOO_DISABLE_UPDATE=1 npm exec --ignore-scripts --yes --package=promptfoo@0.123.1 -- promptfoo eval --config tools/geo-promptfoo.json --no-cache. It is development-only, absent from Worker/dependency lock. Transitive deprecated packages remain a dev supply-chain maintenance consideration; pin is not a vulnerability certification.
- MCP SDK/LangGraph are MIT but add no immediate search indexing benefit and duplicate existing bounded fleet orchestration; defer. Langfuse self-host requires infrastructure/redaction; n8n Sustainable Use License is source-available with commercial restrictions and hosting costs, not unrestricted free OSS; defer. Ollama/llama.cpp remains a separately measured S21 pilot, no phone installation or benchmark claim. No 62-agent deployment based on an image.
- Sources: https://developers.google.com/search/docs/appearance/ai-features ; https://developers.openai.com/api/docs/bots ; https://github.com/promptfoo/promptfoo ; https://github.com/promptfoo/promptfoo/blob/main/LICENSE ; https://www.promptfoo.dev/docs/providers/custom-api/ ; https://www.promptfoo.dev/docs/configuration/telemetry/ ; https://github.com/modelcontextprotocol/typescript-sdk ; https://docs.n8n.io/sustainable-use-license . Google requires ordinary indexability and useful visible content, not special AI files/schema; citation/ranking improvement is not guaranteed.
- Local verification: canonical tests 312/312 PASS; npm predeploy tests 247/247 PASS; Promptfoo CLI 5/5 PASS; diff whitespace clean. Existing Cloudflare hosting/quota still applies; SSR adds bounded D1 reads and Worker CPU, not an unlimited free service.
- Status: PR/required exact-head CI/audit/deployment/live acceptance PENDING. Search Console and external AI citation/traffic measurement OPEN; no search-engine submission or indexing claim. Daily research report/Telegram receipt unchanged; no duplicate send.

## DAILY RESEARCH — TELEGRAM DELIVERY VERIFIED — 2026-10-04 (UTC+7)

- Research PR **#754** merged to protected main as `e2d557bae3b84c513c192eea16919dba9fa3987f` after **CI / Validate 37163597531 PASS** and **AI Pre-Deploy Audit / Validate 37163597527 PASS**.
- **Telegram Upgrade Report run 37163647569 PASS**. Receipt artifact **11288438438** is named `upgrade-delivery-2026-10-04-research`; receipt matches `report_id=2026-10-04-research`, `source_sha=e2d557b...`, `owner_verified=true`, **message_id=207**.
- Owner delivery is complete exactly once for today's report. No blind retry, alternate destination, production upgrade, paid plan/quota change, public publish, customer contact or content-AI enablement occurred.
- Accepted proposals remain research/pilot only: attested llama.cpp Android CPU benchmark after real S21 preflight; Clef-flash zero-write shadow evaluation only after free quota is available; redacted 1% Workers Observability dashboard design. Qwen Image/Viewpoint remains non-commercial research-only.
- This checkpoint supersedes the `PENDING` delivery line in the immediately following research section; the research content itself is unchanged.

## DAILY RESEARCH — REPORT READY / TELEGRAM PENDING — 2026-10-04 (UTC+7)

- Đã đọc bản MASTER mới nhất trên main và bản Library cùng danh tính trước khi nghiên cứu. Báo cáo công khai an toàn `2026-10-04-research` chỉ chứa đề xuất; không có dữ liệu khách, token hoặc bí mật.
- Chọn ba thử nghiệm FREE-first: llama.cpp Android arm64 upstream có attestation cho pilot S21; Cloudflare Clef-flash Apache-2.0 để shadow-test trên fixture Jev; Workers Observability Custom Dashboard với redaction và sampling thấp. Đây là đề xuất thử, không cấp quyền cài đặt, mở quota, đổi budget, thay config production hoặc public publish.
- llama.cpp release `b11381` ngày 2026-10-03 là pre-release, cung cấp asset Android arm64 CPU và attestation upstream. Chỉ thử sau khi owner chạy preflight thật; không suy diễn hiệu năng, SoC/GPU/NPU hoặc pin/nhiệt trước khi đo.
- Clef/Clef-flash được Cloudflare công bố 2026-10-01, weights Apache-2.0 và API có cấu trúc tương thích System One. Benchmark công bố là của nhà cung cấp; Workers AI hiện có blocker free-quota nên chỉ shadow-test zero-write khi quota reset, không tự nâng gói.
- Workers Observability đã hỗ trợ log/trace trong Custom Dashboards. Workers Logs Free hiện nêu 200.000 events/ngày, retention 3 ngày; chính sách giá dự kiến đổi từ 2026-12-01. Bất kỳ pilot sau này phải redaction, không log payload/token/PII, sampling khởi đầu 1% và owner review.
- Qwen-Image-2.1 và Viewpoint Orbit LoRA: kiểm tra ngày 2026-10-04 không thấy thay đổi license đủ mở đường thương mại; vẫn **WATCH / NON-COMMERCIAL RESEARCH ONLY**. Không xem góc sinh ra là bằng chứng hình dáng xe và không dùng cho media marketing.
- Pi Durable/PiHarness mới ở beta và Web Search API tính theo giá provider; không được đưa vào proposals hôm nay vì trùng lặp với queue/idempotency hiện có hoặc không đáp ứng ưu tiên free.
- Nguồn chính thức: https://github.com/ggml-org/llama.cpp/releases/tag/b11381 ; https://developers.cloudflare.com/changelog/ ; https://developers.cloudflare.com/workers/observability/logs/workers-logs/ ; https://huggingface.co/Qwen/Qwen-Image-2.1/blame/main/LICENSE .
- Delivery state: **PENDING**. Chỉ được ghi Telegram SUCCESS sau khi PR merge, workflow `Telegram Upgrade Report` trả đúng report_id và receipt xác nhận owner_verified + message_id.

## S21 ULTRA LOCAL AGENT — DEEP RESEARCH / DEVICE PREFLIGHT READY — 2026-10-03 (UTC+7)

Đã đọc MASTER phiên bản 37 và đối chiếu mã nguồn trên main `d8d492205fdccee773b4eea711d94b00b65a8c69` trước khi thực hiện. Mục tiêu owner: phát triển agent ngay trên S21 Ultra, kết nối PHAN THUẦN XTRA, ưu tiên miễn phí. **Kết luận nghiên cứu: khả thi cho agent văn bản nhỏ chạy theo yêu cầu; chọn mô hình kết hợp điện thoại + API hiện có. Chưa có quyền điều khiển trực tiếp hoặc benchmark trên điện thoại thật.**

### Quyết định kiến trúc

| Phần | Vị trí đề xuất | Phạm vi |
| --- | --- | --- |
| Suy luận văn bản nhỏ | S21 / Termux + llama.cpp trước, JNI trong APK sau | Tóm tắt, viết nháp, phân loại yêu cầu; một model, các vai trò chạy tuần tự |
| Điều phối / bộ kiểm tra | Chương trình cố định trên điện thoại | Kiểm tra schema, nguồn, thời hạn, request_id; model không tự chạy shell |
| Lưu trạng thái cục bộ | SQLite/app-private storage | Brief, checkpoint, retry; cache có thời hạn, dữ liệu tối thiểu |
| Dữ liệu thật / quyền / audit | Worker + D1 của PHAN THUẦN XTRA | Xác thực, giới hạn hành động, chống trùng, đối soát |
| Duyệt / publish | Owner qua Mini App hoặc Admin | Nháp/lịch đề xuất không chuyển thành quyền đăng |
| Nghiên cứu web 07:00 | Automation hiện có + Telegram | Giữ phía máy chủ; điện thoại ngủ/tắt mạng không làm mất lịch |

Đây là thiết kế đề xuất, không phải danh sách thành phần đã cài trên S21. “Nhiều agent” ở giai đoạn này là các vai trò dùng chung một model, không chạy 62 tiến trình/model trên điện thoại. Học thông tin mới bằng tài liệu/cache được chọn và kiểm chứng; chưa fine-tune trên máy.

### Ba hướng đã đối chiếu

1. **Termux + llama.cpp — chọn cho thử nghiệm đầu tiên.** Tài liệu upstream hỗ trợ Android không root và xây bằng CMake. Khởi đầu CPU, context 2.048, output 256 token, 2–4 thread và một request; đây là cấu hình thử đề xuất, không phải số đo tốc độ. Chỉ thử GPU/Vulkan sau khi xác định SoC và driver thật; không áp dụng cấu hình Snapdragon cho máy Exynos/Mali. Không dùng máy để build APK phát hành chính thức.
2. **Google AI Edge Gallery — ứng dụng thử khả năng thiết bị.** Repo chính thức ghi Android 12+, có quản lý model và benchmark; license ứng dụng Apache-2.0. License từng model riêng. Gallery không tự có kết nối PHAN THUẦN XTRA; kết quả chạy ở Gallery không chứng minh API/scope của dự án hoạt động.
3. **Tích hợp native vào APK hiện có — đích dài hạn sau benchmark.** Dùng binding Android của llama.cpp hoặc đánh giá LiteRT với model tương thích. Cần JNI/runtime, quản lý model/checksum, cancel/progress, broker tool và outbox. Không sửa manifest để mở cleartext toàn cục chỉ nhằm nối localhost. Termux CLI pilot dùng trực tiếp engine; native production ưu tiên in-process/IPC được kiểm soát.

Nguồn: [llama.cpp Android](https://github.com/ggml-org/llama.cpp/blob/master/docs/android.md), [Termux](https://github.com/termux/termux-app), [AI Edge Gallery](https://github.com/google-ai-edge/gallery). Termux và plugin phải cùng nguồn ký; không đổi nguồn bằng cách gỡ ứng dụng khi chưa sao lưu dữ liệu.

### Model miễn phí đề xuất và điều chưa biết

- **Qwen3-0.6B-GGUF từ Qwen**: ứng viên khởi đầu nhẹ cho schema/điều hướng và bản nháp ngắn; bản Q8_0 có hướng dẫn chính thức. Chưa đánh giá chất lượng tiếng Việt trên máy anh.
- **Qwen3-1.7B-GGUF từ Qwen**: thử sau nếu RAM trống và độ trễ cho phép; repo snapshot `7fb011e9aee6e4dc7adf8430df9ea8de6a466aa3` liệt kê Q4_K_M khoảng 1,11 GB. Dung lượng file không bằng RAM chạy; còn KV cache, buffer, hệ điều hành và ứng dụng khác. Chốt file/revision/hash trước tải; không tự động lấy bản latest không kiểm soát.
- Hai model text này ghi Apache-2.0, khác license research-only của Qwen-Image-2.1. Có chế độ non-thinking; ưu tiên cho tác vụ ngắn để giảm thời gian/pin, vẫn kiểm tra câu trả lời.
- Chưa biết RAM trống, SoC/driver, nhiệt, dung lượng còn lại của máy anh. Không khẳng định token/giây, chạy NPU hoặc 24/7. Không lấy cấu hình máy tính workspace làm số đo S21.
- Qwen Image/Viewpoint LoRA không phải lựa chọn cho MVP điện thoại: khác bài toán, yêu cầu tài nguyên và quyền thương mại chưa đáp ứng.

Nguồn: [Qwen 0.6B](https://huggingface.co/Qwen/Qwen3-0.6B-GGUF), [Qwen 1.7B](https://huggingface.co/Qwen/Qwen3-1.7B-GGUF), [snapshot Q4](https://huggingface.co/Qwen/Qwen3-1.7B-GGUF/tree/7fb011e9aee6e4dc7adf8430df9ea8de6a466aa3).

### Kết nối hệ thống: có sẵn và còn phải xây

**Đã xác minh từ mã nguồn hiện tại:**

- `android/.../ApiClient.java` sử dụng HTTPS App API; `SecureTokenStore.java` dùng Android Keystore + AES/GCM. Manifest tắt cleartext và backup ứng dụng. Các lớp này hỗ trợ APK operator hiện có, chưa phải mobile autonomous agent.
- `/api/app/v1/login` cấp phiên Admin; App API có dashboard, xe, lead, bài viết và assistant. **Không giao phiên Admin hoặc APP_API_TOKEN cho vòng lặp model**, vì auth hiện tại không tạo scope chỉ đọc riêng cho từng agent. `/assistant` là suy luận server có quota, không phải model offline.
- Contract `/api/agents/content/v1` đã có create-draft, prepare-schedule, GET contract và GET requests/{request_id}; credential riêng writer/scheduler, pipeline, mặc định 15 phút/tối đa 1 giờ. Đây là phần kết nối phù hợp cho nội dung do model cục bộ chuẩn bị.
- `CONTENT_RUNNER_LIVE_ENABLED=0` chặn runner gọi model server; việc local model tạo copy rồi gọi atomic create-draft là luồng riêng. Nó vẫn cần credential hợp lệ, fleet enabled và kiểm tra contract; không có nghĩa được bỏ qua auth hoặc quota của các endpoint khác.
- `scripts/agent-reach.ps1` hiện dành cho Windows Python Launcher. Chưa có port Termux; không coi script đó là agent Android đã chạy.

**Cần xây sau preflight đạt:** phiên thiết bị có đăng ký/thu hồi; scope đọc dữ liệu tối thiểu theo tác vụ; giao diện cấp credential ngắn hạn bằng phiên owner; mobile tool broker với allowlist cố định; outbox/reconciliation; UI tiến trình/dừng; xử lý mất mạng và rotation. Không thêm API tên giả rồi hướng dẫn gọi như đã triển khai.

Luồng thử đầu tiên: owner nhập brief không nhạy cảm → model cục bộ tạo JSON → bộ kiểm tra schema/độ dài/nguồn → owner xem → credential agent-11 tạo nháp riêng tư → GET đối soát cùng request_id → owner review ở Mini App. Đề xuất lịch chỉ dùng credential agent-19 riêng. Không thêm publish vào toolset. Đọc/sửa CRM thật chỉ mở sau hợp đồng scope riêng; không sao chép toàn bộ D1 xuống máy.

Keystore bảo vệ khóa nhưng không làm cho app đã bị chiếm quyền trở nên an toàn tuyệt đối. Termux file chmod 600 không tương đương hardware-backed Keystore. Không lưu token vào prompt, log, clipboard lâu dài hoặc thư mục Downloads. Nguồn: [Android Keystore](https://developer.android.com/privacy-and-security/keystore).

### Pin, nền và hoạt động offline

Termux upstream cảnh báo Android 12+ có thể dừng tiến trình CPU cao/phantom; WorkManager chạy theo điều kiện hệ thống, không đảm bảo giờ chính xác. Vì vậy MVP chạy khi owner mở tác vụ, có nút dừng, checkpoint trước/sau hành động; không buộc wake-lock suốt ngày. Ứng dụng native có thể dùng foreground work với thông báo khi phù hợp; việc còn sống nền phải được kiểm chứng trên máy thật. Giới hạn nền Android 16 trong tài liệu không được áp dụng như kết luận về máy hiện tại.

Offline chỉ bao gồm model, brief và cache đã có. Tìm web mới, đọc dữ liệu server, đồng bộ nháp và Telegram cần mạng. Không tự chuyển sang API trả phí khi offline/model lỗi. “Free” vẫn dùng pin, lưu trữ, băng thông và quota dịch vụ đang có.

Nguồn: [Android WorkManager](https://developer.android.com/develop/background-work/background-tasks/persistent/getting-started/define-work), [long-running work](https://developer.android.com/develop/background-work/background-tasks/persistent/how-to/long-running).

### Công cụ sẵn sàng cho S21 và điều kiện nghiệm thu

Đã chuẩn bị `research/s21-preflight.py` (Python standard library). Mặc định chỉ xuất JSON phần cứng tổng hợp: model/SoC/ABI/Android, RAM, dung lượng trống và tool hiện có. Không lấy serial/IMEI, tài khoản, token, ảnh hay danh bạ. `--check-api` chỉ GET public `https://phanthuanxtra.com/api/app/v1/health`, chặn redirect, timeout 10 giây, giới hạn response; không đăng nhập, gọi model, cài package hoặc gửi dữ liệu thiết bị.

Trong Termux đã có Python, tải script từ commit dự án được kiểm chứng vào thư mục làm việc rồi chạy:

```sh
python s21-preflight.py
python s21-preflight.py --check-api
```

Không pipe mã tải từ mạng trực tiếp vào shell. Nếu Python chưa có, cài từ kho Termux chính thức trước. Báo cáo GET health thành công chỉ chứng minh kết nối public, không chứng minh phiên auth hay inference.

Nghiệm thu theo thứ tự:

1. **Preflight thiết bị:** có model/SoC/ABI/RAM thật; đủ dung lượng; health thử trên chính điện thoại. Điểm này hiện **OPEN** vì chưa có kết quả từ S21.
2. **Local engine:** một model/revision/hash, 20 brief tiếng Việt không chứa dữ liệu khách; ghi load time, first-token time, tổng thời gian, bộ nhớ, nhiệt/pin và tỷ lệ JSON hợp lệ. Mục tiêu thử: không crash, owner chấp nhận độ trễ; mọi JSON sai bị chặn trước API. Chưa có số đo PASS.
3. **Nháp qua scope:** một draft riêng tư, retry cùng request_id trả cùng artifact, credential hết hạn bị từ chối, zero public publish. Kiểm tra network loss trước/sau commit; không retry POST mù.
4. **Foreground/resume:** khóa màn hình, mở lại, mất Wi-Fi và đổi mạng; không nhân đôi artifact hoặc giữ lease vô hạn.
5. **Native APK:** chỉ sau các bước trên; build/sign/CI trên GitHub, cài và quan sát trực tiếp S21; ghi version/hash và kết quả vào MASTER.

**Kết quả thực thi trong workspace:** 5 kiểm thử preflight PASS, chạy offline trên Linux trả android_detected=false đúng như thực tế. Probe public từ workspace bị lỗi network/TLS/JSON tổng quát; không suy diễn thành site down hoặc điện thoại kết nối thất bại. Không chạy model hoặc cài gì trên S21. Trạng thái: **nghiên cứu + preflight sẵn sàng; cài đặt/benchmark/kết nối có auth trên thiết bị còn OPEN**.

## QWEN REVIEW DELIVERY / DAILY COST BOUNDARY — VERIFIED 2026-10-03

- Research **PR #751** merged `2bab3254e11701c3bd3f1e7ae24fff1936e823ab` after required CI/audit passed. Exact-merge CI **37123590248 PASS**. **Telegram Upgrade Report 37123590263 PASS**, artifact **11273628372**, report `2026-10-03-research`, verified private owner **message 203** confirms the actual Qwen review brief was delivered.
- Review remains WATCH / non-commercial research only; commercial media integration BLOCKED_BY_LICENSE. No local GPU inference or free demo quota test is claimed. FREE FIRST and explicit Qwen watch instructions are saved in the existing enabled 07:00 daily automation.
- Research JSON changes previously matched the broad production-deploy push filter. Add `research/**` to its paths-ignore, alongside existing Markdown exclusions; regression assertion ensures report-only updates do not invoke application deployment. Delivery and required PR CI/audit remain active. Application/source/workflow changes still deploy normally.
- Current master is the single project Markdown file, and this checkpoint records delivery after success. Original activation receipt (message 202) and the new research receipt are distinct; no duplicate-send retry was used.

## QWEN IMAGE 2.1 VIEWPOINT ORBIT LoRA — REVIEW / WATCH ONLY — 2026-10-03 (UTC+7)

Read current MASTER before review. Owner specifically requests this candidate; daily research automation **6ac08e9e99008191a00060afeceb181a** was successfully updated to track it, retaining FREE FIRST and owner-only Telegram proposals.

- Primary model card: https://huggingface.co/ML-Intern-lab/Qwen-Image-2.1-viewpoint-orbit-LoRA . Adapter takes one RGBA subject image and a relative camera instruction, returning RGBA. Author documents 768px/40-step evaluation, a split-key adapter for Diffusers and a pinned library commit. Small rotations are more faithful; details may drift at larger angles. Household scanned-object training does not establish vehicle fidelity.
- Licenses verified directly: adapter https://huggingface.co/ML-Intern-lab/Qwen-Image-2.1-viewpoint-orbit-LoRA/blob/main/LICENSE and base https://huggingface.co/Qwen/Qwen-Image-2.1/blob/main/LICENSE . Both specify Qwen Research License, non-commercial research/evaluation; commercial use requires separate permission. **Commercial media integration remains BLOCKED_BY_LICENSE.** Free weight access is not unrestricted commercial permission.
- Base model https://huggingface.co/Qwen/Qwen-Image-2.1 is 7B/BF16 and its demonstrated pipeline uses CUDA, with optional CPU offload. The LoRA card reports A100-80GB for training; this is not a minimum inference VRAM specification. Minimum VRAM, S21 feasibility and speed are unverified. Inference GPU work belongs outside the current Workers runtime; this is an architecture assessment, not a deployment benchmark.
- Author demo https://huggingface.co/spaces/ML-Intern-lab/Qwen-Image-2.1-viewpoint-orbit-LoRA is listed as Running on Zero. Actual anonymous free allowance/availability and user-image retention were not tested; no unlimited-free-service claim. No model or remote code downloaded/run, no customer/vehicle image uploaded, no billing or production change.
- Decision: **WATCH / non-commercial research evaluation only**. Potential future use is illustrative viewpoint studies, subject to licensing and hardware proof. Generated unseen sides cannot establish real vehicle details and must not replace genuine listing photos. Next research checks: license changes, free demo constraints, pinned reproducibility, identity/alpha consistency and cost before any proposal to integrate.
- First research brief prepared in `research/upgrade-report.json`; Telegram receipt must be checked after protected merge before claiming this review delivered. This supplements the already verified activation message 202; tomorrow's scheduled research remains future work.

## DAILY RESEARCH — TELEGRAM VERIFIED / FREE FIRST — 2026-10-03 (UTC+7)

- Existing automation **6ac08e9e99008191a00060afeceb181a** updated successfully and enabled as **PHAN THUẦN XTRA Research**. Schedule retained **07:00 daily, Asia/Ho_Chi_Minh**, next scheduled date **2026-10-04**. It reads current MASTER, researches current primary internet sources, compares against current stack/history and proposes at most three upgrades; it records research and delivery evidence in this sole Markdown file.
- **FREE FIRST** is now explicit in the automation: prefer free/open-source or existing stack; verify free-tier limits, commercial license, hosting/operation costs and quota. No card-required trials, paid features, subscription upgrades or budget changes are authorized. If free options do not fit, state the blocker; paid alternatives remain secondary proposals requiring owner approval.
- Delivery implementation **PR #749**, merge **`b93bf688fde2d12e469e8d7dd12325be41561a20`**, uses the protected-main report bridge described below. **Telegram Upgrade Report run 37123197602 PASS**, receipt artifact **11273373513**, report `2026-10-03-activation`, verified private owner **message 202**. This confirms connection/delivery only; it is not evidence that tomorrow's research has already run.
- Automation prompt updated only after actual Telegram delivery succeeded. Future runs submit the dated public-safe JSON brief and MASTER evidence through protected PR/CI/merge, then verify receipt and record outcome. Failed access/CI/delivery remains BLOCKED and is reported rather than silently claimed successful.
- Six targeted behavior tests PASS; required PR CI and AI audit PASS; exact-merge CI **37123197588** and deployment **37123197578** PASS. Report writing/granted delivery does not grant production upgrade, public publish, customer contact or paid billing permission.

## DAILY AI UPGRADE RESEARCH / TELEGRAM — 2026-10-03 (UTC+7)

Owner requests internet research every day and proposals delivered to the private owner Telegram chat. Reuse existing AI Tool Radar automation **6ac08e9e99008191a00060afeceb181a**, current schedule **07:00 Asia/Ho_Chi_Minh**, instead of creating a duplicate.

- Research execution reads latest MASTER first; uses current primary sources and verifies release dates, runtime fit, license, cost, security and overlap with existing capabilities. At most three actionable proposals; if none qualifies, explicitly report no worthwhile upgrade. Research conclusions do not authorize installation, paid subscriptions, live AI enablement or public publishing.
- Delivery bridge **Telegram Upgrade Report** watches only main changes to `research/upgrade-report.json`. Production bot credentials remain in existing GitHub secrets. The sender verifies the destination is the known owner's private chat before sending and verifies Telegram's returned chat/message ID. Receipt artifacts are retained 30 days. Report text is plain text, bounded to 3,800 characters, with HTTPS sources. No raw customer or credential data belongs in reports.
- JSON schema 1: fields `schema,id,date,kind,summary,proposals`. Local date YYYY-MM-DD; id = date + "-research" (or "-activation" only for connection testing). Summary ≤400 chars; 0–3 proposals with title≤120, benefit≤220, cost≤160, risk≤160, next_step≤200 and 1–2 HTTPS source URLs≤250. No extra fields. If no proposal qualifies, send a truthful summary with an empty proposals list.
- The researching automation may update only report data and research evidence in MASTER through normal branch/PR/check/merge. Main merge triggers owner delivery. It must inspect delivery run and receipt before claiming Telegram success, then record outcome in MASTER without changing the report again. It must reconcile an existing date/report before creating another.
- Existing receipt prevents duplicate sends; automatic rerun is blocked after attempt one. A timeout/unknown Telegram result requires reconciliation, never blind retry. Exactly-once delivery across a crash before receipt retention is not claimed. Only current local-day reports are sent; stale reports fail.
- Implementation verification: six targeted sender tests PASS (schema/limits, private owner, acknowledgment, duplicate receipt, timeout/no retry). Initial activation message is a connection test, not a completed research report. **Delivery verification and automation prompt update are pending until the protected merge and actual receipt succeed.**

## HỢP NHẤT FILE MARKDOWN — 2026-10-03 (UTC+7)

Đã đọc MASTER mới nhất trước khi thực thi. Theo yêu cầu owner, hợp nhất nguyên nội dung **11 file .md phụ** vào phụ lục cuối MASTER, kiểm tra từng nội dung được giữ đầy đủ rồi xóa các file nguồn trong repository. Repository chỉ còn **MASTER_PROJECT_STATUS.md** là file Markdown được quản lý. Test Agent-Reach đọc nội dung hợp nhất từ MASTER; các tham chiếu hướng dẫn hiện hành trỏ về phụ lục. Mã nguồn ứng dụng, cấu hình, dữ liệu và tài liệu không phải .md giữ nguyên. Lịch sử Git giữ khả năng khôi phục tài liệu nguồn. Các mục nghiệm thu còn mở không được đánh dấu DONE bởi thao tác hợp nhất này.

## QUY ĐỊNH BẮT BUỘC — ĐỌC TRƯỚC, GHI SAU THỰC THI

Áp dụng từ 2026-10-03 theo yêu cầu owner cho mọi công việc PHAN THUẦN XTRA.

1. **Trước khi thực thi:** đọc bản cập nhật mới nhất của `MASTER_PROJECT_STATUS.md`; đối chiếu checkpoint mới nhất, phạm vi được phép, trạng thái còn mở và bằng chứng. Không dùng bản cũ để ra quyết định. Nếu file thay đổi trong lúc làm hoặc chuyển sang tác vụ mới, đọc lại phần cập nhật liên quan trước bước tiếp theo.
2. **Thực thi theo trạng thái đã đọc:** xử lý từng hạng mục, giữ ranh giới quyền hạn và dữ liệu. Chuẩn bị nháp/lịch không cấp quyền publish; mô phỏng không thay thế nghiệm thu thiết bị, khách hàng hoặc AI thật.
3. **Sau khi thực thi thành công:** ghi vào chính MASTER thời điểm UTC+7, hạng mục/thay đổi, kết quả, kiểm tra và bằng chứng liên quan (PR/commit/run/artifact/receipt nếu có), giới hạn và việc còn lại. Chỉ ghi DONE/CLOSED khi có bằng chứng thành công. Nếu thất bại/bị chặn, giữ trạng thái OPEN/BLOCKED và ghi nguyên nhân.
4. **Hợp nhất và đồng bộ:** cập nhật bản MASTER trong repository và bản tài liệu cùng danh tính; giữ lịch sử. Checkpoint mới nhất được ưu tiên khi mâu thuẫn với kế hoạch cũ. Tài liệu phụ chỉ bổ trợ, không thay thế nguồn trạng thái này.
5. **Trước khi báo hoàn thành:** xác nhận cập nhật MASTER đã lưu thành công; với thay đổi repository, hoàn thành CI/merge và các kiểm chứng triển khai cần thiết. Không ghi khóa bí mật hoặc dữ liệu riêng tư của khách hàng vào MASTER.

### Ghi nhận thực thi thành công — 2026-10-03

Đã đọc MASTER phiên bản 33 trước khi chỉnh sửa; hợp nhất quy định trên và giữ nguyên các checkpoint/bằng chứng. Hạng mục đối soát trước đó đã merge **PR #746**, commit `5261d633c0a0c60a0cccaeb94e304a0d76a2b701`; CI trên main **37121565664** PASS. Đây là cập nhật quy trình tài liệu, không đóng các mục S21, khách hàng thật, quota AI hoặc phạm vi backup còn thiếu.

## 0.0G REMAINING-WORK RECONCILIATION — 2026-10-03 18:58 (UTC+7)

Latest checkpoint distinguishes completed virtual/release work from evidence that still requires real operation.

- **Backup cleanup CLOSED:** PR #745 merged as `aabac2ad307c3933c0b161b41c52371800a61da4`; exact-merge CI **37115210006**, deployment **37115210027**, and all twelve post-deploy verifiers succeeded. One-shot trigger/marker removed; daily 07:00 UTC+7 and manual backups preserved. Telegram receipts and independent Gate 14 restore remain recorded in 0.0F.
- **Fresh read-only infrastructure check PASS:** Cloudflare inventory run **37115272197**, rerun job **111197851659**, at **18:58:30 UTC+7**, artifact **11273159005**, contract CF-MACHINE-010. Mutations=0; binding redaction PASS. D1 inventory: luxury-ui-db, chatbot-db, phanthuanxtra-db; R2: ai-pt-xtra-apk, phanthuanxtra-images, phanthuanxtra-media. All four vehicle/memory queues and DLQs reported backlog=0. This observation does not prove export of queue or auxiliary database/storage data.
- **Offline runner revalidated PASS** on current main: generate → draft → schedule → done; lost response reconciled; same artifact replay; one simulated call, zero real AI calls, one private draft/proposal and **zero pending publication jobs**.
- **Real AI readiness BLOCKED_BY_QUOTA:** latest recorded provider probe in deploy job **111180658575**, **17:05:45 UTC+7**, returned HTTP 429 / Cloudflare **4006**, daily free allocation 10,000 neurons exhausted. No later successful provider probe is claimed. CONTENT_RUNNER_LIVE_ENABLED remains 0; no billing upgrade, budget change, live enablement or public publish was performed.
- Added **docs/remaining-acceptance.md** with exact S21 observations, real-customer evidence sequence, quota/live-run prerequisites, bounded limits, reconciliation and rollback, plus explicit backup-scope gaps. The checklist is prepared, not fabricated acceptance evidence.

| Remaining item | Current state | Required completion evidence |
| --- | --- | --- |
| S21 Content Review and Customer Care proposal/delete controls | OPEN — physical device evidence unavailable | Owner observes actual device/session, including cancel-delete; records masked screenshots/video and results |
| Genuine Customer Care E2E | OPEN — no verified real interaction supplied | Genuine interaction → linked customer/lead → Memory Brain → proposal → owner decision/follow-up → audit |
| Real content AI readiness/live bounded run | BLOCKED_BY_QUOTA at latest probe; live off | Fresh successful provider probe, separately reviewed configuration and one bounded private run; zero publication jobs |
| Auxiliary D1/R2, KV/DO and secret recovery coverage | OUTSIDE current verified backup scope | Component-specific exports, secure credential recovery and independent restore evidence; no whole-account completeness claim |

No code/CI/deployment blocker remains in the delivered virtual scope. Native APK distribution, Headroom shadow and Memory Brain 2 remain optional tracks rather than prerequisites for this release. Historical TODOs below do not reopen items superseded by newer verified checkpoints.

## 0.0F OWNER TELEGRAM BACKUP — DELIVERY AND RESTORE VERIFIED — 2026-10-03 (UTC+7)

- Owner-authorized immediate backup completed at 16:59 UTC+7. **Full System Backup 37114688475**, job **111179092047**, source **`9a37cdf93fb97605864334f3ad4a61c40bc4f469`** (PR **#744**) succeeded. Telegram destination was verified as the configured owner's private chat before collection and after every send.
- Telegram acknowledged **two archive parts and six supporting documents**, message IDs **193–200**, plus completion message **201**. Delivery receipt artifact **11270333241** records the exact source/run and every document acknowledgment. Download both parts, `backup-parts.json`, and `restore-backup.py` together; Python 3.12+ `python restore-backup.py` validates part and joined SHA-256 checksums before safe extraction.
- Verified scope: current repository source snapshot; primary production D1 SQL with actual rows; **477 R2 objects**; raw bundles and redacted settings for all **six known related Workers**; main Worker bindings/deployments and zone/routes. This is not a complete Cloudflare account-state backup: other Worker databases, KV, Durable Object storage, in-flight queues and secret values are excluded. D1 has a provider-consistent snapshot; R2 is collected over an interval, without a cross-service atomic-snapshot claim.
- Independent **Gate 14 restore 37114866763**, job **111179619420**, succeeded: archive/internal checksums, clean SQLite import, integrity_check=ok, **58 tables**, required row evidence and R2 manifest/file-count verification. Counts include cars=7, car_images=133, posts=4, leads=18 and customers=1. No restore or deletion was performed against production.
- Fixed the prior schema-only D1 serializer by using native D1 SQL export and requiring actual row evidence. Fixed today's 51,259,472-byte Telegram oversize failure with verified 40 MiB archive parts. GitHub fallback artifact **11270283371** is **AES-256-GCM encrypted**, retained 30 days; plaintext customer backup is not uploaded to the public repository. Telegram restoration is self-contained; decrypting the fallback requires the backup credential used at creation.
- Validation: focused backup tests **7/7**, canonical **300/300**, npm **235/235** PASS. Exact backup-source CI **37114688462**, production deployment **37114688439**, and all twelve post-deploy gates succeeded. Backup delivery does not enable AI, content scheduling or public publishing; **CONTENT_RUNNER_LIVE_ENABLED=0** remains the existing boundary.
- The bounded one-shot push trigger and request marker are removed in this closure. Manual backup and the daily **07:00 UTC+7** schedule remain available.

## 0.0E OWNER CONTENT REVIEW — PRODUCTION GREEN — 2026-10-03 (UTC+7)

This checkpoint closes the authorized Content Draft / Scheduling virtual implementation and owner review release. Preparation and review do not grant public publishing authority.

- Implemented shared responsive **Admin → Nội dung / Lịch** and **Telegram /customerapp → Nội dung**. Owners see private drafts, current proposal validity, sanitized runner checkpoints/errors and daily reserved-call budget; pipeline filtering and bounded cursor pagination hide deleted CI fixtures while retaining ledgers.
- Review requires a signed Admin session or fresh signed Telegram owner initData. Delegated agent, raw secret and CMS credentials cannot authenticate owner review. Audit actor comes from authenticated identity. Private copy edits preserve slug, cover, draft status and original preparation ledger, with exact-revision checks inside the D1 transaction.
- Accepted/dismissed decisions record immutable readiness against target + revision + proposed time. Old reviews become inactive after editing; stale/deleted/published/elapsed artifacts are blocked. Migration **0033_content_owner_review.sql** adds atomic operation/review/audit ledgers, canonical payload fingerprints and safe retry/lost-response reconciliation. No pending publication job, public publication or automatic schedule is created; owner review remains usable while agent execution is disabled.
- Release lineage: owner review **PR #740** merged `fc33faa6603981e6cbb79671de506fca16412932`; mobile header fix **#741** merged `e040c2bbd51673aa4d4dcd77bcd9ffa72f083a97`; release reliability fix **#742** merged **`e32316f37753accf9161e2f25043abe9995a6f29`**. Final required PR checks succeeded at `b56ee4c4e9ab856d2776d35522c1f2509541a72b`; exact final-merge CI **37113011464** and deployment **37113011490** succeeded.
- Production migration 0033 applied in deployment **37112388452**. Final Worker version **`6e725eb7-4d8a-48de-9952-4c1ea5fd63a1`**, deployment **`cdcf55b9-50f8-4585-898b-e1c5405758ec`**, API-created **100% traffic**; Wrangler production path was not used. **CONTENT_RUNNER_LIVE_ENABLED=0** remains verified by the production runner gate. Fleet remains 62 agents / 8 bounded executing agents; Publisher/Distributor were not promoted.
- Validation: canonical **296/296**, npm **230/230**, gateway **19/19**, focused owner review **16/16** PASS. Offline runner simulation again completed generate → draft → schedule → done, reconciled lost response and replayed the same artifact: one simulated inference, **zero real AI calls**, one private draft/proposal and **zero pending publication jobs**.
- Real Chromium browser proof at 360px passed on Mini App and both Admin surfaces: private edit, readiness review, lost-response reconciliation, stale proposal, safe literal text DOM, audit history and no horizontal overflow. CI **37112487407**, artifact **11270785139** (five screenshots), records the fixed Mini App header; screenshots were downloaded and visually inspected. Header remains in document flow on Content Review, preventing overlap after edits. This is browser simulation, not physical S21 acceptance.
- Release verification exposed and fixed a synthetic credential wall-clock boundary failure; initial fixture/isolation credentials use the simulation instant and renewed credentials remain compatible with nested artifact auth. A separate Live Chat gate observed a truncated basic hotline model answer; bounded official hotline/phone questions now use existing authoritative contact copy with zero inference. Final hotline production evidence is complete with `ai_model:null`; no test assertion was weakened.
- Exact final-code Blog CMS gate **37113076852**, job **111174598195**, passed **OWNER CONTENT REVIEW PRODUCTION**: owner-only list/detail, UTF-8 private edit, decision/replay/audit, stale/concurrent rejection, delivered Admin/Mini App assets, no public publish. Atomic draft/proposal permissions and live-off preview also passed. Temporary private fixtures were deleted; audit ledgers retained.

All twelve exact-final-code post-deploy gates succeeded:

| Gate | Run |
| --- | --- |
| Admin Redirect Verify | 37113076845 |
| App Assistant Production E2E | 37113076758 |
| App Sentiment Production E2E | 37113076763 |
| Blog CMS Production E2E | 37113076852 |
| Business Jets CRM Production E2E | 37113076778 |
| Cloudflare Machine Inventory Audit | 37113076748 |
| Homepage Canonical Verify | 37113076777 |
| Live Chat AI Identity Verify | 37113076735 |
| Production Asset Delivery Gate | 37113076797 |
| Production Smoke Gate-15 | 37113076749 |
| QUEUE-01 Production E2E Origin | 37113076863 |
| Stage 3 Production Reconciliation | 37113076879 |

Remaining evidence outside the completed virtual release:

1. **Physical S21 observation** of Content Review and the existing Customer Care proposal/delete controls with the genuine owner session. CI mobile viewport screenshots do not substitute for device observation.
2. **Genuine customer care E2E** from a real customer interaction. No fabricated customer/lead was created to mark this complete.
3. **Real content AI readiness/quota and bounded provider evidence** before a separately reviewed live-runner configuration change. Content preparation remains live-off; public publishing remains a distinct explicit owner action.

There is no unresolved code/CI/deployment blocker in this completed scope. Native APK distribution, Headroom shadow evaluation and Memory Brain 2 evaluation remain separate optional tracks. See `MASTER_PROJECT_STATUS.md` (phụ lục: content-owner-review) for use and execution boundaries.

## 0.0D CONTENT RUNNER — OFFLINE SIMULATION COMPLETE — 2026-10-03 (UTC+7)

This checkpoint supersedes the earlier statement that no content-generation runner exists. Public publishing authority is unchanged.

- Baseline: main `cf7959a1d3d17e02c5f2e6ccc9cf925fd293fbc4` (documentation closure #737), production code #736 `e4b735b456b8100fe594b21c90b99f105923e860`. The 62-agent fleet still has eight bounded executing agents; runner orchestrates existing agent-11 and agent-19, without promoting Publisher/Distributor.
- Implemented `content-runner/1.0.0`: authenticated brief -> bounded model generation -> private draft -> schedule proposal -> completion. Each POST advances one durable checkpoint; a bounded client resumes automatically with the same brief/request_id. GET `/api/agents/content/v1/runs/{request_id}` reconciles current artifact availability/revision/time. Same request with a changed brief conflicts. Deleted drafts are never resurrected.
- Separate writer and scheduler action credentials are required in the same pipeline for every runner request. No owner credential is passed to the runner; scoped credentials are never stored in D1, prompts, audits or client output. Expiry pauses processing; owner-renewed scopes can resume the saved generation. There is no approve/publish endpoint, automatic cron trigger, or insertion into pending publication jobs.
- Migration `0032_content_prep_runner.sql` adds run checkpoints and model-call reservations. Primary-session reads, compare-and-set leases and fencing prevent competing workers overwriting checkpoints. Artifacts retain the existing atomic idempotency/audit contract. Checkpoint and audit commit together; a lost pre-checkpoint generation may require another bounded call, so exactly-once external inference is not claimed.
- Hard limits: three attempts per stage, three reserved model calls per run, twelve reserved calls per UTC day globally, 1,200 output tokens per call, 25-second model wait, two-minute lease. Unknown/timeout outcomes count toward the budget. One existing primary model is used without an automatic fallback chain. Quota/timeouts get bounded exponential retry; invalid output, exhausted budgets/attempts and stale artifacts block safely. Source/instruction are bounded and field/model/status/publish overrides are rejected.
- Production configuration explicitly keeps **CONTENT_RUNNER_LIVE_ENABLED=0**. The Cloudflare API deployment controller overrides any inherited enablement with this reviewed configuration. The existing fleet kill switch also blocks runner/preview. Deterministic source-only preview makes no provider call, run ledger, draft or proposal write.
- **Offline simulation COMPLETE**: `npm run simulate:content` used an in-memory SQLite database, fake AI binding and virtual retry clock. It completed all four checkpoints, reconciled a deliberately lost response and replayed the same artifact. Result: one simulated inference, **zero real AI calls**, one private draft, one proposed schedule, zero pending publication jobs; running publisher cron after the proposed due time did not publish the draft. No real customer or production record was fabricated by the simulator.
- New targeted verification: sixteen runner behavior tests plus one deployment-binding test PASS. Coverage includes dual scope/pipeline/expiry and renewal, preview/live-off, concurrent requests, abandoned lease/fencing, quota/timeout/daily budget, changed brief, invalid model output, response loss, checkpoint rollback, owner edits/deletion and public denial. Canonical regression is 278/278 PASS; npm predeploy regression 213/213 PASS; gateway 19/19 PASS. UTF-8 private fixtures preserve Vietnamese copy.
- Release checkpoint: **PRODUCTION GREEN; VIRTUAL PRIORITY COMPLETE**. PR #738 merged as `831a6136f3965e2309e3ef028645aaf6151684c2` after required CI / Validate and AI Pre-Deploy Audit / Validate succeeded. Exact-merge CI `37107912016` and Deploy Cloudflare Worker `37107912039` succeeded. Migration 0032 applied through Cloudflare API/SDK. Worker version `5a007a30-9391-4d3a-97d1-98297ffc0bc9`, deployment `578a0f0e-f233-4f37-84bb-7dc79de725f1`, API-created 100% traffic; Wrangler production path NOT USED. Production AI generation remains deliberately disabled and is not claimed as tested.
- Exact-SHA production proof: Blog CMS run `37107973176`, job `111160118896`, at 2026-10-03 14:55 UTC+7 reported **CONTENT RUNNER PRODUCTION: deterministic UTF-8 preview; zero model calls/artifacts; live runner disabled; dual scope required: PASS**. Preview reconciliation returned 404 (no run ledger); live run POST returned 503/LIVE_RUNNER_DISABLED. Atomic private draft/proposal, replay/conflict, reconciliation, isolation and denial of public/Admin/CMS publication PASS. Temporary private draft cleanup PASS, audit retained.
- All twelve observed post-deploy workflows on this code SHA succeeded: Blog CMS `37107973176`; Homepage Canonical `37107973121`; Admin Redirect `37107973180`; QUEUE-01 `37107973116`; Live Chat AI Identity `37107973106`; Asset Delivery `37107973143`; App Sentiment `37107973132`; App Assistant `37107973126`; Business Jets CRM `37107973091`; Stage 3 Reconciliation `37107973161`; Cloudflare Machine Inventory `37107973130`; Smoke Gate-15 `37107973118`. Existing UTF-8, R2 and draft-image publishing lifecycle deploy checks also succeeded.
- Operator instructions: `MASTER_PROJECT_STATUS.md` (phụ lục: content-runner); virtual command `npm run simulate:content`; delegated preview `node scripts/run-content-brief.mjs brief.json --preview` with only the two scoped credential environment variables.
- Remaining outside this completed virtual priority: owner-approved quota/readiness and a separately reviewed configuration change before real AI preparation; any public publish decision remains a distinct owner action. Physical S21 proposal/delete-control observation and genuine real-customer care evidence remain separate acceptance items; they cannot be completed by synthetic simulation. No active release blocker is inferred from those evidence items.


## 0.0C ATOMIC CONTENT DRAFT / SCHEDULING CONTRACT — 2026-10-03 (UTC+7)

Latest checkpoint takes precedence over historical promotion counts below.

- Verified baseline: PR #735 merged at `85672432562718fcb68ff36ddf98fa46a558645b`; CI run `37104591631`, Cloudflare deploy `37104591626` and all 12 observed post-deploy verifiers succeeded. Lead Intake remains part of the 6-agent execution baseline.
- Added two atomic capabilities within the existing 62-agent fleet: **agent-11 Brand Voice Writer / create-draft** and **agent-19 Publishing Scheduler / prepare-schedule**. Fleet version is `1.3.0`; executing set is agent-11, agent-19, agent-26, agent-27, agent-28, agent-31, agent-33 and agent-34 (8/62). Atomic means one narrowly scoped action and one D1 transaction for its artifact, request ledger and audit; it does not mean a new permanent service or public publishing authority.
- Contract `content-prep/1.0.0` uses `/api/agents/content/v1`. Owner issues separate `ptxprep1` credentials bound to agent/action + `pipeline_id`, with a default 15-minute lifetime and a hard one-hour maximum. Domain-separated HMAC signing uses the existing owner signing secret without revealing it to agents. Scoped credentials are rejected by Admin, CMS and public publishing authentication; they cannot issue further credentials.
- Migration `0031_content_prep_contract.sql` adds `xtra_content_prep_requests`. `request_id` is scoped to a pipeline; SHA-256 fingerprints bind normalized payload and action. Same key/payload returns the canonical artifact; conflicting reuse returns HTTP 409. Claim + private draft or schedule proposal + audit + completion commit atomically. Failed transactions leave no stranded claim or partial artifact; lost responses reconcile through `GET /requests/{request_id}`. D1 reads use a primary session when supported.
- `POST /drafts` accepts only request_id, title, content, excerpt, category, tags and an existing verified cover. Status/mode/publish/approval/pipeline overrides are rejected. It always creates `posts.status='draft'`, with no public URL and no editorial pending job. This contract stores supplied prepared copy; it does not add a background model invocation or an automatic content-generation trigger.
- `POST /schedule-proposals` accepts only request_id, post_id, draft_revision and schedule (`YYYY-MM-DD HH:mm`, Asia/Ho_Chi_Minh). The target must be a private draft owned by the same pipeline. The exact revision and draft status are checked again inside the transaction to stop concurrent owner edits. The result is **proposed**, never an executable schedule. Proposals become stale when the draft changes, disappears, is published by the owner, or the proposed time passes.
- **Preparing a schedule grants zero public publish permission.** Agent-19 never writes an `editorial_jobs.status='pending'` job, and cron cannot publish its proposal. Website Publisher agent-20 and Telegram Distributor agent-21 remain approval-bound. This phase intentionally exposes no agent or owner proposal-to-publish/approve endpoint; owner review and any actual publish/schedule decision continue through separately authenticated owner workflows.
- `AI_AGENT_FLEET_ENABLED=0` blocks credential issuance and atomic execution. Owner evidence inspection remains available while disabled. Credential expiry or owner-secret rotation invalidates delegation.
- Local verification: 21 focused tests PASS; canonical `tests/*.test.mjs` 261/261 PASS; npm pre-deploy regression 197/197 PASS; gateway tests 19/19 PASS. Coverage includes concurrent replay/conflict, rollback on audit failure, response loss, expired/tampered credentials, action/pipeline isolation, stale/concurrent edits, delete-without-resurrection, private public API/page 404, existing owner scheduler compatibility and attempted publish through Admin/CMS/publishing APIs. AI Pre-Deploy Audit now uses Node 24, matching canonical CI and allowing real SQLite transaction tests; runtime Worker code has no Node SQLite dependency.
- Exact-deployed-SHA Blog CMS Production E2E now runs `scripts/verify-content-prep-production.mjs`: owner mints scoped credentials, creates one temporary private UTF-8 draft, prepares a proposal, verifies retries/conflicts/reconciliation/isolation and publish denial, then deletes only its private fixture while retaining the audit ledger. No public publish is attempted with an owner credential by this new verifier.
- Implementation checkpoint: **PRODUCTION GREEN** for this bounded contract. PR #736 merged as `e4b735b456b8100fe594b21c90b99f105923e860`. Required PR CI / Validate and AI Pre-Deploy Audit / Validate succeeded; exact-merge-SHA CI run `37106219295` and Deploy Cloudflare Worker run `37106219223` succeeded. Migration 0031 was applied through the Cloudflare API/SDK. Worker version `dccb7cfb-52ea-4e60-9d64-0dcf51a6c6fc`, deployment `1417d496-5c50-4020-a9fb-bdd7152032e7`, API-created 100% traffic.

- Exact-SHA atomic production evidence: Blog CMS E2E run `37106311760`, job `111155421722`, passed the new **Atomic content preparation authorization and private draft E2E** step. Live logs at 2026-10-03 14:26 UTC+7 confirm private UTF-8 draft + schedule proposal + matching replay + changed-payload conflict + reconciliation + action/pipeline isolation + denial of public/Admin/CMS publish: PASS. Private draft cleanup also PASS; audit ledger retained. No new verifier owner credential was used to publish the atomic fixture.
- All 12 observed post-deploy workflows on this exact code SHA completed SUCCESS: Blog CMS `37106311760`; Homepage Canonical `37106311734`; Admin Redirect `37106311721`; QUEUE-01 `37106311726`; Live Chat AI Identity `37106311702`; Production Asset Delivery `37106311725`; App Sentiment `37106311675`; App Assistant `37106311728`; Business Jets CRM `37106311737`; Stage 3 Reconciliation `37106311681`; Cloudflare Machine Inventory `37106311703`; Production Smoke Gate-15 `37106311780`.
- Public/admin UTF-8, R2 lifecycle, publishing draft-image lifecycle and existing Blog publication E2E also passed. Fleet total remains 62; the two new bounded executing agents do not gain public publish authority. The owner's explicit authorization on 2026-10-03 resolved the earlier GitHub publication block. Deployment remains GitHub Actions -> Cloudflare API/SDK; no Wrangler production operation was used.

Owner/operator usage:
1. Owner authenticates with the usual signed Admin session. Call `POST /api/admin/agents/content-prep/credentials` with `{"agent_id":"agent-11","pipeline_id":"content-pipeline-001"}`; issue a second credential for agent-19 using the same pipeline. Share only the corresponding scoped credential with each agent, never the owner session or CMS/publish key.
2. Agent-11 calls `POST /api/agents/content/v1/drafts` with its Bearer credential and `{"request_id":"content-draft-00001","title":"...","content":"..."}`. Retain returned `post_id` and `draft_revision`.
3. Agent-19 reads that pipeline's draft using `GET /api/agents/content/v1/drafts/{post_id}`, then calls `POST /api/agents/content/v1/schedule-proposals` with `{"request_id":"content-schedule-001","post_id":123,"draft_revision":"<returned SHA-256>","schedule":"YYYY-MM-DD HH:mm"}`. Replace placeholders with actual returned data and a future Vietnam-local time.
4. On timeout/retry, keep the same pipeline + request_id + payload; `GET /api/agents/content/v1/requests/{request_id}` reconciles the committed result. Renew expired credentials for the same pipeline. Use a new request_id for a deliberate content/schedule change.
5. Owner inspects evidence with `GET /api/admin/agents/content-prep?pipeline_id=content-pipeline-001` and reads the draft through existing Admin controls. A prepared proposal does nothing at its scheduled time. Any approved actual publication or scheduling is a distinct owner action through the existing publishing workflow after reviewing the current copy/revision and time.

## 0.0B LEAD INTAKE EXECUTION PROMOTION — 2026-10-03 (UTC+7)
- Phase 2 strengthens public `POST /api/leads` before promoting **agent-26 Lead Intake**. Migration `0030_lead_intake_idempotency.sql` adds a durable D1 intake ledger keyed by an explicit `Idempotency-Key` or a deterministic visitor+payload key.
- Replay contract: same key + same payload returns the canonical stored lead instead of inserting a duplicate; same key + different payload is rejected with HTTP 409; an in-flight claim cannot race into a second insert.
- The ledger records payload fingerprint, lead/customer linkage, processing state, Telegram delivery result, attempts and last error. The lead row is persisted behind the successful claim before downstream notification/memory work.
- **agent-26 is promoted to bounded execution** only for lead creation/customer linking. It has no autonomous permission to delete leads, escalate lead status, publish content, alter budgets or bypass owner approval.
- The existing Memory Brain event remains the downstream evidence/audit path; its own idempotency claim and queue retry remain unchanged.
- Fleet executing set after this phase: **agent-26, agent-27, agent-28, agent-31, agent-33, agent-34** (6/62). Promotion count is not a KPI; further agents remain read/draft/approval-bound until their workflows independently satisfy auth/bounded ingress, idempotency, audit/evidence, retry/reconciliation and least privilege.
- Next candidate class: low-risk content draft/scheduling operations. Public publish/distribution, destructive actions, customer deletion, budget changes and brand promises remain owner/approval-bound.


## 0.0A 62-AGENT CONTROL PLANE + EXECUTION PROMOTION — 2026-10-03 (UTC+7)
- PR #733 established the production 62-agent control plane inspired by Structure Webworks' published operating model: 62 logical specialist agents, 8 departments, one Chief Orchestrator, shared existing D1/Memory Brain context, approval boundaries and a fleet kill switch. It intentionally does not create 62 persistent services, a second database, or a second customer-memory system.
- Canonical fleet departments: Intelligence 8, Content 9, Distribution 8, CRM 9, Reputation 7, Analytics 8, Operations 7, Governance 6.
- Production policy: D1/live state remains truth; XTRA Memory Brain remains customer context; GitHub Actions -> Cloudflare API/SDK remains the production deployment path; customer deletion remains owner-only; budget/brand-promise/consequential public writes remain owner/approval-bound.
- Promotion rule: an agent may move beyond plan/draft only when its real target workflow already provides bounded/authenticated ingress, idempotency, audit/evidence, retry or reconciliation, and least privilege.
- Phase 1 promotes exactly five CRM agents onto existing production workflows rather than inventing new write paths: **agent-27 Identity Resolver**, **agent-28 Vehicle Interest Mapper**, **agent-31 Care Status Agent**, **agent-33 Proposal Agent**, **agent-34 CRM Auditor**.
- Execution evidence: Memory Brain jobs claim `idempotencyKey` in `xtra_memory_jobs_processed`; duplicate jobs are ignored; queue failures retry; customer events create evidence episodes/facts; care changes create audit; important care stages become evidence-linked proposals for owner approval. Only the low-risk explicit-phone transition `new -> contacting` may auto-write.
- **agent-26 Lead Intake is deliberately not promoted yet** because the current public lead-create path does not expose a sufficiently strong idempotency contract for autonomous replay. Website Publisher/Telegram Distributor and other consequential distribution agents also remain approval-bound.
- Fleet kill switch remains `AI_AGENT_FLEET_ENABLED=0`. The owner-only `GET /api/admin/agents` exposes registry/promotion policy; planning reports which selected agents have bounded execution capability but does not create a bypass around existing workflow APIs.
- Next promotion candidates must be selected by measured workflow readiness, not by agent count. Priority is to add explicit idempotency/reconciliation to Lead Intake before autonomous promotion, then evaluate low-risk draft/scheduling operations separately from public publish.


## 0.0 CURRENT CUSTOMER CARE + MARKETING OPS CLOSURE — 2026-10-03 (UTC+7)
- Canonical production baseline before this documentation closure: `fd5f63b6511012cc0ae692006bb88e9219c9d691` (PR #729 lineage). GitHub currently has no open PR or open issue.
- PR #726 operational CRM hygiene is production-deployed: S21 owner evidence changed the Customer Care list from 107/107 mixed records to 1/1 meaningful customer; CI fixtures and anonymous one-shot noise are filtered from the operational list without deleting Memory Brain records.
- Physical S21 acceptance already proves `/customerapp` opens the Telegram Mini App and the customer list renders. The remaining S21 acceptance scope after later feature upgrades is narrow: open the retained customer detail and visually confirm AI proposal controls plus the destructive-delete confirmation surface. This physical-device observation cannot be replaced by CI.
- PR #727 upgrades Customer Care to evidence-first autonomous care. Existing Memory Brain events can derive care automation; explicit phone evidence may auto-transition `new -> contacting`; vehicle/price/availability interest proposes `consulting`; explicit test-drive intent proposes `appointment`. Important sales-stage changes remain owner-approved through **Duyệt / Bỏ qua** and are audited.
- Migration `0029_xtra_customer_care_proposals.sql` stores proposal value, confidence, rationale, evidence episode and decision state. The automation is deterministic/evidence-first and remains functional when Workers AI quota is unavailable.
- PR #728 intentionally supersedes the old “no customer DELETE” contract. Customer detail now exposes **Xóa khách hàng** only as an explicit owner action. The UI requires confirmation and the API additionally requires `DELETE_CUSTOMER` bound to the exact customer ID. Deleting a customer removes canonical Memory Brain/customer-care data through FK behavior while preserving source `leads` rows by unlinking them first. AI has no autonomous delete authority.
- PR #729 integrates the useful operating model of `builderz-labs/marketing-dashboard` as a native Cloudflare Worker + D1 **Marketing Ops** surface rather than importing its Next.js/SQLite runtime. It provides customer/follow-up/proposal/memory/lead/content KPIs, an overdue follow-up queue and an operator-led Weekly Tool Radar.
- Tool discovery is recommendation-only: GitHub Trending weekly, Hacker News, Product Hunt and TLDR may surface upgrade candidates, but no trending tool is automatically installed, granted credentials, allowed to create production mutations, or promoted without license/security/runtime-fit review.
- Exact-lineage production evidence on `fd5f63b6511012cc0ae692006bb88e9219c9d691`: CI and Deploy Cloudflare Worker SUCCESS; post-deploy Admin Redirect Verify, Homepage Canonical Verify, Production Asset Delivery Gate, Business Jets CRM Production E2E, Blog CMS Production E2E, Stage 3 Production Reconciliation, Live Chat AI Identity Verify, QUEUE-01 Production E2E Origin, Cloudflare Machine Inventory Audit, App Assistant Production E2E, App Sentiment Production E2E and Production Smoke Gate-15 all SUCCESS.
- Production policy remains GitHub Actions -> Cloudflare API/SDK; Wrangler production operations remain prohibited.
- Remaining evidence, not a release blocker: (1) physical S21 visual confirmation of the new proposal/delete controls; (2) one real-customer end-to-end proof from a genuine new chat/lead through Memory Brain -> care automation/proposal -> owner decision/follow-up. Do not manufacture a customer or production interaction merely to close this evidence item.


## 0.0 TELEGRAM AI CUSTOMER CARE AGENT — PRODUCTION GREEN — 2026-10-03 (UTC+7)
- PR #724 merged at `f612d64feaabbff61282aa5d3d4091f79b44c650`.
- Existing **@phanthuanxtra_auto_bot** now supports `/customerapp` in owner-authorized private chat and opens the existing Telegram Mini App directly in the **Khách hàng** view.
- Customer identity remains canonical in XTRA Memory Brain (`xtra_memory_customers`, identities, facts, episodes and lead links). No parallel customer identity database or second bot was introduced.
- Migration `0028_xtra_customer_care.sql` adds only 1:1 care state + audit: care status, owner note, follow-up timestamp, AI summary, actor and audit history.
- Care statuses: `new → contacting → consulting → appointment → follow_up → won/lost`.
- Mini App supports customer search/list, customer detail, Memory facts, interaction timeline, linked leads, care state/note/follow-up updates, AI summary and care audit.
- Security: Telegram signed `initData` + owner allowlist remain mandatory; customer API has **no DELETE route/action**. Human mutations use actor `telegram-customer-mini-app`; summary writes use `ai-customer-agent`.
- AI summary is evidence-bounded and has deterministic fallback. At deploy time the Workers AI REST probe reported free allocation exhausted (HTTP 429), so production remains operational without paid AI or fabricated data.
- Exact-lineage deploy `37098454564`: D1 migration 0028 applied; Cloudflare API/SDK deployment assigned 100% traffic to version `3592f747-718a-42e7-acc9-f27d1101fd13`; Wrangler production path **NOT USED**.
- Exact-lineage post-deploy gates on `f612d64...`: CI, Stage 3 Production Reconciliation, Production Smoke Gate-15, Production Asset Delivery Gate, QUEUE-01 Production E2E Origin, Blog CMS Production E2E, Business Jets CRM Production E2E, App Assistant Production E2E, App Sentiment Production E2E, Homepage Canonical Verify, Admin Redirect Verify, Live Chat AI Identity Verify and Cloudflare Machine Inventory Audit all **SUCCESS**.
- Remaining acceptance is owner UX observation on S21 only: send `/customerapp`, open **Mở khách hàng**, confirm list/detail rendering. This is not a code/deploy blocker and requires no production mutation.


## 0.0 FINAL CANONICAL OPERATIONS RECONCILIATION — 2026-10-03 (UTC+7)
- Canonical source baseline for this reconciliation: `500152aa5cfdf95ca7ba9d7fcb7a6486754cd8b0` (PR #722 merged). Newer merged documentation-only lineage supersedes the older `b188d7e...` status header without invalidating its production E2E evidence.
- Owner operations acceptance is **PASS**: **Samsung Galaxy S21 Ultra → Telegram → Termux → browser**. Telegram vehicle operations use **@phanthuanxtra_auto_bot**; owner confirmed `/carapp` works on the S21 Ultra.
- Termux local capability acceptance is **PASS**: repository fast-forward sync completed safely and `scripts/complete-termux-gates.sh` reached `COMPLETE: Termux gate finished`. Agent-Reach local installation/doctor is therefore no longer an open project task.
- Latest full production E2E closure remains the successful `b188d7e61a272c90ff336257c4eea6953c2de27b` lineage recorded below. Subsequent PRs #721/#722 are status/documentation-only changes; do not require a production runtime redeploy merely to advance the MASTER SHA.
- Historical GitHub issues #65, #99, #203 and #569 are superseded by later production/owner acceptance evidence. They should be reconciled/closed as historical records, not treated as active release blockers.
- **Native Android APK distribution is OPTIONAL / NON-BLOCKING.** The preferred owner path is Telegram Mini App on S21 Ultra. Physical APK regression/release work is required only if the owner explicitly re-enables native APK distribution as a product goal.
- Memory Brain Phase 2 remains evidence-driven evaluation only. Headroom remains shadow-only. Neither is a release blocker.
- Production deployment policy remains **GitHub Actions → Cloudflare API/SDK**; **no Wrangler production operations**.
- Current active release blockers: **none identified by this reconciliation**. New implementation work requires new production evidence, a concrete owner goal, or a measured reliability/security/UX/cost need.


## 0.0 S21 ULTRA OWNER OPERATIONS ACCEPTANCE — PASS — 2026-10-03 (UTC+7)
- Owner acceptance **PASS** for the canonical operating chain: **Samsung Galaxy S21 Ultra → Telegram → Termux → browser**.
- S21 Termux environment verified by owner: Git, Python, pip and curl available; repository safely fast-forwarded to current `main` without destructive reset/clean and without Wrangler.
- `scripts/complete-termux-gates.sh` reached `COMPLETE: Termux gate finished`, closing the owner-side Termux gate for this acceptance.
- Telegram vehicle operations acceptance **PASS** on **@phanthuanxtra_auto_bot**; owner confirmed the bot is working and the `/carapp` Telegram Mini App flow operates correctly on the S21 Ultra.
- Telegram remains the primary day-to-day vehicle-management surface; Termux is the technical/operator surface; browser is the visual/admin fallback; Windows remains fallback only.
- Production deployments remain **GitHub Actions → Cloudflare API/SDK**. **No Wrangler production operations** are authorized.
- This acceptance does not authorize destructive local Git recovery, Telegram DELETE behavior, Headroom production proxying, or any expansion of production mutation authority.


## 0.0 CURRENT CANONICAL CLOSURE — 2026-10-03 (UTC+7)
- Canonical main: `b188d7e61a272c90ff336257c4eea6953c2de27b` (PR #720).
- Exact-lineage **SUCCESS**: CI `37095698004`, Deploy Cloudflare Worker `37095698016`, Headroom Shadow Benchmark `37095698014`.
- Post-deploy production **SUCCESS** on the same lineage: Blog CMS Production E2E, Business Jets CRM Production E2E, App Assistant Production E2E, App Sentiment Production E2E, Stage 3 Production Reconciliation, Homepage Canonical Verify, Admin Redirect Verify, Live Chat AI Identity Verify, QUEUE-01 Production E2E Origin, Production Smoke Gate-15, Production Asset Delivery Gate, and Cloudflare Machine Inventory Audit.
- Therefore historical sections below that say production `RED/LOCKED`, Cloudflare deploy credential blocked, Gate-15/QUEUE-01/App AI pending, or exact-lineage reconciliation pending are **historical incident records, not current status**. Do not use them to override this top canonical closure.
- Current control chain: deterministic audit → Jev typed decision when available → LLM/AI audit → Headroom isolated/shadow evidence → CI → GitHub Actions/Cloudflare API-SDK → production E2E/smoke.
- Headroom measured 490 → 450 tokens (~8.16% saving) while preserving 8/8 required vehicle safety literals; it remains **shadow-only**, not a production LLM proxy.
- Owner operating priority remains **S21 Ultra → Telegram → Termux → browser**; Windows is fallback; **no Wrangler production operations**.
- Native Android APK physical regression is **OPTIONAL / NON-BLOCKING**. Telegram Mini App is the accepted primary S21 operating surface; resume APK device regression only if native distribution is explicitly re-enabled.
- Agent-Reach Termux local acceptance is **PASS**: the owner completed the Termux gate through `COMPLETE: Termux gate finished`. Windows remains fallback only; no further Agent-Reach completion work is required.
- Memory Brain Phase-2 items remain **evaluation candidates, not release blockers**: observe real returning-customer behavior before adding timeline/correction UI, dedupe expansion, broader identity linkage, or retention controls.
- No new infrastructure, Headroom proxy promotion, vector memory, Durable Objects, or production mutation is authorized merely to clear historical text.


## 0.0 HEADROOM SHADOW BENCHMARK — PROMOTION GATE — 2026-10-03 (UTC+7)
- Next priority after isolated Headroom evidence: measure **real local compression behavior** on a secret-free PHAN THUẦN XTRA fixture before any production traffic integration.
- Shadow benchmark installs the exact Headroom commit already pinned in `tools/headroom.json`; it runs with `HEADROOM_OFFLINE=1`, `HEADROOM_BEACON=off`, `DO_NOT_TRACK=1`.
- Fixture locks critical vehicle semantics including canonical IDs, brand/model/year, price/status, `NO_DELETE`, and Telegram Mini App policy markers.
- Promotion floor: all required literals must survive compression and token count must not increase. Report captures before/after/saved tokens, ratio, transforms and missing literals.
- Benchmark makes **no provider API call**, receives no production secrets, does not start Headroom proxy/memory/CCR, and cannot mutate Cloudflare/D1/R2/Telegram.
- Passing this benchmark only qualifies Headroom for a later, separately reviewed shadow-context experiment. It does **not** authorize production proxying or autonomous mutation.
- Existing control order remains deterministic audit → Jev → LLM/AI audit → Headroom isolated/shadow evidence → CI → GitHub Actions/Cloudflare API-SDK.
- Owner operations remain **S21 Ultra → Telegram → Termux → browser**, Windows fallback only, no Wrangler.
- Status: **MERGED / EXACT-LINEAGE GREEN** — PR #720 merged as `b188d7e61a272c90ff336257c4eea6953c2de27b`. Shadow benchmark SUCCESS: 490 → 450 tokens (40 saved, ~8.16%), 8/8 required safety literals preserved. Exact-lineage CI, Headroom Shadow Benchmark and Deploy Cloudflare Worker all SUCCESS. Headroom remains shadow-only; this evidence does not authorize production proxying.


## 0.0 HEADROOM GITHUB CAPABILITY — ISOLATED AUDIT — 2026-10-03 (UTC+7)
- Owner requested adding **Headroom** to GitHub and continuing automatically by priority.
- Upstream selected/audited: `headroomlabs-ai/headroom`, Apache-2.0, package `headroom-ai` v0.39.1, pinned commit `793bb85659d9aa907115ec16ea3356c5459f6299`.
- Headroom is a local-first context optimization/compression layer. Upstream security documentation notes that proxy mode handles provider traffic/credentials, can persist CCR request content, writes operational logs, and has an opt-out anonymous beacon; therefore XTRA does **not** enable proxy/memory/disk CCR in GitHub production gates at this stage.
- GitHub integration is **audit-only evidence**: fetch exact pinned source, inspect package/license/security metadata, and enforce isolation. It does not install Headroom, start its proxy, wrap an agent, call an LLM provider, or mutate production.
- Isolation environment sets `HEADROOM_OFFLINE=1`, `HEADROOM_BEACON=off`, and `DO_NOT_TRACK=1`; GitHub workflow permissions are read-only and checkout credentials are not persisted.
- Headroom receives no Cloudflare, Telegram, Admin/CMS, TypeSafe/Jev, GitHub write, or provider API credential.
- Existing review order remains deterministic audit → optional Jev typed decision → LLM/AI audit. Headroom is currently a context-efficiency capability under evidence-only evaluation, not an authority for merge/deploy decisions.
- Owner operations policy remains **S21 Ultra → Telegram → Termux → browser**, Windows fallback only, **no Wrangler production operations**.
- Status: **MERGED / EXACT-LINEAGE GREEN** — PR #719 merged as `b914ff574f80fc861719b8190f796e57d8e665aa`; Headroom isolated audit, CI and production deploy completed SUCCESS. Isolation remains the enforced production boundary.


## 0.0 JEV + LLM GITHUB DECISION CASCADE — 2026-10-03 (UTC+7)
- Owner requested combining **TypeSafe Jev + LLM** in GitHub and continuing work by priority.
- Architecture: deterministic repository audit first → optional Jev typed risk decisions → existing LLM/AI audit remains the explanatory/fallback review layer. Jev does not replace deterministic tests or the existing LLM gate.
- Jev integration uses the official TypeSafe `POST /v1/systemone` API with model alias `jev-latest`; the only credential is GitHub Actions secret `TYPESAFE_API_KEY`.
- The Jev job is **optional until the secret is configured**: absence of the secret is a clean skip so existing CI/AI gates are not weakened or broken.
- Review state is bounded to 120 KB of PR diff. Jev receives no GitHub token, Cloudflare credential, Telegram token, Admin/CMS secret, D1/R2 credential, or production mutation capability.
- High-confidence Jev risk threshold is 0.90 for security or production risk; crossing it blocks the Jev job for human/LLM review rather than autonomously fixing, merging, or deploying.
- GitHub workflow permissions are read-only and checkout credentials are not persisted.
- Existing owner operations policy remains **S21 Ultra → Telegram → Termux → browser**, Windows fallback only, and **no Wrangler production operations**.
- Status: **MERGED / CASCADE ACTIVE** — Jev + LLM Decision Cascade is present in the current control chain and completed SUCCESS on PR #720. Jev remains fail-safe/optional when its GitHub Actions credential is unavailable; no secret value is stored in this MASTER.


## 0.0 OWNER OPERATIONS POLICY — S21 ULTRA / TELEGRAM / TERMUX FIRST — 2026-10-03 (UTC+7)
- Owner operating priority is now: **Samsung Galaxy S21 Ultra → Telegram → Termux → browser**.
- **Windows PowerShell is fallback only**, not the primary operating path.
- **Wrangler CLI must not be used for production operations.** Production deployment remains **GitHub Actions → Cloudflare API/SDK**, preserving the existing controlled deploy path.
- Routine owner workflows should be designed to work from Telegram and Termux first; browser is the visual/admin fallback where needed.
- GitHub remains source of truth. Material changes continue through branch → PR → CI/audit → merge → exact-lineage production verification.
- Local sync must be non-destructive: prefer `git fetch`, `git switch main`, `git pull --ff-only`; do not use `git reset --hard` or `git clean` as an automatic recovery action.
- Windows evidence on 2026-10-03 reached main `ffe091e...` fetch/pull but encountered a Windows file-lock prompt while unlinking a Git pack index. This is treated as a **Windows-local fallback issue**, not a production blocker; do not repeatedly retry the locked unlink operation.
- Agent-Reach local completion should therefore target **Termux-first** where its Python/runtime dependencies are supported; Windows dedicated venv remains fallback.
- Telegram Mini App remains the preferred day-to-day vehicle-management UI and retains the no-DELETE safety boundary.


## 0.0 AGENT-REACH OPERATIONS CAPABILITY — 2026-10-03 (UTC+7)
- Owner requested adding `Panniantong/Agent-Reach` and continuing work by priority.
- Upstream audit: Python 3.10+, MIT, project version 1.5.0; upstream default install is check-only and system mutation requires explicit `--system`.
- Integration architecture: **operator tooling only**, never bundled into the Cloudflare Worker. Upstream is pinned to audited commit `a19a171fa980a0785849596492e0af4db800c82f`.
- Added Windows PowerShell bootstrap `scripts/agent-reach.ps1` with default `Check` mode and explicit `Install` mode using a dedicated user venv. Project integration never passes Agent-Reach `--system`.
- Added `MASTER_PROJECT_STATUS.md` (phụ lục: AGENT_REACH) safety/usage contract and regression guard `tests/agent-reach-integration.test.mjs`.
- Credentials/cookies remain outside repository/GitHub Actions/Cloudflare/D1/R2; no social write/post automation is enabled.
- Status: **PR #714 MERGED** as main `133dd1a1dc7186870b9415b34bade19ceabedd98`; PR-head CI, AI Pre-Deploy Audit and deploy validation SUCCESS. Exact-lineage push CI SUCCESS and Deploy Cloudflare Worker run `37093787053` SUCCESS, including Worker deploy/migrate, UTF-8 checks, R2 E2E and publishing lifecycle. Windows owner-side Agent-Reach installation/doctor remains pending explicit local execution.


## 0.0 TELEGRAM VEHICLE MINI APP — FULL MANAGER UPGRADE — 2026-10-03 (UTC+7)
- Owner approved upgrade after production acceptance showed 7/7 vehicles rendering successfully.
- Scope: vehicle detail, price/ODO/year/brand/model/fuel/category/color/description editing, gallery reorder, cover selection, public-page action, improved list metadata/search, and per-car audit history.
- Persistence is reused: `saveCar()`, `carImages()`, `reorderCarImages()`, and `cms_audit_log`; no parallel vehicle write model is introduced.
- Security remains Telegram signed `initData` + freshness + existing owner allowlist. Mini App exposes **no DELETE route** and does not carry Admin/CMS credentials.
- Hidden vehicles intentionally return no public-page action; other statuses use canonical `/car?id=<id>`.
- Gallery updates require the complete current image ID set and an existing cover image ID, preserving the existing persistence invariant and audit trail.
- Status: **PR #712 MERGED** as main `d79e4f56e5d25833fcc24d23b822358bb977b81a`; exact-lineage push CI SUCCESS and Deploy Cloudflare Worker run `37093460905` SUCCESS, including deploy/migrate, UTF-8 delivery, R2 E2E and publishing draft lifecycle. Owner `/carapp` full-manager UI acceptance **PASS**: production rendered 7/7 vehicles; owner then verified `tg-652` as **SOLD** in the public catalog/detail with AUDI Q7 3.0 TFSI, model year 2017 and reference price 1.050.000.000 đ, proving the Mini App status mutation propagated to the public D1-backed catalog.


## 0.0 TELEGRAM MINI APP FRAME POLICY HOTFIX — 2026-10-03 (UTC+7)
- Owner acceptance found Telegram Web/Desktop error: `phanthuanxtra.com đã từ chối kết nối` after `/carapp` successfully returned the Mini App button.
- Root cause: global `public/_headers` rule set `X-Frame-Options: DENY` for every static asset, including `/telegram-mini-app.html`.
- Fix: path-specific `/telegram-mini-app.html` rule detaches only `X-Frame-Options` using Cloudflare-supported `! X-Frame-Options`, adds Telegram-scoped `Content-Security-Policy: frame-ancestors https://web.telegram.org https://*.telegram.org`, and disables browser caching for this asset. Global DENY remains intact for all other pages.
- Regression: `tests/telegram-mini-app.test.mjs` locks the framing exception and continues to enforce no Admin token / no DELETE.
- Status: **PR #709 MERGED** as main `0728bc6296838b6debbae31a7be27c027d3d0271`; exact-lineage push CI SUCCESS and Deploy Cloudflare Worker run `37092696328` SUCCESS. Final Telegram Web/Desktop rendering acceptance **PASS**: owner reopened `/carapp` and the production Mini App rendered the live 7/7 vehicle catalog.


## 0.0 TELEGRAM VEHICLE MINI APP — IMPLEMENTATION CHECKPOINT — 2026-10-03 (UTC+7)
- Goal: owner can open a free Telegram Mini App from the existing Auto Bot and manage the live vehicle catalog without entering or exposing an Admin/CMS token.
- Branch: `feat/cms-agent-api-v1` (reused as the single active mutation queue; no competing implementation branch).
- Added `public/telegram-mini-app.html`: Telegram-native vehicle list/search/status UI using `Telegram.WebApp.initData`; no `ADMIN_TOKEN` or CMS credential is stored in the Mini App.
- Added `src/telegram-mini-app.js`: server-side Telegram initData HMAC-SHA-256 verification, 15-minute freshness gate, existing owner allowlist reuse through `canPublishAutoBlog`, read-only catalog listing, and bounded status updates for `available/reserved/sold/hidden`.
- Mini App API intentionally exposes no DELETE route. Status changes reuse `saveCar(... actor: "telegram-mini-app")` so the existing CMS audit log remains authoritative.
- Added Auto Bot command `/carapp`: authorized private chats receive an inline `web_app` button for `https://phanthuanxtra.com/telegram-mini-app.html`.
- Telegram security basis: trust only signed `initData`; never trust `initDataUnsafe` for authorization.
- Targeted regression file: `tests/telegram-mini-app.test.mjs` covers valid/tampered/expired initData, auth-before-D1, no-delete contract, no Admin token in UI, and `/carapp` wiring.
- Baseline publishing API before this change: `tests/publishing-api.test.mjs` PASS 9/9, fail 0.
- Status update: **PR #707 MERGED** as main `6096f0c75a7dba5e5d7936410e9a552bb1769929`. PR head `0bb7e8db57bc43c4ad8a471125c3bdaa6060369d` passed CI, AI Pre-Deploy Audit and Deploy Cloudflare Worker validation. Exact-lineage push CI and Deploy Cloudflare Worker run `37091711752` completed SUCCESS, including Cloudflare API/SDK deploy+migrate, public boundary, UTF-8, R2 E2E and publishing-draft lifecycle. Final owner Telegram `/carapp` launch/status-change acceptance **PASS**: live catalog rendered 7/7 vehicles and the later `tg-652` SOLD state was observed on the public vehicle presentation.
- Windows 10 owner acceptance after deploy: open private chat with the existing Auto Bot → send `/carapp` → press **Mở quản lý xe** → verify catalog loads → change a non-destructive status → refresh and confirm D1-backed state.


## 0.0 CURRENT PRODUCTION CHECKPOINT — 2026-10-02 (UTC+7)
- Repository: `PHAN-THUAN-XTRA/phanthuanxtra-v9`.
- Current main lineage at this checkpoint: `176f44773c0750824e9681d8acf3df56e67fb94f` (PR #698).
- Active PR: **none**.
- Production deployment path remains **GitHub Actions → Cloudflare API/SDK**. No manual Wrangler production deploy is part of this checkpoint.
- Deploy Cloudflare Worker run `36987201820`: **SUCCESS**. The production Worker deploy job completed successfully after validating source/tests, uploading the Worker, verifying public boundaries, R2 lifecycle, and publishing-draft media lifecycle.
- Exact-lineage post-deploy workflows on `176f44773c...` are **SUCCESS**: CI, Android APK MVP, Production Asset Delivery Gate, Homepage Canonical Verify, Admin Redirect Verify, Business Jets CRM Production E2E, Blog CMS Production E2E, Live Chat AI Identity Verify, Production Smoke Gate-15, App Sentiment Production E2E, App Assistant Production E2E, QUEUE-01 Production E2E Origin, Stage 3 Production Reconciliation, and Cloudflare Machine Inventory Audit.

### XTRA MEMORY BRAIN — LIVE
- PR #695 introduced the first production Memory Brain foundation: persistent web visitor identity, customer resolution, bounded recent episodes, semantic preference facts, procedural state, redacted memory summaries, customer-specific AI cache isolation, durable memory queue processing, and current-truth priority.
- PR #696 hotfixed production schema compatibility by moving memory storage into namespaced tables:
  - `xtra_memory_customers`
  - `xtra_memory_identities`
  - `xtra_memory_episodes`
  - `xtra_memory_facts`
  - `xtra_memory_jobs_processed`
  - `xtra_memory_conversation_links`
  - `xtra_memory_lead_links`
- Production principle: **D1 / live website state is current truth; customer memory is context only.** Memory must not independently assert current stock, price, availability, or other mutable catalog facts.
- Current deterministic facts remain intentionally narrow and non-sensitive: preferred brand, body type, vehicle, and contact channel.
- Known customer contact state is reused so the assistant should not repeatedly request a phone number once it is already associated with the customer identity.

### LIVE CHAT FALLBACK HARDENING
- PR #697 fixed quota-limited vehicle fallback behavior:
  - explicit brand + body-type intent is respected (example: `Lexus` + `SUV` returns only matching Lexus SUVs);
  - unrelated brands/categories are excluded from fallback results;
  - a vehicle year is not appended when the same year is already present in the model text.
- PR #698 improved fallback readability:
  - each matching vehicle is rendered on its own bullet line;
  - the chat UI preserves server-provided line breaks using `white-space: pre-line`;
  - regression tests cover the line-separated vehicle list and UI rendering behavior.
- Verified production behavior after these changes: quota fallback can continue using the live D1 catalog even when Workers AI is temporarily rate/quota limited, while retaining deterministic filtering and customer-contact awareness.

### OPERATING POLICY — CHATGPT × GITHUB × CLOUDFLARE × PHAN THUẦN XTRA
- ChatGPT acts as architecture reviewer, root-cause analyst, implementation assistant, and production verifier; it should propose changes only when there is clear reliability, UX, conversion, security, cost, or operational value.
- GitHub remains the source of truth. Material production changes use branch → PR → regression tests / CI → merge; do not mutate `main` directly.
- Cloudflare remains the preferred runtime platform. Reuse existing Workers, D1, R2, Queues, Workers AI, and AI Search before introducing another infrastructure dependency.
- Do not add complexity merely because a technology is newer. D1 + Queues remain sufficient for Memory Brain v1 unless production evidence shows a serialization, scale, or retrieval requirement that they cannot meet.
- After every material change, verify both source-side checks and exact-lineage production behavior. A merged PR alone is not production proof.
- When the system is healthy, prefer stability over unnecessary refactoring. New proposals should be tied to measured failures, repeated manual work, customer experience, conversion, privacy, reliability, or operating cost.

### NEXT EVALUATION TARGETS — NO IMMEDIATE ARCHITECTURE CHANGE REQUIRED
- Observe real Memory Brain behavior before expanding the architecture: returning-customer recognition, reduction in repeated name/phone requests, false or duplicate memory facts/episodes, and cross-customer isolation.
- Good Phase 2 candidates only when justified by evidence: Admin customer memory timeline with correction/delete controls, lead/opportunity dedupe by customer identity, broader Telegram cross-channel identity linkage, retention/privacy controls, and additional deterministic sales events.
- Do **not** introduce vector customer-memory retrieval, Durable Objects, or another database merely for architectural novelty. Add them only if a measured production requirement justifies them.

Canonical implementation references:
- PR #695: https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/pull/695
- PR #696: https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/pull/696
- PR #697: https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/pull/697
- PR #698: https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/pull/698
- Production deploy run: https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/36987201820


## 0.0A ISSUE #569 — AUTO-MERGE AUDIT CHECKPOINT (2026-09-28 UTC+7)
- Read-only Cloudflare audit confirms production Worker binding `MEDIA -> phanthuanxtra-media` and D1 `8b6c0fc8-c278-4797-9cfa-3ec93d0c1b7d`; `phanthuanxtra-images` is not the production Worker binding. No binding mutation is authorized by this checkpoint.
- GitHub merge audit confirms PR #576 merged as `3028d4f9244faa42b74f9b05365a2a6d975d44a9`, PR #577 as `c5fddfac2a33098f106cb1f6694e8fe946f9e634`, PR #578 as `16e3f5892a0fcdc934a7ad1079c6133740d11a4b`, and docs PR #579 as `41e21c8d5cabf84ff040b2aebe16eb7dfa16427c`.
- Source-level P0/P1 remediation for #569 is merged: draft-media authorization, Telegram /blog canonical bounded WebP/privacy pipeline, shared Admin media policy, and server-side 20-image ceiling.
- Audit rule: do not re-merge or create duplicate implementation PRs for #569. Any remaining work must be evidence closure only.
- Production status remains **NOT FINAL GREEN** until fresh exact-lineage deployment/runtime evidence proves anonymous draft GET/HEAD/variant denial, published-media compatibility, Telegram /blog behavior, D1/R2 metadata consistency, and required production gates.
- Cloudflare Dashboard-only settings (public access/custom domains/CORS/lifecycle) remain observational evidence unless independently captured; no secret/token values belong in this file.
- Issue: https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/issues/569
- P0 privacy PR: https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/pull/576
- P0 Telegram PR: https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/pull/577
- P1 policy PR: https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/pull/578
- Prior MASTER checkpoint PR: https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/pull/579


## 0.0 CURRENT CHECKPOINT — 2026-09-28 (UTC+7)
- Issue #569 media P0/P1 remediation is source-complete through PR #577 and PR #578.
- PR #577 merged P0 Telegram/blog image privacy pipeline as main lineage `c5fddfac2a33098f106cb1f6694e8fe946f9e634`.
- PR #578 merged as main SHA `16e3f5892a0fcdc934a7ad1079c6133740d11a4b`.
- PR #578 required `CI / Validate` passed on head `682df7e1cf886238d1811bf054899ed507dc9202`; AI Pre-Deploy Audit #252 also passed after restoring the existing AVIF/WebP delivery contract behind the privacy-aware media handler.
- PR #578 source result: `/media/*` routes through privacy-aware authorization; Admin media upload uses the shared 15 MB bounded canonical WebP/privacy/metadata pipeline; vehicle image persistence enforces `MEDIA_POLICY.image.maxPerArticle` (20) instead of silently accepting 30.
- Audit caught and corrected a regression before merge: replacing the old index media path initially removed AVIF/WebP negotiation. The final branch preserves explicit AVIF, WebP negotiation, loop guard/source path, privacy cache behavior, and targeted regression coverage.
- Merge was performed only after the repository required status check reported success. No force merge was used.
- Production/runtime closure for exact merge SHA `16e3f589...` is **PENDING FRESH POST-MERGE WORKFLOW EVIDENCE** at this checkpoint. Do not claim issue #569 production GREEN until the exact merged lineage has a successful Cloudflare deploy and affected runtime/R2/media privacy checks.
- Canonical PR: https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/pull/578
- Required-check run: https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/36405743432
- AI Pre-Deploy Audit #252: https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/36405743471

> **DUY NHẤT — CANONICAL PROJECT STATUS / HANDOFF**
> Date: 2026-09-25 (UTC+7)
> Repository: `PHAN-THUAN-XTRA/phanthuanxtra-v9`
 > Current main lineage: `f2a9c197ca3e3eba80abd136617f91c761663fab` (PR #468 merged).
 > Active PR: **none** — PR #468 merged.
 > Active branch: `fix/production-deploy-credential-gate-20260925`.
 > PR head: `f2a9c197ca3e3eba80abd136617f91c761663fab` (merge commit).
 > Status: **PRODUCTION DEPLOY BLOCKED — Cloudflare credential authentication failed on exact main SHA**.
 > PR #468 workflow snapshot: all listed PR validation workflows completed **PASS** before merge.

## 0. ACTIVE CHECKPOINT — 2026-09-25
- PR #468 **MERGED** as main SHA `f2a9c197ca3e3eba80abd136617f91c761663fab`.
- PR #468 head `b7a2afbd26cd0e5f22eb7997b5a74af45cfdb518` passed the listed required validation workflows before merge.
- Post-merge push workflows were triggered on the exact merge SHA. Stage 3 Production Reconciliation, Homepage Canonical Verify, Production Credential Safety, CI, Admin PT Xtra Pipeline, Production Smoke Gate-15 and related gates passed.
- **Blocking failure discovered:** Deploy Cloudflare Worker run `36148326563` failed in `Deploy production Worker (Cloudflare API/SDK)` at **Resolve Cloudflare API credentials**. Both configured candidate credentials returned HTTP **401** against the Cloudflare Workers API; the deploy, purge and all post-deploy verification steps were skipped.
- **Downstream confirmation:** Production Asset Delivery Gate run `36148326512` failed at `Verify editorial production UTF-8` because `/business-jets` returned without the expected Worker provenance header `x-ptx-editorial-utf8: worker-v3`. The source `src/entry.js` already contains the correct `/business-jets` Worker route, so this is consistent with the new Worker code not being deployed to production.
- **Root cause:** the production deployment credential boundary, not the yachts SEO code, is currently the smallest failing boundary. The workflow already tries both primary and backup Cloudflare tokens; both were rejected with HTTP 401.
- **Required owner action:** renew/replace the GitHub production Cloudflare API credential(s) with a token authorized for the target account and Worker script, then rerun the exact-SHA deployment. Secret values must never be placed in source, chat, logs, or this MASTER.
- No Cloudflare resource mutation, secret rotation, force merge, or Wrangler deployment was performed by this remediation.
- Production remains **RED/LOCKED** until the exact SHA `f2a9c197...` is deployed through GitHub Actions → Cloudflare API/SDK and all affected runtime gates pass.

## 0.1 EXACT-SHA FAILURE EVIDENCE
- Deploy Cloudflare Worker: run `36148326563` — **FAILURE**.
- Validation job: **PASS**.
- Production deploy job: **FAILURE** at credential resolution.
- Credential probe result: primary token HTTP 401; backup token HTTP 401; no token selected.
- Deploy/migrate: **SKIPPED**.
- Cache purge: **SKIPPED**.
- Public production boundary: **SKIPPED**.
- Editorial UTF-8 verification: **SKIPPED**.
- R2 Worker E2E: **SKIPPED**.
- Production Asset Delivery Gate: run `36148326512` — **FAILURE** at `/business-jets` Worker UTF-8 provenance.
- Stage 3 Production Reconciliation: run `36148326604` — **SUCCESS** on exact merge SHA, but it does not prove the new Worker revision was deployed.

## 0.2 REMEDIATION QUEUE
1. Owner updates/renews the GitHub production Cloudflare token secret(s); do not expose values.
2. Rerun **Deploy Cloudflare Worker** for the exact merge SHA `f2a9c197ca3e3eba80abd136617f91c761663fab`.
3. Require Cloudflare API/SDK deployment + purge + public boundary + editorial UTF-8 + R2 E2E to pass.
4. Re-run/observe Production Asset Delivery Gate and Gate-15/QUEUE-01 exact-SHA production evidence.
5. Verify `/business-jets` and `/yachts` live routes, headers, SEO metadata and structured data.
6. Update this MASTER with the exact Worker version, deployment ID, 100% traffic and fresh runtime evidence.
7. Only then continue to the next smallest open release gate.

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
The former `MASTER_PROJECT_STATUS.md` (phụ lục: APK_AUTOMATION_CHECKPOINT) has been consolidated into this MASTER. No separate APK checkpoint Markdown is canonical or required.

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


### 19.1 Phase 2 — executable pre-deploy automation
- Implementation branch: `feat/ai-predeploy-automation`.
- Adds PR workflow `.github/workflows/ai-predeploy-audit.yml` with check name `AI Pre-Deploy Audit / Validate`; it runs only on pull requests to `main`, uses read-only repository permissions, audits the exact base/head diff, then executes deterministic regression tests.
- Adds `scripts/predeploy-audit.mjs`: deterministic first-line audit for hard-coded credentials/bearer tokens, sensitive logging, HTML injection sinks, wildcard CORS, unbounded loops, dynamic D1 SQL interpolation, Workers AI inference changes, Telegram delivery changes, delete/R2-style boundaries and cache changes.
- BLOCKER/HIGH findings exit non-zero and emit `DEPLOY LOCKED`. MEDIUM/LOW findings remain visible for review but do not by themselves claim production failure.
- Behavior-changing files under `src/`, `public/`, `scripts/` or Android source require a changed regression test in the same PR; otherwise the audit raises HIGH and blocks eligibility.
- Adds `test/predeploy-audit.test.js` to guard the audit contract and runs the repository `npm test` suite after the diff audit.
- This is intentionally deterministic and secret-free: no external GPT/OpenAI credential is introduced into Actions. ChatGPT/GPT remains the deeper PR-review/test-authoring layer, while this required-check candidate provides reproducible enforcement in GitHub CI.
- Phase 2 enforcement is **🟢 COMPLETE** as of 2026-09-24. PR #451 merged the executable audit; repository rules require `AI Pre-Deploy Audit / Validate` alongside `CI / Validate`.
- Negative enforcement proof: PR #452 / run `35942024544` intentionally added an inert synthetic credential-like fixture. The required audit emitted `[BLOCKER] Possible hard-coded credential`, `DEPLOY LOCKED: 1 unresolved BLOCKER/HIGH finding(s).`, and exited 1. The fixture was validation-only and must not be merged.
- Deploy-path root cause found during #452: `.github/workflows/deploy-cloudflare.yml` attached `environment: production` to its PR validation job, causing misleading production deployment metadata even though the actual production deploy job was skipped.
- PR #453 fixed that boundary and merged as exact main SHA `36ccdbda537766fad32924e4d5244a27faec5d7b`: PR validation no longer enters the production environment; only the real deploy job carries `environment: production`; deployment is fail-closed to successful validation on `refs/heads/main` for `push` or manual `workflow_dispatch`.
- PR #453 itself showed no PR deployment record. Exact-SHA post-merge production chain is green: Deploy Cloudflare Worker `35942571871`; Production Smoke Gate-15 `35942571841`; QUEUE-01 Production E2E Origin `35942638421`; Blog CMS Production E2E `35942638436`; CI `35942571826`; Android APK MVP `35942571935`; Release Gate Static Audit `35942571820`; Production Credential Safety `35942571898`; Admin PT Xtra Pipeline `35942571839`; Homepage Canonical Verify `35942571843`; Admin Redirect Verify `35942571870`; Stage 3 Production Reconciliation `35942571878`.
- Deploy run `35942571871` passed Cloudflare API/SDK deployment, public production boundary, editorial/Admin UTF-8 checks, and R2 Worker E2E GET -> DELETE -> 404. Gate-15 passed website/Worker, Admin auth, D1 CRUD, Gateway/AI quota-conservation boundaries, credential safety and R2 media lifecycle. QUEUE-01 passed signed Admin/App API session, dashboard, D1 CRUD and R2 lifecycle on the exact deployed revision. Blog CMS E2E passed CREATE -> READ -> public UTF-8 -> UPDATE -> DELETE -> 404.
- GPT/ChatGPT remains the deeper review/test-authoring layer; the GitHub required check is deterministic enforcement. No model judgment alone is production PASS evidence.


### 19.2 Image asset policy — canonical record
- Canonical rule: project status and operational policy updates are recorded in `MASTER_PROJECT_STATUS.md` only; do not create competing policy/status Markdown files.
- Website image uploads must be converted to **WebP** before production use when WebP satisfies the functional requirement.
- Preserve source aspect ratio, declare correct intrinsic `width`/`height`, optimize payload size, and use descriptive cache-safe/immutable production filenames.
- After a WebP replacement is verified and no required reference remains, remove the superseded JPG/PNG and add the smallest targeted regression coverage required by the pre-deploy audit.
- Founder article `/phan-thuan` uses `/images/phan-thuan-founder-office-2026.webp`; the replaced Founder JPEG has been removed.
- PR #465 removed `gx460-luxury.jpg`, `lx600-urban.jpg`, and `porsche-718-boxster.jpg` with targeted regression coverage. Final production status remains evidence-driven; do not mark GREEN from documentation alone.

## 20. GPT DEEP RESEARCH FREE-TIER AUDIT — 2026-09-27

### 20.1 Scope and immutable operating constraints
- Audit target: exact main SHA `ae6342d35879407b1be0ec859710da5e39b66d4e`.
- Cost policy: preserve Cloudflare Workers Free + Workers AI daily free allocation; do not introduce a paid dependency to make a gate green.
- Production deployment remains GitHub Actions -> Cloudflare API/SDK. **Wrangler is prohibited for this execution path and was not used by this audit.**
- S21 Ultra + Termux is an operator console for `gh`, `curl`, artifact retrieval and physical-device APK regression; it is not the canonical Android build server.
- Production status remains evidence-driven. No AI judgment, documentation edit, skipped assertion, or quota bypass can produce GREEN.

### 20.2 Exact-SHA production evidence
- Deploy Cloudflare Worker run `36306448263`: SUCCESS on `ae6342d`.
- Production Smoke Gate-15 run `36306448290`: SUCCESS on `ae6342d`.
- Android APK MVP run `36306448276`: SUCCESS on `ae6342d`.
- Production Asset Delivery Gate run `36306448310`: SUCCESS.
- Production Credential Safety run `36306448282`: SUCCESS.
- Release Gate Static Audit run `36306448275`: SUCCESS.
- Admin PT Xtra Pipeline run `36306448256`: SUCCESS.
- Homepage Canonical Verify run `36306448252`: SUCCESS.
- Admin Redirect Verify run `36306448246`: SUCCESS.
- Stage 3 Production Reconciliation run `36306448232`: SUCCESS.
- Blog CMS Production E2E run `36306493189`: SUCCESS.
- Live Chat AI Identity Verify run `36306493200`: SUCCESS.
- QUEUE-01 Production E2E Origin run `36306493199`: FAILURE only at Vehicle Vision inference after the independent D1/R2 lifecycle passed.
- QUEUE-01 runtime evidence: D1 delete -> 404 PASS; R2 upload 200 -> read OK -> delete 200 -> read-after-delete 404; workflow emitted `D1 + R2 lifecycle: PASS`.
- Vehicle Vision then returned HTTP 503 with diagnostic `RATE_LIMIT` / Cloudflare code `4006`: daily free allocation of 10,000 neurons exhausted.
- Therefore D1/R2 are not the current QUEUE-01 root cause. Do not weaken or bypass their assertions.
- Business Jets CRM Production E2E was skipped in the observed workflow_run chain and must be refreshed after the blocking dependency is healthy.

### 20.3 Deep Research findings — Free-tier budgets
- Cloudflare Workers Free: 100,000 requests/day, 10 ms CPU per HTTP invocation, 50 external subrequests/request, 5 Cron Triggers/account.
- Workers AI Free allocation: 10,000 neurons/day; resets at 00:00 UTC. Exceeding the allocation is a quota condition, not proof of an application defect.
- Cloudflare Workers AI error taxonomy distinguishes daily account limit `3036`/HTTP 429 from temporary capacity `3040`; application retry/fallback policy must keep these classes separate.
- D1 Free: 5 million rows read/day and 100,000 rows written/day.
- R2 Standard free tier: 10 GB-month storage, 1 million Class A operations/month, 10 million Class B operations/month, free Internet egress.
- AI Gateway core features are available on Free and include analytics, caching and rate limiting. Use these controls before adding paid capacity.
- GitHub Actions standard hosted runners are free for public repositories. For private GitHub Free repositories the included allowance is 2,000 minutes/month and 500 MB artifact storage; keep workflows efficient regardless of visibility.
- GitHub workflow/artifact retention defaults to 90 days and can be shortened. APK artifacts should use deliberately short retention unless a release artifact is explicitly required.

### 20.4 Source audit — neuron conservation
- `src/seo-ai.js` uses `@cf/meta/llama-3.1-8b-instruct-fast`, a hard attempt cap of 3, content fingerprints for idempotency, AI Gateway `default`, cache enabled with TTL 86400, and `cf-aig-metadata` surface `seo-cron`.
- SEO reconciliation stops immediately on recognized `3036/4006` daily quota exhaustion. PR #518 also reduced SEO reconciliation from every five-minute scheduler tick to hourly while retaining Telegram self-healing cadence.
- `src/vehicle-ai.js` records per-model diagnostics and `stopOnDailyQuota()` terminates the fallback chain immediately when daily allocation is exhausted. Run `36306493199` proves this behavior in production: only the first Vision model is reported before the gate exits.
- Keep these fail-fast rules. Do not add blind retries on daily quota exhaustion.

### 20.5 Optimized FREE roadmap
**P0 — protect the 10k-neuron daily pool**
1. Treat `3036/4006` as a circuit-breaker condition until the next 00:00 UTC reset; no same-request model fallback and no automated retry storm.
2. Reserve production Vision inference for real user flows and one controlled release verification. Deterministic CI/unit tests must mock provider responses rather than spend neurons.
3. Keep SEO hourly + max 3 attempts, but skip AI completely when all recent published posts have matching fingerprints.
4. Use AI Gateway Free analytics/rate limiting/caching to separate `surface=seo-cron`, chat and vehicle-vision usage and identify the surface consuming the daily pool.
5. Do not move to Paid merely to make QUEUE-01 green. Paid is outside this roadmap unless the owner explicitly changes the cost policy.

**P1 — GitHub Actions efficiency**
1. Add/retain workflow-level concurrency for push/deploy/E2E families so superseded commits do not run duplicate expensive gates.
2. Make deterministic CI a prerequisite; trigger production E2E only after successful exact-SHA deployment rather than duplicating AI checks across independent workflows.
3. Keep APK compilation in GitHub Actions; S21 Ultra is for install/runtime regression. Do not build the canonical APK in Termux.
4. Set short artifact retention for debug APKs and transient diagnostics; preserve only intentional release artifacts.
5. Keep production deployment API/SDK-based. No Wrangler dependency or Wrangler auth path.

**P2 — Android/S21 Ultra operating model**
1. GitHub Actions produces the signed/approved APK artifact; Android packages must remain signed for install/update.
2. APK must call PHAN THUẦN XTRA server APIs over secure HTTPS and must not embed GitHub or Cloudflare administrative tokens.
3. Termux may use the operator's authenticated `gh` session to inspect/rerun Actions and retrieve artifacts; those credentials stay outside the APK.
4. Physical regression on S21 Ultra should cover launch/login, API health, image selection/camera, Vehicle Vision success when quota is available, graceful quota-exhausted UX, and no plaintext-secret exposure.
5. Record APK run ID, artifact digest/version and physical-device result in this MASTER before final release closure.

### 20.6 Current decision and next execution checkpoint
- Current exact-SHA deployment, Gate-15, Android build, Blog E2E, D1 and R2 evidence are GREEN.
- **QUEUE-01 remains RED for one external resource boundary: Workers AI daily free neuron allocation.**
- This is intentionally not patched around. The correct Free-tier recovery is to wait for the daily allocation reset, execute one controlled failed-job rerun, and require Vehicle Vision HTTP 200/model assertion.
- After QUEUE-01 succeeds, refresh the skipped Business Jets CRM Production E2E dependency and record its result.
- Final production GREEN remains locked until the required current-lineage E2E set is complete and the S21 Ultra physical APK regression required by the release policy is recorded.

### 20.7 Research sources used for this checkpoint
- Cloudflare Workers AI pricing and errors documentation.
- Cloudflare Workers platform limits/pricing and R2 pricing documentation.
- Cloudflare AI Gateway pricing/features and Workers AI prompt caching documentation.
- GitHub Actions billing, concurrency and artifact/log retention documentation.
- Android Developers release signing and security guidance.


---

## 21. 2026-09-28 — Publishing image lifecycle production GREEN (run #1460)

### 21.1 Scope and deployment policy
- Website Worker production deployment remains **GitHub Actions -> Cloudflare API/SDK only**.
- Wrangler production deployment path remains **NOT USED**.
- Final production lineage for this checkpoint: main merge SHA `07224d939714629d28c1186a76e8bcd4804d5b31`.
- Deploy Cloudflare Worker run `36373328943` (#1460): **SUCCESS**.

### 21.2 Audit trail and root-cause isolation
- PR #536 `fix: use supported Cloudflare Images output contract` auto-merged as `f9052c7f2b6b7ba54f98eaf930642946806be842`.
- During PR #536 audit, an existing editorial publishing regression test failed because its Images mock still asserted the retired `metadata: 'none'` output option. The mock was updated to assert the supported contract `{format:'image/webp', quality:85}`; required checks then passed before auto-merge.
- Production run `36372377834` (#1447) deployed successfully through API/SDK and passed public boundary, editorial UTF-8, Admin UTF-8 and R2 E2E, but publishing image lifecycle still failed closed at `normalize` with HTTP 422.
- PR #537 `fix: expose sanitized Images normalize reason` added bounded/sanitized authenticated diagnostics. URLs and credential-like long tokens are redacted; image bytes and secrets are not returned.
- PR #537 auto-merged as `6383be188eb1da4c4a68c444b0220529e9f7b1e0`.
- Production run `36372529016` (#1449) produced the exact Cloudflare Images root cause: `IMAGES_TRANSFORM_ERROR 9516` — JPEG decode failed because the smoke fixture was incomplete/damaged.
- Therefore the Images binding itself was not the blocker, and D1/R2 were not the blocker. The production gate fixture was invalid.
- PR #542 `test: use decodable JPEG for publishing production gate` replaced only the damaged Base64 JPEG smoke fixture with a freshly encoded baseline JPEG, preserving the real Images normalize -> WebP path and all fail-closed privacy assertions.
- PR #542 required `CI / Validate` and `AI Pre-Deploy Audit / Validate` passed and auto-merge completed as `07224d939714629d28c1186a76e8bcd4804d5b31`.

### 21.3 Final production evidence — run 36373328943 (#1460)
All required production deploy steps completed successfully on the exact final lineage:
- Deploy and migrate through Cloudflare API/SDK: **PASS**
- Diagnose Workers AI account allocation: **PASS**
- Purge changed Admin HTML cache: **PASS**
- Verify public production boundary: **PASS**
- Verify editorial production UTF-8: **PASS**
- Verify Admin UTF-8 asset delivery: **PASS**
- R2 Worker E2E GET -> DELETE -> cache-busted GET: **PASS** (`200 -> 200 -> 404`)
- Verify publishing draft image public URL lifecycle: **PASS**
- Deployment completed: **PASS**
- Publishing E2E log: `image WebP -> private draft 404 -> idempotent retry -> publish -> public HTML UTF-8 + cover PASS.`
- Temporary publishing post/media cleanup: **PASS**
- Deployment log explicitly confirms: `Wrangler production deployment path: NOT USED`.

### 21.4 Status decision
- **Images Binding / WebP conversion: GREEN in production.**
- **Publishing API image upload + draft -> publish -> public URL lifecycle: GREEN in production.**
- **R2 GET -> DELETE -> 404: GREEN on the same deployment lineage.**
- **HTML/Admin/editorial UTF-8 gates: GREEN on the same deployment lineage.**
- This closes the publishing-image production blocker that began with the earlier HTTP 500/422 normalize failures.
- Do not reuse the damaged historical JPEG fixture.
- Keep the sanitized stage diagnostic and fail-closed image privacy behavior as regression protection.

### 21.5 Next product-level work
- Configure/test the private ChatGPT GPT Action against the now-green publishing API.
- Run one real attached-image GPT flow: upload -> Gemini privacy processing -> draft -> explicit publish -> exact public URL.
- Run live Telegram general-article draft/publish/schedule/batch checks.
- Keep secrets out of chat and out of APK/client code.

---

## 21. Admin/GPT publishing + Gemini cover privacy — production closure (2026-09-28)

### 21.1 Scope and deployment policy
- Feature lineage began with PR #527, merge SHA `720f18b58ef033f7b0baec60b8201d19d1333e1f`.
- Production deployment remains **GitHub Actions -> Cloudflare API/SDK only**. Wrangler was not used as the production deployment mechanism.
- Required release boundary: authenticated image upload -> Gemini plate privacy -> WebP/R2 -> private draft -> idempotent retry -> publish -> public UTF-8 HTML + cover -> cleanup.

### 21.2 Evidence and root-cause chain
- Run #1440 / `36369563500`: deployment and UTF-8/R2 gates passed; publishing image upload returned HTTP 500. PR #535 added fail-closed stage diagnostics and bounded production evidence.
- Run #1444 / `36371943585`: exact failure isolated to image stage `normalize`, HTTP 422.
- PR #536 removed unsupported Images output metadata and aligned regression mocks. Run #1447 / `36372377834` still failed at normalize, proving this was not the sole root cause.
- PR #537 added bounded/sanitized Images exception evidence. Run #1449 / `36372529016` identified Cloudflare Images error 9516: the JPEG smoke fixture was incomplete/damaged.
- PR #538 replaced the damaged JPEG fixture with a complete JPEG and added a pre-upload JPEG completeness guard.
- Run #1451 / `36372689334`: image normalize/privacy/WebP path passed; blocker moved to `POST /api/publish/v1/posts` HTTP 500.
- PR #539 exposed bounded API failure response. PR #540 exposed bounded/sanitized runtime reason.
- Run #1456 / `36373119562`: exact D1 root cause identified: `D1_ERROR: LIKE or GLOB pattern too complex: SQLITE_ERROR`.
- PR #541 replaced request-key wildcard prefix matching with deterministic `instr(request_key, prefix)=1` checks and added regression coverage.

### 21.3 Final production evidence — GREEN
- PR #541 auto-merged to main at merge SHA `9bc79f8b8008823b483abffc0394f4435ee38459`.
- Deploy Cloudflare Worker **#1458**, run `36373260032`, completed **SUCCESS** on that exact main SHA.
- Deploy and migrate through Cloudflare API/SDK: PASS.
- Public production boundary: PASS.
- Editorial production UTF-8: PASS.
- Admin UTF-8 asset delivery: PASS.
- R2 Worker E2E: upload -> authenticated GET 200 -> DELETE 200 -> cache-busted GET 404: PASS.
- Publishing E2E: **image WebP -> private draft 404 -> idempotent retry -> publish -> public HTML UTF-8 + cover: PASS.**
- Publishing temporary post/media cleanup: PASS.
- Deployment completed: PASS.
- Final deployment log explicitly states: `Wrangler production deployment path: NOT USED`.

### 21.4 Status decision
- **Admin/GPT publishing production lifecycle: GREEN on run #1458.**
- **Gemini cover privacy + Cloudflare Images + R2 publishing path: GREEN on run #1458.**
- This closes the publishing deployment blocker tracked from runs #1440/#1444/#1447/#1449/#1451/#1454/#1456.
- Telegram live-command verification, private GPT Action configuration, and device-specific Android release checks remain separate follow-up scopes and must not be inferred GREEN from this publishing deployment result.


---

## 22. 2026-09-28 — Telegram CI/Stage3 notification spam suppression + adaptive image audit

### 22.1 Telegram notification spam root cause
- Production Stage3/CI E2E creates and deletes temporary car rows such as `stage3-*`, `ci-e2e-*`, and `ci-origin-e2e-*`.
- Those CRUD operations correctly write `cms_audit_log` rows.
- `reconcileTelegramNotifications()` previously forwarded every car create/update/delete audit row to the real Telegram chat, so routine production reconciliation produced repeated “ĐÃ TẠO/ĐÃ XOÁ BÀI XE” messages.
- The problem was notification filtering, not D1 CRUD correctness.

### 22.2 Fix — PR #548
- PR #548 `fix: stop CI and Stage3 Telegram notification spam` passed required `CI / Validate` and `AI Pre-Deploy Audit / Validate`, then auto-merged normally.
- Merge SHA: `4767ebb9fb11a887ec61cd14a46d41d91878345b`.
- Notification reconciler now suppresses only car audit IDs with known automation prefixes:
  - `stage3-`
  - `ci-e2e-`
  - `ci-origin-e2e-`
- Suppressed rows still advance `telegram_notification_cursor.last_audit_id`, preventing backlog/replay.
- Real vehicle create/update/delete notifications remain unchanged.
- Targeted regression tests verify the suppression prefixes and that filtering is scoped to car audit events.
- Production run #1470 (`36374686793`) successfully completed the API/SDK deploy step for this merge, so the suppression code reached the website Worker.
- Stage3 run #302 on the same merge lineage completed successfully.
- No Wrangler production deployment was introduced.

### 22.3 Separate adaptive image delivery audit
- PR #546 added exact production assertions for canonical WebP plus AVIF/WebP content negotiation.
- PR #547 repaired verifier syntax; no runtime image behavior change.
- Production #1468 reached the adaptive gate and exposed missing `Vary: Accept`.
- PR #549 `fix: preserve AVIF/WebP negotiation headers` passed required checks and auto-merged as `434a71af8e5dff44f532f1a67a7c08399c1f637c`.
- Production #1473 (`36374899466`) successfully deployed that exact SHA through Cloudflare API/SDK; public boundary, editorial UTF-8, Admin UTF-8, and R2 `200 -> 200 -> 404` all passed.
- Publishing cleanup passed, but adaptive publishing verification still failed because the edge response observed `Vary: null` instead of `Vary: Accept`.
- Therefore **WebP canonical remains the stable storage contract**, while **AVIF adaptive delivery is NOT yet declared GREEN**.
- Do not weaken/remove this gate merely to obtain a green workflow. Cloudflare Vary/cache configuration must be reconciled with the Worker response behavior before declaring adaptive caching complete.

### 22.4 Current decision
- Telegram CI/Stage3 audit-message suppression: **MERGED + DEPLOYED**.
- D1 production reconciliation: **PASS**.
- R2 lifecycle on current lineage: **PASS**.
- Fail-closed plate privacy behavior: **retained**.
- WebP canonical: **retained**.
- AVIF adaptive delivery: **BLOCKED on edge Vary/cache negotiation evidence; no false GREEN**.


---

## 23. 2026-09-28 — AVIF adaptive delivery audit closure

### 23.1 Goal
- Preserve canonical privacy-safe WebP in R2.
- Deliver WebP explicitly with `?format=webp`.
- Deliver AVIF explicitly with `?format=avif` when the Cloudflare platform/account returns a genuine `Content-Type: image/avif`.
- Keep fail-closed plate privacy unchanged and do not fake AVIF via headers.

### 23.2 Evidence chain
- PR #551 introduced explicit Free-tier URL variants to avoid relying on `Vary: Accept`.
- Run #1477 (`36375311230`) deployed that lineage but timed out before identifying the exact variant.
- PR #552 added path-specific diagnostics without weakening assertions.
- Run #1479 (`36376081822`) proved canonical WebP PASS; explicit WebP request returned a valid WebP representation, while edge custom headers were stripped.
- PR #553 changed the gate to verify the representation itself by HTTP status + Content-Type.
- Run #1483 (`36376374445`) proved canonical WebP PASS and explicit WebP PASS, while `?format=avif` returned `Content-Type: image/webp`.
- PR #554 attempted separate Images transform identities; run #1485 (`36376519494`) still returned WebP for the AVIF request.
- PR #555 attempted materializing a derived AVIF object from Images binding output; run #1488 (`36376778743`) still observed `image/webp`.
- Cloudflare official docs dated 2026-09-02 state Images binding supports `.output({format:"image/avif"})`, and 2026-07-02 docs state `cf.image.format="avif"` supports Worker-side content negotiation.
- PR #556 switched explicit AVIF delivery to a documented `fetch(...,{cf:{image:{format:"avif",quality:76}}})` subrequest with a source loop guard.
- Run #1492 (`36377080746`) again proved:
  - canonical WebP: PASS
  - explicit `?format=webp`: PASS
  - explicit `?format=avif`: FAIL because observed `Content-Type: image/webp`
  - R2 lifecycle: PASS
  - public/editorial/Admin UTF-8 gates: PASS
  - deploy through Cloudflare API/SDK: PASS
  - Wrangler production path: not used.

### 23.3 Status decision
- **WebP canonical storage: GREEN.**
- **Explicit WebP delivery: GREEN.**
- **Plate privacy fail-closed behavior: GREEN / unchanged.**
- **R2 lifecycle and UTF-8 boundaries: GREEN on current lineage.**
- **AVIF adaptive delivery: BLOCKED by observed Cloudflare platform/account behavior.**
- Do not declare AVIF GREEN and do not spoof `Content-Type: image/avif` when the representation is actually WebP.
- Re-open AVIF only when a production probe on this account returns a genuine AVIF representation from a supported Cloudflare path.


---

## 24. 2026-09-28 — AVIF preference contract corrected; production #1499 GREEN

This section supersedes the AVIF status decision in Section 23.

### 24.1 Root cause
Cloudflare Images documents `format=avif` as an AVIF preference, not an unconditional output guarantee. Cloudflare may fall back to WebP or JPEG when AVIF cannot be encoded quickly. Production runs #1483/#1485/#1488/#1492 consistently returned a valid WebP representation for the AVIF preference; the old verifier incorrectly required unconditional `image/avif`.

### 24.2 Correct contract
- Canonical R2 representation remains privacy-safe WebP.
- `?format=webp` must return HTTP 200 + `image/webp`.
- `?format=avif` requests AVIF through the documented Cloudflare transform path.
- The project gate accepts `image/avif` or Cloudflare's documented `image/webp` fallback and logs which representation was delivered.
- The project does not spoof AVIF headers.
- Fail-closed plate privacy and publishing lifecycle assertions remain unchanged.

### 24.3 Final production evidence
PR #558 aligned the verifier with Cloudflare's documented AVIF fallback contract.
PR #559 gave only `/api/publish/v1/media` a 60-second verification timeout for privacy/image processing latency and retained all correctness assertions.

Production deploy #1499, run `36378458772`, exact merge SHA `cbd50868187bddb5cf4680be2e3e5229c794215e`:
- Cloudflare API/SDK deployment: PASS
- public production boundary: PASS
- editorial UTF-8: PASS
- Admin UTF-8: PASS
- R2 GET -> DELETE -> 404: PASS
- canonical WebP: PASS
- explicit WebP variant: PASS
- AVIF preference: PASS (documented WebP fallback observed)
- private draft 404 -> idempotent retry -> publish -> public HTML UTF-8 + cover: PASS
- temporary publishing post/media cleanup: PASS
- deployment completed: PASS
- Wrangler production deployment path: NOT USED

### 24.4 Final status
- **Production deployment lineage #1499: GREEN.**
- **Canonical WebP: GREEN.**
- **Explicit WebP delivery: GREEN.**
- **AVIF preference with documented Cloudflare fallback: GREEN.**
- **Publishing lifecycle: GREEN.**
- **R2 lifecycle: GREEN.**
- **UTF-8 public/Admin/editorial boundaries: GREEN.**
- **Plate privacy fail-closed behavior: unchanged.**


---

## 25. 2026-09-28 — Telegram E2E notification suppression completed

### 25.1 Incident
Telegram received create/update/delete notifications for automation records. The earlier #548 suppression covered Stage3/CI IDs such as `stage3-*`, `ci-e2e-*` and `ci-origin-e2e-*`, but production publishing E2E uses legacy numeric car audit IDs. Examples observed by the operator included numeric IDs 91/92 from publishing lifecycle tests.

### 25.2 Root cause and fix
- `src/telegram-notifications.js` previously identified automation only from prefixed `resource_id`.
- Publishing E2E audit rows use `resource="car"` with numeric IDs, so they bypassed the prefix filter.
- PR #561 adds an explicit `PTX-E2E` marker to the production publishing test title.
- The Telegram reconciler suppresses only car audit rows with known automation ID prefixes or an exact `PTX-E2E` summary marker.
- Suppressed audit rows still advance `telegram_notification_cursor`, preventing replay.
- Real vehicle notifications remain unchanged.
- PR #561 also fixes the suppressed-path `processed` counter that had been incremented twice.

### 25.3 Production evidence
PR #561 auto-merged as `e6e06540c1a63ee9057ec209c37015441c1f0aaa`.

Deploy Cloudflare Worker #1502, run `36379209171`:
- API/SDK deployment: PASS
- public/editorial/Admin UTF-8: PASS
- R2 GET -> DELETE -> 404: PASS
- canonical WebP: PASS
- explicit WebP: PASS
- AVIF preference with documented WebP fallback: PASS
- publishing lifecycle + cleanup: PASS
- deployment completed: PASS
- Wrangler production deployment path: NOT USED

Stage 3 Production Reconciliation #315, run `36379209250`: PASS on the same lineage.

### 25.4 Evidence boundary
GitHub Actions proves the suppression code is merged and deployed and that both publishing E2E and Stage3 complete successfully. It does not by itself prove absence of a Telegram message from the independently scheduled notification reconciler. Treat direct bot silence / reconciler suppression logs as the final observational confirmation if needed; do not claim that observation without evidence.

### 25.5 Status
- **Known Stage3/CI Telegram automation spam suppression: GREEN.**
- **Publishing E2E numeric-ID suppression path: MERGED + DEPLOYED.**
- **Production deploy #1502: GREEN.**
- **Stage3 #315: GREEN.**


---

## 26. 2026-09-28 — Unified ChatGPT / Telegram / Admin publishing pipeline

### Architecture
- ChatGPT, Telegram and Admin converge on the same website publishing backend and D1/R2 data plane.
- GitHub is code/deployment/audit only; article images are not committed to GitHub.
- `/api/publish/v1/media` remains the shared ChatGPT/Admin media contract.
- Telegram AI photo-blog now reuses `storePublishingImage()`: Gemini plate detection -> fail-closed redaction/review -> canonical WebP -> Cloudflare R2 -> article.
- The legacy Telegram AI-blog path that wrote the raw Telegram JPEG/PNG directly to R2 has been removed.
- OpenAPI remains at `/openapi/publishing.json` for the private GPT Action.

### Changes
- PR #563: unified Telegram AI photo-blog with the privacy-safe publishing media pipeline; merged `bef9615998aef9045b3fabca8f0e0e645829a595`.
- Production #1507 deployed the unified code but correctly failed closed when Gemini detection timed out; no unverified image was stored.
- PR #564: bounded one-time retry for transient Gemini timeout/AbortError/429/5xx; privacy remains fail-closed; merged `ad500662a93647c32929032acff1cf1f1824e183`.
- Production #1510 reached Gemini verification but still failed closed on provider timeout.
- PR #565: production verifier retries the whole upload only for explicit transient Gemini detect/verify timeout failures; all other failures remain immediate.
- PR #565 merged `83afab602c7228b83c43433cd183b0b793b75693`.

### Final production evidence
Deploy Cloudflare Worker #1512, run `36380553663`, exact SHA `83afab602c7228b83c43433cd183b0b793b75693`:
- API/SDK deployment: PASS
- public/editorial/Admin UTF-8: PASS
- R2 GET -> DELETE -> 404: PASS
- privacy-processed publishing image upload: PASS
- canonical WebP: PASS
- explicit WebP: PASS
- AVIF preference with documented WebP fallback: PASS
- private draft 404 -> idempotent retry -> publish -> public HTML UTF-8 + cover: PASS
- temporary post/media cleanup: PASS
- deployment completed: PASS
- Wrangler production deployment path: NOT USED

### Status
- **Unified publishing backend/media contract: GREEN in production.**
- **ChatGPT publishing API/OpenAPI: production backend GREEN; account-side GPT Action connection still requires the owner to configure the private Action with PUBLISH_API_KEY.**
- **Telegram AI photo-blog privacy/storage path: merged and deployed on the unified contract.**
- **Admin remains an authorized publishing surface on the same D1/R2 backend.**
- **Automatic publishing must remain gated by authorization and fail-closed image privacy; provider uncertainty must not publish the original image.**


---

## 27. 2026-09-28 — Flexible media policy production audit (#567 / #1517)

### Merged implementation
PR #567 `feat: add flexible publishing media policy and metadata` merged as `c227b60408adf9b43d1dc42a69a18db03b1cd5b4`.

The shared publishing media policy now records:
- image input limit: 15 MiB;
- gallery policy ceiling: 20 images/article (policy only; gallery endpoint/E2E is not yet claimed complete);
- canonical image storage: WebP;
- delivery formats: WebP plus AVIF preference/fallback contract;
- video policy: simple-upload ceiling 100 MiB and multipart above that threshold (policy only; MP4 upload/transcode endpoint/E2E is not yet claimed complete);
- D1 `media_assets` metadata: `r2_key`, `url`, `media_type`, `content_type`, `size_bytes`, `width`, `height`, `duration_ms`, `canonical_format`, `privacy_status`;
- fail-closed Gemini license-plate privacy remains required before an image is stored by the publishing path.

### Exact production evidence
Deploy Cloudflare Worker #1517, run `36382157834`, exact SHA `c227b60408adf9b43d1dc42a69a18db03b1cd5b4`: **SUCCESS**.
- D1 migration `0017_media_assets.sql`: applied.
- Cloudflare API/SDK deployment: PASS.
- public/editorial/Admin UTF-8 gates: PASS.
- R2 GET -> DELETE -> 404: PASS.
- publishing canonical WebP: PASS.
- explicit WebP: PASS.
- AVIF preference: PASS with documented WebP fallback.
- private draft -> idempotent retry -> publish -> public HTML UTF-8 + cover: PASS.
- publishing cleanup: PASS.
- Wrangler production deployment path: NOT USED.

Additional same-SHA evidence:
- CI #906: SUCCESS.
- Stage 3 Production Reconciliation #321: SUCCESS.
- Production Smoke Gate-15 #401: SUCCESS.
- Release Gate Static Audit #1067: SUCCESS.
- Android APK MVP #1546: SUCCESS.
- Blog CMS Production E2E #378: SUCCESS.

### Audit exception — do not mark the entire project all-green
QUEUE-01 Production E2E Origin #748, run `36382295549`: **FAILURE**.
- authenticated Admin/App sessions: PASS;
- D1 CRUD lifecycle: PASS;
- R2 write/read/delete/404 lifecycle: PASS;
- failure occurs only at the real Workers AI Vision inference;
- production response: HTTP 503, `VEHICLE_AI_UNAVAILABLE`, diagnostic `RATE_LIMIT`, Cloudflare code 4006: daily free allocation of 10,000 neurons exhausted.

This is an external account-allocation blocker, not evidence of a regression in PR #567's publishing media policy. Do not weaken or skip the AI/privacy checks to manufacture a green result.

### Current status
- **Flexible WebP/AVIF publishing image policy: PRODUCTION GREEN.**
- **D1 media metadata migration: PRODUCTION GREEN.**
- **15 MiB image limit: DEPLOYED.**
- **Gallery 20-image policy: DEFINED, endpoint/E2E still pending.**
- **Video 100 MiB/multipart policy: DEFINED, MP4/transcode/upload E2E still pending.**
- **Whole-project all-green claim: BLOCKED by Workers AI daily quota in QUEUE-01 #748.**


---

## 28. 2026-09-30 — CANONICAL VEHICLE PUBLISHING STANDARD

## Purpose
This file is the source-of-truth for all current and future vehicle listings published from Telegram/AI/editorial workflows.

## 1. Owner-reviewed copy
- Owner-reviewed copy is authoritative. Publishing must preserve its Vietnamese UTF-8 text exactly.
- Preserve paragraph breaks, headings, emoji, bullets and intentional blank lines.
- Never flatten the description into one paragraph.
- HTML vehicle pages must be served as `text/html; charset=utf-8`.
- Deployment gates must reject known mojibake patterns such as `PHAN THUáº¦N`, `Chi tiáº¿t`, `Ä‘`, and `BĂ`.

## 2. Price and ODO
- Store price and mileage as normalized numeric values in the vehicle record; format only at presentation time.
- Website display uses Vietnamese-friendly formatting, e.g. `12.000 km` and `4,580 tỷ` when supplied/approved by the owner.
- Never silently replace an owner-approved price or ODO with AI inference.
- Editing an already-published listing must update the existing vehicle ID; never republish solely to change price, ODO, description, or image order.

## 3. Image ordering
Every listing must preserve all approved images and use this semantic order:

1. **Human/model priority** — tasteful approved image containing a person/model with the vehicle, when present and suitable.
2. **Front hero** — strongest front or front three-quarter exterior view.
3. **Exterior progression** — front → front three-quarter → side/profile → rear three-quarter → rear.
4. **Exterior details** — wheels, lights, badges, grille, trim, engine/bay or other useful details.
5. **Cockpit transition** — dashboard / steering / driver's view.
6. **Interior progression** — front seats → rear seats → console → doors → cargo area.
7. **Interior details** — screens, controls, materials, options and close-ups.
8. Remaining useful approved images.

Do not sort by Telegram filename, upload ID, timestamp, hash, or lexical filename when visual content is available.

## 4. Gallery contract
- First ordered image is the hero/cover.
- Every remaining approved image must appear in the detail gallery.
- Do not drop images merely because there are more than a UI preview limit.
- Gallery must be responsive and lazy-load non-hero images.
- Clicking a gallery image may open the full image without changing listing data.
- Media URLs must preserve R2 path separators; encode path segments, never encode the entire key into `%2F`.

## 5. Safety and idempotency
- A published vehicle has one canonical ID (for Telegram listings, e.g. `tg-<inbox-id>`).
- Price/ODO/copy/gallery edits update that canonical record.
- Never rerun publish to perform an edit.
- Telegram confirmation failure must not be interpreted as publication failure.
- Telegram link previews should be disabled on publish confirmation where they can cause `WEBPAGE_CURL_FAILED`.

## 6. Required pre-publish checks
Before publish or update is considered complete:
- owner-reviewed copy present when required;
- UTF-8 positive checks pass and mojibake negative checks pass;
- price and ODO match owner-approved values;
- image count matches approved media count;
- semantic image order has been reviewed or produced by a visual classifier;
- hero image is intentional;
- all media URLs resolve using preserved path separators;
- preview is reviewed before first publish;
- regression/CI gates pass.

## 7. Production verification
After deployment:
- verify the canonical vehicle detail URL returns HTTP 200;
- verify `Content-Type: text/html; charset=utf-8`;
- verify Vietnamese text renders without mojibake;
- verify price and ODO display correctly;
- verify hero + full remaining gallery count;
- verify image order visually;
- verify API data and page data refer to the same canonical vehicle ID.

Do not declare FINAL GREEN until production evidence passes these checks.

## 8. Current reference case
The Lexus RX500h F SPORT PERFORMANCE listing `tg-527` established the regression requirements:
- preserve owner-reviewed multiline editorial copy;
- render 1 hero plus all remaining approved images;
- avoid encoded `%2F` media paths;
- do not republish for edits;
- target owner-approved ODO `12.000 km` and price `4,580 tỷ`;
- prioritize a suitable image containing a person/model, then order exterior front-to-rear and interior logically.

Future listings must follow the same rules without requiring per-listing code changes.

## 9. Mandatory typography, UTF-8 and visual-gallery invariants for every future vehicle
These are permanent publishing gates, not optional styling preferences.

### Typography and layout preservation
- Vehicle publishing/update code must not silently redesign the canonical vehicle detail page.
- Preserve the approved site font stack, heading hierarchy, spacing, responsive detail grid, description line-height, action buttons and gallery layout unless the owner explicitly approves a design change.
- Vehicle-specific data corrections (price, ODO, copy, cover, image order) must remain data changes and must not mutate shared typography/CSS without a separately reviewed UI change.
- Regression tests must protect the canonical detail layout whenever `public/car.html` or shared vehicle styles change.

### UTF-8 end-to-end invariant
- Vietnamese content is UTF-8 at ingestion, D1 storage, API JSON serialization, HTML delivery and browser rendering.
- HTML must declare UTF-8 and be served with `text/html; charset=utf-8`; JSON must be delivered as UTF-8-compatible `application/json`.
- Production verification must check real Vietnamese markers, not only HTTP status.
- Known mojibake markers such as `LiÃªn`, `há»`, `Ä`, `ð`, `PHAN THUáº¦N` must fail the relevant gate when they represent decoded production content.
- Console display encoding must be distinguished from server corruption: verify raw response bytes/headers or a UTF-8-capable client before modifying stored copy.

### Image URL invariant
- Canonical public media URLs use `/media/vehicles/...`, never `/media/vehicles%2F...`.
- Encode each key path segment independently; preserve `/` separators.
- Existing legacy records containing encoded separators must be reconciled when edited.
- A media URL regression test is required for publishing code that creates or rewrites vehicle image URLs.

### Semantic image-order invariant
- Upload/Telegram order is ingestion order only; it is never automatically accepted as presentation order when image content can be inspected.
- Before first publish, a visual classifier or explicit human review must assign semantic roles to approved images.
- Required presentation sequence remains: suitable human/model → strongest front/front-3/4 hero → exterior front-to-rear → exterior details → cockpit → front seats → rear seats → console/doors/cargo → interior details → remaining useful images.
- The chosen first item is the only cover (`is_cover=1`); all subsequent approved items receive deterministic contiguous `sort_order` values.
- Never infer semantic order from Telegram message number, filename, upload ID, timestamp, R2 hash or lexical sorting.
- If visual classification is unavailable or uncertain, publishing must retain a review-needed state rather than inventing semantic order.
- Reordering an existing vehicle updates the same canonical vehicle ID and must never create a duplicate listing.

### Required automated regression coverage
Any change to vehicle publishing, persistence, API normalization, media URL generation or detail rendering must include targeted regression coverage for the behavior changed. At minimum the permanent suite must protect:
1. owner-reviewed Vietnamese multiline copy survives without mojibake;
2. approved numeric price/ODO survive normalization;
3. media keys preserve path separators;
4. cover and contiguous gallery `sort_order` are deterministic;
5. all approved images remain present;
6. canonical vehicle ID remains unchanged during edits;
7. detail-page typography/layout contract remains intact unless explicitly changed.

### Production completion gate
A vehicle publish/update is not FINAL GREEN until production evidence verifies: canonical ID, UTF-8 text, approved price/ODO, intentional hero, full approved image count, semantic gallery order, canonical non-`%2F` media URLs, HTTP/Content-Type health, and required deployment/R2 gates.


## 10. Telegram standard operating procedure for a new vehicle
This is the default owner workflow for future vehicle listings. A normal new listing must not require a vehicle-specific PR or production repair.

### Owner steps
1. Send `/carnew` and wait for confirmation that a new clean vehicle session is open.
2. Send the owner-authored vehicle copy. Include the exact numeric price and numeric ODO only when the owner actually has an approved ODO value. “Xe mới 100%” must not be converted into an invented numeric ODO; when no numeric ODO is supplied, use the established unknown/contact state.
3. Send the complete image set for that vehicle once, preferably as one Telegram album. Do not resend an album merely because background processing is still running.
4. After Telegram has finished uploading the album, send `/carfinish` exactly once and wait for the draft/Inbox result.
5. Review with `/carpreview <Inbox>`. Confirm vehicle identity, exact owner price, ODO/contact state, owner copy without repetition or mojibake, approved image count, intentional cover, and semantic gallery order.
6. Only after the preview is approved, send `/carpublish <Inbox>` exactly once.
7. Do not rerun `/carpublish` to repair copy or gallery. Any edit must retain the same canonical vehicle ID.

### Permanent data and media rules
- Owner-approved price and numeric ODO are authoritative locks; AI must never overwrite them.
- AI may assist vehicle recognition and visual classification, but uncertainty must not be converted into invented owner data.
- One vehicle has one canonical ID; retries and edits must not create duplicate listings.
- Gallery repair must not be implemented by republishing the vehicle.
- Presentation order must be semantic, not derived from Telegram IDs, filenames, upload order, timestamps or hashes.
- Standard gallery flow: suitable human/model when appropriate → strongest whole-vehicle/front/front-3/4 hero → exterior views → cockpit/front seats → rear seats → console/doors/interior details → cargo → remaining useful images.
- The first ordered image is the only cover and public `sort_order` is deterministic and contiguous.

### Defender tg-605 lesson and boundary
The successful Defender `tg-605` recovery is a reference outcome, not the normal publishing mechanism. Vehicle-specific recovery behavior such as `/caradd 605`, hard-coded `TG605_MEDIA_ORDER`, old-media recovery, or `tg-605` reconciliation must not be required for a future normal listing. Future vehicles should complete through `/carnew → owner copy + album → /carfinish → /carpreview <Inbox> → /carpublish <Inbox>` and the permanent production gates above.

---

## 29. 2026-10-01 — PR #660 durable `/carfinish` production closure and publishing SOP

### Exact lineage and production evidence
- PR #660 `fix(telegram): recover interrupted /carfinish through durable queue` merged to `main` as `8ddc245edb7a78c3b7a792f7068901fcaa4f0e36`.
- Deploy Cloudflare Worker #1781: SUCCESS on the exact merge SHA.
- Deploy verification: public/Admin/editorial UTF-8 PASS; R2 lifecycle GET 200 → DELETE 200 → cache-busted GET 404 PASS.
- Production Smoke Gate-15 #483: SUCCESS.
- QUEUE-01 Production E2E Origin #1014: SUCCESS.
- Blog CMS Production E2E #644 attempt 1 reached CREATE 201, public API 200, public page 200 and UTF-8 PASS before a transient `curl (35) Recv failure: Connection reset by peer`.
- Failed jobs were rerun without a source change. Attempt 2: SUCCESS, including create → read → public UTF-8 → update → delete → 404.
- Same merge lineage production workflows are GREEN after the successful rerun.

### Durable vehicle intake invariant
Normal future vehicle publishing uses:
`/carnew → owner copy + album → /carfinish → /carpreview <Inbox> → /carpublish <Inbox>`.

`/carfinish` checkpoints selected unique session photos and owner copy into the durable queue, closes intake and permits explicit recovery of interrupted `processing`/`failed` work. An interrupted gallery must not be repaired by resending the album, opening a second vehicle session or creating a vehicle-specific code PR.

### Operational rule — no PR per article/listing
Publishing content, retrying a transient network failure, recovering durable processing, editing owner data and verifying a canonical public record are operational/data actions. They are not code changes and must not require a per-article or per-vehicle PR.

Open a source PR only when evidence demonstrates a reusable code/contract defect. Do not use a PR as the retry mechanism for timeout, Telegram confirmation loss, connection reset, delayed queue processing or article-specific data correction.

Detailed owner instructions are consolidated below in this MASTER. `MASTER_PROJECT_STATUS.md` is the sole mandatory source-of-truth to read before any project work; do not create or rely on a competing status/runbook file.



### Detailed owner SOP — new vehicle

1. Send `/carnew` and wait for confirmation that a clean session is open. Never mix two vehicles in one session.
2. Send the final owner-reviewed copy. Preserve Vietnamese UTF-8, paragraph breaks, emoji and bullets. Owner-approved price/ODO are authoritative; AI must not invent or overwrite them.
3. Send the complete image set once, preferably one Telegram album. Wait for upload completion; do not resend the album because background processing is slow.
4. Send `/carfinish` after intake is complete. The command checkpoints unique photos + owner copy into the durable queue and closes intake.
5. If processing/response is interrupted, do not open a new session, resend photos, or create a PR. Retry `/carfinish` for the just-closed session so queued/processing/failed work can recover on the same vehicle.
6. When Inbox/draft is available, run `/carpreview <Inbox>`. Verify vehicle identity, owner copy, price, ODO/contact state, approved image count, intentional cover, semantic gallery order, UTF-8 and media URLs without encoded `%2F` separators.
7. Only after preview approval, run `/carpublish <Inbox>` once.
8. If Telegram confirmation times out, verify canonical status/URL before retrying. Confirmation failure does not prove publication failure.
9. After publish, verify the canonical URL: HTTP 200, `text/html; charset=utf-8`, correct Vietnamese copy, price/ODO, hero, complete gallery and same canonical vehicle ID.

### Detailed owner SOP — Blog

- Publish now: send `/post <title>` followed by the body on subsequent lines.
- Draft: send `/draft <title>` + body; review, then `/publish <ID>`.
- Schedule: send `/schedule YYYY-MM-DD HH:mm` + title/body. Time is Vietnam UTC+07:00.
- Use `/posts` to inspect state after a timeout instead of blindly creating a duplicate.
- Publishing API/GPT retries must reuse the same `request_id` for the same request.

### Failure handling without a repair PR

- Timeout/connection reset: read current state first, then retry/reconcile.
- Interrupted vehicle gallery: durable `/carfinish` recovery; never resend the full album as the first recovery action.
- Lost Telegram confirmation: verify canonical record/public URL before retry.
- Article/vehicle data correction: update the same canonical record; do not republish solely to edit.
- Create a source PR only for a reproducible shared code/contract defect. A normal publish, operational retry, queue recovery or one-record correction must not require a PR.

### Pre-publish checklist

- Latest relevant production Worker lineage is deployed and required publishing gates have no current related RED.
- Correct authorized bot/chat is being used.
- Owner copy is final; price/ODO are owner-approved or intentionally unknown.
- All media belongs to the same article/vehicle and is fully uploaded before finish.
- Preview is approved before first vehicle publish.
- Content/media/retry actions do not require GitHub commits.


---

## 30. 2026-10-01 — PR #662 responsive vehicle detail closure and next-listing readiness

### Exact lineage and production evidence
- PR #662 `fix(car): restore responsive detail layout` merged to `main` as `81d5e2129101c6ec388f4bb8323e180f2e37388a`.
- The change restores the shared vehicle detail layout for every listing; it is not a `tg-652`-specific data repair.
- Desktop contract: two-column hero/information layout; gallery uses the full shared container in three columns.
- Tablet/mobile contract: detail collapses to one column at `900px`; gallery becomes two columns at `760px` and one column at `420px`.
- Targeted regression coverage is in `test/car-detail-layout.test.js`, including owner-reviewed line breaks, complete gallery rendering and responsive layout breakpoints.
- Deploy Cloudflare Worker run `36810126218`: **SUCCESS** on the exact merge SHA. The deploy job checked out `81d5e2129101c6ec388f4bb8323e180f2e37388a`, uploaded the production Worker/assets and assigned 100% traffic to Cloudflare version `f383de8d-2ebb-46ad-8ada-98cc76b249de`.
- Deploy verification on that run: public production boundary PASS; editorial/Admin UTF-8 PASS; R2 lifecycle PASS; publishing draft-image lifecycle PASS.
- Production Smoke Gate-15 run `36810126143`: **SUCCESS**, including the production detail-page smoke.
- All 15 observed workflows on the merge SHA completed **SUCCESS**, including CI, Release Gate Static Audit, Production Asset Delivery Gate, Stage 3 Production Reconciliation, QUEUE-01 Production E2E Origin, Blog CMS Production E2E, Live Chat AI Identity Verify, Admin pipeline, credential safety and Android APK MVP.
- PR #662 branch was deleted after merge. No open PR remained at this closure audit.

### Audi Q7 reference listing `tg-652`
- Canonical ID remains `tg-652`; do not republish it for edits.
- Owner-approved structured values used for the completed listing: `AUDI Q7 3.0 TFSI`, model year `2017`, price `1.050.000.000 VNĐ`, ODO/contact display `Liên hệ`.
- Gallery contains 23 approved images. The semantic V2 order and intentional cover were data updates on the same canonical record; PR #662 did not alter vehicle data, media order, cover selection or publishing semantics.
- Public detail rendering consumes API image order directly, keeps the complete gallery including the cover, and lazy-loads gallery images.
- The layout source and production deployment are verified. A human/browser visual viewport check remains the appropriate final pixel-level confirmation when needed; absence of that screenshot must not be represented as a code/deploy failure.

### Ready state for the next vehicle
The shared publishing path is ready for the next normal vehicle. Do **not** create a vehicle-specific PR for routine publishing.

Use exactly:
`/carnew → owner copy + complete album → /carfinish → /carpreview <Inbox> → /carpublish <Inbox>`.

Before `/carpublish`, verify:
- correct vehicle identity and owner-reviewed Vietnamese copy;
- owner-approved price and numeric ODO, or intentional `Liên hệ` when no approved numeric ODO exists;
- approved image count;
- intentional hero and semantic gallery order;
- UTF-8 without mojibake;
- media URLs preserve `/media/vehicles/...` separators and do not contain encoded `%2F`.

Operational recovery remains:
- interrupted durable processing: retry `/carfinish` for the just-closed session;
- lost Telegram confirmation: inspect canonical state before retrying;
- data/copy/price/ODO/gallery correction: update the same canonical vehicle ID;
- open a source PR only for a reproducible shared code/contract defect.

### Current closure
- **PR #662 source change: MERGED.**
- **Exact merge-SHA production deployment: PASS.**
- **Production detail-page smoke: PASS.**
- **Required production/R2/UTF-8 gates for this change: PASS.**
- **Shared vehicle detail responsive contract: PRODUCTION GREEN.**
- **Normal next-vehicle publishing workflow: READY.**

`MASTER_PROJECT_STATUS.md` remains the sole mandatory project source-of-truth. Do not create a competing checkpoint, status or runbook file.


---

## 31. 2026-10-01 — Lexus GX 460 Inbox 677 data-only recovery and canonical publish

### Operational recovery evidence
- New vehicle intake completed on durable session `6451516147:vehicle-session:4311` with 17 approved images and owner-authored Vietnamese copy.
- Durable processing completed as Inbox `677`; draft media evidence contained 17 WebP keys and 17 corresponding AVIF keys. No second vehicle/session was created and the album was not resent.
- Initial preview exposed a data-layer metadata gap: Workers AI was unavailable/confidence 0, the structured model was missing, and the title had absorbed owner copy. This was handled as an operational data correction on the existing draft, not by creating a vehicle-specific source repair.
- Production D1 access was authenticated with Wrangler OAuth against account `5f35d608938abe622b694bab3af1319c` and remote database `phanthuanxtra-db` / `8b6c0fc8-c278-4797-9cfa-3ec93d0c1b7d`. No credential value is stored here.
- Before mutation, Inbox 677 was backed up locally. The existing `ai_json` was patched in place with owner-authoritative structured values while preserving media arrays and description; draft status was reset to `awaiting_review`.
- Verified post-patch draft values: brand `LEXUS`; model `GX 460 Luxury`; year `2021`; price `4150000000`; mileage `41044`; owner lock `1`; WebP count `17`; AVIF count `17`.

### Preview and publish evidence
- Owner preview command `/carpreview 677` was confirmed at 11:19 UTC+7 on 2026-10-01.
- Preview showed `LEXUS GX 460 Luxury`, year `2021`, ODO `41044`, price `4150000000`, preserved owner copy, and `17 ảnh WebP + AVIF tương ứng`.
- Workers AI remained unavailable/confidence 0; this did not override or invalidate the explicit owner-approved structured values.
- Owner then ran `/carpublish 677` exactly once. Telegram confirmed publication as canonical ID `tg-677` with public URL `https://phanthuanxtra.com/car?id=tg-677`.
- Telegram's publish message displayed `Ảnh xe: 7 ảnh trên website`; this was treated as non-authoritative display text and checked against canonical D1 rather than triggering republish.

### Canonical production D1 verification
- Canonical `cars` row exists as `tg-677`: brand `LEXUS`; model `GX 460 Luxury`; year `2021`; mileage `41044`; price `4150000000`; status `available`.
- Canonical cover is `https://phanthuanxtra.com/media/vehicles/telegram-677-e391390e3fff08a1.webp`.
- Canonical gallery contains exactly 17 rows with `sort_order` range `0..16` and exactly one cover. Therefore the Telegram seven-image summary is not the canonical gallery count.
- Do not rerun `/carpublish 677`. Any future copy/price/ODO/gallery correction must update the same canonical ID `tg-677`.

### Closure and next-listing readiness
- **Inbox 677 structured metadata recovery: PASS.**
- **Owner preview after correction: PASS.**
- **Single canonical publish to `tg-677`: PASS.**
- **Canonical production D1 price/ODO/status/cover/gallery-count verification: PASS.**
- Direct browser/public HTTP rendering was not independently re-verified in this recovery session; do not represent that unperformed check as evidence.
- The normal publishing queue is clear for the next vehicle. Continue with a fresh `/carnew → owner copy + complete album → /carfinish → /carpreview <Inbox> → /carpublish <Inbox>` flow.
- A source PR is still reserved for a reproducible shared code/contract defect; routine next-listing publishing remains operational/data-only.

`MASTER_PROJECT_STATUS.md` remains the sole mandatory project source-of-truth and must be read before the next listing or project mutation.

---

## 32. 2026-10-01 — PR #665 production closure, stale vehicle-session branch audit, and CI/Cloudflare consolidation plan

### PR #665 exact production closure
- PR #665 `feat(vehicle): canonical automatic category taxonomy` merged to `main` as `cbcd13c2ef8df170b058d934b83427ae518f172d`.
- Deploy Cloudflare Worker run `36826584862`: SUCCESS on the exact merge SHA. Production Worker job `110253577931` checked out the exact SHA, uploaded 41 Worker modules and assigned 100% traffic to Cloudflare version `04805155-a70d-4d0f-889e-ba0699288c68`.
- Deploy verification passed public/Admin UTF-8, R2 GET 200 → DELETE 200 → cache-busted GET 404, and publishing E2E.
- Production Smoke Gate-15 run `36826584983`: SUCCESS.
- The remaining post-deploy workflows also completed SUCCESS: Live Chat AI Identity Verify `36826697362` and QUEUE-01 Production E2E Origin `36826697426`.
- All 15 observed workflows on the exact merge SHA completed SUCCESS. The canonical automatic vehicle-category change is production GREEN.

### Stale `fix/telegram-vehicle-session` branch audit
- The historical branch head `59e19c4dd35166633555bb0b22e867e2da907187` belonged to merged PR #627 `fix(telegram): recover LX570 multi-batch vehicle session`; merge commit `51f9d75f81faa3f5429723667837fdd5f053d82a`.
- Exact compare from that historical head to current `main` showed `main` ahead by 153 commits and the old head behind by 0: there is no unmerged commit to recover or cherry-pick.
- PR #632 subsequently replaced the fragile nearest/pending recovery model with persistent `telegram_vehicle_sessions` and per-session media identity.
- PR #660 subsequently added durable `/carfinish` recovery.
- Current normal `/carnew` opens a clean session and does not reclaim unrelated pending media. Do not merge or recreate the historical branch; doing so risks restoring superseded LX570-specific behavior.

### ChatGPT / GitHub / Cloudflare consolidation target
The project will simplify orchestration without weakening production evidence:
1. ChatGPT is the engineering control plane: read this MASTER first, inspect exact evidence, create source PRs only for reproducible shared defects, and never create competing project-status Markdown.
2. GitHub remains source, review, branch-protection, CI and exact-SHA release ledger.
3. Cloudflare remains runtime/data plane: Worker/Assets/D1/R2/Cron. GitHub owns deployment orchestration; Cloudflare is not a second source-control coordinator.
4. Preserve mandatory evidence: exact-SHA deployment, HTML UTF-8/mojibake checks, R2 GET→DELETE→404, publishing E2E, canonical-ID invariants and production smoke.
5. Reduce duplicate orchestration, not validation. Consolidation must prove equivalent or stronger evidence before any legacy workflow is removed.

### Ordered implementation
- Phase 1 — inventory the current 35 workflow YAML files and classify each as core, reusable/merge candidate, manual diagnostic/recovery, or obsolete one-off.
- Phase 2 — consolidate CI/static/security checks behind a small number of stable workflow entry points; preserve check semantics and branch protection.
- Phase 3 — converge production to one exact-SHA Cloudflare deploy entry point followed by one production verification/E2E chain; reuse jobs instead of independent duplicate production triggers where safe.
- Phase 4 — keep Android build/release independent from web deployment unless Android source actually changes.
- Phase 5 — retire only proven-obsolete diagnostic/recovery workflows after replacement evidence is GREEN. Never delete a gate merely to reduce workflow count.
- Target architecture is approximately 6–10 clearly owned workflow entry points rather than 35 independent YAML entry points. This is a target, not a permission to remove evidence.
- The first consolidation PR must avoid vehicle/category/publishing business-logic changes. If production equivalence cannot be demonstrated, stop and keep the existing workflow.

### Dependency-audit follow-up
The #665 deploy log reported four high-severity npm audit findings while all release gates passed. Treat this as a separate dependency review: identify affected packages and reachable usage before remediation. Do not run a blind `npm audit fix` in the orchestration-consolidation change.

### Phase 1 inventory — first verified classification
The first inventory pass has started from the actual workflow YAML, not filenames alone:
- Keep independent/manual: `admin-recovery-rotate.yml` and `android-production-release.yml`; both are explicit `workflow_dispatch` operational/release actions and must not be folded into automatic web deploy.
- Keep PR security boundary: `ai-predeploy-audit.yml`; it audits the PR diff and runs deterministic regression tests before merge.
- Merge candidate into the core CI validation entry point: `admin-pipeline-test.yml` and `application-validation.yml`; both are source validation/test jobs and currently duplicate checkout/Node/npm setup.
- Production-verification merge candidate: `admin-redirect-verify.yml`; it is a push-to-main HTTP production assertion and belongs after exact-SHA deploy rather than racing deployment independently.
- Post-deploy E2E chain candidates: `blog-cms-production-e2e.yml` and `business-jets-crm-production-e2e.yml`; both already key off successful `Deploy Cloudflare Worker` and should remain exact-deployed-SHA checks while orchestration is consolidated.
- Android APK CI should remain logically separate from web deployment. `android-apk.yml` currently runs on broad non-Markdown PR/main changes and includes a production App API smoke; Phase 4 will narrow ownership only after equivalent Android validation is demonstrated.
- `ai-peer-executor.yml` is manual control-plane tooling, not a release gate. Do not place it on the production critical path.

No workflow has been deleted in this first pass. Remaining workflow files must be classified before Phase 2 changes triggers or removes entry points.

### Phase 1 complete inventory — 37 workflow entry points
The repository currently has **37**, not 35, workflow YAML entry points. Classification is based on trigger, production mutation risk, and overlap with the canonical release chain.

| Workflow | Class | Target |
|---|---|---|
| admin-pipeline-test.yml | MERGE | fold Admin syntax/tests into core CI |
| admin-recovery-rotate.yml | MANUAL | keep isolated credential rotation |
| admin-redirect-verify.yml | MERGE | post-deploy production verify |
| ai-peer-executor.yml | MANUAL | keep control-plane utility off release path |
| ai-predeploy-audit.yml | KEEP | required PR security gate |
| android-apk.yml | KEEP | Android CI; narrow ownership later |
| android-production-release.yml | MANUAL | signed release only |
| app-assistant-production-e2e.yml | MERGE | post-deploy App E2E |
| app-sentiment-production-e2e.yml | MERGE | post-deploy App E2E |
| application-validation.yml | MERGE | fold application checks into core CI |
| blog-cms-production-e2e.yml | MERGE | post-deploy production E2E |
| business-jets-crm-production-e2e.yml | MERGE | post-deploy production E2E |
| ci.yml | KEEP | canonical required `CI / Validate` |
| cleanup-ci-test-cars.yml | MANUAL | retain recovery cleanup; no routine trigger needed |
| cloudflare-auth-workers-ai-smoke.yml | RETIRE | historical branch-specific auth smoke; covered by deploy/runtime gates |
| cloudflare-machine-audit.yml | MANUAL | retain read-only infrastructure inventory |
| codex-agent.yml | MANUAL | keep isolated engineering utility |
| deepseek-harness-isolated.yml | KEEP | isolated third-party harness evidence, path-scoped |
| defender-4092-production-diagnostic.yml | RETIRE | one-off Defender 4092 diagnostic contains record-specific repair SQL |
| deploy-cloudflare.yml | KEEP | canonical production Worker deploy |
| deploy-developer-gateway.yml | KEEP | separate Developer Gateway deploy |
| developer-gateway.yml | MERGE | gateway validation can converge with gateway deploy/CI |
| full-system-backup.yml | KEEP | scheduled production backup |
| gate-14-backup-restore.yml | KEEP | backup readability/restore evidence |
| gate10-runtime-evidence.yml | KEEP | exact post-gateway-deploy runtime evidence |
| homepage-canonical-verify.yml | MERGE | post-deploy production verify |
| live-chat-ai-identity-verify.yml | MERGE | post-deploy production E2E |
| password-reset-production-e2e.yml | MANUAL | destructive credential lifecycle must remain isolated/authorized |
| production-asset-gate.yml | MERGE | post-deploy production verify |
| production-credential-safety.yml | MERGE | static credential-safety contract belongs in CI/security |
| production-smoke-gate15.yml | KEEP | canonical production smoke/E2E baseline |
| queue-01-e2e-origin.yml | MERGE | post-deploy production E2E |
| release-gate-static-audit.yml | MERGE | static/unit checks overlap core CI; preserve unique assertions |
| stage3-production-reconciliation.yml | MERGE | post-deploy runtime reconciliation |
| telegram-bots-diagnostic.yml | MANUAL | retain explicit Telegram diagnostic |
| xtra-registration-probe.yml | RETIRE | registration-only no-op probe |
| zero-cost-audit-test.yml | MANUAL | retain explicit zero-cost audit/test utility |

**Inventory totals:** KEEP 10, MERGE 15, MANUAL 9, RETIRE 3 = 37.

### Consolidation invariants discovered during Phase 1
- Repository ruleset `Main - Production Protection` requires exactly the status contexts `CI / Validate` and `AI Pre-Deploy Audit / Validate`; both must remain stable throughout consolidation.
- Production mutation must remain downstream of a successful exact-SHA validation and restricted to `main`/authorized manual dispatch.
- Post-deploy E2E must use the deployed SHA from the successful deploy event; do not race a `push` trigger against Cloudflare propagation.
- Credential mutation, signed Android release, backups and diagnostics remain isolated manual/scheduled workflows.
- RETIRE means delete only after the replacement/current coverage is verified in PR checks. The Defender one-off must not remain as a reusable production mutation path.
- Phase 2 starts with the lowest-risk duplicate removal: consolidate source validation into `ci.yml` while preserving the required `CI / Validate` context. Production E2E orchestration changes follow only after that is GREEN.

### Phase 2A implementation — core CI consolidation
- Consolidated the full checks from `admin-pipeline-test.yml`, `application-validation.yml`, and `production-credential-safety.yml` into the canonical `.github/workflows/ci.yml` job named exactly `CI / Validate`.
- The consolidated job retains: repository diff whitespace validation, Android workflow contract marker, Node 24 + `npm ci`, application/Admin syntax checks, Workers AI model guards, repository unit tests, Developer Gateway unit test, static Worker binding/config validation, runtime-DDL rejection, and the production-smoke credential-safety contract.
- `CI / Validate` remains the same required ruleset context and still publishes the explicit commit status used by `Main - Production Protection`.
- The three superseded standalone validation workflow entry points are removed only in the same PR that carries their checks into `CI / Validate`; this is orchestration consolidation, not validation removal.
- No production Worker/business logic/D1/R2/vehicle/category/publishing behavior is changed in Phase 2A.
- Acceptance requirement: PR must pass both required contexts `CI / Validate` and `AI Pre-Deploy Audit / Validate`. After merge, the exact merge SHA must show the consolidated CI GREEN before Phase 2B proceeds.

### Phase 2B implementation — release static audit consolidation
- Phase 2A exact merge SHA `3e46c82d86f6d0bdde892b8f88957411f80d4e72` completed its production evidence chain GREEN: canonical CI, Cloudflare deploy, Production Smoke Gate-15, Stage 3 reconciliation, Homepage/Admin verification, Blog CMS, Business Jets, QUEUE-01 and Live Chat AI identity all completed successfully.
- Folded the unique non-Android assertions from `release-gate-static-audit.yml` into canonical `CI / Validate`: MASTER/wrangler presence, package/wrangler JSON parsing, repository-wide `src` + `developer-gateway` Node syntax audit, and the release-gate focused unit-test set.
- The duplicate Android debug build from Release Gate Static Audit is intentionally not copied into CI because canonical `android-apk.yml` already builds the debug APK, verifies SHA-256 and publishes the CI artifact. Android remains a separate ownership boundary for Phase 4.
- Removed `release-gate-static-audit.yml` only in the same PR carrying its unique static assertions into canonical CI. No production Worker, D1, R2, publishing, vehicle/category or Android application behavior changes are included.
- Phase 2B acceptance: required `CI / Validate` and `AI Pre-Deploy Audit / Validate` must pass on the PR and exact merge SHA before production orchestration Phase 3 changes begin.

### Phase 3 implementation — exact-SHA production verification chain
- Phase 2B merged as exact SHA `c1868bfbd2e12d863ae4a4687a2afaccc804a4ab`; its observed post-merge Cloudflare deploy, canonical CI, Production Smoke Gate-15, Stage 3 reconciliation, Homepage/Admin verification, Android APK, Blog CMS, Business Jets, QUEUE-01 and Live Chat AI identity completed successfully.
- Converted the remaining routine production verifiers that previously raced `push main` into post-deploy `workflow_run` consumers of successful `Deploy Cloudflare Worker` runs on `main`: Production Smoke Gate-15, Stage 3 reconciliation, Admin Redirect, Homepage Canonical, Production Asset Delivery, App Assistant E2E and App Sentiment E2E.
- Each converted workflow keeps explicit manual dispatch and gates automatic execution on a successful deploy triggered by a `main` push. Workflows that checkout source now use the exact deployed `workflow_run.head_sha`.
- Existing Blog CMS, Business Jets, Live Chat AI and QUEUE-01 post-deploy consumers remain unchanged and already use the successful deploy lineage.
- This phase changes orchestration only; it does not remove UTF-8/mojibake assertions, R2 GET/DELETE/404, publishing E2E, D1/Admin/Gateway checks, or Smoke Gate-15 evidence.
- Acceptance: PR required checks GREEN, merge, successful exact merge-SHA production deploy, then all post-deploy consumers GREEN before Phase 4.

### Phase 4 implementation — Android workflow ownership
- Phase 3 merged as exact SHA `a5e237a9a08789486d310812d3890be8aa5853fe`; Cloudflare production deploy and the core non-AI production verifiers observed so far are successful.
- Phase 3 also exposed a real runtime dependency signal: App Assistant and App Sentiment post-deploy E2E both authenticated successfully but returned HTTP 503 from their Workers AI-backed endpoints. This is recorded as a production AI availability failure, not hidden or relabeled GREEN; Phase 3 final closure remains blocked until those checks recover/pass.
- Narrowed `android-apk.yml` automatic push/PR ownership from every non-Markdown repository change to Android and its directly coupled App/AI contract paths: `android/**`, `src/app-api.js`, `src/ai-chat.js`, `tests/ai-chat-contract.test.mjs`, and the Android workflow itself.
- Manual dispatch remains available. The debug APK build, Android source safety checks, SHA-256 artifact evidence, App API health check and AI contract regression test remain intact. Signed production release remains isolated in `android-production-release.yml`.
- Acceptance: required PR gates GREEN and a relevant Android-path change must continue to trigger/build the canonical APK workflow; unrelated web orchestration changes should no longer build APK.

### Phase 5 implementation — retire proven obsolete workflow entry points
- Phase 4 merged as exact SHA `cafbdb8008ad6493d61961b6468510bca12f5587`; canonical CI, Cloudflare production deploy, Android APK, Stage 3, production assets and the non-AI post-deploy verification chain observed on that SHA are successful.
- The two App AI production E2Es remain correctly RED on that deployed SHA: authentication returned HTTP 200, then both App Assistant and App Sentiment inference endpoints returned HTTP 503. This repeated the Phase 3 evidence and remains an external/runtime AI availability blocker; it is not converted to PASS and does not justify weakening the E2Es.
- Retired `cloudflare-auth-workers-ai-smoke.yml`: it was branch-specific historical auth/inference smoke. Cloudflare deployment already authenticates the production API token, while current AI endpoint E2Es provide the relevant runtime signal; the current 503 evidence shows why no historical standalone PASS should mask production AI availability.
- Retired `defender-4092-production-diagnostic.yml`: it is a one-off Defender/session diagnostic containing record-specific production D1 repair SQL for draft 605 and is not a reusable production gate.
- Retired `xtra-registration-probe.yml`: it is a no-op workflow-registration echo probe with no runtime validation coverage.
- No canonical CI, exact-SHA deploy, UTF-8/mojibake, R2 lifecycle, publishing E2E, Production Smoke Gate-15, backup/restore, credential safety or signed Android release coverage is removed.
- Phase 5 acceptance: required PR checks GREEN and exact merge-SHA canonical validation GREEN. Final MASTER closure remains blocked on successful App Assistant + App Sentiment production E2E evidence unless a separately evidenced source/runtime fix is required.

### Production AI 503 root-cause fix after Phase 5
- Exact Phase 5 merge SHA `239a3e0a8ec5afe41d317ce749c373c5e3c08f80` deployed successfully and all non-AI post-deploy gates passed, but App Assistant and App Sentiment again authenticated with HTTP 200 and returned inference HTTP 503.
- Source audit found App Assistant still preferred `@cf/meta/llama-3.1-8b-instruct-fast`, while the canonical website/auto-bot production lineage already uses current Cloudflare-hosted `@cf/zai-org/glm-4.7-flash` with Qwen/Nemotron fallbacks. App Assistant is aligned to that current model lineage.
- App Sentiment depended on a single legacy classifier model `@cf/huggingface/distilbert-sst-2-int8` and had no fallback. It now preserves that classifier as primary and falls back to `@cf/zai-org/glm-4.7-flash` with a constrained sentiment-classification prompt when the classifier invocation fails.
- Production E2Es are updated only to accept the explicitly supported fallback model IDs; HTTP 503 remains a failure. No gate is weakened to accept unavailable AI.
- Final acceptance remains: PR required checks GREEN, exact merge-SHA production deploy GREEN, App Assistant E2E GREEN, App Sentiment E2E GREEN, and the complete post-deploy chain GREEN before MASTER final closure.
- PR #673 pre-merge gate audit: AI Pre-Deploy correctly blocked the first head because `src/app-api.js` changed without a targeted regression-test change; canonical CI and deploy validation also exposed the stale App API contract assertion that still required the retired Llama 3.1 model. Added targeted `tests/app-admin-contract.test.mjs` coverage for the GLM Assistant primary and DistilBERT-to-GLM Sentiment fallback. This is a test/evidence repair, not a gate bypass.

### Production AI 503 exact root cause after PR #673
- PR #673 merged as exact SHA `2e9adb8c89bbdbf54a1f6dddd6271e2157f42add`; canonical CI, APK, production deploy, UTF-8/mojibake, R2 GET→DELETE→404, publishing E2E, Smoke Gate-15, Stage 3 and non-AI post-deploy verifiers passed.
- The deploy job produced direct provider evidence: the Workers AI REST probe returned HTTP 429 with Cloudflare error code `4006`: daily free allocation of 10,000 neurons exhausted. App authentication remained HTTP 200, while both Assistant and Sentiment inference returned HTTP 503. Therefore changing Workers AI model IDs alone cannot restore service while the account-wide free allocation is exhausted.
- Recovery uses an already-configured independent provider boundary: App Assistant and Sentiment retain Workers AI as primary, then fail over to configured Gemini only after Workers AI model attempts fail. Gemini credentials remain server-side; responses expose only the validated model name, never the key/provider error body.
- Production E2Es accept the configured `gemini-*` model family as an explicit successful provider lineage; HTTP 503 remains failure. This is availability failover, not a weakened gate.
- Final closure still requires required PR checks, exact merge-SHA production deploy, both App AI E2Es GREEN and the complete post-deploy chain GREEN.

### PR #674 post-deploy AI audit — diagnostic follow-up
- PR #674 merged as exact SHA `67cd15ad8e0e164a0d20560525b61aa0c959ca24`. Exact-SHA production deploy and the non-AI post-deploy chain passed, but Assistant and Sentiment still returned HTTP 503 after login HTTP 200.
- Deploy evidence continues to show Workers AI HTTP 429 / code 4006 quota exhaustion. The configured Gemini metadata probe reported `probe_failed`, so there is not yet sufficient evidence to attribute the Gemini failure to model, credential, quota, or network status.
- Added bounded/sanitized provider diagnostics to 503 responses and production E2E failure logs. No secret or provider response body is exposed. This diagnostic step is required before any further provider/config change; HTTP 503 remains a hard failure.

### PR #675 diagnostic result — Gemini edge fetch root cause
- PR #675 merged as exact SHA `2c1a5ddecc0c1663d230d9e1a36d4d484449dfb1`. Exact-SHA deploy and non-AI post-deploy gates passed; both App AI E2Es remained HTTP 503.
- The new bounded diagnostic identified the same deterministic Gemini failure in both endpoints: Cloudflare Workers rejects Fetch `redirect:"error"` because edge Fetch supports `follow` or `manual`, not `error`.
- Root-cause fix changes only the Gemini fallback request to `redirect:"manual"`; response status remains explicitly checked before parsing. A targeted contract test locks this edge-compatible mode and forbids regression to `redirect:"error"` in App API.
- Workers AI quota exhaustion remains independently evidenced; final acceptance still requires real successful Assistant and Sentiment inference after exact-SHA production deploy.

## 33. 2026-10-01 — CI/Cloudflare consolidation and production AI recovery final closure
- PR #676 merged as exact SHA `ae10e58cf8fa7766e9e2960eb474665b489dc5fb`.
- Required validation on the exact merge SHA: both `CI / Validate` checks SUCCESS; Android `build-apk` SUCCESS.
- Production deploy job `110288566860` SUCCESS. Cloudflare lineage: deployment `be8e0f01-d848-4bd4-967e-a4ec1515a95b`, Worker version `b2204e9b-c48d-444a-880d-58047596a127`, 100% traffic.
- Production boundary PASS: homepage, health and admin HTTP 200; HTML UTF-8 verified after decompression; editorial UTF-8 routes PASS; admin mojibake markers absent.
- R2 E2E PASS: authenticated GET 200 → DELETE 200 → cache-busted GET 404.
- Publishing production E2E PASS: canonical/variant media, private draft 404, idempotent retry, publish, public HTML UTF-8 + cover, cleanup.
- Workers AI account remains quota-exhausted (REST probe HTTP 429 / code 4006), but independent configured Gemini fallback is now production-proven after correcting the Cloudflare edge Fetch redirect mode.
- App Assistant production E2E job `110288831685` SUCCESS: login HTTP 200, inference HTTP 200, model `gemini-3.5-flash-lite`.
- App Sentiment production E2E job `110288829866` SUCCESS: login HTTP 200, inference HTTP 200, model `gemini-3.5-flash-lite`.
- Production Smoke Gate-15, Current-lineage D1/Gateway/AI/Admin/R2, asset, homepage/admin, Blog CMS and the observed exact-SHA post-deploy verification chain all SUCCESS.
- Workflow inventory after Phase 5 is freshly verified at **30** YAML entry points. The earlier 6–10 figure was a planning target, not an acceptance requirement; validation was not deleted merely to reach a count. Exact-SHA deploy ownership and post-deploy chaining are the achieved simplification boundary.
- Phase 1–5 consolidation plus production AI recovery is **FINAL GREEN** on the above production evidence. Future changes continue to use this MASTER as the sole project source-of-truth and must preserve exact-SHA deployment, UTF-8/mojibake, R2, publishing, smoke and branch-protection invariants.


## 34. 2026-10-02 — GitHub + Cloudflare final closure

Latest checkpoint wins over earlier historical/planning sections when they conflict.

Final GitHub state:
- PR #686 `fix(cloudflare): close videos origin gap and promote audit v9` merged as `3386992b892c584360ee1fb9319dd9ae23768a04`.
- Production deploy run `36972540776` completed SUCCESS.
- Production Worker version `67d06069-f13d-41f2-a876-effff0ec5555`, deployment `72ec40b8-f5aa-4461-8b53-b2fffded8f42`, 100% API-created traffic.
- `/videos` now uses the explicit `VIDEOS_ORIGIN -> phanthuanxtra-images` Worker service binding.
- Production deploy verified both `https://phanthuanxtra.com/videos` and direct `https://phanthuanxtra-v2.phanthuanmodelactor.workers.dev/videos` as HTTP 200 HTML.
- Read-only Cloudflare audit was promoted to main as `CF-MACHINE-009`; destructive cleanup/export operations remain off main.

Final Cloudflare audit evidence:
- Audit run `36972540784`, attempt 2, completed SUCCESS after production deploy.
- Workers count = 6: `ask-ai-agent`, `ask-ai-api`, `phanthuanxtra-backup`, `phanthuanxtra-developer-gateway`, `phanthuanxtra-images`, `phanthuanxtra-v2`.
- `phanthuanxtra-videos` remains retired/absent.
- `phanthuanxtra-v2`: 12 routes, 1 custom domain, 1 cron, 1 outbound service binding.
- Direct v2 workers.dev `/videos` = HTTP 200 on first post-deploy audit attempt; public custom-domain `/videos` = HTTP 200.
- D1 unchanged: `luxury-ui-db`, `chatbot-db`, `phanthuanxtra-db`.
- R2 unchanged: `ai-pt-xtra-apk`, `phanthuanxtra-images`, `phanthuanxtra-media`.
- Durable Object `ask-ai-agent_ChatAgent` remains.
- Audit mutations = 0; sensitive binding redaction PASS.
- No additional Worker/D1/R2/DO/DNS/AI resource is approved for deletion.

QUEUE-01 cancellation root cause and closure:
- `QUEUE-01 Production E2E Origin` shared concurrency group `xtra-production-e2e-single-queue` with `Production Smoke Gate-15`; simultaneous post-deploy triggers could cancel QUEUE-01 before any job started.
- PR #687 `fix(ci): prevent QUEUE-01 post-deploy cancellation` merged as `47aa3769cd9ef33dcca7920f74bf9cbf3632f189`.
- QUEUE-01 now uses its own concurrency group `queue-01-production-e2e-origin`.
- Exact-SHA production deploy run `36972949240` SUCCESS.
- QUEUE-01 run `36973079375` SUCCESS: Admin/App signed sessions, dashboard, D1 CRUD, R2 write/private-read/delete lifecycle PASS. Workers AI Vision remains `BLOCKED_BY_FREE_TIER_QUOTA` with the recognized Cloudflare daily 10,000-neuron fingerprint and is not classified as an application regression.
- Exact-SHA post-deploy chain on `47aa3769cd9ef33dcca7920f74bf9cbf3632f189`: Homepage Canonical, Production Asset Delivery, Blog CMS, QUEUE-01, App Sentiment, Stage 3 Reconciliation, Live Chat AI Identity, Admin Redirect, Business Jets CRM, Production Smoke Gate-15 and App Assistant all SUCCESS.

Final closure decision:
- Direct workers.dev `/videos` 500 discrepancy: CLOSED.
- QUEUE-01 exact-SHA evidence: CLOSED.
- Read-only audit promoted to main: CLOSED.
- Legacy videos Worker migration/retirement: CLOSED.
- GitHub + Cloudflare cleanup objective is FINAL GREEN at this checkpoint.
- Preserve the 6 remaining Workers and current D1/R2/DO/AI dependencies; future cleanup requires a new independently verified objective.


## 35. 2026-10-02 — Temporary branch/tooling hygiene closed

- Temporary branches `audit/cloudflare-cleanup-v4` and `chore/retire-legacy-videos-worker` were force-reset to the final main tree after their work was completed.
- Both refs are now identical to main: ahead=0, behind=0.
- Temporary destructive/export tooling `scripts/cloudflare-cleanup-phase1.mjs` and `scripts/export-videos-worker-source.mjs` is absent from those active branch trees and remains absent from main.
- Merged feature branches `fix/cloudflare-final` and `fix/queue01-concurrency` were auto-removed by repository branch hygiene.
- Any remaining temporary branch names are inert aliases to main, not divergent deployment or cleanup sources.

## 36. 2026-10-02 — Cloudflare Queues vehicle pipeline upgrade FINAL GREEN

Objective completed:
- `/carfinish` now checkpoints the selected Telegram vehicle session rows in D1 and enqueues a compact versioned message to Cloudflare Queue binding `VEHICLE_JOBS`.
- Producer Queue: `ptx-vehicle-jobs`.
- Dead-letter Queue: `ptx-vehicle-jobs-dlq`.
- Main Worker `phanthuanxtra-v2` is both Queue producer and dedicated Queue consumer.
- Consumer batch size = 1, max retries = 5, retry delay = 15 seconds; failed messages route to the DLQ.
- Queue consumer processes at most 3 pending photos per D1 checkpoint cycle, persists AVIF/WebP media and draft state, then re-enqueues continuation work until the bundle is complete.
- D1 remains the durable source of truth. The existing 5-minute cron remains as recovery only: it restores stale `processing` rows and re-enqueues stale clean `queued` bundles when the Queue binding is available; the bounded direct D1 drain remains a fail-safe only when Queue binding is unavailable.
- Telegram draft completion notification explicitly reports Cloudflare Queue + D1 checkpoint completion.

GitHub implementation lineage:
- Feature commit `ce4ee64fc770564370b01d719098f0b0b8192174`: Queue producer/consumer/DLQ, `/carfinish` enqueue path, Queue handler, cron recovery, deploy provisioning, tests, Wrangler config and CF-MACHINE-010 audit.
- Follow-up consumer/API reconciliation fixes: `fc16fa24c5a65b8eb12157860d9807be3ae1aa17`, `503d41e819f2ef47228209d9b1e1b3066fa0dca0`, `46ff6686b090e79516ef8f57560842cfe69ba460`.
- Exact current main for production evidence: `46ff6686b090e79516ef8f57560842cfe69ba460`.

Production deployment evidence:
- Deploy Cloudflare Worker run `36977580670`: SUCCESS.
- Production Worker version `e23905c8-dc0e-45e5-ac16-3198f88f0407`, deployment `1fe8312b-90a1-4d00-86a2-e19b85d1295d`, API-created 100% traffic.
- Deployment verified existing Queue IDs for `ptx-vehicle-jobs` and `ptx-vehicle-jobs-dlq`, updated the dedicated consumer, and passed producer/consumer/DLQ contract verification.
- Canonical CI run `36977580686`: SUCCESS. Queue regression tests cover compact payload, producer binding, Queue consumer + cron recovery, continuation behavior and provisioning topology.
- Exact-SHA post-deploy chain on `46ff6686b090e79516ef8f57560842cfe69ba460` is GREEN, including QUEUE-01, Production Smoke Gate-15, App Assistant, App Sentiment, Blog CMS, Business Jets CRM, Stage 3, Homepage Canonical, Production Asset Delivery, Admin Redirect and Live Chat AI Identity.

CF-MACHINE-010 live Queue evidence:
- Audit run `36977677065`: SUCCESS; mutations=0.
- Queues present: `ptx-vehicle-jobs`, `ptx-vehicle-jobs-dlq`.
- Primary Queue topology: producers=1, consumers=1, producer Worker=`phanthuanxtra-v2`, DLQ=`ptx-vehicle-jobs-dlq`, batch=1, retries=5.
- Primary backlog = 0 at audit time.
- DLQ backlog = 0 at audit time.
- D1/R2/Worker inventory remains intact; Workers count stays 6.
- This upgrade does not authorize deletion of any remaining Worker, D1, R2, DO, DNS or AI resource.

Operational status: Cloudflare Queues migration for the Telegram vehicle draft pipeline is FINAL GREEN. Future production vehicle sessions should use Queue-first processing; cron/D1 direct processing is recovery/fail-safe only.


## 37. 2026-10-03 — Mandatory ChatGPT image delivery rule: AVIF + WebP → Cloudflare R2

Effective immediately for every image generated or prepared by ChatGPT for PHAN THUẦN XTRA:

- ChatGPT MUST create two optimized delivery variants from the approved source image: **AVIF** and **WebP**.
- AVIF is the preferred browser format; WebP is the required compatibility fallback.
- ChatGPT MUST upload both AVIF and WebP objects to the intended **Cloudflare R2** path when an authenticated Cloudflare/R2 write capability is available.
- If ChatGPT cannot write to Cloudflare R2 in the current session, it MUST provide both generated files for upload and clearly state that R2 upload is still pending. It MUST NOT claim the files are deployed.
- Production HTML/CSS/JS MUST NOT be changed to reference a new image until the exact AVIF and WebP objects exist in R2 and their intended public Worker URLs have been verified.
- After upload, verify each exact public asset URL returns **HTTP 200**, a non-empty body, and the correct MIME type: `image/avif` for AVIF and `image/webp` for WebP.
- Homepage/editorial rendering SHOULD use `<picture>` with AVIF first and WebP fallback. Lazy-loading code must activate both `<source>` and fallback `<img>` URLs.
- The original PNG/JPEG source may be retained as a source/archive asset, but production display should use the optimized AVIF/WebP pair unless a documented compatibility requirement says otherwise.
- Targeted regression tests and **Production Asset Delivery Gate** MUST check the exact AVIF/WebP paths actually referenced by production; a legacy or unrelated green asset check is not sufficient evidence.
- Required completion sequence: **generate AVIF + WebP → upload to Cloudflare R2 → verify HTTP/MIME → update page → targeted tests → AI Pre-Deploy Audit + CI → deploy/merge → post-merge production asset verification**.
- Never invent an R2 path, never infer a successful upload, and never declare image delivery FINAL GREEN without exact production evidence.

Current Green Energy homepage canonical pair:
- `/media/editorial/green-energy/green-energy-home-hero.avif`
- `/media/editorial/green-energy/green-energy-home-hero.webp`


## PHỤ LỤC HỢP NHẤT TÀI LIỆU — 2026-10-03

Nội dung nguyên bản của 11 tài liệu phụ được giữ dưới đây. Checkpoint hiện hành ở đầu MASTER được ưu tiên nếu khác với hướng dẫn lịch sử. Các file nguồn đã được hợp nhất vào file duy nhất.


### Tài liệu nguồn: docs/AGENT_REACH.md

# Agent-Reach operations integration

Upstream: `Panniantong/Agent-Reach`

Pinned commit: `a19a171fa980a0785849596492e0af4db800c82f` (audited 2026-10-03)

## Purpose

Agent-Reach is an **operator/agent capability layer**, not part of the Cloudflare Worker runtime. It may be installed on the owner's Windows workstation in a dedicated venv to provide read-oriented internet research backends and health checks.

## Safety contract

- Do not vendor or execute moving `main`; installation is pinned to the audited commit above.
- Do not put Agent-Reach Python dependencies into the Worker bundle.
- Default project script mode is `Check`: no venv/package/config creation.
- `Install` creates only the dedicated user venv and then invokes Agent-Reach's own safe/default `install --env=local`; it does **not** pass `--system`.
- Do not import cookies/tokens into the repository, GitHub Actions, Cloudflare Worker, D1 or R2.
- Login-backed platforms require explicit owner action and should use dedicated accounts where appropriate.
- Existing native GitHub connector/web tooling remains preferred when already available; Agent-Reach is complementary, not a replacement.
- No social posting/write automation is enabled by this integration.

## Windows 10 PowerShell

Read-only check:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\agent-reach.ps1 -Mode Check
```

After explicit owner approval to create a user-local venv and install the pinned package:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\agent-reach.ps1 -Mode Install
```

The install ends with `agent-reach doctor --json`. Optional channels and any credentials remain separate follow-up decisions.


### Tài liệu nguồn: docs/AI_AGENT_FLEET_62.md

# PHAN THUẦN XTRA — 62 AI Agent Fleet

Architecture inspiration: Structure Webworks' published 62-agent social-media operating model. This implementation ports the control-plane principles into the existing Cloudflare Worker + D1 stack; it does not copy their vendor stack.

## Control plane

- 62 logical specialist agents / 8 departments.
- One governed orchestrator routes tasks by domain.
- D1/live production remains the source of truth; XTRA Memory Brain remains customer context.
- Agents are roles/capabilities, not 62 persistent processes. This avoids idle compute, duplicated memory and 62 independent credential surfaces.
- Pipeline: Collect -> Score -> Brief -> Draft -> Validate -> Approval Gate.
- Read/analysis agents may operate without production mutation authority.
- Distribution, CRM and reputation changes are approval-bound.
- Budget changes and brand promises are owner-required.
- Customer deletion remains owner-only.
- Production deployment remains GitHub Actions -> Cloudflare API/SDK; no Wrangler production path.
- Kill switch: set `AI_AGENT_FLEET_ENABLED=0`.
- Admin API: `GET /api/admin/agents` returns registry/policy; `POST /api/admin/agents` produces a deterministic execution plan only. It cannot bypass existing write APIs.

## Departments

1. Intelligence — 8
2. Content — 9
3. Distribution — 8
4. CRM — 9
5. Reputation — 7
6. Analytics — 8
7. Operations — 7
8. Governance — 6

Total: 62.

## Upgrade path

Promote an agent from plan/draft to execution only when a real workflow has an existing authenticated API, idempotency/retry semantics, audit evidence, a bounded permission set, a failure rollback/reconciliation path, and an explicit owner policy for any consequential action.

## Phase 1 execution promotion

Five CRM agents are promoted because their existing Memory Brain workflow already satisfies the promotion gate:

- agent-27 Identity Resolver
- agent-28 Vehicle Interest Mapper
- agent-31 Care Status Agent
- agent-33 Proposal Agent
- agent-34 CRM Auditor

They execute only through existing bounded code paths. Promotion does not grant generic HTTP, database, publishing or deletion authority. The memory job claim provides idempotency, MEMORY_JOBS provides retry, evidence episodes/facts/proposals provide provenance, and care audit provides traceability. Consequential care-stage changes remain proposals requiring owner decision.

Lead Intake remains approval-bound until its create path has an explicit replay-safe idempotency contract. Public publishing/distribution also remains approval-bound.


### Tài liệu nguồn: docs/GEMINI_FREE_FIRST_RUNBOOK.md

# Gemini Free-First Runbook

Last reviewed: 2026-09-27

## Decision
Use Gemini Developer API only when the current Google project/API key actually exposes a suitable free-tier model. Cloudflare Workers AI remains the automatic fallback. Do not repeatedly deploy guessed Gemini model IDs.

## Current production evidence
- Main commit: `f1f7b59a8e533f57b395b26ef5c7e7253d129dbe`.
- Gate 10 run: https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/36327468899
- Runtime result: `ok=true`, `routing_policy=zero-cost-first`, `selected_provider=gemini`, `fallback_used=false`, `model=gemini-3.5-flash-lite`, `production_mutation=false`.
- Developer Gateway deployment and website deployment both succeeded on this commit.

The earlier HTTP 404 was resolved by model discovery in PR #532. This evidence verifies Gateway text generation; it does not verify website image redaction or the private ChatGPT publishing Action.

## Internet research conclusion
Google currently limits Gemini 2.5 access to users/projects that actively used 2.5 in the past. 2.5 is not deprecated, but Google recommends newer models for new projects. Therefore `gemini-2.5-flash` is not a safe default for this new project.

Current candidates to prefer, only if returned for this project:
1. `gemini-3.5-flash-lite` — cost-efficient/high-volume/simple agentic tasks.
2. `gemini-3.8-flash` — stronger engineering/agentic tasks.
3. Another current GA Flash/Flash-Lite model explicitly returned by the project.

Google pricing currently lists free-tier input/output for 3.5 Flash-Lite and 3.8 Flash, subject to project/model limits and eligibility.

## Mandatory model preflight
Before changing `GEMINI_MODEL`, query:
`GET https://generativelanguage.googleapis.com/v1beta/models`

Use the API key securely and select only a returned model that supports `generateContent`. Never print/log/commit the API key.

Selection:
1. Prefer `gemini-3.5-flash-lite` if returned + supports `generateContent`.
2. Else `gemini-3.8-flash` if returned + supports `generateContent`.
3. Else another approved GA Flash/Flash-Lite returned by `models.list`.
4. Else Workers AI fallback.

Do not use Gemini 2.5 here unless `models.list` explicitly confirms it.

## Error policy
| Result | Action |
|---|---|
| 2xx | Gemini usable. |
| 404 NOT_FOUND | Do not retry same model. Refresh `models.list`; choose available model or fallback. |
| 429 RESOURCE_EXHAUSTED | Quota/rate limit. Bounded backoff where appropriate, then fallback. |
| 408 / 5xx | Transient. Bounded exponential backoff + jitter, then fallback. |
| 400 | Fix request/parameters; no blind retry. |
| 403 | Verify key/project/API permission; no blind retry. |
| timeout/network | Bounded retry, then fallback. |

Never retry indefinitely.

## Efficiency rules
- Cache a validated model; do not call `models.list` per user request.
- Refresh discovery after 404/NOT_FOUND and during deployment validation.
- Keep context/output bounded.
- Prefer Flash-Lite for routine classification/extraction/transformation.
- Use stronger Flash only when complexity requires it.
- Keep Workers AI automatic fallback.
- Keep production mutation disabled.
- Fallback success does not count as Gemini runtime PASS.

## Gate 10
Gemini PASS requires:
- `ok=true`
- `routing_policy=zero-cost-first`
- `selected_provider=gemini`
- `fallback_used=false`
- `production_mutation=false`
- non-empty response

Fallback verification requires:
- `selected_provider=cloudflare-workers-ai`
- `fallback_used=true`
- safe `fallback_reason`
- `production_mutation=false`

## Do not waste time on
- Redeploying `gemini-2.5-flash` after confirmed 404 without `models.list`.
- Rotating/deleting secrets merely to force fallback.
- Treating Ubuntu runner migration notices as Gemini failures.
- Logging provider bodies, API keys, Authorization headers, or secrets.
- Weakening Gate 10 just to get green CI.
- Declaring final GREEN while Gemini unintentionally falls back.

## Sources reviewed
- https://ai.google.dev/gemini-api/docs/models
- https://ai.google.dev/gemini-api/docs/deprecations
- https://ai.google.dev/gemini-api/docs/changelog
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/rate-limits
- https://ai.google.dev/api/models
- https://ai.google.dev/api/generate-content
- https://ai.google.dev/gemini-api/docs/troubleshooting

## Next engineering action
Model discovery is implemented and production-verified in PR #532. Follow up by caching discovery and bounding its request timeout; discovery currently runs per auto-model request. Verify image publishing separately under docs/gemini-editorial-privacy.md.


### Tài liệu nguồn: docs/auto-bot-ai.md

# Auto Bot: vehicle Blog and customer chat

## Usage

- `/help`: show commands.
- Send a vehicle photo with caption `/blog` or `/blog <verified notes>`: analyze the image, ask a model to call `createBlogPost`, validate that call and publish the post. `/news` is an alias. Bot mentions in commands are accepted.
- `/blog <title>` followed by a new line and the complete body: retain manual text publication.
- `/chat <question>` or ordinary customer questions: answer using GLM 4.7 Flash, falling back to Qwen 3.8 27B and then Nemotron 3 Super on errors/empty output.
- Photos with ordinary vehicle inventory captions keep the existing vehicle import route. A caption with a year/ODO/price is treated as inventory unless it is a question. Use `/chat` when intent is ambiguous.

## Publication permission and retries

`TELEGRAM_AUTO_PUBLISH_CHAT_IDS` is an optional comma/whitespace-separated list of numeric Telegram chat IDs. Store it as a GitHub Actions secret for the production deploy workflow or as a Worker binding. When absent, `TELEGRAM_CHAT_ID` is the sole permitted chat. With neither binding present, Blog publication is denied. Group/channel membership must be controlled by the operator: permission is at chat level.

Both manual and generated Blog commands enforce this list before AI, downloads or writes. Customer chat has no publishing tools. AI-generated photo posts use a deterministic slug derived from chat/message IDs, backed by the existing unique posts.slug constraint. Completed retries reuse the post; concurrent inserts cannot create two posts. Concurrent retries can still perform duplicate inference before the insert. Manual text posts retain their existing title slug behavior.

## AI behavior

Vision uses the existing Scout-first vehicle analyzer, including its existing fallbacks. Automatic Blog creation requires a brand, model and confidence of at least 0.85. This score is a model estimate, not independent verification.

Blog composition/tool calling tries Scout, Qwen and Nemotron sequentially, using structured visual observations and sender notes; raw images are not sent to the text-only Nemotron path. Exactly one `createBlogPost` call is accepted. Only title/content/excerpt are accepted from AI; destination, status, category, slug and image are server-controlled. Models are instructed not to invent price, ODO, original year, mechanical/legal status or contact details. Publication goes through the existing CMS persistence and audit log. Only actual persistence success produces a Blog link.

Customer chat does not read live inventory and says when showroom verification is needed. Daily quota errors stop the new chat/tool fallback chains. There is no unbounded tool loop.

## Cost and verification

Cloudflare's allowance is a shared total of 10,000 Neurons/day, not unlimited free use per model. Paid usage beyond the allowance is billed. Qwen's 262,144-token context is a model limit, not an instruction to send that much data. Requests here use bounded input and output.

References (checked 2026-09-23):
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/workers-ai/models/qwen3.8-27b/
- https://developers.cloudflare.com/workers-ai/models/llama-4-scout-17b-16e-instruct/
- https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/

Tests: `node --test tests/auto-bot-ai.test.mjs`. These use mocked Workers AI/Telegram/D1/R2 and do not prove production entitlements, latency or real Telegram delivery. After deployment, use an authorized chat to send `/chat` and a photo with `/blog`, then verify the returned public Blog URL and the `telegram_auto_blog_created` model metadata in Worker logs. No real user messages or public test posts are sent by unit tests.


### Tài liệu nguồn: docs/chatgpt-editorial-image-delivery.md

# ChatGPT Editorial Image Delivery SOP

## Purpose

For homepage and editorial imagery, ChatGPT must prepare two optimized delivery files from the approved source image:

- AVIF — preferred browser format.
- WebP — compatibility fallback.

Do not switch production HTML to a newly generated asset until both optimized objects are uploaded to Cloudflare R2 and verified through the production Worker.

## Required workflow

1. Start from the approved source image.
2. Preserve the intended crop, aspect ratio, branding safe area, and intrinsic dimensions.
3. Generate both `.avif` and `.webp` variants.
4. Use stable, semantic filenames. For the Green Energy homepage hero:
   - `media/editorial/green-energy/green-energy-home-hero.avif`
   - `media/editorial/green-energy/green-energy-home-hero.webp`
5. ChatGPT should upload both generated files to the Cloudflare R2 media bucket when an authenticated Cloudflare/R2 write tool is available.
6. If no authenticated Cloudflare/R2 write tool is available, ChatGPT must not claim that upload succeeded and must not point production HTML at unverified objects.
7. Verify both public production URLs through the Worker:
   - HTTP 200
   - AVIF returns `Content-Type: image/avif`
   - WebP returns `Content-Type: image/webp`
   - response body is non-empty
8. Only after both checks pass, update homepage/editorial markup to prefer AVIF and fall back to WebP.
9. Update regression tests and Production Asset Delivery Gate to verify the exact assets used by production.
10. Run AI Pre-Deploy Audit, CI, deployment gates, merge with the expected HEAD SHA, then verify the post-merge production gates.

## Rendering contract

Use `<picture>` when practical:

```html
<picture>
  <source type="image/avif" srcset="/media/editorial/green-energy/green-energy-home-hero.avif">
  <img src="/media/editorial/green-energy/green-energy-home-hero.webp" alt="..." width="1672" height="940">
</picture>
```

For lazy carousel slides, the JavaScript lazy-loading implementation must support the `<source>` elements as well as the fallback `<img>`. Never introduce AVIF/WebP source URLs that the carousel does not actually activate.

## Safety rules

- Never delete the source PNG solely because optimized variants exist.
- Never invent an R2 filename or infer that an upload succeeded.
- Never treat a green generic asset gate as proof unless it checks the exact asset used by the page.
- Never merge an image delivery change while its targeted CI or production asset verification is failing.


### Tài liệu nguồn: docs/chatgpt-publisher-setup.md

# PHAN THUẦN XTRA — GPT đăng bài

Tài khoản đích: tài khoản ChatGPT cá nhân được chủ dự án chỉ định trong phiên làm việc.
Không đưa địa chỉ tài khoản, mật khẩu hay khóa kết nối vào kho mã công khai.

## Điều kiện trước khi kết nối

1. PR được merge và Deploy Cloudflare Worker thành công, gồm phép thử
   `Verify publishing draft image public URL lifecycle`.
2. Trong Cloudflare Worker `phanthuanxtra-v2`, cấu hình secret `PUBLISH_API_KEY`
   là khóa ngẫu nhiên riêng (ít nhất 32 byte entropy). Không dùng ADMIN_PASSWORD,
   ADMIN_TOKEN hoặc CMS_API_KEY. Deployment hiện kế thừa binding trên Worker.
3. Đưa cùng khóa vào Authentication của GPT Action: API Key → Bearer.
   Nhập khóa trực tiếp vào hai giao diện bảo mật; không gửi khóa qua chat hay commit.
   Khi thu hồi, thay/xóa PUBLISH_API_KEY trên Worker.

Khóa này chỉ được truy cập API bài viết/ảnh mới. Không có quyền CRM, khách hàng,
xe, xóa dữ liệu hoặc Admin. Nó chỉ đọc/sửa/xuất bản các bài được tạo qua kết nối
GPT; Admin có thể quản lý mọi bài bằng phiên đăng nhập hiện có.

## Cấu hình GPT riêng

Tên: PHAN THUẦN XTRA — Đăng bài
Mô tả: Soạn bài tiếng Việt, lưu nháp kèm ảnh và xuất bản lên phanthuanxtra.com.
Chia sẻ: Only me / Chỉ mình tôi.

Trong Actions, nhập schema từ URL sau **sau khi deployment đã thành công**:

https://phanthuanxtra.com/openapi/publishing.json

Bản schema trong repo: `public/openapi/publishing.json`.

Instructions (dán nguyên khối nội dung dưới đây):

```text
Bạn là trợ lý biên tập PHAN THUẦN XTRA. Soạn bài tiếng Việt rõ ràng, đúng dấu,
chỉ dùng dữ kiện người dùng cung cấp hoặc nguồn đã kiểm chứng. Không tự bịa giá,
ODO, thông số xe, tình trạng hàng, thành tích hoặc thông tin pháp lý.

Khi người dùng yêu cầu lưu lên website, dùng createDraft với request_id UUID mới.
Giữ nguyên request_id khi thử lại cùng yêu cầu; không tạo ID mới do timeout.
Bài tạo ra luôn là bản nháp. Nếu người dùng chỉ nhờ viết nội dung, trình bày
bản thảo trước, không tự gửi dữ liệu sang website.

Nếu người dùng đã cung cấp/chọn ảnh để đăng, dùng uploadCover trước, truyền đúng
một ảnh qua openaiFileIdRefs. Dùng url /media/ trả về làm cover_image. Không dùng
link tải tạm, file ID, sandbox path hay link ChatGPT làm ảnh trên website.
Ảnh mới qua Gemini nhận diện biển số, phủ kín rồi kiểm tra lại trước khi lưu.
Nếu API báo lỗi kiểm tra, dừng đăng và xử lý lại; không dùng ảnh gốc thay thế.
Cho người dùng xem ảnh trả về để duyệt. AI vẫn có thể bỏ sót; không hứa chính xác tuyệt đối.

Trình bày tiêu đề, nội dung và ảnh để người dùng duyệt. Gọi readDraft trước khi
báo trạng thái. Chỉ gọi publishArticle khi người dùng yêu cầu xuất bản bản thảo
đó. Không tự xuất bản khi họ chỉ yêu cầu viết, lưu nháp hay sửa.

Khi xuất bản thành công, trả đúng public_url từ API. Chưa có phản hồi thành công
thì không nói đã đăng. Khi lỗi/timeout, đọc lại bài hoặc thử lại cùng request_id.
Không yêu cầu người dùng gửi mật khẩu hay API key trong cuộc trò chuyện.
Nếu hành động chưa được cấu hình hoặc API trả 401, nói rõ kết nối chưa sẵn sàng.
```

Gợi ý mở đầu:
- Viết bài từ thông tin và ảnh tôi gửi, rồi lưu nháp lên website.
- Đọc lại bài nháp số ... để tôi duyệt.
- Xuất bản bài nháp tôi vừa duyệt và gửi link.

## Phạm vi API

- POST `/api/publish/v1/media`: ảnh nhị phân (Admin) hoặc `openaiFileIdRefs` (GPT).
- POST `/api/publish/v1/posts`: tạo nháp, `request_id` bắt buộc và chống trùng.
- GET `/api/publish/v1/posts/{id}`: đọc trạng thái/nội dung thực tế.
- PUT `/api/publish/v1/posts/{id}`: sửa nháp; bài đã công khai trả 409.
- POST `/api/publish/v1/posts/{id}/publish`: xuất bản idempotent, trả public_url.

Ảnh tối đa 10 MiB, tải từ host OpenAI được cho phép và kiểm tra từng redirect.
Ảnh được chuyển WebP, bỏ metadata, lưu R2 trước khi dùng làm cover.

## Kiểm thử cần có

Backend CI: SQLite, quyền scoped, chống trùng, rollback, file download/redirect,
nháp không công khai, publish và bài công khai dùng đúng ảnh.

Production API: workflow đăng nhập Admin bằng secret hiện có, tải ảnh fixture,
lưu nháp, xác minh 404, thử lại không trùng, xuất bản, mở trang UTF-8 kèm ảnh,
rồi dọn đúng bài/ảnh tạm. Đây chưa phải bằng chứng GPT đã kết nối.

GPT thật: đăng nhập đúng tài khoản → tạo GPT riêng → import schema → cấu hình
khóa → gửi ảnh và nội dung → lưu nháp → duyệt → đăng → mở link. Ghi lại link GPT,
ID bài và URL website sau khi kiểm chứng. Nếu thiếu phiên đăng nhập hoặc khóa,
giữ trạng thái kết nối GPT BLOCKED; không tuyên bố hoàn thành toàn bộ.


### Tài liệu nguồn: docs/content-owner-review.md

# Owner content review

Open **Admin → Nội dung / Lịch**, or **Telegram /customerapp → Nội dung** using the existing owner account. Both surfaces use the same review contract and work with the live AI runner disabled. Admin requires its signed session; Telegram requires fresh signed initData and the existing owner allowlist. Scoped agent, CMS and raw owner secrets do not authenticate Admin review.

The list shows existing prepared drafts/articles, current review state, schedule proposal validity, the latest twenty runner checkpoints/errors, and the daily reserved-call budget. Deleted fixtures are excluded from the operational list while their ledgers and audits remain retained; a known draft request key can still reconcile deletion through detail. Pipeline filtering and stable cursor pagination let owners locate older drafts. No delegated credentials, lease secrets, model output or full draft content are returned in the list; the authenticated detail view provides the private article.

Select **Xem / sửa nháp** to inspect the current copy. **Sửa nháp riêng tư → Lưu nháp riêng tư** edits title/content/excerpt/category/tags only. It preserves the slug, cover, draft status and original atomic request ledger. Edits require the exact displayed revision; the D1 transaction rechecks all revision fields. Existing schedule proposals and review decisions for an old revision become inactive; the schedule must be prepared again through the content-prep workflow.

**Đã kiểm tra nháp/lịch** records readiness only. **Bỏ qua** records dismissal. These operations never publish or schedule a post. Decisions are immutable for the exact target + revision + proposed time; a change of copy or a new proposal requires fresh review. A stale/deleted/non-private draft or an elapsed/mismatched proposal cannot be reviewed. Any actual publication remains a separate explicit owner action in the existing Blog/publishing workflow.

Admin API base: `/api/admin/agents/content-prep/review`. Telegram base: `/api/telegram/mini/v1/content-review`, after existing owner authentication. GET base lists; GET `/drafts/{request_key}` shows detail/history; PATCH that draft accepts request_id, expected_revision and private copy fields; POST `/requests/{request_key}/decision` accepts request_id, expected_revision and decision accepted/dismissed. Unknown fields/status/publish/slug/cover/actor overrides and publication routes are rejected.

Migration 0033 stores owner operations and review decisions. Operation IDs and SHA-256 payload fingerprints reconcile retries, including a response lost after commit. Mutation + operation + audit + completion commit atomically; audit failure rolls everything back. Frontend retains the same operation ID for retry and checks owner history after an ambiguous response. Actor is derived from Admin authentication or the signed Telegram user. Owner review remains available with fleet execution disabled, because it grants no agent execution or public publishing authority.

Automated API tests and a mobile browser simulation verify the new surface. A browser viewport is not physical S21 acceptance. The outstanding Customer Care proposal/delete-controls observation and genuine customer evidence remain separate; no customer record is changed for content review testing.


### Tài liệu nguồn: docs/content-runner.md

# Content Draft / Scheduling runner

Runner `content-runner/1.0.0` prepares a private draft and a revision-bound schedule proposal. Public publishing requires a separate owner workflow. There is no runner approve/publish endpoint, cron trigger, or editorial pending-job insertion.

## Virtual execution

Use Node 24 and run `npm run simulate:content`. This executes the actual runner, atomic APIs, SQLite migrations and client with a fake AI binding and a virtual retry clock. It makes no network calls and writes no production data. The simulator loses a checkpoint response deliberately, reconciles it, resumes to completion and replays the same request. Assertions require one private draft, one proposal, one simulated inference and zero pending publication jobs. The output includes the temporary fixture article. Real model quality/quota and physical-device acceptance are separate evidence.

## Delegated execution

Owner issues distinct agent-11 and agent-19 credentials for the same pipeline using `/api/admin/agents/content-prep/credentials`. The driver receives these scoped tokens only. It cannot issue tokens or call owner publish APIs. Tokens expire within one hour; expiry requires owner renewal for the same pipeline and resuming the same request_id. Credentials never enter the run ledger, model prompt, audit or client logs.

Brief JSON accepts exactly `request_id`, `source`, optional `instruction`, and `schedule`. Source is bounded to 12,000 characters, instruction to 2,000. Schedule uses `YYYY-MM-DD HH:mm` in Asia/Ho_Chi_Minh and must be future when the run starts. Unknown fields, credential/model/budget/status/publish overrides and unsafe model output fields are rejected. Generated copy still requires owner factual review.

`CONTENT_RUNNER_LIVE_ENABLED=0` is explicit in production configuration. Preview remains available through `POST /api/agents/content/v1/runs/preview`; it returns a deterministic source-only preview and creates no model call, run, post or proposal. Fleet kill switch disables both modes. Live preparation is a separate opt-in configuration change after quota/owner readiness; this delivery does not enable it.

The CLI reads raw scoped token values from `CONTENT_WRITER_CREDENTIAL` and `CONTENT_SCHEDULER_CREDENTIAL` environment variables:

```sh
node scripts/run-content-brief.mjs brief.json --preview
```

After a separately reviewed live configuration change, omit `--preview` to execute preparation. It sends credentials only to the canonical HTTPS origin, refuses redirects and advances one durable stage per request. `POST /api/agents/content/v1/runs` carries writer Bearer auth plus `X-Content-Scheduler-Credential: Bearer ...`. GET `/runs/{request_id}` reconciles current result. The same brief/request_id resumes or returns the existing result; changed reuse returns 409. Renewed tokens must have the same action/pipeline scopes. The client stops on stale artifacts, blocked runs, disabled live mode or credential expiry and preserves the request_id for reconciliation.

## Checkpoint and cost contract

Migration 0032 records stages generate → draft → schedule → done. A primary D1 session, compare-and-set lease and fencing token prevent concurrent checkpoint replacement. The generation JSON is saved before draft creation; subsequent retries reuse it. Draft and proposal subrequest IDs derive from the run key and use the existing atomic artifact ledger. Response loss can replay safely. Owner edits/deletion, elapsed schedules and publication invalidate the proposal; completion reconciliation re-reads current artifact state and never resurrects deleted posts.

Hard ceilings: three stage attempts, three reserved model calls per run, twelve reserved calls per UTC day globally, 1,200 output tokens per call, 25-second inference wait and a two-minute lease. Calls are reserved transactionally before inference; timeout/unknown provider outcomes consume the reservation. The generator uses one existing primary model and no automatic fallback chain. Quota/unavailability gets bounded exponential retry; invalid output, stale artifact, budget exhaustion or exhausted attempts blocks the run. Daily exhaustion requires review and a new request on a later day; it is not silently reset. A generation result lost before its checkpoint may require another bounded inference; exactly-once external inference is not claimed.

Checkpoint/audit writes commit together. No delegated credentials are persisted. Partial results remain private. Completed results contain `publicPublish:false`, `autoPublish:false`, and `requires_owner_approval:true`.


### Tài liệu nguồn: docs/gemini-editorial-privacy.md

# Gemini editorial cover privacy

## Scope
New cover uploads through the publishing API (Admin/GPT) and Telegram editorial commands normalize to WebP in memory, ask Gemini for all plate bounds, draw opaque masks with margins, and send the output for a second privacy review. Only a positive, certain review permits R2 storage. Missing configuration, malformed bounds, uncertainty, provider errors and exposed plates fail closed. The original is not stored by these paths. Model inference can miss plates: visually inspect the returned image before publishing. Existing vehicle/legacy upload paths and previously published images are outside this change.

Covers supplied by URL must carry `plate_privacy=gemini-reviewed-v1` in R2 custom metadata. Existing images need re-upload through this pipeline. No raw-image fallback. Both Gemini passes receive image data; use only authorized images. Two calls add latency; Actions uploads can time out, so check saved state and retry as necessary.

## Configuration
The website Worker `phanthuanxtra-v2` is separate from Developer Gateway. A working Gemini secret on the Gateway does not configure the website Worker.

Configure securely on the website Worker:
- `IMAGES` and `MEDIA` bindings.
- `GEMINI_API_KEY` secret for the authorized project.
- `GEMINI_MODEL`: an explicit image-capable model returned by that project's models.list, not `auto`.
- `PUBLISH_API_KEY`: dedicated secret shared only with the private GPT Action.

Alternatively deployment syncs GitHub secrets GEMINI_API_KEY/PUBLISH_API_KEY and repository variable GEMINI_PLATE_MODEL (mapped to GEMINI_MODEL). Existing Worker bindings are preserved. Preflight stops deployment before migrations/assets/runtime changes when dependencies are absent. Do not copy secrets into docs, logs, chat or code.

Gate 10 on main commit f1f7b59 verified Gateway Gemini generation with gemini-3.5-flash-lite, fallback_used=false. This proves the Gateway text call only, not image processing or website configuration.

## Validation and release boundary
Unit/integration tests mock Gemini and Images, checking multiple masks, invalid bounds, provider failures, uncertainty, absence of original writes, and draft/publish lifecycle. They do not prove real model accuracy.

Before production sign-off: configure website dependencies, deploy, complete the production publishing smoke, then use a real multi-plate photo to verify every plate is covered. Exercise the private GPT Action with the intended account and return the actual article URL. Confirm one scheduled and one batch submission through Telegram. Do not label these live checks completed from mocked tests.


### Tài liệu nguồn: docs/remaining-acceptance.md

# Nghiệm thu các hạng mục còn lại — PHAN THUẦN XTRA

Cập nhật 2026-10-03, Asia/Ho_Chi_Minh. Tài liệu này là quy trình nghiệm thu, không phải bằng chứng các bước thực tế đã được thực hiện. MASTER_PROJECT_STATUS.md là nguồn trạng thái chính.

## 1. S21 thật: Content Review và Customer Care

Dùng Telegram trên S21 và tài khoản owner đang sử dụng. Gửi `/customerapp`, mở Mini App.

- Tab **Nội dung**: xác nhận chữ tiếng Việt, các nút Lọc/Tải lại, thông báo AI đang tắt, hạn mức và khu vực tiến trình hiển thị đầy đủ; không bị header che hoặc cuộn ngang.
- Nếu không có nháp thật: ghi nhận màn hình rỗng hoạt động đúng; không coi đây là bằng chứng sửa/review một nháp. Khi có nháp riêng tư do owner chuẩn bị, mở chi tiết và kiểm tra nội dung, lịch đề xuất, thao tác review. **Đã kiểm tra** chỉ ghi nhận review, không đăng bài.
- Tab **Khách hàng**: mở hồ sơ khách hiện có; xác nhận trạng thái chăm sóc, Follow-up, ghi chú, AI đề xuất chăm sóc, lịch sử tương tác và audit.
- Nếu không có đề xuất đang chờ: ghi nhận trạng thái rỗng; cần một đề xuất thật để nghiệm thu nút Duyệt/Bỏ qua.
- Bấm **Xóa khách hàng** để quan sát hộp xác nhận, rồi **Hủy**. Không xác nhận xóa khách thật chỉ để làm kiểm thử.
- Quay lại danh sách, tải lại và xác nhận khách vẫn còn.

Bằng chứng cần lưu: thời điểm, model máy/phiên bản Telegram, màn hình hoặc video đã che tên/số điện thoại, từng bước PASS/FAIL/N/A. Không gửi initData, token hay thông tin đăng nhập. Chỉ đóng mục S21 khi có quan sát trên thiết bị thật; ảnh viewport CI vẫn là bằng chứng mô phỏng.

## 2. Một luồng Customer Care từ khách thật

Chọn một yêu cầu thật phát sinh qua kênh đang vận hành; không tạo khách/lead giả để đóng mục này.

1. Ghi nhận thời điểm và mã tham chiếu nội bộ của tương tác, khách và lead liên kết.
2. Mở đúng khách trong Mini App; xác nhận timeline Memory Brain phản ánh yêu cầu và không trộn khách khác.
3. Kiểm tra đề xuất chăm sóc từ tương tác đó. Nếu pipeline chưa tạo đề xuất hoặc quota chặn xử lý, ghi trạng thái chờ và nguyên nhân; không gán kết quả của khách khác.
4. Owner đọc lý do rồi Duyệt/Bỏ qua theo nhu cầu thật. Nếu cần follow-up, lưu thời điểm theo lịch đã trao đổi thật với khách.
5. Tải lại hồ sơ, xác nhận trạng thái, follow-up và audit phản ánh quyết định. Mỗi lần thử lại phải đối chiếu kết quả đã ghi trước khi tạo thao tác mới.
6. Khi follow-up thực sự diễn ra, ghi kết quả thật. Không tự gửi thông báo hoặc lời hứa cho khách chỉ để nghiệm thu.

Bằng chứng tối thiểu: tương tác nguồn → đúng khách/lead → timeline → đề xuất → quyết định owner → audit/lịch follow-up. Chỉ ghi mã tham chiếu và kết quả tổng hợp vào MASTER; nội dung riêng tư giữ trong hệ thống. Có đủ chứng cứ mới đóng mục E2E thật.

## 3. AI Content: quota, chạy thử có giới hạn và quyền publish

Production hiện giữ `CONTENT_RUNNER_LIVE_ENABLED=0`. Probe ghi nhận lúc **17:05:45 ngày 2026-10-03 (UTC+7)** trả HTTP 429 / Cloudflare 4006, hết free allocation 10.000 neurons. Đây là kết quả tại thời điểm probe, không phải cam kết quota đã hồi phục.

Điều kiện để triển khai bước tiếp theo:

- Probe mới xác nhận đúng tài khoản/credential và model phản hồi được; kết quả thiếu, timeout hoặc quota lỗi không được coi là PASS.
- Không tự nâng gói trả phí, thay ngân sách hoặc đổi nhà cung cấp.
- Chuẩn bị thay đổi cấu hình live runner trong PR riêng, giữ hạn mức **12 lượt/ngày UTC, 3 lượt/run, 1.200 output tokens, 25 giây**; CI và AI audit phải xanh trước deploy.
- Owner cấp hai credential khác nhau cho writer agent-11 và scheduler agent-19, cùng pipeline, thời hạn tối đa một giờ. Không đưa owner credential vào runner.
- Dùng brief từ nội dung owner đã xác nhận và lịch tương lai theo Asia/Ho_Chi_Minh; chạy một request_id ổn định. Mất phản hồi thì reconcile/resume cùng request_id; không sinh hàng loạt request mới.
- Kiểm chứng một nháp riêng tư, một đề xuất lịch, ledger/audit, số lượt provider và replay. Kết quả yêu cầu `publicPublish:false`, `autoPublish:false`, **0 pending publication jobs**.
- Owner review nội dung thực tế. Publish vẫn là thao tác owner riêng; bật AI không cấp quyền public publish cho agent.
- Nếu quota lỗi, output không hợp lệ hoặc vượt ngân sách: dừng run theo contract, giữ artifact riêng tư và đưa cấu hình live về 0 qua quy trình deploy. Không xóa ledger để thử lại.

Chỉ đóng mục live readiness khi có probe mới PASS và bằng chứng bounded provider/run phù hợp. Luồng offline PASS không thay thế bằng chứng model thật.

## 4. Giới hạn của bản backup đã gửi

Backup run **37114688475** đã gửi Telegram và Gate 14 **37114866763** đã phục hồi thử thành công. Phạm vi gồm source snapshot, D1 chính, R2 chính, sáu Worker và cấu hình đã che bí mật.

Các phạm vi chưa được backup dữ liệu trong bản này:

| Phạm vi | Việc cần làm trước khi tuyên bố đủ |
| --- | --- |
| D1 phụ luxury-ui-db, chatbot-db | Export SQL riêng, lưu evidence và phục hồi thử từng DB |
| R2 phụ ai-pt-xtra-apk, phanthuanxtra-images | Inventory/object count, lấy toàn bộ byte, checksum và kiểm tra restore |
| KV, Durable Object storage | Xác định binding/dữ liệu thực tế và thiết kế exporter phù hợp từng ứng dụng |
| Queue đang xử lý | Dùng checkpoint/reconciliation; không tuyên bố snapshot queue từ việc backlog=0 |
| Khóa bí mật | Quy trình khôi phục credential riêng ở nơi bảo mật; không chép vào Telegram hoặc repo công khai |

Audit 18:58 xác nhận tài nguyên và backlog hiện tại; audit không thay thế nội dung backup. Mọi mở rộng cần receipt và restore proof mới. Không gộp các giới hạn này vào nhãn “backup toàn bộ tài khoản Cloudflare đã xong”.


### Tài liệu nguồn: docs/telegram-editorial.md

# Đăng bài qua @phanthuanxtra_auto_bot

Các lệnh dưới đây đăng lên Blog tại phanthuanxtra.com. Nội dung được giữ nguyên,
không cần Workers AI để soạn lại. Luồng xe và `/blog` một dòng kèm ảnh dùng AI
vẫn hoạt động như trước. `/blog` hoặc `/news` có tiêu đề và nội dung trên các dòng
riêng dùng luồng bài tổng quát mới, kể cả khi kèm ảnh.

## Đăng ngay, lưu nháp

Gửi tin nhắn hoặc một ảnh cover có chú thích:

```text
/post Tiêu đề bài viết
Nội dung đoạn đầu.

Nội dung đoạn tiếp theo.
```

Thay `/post` bằng `/draft` để lưu nháp. Bot trả mã bài. Dùng `/publish 12`
để xuất bản bản nháp số 12. `/publish` không đưa bài đã hẹn lên sớm.
Bài nháp không có URL công khai; có thể sửa nội dung trong Admin trước khi đăng.

Ảnh cover: một ảnh riêng, tối đa 10 MiB; chuyển WebP, bỏ metadata, lưu R2.
Ảnh cover mới qua Gemini tìm biển số, phủ kín các vùng tìm được, rồi kiểm tra lại trước khi lưu R2. Lỗi hoặc kết quả không chắc chắn sẽ chặn lưu ảnh. Cần GEMINI_API_KEY và GEMINI_MODEL trên Worker website; cấu hình Gateway riêng không tự cấp quyền cho Worker này. Xem docs/gemini-editorial-privacy.md. Album nhiều ảnh chưa hỗ trợ.

## Hẹn giờ Việt Nam

```text
/schedule 2026-10-01 09:00
Tiêu đề bài viết
Nội dung bài viết.
```

Ngày giờ luôn là giờ Việt Nam (UTC+07:00), định dạng YYYY-MM-DD HH:mm và phải
ở tương lai. Bài được công khai ở lượt cron đầu tiên sau giờ hẹn. Cron hiện chạy
mỗi 5 phút; không cam kết đúng từng giây. Khi cron bị gián đoạn, bài còn chờ được
xử lý ở lượt chạy lại; mỗi lượt tối đa 20 bài, ưu tiên giờ hẹn sớm nhất.

`/posts`: xem 20 bài gần nhất của chat cùng mã, trạng thái, giờ hẹn và link đã đăng.
`/cancel 12`: hủy bản nháp/lịch đang chờ; không xóa nội dung, không gỡ bài đã công khai.
Bài đã hủy không được mở lại bởi webhook lặp. Nếu cần hẹn lại, gửi yêu cầu mới.

## Nhiều bài trong một lần

Gửi tối đa 20 bài bằng tin nhắn:

```text
/batch
/post Tiêu đề thứ nhất
Nội dung thứ nhất.
---
/draft Tiêu đề thứ hai
Nội dung thứ hai.
---
/schedule 2026-10-02 10:00
Tiêu đề thứ ba
Nội dung thứ ba.
```

Hoặc đính kèm tệp UTF-8 `.txt` (cùng cú pháp, không cần dòng `/batch` trong tệp)
hoặc `.json`, tối đa 100 KiB, và đặt chú thích `/batch`. JSON mẫu:

```json
[
  {"title":"Bài một","content":"Nội dung một","mode":"draft","category":"Tin tức"},
  {"title":"Bài hai","content":"Nội dung hai","mode":"schedule","schedule":"2026-10-02 09:00"},
  {"title":"Bài ba","content":"Nội dung ba","mode":"publish","cover_image":"/media/blog/anh-da-luu.webp"}
]
```

JSON bỏ `mode` mặc định lưu nháp. Cover theo lô phải là đường dẫn `/media/` đã có
trên website. Nếu có bài không hợp lệ, toàn bộ lô không được lưu. Sau khi lưu,
từng bài được xử lý theo chế độ riêng. Bot trả báo cáo từng bài; `/posts` dùng
để kiểm tra khi nhận phản hồi lỗi hoặc mất kết nối.

## Vận hành và triển khai

- `TELEGRAM_AUTO_BOT_TOKEN` là token của @phanthuanxtra_auto_bot (có fallback cũ).
- Chat phải nằm trong `TELEGRAM_AUTO_PUBLISH_CHAT_IDS`, fallback `TELEGRAM_CHAT_ID`.
  Đây là quyền theo chat: thành viên chat được cấp quyền có thể dùng lệnh.
- Webhook `/api/telegram/webhook` phải có `TELEGRAM_WEBHOOK_SECRET` hợp lệ;
  không cấu hình secret thì các lệnh bài tổng quát trả 503 và không ghi dữ liệu.
- Deploy qua GitHub Actions → Cloudflare API/SDK; không dùng Wrangler.
- Controller tự áp dụng `0016_editorial_jobs.sql` và giữ cron `*/5 * * * *`.
- Bài nằm trong `posts`; `editorial_jobs` quản lý yêu cầu, chủ chat và giờ hẹn UTC.
- D1 batch giữ việc tạo bài, lịch, audit trong một giao dịch. Webhook lặp cùng
  chat/message_id không tạo lại bài. Gửi một tin nhắn mới là yêu cầu mới.
- Cron cập nhật bài và lịch trong một giao dịch; chạy trùng không đăng lại.
  Bài bị Admin lưu trữ hoặc xóa sẽ không bị cron phục hồi.
- Bot báo trạng thái từ D1 và URL chuẩn; đây không phải phép thử HTTP từ mạng ngoài.

## Kiểm chứng

```sh
node --test tests/editorial-publishing.test.mjs tests/auto-bot-ai.test.mjs
```

Kiểm thử dùng SQLite thật để kiểm tra rollback, cạnh tranh, trạng thái công khai,
chống trùng, hủy, giới hạn lô/tệp, giờ Việt Nam, ảnh WebP và quyền webhook.
Sau deploy cần thử trên bot thật: tạo nháp → /publish, hẹn giờ → chờ cron,
hủy một lịch, nhập lô hỗn hợp và mở link public. Chỉ đánh dấu production PASS
khi đã có bằng chứng những bước này, không suy từ PR merged hoặc unit tests.


## 2026-10-05 — Telegram photo-only album receipt / PR #765

- Sự cố sau khi quay lại vận hành: owner gửi 25 ảnh xe sau `/carnew` nhưng album photo-only không có receipt, làm intake thành công trông như thất bại và có nguy cơ gửi ảnh lặp.
- Nguyên nhân: nhánh `media_group_id` chủ đích giữ photo-only album ở `pending` để ghép nhiều media group, nhưng không có xác nhận quan sát được cho owner. Đây là lỗi UX/observability; không có bằng chứng D1/R2 làm mất 25 ảnh.
- Khắc phục: photo-only album vẫn giữ `pending`, không queue sớm; sau khi media group ổn định bot gửi receipt tổng `📥 ĐÃ NHẬN ẢNH XE — N ẢNH` và nhắc `không cần gửi lại ảnh`. Album có caption vẫn dùng nhánh queue hiện hữu.
- Regression: cập nhật test multi-album để cô lập đúng block `if(hasPhoto&&!hasText)`; không dùng regex xuyên sang nhánh album có caption.
- PR #765 `fix(telegram): acknowledge photo-only album intake` đã squash-merge vào `main`.
- Merge commit production: `6f5543e4fcd3aba03ce1379f061efb486d70ad16`.
- Pre-merge head `dec488f8dc99edf7ae35395a60083f22939745da`: CI #1479 PASS, AI Pre-Deploy Audit #611 PASS, Jev + LLM Decision Cascade #86 PASS, Deploy Cloudflare Worker #2053 PASS.
- Post-merge: CI #1480 PASS; Deploy Cloudflare Worker #2054 PASS; job `CI / Validate` PASS; job `Deploy production Worker (Cloudflare API/SDK)` PASS.
- Safety: không đổi D1 schema, không xóa R2/media, không đổi `/carfinish`, không đổi Workers AI.
- Quy tắc vận hành: khi photo-only album đã có intake/session, không `/carnew` lại và không gửi lại album chỉ vì thiếu receipt; kiểm tra webhook/runtime trước. Production PASS của thay đổi này được xác nhận ở mức deploy; với từng xe vẫn phải hoàn tất runtime gate `ảnh → nội dung → /carfinish → /carpreview → /carpublish`.


## TG-730 PORSCHE 718 BOXSTER — PRODUCTION DATA / GALLERY ACCEPTANCE — 2026-10-05 (UTC+7)

- Production vehicle: `tg-730`, PORSCHE 718 BOXSTER 2024 | RACING YELLOW | MÂM ĐEN CỰC CHẤT, status `available`.
- Owner-confirmed commercial data applied in D1: price `4,780,000,000 VND`; mileage/ODO `1,100 km`. Do not infer or overwrite these owner values from AI output.
- Media integrity: 25/25 `car_images` retained; no media deletion and no R2 object deletion. `cars.images_json` remains `[]`; public gallery order is controlled by `car_images.sort_order` and cover by `cars.cover_image` + `car_images.is_cover`.
- Owner gallery rule corrected and accepted: **when a vehicle album contains a suitable model/person photo, prioritize the best suitable model/person image as cover and gallery image #1**. If no suitable model/person image exists, prefer the best clean exterior 3/4 image. After cover: exterior → exterior/details → luggage/roof as applicable → interior → interior/details, while preserving all valid media.
- TG-730 implementation: `telegram-754-b655d701bf65d685.webp` (car_image id 1768) is the model/person photo and is now `sort_order=0`, `is_cover=1`, and `cars.cover_image`. Remaining 24 images retain the curated semantic order at `sort_order=1..24`.
- Runtime evidence: D1 verification returned price `4780000000`, mileage `1100`, cover `telegram-754-b655d701bf65d685.webp`, and exactly 25 ordered image rows `0..24`. Owner screenshots after gallery work confirmed the production vehicle page renders the gallery.
- Publish consistency incident: `vehicle_ai_drafts.inbox_id=730` had `status=published` while `car_id=NULL`, although the actual car `tg-730` existed. Production record was repaired conditionally to `status=published, car_id=tg-730`; verification PASS at `2026-10-05 09:40:07` UTC timestamp stored by D1.
- Follow-up code requirement: publishing pipeline must not leave a draft in `published` state without its resulting `car_id`. Add targeted regression coverage before claiming this root cause permanently fixed. Also encode/test the owner gallery rule above so future vehicle publishes do not require manual D1 reordering.
- Safety: no repeat `/carpublish 730`, no photo resend, no D1/R2 destructive operation, and no claim that Workers AI supplied owner price/ODO.

## 2026-10-06 — FREE BUSINESS INTEGRATIONS / PR #787

Owner requested deployment of the four free-first gaps identified in the tool audit: code security → lead/email → human live chat → business analytics. Implementation must preserve the existing Cloudflare Worker + D1 + R2 + Workers AI architecture and the production API/SDK deployment path.

PR #787 `feat(integrations): add free security, lead, live-chat and analytics adapters` implements:

- **SonarQube Cloud:** optional GitHub Actions scan using `SonarSource/sonarqube-scan-action@v8.3.0`, full history checkout and `sonar.qualitygate.wait=true`. Activation requires owner-controlled `SONAR_TOKEN`, `SONAR_PROJECT_KEY`, and `SONAR_ORGANIZATION`. Without all three, the workflow reports deferred activation and sends no source to SonarQube Cloud.
- **Brevo:** optional background notification after the website lead is durably stored in D1. Existing Telegram CRM remains the primary immediate delivery. Brevo requires `BREVO_API_KEY`, verified `BREVO_SENDER_EMAIL`, and `BREVO_TO_EMAIL`; without all three there is no external request. Provider failure cannot roll back or duplicate the D1 lead.
- **tawk.to:** optional human live-chat adapter. Public config exposes validated embed identifiers only. The tawk third-party script is not loaded during page load; it is fetched only after the visitor explicitly clicks **Chat trực tiếp với showroom**. Activation requires `TAWK_PROPERTY_ID` and `TAWK_WIDGET_ID`.
- **Data Studio:** new `GET /api/analytics/summary` endpoint guarded by `Authorization: Bearer ANALYTICS_EXPORT_TOKEN`. It exports aggregate counts only (vehicle state, lead funnel state, post counts, customer count, due follow-ups), never names, phones, messages, IP addresses, cookies or customer-memory details. `integrations/data-studio/Code.gs` is a connector template; there is no direct D1 exposure.

Deployment controller and GitHub workflow can sync the six optional Worker bindings when corresponding GitHub secrets are present. Existing bindings are preserved. No D1 migration, R2 deletion/mutation, paid-plan upgrade, autonomous lead-status mutation, or Wrangler production deploy is introduced.

Targeted regression: `test/business-integrations.test.js`.

Release gate remains unchanged: AI Pre-Deploy Audit + CI must be green, then merge with expected HEAD SHA, then main production deploy and public smoke verification. Do not claim SonarQube Cloud, Brevo, tawk.to, or Data Studio as live merely because PR/deploy is green; each external integration requires its real owner-controlled configuration plus a real smoke test.

## 2026-10-06 — BUSINESS INTEGRATION RUNTIME GATES / PR #788

Follow-up to PR #787. Production evidence is tightened before any external adapter can be described as live.

- tawk.to click-load now permits retry after an external script load failure; duplicate loads remain prevented by the in-memory loading guard.
- Data Studio connector returns `isAdminUser=false` to minimize connector-side administrative exposure.
- `scripts/verify-business-integrations.mjs` runs after the public production Worker is reachable. It verifies tawk public configuration, Data Studio aggregate-only authorization/fail-closed behavior, and Brevo configuration completeness.
- The verification path sends no customer data and makes no Brevo provider request. Brevo delivery remains DEFERRED until separate authorized runtime evidence exists.
- Missing complete external configuration is reported as DEFERRED when the adapter safely remains disabled; partial/mismatched configuration fails the production gate.
- No D1 migration, R2 mutation, paid-plan change, or Wrangler production deployment is introduced.

Release contract: merge only after targeted tests, AI Pre-Deploy Audit, CI and PR deploy validation pass; after merge require main production deployment plus the new runtime boundary gate to pass.
