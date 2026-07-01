-- Track the billing period we last granted credits for, so a mid-cycle plan
-- switch (which fires subscription.renewed) doesn't refill to the full grant.
alter table public.profiles add column if not exists credit_period text;
