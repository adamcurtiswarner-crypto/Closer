const NetInfo = {
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
  }),
  configure: jest.fn(),
};

export default NetInfo;
