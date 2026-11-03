# AGENTS.md — PhanThuầnXtra public website

Read .specify/memory/constitution.md before using Spec Kit. No production mutation, no vehicle record deletes and no secrets in this PUBLIC repo. Plan and review only by default.

- This repository is PUBLIC: never place customer information, credentials, Telegram bot secrets, API tokens, personal data, private project documents or internal URLs in specs.
- Preserve public vehicle listing identities, published content, image order, prices and live inventory semantics until a specifically approved spec permits a bounded change.
- Do not mutate Cloudflare production, Workers, the live Admin/Telegram database or vehicle records while creating specs or testing; require review and rollback for runtime changes.
- Use staged and isolated fixtures with exact expected behavior, especially for Admin/Telegram parity and vehicle-content workflows.
- Never copy code, confidential receipts or device data from any private repositories.
