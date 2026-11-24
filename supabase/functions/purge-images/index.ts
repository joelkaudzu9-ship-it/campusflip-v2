// Deletes queued images from Cloudinary. Called every 10 minutes by pg_cron
// (see migrations/20261128_image_cleanup_cron.sql), never by the browser.
//
// Secrets (supabase secrets set ...):
//   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, IMAGE_CLEANUP_SECRET
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
import { createClient } from "npm:@supabase/supabase-js@2";

const WEBHOOK_SECRET = Deno.env.get("IMAGE_CLEANUP_SECRET") ?? "";
const CLOUD = Deno.env.get("CLOUDINARY_CLOUD_NAME") ?? "";
const API_KEY = Deno.env.get("CLOUDINARY_API_KEY") ?? "";
const API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET") ?? "";
const BATCH = 40;
const MAX_ATTEMPTS = 5;

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

async function sha1(value: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// https://res.cloudinary.com/<cloud>/image/upload/[transformations/][v123/]folder/name.jpg -> folder/name
export function publicIdFromUrl(url: string, cloud: string): string | null {
  const marker = `https://res.cloudinary.com/${cloud}/image/upload/`;
  if (!url.startsWith(marker)) return null;
  const parts = url.slice(marker.length).split("?")[0].split("/");
  while (parts.length > 1 && !/^v\d+$/.test(parts[0]) && (parts[0].includes(",") || /^[a-z]{1,3}_/.test(parts[0]))) {
    parts.shift();
  }
  if (parts.length > 1 && /^v\d+$/.test(parts[0])) parts.shift();
  const path = decodeURIComponent(parts.join("/")).replace(/\.[A-Za-z0-9]+$/, "");
  return path || null;
}

async function destroy(publicId: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await sha1(`public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`);
  const body = new URLSearchParams({ public_id: publicId, timestamp: String(timestamp), api_key: API_KEY, signature });
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/destroy`, { method: "POST", body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message ?? `Cloudinary ${res.status}`);
  return json.result as string; // "ok" or "not found"
}

async function stillUsed(url: string): Promise<boolean> {
  const [photos, avatars] = await Promise.all([
    supabase.from("listing_photos").select("id", { count: "exact", head: true }).eq("image_url", url),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("avatar_url", url),
  ]);
  return (photos.count ?? 0) > 0 || (avatars.count ?? 0) > 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const provided = req.headers.get("x-webhook-secret") ?? "";
  if (!WEBHOOK_SECRET || !safeEqual(provided, WEBHOOK_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!CLOUD || !API_KEY || !API_SECRET) {
    return new Response("Cloudinary configuration is incomplete", { status: 500 });
  }

  const { data: rows, error } = await supabase
    .from("image_delete_queue")
    .select("id, image_url, attempts")
    .lt("attempts", MAX_ATTEMPTS)
    .order("id")
    .limit(BATCH);
  if (error) return new Response(error.message, { status: 500 });

  let deleted = 0, skipped = 0, failed = 0;
  for (const row of rows ?? []) {
    try {
      const publicId = publicIdFromUrl(row.image_url, CLOUD);
      // Foreign URLs, or a photo another row still uses, are dropped from the queue untouched.
      if (!publicId || await stillUsed(row.image_url)) {
        skipped++;
      } else {
        await destroy(publicId);
        deleted++;
      }
      await supabase.from("image_delete_queue").delete().eq("id", row.id);
    } catch (err) {
      failed++;
      await supabase.from("image_delete_queue")
        .update({ attempts: row.attempts + 1, last_error: String((err as Error).message).slice(0, 300) })
        .eq("id", row.id);
    }
  }
  return new Response(JSON.stringify({ deleted, skipped, failed }), {
    headers: { "Content-Type": "application/json" },
  });
});
