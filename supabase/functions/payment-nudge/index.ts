import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Called by pg_cron: every 6 hours
// SELECT cron.schedule('payment-nudge', '0 */6 * * *', $$
//   SELECT net.http_post(
//     url := 'https://<project>.supabase.co/functions/v1/payment-nudge',
//     headers := '{"Authorization": "Bearer <anon-key>"}'::jsonb
//   );
// $$);
Deno.serve(async () => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Find SETTLED wagers that are unpaid and settled >24h ago
  const { data: unpaidWagers, error } = await supabase
    .from("wagers")
    .select("id, activity, amount, opponent_handle, creator_id, opponent_id, updated_at")
    .eq("status", "SETTLED")
    .eq("is_paid", false)
    .lt("updated_at", cutoff)
    .limit(100);

  if (error) {
    console.error("Failed to fetch unpaid wagers:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!unpaidWagers?.length) {
    return new Response(JSON.stringify({ nudged: 0 }), { status: 200 });
  }

  let nudgedCount = 0;

  for (const wager of unpaidWagers) {
    const recipientIds = [wager.creator_id, wager.opponent_id].filter(Boolean);
    const amountStr = `$${Number(wager.amount).toFixed(2)}`;

    for (const userId of recipientIds) {
      // Skip if we already sent a nudge notification for this wager recently (last 24h)
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("reference_id", wager.id)
        .eq("type", "PAYMENT_NUDGE")
        .gt("created_at", cutoff);

      if ((count ?? 0) > 0) continue;

      await supabase.from("notifications").insert({
        user_id: userId,
        type: "PAYMENT_NUDGE",
        title: "Don't forget to settle up",
        body: `The ${wager.activity} wager for ${amountStr} is settled but payment hasn't been confirmed yet.`,
        reference_id: wager.id,
        read: false,
      });

      nudgedCount++;
    }
  }

  return new Response(JSON.stringify({ nudged: nudgedCount }), { status: 200 });
});
