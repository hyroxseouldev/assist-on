-- Workout records v2: single-row model by record type

create table if not exists public.user_workout_records_v2 (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_key text not null,
  distance integer,
  record_type text not null check (record_type in ('time', 'weight')),
  record_seconds integer,
  record_weight_kg numeric,
  record_reps integer,
  recorded_at date not null,
  memo text not null default '',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint user_workout_records_v2_distance_check
    check (distance is null or distance > 0),
  constraint user_workout_records_v2_value_check
    check (
      (
        record_type = 'time'
        and record_seconds is not null
        and record_seconds > 0
        and record_weight_kg is null
        and record_reps is null
      )
      or (
        record_type = 'weight'
        and record_weight_kg is not null
        and record_weight_kg > 0
        and record_reps is not null
        and record_reps > 0
        and record_seconds is null
      )
    )
);

create index if not exists idx_user_workout_records_v2_tenant_user_exercise_date
  on public.user_workout_records_v2 (tenant_id, user_id, exercise_key, recorded_at desc);

create index if not exists idx_user_workout_records_v2_tenant_user_distance
  on public.user_workout_records_v2 (tenant_id, user_id, distance);

create index if not exists idx_user_workout_records_v2_tenant_user_type_date
  on public.user_workout_records_v2 (tenant_id, user_id, record_type, recorded_at desc);

alter table public.user_workout_records_v2 enable row level security;

drop policy if exists "Users can read own workout records v2" on public.user_workout_records_v2;
drop policy if exists "Users can create own workout records v2" on public.user_workout_records_v2;
drop policy if exists "Users can update own workout records v2" on public.user_workout_records_v2;
drop policy if exists "Users can delete own workout records v2" on public.user_workout_records_v2;

create policy "Users can read own workout records v2"
  on public.user_workout_records_v2
  for select
  to authenticated
  using ((user_id = auth.uid()) or is_tenant_content_manager(tenant_id));

create policy "Users can create own workout records v2"
  on public.user_workout_records_v2
  for insert
  to authenticated
  with check (
    (user_id = auth.uid())
    and (
      exists (
        select 1
        from public.tenant_memberships tm
        where tm.tenant_id = user_workout_records_v2.tenant_id
          and tm.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.program_entitlements pe
        where pe.tenant_id = user_workout_records_v2.tenant_id
          and pe.user_id = auth.uid()
          and pe.is_active = true
          and (pe.ends_at is null or pe.ends_at >= now())
      )
    )
  );

create policy "Users can update own workout records v2"
  on public.user_workout_records_v2
  for update
  to authenticated
  using ((user_id = auth.uid()) or is_tenant_content_manager(tenant_id))
  with check ((user_id = auth.uid()) or is_tenant_content_manager(tenant_id));

create policy "Users can delete own workout records v2"
  on public.user_workout_records_v2
  for delete
  to authenticated
  using ((user_id = auth.uid()) or is_tenant_content_manager(tenant_id));

create table if not exists public.migration_review_user_workout_records (
  src_id uuid primary key,
  reason text not null,
  source_row jsonb not null,
  created_at timestamp with time zone not null default now()
);

-- Time records: duration row is required, distance row is optional.
with duration_rows as (
  select
    r.*,
    row_number() over (
      partition by r.tenant_id, r.user_id, r.exercise_name, r.recorded_at
      order by r.created_at, r.id
    ) as rn
  from public.user_personal_records r
  where r.metric_type = 'duration'
    and r.value_seconds is not null
    and r.value_seconds > 0
),
distance_rows as (
  select
    r.*,
    row_number() over (
      partition by r.tenant_id, r.user_id, r.exercise_name, r.recorded_at
      order by r.created_at, r.id
    ) as rn
  from public.user_personal_records r
  where r.metric_type = 'distance'
    and r.value_numeric is not null
    and r.value_numeric > 0
)
insert into public.user_workout_records_v2 (
  tenant_id,
  user_id,
  exercise_key,
  distance,
  record_type,
  record_seconds,
  record_weight_kg,
  record_reps,
  recorded_at,
  memo,
  created_at,
  updated_at
)
select
  d.tenant_id,
  d.user_id,
  d.exercise_name,
  case
    when dist.value_numeric is null then null
    else round(dist.value_numeric)::integer
  end as distance,
  'time' as record_type,
  d.value_seconds,
  null,
  null,
  d.recorded_at,
  coalesce(d.memo, ''),
  d.created_at,
  now()
from duration_rows d
left join distance_rows dist
  on dist.tenant_id = d.tenant_id
 and dist.user_id = d.user_id
 and dist.exercise_name = d.exercise_name
 and dist.recorded_at = d.recorded_at
 and dist.rn = d.rn;

