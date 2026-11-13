# OG image recovery

Apply the additive `0007_project_image_operations` migration through the existing
approved migration workflow before deploying this feature. No database push or
production migration is performed by implementation work.

Set a separate random `CRON_SECRET` in each Vercel environment. The daily
`/api/cron/og-images` job runs at `03:00 UTC` (the provider may delay its start).
It requires `Authorization: Bearer <CRON_SECRET>`, never an admin session. Do not
put this secret in URLs or logs. Vercel schedules production invocations; Preview
recovery can be invoked with its own secret and isolated database/store.

Uploads receive immutable UUID-derived paths and durable intent records before
storage is contacted. Project persistence and operation state commit together.
A lost database response never authorizes deleting a candidate. The worker fences
pending operations after 24 hours, then deletes only unreferenced, owned blobs.
Cleanup intent also commits alongside project deletion or reference removal.
Old managed image paths remain valid; historical orphans are not enumerated.

The worker processes at most 100 records or 45 seconds per invocation. Leases
expire after 60 seconds, missing objects count as successful cleanup, and failed
tasks retry daily without a cutoff. Records are retained, including completed
outcomes. The `retry_count` column counts claimed cleanup attempts, including
successful attempts; it also advances when an attempt times out before failure
metadata can be saved. Monitor `project_image.reconciliation` summaries and
`repeated-cleanup-failure` events after seven failures. A reference shown to the
administrator identifies its operation record when an operation exists. Inspect
recovery rows through trusted database tooling; do not copy URLs into logs.
Never manually reattach a retired image URL: refresh creates a new immutable URL.

Validate rollout by observing an authenticated cron invocation and a subsequent
daily execution against the intended store. A failed invocation keeps tasks for
retry. Do not mark operational acceptance complete without that evidence.
