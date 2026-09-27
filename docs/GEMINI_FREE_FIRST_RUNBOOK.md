# Gemini Free-First Runbook

Last reviewed: 2026-09-27

## Decision
Use Gemini Developer API only when the current Google project/API key actually exposes a suitable free-tier model. Cloudflare Workers AI remains the automatic fallback. Do not repeatedly deploy guessed Gemini model IDs.

## Current production evidence
- Routing policy: `zero-cost-first`.
- Gemini is enabled.
- Gate 10 production returned `gemini_http_failed`, HTTP `404`, provider code `NOT_FOUND`.
- Workers AI fallback succeeded.
- `production_mutation=false`.

Interpretation: current failure is model/API availability, not `gemini_disabled` and not quota exhaustion.

## Internet research conclusion
Google currently limits Gemini 2.5 access to users/projects that actively used 2.5 in the past. 2.5 is not deprecated, but Google recommends newer models for new projects. Therefore `gemini-2.5-flash` is not a safe default for this new project.

Current candidates to prefer, only if returned for this project:
1. `gemini-3.5-flash-lite` — cost-efficient/high-volume/simple agentic tasks.
2. `gemini-3.8-flash` — stronger engineering/agentic tasks.
3. Another current GA Flash/Flash-Lite model explicitly returned by the project.

Google pricing currently lists free-tier input/output for 3.5 Flash-Lite and 3.8 Flash, subject to project/model limits and eligibility.

## Mandatory model preflight
Before changing `GEMINI_MODEL`, query:
`GET https://generativelanguage.googleapis.com/v1beta/models`

Use the API key securely and select only a returned model that supports `generateContent`. Never print/log/commit the API key.

Selection:
1. Prefer `gemini-3.5-flash-lite` if returned + supports `generateContent`.
2. Else `gemini-3.8-flash` if returned + supports `generateContent`.
3. Else another approved GA Flash/Flash-Lite returned by `models.list`.
4. Else Workers AI fallback.

Do not use Gemini 2.5 here unless `models.list` explicitly confirms it.

## Error policy
| Result | Action |
|---|---|
| 2xx | Gemini usable. |
| 404 NOT_FOUND | Do not retry same model. Refresh `models.list`; choose available model or fallback. |
| 429 RESOURCE_EXHAUSTED | Quota/rate limit. Bounded backoff where appropriate, then fallback. |
| 408 / 5xx | Transient. Bounded exponential backoff + jitter, then fallback. |
| 400 | Fix request/parameters; no blind retry. |
| 403 | Verify key/project/API permission; no blind retry. |
| timeout/network | Bounded retry, then fallback. |

Never retry indefinitely.

## Efficiency rules
- Cache a validated model; do not call `models.list` per user request.
- Refresh discovery after 404/NOT_FOUND and during deployment validation.
- Keep context/output bounded.
- Prefer Flash-Lite for routine classification/extraction/transformation.
- Use stronger Flash only when complexity requires it.
- Keep Workers AI automatic fallback.
- Keep production mutation disabled.
- Fallback success does not count as Gemini runtime PASS.

## Gate 10
Gemini PASS requires:
- `ok=true`
- `routing_policy=zero-cost-first`
- `selected_provider=gemini`
- `fallback_used=false`
- `production_mutation=false`
- non-empty response

Fallback verification requires:
- `selected_provider=cloudflare-workers-ai`
- `fallback_used=true`
- safe `fallback_reason`
- `production_mutation=false`

## Do not waste time on
- Redeploying `gemini-2.5-flash` after confirmed 404 without `models.list`.
- Rotating/deleting secrets merely to force fallback.
- Treating Ubuntu runner migration notices as Gemini failures.
- Logging provider bodies, API keys, Authorization headers, or secrets.
- Weakening Gate 10 just to get green CI.
- Declaring final GREEN while Gemini unintentionally falls back.

## Sources reviewed
- https://ai.google.dev/gemini-api/docs/models
- https://ai.google.dev/gemini-api/docs/deprecations
- https://ai.google.dev/gemini-api/docs/changelog
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/rate-limits
- https://ai.google.dev/api/models
- https://ai.google.dev/api/generate-content
- https://ai.google.dev/gemini-api/docs/troubleshooting

## Next engineering action
Implement a secret-safe deployment preflight using `models.list`: verify `generateContent`, select an approved free-tier model from the actual returned set, and fall back safely to Workers AI if none is available.
