# GitHub Repository Setup

## Creating Your GitHub Repository

### Option 1: Using GitHub CLI (if installed)

```bash
cd sports-card-builder
git init
git add .
git commit -m "Initial commit: Sports Card Team Builder"
gh repo create sports-card-builder --public --source=. --remote=origin
git push -u origin main
```

### Option 2: Using GitHub Web Interface

1. Go to https://github.com/new
2. Repository name: `sports-card-builder`
3. Description: "Build soccer teams from sports cards and simulate AI-powered matches"
4. Choose Public or Private
5. **Don't** initialize with README (we already have one)
6. Click "Create repository"

7. In your terminal:
```bash
cd sports-card-builder
git init
git add .
git commit -m "Initial commit: Sports Card Team Builder"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sports-card-builder.git
git push -u origin main
```

## Setting Up for Collaboration

### Add .gitignore (already included)
The project includes a `.gitignore` file that excludes:
- `node_modules/`
- `.env.local` (keeps your secrets safe!)
- `.next/` build files

### Branch Protection (recommended)
1. Go to your repo on GitHub
2. Settings → Branches
3. Add rule for `main` branch:
   - ✅ Require pull request reviews
   - ✅ Require status checks to pass

### Add Topics
Add these topics to your repo for discoverability:
- `nextjs`
- `firebase`
- `ai`
- `gemini`
- `sports-cards`
- `soccer`
- `typescript`
- `react`

## Deploying to Vercel

### Quick Deploy (Recommended)

1. Push your code to GitHub (see above)
2. Visit https://vercel.com/new
3. Import your GitHub repository
4. Configure:
   - Framework Preset: Next.js
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`

5. Add Environment Variables (click "Environment Variables"):
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   NEXT_PUBLIC_FIREBASE_PROJECT_ID
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   NEXT_PUBLIC_FIREBASE_APP_ID
   GEMINI_API_KEY
   ```
   
6. Click "Deploy"

### Update Firebase Configuration

After deploying, update your Firebase project:

1. Go to Firebase Console → Authentication → Settings
2. Add your Vercel domain to authorized domains:
   - `your-app.vercel.app`

3. Update any redirect URIs if needed

## Continuous Deployment

Vercel automatically:
- Deploys on every push to `main`
- Creates preview deployments for pull requests
- Provides unique URLs for each deployment

## Project Badge

Add this to your README.md:

```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/sports-card-builder)
```

## Monitoring

Vercel provides:
- Analytics dashboard
- Error tracking
- Performance monitoring
- Real-time logs

Access via: https://vercel.com/dashboard

## Custom Domain (Optional)

1. Buy domain from any registrar
2. Vercel Dashboard → Your project → Settings → Domains
3. Add your domain
4. Update DNS records as instructed

## Next Steps

After deployment:
1. Test the app thoroughly
2. Invite friends to create teams
3. Monitor Firebase usage
4. Check Gemini API quota
5. Add features from the roadmap!

Happy building! ⚽
