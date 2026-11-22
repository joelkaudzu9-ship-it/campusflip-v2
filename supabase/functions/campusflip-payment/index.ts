import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OPERATORS: Record<string, string> = {
  airtel: "20be6c20-adeb-4b5b-a7ba-0769820df4fb",
  tnm: "27494cb5-ba9e-437f-a114-4e7a7686bcca",
};

const PRICES: Record<string, number> = {
  listing: 200,
  boost: 500,
  boost_discount: 400,
  shop_plan: 1000,
  flash_deal: 300,
};

// Flash deals may run for 1 hour to 7 days.
const MIN_DEAL_HOURS = 1;
const MAX_DEAL_HOURS = 168;
const DEFAULT_DEAL_HOURS = 24;

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(value: string): string | null {
  let phone = value.replace(/[\s\-()+]/g, "");
  if (phone.startsWith("265")) phone = phone.slice(3);
  if (phone.startsWith("0")) phone = phone.slice(1);
  if (!/^(88|89|98|99)\d{7}$/.test(phone)) return null;
  return phone;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return response({ error: "Method not allowed." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const paychanguKey = Deno.env.get("PAYCHANGU_SECRET_KEY");

    if (!supabaseUrl || !anonKey || !serviceKey || !paychanguKey) {
      return response({ error: "Payment service unavailable." }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return response({ error: "Please sign in first." }, 401);
    }

    const token = authHeader.slice(7);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser(token);

    if (authError || !user) {
      return response({ error: "Invalid or expired session." }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json();

    const {
      listingId,
      paymentType,
      operator,
      phone,
      idempotencyKey,
      dealPrice,
      dealDurationHours,
    } = body;

    if (!paymentType || !operator || !phone) {
      return response({ error: "Please provide all payment details." }, 400);
    }

    if (!["listing", "boost", "shop_plan", "flash_deal"].includes(paymentType)) {
      return response({ error: "Invalid payment type." }, 400);
    }

    if (typeof idempotencyKey !== "string" || !/^[a-zA-Z0-9-]{16,100}$/.test(idempotencyKey)) {
      return response({ error: "Invalid payment attempt key. Please refresh and try again." }, 400);
    }

    if (!Object.hasOwn(OPERATORS, operator)) {
      return response({ error: "Invalid mobile money provider." }, 400);
    }

    const normalizedPhone = normalizePhone(String(phone));
    if (!normalizedPhone) {
      return response({ error: "Enter a valid Malawi Airtel or TNM number." }, 400);
    }

    let finalPaymentType = paymentType;
    let amount = PRICES[paymentType];

    let listing: {
      id: string;
      seller_id: string;
      status: string;
      kind: string;
      price: number;
    } | null = null;

    // Validated BEFORE any money is requested, so nobody pays for a deal that cannot be created.
    let validDealPrice = 0;
    let validDealHours = DEFAULT_DEAL_HOURS;

    if (paymentType === "listing" || paymentType === "boost" || paymentType === "flash_deal") {
      if (!listingId) {
        return response({ error: "A listing is required for this payment." }, 400);
      }

      const { data, error } = await admin
        .from("listings")
        .select("id, seller_id, status, kind, price")
        .eq("id", listingId)
        .maybeSingle();

      if (error || !data) {
        return response({ error: "Listing not found." }, 404);
      }

      if (data.seller_id !== user.id) {
        return response({ error: "You do not own this listing." }, 403);
      }

      listing = data;

      if (paymentType === "listing") {
        if (listing.status !== "pending_payment" || listing.kind !== "sale") {
          return response({ error: "This listing is not awaiting publication payment." }, 400);
        }
      }

      if (paymentType === "boost") {
        if (listing.status !== "active") {
          return response({ error: "Only active listings can be boosted." }, 400);
        }
        if (listing.kind === "sale") {
          finalPaymentType = "boost_discount";
          amount = PRICES.boost_discount;
        }
      }

      if (paymentType === "flash_deal") {
        if (listing.status !== "active") {
          return response({ error: "Only active listings can have a Flash Deal." }, 400);
        }
        if (listing.kind !== "sale") {
          return response({ error: "Flash Deals are only available for sale listings." }, 400);
        }
        amount = PRICES.flash_deal;

        validDealPrice = Number(dealPrice);
        const originalPrice = Number(listing.price);
        if (!Number.isFinite(validDealPrice) || validDealPrice <= 0 || validDealPrice >= originalPrice) {
          return response({ error: "The deal price must be above 0 and lower than the current price." }, 400);
        }

        const requestedHours = Number(dealDurationHours);
        validDealHours = Number.isFinite(requestedHours) && requestedHours > 0
          ? Math.min(MAX_DEAL_HOURS, Math.max(MIN_DEAL_HOURS, Math.round(requestedHours)))
          : DEFAULT_DEAL_HOURS;
      }
    }

    if (paymentType === "shop_plan") {
      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !profile) {
        return response({ error: "Your account profile could not be found." }, 404);
      }

      finalPaymentType = "shop_plan";
      amount = PRICES.shop_plan;
    }

    // Idempotency lookup
    const { data: existing, error: lookupError } = await admin
      .from("payments")
      .select("charge_id, status, payment_type, amount, operator, phone_number, listing_id, provider")
      .eq("user_id", user.id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (lookupError) {
      return response({ error: "Could not verify this payment attempt." }, 500);
    }

    if (existing) {
      // A listing paid with a referral credit is stored with amount 0, so a retry with the
      // same key must still be recognised as the same attempt.
      const paidWithCredit =
        existing.provider === "referral_credit" && existing.payment_type === "listing";

      const sameAttempt =
        existing.payment_type === finalPaymentType &&
        (Number(existing.amount) === amount || (paidWithCredit && Number(existing.amount) === 0)) &&
        existing.operator === operator &&
        existing.phone_number === normalizedPhone &&
        existing.listing_id === (listing?.id ?? null);

      if (!sameAttempt) {
        return response({ error: "This payment key has already been used for another payment." }, 409);
      }

      if (existing.status === "failed") {
        return response({ error: "This payment attempt failed. Start a new one." }, 409);
      }

      return response({
        success: true,
        message: "Existing payment attempt retrieved.",
        charge_id: existing.charge_id,
        amount: Number(existing.amount),
        payment_type: finalPaymentType,
        status: existing.status,
        reused: true,
        ...(paidWithCredit ? { paid_with_credit: true } : {}),
      });
    }

    // ============================================================
    // REFERRAL CREDIT PATH (listing only)
    // ============================================================
    if (paymentType === "listing") {
      const { data: profile } = await admin
        .from("profiles")
        .select("referral_credits")
        .eq("id", user.id)
        .maybeSingle();

      const credits = profile?.referral_credits || 0;

      if (credits > 0) {
        // Credit covers the full listing fee. Skip PayChangu.
        const creditChargeId = `CF-${crypto.randomUUID()}`;

        // Insert the payment row as PENDING first. The finalizer flips it to successful,
        // activates the listing and spends the credit in ONE transaction. The credit
        // spend is atomic, so parallel requests with one credit cannot all succeed.
        const { error: insertError } = await admin
          .from("payments")
          .insert({
            user_id: user.id,
            listing_id: listing!.id,
            payment_type: "listing",
            amount: 0,
            currency: "MWK",
            provider: "referral_credit",
            operator,
            phone_number: normalizedPhone,
            charge_id: creditChargeId,
            status: "pending",
            credits_used: 1,
            idempotency_key: idempotencyKey,
          });

        if (insertError) {
          console.error("Credit payment insert failed:", insertError);
          return response({ error: "Could not record credit payment." }, 500);
        }

        let finalized = false;
        let lastErr: unknown = null;

        for (let attempt = 1; attempt <= 3; attempt++) {
          const { data, error } = await admin.rpc("finalize_campusflip_payment", {
            p_charge_id: creditChargeId,
            p_provider_reference: null,
          });

          if (!error && data?.success) {
            finalized = true;
            break;
          }

          lastErr = error || data;
          console.error(`Finalize attempt ${attempt} failed:`, lastErr);

          // "No referral credit available" will not fix itself: stop retrying.
          if (error?.message?.includes("No referral credit")) break;
          if (attempt < 3) {
            await new Promise((r) => setTimeout(r, 400 * attempt));
          }
        }

        if (!finalized) {
          await admin
            .from("payments")
            .update({ status: "failed", updated_at: new Date().toISOString() })
            .eq("charge_id", creditChargeId);

          return response({
            error: "Could not activate your listing with a referral credit. Please try again.",
          }, 500);
        }

        return response({
          success: true,
          message: "Listing activated with referral credit.",
          charge_id: creditChargeId,
          amount: 0,
          payment_type: "listing",
          status: "successful",
          paid_with_credit: true,
        });
      }
    }

    // ============================================================
    // PAID PATH — via PayChangu
    // ============================================================
    const chargeId = `CF-${crypto.randomUUID()}`;

    const { error: insertError } = await admin
      .from("payments")
      .insert({
        user_id: user.id,
        listing_id: listing?.id ?? null,
        payment_type: finalPaymentType,
        amount,
        currency: "MWK",
        provider: "paychangu",
        operator,
        phone_number: normalizedPhone,
        charge_id: chargeId,
        status: "pending",
        idempotency_key: idempotencyKey,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: raceExisting } = await admin
          .from("payments")
          .select("charge_id, status, payment_type, amount, operator, phone_number, listing_id")
          .eq("user_id", user.id)
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();

        if (
          raceExisting &&
          raceExisting.payment_type === finalPaymentType &&
          Number(raceExisting.amount) === amount &&
          raceExisting.status !== "failed"
        ) {
          return response({
            success: true,
            message: "Existing payment attempt retrieved.",
            charge_id: raceExisting.charge_id,
            amount,
            payment_type: finalPaymentType,
            status: raceExisting.status,
            reused: true,
          });
        }
      }

      console.error("Payment record creation failed:", insertError);
      return response({ error: "Could not create payment record." }, 500);
    }

    // For a flash deal, create the (inactive) deal BEFORE asking for money, so a failure
    // here cannot leave the seller charged for nothing. Older inactive drafts for the same
    // listing are removed so the finalizer can only ever activate this one.
    if (paymentType === "flash_deal" && listing) {
      await admin
        .from("flash_deals")
        .delete()
        .eq("listing_id", listing.id)
        .eq("is_active", false);

      const { error: dealError } = await admin.from("flash_deals").insert({
        listing_id: listing.id,
        original_price: Number(listing.price),
        deal_price: validDealPrice,
        starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + validDealHours * 3600 * 1000).toISOString(),
        is_active: false,
      });

      if (dealError) {
        console.error("Flash deal creation failed:", dealError);
        await admin
          .from("payments")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("charge_id", chargeId);
        return response({ error: "Could not prepare your Flash Deal. Please try again." }, 500);
      }
    }

    const paychanguResponse = await fetch(
      "https://api.paychangu.com/mobile-money/payments/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paychanguKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile: normalizedPhone,
          mobile_money_operator_ref_id: OPERATORS[operator],
          amount: String(amount),
          charge_id: chargeId,
          email: user.email,
          first_name: user.user_metadata?.display_name || "CampusFlip",
          last_name: "Student",
        }),
      },
    );

    const paychanguData = await paychanguResponse.json();

    if (!paychanguResponse.ok || paychanguData.status !== "success") {
      console.error("PayChangu initialization failed:", paychanguData);
      await admin
        .from("payments")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("charge_id", chargeId);

      if (paymentType === "flash_deal" && listing) {
        await admin
          .from("flash_deals")
          .delete()
          .eq("listing_id", listing.id)
          .eq("is_active", false);
      }

      return response(
        { error: "PayChangu could not initiate the payment. Please try again." },
        400,
      );
    }

    await admin
      .from("payments")
      .update({
        provider_reference: paychanguData.data?.ref_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("charge_id", chargeId);

    return response({
      success: true,
      message: "Payment prompt initiated.",
      charge_id: chargeId,
      amount,
      payment_type: finalPaymentType,
      status: paychanguData.data?.status || "pending",
      provider_message: paychanguData.message,
    });
  } catch (error) {
    console.error("Payment function error:", error);
    return response({ error: "Something went wrong while initiating payment." }, 500);
  }
});
