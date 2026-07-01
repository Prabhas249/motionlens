-- Persist generated code per framework so reopening an analysis doesn't regenerate it.
alter table public.analyses add column if not exists code jsonb not null default '{}'::jsonb;

create or replace function public.save_analysis_code(p_id uuid, p_framework text, p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.analyses
     set code = coalesce(code, '{}'::jsonb) || jsonb_build_object(p_framework, p_code)
   where id = p_id and user_id = auth.uid();
end;
$$;
grant execute on function public.save_analysis_code(uuid, text, text) to authenticated;
