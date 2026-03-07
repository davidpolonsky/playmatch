# Sports Card Builder - Architecture Overview

## How Everything Works Together

```
┌─────────────────────────────────────────────────────────────────┐
│                          USER FLOW                               │
└─────────────────────────────────────────────────────────────────┘

1. USER UPLOADS CARD PHOTO
   ↓
2. GEMINI AI ANALYZES IMAGE → Extracts player name, position, rating
   ↓
3. PLAYER ADDED TO COLLECTION
   ↓
4. USER BUILDS TEAM → Selects formation
   ↓
5. APP AUTO-SELECTS BEST 11 → Based on positions
   ↓
6. USER SAVES TEAM → Stored in Firebase
   ↓
7. USER SIMULATES MATCH → Gemini generates match report


┌─────────────────────────────────────────────────────────────────┐
│                     TECHNICAL ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   BROWSER    │  ← User interacts here
│  (Frontend)  │
└──────┬───────┘
       │
       │ Next.js App
       ↓
┌──────────────────────────────────────────────────────┐
│                   YOUR APPLICATION                   │
│                                                      │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │   Pages    │  │  Components  │  │     API     │ │
│  │            │  │              │  │   Routes    │ │
│  │ • Login    │  │ • Card Upload│  │ • Analyze   │ │
│  │ • Builder  │  │ • Player List│  │ • Simulate  │ │
│  │ • Teams    │  │ • Formation  │  │             │ │
│  └────────────┘  └──────────────┘  └─────────────┘ │
│                                                      │
└──────┬────────────────────────┬────────────────┬────┘
       │                        │                │
       ↓                        ↓                ↓
┌──────────────┐      ┌──────────────┐   ┌─────────────┐
│   FIREBASE   │      │ FIREBASE     │   │   GEMINI    │
│     AUTH     │      │  FIRESTORE   │   │     AI      │
│              │      │              │   │             │
│ • Google     │      │ • User Teams │   │ • Card OCR  │
│   Sign-in    │      │ • Players    │   │ • Match Sim │
└──────────────┘      └──────────────┘   └─────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                       DATA FLOW                                  │
└─────────────────────────────────────────────────────────────────┘

CARD UPLOAD FLOW:
Browser → Upload Photo → API Route → Gemini Vision API → Parse Response
         ↓
      Player Data → Save to State → Display to User


TEAM SAVE FLOW:
Browser → Team Data → API Route → Firebase Firestore → Confirmation
         ↓
      Team ID → Store in User's Collection


MATCH SIMULATION FLOW:
Browser → Select 2 Teams → API Route → Load from Firestore
         ↓
      Team Lineups → Send to Gemini → Generate Match Report
         ↓
      Display Result with Score & Highlights


┌─────────────────────────────────────────────────────────────────┐
│                    FILE STRUCTURE                                │
└─────────────────────────────────────────────────────────────────┘

app/
├── page.tsx                    ← Login page (entry point)
├── layout.tsx                  ← App wrapper with auth
├── team-builder/
│   └── page.tsx               ← Upload cards, build team
├── teams/
│   └── page.tsx               ← View saved teams, simulate matches
└── api/
    ├── analyze-card/
    │   └── route.ts           ← Gemini card analysis endpoint
    └── simulate-game/
        └── route.ts           ← Gemini match simulation endpoint

components/
├── CardUploader.tsx           ← Drag & drop card upload
├── PlayerList.tsx             ← Display uploaded players
├── TeamDisplay.tsx            ← Show formation with players
└── AuthProvider.tsx           ← Authentication wrapper

lib/
├── firebase/
│   ├── config.ts              ← Firebase initialization
│   └── auth.ts                ← Auth helpers
├── gemini/
│   ├── analyze-card.ts        ← Card OCR logic
│   └── simulate-game.ts       ← Match simulation logic
├── firestore.ts               ← Database operations
└── types.ts                   ← TypeScript interfaces


┌─────────────────────────────────────────────────────────────────┐
│                    KEY FEATURES                                  │
└─────────────────────────────────────────────────────────────────┘

✅ Google Authentication (Firebase Auth)
✅ Image Upload & Storage (Firebase Storage)
✅ AI Card Recognition (Gemini Vision API)
✅ Smart Team Building (Formation-based selection)
✅ Cloud Team Storage (Firebase Firestore)
✅ AI Match Simulation (Gemini Text Generation)
✅ Historical Player Support (AI understands context)
✅ Responsive Design (Works on mobile & desktop)


┌─────────────────────────────────────────────────────────────────┐
│                  ENVIRONMENT VARIABLES                           │
└─────────────────────────────────────────────────────────────────┘

.env.local:

# Frontend can access these (NEXT_PUBLIC_*)
NEXT_PUBLIC_FIREBASE_API_KEY        ← Firebase Web API Key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN    ← Your Firebase Auth domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID     ← Firebase Project ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ← Firebase Storage bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID

# Backend only (server-side API routes)
GEMINI_API_KEY                      ← Google AI Studio API Key


┌─────────────────────────────────────────────────────────────────┐
│                 DEPLOYMENT OPTIONS                               │
└─────────────────────────────────────────────────────────────────┘

WEB APP:
→ Vercel (Recommended, easiest)
→ Netlify
→ Google Cloud Run
→ AWS Amplify

MOBILE APP (After web works):
→ Capacitor (wrap existing web app)
→ React Native (rebuild with shared logic)
→ Progressive Web App (installable web app)


┌─────────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT WORKFLOW                          │
└─────────────────────────────────────────────────────────────────┘

1. Setup Firebase & Gemini credentials
2. Create .env.local with your keys
3. Run: npm install
4. Run: npm run dev
5. Test locally at http://localhost:3000
6. Make changes, app auto-refreshes
7. When ready: Deploy to Vercel
8. For mobile: Add Capacitor layer


┌─────────────────────────────────────────────────────────────────┐
│                      COSTS (ESTIMATED)                           │
└─────────────────────────────────────────────────────────────────┘

Firebase (Free tier covers most small apps):
✓ Authentication: 10k users/month free
✓ Firestore: 50k reads/day free
✓ Storage: 5 GB free

Gemini API (Free tier):
✓ 60 requests/minute free
✓ Sufficient for testing and small usage

Vercel Hosting:
✓ Free for personal projects
✓ Automatic HTTPS & CDN

Total for development & testing: $0
Total for small production use: $0-10/month


┌─────────────────────────────────────────────────────────────────┐
│                   NEXT STEPS                                     │
└─────────────────────────────────────────────────────────────────┘

1. Follow START_HERE.md to set up Firebase & Gemini
2. Create .env.local with your credentials
3. Run npm install && npm run dev
4. Test the app with some card photos
5. Once working, push to GitHub
6. Deploy to Vercel
7. Plan mobile app conversion
