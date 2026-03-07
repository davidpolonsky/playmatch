# ⚽ Sports Card Team Builder

Build your dream soccer team from physical sports cards using AI! Scan your cards, create teams, and simulate matches.

## Features

- 📸 **Card Scanning**: Upload photos of physical soccer player cards
- 🤖 **AI Analysis**: Gemini AI extracts player info (name, position, rating)
- ⚽ **Team Building**: Create starting 11 with different formations (4-3-3, 4-4-2, etc.)
- 💾 **Cloud Storage**: Save teams to Firebase Firestore
- 🎮 **Match Simulation**: AI-powered match simulations with detailed commentary
- 👴 **Historical Players**: Mix current stars with legendary players
- 🔐 **Google Authentication**: Secure login with Google accounts

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Auth**: Firebase Authentication (Google)
- **AI**: Google Gemini AI (card analysis & match simulation)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Firebase account
- Google AI (Gemini) API key

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable these services:
   - **Authentication**: Enable Google sign-in method
   - **Firestore Database**: Create database in test mode
   - **Storage**: Enable storage
4. Get your Firebase config from Project Settings → General → Your apps → Web app

### 2. Gemini API Setup

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Get an API key
3. Save it for the next step

### 3. Installation

```bash
# Clone the repository
cd sports-card-builder

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local
```

### 4. Configure Environment Variables

Edit `.env.local` and add your keys:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
```

### 5. Firebase Security Rules

Set up Firestore security rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /teams/{teamId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }
    match /matches/{matchId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }
  }
}
```

Set up Storage security rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /card-images/{userId}/{fileName} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Use

1. **Sign In**: Click "Sign in with Google"
2. **Upload Cards**: Take photos of your soccer player cards
3. **Build Team**: Select a formation and generate your best starting 11
4. **Save Team**: Give your team a name and save it
5. **Simulate Match**: Choose two saved teams and watch AI simulate a match!

## Project Structure

```
sports-card-builder/
├── app/
│   ├── api/               # API routes
│   │   ├── analyze-card/  # Card analysis endpoint
│   │   └── simulate-match/# Match simulation endpoint
│   ├── dashboard/         # Main dashboard page
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── AuthProvider.tsx   # Auth context provider
│   ├── CardUploader.tsx   # Card upload component
│   ├── TeamBuilder.tsx    # Team formation display
│   ├── TeamList.tsx       # Saved teams list
│   └── MatchSimulator.tsx # Match simulation UI
├── lib/
│   ├── firebase/          # Firebase configuration
│   │   ├── config.ts      # Firebase init
│   │   ├── auth.ts        # Authentication utilities
│   │   ├── firestore.ts   # Database operations
│   │   └── storage.ts     # File upload utilities
│   ├── gemini/            # Gemini AI integration
│   │   └── ai.ts          # AI functions
│   └── types.ts           # TypeScript types
└── public/                # Static assets
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

### Update Firebase Rules

After deployment, update your Firebase Authentication settings:
- Add your Vercel domain to authorized domains

## Future Enhancements

- 📱 React Native mobile app
- 🏆 Leaderboards and rankings
- 👥 Multiplayer tournaments
- 📊 Player statistics tracking
- 🎨 Custom card designs
- 🌍 Support for more sports (basketball, baseball, etc.)

## Troubleshooting

### Card Analysis Not Working
- Ensure GEMINI_API_KEY is set correctly
- Check that the image is clear and well-lit
- Try with different card images

### Upload Failing
- Check Firebase Storage rules
- Verify FIREBASE_STORAGE_BUCKET is correct
- Ensure user is authenticated

### Teams Not Saving
- Check Firestore security rules
- Verify user is authenticated
- Check browser console for errors

## License

MIT License - feel free to use this project for learning or personal use!

## Support

Having issues? Check the troubleshooting section or create an issue on GitHub.

Happy team building! ⚽🏆
