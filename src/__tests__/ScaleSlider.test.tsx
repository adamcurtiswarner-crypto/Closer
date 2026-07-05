import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ScaleSlider } from '../components/ScaleSlider';

describe('ScaleSlider', () => {
  const defaultProps = {
    value: null,
    onChange: jest.fn(),
    minLabel: 'Struggling',
    maxLabel: 'Thriving',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders anchored end labels only', () => {
    const { getByText, queryByText } = render(<ScaleSlider {...defaultProps} />);
    expect(getByText('Struggling')).toBeTruthy();
    expect(getByText('Thriving')).toBeTruthy();
    // No mid-scale numeric labels when nothing is selected
    expect(queryByText('5')).toBeNull();
  });

  it('renders ten tappable steps for the default 1-10 range', () => {
    const { getByTestId } = render(<ScaleSlider {...defaultProps} />);
    for (let n = 1; n <= 10; n++) {
      expect(getByTestId(`scale-dot-${n}`)).toBeTruthy();
    }
  });

  it('reports the tapped value through onChange', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <ScaleSlider {...defaultProps} onChange={onChange} />
    );
    fireEvent.press(getByTestId('scale-dot-7'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it('shows the selected value', () => {
    const { getByTestId } = render(<ScaleSlider {...defaultProps} value={6} />);
    expect(getByTestId('scale-value').props.children).toBe(6);
  });

  it('does not report values when disabled', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <ScaleSlider {...defaultProps} onChange={onChange} disabled />
    );
    fireEvent.press(getByTestId('scale-dot-3'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('respects a custom min/max range', () => {
    const { getByTestId, queryByTestId } = render(
      <ScaleSlider {...defaultProps} min={1} max={5} />
    );
    expect(getByTestId('scale-dot-5')).toBeTruthy();
    expect(queryByTestId('scale-dot-6')).toBeNull();
  });
});
