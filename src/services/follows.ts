import { supabase } from "../lib/supabase";

export async function followUser(followingId: string): Promise<{ ok: boolean }> {
  if (!supabase) return { ok: false };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: user.id, following_id: followingId });

  return { ok: !error };
}

export async function unfollowUser(followingId: string): Promise<{ ok: boolean }> {
  if (!supabase) return { ok: false };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", followingId);

  return { ok: !error };
}

export async function isFollowing(followingId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("following_id", followingId)
    .maybeSingle();

  return Boolean(data);
}

export async function searchProfiles(query: string) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, handle, display_name, wins, losses, is_private")
    .or(`handle.ilike.%${query}%,display_name.ilike.%${query}%`)
    .limit(20);

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: row.id,
    handle: row.handle,
    displayName: row.display_name ?? row.handle,
    wins: row.wins,
    losses: row.losses,
    isPublic: !row.is_private,
  }));
}

function normalizeHandle(handle: string): string {
  const trimmed = handle.trim();
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

async function resolveProfileIdByHandle(handle: string): Promise<string | null> {
  if (!supabase) return null;
  const normalized = normalizeHandle(handle);
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", normalized)
    .maybeSingle();

  if (error || !data?.id) return null;
  return String(data.id);
}

export async function loadFollowingHandles(): Promise<string[]> {
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("follows")
    .select("following:profiles!follows_following_id_fkey(handle)")
    .eq("follower_id", user.id);

  if (error || !data?.length) return [];

  return data
    .map((row: any) => row.following?.handle)
    .filter((h: unknown): h is string => typeof h === "string");
}

export async function followUserByHandle(handle: string): Promise<{ ok: boolean }> {
  const profileId = await resolveProfileIdByHandle(handle);
  if (!profileId) return { ok: false };
  return followUser(profileId);
}

export async function unfollowUserByHandle(handle: string): Promise<{ ok: boolean }> {
  const profileId = await resolveProfileIdByHandle(handle);
  if (!profileId) return { ok: false };
  return unfollowUser(profileId);
}
