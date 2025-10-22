# 🚀 Quick Start - Test Password Recovery NOW!

## ⏱️ 5-Minute Test

### Step 1: Clear Old Data (30 seconds)
Press **F12** to open browser console, then paste:
```javascript
localStorage.clear()
location.reload()
```

---

### Step 2: Register (30 seconds)
1. Click "Register"
2. Username: `test123`
3. Password: `MyPassword123` (remember this!)
4. Click Register

---

### Step 3: Setup Wallet (1 minute)
1. Navigate to "Wallet Setup"
2. **Password:** `MyPassword123` (SAME as registration!)
3. **Your Email:** your-email@gmail.com
4. **Total Friends (N):** 3
5. **Threshold (T):** 2
6. **Friend 1 Email:** friend1@example.com
7. **Friend 2 Email:** friend2@example.com  
8. **Friend 3 Email:** friend3@example.com
9. Click "Create & Split Key"
10. Wait for "✅ Emails sent..." message

---

### Step 4: Save Shares (1 minute)
Check the emails (or check the share display on screen before redirect).

**Example shares you'll see:**
```
Friend 1: 01a3f5e8b2c1d4f6a7b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3
Friend 2: 02b4f6e9c2d5f7a8bac1d2e3f4a5b6c7d8e9fab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5
Friend 3: 03c5f7eac3d6f8a9bbc2d3e4f5a6b7c8d9eafbb2c3d4e5f6a7b8c9dae1f2a3b4c5d6
```

**Copy Friend 1 and Friend 2's shares** to Notepad/TextEdit.

---

### Step 5: Simulate Lost Password (30 seconds)
Press **F12** to open browser console, then paste:
```javascript
localStorage.clear()
location.reload()
```

---

### Step 6: Recover Password! (2 minutes)

1. Go to "Recovery" page
2. **Username:** `test123`
3. **First Share:** Paste Friend 1's share
   ```
   01a3f5e8b2c1d4f6a7b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3
   ```
4. Click "Add Share"
5. **Second Share:** Paste Friend 2's share
   ```
   02b4f6e9c2d5f7a8bac1d2e3f4a5b6c7d8e9fab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5
   ```
6. Click "Add Share"
7. Click "Reconstruct Key & Auto-Login"

---

### ✅ Expected Result:

```
✅ Share accepted! Collected 1 of 2 shares.
✅ Share accepted! Collected 2 of 2 shares.
Reconstructing Master Key via Shamir's Secret Sharing...
✅ Key Recovered! Now logging you in...
✅ Login successful! Redirecting to dashboard...
```

**You should be logged in automatically!** 🎉

---

## 🐛 Troubleshooting

### Error: "Encrypted wallet not found"
**You skipped Step 3!** Go back and complete wallet setup.

### Error: "Invalid share format"
**Copy the share carefully.** Make sure:
- Only hex characters (0-9, a-f)
- No extra text like "Share:" or "ID: 1"
- Complete hex string (not truncated)

### Error: "Recovery Failed"
**Password mismatch!** Make sure:
- Step 2 password: `MyPassword123`
- Step 3 password: `MyPassword123` (SAME!)

---

## 📋 Checklist

Before testing, make sure:
- [ ] Backend mailer is running: `npm run start:mailer` in `backend/`
- [ ] Backend API is running: `python app.py` in `backend/`
- [ ] Frontend is running: `npm run dev` in `frontend/`
- [ ] Browser console is open (F12)

---

## 🎯 That's It!

You now have a working social recovery wallet with:
- ✅ Threshold cryptography (2-of-3 shares)
- ✅ Zero-knowledge authentication
- ✅ Email-based share distribution
- ✅ Auto-login after recovery

---

## 📚 More Info

- **Full Testing Guide:** `TESTING_RECOVERY_GUIDE.md`
- **How to Paste Shares:** `HOW_TO_PASTE_SHARES.md`
- **Bug Fixes Summary:** `RECOVERY_FIXES_SUMMARY.md`

---

**Ready? Start at Step 1!** ⬆️
