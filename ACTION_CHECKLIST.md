# ✅ ACTION CHECKLIST - Get Your App Running

Follow these steps in order. Check them off as you complete them!

---

## PHASE 1: GET YOUR API KEYS (15 minutes)

### □ Step 1: Create Firebase Project
- [ ] Go to https://console.firebase.google.com/
- [ ] Click "Add project"
- [ ] Name it: "sports-card-builder" (or your choice)
- [ ] Disable Google Analytics (optional)
- [ ] Click "Create project"
- [ ] Wait for it to finish setting up

### □ Step 2: Enable Firebase Authentication
- [ ] In your new project, click "Authentication" in left menu
- [ ] Click "Get started"
- [ ] Click "Sign-in method" tab
- [ ] Find "Google" in the providers list
- [ ] Toggle it ON (switch should turn blue)
- [ ] Click "Save"

### □ Step 3: Create Firestore Database
- [ ] Click "Firestore Database" in left menu
- [ ] Click "Create database"
- [ ] Select "Start in test mode"
- [ ] Choose location (pick one closest to you)
- [ ] Click "Enable"
- [ ] Wait for database to be created

### □ Step 4: Enable Firebase Storage
- [ ] Click "Storage" in left menu
- [ ] Click "Get started"
- [ ] Click "Next" (default rules are fine for now)
- [ ] Choose same location as Firestore
- [ ] Click "Done"

