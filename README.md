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
| 📅 **History** | 30 days of data stored per user in Supabase |
| 🔐 **Auth** | Google OAuth + Email/Password via Supabase Auth |

---

## Tech Stack

```
Frontend    React 18 + React Router 6
Auth        Supabase Auth (Google + Email/Password)
Database    Supabase (PostgreSQL) — per-user, Row Level Security enforced
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
│   │   └── AuthContext.js     ← Supabase auth state + profile management
│   ├── hooks/
│   │   └── useSupabase.js     ← Supabase read/write hooks
│   ├── lib/
│   │   ├── supabase.js        ← Supabase client init
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
│       ├── HistoryPage.js     ← 30-day history from Supabase
│       └── ProfilePage.js     ← Edit profile + sign out
├── public/
│   ├── index.html
│   └── sw.js                  ← Service Worker (background sync, caching)
├── test/
│   └── run_tests.js           ← 53-test static analysis suite
├── supabase_schema.sql        ← Run this in Supabase SQL editor to set up tables
├── vercel.json                ← SPA routing + API function config
├── .env.example               ← All required env vars documented
└── SETUP.md                   ← Step-by-step deployment guide
```

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/Aaryan140/fittrack-ai.git
cd fittrack-ai
npm install
```

### 2. Set up Supabase (free, no credit card needed)

1. Go to [supabase.com](https://supabase.com) → New project
2. Go to **SQL Editor** → paste the contents of `supabase_schema.sql` → **Run**
3. Go to **Authentication → Providers** → enable **Google** and **Email**
4. Go to **Settings → API** → copy your **Project URL** and **anon public key**

### 3. Get an Anthropic API key

[console.anthropic.com](https://console.anthropic.com) → API Keys → Create

### 4. Configure environment

```bash
cp .env.example .env.local
# Fill in your Supabase URL, anon key, and Anthropic API key
```

### 5. Run locally

```bash
npm install -g vercel
vercel dev    # NOT npm start — needed for /api/claude serverless function
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

1. Push to GitHub
2. Go to [vercel.com](https://vercel.com) → Import your repo
3. Add environment variables from `.env.example` in Vercel dashboard
4. Click **Deploy**
5. Copy your Vercel URL → go to Supabase → **Authentication → URL Configuration** → add it to **Redirect URLs**

---

## Database Schema

Two tables in Supabase (run `supabase_schema.sql` to create them):

```
profiles          — one row per user (goal, weight, height, activity level etc.)
days              — one row per user per calendar day (meals, workouts, macros as JSON)
```

Row Level Security ensures each user can only read and write their own rows.

---

## Background Activity Tracking

Steps are counted using the browser **DeviceMotion API** (accelerometer). A **Service Worker** (`public/sw.js`) keeps tracking alive when:
- The screen locks
- The tab goes to background
- The browser minimises

Data is buffered in **IndexedDB** on-device and synced to Supabase when the user taps "Save to log".

> **iOS note:** Add the app to your Home Screen via Safari → Share → Add to Home Screen for full background sensor access.

---

## Security

- Anthropic API key is **server-side only** in `api/claude.js` — never sent to the browser
- Supabase Row Level Security enforces per-user data isolation
- All `.env` files are gitignored
- Run `node test/run_tests.js` before every push — checks for hardcoded secrets

---

## Running Tests

```bash
node test/run_tests.js
```

Runs 53 static analysis checks covering file structure, exports, sensor APIs, security, and env vars.

---

## Roadmap

- [ ] Bluetooth heart rate monitor (Web Bluetooth API)
- [ ] Apple Health / Google Fit import
- [ ] Progress photo timeline comparison
- [ ] Weekly email summary
- [ ] Barcode scanner for packaged foods
- [ ] Offline-first full PWA mode
