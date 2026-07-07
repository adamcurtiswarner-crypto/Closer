jest.mock('@/components/Icon', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Icon: ({ name }: { name: string }) =>
      React.createElement(Text, { testID: `icon-${name}` }, name),
  };
});

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HearthEmberTile } from '../components/HearthEmberTile';

const EMOJI_PATTERN = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

describe('HearthEmberTile', () => {
  it('renders the category label, the state label, and the category icon', () => {
    const { getByText, getByTestId } = render(
      <HearthEmberTile
        label="Money"
        icon="coins"
        state="repair"
        stateLabel="Talk about it"
        onPress={jest.fn()}
      />
    );
    expect(getByText('Money')).toBeTruthy();
    expect(getByText('Talk about it')).toBeTruthy();
    expect(getByTestId('icon-coins')).toBeTruthy();
  });

  it('shows the pulsing dot only on un-tended repair tiles', () => {
    const repair = render(
      <HearthEmberTile
        label="Money"
        icon="coins"
        state="repair"
        stateLabel="Talk about it"
        onPress={jest.fn()}
      />
    );
    expect(repair.getByTestId('hearth-pulse-dot')).toBeTruthy();

    (['divergence', 'deepener', 'steady'] as const).forEach((state) => {
      const { queryByTestId, unmount } = render(
        <HearthEmberTile
          label="Money"
          icon="coins"
          state={state}
          stateLabel="Steady"
          onPress={jest.fn()}
        />
      );
      expect(queryByTestId('hearth-pulse-dot')).toBeNull();
      unmount();
    });
  });

  it('fires onPress', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <HearthEmberTile
        label="Family"
        icon="house-simple"
        state="steady"
        stateLabel="Steady"
        onPress={onPress}
      />
    );
    fireEvent.press(getByText('Family'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('carries state as a text label, never color alone', () => {
    const { getByText } = render(
      <HearthEmberTile
        label="Future dreams"
        icon="path"
        state="divergence"
        stateLabel="Compare notes"
        onPress={jest.fn()}
      />
    );
    expect(getByText('Compare notes')).toBeTruthy();
  });

  it('ships no emoji anywhere in the hearth namespace copy', () => {
    const en = require('../i18n/locales/en.json');
    const collectStrings = (node: unknown): string[] => {
      if (typeof node === 'string') return [node];
      if (node && typeof node === 'object') {
        return Object.values(node).flatMap(collectStrings);
      }
      return [];
    };
    const strings = collectStrings(en.hearth);
    expect(strings.length).toBeGreaterThan(0);
    strings.forEach((s) => {
      expect(s).not.toMatch(EMOJI_PATTERN);
      expect(s).not.toContain('!');
    });
  });
});
