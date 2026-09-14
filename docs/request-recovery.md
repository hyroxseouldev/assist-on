# Server request recovery

Server-side Supabase clients retry GET/HEAD requests once after 250 ms for HTTP
502/503/504 or a fetch network failure. Other HTTP errors and aborted requests are
not retried. POST (including RPC and token refresh), PATCH, PUT and DELETE are
passed through without additional retries. Browser and proxy clients are unchanged.

The installed supabase-js version is 2.99.1. Newer versions may include SDK-level
retries; rerun `pnpm test:request-recovery` when upgrading to catch compounded
retries or accidental write retries. No dependency was added for this change.

Membership, administrator profile, tenant and role query failures now throw instead
of being interpreted as missing membership or insufficient permission. Temporary
Auth failures throw; absent/invalid sessions still use the normal login flow.
Logs contain the query context and error code/status, without raw database messages,
query parameters, tokens or user data.

`src/app/error.tsx` catches failures in nested layouts, including the admin shell.
Both admin route trees also have page error boundaries to preserve the shell when
only page content fails. The shared error screen displays a generic message and
an optional Next.js digest. Retry refreshes server data and resets the boundary.
It does not replay a failed save action.

This handles transient failures and recovery; it does not establish or fix the
underlying cause of Supabase gateway timeouts. Persistent failures still require
checking service/database load and the failed queries.

Validation: `pnpm test:request-recovery`, or one check via
`pnpm test:request-recovery -- "인증"`. All fetches and auth responses are mocked;
the SDK integration checks perform no external requests or database writes.

References:
- https://nextjs.org/docs/app/api-reference/file-conventions/error
