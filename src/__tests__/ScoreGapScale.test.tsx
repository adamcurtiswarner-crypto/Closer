/**
 * Tests for the two-score gap scale.
 *
 * The product's whole claim is that the distance between two answers is the
 * conversation worth having. The first version of the follow-up source
 * block stated that distance in grey caption text; this draws it. The
 * positions therefore have to be right, and they have to survive scores
 * that should not exist but might.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

import { scorePosition } from '@/utils/followUpSource';
import { ScoreGapScale } from '@/components/ScoreGapScale';

describe('scorePosition', () => {
  it('maps the 1-10 scale onto 0-1', () => {
    expect(scorePosition(1)).toBe(0);
    expect(scorePosition(10)).toBe(1);
    expect(scorePosition(5.5)).toBeCloseTo(0.5);
  });

  it('clamps anything outside the scale', () => {
    // A legacy or malformed score must not push a dot off the rail.
    expect(scorePosition(0)).toBe(0);
    expect(scorePosition(-4)).toBe(0);
    expect(scorePosition(11)).toBe(1);
    expect(scorePosition(99)).toBe(1);
  });
});

describe('ScoreGapScale', () => {
  it('renders a numeral above each dot when full', () => {
    const { getByText } = render(
      <ScoreGapScale myScore={9} partnerScore={6} partnerName="Masha" />
    );

    expect(getByText('9')).toBeTruthy();
    expect(getByText('6')).toBeTruthy();
  });

  it('draws no scale-end labels — the numerals and the rail carry the range', () => {
    // A score of 10 used to print a numeral directly above a "10" end
    // label, and a score of 1 above a "1". Same number twice, no new
    // information.
    const { queryAllByText } = render(
      <ScoreGapScale myScore={10} partnerScore={1} partnerName="Masha" />
    );

    expect(queryAllByText('10')).toHaveLength(1);
    expect(queryAllByText('1')).toHaveLength(1);
  });

  it('omits numerals in the strip variant, which sits on one line', () => {
    const { queryByText, getByTestId } = render(
      <ScoreGapScale myScore={10} partnerScore={6} partnerName="Masha" variant="strip" />
    );

    expect(getByTestId('score-gap-scale')).toBeTruthy();
    expect(queryByText('10')).toBeNull();
    expect(queryByText('6')).toBeNull();
  });

  it('describes itself to a screen reader as the gap, not as a picture', () => {
    const { getByTestId } = render(
      <ScoreGapScale myScore={10} partnerScore={6} partnerName="Masha" />
    );

    expect(getByTestId('score-gap-scale').props.accessibilityLabel).toBe(
      'You scored 10, Masha scored 6, 4 apart on a one to ten scale'
    );
  });

  it('reads the same whichever partner scored higher', () => {
    const { getByTestId } = render(
      <ScoreGapScale myScore={3} partnerScore={9} partnerName="Masha" />
    );

    expect(getByTestId('score-gap-scale').props.accessibilityLabel).toContain('6 apart');
  });

  it('renders equal scores without error', () => {
    // Both dots land on the same point: the span has zero width, which is
    // exactly what agreement looks like.
    const { getByTestId } = render(
      <ScoreGapScale myScore={8} partnerScore={8} partnerName="Masha" />
    );

    expect(getByTestId('score-gap-scale').props.accessibilityLabel).toContain('0 apart');
  });
});
