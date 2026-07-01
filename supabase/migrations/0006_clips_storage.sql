-- Private bucket for uploaded clips (client uploads direct → bypasses Vercel's
-- 4.5MB function-body limit). 200MB cap. RLS: users only touch their own folder.
insert into storage.buckets (id, name, public, file_size_limit)
values ('clips', 'clips', false, 209715200)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "clips_insert_own" on storage.objects;
create policy "clips_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'clips' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "clips_select_own" on storage.objects;
create policy "clips_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'clips' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "clips_delete_own" on storage.objects;
create policy "clips_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'clips' and (storage.foldername(name))[1] = auth.uid()::text);
