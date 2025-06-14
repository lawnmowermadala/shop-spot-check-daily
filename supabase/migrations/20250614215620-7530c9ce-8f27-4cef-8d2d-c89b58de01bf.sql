
-- Create a public storage bucket for checklist and assignment photos
insert into storage.buckets (id, name, public)
values ('area_photos', 'area_photos', true)
on conflict (id) do nothing;

-- Allow anyone to upload, update, read, and delete files in public bucket (full open bucket)
-- (For production, you might want to limit deletes, but this is a common pattern for shared app assets)

-- Policy for reading objects
create policy "Public read access to area_photos bucket"
  on storage.objects for select
  using (bucket_id = 'area_photos');

-- Policy for uploading objects
create policy "Public upload access to area_photos bucket"
  on storage.objects for insert
  with check (bucket_id = 'area_photos');

-- Policy for updating objects
create policy "Public update access to area_photos bucket"
  on storage.objects for update
  using (bucket_id = 'area_photos');

-- Policy for deleting objects
create policy "Public delete access to area_photos bucket"
  on storage.objects for delete
  using (bucket_id = 'area_photos');
