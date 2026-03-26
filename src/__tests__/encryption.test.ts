jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn((size: number) => {
    const bytes = new Uint8Array(size);
    for (let i = 0; i < size; i++) bytes[i] = (i * 37 + 7) % 256;
    return Promise.resolve(bytes);
  }),
}));

jest.mock('@/config/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
}));

import { encrypt, decrypt } from '../services/encryption';

describe('encryption', () => {
  const testKey = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

  it('encrypts and decrypts simple text', () => {
    const original = 'Hello, partner!';
    const encrypted = encrypt(original, testKey);
    expect(encrypted).not.toBe(original);
    const decrypted = decrypt(encrypted, testKey);
    expect(decrypted).toBe(original);
  });

  it('encrypts and decrypts text longer than one block', () => {
    const original = 'This is a longer message that spans multiple AES blocks for proper CBC testing';
    const encrypted = encrypt(original, testKey);
    const decrypted = decrypt(encrypted, testKey);
    expect(decrypted).toBe(original);
  });

  it('returns plaintext when key is disabled', () => {
    const original = 'Hello';
    expect(encrypt(original, 'disabled')).toBe(original);
    expect(decrypt(original, 'disabled')).toBe(original);
  });

  it('decrypt returns original on invalid base64', () => {
    const result = decrypt('not-valid-base64!!!', testKey);
    expect(result).toBe('not-valid-base64!!!');
  });

  it('wrong key cannot decrypt correctly', () => {
    const original = 'Secret message';
    const encrypted = encrypt(original, testKey);
    const wrongKey = 'ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00';
    const result = decrypt(encrypted, wrongKey);
    expect(result).not.toBe(original);
  });
});
