type QueryError = { code?: string; status?: number; name?: string };

export function throwQueryError(context: string, error: QueryError | null) {
  if (!error) return;
  // Keep tokens, query parameters, user data and database messages out of logs.
  console.error("[supabase.query]", { context, code: error.code, status: error.status });
  throw new Error("정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
}

export function isTemporaryAuthError(error: QueryError) {
  return error.name === "AuthRetryableFetchError" || (error.status !== undefined && error.status >= 500);
}
