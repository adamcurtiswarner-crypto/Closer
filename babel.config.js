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

  // NativeWind babel plugin uses async PostCSS, incompatible with Jest sync transform
  if (!isTest) {
    plugins.push('nativewind/babel');
  }

  // Reanimated must be last
  plugins.push('react-native-reanimated/plugin');

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
