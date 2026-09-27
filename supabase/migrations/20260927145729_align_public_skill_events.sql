-- Public analytics must follow the same visibility gate as the registry.
-- Owner/static publication is not AI review approval; no listing/review rows
-- are changed. Private listings and verified outcomes remain protected.
alter policy skill_events_insert_public_events on public.skill_events
  to anon, authenticated
  with check (
    event_type = any (array[
      'view', 'resolve_request', 'install_copy', 'install_start', 'save',
      'compare', 'outbound_github', 'outbound_docs', 'claim_start',
      'claim_submit', 'share_copy'
    ])
    and is_verified = false
    and (user_id is null or user_id = (select auth.uid()))
    and exists (
      select 1 from public.skills
      where skills.slug = skill_events.skill_slug
        and (skills.ai_review_approved = true
          or skills.listing_status in ('owner_published', 'static_checked'))
    )
  );
