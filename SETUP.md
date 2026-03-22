# FitTrack AI — Full Setup & Deployment Guide

This is a **production-grade** React app with:
- 🔐 Firebase Authentication (Google + Email/Password)
- ☁️  Firestore cloud database (per-user data, fully isolated)
- 🤖 Claude AI via a secure Vercel serverless function
- 🚀 Deployed on Vercel (free tier)

---

## Project Structure

```
fittrack/
├── api/
│   └── claude.js          ← Vercel serverless function (keeps API key secret)
├── src/
│   ├── context/
│   │   └── AuthContext.js  ← Firebase auth state + profile management
│   ├── hooks/
│   │   └── useFirestore.js ← Firestore read/write hooks
│   ├── lib/
│   │   ├── firebase.js     ← Firebase app initialisation
│   │   ├── claudeClient.js ← All Claude API calls (food, workout, insights)
│   │   └── nutrition.js    ← TDEE/macro calculators
│   ├── components/
│   │   └── UI.js           ← Shared components (MacroBar, Card, Btn, etc.)
│   ├── pages/
│   │   ├── LoginPage.js    ← Google + Email/Password sign-in
│   │   ├── SetupPage.js    ← First-time onboarding (6 steps)
│   │   ├── DashboardPage.js← Today's macro summary
│   │   ├── LogMealPage.js  ← Photo upload + AI analysis
│   │   ├── WorkoutPage.js  ← Plain-English workout logging
│   │   ├── InsightsPage.js ← AI-generated tomorrow's plan
│   │   ├── HistoryPage.js  ← 30-day history from Firestore
│   │   └── ProfilePage.js  ← Edit profile + sign out
│   ├── App.js              ← Routing + auth guard + bottom nav
│   └── index.js            ← React entry point
├── public/
│   └── index.html
├── .env.example            ← Copy to .env.local and fill in
├── .gitignore
├── firestore.rules         ← Security rules (deploy separately)
├── vercel.json             ← Vercel SPA + API routing config
└── package.json
```

---

## Step 1 — Firebase Setup (10 minutes)

### 1a. Create a Firebase project
1. Go to https://console.firebase.google.com
2. Click **Add project** → name it `fittrack-ai` → Continue
3. Disable Google Analytics if you don't need it → **Create project**

### 1b. Enable Authentication
1. In Firebase Console → **Authentication** → **Get started**
2. **Sign-in method** tab:
   - Enable **Google** → add your support email → Save
   - Enable **Email/Password** → Save

### 1c. Create Firestore Database
1. Firebase Console → **Firestore Database** → **Create database**
2. Choose **Start in production mode** → pick your region → Enable
3. Go to **Rules** tab → paste the contents of `firestore.rules` → **Publish**

### 1d. Register your Web App
1. Firebase Console → Project Overview → click the **`</>`** (Web) icon
2. App nickname: `fittrack-web` → **Register app**
3. Copy the `firebaseConfig` object — you'll need these values for your `.env.local`

---

## Step 2 — Anthropic API Key

1. Go to https://console.anthropic.com → **API Keys**
2. Create a new key → copy it
3. This goes in `ANTHROPIC_API_KEY` in your environment variables
   ⚠️  This key is only used server-side in `api/claude.js` — it is NEVER sent to the browser

---

## Step 3 — Local Development

```bash
# Install dependencies
npm install

# Copy env template and fill in your values
cp .env.example .env.local
# Edit .env.local with your Firebase config and Anthropic API key

# Run locally (Vercel CLI handles the /api route)
npm install -g vercel
vercel dev
```

Open http://localhost:3000

> ⚠️  Use `vercel dev` (not `npm start`) locally so the `/api/claude.js`
> serverless function is available at `/api/claude`.

---

## Step 4 — Deploy to Vercel

### 4a. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/fittrack-ai.git
git push -u origin main
```

### 4b. Import to Vercel
1. Go to https://vercel.com → **Add New Project**
2. Import your GitHub repo
3. Framework preset: **Create React App**
4. **Before deploying**, go to **Environment Variables** and add ALL of these:

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` |
| `REACT_APP_FIREBASE_API_KEY` | from Firebase config |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | from Firebase config |
| `REACT_APP_FIREBASE_PROJECT_ID` | from Firebase config |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | from Firebase config |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | from Firebase config |
| `REACT_APP_FIREBASE_APP_ID` | from Firebase config |

5. Click **Deploy** 🚀

### 4c. Add your Vercel domain to Firebase Auth
After deploying, copy your Vercel URL (e.g. `fittrack-ai.vercel.app`):
1. Firebase Console → Authentication → **Settings** → **Authorized domains**
2. Click **Add domain** → paste your Vercel URL → Add

---

## Step 5 — Invite Friends & Family

Since this is for a small group, just share the Vercel URL.
Each person signs up with Google or email — their data is **fully isolated** in Firestore.
Nobody can see anyone else's meals or workouts.

---

## Data Architecture (Firestore)

```
users/
  {uid}/                        ← one document per user
    displayName, email, goal,
    weight, height, activityLevel,
    setupDone, createdAt

    days/
      2025-03-21/               ← one document per calendar day
        meals: [ { meal_name, macros, image, health_score, time, ... } ]
        workouts: [ { workout_name, duration_min, calories_burned, ... } ]
        macros: { calories, protein, carbs, fat, fiber }
        updatedAt
```

---

## Security

- ✅ Anthropic API key is **server-side only** (Vercel function) — never in the browser
- ✅ Firebase rules enforce each user can only read/write **their own** documents
- ✅ Google OAuth handles password security
- ✅ `.gitignore` excludes all `.env` files

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Google sign-in popup blocked | Allow popups for your domain in browser settings |
| `auth/unauthorized-domain` | Add your domain to Firebase Auth → Authorized domains |
| `/api/claude` 404 locally | Use `vercel dev` instead of `npm start` |
| Firestore permission denied | Check `firestore.rules` is deployed and user is logged in |
| Images not analyzing | Check `ANTHROPIC_API_KEY` is set correctly in Vercel env vars |
