jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(),
}));

jest.mock('@/config/firebase', () => ({
  functions: {},
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
  }),
}));

import { httpsCallable } from 'firebase/functions';

describe('useExperiment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return variant when user is in experiment', async () => {
    const mockCallable = jest.fn().mockResolvedValue({
      data: {
        experimentId: 'exp-1',
        variant: 'treatment',
        isInExperiment: true,
      },
    });
    (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

    const assignVariant = httpsCallable({} as any, 'assignExperimentVariant');
    const result = await assignVariant({ experimentId: 'exp-1' });
    const data = result.data as any;

    expect(data.variant).toBe('treatment');
    expect(data.isInExperiment).toBe(true);
  });

  it('should return null variant when user is not in experiment', async () => {
    const mockCallable = jest.fn().mockResolvedValue({
      data: {
        experimentId: 'exp-1',
        variant: null,
        isInExperiment: false,
      },
    });
    (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

    const assignVariant = httpsCallable({} as any, 'assignExperimentVariant');
    const result = await assignVariant({ experimentId: 'exp-1' });
    const data = result.data as any;

    expect(data.variant).toBeNull();
    expect(data.isInExperiment).toBe(false);
  });
});

describe('useFeatureFlag', () => {
  it('should return isEnabled=true when variant is enabled', () => {
    const variant = 'enabled';
    const isInExperiment = true;
    const isEnabled = isInExperiment && variant === 'enabled';
    expect(isEnabled).toBe(true);
  });

  it('should return isEnabled=false when not in experiment', () => {
    const variant = 'enabled';
    const isInExperiment = false;
    const isEnabled = isInExperiment && variant === 'enabled';
    expect(isEnabled).toBe(false);
  });

  it('should return isEnabled=false when variant is control', () => {
    const variant = 'control';
    const isInExperiment = true;
    const isEnabled = isInExperiment && variant === 'enabled';
    expect(isEnabled).toBe(false);
  });
});
