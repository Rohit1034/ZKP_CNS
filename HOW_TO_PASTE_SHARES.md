# 📋 Quick Reference: How to Paste Secret Shares

## ✅ DO THIS:

### Example 1: Copy from Email (HTML)
1. Open the email from your friend
2. Find the secret share in the `code` box
3. Triple-click to select the entire hex string
4. Copy (Ctrl+C / Cmd+C)
5. Paste in the recovery page textarea (Ctrl+V / Cmd+V)

### Example 2: Copy from Email (Plain Text)
```
Secret Share (keep confidential):
a3f5e8b2c1d4f6a7b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2
```
1. Select from the first character (`a`) to the last (`2`)
2. Don't include "Secret Share (keep confidential):" text
3. Just copy the hex string

---

## ❌ DON'T DO THIS:

### ❌ Including Labels
```
Share ID: 1
Secret Share: a3f5e8b2c1d4f6a7...
```
**Only paste:** `a3f5e8b2c1d4f6a7...`

### ❌ Partial Copy
```
a3f5e8b2c1d4f6a7... (truncated)
```
**Must paste:** The COMPLETE hex string

### ❌ Modified/Edited
```
a3f5-e8b2-c1d4-f6a7... (added dashes)
```
**The system will auto-clean spaces, but don't modify the actual hex characters**

---

## 🔍 What a Valid Share Looks Like:

### Typical Share Format:
- **Length:** 60-70 hexadecimal characters (for 256-bit key)
- **Characters:** Only 0-9 and a-f (case doesn't matter)
- **Example:** 
  ```
  01a3f5e8b2c1d4f6a7b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3
  ```

### The system will automatically:
- ✅ Remove spaces
- ✅ Remove line breaks
- ✅ Convert to lowercase
- ✅ Validate hex format

---

## 🎯 Testing Your Share Before Pasting:

### Quick Validation:
1. Count characters (should be 60-70)
2. Check for only: `0123456789abcdef`
3. No special characters like: `-`, `_`, `:`, spaces (will be auto-removed)

### Example Valid Shares:
```
✅ 01a3f5e8b2c1d4f6a7b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3
✅ 02b4f6e9c2d5f7a8bac1d2e3f4a5b6c7d8e9fab1c2d3e4f5a6b7c8d9e0f1a2b3c4
✅ 03c5f7eac3d6f8a9bbc2d3e4f5a6b7c8d9eafbb2c3d4e5f6a7b8c9dae1f2a3b4c5
```

### Example Invalid Shares:
```
❌ abc123 (too short)
❌ 01a3f5e8b2c1d4g6a7... (contains 'g', not hex)
❌ Share: 01a3f5... (contains text)
❌ 01a3f5e8-b2c1-d4f6... (contains dashes, but will be auto-cleaned)
```

---

## 🚨 Common Mistakes:

### Mistake 1: Copying Email Subject
**Email Subject:** "Social Recovery Share for john_doe"
**Share in Email Body:** `01a3f5e8b2...`

→ **Only copy the share, not the subject!**

### Mistake 2: Including Instructions
```
Please save this secret share securely:
01a3f5e8b2c1d4f6a7b9c0d1e2f3a4b5c6d7e8f9a0...
```

→ **Only copy:** `01a3f5e8b2c1d4f6a7b9c0d1e2f3a4b5c6d7e8f9a0...`

### Mistake 3: Pasting Same Share Twice
**First paste:** `01a3f5e8b2...` ✅
**Second paste:** `01a3f5e8b2...` ❌ (same share!)

→ **Need 2 DIFFERENT shares!**

---

## 💡 Pro Tips:

1. **Use a text editor first:** Paste the share in Notepad/TextEdit to verify it's clean
2. **Check length:** Most shares are 66-68 characters for 256-bit keys
3. **Ask friends to send as plain text:** Easier to copy without formatting
4. **Test one share at a time:** Don't paste multiple shares in one go

---

## 🔄 If Something Goes Wrong:

### If you get "Invalid share format":
1. Re-copy the share from the original email
2. Remove any extra text or formatting
3. Make sure you copied the entire hex string

### If you get "Share already collected":
- You've pasted this share before
- Get a share from a different friend

### If you get "Recovery Failed":
- The shares might be from different wallet setups
- Make sure all shares are from the SAME wallet setup session
- Don't mix old and new shares

---

## 📱 Mobile Users:

### On Mobile (iOS/Android):
1. Open email in email app
2. Long-press on the hex string
3. Drag selection handles to select the entire string
4. Tap "Copy"
5. Switch to browser
6. Long-press in the textarea
7. Tap "Paste"

---

## 📧 What Your Friend's Email Looks Like:

```
From: Social Recovery Wallet
To: friend1@example.com
Subject: Social Recovery Share for alice_2024

You've been chosen as a recovery guardian for alice_2024's account.

Please save this secret share securely. It will be needed if 
alice_2024 loses their password.

Share ID: 1

Secret Share (keep confidential):
01a3f5e8b2c1d4f6a7b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3

IMPORTANT: 
- Keep this private
- Anyone with 2 or more shares can access the account!
- alice_2024 needs at least 2 shares to recover their account
```

**What to copy:** Just the line after "Secret Share (keep confidential):"
```
01a3f5e8b2c1d4f6a7b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3
```

---

## ✨ You're Ready!

Follow these guidelines and your recovery should work smoothly. If you still have issues, check the full `TESTING_RECOVERY_GUIDE.md` for detailed troubleshooting.
