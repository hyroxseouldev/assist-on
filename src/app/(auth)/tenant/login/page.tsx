import { redirect } from "next/navigation";

import { DEFAULT_TENANT_LOGIN_SLUG, getTenantLoginPath } from "@/lib/auth/paths";

export default async function TenantLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const targetUrl = new URL(getTenantLoginPath(DEFAULT_TENANT_LOGIN_SLUG), "http://localhost");

  const next = typeof params.next === "string" ? params.next : undefined;
  const error = typeof params.error === "string" ? params.error : undefined;

  if (next) {
    targetUrl.searchParams.set("next", next);
  }

  if (error) {
    targetUrl.searchParams.set("error", error);
  }

  redirect(`${targetUrl.pathname}${targetUrl.search}`);
}
