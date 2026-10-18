-- One-time full-library access reuses audited orders and signed Stripe events.
-- Existing prices, orders, subscription records and RLS policies are unchanged.
alter table public.commerce_orders drop constraint commerce_orders_plan_check;
alter table public.commerce_orders add constraint commerce_orders_plan_check
  check (plan in ('single', 'monthly', 'yearly', 'lifetime'));

create or replace function public.commerce_reserve_order(p_user uuid, p_live boolean, p_plan text, p_slug text, p_release uuid, p_amount integer, p_customer text, p_locale text, p_name text, p_price text)
returns public.commerce_orders language plpgsql security invoker set search_path = '' as $$
declare found_order public.commerce_orders;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text || p_live::text || coalesce(p_slug, 'membership'), 0));
  -- Guard the race between the API's entitlement check and reservation. All
  -- membership plans use the same lock, including lifetime. Never charge twice.
  if p_slug is null then
    select * into found_order from public.commerce_orders
      where user_id = p_user and livemode = p_live and plan = 'lifetime' and status = 'paid'
      order by created_at desc limit 1;
    if found_order.id is not null then return found_order; end if;
  end if;
  select * into found_order from public.commerce_orders
    where user_id = p_user and livemode = p_live and status = 'pending'
      and skill_slug is not distinct from p_slug and created_at > now() - interval '24 hours 5 minutes'
    order by created_at desc limit 1;
  if found_order.id is not null then return found_order; end if;
  insert into public.commerce_orders(user_id, livemode, plan, skill_slug, release_id, amount_cents, currency, stripe_customer_id, checkout_locale, product_name, stripe_price_id)
    values(p_user, p_live, p_plan, p_slug, p_release, p_amount, 'usd', p_customer, p_locale, p_name, p_price) returning * into found_order;
  return found_order;
end $$;
revoke all on function public.commerce_reserve_order(uuid,boolean,text,text,uuid,integer,text,text,text,text) from public, anon, authenticated;
grant execute on function public.commerce_reserve_order(uuid,boolean,text,text,uuid,integer,text,text,text,text) to service_role;
