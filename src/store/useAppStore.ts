import { create } from "zustand";
import { activities, feedPosts, mockNotifications, starterWagers } from "../data/mock";
import { loadProfile, updateProfile } from "../services/auth";
import { followUserByHandle, loadFollowingHandles, unfollowUserByHandle } from "../services/follows";
import { fetchSubscriptionStatus } from "../services/subscription";
import {
  createWagerRecord,
  declareWagerResult,
  confirmWagerResult,
  disputeWagerResult,
  loadInitialData,
  loadNotifications,
  loadPublicFeed,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  markWagerPaid,
  reactToFeedPost,
  respondToChallenge,
  settleWager,
} from "../services/wagers";
import {
  fetchMyGroups,
  createGroup as createGroupService,
  joinGroupByCode,
  leaveGroup as leaveGroupService,
} from "../services/groups";
import {
  GamblingSettings,
  WageredTotals,
  checkWagerBlocked,
  getWageredTotals,
  loadGamblingSettings,
  saveGamblingLimits,
  setSelfExclusion,
} from "../services/gambling";
import { Activity, FeedPost, Group, Notification, PaymentMethod, Reactions, UserProfile, Wager } from "../types";

type OnboardingDraft = {
  handle: string;
  isPrivate: boolean;
  dob: string; // YYYY-MM-DD
};

type CreateWagerPayload = {
  activity: string;
  amount: number;
  opponentHandle: string;
  termsText: string;
  isPublic: boolean;
  paymentMethod: PaymentMethod;
  paymentHandle: string;
  sport?: string;
  betType?: string;
  groupId?: string;
  parentWagerId?: string;
};

type AppState = {
  isAuthed: boolean;
  isOnboarded: boolean;
  user: UserProfile;
  onboardingDraft: OnboardingDraft;
  feed: FeedPost[];
  forYouFeed: FeedPost[];
  wagers: Wager[];
  notifications: Notification[];
  followingHandles: string[];
  showPaywall: boolean;
  showCreateWager: boolean;
  isLoading: boolean;
  isSubscriptionSyncing: boolean;
  allowedActivities: Activity[];
  gamblingSettings: GamblingSettings | null;
  wageredTotals: WageredTotals;
  notificationsEnabled: boolean;
  challengeAlertsEnabled: boolean;
  settlementAlertsEnabled: boolean;
  groups: Group[];
  createWagerContext: { parentWagerId?: string; groupId?: string } | null;

  setAuth: (next: boolean) => void;
  setNotificationsEnabled: (next: boolean) => void;
  setChallengeAlertsEnabled: (next: boolean) => void;
  setSettlementAlertsEnabled: (next: boolean) => void;
  updateUserProfile: (handle: string, displayName: string, bio?: string, avatarUrl?: string) => Promise<{ ok: boolean; message: string }>;
  updateAvatar: (avatarUrl: string) => Promise<void>;
  loadForYouFeed: () => Promise<void>;
  setDraftHandle: (handle: string) => void;
  setDraftPrivacy: (isPrivate: boolean) => void;
  setDraftDob: (dob: string) => void;
  completeOnboarding: () => Promise<void>;
  setSubscribed: (next: boolean) => void;
  setPaywallVisible: (next: boolean) => void;
  setCreateWagerVisible: (next: boolean) => void;
  setCreateWagerContext: (ctx: { parentWagerId?: string; groupId?: string } | null) => void;
  createWager: (payload: CreateWagerPayload) => Promise<void>;
  markWagerSettled: (wagerId: string, winnerHandle: string) => Promise<void>;
  declareResult: (wagerId: string, winnerHandle: string) => Promise<void>;
  confirmResult: (wagerId: string) => Promise<void>;
  disputeResult: (wagerId: string) => Promise<void>;
  hydrateFromBackend: () => Promise<void>;
  refreshSubscriptionStatus: () => Promise<string>;
  upsertWager: (wager: Wager) => void;
  upsertNotification: (notification: Notification) => void;
  patchFeedPost: (postId: string, patch: Partial<FeedPost>) => void;
  toggleFollowForHandle: (handle: string) => Promise<void>;
  respondToChallenge: (wagerId: string, action: "accept" | "decline") => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  toggleReaction: (postId: string, reaction: keyof Reactions) => Promise<void>;
  saveGamblingLimits: (daily: number | null, weekly: number | null, monthly: number | null) => Promise<{ ok: boolean; message: string }>;
  activateSelfExclusion: (days: number) => Promise<{ ok: boolean; message: string }>;
  refreshGamblingSettings: () => Promise<void>;
  loadGroups: () => Promise<void>;
  createGroup: (name: string) => Promise<Group | null>;
  joinGroup: (code: string) => Promise<{ ok: boolean; message: string }>;
  leaveGroup: (groupId: string) => Promise<{ ok: boolean; message: string }>;
  upsertGroup: (group: Group) => void;
  markAsPaid: (wagerId: string) => Promise<void>;
};

