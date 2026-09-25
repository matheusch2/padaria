import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://alucaeonfpaqxwojplnw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_qUYxrOnC8Ibxg4ZNJ4BcBw_hX6A9HFJ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
