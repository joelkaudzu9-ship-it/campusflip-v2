-- Runs the purge-images edge function every 10 minutes.
-- Run this AFTER deploying the purge-images function and setting its secrets.
-- Replace REPLACE_WITH_SECRET with the same value you set as the IMAGE_CLEANUP_SECRET secret.
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid) from cron.job where jobname = 'campusflip_image_queue';
select cron.schedule(
  'campusflip_image_queue',
  '*/10 * * * *',
  $job$select net.http_post(
    url := 'https://pfomxbhofdoorqfdekfd.supabase.co/functions/v1/purge-images',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', 'REPLACE_WITH_SECRET'),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );$job$
);
