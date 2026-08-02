import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

jest.mock('@/components/ToneShapes', () => ({ ToneShapes: () => null }));

jest.mock('@utils/haptics', () => ({
  hapticImpact: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

// Resolve t() against the real en.json so tests assert shipped copy.
jest.mock('react-i18next', () => {
  const en = require('../i18n/locales/en.json');
  const lookup = (key: string): unknown =>
    key.split('.').reduce<any>((obj, part) => (obj ? obj[part] : undefined), en);
  return {
    useTranslation: () => ({
      t: (key: string, options?: Record<string, unknown>) => {
        let value = lookup(key);
        if (typeof value !== 'string' && typeof options?.count === 'number') {
          value = lookup(`${key}_${options.count === 1 ? 'one' : 'other'}`);
        }
        if (typeof value !== 'string') return key;
        if (options) {
          Object.entries(options).forEach(([name, v]) => {
            value = (value as string).replace(`{{${name}}}`, String(v));
          });
        }
        return value;
      },
    }),
  };
});

import { RespondingScreen } from '../components/RespondingScreen';

function renderScreen(overrides: Partial<React.ComponentProps<typeof RespondingScreen>> = {}) {
  const props = {
    promptText: 'What does the hard part look like?',
    responseText: '',
    onChangeText: jest.fn(),
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
    isPending: false,
    ...overrides,
  };
  return { ...render(<RespondingScreen {...props} />), props };
}

describe('RespondingScreen (ink hero design, 2026-08-02)', () => {
  it('renders the prompt unquoted — one design language for every prompt', () => {
    const { getByText, queryByText } = renderScreen();
    expect(getByText('What does the hard part look like?')).toBeTruthy();
    expect(queryByText(/[“”]/)).toBeNull();
  });

  it('has no add-photo affordance (founder ask)', () => {
    const { queryByText } = renderScreen();
    expect(queryByText('Add photo')).toBeNull();
  });

  it('shows the trail — original question and both scores — above a follow-up', () => {
    const { getByTestId, getByText } = renderScreen({
      contextText: 'About yesterday’s answer. Take it slow.',
      trail: {
        promptText: 'How fair does the money feel right now?',
        metaLine: 'You 3 · Masha 8',
      },
    });
    expect(getByTestId('responding-trail')).toBeTruthy();
    expect(getByText('How fair does the money feel right now?')).toBeTruthy();
    expect(getByText('You 3 · Masha 8')).toBeTruthy();
    expect(getByText('About yesterday’s answer. Take it slow.')).toBeTruthy();
  });

  it('renders no trail block for ordinary prompts', () => {
    const { queryByTestId } = renderScreen();
    expect(queryByTestId('responding-trail')).toBeNull();
  });

  it('tolerates a trail without scores (text-prompt parent)', () => {
    const { getByTestId, queryByText } = renderScreen({
      trail: { promptText: 'A text question', metaLine: null },
    });
    expect(getByTestId('responding-trail')).toBeTruthy();
    expect(queryByText(/·/)).toBeNull();
  });

  it('keeps the 10-character gate and quiet hint copy', () => {
    const { getByText } = renderScreen({ responseText: 'short' });
    expect(getByText('5 more characters')).toBeTruthy();
  });

  it('scale mode: slider shown, note optional, submit gated on the score', () => {
    const onSubmit = jest.fn();
    const { getByText, queryByText, rerender } = render(
      <RespondingScreen
        promptText="How connected did today feel?"
        responseText=""
        onChangeText={jest.fn()}
        onSubmit={onSubmit}
        onCancel={jest.fn()}
        isPending={false}
        scale={{ config: null, value: null, onChange: jest.fn() }}
      />
    );
    // Score not chosen: gated with the quiet hint, no char-count nag.
    expect(getByText('Choose a number first')).toBeTruthy();
    expect(queryByText(/more characters/)).toBeNull();
    fireEvent.press(getByText('Share'));
    expect(onSubmit).not.toHaveBeenCalled();

    // Score chosen: note stays optional, submit unlocks.
    rerender(
      <RespondingScreen
        promptText="How connected did today feel?"
        responseText=""
        onChangeText={jest.fn()}
        onSubmit={onSubmit}
        onCancel={jest.fn()}
        isPending={false}
        scale={{ config: null, value: 7, onChange: jest.fn() }}
      />
    );
    expect(getByText('Ready to share')).toBeTruthy();
    fireEvent.press(getByText('Share'));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('submits and cancels through the footer buttons', () => {
    const { getByText, props } = renderScreen({
      responseText: 'long enough answer',
    });
    fireEvent.press(getByText('Share'));
    expect(props.onSubmit).toHaveBeenCalled();
    fireEvent.press(getByText('Back'));
    expect(props.onCancel).toHaveBeenCalled();
  });
});
