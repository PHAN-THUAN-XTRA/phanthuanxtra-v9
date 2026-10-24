# XTRA AI HUB — Free Resources (audit only)

Status: proposal only. No production deployment, no ROM flashing, no changes to running Lyly.

## Verified resources (2026-10-24)
- Cloudflare Workers AI: 10,000 Neurons/day free allocation, resets 00:00 UTC. Model candidate: `@cf/zai-org/glm-4.7-flash`. Usage and eligibility must be checked in the actual account.
- GitHub Actions: standard hosted runners free for public repositories; GitHub Free includes 2,000 minutes/month for private repositories (account-wide plan quota). Keep workflows manual until reviewed.
- Ollama: self-hosted open-source inference; compute/storage costs borne by host.
- Gemini API, Groq, Hugging Face, OpenRouter: optional adapters; availability and free quotas are account/model dependent. Disabled until keys and quotas verified.

## Safe integration design
- API gateway on a separate staging Worker; default deny, authentication required, per-project scopes and rate limits.
- Env-only secrets: `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `HF_TOKEN`, `XTRA_HUB_TOKEN`. Never commit actual values.
- Providers default disabled. Cloudflare Workers AI only when explicit staging binding is configured; no paid-model fallback.
- Budget hard stop on quota errors (403/429); no retry storms, no logging of prompts containing private data.
- GitHub Actions must never auto-deploy from this audit branch.
- Vertu project: read-only diagnostics only; no flash/format/write/preloader/NVRAM/NVDATA/IMEI operations.

## Next gates
1. Review repository structure and existing CI/CD before adding executable integration.
2. Validate free plan and model eligibility in connected provider accounts.
3. Implement isolated mock tests, security tests, and manual staging approval.
4. Open a draft PR; do not merge without review.

References:
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/
- https://docs.github.com/en/actions/concepts/billing-and-usage
