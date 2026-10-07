-- Register only the two new author-preview identities. No votes, Skill review
-- decisions, ratings or installation evidence are inserted or changed.
insert into public.showcase_entries (slug)
values ('open-dating-web'), ('open-gamified-app')
on conflict (slug) do nothing;
