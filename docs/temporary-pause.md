# Temporary low-cost pause

Deploy `wrangler.paused.jsonc` to stop the application while retaining data. It
uses the existing Worker and domain mappings. The normal production config and
application are retained in `wrangler.active.jsonc` so they can be explicitly
restored. The default production config also points to the paused entry and
has no cron triggers: an automatic build cannot reactivate the application.

The English and Chinese notice pages are static assets: they do not invoke the
Worker. Other URLs, including API, checkout, auth and webhook requests, return
503 with Retry-After 3600, without loading Next or accessing D1, R2, AI or email.
No noindex directive or blanket robots disallow is introduced. Long pauses can
still reduce search visibility; this is a service pause, not full availability.

The existing SQLite queue namespace is retained. Outstanding queue alarms are
cleared once and do not revalidate or schedule additional work. Cron triggers
are empty and the scheduled handler also ignores any late deliveries.

Before pausing, privately save Worker settings/deployment, cron rules and build
settings. Disable the repository's Gallery sync, External media health and
Import Skill Issue workflows. Automatic Builds can be separately disabled when
dashboard access is available; the production configuration must remain paused
regardless of that account setting. Do not delete databases, media,
packages, backups or production secrets. Existing fees are not reversed.

Validate with `node scripts/test-pause.mjs`, the regression suite, typecheck and
the production build. Package the pause with:

```sh
pnpm exec wrangler deploy --config wrangler.paused.jsonc --dry-run
pnpm exec wrangler deploy --config wrangler.paused.jsonc
```

After deployment, verify both domains, static notices, 503 APIs, empty schedules,
preserved secrets/databases/buckets, and low CPU plus no app R2/D1 operations.
Storage and the account's subscription can still cost money. Other Workers in
the account continue to run and are outside this pause.

To resume, restore any temporary cache lifecycle changes, build the normal
application with `pnpm cf:build` and deploy `wrangler.active.jsonc`. To resume
normal automatic deployments, also explicitly restore the saved active config
as `wrangler.production.jsonc` and commit that change. Verify
the restored production application before re-enabling its automatic builds
and the three paused workflows. This deploy restores the normal bindings and
twenty cron expressions; make sure starting ingestion is intended. If rolling
back to a saved Worker version instead, also restore its non-versioned schedules.
