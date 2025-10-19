import * as React from 'react'
import { createSocialWallet, generateRecoveryProof, verifySchnorrProof, finalRecoveryStep } from '../lib/wallet_recovery'
import { reconstructMasterKey } from '../lib/sss'
import { sendSharesEmail } from '../utils/api'

const Button = ({ children, onClick, disabled, className = '' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded font-medium transition-all ${className}`}
  >
    {children}
  </button>
)

export default function SocialRecoveryWalletPage() {
  // --- STATE ---
  const [status, setStatus] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [totalShares, setTotalShares] = React.useState(3)
  const [threshold, setThreshold] = React.useState(2)
  const [shareData, setShareData] = React.useState(null)
  const [senderEmail, setSenderEmail] = React.useState('')
  const [friendEmails, setFriendEmails] = React.useState(['', '', ''])

  const [recoveryProofs, setRecoveryProofs] = React.useState([])
  const [recoveryShareInput, setRecoveryShareInput] = React.useState('')

  // --- HANDLERS ---

  const handleCreateWallet = async () => {
    if (!password) return setStatus('Provide a wallet password.')
    if (totalShares < threshold || threshold < 2) {
      return setStatus('Error: Threshold (T) must be >= 2 and <= Total Shares (N).')
    }
    if (friendEmails.slice(0, totalShares).some(e => !e || !e.includes('@'))) {
      return setStatus('Please enter valid friend emails for all selected N.')
    }
    
    setStatus('Generating ECC Keypair and splitting Master Key...')
    try {
      const { sharesForFriends } = await createSocialWallet(
        password,
        totalShares,
        threshold
      )
      
      setShareData(sharesForFriends)
      setStatus(`Wallet created. ${threshold} of ${totalShares} shares ready for distribution. Sending emails...`)

      // Prepare recipients payload
      const recipients = sharesForFriends.slice(0, totalShares).map((s, idx) => ({
        email: friendEmails[idx] || '',
        id: s.id,
        shareHex: s.shareHex,
        publicKeyY: s.publicKeyY,
      }))

  const username = localStorage.getItem('current_user') || ''
      const resp = await sendSharesEmail({ recipients, fromEmail: senderEmail, username })
      if (resp.status === 'success') {
        setStatus(`Emails sent to ${resp.sent} friend(s).`)
      } else {
        setStatus(`Wallet created, but emailing failed: ${resp.message || 'Unknown error'}`)
      }
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
      
      const friendShare = shareData.find(s => s.shareHex === myShareHex)
      if (!friendShare) {
          setStatus('Invalid share provided. This share does not belong to the initial set.')
          return
      }
      const friendPublicKeyY = friendShare.publicKeyY;

      const proof = await generateRecoveryProof(myShareHex)

      const isValid = verifySchnorrProof(proof, friendPublicKeyY)

      if (isValid) {
        const alreadyCollected = recoveryProofs.some(p => p.shareHex === myShareHex);
        if (alreadyCollected) {
           return setStatus('Proof accepted, but this share was already collected.');
        }

        setRecoveryProofs(prev => [...prev, { shareHex: myShareHex }])
        setStatus(`Proof accepted! Collected ${recoveryProofs.length + 1} of ${threshold} shares.`)
      } else {
        setStatus('ZKP failed verification. This secret share is incorrect or corrupted.')
      }
      setRecoveryShareInput('')
    } catch (error) {
      console.error(error)
      setStatus('ZKP processing error. Check console.')
    }
  }

  const handleFinalRecovery = async () => {
    if (recoveryProofs.length < threshold) {
      return setStatus('Not enough verified proofs to start key reconstruction.')
    }

    const sharesToCombine = recoveryProofs.map(p => p.shareHex)

    setStatus('Reconstructing Master Key via Shamir\'s Secret Sharing...')

    try {
      const recoveredMasterKey = await reconstructMasterKey(sharesToCombine) 

      await finalRecoveryStep(recoveredMasterKey) 
      
      setStatus('✅ WALLET RECOVERED! ECC Private Key is imported into session.')
    } catch (error) {
      console.error(error)
      setStatus('Final Recovery Failed. Could not reconstruct key or decrypt blob.')
    }
  }

  // --- UI RENDER ---

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white p-4 relative">
      {/* Back Button - Top Left */}
      <button
        onClick={() => window.history.back()}
        aria-label="Go back"
        className="fixed top-6 left-6 z-50 w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 text-slate-700 border border-gray-200 shadow-sm hover:bg-gray-200 active:bg-gray-300 transition-colors"
      >
        <span className="text-xl font-bold leading-none">&larr;</span>
      </button>
      
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center py-6">
          <h1 className="text-4xl font-extrabold text-green-800 mb-2">Social Recovery Wallet</h1>
          <p className="text-green-700 text-lg">T of N Threshold Cryptography</p>
          <p className="text-green-600 text-sm mt-2">
            Uses Shamir's Secret Sharing for key split and Schnorr ZKP for private recovery proof
          </p>
        </div>

        {/* --- SECTION 1: SETUP --- */}
        <div className="p-6 border-2 border-green-200 rounded-xl shadow-lg bg-white">
          <h2 className="text-2xl font-bold mb-4 text-green-800 border-b-2 border-green-200 pb-2">
            1. Wallet Setup & Splitting
          </h2>
          
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold mb-2 text-green-700">Set Main Wallet Password</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Secure Password (Primary Lock)"
                className="border-2 border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 p-3 rounded-lg w-full outline-none transition-all"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold mb-2 text-green-700">Your Email (From)</label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="you@example.com"
                className="border-2 border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 p-3 rounded-lg w-full outline-none transition-all"
              />
            </div>
            <div className="w-full md:w-1/4">
              <label className="block text-sm font-semibold mb-2 text-green-700">Total Friends (N)</label>
              <input 
                type="number"
                value={totalShares}
                onChange={(e) => setTotalShares(parseInt(e.target.value, 10))}
                min="3"
                className="border-2 border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 p-3 rounded-lg w-full outline-none transition-all"
              />
            </div>
            <div className="w-full md:w-1/4">
              <label className="block text-sm font-semibold mb-2 text-green-700">Threshold (T)</label>
              <input 
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
                min="2"
                max={totalShares}
                className="border-2 border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 p-3 rounded-lg w-full outline-none transition-all"
              />
            </div>
          </div>

          {/* Friend emails */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {Array.from({ length: totalShares }).map((_, idx) => (
              <div key={idx}>
                <label className="block text-sm font-semibold mb-2 text-green-700">Friend {idx + 1} Email</label>
                <input
                  type="email"
                  value={friendEmails[idx] || ''}
                  onChange={(e) => {
                    const next = [...friendEmails]
                    next[idx] = e.target.value
                    setFriendEmails(next)
                  }}
                  placeholder={`friend${idx + 1}@example.com`}
                  className="border-2 border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 p-3 rounded-lg w-full outline-none transition-all"
                />
              </div>
            ))}
          </div>
          
          <Button 
            onClick={handleCreateWallet} 
            disabled={!password || shareData}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
          >
            Create & Split Key ({threshold} of {totalShares})
          </Button>
        </div>

        {/* --- SECTION 2: SHARE DISTRIBUTION --- */}
        {shareData && (
          <div className="p-6 border-2 border-green-300 bg-green-50 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold mb-3 text-green-800 border-b-2 border-green-300 pb-2">
              2. Shares Generated
            </h3>
            <p className="text-sm mb-4 text-green-700 font-medium">
              ACTION: Give each Friend their unique Secret Share (s). The Public Key (Y) is stored by the Vault for verification.
            </p>
            
            <div className="space-y-3">
              {shareData.map(share => (
                <div key={share.id} className="p-4 border-2 border-green-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                  <p className="font-bold text-green-800 mb-2">Friend Share ID: {share.id}</p>
                  <div className="space-y-2">
                    <div>
                      <span className="font-semibold text-green-700 text-sm">Secret Share (s):</span>
                      <p className="text-xs break-all mt-1 font-mono bg-green-50 p-2 rounded border border-green-200">
                        {share.shareHex}
                      </p>
                    </div>
                    <div>
                      <span className="font-semibold text-green-600 text-sm">Public Key (Y):</span>
                      <p className="text-xs break-all mt-1 font-mono bg-gray-50 p-2 rounded border border-gray-200 text-gray-600">
                        {share.publicKeyY}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- SECTION 3: RECOVERY --- */}
        <div className="p-6 border-2 border-green-200 rounded-xl shadow-lg bg-white">
          <h3 className="text-2xl font-bold mb-4 text-green-800 border-b-2 border-green-200 pb-2">
            3. Wallet Recovery
          </h3>

          <div className="mb-6">
            <h4 className="font-semibold text-lg mb-3 text-green-700">Step A: Friend Proves Knowledge (ZKP)</h4>
            <p className="text-sm mb-3 text-green-600">
              To simulate a friend, paste one of the Secret Share Hex (s) values above.
            </p>
            <input 
              type="text"
              value={recoveryShareInput}
              onChange={(e) => setRecoveryShareInput(e.target.value)}
              placeholder="Paste a friend's Secret Share Hex (s)"
              className="border-2 border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 p-3 rounded-lg w-full mb-3 outline-none transition-all"
            />
            <Button 
              onClick={handleFriendSubmitProof} 
              disabled={!recoveryShareInput || !shareData}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              Simulate Friend Submitting Proof
            </Button>
          </div>

          <div className="pt-6 border-t-2 border-green-200">
            <h4 className="font-semibold text-lg mb-3 text-green-700">Step B: Final Reconstruction</h4>
            <div className="text-base mb-4 font-medium text-green-800">
              Verified Proofs Collected: <span className="text-green-600 font-bold">{recoveryProofs.length}</span> / {threshold} required
            </div>
            
            {recoveryProofs.length >= threshold ? (
              <Button 
                onClick={handleFinalRecovery} 
                className="bg-green-700 hover:bg-green-800 text-white font-bold px-6 py-3 rounded-lg shadow-md transition-all"
              >
                Reconstruct Key & Unlock Wallet
              </Button>
            ) : (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700 font-medium">
                  Need {threshold - recoveryProofs.length} more valid proof(s) to proceed
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 p-4 border-2 border-green-200 rounded-xl bg-white shadow-sm">
          <div className="text-sm font-semibold text-green-700">Status:</div>
          <div className="text-base font-medium text-green-800 mt-1">
            {status || 'Awaiting wallet creation...'}
          </div>
        </div>
      </div>
    </div>
  )
}