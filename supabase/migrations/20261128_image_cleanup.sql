-- Frees Cloudinary space automatically.
-- Every time a photo stops being used (listing photo removed or replaced, listing deleted,
-- avatar changed, account purged) its URL is queued in image_delete_queue. The edge function
-- `purge-images` empties the queue by deleting the files from Cloudinary.
-- Expired listings keep their photos for 5 days (so a seller can still renew), then they are
-- marked 'removed' and their photos are queued. Safe to run more than once.

create table if not exists public.image_delete_queue (
  id         bigserial primary key,
  image_url  text not null,
  queued_at  timestamptz not null default now(),
  attempts   integer not null default 0,
  last_error text
);
alter table public.image_delete_queue enable row level security;      -- no policies: server only
revoke all on public.image_delete_queue from public, anon, authenticated;
revoke all on sequence public.image_delete_queue_id_seq from public, anon, authenticated;
create index if not exists image_delete_queue_attempts_idx on public.image_delete_queue (attempts, id);

create or replace function public.queue_image_delete(p_url text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_url is not null and p_url like 'https://res.cloudinary.com/%' then
    insert into public.image_delete_queue (image_url) values (p_url);
  end if;
end $$;
revoke all on function public.queue_image_delete(text) from public, anon, authenticated;

create or replace function public.queue_listing_photo_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' or new.image_url is distinct from old.image_url then
    perform public.queue_image_delete(old.image_url);
  end if;
  return null;
end $$;
revoke all on function public.queue_listing_photo_delete() from public, anon, authenticated;

drop trigger if exists queue_photo_delete on public.listing_photos;
create trigger queue_photo_delete after delete on public.listing_photos
  for each row execute function public.queue_listing_photo_delete();
drop trigger if exists queue_photo_replace on public.listing_photos;
create trigger queue_photo_replace after update of image_url on public.listing_photos
  for each row execute function public.queue_listing_photo_delete();

create or replace function public.queue_avatar_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' or new.avatar_url is distinct from old.avatar_url then
    perform public.queue_image_delete(old.avatar_url);
  end if;
  return null;
end $$;
revoke all on function public.queue_avatar_delete() from public, anon, authenticated;

drop trigger if exists queue_avatar_delete on public.profiles;
create trigger queue_avatar_delete after delete on public.profiles
  for each row execute function public.queue_avatar_delete();
drop trigger if exists queue_avatar_replace on public.profiles;
create trigger queue_avatar_replace after update of avatar_url on public.profiles
  for each row execute function public.queue_avatar_delete();

-- Expired for more than 5 days: mark removed and free the photos.
create or replace function public.purge_expired_listing_photos()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_ids uuid[];
begin
  select array_agg(id) into v_ids
    from public.listings
   where status = 'expired'
     and expires_at is not null
     and expires_at < now() - interval '5 days';

  if v_ids is null then return 0; end if;

  delete from public.listing_photos where listing_id = any(v_ids);
  update public.listings set status = 'removed', updated_at = now() where id = any(v_ids);
  return array_length(v_ids, 1);
end $$;
revoke all on function public.purge_expired_listing_photos() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('campusflip_image_purge', '30 3 * * *', 'select public.purge_expired_listing_photos();');
  end if;
end $$;
