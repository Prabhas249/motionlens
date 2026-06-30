-- Mode-weighted credits: Standard = 1, Annotated = 2, Precision = 3.
-- consume/refund now take an amount so an analysis spends credits by mode.
-- This keeps cost-per-credit flat across modes → margins stay ≥50% in any mix.

drop function if exists public.consume_credit();
create or replace function public.consume_credit(p_amount integer default 1)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare remaining integer;
begin
  update public.profiles
     set credits = credits - p_amount
   where id = auth.uid() and credits >= p_amount
   returning credits into remaining;
  return remaining;  -- NULL when the user doesn't have enough credits
end;
$$;
grant execute on function public.consume_credit(integer) to authenticated;

drop function if exists public.refund_credit();
create or replace function public.refund_credit(p_amount integer default 1)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare remaining integer;
begin
  update public.profiles
     set credits = credits + p_amount
   where id = auth.uid()
   returning credits into remaining;
  return remaining;
end;
$$;
grant execute on function public.refund_credit(integer) to authenticated;
