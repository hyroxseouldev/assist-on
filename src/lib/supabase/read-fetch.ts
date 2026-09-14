const TRANSIENT_STATUSES = new Set([502, 503, 504]);

/** One retry for reads only. Never replay writes, RPC POSTs or token refreshes. */
export function createReadRetryFetch(fetcher: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const request = input instanceof Request ? input : null;
    const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
    if (method !== "GET" && method !== "HEAD") return fetcher(input, init);

    const signal = init?.signal ?? request?.signal;
    for (let attempt = 0; ; attempt++) {
      signal?.throwIfAborted();
      let response: Response;
      try {
        response = await fetcher(input, init);
      } catch (error) {
        if (attempt > 0 || signal?.aborted || !(error instanceof TypeError)) throw error;
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
      if (attempt > 0 || !TRANSIENT_STATUSES.has(response.status)) return response;
      // Release the failed response before opening a second connection.
      await response.body?.cancel();
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  };
}
