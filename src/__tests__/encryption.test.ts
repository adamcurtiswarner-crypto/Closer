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

import { encrypt, decrypt } from '../services/encryption';

describe('encryption', () => {
  // 64-char hex key (256-bit AES key)
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

  it('encrypts and decrypts unicode text', () => {
    const original = 'I love you so much!';
    const encrypted = encrypt(original, testKey);
    const decrypted = decrypt(encrypted, testKey);
    expect(decrypted).toBe(original);
  });

  it('encrypts and decrypts empty string', () => {
    const original = '';
    const encrypted = encrypt(original, testKey);
    const decrypted = decrypt(encrypted, testKey);
    expect(decrypted).toBe(original);
  });

  it('produces different output with different keys', () => {
    const original = 'Same text';
    const key1 = '0000000000000000000000000000000000000000000000000000000000000000';
    const key2 = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const encrypted1 = encrypt(original, key1);
    const encrypted2 = encrypt(original, key2);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('decrypt returns original on invalid base64', () => {
    const result = decrypt('not-valid-base64!!!', testKey);
    expect(result).toBe('not-valid-base64!!!');
  });

  it('wrong key cannot decrypt', () => {
    const original = 'Secret message';
    const encrypted = encrypt(original, testKey);
    const wrongKey = 'ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00ff00';
    const result = decrypt(encrypted, wrongKey);
    // Should either return garbage or fall back to the encoded string
    expect(result).not.toBe(original);
  });
});
