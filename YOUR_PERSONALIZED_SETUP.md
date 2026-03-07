# 🎯 YOUR PERSONAL SETUP GUIDE - PlayMatch

## ✅ What You Already Have

- ✅ Firebase Project: `playmatch-16003`
- ✅ API Key: `AIzaSyDF6d24bkZpuzoTSrYVS_8PalsmG8oVI-w`
- ✅ GitHub Repo: https://github.com/davidpolonsky/playmatch

Great start! Now let's finish the setup.

---

## 🔥 STEP 1: Complete Firebase Setup (10 minutes)

### A) Enable Firebase Services

Go to: https://console.firebase.google.com/project/playmatch-16003

#### Enable Authentication:
1. Click **"Authentication"** in left menu
2. Click **"Get started"** (if you haven't already)
3. Click **"Sign-in method"** tab
4. Find **"Google"** in the list
5. Click on it, toggle **"Enable"**, click **"Save"**

#### Enable Firestore Database:
1. Click **"Firestore Database"** in left menu
2. Click **"Create database"**
3. Select **"Start in test mode"**
4. Choose location: **us-central** (or closest to you)
5. Click **"Enable"**

#### Enable Storage:
1. Click **"Storage"** in left menu
2. Click **"Get started"**
3. Select **"Start in test mode"**
4. Use same location as Firestore
5. Click **"Done"**

### B) Get Your Complete Firebase Config

1. Click **⚙️ gear icon** → **"Project settings"**
2. Scroll to **"Your apps"**
3. If no web app exists:
   - Click **</> icon** (Add web app)
   - Name: "PlayMatch Web"
   - Click **"Register app"**
4. You'll see firebaseConfig with these values:
   ```
   messagingSenderId: "123456789012"  ← Copy this
   appId: "1:123:web:abc"             ← Copy this
   ```

### C) Update Your .env.local File

Open `.env.local` in your code editor and update these two lines with your actual values:

```env
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_ACTUAL_NUMBER_HERE
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_ACTUAL_APP_ID_HERE
```

---

## 💻 STEP 2: Set Up Local Development (5 minutes)

### Option A: If you already have the code locally

1. Open Terminal/Command Prompt
2. Navigate to your project folder:
   ```bash
   cd path/to/sports-card-builder
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open: http://localhost:3000

### Option B: If you need to download the code first

1. Download the sports-card-builder folder from our conversation
2. Extract it to your computer
3. Open Terminal and navigate to it:
   ```bash
   cd path/to/sports-card-builder
   ```
4. Follow steps 3-5 from Option A above

---

## 🔗 STEP 3: Push to GitHub (5 minutes)

Once the app is working locally, push it to your GitHub repo:

```bash
# Initialize git (if not already done)
git init

# Add GitHub as remote
git remote add origin https://github.com/davidpolonsky/playmatch.git

# Add all files
git add .

# Commit
git commit -m "Initial commit - Sports Card Builder"

# Push to GitHub
git push -u origin main
```

**Note:** Make sure `.env.local` is in `.gitignore` (it already is!) so your API keys don't get pushed to GitHub.

---

## 🧪 STEP 4: Test Everything (10 minutes)

### Test 1: Sign In
1. Open http://localhost:3000
2. Click "Sign in with Google"
3. Choose your Google account
4. Should redirect to dashboard ✅

### Test 2: Upload Card
1. Take a photo of a soccer card (or find one online)
2. Upload it to the app
3. Wait 5-10 seconds
4. Player info should appear ✅

### Test 3: Build Team
1. Upload 11 different cards
2. Select formation (e.g., 4-4-2)
3. Enter team name
4. Click "Save Team"
5. Should see success message ✅

### Test 4: Simulate Match
1. Create a second team
2. Go to "My Teams"
3. Select both teams
4. Click "Simulate Match"
5. Should see match report ✅

---

## 🚀 STEP 5: Deploy to Web (Optional - 10 minutes)

Once everything works locally, deploy to Vercel:

### A) Sign Up for Vercel
1. Go to: https://vercel.com
2. Sign up with GitHub
3. Authorize Vercel to access your repositories

### B) Import Your Project
1. Click **"Add New..."** → **"Project"**
2. Find **"playmatch"** in your repo list
3. Click **"Import"**

### C) Add Environment Variables
1. In "Environment Variables" section, add all your vars from `.env.local`:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `GEMINI_API_KEY`

2. Click **"Deploy"**

### D) Update Firebase Settings
After deployment, you'll get a URL like: `playmatch.vercel.app`

1. Go back to Firebase Console
2. Authentication → Settings → Authorized domains
3. Add your Vercel domain: `playmatch.vercel.app`

**Your app is now live!** 🎉

---

## 🔒 STEP 6: Secure Firebase (Before Going Public)

**Important:** Before sharing your app publicly, update security rules:

### Firestore Rules
1. Firebase Console → Firestore Database → Rules
2. Replace with:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /teams/{teamId} {
      allow read: if true;
      allow create: if request.auth != null && 
                      request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && 
                               resource.data.userId == request.auth.uid;
    }
  }
}
```

### Storage Rules
1. Firebase Console → Storage → Rules
2. Replace with:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /cards/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && 
                     request.auth.uid == userId;
    }
  }
}
```

---

## ❓ Troubleshooting

### "Module not found"
→ Run: `npm install`

### "Firebase configuration error"
→ Check `.env.local` has all 7 values filled in correctly

### "Can't sign in with Google"
→ Make sure Google Auth is enabled in Firebase
→ Check that your domain is authorized in Firebase

### "Card analysis failed"
→ Verify `GEMINI_API_KEY` in `.env.local`
→ Check you have Gemini API quota remaining

### "CORS error" when deploying
→ Add your Vercel domain to Firebase authorized domains

---

## 📞 Need Help?

- Read: `GET_FIREBASE_VALUES.md` for detailed Firebase setup
- Read: `ACTION_CHECKLIST.md` for step-by-step checklist
- Check: Firebase docs at https://firebase.google.com/docs

---

## ✅ Quick Checklist

- [ ] Firebase Authentication enabled (Google)
- [ ] Firestore Database created (test mode)
- [ ] Firebase Storage enabled (test mode)
- [ ] Got messagingSenderId from Firebase
- [ ] Got appId from Firebase
- [ ] Updated .env.local with both values
- [ ] Ran `npm install`
- [ ] Ran `npm run dev`
- [ ] App opens at localhost:3000
- [ ] Can sign in with Google
- [ ] Can upload and analyze cards
- [ ] Can save teams
- [ ] Can simulate matches
- [ ] Pushed to GitHub
- [ ] (Optional) Deployed to Vercel

---

**You're all set! Start with STEP 1 and work through each step.** 🚀

Your live app will be at: https://playmatch.vercel.app (after deployment)
