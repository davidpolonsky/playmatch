#!/bin/bash

# Sports Card Builder - Configuration Helper
# This script helps you set up your .env.local file

echo "=========================================="
echo "Sports Card Builder - Setup Helper"
echo "=========================================="
echo ""

# Check if .env.local already exists
if [ -f .env.local ]; then
    echo "⚠️  .env.local already exists!"
    read -p "Do you want to overwrite it? (y/n): " overwrite
    if [ "$overwrite" != "y" ]; then
        echo "Keeping existing .env.local file"
        exit 0
    fi
fi

echo "Let's set up your environment variables."
echo "You'll need:"
echo "  1. Firebase credentials (from Firebase Console)"
echo "  2. Gemini API key (from Google AI Studio)"
echo ""
echo "Press Enter to continue..."
read

# Create the file
cat > .env.local << 'EOF'
# Firebase Configuration
# Get these from: Firebase Console → Project Settings → Your apps → Web app
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Google Gemini AI Configuration
# Get this from: https://aistudio.google.com/ → Get API key
GEMINI_API_KEY=
EOF

echo "✅ Created .env.local template"
echo ""
echo "📝 NEXT STEPS:"
echo ""
echo "1. Open .env.local in your text editor"
echo "2. Fill in your Firebase credentials:"
echo "   - Go to: https://console.firebase.google.com/"
echo "   - Open your project → Settings → Your apps → Web"
echo "   - Copy each value into .env.local"
echo ""
echo "3. Fill in your Gemini API key:"
echo "   - Go to: https://aistudio.google.com/"
echo "   - Click 'Get API key'"
echo "   - Copy the key into .env.local"
echo ""
echo "4. Save .env.local"
echo "5. Run: npm run dev"
echo ""
echo "Need help? Check YOUR_SETUP_GUIDE.md"
echo ""
