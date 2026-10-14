-- Add one owner-curated identity for the existing vote/save API.
-- This neither publishes a registry SkillRecord nor changes any review status.
set local lock_timeout = '3s';
set local statement_timeout = '30s';
alter table public.provider_skill_catalog drop constraint provider_skill_catalog_provider_check;
alter table public.provider_skill_catalog add constraint provider_skill_catalog_provider_check
  check (provider in ('skillry', 'redskill', 'scenario'));
insert into public.provider_skill_catalog (slug, provider, source_url)
values ('scenario-auto-edit', 'scenario', 'https://www.scenario.com/explorations/auto-edit/')
on conflict (slug) do nothing;
