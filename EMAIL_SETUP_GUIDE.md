# 📧 Email Configuration Guide

## 🚨 Current Issue

The mailer server needs SMTP credentials to send emails. You need to configure your email provider settings.

---

## ✅ Quick Fix - Gmail Setup (Recommended)

### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account: https://myaccount.google.com/
2. Click "Security" → "2-Step Verification"
3. Follow the prompts to enable 2FA

### Step 2: Generate App Password
1. Go to: https://myaccount.google.com/apppasswords
2. Select "Mail" and your device
3. Click "Generate"
4. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

### Step 3: Update .env File
Edit `backend/.env` and replace these values:

```properties
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com          # ← Your Gmail address
SMTP_PASS=abcdefghijklmnop               # ← Your App Password (no spaces!)
```

**Example:**
```properties
SMTP_USER=john.doe@gmail.com
SMTP_PASS=abcdefghijklmnop
```

### Step 4: Restart Mailer Server
Stop the current server (Ctrl+C) and restart:
```powershell
cd backend
npm run start:mailer
```

---

## 🔧 Alternative Email Providers

### Outlook/Hotmail:
```properties
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### Yahoo:
```properties
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

### SendGrid:
```properties
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

### Mailgun:
```properties
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password
```

---

## 🧪 Testing the Configuration

### Test 1: Start the Mailer Server
```powershell
cd backend
npm run start:mailer
```

**Expected output:**
```
Mailer server listening on http://localhost:5050
```

**No errors should appear!**

### Test 2: Send a Test Email
You can test by completing the wallet setup in the frontend, or use curl:

```powershell
curl -X POST http://localhost:5050/api/send-shares `
  -H "Content-Type: application/json" `
  -d '{
    "username": "testuser",
    "fromEmail": "your-email@gmail.com",
    "recipients": [
      {
        "email": "friend@example.com",
        "id": 1,
        "shareHex": "01a3f5e8b2c1d4f6a7b9c0d1e2f3a4b5c6"
      }
    ]
  }'
```

**Expected response:**
```json
{
  "status": "success",
  "sent": 1,
  "message": "Shares sent to 1 friend(s)"
}
```

---

## 🔒 Security Best Practices

### ✅ DO:
- Use App Passwords (not your main password)
- Keep `.env` file private (add to `.gitignore`)
- Use environment-specific `.env` files for dev/prod
- Rotate credentials periodically

### ❌ DON'T:
- Commit `.env` to Git
- Share credentials in code or messages
- Use your main email password
- Hardcode credentials in source code

---

## 🐛 Troubleshooting

### Error: "Missing SMTP config"
**Cause:** Environment variables not loaded or .env file not found.

**Solution:**
1. Verify `.env` file exists in `backend/` directory
2. Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS are set
3. Restart the mailer server

### Error: "Invalid login"
**Cause:** Wrong email or password.

**Solution:**
1. For Gmail, use App Password (not regular password)
2. Enable 2FA first, then generate App Password
3. Copy App Password without spaces

### Error: "Connection timeout"
**Cause:** Firewall or wrong SMTP host/port.

**Solution:**
1. Check SMTP_HOST spelling
2. Try port 465 with SMTP_SECURE=true
3. Check firewall settings

### Error: "Self signed certificate"
**Cause:** SSL/TLS certificate issue.

**Solution:**
Add to .env:
```properties
NODE_TLS_REJECT_UNAUTHORIZED=0
```
⚠️ Only for development! Don't use in production.

---

## 📋 Current .env File Structure

Your `.env` file should look like this:

```properties
# MongoDB Configuration
MONGO_URI="mongodb+srv://heet:heet@cluster0.txa2kuw.mongodb.net"
MONGO_DBNAME=zkp_demo

# SMTP Configuration for Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password-here

# Optional: Override the "From" email address
# MAIL_FROM=noreply@yourapp.com

# Optional: Mailer server port (default: 5050)
# MAILER_PORT=5050
```

---

## 🚀 Quick Checklist

Before testing the recovery system:
- [ ] 2FA enabled on Gmail
- [ ] App Password generated
- [ ] `.env` file updated with SMTP credentials
- [ ] Mailer server restarted
- [ ] No errors in console
- [ ] Test email sent successfully

---

## 📞 Still Having Issues?

### Check these:
1. **Console logs:** Look for detailed error messages
2. **Email provider:** Some providers block SMTP access by default
3. **Network:** Corporate networks may block SMTP ports
4. **Rate limits:** Email providers limit emails per day

### Gmail Specific:
- App Password must be 16 characters (remove spaces)
- 2FA must be enabled first
- Check "Less secure app access" is OFF (use App Password instead)
- Daily limit: ~500 emails/day

---

## ✨ After Configuration

Once configured, your system will:
1. ✅ Send secret shares to friends via email
2. ✅ Include formatted share information
3. ✅ Support recovery with any T of N shares
4. ✅ Auto-login after successful recovery

---

**Last Updated:** October 21, 2025  
**Status:** Waiting for SMTP configuration
