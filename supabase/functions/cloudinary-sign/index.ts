import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Only these image types may be uploaded with a signature from this function.
// `allowed_formats` is part of the signed string, so Cloudinary rejects anything else
// even if someone edits the request.
const ALLOWED_FORMATS = "jpg,jpeg,png,webp";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha1(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-1", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    const token = authorization.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ error: "Invalid session" }, 401);
    }

    const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");
    const apiKey = Deno.env.get("CLOUDINARY_API_KEY");
    const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET");
    if (!cloudName || !apiKey || !apiSecret) {
      return jsonResponse({ error: "Cloudinary configuration is incomplete" }, 500);
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `campusflip/listings/${user.id}`;

    // Cloudinary requires alphabetically ordered signed parameters.
    const params: Record<string, string> = {
      allowed_formats: ALLOWED_FORMATS,
      folder,
      timestamp: String(timestamp),
    };

    const signatureString =
      Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join("&") + apiSecret;

    const signature = await sha1(signatureString);

    return jsonResponse({
      cloud_name: cloudName,
      api_key: apiKey,
      timestamp,
      folder,
      allowed_formats: ALLOWED_FORMATS,
      signature,
    });
  } catch (error) {
    console.error("Cloudinary signing error:", error);
    return jsonResponse({ error: "Could not create upload signature" }, 500);
  }
});
