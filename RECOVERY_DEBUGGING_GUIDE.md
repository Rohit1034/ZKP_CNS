# 🔍 Recovery Debugging Guide

## What I Added

I've added comprehensive logging throughout the entire recovery flow to help diagnose exactly where and why recovery is failing.

---

## 📋 How to Debug Your Recovery Issue

### Step 1: Clear Everything and Start Fresh
```javascript
// Open browser console (F12), paste this:
localStorage.clear()
location.reload()
```

### Step 2: Register a New Account
1. Go to Registration page
2. Username: `debug_test`
3. Password: `TestPass123`
4. Click Register

### Step 3: Setup Wallet (Watch Console Logs)
1. Go to Wallet Setup
2. **Use the SAME password:** `TestPass123`
3. Set N=3, T=2
4. Add friend emails
5. Click "Create & Split Key"
6. **Open browser console (F12)** and look for these logs:

**Expected Console Output:**
```
🔍 Wallet Setup: Root key derived, length: 32 bytes
✅ Wallet Setup: Master key imported as CryptoKey
✅ Wallet Setup: ECDSA keypair generated, private key length: XXX
✅ Wallet Setup: Wallet encrypted, ciphertext length: XXX
✅ Wallet Setup: Encrypted wallet stored in localStorage
🔍 SSS Split: Starting with T=2, N=3
🔍 SSS Split: Exported raw key, length: 32 bytes
🔍 SSS Split: Using 32 bytes for splitting
🔍 SSS Split: Key (hex): [32-byte hex string]
✅ SSS Split: Generated 3 shares
Share buffer lengths: [33, 33, 33]
✅ SSS Split: Converted to hex, lengths: [66, 66, 66]
✅ Wallet Setup: Master key split into 3 shares
Share lengths: [66, 66, 66]
```

**✅ If shares are 66 characters each → Good! Continue to Step 4**
**❌ If shares are 128+ characters → Root key is wrong size**

### Step 4: Save Shares
Copy any 2 shares from the emails or screen display.

**Example:**
```
Share 1: 01a3f5e8b2c1d4f6a7b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3
Share 2: 02b4f6e9c2d5f7a8bac1d2e3f4a5b6c7d8e9fab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5
```

### Step 5: Test Recovery (Watch Console Logs)
```javascript
// Clear localStorage to simulate lost password:
localStorage.clear()
location.reload()
```

1. Go to Recovery page
2. Username: `debug_test`
3. Paste Share 1 → Click "Add Share"
4. Paste Share 2 → Click "Add Share"
5. Click "Reconstruct Key & Auto-Login"
6. **Watch the console logs carefully**

**Expected Console Output:**
```
🔍 Attempting to reconstruct key with shares: [share1, share2]
🔍 SSS: Starting reconstruction with 2 shares
Share lengths: [66, 66]
🔍 SSS: Converted to buffers, lengths: [33, 33]
🔍 SSS: Combined key buffer length: 32
🔍 SSS: Recovered key (hex): [same 32-byte hex as in Step 3]
✅ SSS: Successfully imported as CryptoKey
✅ Master key reconstructed successfully
🔍 Final Recovery: Looking for encrypted wallet...
✅ Final Recovery: Found encrypted wallet
🔍 Final Recovery: Encrypted data length: XXX, IV length: 12
🔍 Final Recovery: Attempting decryption...
✅ Final Recovery: Decryption successful, private key length: XXX
🔍 Final Recovery: Importing ECDSA key, bytes length: XXX
✅ Final Recovery: ECDSA key imported successfully
✅ Key Recovered! Now logging you in...
```

---

## 🐛 Common Error Patterns

### Error Pattern 1: SSS Reconstruction Fails
**Console shows:**
```
❌ SSS: Reconstruction failed: Error: ...
```

**Possible causes:**
1. **Share length mismatch** - One share is corrupt or incomplete
2. **Wrong shares** - Shares from different wallet setups
3. **SSS library error** - Shares don't meet threshold requirements

**Solution:**
- Check all share lengths are the same (should be 66 hex chars)
- Verify shares are from the SAME wallet setup session
- Try with different combinations of shares

### Error Pattern 2: Recovered Key Wrong Size
**Console shows:**
```
🔍 SSS: Combined key buffer length: 64  ← Should be 32!
```

**Cause:** The SSS library reconstructed a 64-byte key instead of 32-byte.

**Solution:** This means the original key split was 64 bytes. Check Step 3 logs to see if the split key was 64 bytes.

### Error Pattern 3: Decryption Fails
**Console shows:**
```
✅ SSS: Successfully imported as CryptoKey
✅ Master key reconstructed successfully
❌ Final Recovery: Decryption or import failed: OperationError
```

**Cause:** The reconstructed key is different from the original encryption key.

**This is the most likely issue!**

**Why it happens:**
1. Password used during wallet setup was DIFFERENT from registration password
2. The key was not derived consistently
3. Browser cached old data

**Solution:**
- Make absolutely sure you use the EXACT SAME password for registration and wallet setup
- Clear localStorage before each test
- Check the key hex in Step 3 vs Step 5 - they should match!

