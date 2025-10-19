export async function deriveRootKey(password, saltBytes, kdf_params) {
  console.log('deriveRootKey called with:', {
    saltBytes_type: saltBytes?.constructor?.name,
    saltBytes_length: saltBytes?.length,
    kdf_params
  });

  const { iter } = kdf_params;
  const enc = new TextEncoder();

  if (!saltBytes || !saltBytes.length) {
    throw new Error('Salt is empty or invalid');
  }

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
      salt: saltBytes,
      iterations: iter,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return new Uint8Array(derivedBits);
}