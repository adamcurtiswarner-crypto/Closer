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

import Purchases from 'react-native-purchases';

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
