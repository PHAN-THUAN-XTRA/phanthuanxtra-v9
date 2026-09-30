# PHAN THUẦN XTRA — Vehicle Publishing Standard

## Purpose
This file is the source-of-truth for all current and future vehicle listings published from Telegram/AI/editorial workflows.

## 1. Owner-reviewed copy
- Owner-reviewed copy is authoritative. Publishing must preserve its Vietnamese UTF-8 text exactly.
- Preserve paragraph breaks, headings, emoji, bullets and intentional blank lines.
- Never flatten the description into one paragraph.
- HTML vehicle pages must be served as `text/html; charset=utf-8`.
- Deployment gates must reject known mojibake patterns such as `PHAN THUáº¦N`, `Chi tiáº¿t`, `Ä‘`, and `BĂ`.

## 2. Price and ODO
- Store price and mileage as normalized numeric values in the vehicle record; format only at presentation time.
- Website display uses Vietnamese-friendly formatting, e.g. `12.000 km` and `4,580 tỷ` when supplied/approved by the owner.
- Never silently replace an owner-approved price or ODO with AI inference.
- Editing an already-published listing must update the existing vehicle ID; never republish solely to change price, ODO, description, or image order.

## 3. Image ordering
Every listing must preserve all approved images and use this semantic order:

1. **Human/model priority** — tasteful approved image containing a person/model with the vehicle, when present and suitable.
2. **Front hero** — strongest front or front three-quarter exterior view.
3. **Exterior progression** — front → front three-quarter → side/profile → rear three-quarter → rear.
4. **Exterior details** — wheels, lights, badges, grille, trim, engine/bay or other useful details.
5. **Cockpit transition** — dashboard / steering / driver's view.
6. **Interior progression** — front seats → rear seats → console → doors → cargo area.
7. **Interior details** — screens, controls, materials, options and close-ups.
8. Remaining useful approved images.

Do not sort by Telegram filename, upload ID, timestamp, hash, or lexical filename when visual content is available.

## 4. Gallery contract
- First ordered image is the hero/cover.
- Every remaining approved image must appear in the detail gallery.
- Do not drop images merely because there are more than a UI preview limit.
- Gallery must be responsive and lazy-load non-hero images.
- Clicking a gallery image may open the full image without changing listing data.
- Media URLs must preserve R2 path separators; encode path segments, never encode the entire key into `%2F`.

## 5. Safety and idempotency
- A published vehicle has one canonical ID (for Telegram listings, e.g. `tg-<inbox-id>`).
- Price/ODO/copy/gallery edits update that canonical record.
- Never rerun publish to perform an edit.
- Telegram confirmation failure must not be interpreted as publication failure.
- Telegram link previews should be disabled on publish confirmation where they can cause `WEBPAGE_CURL_FAILED`.

## 6. Required pre-publish checks
Before publish or update is considered complete:
- owner-reviewed copy present when required;
- UTF-8 positive checks pass and mojibake negative checks pass;
- price and ODO match owner-approved values;
- image count matches approved media count;
- semantic image order has been reviewed or produced by a visual classifier;
- hero image is intentional;
- all media URLs resolve using preserved path separators;
- preview is reviewed before first publish;
- regression/CI gates pass.

## 7. Production verification
After deployment:
- verify the canonical vehicle detail URL returns HTTP 200;
- verify `Content-Type: text/html; charset=utf-8`;
- verify Vietnamese text renders without mojibake;
- verify price and ODO display correctly;
- verify hero + full remaining gallery count;
- verify image order visually;
- verify API data and page data refer to the same canonical vehicle ID.

Do not declare FINAL GREEN until production evidence passes these checks.

## 8. Current reference case
The Lexus RX500h F SPORT PERFORMANCE listing `tg-527` established the regression requirements:
- preserve owner-reviewed multiline editorial copy;
- render 1 hero plus all remaining approved images;
- avoid encoded `%2F` media paths;
- do not republish for edits;
- target owner-approved ODO `12.000 km` and price `4,580 tỷ`;
- prioritize a suitable image containing a person/model, then order exterior front-to-rear and interior logically.

Future listings must follow the same rules without requiring per-listing code changes.
