// Supabase Edge Function: send-push
// Triggered via database webhook when a row is inserted into notifications table
// Deploy with: supabase functions deploy send-push

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (req) => {
  try {
    const payload = await req.json();

    // Database webhook sends: { type, table, record, old_record }
    const record = payload.record;
    if (!record) {
      return new Response("No record", { status: 400 });
    }

    const { user_id, title, body, reference_id } = record;

    // Get device tokens for this user
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tokens, error } = await supabase
      .from("device_tokens")
      .select("token")
      .eq("user_id", user_id);

    if (error || !tokens?.length) {
      return new Response("No tokens found", { status: 200 });
    }

    // Send to all registered devices
    const messages = tokens.map((t: { token: string }) => ({
      to: t.token,
      title,
      body,
      data: { reference_id },
      sound: "default",
      badge: 1,
    }));

    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(String(err), { status: 500 });
  }
});
