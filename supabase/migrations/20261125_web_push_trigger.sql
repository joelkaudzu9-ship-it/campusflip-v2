-- Sends a push whenever a notification row is created.
-- Run this AFTER deploying the send-push edge function.
-- Replace REPLACE_WITH_SECRET below with the same value you set as the PUSH_WEBHOOK_SECRET secret.
-- (Supabase hosted projects only: this uses the same helper the dashboard's "Database Webhooks" uses.)

drop trigger if exists send_push_on_notification on public.notifications;
create trigger send_push_on_notification
  after insert on public.notifications
  for each row execute function supabase_functions.http_request(
    'https://pfomxbhofdoorqfdekfd.supabase.co/functions/v1/send-push',
    'POST',
    '{"Content-Type":"application/json","x-webhook-secret":"REPLACE_WITH_SECRET"}',
    '{}',
    '3000'
  );
