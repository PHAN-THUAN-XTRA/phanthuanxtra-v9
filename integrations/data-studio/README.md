# PHAN THUẦN XTRA — Data Studio connector

This connector reads only aggregate, non-PII metrics from:

`https://phanthuanxtra.com/api/analytics/summary`

The Worker endpoint is fail-closed. It returns HTTP 503 until `ANALYTICS_EXPORT_TOKEN` is configured, and HTTP 401 for an invalid bearer token.

## Activation

1. Create a Google Apps Script community connector project.
2. Paste `Code.gs` into the project.
3. Add Script Property `ANALYTICS_EXPORT_TOKEN` with the same random value stored on the Cloudflare Worker / GitHub Actions secret.
4. Optionally set `PTX_ANALYTICS_ENDPOINT`; otherwise the canonical production endpoint is used.
5. Deploy the connector and create a Data Studio report.

Do not put the token in the report, sheet cells, repository, browser JavaScript, or URL query string.

The connector intentionally exposes counts only: vehicle states, lead funnel states, published/draft posts, customer count, and due follow-ups. It does not export names, phone numbers, messages, IP addresses, cookies, or customer-memory details.
