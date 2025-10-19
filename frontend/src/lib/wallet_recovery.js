// lib/wallet_recovery.js

import { splitMasterKey, reconstructMasterKey } from './sss'
import { encryptData, decryptData } from './aes'
import { 
  computePublicYFromX, 
  hexToBigInt, 
  bigIntToHex, 
  createSchnorrProof, 
  finalizeSchnorrSignature,
  P,
  bytesToBigIntFn,
  modPowFn,
  G // Needed for final verification mock
} from './crypto'

// --- 1. Wallet Creation (Setup) ---

export async function createSocialWallet(password, totalShares, threshold) {
  // 1. Generate Main ECDSA Keypair
  const kp = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  )
  const pubJwkObj = await crypto.subtle.exportKey('jwk', kp.publicKey)
  const privPkcs8 = await crypto.subtle.exportKey('pkcs8', kp.privateKey)
  const privBase64 = btoa(String.fromCharCode(...new Uint8Array(privPkcs8)))

  // 2. Generate Random MASTER AES KEY (K_master)
  const masterKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )

  // 3. ENCRYPT ECC PRIVATE KEY WITH K_master
  const encFinal = await encryptData(masterKey, privBase64)
  
  // Store everything locally (simulating the "Vault" persisting this)
  localStorage.setItem('wallet_priv_final_enc', JSON.stringify(encFinal))
  localStorage.setItem('wallet_pub_jwk', JSON.stringify(pubJwkObj))

  // 4. Split K_master into shares using SSS
  const hexShares = await splitMasterKey(masterKey, totalShares, threshold)

  // 5. Generate Schnorr Public Commitment (Y) for each share (s_i)
  const sharesForFriends = []
  for (const [index, shareHex] of hexShares.entries()) {
    const x = hexToBigInt(shareHex) // The share is the secret (x)
    const Y = computePublicYFromX(x) // Y = G^x mod P

    sharesForFriends.push({
      id: index + 1,
      shareHex: shareHex, // The actual secret share (s_i)
      publicKeyY: bigIntToHex(Y), // The public commitment (Y_i)
    })
  }
  
  return { sharesForFriends, pubJwk: JSON.stringify(pubJwkObj) }
}


// --- 2. Recovery Helpers (Client & Mocked Server) ---

/**
 * Client-side: Generates the R, s proof given a secret share and a challenge.
 */
export async function generateRecoveryProof(myShareHex) {
  const x = hexToBigInt(myShareHex)
  
  // 1. Commit (Prover step 1)
  const { r, R } = createSchnorrProof() 

  // 2. Mock Server: Generate random challenge 'c' 
  const challengeBytes = crypto.getRandomValues(new Uint8Array(32))
  const c = bytesToBigIntFn(challengeBytes) % P
  
  // 3. Respond (Prover step 2)
  const s = finalizeSchnorrSignature(r, x, c)

  return {
    R: bigIntToHex(R), // Commitment
    c: bigIntToHex(c), // Challenge
    s: bigIntToHex(s), // Response
    r: r, // Keep r for verification mock
    x: x // Keep x for verification mock
  }
}

/**
 * Server-side (MOCKED): Verifies a ZKP from a friend.
 */
export function verifySchnorrProof(proof, friendPublicKeyY) {
  const R = hexToBigInt(proof.R)
  const c = hexToBigInt(proof.c)
  const s = hexToBigInt(proof.s)
  const Y = hexToBigInt(friendPublicKeyY)

  // Verification Equation: G^s mod P == (R * Y^c) mod P
  const leftSide = modPowFn(G, s, P)
  
  // Calculate R * Y^c mod P
  const Yc = modPowFn(Y, c, P)
  const rightSide = (R * Yc) % P

  return leftSide === rightSide
}

/**
 * Final User Step: Decrypts and imports the ECC key.
 */
export async function finalRecoveryStep(recoveredMasterKey) {
  const encFinalRaw = localStorage.getItem('wallet_priv_final_enc')
  if (!encFinalRaw) throw new Error('Encrypted wallet not found.')
  const encFinal = JSON.parse(encFinalRaw)

  // Decrypt the ECC private key using the recovered Master Key
  const privBase64 = await decryptData(
    recoveredMasterKey,
    encFinal.data,
    encFinal.iv
  )

  // Import the ECC key into session
  const bytes = Uint8Array.from(atob(privBase64), c => c.charCodeAt(0))
  await crypto.subtle.importKey(
    'pkcs8',
    bytes.buffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign']
  )
}