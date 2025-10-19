import  { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lock, Eye, EyeOff, Shield, Sun, Moon, LogOut, Plus, Search, 
  Edit2, Trash2, Copy, Globe, Mail, CreditCard, Key, Settings, Home,
  X, Check, AlertCircle, RefreshCw, Filter, ChevronDown, Calendar
} from 'lucide-react';
import { decryptVault, deriveVaultKey, encryptVault } from '@/utils/vault';
import { getVault, updateVault, addPlainEntry, getPlainEntries, deletePlainEntry, logout } from '@/utils/api';
import { deriveRootKey } from '@/utils/kdf';



export default function Dashboard() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // REAL VAULT DATA - replace mock
  const [passwords, setPasswords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newPassword, setNewPassword] = useState({
    name: '',
    username: '',
    password: '',
    website: '',
    category: 'other',
    notes: ''
  });

  const [visiblePasswords, setVisiblePasswords] = useState(new Set());
  const [copiedId, setCopiedId] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordPromptValue, setPasswordPromptValue] = useState('');

  // Password Generator State
  const [generatorConfig, setGeneratorConfig] = useState({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true
  });
  const [generatedPassword, setGeneratedPassword] = useState('');

  // Load vault data on component mount
  useEffect(() => {
    loadVaultData();
  }, []);

  const loadVaultData = async () => {
    try {
      setLoading(true);
      const sessionToken = localStorage.getItem('session_token');
      const username = localStorage.getItem('current_user');
      
      if (!sessionToken || !username) {
        navigate('/login');
        return;
      }

      // Try loading persisted plaintext entries first (stored without encryption)
      try {
        const plainResp = await getPlainEntries();
        if (plainResp && plainResp.status === 'success' && Array.isArray(plainResp.entries)) {
          setPasswords(plainResp.entries || []);
          setLoading(false);
          return; // prefer plain entries as the source of truth for the UI
        }
      } catch (e) {
        // ignore and fallback to encrypted vault
        console.warn('Failed to load plain entries, falling back to encrypted vault:', e);
      }
      // Get encrypted vault from server
      const vaultResponse = await getVault();
      if (vaultResponse.status !== 'success') {
        throw new Error('Failed to fetch vault');
      }

      // Get stored keys for decryption
      const salt_kdf = localStorage.getItem(`salt_kdf_${username}`);
      const kdf_params = JSON.parse(localStorage.getItem(`kdf_params_${username}`));
      const password = sessionStorage.getItem('temp_password');
      
      if (!salt_kdf || !kdf_params || !password) {
        // If the session doesn't have the in-memory master password, prompt the user to re-enter it
        console.warn('Missing decryption data; prompting for master password');
        setShowPasswordPrompt(true);
        return;
      }

      // Derive keys and decrypt
      const saltBytes = Uint8Array.from(atob(salt_kdf), c => c.charCodeAt(0));
      const rootKey = await deriveRootKey(password, saltBytes, kdf_params);
      const vaultKey = await deriveVaultKey(rootKey, username);
      
      const decryptedVault = await decryptVault(vaultResponse.vault_blob, vaultKey, username);
      
      // Set the actual passwords from vault
      setPasswords(decryptedVault.passwords || []);
      
    } catch (error) {
      console.error('Failed to load vault:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update vault on server
  const updateVaultOnServer = async (updatedPasswords) => {
    try {
      const username = localStorage.getItem('current_user');
      const salt_kdf = localStorage.getItem(`salt_kdf_${username}`);
        const kdf_params = JSON.parse(localStorage.getItem(`kdf_params_${username}`));
        const password = sessionStorage.getItem('temp_password');

        if (!password) {
          // Missing in-memory temp password used for decryption/encryption
          return { success: false, code: 'MISSING_TEMP_PASSWORD', error: 'Master password not available in session. Please re-enter your master password to save.' };
        }

      const saltBytes = Uint8Array.from(atob(salt_kdf), c => c.charCodeAt(0));
      const rootKey = await deriveRootKey(password, saltBytes, kdf_params);
      const vaultKey = await deriveVaultKey(rootKey, username);

      // Create updated vault
      const updatedVault = {
        passwords: updatedPasswords,
        wallet: null
      };

      // Encrypt and send to server
      const vault_blob = await encryptVault(updatedVault, vaultKey, username);
      const updateResponse = await updateVault(vault_blob);

      if (!updateResponse || updateResponse.status !== 'success') {
        const err = updateResponse && updateResponse.message ? updateResponse.message : 'Unknown server error';
        console.error('Vault update failed, server response:', updateResponse);
        return { success: false, error: String(err) };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to update vault:', error);
      return { success: false, error: error.message || String(error) };
    }
  };

  // Password management functions
  const handleAddPassword = async () => {
    const newPasswordEntry = {
      id: Date.now(),
      ...newPassword,
      favorite: false,
      lastModified: new Date().toISOString().split('T')[0],
      strength: 'medium'
    };
    
    const updatedPasswords = [...passwords, newPasswordEntry];
  // Close modal immediately (optimistic UX), add locally and attempt to persist. If persist fails mark as pending
  setShowAddModal(false);
  setPasswords(updatedPasswords);
  // Per user request: store entries in MongoDB WITHOUT encryption under plain_entries
  try {
    const addRes = await addPlainEntry(newPasswordEntry);
    if (!addRes || addRes.status !== 'success') {
      // fallback: mark pending and show error
      setPasswords(prev => prev.map(p => p.id === newPasswordEntry.id ? { ...p, pending: true } : p));
      setSaveError(addRes && addRes.message ? addRes.message : 'Failed to save plain entry');
    } else {
      // saved successfully
      setNewPassword({
        name: '',
        username: '',
        password: '',
        website: '',
        category: 'other',
        notes: ''
      });
      setSaveError(null);
    }
  } catch (err) {
    // optimistic UI already added entry; mark pending for retry
    setPasswords(prev => prev.map(p => p.id === newPasswordEntry.id ? { ...p, pending: true } : p));
    setSaveError(err.message || 'Network error while saving plain entry');
  }
  };

  // Retry syncing any pending entries (attempts to upload the full vault again)
  const syncPendingPasswords = async () => {
    const pending = passwords.some(p => p.pending);
    if (!pending) return;
    const updated = passwords.map(p => { const cp = { ...p }; delete cp.pending; return cp; });
    const result = await updateVaultOnServer(updated);
    if (result.success) {
      setPasswords(updated);
      setSaveError(null);
    } else {
      setSaveError(result.error || 'Sync failed');
    }
  };

  // Old delete handler (encrypted-vault flow) removed. Deletion now uses API deletePlainEntry in the UI actions.

  const toggleFavorite = async (id) => {
    const updatedPasswords = passwords.map(p => 
      p.id === id ? { ...p, favorite: !p.favorite } : p
    );
    setPasswords(updatedPasswords);
    
    await updateVaultOnServer(updatedPasswords);
  };

  // UI helper functions
  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const generatePassword = () => {
    let charset = '';
    if (generatorConfig.uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (generatorConfig.lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (generatorConfig.numbers) charset += '0123456789';
    if (generatorConfig.symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    let password = '';
    for (let i = 0; i < generatorConfig.length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setGeneratedPassword(password);
  };


  // Categories
  const categories = [
    { id: 'all', name: 'All Items', icon: Key, count: passwords.length },
    { id: 'email', name: 'Email', icon: Mail, count: passwords.filter(p => p.category === 'email').length },
    { id: 'social', name: 'Social Media', icon: Globe, count: passwords.filter(p => p.category === 'social').length },
    { id: 'financial', name: 'Financial', icon: CreditCard, count: passwords.filter(p => p.category === 'financial').length },
    { id: 'entertainment', name: 'Entertainment', icon: Globe, count: passwords.filter(p => p.category === 'entertainment').length },
  ];

  // Filter passwords
  const filteredPasswords = passwords.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStrengthColor = (strength) => {
    switch(strength) {
      case 'weak': return darkMode ? 'text-red-400' : 'text-red-600';
      case 'medium': return darkMode ? 'text-yellow-400' : 'text-yellow-600';
      case 'strong': return darkMode ? 'text-green-400' : 'text-green-600';
      default: return darkMode ? 'text-gray-400' : 'text-gray-600';
    }
  };

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'email': return Mail;
      case 'social': return Globe;
      case 'financial': return CreditCard;
      default: return Key;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        darkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Loading your vault...
          </p>
        </div>
      </div>
    );
  }

  // Normal dashboard content when not loading
  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      
      {/* Header */}
      <header className={`sticky top-0 z-40 border-b transition-colors ${
        darkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          {saveError && (
            <div className="mb-2">
              <div className="rounded-md p-3 bg-yellow-50 border border-yellow-200 flex items-center justify-between">
                <div className="text-sm text-yellow-800">{saveError}</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => syncPendingPasswords()} className="px-3 py-1 bg-yellow-600 text-white rounded">Retry</button>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                darkMode ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gradient-to-br from-green-500 to-green-600'
              }`}>
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  ZeroVault
                </h1>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Password Manager
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              <button
                onClick={() => navigate('/')}
                className={`px-3 py-2 rounded-lg transition flex items-center gap-2 ${
                  darkMode 
                    ? 'bg-gray-700 bg-opacity-10 hover:bg-opacity-20 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <Home className="w-4 h-4" />
                <span className="text-sm font-semibold">Home</span>
              </button>

              <button
                onClick={async () => {
                  try {
                    await logout();
                  } catch (e) {
                    console.warn('Logout request failed:', e);
                  }
                  // Clear session storage and known session keys then redirect to login
                  try {
                    localStorage.removeItem('session_token');
                    localStorage.removeItem('session_user');
                    localStorage.removeItem('current_user');
                    localStorage.removeItem('vault_enc');
                    localStorage.removeItem('wallet_priv_enc');
                  } catch {
                    // ignore
                  }
                  navigate('/login');
                }}
                className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                  darkMode 
                    ? 'bg-red-500 bg-opacity-20 hover:bg-opacity-30 text-red-400' 
                    : 'bg-red-50 hover:bg-red-100 text-red-600'
                }`}
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-semibold">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Password re-entry modal for missing temp password */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-lg ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
            <h3 className="text-lg font-semibold mb-2">Re-enter Master Password</h3>
            <p className="text-sm mb-4">To save pending items we need your master password for key derivation. This is stored only in your session.</p>
            <input type="password" value={passwordPromptValue} onChange={(e) => setPasswordPromptValue(e.target.value)} className="w-full px-3 py-2 rounded mb-4" placeholder="Master password" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowPasswordPrompt(false)} className="px-3 py-2 rounded bg-gray-200">Cancel</button>
              <button onClick={async () => {
                // Save to session and attempt to decrypt and sync
                sessionStorage.setItem('temp_password', passwordPromptValue);
                setShowPasswordPrompt(false);
                // Reload vault data (which will decrypt with the provided password)
                try {
                  await loadVaultData();
                } catch (e) {
                  console.error('Failed to load vault after re-entering password', e);
                }
                // Then try to sync pending entries
                await syncPendingPasswords();
                setPasswordPromptValue('');
              }} className="px-3 py-2 rounded bg-blue-600 text-white">Save & Retry</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          
          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-3">
            <div className={`rounded-xl p-4 ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <h3 className={`text-sm font-bold mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Categories
              </h3>
              <div className="space-y-2">
                {categories.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition ${
                        selectedCategory === cat.id
                          ? darkMode
                            ? 'bg-blue-500 bg-opacity-20 text-blue-400'
                            : 'bg-green-100 text-green-700'
                          : darkMode
                            ? 'text-gray-400 hover:bg-gray-700'
                            : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{cat.name}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        selectedCategory === cat.id
                          ? darkMode ? 'bg-blue-500' : 'bg-green-500'
                          : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                      } text-white`}>
                        {cat.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-12 lg:col-span-9">
            
            {/* Search & Actions Bar */}
            <div className={`rounded-xl p-4 mb-6 ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className={`absolute left-3 top-3 w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search passwords..."
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg outline-none transition ${
                      darkMode 
                        ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500' 
                        : 'border border-gray-200 focus:ring-2 focus:ring-green-500'
                    }`}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPasswordGenerator(true)}
                    className={`px-4 py-2.5 rounded-lg transition flex items-center gap-2 ${
                      darkMode 
                        ? 'bg-purple-500 bg-opacity-20 hover:bg-opacity-30 text-purple-400' 
                        : 'bg-purple-50 hover:bg-purple-100 text-purple-600'
                    }`}
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span className="text-sm font-semibold hidden sm:block">Generate</span>
                  </button>

                  <button
                    onClick={() => setShowAddModal(true)}
                    className={`px-4 py-2.5 rounded-lg transition flex items-center gap-2 ${
                      darkMode 
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' 
                        : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                    } text-white font-semibold shadow-lg`}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Add Password</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Password Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPasswords.map(item => {
                const CategoryIcon = getCategoryIcon(item.category);
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl p-5 transition-all hover:scale-[1.02] ${
                      darkMode 
                        ? 'bg-gray-800 border border-gray-700 hover:border-blue-500' 
                        : 'bg-white border border-gray-200 hover:border-green-500 hover:shadow-lg'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          darkMode ? 'bg-gray-700' : 'bg-gray-100'
                        }`}>
                          <CategoryIcon className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-green-600'}`} />
                        </div>
                        <div>
                          <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {item.name}
                          </h3>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {item.website}
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => toggleFavorite(item.id)}
                        className={`text-xl transition ${
                          item.favorite 
                            ? 'text-yellow-500' 
                            : darkMode ? 'text-gray-600 hover:text-yellow-500' : 'text-gray-300 hover:text-yellow-500'
                        }`}
                      >
                        ★
                      </button>
                    </div>

                    {/* Username */}
                    <div className="mb-3">
                      <label className={`text-xs font-semibold mb-1 block ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Username
                      </label>
                      <div className="flex items-center gap-2">
                        <p className={`flex-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {item.username}
                        </p>
                        <button
                          onClick={() => copyToClipboard(item.username, `user-${item.id}`)}
                          className={`p-1.5 rounded transition ${
                            darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                          }`}
                        >
                          {copiedId === `user-${item.id}` ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Password */}
                    <div className="mb-4">
                      <label className={`text-xs font-semibold mb-1 block ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Password
                      </label>
                      <div className="flex items-center gap-2">
                        <p className={`flex-1 text-sm font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {visiblePasswords.has(item.id) ? item.password : '••••••••••••'}
                        </p>
                        <button
                          onClick={() => togglePasswordVisibility(item.id)}
                          className={`p-1.5 rounded transition ${
                            darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                          }`}
                        >
                          {visiblePasswords.has(item.id) ? (
                            <EyeOff className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          ) : (
                            <Eye className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(item.password, `pass-${item.id}`)}
                          className={`p-1.5 rounded transition ${
                            darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                          }`}
                        >
                          {copiedId === `pass-${item.id}` ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-xs font-medium ${getStrengthColor(item.strength)}`}>
                          Strength: {item.strength}
                        </span>
                        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          Modified: {item.lastModified}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (!confirm('Are you sure you want to delete this password?')) return;
                          // Optimistic UI update
                          const prev = passwords;
                          const updated = passwords.filter(p => p.id !== item.id);
                          setPasswords(updated);
                          try {
                            // attempt to delete via API (plaintext storage)
                            const del = await deletePlainEntry(item.id);
                            if (!del || del.status !== 'success') {
                              // restore and show error
                              setPasswords(prev);
                              alert(del && del.message ? del.message : 'Failed to delete entry on server');
                            }
                          } catch (e) {
                            console.error('Error deleting entry:', e);
                            setPasswords(prev);
                            alert('Network error while deleting entry');
                          }
                        }}
                        className={`flex-1 px-3 py-2 rounded-lg transition flex items-center justify-center gap-2 text-sm font-medium ${
                          darkMode 
                            ? 'bg-red-500 bg-opacity-20 hover:bg-opacity-30 text-red-400' 
                            : 'bg-red-50 hover:bg-red-100 text-red-600'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty State */}
            {filteredPasswords.length === 0 && (
              <div className={`rounded-xl p-12 text-center ${
                darkMode ? 'bg-gray-800' : 'bg-white'
              }`}>
                <Shield className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  No passwords found
                </h3>
                <p className={`text-sm mb-6 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  {searchQuery ? 'Try a different search term' : 'Add your first password to get started'}
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className={`px-6 py-3 rounded-lg font-semibold ${
                    darkMode 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' 
                      : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                  } text-white`}
                >
                  Add Password
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Password Modal */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-black/30 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-xl p-6 ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Add New Password
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className={`p-2 rounded-lg transition ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <X className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleAddPassword(); }} className="space-y-4">
              <div>
                <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Service Name
                </label>
                <input
                  type="text"
                  value={newPassword.name}
                  onChange={(e) => setNewPassword({...newPassword, name: e.target.value})}
                  required
                  className={`w-full px-4 py-2.5 rounded-lg outline-none transition ${
                    darkMode 
                      ? 'bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500' 
                      : 'border border-gray-200 focus:ring-2 focus:ring-green-500'
                  }`}
                  placeholder="e.g., Gmail"
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Username/Email
                </label>
                <input
                  type="text"
                  value={newPassword.username}
                  onChange={(e) => setNewPassword({...newPassword, username: e.target.value})}
                  required
                  className={`w-full px-4 py-2.5 rounded-lg outline-none transition ${
                    darkMode 
                      ? 'bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500' 
                      : 'border border-gray-200 focus:ring-2 focus:ring-green-500'
                  }`}
                  placeholder="username@example.com"
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Password
                </label>
                <input
                  type="text"
                  value={newPassword.password}
                  onChange={(e) => setNewPassword({...newPassword, password: e.target.value})}
                  required
                  className={`w-full px-4 py-2.5 rounded-lg outline-none transition ${
                    darkMode 
                      ? 'bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500' 
                      : 'border border-gray-200 focus:ring-2 focus:ring-green-500'
                  }`}
                  placeholder="Enter password"
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Website URL
                </label>
                <input
                  type="url"
                  value={newPassword.website}
                  onChange={(e) => setNewPassword({...newPassword, website: e.target.value})}
                  className={`w-full px-4 py-2.5 rounded-lg outline-none transition ${
                    darkMode 
                      ? 'bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500' 
                      : 'border border-gray-200 focus:ring-2 focus:ring-green-500'
                  }`}
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Category
                </label>
                <select
                  value={newPassword.category}
                  onChange={(e) => setNewPassword({...newPassword, category: e.target.value})}
                  className={`w-full px-4 py-2.5 rounded-lg outline-none transition ${
                    darkMode 
                      ? 'bg-gray-700 border border-gray-600 text-white focus:ring-2 focus:ring-blue-500' 
                      : 'border border-gray-200 focus:ring-2 focus:ring-green-500'
                  }`}
                >
                  <option value="email">Email</option>
                  <option value="social">Social Media</option>
                  <option value="financial">Financial</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition ${
                    darkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-white ${
                    darkMode 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' 
                      : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                  }`}
                >
                  Add Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Generator Modal */}
        {showPasswordGenerator && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`w-full max-w-md rounded-xl p-6 ${
          darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Password Generator
            </h2>
            <button
              onClick={() => setShowPasswordGenerator(false)}
              className={`p-2 rounded-lg transition ${
            darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <X className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
          </div>

          {/* Generated Password Display */}
            <div className={`p-4 rounded-lg mb-6 ${
              darkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}>
              <div className="flex items-center justify-between">
                <p className={`font-mono text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {generatedPassword || 'Click generate'}
                </p>
                <button
                  onClick={() => copyToClipboard(generatedPassword, 'generated')}
                  className={`p-2 rounded-lg transition ${
                    darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                  }`}
                >
                  {copiedId === 'generated' ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <Copy className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                  )}
                </button>
              </div>
            </div>

            {/* Length Slider */}
            <div className="mb-6">
              <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Length: {generatorConfig.length}
              </label>
              <input
                type="range"
                min="8"
                max="32"
                value={generatorConfig.length}
                onChange={(e) => setGeneratorConfig({...generatorConfig, length: parseInt(e.target.value)})}
                className="w-full"
              />
            </div>

            {/* Options */}
            <div className="space-y-3 mb-6">
              {[
                { key: 'uppercase', label: 'Uppercase (A-Z)' },
                { key: 'lowercase', label: 'Lowercase (a-z)' },
                { key: 'numbers', label: 'Numbers (0-9)' },
                { key: 'symbols', label: 'Symbols (!@#$...)' }
              ].map(option => (
                <label key={option.key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generatorConfig[option.key]}
                    onChange={(e) => setGeneratorConfig({...generatorConfig, [option.key]: e.target.checked})}
                    className={`w-4 h-4 rounded focus:ring-2 ${
                      darkMode ? 'text-blue-600 focus:ring-blue-500' : 'text-green-600 focus:ring-green-500'
                    }`}
                  />
                  <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>

            {/* Generate Button */}
            <button
              onClick={generatePassword}
              className={`w-full px-4 py-3 rounded-lg font-semibold text-white flex items-center justify-center gap-2 ${
                darkMode 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' 
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
              }`}
            >
              <RefreshCw className="w-5 h-5" />
              Generate Password
            </button>
          </div>
        </div>
      )}
    </div>
  );
}