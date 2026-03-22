import { encrypt, decrypt } from '../services/encryption';

describe('encryption (disabled mode)', () => {
  const testKey = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

  it('encrypt returns plaintext (encryption disabled)', () => {
    const original = 'Hello, partner!';
    const result = encrypt(original, testKey);
    expect(result).toBe(original);
  });

  it('decrypt returns plaintext input as-is', () => {
    const original = 'This is a plain response';
    const result = decrypt(original, testKey);
    expect(result).toBe(original);
  });

  it('decrypt detects legacy encrypted data and returns placeholder', () => {
    // Simulate base64-encoded iv:ciphertext format
    const legacyEncrypted = btoa('abcdef0123456789:deadbeefcafebabe');
    const result = decrypt(legacyEncrypted, testKey);
    expect(result).toBe('[encrypted response]');
  });

  it('decrypt returns invalid base64 as-is', () => {
    const result = decrypt('not-valid-base64!!!', testKey);
    expect(result).toBe('not-valid-base64!!!');
  });
});
