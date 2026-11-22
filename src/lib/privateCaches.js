// Older builds cached Supabase API responses in the service worker. That data is
// per-user, so clear it on startup and whenever someone signs out.
export async function clearPrivateCaches() {
  try {
    if (typeof caches === 'undefined') return;
    await caches.delete('supabase-cache');
  } catch {
    /* ignore */
  }
}
