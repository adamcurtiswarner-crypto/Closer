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
        state="talk"
        stateLabel="Talk about it"
        onPress={jest.fn()}
      />
    );
    expect(getByText('Money')).toBeTruthy();
    expect(getByText('Talk about it')).toBeTruthy();
    expect(getByTestId('icon-coins')).toBeTruthy();
  });

  it('shows the pulsing dot only on talk tiles', () => {
    const talk = render(
      <HearthEmberTile
        label="Money"
        icon="coins"
        state="talk"
        stateLabel="Talk about it"
        onPress={jest.fn()}
      />
    );
    expect(talk.getByTestId('hearth-pulse-dot')).toBeTruthy();

    (['compare', 'glowing', 'tended', 'steady', 'unlit'] as const).forEach((state) => {
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

  it('renders the tally line and folds it into the accessibility label', () => {
    const { getByText, getByLabelText } = render(
      <HearthEmberTile
        label="Money"
        icon="coins"
        state="glowing"
        stateLabel="Glowing"
        tally="3 answered · warming"
        onPress={jest.fn()}
      />
    );
    expect(getByText('3 answered · warming')).toBeTruthy();
    expect(getByLabelText('Money, Glowing, 3 answered · warming')).toBeTruthy();
  });

  it('tended tiles carry a quiet sage check', () => {
    const { getByTestId } = render(
      <HearthEmberTile
        label="Money"
        icon="coins"
        state="tended"
        stateLabel="Tended"
        onPress={jest.fn()}
      />
    );
    expect(getByTestId('icon-check')).toBeTruthy();
  });

  it('unlit tiles show the invite line', () => {
    const { getByText, getByLabelText } = render(
      <HearthEmberTile
        label="Money"
        icon="coins"
        state="unlit"
        stateLabel="Not yet lit"
        tally="Ask one tonight"
        onPress={jest.fn()}
      />
    );
    expect(getByText('Not yet lit')).toBeTruthy();
    expect(getByText('Ask one tonight')).toBeTruthy();
    expect(getByLabelText('Money, Not yet lit, Ask one tonight')).toBeTruthy();
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
        state="compare"
        stateLabel="Compare notes"
        onPress={jest.fn()}
      />
    );
    expect(getByText('Compare notes')).toBeTruthy();
  });

  describe('text fitting at 3-column width', () => {
    // The longest shipping labels — the ones that used to break mid-word
    // ("Communicatio / n") or truncate at 3-across width.
    const longestLabels = {
      single: 'Communication',
      multi: ['Growth and independence', 'Appreciation and trust'],
    };

    it('single-word labels render on ONE line with font shrink — never a mid-word break', () => {
      const { getByText } = render(
        <HearthEmberTile
          label={longestLabels.single}
          icon="chat-circle"
          state="steady"
          stateLabel="Steady"
          onPress={jest.fn()}
        />
      );
      const label = getByText('Communication');
      expect(label.props.numberOfLines).toBe(1);
      expect(label.props.adjustsFontSizeToFit).toBe(true);
      expect(label.props.minimumFontScale).toBe(0.8);
    });

    it('multi-word labels wrap at spaces across two lines, with shrink as the overflow net', () => {
      longestLabels.multi.forEach((text) => {
        const { getByText, unmount } = render(
          <HearthEmberTile
            label={text}
            icon="path"
            state="steady"
            stateLabel="Steady"
            onPress={jest.fn()}
          />
        );
        const label = getByText(text);
        expect(label.props.numberOfLines).toBe(2);
        expect(label.props.adjustsFontSizeToFit).toBe(true);
        unmount();
      });
    });

    it('the tally/hint line wraps to two lines instead of truncating with an ellipsis', () => {
      const { getByText } = render(
        <HearthEmberTile
          label="Money"
          icon="coins"
          state="unlit"
          stateLabel="Not yet lit"
          tally="Ask one tonight"
          onPress={jest.fn()}
        />
      );
      expect(getByText('Ask one tonight').props.numberOfLines).toBe(2);
    });

    it('the shipped unlit hint fits the ~15-character caption line budget', () => {
      const en = require('../i18n/locales/en.json');
      const hint: string = en.hearth.tile.unlitHint;
      // One caption line at 3-across is ~15 characters; with two lines
      // available, every word must fit a line and the whole hint two.
      expect(hint.length).toBeLessThanOrEqual(30);
      hint.split(' ').forEach((word) => {
        expect(word.length).toBeLessThanOrEqual(15);
      });
    });
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
