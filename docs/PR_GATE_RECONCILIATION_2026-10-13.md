# PR Gate Reconciliation — Phan Thuần Xtra

**Snapshot:** 2026-10-13 (UTC+7). Repository: `PHAN-THUAN-XTRA/phanthuanxtra-v9`. Audited `main`: `759ff223b0fa1f4fefb2d7ea7b6de92d20cc6a45`. One canonical [MASTER](../MASTER_PROJECT_STATUS.md) is the primary project status; this file is a scoped **acceptance checklist**, not a second MASTER.

## Confirmed baseline

- No PR open at audit time. Two acceptance issues remain: [#807](https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/issues/807) (AI quota, S21, email placement, Content Runner) and [#828](https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/issues/828) (hidden-car S21).
- Production code merges [#845](https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/pull/845), [#846](https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/pull/846), [#847](https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/pull/847), [#848](https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/pull/848) completed. Latest [Cloudflare deploy 38377605823](https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/38377605823), [Smoke Gate-15 38377770633](https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/38377770633), [Stage 3 Reconciliation 38377770630](https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/38377770630), [Forms + CRM E2E 38377770587](https://github.com/PHAN-THUAN-XTRA/phanthuanxtra-v9/actions/runs/38377770587) succeeded on the exact merge SHA.
- **P0 durable leads:** public form is fail-closed on D1 errors. Lead/email E2E correlated one D1 record → Telegram → Brevo provider message ID → actual Gmail. Email receipt is not proof of the Gmail Primary tab.
- **P1 /chat transport:** the owner received an actual final `AI_QUOTA_EXHAUSTED` message from the Auto Bot after PR #848. This proves the response/diagnostic path, not that generation is currently available. A previous job in `TELEGRAM_SEND_UNCERTAIN` must not be blindly re-sent.

## Remaining acceptance checklist

| Priority | Gate | Current evidence | Exit criterion / owner action |
| --- | --- | --- | --- |
| P1 | Workers AI substantive consultation | Live Telegram diagnostic `AI_QUOTA_EXHAUSTED`; final send works | When quota is independently available, send **one** new `/chat` question and retain actual non-fabricated answer; do not pay to force this |
| P1 | Samsung S21 Ultra | API/UI CI PASS, but no physical screenshots | On the real S21: login, `/customerapp`, mobile layout, image loading, Telegram. Record screenshots without customer data; no Wrangler |
| P1 | Hidden car state (#828) | tg-756 hidden with 29 preserved images; tg-527 hidden with 24 | Real S21 public catalog excludes both; saved `/car.html?id=tg-756` and `...tg-527` must not expose vehicle content. Don't unhide or reupload |
| P1 | Email placement | Gmail examples arrived Inbox/Updates/Promotions, one earlier matching alert in Spam; earlier SPF/DKIM/DMARC PASS | Monitor a representative set of real notifications and sender reputation; validate authentication, alignment and actual folder, without guaranteed Primary or fresh test spam |
| P2 | Content Runner live | Source contract bounded, current `CONTENT_RUNNER_LIVE_ENABLED=0`; offline test fixtures exist | Offline CI proof first; separately confirm quota/billing ceiling, role scopes and owner approval for any single live trial; do not enable automatically |
| Separate P0 | Lyly WebSocket / biometric auth | PC-specific evidence incomplete; not a website PR | Private owner-side read-only probe, staged fail-closed authentication and S21 acceptance before remote-control capability; never upload biometrics/secrets into GitHub |

## Automatic safe gates in this PR

1. **PR CI:** run the existing `scripts/simulate-content-runner.mjs` with fixture AI only; enforce `real_ai_calls=0`, one private draft, idempotent replay and no public publishing; fail if `wrangler.json` enables live or limits/approval contract drift.
2. **Production Gate-15, on next normal runtime deploy:** read-only fetch the D1-backed public catalog and exact vehicle API details; assert tg-756/tg-527 absent and hidden details HTTP 404. No mutation, private Admin lookup, API token or camera inference.
3. **Documentation checkpoint:** this report and the canonical MASTER note only state **already observed** production facts. PR check results and the new production step must be recorded with actual run IDs after execution. This docs/workflow PR must not imply a new Cloudflare deploy has occurred.

**Safety constraints:** Never touch the 29/24 retained car images, expose private credentials or customer records, change DNS based only on Spam placement, increase AI quotas/cost, or claim S21 acceptance from CI. Do not mark #807 or #828 closed without the missing owner evidence.
