import { requestChallenge, verifyLogin } from '@/utils/api';
import { decryptBackup } from '@/utils/backup';
import { deriveRootKey } from '@/utils/kdf';
import { computePublicY, generateProof } from '@/utils/zkp';
import { ArrowLeft, Eye, EyeOff, Lock, LogIn, Moon, Shield, Sun, User } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState('');

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle form submit
  // Handle form submit
  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('');

    const { username, password } = formData;
    if (!username || !password) return setStatus('Please enter your credentials');

    try {
      console.log('=== LOGIN DEBUG START ===');

      // Normalize username for consistent lookup
      const normalizedUsername = username.trim().toLowerCase();
      console.log('1. Normalized username:', normalizedUsername);

      setStatus('Requesting challenge...');
      console.log('2. Requesting challenge for:', normalizedUsername);
      const challenge = await requestChallenge(normalizedUsername);
      console.log('3. Challenge response:', challenge);

      if (challenge.status !== 'success')
        return setStatus(challenge.message || 'Challenge request failed');

      // Retrieve stored KDF data using NORMALIZED username
      let salt_kdf = localStorage.getItem(`salt_kdf_${normalizedUsername}`);
      let kdf_params = JSON.parse(localStorage.getItem(`kdf_params_${normalizedUsername}`) || 'null');

      console.log('4. Retrieved from localStorage:', {
        salt_kdf_key: `salt_kdf_${normalizedUsername}`,
        salt_kdf_value: salt_kdf,
        salt_kdf_type: typeof salt_kdf,
        salt_kdf_length: salt_kdf?.length,
        kdf_params_key: `kdf_params_${normalizedUsername}`,
        kdf_params_value: kdf_params
      });

      if (!salt_kdf || !kdf_params) {
        console.log('5. Local KDF data missing, checking challenge response...');
        // server included KDF fields in challenge response for devices that don't have local KDF data
        salt_kdf = challenge.salt_kdf || salt_kdf;
        kdf_params = challenge.kdf_params || kdf_params;
        console.log('6. After checking challenge:', {
          salt_kdf_from_challenge: challenge.salt_kdf,
          kdf_params_from_challenge: challenge.kdf_params
        });
      }

      if (!salt_kdf || !kdf_params) {
        console.log('7. NO KDF DATA FOUND ANYWHERE');
        return setStatus('No KDF data found. Please re-register.');
      }

      // Validate salt_kdf before conversion
      console.log('8. Validating salt_kdf before conversion:', {
        is_string: typeof salt_kdf === 'string',
        length: salt_kdf?.length,
        first_10_chars: salt_kdf?.substring(0, 10),
        full_value: salt_kdf
      });

      if (typeof salt_kdf !== 'string') {
        throw new Error(`Salt is not a string: ${typeof salt_kdf}`);
      }

      if (!salt_kdf) {
        throw new Error('Salt is empty');
      }

      // Convert salt from base64 to Uint8Array
      setStatus('Deriving root key...');
      console.log('9. Converting salt from base64 to Uint8Array...');

      let saltBytes;
      try {
        const binaryString = atob(salt_kdf);
        console.log('10. Binary string length:', binaryString.length);

        saltBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          saltBytes[i] = binaryString.charCodeAt(i);
        }
        console.log('11. Salt bytes created:', {
          type: saltBytes.constructor.name,
          length: saltBytes.length,
          first_10_bytes: Array.from(saltBytes).slice(0, 10)
        });
      } catch (e) {
        console.error('12. Failed to convert salt:', e);
        throw new Error(`Invalid salt format: ${e.message}`);
      }

      console.log('13. Calling deriveRootKey with:', {
        password_length: password.length,
        saltBytes_type: saltBytes.constructor.name,
        saltBytes_length: saltBytes.length,
        kdf_params
      });

      const rootKey = await deriveRootKey(password, saltBytes, kdf_params);
      console.log('14. Root key derived, length:', rootKey?.length);

      let x;
      // Try to derive x from local derivation
      try {
        console.log('15. Attempting to compute public Y locally...');
        const computed = await computePublicY(rootKey);
        x = computed.x;
        console.log('16. Local computation successful, x derived');
      } catch (e) {
        console.log('17. Local computation failed:', e.message);
        x = null;
      }

      // If we couldn't compute x locally, try to fetch encrypted backup and decrypt it
      if (!x) {
        setStatus('Fetching encrypted backup...');
        console.log('18. Falling back to encrypted backup...');

        // try using challenge-provided encrypted backup first
        let encrypted = challenge.encrypted_backup;
        if (!encrypted) {
          console.log('19. No backup in challenge, fetching from server...');
          // fetch backup from server using normalized username
          const res = await fetch(`${process.env.REACT_APP_API_BASE || 'http://localhost:5000'}/auth/backup?username=${encodeURIComponent(normalizedUsername)}`);
          const jb = await res.json();
          console.log('20. Backup response:', jb);

          if (jb.status !== 'success') throw new Error(jb.message || 'Failed to fetch backup');
          encrypted = jb.encrypted_backup;
          // if server returned kdf params, prefer them
          salt_kdf = salt_kdf || jb.salt_kdf;
          kdf_params = kdf_params || jb.kdf_params;
        }

        if (!encrypted) throw new Error('No encrypted backup available');

        console.log('21. Decrypting backup...');
        // Decrypt backup using rootKey
        const decryptedHex = await decryptBackup(rootKey, encrypted);
        // decryptedHex is private scalar in hex
        x = BigInt('0x' + decryptedHex);
        console.log('22. Backup decrypted successfully');
      }

      console.log('23. Generating ZK proof...');
      // Generate ZK proof using challenge from server
      const { R, s } = await generateProof(x, challenge.c);

      setStatus('Verifying proof...');
      const result = await verifyLogin({
        username: normalizedUsername, // Use normalized username
        challenge_id: challenge.challenge_id,
        R,
        s,
      });

      console.log('24. Verification result:', result);

      if (result.status === 'success') {
        setStatus('Login successful!');
        localStorage.setItem('session_token', result.session_token);
        localStorage.setItem('current_user', normalizedUsername); // Store normalized username

        // Store password temporarily for vault decryption (cleared on logout)
        sessionStorage.setItem('temp_password', password);

        console.log('25. Login successful, stored session data');

        if (onLoginSuccess) {
          onLoginSuccess();
        }

        setTimeout(() => navigate('/dashboard'), 1000);
      } else {
        setStatus(result.message || 'Login failed');
      }

      console.log('=== LOGIN DEBUG END ===');
    } catch (err) {
      console.error('=== LOGIN ERROR ===', err);
      setStatus('Error: ' + err.message);
    }
  };
  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${darkMode
        ? 'bg-gradient-to-b from-gray-900 via-gray-900 to-black'
        : 'bg-gradient-to-b from-gray-50 via-white to-gray-100'
      }`}>
      {/* Background Blur Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {darkMode ? (
          <>
            <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500 rounded-full blur-3xl opacity-20"></div>
          </>
        ) : (
          <>
            <div className="absolute top-20 left-20 w-96 h-96 bg-green-300 rounded-full blur-3xl opacity-20"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-green-400 rounded-full blur-3xl opacity-20"></div>
          </>
        )}
      </div>

      {/* Dark Mode Toggle */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className={`fixed top-6 right-6 p-2 rounded-lg transition z-50 ${darkMode
            ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        aria-label="Toggle dark mode"
      >
        {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* Back to Home */}
      <button
        onClick={() => navigate('/')}
        className={`fixed top-6 left-6 p-2 rounded-lg transition z-50 ${darkMode
            ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="w-full max-w-md relative z-10">
        <div className={`rounded-2xl shadow-2xl p-8 transition-colors ${darkMode
            ? 'bg-gray-800 border border-blue-500 border-opacity-20'
            : 'bg-white'
          }`}>
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${darkMode ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gradient-to-br from-green-500 to-green-600'
              }`}>
              <Shield className="w-7 h-7 text-white" />
            </div>
          </div>

          {/* Title */}
          <h2 className={`text-3xl font-bold text-center mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Welcome Back
          </h2>
          <p className={`text-center mb-8 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Sign in to access your secure vault
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Username or Email
              </label>
              <div className="relative">
                <User className={`absolute left-3 top-3.5 w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className={`w-full pl-11 pr-4 py-3 rounded-xl transition-all outline-none ${darkMode
                      ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500'
                      : 'border border-gray-200 focus:ring-2 focus:ring-green-500'
                    }`}
                  placeholder="Enter your username"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Master Password
              </label>
              <div className="relative">
                <Lock className={`absolute left-3 top-3.5 w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className={`w-full pl-11 pr-11 py-3 rounded-xl transition-all outline-none ${darkMode
                      ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500'
                      : 'border border-gray-200 focus:ring-2 focus:ring-green-500'
                    }`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-3.5 ${darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Security Notice */}
            <div className={`rounded-xl p-4 text-sm flex items-start gap-2 ${darkMode
                ? 'bg-blue-500 bg-opacity-10 border border-blue-500 border-opacity-30 text-blue-300'
                : 'bg-green-50 border border-green-200 text-green-800'
              }`}>
              <Shield className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>
                Your login is verified using zero-knowledge proofs. Your password never leaves your device.
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className={`w-full py-3.5 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 ${darkMode
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                }`}
            >
              <LogIn className="w-5 h-5" />
              Sign In
            </button>

            {/* Status Message */}
            {status && (
              <p
                className={`mt-4 text-sm font-medium text-center transition-all ${status.toLowerCase().includes('error') ||
                    status.toLowerCase().includes('fail')
                    ? darkMode
                      ? 'text-red-400'
                      : 'text-red-600'
                    : status.toLowerCase().includes('success')
                      ? darkMode
                        ? 'text-green-400'
                        : 'text-green-600'
                      : darkMode
                        ? 'text-gray-400'
                        : 'text-gray-600'
                  }`}
              >
                {status}
              </p>
            )}
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/register')}
              className={`text-sm font-semibold transition-colors ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-green-600 hover:text-green-700'
                }`}
            >
              Don't have an account? <span className="underline">Create one</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}