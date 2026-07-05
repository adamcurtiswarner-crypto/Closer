const { withPodfile } = require('expo/config-plugins');

// AppCheckCore >= 11.3.0 (pulled in transitively by GoogleSignIn ~> 9.0)
// depends on GoogleUtilities and RecaptchaInterop, which do not define
// modules. Under static libraries (our setup — no use_frameworks!),
// CocoaPods refuses to integrate the Swift pod AppCheckCore unless those
// two dependencies opt into modular headers. Locally this only surfaces
// after a `pod install --repo-update`; on EAS it fails every fresh build.
const MODULAR_PODS = ["GoogleUtilities", "RecaptchaInterop"];

module.exports = function withModularHeaders(config) {
  return withPodfile(config, (config) => {
    const anchor = 'use_expo_modules!';
    const lines = MODULAR_PODS.map(
      (name) => `  pod '${name}', :modular_headers => true`
    ).join('\n');
    if (!config.modResults.contents.includes(":modular_headers => true")) {
      config.modResults.contents = config.modResults.contents.replace(
        anchor,
        `${anchor}\n${lines}`
      );
    }
    return config;
  });
};
