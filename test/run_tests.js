// test/run_tests.js
const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];
const passed = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).flatMap(f => {
    const full = path.join(dir, f);
    return fs.statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const srcFiles   = walk(path.join(ROOT, 'src')).filter(f => f.endsWith('.js'));
const apiFiles   = walk(path.join(ROOT, 'api')).filter(f => f.endsWith('.js'));
const publicFiles = walk(path.join(ROOT, 'public')).filter(f => f.endsWith('.js'));
const allFiles   = [...srcFiles, ...apiFiles, ...publicFiles];

// ── TEST 1: File count ──────────────────────────────────────
if (allFiles.length >= 15) {
  passed.push('T1 File count OK: ' + allFiles.length + ' JS files found');
} else {
  errors.push('T1 Too few files: only ' + allFiles.length);
}

// ── TEST 2: Brace balance (per-line, handles JSX style={{}}) ─
srcFiles.forEach(file => {
  const code  = fs.readFileSync(file, 'utf8');
  const lines = code.split('\n');
  let depth = 0;
  let negative = false;
  lines.forEach(line => {
    // strip string literals on this line before counting
    const s = line.replace(/"[^"]*"/g,'""').replace(/'[^']*'/g,"''");
    const opens  = (s.match(/{/g) || []).length;
    const closes = (s.match(/}/g) || []).length;
    depth += opens - closes;
    if (depth < 0) negative = true;
  });
  if (depth !== 0) {
    errors.push('T2 Brace mismatch in ' + path.relative(ROOT, file) + ' (net=' + depth + ')');
  }
});
if (!errors.some(e => e.startsWith('T2'))) passed.push('T2 Brace balance OK across all ' + srcFiles.length + ' files');

// ── TEST 3: Default exports on all pages ───────────────────
const pages = walk(path.join(ROOT, 'src/pages')).filter(f => f.endsWith('.js'));
const missingExports = pages.filter(f => !fs.readFileSync(f,'utf8').includes('export default'));
if (missingExports.length === 0) {
  passed.push('T3 All ' + pages.length + ' pages have default exports');
} else {
  missingExports.forEach(f => errors.push('T3 No default export: ' + path.basename(f)));
}

// ── TEST 4: Required page files exist ──────────────────────
const requiredPages = [
  'LoginPage.js','SetupPage.js','DashboardPage.js','LogMealPage.js',
  'WorkoutPage.js','ActivityPage.js','InsightsPage.js','HistoryPage.js','ProfilePage.js'
];
requiredPages.forEach(p => {
  const fp = path.join(ROOT, 'src/pages', p);
  if (fs.existsSync(fp)) {
    passed.push('T4 Page exists: ' + p);
  } else {
    errors.push('T4 MISSING page: ' + p);
  }
});

// ── TEST 5: ActivityPage has sensor APIs ───────────────────
const activity = fs.readFileSync(path.join(ROOT, 'src/pages/ActivityPage.js'), 'utf8');
const actStore = fs.readFileSync(path.join(ROOT, 'src/lib/activityStore.js'), 'utf8');
const sensorApis = ['DeviceMotionEvent','navigator.geolocation','saveSession','getTodaySession','updateDay'];
sensorApis.forEach(api => {
  if (activity.includes(api)) {
    passed.push('T5 ActivityPage has: ' + api);
  } else {
    errors.push('T5 ActivityPage MISSING: ' + api);
  }
});
// indexedDB lives in activityStore (correct separation)
if (actStore.includes('indexedDB')) {
  passed.push('T5 activityStore.js correctly wraps indexedDB');
} else {
  errors.push('T5 activityStore.js missing indexedDB');
}

// ── TEST 6: Service Worker has background sync ─────────────
const sw = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
['sync','flush-steps','notifyClients','periodicsync'].forEach(tag => {
  if (sw.includes(tag)) {
    passed.push('T6 SW has: ' + tag);
  } else {
    warnings.push('T6 SW missing: ' + tag);
  }
});

// ── TEST 7: App.js imports ActivityPage + has route ────────
const app = fs.readFileSync(path.join(ROOT, 'src/App.js'), 'utf8');
if (app.includes('ActivityPage') && app.includes('/activity')) {
  passed.push('T7 App.js has ActivityPage import + /activity route');
} else {
  errors.push('T7 App.js missing ActivityPage or /activity route');
}

// ── TEST 8: Required lib files exist ──────────────────────
[
  'src/lib/supabase.js','src/lib/claudeClient.js',
  'src/lib/nutrition.js','src/lib/activityStore.js',
  'src/context/AuthContext.js','src/hooks/useSupabase.js',
  'src/components/UI.js','api/claude.js','public/sw.js',
  'firestore.rules','.env.example','vercel.json'
].forEach(f => {
  const fp = path.join(ROOT, f);
  if (fs.existsSync(fp)) {
    passed.push('T8 File exists: ' + f);
  } else {
    errors.push('T8 MISSING: ' + f);
  }
});

// ── TEST 9: claude.js API proxy has auth check ─────────────
const claudeApi = fs.readFileSync(path.join(ROOT, 'api/claude.js'), 'utf8');
if (claudeApi.includes('ANTHROPIC_API_KEY') && claudeApi.includes('process.env')) {
  passed.push('T9 api/claude.js uses env var for API key (never hardcoded)');
} else {
  errors.push('T9 api/claude.js NOT using env var for API key');
}

// ── TEST 10: Firestore rules block cross-user access ───────
const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
if (rules.includes('request.auth.uid == userId')) {
  passed.push('T10 Firestore rules enforce per-user isolation');
} else {
  errors.push('T10 Firestore rules missing uid check — SECURITY ISSUE');
}

// ── TEST 11: vercel.json valid + has API rewrite ───────────
try {
  const vj = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  if (vj.rewrites || vj.functions) {
    passed.push('T11 vercel.json valid JSON with rewrites/functions');
  } else {
    warnings.push('T11 vercel.json has no rewrites or functions key');
  }
} catch(e) { errors.push('T11 vercel.json invalid JSON: ' + e.message); }

// ── TEST 12: env example has all required vars ─────────────
const envEx = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
['ANTHROPIC_API_KEY','REACT_APP_SUPABASE_URL','REACT_APP_SUPABASE_ANON_KEY',
 'REACT_APP_SUPABASE_URL','REACT_APP_SUPABASE_ANON_KEY'].forEach(v => {
  if (envEx.includes(v)) {
    passed.push('T12 .env.example has: ' + v);
  } else {
    errors.push('T12 .env.example missing: ' + v);
  }
});

// ── TEST 13: AuthContext has all auth methods ──────────────
const auth = fs.readFileSync(path.join(ROOT, 'src/context/AuthContext.js'), 'utf8');
['signInWithGoogle','signInWithEmail','signUpWithEmail','logout','saveProfile'].forEach(fn => {
  if (auth.includes(fn)) {
    passed.push('T13 AuthContext has: ' + fn);
  } else {
    errors.push('T13 AuthContext missing: ' + fn);
  }
});

// ── TEST 14: Nutrition calculator has all goals ────────────
const nutr = fs.readFileSync(path.join(ROOT, 'src/lib/nutrition.js'), 'utf8');
['lose_weight','build_muscle','maintain','calcTargets'].forEach(k => {
  if (nutr.includes(k)) {
    passed.push('T14 nutrition.js has: ' + k);
  } else {
    errors.push('T14 nutrition.js missing: ' + k);
  }
});

// ── TEST 15: No hardcoded API keys ─────────────────────────
const secretPatterns = [/sk-ant-[A-Za-z0-9]{20,}/, /AIzaSy[A-Za-z0-9_-]{30,}/];
let foundSecret = false;
srcFiles.concat(apiFiles).forEach(file => {
  const code = fs.readFileSync(file, 'utf8');
  secretPatterns.forEach(pat => {
    if (pat.test(code)) { errors.push('T15 HARDCODED SECRET in: ' + path.relative(ROOT, file)); foundSecret = true; }
  });
});
if (!foundSecret) passed.push('T15 No hardcoded API keys or secrets found');

// ── REPORT ─────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════╗');
console.log('║       FITTRACK AI — FULL TEST SUITE      ║');
console.log('╚══════════════════════════════════════════╝\n');

if (errors.length === 0) {
  console.log('✅ ALL TESTS PASSED (' + passed.length + '/' + passed.length + ')\n');
  passed.forEach(p => console.log('  ✓', p));
} else {
  console.log('✅ PASSED: ' + passed.length);
  passed.forEach(p => console.log('  ✓', p));
  console.log('\n❌ FAILED: ' + errors.length);
  errors.forEach(e => console.log('  ✗', e));
}
if (warnings.length) {
  console.log('\n⚠️  WARNINGS: ' + warnings.length);
  warnings.forEach(w => console.log('  ⚠', w));
}

console.log('\n══ SUMMARY ══════════════════════════════════');
console.log('Passed:   ' + passed.length);
console.log('Failed:   ' + errors.length);
console.log('Warnings: ' + warnings.length);
console.log('Status:   ' + (errors.length === 0 ? '🟢 READY TO PUSH' : '🔴 FIX BEFORE PUSH'));
console.log('═════════════════════════════════════════════\n');

process.exit(errors.length > 0 ? 1 : 0);
