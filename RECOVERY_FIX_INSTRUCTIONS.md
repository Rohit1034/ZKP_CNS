# Social Recovery Fix - Complete Reset Instructions

## The Problem:
The shares you received earlier were generated with a random master key, not your registration password. The new code fixes this, but you need to redo the setup.

## Solution: Start Fresh

### Step 1: Clear Browser Data
Open browser console (F12) and run:
```javascript
// Clear all local storage
localStorage.clear()
```

### Step 2: Re-register Your Account
1. Go to `/register`
2. Create account with username and password
3. **Remember this password** - you'll need it for wallet setup

### Step 3: Setup Social Recovery (New)
1. After registration, you'll be redirected to `/wallet-setup`
2. **Enter the SAME password** you used during registration
3. Enter 3 friend emails
4. Click "Create & Split Key"
5. Your friends will receive NEW shares via email

### Step 4: Test Recovery
1. Go to `/login` → Click "Forgot Password?"
2. Enter your username
3. Enter ANY 2 of the 3 shares from the NEW emails
4. Click "Reconstruct Key & Auto-Login"
5. You should be logged in automatically

## Why This Is Necessary:
- **Old setup**: Random master key → shares don't match registration
- **New setup**: Derives key from password → shares match registration
- The math works, but only with matching keys

## Testing Locally (Without Email):
If you want to test without waiting for emails:
1. After wallet setup, copy the shares shown on screen
2. Use those shares directly for recovery testing
3. Any 2 of the 3 shares will work

## Verification:
After successful recovery, you should see:
- "✅ Login successful! Redirecting to dashboard..."
- Automatic redirect to `/dashboard`
- Access to your vault

---
**Note**: The threshold (2 of 3) is correct and working as designed. The issue was only with key derivation mismatch.
