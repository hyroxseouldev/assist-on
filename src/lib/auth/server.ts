import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthenticatedUser = {
  id: string;
  email?: string | null;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
};

/**
 * Verifies the current request's JWT once and shares the result across Server
 * Components rendered for that request. Authorization still comes from RLS
 * and database role lookups, never from user_metadata.
 */
export const getAuthenticatedUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims.sub) {
    return { supabase, user: null };
  }

  const metadata = data.claims.user_metadata;
  const user: AuthenticatedUser = {
    id: data.claims.sub,
    email: data.claims.email,
    user_metadata:
      metadata && typeof metadata === "object"
        ? {
            full_name: typeof metadata.full_name === "string" ? metadata.full_name : undefined,
            avatar_url: typeof metadata.avatar_url === "string" ? metadata.avatar_url : undefined,
          }
        : undefined,
  };

  return { supabase, user };
});
