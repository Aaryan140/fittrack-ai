# ⚡ FitTrack AI

A production-ready fitness tracking web app powered by Claude AI. Upload food photos for instant macro analysis, log workouts by voice, track steps via device sensors in the background, scan your body composition, and get personalised daily plans.

---

## Features

| Feature | How it works |
|---|---|
| 📸 **Meal logging** | Photo → Claude Vision → macros, health score, goal alignment |
| 🏋️ **Workout logging** | Voice or text → Claude parses reps, sets, duration, calories |
| 📡 **Activity tracking** | Accelerometer + GPS via browser sensors, persists in background |
| 🧍 **Body scan** | Upload photos → Claude analyses muscle development, body fat estimate |
| 🔬 **Comprehensive review** | All data combined → scored assessment + 2-week action plan |
| 🧠 **AI insights** | 7-day history → personalised tomorrow's meal + workout plan |
| 📅 **History** | 30 days of data stored per user in Firestore |
| 🔐 **Auth** | Google OAuth + Email/Password via Firebase |

---

## Tech Stack

```
Frontend    React 18 + React Router 6
Auth        Firebase Authentication (Google + Email/Password)  
Database    Cloud Firestore (per-user, security rules enforced)
AI          Claude claude-sonnet-4-20250514 via Vercel serverless function
Sensors     DeviceMotion API + Geolocation API + Service Worker + IndexedDB
Deployment  Vercel (free tier)
```

---

## Project Structure

```
fittrack-ai/
├── api/
│   └── claude.js              ← Vercel serverless — Anthropic API proxy (key stays server-side)
├── src/
│   ├── context/
│   │   └── AuthContext.js     ← Firebase auth state + profile management
│   ├── hooks/
│   │   └── useFirestore.js    ← Firestore read/write hooks
│   ├── lib/
│   │   ├── firebase.js        ← Firebase app init
│   │   ├── claudeClient.js    ← analyzeFood, parseWorkout, generateInsights
│   │   ├── nutrition.js       ← TDEE / macro calculators
│   │   └── activityStore.js   ← IndexedDB wrapper for background step storage
│   ├── components/
│   │   └── UI.js              ← MacroBar, Card, Btn, Input, CalorieRing, Spinner
│   └── pages/
│       ├── LoginPage.js       ← Google + Email/Password sign-in
│       ├── SetupPage.js       ← First-time onboarding (6 steps)
│       ├── DashboardPage.js   ← Today's macro summary
│       ├── LogMealPage.js     ← Food photo upload + AI analysis
│       ├── WorkoutPage.js     ← Voice or typed workout logging
│       ├── ActivityPage.js    ← Step counter, GPS, accelerometer
│       ├── InsightsPage.js    ← AI tomorrow's plan
│       ├── HistoryPage.js     ← 30-day history from Firestore
│       └── ProfilePage.js     ← Edit profile + sign out
├── public/
│   ├── index.html
│   └── sw.js                  ← Service Worker (background sync, caching)
├── test/
│   └── run_tests.js           ← 53-test static analysis suite
├── firestore.rules            ← Per-user data isolation
├── vercel.json                ← SPA routing + API function config
├── .env.example               ← All required env vars documented
└── SETUP.md                   ← Step-by-step deployment guide
```

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/fittrack-ai.git
cd fittrack-ai
npm install
```

### 2. Set up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com) → New project
2. Enable **Authentication** → Google + Email/Password
3. Enable **Firestore** → Production mode → paste `firestore.rules`
4. Register a Web app → copy the config values

### 3. Get an Anthropic API key

[console.anthropic.com](https://console.anthropic.com) → API Keys → Create

### 4. Configure environment

```bash
cp .env.example .env.local
# Fill in all values in .env.local
```

### 5. Run locally

```bash
npm install -g vercel
vercel dev          # NOT npm start — needed for /api/claude serverless function
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

```bash
# Push to GitHub first, then:
vercel --prod
```

Or connect your GitHub repo at [vercel.com](https://vercel.com) and add all env vars from `.env.example` in the Vercel dashboard.

After deploying, add your Vercel domain to Firebase Auth → **Authorized domains**.

---

## Background Activity Tracking

Steps are counted using the browser **DeviceMotion API** (accelerometer). A **Service Worker** (`public/sw.js`) keeps the tracking alive when:
- The screen locks
- The tab goes to background
- The browser minimises

Data is buffered in **IndexedDB** on-device and synced to Firestore when the user taps "Save to log".

> **iOS note**: For full background sensor access on iPhone, add the app to your Home Screen via Safari → Share → Add to Home Screen. This enables the PWA mode needed for persistent sensor access.

---

## Security

- Anthropic API key is **server-side only** in `api/claude.js` — never sent to the browser
- Firestore rules enforce `request.auth.uid == userId` — no user can read another user's data
- All `.env` files are gitignored
- Run `node test/run_tests.js` before every push — checks for hardcoded secrets

---

## Running Tests

```bash
node test/run_tests.js
```

Runs 53 static analysis checks covering file structure, exports, sensor APIs, security, env vars, and Firestore rules.

---

## Roadmap

- [ ] Bluetooth heart rate monitor (Web Bluetooth API)
- [ ] Apple Health / Google Fit import
- [ ] Progress photo timeline comparison
- [ ] Weekly email summary
- [ ] Barcode scanner for packaged foods
- [ ] Offline-first full PWA mode
