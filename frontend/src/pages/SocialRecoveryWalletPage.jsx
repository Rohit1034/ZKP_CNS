// components/SocialRecoveryWalletPage.js

import * as React from 'react'
import { Button } from '@/components/ui/button' // Assumed utility component
import { 
  createSocialWallet, 
  generateRecoveryProof, 
  verifySchnorrProof, 
  finalRecoveryStep 
} from '@/lib/wallet_recovery'
import { reconstructMasterKey } from '@/lib/sss' // Explicit import for final SSS step

export default function SocialRecoveryWalletPage() {
  // --- STATE ---
  const [status, setStatus] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [totalShares, setTotalShares] = React.useState(3)
  const [threshold, setThreshold] = React.useState(2)
  const [shareData, setShareData] = React.useState(() => {
    // Attempt to load previously generated shares for continuous demo
    try {
      return JSON.parse(localStorage.getItem('recovery_share_data'))
    } catch {
      return null
    }
  }) 

  // Recovery State: Stores the actual secret shares that passed ZKP verification
  const [recoveryProofs, setRecoveryProofs] = React.useState([])
  const [recoveryShareInput, setRecoveryShareInput] = React.useState('')


  // --- HANDLERS ---

  const handleCreateWallet = async () => {
    if (!password) return setStatus('Provide a wallet password.')
    if (totalShares < threshold || threshold < 2) {
      return setStatus('Error: Threshold (T) must be >= 2 and <= Total Shares (N).')
    }
    
    setStatus('Generating ECC Keypair and splitting Master Key...')
    try {
      const { sharesForFriends } = await createSocialWallet(
        password,
        totalShares,
        threshold
      )
      
      setShareData(sharesForFriends)
      localStorage.setItem('recovery_share_data', JSON.stringify(sharesForFriends))
      setStatus(`Wallet created. ${threshold} of ${totalShares} shares ready for distribution.`)
    } catch (error) {
      console.error(error)
      setStatus('Wallet creation failed: ' + error.message)
    }
  }

  const handleFriendSubmitProof = async () => {
    if (!shareData) return setStatus('Please create a wallet first.')
    if (recoveryProofs.length >= threshold) {
      return setStatus('Threshold already met. Proceed to final recovery.')
    }
    
    setStatus('Generating ZKP and verifying proof (Mocking Vault server)...')
    
    try {
      const myShareHex = recoveryShareInput.trim()
      
      // 1. Find the corresponding public key (Y) for the share
      const friendShare = shareData.find(s => s.shareHex === myShareHex)
      if (!friendShare) {
          setStatus('Invalid share provided. This share does not belong to the initial set.')
          return
      }
      const friendPublicKeyY = friendShare.publicKeyY;

      // 2. Client generates proof
      const proof = await generateRecoveryProof(myShareHex)

      // 3. Mock Server Verification
      const isValid = verifySchnorrProof(proof, friendPublicKeyY)

      if (isValid) {
        // Store the share. In a real system, the server would request this *after* verification.
        const alreadyCollected = recoveryProofs.some(p => p.shareHex === myShareHex);
        if (alreadyCollected) {
           return setStatus('Proof accepted, but this share was already collected.');
        }

        setRecoveryProofs(prev => [...prev, { shareHex: myShareHex }])
        setStatus(`Proof accepted! Collected ${recoveryProofs.length + 1} of ${threshold} shares.`)
      } else {
        setStatus('ZKP failed verification. This secret share is incorrect or corrupted.')
      }
      setRecoveryShareInput('') // Clear input
    } catch (error) {
      console.error(error)
      setStatus('ZKP processing error. Check console.')
    }
  }

  const handleFinalRecovery = async () => {
    if (recoveryProofs.length < threshold) {
      return setStatus('Not enough verified proofs to start key reconstruction.')
    }

    // 1. Get the raw shares from the collected proofs
    const sharesToCombine = recoveryProofs.map(p => p.shareHex)

    setStatus('Reconstructing Master Key via Shamir\'s Secret Sharing...')

    try {
      // 2. Reconstruct the Master Key (K_master)
      const recoveredMasterKey = await reconstructMasterKey(sharesToCombine) 

      // 3. Decrypt and import ECC Private Key
      await finalRecoveryStep(recoveredMasterKey) 
      
      setStatus('✅ WALLET RECOVERED! ECC Private Key is imported into session.')
    } catch (error) {
      console.error(error)
      setStatus('Final Recovery Failed. Could not reconstruct key or decrypt blob.')
    }
  }

  // --- UI RENDER ---

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-extrabold text-center">Social Recovery Wallet (T of N)</h1>
      <p className="text-center text-gray-600">
        Uses **Shamir's Secret Sharing** for key split and **Schnorr ZKP** for private recovery proof.
      </p>

      {/* --- SECTION 1: SETUP --- */}
      <div className="p-6 border rounded-lg shadow-md bg-gray-50">
        <h2 className="text-xl font-bold mb-4">1. Wallet Setup & Splitting</h2>
        
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Set Main Wallet Password</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Secure Password (Primary Lock)"
              className="border p-2 rounded w-full"
            />
          </div>
          <div className="w-1/4">
            <label className="block text-sm font-medium mb-1">Total Friends (N)</label>
            <input 
              type="number"
              value={totalShares}
              onChange={(e) => setTotalShares(parseInt(e.target.value, 10))}
              min="3"
              className="border p-2 rounded w-full"
            />
          </div>
          <div className="w-1/4">
            <label className="block text-sm font-medium mb-1">Threshold (T)</label>
            <input 
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
              min="2"
              max={totalShares}
              className="border p-2 rounded w-full"
            />
          </div>
        </div>
        
        <Button onClick={handleCreateWallet} disabled={!password || shareData}>
          Create & Split Key ({threshold} of {totalShares})
        </Button>
      </div>

      {/* --- SECTION 2: SHARE DISTRIBUTION --- */}
      {shareData && (
        <div className="p-4 border border-blue-400 bg-blue-50 rounded-lg">
          <h3 className="text-xl font-semibold mb-3">2. Shares Generated (Distribute to Friends!)</h3>
          <p className="text-sm mb-4 text-blue-700">
            **ACTION:** Give each Friend their unique **Secret Share (s)**. The **Public Key (Y)** is stored by the Vault for verification.
          </p>
          
          <div className="space-y-3">
            {shareData.map(share => (
              <div key={share.id} className="p-3 border rounded bg-white">
                <p className="font-bold">Friend Share ID: {share.id}</p>
                <p className="text-xs break-all mt-1">
                  <span className="font-medium">Secret Share (s):</span> {share.shareHex}
                </p>
                <p className="text-xs break-all text-gray-500">
                  <span className="font-medium">Public Key (Y):</span> {share.publicKeyY}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- SECTION 3: RECOVERY --- */}
      <div className="p-6 border rounded-lg shadow-md bg-green-50">
        <h3 className="text-xl font-bold mb-4">3. Wallet Recovery (Mocking Friends)</h3>

        <div className="mb-4">
          <h4 className="font-semibold mb-2">Step A: Friend Proves Knowledge (ZKP)</h4>
          <p className="text-sm mb-2 text-gray-600">
            To simulate a friend, paste one of the **Secret Share Hex (s)** values above.
          </p>
          <input 
            type="text"
            value={recoveryShareInput}
            onChange={(e) => setRecoveryShareInput(e.target.value)}
            placeholder="Paste a friend's Secret Share Hex (s)"
            className="border p-2 rounded w-full mb-2"
          />
          <Button onClick={handleFriendSubmitProof} disabled={!recoveryShareInput || !shareData}>
            Simulate Friend Submitting Proof (OK Signal)
          </Button>
        </div>

        <div className="pt-4 border-t">
          <h4 className="font-semibold mb-2">Step B: Final Reconstruction</h4>
          <div className="text-sm">
            Verified Proofs Collected: **{recoveryProofs.length}** / {threshold} required
          </div>
          
          {recoveryProofs.length >= threshold ? (
            <Button onClick={handleFinalRecovery} className="mt-2 bg-green-600 hover:bg-green-700">
              Reconstruct Key & Unlock Wallet
            </Button>
          ) : (
            <p className="text-sm text-red-500 mt-2">Need {threshold - recoveryProofs.length} more valid proofs.</p>
          )}
        </div>
      </div>

      <div className="mt-4 p-3 border rounded text-sm font-medium">
        Status: **{status || 'Awaiting wallet creation...'}**
      </div>
    </div>
  )
}