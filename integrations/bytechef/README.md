# ByteChef integration — PhanThuầnXtra (candidate only)

Status: **SOURCE-ONLY / NOT ENABLED / NO PRODUCTION DEPLOYMENT**. This is an optional outbound webhook adapter, not an import or fork of ByteChef.

## Architecture

Existing verified Admin/Telegram publishing workflow (server-side only) → explicit opt-in call to `emitVehicleEvent()` → **ByteChef Community Edition** static Webhook trigger **Validate and Respond** → non-mutating review/notification steps. A 200 response means the webhook request was accepted, **not** that downstream actions completed.

ByteChef upstream: https://github.com/bytechefhq/bytechef ; component reference: https://docs.bytechef.io/reference/components/webhook_v1 ; deployment: https://docs.bytechef.io/platform/automation/deploy/workflows .

No current production handler calls this adapter. The ByteChef instance, project, workflow and webhook URL **have not been provisioned or authenticated** by this repository change.

## Setup after reviewed authorization

1. Self-host ByteChef outside the public website repository, using the upstream **PostgreSQL Docker Compose** recommendation for persistent data. Keep ByteChef credentials and encryption keys off Git.
2. Create an isolated PhanThuầnXtra project and workflow, choose **Webhook → Validate and Respond**, configure a strong private CSRF token, publish and deploy to a staging environment.
3. In the *server/Worker's private secret store*, configure `BYTECHEF_WEBHOOK_URL`, `BYTECHEF_WEBHOOK_CSRF_TOKEN`, `BYTECHEF_ENABLED` (off by default). **Do not** commit values, put them into client-side HTML/JS, or use the public frontend to call the webhook.
4. After an independently verified existing event, call `emitVehicleEvent({enabled:true, webhookUrl, csrfToken, event, vehicleId, correlationId})` from an approved server-side handler. This step is **not implemented** by this candidate; it requires a separately reviewed PR and explicit deploy approval.
5. Confirm the exact staging execution in ByteChef's execution log; then independently review rollback, rate limits, idempotency, webhook retry behavior and permissions.

## Allowlisted metadata only

- `vehicle.review_requested`: request for review, never directly publish or modify a record.
- `vehicle.publication_verified`: notification after separate trusted publication verification.
- `vehicleId`: opaque car identifier; `correlationId`: non-sensitive opaque event id.
- **Forbidden:** customer name/contact, Telegram secrets, prices or descriptions unless separately approved, raw request headers, image/file URLs, source dumps or private repository data.

The emitter rejects unexpected event types, missing credentials, non-HTTPS destinations, malformed identifiers and redirect following. It does not retry to avoid duplicate side effects. No Cloudflare D1/R2, inventory, gallery, Telegram bot or production URL changes.

## Verification and rollback

Source-only test: `node --test test/bytechef-integration.test.js`. Disabled mode must not make network calls; a 2xx receipt cannot be reported as workflow completion. Rollback: keep `BYTECHEF_ENABLED` false / remove the eventual call-site; existing business flows must operate independently of ByteChef. The sole business incident/status journal remains `MASTER_PROJECT_STATUS.md`; this file is an integration design, **not** another status board.
