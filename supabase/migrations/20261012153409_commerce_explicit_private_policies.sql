-- Explicit deny policies document these server-only tables. service_role keeps
-- its normal RLS bypass; browser roles have neither grants nor usable policies.
create policy commerce_releases_no_client_access on public.commerce_releases for all to anon, authenticated using (false) with check (false);
create policy commerce_customers_no_client_access on public.commerce_customers for all to anon, authenticated using (false) with check (false);
create policy commerce_webhook_events_no_client_access on public.commerce_webhook_events for all to anon, authenticated using (false) with check (false);
