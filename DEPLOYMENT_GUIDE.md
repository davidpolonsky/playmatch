# Deployment & Domain Setup Guide

## Overview
Your Next.js + Firebase app is perfect for Vercel hosting. Here's how to get it live with a custom domain.

---

## Step 1: Deploy to Vercel (Free)

### Why Vercel?
- Made by Next.js creators
- Free for personal projects
- Automatic deployments from GitHub
- Built-in SSL/HTTPS
- Zero configuration needed

### Deploy Steps:

1. **Push your code to GitHub** (if not already done)
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Go to Vercel**
   - Visit: https://vercel.com
   - Click "Sign up" and use your GitHub account

3. **Import your GitHub repository**
   - Click "Add New" → "Project"
   - Select your `playmatch` repository
   - Vercel auto-detects it's Next.js

4. **Add Environment Variables**
   - Before deploying, click "Environment Variables"
   - Add ALL variables from your `.env.local`:
     ```
     NEXT_PUBLIC_FIREBASE_API_KEY
     NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
     NEXT_PUBLIC_FIREBASE_PROJECT_ID
     NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
     NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
     NEXT_PUBLIC_FIREBASE_APP_ID
     GEMINI_API_KEY
     ```

5. **Click "Deploy"**
   - Vercel builds and deploys your app
   - You'll get a URL like: `playmatch.vercel.app`

---

## Step 2: Buy a Domain

### Recommended Registrars:

#### Option A: Vercel Domains (Easiest)
- **Cost:** ~$15/year
- **Pros:** One-click setup, automatic configuration
- **How:** In Vercel dashboard → Domains → "Buy a domain"
- **Best for:** Simplicity

#### Option B: Namecheap (Budget)
- **Cost:** ~$10-12/year
- **Pros:** Cheap, reliable, good UI
- **Website:** https://www.namecheap.com
- **Best for:** Saving money

#### Option C: Porkbun (Budget)
- **Cost:** ~$10-11/year
- **Pros:** Cheapest, free WHOIS privacy
- **Website:** https://porkbun.com
- **Best for:** Best value

#### Option D: Google Domains / Squarespace
- **Cost:** ~$12/year
- **Pros:** Simple interface, trusted brand
- **Website:** https://domains.google (now Squarespace)
- **Best for:** Google ecosystem users

### Domain Name Ideas:
- `playmatch.app` / `.io` / `.gg`
- `cardmatch.app`
- `teambuilderpro.com`
- `soccercardbuilder.com`

---

## Step 3: Connect Your Domain to Vercel

### If you bought from Vercel:
**Done!** It's automatically connected.

### If you bought from another registrar:

1. **In Vercel Dashboard:**
   - Go to your project → "Settings" → "Domains"
   - Click "Add Domain"
   - Enter your domain (e.g., `yourdomain.com`)

2. **Vercel will give you DNS records:**
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

3. **In your domain registrar:**
   - Go to DNS settings
   - Add the A record and CNAME record
   - Wait 5-60 minutes for DNS propagation

4. **Verify in Vercel:**
   - Vercel will automatically detect when DNS is ready
   - SSL certificate is auto-generated
   - Your site is live!

---

## Step 4: Update Firebase Configuration

**IMPORTANT:** After getting your custom domain, you need to update Firebase:

### 1. Add Authorized Domain
- Go to: https://console.firebase.google.com/project/playmatch-16003
- Click "Authentication" → "Settings" → "Authorized domains"
- Click "Add domain"
- Add your new domain: `yourdomain.com`

### 2. Update OAuth Redirect URIs (if needed)
- In same section, make sure your domain is listed

---

## Step 5: Test Your Live Site

1. Visit your custom domain
2. Test Google Sign-in
3. Upload a card
4. Create and save a team
5. Simulate a match

---

## Costs Breakdown

| Service | Cost | What It's For |
|---------|------|---------------|
| Vercel Hosting | **FREE** | Web hosting |
| Domain Name | **$10-15/year** | Your custom URL |
| Firebase | **FREE** (starter tier) | Database, auth, storage |
| Gemini API | **FREE** (60 req/min) | AI features |
| **TOTAL** | **~$10-15/year** | Everything |

---

## Automatic Deployments

Once connected to Vercel:
- Every `git push` to `main` branch = automatic deployment
- Pull requests get preview URLs
- Rollback to any previous version in 1 click

---

## Alternative: Firebase Hosting

If you prefer Firebase for hosting (not recommended for Next.js):

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

**But Vercel is better because:**
- Optimized for Next.js
- Better performance (Edge Network)
- Easier custom domain setup
- Free SSL
- Better analytics

---

## Domain Best Practices

1. **Enable WHOIS Privacy** (hides your personal info)
2. **Enable Auto-renewal** (don't lose your domain)
3. **Use `www` redirect** (redirect www to non-www or vice versa)
4. **Set up email forwarding** (e.g., admin@yourdomain.com)

---

## Quick Reference Commands

```bash
# Deploy manually (if not using GitHub)
npm install -g vercel
vercel

# Check if domain DNS is ready
nslookup yourdomain.com

# View live logs
vercel logs
```

---

## Recommended Flow

1. ✅ Finish local setup (complete .env.local)
2. ✅ Test locally (`npm run dev`)
3. ✅ Push to GitHub
4. ✅ Deploy to Vercel (get free .vercel.app URL first)
5. ✅ Test the Vercel URL
6. ✅ Buy custom domain
7. ✅ Connect domain to Vercel
8. ✅ Update Firebase authorized domains
9. ✅ Go live!

---

## Need Help?

- **Vercel Docs:** https://vercel.com/docs
- **Domain Setup:** https://vercel.com/docs/custom-domains
- **Firebase Setup:** https://firebase.google.com/docs/hosting

**Estimated Time:** 30-60 minutes total (mostly waiting for DNS)

**Cost:** $10-15 per year

---

Your app will be live at `https://yourdomain.com` with automatic HTTPS! 🚀
