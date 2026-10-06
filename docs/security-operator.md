# Phan Thuần Xtra Security Operator — Phase 3

Phase 3 keeps the free-first monitor and bounded Incident Investigator, then adds privacy-minimized telemetry baselines, structured attack analysis, mitigation proposals, and a synthetic recovery drill.

## Monitor

The monitor runs every 30 minutes and after a successful production deploy. It checks:

- public health and homepage availability,
- Cloudflare HTTP request / 5xx analytics,
- Cloudflare Security Events,
- D1 incident state and deduplication,
- owner-verified Telegram delivery.

HTTP analytics and Security Events are queried independently so one unavailable dataset cannot blind the other.

## Telemetry baseline

Migration `0036_security_telemetry_baseline.sql` stores a rolling 14-day baseline. Comparison uses the most recent 7 days and becomes baseline-ready after at least six samples.

Stored fields are aggregate operational evidence only:

- total requests,
- 5xx count and rate,
- WAF/security-event count,
- top action,
- top path,
- top country,
- top Cloudflare security source.

Client IP addresses, User-Agent values, query strings, cookies, request bodies, and secrets are not stored in the baseline table.

Cloudflare link-maze injection events are retained in raw report evidence but excluded from actionable WAF spike thresholds and from the attack baseline. These events represent Cloudflare's crawler-protection/link-maze response behavior rather than a direct WAF mitigation signal.

## Phase 3 attack assessment

When an existing WAF spike signal is HIGH or CRITICAL, the Incident Investigator adds:

- current event volume,
- baseline WAF average and current/baseline ratio,
- top path, country, action, and Cloudflare security source,
- deterministic confidence,
- a narrow mitigation proposal.

The proposal is advisory only:

- `apply: false`,
- owner approval is mandatory,
- no firewall/WAF mutation is performed,
- no Under Attack Mode change is performed,
- no IP block is automatically created.

A path-scoped Rules expression may be included as an `expression_hint` for owner review. It is never submitted to Cloudflare by Phase 3.

## Automatic draft remediation

Code remediation remains intentionally narrower than attack analysis. A draft revert PR is allowed only when all conditions are true:

1. severity is CRITICAL,
2. the incident is a code/runtime signal (homepage, health endpoint, or Worker 5xx),
3. the latest main commit is at most 60 minutes old,
4. the latest commit has exactly one parent,
5. it does not touch migrations, wrangler config, deploy workflow/controller, backup controller, or Developer Gateway.

Before push, the branch must pass `npm test` and `npm run check`.

The PR is always draft and is never auto-merged by the incident workflow.

## Recovery drill

`Security Recovery Drill` uses synthetic inputs only. It does not load production secrets and does not call Cloudflare, Telegram, GitHub mutation APIs, or the production site.

The drill proves:

- healthy state produces no finding,
- telemetry loss remains report-only,
- WAF critical events produce a proposal but no code revert,
- a recent isolated runtime CRITICAL can qualify only for the existing bounded draft-revert path,
- firewall mutation and production deploy remain disabled.

It runs on relevant pull requests, on the first relevant main push, and can be invoked manually.

## Node 24 action cleanup

Security workflows use Node 24-compatible GitHub Action majors. The previous `DEP0040` / `DEP0169` warnings were emitted by the old artifact action runtime rather than repository source code.

## Cost and owner policy

No paid AI API is required or invoked by this security path. Production merge/deploy/rollback, WAF/firewall mutation, Under Attack Mode, secret rotation, data deletion, permission changes, and paid-plan upgrades remain owner decisions.
