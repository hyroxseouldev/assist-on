# Public landing metrics

Read-only snapshot: 2026-09-09 06:15:52 UTC (15:15:52 KST).
Source: connected assist-on Supabase database. Scope: XON Training and AMOR LAB.

| Metric | Value | Definition |
| --- | ---: | --- |
| Member accounts | 108 | Distinct member-role user IDs with active, non-deleted profiles; not MAU or paying members |
| Registered programs | 19 | All registered programs, including past/unpublished; not currently active programs |
| Session reviews | 739 | All program session review rows; not unique members or verified workout completion |
| Coach feedback | 662 | Review rows with nonblank coach_feedback; not a satisfaction metric |

No test-data exclusion beyond the explicit filters below. Do not describe these as independently audited, paid customers, retention, or growth. Public copy labels them as registered database counts. No individual rows, names, emails, revenue, IDs, or credentials are published.

Update `src/lib/landing/public-metrics.ts` only after rerunning the read-only query and updating the snapshot date. Static aggregates avoid a privileged public endpoint or database work on every landing visit.

```sql
with target_tenants as (
  select id from public.tenants where slug in ('xon-training', 'amor')
)
select
  (select count(distinct m.user_id)
   from public.tenant_memberships m
   join public.profiles p on p.id = m.user_id
   where m.tenant_id in (select id from target_tenants)
     and m.role = 'member'
     and p.is_deleted is not true
     and p.account_status = 'active') as member_accounts,
  (select count(*) from public.programs
   where tenant_id in (select id from target_tenants)) as programs,
  (select count(*) from public.program_session_reviews
   where tenant_id in (select id from target_tenants)) as reviews,
  (select count(*) from public.program_session_reviews
   where tenant_id in (select id from target_tenants)
     and nullif(btrim(coach_feedback), '') is not null) as coach_feedback;
```

Commercial pricing and contact addresses are preserved from the existing homepage. No new pricing, guarantees, or testimonials were introduced. The contact form sends through Resend with this server-only setting:

- `RESEND_API_KEY`: Resend API key.
- `RESEND_FROM_EMAIL` (optional): sender at the exact verified domain, for example `clyrtraining <contact@example.com>`. Without it, the Resend test sender `clyrtraining <onboarding@resend.dev>` is used.

The recipient is the existing address displayed in the landing contact section. The API key is never sent to the browser. The visitor's email is set as `Reply-To`; the form validates lengths, includes a honeypot, prevents duplicate sends with a Resend idempotency key, and applies a best-effort per-instance burst limit. Production-grade distributed rate limiting can be added if public traffic requires it.
