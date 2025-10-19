// lib/sss.js

import sss from 'shamirs-secret-sharing'

// --- Helpers for Web Crypto <-> SSS Buffer conversion ---
function arrayBufferToBuffer(ab) {
  return Buffer.from(new Uint8Array(ab))
}

function bufferToArrayBuffer(buffer) {
  return new Uint8Array(buffer).buffer
}

/**
 * Splits a CryptoKey (Master Key) into shares using SSS.
 * @param {CryptoKey} masterKey - The AES key to be split.
 * @param {number} total - Total number of shares (N).
 * @param {number} threshold - Shares needed for recovery (T).
 * @returns {Promise<string[]>} - An array of shares (hex strings).
 */
export async function splitMasterKey(masterKey, total, threshold) {
  const keyBuffer = await crypto.subtle.exportKey('raw', masterKey)
  const keyBuf = arrayBufferToBuffer(keyBuffer)

  // Use Buffer for the secret input
  const shares = sss.split(keyBuf, { shares: total, threshold: threshold })

  // Shares are Buffers, return them as hex strings
  return shares.map(share => share.toString('hex'))
}

/**
 * Reconstructs the Master Key from a set of hex-encoded shares.
 * @param {string[]} hexShares - An array of hex-encoded share strings.
 * @returns {Promise<CryptoKey>} - The reconstructed AES Master Key.
 */
export async function reconstructMasterKey(hexShares) {
  const shares = hexShares.map(hex => Buffer.from(hex, 'hex'))

  // The SSS library combines Buffers
  const recoveredKeyBuffer = sss.combine(shares)

  // Import the recovered key back into the Web Crypto API as AES-GCM 256
  return crypto.subtle.importKey(
    'raw',
    bufferToArrayBuffer(recoveredKeyBuffer),
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}