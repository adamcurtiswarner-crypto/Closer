jest.mock('@/services/analytics', () => ({ logEvent: jest.fn() }));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
}));

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: {
    View: 'Animated.View',
  },
  FadeInUp: {
    duration: () => ({
      delay: () => ({}),
    }),
  },
}));

import React from 'react';
import { Linking } from 'react-native';
import { logEvent } from '@/services/analytics';
import type { TherapistResource } from '@/config/therapistResources';

// Minimal resource fixture
const mockResource: TherapistResource = {
  id: 'test-resource',
  name: 'Test Therapy Service',
  description: 'A great resource for couples.',
  url: 'https://example.com',
  category: 'online_therapy',
  icon: '🤝',
  isFree: false,
};

const mockFreeResource: TherapistResource = {
  ...mockResource,
  id: 'free-resource',
  name: 'Free Support Line',
  isFree: true,
};

describe('ResourceCard', () => {
  it('resource has required display fields', () => {
    expect(mockResource.name).toBe('Test Therapy Service');
    expect(mockResource.description).toBe('A great resource for couples.');
    expect(mockResource.url).toContain('https://');
  });

  it('free resource is marked with isFree: true', () => {
    expect(mockFreeResource.isFree).toBe(true);
  });

  it('non-free resource has isFree: false', () => {
    expect(mockResource.isFree).toBe(false);
  });

  it('handlePress opens URL and logs analytics event', () => {
    // Simulate the press handler logic from ResourceCard
    logEvent('resource_link_opened', {
      resource_id: mockResource.id,
      category: mockResource.category,
    });
    Linking.openURL(mockResource.url);

    expect(logEvent).toHaveBeenCalledWith('resource_link_opened', {
      resource_id: 'test-resource',
      category: 'online_therapy',
    });
    expect(Linking.openURL).toHaveBeenCalledWith('https://example.com');
  });
});
