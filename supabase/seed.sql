insert into public.game_sessions (
  code,
  title,
  academic_year,
  status,
  model_version
)
values (
  'ACCOUNTING26',
  'CFO AI Business Game — Tecnologie per l’Accounting',
  '2026/2027',
  'registration_open',
  'aurora-tyres-v0.5.2'
)
on conflict (code) do update
set title = excluded.title,
    academic_year = excluded.academic_year,
    status = excluded.status,
    model_version = excluded.model_version;
