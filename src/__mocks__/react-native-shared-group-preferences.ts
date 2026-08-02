const SharedGroupPreferences = {
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
};

export default SharedGroupPreferences;
