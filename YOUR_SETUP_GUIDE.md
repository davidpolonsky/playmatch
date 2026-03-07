# Your Sports Card Builder - Complete Setup Guide 🎯

## What You're Building

A web and mobile app where users can:
- Upload photos of soccer cards
- AI extracts player info from the cards
- Build a starting 11 team (respecting formations)
- Save teams to the cloud with custom names
- Simulate matches between teams using AI
- Mix current and historical players

---

## STEP 1: Firebase Setup (Do This First!)

### 1.1 Create Firebase Project
1. Go to: https://console.firebase.google.com/
2. Click "Add project" or "Create a project"
3. Name it: **"sports-card-builder"** (or any name you like)
4. Disable Google Analytics if you don't need it (easier for now)
5. Click "Create project"

### 1.2 Enable Google Authentication
1. In your Firebase project, click **"Authentication"** in left menu
2. Click **"Get started"**
3. Click **"Sign-in method"** tab
4. Find **"Google"** in the list
5. Toggle it **ON**
6. Click **"Save"**

### 1.3 Create Firestore Database
1. Click **"Firestore Database"** in left menu
2. Click **"Create database"**
3. Select **"Start in test mode"** (we'll secure it later)
4. Choose a location closest to you (e.g., us-central)
5. Click **"Enable"**

### 1.4 Enable Firebase Storage
1. Click **"Storage"** in left menu
2. Click **"Get started"**
3. Select **"Start in test mode"**
4. Click **"Done"**

### 1.5 Get Your Firebase Configuration
1. Click the **gear icon** (⚙️) next to "Project Overview"
2. Click **"Project settings"**
3. Scroll down to **"Your apps"** section
4. Click the **web icon** (</>)
5. Register app name: **"Sports Card Builder"**
6. Click **"Register app"**
7. You'll see a **firebaseConfig** object - **COPY THIS!** You'll need:
   - apiKey
   - authDomain
   - projectId
   - storageBucket
   - messagingSenderId
   - appId

**Keep this tab open - you'll need these values!**

---

## STEP 2: Google Gemini API Setup

### 2.1 Get Gemini API Key
1. Go to: https://aistudio.google.com/
2. Sign in with your Google account
3. Click **"Get API key"** (top right)
4. Click **"Create API key in new project"** or select existing project
5. **COPY THE API KEY** - you'll need this!
6. Keep this key secret - don't share it publicly

---

## STEP 3: Configure Your Project

### 3.1 Create Environment File

You need to create a file called `.env.local` in the project root with your credentials.

**Here's what to do:**

1. Copy the `.env.local.example` file to create `.env.local`
2. Fill in your actual values from Firebase and Gemini

**Your `.env.local` should look like this:**

```env
# Firebase Configuration (from Step 1.5)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sports-card-builder-xxxxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sports-card-builder-xxxxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=sports-card-builder-xxxxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdefghijklmnop

# Google Gemini AI Configuration (from Step 2.1)
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**IMPORTANT:** Replace all the `XXXX` values with your actual keys from Firebase and Gemini!

---

## STEP 4: Install and Run

### 4.1 Install Dependencies

Open a terminal in the project folder and run:

```bash
npm install
```

This will install all required packages (might take 2-3 minutes).

### 4.2 Start the Development Server

```bash
npm run dev
```

You should see:
```
✓ Ready in 2.5s
○ Local: http://localhost:3000
```

### 4.3 Open the App

Open your browser and go to: **http://localhost:3000**

You should see the login page!

---

## STEP 5: Test It Out!

### 5.1 First Login
1. Click **"Sign in with Google"**
2. Choose your Google account
3. Allow access

### 5.2 Upload Your First Card
1. Click the upload area or drag a photo of a soccer card
2. Wait for AI to analyze it (5-10 seconds)
3. You'll see the extracted player info appear

### 5.3 Build Your First Team
1. Upload 11+ card photos
2. Select a formation (e.g., 4-4-2)
3. The app will auto-select best 11 based on positions
4. Enter a team name (e.g., "Dream Team")
5. Click **"Save Team"**

### 5.4 Simulate a Match
1. Go to **"My Teams"** page
2. Select two teams from dropdowns
3. Click **"Simulate Match"**
4. AI will generate a match report with score and highlights!

---

## Troubleshooting

### "Firebase: Error (auth/configuration-not-found)"
→ Check your `.env.local` file has all Firebase credentials

### "Failed to analyze card"
→ Check your `GEMINI_API_KEY` is correct in `.env.local`

### "npm install" errors
→ Make sure you have Node.js 18+ installed
→ Try deleting `node_modules` folder and running `npm install` again

### Page won't load
→ Make sure `npm run dev` is running
→ Check browser console for errors (F12 → Console tab)

### Can't sign in with Google
→ Make sure Google Auth is enabled in Firebase (Step 1.2)
→ Check that Firebase Auth domain is correct in `.env.local`

---

## Next Steps: Deploy to Web

Once everything works locally, you can deploy to the web:

1. Push code to GitHub
2. Sign up at https://vercel.com
3. Connect your GitHub repo
4. Add environment variables (same as `.env.local`)
5. Deploy!

Your app will be live at `your-app.vercel.app`

---

## Next Steps: Mobile App (Later)

After the web app works, we can:

1. Use **Capacitor** to wrap it for iOS/Android
2. Or build a **React Native** version using the same logic
3. Submit to Apple App Store and Google Play

---

## Files You'll Need to Edit Later

- **`app/page.tsx`** - Home page (login screen)
- **`app/team-builder/page.tsx`** - Team building page
- **`app/teams/page.tsx`** - Saved teams page
- **`components/`** - Reusable UI components
- **`lib/gemini/`** - AI card analysis logic
- **`app/api/`** - Backend API routes

---

## Security: Before Going Live

Before deploying publicly, you MUST:

1. Update Firebase Security Rules (in Firebase Console → Firestore/Storage)
2. Switch from "test mode" to production rules
3. Add domain restrictions to your API keys
4. Enable billing alerts

Check the main README.md for the exact security rules.

---

## Questions?

- Review the main **README.md** for detailed documentation
- Check **QUICKSTART.md** for quick reference
- Firebase docs: https://firebase.google.com/docs
- Gemini docs: https://ai.google.dev/docs

---

You're all set! Start by completing Steps 1-4, then test with Step 5. 🚀
