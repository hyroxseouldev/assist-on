import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { createReadRetryFetch } from "@/lib/supabase/read-fetch";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    global: { fetch: createReadRetryFetch() },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll can fail in Server Components where mutation is restricted.
          // Proxy handles session refresh writes in that case.
        }
      },
    },
  });
}
