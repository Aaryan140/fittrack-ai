// src/lib/supabase.js
// Supabase client — replaces firebase.js
// Get your URL and anon key from: supabase.com → project → Settings → API

import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnon = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnon) {
  console.error("Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY in .env.local");
}

export const supabase = createClient(supabaseUrl, supabaseAnon);
