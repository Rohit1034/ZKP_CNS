# 🔐 Social Recovery Wallet - Testing Guide

## ✅ What Was Fixed

### Critical Issues Resolved:
1. **Missing Encrypted Wallet Storage** - Wallet setup now properly:
   - Generates an ECDSA keypair
   - Encrypts it with the master key
   - Saves it to localStorage as `wallet_priv_final_enc`

2. **Better Share Validation** - Recovery page now:
   - Removes whitespace and line breaks automatically
   - Validates hex format
   - Checks share length
   - Shows clear error messages

3. **Improved User Experience**:
   - Clear instructions on how to paste shares
   - Visual display of collected shares
   - Better status messages
   - Textarea for easier pasting

---

## 🧪 How to Test the Complete Flow

### Step 1: Clear Old Data (IMPORTANT!)
```javascript
// Open browser console (F12) and run:
localStorage.clear()
// Then refresh the page
```

### Step 2: Register a New Account
1. Go to Registration page
2. Enter username and password
3. Click "Register"
4. **Remember this password!** You'll need it for wallet setup

### Step 3: Setup Social Recovery Wallet
1. After registration, navigate to Wallet Setup
2. **Enter the SAME password you used during registration**
3. Set up the wallet:
   - Total Friends (N): 3
   - Threshold (T): 2
   - Your email: your-email@example.com
   - Friend emails: friend1@example.com, friend2@example.com, friend3@example.com
4. Click "Create & Split Key"
5. Wait for emails to be sent

### Step 4: Check Your Emails
Your friends should receive emails with:
```
Secret Share (keep confidential):
a3f5e8b2c1d4f6a7b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2
```

### Step 5: Test Recovery
1. Clear localStorage again (to simulate lost password):
   ```javascript
   localStorage.clear()
   ```
2. Go to Recovery page
3. Enter your username
4. Paste shares:
   - Copy the ENTIRE hex string from friend 1's email
   - Paste it in the textarea (spaces/line breaks are OK)
   - Click "Add Share"
   - Repeat for friend 2's share
5. Once you have 2 shares, click "Reconstruct Key & Auto-Login"

---

## 📋 How to Paste Shares Correctly

### ✅ Correct Ways to Paste:

**Option 1 - Clean hex string:**
```
a3f5e8b2c1d4f6a7b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2
```

**Option 2 - With spaces (will be auto-cleaned):**
```
a3f5 e8b2 c1d4 f6a7 b9c0 d1e2 f3a4 b5c6 d7e8 f9a0 b1c2 d3e4 f5a6 b7c8 d9e0 f1a2
```

**Option 3 - With line breaks (will be auto-cleaned):**
```
a3f5e8b2c1d4f6a7b9c0d1e2f3a4b5c6
d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2
```

### ❌ What NOT to Do:

- Don't include any extra text like "Share:" or "ID: 1"
- Don't paste the same share twice
- Don't paste only part of the share
- Don't modify the hex string

---

## 🔍 Troubleshooting

### Error: "Encrypted wallet not found"
**Cause:** Wallet setup was not completed, or localStorage was cleared before recovery.

**Solution:**
1. Make sure you completed wallet setup BEFORE clearing localStorage
2. To test recovery, follow this order:
   - Register → Setup Wallet → Get shares from email → THEN clear localStorage → Try recovery

### Error: "Invalid share format"
**Cause:** Share contains non-hex characters or is corrupted.

**Solution:**
- Copy the share directly from the email (from the `<code>` block)
- Make sure it only contains: 0-9, a-f, A-F
- Remove any extra text or formatting

### Error: "Recovery Failed. The shares may be incorrect or corrupted."
**Cause:** The shares don't match the master key used during wallet setup.

**Solutions:**
1. Make sure you used the SAME password for wallet setup as registration
2. Make sure the shares are from the SAME wallet setup session
3. Don't mix shares from different setup sessions
4. Copy shares carefully without modification

