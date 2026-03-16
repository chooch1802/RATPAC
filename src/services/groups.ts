import { supabase } from "../lib/supabase";
import { Group, GroupMember, Wager } from "../types";

export async function fetchMyGroups(): Promise<Group[]> {
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('group_members')
    .select(`
      role,
      group:groups!group_members_group_id_fkey(
        id, name, join_code, avatar_color, created_at,
        member_count:group_members(count)
      )
    `)
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false });

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: String(row.group.id),
    name: String(row.group.name),
    joinCode: String(row.group.join_code),
    avatarColor: row.group.avatar_color ?? '#00FF87',
    memberCount: Number(row.group.member_count?.[0]?.count ?? 0),
    myRole: row.role ?? 'member',
    createdAt: row.group.created_at,
  }));
}

export async function fetchGroupMembers(groupId: string): Promise<GroupMember[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('group_members')
    .select(`
      role,
      profile:profiles!group_members_user_id_fkey(id, handle, display_name)
    `)
    .eq('group_id', groupId);

  if (error || !data) return [];

  return data.map((row: any) => ({
    userId: String(row.profile.id),
    handle: String(row.profile.handle),
    displayName: row.profile.display_name ?? row.profile.handle,
    role: row.role ?? 'member',
  }));
}

export async function fetchGroupWagers(groupId: string): Promise<Wager[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('wagers')
    .select(`
      id, activity, amount, status, created_at, sport, bet_type,
      opponent_handle, terms_text, winner_handle, declarer_handle,
      payment_method, payment_handle, group_id, parent_wager_id,
      opponent:profiles!wagers_opponent_id_fkey(display_name, handle)
    `)
    .eq('group_id', groupId)
    .is('parent_wager_id', null)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error || !data) return [];

  return data.map((row: any) => ({
    id: String(row.id),
    activity: String(row.activity),
    amount: Number(row.amount),
    opponentHandle: String(row.opponent_handle ?? '@unknown'),
    opponentDisplayName: row.opponent?.display_name ?? row.opponent_handle ?? 'Unknown',
    status: row.status ?? 'PENDING',
    winnerHandle: row.winner_handle ?? undefined,
    declarerHandle: row.declarer_handle ?? undefined,
    termsText: row.terms_text ?? undefined,
    paymentMethod: row.payment_method ?? undefined,
    paymentHandle: row.payment_handle ?? undefined,
    sport: row.sport ?? undefined,
    betType: row.bet_type ?? undefined,
    groupId: row.group_id ?? undefined,
    parentWagerId: row.parent_wager_id ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
  }));
}

export async function createGroup(name: string): Promise<Group | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: group, error } = await supabase
    .from('groups')
    .insert({ name: name.trim(), created_by: user.id })
    .select('id, name, join_code, avatar_color, created_at')
    .single();

  if (error || !group) return null;

  await supabase.from('group_members').insert({
    group_id: group.id,
    user_id: user.id,
    role: 'admin',
  });

  return {
    id: String(group.id),
    name: String(group.name),
    joinCode: String(group.join_code),
    avatarColor: group.avatar_color ?? '#00FF87',
    memberCount: 1,
    myRole: 'admin',
    createdAt: group.created_at,
  };
}

export async function leaveGroup(groupId: string): Promise<{ ok: boolean; message: string }> {
  if (!supabase) return { ok: false, message: 'Not configured.' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Not signed in.' };

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', user.id);

  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Left group.' };
}

export async function joinGroupByCode(code: string): Promise<{ ok: boolean; group?: Group; message: string }> {
  if (!supabase) return { ok: false, message: 'Not configured.' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'Not signed in.' };

  const { data: group, error } = await supabase
    .from('groups')
    .select('id, name, join_code, avatar_color, created_at')
    .eq('join_code', code.trim().toUpperCase())
    .maybeSingle();

  if (error || !group) return { ok: false, message: 'Invalid code. Check and try again.' };

  const { error: joinError } = await supabase.from('group_members').insert({
    group_id: group.id,
    user_id: user.id,
    role: 'member',
  });

  if (joinError) {
    if (joinError.code === '23505') return { ok: false, message: "You're already in this group." };
    return { ok: false, message: 'Failed to join group.' };
  }

  const { count } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', group.id);

  return {
    ok: true,
    message: `Joined ${group.name}!`,
    group: {
      id: String(group.id),
      name: String(group.name),
      joinCode: String(group.join_code),
      avatarColor: group.avatar_color ?? '#00FF87',
      memberCount: count ?? 1,
      myRole: 'member',
      createdAt: group.created_at,
    },
  };
}
