import { createClient } from '@supabase/supabase-js';

// We pull these from Environment Variables so they apply globally to all users.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key-placeholder';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // PKCE keeps the OAuth code exchange bound to a verifier stored in this
    // client, so a deep link cannot inject a session token from another app.
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
});
