-- The common count and arbitrary quality-page jumps can use a small ordered
-- index without evaluating the scope classifier again for every scanned row.
set lock_timeout = '2s';
set statement_timeout = '20s';
create index skills_public_directory_quality_slug_idx
  on public.skills (quality_score desc nulls last, slug asc)
  where (ai_review_approved = true or listing_status in ('owner_published', 'static_checked'))
    and public.is_directory_skill(name, github_repo, category, tags, frameworks);
