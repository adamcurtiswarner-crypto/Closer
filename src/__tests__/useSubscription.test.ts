jest.mock('react-native-purchases', () => ({
  configure: jest.fn(),
  logIn: jest.fn(),
  getCustomerInfo: jest.fn().mockResolvedValue({
    entitlements: {
      active: {},
    },
  }),
  getOfferings: jest.fn().mockResolvedValue({
    current: {
      availablePackages: [
        {
          product: { priceString: '$4.99/mo' },
        },
      ],
    },
  }),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
  addCustomerInfoUpdateListener: jest.fn(),
  removeCustomerInfoUpdateListener: jest.fn(),
}));

jest.mock('@/config/purchases', () => ({
  configurePurchases: jest.fn(),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
  }),
}));

jest.mock('@/hooks/useCouple', () => ({
  useCouple: () => ({ data: null, isLoading: false }),
}));

jest.mock('@/config/firebase', () => ({ db: {}, functions: {} }));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
}));

import Purchases from 'react-native-purchases';
import {
  computeIsPremium,
  isSubscriptionDocActive,
} from '@/hooks/useSubscription';

describe('useSubscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should default to non-premium when no entitlements', async () => {
    const customerInfo = await Purchases.getCustomerInfo();
    const isPremium = customerInfo.entitlements.active['premium'] !== undefined;
    expect(isPremium).toBe(false);
  });

  it('should detect premium when entitlement is active', async () => {
    (Purchases.getCustomerInfo as jest.Mock).mockResolvedValueOnce({
      entitlements: {
        active: {
          premium: { identifier: 'premium', isActive: true },
        },
      },
    });

    const customerInfo = await Purchases.getCustomerInfo();
    const isPremium = customerInfo.entitlements.active['premium'] !== undefined;
    expect(isPremium).toBe(true);
  });

  it('should call purchasePackage on purchase', async () => {
    const mockPackage = { product: { priceString: '$4.99' } };
    (Purchases.purchasePackage as jest.Mock).mockResolvedValueOnce({
      customerInfo: {
        entitlements: {
          active: {
            premium: { identifier: 'premium' },
          },
        },
      },
    });

    const result = await Purchases.purchasePackage(mockPackage as any);
    expect(Purchases.purchasePackage).toHaveBeenCalledWith(mockPackage);
    expect(result.customerInfo.entitlements.active['premium']).toBeDefined();
  });

  it('should call restorePurchases on restore', async () => {
    (Purchases.restorePurchases as jest.Mock).mockResolvedValueOnce({
      entitlements: { active: {} },
    });

    const result = await Purchases.restorePurchases();
    expect(Purchases.restorePurchases).toHaveBeenCalled();
    expect(result.entitlements.active['premium']).toBeUndefined();
  });
});

describe('computeIsPremium (couple-scoped entitlement)', () => {
  const now = new Date('2026-07-09T12:00:00Z');
  const freeSignals = {
    revenueCatPremium: false,
    couplePremiumUntil: null,
    coupleSubscriptionActive: false,
    forcePremium: false,
  };

  it('is free when no signal is present', () => {
    expect(computeIsPremium(freeSignals, now)).toBe(false);
  });

  it('is premium with an own RevenueCat entitlement', () => {
    expect(
      computeIsPremium({ ...freeSignals, revenueCatPremium: true }, now)
    ).toBe(true);
  });

  it('makes the PARTNER of a subscriber premium via couples.premium_until', () => {
    expect(
      computeIsPremium(
        { ...freeSignals, couplePremiumUntil: new Date('2026-08-01T00:00:00Z') },
        now
      )
    ).toBe(true);
  });

  it('lapses when couples.premium_until is in the past', () => {
    expect(
      computeIsPremium(
        { ...freeSignals, couplePremiumUntil: new Date('2026-07-01T00:00:00Z') },
        now
      )
    ).toBe(false);
  });

  it('makes the partner premium via an active couple-scoped subscription doc', () => {
    expect(
      computeIsPremium({ ...freeSignals, coupleSubscriptionActive: true }, now)
    ).toBe(true);
  });

  it('honors the env-gated dev override', () => {
    expect(computeIsPremium({ ...freeSignals, forcePremium: true }, now)).toBe(true);
  });
});

describe('isSubscriptionDocActive (webhook-written /subscriptions doc)', () => {
  const now = new Date('2026-07-09T12:00:00Z');

  it('is active with status active and a future expiry', () => {
    expect(
      isSubscriptionDocActive(
        { status: 'active', expiresAtMs: now.getTime() + 86400000 },
        now
      )
    ).toBe(true);
  });

  it('is active with status active and no recorded expiry', () => {
    expect(isSubscriptionDocActive({ status: 'active', expiresAtMs: null }, now)).toBe(
      true
    );
  });

  it('is inactive once the expiry has passed', () => {
    expect(
      isSubscriptionDocActive(
        { status: 'active', expiresAtMs: now.getTime() - 1000 },
        now
      )
    ).toBe(false);
  });

  it('is inactive for cancelled, expired, or missing status', () => {
    expect(
      isSubscriptionDocActive({ status: 'cancelled', expiresAtMs: null }, now)
    ).toBe(false);
    expect(
      isSubscriptionDocActive({ status: 'expired', expiresAtMs: null }, now)
    ).toBe(false);
    expect(isSubscriptionDocActive({ status: null, expiresAtMs: null }, now)).toBe(
      false
    );
  });
});
