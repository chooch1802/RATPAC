import { supabase } from "../lib/supabase";

export type GamblingSettings = {
  dailyLimit: number | null;
  weeklyLimit: number | null;
  monthlyLimit: number | null;
  excludedUntil: string | null;
};

export type WageredTotals = {
  daily: number;
  weekly: number;
  monthly: number;
};

export async function loadGamblingSettings(): Promise<GamblingSettings | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("daily_wager_limit, weekly_wager_limit, monthly_wager_limit, excluded_until")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;

  return {
    dailyLimit: data.daily_wager_limit ? Number(data.daily_wager_limit) : null,
    weeklyLimit: data.weekly_wager_limit ? Number(data.weekly_wager_limit) : null,
    monthlyLimit: data.monthly_wager_limit ? Number(data.monthly_wager_limit) : null,
    excludedUntil: data.excluded_until ?? null,
  };
}

export async function saveGamblingLimits(
  daily: number | null,
  weekly: number | null,
  monthly: number | null,
): Promise<{ ok: boolean; message: string }> {
  if (!supabase) return { ok: false, message: "Not configured." };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({
      daily_wager_limit: daily,
      weekly_wager_limit: weekly,
      monthly_wager_limit: monthly,
    })
    .eq("id", user.id);

  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Limits saved." };
}

export async function setSelfExclusion(
  days: number,
): Promise<{ ok: boolean; message: string }> {
  if (!supabase) return { ok: false, message: "Not configured." };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not signed in." };

  const excludedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("profiles")
    .update({ excluded_until: excludedUntil })
    .eq("id", user.id);

  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Self-exclusion activated." };
}

export async function getWageredTotals(): Promise<WageredTotals> {
  if (!supabase) return { daily: 0, weekly: 0, monthly: 0 };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { daily: 0, weekly: 0, monthly: 0 };

  const { data, error } = await supabase.rpc("get_wagered_totals", {
    p_user_id: user.id,
  });

  if (error || !data) return { daily: 0, weekly: 0, monthly: 0 };
  return {
    daily: Number(data.daily ?? 0),
    weekly: Number(data.weekly ?? 0),
    monthly: Number(data.monthly ?? 0),
  };
}

export function checkWagerBlocked(
  amount: number,
  settings: GamblingSettings,
  totals: WageredTotals,
): { blocked: boolean; reason: string } {
  // Self-exclusion check
  if (settings.excludedUntil) {
    const until = new Date(settings.excludedUntil);
    if (until > new Date()) {
      const date = until.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
      return { blocked: true, reason: `You are self-excluded until ${date}.` };
    }
  }

  // Limit checks
  if (settings.dailyLimit !== null && totals.daily + amount > settings.dailyLimit) {
    const remaining = Math.max(0, settings.dailyLimit - totals.daily);
    return { blocked: true, reason: `Daily limit reached. You have $${remaining.toFixed(2)} remaining today.` };
  }
  if (settings.weeklyLimit !== null && totals.weekly + amount > settings.weeklyLimit) {
    const remaining = Math.max(0, settings.weeklyLimit - totals.weekly);
    return { blocked: true, reason: `Weekly limit reached. You have $${remaining.toFixed(2)} remaining this week.` };
  }
  if (settings.monthlyLimit !== null && totals.monthly + amount > settings.monthlyLimit) {
    const remaining = Math.max(0, settings.monthlyLimit - totals.monthly);
    return { blocked: true, reason: `Monthly limit reached. You have $${remaining.toFixed(2)} remaining this month.` };
  }

  return { blocked: false, reason: "" };
}
