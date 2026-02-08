import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const KEY_PREFIX = 'closer_couple_key_';
const IV_LENGTH = 16; // 128-bit IV for AES

/**
 * Generate a random encryption key for a couple and store it securely.
 * Called once when the couple is first linked.
 */
export async function generateCoupleKey(coupleId: string): Promise<string> {
  const existing = await getCoupleKey(coupleId);
  if (existing) return existing;

  // Generate a 32-byte (256-bit) random key as hex string
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  const key = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  await SecureStore.setItemAsync(`${KEY_PREFIX}${coupleId}`, key);
  return key;
}

/**
 * Retrieve the couple's encryption key from secure storage.
 */
export async function getCoupleKey(coupleId: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(`${KEY_PREFIX}${coupleId}`);
  } catch {
    return null;
  }
}

// Convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Convert Uint8Array to hex string
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Encrypt a string using AES-256-CBC with PKCS7 padding.
 * Returns iv:ciphertext as hex, base64-encoded.
 */
export function encrypt(text: string, key: string): string {
  const keyBytes = hexToBytes(key.substring(0, 64).padEnd(64, '0'));
  const textBytes = new TextEncoder().encode(text);

  // Generate random IV
  const iv = new Uint8Array(IV_LENGTH);
  for (let i = 0; i < IV_LENGTH; i++) {
    iv[i] = Math.floor(Math.random() * 256);
  }

  // PKCS7 padding
  const blockSize = 16;
  const padLength = blockSize - (textBytes.length % blockSize);
  const padded = new Uint8Array(textBytes.length + padLength);
  padded.set(textBytes);
  for (let i = textBytes.length; i < padded.length; i++) {
    padded[i] = padLength;
  }

  // AES-CBC encryption
  const encrypted = new Uint8Array(padded.length);
  let prevBlock: Uint8Array = iv;

  for (let blockStart = 0; blockStart < padded.length; blockStart += blockSize) {
    const block = padded.slice(blockStart, blockStart + blockSize);

    // XOR with previous ciphertext block (CBC mode)
    const xored = new Uint8Array(blockSize);
    for (let i = 0; i < blockSize; i++) {
      xored[i] = block[i] ^ prevBlock[i];
    }

    // AES block cipher
    const cipherBlock = aesBlockEncrypt(xored, keyBytes);
    encrypted.set(cipherBlock, blockStart);
    prevBlock = cipherBlock;
  }

  // Combine IV + ciphertext, then base64 encode
  const combined = bytesToHex(iv) + ':' + bytesToHex(encrypted);
  return btoa(combined);
}

/**
 * Decrypt a string using AES-256-CBC.
 * Falls back to returning the original string if decryption fails (legacy data).
 */
export function decrypt(encoded: string, key: string): string {
  try {
    const combined = atob(encoded);
    const [ivHex, cipherHex] = combined.split(':');
    if (!ivHex || !cipherHex) throw new Error('Invalid format');

    const keyBytes = hexToBytes(key.substring(0, 64).padEnd(64, '0'));
    const iv = hexToBytes(ivHex);
    const encrypted = hexToBytes(cipherHex);

    const blockSize = 16;
    const decrypted = new Uint8Array(encrypted.length);
    let prevBlock = iv;

    for (let blockStart = 0; blockStart < encrypted.length; blockStart += blockSize) {
      const cipherBlock = encrypted.slice(blockStart, blockStart + blockSize);
      const decBlock = aesBlockDecrypt(cipherBlock, keyBytes);

      for (let i = 0; i < blockSize; i++) {
        decrypted[blockStart + i] = decBlock[i] ^ prevBlock[i];
      }
      prevBlock = cipherBlock;
    }

    // Remove PKCS7 padding
    const padLength = decrypted[decrypted.length - 1];
    if (padLength > 0 && padLength <= blockSize) {
      const unpadded = decrypted.slice(0, decrypted.length - padLength);
      return new TextDecoder().decode(unpadded);
    }

    return new TextDecoder().decode(decrypted);
  } catch {
    // If decryption fails, return the original (may be unencrypted legacy data)
    return encoded;
  }
}

// AES S-Box (Rijndael)
const SBOX = new Uint8Array([
  0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
  0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
  0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
  0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
  0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
  0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
  0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
  0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
  0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
  0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
  0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
  0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
  0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
  0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
  0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
  0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16,
]);

const INV_SBOX = new Uint8Array(256);
for (let i = 0; i < 256; i++) INV_SBOX[SBOX[i]] = i;

const RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

function gmul(a: number, b: number): number {
  let p = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a;
    const hi = a & 0x80;
    a = (a << 1) & 0xff;
    if (hi) a ^= 0x1b;
    b >>= 1;
  }
  return p;
}

