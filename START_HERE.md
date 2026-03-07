# 🎯 START HERE - Sports Card Builder Setup

## What You Have

This is a complete Next.js web application for building soccer teams from sports cards using AI!

**What it does:**
- Upload photos of soccer cards
- AI extracts player information
- Build starting 11 teams with formations
- Save teams to Firebase
- Simulate matches between teams with AI-generated reports
- Works with current and historical players

---

## Quick Setup (3 Steps)

### STEP 1: Get Your API Keys

#### A) Firebase Setup (5 minutes)
1. Go to https://console.firebase.google.com/
2. Create a new project called "sports-card-builder"
3. Enable these services:
   - **Authentication** → Google Sign-in method
   - **Firestore Database** → Create in test mode
   - **Storage** → Get started
4. Get your config: Settings (⚙️) → Your apps → Web (</>) → Copy the config values

#### B) Gemini API (2 minutes)
1. Go to https://aistudio.google.com/
2. Click "Get API key"
3. Copy your API key

### STEP 2: Configure Your Project

1. Download this entire folder to your computer
2. Open it in your code editor (VS Code recommended)
3. Create a file called `.env.local` in the root folder
4. Copy this template and fill in your values:

```env
# From Firebase Console
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc

# From Google AI Studio
GEMINI_API_KEY=your_gemini_key_here
```

### STEP 3: Run the App

Open terminal in the project folder and run:

```bash
# Install dependencies (first time only)
npm install

# Start the development server
npm run dev
```

Open http://localhost:3000 in your browser!

---

## Testing Your App

1. **Sign In**: Click "Sign in with Google"
2. **Upload Cards**: Take photos of soccer cards and upload them
3. **Build Team**: Select a formation, app picks best 11
4. **Save Team**: Give it a name
5. **Simulate Match**: Pick two teams and watch AI simulate a game!

---

## Project Structure

```
sports-card-builder/
├── app/                      # Next.js pages
│   ├── api/                  # Backend API routes
│   │   ├── analyze-card/     # Card image analysis
│   │   └── simulate-game/    # Match simulation
│   ├── team-builder/         # Team building page
│   ├── teams/                # Saved teams page
│   └── page.tsx              # Home/login page
├── components/               # React components
│   ├── CardUploader.tsx      # Upload interface
│   ├── PlayerList.tsx        # Player display
│   └── TeamDisplay.tsx       # Formation view
├── lib/                      # Utilities
│   ├── firebase/             # Firebase config
│   ├── gemini/               # AI integration
│   └── types.ts              # TypeScript types
├── public/                   # Static files
├── .env.local               # YOUR CREDENTIALS (create this!)
└── package.json             # Dependencies
```

---

## Important Files to Know

- **`.env.local`** - Your API keys (CREATE THIS!)
- **`YOUR_SETUP_GUIDE.md`** - Detailed setup instructions
- **`QUICKSTART.md`** - Quick reference
- **`README.md`** - Full documentation
- **`package.json`** - Project dependencies

---

## Troubleshooting

**"Module not found" errors:**
→ Run `npm install`

**"Firebase not configured":**
→ Check your `.env.local` file exists and has correct values

**"Card analysis failed":**
→ Verify your Gemini API key is correct

**White screen:**
→ Open browser console (F12) and check for errors

---

## Need More Help?

1. Read **YOUR_SETUP_GUIDE.md** for step-by-step instructions
2. Check **QUICKSTART.md** for quick reference
3. Read **README.md** for full documentation

---

## Next Steps After It Works

1. **Deploy to Web**: Push to GitHub → Deploy on Vercel
2. **Mobile App**: Use Capacitor to create iOS/Android apps
3. **Add Features**: Check README.md for enhancement ideas

---

## Requirements

- Node.js 18 or higher
- Google account (for Firebase and Gemini)
- Modern web browser

---

**Ready to start? Follow STEP 1-3 above!** 🚀

Questions? Check the detailed guides in:
- `YOUR_SETUP_GUIDE.md` - Complete walkthrough
- `README.md` - Full documentation
