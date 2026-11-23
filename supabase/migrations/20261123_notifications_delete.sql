-- Let users clear (delete) their own notifications.
-- Before this, notifications had only SELECT and UPDATE policies, so deletes were silently ignored.
-- Safe to run more than once.

drop policy if exists "Users can delete own notifications" on public.notifications;
create policy "Users can delete own notifications"
  on public.notifications
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant delete on public.notifications to authenticated;