-- Weight records: pair weight and reps rows by sequence per day.
with weight_rows as (
  select
    r.*,
    row_number() over (
      partition by r.tenant_id, r.user_id, r.exercise_name, r.recorded_at
      order by r.created_at, r.id
    ) as rn
  from public.user_personal_records r
  where r.metric_type = 'weight'
    and r.value_numeric is not null
    and r.value_numeric > 0
),
reps_rows as (
  select
    r.*,
    row_number() over (
      partition by r.tenant_id, r.user_id, r.exercise_name, r.recorded_at
      order by r.created_at, r.id
    ) as rn,
    coalesce(r.value_numeric, (r.value_seconds)::numeric) as reps_numeric
  from public.user_personal_records r
  where r.metric_type = 'reps'
    and coalesce(r.value_numeric, (r.value_seconds)::numeric) is not null
    and coalesce(r.value_numeric, (r.value_seconds)::numeric) > 0
)
insert into public.user_workout_records_v2 (
  tenant_id,
  user_id,
  exercise_key,
  distance,
  record_type,
  record_seconds,
  record_weight_kg,
  record_reps,
  recorded_at,
  memo,
  created_at,
  updated_at
)
select
  w.tenant_id,
  w.user_id,
  w.exercise_name,
  null,
  'weight',
  null,
  w.value_numeric,
  round(r.reps_numeric)::integer,
  w.recorded_at,
  coalesce(w.memo, ''),
  w.created_at,
  now()
from weight_rows w
join reps_rows r
  on r.tenant_id = w.tenant_id
 and r.user_id = w.user_id
 and r.exercise_name = w.exercise_name
 and r.recorded_at = w.recorded_at
 and r.rn = w.rn;

-- Review queue for rows that cannot be safely converted into v2.
with duration_rows as (
  select
    r.id,
    row_number() over (
      partition by r.tenant_id, r.user_id, r.exercise_name, r.recorded_at
      order by r.created_at, r.id
    ) as rn,
    r.tenant_id,
    r.user_id,
    r.exercise_name,
    r.recorded_at
  from public.user_personal_records r
  where r.metric_type = 'duration'
    and r.value_seconds is not null
    and r.value_seconds > 0
),
distance_rows as (
  select
    r.id,
    row_number() over (
      partition by r.tenant_id, r.user_id, r.exercise_name, r.recorded_at
      order by r.created_at, r.id
    ) as rn,
    r.tenant_id,
    r.user_id,
    r.exercise_name,
    r.recorded_at
  from public.user_personal_records r
  where r.metric_type = 'distance'
    and r.value_numeric is not null
    and r.value_numeric > 0
),
weight_rows as (
  select
    r.id,
    row_number() over (
      partition by r.tenant_id, r.user_id, r.exercise_name, r.recorded_at
      order by r.created_at, r.id
    ) as rn,
    r.tenant_id,
    r.user_id,
    r.exercise_name,
    r.recorded_at
  from public.user_personal_records r
  where r.metric_type = 'weight'
    and r.value_numeric is not null
    and r.value_numeric > 0
),
reps_rows as (
  select
    r.id,
    row_number() over (
      partition by r.tenant_id, r.user_id, r.exercise_name, r.recorded_at
      order by r.created_at, r.id
    ) as rn,
    r.tenant_id,
    r.user_id,
    r.exercise_name,
    r.recorded_at
  from public.user_personal_records r
  where r.metric_type = 'reps'
    and coalesce(r.value_numeric, (r.value_seconds)::numeric) is not null
    and coalesce(r.value_numeric, (r.value_seconds)::numeric) > 0
),
matched_ids as (
  select d.id as id from duration_rows d
  union all
  select dist.id as id
  from duration_rows d
  join distance_rows dist
    on dist.tenant_id = d.tenant_id
   and dist.user_id = d.user_id
   and dist.exercise_name = d.exercise_name
   and dist.recorded_at = d.recorded_at
   and dist.rn = d.rn
  union all
  select w.id as id from weight_rows w
  join reps_rows r
    on r.tenant_id = w.tenant_id
   and r.user_id = w.user_id
   and r.exercise_name = w.exercise_name
   and r.recorded_at = w.recorded_at
   and r.rn = w.rn
  union all
  select r.id as id from weight_rows w
  join reps_rows r
    on r.tenant_id = w.tenant_id
   and r.user_id = w.user_id
   and r.exercise_name = w.exercise_name
   and r.recorded_at = w.recorded_at
   and r.rn = w.rn
)
insert into public.migration_review_user_workout_records (src_id, reason, source_row)
select
  src.id,
  'unmatched_or_unsupported_metric',
  to_jsonb(src)
from public.user_personal_records src
left join matched_ids m on m.id = src.id
where m.id is null
on conflict (src_id) do nothing;
