import Purchases, { LOG_LEVEL, PurchasesPackage } from "react-native-purchases";

const API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? "";
const ENTITLEMENT_ID = "RATPAC Pro";

export function initRevenueCat() {
  if (!API_KEY_IOS) return;
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey: API_KEY_IOS });
}

export async function fetchSubscriptionStatus(): Promise<{
  isSubscribed: boolean;
  message: string;
}> {
  if (!API_KEY_IOS) {
    return { isSubscribed: false, message: "RevenueCat not configured. Running in demo mode." };
  }
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const isSubscribed =
      customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    return {
      isSubscribed,
      message: isSubscribed ? "Subscription active." : "No active subscription.",
    };
  } catch {
    return { isSubscribed: false, message: "Could not fetch subscription status." };
  }
}

export async function getOfferings(): Promise<PurchasesPackage | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.monthly ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch the win-back promotional offering.
 * In RevenueCat dashboard: create an offering called "win_back" with a
 * weekly package pointing to your $0.99/week App Store promotional offer.
 * In App Store Connect: Subscription > Add Promotional Offer > Pay as you go
 * $0.99/week for 4 pay periods, ref name "win_back_099".
 */
export async function getWinBackOffering(): Promise<PurchasesPackage | null> {
  if (!API_KEY_IOS) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return (
      offerings.all["win_back"]?.weekly ??
      offerings.all["win_back"]?.monthly ??
      null
    );
  } catch {
    return null;
  }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isSubscribed =
      customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    return {
      ok: isSubscribed,
      message: isSubscribed ? "Subscription active." : "Purchase completed but entitlement not found.",
    };
  } catch (e: any) {
    if (e?.userCancelled) {
      return { ok: false, message: "Purchase cancelled." };
    }
    return { ok: false, message: e?.message ?? "Purchase failed." };
  }
}

export async function restorePurchases(): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isSubscribed =
      customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    return {
      ok: isSubscribed,
      message: isSubscribed ? "Subscription restored." : "No subscription found to restore.",
    };
  } catch (e: any) {
    return { ok: false, message: e?.message ?? "Restore failed." };
  }
}
