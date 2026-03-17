import { supabase } from "../lib/supabase";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";

WebBrowser.maybeCompleteAuthSession();

type AuthResult = { ok: boolean; message: string };

type OAuthProvider = "apple" | "google";

function readAuthParams(url: string): { accessToken?: string; refreshToken?: string } {
  const hashPart = url.split("#")[1] ?? "";
  const queryPart = url.includes("?") ? url.split("?")[1].split("#")[0] : "";
  const allParts = [queryPart, hashPart].filter(Boolean).join("&");
  const params = new URLSearchParams(allParts);
  const accessToken = params.get("access_token") ?? undefined;
  const refreshToken = params.get("refresh_token") ?? undefined;
  return { accessToken, refreshToken };
}

async function ensureProfileFromSession(): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return;

  const fallbackHandle = user.phone ? user.phone.slice(-6) : user.id.slice(0, 8);
  const handle = `@${fallbackHandle}`.replace(/[^a-zA-Z0-9_@]/g, "");
  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    handle;

  await supabase.from("profiles").upsert(
    {
      id: user.id,
      handle,
      display_name: displayName,
      is_private: false,
      is_subscribed: false,
    },
    { onConflict: "id", ignoreDuplicates: true }
  );
}

export async function loadProfile(): Promise<{
  handle: string;
  displayName: string;
  isPrivate: boolean;
  isSubscribed: boolean;
  wins: number;
  losses: number;
  totalWagered: number;
  followerCount: number;
  followingCount: number;
  bio?: string;
  avatarUrl?: string;
} | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("handle, display_name, is_private, is_subscribed, wins, losses, total_wagered, follower_count, following_count, bio, avatar_url")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;

  return {
    handle: data.handle,
    displayName: data.display_name ?? data.handle,
    isPrivate: data.is_private,
    isSubscribed: data.is_subscribed,
    wins: data.wins,
    losses: data.losses,
    totalWagered: Number(data.total_wagered),
    followerCount: data.follower_count,
    followingCount: data.following_count,
    bio: data.bio ?? undefined,
    avatarUrl: data.avatar_url ?? undefined,
  };
}

export async function updateProfile(
  handle: string,
  isPrivate: boolean,
  dob?: string,
  displayName?: string,
  bio?: string,
  avatarUrl?: string,
): Promise<{ ok: boolean; message: string }> {
  if (!supabase) return { ok: false, message: "Not configured." };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({
      handle,
      display_name: displayName ?? handle,
      is_private: isPrivate,
      ...(dob ? { dob, age_verified: true, terms_accepted_at: new Date().toISOString() } : {}),
      ...(bio !== undefined ? { bio } : {}),
      ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Profile updated." };
}

export async function redeemReferralCode(
  code: string
): Promise<{ ok: boolean; message: string; discountWeeks?: number; appleOfferId?: string }> {
  if (!supabase) return { ok: false, message: "Not configured." };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not signed in." };

  const { data, error } = await supabase.rpc("redeem_referral_code", {
    p_code: code.trim().toUpperCase(),
    p_user_id: user.id,
  });

  if (error || !data?.ok) return { ok: false, message: data?.message ?? "Invalid code." };

  const weeks: number = data.discount_weeks ?? 1;
  const msg = weeks === 1
    ? "Code applied! You'll get 1 free week."
    : `Code applied! You'll get ${weeks} free weeks.`;

  return { ok: true, message: msg, discountWeeks: weeks, appleOfferId: data.apple_offer_id ?? undefined };
}

export async function sendPhoneOtp(phone: string): Promise<AuthResult> {
  if (!supabase) {
    return {
      ok: false,
      message: "Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.",
    };
  }

  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true, message: "OTP sent. Enter your 6-digit code." };
}

export async function verifyPhoneOtp(phone: string, token: string): Promise<AuthResult> {
  if (!supabase) {
    return {
      ok: false,
      message: "Supabase is not configured.",
    };
  }

  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });

  if (error) {
    return { ok: false, message: error.message };
  }
  await ensureProfileFromSession();
  return { ok: true, message: "Signed in successfully." };
}

export async function hasActiveSession(): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

export async function checkAndExpireTrials(): Promise<void> {
  // No-op stub — trial expiration handled server-side
}

export async function syncProfileForCurrentUser(): Promise<void> {
  await ensureProfileFromSession();
}

export async function logCancellationSurvey(reason: string): Promise<void> {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("cancellation_surveys").insert({
    user_id: user.id,
    reason,
  });
}

export async function signInWithOAuth(provider: OAuthProvider): Promise<AuthResult> {
  if (!supabase) {
    return {
      ok: false,
      message: "Supabase is not configured.",
    };
  }

  const redirectTo = makeRedirectUri({ scheme: "ratpac" });
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data?.url) {
    return { ok: false, message: error?.message ?? "Unable to start OAuth flow." };
  }

  const browserResult = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (browserResult.type !== "success") {
    return { ok: false, message: "OAuth was cancelled." };
  }

  const { accessToken, refreshToken } = readAuthParams(browserResult.url);
  if (!accessToken || !refreshToken) {
    return { ok: false, message: "Could not extract OAuth tokens from callback URL." };
  }

  const { error: setSessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (setSessionError) {
    return { ok: false, message: setSessionError.message };
  }

  await ensureProfileFromSession();
  return { ok: true, message: `Signed in with ${provider}.` };
}
