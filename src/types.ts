export type WagerStatus =
  | "PENDING"
  | "ACTIVE"
  | "AWAITING_RESULT"
  | "DISPUTED"
  | "SETTLED"
  | "VOIDED"
  | "EXPIRED";

export type Reactions = {
  fire: number;
  hundred: number;
  laughing: number;
  shocked: number;
};

export type FeedPost = {
  id: string;
  wagerId?: string;
  type: "challenge" | "active" | "settled" | "milestone";
  authorId?: string;
  authorHandle: string;
  authorDisplayName: string;
  opponentHandle: string;
  opponentDisplayName: string;
  activity: string;
  amount: number;
  status: WagerStatus;
  winnerHandle?: string;
  termsText?: string;
  isPublic: boolean;
  reactions: Reactions;
  comments: number;
  createdAt: string;
};

export type PaymentMethod = "Venmo" | "Cash App" | "PayPal" | "Other";

export type Wager = {
  id: string;
  activity: string;
  amount: number;
  opponentHandle: string;
  opponentDisplayName?: string;
  status: WagerStatus;
  winnerHandle?: string;
  declarerHandle?: string;
  termsText?: string;
  createdAt?: string;
  paymentMethod?: PaymentMethod;
  paymentHandle?: string;
};

export type UserProfile = {
  handle: string;
  displayName: string;
  isPrivate: boolean;
  isSubscribed: boolean;
  wins: number;
  losses: number;
  totalWagered: number;
  activeWagerCount: number;
  followerCount: number;
  followingCount: number;
};

export type NotificationType =
  | "CHALLENGE_RECEIVED"
  | "CHALLENGE_ACCEPTED"
  | "CHALLENGE_DECLINED"
  | "WAGER_SETTLED_WIN"
  | "WAGER_SETTLED_LOSS"
  | "WAGER_VOIDED"
  | "RESULT_CONFIRM_REQUEST"
  | "RESULT_DISPUTED"
  | "WAGER_EXPIRED"
  | "NEW_FOLLOWER"
  | "FOLLOW_REQUEST"
  | "COMMENT"
  | "TEAM_INVITE";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  referenceId?: string;
};

export type Activity = {
  id: string;
  name: string;
  icon: string;
};
