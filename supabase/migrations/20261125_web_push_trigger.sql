-- Sends a push whenever a notification row is created.
-- Run this AFTER deploying the send-push edge function.
-- Replace REPLACE_WITH_SECRET with the same value you set as the PUSH_WEBHOOK_SECRET secret.
-- Uses pg_net (built into Supabase), so Database Webhooks do not need to be enabled.

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_push()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url := 'https://pfomxbhofdoorqfdekfd.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', 'joelkaudzu2026.k'),
    body := jsonb_build_object('record', to_jsonb(new)),
    timeout_milliseconds := 3000
  );
  return new;
exception when others then
  -- A push problem must never stop the notification itself from being saved.
  return new;
end $$;

revoke all on function public.notify_push() from public, anon, authenticated;

drop trigger if exists send_push_on_notification on public.notifications;
create trigger send_push_on_notification
  after insert on public.notifications
  for each row execute function public.notify_push();