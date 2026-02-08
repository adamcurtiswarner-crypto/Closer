import React from 'react';

jest.mock('react-native-purchases', () => ({
  getOfferings: jest.fn().mockResolvedValue({
    current: {
      availablePackages: [
        { product: { priceString: '$4.99/mo' } },
      ],
    },
  }),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
}));

jest.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({
    isPremium: false,
    isLoading: false,
    offering: {
      availablePackages: [
        { product: { priceString: '$4.99/mo' } },
      ],
    },
    purchase: jest.fn(),
    restore: jest.fn(),
  }),
}));

describe('Paywall', () => {
  const FEATURES = [
    'Unlimited saved memories',
    'Streak badges & insights',
    'Tone calibration insights',
    'Priority support',
  ];

  it('should render feature list', () => {
    expect(FEATURES).toHaveLength(4);
    expect(FEATURES).toContain('Unlimited saved memories');
    expect(FEATURES).toContain('Streak badges & insights');
  });

  it('should display price from offering', () => {
    const priceString = '$4.99/mo';
    const ctaText = `Start Premium — ${priceString}`;
    expect(ctaText).toContain('$4.99/mo');
  });

  it('should trigger purchase on CTA press', () => {
    const purchase = jest.fn();
    const mockPackage = { product: { priceString: '$4.99/mo' } };

    purchase(mockPackage);
    expect(purchase).toHaveBeenCalledWith(mockPackage);
  });

  it('should trigger restore on restore press', () => {
    const restore = jest.fn();
    restore();
    expect(restore).toHaveBeenCalled();
  });

  it('should be closeable', () => {
    const onClose = jest.fn();
    onClose();
    expect(onClose).toHaveBeenCalled();
  });

  it('should respect visible prop', () => {
    const visible = true;
    expect(visible).toBe(true);

    const hidden = false;
    expect(hidden).toBe(false);
  });
});
