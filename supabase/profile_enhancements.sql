-- Profile enhancements: bio field + avatar storage
-- Run in Supabase SQL Editor

-- Add bio column to profiles
alter table profiles
  add column if not exists bio text check (char_length(bio) <= 120);

-- Ensure avatar_url column exists (may already exist)
alter table profiles
  add column if not exists avatar_url text;

-- ─────────────────────────────────────────────
-- Storage: avatars bucket
-- Run this in Supabase Dashboard > Storage > New bucket
-- OR via the SQL below (requires storage schema access)
-- ─────────────────────────────────────────────

-- Create the avatars bucket (public so profile pics are viewable by anyone)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5MB limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880;

-- RLS: authenticated users can upload their own avatar
create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: anyone can view avatars (public bucket)
create policy "Avatars are publicly viewable"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- RLS: users can update/replace their own avatar
create policy "Users can update their own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid());

-- RLS: users can delete their own avatar
create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid());