### Error: "Warning: Share length seems unusual"
**Cause:** Share length is not in the expected range (50-100 hex chars).

**Solutions:**
- For 256-bit AES key split into shares, expect ~66-68 hex characters per share
- If share is much shorter or longer, it may be corrupted or copied incorrectly
- Re-copy from the email

---

## 🎯 Expected Behavior

### During Wallet Setup:
1. Status shows: "Deriving master key from your password..."
2. Status shows: "Creating wallet keypair..."
3. Status shows: "Encrypting wallet with master key..."
4. Status shows: "Splitting master key into shares..."
5. Status shows: "✅ Emails sent to X friend(s). Setup complete!"
6. You are redirected to login page after 2 seconds

### During Recovery:
1. Paste first share → Status: "✅ Share accepted! Collected 1 of 2 shares."
2. Paste second share → Status: "✅ Share accepted! Collected 2 of 2 shares."
3. Click "Reconstruct Key & Auto-Login"
4. Status: "Reconstructing Master Key via Shamir's Secret Sharing..."
5. Status: "✅ Key Recovered! Now logging you in..."
6. Status: "Requesting challenge from server..."
7. Status: "Verifying proof and logging in..."
8. Status: "✅ Login successful! Redirecting to dashboard..."
9. Redirected to dashboard

---

## 🧩 Understanding the Cryptography

### Why Can Any 2 of 3 Shares Recover the Key?

**Shamir's Secret Sharing (SSS)** uses polynomial interpolation:

1. **Setup (T=2, N=3):**
   - Your master key `K` is treated as the constant term of a polynomial `f(x) = K + a₁x`
   - Three points are generated: `(1, f(1))`, `(2, f(2))`, `(3, f(3))`
   - Each point is a "share" sent to a friend

2. **Recovery:**
   - Any 2 points can reconstruct the line (degree-1 polynomial)
   - The y-intercept of this line is `K` (your master key)
   - Shares 1+2, 1+3, or 2+3 all work!

3. **Security:**
   - With only 1 share, the attacker has 1 point
   - Infinite lines pass through 1 point → cannot determine `K`
   - Need exactly T shares to uniquely determine the polynomial

---

## 📧 Email Template Example

Your friends will receive an email like this:

```
From: Social Recovery Wallet <your-email@example.com>
To: friend1@example.com
Subject: Social Recovery Share for john_doe

You've been chosen as a recovery guardian for john_doe's account.

Please save this secret share securely. It will be needed if john_doe loses their password.

Secret Share (keep confidential):
a3f5e8b2c1d4f6a7b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2

IMPORTANT: Keep this private. Anyone with 2 or more shares can access the account!
```

---

## ✨ Summary

### What the System Does:
1. **Registration:** Derives a root key from your password using PBKDF2
2. **Wallet Setup:**
   - Uses the same root key as master key
   - Generates ECDSA wallet keypair
   - Encrypts wallet with master key
   - Splits master key into N shares (using SSS)
   - Emails shares to friends
3. **Recovery:**
   - Collects T shares from friends
   - Reconstructs master key (using SSS)
   - Decrypts wallet keypair
   - Generates ZKP to prove you have the key
   - Auto-logs you in

### Security Properties:
- ✅ Password never sent to server
- ✅ Master key never sent to server
- ✅ Zero-knowledge proof for authentication
- ✅ T-of-N threshold cryptography
- ✅ No single friend can access your account
- ✅ Any T friends can help you recover

---

## 🚀 Next Steps After Successful Test

If recovery works:
1. ✅ You have a working social recovery wallet!
2. Consider adding more friends (increase N)
3. Test with real email addresses
4. Add UI for managing guardians
5. Add notification when shares are used
6. Add share revocation/rotation

If recovery fails:
1. Check browser console for detailed errors
2. Verify all steps were followed in order
3. Make sure backend mailer is running
4. Check email delivery logs
5. Report the exact error message for debugging