export const useAppStore = create<AppState>((set, get) => ({
  isAuthed: false,
  isOnboarded: false,
  user: {
    handle: "@you",
    displayName: "You",
    isPrivate: false,
    isSubscribed: false,
    wins: 3,
    losses: 1,
    totalWagered: 75,
    activeWagerCount: 1,
    followerCount: 24,
    followingCount: 18,
    avatarUrl: undefined,
    bio: undefined,
  },
  onboardingDraft: { handle: "", isPrivate: false, dob: "" },
  feed: feedPosts,
  forYouFeed: feedPosts,
  wagers: starterWagers,
  notifications: mockNotifications,
  followingHandles: [],
  showPaywall: false,
  showCreateWager: false,
  isLoading: false,
  isSubscriptionSyncing: false,
  allowedActivities: activities,
  gamblingSettings: null,
  wageredTotals: { daily: 0, weekly: 0, monthly: 0 },
  notificationsEnabled: true,
  challengeAlertsEnabled: true,
  settlementAlertsEnabled: true,
  groups: [],
  createWagerContext: null,

  setAuth: (next) => set({ isAuthed: next }),

  setNotificationsEnabled: (next) => set({ notificationsEnabled: next }),
  setChallengeAlertsEnabled: (next) => set({ challengeAlertsEnabled: next }),
  setSettlementAlertsEnabled: (next) => set({ settlementAlertsEnabled: next }),

  updateUserProfile: async (handle, displayName, bio, avatarUrl) => {
    const state = get();
    const normalizedHandle = handle.startsWith("@") ? handle : `@${handle}`;
    const result = await updateProfile(normalizedHandle, state.user.isPrivate, undefined, displayName, bio, avatarUrl);
    if (result.ok) {
      set((s) => ({
        user: {
          ...s.user,
          handle: normalizedHandle,
          displayName,
          ...(bio !== undefined ? { bio } : {}),
          ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        },
      }));
    }
    return result;
  },

  updateAvatar: async (avatarUrl) => {
    const state = get();
    set((s) => ({ user: { ...s.user, avatarUrl } }));
    await updateProfile(state.user.handle, state.user.isPrivate, undefined, state.user.displayName, state.user.bio, avatarUrl);
  },

  loadForYouFeed: async () => {
    const posts = await loadPublicFeed();
    set({ forYouFeed: posts });
  },

  setDraftHandle: (handle) =>
    set((s) => ({ onboardingDraft: { ...s.onboardingDraft, handle } })),
  setDraftPrivacy: (isPrivate) =>
    set((s) => ({ onboardingDraft: { ...s.onboardingDraft, isPrivate } })),
  setDraftDob: (dob) =>
    set((s) => ({ onboardingDraft: { ...s.onboardingDraft, dob } })),

  completeOnboarding: async () => {
    const { onboardingDraft } = get();
    const rawHandle = onboardingDraft.handle || "you";
    const handle = rawHandle.startsWith("@") ? rawHandle : `@${rawHandle}`;
    set((s) => ({
      isOnboarded: true,
      user: {
        ...s.user,
        handle,
        displayName: rawHandle,
        isPrivate: onboardingDraft.isPrivate,
      },
    }));
    await updateProfile(handle, onboardingDraft.isPrivate, onboardingDraft.dob || undefined);
  },

  setSubscribed: (next) => set((s) => ({ user: { ...s.user, isSubscribed: next } })),
  setPaywallVisible: (next) => set({ showPaywall: next }),
  setCreateWagerVisible: (next) => set({ showCreateWager: next }),
  setCreateWagerContext: (ctx) => set({ createWagerContext: ctx }),

  createWager: async ({ activity, amount, opponentHandle, termsText, isPublic, paymentMethod, paymentHandle, sport, betType, groupId, parentWagerId }) => {
    const state = get();
    if (!state.user.isSubscribed) {
      set({ showPaywall: true });
      return;
    }

    // Responsible gambling check
    if (state.gamblingSettings) {
      const { blocked, reason } = checkWagerBlocked(amount, state.gamblingSettings, state.wageredTotals);
      if (blocked) throw new Error(reason);
    }
    const normalizedOpponent = opponentHandle.startsWith("@")
      ? opponentHandle
      : `@${opponentHandle}`;
    const wager = await createWagerRecord({
      activity,
      amount,
      opponentHandle: normalizedOpponent,
      termsText,
      isPublic,
      paymentMethod,
      paymentHandle: paymentHandle.trim() || undefined,
      sport,
      betType,
      groupId,
      parentWagerId,
    });
    const newWager: Wager = {
      ...wager,
      opponentDisplayName: normalizedOpponent,
      termsText,
      paymentMethod,
      paymentHandle: paymentHandle.trim() || undefined,
      sport,
      betType,
      groupId,
      parentWagerId,
      createdAt: new Date().toISOString(),
    };
    const post: FeedPost = {
      id: `post_${Date.now()}`,
      wagerId: newWager.id,
      type: "challenge",
      authorHandle: state.user.handle,
      authorDisplayName: state.user.displayName,
      opponentHandle: normalizedOpponent,
      opponentDisplayName: normalizedOpponent,
      activity,
      amount,
      status: "PENDING",
      isPublic,
      reactions: { fire: 0, hundred: 0, laughing: 0, shocked: 0 },
      comments: 0,
      createdAt: new Date().toISOString(),
      termsText,
    };
    set((curr) => ({
      wagers: [newWager, ...curr.wagers],
      feed: isPublic ? [post, ...curr.feed] : curr.feed,
      showCreateWager: false,
      user: {
        ...curr.user,
        activeWagerCount: curr.user.activeWagerCount + 1,
      },
    }));
  },

  markWagerSettled: async (wagerId, winnerHandle) => {
    set((s) => ({
      wagers: s.wagers.map((w) =>
        w.id === wagerId ? { ...w, status: "SETTLED", winnerHandle } : w
      ),
    }));
    await settleWager(wagerId, winnerHandle);
  },

  declareResult: async (wagerId, winnerHandle) => {
    const me = get().user.handle;
    set((s) => ({
      wagers: s.wagers.map((w) =>
        w.id === wagerId
          ? { ...w, status: "AWAITING_RESULT", winnerHandle, declarerHandle: me }
          : w
      ),
    }));
    await declareWagerResult(wagerId, winnerHandle);
  },

  confirmResult: async (wagerId) => {
    set((s) => ({
      wagers: s.wagers.map((w) =>
        w.id === wagerId ? { ...w, status: "SETTLED" } : w
      ),
    }));
    await confirmWagerResult(wagerId);
  },

  disputeResult: async (wagerId) => {
    set((s) => ({
      wagers: s.wagers.map((w) =>
        w.id === wagerId ? { ...w, status: "DISPUTED" } : w
      ),
    }));
    await disputeWagerResult(wagerId);
  },

  hydrateFromBackend: async () => {
    set({ isLoading: true });
    const [data, profile, notifications, followingHandles, gamblingSettings, wageredTotals] = await Promise.all([
      loadInitialData(),
      loadProfile(),
      loadNotifications(),
      loadFollowingHandles(),
      loadGamblingSettings(),
      getWageredTotals(),
    ]);
    set((s) => ({
      feed: data.feed as FeedPost[],
      wagers: data.wagers,
      notifications: notifications.length > 0 ? notifications : s.notifications,
      followingHandles,
      user: profile
        ? {
            ...s.user,
            handle: profile.handle,
            displayName: profile.displayName,
            isPrivate: profile.isPrivate,
            isSubscribed: profile.isSubscribed,
            wins: profile.wins,
            losses: profile.losses,
            totalWagered: profile.totalWagered,
            followerCount: profile.followerCount,
            followingCount: profile.followingCount,
            bio: profile.bio,
            avatarUrl: profile.avatarUrl,
            activeWagerCount: data.wagers.filter(
              (w) => w.status === "ACTIVE" || w.status === "PENDING"
            ).length,
          }
        : s.user,
      gamblingSettings,
      wageredTotals,
      isLoading: false,
    }));
  },

  refreshSubscriptionStatus: async () => {
    set({ isSubscriptionSyncing: true });
    const result = await fetchSubscriptionStatus();
    set((s) => ({
      user: { ...s.user, isSubscribed: result.isSubscribed },
      isSubscriptionSyncing: false,
    }));
    return result.message;
  },

  upsertWager: (wager) =>
    set((s) => {
      const existingIndex = s.wagers.findIndex((w) => w.id === wager.id);
      const wagers =
        existingIndex === -1
          ? [wager, ...s.wagers]
          : s.wagers.map((w) => (w.id === wager.id ? { ...w, ...wager } : w));

      const activeWagerCount = wagers.filter(
        (w) => w.status === "ACTIVE" || w.status === "PENDING"
      ).length;

      return {
        wagers,
        feed: s.feed.map((post) =>
          post.wagerId === wager.id
            ? {
                ...post,
                activity: wager.activity,
                amount: wager.amount,
                status: wager.status,
                winnerHandle: wager.winnerHandle,
                termsText: wager.termsText ?? post.termsText,
                opponentHandle: wager.opponentHandle,
                opponentDisplayName:
                  wager.opponentDisplayName ?? post.opponentDisplayName,
              }
            : post
        ),
        user: {
          ...s.user,
          activeWagerCount,
        },
      };
    }),

  upsertNotification: (notification) =>
    set((s) => {
      const existingIndex = s.notifications.findIndex((n) => n.id === notification.id);
      const notifications =
        existingIndex === -1
          ? [notification, ...s.notifications]
          : s.notifications.map((n) =>
              n.id === notification.id ? { ...n, ...notification } : n
            );

      notifications.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return { notifications };
    }),

  patchFeedPost: (postId, patch) =>
    set((s) => ({
      feed: s.feed.map((post) => (post.id === postId ? { ...post, ...patch } : post)),
    })),

  toggleFollowForHandle: async (handle) => {
    const normalized = handle.startsWith("@") ? handle : `@${handle}`;
    const state = get();
    const currentlyFollowing = state.followingHandles.includes(normalized);

    set((s) => ({
      followingHandles: currentlyFollowing
        ? s.followingHandles.filter((h) => h !== normalized)
        : [normalized, ...s.followingHandles],
      user: {
        ...s.user,
        followingCount: currentlyFollowing
          ? Math.max(0, s.user.followingCount - 1)
          : s.user.followingCount + 1,
      },
    }));

    const result = currentlyFollowing
      ? await unfollowUserByHandle(normalized)
      : await followUserByHandle(normalized);

    if (result.ok) return;

    // rollback optimistic update if backend call fails
    set((s) => ({
      followingHandles: currentlyFollowing
        ? [normalized, ...s.followingHandles]
        : s.followingHandles.filter((h) => h !== normalized),
      user: {
        ...s.user,
        followingCount: currentlyFollowing
          ? s.user.followingCount + 1
          : Math.max(0, s.user.followingCount - 1),
      },
    }));
  },

  respondToChallenge: async (wagerId, action) => {
    const nextStatus = action === "accept" ? "ACTIVE" : "VOIDED";
    const stateBefore = get();

    set((s) => ({
      wagers: s.wagers.map((w) =>
        w.id === wagerId ? { ...w, status: nextStatus } : w
      ),
      feed: s.feed.map((post) =>
        post.wagerId === wagerId || post.id === wagerId
          ? { ...post, status: nextStatus }
          : post
      ),
      user: {
        ...s.user,
        activeWagerCount:
          action === "accept"
            ? s.user.activeWagerCount
            : Math.max(0, s.user.activeWagerCount - 1),
      },
    }));

    const result = await respondToChallenge(wagerId, action);
    if (result.ok) return;

    // rollback optimistic update if write fails
    set({
      wagers: stateBefore.wagers,
      feed: stateBefore.feed,
      user: stateBefore.user,
    });
  },

  markNotificationRead: async (id) => {
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
    await markNotificationAsRead(id);
  },

  markAllNotificationsRead: async () => {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    }));
    await markAllNotificationsAsRead();
  },

  toggleReaction: async (postId, reaction) => {
    set((s) => ({
      feed: s.feed.map((p) =>
        p.id === postId
          ? { ...p, reactions: { ...p.reactions, [reaction]: p.reactions[reaction] + 1 } }
          : p
      ),
    }));

    const persistedReactions = await reactToFeedPost(postId, reaction);
    if (!persistedReactions) return;

    set((s) => ({
      feed: s.feed.map((p) =>
        p.id === postId ? { ...p, reactions: persistedReactions } : p
      ),
    }));
  },

  refreshGamblingSettings: async () => {
    const [settings, totals] = await Promise.all([
      loadGamblingSettings(),
      getWageredTotals(),
    ]);
    set({ gamblingSettings: settings, wageredTotals: totals });
  },

  saveGamblingLimits: async (daily, weekly, monthly) => {
    const result = await saveGamblingLimits(daily, weekly, monthly);
    if (result.ok) {
      set((s) => ({
        gamblingSettings: s.gamblingSettings
          ? { ...s.gamblingSettings, dailyLimit: daily, weeklyLimit: weekly, monthlyLimit: monthly }
          : null,
      }));
    }
    return result;
  },

  activateSelfExclusion: async (days) => {
    const result = await setSelfExclusion(days);
    if (result.ok) {
      const excludedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      set((s) => ({
        gamblingSettings: s.gamblingSettings
          ? { ...s.gamblingSettings, excludedUntil }
          : null,
      }));
    }
    return result;
  },

  loadGroups: async () => {
    const groups = await fetchMyGroups();
    set({ groups });
  },

  createGroup: async (name) => {
    const group = await createGroupService(name);
    if (group) {
      set((s) => ({ groups: [group, ...s.groups] }));
    }
    return group;
  },

  joinGroup: async (code) => {
    const result = await joinGroupByCode(code);
    if (result.ok && result.group) {
      const group = result.group;
      set((s) => {
        const existingIndex = s.groups.findIndex((g) => g.id === group.id);
        const groups =
          existingIndex === -1
            ? [group, ...s.groups]
            : s.groups.map((g) => (g.id === group.id ? { ...g, ...group } : g));
        return { groups };
      });
    }
    return { ok: result.ok, message: result.message };
  },

  leaveGroup: async (groupId) => {
    const result = await leaveGroupService(groupId);
    if (result.ok) {
      set((s) => ({ groups: s.groups.filter((g) => g.id !== groupId) }));
    }
    return result;
  },

  markAsPaid: async (wagerId) => {
    set((s) => ({
      wagers: s.wagers.map((w) =>
        w.id === wagerId ? { ...w, isPaid: true, paidAt: new Date().toISOString() } : w
      ),
    }));
    await markWagerPaid(wagerId);
  },

  upsertGroup: (group) =>
    set((s) => {
      const existingIndex = s.groups.findIndex((g) => g.id === group.id);
      const groups =
        existingIndex === -1
          ? [group, ...s.groups]
          : s.groups.map((g) => (g.id === group.id ? { ...g, ...group } : g));
      return { groups };
    }),
}));
