-- Restore X/indexer automation after INDEXER_SECRET was rotated in only one RPC.
-- Keep the digest in one function and rewrite every legacy guarded RPC to call it.

create or replace function public.assert_indexer_secret(p_server_secret text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expected_secret_hash constant text := '54fc1b0e14aa657fd820a882974e4fc64ae055448646a1f073b6a98e5366f43e';
begin
  if p_server_secret is null
    or encode(extensions.digest(p_server_secret, 'sha256'), 'hex') <> v_expected_secret_hash
  then
    raise exception 'Invalid server secret' using errcode = '28000';
  end if;
end;
$$;

revoke all on function public.assert_indexer_secret(text) from public, anon, authenticated;

do $migration$
declare
  v_function record;
  v_definition text;
  v_rewritten text;
  v_rewritten_count integer := 0;
begin
  for v_function in
    select p.oid, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'list_indexer_runs',
        'record_indexer_run',
        'submit_reviewed_skill',
        'update_skill_github_metadata',
        'upsert_indexed_skill'
      )
      and p.prosrc ~ 'v_expected_secret_hash constant text'
    order by p.proname
  loop
    v_definition := pg_get_functiondef(v_function.oid);
    v_rewritten := regexp_replace(
      v_definition,
      E'\\n[[:space:]]*v_expected_secret_hash constant text := ''[0-9a-f]{64}'';',
      '',
      'n'
    );
    v_rewritten := regexp_replace(
      v_rewritten,
      E'  if p_server_secret is null\\n    or encode\\(extensions\\.digest\\(p_server_secret, ''sha256''\\), ''hex''\\) <> v_expected_secret_hash\\n  then\\n    raise exception ''Invalid server secret'' using errcode = ''28000'';\\n  end if;',
      E'  perform public.assert_indexer_secret(p_server_secret);',
      'n'
    );

    if v_rewritten = v_definition
      or v_rewritten ~ 'v_expected_secret_hash constant text'
      or position('encode(extensions.digest(p_server_secret' in v_rewritten) > 0
    then
      raise exception 'Could not centralize secret validation for %', v_function.proname;
    end if;

    execute v_rewritten;
    v_rewritten_count := v_rewritten_count + 1;
  end loop;

  if v_rewritten_count <> 5 then
    raise exception 'Expected to centralize 5 automation RPCs, updated %', v_rewritten_count;
  end if;
end;
$migration$;

comment on function public.assert_indexer_secret(text) is
  'Single validation gate for INDEXER_SECRET-protected automation RPCs.';
