const { View, Text, Image, ScrollView } = require('react-native');

const Animated = {
  View,
  Text,
  Image,
  ScrollView,
  createAnimatedComponent: (comp: any) => comp,
};

const FadeIn = { duration: () => ({ delay: () => ({}) }) };
const FadeInUp = { duration: () => ({ delay: () => ({}) }) };
const FadeInDown = { duration: () => ({ delay: () => ({}) }) };
const FadeOut = { duration: () => ({ delay: () => ({}) }) };

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
  Easing: { linear: (t: any) => t, ease: (t: any) => t, bezier: () => (t: any) => t },
  useAnimatedRef: () => ({ current: null }),
  measure: () => null,
  cancelAnimation: () => {},
};
