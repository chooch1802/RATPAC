import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WEBHOOK_SECRET = Deno.env.get("REVENUECAT_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// RevenueCat event types we care about
const TRACKED_EVENTS = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "CANCELLATION",
  "EXPIRATION",
  "TRIAL_STARTED",
  "TRIAL_CONVERTED",
  "TRIAL_CANCELLED",
  "BILLING_ISSUE",
]);

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Verify RevenueCat webhook authorization header
  const authHeader = req.headers.get("Authorization");
  if (WEBHOOK_SECRET && authHeader !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const event = body?.event;
  if (!event) return new Response("No event", { status: 400 });

  const eventType: string = event.type;
  if (!TRACKED_EVENTS.has(eventType)) {
    // Acknowledge but don't store untracked events
    return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // RevenueCat sends app_user_id which is the Supabase user UUID
  const revenueCatUserId: string | null = event.app_user_id ?? null;

  // Try to resolve to a Supabase user ID
  let userId: string | null = null;
  let referralCode: string | null = null;

  if (revenueCatUserId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, referral_code")
      .eq("id", revenueCatUserId)
      .maybeSingle();

    if (profile) {
      userId = profile.id;
      referralCode = profile.referral_code ?? null;
    }
  }

  // Update is_subscribed on profile based on event
  if (userId) {
    const isActive = ["INITIAL_PURCHASE", "RENEWAL", "TRIAL_STARTED", "TRIAL_CONVERTED"].includes(eventType);
    const isInactive = ["CANCELLATION", "EXPIRATION", "TRIAL_CANCELLED"].includes(eventType);

    if (isActive) {
      await supabase.from("profiles").update({ is_subscribed: true }).eq("id", userId);
    } else if (isInactive) {
      await supabase.from("profiles").update({ is_subscribed: false }).eq("id", userId);
    }
  }

  // Store the subscription event for analytics
  const priceUsd: number | null =
    event.price != null ? parseFloat(event.price) : null;

  await supabase.from("subscription_events").insert({
    user_id:        userId,
    event_type:     eventType,
    revenue_cat_id: revenueCatUserId,
    product_id:     event.product_id ?? null,
    price_usd:      priceUsd,
    referral_code:  referralCode,
    raw_payload:    event,
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
