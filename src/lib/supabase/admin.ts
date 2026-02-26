import { createClient } from "@supabase/supabase-js";

import { supabaseUrl } from "@/lib/supabase/env";

function requireEnv(value: string | undefined, name: "SUPABASE_SERVICE_ROLE_KEY" | "NEXT_PUBLIC_APP_URL") {
  if (!value) {
    throw new Error(`Missing env.${name}`);
  }

  return value;
}

const supabaseServiceRoleKey = requireEnv(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY");
const appUrl = requireEnv(process.env.NEXT_PUBLIC_APP_URL, "NEXT_PUBLIC_APP_URL");

export function createSupabaseAdminClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export { appUrl };
