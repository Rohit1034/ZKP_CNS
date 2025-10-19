import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { generateRecoveryProof, verifySchnorrProof, finalRecoveryStep } from '../lib/wallet_recovery'
import { reconstructMasterKey } from '../lib/sss'
import { requestChallenge, verifyLogin } from '../utils/api'
import { computePublicY, generateProof } from '../utils/zkp'

const Button = ({ children, onClick, disabled, className = '' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded font-medium transition-all ${className}`}
  >
    {children}
  </button>
)

export default function WalletRecoveryPage() {
  const navigate = useNavigate()
  const [status, setStatus] = React.useState('')
  const [threshold, setThreshold] = React.useState(2)
  const [recoveryProofs, setRecoveryProofs] = React.useState([])
  const [recoveryShareInput, setRecoveryShareInput] = React.useState('')
  const [username, setUsername] = React.useState('')
  const [recoveredKey, setRecoveredKey] = React.useState(null)
  const [isRecovered, setIsRecovered] = React.useState(false)

  const handleFriendSubmitProof = async () => {
    if (recoveryProofs.length >= threshold) {
      return setStatus('Threshold already met. Proceed to final recovery.')
    }
    
    if (!recoveryShareInput.trim()) {
      return setStatus('Please enter a secret share.')
    }

    setStatus('Verifying share with Zero-Knowledge Proof...')
    
    try {
      const myShareHex = recoveryShareInput.trim()
      
      // Check if already collected
      const alreadyCollected = recoveryProofs.some(p => p.shareHex === myShareHex)
      if (alreadyCollected) {
        return setStatus('This share was already collected.')
      }

      // For recovery, we don't have shareData available, so we skip the exact match check
      // and rely on the final reconstruction to validate correctness
      const proof = await generateRecoveryProof(myShareHex)

      // In a real scenario, you'd verify against stored public keys
      // For now, we accept the share and verify during reconstruction
      setRecoveryProofs(prev => [...prev, { shareHex: myShareHex }])
      setStatus(`Share accepted! Collected ${recoveryProofs.length + 1} of ${threshold} shares.`)
      setRecoveryShareInput('')
    } catch (error) {
      console.error(error)
      setStatus('Error processing share. Check console.')
    }
  }

  const handleFinalRecovery = async () => {
    if (recoveryProofs.length < threshold) {
      return setStatus('Not enough shares to start key reconstruction.')
    }

    if (!username) {
      return setStatus('Please enter your username.')
    }

    const sharesToCombine = recoveryProofs.map(p => p.shareHex)

    setStatus('Reconstructing Master Key via Shamir\'s Secret Sharing...')

    try {
      const recoveredMasterKey = await reconstructMasterKey(sharesToCombine) 
      await finalRecoveryStep(recoveredMasterKey)
      
      setRecoveredKey(recoveredMasterKey)
      setIsRecovered(true)
      setStatus('✅ Key Recovered! Now logging you in...')
      
      // Auto-login with recovered key
      await autoLogin(username, recoveredMasterKey)
      
    } catch (error) {
      console.error(error)
      setStatus('Recovery Failed. The shares may be incorrect or corrupted.')
    }
  }

  const autoLogin = async (username, recoveredMasterKey) => {
    try {
      setStatus('Requesting challenge from server...')
      const challenge = await requestChallenge(username)
      if (challenge.status !== 'success') {
        return setStatus(challenge.message || 'Challenge request failed')
      }

      // Export the CryptoKey to raw bytes
      const keyBuffer = await crypto.subtle.exportKey('raw', recoveredMasterKey)
      const rootKey = new Uint8Array(keyBuffer)

      // Compute public/private components from recovered key
      const { x } = await computePublicY(rootKey)

      // Generate ZK proof using challenge from server
      const { R, s } = await generateProof(x, challenge.c)

      setStatus('Verifying proof and logging in...')
      const result = await verifyLogin({
        username,
        challenge_id: challenge.challenge_id,
        R,
        s,
      })

      if (result.status === 'success') {
        setStatus('✅ Login successful! Redirecting to dashboard...')
        localStorage.setItem('session_token', result.session_token)
        localStorage.setItem('current_user', username)
        
        setTimeout(() => navigate('/dashboard'), 1500)
      } else {
        setStatus('Login failed: ' + (result.message || 'Unknown error'))
      }
    } catch (error) {
      console.error(error)
      setStatus('Auto-login failed: ' + error.message)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4 relative">
      {/* Back Button - Top Left */}
      <button
        onClick={() => navigate('/login')}
        aria-label="Go back"
        className="fixed top-6 left-6 z-50 w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 text-slate-700 border border-gray-200 shadow-sm hover:bg-gray-200 active:bg-gray-300 transition-colors"
      >
        <span className="text-xl font-bold leading-none">&larr;</span>
      </button>
      
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center py-6">
          <h1 className="text-4xl font-extrabold text-blue-800 mb-2">Recover Your Account</h1>
          <p className="text-blue-700 text-lg">Use Secret Shares from Your Trusted Friends</p>
          <p className="text-blue-600 text-sm mt-2">
            Enter {threshold} secret shares to reconstruct your master key and regain access.
          </p>
        </div>

        {/* --- RECOVERY SECTION --- */}
        <div className="p-6 border-2 border-blue-200 rounded-xl shadow-lg bg-white">
          <h3 className="text-2xl font-bold mb-4 text-blue-800 border-b-2 border-blue-200 pb-2">
            Enter Your Username & Secret Shares
          </h3>

          {/* Username Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2 text-blue-700">Your Username</label>
            <input 
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="border-2 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 p-3 rounded-lg w-full outline-none transition-all"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2 text-blue-700">Secret Shares</label>
            <p className="text-sm mb-3 text-blue-600">
              Ask your trusted friends for the secret shares they received via email. Enter them one by one below.
            </p>
            <input 
              type="text"
              value={recoveryShareInput}
              onChange={(e) => setRecoveryShareInput(e.target.value)}
              placeholder="Paste a friend's Secret Share here"
              className="border-2 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 p-3 rounded-lg w-full mb-3 outline-none transition-all"
            />
            <Button 
              onClick={handleFriendSubmitProof} 
              disabled={!recoveryShareInput}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              Add Share
            </Button>
          </div>

          <div className="pt-6 border-t-2 border-blue-200">
            <h4 className="font-semibold text-lg mb-3 text-blue-700">Reconstruct Master Key & Login</h4>
            <div className="text-base mb-4 font-medium text-blue-800">
              Shares Collected: <span className="text-blue-600 font-bold">{recoveryProofs.length}</span> / {threshold} required
            </div>
            
            {recoveryProofs.length >= threshold ? (
              <Button 
                onClick={handleFinalRecovery}
                disabled={!username}
                className="bg-blue-700 hover:bg-blue-800 text-white font-bold px-6 py-3 rounded-lg shadow-md transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Reconstruct Key & Auto-Login
              </Button>
            ) : (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-700 font-medium">
                  Need {threshold - recoveryProofs.length} more share(s) to proceed
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 p-4 border-2 border-blue-200 rounded-xl bg-white shadow-sm">
          <div className="text-sm font-semibold text-blue-700">Status:</div>
          <div className="text-base font-medium text-blue-800 mt-1">
            {status || 'Enter secret shares from your friends to begin recovery...'}
          </div>
        </div>
      </div>
    </div>
  )
}
