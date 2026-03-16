import { feedPosts, starterWagers } from "../data/mock";
import { supabase } from "../lib/supabase";
import { FeedPost, Notification, PaymentMethod, Wager, WagerStatus } from "../types";

type CreateWagerInput = {
  activity: string;
  amount: number;
  opponentHandle: string;
  termsText?: string;
  isPublic?: boolean;
  paymentMethod?: PaymentMethod;
  paymentHandle?: string;
  sport?: string;
  betType?: string;
  groupId?: string;
  parentWagerId?: string;
};

function rowToWager(row: any): Wager {
  return {
    id: String(row.id),
    activity: String(row.activity),
    amount: Number(row.amount),
    opponentHandle: String(row.opponent_handle ?? "@unknown"),
    opponentDisplayName: row.opponent?.display_name ?? row.opponent_handle ?? "Unknown",
    status: row.status ?? "PENDING",
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
  };
}

const WAGER_SELECT = `
  id, activity, amount, status, created_at,
  opponent_handle, terms_text, winner_handle, declarer_handle,
  payment_method, payment_handle, sport, bet_type, group_id, parent_wager_id,
  opponent:profiles!wagers_opponent_id_fkey(display_name, handle)
`;

export async function fetchWagerById(wagerId: string): Promise<Wager | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("wagers")
    .select(WAGER_SELECT)
    .eq("id", wagerId)
    .maybeSingle();

  if (error || !data) return null;
  return rowToWager(data);
}

