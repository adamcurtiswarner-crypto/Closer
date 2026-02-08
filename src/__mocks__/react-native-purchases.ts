const Purchases = {
  configure: jest.fn(),
  logIn: jest.fn(),
  getCustomerInfo: jest.fn().mockResolvedValue({
    entitlements: { active: {} },
  }),
  getOfferings: jest.fn().mockResolvedValue({
    current: {
      availablePackages: [{ product: { priceString: '$4.99/mo' } }],
    },
  }),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
  addCustomerInfoUpdateListener: jest.fn(),
  removeCustomerInfoUpdateListener: jest.fn(),
};

export default Purchases;
export { Purchases };
