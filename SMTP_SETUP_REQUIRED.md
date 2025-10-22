# 📧 SMTP Email Configuration - Quick Setup

## ⚠️ ACTION REQUIRED

The mailer server cannot send emails because SMTP credentials are not configured.

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Get Gmail App Password

1. **Enable 2FA on your Gmail:**
   - Go to: https://myaccount.google.com/security
   - Click "2-Step Verification" → Follow setup

2. **Generate App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Click "Generate"
   - **Copy the 16-character password** (example: `abcd efgh ijkl mnop`)

### Step 2: Configure .env File

Edit `backend/.env` file and replace these two lines:

```properties
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**With your actual credentials:**

```properties
SMTP_USER=john.doe@gmail.com       ← Your Gmail
SMTP_PASS=abcdefghijklmnop          ← App Password (no spaces!)
```

### Step 3: Restart Mailer

Stop the mailer server (Ctrl+C or close terminal) and restart:

```powershell
cd backend
npm run start:mailer
```

**✅ Expected output:**
```
Mailer server listening on http://localhost:5050
```

**❌ If you see errors, check `EMAIL_SETUP_GUIDE.md` for troubleshooting.**

---

## 🎯 Quick Test

After configuration, test the complete flow:

1. **Register** a new account
2. **Wallet Setup** with friend emails
3. **Check emails** - your friends should receive secret shares
4. **Test Recovery** - paste 2 shares and recover!

---

## 📚 More Help?

- **Detailed Guide:** `EMAIL_SETUP_GUIDE.md`
- **Testing Guide:** `TESTING_RECOVERY_GUIDE.md`
- **Quick Start:** `QUICK_START.md`

---

## ⏰ Summary

**Time:** 5 minutes  
**Difficulty:** Easy  
**Requirements:** Gmail account with 2FA enabled

**Current Status:** ⚠️ Waiting for SMTP configuration  
**After Setup:** ✅ Ready to send recovery emails!
