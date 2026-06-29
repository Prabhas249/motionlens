-- Editable profile fields for the settings/account screens.
-- credits + plan stay protected (only the SECURITY DEFINER fns can touch them);
-- users may edit display_name + their settings blob via update_profile().

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url   text;
alter table public.profiles add column if not exists settings     jsonb not null default '{}'::jsonb;

create or replace function public.update_profile(p_display_name text, p_settings jsonb)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
     set display_name = coalesce(p_display_name, display_name),
         settings     = coalesce(p_settings, settings)
   where id = auth.uid();
end;
$$;

grant execute on function public.update_profile(text, jsonb) to authenticated;
