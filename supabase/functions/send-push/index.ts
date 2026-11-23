// Sends a web push to every device a user has enabled, when a notification row is inserted.
// Called by a database trigger (see migrations/20261125_web_push_trigger.sql), never by the browser.
//
// Secrets (supabase secrets set ...):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@example.com), PUSH_WEBHOOK_SECRET
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const WEBHOOK_SECRET = Deno.env.get("PUSH_WEBHOOK_SECRET") ?? "";

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com",
  Deno.env.get("VAPID_PUBLIC_KEY") ?? "",
  Deno.env.get("VAPID_PRIVATE_KEY") ?? "",
);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const provided = req.headers.get("x-webhook-secret") ?? "";
  if (!WEBHOOK_SECRET || !safeEqual(provided, WEBHOOK_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let record: Record<string, unknown> | null = null;
  try {
    const body = await req.json();
    record = body?.record ?? null;
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (!record || typeof record.user_id !== "string") return new Response("No record", { status: 400 });

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", record.user_id);
  if (error) {
    console.error("subscription lookup failed", error.message);
    return new Response("Lookup failed", { status: 500 });
  }
  if (!subs?.length) return new Response(JSON.stringify({ sent: 0 }), { status: 200 });

  const origin = Deno.env.get("SITE_URL") ?? "";
  const payload = JSON.stringify({
    title: String(record.title ?? "CampusFlip").slice(0, 80),
    body: String(record.message ?? "").slice(0, 160),
    url: record.listing_id ? `/listing/${record.listing_id}` : "/",
    tag: String(record.id ?? ""),
    origin,
  });

  let sent = 0;
  const gone: string[] = [];
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
        { TTL: 60 * 60 * 24 },
      );
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) gone.push(s.id); // device unsubscribed
      else console.error("push failed", status ?? (err as Error).message);
    }
  }));

  if (gone.length) await supabase.from("push_subscriptions").delete().in("id", gone);

  return new Response(JSON.stringify({ sent, removed: gone.length }), { status: 200 });
});
