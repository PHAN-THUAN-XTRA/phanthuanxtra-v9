# Phan Thuần Xtra Security Operator — Phase 2

Phase 2 adds a bounded Incident Investigator after the free-first monitor.

## Trigger
The investigator runs only when the monitor reports at least one HIGH or CRITICAL finding.

## Automatic investigation
It records:
- incident ID and severity,
- public health and Cloudflare evidence inherited from the monitor,
- current main commit, age, and changed files,
- whether a deterministic remediation candidate is safe.

## Automatic draft remediation
A draft revert PR is allowed only when all conditions are true:
1. severity is CRITICAL,
2. the incident is a code/runtime signal (homepage, health endpoint, or Worker 5xx),
3. the latest main commit is at most 60 minutes old,
4. the latest commit has exactly one parent,
5. it does not touch migrations, wrangler config, deploy workflow/controller, backup controller, or Developer Gateway.

Before push, the branch must pass `npm test` and `npm run check`.

The PR is always draft and is never auto-merged.

## Report-only incidents
WAF/security-event spikes, HIGH-only incidents, old deploys, merge commits, or high-risk-path changes never produce an automatic code revert. They generate an investigation report and Telegram owner notice only.

## Cost policy
No paid AI API is required or invoked by Phase 2. There is no paid fallback. Model-based review can be added later only behind an explicit free-only gate.

## Owner-only actions
Production merge/deploy/rollback, WAF/firewall mutation, Under Attack Mode, secret rotation, data deletion, permission changes, and paid-plan upgrades remain owner decisions.