### □ Step 5: Get Firebase Config Values
- [ ] Click the ⚙️ (gear icon) next to "Project Overview"
- [ ] Click "Project settings"
- [ ] Scroll down to "Your apps" section
- [ ] Click the Web icon (</>)
- [ ] Register app name: "Sports Card Builder"
- [ ] Click "Register app"
- [ ] **COPY THESE VALUES** (you'll need them soon):
  ```
  apiKey: "AIza..."
  authDomain: "your-project.firebaseapp.com"
  projectId: "your-project-id"
  storageBucket: "your-project.appspot.com"
  messagingSenderId: "123456789"
  appId: "1:123:web:abc..."
  ```
- [ ] Keep this browser tab open!

### □ Step 6: Get Gemini API Key
- [ ] Open new tab: https://aistudio.google.com/
- [ ] Sign in with your Google account
- [ ] Click "Get API key" (top right)
- [ ] Click "Create API key in new project"
- [ ] **COPY THE API KEY** (starts with "AIza...")
- [ ] Save it somewhere safe

**✓ You now have all your credentials!**

---

## PHASE 2: SET UP THE PROJECT (5 minutes)

### □ Step 7: Download Project
- [ ] Download the "sports-card-builder" folder
- [ ] Extract it to your computer (e.g., Desktop or Documents)
- [ ] Remember where you saved it!

### □ Step 8: Open in Code Editor
- [ ] Open VS Code (or your preferred editor)
- [ ] File → Open Folder
- [ ] Select the "sports-card-builder" folder
- [ ] You should see all the files in the left sidebar

### □ Step 9: Create Environment File
- [ ] In VS Code, create a new file called `.env.local`
- [ ] Copy this template into it:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Gemini API Key
GEMINI_API_KEY=
```

### □ Step 10: Fill In Your Credentials
- [ ] Go back to Firebase Console tab (from Step 5)
- [ ] Copy each value into `.env.local`:
  - Copy `apiKey` → paste after `NEXT_PUBLIC_FIREBASE_API_KEY=`
  - Copy `authDomain` → paste after `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=`
  - Copy `projectId` → paste after `NEXT_PUBLIC_FIREBASE_PROJECT_ID=`
  - Copy `storageBucket` → paste after `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=`
  - Copy `messagingSenderId` → paste after `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=`
  - Copy `appId` → paste after `NEXT_PUBLIC_FIREBASE_APP_ID=`
- [ ] Copy your Gemini key → paste after `GEMINI_API_KEY=`
- [ ] Save the file (Ctrl+S or Cmd+S)

**Your .env.local should look like this (with your actual values):**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sports-card-builder-xxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sports-card-builder-xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=sports-card-builder-xxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdefg

GEMINI_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxx
```

**✓ Environment configured!**

---

## PHASE 3: RUN THE APP (5 minutes)

### □ Step 11: Open Terminal
- [ ] In VS Code: Terminal → New Terminal (or Ctrl+`)
- [ ] You should see a command prompt at the bottom

### □ Step 12: Install Dependencies
- [ ] Type this command and press Enter:
```bash
npm install
```
- [ ] Wait 2-3 minutes for installation to complete
- [ ] You should see "added XXX packages"

### □ Step 13: Start Development Server
- [ ] Type this command and press Enter:
```bash
npm run dev
```
- [ ] Wait for it to compile (15-30 seconds)
- [ ] You should see:
```
✓ Ready in 2.5s
○ Local: http://localhost:3000
```

### □ Step 14: Open the App
- [ ] Open your web browser
- [ ] Go to: http://localhost:3000
- [ ] You should see the Sports Card Builder login page!

**✓ App is running!**

---

## PHASE 4: TEST IT (10 minutes)

### □ Step 15: Sign In
- [ ] Click "Sign in with Google"
- [ ] Choose your Google account
- [ ] Click "Allow" when asked for permissions
- [ ] You should be redirected to the dashboard

### □ Step 16: Upload Your First Card
- [ ] Take a photo of a soccer card (or find one online)
- [ ] Click the upload area
- [ ] Select the image
- [ ] Wait 5-10 seconds for AI to analyze it
- [ ] Player info should appear!

### □ Step 17: Build a Team
- [ ] Upload at least 11 card photos
- [ ] Select a formation from dropdown (e.g., "4-4-2")
- [ ] App will auto-select best 11 players
- [ ] Enter a team name (e.g., "All Stars")
- [ ] Click "Save Team"
- [ ] You should see a success message!

### □ Step 18: Simulate a Match
- [ ] Create a second team (repeat Step 17)
- [ ] Go to "My Teams" page
- [ ] Select Team 1 as Home Team
- [ ] Select Team 2 as Away Team
- [ ] Click "Simulate Match"
- [ ] AI will generate a match report!

**✓ Everything works!**

---

## TROUBLESHOOTING

If something doesn't work, check these:

### ❌ "npm: command not found"
→ Install Node.js from https://nodejs.org/ (version 18 or higher)

### ❌ "Firebase: Error (auth/configuration-not-found)"
→ Check `.env.local` file exists and has all Firebase values filled in
→ Make sure no spaces after the `=` sign
→ Restart the dev server (Ctrl+C, then `npm run dev`)

### ❌ "Failed to analyze card"
→ Check `GEMINI_API_KEY` is correct in `.env.local`
→ Make sure you're using a clear photo of a card
→ Check browser console (F12) for specific error

### ❌ "Can't sign in with Google"
→ Make sure Google Auth is enabled in Firebase (Step 2)
→ Check `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` in `.env.local`
→ Try in incognito/private browsing mode

### ❌ White screen or won't load
→ Check terminal for errors
→ Press F12 in browser, check Console tab for errors
→ Make sure `npm run dev` is still running

---

## WHAT'S NEXT?

Once everything works locally:

1. **Deploy to Web**
   - [ ] Push code to GitHub
   - [ ] Sign up at https://vercel.com
   - [ ] Import your GitHub repo
   - [ ] Add environment variables
   - [ ] Deploy!

2. **Mobile App**
   - [ ] Research Capacitor for iOS/Android
   - [ ] Or plan React Native version
   - [ ] Submit to App Stores

3. **Add Features**
   - [ ] Tournament mode
   - [ ] Player trading
   - [ ] Team statistics
   - [ ] More sports (basketball, baseball)

---

## NEED HELP?

📖 Read these guides:
- `START_HERE.md` - Overview
- `YOUR_SETUP_GUIDE.md` - Detailed setup
- `ARCHITECTURE.md` - How it all works
- `README.md` - Full documentation

🔍 Check documentation:
- Firebase: https://firebase.google.com/docs
- Gemini: https://ai.google.dev/docs
- Next.js: https://nextjs.org/docs

---

**You've got this! Follow each step and you'll have your app running soon! 🚀**
