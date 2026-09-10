-- Gallery identity only: no fabricated engagement, review or installation data.
insert into public.showcase_entries (slug)
values ('gc-minimal-zine-posters')
on conflict (slug) do nothing;
