import { createClient } from "@supabase/supabase-js";

// Single local operator, no auth: a plain client against the publishable key is enough.
// Every table is world-readable/writable until RLS policies land — see supabase/migrations.
export function getSupabaseServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
