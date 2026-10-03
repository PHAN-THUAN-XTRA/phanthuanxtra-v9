# Content Draft / Scheduling runner

Runner `content-runner/1.0.0` prepares a private draft and a revision-bound schedule proposal. Public publishing requires a separate owner workflow. There is no runner approve/publish endpoint, cron trigger, or editorial pending-job insertion.

## Virtual execution

Use Node 24 and run `npm run simulate:content`. This executes the actual runner, atomic APIs, SQLite migrations and client with a fake AI binding and a virtual retry clock. It makes no network calls and writes no production data. The simulator loses a checkpoint response deliberately, reconciles it, resumes to completion and replays the same request. Assertions require one private draft, one proposal, one simulated inference and zero pending publication jobs. The output includes the temporary fixture article. Real model quality/quota and physical-device acceptance are separate evidence.

## Delegated execution

Owner issues distinct agent-11 and agent-19 credentials for the same pipeline using `/api/admin/agents/content-prep/credentials`. The driver receives these scoped tokens only. It cannot issue tokens or call owner publish APIs. Tokens expire within one hour; expiry requires owner renewal for the same pipeline and resuming the same request_id. Credentials never enter the run ledger, model prompt, audit or client logs.

Brief JSON accepts exactly `request_id`, `source`, optional `instruction`, and `schedule`. Source is bounded to 12,000 characters, instruction to 2,000. Schedule uses `YYYY-MM-DD HH:mm` in Asia/Ho_Chi_Minh and must be future when the run starts. Unknown fields, credential/model/budget/status/publish overrides and unsafe model output fields are rejected. Generated copy still requires owner factual review.

`CONTENT_RUNNER_LIVE_ENABLED=0` is explicit in production configuration. Preview remains available through `POST /api/agents/content/v1/runs/preview`; it returns a deterministic source-only preview and creates no model call, run, post or proposal. Fleet kill switch disables both modes. Live preparation is a separate opt-in configuration change after quota/owner readiness; this delivery does not enable it.

The CLI reads raw scoped token values from `CONTENT_WRITER_CREDENTIAL` and `CONTENT_SCHEDULER_CREDENTIAL` environment variables:

```sh
node scripts/run-content-brief.mjs brief.json --preview
```

After a separately reviewed live configuration change, omit `--preview` to execute preparation. It sends credentials only to the canonical HTTPS origin, refuses redirects and advances one durable stage per request. `POST /api/agents/content/v1/runs` carries writer Bearer auth plus `X-Content-Scheduler-Credential: Bearer ...`. GET `/runs/{request_id}` reconciles current result. The same brief/request_id resumes or returns the existing result; changed reuse returns 409. Renewed tokens must have the same action/pipeline scopes. The client stops on stale artifacts, blocked runs, disabled live mode or credential expiry and preserves the request_id for reconciliation.

## Checkpoint and cost contract

Migration 0032 records stages generate → draft → schedule → done. A primary D1 session, compare-and-set lease and fencing token prevent concurrent checkpoint replacement. The generation JSON is saved before draft creation; subsequent retries reuse it. Draft and proposal subrequest IDs derive from the run key and use the existing atomic artifact ledger. Response loss can replay safely. Owner edits/deletion, elapsed schedules and publication invalidate the proposal; completion reconciliation re-reads current artifact state and never resurrects deleted posts.

Hard ceilings: three stage attempts, three reserved model calls per run, twelve reserved calls per UTC day globally, 1,200 output tokens per call, 25-second inference wait and a two-minute lease. Calls are reserved transactionally before inference; timeout/unknown provider outcomes consume the reservation. The generator uses one existing primary model and no automatic fallback chain. Quota/unavailability gets bounded exponential retry; invalid output, stale artifact, budget exhaustion or exhausted attempts blocks the run. Daily exhaustion requires review and a new request on a later day; it is not silently reset. A generation result lost before its checkpoint may require another bounded inference; exactly-once external inference is not claimed.

Checkpoint/audit writes commit together. No delegated credentials are persisted. Partial results remain private. Completed results contain `publicPublish:false`, `autoPublish:false`, and `requires_owner_approval:true`.