function keyExpansion(key: Uint8Array): Uint8Array[] {
  const Nk = 8; // 256-bit key
  const Nr = 14;
  const roundKeys: Uint8Array[] = [];

  // First Nk words come from the key
  const w: number[][] = [];
  for (let i = 0; i < Nk; i++) {
    w.push([key[4 * i], key[4 * i + 1], key[4 * i + 2], key[4 * i + 3]]);
  }

  for (let i = Nk; i < 4 * (Nr + 1); i++) {
    let temp = [...w[i - 1]];
    if (i % Nk === 0) {
      temp = [temp[1], temp[2], temp[3], temp[0]]; // RotWord
      temp = temp.map((b) => SBOX[b]); // SubWord
      temp[0] ^= RCON[i / Nk - 1];
    } else if (i % Nk === 4) {
      temp = temp.map((b) => SBOX[b]);
    }
    w.push(w[i - Nk].map((b, j) => b ^ temp[j]));
  }

  for (let r = 0; r <= Nr; r++) {
    const rk = new Uint8Array(16);
    for (let c = 0; c < 4; c++) {
      rk[c * 4] = w[r * 4 + c][0];
      rk[c * 4 + 1] = w[r * 4 + c][1];
      rk[c * 4 + 2] = w[r * 4 + c][2];
      rk[c * 4 + 3] = w[r * 4 + c][3];
    }
    roundKeys.push(rk);
  }

  return roundKeys;
}

function aesBlockEncrypt(block: Uint8Array, key: Uint8Array): Uint8Array {
  const roundKeys = keyExpansion(key);
  const state = new Uint8Array(block);

  // AddRoundKey
  for (let i = 0; i < 16; i++) state[i] ^= roundKeys[0][i];

  for (let round = 1; round <= 14; round++) {
    // SubBytes
    for (let i = 0; i < 16; i++) state[i] = SBOX[state[i]];

    // ShiftRows
    const t = new Uint8Array(state);
    state[1] = t[5]; state[5] = t[9]; state[9] = t[13]; state[13] = t[1];
    state[2] = t[10]; state[6] = t[14]; state[10] = t[2]; state[14] = t[6];
    state[3] = t[15]; state[7] = t[3]; state[11] = t[7]; state[15] = t[11];

    // MixColumns (skip on last round)
    if (round < 14) {
      for (let c = 0; c < 4; c++) {
        const i = c * 4;
        const s0 = state[i], s1 = state[i + 1], s2 = state[i + 2], s3 = state[i + 3];
        state[i] = gmul(2, s0) ^ gmul(3, s1) ^ s2 ^ s3;
        state[i + 1] = s0 ^ gmul(2, s1) ^ gmul(3, s2) ^ s3;
        state[i + 2] = s0 ^ s1 ^ gmul(2, s2) ^ gmul(3, s3);
        state[i + 3] = gmul(3, s0) ^ s1 ^ s2 ^ gmul(2, s3);
      }
    }

    // AddRoundKey
    for (let i = 0; i < 16; i++) state[i] ^= roundKeys[round][i];
  }

  return state;
}

function aesBlockDecrypt(block: Uint8Array, key: Uint8Array): Uint8Array {
  const roundKeys = keyExpansion(key);
  const state = new Uint8Array(block);

  // AddRoundKey (last round key)
  for (let i = 0; i < 16; i++) state[i] ^= roundKeys[14][i];

  for (let round = 13; round >= 0; round--) {
    // InvShiftRows
    const t = new Uint8Array(state);
    state[1] = t[13]; state[5] = t[1]; state[9] = t[5]; state[13] = t[9];
    state[2] = t[10]; state[6] = t[14]; state[10] = t[2]; state[14] = t[6];
    state[3] = t[7]; state[7] = t[11]; state[11] = t[15]; state[15] = t[3];

    // InvSubBytes
    for (let i = 0; i < 16; i++) state[i] = INV_SBOX[state[i]];

    // AddRoundKey
    for (let i = 0; i < 16; i++) state[i] ^= roundKeys[round][i];

    // InvMixColumns (skip on round 0)
    if (round > 0) {
      for (let c = 0; c < 4; c++) {
        const i = c * 4;
        const s0 = state[i], s1 = state[i + 1], s2 = state[i + 2], s3 = state[i + 3];
        state[i] = gmul(14, s0) ^ gmul(11, s1) ^ gmul(13, s2) ^ gmul(9, s3);
        state[i + 1] = gmul(9, s0) ^ gmul(14, s1) ^ gmul(11, s2) ^ gmul(13, s3);
        state[i + 2] = gmul(13, s0) ^ gmul(9, s1) ^ gmul(14, s2) ^ gmul(11, s3);
        state[i + 3] = gmul(11, s0) ^ gmul(13, s1) ^ gmul(9, s2) ^ gmul(14, s3);
      }
    }
  }

  return state;
}
