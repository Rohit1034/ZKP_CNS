// lib/aes.js

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export async function deriveAesKeyFromPassword(password, salt, iterations = 150_000) {
  const pwKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: typeof salt === 'string' ? encoder.encode(salt) : salt,
      iterations,
      hash: 'SHA-256',
    },
    pwKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  return aesKey
}

function bufToBase64(buf) {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function base64ToBuf(b64) {
  const binary = atob(b64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

export async function encryptData(key, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  )
  return { iv: bufToBase64(iv), data: bufToBase64(ct) }
}

export async function decryptData(key, dataBase64, ivBase64) {
  const iv = new Uint8Array(base64ToBuf(ivBase64))
  const ct = base64ToBuf(dataBase64)
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ct
  )
  return decoder.decode(pt)
}