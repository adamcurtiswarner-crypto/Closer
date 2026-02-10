import { useEffect, useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
} from 'react-native-purchases';
import { useAuth } from './useAuth';
import { configurePurchases } from '@/config/purchases';

const PREMIUM_ENTITLEMENT = 'premium';

interface SubscriptionState {
  isPremium: boolean;
  isLoading: boolean;
  offering: PurchasesOffering | null;
  purchase: (pkg: PurchasesPackage) => Promise<void>;
  restore: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const { user } = useAuth();
  // TODO: Remove DEV override before production
  const [isPremium, setIsPremium] = useState(__DEV__ ? true : false);
  const [isLoading, setIsLoading] = useState(true);
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);

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

        const customerInfo = await Purchases.getCustomerInfo();
        if (!cancelled) {
          setIsPremium(
            customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined
          );
        }

        const offerings = await Purchases.getOfferings();
        if (!cancelled && offerings.current) {
          setOffering(offerings.current);
        }
      } catch (error) {
        // RevenueCat not configured or unavailable — default to free
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    init();

    // Listen for customer info changes
    const listener = (info: CustomerInfo) => {
      setIsPremium(
        info.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined
      );
    };
    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      cancelled = true;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [user?.id]);

  const purchase = useCallback(async (pkg: PurchasesPackage) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      setIsPremium(
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
      setIsPremium(restored);
      if (!restored) {
        Alert.alert('No Purchases Found', 'No previous purchases were found to restore.');
      }
    } catch (error) {
      Alert.alert('Restore Failed', 'Something went wrong. Please try again.');
    }
  }, []);

  return { isPremium, isLoading, offering, purchase, restore };
}
