# Sending Announcement Emails to All Users

## ✅ The Fix is Already Deployed!

The login fix has been pushed to production. Users can now sign in without issues.

## 📧 How to Send the Announcement Email

The email system is ready to notify all users about the fix and ask for feedback.

### Prerequisites

You need these environment variables set in **Vercel** (or your `.env.local` for testing):

1. **FIREBASE_SERVICE_ACCOUNT_KEY** - Firebase Admin SDK credentials
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project > Project Settings > Service Accounts
   - Click "Generate New Private Key"
   - Copy the entire JSON content and convert to a single line
   - Add to Vercel environment variables

2. **ADMIN_API_TOKEN** - Secure token for admin endpoints
   - Generate a random secure token: `openssl rand -hex 32`
   - Add to Vercel environment variables

3. **SENDGRID_API_KEY** - Already configured (from your existing setup)

4. **SENDGRID_FROM_EMAIL** - Already configured

### Option 1: Send via Script (Recommended)

```bash
# Make sure your dev server is running
npm run dev

# In another terminal, run the script
./scripts/send-announcement.sh

# Or send to production
./scripts/send-announcement.sh prod
```

### Option 2: Send via curl

```bash
# Load your admin token
export ADMIN_API_TOKEN="your_token_here"

# Send to production
curl -X POST https://playmatch.games/api/send-announcement \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_API_TOKEN"
```

### What the Email Contains

✅ **Subject:** "Login Issues Fixed + We Want Your Feedback!"

📝 **Content:**
- Notification that login issues are resolved
- Request for user feedback
- Beautiful branded email template
- Call-to-action button to dashboard

### Response

You'll get a JSON response like:
```json
{
  "success": true,
  "sent": 25,
  "failed": 0,
  "total": 25,
  "message": "Sent 25 emails, 0 failed"
}
```

## ⚠️ Important Notes

- This sends to **ALL users** with email addresses in your database
- Make sure SendGrid is properly configured before sending
- Test locally first with `./scripts/send-announcement.sh` (without "prod")
- The email asks users for feedback via the dashboard

## Testing Locally

1. Start your dev server: `npm run dev`
2. Make sure Firebase Admin SDK can authenticate (set env vars)
3. Run: `./scripts/send-announcement.sh`
4. Check your console for success/error messages

## Need Help?

If you encounter issues:
1. Check Vercel logs for the `/api/send-announcement` endpoint
2. Verify environment variables are set correctly
3. Ensure SendGrid sender email is verified
4. Check Firebase Admin SDK has Firestore read permissions
