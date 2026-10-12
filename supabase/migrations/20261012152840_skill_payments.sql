-- Application commerce is independent of community submission/review state.
create table public.commerce_releases (
  id uuid primary key default gen_random_uuid(),
  skill_slug text not null check (skill_slug ~ '^[a-z0-9][a-z0-9-]{0,199}$'),
  version text not null check (version ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,49}$'),
  object_path text not null unique,
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  size_bytes bigint not null check (size_bytes > 0),
  released_at timestamptz not null default now(),
  withdrawn boolean not null default false,
  unique(skill_slug, version),
  check (object_path = skill_slug || '/' || version || '/' || sha256 || '.zip')
);
create index commerce_releases_latest on public.commerce_releases (skill_slug, released_at desc) where not withdrawn;

create table public.commerce_customers (
  user_id uuid not null references auth.users(id) on delete cascade,
  livemode boolean not null,
  stripe_customer_id text not null unique,
  primary key(user_id, livemode)
);

create table public.commerce_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  skill_slug text,
  plan text not null check (plan in ('single','monthly','yearly')),
  livemode boolean not null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null check (currency = 'usd'),
  checkout_locale text not null default 'en',
  product_name text not null,
  stripe_price_id text,
  status text not null default 'pending' check (status in ('pending','paid','expired','failed','refunded','disputed')),
  release_id uuid references public.commerce_releases(id) on delete restrict,
  stripe_session_id text unique,
  stripe_payment_intent_id text unique,
  stripe_subscription_id text unique,
  stripe_customer_id text not null,
  paid_at timestamptz,
  updates_until timestamptz,
  created_at timestamptz not null default now(),
  check ((plan = 'single' and skill_slug is not null and release_id is not null) or (plan <> 'single' and skill_slug is null and release_id is null))
);
create index commerce_orders_owner on public.commerce_orders(user_id, livemode, created_at desc);
create index commerce_orders_pending on public.commerce_orders(user_id, livemode, created_at desc) where status = 'pending';
create index commerce_orders_release on public.commerce_orders(release_id);

create table public.commerce_subscriptions (
  stripe_subscription_id text primary key,
  user_id uuid not null references auth.users(id) on delete restrict,
  livemode boolean not null,
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);
create index commerce_subscriptions_owner on public.commerce_subscriptions(user_id, livemode);

create table public.commerce_webhook_events (
  id text primary key,
  livemode boolean not null,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.commerce_releases enable row level security;
alter table public.commerce_customers enable row level security;
alter table public.commerce_orders enable row level security;
alter table public.commerce_subscriptions enable row level security;
alter table public.commerce_webhook_events enable row level security;
revoke all on public.commerce_releases, public.commerce_customers, public.commerce_orders, public.commerce_subscriptions, public.commerce_webhook_events from anon, authenticated;
grant select on public.commerce_orders, public.commerce_subscriptions to authenticated;
grant all on public.commerce_releases, public.commerce_customers, public.commerce_orders, public.commerce_subscriptions, public.commerce_webhook_events to service_role;
create policy commerce_orders_owner_read on public.commerce_orders for select to authenticated
  using ((select auth.uid()) = user_id and coalesce((select auth.jwt())->>'is_anonymous','false') <> 'true');
create policy commerce_subscriptions_owner_read on public.commerce_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id and coalesce((select auth.jwt())->>'is_anonymous','false') <> 'true');

-- One pending session per single Skill or membership. Repeated clicks reuse the
-- same order and Stripe idempotency key; monthly/yearly share the same lock.
create function public.commerce_reserve_order(p_user uuid, p_live boolean, p_plan text, p_slug text, p_release uuid, p_amount integer, p_customer text, p_locale text, p_name text, p_price text)
returns public.commerce_orders language plpgsql security invoker set search_path = '' as $$
declare found_order public.commerce_orders;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text || p_live::text || coalesce(p_slug, 'membership'), 0));
  select * into found_order from public.commerce_orders
    where user_id = p_user and livemode = p_live and status = 'pending'
      and skill_slug is not distinct from p_slug and created_at > now() - interval '24 hours 5 minutes'
    order by created_at desc limit 1;
  if found_order.id is not null then return found_order; end if;
  insert into public.commerce_orders(user_id, livemode, plan, skill_slug, release_id, amount_cents, currency, stripe_customer_id, checkout_locale, product_name, stripe_price_id)
    values(p_user, p_live, p_plan, p_slug, p_release, p_amount, 'usd', p_customer, p_locale, p_name, p_price) returning * into found_order;
  return found_order;
end $$;

-- The webhook is the only caller. The API checks the signed event, current
-- Stripe payment, order binding and amount before this atomic transition.
create function public.commerce_complete_order(p_order uuid, p_session text, p_intent text, p_subscription text, p_paid_at timestamptz)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  update public.commerce_orders set status = 'paid', stripe_session_id = p_session,
    stripe_payment_intent_id = p_intent, stripe_subscription_id = p_subscription,
    paid_at = coalesce(paid_at, p_paid_at),
    updates_until = case when plan = 'single' then coalesce(updates_until, p_paid_at + interval '12 months') else null end
    where id = p_order and status in ('pending','expired','failed','paid')
      and (stripe_session_id is null or stripe_session_id = p_session);
end $$;
revoke all on function public.commerce_reserve_order(uuid,boolean,text,text,uuid,integer,text,text,text,text) from public, anon, authenticated;
revoke all on function public.commerce_complete_order(uuid,text,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.commerce_reserve_order(uuid,boolean,text,text,uuid,integer,text,text,text,text) to service_role;
grant execute on function public.commerce_complete_order(uuid,text,text,text,timestamptz) to service_role;

-- No public/anon/authenticated object policy: only our server can issue a
-- short-lived URL after checking ownership and current payment state.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('skill-packages', 'skill-packages', false, 104857600, array['application/zip'])
on conflict (id) do nothing;
