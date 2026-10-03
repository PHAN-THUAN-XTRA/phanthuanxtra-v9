# ChatGPT Editorial Image Delivery SOP

## Purpose

For homepage and editorial imagery, ChatGPT must prepare two optimized delivery files from the approved source image:

- AVIF — preferred browser format.
- WebP — compatibility fallback.

Do not switch production HTML to a newly generated asset until both optimized objects are uploaded to Cloudflare R2 and verified through the production Worker.

## Required workflow

1. Start from the approved source image.
2. Preserve the intended crop, aspect ratio, branding safe area, and intrinsic dimensions.
3. Generate both `.avif` and `.webp` variants.
4. Use stable, semantic filenames. For the Green Energy homepage hero:
   - `media/editorial/green-energy/green-energy-home-hero.avif`
   - `media/editorial/green-energy/green-energy-home-hero.webp`
5. ChatGPT should upload both generated files to the Cloudflare R2 media bucket when an authenticated Cloudflare/R2 write tool is available.
6. If no authenticated Cloudflare/R2 write tool is available, ChatGPT must not claim that upload succeeded and must not point production HTML at unverified objects.
7. Verify both public production URLs through the Worker:
   - HTTP 200
   - AVIF returns `Content-Type: image/avif`
   - WebP returns `Content-Type: image/webp`
   - response body is non-empty
8. Only after both checks pass, update homepage/editorial markup to prefer AVIF and fall back to WebP.
9. Update regression tests and Production Asset Delivery Gate to verify the exact assets used by production.
10. Run AI Pre-Deploy Audit, CI, deployment gates, merge with the expected HEAD SHA, then verify the post-merge production gates.

## Rendering contract

Use `<picture>` when practical:

```html
<picture>
  <source type="image/avif" srcset="/media/editorial/green-energy/green-energy-home-hero.avif">
  <img src="/media/editorial/green-energy/green-energy-home-hero.webp" alt="..." width="1672" height="940">
</picture>
```

For lazy carousel slides, the JavaScript lazy-loading implementation must support the `<source>` elements as well as the fallback `<img>`. Never introduce AVIF/WebP source URLs that the carousel does not actually activate.

## Safety rules

- Never delete the source PNG solely because optimized variants exist.
- Never invent an R2 filename or infer that an upload succeeded.
- Never treat a green generic asset gate as proof unless it checks the exact asset used by the page.
- Never merge an image delivery change while its targeted CI or production asset verification is failing.
