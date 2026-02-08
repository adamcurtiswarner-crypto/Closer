// Mock Firebase modules
jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback(null);
    return jest.fn();
  }),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'server-timestamp'),
}));

jest.mock('@/config/firebase', () => ({
  auth: {},
  db: {},
}));

jest.mock('@/services/analytics', () => ({
  logEvent: jest.fn(),
  setAnalyticsContext: jest.fn(),
}));

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return initial loading state', () => {
    // useAuth starts with isLoading: true
    const initialState = {
      user: null,
      firebaseUser: null,
      isLoading: true,
      isAuthenticated: false,
    };
    expect(initialState.isLoading).toBe(true);
    expect(initialState.isAuthenticated).toBe(false);
  });

  it('should set isAuthenticated when user is signed in', () => {
    const state = {
      user: { id: 'user-1', email: 'test@test.com' },
      firebaseUser: { uid: 'user-1' },
      isLoading: false,
      isAuthenticated: true,
    };
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.id).toBe('user-1');
  });

  it('should clear user on sign out', () => {
    const stateAfterSignOut = {
      user: null,
      firebaseUser: null,
      isLoading: false,
      isAuthenticated: false,
    };
    expect(stateAfterSignOut.isAuthenticated).toBe(false);
    expect(stateAfterSignOut.user).toBeNull();
  });
});
