import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, G, Rect } from 'react-native-svg';

interface ToneShapesProps {
  readonly variant: 'coral' | 'black' | 'purple';
  /** Optional multiplier applied to all shape opacities */
  readonly opacity?: number;
}

const FILL = '#FFFFFF';

function CoralShapes({ multiplier }: { readonly multiplier: number }) {
  return (
    <Svg viewBox="0 0 320 520" style={StyleSheet.absoluteFill}>
      {/* Large ellipse top-right */}
      <Ellipse cx={280} cy={60} rx={110} ry={110} fill={FILL} opacity={0.10 * multiplier} />
      {/* Rotated band mid */}
      <G rotation={-18} origin="180, 145">
        <Rect x={-60} y={100} width={480} height={90} rx={45} fill={FILL} opacity={0.08 * multiplier} />
      </G>
      {/* Second rotated band */}
      <G rotation={-18} origin="180, 232">
        <Rect x={-60} y={200} width={480} height={65} rx={32} fill={FILL} opacity={0.08 * multiplier} />
      </G>
      {/* Small ellipse bottom-left */}
      <Ellipse cx={40} cy={480} rx={100} ry={100} fill={FILL} opacity={0.10 * multiplier} />
    </Svg>
  );
}

function BlackShapes({ multiplier }: { readonly multiplier: number }) {
  return (
    <Svg viewBox="0 0 320 520" style={StyleSheet.absoluteFill}>
      {/* Large ellipse top-right */}
      <Ellipse cx={280} cy={60} rx={110} ry={110} fill={FILL} opacity={0.04 * multiplier} />
      {/* Rotated band mid */}
      <G rotation={-18} origin="180, 145">
        <Rect x={-60} y={100} width={480} height={90} rx={45} fill={FILL} opacity={0.05 * multiplier} />
      </G>
      {/* Small ellipse bottom-left */}
      <Ellipse cx={40} cy={480} rx={100} ry={100} fill={FILL} opacity={0.04 * multiplier} />
    </Svg>
  );
}

function PurpleShapes({ multiplier }: { readonly multiplier: number }) {
  return (
    <Svg viewBox="0 0 220 90" style={StyleSheet.absoluteFill}>
      {/* Ellipse top-right */}
      <Ellipse cx={260} cy={10} rx={90} ry={90} fill={FILL} opacity={0.07 * multiplier} />
      {/* Ellipse bottom-right */}
      <Ellipse cx={240} cy={140} rx={70} ry={70} fill={FILL} opacity={0.05 * multiplier} />
    </Svg>
  );
}

const VARIANT_COMPONENTS = {
  coral: CoralShapes,
  black: BlackShapes,
  purple: PurpleShapes,
} as const;

export function ToneShapes({ variant, opacity = 1 }: ToneShapesProps) {
  const ShapesComponent = VARIANT_COMPONENTS[variant];

  return (
    <View style={styles.container} pointerEvents="none">
      <ShapesComponent multiplier={opacity} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});
