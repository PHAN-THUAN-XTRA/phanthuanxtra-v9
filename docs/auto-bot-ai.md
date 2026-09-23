# Auto Bot: vehicle Blog and customer chat

## Usage

- `/help`: show commands.
- Send a vehicle photo with caption `/blog` or `/blog <verified notes>`: analyze the image, ask a model to call `createBlogPost`, validate that call and publish the post. `/news` is an alias. Bot mentions in commands are accepted.
- `/blog <title>` followed by a new line and the complete body: retain manual text publication.
- `/chat <question>` or ordinary customer questions: answer using GLM 4.7 Flash, falling back to Qwen 3.8 27B and then Nemotron 3 Super on errors/empty output.
- Photos with ordinary vehicle inventory captions keep the existing vehicle import route. A caption with a year/ODO/price is treated as inventory unless it is a question. Use `/chat` when intent is ambiguous.

## Publication permission and retries

`TELEGRAM_AUTO_PUBLISH_CHAT_IDS` is an optional comma/whitespace-separated list of numeric Telegram chat IDs. Store it as a GitHub Actions secret for the production deploy workflow or as a Worker binding. When absent, `TELEGRAM_CHAT_ID` is the sole permitted chat. With neither binding present, Blog publication is denied. Group/channel membership must be controlled by the operator: permission is at chat level.

Both manual and generated Blog commands enforce this list before AI, downloads or writes. Customer chat has no publishing tools. AI-generated photo posts use a deterministic slug derived from chat/message IDs, backed by the existing unique posts.slug constraint. Completed retries reuse the post; concurrent inserts cannot create two posts. Concurrent retries can still perform duplicate inference before the insert. Manual text posts retain their existing title slug behavior.

## AI behavior

Vision uses the existing Scout-first vehicle analyzer, including its existing fallbacks. Automatic Blog creation requires a brand, model and confidence of at least 0.85. This score is a model estimate, not independent verification.

Blog composition/tool calling tries Scout, Qwen and Nemotron sequentially, using structured visual observations and sender notes; raw images are not sent to the text-only Nemotron path. Exactly one `createBlogPost` call is accepted. Only title/content/excerpt are accepted from AI; destination, status, category, slug and image are server-controlled. Models are instructed not to invent price, ODO, original year, mechanical/legal status or contact details. Publication goes through the existing CMS persistence and audit log. Only actual persistence success produces a Blog link.

Customer chat does not read live inventory and says when showroom verification is needed. Daily quota errors stop the new chat/tool fallback chains. There is no unbounded tool loop.

## Cost and verification

Cloudflare's allowance is a shared total of 10,000 Neurons/day, not unlimited free use per model. Paid usage beyond the allowance is billed. Qwen's 262,144-token context is a model limit, not an instruction to send that much data. Requests here use bounded input and output.

References (checked 2026-09-23):
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/workers-ai/models/qwen3.8-27b/
- https://developers.cloudflare.com/workers-ai/models/llama-4-scout-17b-16e-instruct/
- https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/

Tests: `node --test tests/auto-bot-ai.test.mjs`. These use mocked Workers AI/Telegram/D1/R2 and do not prove production entitlements, latency or real Telegram delivery. After deployment, use an authorized chat to send `/chat` and a photo with `/blog`, then verify the returned public Blog URL and the `telegram_auto_blog_created` model metadata in Worker logs. No real user messages or public test posts are sent by unit tests.
