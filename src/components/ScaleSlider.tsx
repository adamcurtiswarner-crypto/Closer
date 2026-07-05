import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { hapticImpact } from '@utils/haptics';
import { colors, spacing, typography } from '@config/theme';

type ScaleSliderTone = 'light' | 'dark';

interface ScaleSliderProps {
  value: number | null;
  onChange: (value: number) => void;
  minLabel: string;
  maxLabel: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  /** 'dark' renders the row for an ink/coral hero card (low-opacity outlines) */
  tone?: ScaleSliderTone;
}

function ScaleDot({ selected, tone }: { selected: boolean; tone: ScaleSliderTone }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(selected ? 1.5 : 1, { damping: 15, stiffness: 260 });
  }, [selected, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        tone === 'dark' ? styles.dotDark : styles.dotLight,
        selected && styles.dotSelected,
        animatedStyle,
      ]}
    />
  );
}

/**
 * 1–10 tappable dots with anchored end labels only (no mid-scale numeric
 * labels). Each step is a full-height touch target (>= 44px).
 */
export function ScaleSlider({
  value,
  onChange,
  minLabel,
  maxLabel,
  min = 1,
  max = 10,
  disabled = false,
  tone = 'light',
}: ScaleSliderProps) {
  const steps: number[] = [];
  for (let n = min; n <= max; n++) steps.push(n);

  return (
    <View testID="scale-slider">
      <View style={styles.valueRow}>
        {value !== null && (
          <Animated.Text
            key={value}
            entering={FadeInDown.duration(180).springify()}
            style={styles.valueText}
            maxFontSizeMultiplier={1.4}
            testID="scale-value"
          >
            {value}
          </Animated.Text>
        )}
      </View>

      <View style={styles.track}>
        {steps.map((n) => (
          <TouchableOpacity
            key={n}
            testID={`scale-dot-${n}`}
            style={styles.step}
            onPress={() => {
              if (n !== value) hapticImpact(); // Light — quiet tick per new value
              onChange(n);
            }}
            disabled={disabled}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${n} of ${max}`}
            accessibilityState={{ selected: value === n, disabled }}
          >
            <ScaleDot selected={value === n} tone={tone} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.labelsRow}>
        <Text style={[styles.endLabel, tone === 'dark' && styles.endLabelDark]}>
          {minLabel}
        </Text>
        <Text style={[styles.endLabel, tone === 'dark' && styles.endLabelDark]}>
          {maxLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  valueRow: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    ...typography.display,
    color: colors.accent.primary,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  step: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  dotLight: {
    backgroundColor: colors.surface.card,
    borderColor: colors.border.default,
  },
  dotDark: {
    backgroundColor: 'transparent',
    borderColor: colors.onDark.outline,
  },
  dotSelected: {
    backgroundColor: colors.accent.primary,
    borderColor: colors.accent.primary,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingHorizontal: 2,
  },
  endLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    letterSpacing: 0.2,
  },
  endLabelDark: {
    color: colors.onDark.muted,
  },
});
