-- MotionLens — free-run credits
-- Every new user starts with 5 free runs. Credits can only change via the
-- SECURITY DEFINER functions below, so users can't grant themselves more.

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  credits    integer not null default 5,
  plan       text    not null default 'free',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A user can read ONLY their own profile (to show "runs left").
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- Give every new signup a profile with 5 credits.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, credits, plan)
  values (new.id, new.email, 5, 'free')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Atomically spend one run. Returns remaining credits, or NULL if none left.
create or replace function public.consume_credit()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare remaining integer;
begin
  update public.profiles
     set credits = credits - 1
   where id = auth.uid() and credits > 0
   returning credits into remaining;
  return remaining;  -- NULL when the user had 0 credits
end;
$$;

-- Refund one run (used when the engine errors after we charged).
create or replace function public.refund_credit()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare remaining integer;
begin
  update public.profiles
     set credits = credits + 1
   where id = auth.uid()
   returning credits into remaining;
  return remaining;
end;
$$;

grant execute on function public.consume_credit() to authenticated;
grant execute on function public.refund_credit()  to authenticated;

-- Backfill: existing users get a profile with 5 credits too.
insert into public.profiles (id, email, credits, plan)
select id, email, 5, 'free' from auth.users
on conflict (id) do nothing;
