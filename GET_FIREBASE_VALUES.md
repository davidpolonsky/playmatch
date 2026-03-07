# 🔥 GET YOUR REMAINING FIREBASE VALUES

You're almost there! You just need 2 more values from Firebase.

## What You Need To Get

1. **messagingSenderId** (a number like: 123456789012)
2. **appId** (looks like: 1:123456789012:web:abcdef123456)

## How To Get Them (2 minutes)

### Step 1: Go to Firebase Console
1. Open: https://console.firebase.google.com/
2. Click on your project: **playmatch-16003**

### Step 2: Get Your Web App Config
1. Click the **⚙️ gear icon** next to "Project Overview" (top left)
2. Click **"Project settings"**
3. Scroll down to the **"Your apps"** section

### Step 3: Check if Web App Exists
**Do you see a web app (</> icon) listed?**

#### If YES (web app exists):
1. Click on the web app name or icon
2. Scroll down to **"SDK setup and configuration"**
3. Select **"Config"** (not npm)
4. You'll see a code block like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDF6d24bkZpuzoTSrYVS_8PalsmG8oVI-w",
  authDomain: "playmatch-16003.firebaseapp.com",
  projectId: "playmatch-16003",
  storageBucket: "playmatch-16003.appspot.com",
  messagingSenderId: "123456789012",  ← COPY THIS NUMBER
  appId: "1:123:web:abc123"           ← COPY THIS
};
```

5. **Copy the messagingSenderId number**
6. **Copy the appId string**

#### If NO (no web app yet):
1. Click **"Add app"** or the **</> Web** icon
2. Enter app nickname: **"PlayMatch Web"**
3. Check **"Also set up Firebase Hosting"** (optional)
4. Click **"Register app"**
5. You'll see the firebaseConfig - copy the values from there
6. Click **"Continue to console"**

### Step 4: Update Your .env.local File
1. Open the file `.env.local` in your code editor
2. Replace these two lines:
   ```
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=REPLACE_WITH_YOUR_SENDER_ID
   NEXT_PUBLIC_FIREBASE_APP_ID=REPLACE_WITH_YOUR_APP_ID
   ```
   
   With your actual values (no quotes needed):
   ```
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abc123def456
   ```

3. **Save the file**

## ✅ Verify Your .env.local Looks Like This

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDF6d24bkZpuzoTSrYVS_8PalsmG8oVI-w
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=playmatch-16003.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=playmatch-16003
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=playmatch-16003.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abc123def456

GEMINI_API_KEY=AIzaSyDF6d24bkZpuzoTSrYVS_8PalsmG8oVI-w
```

(Your actual messagingSenderId and appId will be different)

## What's Next?

Once your `.env.local` is complete:

1. Make sure Firebase services are enabled:
   - ✅ Authentication → Google sign-in
   - ✅ Firestore Database (test mode)
   - ✅ Storage (test mode)

2. Run the app:
   ```bash
   npm install
   npm run dev
   ```

3. Open http://localhost:3000

That's it! 🚀
