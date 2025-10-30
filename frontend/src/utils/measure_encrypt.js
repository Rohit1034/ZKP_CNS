// Small helper to measure client-side encryption and decryption timing.
// Use by wrapping your existing encrypt/decrypt functions.
// Example usage:
//  const {ciphertext, encrypt_ms, plaintext_bytes, ciphertext_bytes} = await measureEncrypt(myEncryptFn, plainObject);

export async function measureEncrypt(encryptFn, vaultPlainObj) {
  const t0 = performance.now();
  const ciphertext = await encryptFn(vaultPlainObj); // your existing encryption routine
  const t1 = performance.now();
  const plainJson = JSON.stringify(vaultPlainObj);
  const cipherJson = JSON.stringify(ciphertext);
  return {
    ciphertext,
    encrypt_ms: t1 - t0,
    plaintext_bytes: new TextEncoder().encode(plainJson).length,
    ciphertext_bytes: new TextEncoder().encode(cipherJson).length
  };
}

export async function measureDecrypt(decryptFn, ciphertext) {
  const t0 = performance.now();
  const plain = await decryptFn(ciphertext);
  const t1 = performance.now();
  const cipherJson = JSON.stringify(ciphertext);
  const plainJson = JSON.stringify(plain);
  return {
    plain,
    decrypt_ms: t1 - t0,
    ciphertext_bytes: new TextEncoder().encode(cipherJson).length,
    plaintext_bytes: new TextEncoder().encode(plainJson).length
  };
}