function rowToFeedPost(row: any): FeedPost {
  const wager = row.wager ?? {};
  return {
    id: String(row.id),
    wagerId: wager.id ? String(wager.id) : undefined,
    type: (row.type as FeedPost["type"]) ?? "challenge",
    authorId: wager.creator?.id ? String(wager.creator.id) : undefined,
    authorHandle: wager.creator?.handle ?? "@ratpac",
    authorDisplayName: wager.creator?.display_name ?? wager.creator?.handle ?? "Ratpac",
    opponentHandle: wager.opponent_handle ?? "@community",
    opponentDisplayName:
      wager.opponent?.display_name ?? wager.opponent_handle ?? "Community",
    activity: String(wager.activity ?? "Custom"),
    amount: Number(wager.amount ?? 0),
    status: wager.status ?? "PENDING",
    winnerHandle: wager.winner_handle ?? undefined,
    termsText: wager.terms_text ?? undefined,
    isPublic: row.is_public ?? true,
    reactions: {
      fire: row.reactions?.fire ?? 0,
      hundred: row.reactions?.hundred ?? 0,
      laughing: row.reactions?.laughing ?? 0,
      shocked: row.reactions?.shocked ?? 0,
    },
    comments: row.comment_count ?? 0,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

export async function loadInitialData(): Promise<{ feed: FeedPost[]; wagers: Wager[] }> {
  if (!supabase) {
    return { feed: feedPosts, wagers: starterWagers };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { feed: feedPosts, wagers: starterWagers };
  }

  const [wagersRes, postsRes] = await Promise.all([
    supabase
      .from("wagers")
      .select(WAGER_SELECT)
      .or(`creator_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("feed_posts")
      .select(`
        id, type, is_public, reactions, comment_count, created_at,
        wager:wagers!feed_posts_wager_id_fkey(
          id, activity, amount, status, opponent_handle, winner_handle, terms_text,
          creator:profiles!wagers_creator_id_fkey(id, handle, display_name),
          opponent:profiles!wagers_opponent_id_fkey(handle, display_name)
        )
      `)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const wagers: Wager[] =
    wagersRes.error || !wagersRes.data?.length
      ? starterWagers
      : wagersRes.data.map(rowToWager);

  const feed: FeedPost[] =
    postsRes.error || !postsRes.data?.length
      ? feedPosts
      : postsRes.data.map(rowToFeedPost);

  return { feed, wagers };
}

export async function loadPublicFeed(): Promise<FeedPost[]> {
  if (!supabase) return feedPosts;

  const { data, error } = await supabase
    .from("feed_posts")
    .select(`
      id, type, is_public, reactions, comment_count, created_at,
      wager:wagers!feed_posts_wager_id_fkey(
        id, activity, amount, status, opponent_handle, winner_handle, terms_text,
        creator:profiles!wagers_creator_id_fkey(id, handle, display_name),
        opponent:profiles!wagers_opponent_id_fkey(handle, display_name)
      )
    `)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data?.length) return feedPosts;

  const posts = data.map(rowToFeedPost);
  return posts.sort((a, b) => {
    const totalA = a.reactions.fire + a.reactions.hundred + a.reactions.laughing + a.reactions.shocked;
    const totalB = b.reactions.fire + b.reactions.hundred + b.reactions.laughing + b.reactions.shocked;
    if (totalB !== totalA) return totalB - totalA;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export async function createWagerRecord(input: CreateWagerInput): Promise<Wager> {
  const fallback: Wager = {
    id: `w_${Date.now()}`,
    activity: input.activity,
    amount: input.amount,
    opponentHandle: input.opponentHandle,
    opponentDisplayName: input.opponentHandle,
    status: "PENDING",
    termsText: input.termsText,
    paymentMethod: input.paymentMethod,
    paymentHandle: input.paymentHandle,
    createdAt: new Date().toISOString(),
  };

  if (!supabase) return fallback;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fallback;

  // Look up opponent by handle to get their UUID (if they exist)
  const { data: opponentProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", input.opponentHandle)
    .maybeSingle();

  const { data, error } = await supabase
    .from("wagers")
    .insert({
      creator_id: user.id,
      opponent_id: opponentProfile?.id ?? null,
      opponent_handle: input.opponentHandle,
      activity: input.activity,
      amount: input.amount,
      terms_text: input.termsText ?? null,
      is_public: input.isPublic ?? true,
      payment_method: input.paymentMethod ?? null,
      payment_handle: input.paymentHandle ?? null,
      sport: input.sport ?? null,
      bet_type: input.betType ?? null,
      group_id: input.groupId ?? null,
      parent_wager_id: input.parentWagerId ?? null,
      status: "PENDING",
    })
    .select("id, activity, amount, status, created_at, opponent_handle, terms_text, payment_method, payment_handle, sport, bet_type, group_id, parent_wager_id")
    .single();

  if (error || !data) return fallback;

  // Create feed post for public wagers
  if (input.isPublic !== false) {
    await supabase.from("feed_posts").insert({
      wager_id: data.id,
      type: "challenge",
      is_public: true,
    });
  }

  return {
    id: String(data.id),
    activity: String(data.activity),
    amount: Number(data.amount),
    opponentHandle: String(data.opponent_handle),
    opponentDisplayName: input.opponentHandle,
    status: data.status ?? "PENDING",
    termsText: data.terms_text ?? undefined,
    paymentMethod: data.payment_method ?? undefined,
    paymentHandle: data.payment_handle ?? undefined,
    sport: data.sport ?? undefined,
    betType: data.bet_type ?? undefined,
    groupId: data.group_id ?? undefined,
    parentWagerId: data.parent_wager_id ?? undefined,
    createdAt: data.created_at ?? new Date().toISOString(),
  };
}

export async function fetchSideBets(parentWagerId: string): Promise<Wager[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("wagers")
    .select(WAGER_SELECT)
    .eq("parent_wager_id", parentWagerId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(rowToWager);
}

/** Step 1: Declare a result — transitions ACTIVE → AWAITING_RESULT */
export async function declareWagerResult(
  wagerId: string,
  winnerHandle: string
): Promise<{ ok: boolean }> {
  if (!supabase) return { ok: false };
  const client = supabase;

  const { data: { user } } = await client.auth.getUser();
  if (!user) return { ok: false };

  const { data: me } = await client
    .from("profiles")
    .select("handle, display_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: wager, error: wagerErr } = await client
    .from("wagers")
    .select("id, creator_id, opponent_id, activity, amount")
    .eq("id", wagerId)
    .maybeSingle();

  if (wagerErr || !wager) return { ok: false };

  const { error } = await client
    .from("wagers")
    .update({
      status: "AWAITING_RESULT",
      winner_handle: winnerHandle,
      declarer_handle: me?.handle ?? null,
    })
    .eq("id", wagerId)
    .eq("status", "ACTIVE");

  if (error) return { ok: false };

  // Notify the other party
  const otherPartyId = wager.creator_id === user.id ? wager.opponent_id : wager.creator_id;
  if (otherPartyId) {
    const declarer = me?.display_name ?? me?.handle ?? "Your opponent";
    await client.from("notifications").insert({
      user_id: otherPartyId,
      type: "RESULT_CONFIRM_REQUEST",
      title: "Result declared",
      body: `${declarer} declared a result for your ${wager.activity} wager — confirm or dispute.`,
      reference_id: wagerId,
    });
  }

  return { ok: true };
}

/** Step 2a: Confirm the declared result — transitions AWAITING_RESULT → SETTLED */
export async function confirmWagerResult(wagerId: string): Promise<{ ok: boolean }> {
  if (!supabase) return { ok: false };
  const client = supabase;

  const { data: { user } } = await client.auth.getUser();
  if (!user) return { ok: false };

  // Fetch wager to get winner handle and resolve winner_id
  const { data: wager, error: wagerErr } = await client
    .from("wagers")
    .select("id, creator_id, opponent_id, winner_handle, activity, amount, declarer_handle, status")
    .eq("id", wagerId)
    .maybeSingle();

  if (wagerErr || !wager || wager.status === "SETTLED") return { ok: false };

  // Look up winner UUID from handle
  let winnerId: string | null = null;
  if (wager.winner_handle) {
    const { data: winnerProfile } = await client
      .from("profiles")
      .select("id")
      .eq("handle", wager.winner_handle)
      .maybeSingle();
    winnerId = winnerProfile?.id ?? null;
  }

  const { error } = await client
    .from("wagers")
    .update({ status: "SETTLED", winner_id: winnerId })
    .eq("id", wagerId)
    .eq("status", "AWAITING_RESULT");

  if (error) return { ok: false };

  // Notify the declarer (the other party)
  const declarerId = wager.creator_id === user.id ? wager.opponent_id : wager.creator_id;
  if (declarerId) {
    const isWinner = winnerId === declarerId || wager.winner_handle === wager.declarer_handle;
    await client.from("notifications").insert({
      user_id: declarerId,
      type: isWinner ? "WAGER_SETTLED_WIN" : "WAGER_SETTLED_LOSS",
      title: isWinner ? "Wager settled — you won!" : "Wager settled",
      body: `Your ${wager.activity} wager has been confirmed and settled.`,
      reference_id: wagerId,
    });
  }

  return { ok: true };
}

/** Step 2b: Dispute the declared result — transitions AWAITING_RESULT → DISPUTED */
export async function disputeWagerResult(wagerId: string): Promise<{ ok: boolean }> {
  if (!supabase) return { ok: false };
  const client = supabase;

  const { data: { user } } = await client.auth.getUser();
  if (!user) return { ok: false };

  const { data: me } = await client
    .from("profiles")
    .select("handle, display_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: wager, error: wagerErr } = await client
    .from("wagers")
    .select("id, creator_id, opponent_id, activity")
    .eq("id", wagerId)
    .maybeSingle();

  if (wagerErr || !wager) return { ok: false };

  const { error } = await client
    .from("wagers")
    .update({ status: "DISPUTED" })
    .eq("id", wagerId)
    .eq("status", "AWAITING_RESULT");

  if (error) return { ok: false };

  // Notify both parties
  const otherPartyId = wager.creator_id === user.id ? wager.opponent_id : wager.creator_id;
  const disputer = me?.display_name ?? me?.handle ?? "Your opponent";
  if (otherPartyId) {
    await client.from("notifications").insert({
      user_id: otherPartyId,
      type: "RESULT_DISPUTED",
      title: "Result disputed",
      body: `${disputer} disputed the result for your ${wager.activity} wager. Reach out to resolve.`,
      reference_id: wagerId,
    });
  }

  return { ok: true };
}

/** Legacy single-step settle (kept for backward compatibility) */
export async function settleWager(
  wagerId: string,
  winnerHandle: string
): Promise<{ ok: boolean }> {
  if (!supabase) return { ok: false };
  const client = supabase;

  // Resolve winner UUID
  const { data: winnerProfile } = await client
    .from("profiles")
    .select("id")
    .eq("handle", winnerHandle)
    .maybeSingle();

  const { error } = await client
    .from("wagers")
    .update({ status: "SETTLED", winner_handle: winnerHandle, winner_id: winnerProfile?.id ?? null })
    .eq("id", wagerId);

  return { ok: !error };
}

export async function respondToChallenge(
  wagerId: string,
  action: "accept" | "decline"
): Promise<{ ok: boolean; status?: WagerStatus }> {
  if (!supabase) return { ok: false };
  const client = supabase;

  const { data: { user } } = await client.auth.getUser();
  if (!user) return { ok: false };

  const { data: profile } = await client
    .from("profiles")
    .select("handle, display_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: wager, error: wagerError } = await client
    .from("wagers")
    .select("id, creator_id, opponent_handle, activity, amount, status")
    .eq("id", wagerId)
    .maybeSingle();

  if (wagerError || !wager || wager.status !== "PENDING") return { ok: false };

  const targetStatus: WagerStatus = action === "accept" ? "ACTIVE" : "VOIDED";
  const { error: updateError } = await client
    .from("wagers")
    .update({
      status: targetStatus,
      opponent_id: user.id,
    })
    .eq("id", wagerId)
    .eq("status", "PENDING");

  if (updateError) return { ok: false };

  const actorName = profile?.display_name ?? profile?.handle ?? "Your opponent";
  const actionWord = action === "accept" ? "accepted" : "declined";
  const notifType = action === "accept" ? "CHALLENGE_ACCEPTED" : "CHALLENGE_DECLINED";
  await client.from("notifications").insert({
    user_id: wager.creator_id,
    type: notifType,
    title: `Challenge ${action === "accept" ? "accepted" : "declined"}`,
    body: `${actorName} ${actionWord} your ${wager.activity} challenge for $${Number(
      wager.amount
    ).toFixed(2)}.`,
    reference_id: wager.id,
  });

  return { ok: true, status: targetStatus };
}

export async function loadNotifications() {
  if (!supabase) return [];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, read, reference_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];

  return data.map((row: any) => rowToNotification(row));
}

function rowToNotification(row: any): Notification {
  return {
    id: String(row.id),
    type: row.type,
    title: row.title,
    body: row.body,
    read: row.read,
    referenceId: row.reference_id ?? undefined,
    createdAt: row.created_at,
  };
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  if (!supabase) return;
  const client = supabase;

  const { data: { user } } = await client.auth.getUser();
  if (!user) return;

  await client
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id);
}

export async function markAllNotificationsAsRead(): Promise<void> {
  if (!supabase) return;
  const client = supabase;

  const { data: { user } } = await client.auth.getUser();
  if (!user) return;

  await client
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);
}

export async function subscribeToNotificationChanges(
  onNotificationChanged: (notification: Notification) => void
): Promise<(() => void) | null> {
  if (!supabase) return null;
  const client = supabase;

  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;

  const channel = client.channel(`notifications-live-${user.id}-${Date.now()}`);

  const handlePayload = (payload: any) => {
    const row = payload?.new;
    if (!row) return;
    onNotificationChanged(rowToNotification(row));
  };

  channel
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      },
      handlePayload
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

export async function reactToFeedPost(
  postId: string,
  reaction: keyof FeedPost["reactions"]
): Promise<FeedPost["reactions"] | null> {
  if (!supabase) return null;
  const client = supabase;

  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;

  const { data: current, error: currentError } = await client
    .from("feed_posts")
    .select("reactions")
    .eq("id", postId)
    .maybeSingle();

  if (currentError || !current) return null;

  const currentReactions = {
    fire: Number(current.reactions?.fire ?? 0),
    hundred: Number(current.reactions?.hundred ?? 0),
    laughing: Number(current.reactions?.laughing ?? 0),
    shocked: Number(current.reactions?.shocked ?? 0),
  };

  const nextReactions = {
    ...currentReactions,
    [reaction]: currentReactions[reaction] + 1,
  };

  const { data: updated, error: updateError } = await client
    .from("feed_posts")
    .update({ reactions: nextReactions })
    .eq("id", postId)
    .select("reactions")
    .maybeSingle();

  if (updateError || !updated) return null;

  return {
    fire: Number(updated.reactions?.fire ?? 0),
    hundred: Number(updated.reactions?.hundred ?? 0),
    laughing: Number(updated.reactions?.laughing ?? 0),
    shocked: Number(updated.reactions?.shocked ?? 0),
  };
}

export async function subscribeToFeedPostChanges(
  onFeedPostChanged: (post: { id: string; reactions: FeedPost["reactions"]; comments: number }) => void
): Promise<(() => void) | null> {
  if (!supabase) return null;
  const client = supabase;

  const channel = client.channel(`feed-posts-live-${Date.now()}`);
  const handlePayload = (payload: any) => {
    const row = payload?.new;
    if (!row?.id) return;
    onFeedPostChanged({
      id: String(row.id),
      reactions: {
        fire: Number(row.reactions?.fire ?? 0),
        hundred: Number(row.reactions?.hundred ?? 0),
        laughing: Number(row.reactions?.laughing ?? 0),
        shocked: Number(row.reactions?.shocked ?? 0),
      },
      comments: Number(row.comment_count ?? 0),
    });
  };

  channel
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "feed_posts",
      },
      handlePayload
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

export async function subscribeToWagerChanges(
  onWagerChanged: (wager: Wager) => void
): Promise<(() => void) | null> {
  if (!supabase) return null;
  const client = supabase;

  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;

  const channel = client.channel(`wagers-live-${user.id}-${Date.now()}`);

  const handlePayload = async (payload: any) => {
    const changedId = payload?.new?.id;
    if (!changedId) return;
    const wager = await fetchWagerById(String(changedId));
    if (!wager) return;
    onWagerChanged(wager);
  };

  channel
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "wagers",
        filter: `creator_id=eq.${user.id}`,
      },
      handlePayload
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "wagers",
        filter: `opponent_id=eq.${user.id}`,
      },
      handlePayload
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
