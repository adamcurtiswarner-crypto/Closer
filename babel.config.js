module.exports = function(api) {
  api.cache(true);

  const isTest = process.env.NODE_ENV === 'test';

  const plugins = [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './src',
          '@components': './src/components',
          '@hooks': './src/hooks',
          '@config': './src/config',
          '@types': './src/types',
          '@utils': './src/utils',
          '@services': './src/services',
        },
      },
    ],
  ];

  // NativeWind v2 babel plugin disabled — incompatible with PostCSS async processing
  // in current tailwindcss/postcss versions. Onboarding screens use className but
  // main app screens use StyleSheet and are unaffected.
  // TODO: Migrate to NativeWind v4 or convert onboarding to StyleSheet
  // if (!isTest) {
  //   plugins.push('nativewind/babel');
  // }

  // Reanimated must be last
  plugins.push('react-native-reanimated/plugin');

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
