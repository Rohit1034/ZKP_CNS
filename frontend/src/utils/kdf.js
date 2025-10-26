export async function deriveRootKey(password, saltBytes, kdf_params) {
  // Normalize salt into a Uint8Array (supports Uint8Array, ArrayBuffer, Array<number>, base64 string, utf-8 string)
  const enc = new TextEncoder();

  function base64ToBytes(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function toUint8ArraySalt(salt) {
    if (!salt) return null;
    if (salt instanceof Uint8Array) return salt;
    if (salt instanceof ArrayBuffer) return new Uint8Array(salt);
    if (Array.isArray(salt)) return new Uint8Array(salt);
    if (typeof salt === 'string') {
      // Try base64 first; if it fails, fall back to UTF-8 bytes
      try {
        return base64ToBytes(salt);
      } catch {
        return enc.encode(salt);
      }
    }
    return null;
  }

  const saltUA = toUint8ArraySalt(saltBytes);

  console.log('deriveRootKey called with:', {
    salt_input_type: saltBytes?.constructor?.name || typeof saltBytes,
    salt_final_type: saltUA?.constructor?.name,
    salt_final_length: saltUA?.length,
    kdf_params,
  });

  if (!saltUA || !saltUA.length) {
    throw new Error('Salt is empty or invalid');
  }

  const { iter } = kdf_params;

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltUA,
      iterations: iter,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return new Uint8Array(derivedBits);
}