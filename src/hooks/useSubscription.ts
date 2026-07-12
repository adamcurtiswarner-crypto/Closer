import { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
} from 'react-native-purchases';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { logger } from '@/utils/logger';
import { useAuth } from './useAuth';
import { useCouple } from './useCouple';
import { configurePurchases, isPurchasesConfigured } from '@/config/purchases';

const PREMIUM_ENTITLEMENT = 'premium';
/** Couple-scoped subscription docs change rarely — cache for five minutes. */
const COUPLE_SUBSCRIPTION_STALE_MS = 5 * 60 * 1000;

// Offerings being unavailable is an EXPECTED state on fresh free accounts
// (RC unconfigured, products not yet approved, sandbox hiccups). It must
// never produce error-level noise or a retry storm — one quiet warn per
// session, and the paywall's user-facing "plans aren't loading" state
// (offeringError) carries it from there.
let offeringsWarnedThisSession = false;
function warnOfferingsUnavailableOnce(context: string, error?: unknown): void {
  if (offeringsWarnedThisSession) return;
  offeringsWarnedThisSession = true;
  logger.warn(
    `[useSubscription] offerings unavailable (${context}) — treating as free; paywall shows its retry state`,
    error ?? ''
  );
}

/** Test-only escape hatch for the once-per-session warn guard. */
export function resetOfferingsWarnForTests(): void {
  offeringsWarnedThisSession = false;
}

interface SubscriptionState {
  isPremium: boolean;
  isLoading: boolean;
  offering: PurchasesOffering | null;
  offeringError: boolean;
  refreshOffering: () => Promise<void>;
  purchase: (pkg: PurchasesPackage) => Promise<void>;
  restore: () => Promise<void>;
}

/** Minimal shape of a /subscriptions doc for the active check. */
export interface SubscriptionDocSummary {
  status: string | null;
  /** expires_at in epoch ms; null means no expiry recorded (treated active). */
  expiresAtMs: number | null;
}

/**
 * Is a /subscriptions doc (written by the RevenueCat webhook) currently
 * active? Cancelled subs stay active until expires_at lapses server-side,
 * so only status 'active' with a live (or absent) expiry counts here.
 */
export function isSubscriptionDocActive(
  docSummary: SubscriptionDocSummary,
  now: Date = new Date()
): boolean {
  if (docSummary.status !== 'active') return false;
  if (docSummary.expiresAtMs == null) return true;
  return docSummary.expiresAtMs > now.getTime();
}

export interface PremiumSignals {
  /** This user's own RevenueCat entitlement. */
  revenueCatPremium: boolean;
  /** couples/{id}.premium_until — set by the webhook for both members. */
  couplePremiumUntil: Date | null;
  /** Any active /subscriptions doc carrying this couple_id. */
  coupleSubscriptionActive: boolean;
  /** Dev-only override (env-gated) — see FORCE_PREMIUM below. */
  forcePremium: boolean;
}

/**
 * Couple-scoped entitlement: "One subscription. Both of you."
 * The partner of a subscriber is premium through the couple doc or the
 * couple-scoped subscription doc, without any RevenueCat entitlement of
 * their own.
 */
export function computeIsPremium(
  signals: PremiumSignals,
  now: Date = new Date()
): boolean {
  if (signals.forcePremium) return true;
  if (signals.revenueCatPremium) return true;
  if (signals.couplePremiumUntil != null && signals.couplePremiumUntil > now) {
    return true;
  }
  return signals.coupleSubscriptionActive;
}

// Dev override for testing the premium experience. Unlike the old bare
// __DEV__ OR, this stays off by default so the FREE experience is testable
// in dev; set EXPO_PUBLIC_FORCE_PREMIUM=true to flip it. Never active in
// release builds.
const FORCE_PREMIUM =
  __DEV__ && process.env.EXPO_PUBLIC_FORCE_PREMIUM === 'true';

