/*
# Create 'task-proofs' public storage bucket

## Overview
Creates a public Supabase Storage bucket named 'task-proofs' for workers to upload screenshot proof images. Sets up storage policies so only authenticated users can upload, and anyone (including anon) can read — since proof images need to be viewable by both the worker and the employer.

## Storage Object
- Bucket: `task-proofs` (public = true)
- Allowed MIME types: image/jpeg, image/png, image/webp, image/gif
- Max file size: 10 MB (enforced client-side)

## Storage Policies
1. SELECT (read) — public: anyone can view uploaded proof images (public bucket).
2. INSERT (upload) — authenticated users only, files must be in their own folder path `user_id/...`.
3. UPDATE — owner only (same path ownership).
4. DELETE — owner only (same path ownership).
*/

insert into storage.buckets (id, name, public)
values ('task-proofs', 'task-proofs', true)
on conflict (id) do nothing;

-- SELECT: public read access (bucket is public, but policy still needed for RLS)
drop policy if exists "Public can read task-proofs" on storage.objects;
create policy "Public can read task-proofs"
  on storage.objects for select
  using (bucket_id = 'task-proofs');

-- INSERT: authenticated users can upload to their own folder
drop policy if exists "Authenticated upload task-proofs" on storage.objects;
create policy "Authenticated upload task-proofs"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'task-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

-- UPDATE: owner can update their own files
drop policy if exists "Owner update task-proofs" on storage.objects;
create policy "Owner update task-proofs"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'task-proofs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'task-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

-- DELETE: owner can delete their own files
drop policy if exists "Owner delete task-proofs" on storage.objects;
create policy "Owner delete task-proofs"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'task-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
