/**
 * encryption.js — AES-GCM encryption with PBKDF2 key derivation
 * Uses the Web Crypto API, fully browser-native, no dependencies.
 */

const PBKDF2_ITERATIONS = 200_000;
const SALT_LEN = 16;
const IV_LEN = 12;

/**
 * Derive an AES-GCM key from a password and salt using PBKDF2.
 */
async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt a string with a password.
 * Returns base64-encoded: [salt(16) | iv(12) | ciphertext]
 */
export async function encryptData(plaintext, password) {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
    const key = await deriveKey(password, salt);
    const cipher = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(plaintext)
    );
    const result = new Uint8Array(SALT_LEN + IV_LEN + cipher.byteLength);
    result.set(salt, 0);
    result.set(iv, SALT_LEN);
    result.set(new Uint8Array(cipher), SALT_LEN + IV_LEN);
    return btoa(String.fromCharCode(...result));
}

/**
 * Decrypt a base64 string with a password.
 * Returns the original plaintext, or throws on failure.
 */
export async function decryptData(b64, password) {
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const salt = bytes.slice(0, SALT_LEN);
    const iv = bytes.slice(SALT_LEN, SALT_LEN + IV_LEN);
    const cipher = bytes.slice(SALT_LEN + IV_LEN);
    const key = await deriveKey(password, salt);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
    return new TextDecoder().decode(plain);
}
