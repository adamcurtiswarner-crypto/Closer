export const signInAsync = jest.fn().mockResolvedValue({
  identityToken: 'mock-apple-identity-token',
  fullName: { givenName: 'Test', familyName: 'User' },
  email: 'test@privaterelay.appleid.com',
});

export enum AppleAuthenticationScope {
  FULL_NAME = 0,
  EMAIL = 1,
}

export enum AppleAuthenticationButtonType {
  SIGN_IN = 0,
  CONTINUE = 1,
  SIGN_UP = 2,
}

export enum AppleAuthenticationButtonStyle {
  WHITE = 0,
  WHITE_OUTLINE = 1,
  BLACK = 2,
}

export const AppleAuthenticationButton = 'AppleAuthenticationButton';
