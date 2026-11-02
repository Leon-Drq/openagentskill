-- Private application binding only: D1 has no PostgreSQL RLS or auth service.
-- Identity IDs preserve ownership/FKs; presence here NEVER authorizes login.
-- The auth adapter and server-side authorization must be ready before cutover.
CREATE TABLE account_identities (
  id TEXT PRIMARY KEY NOT NULL
    CHECK (length(id) = 36 AND id NOT GLOB '*[^a-f0-9-]*')
) STRICT;

CREATE TABLE commerce_releases (
  id TEXT PRIMARY KEY NOT NULL,
  skill_slug TEXT NOT NULL CHECK (length(skill_slug) BETWEEN 1 AND 200
    AND substr(skill_slug,1,1) GLOB '[a-z0-9]' AND skill_slug NOT GLOB '*[^a-z0-9-]*'),
  version TEXT NOT NULL CHECK (length(version) BETWEEN 1 AND 50
    AND substr(version,1,1) GLOB '[a-zA-Z0-9]' AND version NOT GLOB '*[^a-zA-Z0-9._-]*'),
  object_path TEXT NOT NULL UNIQUE,
  sha256 TEXT NOT NULL CHECK (length(sha256) = 64 AND sha256 NOT GLOB '*[^a-f0-9]*'),
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  released_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  withdrawn INTEGER NOT NULL DEFAULT 0 CHECK (withdrawn IN (0,1)),
  delivery_kind TEXT NOT NULL DEFAULT 'package' CHECK (delivery_kind IN ('package','prompt','skill-instructions')),
  UNIQUE (skill_slug,version),
  CHECK (object_path = skill_slug || '/' || version || '/' || sha256 ||
    CASE WHEN delivery_kind = 'package' THEN '.zip' ELSE '.txt' END),
  CHECK (delivery_kind = 'package' OR size_bytes <= 1048576)
) STRICT;
CREATE INDEX commerce_releases_latest ON commerce_releases(skill_slug,released_at DESC) WHERE withdrawn = 0;

CREATE TABLE commerce_customers (
  user_id TEXT NOT NULL REFERENCES account_identities(id) ON DELETE CASCADE,
  livemode INTEGER NOT NULL CHECK (livemode IN (0,1)),
  stripe_customer_id TEXT NOT NULL UNIQUE,
  PRIMARY KEY(user_id,livemode)
) STRICT;

CREATE TABLE commerce_orders (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES account_identities(id) ON DELETE RESTRICT,
  skill_slug TEXT,
  plan TEXT NOT NULL CHECK (plan IN ('single','monthly','yearly','lifetime')),
  livemode INTEGER NOT NULL CHECK (livemode IN (0,1)),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL CHECK (currency = 'usd'),
  checkout_locale TEXT NOT NULL DEFAULT 'en',
  product_name TEXT NOT NULL,
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','expired','failed','refunded','disputed')),
  release_id TEXT REFERENCES commerce_releases(id) ON DELETE RESTRICT,
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  paid_at TEXT,
  updates_until TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK ((plan = 'single' AND skill_slug IS NOT NULL AND release_id IS NOT NULL)
    OR (plan <> 'single' AND skill_slug IS NULL AND release_id IS NULL))
) STRICT;
CREATE INDEX commerce_orders_owner ON commerce_orders(user_id,livemode,created_at DESC);
CREATE INDEX commerce_orders_pending ON commerce_orders(user_id,livemode,skill_slug,created_at DESC) WHERE status = 'pending';
CREATE INDEX commerce_orders_release ON commerce_orders(release_id);

CREATE TABLE commerce_subscriptions (
  stripe_subscription_id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES account_identities(id) ON DELETE RESTRICT,
  livemode INTEGER NOT NULL CHECK (livemode IN (0,1)),
  status TEXT NOT NULL,
  current_period_end TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0 CHECK (cancel_at_period_end IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;
CREATE INDEX commerce_subscriptions_owner ON commerce_subscriptions(user_id,livemode);

CREATE TABLE commerce_webhook_events (
  id TEXT PRIMARY KEY NOT NULL,
  livemode INTEGER NOT NULL CHECK (livemode IN (0,1)),
  event_type TEXT NOT NULL,
  processed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
) STRICT;
