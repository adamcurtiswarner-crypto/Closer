const { View, Text, Image, ScrollView } = require('react-native');

const Animated = {
  View,
  Text,
  Image,
  ScrollView,
  createAnimatedComponent: (comp: any) => comp,
};

// Layout-animation builders are chainable (duration().delay().springify()...)
// — return a self-referencing object so any chain order works in tests.
const makeAnimationBuilder = () => {
  const builder: Record<string, any> = {};
  const chainMethods = [
    'duration',
    'delay',
    'springify',
    'damping',
    'stiffness',
    'mass',
    'easing',
    'reduceMotion',
    'withInitialValues',
    'withCallback',
    'overshootClamping',
    'restDisplacementThreshold',
    'restSpeedThreshold',
  ];
  for (const method of chainMethods) {
    builder[method] = () => builder;
  }
  return builder;
};

const FadeIn = makeAnimationBuilder();
const FadeInUp = makeAnimationBuilder();
const FadeInDown = makeAnimationBuilder();
const FadeOut = makeAnimationBuilder();

module.exports = {
  __esModule: true,
  default: Animated,
  ...Animated,
  FadeIn,
  FadeInUp,
  FadeInDown,
  FadeOut,
  useSharedValue: (init: any) => ({ value: init }),
  useAnimatedStyle: (fn: any) => fn(),
  withTiming: (val: any) => val,
  withSpring: (val: any) => val,
  withRepeat: (val: any) => val,
  withSequence: (...args: any[]) => args[0],
  withDelay: (_: any, val: any) => val,
  runOnJS: (fn: any) => fn,
  interpolate: () => 0,
  ReduceMotion: {
    System: 'system',
    Always: 'always',
    Never: 'never',
  },
  Easing: {
    linear: (t: any) => t,
    ease: (t: any) => t,
    bezier: () => (t: any) => t,
    in: (fn: any) => fn,
    out: (fn: any) => fn,
    inOut: (fn: any) => fn,
  },
  useAnimatedRef: () => ({ current: null }),
  measure: () => null,
  cancelAnimation: () => {},
};
