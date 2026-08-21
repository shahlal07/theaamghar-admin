import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL = 'https://mztayodmvdpzzwzznsvu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16dGF5b2RtdmRwenp3enpuc3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3NDQ5NzYsImV4cCI6MjEwMjMyMDk3Nn0.lDEup88roTPXpM1bVCSxjVWxeiWcstwD82fdlyBu99k';

export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
