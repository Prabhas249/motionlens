-- Persist the storyboard so reopening a saved analysis shows it (frames JSON in R2).
alter table public.analyses add column if not exists frames_key text;