export function useSubscription(): SubscriptionState {
  const { user } = useAuth();
  const { data: couple, isLoading: coupleLoading } = useCouple();
  const [revenueCatPremium, setRevenueCatPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [offeringError, setOfferingError] = useState(false);

  // Couple-scoped subscription doc (written by the RevenueCat webhook,
  // functions/src/admin.ts). Rules allow couple-member reads, so the
  // partner of the subscriber resolves premium even before the couple
  // doc's premium_until mirror lands.
  const coupleSubscription = useQuery({
    queryKey: ['coupleSubscription', user?.coupleId],
    queryFn: async (): Promise<boolean> => {
      const subsQuery = query(
        collection(db, 'subscriptions'),
        where('couple_id', '==', user!.coupleId)
      );
      const snap = await getDocs(subsQuery);
      const now = new Date();
      return snap.docs.some((docSnap) => {
        const data = docSnap.data();
        return isSubscriptionDocActive(
          {
            status: typeof data.status === 'string' ? data.status : null,
            expiresAtMs:
              data.expires_at && typeof data.expires_at.toMillis === 'function'
                ? data.expires_at.toMillis()
                : null,
          },
          now
        );
      });
    },
    enabled: !!user?.coupleId,
    staleTime: COUPLE_SUBSCRIPTION_STALE_MS,
  });

  const isPremium = computeIsPremium({
    revenueCatPremium,
    couplePremiumUntil: couple?.premiumUntil ?? null,
    coupleSubscriptionActive: coupleSubscription.data === true,
    forcePremium: FORCE_PREMIUM,
  });

  // Loading covers every entitlement source — gates stay open until all of
  // them have resolved so premium couples never see a flash of locks.
  const entitlementLoading =
    isLoading ||
    (!!user?.coupleId && (coupleLoading || coupleSubscription.isLoading));

  // Configure and check status on mount
  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function init() {
      try {
        await configurePurchases(user!.id);

        // RC never configured (no API key — e.g. local dev): a quiet
        // expected state. Skip the SDK calls entirely so the entitlement
        // check can't throw-and-log, and let the paywall react via
        // offeringError. No retry — the next app session tries again.
        if (!isPurchasesConfigured()) {
          if (!cancelled) setOfferingError(true);
          return;
        }

        const customerInfo = await Purchases.getCustomerInfo();
        if (!cancelled) {
          setRevenueCatPremium(
            customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined
          );
        }

        const offerings = await Purchases.getOfferings();
        if (!cancelled) {
          if (offerings.current) {
            setOffering(offerings.current);
          } else {
            warnOfferingsUnavailableOnce('no current offering');
            setOfferingError(true);
          }
        }
      } catch (error) {
        // RevenueCat unavailable — default to free, warn once (never
        // error-level), and surface the failure so the paywall can react.
        warnOfferingsUnavailableOnce('init', error);
        if (!cancelled) setOfferingError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    init();

    // Listen for customer info changes
    const listener = (info: CustomerInfo) => {
      setRevenueCatPremium(
        info.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined
      );
    };
    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      cancelled = true;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [user?.id]);

  // User-initiated retry from the paywall — the only re-fetch path. There
  // is deliberately no automatic retry loop around getOfferings.
  const refreshOffering = useCallback(async () => {
    setOfferingError(false);
    if (!isPurchasesConfigured()) {
      setOfferingError(true);
      return;
    }
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current) {
        setOffering(offerings.current);
      } else {
        setOfferingError(true);
      }
    } catch (error) {
      // Quiet by design — the paywall's inline state is the surface.
      warnOfferingsUnavailableOnce('refresh', error);
      setOfferingError(true);
    }
  }, []);

  const purchase = useCallback(async (pkg: PurchasesPackage) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      setRevenueCatPremium(
        customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined
      );
    } catch (error: any) {
      if (!error.userCancelled) {
        Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
      }
    }
  }, []);

  const restore = useCallback(async () => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      const restored =
        customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;
      setRevenueCatPremium(restored);
      if (!restored) {
        Alert.alert('No Purchases Found', 'No previous purchases were found to restore.');
      }
    } catch (error) {
      Alert.alert('Restore Failed', 'Something went wrong. Please try again.');
    }
  }, []);

  return {
    isPremium,
    isLoading: entitlementLoading,
    offering,
    offeringError,
    refreshOffering,
    purchase,
    restore,
  };
}
