"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function isSafeInternalPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//");
}

export async function logoutAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const redirectTo = String(formData.get("redirectTo") ?? "").trim();

  await supabase.auth.signOut();

  redirect(isSafeInternalPath(redirectTo) ? redirectTo : "/");
}
