-- Enable Realtime for app_settings table to support dynamic theme updates
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_settings'
  ) then
    alter publication supabase_realtime add table public.app_settings;
  end if;
exception
  when others then
    null; -- ignore error if publication does not exist in testing environments
end $$;
