# PhanThuầnXtra Constitution

**Status:** PRODUCTION / NO DEPLOY FROM SPEC KIT
**Version:** 1.0.0
**Ratified:** 2026-11-03

## Non-negotiable principles

1. This repository is PUBLIC: never place customer information, credentials, Telegram bot secrets, API tokens, personal data, private project documents or internal URLs in specs.
2. Preserve public vehicle listing identities, published content, image order, prices and live inventory semantics until a specifically approved spec permits a bounded change.
3. Do not mutate Cloudflare production, Workers, the live Admin/Telegram database or vehicle records while creating specs or testing; require review and rollback for runtime changes.
4. Use staged and isolated fixtures with exact expected behavior, especially for Admin/Telegram parity and vehicle-content workflows.
5. Never copy code, confidential receipts or device data from private Lyly, Vertu or NECC repositories.

## Governance

Use a bounded feature spec, clarify unknowns, plan against current code, generate tasks and independently review tests before a separate approved deployment. This bootstrap may not authorize any production action, record deletion or live-data mutation.