### Error Pattern 4: Encrypted Wallet Not Found
**Console shows:**
```
❌ Final Recovery: Encrypted wallet not found in localStorage
```

**Cause:** You cleared localStorage after wallet setup but before testing recovery.

**Solution:**
- Complete wallet setup BEFORE clearing localStorage
- Only clear localStorage AFTER you have the shares saved

---

## 🎯 What to Look For

### Critical Check #1: Key Size Consistency
**During Setup (Step 3):**
```
🔍 SSS Split: Using 32 bytes for splitting
```

**During Recovery (Step 5):**
```
🔍 SSS: Combined key buffer length: 32
```

**✅ Both should be 32 bytes!**

### Critical Check #2: Key Value Matches
**During Setup (Step 3):**
```
🔍 SSS Split: Key (hex): abc123...
```

**During Recovery (Step 5):**
```
🔍 SSS: Recovered key (hex): abc123...
```

**✅ The hex strings should be IDENTICAL!**

If they're different → The reconstructed key is wrong → Decryption will fail.

### Critical Check #3: Share Lengths
**All shares should be the same length:**
```
Share lengths: [66, 66, 66]  ← All 66 hex chars (33 bytes)
```

**❌ If they're different lengths → SSS will fail**

---

## 🔧 Quick Fixes

### Fix 1: If shares are 128+ characters
The root key is 64 bytes instead of 32 bytes.

**Check `kdf.js`:**
```javascript
deriveBits(..., 256)  // Should be 256 bits = 32 bytes
```

### Fix 2: If reconstructed key is different from original
**Most likely:** Password mismatch between registration and wallet setup.

**Workaround:**
1. During wallet setup, enter password in console:
   ```javascript
   localStorage.setItem('setup_password', 'TestPass123')
   ```
2. Read it during recovery:
   ```javascript
   const pwd = localStorage.getItem('setup_password')
   ```

### Fix 3: If SSS combine fails with "Invalid shares"
**Cause:** Shares are corrupt or from different setups.

**Solution:**
- Copy shares directly from browser console logs (more reliable than emails)
- During setup, log shares to console:
  ```javascript
  console.log('SAVE THESE SHARES:', JSON.stringify(hexShares))
  ```
- During recovery, use those exact shares

---

## 📊 Checklist Before Recovery

Before attempting recovery, verify:
- [ ] Wallet setup completed successfully (no errors)
- [ ] Encrypted wallet exists in localStorage (`wallet_priv_final_enc`)
- [ ] All shares are 66 hex characters (33 bytes)
- [ ] Shares are from the SAME wallet setup session
- [ ] You have at least T shares (default: 2)
- [ ] Browser console is open to see logs
- [ ] You know the username used during registration

---

## 🚀 Testing Script

Here's a complete test script you can paste in the console:

```javascript
// Step 1: Clear and check
localStorage.clear()
console.log('✅ localStorage cleared')

// After registration + wallet setup, verify:
console.log('Checking wallet setup...')
const wallet = localStorage.getItem('wallet_priv_final_enc')
const pubKey = localStorage.getItem('wallet_pub_jwk')
console.log('Wallet exists:', !!wallet)
console.log('Public key exists:', !!pubKey)

if (wallet) {
  const w = JSON.parse(wallet)
  console.log('Encrypted data length:', w.data.length)
  console.log('IV length:', w.iv.length)
}

// Before recovery, save your shares:
const share1 = '01a3f5e8b2...' // Paste from email
const share2 = '02b4f6e9c2...' // Paste from email
console.log('Share 1 length:', share1.length)
console.log('Share 2 length:', share2.length)

// After recovery test:
console.log('Session token:', localStorage.getItem('session_token'))
console.log('Current user:', localStorage.getItem('current_user'))
```

---

## 💡 What the Logs Will Tell You

### If you see:
```
✅ SSS: Successfully imported as CryptoKey
✅ Master key reconstructed successfully
❌ Final Recovery: Decryption or import failed
```

**This means:**
- SSS reconstruction worked perfectly ✅
- The shares combined correctly ✅
- BUT the reconstructed key is DIFFERENT from the original encryption key ❌

**Root cause:**
- Different password used for setup vs registration
- OR key derivation is inconsistent

**Fix:**
- Use the exact same password for both registration AND wallet setup
- Don't rely on browser autofill (might fill different passwords)
- Type the password manually in both places

---

## 🎓 Understanding the Flow

```
Registration:
  password → PBKDF2 → root key (32 bytes) → Store params
  
Wallet Setup:
  password → PBKDF2 → root key (32 bytes) → master key
                                          ↓
                              Encrypt wallet with master key
                                          ↓
                              Split master key with SSS → shares
  
Recovery:
  shares → SSS combine → master key (32 bytes)
                      ↓
          Decrypt wallet with master key
```

**For this to work:**
- Same password must be used in Registration and Wallet Setup
- PBKDF2 must use the same salt and iterations
- Master key must be exactly 32 bytes
- SSS must split and combine exactly 32 bytes

---

**Now run the test and share the console logs with me!** 

The logs will show exactly where the issue is. 🔍
