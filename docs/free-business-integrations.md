# Free business integrations — PHAN THUẦN XTRA

Status: code integration prepared for SonarQube Cloud, Brevo, tawk.to and Data Studio. External services remain fail-closed until their owner-controlled credentials or public widget identifiers are configured. No paid-plan upgrade is performed by this change.

## Design boundary

The existing Cloudflare Worker + D1 + R2 + Workers AI architecture remains authoritative. Integrations are adapters only:

- SonarQube Cloud: CI static analysis and Quality Gate. No production runtime dependency.
- Brevo: optional background notification for a newly persisted website lead. D1 remains the lead system of record; Telegram CRM remains intact.
- tawk.to: optional human live chat. The third-party script is not loaded until the visitor explicitly clicks the live-chat button.
- Data Studio: bearer-protected aggregate analytics endpoint plus a connector template. No PII export and no direct D1 access.

## Required external configuration

### SonarQube Cloud

GitHub secret:
- `SONAR_TOKEN`

GitHub repository variables:
- `SONAR_PROJECT_KEY`
- `SONAR_ORGANIZATION`

Without all three, the workflow reports deferred activation and does not send source to SonarQube Cloud.

### Brevo

**Current owner policy (2026-10-07 and later):** `BREVO_API_KEY` is a **Cloudflare Worker `secret_text` only**. Do not copy, sync or log its value in GitHub Actions, source, reports, browser scripts or client-facing APIs. The production deploy checks for the existing Cloudflare binding without moving its value into GitHub.

Non-secret sender/recipient runtime configuration:
- `BREVO_SENDER_EMAIL`
- `BREVO_TO_EMAIL`

The runtime sender, recipient and Cloudflare-only API secret must all be available before making a Brevo request. The sender must already be verified in Brevo. Notifications are plain text, bounded, and tagged `website-lead`. A failed notification must never roll back the D1 lead. **Provider acceptance and actual inbox delivery remain separate real-world acceptance gates**, not implied by the deployment configuration check. See [free-first AI automation roadmap](free-first-ai-automation-roadmap-2026.md) for proposed durable outbox, reconciliation and safe retry.

### tawk.to

GitHub Actions / Worker bindings:
- `TAWK_PROPERTY_ID`
- `TAWK_WIDGET_ID`

The public configuration endpoint returns only validated widget identifiers; these are public embed identifiers, not authentication credentials. If either value is absent/invalid, the live-chat button remains hidden.

### Data Studio

GitHub Actions / Worker secret:
- `ANALYTICS_EXPORT_TOKEN`

Endpoint:
- `GET /api/analytics/summary`
- `Authorization: Bearer <ANALYTICS_EXPORT_TOKEN>`

The response contains aggregate counts only. The connector template lives in `integrations/data-studio/Code.gs`.

## Release gates

Follow MASTER_PROJECT_STATUS.md:

1. targeted tests and `npm test`;
2. AI Pre-Deploy Audit and CI green;
3. merge with expected HEAD SHA;
4. main production deployment green;
5. verify `/api/health` and the new public config endpoint;
6. do not claim Brevo, tawk.to, SonarQube Cloud or Data Studio live until real external credentials/configuration and a real smoke test prove each path.

No D1 schema change, R2 mutation, paid upgrade, destructive operation, or autonomous lead-status mutation is part of this change.

## Production verification

Every production deploy runs `scripts/verify-business-integrations.mjs` after the public Worker boundary is reachable:

- tawk.to: verifies the deployed public config matches configured widget IDs, or proves the adapter remains disabled when no complete configuration exists.
- Data Studio: verifies unauthenticated denial plus the aggregate-only privacy contract when a token exists; without a token it must fail closed with HTTP 503.
- Brevo: verifies configuration completeness without transmitting customer data. When no configuration exists it is explicitly reported as DEFERRED; a partial configuration fails the deploy gate. Real provider delivery still requires separate runtime evidence from an authorized test or real lead.

External activation is reported as PASS only when runtime evidence proves it. A green deploy with an intentionally unconfigured provider is DEFERRED, not a claim that the external integration is live.
