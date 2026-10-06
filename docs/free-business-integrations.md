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

GitHub Actions / Worker secrets:
- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`
- `BREVO_TO_EMAIL`

All three are required before any Brevo request is made. The sender must already be verified in Brevo. Notifications are plain text, bounded, and tagged `website-lead`. Failure is isolated from lead persistence and never rolls back the D1 lead.

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
