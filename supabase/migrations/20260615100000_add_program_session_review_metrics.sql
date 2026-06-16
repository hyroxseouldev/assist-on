alter table public.program_session_reviews
add column if not exists intensity_rpe smallint;

alter table public.program_session_reviews
add column if not exists heart_rate_bpm integer;

alter table public.program_session_reviews
drop constraint if exists program_session_reviews_intensity_rpe_check;

alter table public.program_session_reviews
add constraint program_session_reviews_intensity_rpe_check
check (
  intensity_rpe is null
  or (intensity_rpe >= 1 and intensity_rpe <= 10)
);

alter table public.program_session_reviews
drop constraint if exists program_session_reviews_heart_rate_bpm_check;

alter table public.program_session_reviews
add constraint program_session_reviews_heart_rate_bpm_check
check (
  heart_rate_bpm is null
  or (heart_rate_bpm >= 30 and heart_rate_bpm <= 240)
);
