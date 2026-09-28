# Gemini editorial cover privacy

## Scope
New cover uploads through the publishing API (Admin/GPT) and Telegram editorial commands normalize to WebP in memory, ask Gemini for all plate bounds, draw opaque masks with margins, and send the output for a second privacy review. Only a positive, certain review permits R2 storage. Missing configuration, malformed bounds, uncertainty, provider errors and exposed plates fail closed. The original is not stored by these paths. Model inference can miss plates: visually inspect the returned image before publishing. Existing vehicle/legacy upload paths and previously published images are outside this change.

Covers supplied by URL must carry `plate_privacy=gemini-reviewed-v1` in R2 custom metadata. Existing images need re-upload through this pipeline. No raw-image fallback. Both Gemini passes receive image data; use only authorized images. Two calls add latency; Actions uploads can time out, so check saved state and retry as necessary.

## Configuration
The website Worker `phanthuanxtra-v2` is separate from Developer Gateway. A working Gemini secret on the Gateway does not configure the website Worker.

Configure securely on the website Worker:
- `IMAGES` and `MEDIA` bindings.
- `GEMINI_API_KEY` secret for the authorized project.
- `GEMINI_MODEL`: an explicit image-capable model returned by that project's models.list, not `auto`.
- `PUBLISH_API_KEY`: dedicated secret shared only with the private GPT Action.

Alternatively deployment syncs GitHub secrets GEMINI_API_KEY/PUBLISH_API_KEY and repository variable GEMINI_PLATE_MODEL (mapped to GEMINI_MODEL). Existing Worker bindings are preserved. Preflight stops deployment before migrations/assets/runtime changes when dependencies are absent. Do not copy secrets into docs, logs, chat or code.

Gate 10 on main commit f1f7b59 verified Gateway Gemini generation with gemini-3.5-flash-lite, fallback_used=false. This proves the Gateway text call only, not image processing or website configuration.

## Validation and release boundary
Unit/integration tests mock Gemini and Images, checking multiple masks, invalid bounds, provider failures, uncertainty, absence of original writes, and draft/publish lifecycle. They do not prove real model accuracy.

Before production sign-off: configure website dependencies, deploy, complete the production publishing smoke, then use a real multi-plate photo to verify every plate is covered. Exercise the private GPT Action with the intended account and return the actual article URL. Confirm one scheduled and one batch submission through Telegram. Do not label these live checks completed from mocked tests.
