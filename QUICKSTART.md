# Quick Start Guide

## 5-Minute Setup

### Step 1: Get Your API Keys (5 min)

#### Firebase (3 min)
1. Visit https://console.firebase.google.com/
2. Create new project → Name it "sports-cards"
3. Enable Google Auth: Authentication → Sign-in method → Google (toggle on)
4. Create Firestore: Firestore Database → Create → Test mode
5. Enable Storage: Storage → Get started
6. Get config: Settings → Your apps → Web → Copy the config values

#### Gemini API (2 min)
1. Visit https://aistudio.google.com/
2. Click "Get API key"
3. Copy your API key

### Step 2: Configure Environment (1 min)

Create `.env.local` file in project root:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sports-cards-xxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sports-cards-xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=sports-cards-xxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc

GEMINI_API_KEY=AIzaSy...
```

### Step 3: Install & Run (2 min)

```bash
npm install
npm run dev
```

Visit http://localhost:3000

## First Use

1. Click "Sign in with Google"
2. Upload a sports card photo
3. Watch AI extract the player info
4. Upload 10 more cards
5. Choose a formation
6. Save your team
7. Create another team
8. Simulate a match!

## Common Issues

**"Module not found"**
→ Run `npm install`

**"Firebase not configured"**
→ Check your `.env.local` file

**"Card analysis failed"**
→ Verify Gemini API key is correct

**White screen**
→ Check browser console for errors

## Need Help?

- Check the main README.md
- Review Firebase docs: https://firebase.google.com/docs
- Check Gemini docs: https://ai.google.dev/docs

That's it! You're ready to build teams! ⚽
