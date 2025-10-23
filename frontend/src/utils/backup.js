// backup.js
// Client-side helpers to encrypt/decrypt the private key backup using AES-GCM
import { deriveRootKey } from './kdf';

const enc = new TextEncoder();
const dec = new TextDecoder();

export async function encryptBackup(rootKeyBytes, privateHex) {
  // rootKeyBytes: Uint8Array (32 bytes) derived from password
  // privateHex: hex string of private scalar bytes
  const key = await window.crypto.subtle.importKey(
    'raw',
    rootKeyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const data = hexToBytes(privateHex);
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return {
    iv: arrayBufferToBase64(iv.buffer),
    ciphertext: arrayBufferToBase64(ciphertext)
  };
}

export async function decryptBackup(rootKeyBytes, encrypted) {
  const key = await window.crypto.subtle.importKey(
    'raw',
    rootKeyBytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const iv = base64ToArrayBuffer(encrypted.iv);
  const ct = base64ToArrayBuffer(encrypted.ciphertext);
  const plain = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    ct
  );
  return bytesToHex(new Uint8Array(plain));
}

function hexToBytes(hex) {
  return Uint8Array.from(Buffer.from(hex, 'hex'));
}

function bytesToHex(bytes) {
  return Buffer.from(bytes).toString('hex');
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export async function deriveRootKeyFromPassword(password, salt_kdf, kdf_params) {
  return await deriveRootKey(password, salt_kdf, { iter: kdf_params.iter });
}
