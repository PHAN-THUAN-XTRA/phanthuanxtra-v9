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
