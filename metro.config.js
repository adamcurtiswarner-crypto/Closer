const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Firebase (web SDK) registers its components (auth, firestore, functions,
// storage) as a side effect of module execution. Metro's production
// inline-requires optimization defers module execution until first use, which
// can skip that registration and crash release builds at launch with
// "Component auth has not been registered yet". Keep firebase packages
// eagerly required via nonInlinedRequires.
const FIREBASE_NON_INLINED_REQUIRES = [
  '@firebase/app',
  '@firebase/auth',
  '@firebase/firestore',
  '@firebase/functions',
  '@firebase/storage',
  'firebase',
];

// Merge with expo/metro-config's default transform options (SDK 55 defaults:
// { transform: { experimentalImportSupport: true, inlineRequires: false } })
// instead of replacing them.
const defaultGetTransformOptions = config.transformer.getTransformOptions;

config.transformer = {
  ...config.transformer,
  getTransformOptions: async (entryPoints, options, getDependenciesOf) => {
    const defaults = defaultGetTransformOptions
      ? await defaultGetTransformOptions(entryPoints, options, getDependenciesOf)
      : {};
    return {
      ...defaults,
      transform: {
        ...defaults.transform,
        inlineRequires: true,
        nonInlinedRequires: [
          ...(defaults.transform?.nonInlinedRequires ?? []),
          ...FIREBASE_NON_INLINED_REQUIRES,
        ],
      },
    };
  },
};

module.exports = config;
