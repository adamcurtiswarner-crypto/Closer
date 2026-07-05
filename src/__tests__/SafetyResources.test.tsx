jest.mock('@/services/analytics', () => ({ logEvent: jest.fn() }));

import React from 'react';
import { Linking } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { SafetyResources, getSafetyResources } from '../components/SafetyResources';
import { logEvent } from '@/services/analytics';

describe('SafetyResources', () => {
  let mockOpenURL: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    mockOpenURL.mockRestore();
  });

  it('renders the quiet heading and brand-voice copy', () => {
    const { getByText } = render(<SafetyResources visible onClose={jest.fn()} />);
    expect(getByText('If things feel heavy')).toBeTruthy();
    expect(
      getByText(/Some things deserve more support than a prompt can offer/)
    ).toBeTruthy();
  });

  it('renders the curated resources (crisis line, text line, therapist finder)', () => {
    const { getByText } = render(<SafetyResources visible onClose={jest.fn()} />);
    expect(getByText('988 Suicide & Crisis Lifeline')).toBeTruthy();
    expect(getByText('Crisis Text Line')).toBeTruthy();
    expect(getByText('National Domestic Violence Hotline')).toBeTruthy();
    expect(getByText('ReGain')).toBeTruthy();
  });

  it('dismisses with the single Okay pill', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(<SafetyResources visible onClose={onClose} />);
    fireEvent.press(getByTestId('safety-resources-dismiss'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('opens the crisis line as a tel: link and logs the tap', () => {
    const { getByTestId } = render(<SafetyResources visible onClose={jest.fn()} />);
    fireEvent.press(getByTestId('safety-resource-lifeline_988'));
    expect(mockOpenURL).toHaveBeenCalledWith('tel:988');
    expect(logEvent).toHaveBeenCalledWith('resource_link_opened', {
      resource_id: 'lifeline_988',
      category: 'crisis_support',
    });
  });

  it('opens the therapist finder as a regular URL', () => {
    const { getByTestId } = render(<SafetyResources visible onClose={jest.fn()} />);
    fireEvent.press(getByTestId('safety-resource-regain'));
    expect(mockOpenURL).toHaveBeenCalledWith('https://www.regain.us');
  });

  it('logs safety_resources_shown exactly once per visible presentation', () => {
    const { rerender } = render(<SafetyResources visible onClose={jest.fn()} />);
    rerender(<SafetyResources visible onClose={jest.fn()} />);

    const shownCalls = (logEvent as jest.Mock).mock.calls.filter(
      ([name]) => name === 'safety_resources_shown'
    );
    expect(shownCalls).toHaveLength(1);
  });

  it('does not log when not visible', () => {
    render(<SafetyResources visible={false} onClose={jest.fn()} />);
    expect(logEvent).not.toHaveBeenCalledWith('safety_resources_shown');
  });

  it('curated list resolves 2-4 real resources from the config', () => {
    const resources = getSafetyResources();
    expect(resources.length).toBeGreaterThanOrEqual(2);
    expect(resources.length).toBeLessThanOrEqual(4);
    for (const resource of resources) {
      expect(resource.name).toBeTruthy();
      expect(resource.url).toBeTruthy();
    }
  });
});
