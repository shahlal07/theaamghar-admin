import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Graceful degradation: log to console instead of crashing the client bundle
    if (typeof window !== "undefined") {
      console.error(
        "[theaamghar-admin] Supabase credentials missing. Check Vercel env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY"
      );
    }
    // Return a dummy client that will fail gracefully on first use
    // This prevents the entire app from white-screening on env misconfiguration
    return createBrowserClient("https://placeholder.supabase.co", "placeholder");
  }

  return createBrowserClient(url, key);
}
